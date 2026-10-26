"use server";

import { z } from "zod";
import { defineAction } from "../defineAction";
import {
  AppointmentStatus,
  ChargeStatus,
  NotificationType,
  ReminderStatus,
  ReminderChannel,
} from "@prisma/client";
import { normalizeEgyptianPhone } from "@/domain/patients/phone";

const dateRegex = /^\d{4}-\d{2}-\d{2}$/;

// ============================================================================
// 1. Today Dashboard Metrics (Spec §6, R-6-1)
// ============================================================================

export const getTodayDashboardAction = defineAction({
  actionKey: "appointment.book_reschedule_cancel",
  schema: z.object({
    date: z.string().regex(dateRegex).optional(),
  }),
  handler: async ({ input, tx }) => {
    const todayStr = input.date ?? new Date().toISOString().slice(0, 10);
    const dateObj = new Date(todayStr);

    const now = new Date();
    const in7Days = new Date(now);
    in7Days.setUTCDate(in7Days.getUTCDate() + 7);

    // 1. Appointment Counts for Today
    const [scheduledCount, arrivedCount, completedCount, cancelledCount, noShowCount] =
      await Promise.all([
        tx.appointment.count({
          where: { appointmentDate: dateObj, status: AppointmentStatus.SCHEDULED },
        }),
        tx.appointment.count({
          where: { appointmentDate: dateObj, status: AppointmentStatus.ARRIVED },
        }),
        tx.appointment.count({
          where: { appointmentDate: dateObj, status: AppointmentStatus.COMPLETED },
        }),
        tx.appointment.count({
          where: { appointmentDate: dateObj, status: AppointmentStatus.CANCELLED },
        }),
        tx.appointment.count({
          where: { appointmentDate: dateObj, status: AppointmentStatus.NO_SHOW },
        }),
      ]);

    // 2. Arriving Next: upcoming scheduled appointments for today
    const arrivingNext = await tx.appointment.findMany({
      where: {
        appointmentDate: dateObj,
        status: AppointmentStatus.SCHEDULED,
      },
      include: {
        patient: {
          select: {
            id: true,
            fullName: true,
            mobilePhone: true,
            whatsappPhone: true,
            isDependent: true,
            guardianPhone: true,
            whatsappConsent: true,
            preferredLanguage: true,
            hasDiabetes: true,
            hasPacemaker: true,
            hasHypertension: true,
            hasOsteoporosis: true,
            hasFallRisk: true,
            isPregnant: true,
          },
        },
        clinician: { select: { id: true, fullName: true, role: true } },
        sessionType: { select: { id: true, nameAr: true, defaultDurationMinutes: true } },
        room: { select: { id: true, nameAr: true } },
        bed: { select: { id: true, name: true } },
        charges: {
          select: { id: true, amountPiasters: true, status: true },
        },
      },
      orderBy: { startsAt: "asc" },
      take: 20,
    });

    // 3. Waiting List today (R-5.4-5, R-6-1)
    const waitingList = await tx.appointment.findMany({
      where: {
        appointmentDate: dateObj,
        status: AppointmentStatus.WAITLISTED,
      },
      include: {
        patient: { select: { id: true, fullName: true, mobilePhone: true } },
        sessionType: { select: { id: true, nameAr: true } },
        clinician: { select: { id: true, fullName: true } },
      },
      orderBy: { createdAt: "asc" },
    });

    // 4. Unpaid Today: appointments with active charges
    const unpaidToday = await tx.appointment.findMany({
      where: {
        appointmentDate: dateObj,
        status: { in: [AppointmentStatus.SCHEDULED, AppointmentStatus.ARRIVED, AppointmentStatus.COMPLETED] },
        charges: {
          some: {
            status: ChargeStatus.ACTIVE,
          },
        },
      },
      include: {
        patient: { select: { id: true, fullName: true, mobilePhone: true } },
        charges: { select: { id: true, amountPiasters: true, status: true } },
      },
      orderBy: { startsAt: "asc" },
    });

    // 5. Packages expiring in <= 7 days (DEC-009, R-6-1)
    const expiringPackages = await tx.package.findMany({
      where: {
        cancelledAt: null,
        expiryDate: {
          lte: in7Days,
          gte: now,
        },
      },
      include: {
        patient: { select: { id: true, fullName: true, mobilePhone: true, preferredLanguage: true } },
        sessionType: { select: { id: true, nameAr: true } },
      },
      orderBy: { expiryDate: "asc" },
    });

    // 6. Packages with <= 1 session remaining (R-6-1, R-14-4)
    const activePackages = await tx.package.findMany({
      where: { cancelledAt: null },
      include: {
        patient: { select: { id: true, fullName: true, mobilePhone: true, preferredLanguage: true } },
        sessionType: { select: { id: true, nameAr: true } },
        appointments: {
          where: {
            status: {
              in: [
                AppointmentStatus.SCHEDULED,
                AppointmentStatus.ARRIVED,
                AppointmentStatus.WAITLISTED,
                AppointmentStatus.COMPLETED,
              ],
            },
          },
          select: { id: true },
        },
      },
    });

    const lowSessionPackages = activePackages
      .map((pkg: any) => ({
        ...pkg,
        availableSessions: pkg.totalSessions - pkg.appointments.length,
      }))
      .filter((pkg: any) => pkg.availableSessions <= 1);

    return {
      date: todayStr,
      counts: {
        scheduled: scheduledCount,
        arrived: arrivedCount,
        completed: completedCount,
        cancelled: cancelledCount,
        noShow: noShowCount,
        totalToday: scheduledCount + arrivedCount + completedCount + cancelledCount + noShowCount,
      },
      arrivingNext,
      waitingList,
      unpaidToday,
      expiringPackages,
      lowSessionPackages,
    };
  },
});

// ============================================================================
// 2. Tomorrow's Reminders & Mark as Sent (Spec §6, R-6-3)
// ============================================================================

export const getTomorrowRemindersAction = defineAction({
  actionKey: "appointment.book_reschedule_cancel",
  schema: z.object({
    date: z.string().regex(dateRegex).optional(),
  }),
  handler: async ({ input, tx }) => {
    let targetDateStr = input.date;
    if (!targetDateStr) {
      const tomorrow = new Date();
      tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
      targetDateStr = tomorrow.toISOString().slice(0, 10);
    }
    const dateObj = new Date(targetDateStr);

    const appointmentsRaw = await tx.appointment.findMany({
      where: {
        appointmentDate: dateObj,
        status: AppointmentStatus.SCHEDULED,
      },
      include: {
        patient: {
          select: {
            id: true,
            fullName: true,
            mobilePhone: true,
            whatsappPhone: true,
            isDependent: true,
            guardianPhone: true,
            whatsappConsent: true,
            preferredLanguage: true,
          },
        },
        clinician: { select: { id: true, fullName: true, role: true } },
        sessionType: { select: { id: true, nameAr: true } },
        room: { select: { id: true, nameAr: true } },
        bed: { select: { id: true, name: true } },
        reminders: {
          where: { status: ReminderStatus.SENT },
          orderBy: { sentAt: "desc" },
          take: 1,
        },
      },
      orderBy: { startsAt: "asc" },
    });

    const appointments = appointmentsRaw.map((a: any) => ({
      ...a,
      reminderSent: a.reminders.length > 0,
      lastReminderSentAt: a.reminders[0]?.sentAt ?? null,
    }));

    return { date: targetDateStr, appointments };
  },
});

export const markReminderSentAction = defineAction({
  actionKey: "appointment.book_reschedule_cancel",
  schema: z.object({
    appointmentId: z.string().uuid(),
    recipientPhone: z.string().min(8),
    templateKey: z.string().default("REMINDER"),
  }),
  audit: {
    entityType: "AppointmentReminder",
    actionName: "REMINDER_SENT",
    getEntityId: (data) => (data as { id?: string })?.id,
  },
  handler: async ({ input, ctx, tx }) => {
    const reminder = await tx.appointmentReminder.create({
      data: {
        appointmentId: input.appointmentId,
        channel: ReminderChannel.WHATSAPP,
        recipientPhone: input.recipientPhone,
        status: ReminderStatus.SENT,
        templateKey: input.templateKey,
        sentByUserId: ctx.user.id,
      },
    });

    return reminder;
  },
});

// ============================================================================
// 3. WhatsApp wa.me Link Generator & Templates (Spec §6, R-6-4)
// ============================================================================

export const generateWhatsAppLinkAction = defineAction({
  actionKey: "appointment.book_reschedule_cancel",
  schema: z.object({
    patientId: z.string().uuid(),
    templateKey: z.enum([
      "WELCOME",
      "REMINDER",
      "RESCHEDULE",
      "LOW_SESSIONS",
      "BALANCE_DUE",
      "EXPIRING_SOON",
    ]),
    customVariables: z.record(z.string()).optional(),
  }),
  handler: async ({ input, tx }) => {
    const patient = await tx.patient.findUnique({
      where: { id: input.patientId },
    });
    if (!patient) throw new Error("المريض غير موجود");

    // Check WhatsApp Consent (R-6-4)
    if (!patient.whatsappConsent) {
      return {
        optedOut: true,
        warning: "المريض غير موافق على استلام رسائل واتساب (Opted out)",
        phone: null,
        text: null,
        waLink: null,
      };
    }

    // Determine target phone (dependent routes to guardian phone, R-4.1-6, R-6-4)
    let rawPhone = patient.mobilePhone;
    if (patient.isDependent && patient.guardianPhone) {
      rawPhone = patient.guardianPhone;
    } else if (patient.whatsappPhone) {
      rawPhone = patient.whatsappPhone;
    }

    if (!rawPhone) {
      throw new Error("لا يوجد رقم هاتف مسجل للمريض أو ولي الأمر");
    }

    // Convert Egyptian 01XXXXXXXXX to international E.164: 201XXXXXXXXX
    let phone = rawPhone.replace(/\D/g, "");
    if (phone.startsWith("0")) {
      phone = "2" + phone;
    } else if (!phone.startsWith("20") && phone.length === 10) {
      phone = "20" + phone;
    }

    // Format Template Text based on Preferred Language
    const isAr = patient.preferredLanguage !== "EN";
    const vars = input.customVariables ?? {};
    const patientName = patient.fullName;
    const date = vars.appointmentDate ?? "";
    const time = vars.appointmentTime ?? "";
    const clinician = vars.clinicianName ?? "";
    const packageType = vars.packageType ?? "العلاج الطبيعي والتأهيل";

    let text = "";
    switch (input.templateKey) {
      case "WELCOME":
        text = isAr
          ? `أهلاً بك يا ${patientName} في عيادة مسار للتأهيل والعلاج الطبيعي. يسعدنا تقديم أفضل رعاية صحية لك.`
          : `Welcome ${patientName} to Masaar Rehabilitation Clinic. We are pleased to serve you.`;
        break;

      case "REMINDER":
        text = isAr
          ? `مرحباً ${patientName}، نذكرك بموعدك القادم في عيادة مسار يوم ${date} الساعة ${time} مع ${clinician}. نتمنى لك دوام الصحة والعافية.`
          : `Hello ${patientName}, this is a reminder for your upcoming appointment at Masaar Clinic on ${date} at ${time} with ${clinician}.`;
        break;

      case "RESCHEDULE":
        text = isAr
          ? `مرحباً ${patientName}، تم تعديل موعدك في عيادة مسار ليصبح يوم ${date} الساعة ${time}. ننتظر تشريفك لنا.`
          : `Hello ${patientName}, your appointment at Masaar Clinic has been rescheduled to ${date} at ${time}.`;
        break;

      case "LOW_SESSIONS":
        text = isAr
          ? `مرحباً ${patientName}، نفيدك بأنه متبقي لديك جلسة واحدة فقط في باقة ${packageType}. يرجى التنسيق مع الاستقبال لتجديد الباقة.`
          : `Hello ${patientName}, you have 1 session remaining in your ${packageType} package. Please contact reception to renew.`;
        break;

      case "BALANCE_DUE":
        text = isAr
          ? `مرحباً ${patientName}، يرجى التكرم بتسوية الرصيد المستحق لجلساتك في عيادة مسار عند زيارتك القادمة. شكراً لتعاونك.`
          : `Hello ${patientName}, please settle your outstanding balance at Masaar Clinic on your next visit. Thank you.`;
        break;

      case "EXPIRING_SOON":
        text = isAr
          ? `مرحباً ${patientName}، نود إحاطتك بأن باقة ${packageType} الخاصة بك ستنتهي صلاحيتها خلال 7 أيام. يرجى استكمال الجلسات المتبقية.`
          : `Hello ${patientName}, your ${packageType} package will expire in 7 days. Please book your remaining sessions.`;
        break;
    }

    const waLink = `https://wa.me/${phone}?text=${encodeURIComponent(text)}`;

    return {
      optedOut: false,
      warning: null,
      phone,
      text,
      waLink,
    };
  },
});

// ============================================================================
// 4. In-App Notifications (Spec §14, R-14-1 to R-14-6)
// ============================================================================

export const getInAppNotificationsAction = defineAction({
  actionKey: "appointment.book_reschedule_cancel",
  schema: z.object({
    limit: z.number().int().min(1).max(50).default(20),
  }).optional().default({}),
  handler: async ({ input, ctx, tx }) => {
    const notifications = await tx.inAppNotification.findMany({
      where: {
        userId: ctx.user.id,
      },
      orderBy: { createdAt: "desc" },
      take: input?.limit ?? 20,
    });

    const unreadCount = await tx.inAppNotification.count({
      where: {
        userId: ctx.user.id,
        isRead: false,
      },
    });

    return { notifications, unreadCount };
  },
});

export const markNotificationReadAction = defineAction({
  actionKey: "appointment.book_reschedule_cancel",
  schema: z.object({
    notificationId: z.string().uuid(),
  }),
  handler: async ({ input, ctx, tx }) => {
    const updated = await tx.inAppNotification.update({
      where: { id: input.notificationId },
      data: {
        isRead: true,
        readAt: new Date(),
      },
    });

    return updated;
  },
});
