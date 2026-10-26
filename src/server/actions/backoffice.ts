"use server";

import { z } from "zod";
import { defineAction } from "../defineAction";
import {
  ExpenseCategory,
  PaymentMethod,
  CommissionType,
  AppointmentStatus,
  Role,
} from "@prisma/client";

const dateRegex = /^\d{4}-\d{2}-\d{2}$/;

// ============================================================================
// 1. EXPENSES ACTIONS (Spec §10, R-10-1 to R-10-3, DEC-020)
// ============================================================================

export const createExpenseAction = defineAction({
  actionKey: "expense.add",
  schema: z.object({
    title: z.string().min(2).max(150),
    category: z.nativeEnum(ExpenseCategory),
    amountPiasters: z.number().int().positive("المبلغ يجب أن يكون أكبر من الصفر [R-0-4]"),
    paymentMethod: z.nativeEnum(PaymentMethod),
    expenseDate: z.string().regex(dateRegex),
    reason: z.string().optional().nullable(),
    receiptFileKey: z.string().optional().nullable(),
    cashShiftId: z.string().uuid().optional().nullable(),
  }),
  audit: {
    entityType: "Expense",
    actionName: "EXPENSE_CREATED",
    getEntityId: (data) => (data as { id?: string })?.id,
  },
  handler: async ({ input, ctx, tx }) => {
    const todayStr = new Date().toISOString().slice(0, 10);

    // Receptionist can only add expenses for today (R-10-2)
    if (ctx.user.role === Role.RECEPTIONIST) {
      if (input.expenseDate !== todayStr) {
        throw new Error("موظف الاستقبال يمكنه تسجيل المصروفات لتاريخ اليوم فقط [R-10-2]");
      }
    }

    // Auto-detect open cash shift for receptionist cash expenses if not specified
    let shiftId = input.cashShiftId;
    if (!shiftId && input.paymentMethod === PaymentMethod.CASH && ctx.user.role === Role.RECEPTIONIST) {
      const openShift = await tx.cashClosing.findFirst({
        where: {
          cashierUserId: ctx.user.id,
          status: "OPEN",
        },
        orderBy: { openedAt: "desc" },
      });
      if (openShift) {
        shiftId = openShift.id;
      }
    }

    const expense = await tx.expense.create({
      data: {
        title: input.title,
        category: input.category,
        amountPiasters: input.amountPiasters,
        paymentMethod: input.paymentMethod,
        expenseDate: new Date(`${input.expenseDate}T12:00:00.000Z`),
        reason: input.reason,
        receiptFileKey: input.receiptFileKey,
        cashShiftId: shiftId,
        createdByUserId: ctx.user.id,
      },
    });

    return expense;
  },
});

export const editExpenseAction = defineAction({
  actionKey: "expense.edit_void",
  schema: z.object({
    expenseId: z.string().uuid(),
    title: z.string().min(2).max(150).optional(),
    category: z.nativeEnum(ExpenseCategory).optional(),
    amountPiasters: z.number().int().positive().optional(),
    paymentMethod: z.nativeEnum(PaymentMethod).optional(),
    expenseDate: z.string().regex(dateRegex).optional(),
    reason: z.string().optional().nullable(),
    editReason: z.string().min(3, "سبب التعديل إلزامي للرقابة والتدقيق [R-10-3]"),
  }),
  audit: {
    entityType: "Expense",
    actionName: "EXPENSE_EDITED",
    getEntityId: (_, input) => input.expenseId,
  },
  handler: async ({ input, ctx, tx }) => {
    const existing = await tx.expense.findUnique({
      where: { id: input.expenseId },
      include: { cashShift: true },
    });

    if (!existing) {
      throw new Error("سجل المصروف غير موجود");
    }

    if (existing.isVoided) {
      throw new Error("لا يمكن تعديل مصروف ملغى [R-10-3]");
    }

    const todayStr = new Date().toISOString().slice(0, 10);
    const expDateStr = existing.expenseDate.toISOString().slice(0, 10);

    // Receptionist restrictions (R-10-2)
    if (ctx.user.role === Role.RECEPTIONIST) {
      if (existing.createdByUserId !== ctx.user.id) {
        throw new Error("موظف الاستقبال يمكنه تعديل المصروفات التي سجلها بنفسه فقط [R-10-2]");
      }
      if (expDateStr !== todayStr) {
        throw new Error("موظف الاستقبال يمكنه تعديل مصروفات نفس اليوم فقط [R-10-2]");
      }
      if (existing.cashShift && existing.cashShift.status === "CLOSED") {
        throw new Error("لا يمكن تعديل المصروف بعد إغلاق الوردية المرتبطة به [R-10-2]");
      }
    }

    // Record previous state in ExpenseEditHistory (R-10-3)
    await tx.expenseEditHistory.create({
      data: {
        expenseId: existing.id,
        previousTitle: existing.title,
        previousCategory: existing.category,
        previousAmountPiasters: existing.amountPiasters,
        previousPaymentMethod: existing.paymentMethod,
        previousExpenseDate: existing.expenseDate,
        previousReason: existing.reason,
        editedByUserId: ctx.user.id,
        editReason: input.editReason,
      },
    });

    // Update expense
    const updated = await tx.expense.update({
      where: { id: existing.id },
      data: {
        title: input.title ?? existing.title,
        category: input.category ?? existing.category,
        amountPiasters: input.amountPiasters ?? existing.amountPiasters,
        paymentMethod: input.paymentMethod ?? existing.paymentMethod,
        expenseDate: input.expenseDate
          ? new Date(`${input.expenseDate}T12:00:00.000Z`)
          : existing.expenseDate,
        reason: input.reason !== undefined ? input.reason : existing.reason,
        updatedByUserId: ctx.user.id,
      },
    });

    return updated;
  },
});

export const voidExpenseAction = defineAction({
  actionKey: "expense.edit_void",
  schema: z.object({
    expenseId: z.string().uuid(),
    voidReason: z.string().min(3, "سبب الإلغاء إلزامي للرقابة والتدقيق [R-10-3]"),
  }),
  audit: {
    entityType: "Expense",
    actionName: "EXPENSE_VOIDED",
    getEntityId: (_, input) => input.expenseId,
  },
  handler: async ({ input, ctx, tx }) => {
    const existing = await tx.expense.findUnique({
      where: { id: input.expenseId },
      include: { cashShift: true },
    });

    if (!existing) {
      throw new Error("سجل المصروف غير موجود");
    }

    if (existing.isVoided) {
      throw new Error("المصروف ملغى بالفعل");
    }

    const todayStr = new Date().toISOString().slice(0, 10);
    const expDateStr = existing.expenseDate.toISOString().slice(0, 10);

    // Receptionist restrictions (R-10-2)
    if (ctx.user.role === Role.RECEPTIONIST) {
      if (existing.createdByUserId !== ctx.user.id) {
        throw new Error("موظف الاستقبال يمكنه إلغاء المصروفات التي سجلها بنفسه فقط [R-10-2]");
      }
      if (expDateStr !== todayStr) {
        throw new Error("موظف الاستقبال يمكنه إلغاء مصروفات نفس اليوم فقط [R-10-2]");
      }
      if (existing.cashShift && existing.cashShift.status === "CLOSED") {
        throw new Error("لا يمكن إلغاء المصروف بعد إغلاق الوردية المرتبطة به [R-10-2]");
      }
    }

    // Soft delete via voiding (never hard-delete R-10-3, AGENTS.md)
    const voided = await tx.expense.update({
      where: { id: existing.id },
      data: {
        isVoided: true,
        voidReason: input.voidReason,
        voidedAt: new Date(),
        voidedByUserId: ctx.user.id,
      },
    });

    return voided;
  },
});

export const getExpensesAction = defineAction({
  actionKey: "expense.edit_void",
  schema: z.object({
    startDate: z.string().regex(dateRegex),
    endDate: z.string().regex(dateRegex),
    category: z.nativeEnum(ExpenseCategory).optional(),
    includeVoided: z.boolean().default(true),
  }),
  handler: async ({ input, tx }) => {
    const start = new Date(`${input.startDate}T00:00:00.000Z`);
    const end = new Date(`${input.endDate}T23:59:59.999Z`);

    const where: any = {
      expenseDate: { gte: start, lte: end },
    };

    if (input.category) {
      where.category = input.category;
    }

    if (!input.includeVoided) {
      where.isVoided = false;
    }

    const expenses = await tx.expense.findMany({
      where,
      include: {
        createdByUser: { select: { fullName: true, role: true } },
        voidedByUser: { select: { fullName: true } },
        cashShift: { select: { shiftNumber: true, status: true } },
      },
      orderBy: { expenseDate: "desc" },
    });

    const totalActivePiasters = expenses
      .filter((e) => !e.isVoided)
      .reduce((sum, e) => sum + e.amountPiasters, 0);

    return {
      expenses,
      totalActivePiasters,
      count: expenses.length,
    };
  },
});

// ============================================================================
// 2. COMMISSIONS & PAYOUTS (Spec §11, R-11-1 to R-11-5, DEC-010, Q-16)
// ============================================================================

export const calculateClinicianCommissionsAction = defineAction({
  actionKey: "commission.view_all_reports",
  schema: z.object({
    clinicianId: z.string().uuid(),
    startDate: z.string().regex(dateRegex),
    endDate: z.string().regex(dateRegex),
  }),
  handler: async ({ input, tx }) => {
    const clinician = await tx.user.findUnique({
      where: { id: input.clinicianId },
    });

    if (!clinician) {
      throw new Error("المعالج غير موجود");
    }

    const start = new Date(`${input.startDate}T00:00:00.000Z`);
    const end = new Date(`${input.endDate}T23:59:59.999Z`);

    // Fetch all completed appointments for this clinician
    const completedAppts = await tx.appointment.findMany({
      where: {
        clinicianId: clinician.id,
        status: AppointmentStatus.COMPLETED,
        startsAt: { gte: start, lte: end },
      },
      include: {
        patient: { select: { fullName: true, mobilePhone: true } },
        sessionType: true,
        package: true,
        clinicalNote: { select: { completedAt: true } },
      },
      orderBy: { startsAt: "asc" },
    });

    // Fetch all active payout session links for these appointments (R-11-2)
    const apptIds = completedAppts.map((a) => a.id);
    const existingPayoutSessions = await tx.commissionPayoutSession.findMany({
      where: {
        appointmentId: { in: apptIds },
        isVoided: false,
      },
    });

    const paidApptIdSet = new Set(existingPayoutSessions.map((ps) => ps.appointmentId));

    const commissionType = clinician.commissionType;
    const ratePercent = Number(clinician.commissionPercentBasisPoints ?? 0) / 100;
    const fixedPiasters = clinician.commissionFixedPiasters ?? 0;

    const unpaidSessions: any[] = [];
    let totalCommissionPiasters = 0;
    let totalSessionValuePiasters = 0;

    for (const appt of completedAppts) {
      const isPaid = paidApptIdSet.has(appt.id);
      if (isPaid) continue; // Skip already paid sessions (R-11-2)

      // Value of the session
      let sessionValuePiasters = appt.pricePiasters ?? 0;
      if (appt.packageId && appt.package) {
        // In a package, per-session value floor
        sessionValuePiasters = Math.floor(
          appt.package.totalPricePiasters / appt.package.totalSessions
        );
      }

      // Calculate commission based on clinician agreement (R-11-1)
      let commPiasters = 0;
      if (commissionType === CommissionType.PERCENT) {
        commPiasters = Math.round(sessionValuePiasters * (ratePercent / 100));
      } else if (commissionType === CommissionType.FIXED_PER_SESSION) {
        commPiasters = fixedPiasters;
      } else {
        commPiasters = 0; // NONE (e.g. Owner default R-11-1)
      }

      totalCommissionPiasters += commPiasters;
      totalSessionValuePiasters += sessionValuePiasters;

      unpaidSessions.push({
        appointmentId: appt.id,
        patientName: appt.patient.fullName,
        sessionTypeName: appt.sessionType?.nameAr || "جلسة علاج",
        startsAt: appt.startsAt,
        sessionValuePiasters,
        commissionType,
        commissionRate: ratePercent,
        commissionAmountPiasters: commPiasters,
      });
    }

    return {
      clinician: {
        id: clinician.id,
        fullName: clinician.fullName,
        role: clinician.role,
        commissionType,
        commissionRate: ratePercent,
      },
      unpaidSessions,
      totalCommissionPiasters,
      totalSessionValuePiasters,
      unpaidCount: unpaidSessions.length,
    };
  },
});

export const createCommissionPayoutAction = defineAction({
  actionKey: "commission.payout_record",
  schema: z.object({
    clinicianId: z.string().uuid(),
    periodStartDate: z.string().regex(dateRegex),
    periodEndDate: z.string().regex(dateRegex),
    appointmentIds: z.array(z.string().uuid()).min(1, "يجب تحديد جلسة واحدة على الأقل للصرف"),
    paymentMethod: z.nativeEnum(PaymentMethod).default(PaymentMethod.CASH),
    notes: z.string().optional().nullable(),
  }),
  audit: {
    entityType: "CommissionPayout",
    actionName: "COMMISSION_PAYOUT_CREATED",
    getEntityId: (data) => (data as { id?: string })?.id,
  },
  handler: async ({ input, ctx, tx }) => {
    // 1. Check if any appointment is already paid (R-11-2 concurrency guard)
    const alreadyPaid = await tx.commissionPayoutSession.findMany({
      where: {
        appointmentId: { in: input.appointmentIds },
        isVoided: false,
      },
    });

    if (alreadyPaid.length > 0) {
      throw new Error("توجد جلسات تم صرف عمولتها بالفعل من قبل، لا يمكن صرف الجلسة مرتين [R-11-2]");
    }

    // 2. Fetch clinician and appointments
    const clinician = await tx.user.findUnique({
      where: { id: input.clinicianId },
    });
    if (!clinician) throw new Error("المعالج غير موجود");

    const appts = await tx.appointment.findMany({
      where: {
        id: { in: input.appointmentIds },
        clinicianId: clinician.id,
        status: AppointmentStatus.COMPLETED,
      },
      include: { package: true },
    });

    if (appts.length !== input.appointmentIds.length) {
      throw new Error("بعض المواعيد المحددة غير مكتملة أو لا تخص هذا المعالج");
    }

    const commissionType = clinician.commissionType;
    const ratePercent = Number(clinician.commissionPercentBasisPoints ?? 0) / 100;
    const fixedPiasters = clinician.commissionFixedPiasters ?? 0;

    let totalPayoutPiasters = 0;
    const sessionDetails: Array<{
      appointmentId: string;
      sessionValuePiasters: number;
      commissionRateSnapshot: number;
      commissionAmountPiasters: number;
    }> = [];

    for (const a of appts) {
      let val = a.pricePiasters ?? 0;
      if (a.packageId && a.package) {
        val = Math.floor(a.package.totalPricePiasters / a.package.totalSessions);
      }

      let comm = 0;
      if (commissionType === CommissionType.PERCENT) {
        comm = Math.round(val * (ratePercent / 100));
      } else if (commissionType === CommissionType.FIXED_PER_SESSION) {
        comm = fixedPiasters;
      }

      totalPayoutPiasters += comm;
      sessionDetails.push({
        appointmentId: a.id,
        sessionValuePiasters: val,
        commissionRateSnapshot: ratePercent,
        commissionAmountPiasters: comm,
      });
    }

    const resolvedMethod = input.paymentMethod ?? PaymentMethod.CASH;

    // 3. Create DOCTOR_COMMISSION Expense record (R-11-2)
    const expense = await tx.expense.create({
      data: {
        title: `صرف عمولات: ${clinician.fullName}`,
        category: ExpenseCategory.DOCTOR_COMMISSION,
        amountPiasters: totalPayoutPiasters,
        paymentMethod: resolvedMethod,
        expenseDate: new Date(),
        reason: `صرف عمولة ${appts.length} جلسة عن الفترة من ${input.periodStartDate} إلى ${input.periodEndDate}`,
        createdByUserId: ctx.user.id,
      },
    });

    // 4. Create CommissionPayout
    const payout = await tx.commissionPayout.create({
      data: {
        clinicianId: clinician.id,
        periodStartDate: new Date(`${input.periodStartDate}T00:00:00.000Z`),
        periodEndDate: new Date(`${input.periodEndDate}T23:59:59.999Z`),
        totalPayoutPiasters,
        paymentMethod: resolvedMethod,
        payoutDate: new Date(),
        expenseId: expense.id,
        notes: input.notes,
        createdByUserId: ctx.user.id,
      },
    });

    // 5. Create CommissionPayoutSession links (never paid twice R-11-2)
    for (const s of sessionDetails) {
      await tx.commissionPayoutSession.create({
        data: {
          payoutId: payout.id,
          appointmentId: s.appointmentId,
          sessionValuePiasters: s.sessionValuePiasters,
          commissionRateSnapshot: s.commissionRateSnapshot,
          commissionAmountPiasters: s.commissionAmountPiasters,
        },
      });
    }

    return {
      ...payout,
      expenseId: expense.id,
      sessionsCount: sessionDetails.length,
    };
  },
});

export const voidCommissionPayoutAction = defineAction({
  actionKey: "commission.payout_record",
  schema: z.object({
    payoutId: z.string().uuid(),
    voidReason: z.string().min(3, "سبب الإلغاء إلزامي للرقابة والتدقيق [Q-16]"),
  }),
  audit: {
    entityType: "CommissionPayout",
    actionName: "COMMISSION_PAYOUT_VOIDED",
    getEntityId: (_, input) => input.payoutId,
  },
  handler: async ({ input, ctx, tx }) => {
    // Only OWNER can void a commission payout (Q-16)
    if (ctx.user.role !== Role.OWNER) {
      throw new Error("إلغاء صرف العمولات صلاحية مخصصة للمالك فقط [Q-16]");
    }

    const payout = await tx.commissionPayout.findUnique({
      where: { id: input.payoutId },
      include: { paidSessions: true, expense: true },
    });

    if (!payout) throw new Error("سجل الصرف غير موجود");
    if (payout.isVoided) throw new Error("تم إلغاء هذا الصرف مسبقاً");

    // 1. Mark payout as voided
    await tx.commissionPayout.update({
      where: { id: payout.id },
      data: {
        isVoided: true,
        voidReason: input.voidReason,
        voidedAt: new Date(),
        voidedByUserId: ctx.user.id,
      },
    });

    // 2. Mark all linked sessions as voided (restores them to UNPAID status Q-16)
    await tx.commissionPayoutSession.updateMany({
      where: { payoutId: payout.id },
      data: { isVoided: true },
    });

    // 3. Void the linked DOCTOR_COMMISSION expense
    if (payout.expenseId) {
      await tx.expense.update({
        where: { id: payout.expenseId },
        data: {
          isVoided: true,
          voidReason: `إلغاء الصرف: ${input.voidReason}`,
          voidedAt: new Date(),
          voidedByUserId: ctx.user.id,
        },
      });
    }

    return { success: true };
  },
});

export const getMyCommissionsAction = defineAction({
  actionKey: "commission.view_own",
  schema: z.object({
    startDate: z.string().regex(dateRegex),
    endDate: z.string().regex(dateRegex),
  }),
  handler: async ({ input, ctx, tx }) => {
    const clinicianId = ctx.user.id;
    const start = new Date(`${input.startDate}T00:00:00.000Z`);
    const end = new Date(`${input.endDate}T23:59:59.999Z`);

    // Fetch payouts in period
    const payouts = await tx.commissionPayout.findMany({
      where: {
        clinicianId,
        payoutDate: { gte: start, lte: end },
        isVoided: false,
      },
      include: {
        paidSessions: true,
      },
      orderBy: { payoutDate: "desc" },
    });

    const totalCommissionPiasters = payouts.reduce(
      (sum, p) => sum + p.totalPayoutPiasters,
      0
    );

    return {
      payouts,
      totalCommissionPiasters,
    };
  },
});

// ============================================================================
// 3. CLINIC REPORTS & CSV EXPORT (Spec §12, R-12-1 to R-12-6)
// ============================================================================

export type ReportType =
  | "TODAY_SUMMARY"
  | "CLINICIAN_ACTIVITY"
  | "FINANCIAL_REVENUE"
  | "SERVICES_PACKAGES"
  | "PATIENT_RETENTION"
  | "EXPENSES_SUMMARY";

export const getClinicReportAction = defineAction({
  actionKey: "reports.view_financial_operational",
  schema: z.object({
    reportType: z.enum([
      "TODAY_SUMMARY",
      "CLINICIAN_ACTIVITY",
      "FINANCIAL_REVENUE",
      "SERVICES_PACKAGES",
      "PATIENT_RETENTION",
      "EXPENSES_SUMMARY",
    ]),
    startDate: z.string().regex(dateRegex),
    endDate: z.string().regex(dateRegex),
  }),
  handler: async ({ input, tx }) => {
    const start = new Date(`${input.startDate}T00:00:00.000Z`);
    const end = new Date(`${input.endDate}T23:59:59.999Z`);

    if (input.reportType === "TODAY_SUMMARY") {
      const appts = await tx.appointment.findMany({
        where: { startsAt: { gte: start, lte: end } },
      });
      const payments = await tx.payment.findMany({
        where: { collectedAt: { gte: start, lte: end }, isVoided: false },
      });
      const expenses = await tx.expense.findMany({
        where: { expenseDate: { gte: start, lte: end }, isVoided: false },
      });

      const totalRevenue = payments.reduce((sum, p) => sum + p.amountPiasters, 0);
      const totalExpenses = expenses.reduce((sum, e) => sum + e.amountPiasters, 0);

      return {
        totalAppointments: appts.length,
        completedAppointments: appts.filter((a) => a.status === AppointmentStatus.COMPLETED).length,
        cancelledAppointments: appts.filter((a) => a.status === AppointmentStatus.CANCELLED).length,
        noShowAppointments: appts.filter((a) => a.status === AppointmentStatus.NO_SHOW).length,
        totalRevenuePiasters: totalRevenue,
        totalExpensesPiasters: totalExpenses,
        netPiasters: totalRevenue - totalExpenses,
      };
    }

    if (input.reportType === "CLINICIAN_ACTIVITY") {
      const clinicians = await tx.user.findMany({
        where: { role: { in: [Role.PHYSIOTHERAPIST, Role.NUTRITIONIST, Role.OWNER] } },
      });
      const appts = await tx.appointment.findMany({
        where: { startsAt: { gte: start, lte: end } },
      });

      const activity = clinicians.map((c) => {
        const cAppts = appts.filter((a) => a.clinicianId === c.id);
        const completed = cAppts.filter((a) => a.status === AppointmentStatus.COMPLETED).length;
        const cancelled = cAppts.filter((a) => a.status === AppointmentStatus.CANCELLED).length;
        const noShow = cAppts.filter((a) => a.status === AppointmentStatus.NO_SHOW).length;
        const total = cAppts.length;
        const cancelRate = total > 0 ? Math.round(((cancelled + noShow) / total) * 100) : 0;

        return {
          clinicianId: c.id,
          clinicianName: c.fullName,
          role: c.role,
          totalAppointments: total,
          completedSessions: completed,
          cancelledCount: cancelled,
          noShowCount: noShow,
          cancellationRatePercent: cancelRate,
        };
      });

      return { clinicianActivity: activity };
    }

    if (input.reportType === "FINANCIAL_REVENUE") {
      const payments = await tx.payment.findMany({
        where: { collectedAt: { gte: start, lte: end } },
      });
      const activePayments = payments.filter((p) => !p.isVoided);
      const voidedPayments = payments.filter((p) => p.isVoided);

      const cashRevenue = activePayments
        .filter((p) => p.paymentMethod === PaymentMethod.CASH)
        .reduce((sum, p) => sum + p.amountPiasters, 0);

      const cardRevenue = activePayments
        .filter((p) => p.paymentMethod === PaymentMethod.CARD)
        .reduce((sum, p) => sum + p.amountPiasters, 0);

      const transferRevenue = activePayments
        .filter((p) => p.paymentMethod === PaymentMethod.INSTAPAY || p.paymentMethod === PaymentMethod.VODAFONE_CASH)
        .reduce((sum, p) => sum + p.amountPiasters, 0);

      const totalRevenue = activePayments.reduce((sum, p) => sum + p.amountPiasters, 0);
      const totalVoided = voidedPayments.reduce((sum, p) => sum + p.amountPiasters, 0);

      return {
        cashRevenuePiasters: cashRevenue,
        cardRevenuePiasters: cardRevenue,
        transferRevenuePiasters: transferRevenue,
        totalRevenuePiasters: totalRevenue,
        totalVoidedPiasters: totalVoided,
        paymentsCount: activePayments.length,
      };
    }

    if (input.reportType === "SERVICES_PACKAGES") {
      const packages = await tx.package.findMany({
        where: { createdAt: { gte: start, lte: end } },
        include: {
          appointments: {
            select: { status: true },
          },
        },
      });
      const totalSold = packages.length;
      const totalSessions = packages.reduce((sum, p) => sum + p.totalSessions, 0);
      const completedSessions = packages.reduce(
        (sum, p) => sum + p.appointments.filter((a) => a.status === AppointmentStatus.COMPLETED).length,
        0
      );
      const utilizationRate = totalSessions > 0 ? Math.round((completedSessions / totalSessions) * 100) : 0;

      return {
        packagesSold: totalSold,
        totalPackageSessions: totalSessions,
        completedPackageSessions: completedSessions,
        utilizationRatePercent: utilizationRate,
      };
    }

    if (input.reportType === "PATIENT_RETENTION") {
      const newPatients = await tx.patient.count({
        where: { createdAt: { gte: start, lte: end } },
      });
      const totalActive = await tx.patient.count({
        where: { status: "ACTIVE" },
      });

      return {
        newPatientsRegistered: newPatients,
        totalActivePatients: totalActive,
      };
    }

    if (input.reportType === "EXPENSES_SUMMARY") {
      const expenses = await tx.expense.findMany({
        where: { expenseDate: { gte: start, lte: end }, isVoided: false },
      });

      const byCategory: Record<string, number> = {};
      for (const e of expenses) {
        byCategory[e.category] = (byCategory[e.category] || 0) + e.amountPiasters;
      }

      const totalExpensesPiasters = expenses.reduce((sum, e) => sum + e.amountPiasters, 0);

      return {
        totalExpensesPiasters,
        byCategory,
        expensesCount: expenses.length,
      };
    }

    return {};
  },
});

export const exportReportToCsvAction = defineAction({
  actionKey: "reports.export_csv",
  schema: z.object({
    reportType: z.enum([
      "TODAY_SUMMARY",
      "CLINICIAN_ACTIVITY",
      "FINANCIAL_REVENUE",
      "SERVICES_PACKAGES",
      "PATIENT_RETENTION",
      "EXPENSES_SUMMARY",
    ]),
    startDate: z.string().regex(dateRegex),
    endDate: z.string().regex(dateRegex),
  }),
  handler: async ({ input, ctx, tx }) => {
    // Generate Report Data
    const repRes = await getClinicReportAction(input, { user: ctx.user });
    const data = repRes.success ? repRes.data : {};

    let csv = "";

    // STRICT PRIVACY COMPLIANCE (R-12-6): NO medical conditions, diagnosis, or clinical notes!
    if (input.reportType === "TODAY_SUMMARY") {
      csv = "Metric,Value\n";
      csv += `Total Appointments,${(data as any).totalAppointments || 0}\n`;
      csv += `Completed Appointments,${(data as any).completedAppointments || 0}\n`;
      csv += `Cancelled Appointments,${(data as any).cancelledAppointments || 0}\n`;
      csv += `Revenue (EGP),${((data as any).totalRevenuePiasters || 0) / 100}\n`;
      csv += `Expenses (EGP),${((data as any).totalExpensesPiasters || 0) / 100}\n`;
      csv += `Net (EGP),${((data as any).netPiasters || 0) / 100}\n`;
    } else if (input.reportType === "CLINICIAN_ACTIVITY") {
      csv = "Clinician Name,Role,Total Appointments,Completed Sessions,Cancelled,Cancellation Rate %\n";
      const list = (data as any).clinicianActivity || [];
      for (const item of list) {
        csv += `"${item.clinicianName}",${item.role},${item.totalAppointments},${item.completedSessions},${item.cancelledCount},${item.cancellationRatePercent}%\n`;
      }
    } else if (input.reportType === "FINANCIAL_REVENUE") {
      csv = "Payment Method,Amount (EGP)\n";
      csv += `Cash,${((data as any).cashRevenuePiasters || 0) / 100}\n`;
      csv += `Card,${((data as any).cardRevenuePiasters || 0) / 100}\n`;
      csv += `Bank / Transfer,${((data as any).transferRevenuePiasters || 0) / 100}\n`;
      csv += `Total Revenue,${((data as any).totalRevenuePiasters || 0) / 100}\n`;
    } else if (input.reportType === "SERVICES_PACKAGES") {
      csv = "Metric,Value\n";
      csv += `Packages Sold,${(data as any).packagesSold || 0}\n`;
      csv += `Total Package Sessions,${(data as any).totalPackageSessions || 0}\n`;
      csv += `Completed Sessions,${(data as any).completedPackageSessions || 0}\n`;
      csv += `Utilization Rate %,${(data as any).utilizationRatePercent || 0}%\n`;
    } else if (input.reportType === "PATIENT_RETENTION") {
      csv = "Metric,Value\n";
      csv += `New Patients Registered,${(data as any).newPatientsRegistered || 0}\n`;
      csv += `Total Active Patients,${(data as any).totalActivePatients || 0}\n`;
    } else if (input.reportType === "EXPENSES_SUMMARY") {
      csv = "Category,Amount (EGP)\n";
      const cats = (data as any).byCategory || {};
      for (const [k, v] of Object.entries(cats)) {
        csv += `"${k}",${Number(v) / 100}\n`;
      }
      csv += `Total Expenses,${((data as any).totalExpensesPiasters || 0) / 100}\n`;
    }

    return {
      csvString: csv,
      filename: `masaar_${input.reportType.toLowerCase()}_${input.startDate}_to_${input.endDate}.csv`,
    };
  },
});

// ============================================================================
// 4. AUDIT LOG VIEWER & PRIVACY MASKING (Spec §13, R-13-1 to R-13-3)
// ============================================================================

export const getAuditLogsAction = defineAction({
  actionKey: "audit.view_filter",
  schema: z.object({
    startDate: z.string().regex(dateRegex).optional(),
    endDate: z.string().regex(dateRegex).optional(),
    userId: z.string().uuid().optional(),
    entityType: z.string().optional(),
    action: z.string().optional(),
    limit: z.number().int().min(1).max(200).default(50),
    offset: z.number().int().min(0).default(0),
  }),
  handler: async ({ input, ctx, tx }) => {
    // Only Owner and Manager can view audit logs (R-13-1)
    if (ctx.user.role !== Role.OWNER && ctx.user.role !== Role.MANAGER) {
      throw new Error("صلاحية الاطلاع على سجل التدقيق مقتصرة على المالك والمدير [R-13-1]");
    }

    const where: any = {};

    if (input.startDate && input.endDate) {
      where.timestamp = {
        gte: new Date(`${input.startDate}T00:00:00.000Z`),
        lte: new Date(`${input.endDate}T23:59:59.999Z`),
      };
    }

    if (input.userId) {
      where.userId = input.userId;
    }

    if (input.entityType) {
      where.entityType = input.entityType;
    }

    if (input.action) {
      where.action = input.action;
    }

    const [logs, totalCount] = await Promise.all([
      tx.auditLog.findMany({
        where,
        include: {
          user: { select: { fullName: true, role: true } },
        },
        orderBy: { timestamp: "desc" },
        take: input.limit,
        skip: input.offset,
      }),
      tx.auditLog.count({ where }),
    ]);

    // PRIVACY GUARD (R-13-3): Manager viewing audit logs must have clinical content masked!
    // Owner sees unmasked data.
    const isManager = ctx.user.role === Role.MANAGER;

    const sanitizedLogs = logs.map((log) => {
      if (isManager && (log.entityType === "ClinicalNote" || log.entityType === "InBodyRecord")) {
        return {
          ...log,
          beforeState: log.beforeState ? { clinicalContent: "*** MASKED CLINICAL CONTENT ***" } : null,
          afterState: log.afterState ? { clinicalContent: "*** MASKED CLINICAL CONTENT ***" } : null,
          reason: log.reason ? "*** MASKED CLINICAL CONTENT ***" : null,
        };
      }
      return log;
    });

    return {
      logs: sanitizedLogs,
      totalCount,
      limit: input.limit,
      offset: input.offset,
    };
  },
});
