"use server";

import { z } from "zod";
import { defineAction } from "../defineAction";
import {
  AppointmentStatus,
  ChargeStatus,
  SessionCategory,
  Role,
} from "@prisma/client";
import { APPOINTMENT_STATE_MACHINE } from "@/domain/status/appointment";

const timeRegex = /^([01]\d|2[0-3]):(00|15|30|45)$/;
const dateRegex = /^\d{4}-\d{2}-\d{2}$/;

// ============================================================================
// Helper: Timezone & Date Calculations (Africa/Cairo)
// ============================================================================

function getMasaarDayOfWeek(dateStr: string): number {
  const [y, m, d] = dateStr.split("-").map(Number);
  const jsDay = new Date(Date.UTC(y, m - 1, d)).getUTCDay(); // 0=Sun, 1=Mon, ..., 6=Sat
  // Masaar system: 0=Sat, 1=Sun, 2=Mon, 3=Tue, 4=Wed, 5=Thu, 6=Fri
  return (jsDay + 1) % 7;
}

function cairoDateTimeToUtc(dateStr: string, timeStr: string): Date {
  const parts = dateStr.split("-").map(Number);
  const [hours, minutes] = timeStr.split(":").map(Number);
  const guessUtc = new Date(Date.UTC(parts[0], parts[1] - 1, parts[2], hours, minutes));
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: "Africa/Cairo",
    year: "numeric",
    month: "numeric",
    day: "numeric",
    hour: "numeric",
    minute: "numeric",
    second: "numeric",
    hour12: false,
  });
  const partsCairo = formatter.formatToParts(guessUtc);
  const cairoHour = Number(partsCairo.find((p) => p.type === "hour")?.value ?? hours);
  const cairoDay = Number(partsCairo.find((p) => p.type === "day")?.value ?? parts[2]);

  let hourDiff = cairoHour - hours;
  if (cairoDay > parts[2]) hourDiff += 24;
  else if (cairoDay < parts[2]) hourDiff -= 24;

  return new Date(guessUtc.getTime() - hourDiff * 60 * 60 * 1000);
}

function calculateEndTime(startTime: string, durationMinutes: number): string {
  const [h, m] = startTime.split(":").map(Number);
  const totalMinutes = h * 60 + m + durationMinutes;
  const endH = Math.floor(totalMinutes / 60) % 24;
  const endM = totalMinutes % 60;
  return `${endH.toString().padStart(2, "0")}:${endM.toString().padStart(2, "0")}`;
}

// Active appointment statuses that hold reservations (R-5.2-9)
const ACTIVE_STATUSES = [
  AppointmentStatus.SCHEDULED,
  AppointmentStatus.ARRIVED,
  AppointmentStatus.COMPLETED,
];

// ============================================================================
// Core Server Validation: 8 Booking Checks in One Transaction (Spec §5.2)
// ============================================================================

async function validateBookingChecks(
  tx: any,
  params: {
    patientId: string;
    sessionTypeId: string;
    clinicianId: string;
    roomId: string;
    bedId: string;
    appointmentDate: string; // YYYY-MM-DD
    startTime: string; // HH:mm
    durationMinutes: number;
    packageId?: string | null;
    excludeAppointmentId?: string;
  }
): Promise<{
  startsAt: Date;
  endsAt: Date;
  endTime: string;
  sessionType: any;
  clinician: any;
}> {
  const {
    patientId,
    sessionTypeId,
    clinicianId,
    roomId,
    bedId,
    appointmentDate,
    startTime,
    durationMinutes,
    packageId,
    excludeAppointmentId,
  } = params;

  const endTime = calculateEndTime(startTime, durationMinutes);
  const startsAt = cairoDateTimeToUtc(appointmentDate, startTime);
  const endsAt = new Date(startsAt.getTime() + durationMinutes * 60 * 1000);
  const dateObj = new Date(appointmentDate);

  // 1. Check Closure (R-5.2-1)
  const closure = await tx.clinicClosure.findFirst({
    where: {
      closureDate: dateObj,
      isActive: true,
    },
  });
  if (closure) {
    throw new Error(`العيادة مغلقة في هذا اليوم: ${closure.reasonAr}`);
  }

  // 1. Check Opening Hours (R-5.2-1)
  const dayOfWeek = getMasaarDayOfWeek(appointmentDate);
  const openingHour = await tx.clinicOpeningHour.findUnique({
    where: { dayOfWeek },
  });
  if (openingHour) {
    if (!openingHour.isOpen) {
      throw new Error("العيادة مغلقة في هذا اليوم وفقاً لمواعيد العمل الرسمية");
    }
    if (startTime < openingHour.openTime || endTime > openingHour.closeTime) {
      throw new Error(
        `الوقت المحدد (${startTime} - ${endTime}) خارج ساعات عمل العيادة (${openingHour.openTime} - ${openingHour.closeTime})`
      );
    }
  }

  // 2. Clinician active, scheduled, and not on leave (R-5.2-2)
  const clinician = await tx.user.findUnique({
    where: { id: clinicianId },
  });
  if (!clinician || !clinician.isActive) {
    throw new Error("المعالج المختار غير متاح أو حسابه غير مفعل");
  }

  // Working schedule check
  const schedules = await tx.staffSchedule.findMany({
    where: {
      userId: clinicianId,
      dayOfWeek,
      isWorking: true,
    },
  });

  const matchingShift = schedules.find(
    (s: any) => s.startTime <= startTime && s.endTime >= endTime
  );
  if (!matchingShift) {
    throw new Error("المعالج غير متاح في هذا التوقيت وفقاً لجدول مواعيد عمله");
  }

  // Approved leave check
  const leave = await tx.staffLeave.findFirst({
    where: {
      userId: clinicianId,
      status: "APPROVED",
      startDate: { lte: dateObj },
      endDate: { gte: dateObj },
    },
  });
  if (leave) {
    throw new Error("المعالج في إجازة معتمدة في هذا التاريخ");
  }

  // 8. Session Type match with clinician role & canAssess (R-5.2-8)
  const sessionType = await tx.sessionType.findUnique({
    where: { id: sessionTypeId },
  });
  if (!sessionType || !sessionType.isActive) {
    throw new Error("نوع الجلسة المختار غير متاح أو غير مفعل");
  }

  if (sessionType.category === SessionCategory.PHYSIOTHERAPY) {
    if (clinician.role !== Role.PHYSIOTHERAPIST && clinician.role !== Role.OWNER) {
      throw new Error("جلسات العلاج الطبيعي تتطلب معالجاً طبيعياً معتمداً");
    }
  } else if (sessionType.category === SessionCategory.NUTRITION) {
    if (clinician.role !== Role.NUTRITIONIST && clinician.role !== Role.OWNER) {
      throw new Error("استشارات التغذية تتطلب أخصائي تغذية علاجية معتمد");
    }
  } else if (sessionType.category === SessionCategory.CONSULTANT_ASSESSMENT) {
    if (!clinician.canAssess && clinician.role !== Role.OWNER) {
      throw new Error("هذا المعالج غير مصرح له بإجراء الكشف والتقييم الاستشاري");
    }
  }

  // 3. Clinician Overlap Check (R-5.2-3)
  const clinicianOverlap = await tx.appointment.findFirst({
    where: {
      clinicianId,
      status: { in: ACTIVE_STATUSES },
      id: excludeAppointmentId ? { not: excludeAppointmentId } : undefined,
      startsAt: { lt: endsAt },
      endsAt: { gt: startsAt },
    },
  });
  if (clinicianOverlap) {
    throw new Error("يوجد موعد آخر متداخل لنفس المعالج في هذا التوقيت (overlap)");
  }

  // 4. Bed Overlap Check (R-5.2-4)
  const bedOverlap = await tx.appointment.findFirst({
    where: {
      bedId,
      status: { in: ACTIVE_STATUSES },
      id: excludeAppointmentId ? { not: excludeAppointmentId } : undefined,
      startsAt: { lt: endsAt },
      endsAt: { gt: startsAt },
    },
  });
  if (bedOverlap) {
    throw new Error("السرير المطلوب محجوز بالفعل في هذا التوقيت (bed overlap)");
  }

  // 5. Patient Overlap Check (R-5.2-5)
  const patientOverlap = await tx.appointment.findFirst({
    where: {
      patientId,
      status: { in: ACTIVE_STATUSES },
      id: excludeAppointmentId ? { not: excludeAppointmentId } : undefined,
      startsAt: { lt: endsAt },
      endsAt: { gt: startsAt },
    },
  });
  if (patientOverlap) {
    throw new Error("المريض لديه موعد آخر متداخل في هذا التوقيت");
  }

  // 6. Patient Daily Limit (R-5.2-6): Max 1 per session type per patient per day
  const dailyTypeConflict = await tx.appointment.findFirst({
    where: {
      patientId,
      sessionTypeId,
      appointmentDate: dateObj,
      status: { in: ACTIVE_STATUSES },
      id: excludeAppointmentId ? { not: excludeAppointmentId } : undefined,
    },
  });
  if (dailyTypeConflict) {
    throw new Error("الحد الأقصى للمريض هو جلسة واحدة فقط من نفس النوع في اليوم");
  }

  // 7. Package Validation (R-5.2-7)
  if (packageId) {
    const pkg = await tx.package.findUnique({
      where: { id: packageId },
    });
    if (!pkg || pkg.cancelledAt) {
      throw new Error("الباقة المحددة غير نشطة أو تم إلغاؤها");
    }
    if (pkg.expiryDate && dateObj > pkg.expiryDate) {
      throw new Error("تاريخ الموعد بعد تاريخ انتهاء صلاحية الباقة");
    }

    const bookedSessions = await tx.appointment.count({
      where: {
        packageId,
        status: {
          in: [
            AppointmentStatus.SCHEDULED,
            AppointmentStatus.ARRIVED,
            AppointmentStatus.WAITLISTED,
            AppointmentStatus.COMPLETED,
          ],
        },
        id: excludeAppointmentId ? { not: excludeAppointmentId } : undefined,
      },
    });

    const availableSessions = pkg.totalSessions - bookedSessions;
    if (availableSessions <= 0) {
      throw new Error("لا توجد جلسات متاحة متبقية في هذه الباقة");
    }
  }

  return { startsAt, endsAt, endTime, sessionType, clinician };
}

// ============================================================================
// 1. Book Appointment Action (Spec §5.1, §5.2)
// ============================================================================

export const bookAppointmentAction = defineAction({
  actionKey: "appointment.book_reschedule_cancel",
  schema: z.object({
    patientId: z.string().uuid(),
    sessionTypeId: z.string().uuid(),
    clinicianId: z.string().uuid(),
    roomId: z.string().uuid(),
    bedId: z.string().uuid(),
    appointmentDate: z.string().regex(dateRegex),
    startTime: z.string().regex(timeRegex),
    durationMinutes: z.number().int().min(15).max(180).default(45),
    pricePiasters: z.number().int().min(0).optional(),
    packageId: z.string().uuid().optional().nullable(),
    notesForReception: z.string().optional().nullable(),
  }),
  audit: {
    entityType: "Appointment",
    actionName: "APPOINTMENT_BOOKED",
    getEntityId: (data) => (data as { id?: string })?.id,
  },
  handler: async ({ input, ctx, tx }) => {
    // Run all 8 booking validation checks
    const { startsAt, endsAt, endTime, sessionType } = await validateBookingChecks(
      tx,
      {
        patientId: input.patientId,
        sessionTypeId: input.sessionTypeId,
        clinicianId: input.clinicianId,
        roomId: input.roomId,
        bedId: input.bedId,
        appointmentDate: input.appointmentDate,
        startTime: input.startTime,
        durationMinutes: input.durationMinutes ?? 45,
        packageId: input.packageId,
      }
    );

    const price = input.packageId
      ? null
      : input.pricePiasters ?? sessionType.defaultPricePiasters;

    // Create Appointment
    const appointment = await tx.appointment.create({
      data: {
        patientId: input.patientId,
        sessionTypeId: input.sessionTypeId,
        clinicianId: input.clinicianId,
        roomId: input.roomId,
        bedId: input.bedId,
        packageId: input.packageId,
        appointmentDate: new Date(input.appointmentDate),
        startTime: input.startTime,
        endTime,
        startsAt,
        endsAt,
        durationMinutes: input.durationMinutes,
        pricePiasters: price,
        status: AppointmentStatus.SCHEDULED,
        notesForReception: input.notesForReception,
        createdByUserId: ctx.user.id,
      },
    });

    // If standalone appointment (no package), create an active Charge (R-8.1-1)
    if (!input.packageId && price && price > 0) {
      await tx.charge.create({
        data: {
          patientId: input.patientId,
          appointmentId: appointment.id,
          amountPiasters: price,
          description: sessionType.nameAr,
          status: ChargeStatus.ACTIVE,
          createdByUserId: ctx.user.id,
        },
      });
    }

    // Record initial status history
    await tx.appointmentStatusHistory.create({
      data: {
        appointmentId: appointment.id,
        fromStatus: null,
        toStatus: AppointmentStatus.SCHEDULED,
        changedByUserId: ctx.user.id,
        reason: "Initial booking",
        ipAddress: "127.0.0.1",
      },
    });

    return appointment;
  },
});

// ============================================================================
// 2. Reschedule Appointment Action / Drag & Drop (Spec §5.4, R-5.4-4)
// ============================================================================

export const rescheduleAppointmentAction = defineAction({
  actionKey: "appointment.book_reschedule_cancel",
  schema: z.object({
    appointmentId: z.string().uuid(),
    newDate: z.string().regex(dateRegex),
    newStartTime: z.string().regex(timeRegex),
    newBedId: z.string().uuid().optional(),
    newClinicianId: z.string().uuid().optional(),
    reason: z.string().optional(),
  }),
  audit: {
    entityType: "Appointment",
    actionName: "APPOINTMENT_RESCHEDULED",
    getEntityId: (_, input) => input.appointmentId,
  },
  handler: async ({ input, ctx, tx }) => {
    const existing = await tx.appointment.findUnique({
      where: { id: input.appointmentId },
    });
    if (!existing) {
      throw new Error("الموعد غير موجود");
    }

    // Drag & drop / reschedule allowed ONLY for SCHEDULED or ARRIVED (R-5.4-4)
    if (
      existing.status !== AppointmentStatus.SCHEDULED &&
      existing.status !== AppointmentStatus.ARRIVED
    ) {
      throw new Error(
        "لا يمكن نقل أو تعديل موعد في حالة غير مجدول أو حاضر (ملغي، مكتمل، أو عدم حضور)"
      );
    }

    const bedId = input.newBedId ?? existing.bedId;
    const clinicianId = input.newClinicianId ?? existing.clinicianId;

    // Get bed's roomId if bed changed
    let roomId = existing.roomId;
    if (input.newBedId && input.newBedId !== existing.bedId) {
      const bed = await tx.bed.findUnique({ where: { id: input.newBedId } });
      if (!bed) throw new Error("السرير الجديد غير موجود");
      roomId = bed.roomId;
    }

    // Re-run all 8 validation checks on the target time slot
    const { startsAt, endsAt, endTime } = await validateBookingChecks(tx, {
      patientId: existing.patientId,
      sessionTypeId: existing.sessionTypeId,
      clinicianId,
      roomId,
      bedId,
      appointmentDate: input.newDate,
      startTime: input.newStartTime,
      durationMinutes: existing.durationMinutes,
      packageId: existing.packageId,
      excludeAppointmentId: existing.id,
    });

    const updated = await tx.appointment.update({
      where: { id: existing.id },
      data: {
        appointmentDate: new Date(input.newDate),
        startTime: input.newStartTime,
        endTime,
        startsAt,
        endsAt,
        bedId,
        roomId,
        clinicianId,
        updatedByUserId: ctx.user.id,
      },
    });

    return updated;
  },
});

// ============================================================================
// 3. Appointment Status Machine Action (Spec §5.5, R-5.5-1 to R-5.5-13)
// ============================================================================

export const changeAppointmentStatusAction = defineAction({
  actionKey: "appointment.book_reschedule_cancel",
  schema: z.object({
    appointmentId: z.string().uuid(),
    newStatus: z.nativeEnum(AppointmentStatus),
    reason: z.string().optional(),
    reasonNotes: z.string().optional(),
  }),
  audit: {
    entityType: "Appointment",
    actionName: "APPOINTMENT_STATUS_CHANGED",
    getEntityId: (_, input) => input.appointmentId,
  },
  handler: async ({ input, ctx, tx }) => {
    const appt = await tx.appointment.findUnique({
      where: { id: input.appointmentId },
      include: {
        patient: true,
        sessionType: true,
      },
    });
    if (!appt) {
      throw new Error("الموعد غير موجود");
    }

    const currentStatus = appt.status;
    const targetStatus = input.newStatus;

    if (currentStatus === targetStatus) {
      return appt;
    }

    // Check transition validity from Status Machine Definition
    const transition = APPOINTMENT_STATE_MACHINE.transitions.find(
      (t) => t.from === currentStatus && t.to === targetStatus
    );

    if (!transition) {
      const forbidden = APPOINTMENT_STATE_MACHINE.forbiddenTransitions.find(
        (f) => f.from === currentStatus && f.to === targetStatus
      );
      const msg = forbidden?.reasonAr ?? "هذا التحول في حالة الموعد غير مسموح به في النظام";
      throw new Error(msg);
    }

    // Role check for transition
    if (
      ctx.user.role !== Role.OWNER &&
      !transition.allowedRoles.includes(ctx.user.role as any)
    ) {
      throw new Error("صلاحيات المستخدم لا تسمح بإجراء هذا التغيير في حالة الموعد");
    }

    // Reason requirement check
    if (transition.requiresReason && !input.reason && !input.reasonNotes) {
      throw new Error("يجب تحديد سبب إلزامي لإجراء هذا التغيير في حالة الموعد");
    }

    const fullReason = [input.reason, input.reasonNotes].filter(Boolean).join(": ");
    const updateData: any = {
      status: targetStatus,
      updatedByUserId: ctx.user.id,
    };

    // If moving from WAITLISTED -> SCHEDULED: re-run full booking overlap checks! (R-5.5-9)
    if (currentStatus === AppointmentStatus.WAITLISTED && targetStatus === AppointmentStatus.SCHEDULED) {
      const dateStr = appt.appointmentDate.toISOString().slice(0, 10);
      await validateBookingChecks(tx, {
        patientId: appt.patientId,
        sessionTypeId: appt.sessionTypeId,
        clinicianId: appt.clinicianId,
        roomId: appt.roomId,
        bedId: appt.bedId,
        appointmentDate: dateStr,
        startTime: appt.startTime,
        durationMinutes: appt.durationMinutes,
        packageId: appt.packageId,
        excludeAppointmentId: appt.id,
      });
    }

    // Specific Status Side Effects
    if (targetStatus === AppointmentStatus.ARRIVED) {
      updateData.checkInAt = new Date();
      // If patient is in LEAD status, check-in automatically activates the patient (R-4.2-6)
      if (appt.patient.status === "LEAD") {
        await tx.patient.update({
          where: { id: appt.patientId },
          data: {
            status: "ACTIVE",
            firstVisitAt: new Date(),
            updatedByUserId: ctx.user.id,
          },
        });
      }

      // Notify assigned clinician of arrival (R-14-1)
      await tx.inAppNotification.create({
        data: {
          userId: appt.clinicianId,
          type: "PATIENT_CHECKED_IN",
          titleAr: "حضر المريض",
          titleEn: "Patient Checked In",
          bodyAr: `وصل المريض ${appt.patient.fullName} لمقر العيادة بانتظار بدء الجلسة.`,
          bodyEn: `Patient ${appt.patient.fullName} has arrived at the clinic.`,
          appointmentId: appt.id,
          patientId: appt.patientId,
        },
      });
    } else if (targetStatus === AppointmentStatus.SCHEDULED && currentStatus === AppointmentStatus.ARRIVED) {
      // Undo check-in (R-5.5-2)
      updateData.checkInAt = null;
    } else if (targetStatus === AppointmentStatus.CANCELLED) {
      updateData.cancelledAt = new Date();
      updateData.cancellationReason = fullReason;
      // Void active charge if present
      await tx.charge.updateMany({
        where: { appointmentId: appt.id, status: ChargeStatus.ACTIVE },
        data: { status: ChargeStatus.CANCELLED },
      });

      // Notify assigned clinician of cancellation (R-14-3)
      await tx.inAppNotification.create({
        data: {
          userId: appt.clinicianId,
          type: "APPOINTMENT_CANCELLED",
          titleAr: "تم إلغاء الموعد",
          titleEn: "Appointment Cancelled",
          bodyAr: `تم إلغاء موعد المريض ${appt.patient.fullName}. السبب: ${fullReason || "غير محدد"}`,
          bodyEn: `Appointment for ${appt.patient.fullName} has been cancelled.`,
          appointmentId: appt.id,
          patientId: appt.patientId,
        },
      });
    } else if (targetStatus === AppointmentStatus.NO_SHOW) {
      updateData.noShowAt = new Date();
      updateData.noShowReason = fullReason;
    }

    const updated = await tx.appointment.update({
      where: { id: appt.id },
      data: updateData,
    });

    // Record Status History
    await tx.appointmentStatusHistory.create({
      data: {
        appointmentId: appt.id,
        fromStatus: currentStatus,
        toStatus: targetStatus,
        changedByUserId: ctx.user.id,
        reason: fullReason || undefined,
        ipAddress: "127.0.0.1",
      },
    });

    return updated;
  },
});

// ============================================================================
// 4. Recurring Series Preview & Batch Booking (Spec §5.3, R-5.3-1)
// ============================================================================

export const previewRecurringSeriesAction = defineAction({
  actionKey: "appointment.book_reschedule_cancel",
  schema: z.object({
    patientId: z.string().uuid(),
    sessionTypeId: z.string().uuid(),
    clinicianId: z.string().uuid(),
    roomId: z.string().uuid(),
    bedId: z.string().uuid(),
    startDate: z.string().regex(dateRegex),
    daysOfWeek: z.array(z.number().int().min(0).max(6)),
    startTime: z.string().regex(timeRegex),
    durationMinutes: z.number().int().min(15).max(180).default(45),
    numberOfSessions: z.number().int().min(1).max(36),
    packageId: z.string().uuid().optional().nullable(),
  }),
  handler: async ({ input, tx }) => {
    const dates: Array<{
      date: string;
      startTime: string;
      isValid: boolean;
      reasonIfInvalid?: string;
    }> = [];

    let currentDate = new Date(input.startDate);
    let matchedSessions = 0;
    let safetyCounter = 0;

    while (matchedSessions < input.numberOfSessions && safetyCounter < 180) {
      safetyCounter++;
      const dateStr = currentDate.toISOString().slice(0, 10);
      const dayOfWeek = getMasaarDayOfWeek(dateStr);

      if (input.daysOfWeek.includes(dayOfWeek)) {
        matchedSessions++;
        try {
          await validateBookingChecks(tx, {
            patientId: input.patientId,
            sessionTypeId: input.sessionTypeId,
            clinicianId: input.clinicianId,
            roomId: input.roomId,
            bedId: input.bedId,
            appointmentDate: dateStr,
            startTime: input.startTime,
            durationMinutes: input.durationMinutes ?? 45,
            packageId: input.packageId,
          });
          dates.push({
            date: dateStr,
            startTime: input.startTime,
            isValid: true,
          });
        } catch (err: any) {
          dates.push({
            date: dateStr,
            startTime: input.startTime,
            isValid: false,
            reasonIfInvalid: err.message,
          });
        }
      }

      currentDate.setUTCDate(currentDate.getUTCDate() + 1);
    }

    const availableCount = dates.filter((d) => d.isValid).length;
    return { dates, availableCount };
  },
});

export const bookRecurringSeriesAction = defineAction({
  actionKey: "appointment.book_reschedule_cancel",
  schema: z.object({
    patientId: z.string().uuid(),
    sessionTypeId: z.string().uuid(),
    clinicianId: z.string().uuid(),
    roomId: z.string().uuid(),
    bedId: z.string().uuid(),
    startDate: z.string().regex(dateRegex),
    daysOfWeek: z.array(z.number().int().min(0).max(6)),
    startTime: z.string().regex(timeRegex),
    durationMinutes: z.number().int().min(15).max(180).default(45),
    numberOfSessions: z.number().int().min(1).max(36),
    pricePiasters: z.number().int().min(0).optional(),
    packageId: z.string().uuid().optional().nullable(),
  }),
  audit: {
    entityType: "AppointmentSeries",
    actionName: "SERIES_BOOKED",
    getEntityId: (data) => (data as { series?: { id?: string } })?.series?.id,
  },
  handler: async ({ input, ctx, tx }) => {
    // 1. Calculate series candidate dates
    const series = await tx.appointmentSeries.create({
      data: {
        patientId: input.patientId,
        sessionTypeId: input.sessionTypeId,
        clinicianId: input.clinicianId,
        roomId: input.roomId,
        bedId: input.bedId,
        daysOfWeek: input.daysOfWeek,
        startTime: input.startTime,
        durationMinutes: input.durationMinutes,
        totalSessions: input.numberOfSessions,
        startDate: new Date(input.startDate),
        createdByUserId: ctx.user.id,
      },
    });

    const sessionType = await tx.sessionType.findUnique({
      where: { id: input.sessionTypeId },
    });
    const price = input.packageId
      ? null
      : input.pricePiasters ?? sessionType?.defaultPricePiasters ?? 0;

    const bookedAppointments = [];
    let currentDate = new Date(input.startDate);
    let matchedSessions = 0;
    let safetyCounter = 0;

    while (matchedSessions < input.numberOfSessions && safetyCounter < 180) {
      safetyCounter++;
      const dateStr = currentDate.toISOString().slice(0, 10);
      const dayOfWeek = getMasaarDayOfWeek(dateStr);

      if (input.daysOfWeek.includes(dayOfWeek)) {
        matchedSessions++;
        const { startsAt, endsAt, endTime } = await validateBookingChecks(tx, {
          patientId: input.patientId,
          sessionTypeId: input.sessionTypeId,
          clinicianId: input.clinicianId,
          roomId: input.roomId,
          bedId: input.bedId,
          appointmentDate: dateStr,
          startTime: input.startTime,
          durationMinutes: input.durationMinutes ?? 45,
          packageId: input.packageId,
        });

        const appt = await tx.appointment.create({
          data: {
            patientId: input.patientId,
            sessionTypeId: input.sessionTypeId,
            clinicianId: input.clinicianId,
            roomId: input.roomId,
            bedId: input.bedId,
            seriesId: series.id,
            packageId: input.packageId,
            appointmentDate: new Date(dateStr),
            startTime: input.startTime,
            endTime,
            startsAt,
            endsAt,
            durationMinutes: input.durationMinutes,
            pricePiasters: price,
            status: AppointmentStatus.SCHEDULED,
            createdByUserId: ctx.user.id,
          },
        });

        if (!input.packageId && price && price > 0) {
          await tx.charge.create({
            data: {
              patientId: input.patientId,
              appointmentId: appt.id,
              amountPiasters: price,
              description: sessionType?.nameAr ?? "جلسة علاجية",
              status: ChargeStatus.ACTIVE,
              createdByUserId: ctx.user.id,
            },
          });
        }

        bookedAppointments.push(appt);
      }

      currentDate.setUTCDate(currentDate.getUTCDate() + 1);
    }

    return { series, bookedAppointments };
  },
});

// ============================================================================
// 5. Calendar Views: Day, Week, and Phone Day List (Spec §5.4, R-5.4-1, R-0-13)
// ============================================================================

export const getCalendarDayViewAction = defineAction({
  actionKey: "appointment.book_reschedule_cancel",
  schema: z.object({
    date: z.string().regex(dateRegex),
    clinicianId: z.string().uuid().optional(),
    roomId: z.string().uuid().optional(),
    sessionTypeId: z.string().uuid().optional(),
  }),
  handler: async ({ input, tx }) => {
    const dayOfWeek = getMasaarDayOfWeek(input.date);
    const dateObj = new Date(input.date);

    // Opening hours & closures
    const [openingHour, closure, roomsRaw] = await Promise.all([
      tx.clinicOpeningHour.findUnique({ where: { dayOfWeek } }),
      tx.clinicClosure.findFirst({ where: { closureDate: dateObj, isActive: true } }),
      tx.room.findMany({
        where: {
          isActive: true,
          id: input.roomId ? input.roomId : undefined,
        },
        include: {
          beds: {
            where: { isActive: true },
            orderBy: { name: "asc" },
          },
        },
        orderBy: { nameAr: "asc" },
      }),
    ]);

    // Flag single bed rooms so UI shows room name only (R-5.4-1)
    const rooms = roomsRaw.map((r: any) => ({
      ...r,
      isSingleBed: r.beds.length === 1,
    }));

    // Active calendar appointments
    const appointments = await tx.appointment.findMany({
      where: {
        appointmentDate: dateObj,
        status: { in: ACTIVE_STATUSES },
        clinicianId: input.clinicianId ? input.clinicianId : undefined,
        roomId: input.roomId ? input.roomId : undefined,
        sessionTypeId: input.sessionTypeId ? input.sessionTypeId : undefined,
      },
      include: {
        patient: {
          select: {
            id: true,
            fullName: true,
            mobilePhone: true,
            status: true,
            hasDiabetes: true,
            hasPacemaker: true,
            hasHypertension: true,
            hasOsteoporosis: true,
            hasFallRisk: true,
            isPregnant: true,
          },
        },
        clinician: {
          select: { id: true, fullName: true, role: true },
        },
        sessionType: {
          select: { id: true, nameAr: true, category: true, defaultDurationMinutes: true },
        },
        room: { select: { id: true, nameAr: true } },
        bed: { select: { id: true, name: true } },
        charges: {
          select: { id: true, amountPiasters: true, status: true },
        },
      },
      orderBy: { startsAt: "asc" },
    });

    // Waitlisted items for the day (R-5.4-5)
    const waitlist = await tx.appointment.findMany({
      where: {
        appointmentDate: dateObj,
        status: AppointmentStatus.WAITLISTED,
      },
      include: {
        patient: { select: { id: true, fullName: true, mobilePhone: true } },
        clinician: { select: { id: true, fullName: true } },
        sessionType: { select: { id: true, nameAr: true } },
      },
      orderBy: { createdAt: "asc" },
    });

    return {
      date: input.date,
      openingHour,
      closure,
      rooms,
      appointments,
      waitlist,
    };
  },
});

export const getCalendarWeekViewAction = defineAction({
  actionKey: "appointment.book_reschedule_cancel",
  schema: z.object({
    clinicianId: z.string().uuid(),
    startDate: z.string().regex(dateRegex),
  }),
  handler: async ({ input, tx }) => {
    const clinician = await tx.user.findUnique({
      where: { id: input.clinicianId },
      select: { id: true, fullName: true, role: true, canAssess: true },
    });
    if (!clinician) throw new Error("المعالج غير موجود");

    const start = new Date(input.startDate);
    const end = new Date(start);
    end.setUTCDate(end.getUTCDate() + 7);

    const appointments = await tx.appointment.findMany({
      where: {
        clinicianId: input.clinicianId,
        appointmentDate: { gte: start, lt: end },
        status: { in: ACTIVE_STATUSES },
      },
      include: {
        patient: { select: { id: true, fullName: true, mobilePhone: true } },
        sessionType: { select: { id: true, nameAr: true } },
        bed: { select: { id: true, name: true } },
      },
      orderBy: { startsAt: "asc" },
    });

    const days = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(start);
      d.setUTCDate(d.getUTCDate() + i);
      const dStr = d.toISOString().slice(0, 10);
      days.push({
        date: dStr,
        dayOfWeek: getMasaarDayOfWeek(dStr),
        appointments: appointments.filter(
          (a: any) => a.appointmentDate.toISOString().slice(0, 10) === dStr
        ),
      });
    }

    return { clinician, days };
  },
});

export const getClinicianDayListAction = defineAction({
  actionKey: "appointment.book_reschedule_cancel",
  schema: z.object({
    clinicianId: z.string().uuid(),
    date: z.string().regex(dateRegex),
  }),
  handler: async ({ input, tx }) => {
    const dateObj = new Date(input.date);
    const appointments = await tx.appointment.findMany({
      where: {
        clinicianId: input.clinicianId,
        appointmentDate: dateObj,
        status: { in: ACTIVE_STATUSES },
      },
      include: {
        patient: {
          select: {
            id: true,
            fullName: true,
            mobilePhone: true,
            status: true,
            hasDiabetes: true,
            hasPacemaker: true,
            hasHypertension: true,
            hasOsteoporosis: true,
            hasFallRisk: true,
            isPregnant: true,
          },
        },
        sessionType: { select: { id: true, nameAr: true, category: true } },
        bed: { select: { id: true, name: true } },
        room: { select: { id: true, nameAr: true } },
      },
      orderBy: { startsAt: "asc" },
    });

    return { date: input.date, appointments };
  },
});

export const getCalendarMetadataAction = defineAction({
  actionKey: "appointment.book_reschedule_cancel",
  schema: z.object({}).optional().default({}),
  handler: async ({ tx }) => {
    const [clinicians, roomsRaw, sessionTypes] = await Promise.all([
      tx.user.findMany({
        where: {
          isActive: true,
          role: { in: [Role.PHYSIOTHERAPIST, Role.NUTRITIONIST, Role.OWNER] },
        },
        select: {
          id: true,
          fullName: true,
          role: true,
          canAssess: true,
        },
        orderBy: { fullName: "asc" },
      }),
      tx.room.findMany({
        where: { isActive: true },
        include: {
          beds: {
            where: { isActive: true },
            orderBy: { name: "asc" },
          },
        },
        orderBy: { nameAr: "asc" },
      }),
      tx.sessionType.findMany({
        where: { isActive: true },
        orderBy: { nameAr: "asc" },
      }),
    ]);

    const rooms = roomsRaw.map((r: any) => ({
      ...r,
      isSingleBed: r.beds.length === 1,
    }));

    return { clinicians, rooms, sessionTypes };
  },
});

