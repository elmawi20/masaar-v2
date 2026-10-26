"use server";

import { z } from "zod";
import { defineAction } from "../defineAction";
import { PaymentMethod, CashShiftStatus, Role } from "@prisma/client";

// ============================================================================
// Helper: Calculate Cairo Local Year (R-8.2-3)
// ============================================================================

function getCairoYear(date: Date = new Date()): number {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: "Africa/Cairo",
    year: "numeric",
  });
  return Number(formatter.format(date));
}

// ============================================================================
// Helper: Calculate Charge Balance Dynamically (R-8.1-3, DEC-023)
// ============================================================================

async function calculateChargeBalance(
  tx: any,
  chargeId: string
): Promise<{
  charge: any;
  owedPiasters: number;
  nonVoidedPaymentsPiasters: number;
  refundsPiasters: number;
  writeOffsPiasters: number;
  balancePiasters: number;
}> {
  const charge = await tx.charge.findUnique({
    where: { id: chargeId },
    include: {
      patient: true,
      package: {
        include: {
          appointments: { select: { status: true } },
        },
      },
      appointment: true,
      payments: {
        where: { isVoided: false },
      },
      refunds: true,
      writeOffs: true,
    },
  });

  if (!charge) {
    throw new Error("المطالبة المالية غير موجودة");
  }

  // 1. Calculate Owed Piasters
  let owedPiasters = charge.amountPiasters;
  if (charge.package) {
    if (charge.package.cancelledAt) {
      // For cancelled package: owed = completedSessions * perSessionValue (R-8.1-3)
      const completedSessions = charge.package.appointments.filter(
        (a: any) => a.status === "COMPLETED"
      ).length;
      const perSessionValuePiasters = Math.floor(
        charge.package.totalPricePiasters / Math.max(1, charge.package.totalSessions)
      );
      owedPiasters = completedSessions * perSessionValuePiasters;
    } else {
      owedPiasters = charge.package.totalPricePiasters;
    }
  } else if (charge.appointment) {
    owedPiasters = charge.appointment.pricePiasters ?? charge.amountPiasters;
  }

  // 2. Non-voided payments
  const nonVoidedPaymentsPiasters = charge.payments.reduce(
    (acc: number, p: any) => acc + p.amountPiasters,
    0
  );

  // 3. Refunds
  const refundsPiasters = charge.refunds.reduce(
    (acc: number, r: any) => acc + r.amountPiasters,
    0
  );

  // 4. Write-offs
  const writeOffsPiasters = charge.writeOffs.reduce(
    (acc: number, w: any) => acc + w.amountPiasters,
    0
  );

  // 5. Balance Formula: max(0, owed - (payments - refunds) - writeOffs) (R-8.1-3)
  const netPaidPiasters = nonVoidedPaymentsPiasters - refundsPiasters;
  const balancePiasters = Math.max(0, owedPiasters - netPaidPiasters - writeOffsPiasters);

  return {
    charge,
    owedPiasters,
    nonVoidedPaymentsPiasters,
    refundsPiasters,
    writeOffsPiasters,
    balancePiasters,
  };
}

// ============================================================================
// 1. Record Payment (R-8.1-2, R-8.2-1, R-8.2-2, R-8.2-3)
// Permitted: OWNER, MANAGER, RECEPTIONIST
// ============================================================================

export const recordPaymentAction = defineAction({
  actionKey: "billing.payment.record",
  schema: z.object({
    chargeId: z.string().uuid(),
    amountPiasters: z.number().int().min(1),
    paymentMethod: z.nativeEnum(PaymentMethod),
    referenceNumber: z.string().optional().nullable(),
    notes: z.string().optional().nullable(),
  }),
  audit: {
    entityType: "Payment",
    actionName: "PAYMENT_RECORDED",
    getEntityId: (data) => (data as { id?: string })?.id,
  },
  handler: async ({ input, ctx, tx }) => {
    // 1. Calculate current charge balance and verify no overpayment
    const { balancePiasters } = await calculateChargeBalance(tx, input.chargeId);

    if (input.amountPiasters > balancePiasters) {
      throw new Error(
        `المبلغ المدفوع (${(input.amountPiasters / 100).toFixed(2)} ج.م) يتجاوز الرصيد المتبقي على المطالبة (${(balancePiasters / 100).toFixed(2)} ج.م)`
      );
    }

    // 2. Atomic Sequential Receipt Numbering (INV-YYYY-00001) in Cairo Local Year (R-8.2-2, R-8.2-3, DEC-017)
    const year = getCairoYear();
    const counter = await tx.receiptCounter.upsert({
      where: { year },
      create: { year, lastValue: 1 },
      update: { lastValue: { increment: 1 } },
    });

    const sequence = counter.lastValue;
    const receiptNumber = `INV-${year}-${String(sequence).padStart(5, "0")}`;

    // 3. Create Payment Record
    const payment = await tx.payment.create({
      data: {
        chargeId: input.chargeId,
        receiptNumber,
        receiptYear: year,
        receiptSequence: sequence,
        amountPiasters: input.amountPiasters,
        paymentMethod: input.paymentMethod,
        collectedByUserId: ctx.user.id,
        collectedAt: new Date(),
      },
      include: {
        charge: {
          include: {
            patient: true,
          },
        },
        collectedByUser: {
          select: { fullName: true, role: true },
        },
      },
    });

    return payment;
  },
});

// ============================================================================
// 2. Get Charge Billing Details with Dynamic Balance (R-8.1-3)
// Permitted: All Staff
// ============================================================================

export const getChargeBillingDetailsAction = defineAction({
  actionKey: "billing.payment.record",
  schema: z.object({
    chargeId: z.string().uuid(),
  }),
  handler: async ({ input, tx }) => {
    const details = await calculateChargeBalance(tx, input.chargeId);
    return details;
  },
});

// ============================================================================
// 3. Void Payment Receipt (R-8.3-1)
// Permitted: OWNER, MANAGER only
// ============================================================================

export const voidPaymentAction = defineAction({
  actionKey: "billing.receipt.void",
  schema: z.object({
    paymentId: z.string().uuid(),
    reason: z.string().min(3),
  }),
  audit: {
    entityType: "Payment",
    actionName: "PAYMENT_VOIDED",
    getEntityId: (data) => (data as { id?: string })?.id,
    getReason: (input) => input.reason,
  },
  handler: async ({ input, ctx, tx }) => {
    const payment = await tx.payment.findUnique({
      where: { id: input.paymentId },
    });

    if (!payment) {
      throw new Error("إيصال السداد غير موجود");
    }
    if (payment.isVoided) {
      throw new Error("الإيصال ملغي بالفعل");
    }

    const updatedPayment = await tx.payment.update({
      where: { id: payment.id },
      data: {
        isVoided: true,
        voidedAt: new Date(),
        voidReason: input.reason,
        voidedByUserId: ctx.user.id,
      },
    });

    return updatedPayment;
  },
});

// ============================================================================
// 4. Issue Refund (R-8.3-2, R-8.3-3, DEC-019)
// Permitted: OWNER, MANAGER only
// ============================================================================

export const issueRefundAction = defineAction({
  actionKey: "billing.receipt.refund",
  schema: z.object({
    chargeId: z.string().uuid(),
    paymentId: z.string().uuid().optional().nullable(),
    amountPiasters: z.number().int().min(1),
    refundMethod: z.nativeEnum(PaymentMethod),
    handedOutByUserId: z.string().uuid(),
    reason: z.string().min(3),
  }),
  audit: {
    entityType: "Refund",
    actionName: "REFUND_ISSUED",
    getEntityId: (data) => (data as { id?: string })?.id,
    getReason: (input) => input.reason,
  },
  handler: async ({ input, ctx, tx }) => {
    const charge = await tx.charge.findUnique({
      where: { id: input.chargeId },
      include: {
        package: {
          include: {
            appointments: { select: { status: true } },
          },
        },
        payments: { where: { isVoided: false } },
        refunds: true,
      },
    });

    if (!charge) {
      throw new Error("المطالبة المالية غير موجودة");
    }

    const totalPaid = charge.payments.reduce((acc: number, p: any) => acc + p.amountPiasters, 0);
    const totalRefunded = charge.refunds.reduce((acc: number, r: any) => acc + r.amountPiasters, 0);

    let maxRefundable = totalPaid - totalRefunded;

    // For packages: max refundable = totalPaid - value of used sessions - prior refunds (R-8.3-2)
    if (charge.package) {
      const completedSessions = charge.package.appointments.filter(
        (a: any) => a.status === "COMPLETED"
      ).length;
      const perSessionValuePiasters = Math.floor(
        charge.package.totalPricePiasters / Math.max(1, charge.package.totalSessions)
      );
      const usedSessionsValue = completedSessions * perSessionValuePiasters;
      maxRefundable = Math.max(0, totalPaid - usedSessionsValue - totalRefunded);
    }

    if (input.amountPiasters > maxRefundable) {
      throw new Error(
        `قيمة الاسترداد المطلوبة (${(input.amountPiasters / 100).toFixed(2)} ج.م) تتجاوز الحد الأقصى المسموح به (${(maxRefundable / 100).toFixed(2)} ج.م)`
      );
    }

    // Verify handedOutBy user exists and is active
    const handedOutUser = await tx.user.findUnique({
      where: { id: input.handedOutByUserId },
    });
    if (!handedOutUser || !handedOutUser.isActive) {
      throw new Error("الموظف المحدد لتسليم النقدية غير موجود أو غير مفعل");
    }

    const refund = await tx.refund.create({
      data: {
        chargeId: input.chargeId,
        paymentId: input.paymentId,
        amountPiasters: input.amountPiasters,
        refundMethod: input.refundMethod,
        handedOutByUserId: input.handedOutByUserId,
        reason: input.reason,
        approvedByUserId: ctx.user.id,
        refundedAt: new Date(),
      },
      include: {
        handedOutByUser: { select: { fullName: true } },
        approvedByUser: { select: { fullName: true } },
      },
    });

    return refund;
  },
});

// ============================================================================
// 5. Change Price (R-1.1-13, R-1.1-14, R-8.3-4)
// Before payment: Receptionist, Manager, Owner (R-1.1-13)
// After payment: Owner, Manager only, cannot reduce below paid amount (R-1.1-14, R-8.3-4)
// ============================================================================

export const changePriceAction = defineAction({
  actionKey: "billing.price.change_before_payment",
  schema: z.object({
    chargeId: z.string().uuid(),
    newPricePiasters: z.number().int().min(0),
    reason: z.string().min(3),
  }),
  audit: {
    entityType: "PriceChangeHistory",
    actionName: "PRICE_CHANGED",
    getEntityId: (data) => (data as { id?: string })?.id,
    getReason: (input) => input.reason,
  },
  handler: async ({ input, ctx, tx }) => {
    const charge = await tx.charge.findUnique({
      where: { id: input.chargeId },
      include: {
        payments: { where: { isVoided: false } },
        refunds: true,
        package: true,
        appointment: true,
      },
    });

    if (!charge) {
      throw new Error("المطالبة المالية غير موجودة");
    }

    const totalPaid = charge.payments.reduce((acc: number, p: any) => acc + p.amountPiasters, 0);
    const totalRefunded = charge.refunds.reduce((acc: number, r: any) => acc + r.amountPiasters, 0);
    const netPaidPiasters = Math.max(0, totalPaid - totalRefunded);

    // If payments exist: Owner/Manager only (R-1.1-14)
    if (netPaidPiasters > 0) {
      if (ctx.user.role !== Role.OWNER && ctx.user.role !== Role.MANAGER) {
        throw new Error("تعديل السعر بعد وجود سدادات مسجلة مقتصر على المالك والمدير فقط [R-1.1-14]");
      }

      // Cannot reduce price below amount already paid (R-8.3-4)
      if (input.newPricePiasters < netPaidPiasters) {
        throw new Error(
          `لا يمكن تخفيض السعر (${(input.newPricePiasters / 100).toFixed(2)} ج.م) إلى قيمة أقل من إجمالي المبالغ المسددة (${(netPaidPiasters / 100).toFixed(2)} ج.م) [R-8.3-4]`
        );
      }
    }

    const oldPricePiasters = charge.amountPiasters;

    // 1. Update Charge amount
    const updatedCharge = await tx.charge.update({
      where: { id: charge.id },
      data: {
        amountPiasters: input.newPricePiasters,
      },
    });

    // 2. Synchronize related Appointment or Package price if linked
    if (charge.appointmentId) {
      await tx.appointment.update({
        where: { id: charge.appointmentId },
        data: { pricePiasters: input.newPricePiasters },
      });
    }
    if (charge.packageId) {
      await tx.package.update({
        where: { id: charge.packageId },
        data: { totalPricePiasters: input.newPricePiasters },
      });
    }

    // 3. Log Price Change History (R-8.3-4)
    const history = await tx.priceChangeHistory.create({
      data: {
        entityType: "CHARGE",
        entityId: charge.id,
        chargeId: charge.id,
        appointmentId: charge.appointmentId,
        packageId: charge.packageId,
        oldPricePiasters,
        newPricePiasters: input.newPricePiasters,
        reason: input.reason,
        changedByUserId: ctx.user.id,
      },
    });

    return {
      charge: updatedCharge,
      priceChangeHistory: history,
    };
  },
});

// ============================================================================
// 6. Cash Shift Status & Logout Prompt Check (R-8.4-1, R-8.4-2)
// Permitted: All Staff
// ============================================================================

export const getCurrentUserCashShiftStatusAction = defineAction({
  actionKey: "billing.cash_shift.close_own",
  schema: z.object({}),
  handler: async ({ ctx, tx }) => {
    // Unclosed Cash Payments collected by current user
    const payments = await tx.payment.findMany({
      where: {
        collectedByUserId: ctx.user.id,
        paymentMethod: PaymentMethod.CASH,
        isVoided: false,
        cashShiftId: null,
      },
    });

    // Unclosed Cash Refunds handed out by current user (R-8.3-3)
    const refunds = await tx.refund.findMany({
      where: {
        handedOutByUserId: ctx.user.id,
        refundMethod: PaymentMethod.CASH,
        cashShiftId: null,
      },
    });

    // Unclosed Cash Expenses created by current user
    const expenses = await tx.expense.findMany({
      where: {
        createdByUserId: ctx.user.id,
        paymentMethod: PaymentMethod.CASH,
        isVoided: false,
        cashShiftId: null,
      },
    });

    const cashPaymentsTotal = payments.reduce((acc: number, p: any) => acc + p.amountPiasters, 0);
    const cashRefundsTotal = refunds.reduce((acc: number, r: any) => acc + r.amountPiasters, 0);
    const cashExpensesTotal = expenses.reduce((acc: number, e: any) => acc + e.amountPiasters, 0);

    const expectedCashPiasters = cashPaymentsTotal - cashRefundsTotal - cashExpensesTotal;

    const hasUnclosedCashTransactions =
      payments.length > 0 || refunds.length > 0 || expenses.length > 0;

    return {
      hasUnclosedCashTransactions,
      expectedCashPiasters,
      paymentsCount: payments.length,
      refundsCount: refunds.length,
      expensesCount: expenses.length,
      cashPaymentsTotal,
      cashRefundsTotal,
      cashExpensesTotal,
    };
  },
});

// ============================================================================
// 7. Close Cash Shift (End of Shift R-8.4-1, R-8.4-3)
// Permitted: OWNER, MANAGER, RECEPTIONIST
// ============================================================================

export const closeCashShiftAction = defineAction({
  actionKey: "billing.cash_shift.close_own",
  schema: z.object({
    countedCashPiasters: z.number().int().min(0),
    closingNotes: z.string().optional().nullable(),
  }),
  audit: {
    entityType: "CashClosing",
    actionName: "CASH_SHIFT_CLOSED",
    getEntityId: (data) => (data as { id?: string })?.id,
  },
  handler: async ({ input, ctx, tx }) => {
    // 1. Fetch all unclosed cash transactions for this cashier
    const payments = await tx.payment.findMany({
      where: {
        collectedByUserId: ctx.user.id,
        paymentMethod: PaymentMethod.CASH,
        isVoided: false,
        cashShiftId: null,
      },
    });

    const refunds = await tx.refund.findMany({
      where: {
        handedOutByUserId: ctx.user.id,
        refundMethod: PaymentMethod.CASH,
        cashShiftId: null,
      },
    });

    const expenses = await tx.expense.findMany({
      where: {
        createdByUserId: ctx.user.id,
        paymentMethod: PaymentMethod.CASH,
        isVoided: false,
        cashShiftId: null,
      },
    });

    const cashPaymentsTotal = payments.reduce((acc: number, p: any) => acc + p.amountPiasters, 0);
    const cashRefundsTotal = refunds.reduce((acc: number, r: any) => acc + r.amountPiasters, 0);
    const cashExpensesTotal = expenses.reduce((acc: number, e: any) => acc + e.amountPiasters, 0);

    // Expected cash = payments - refunds - expenses (R-8.4-1)
    const expectedCashPiasters = cashPaymentsTotal - cashRefundsTotal - cashExpensesTotal;
    const differencePiasters = input.countedCashPiasters - expectedCashPiasters;

    // Shift number sequential for user
    const previousClosingsCount = await tx.cashClosing.count({
      where: { cashierUserId: ctx.user.id },
    });
    const shiftNumber = previousClosingsCount + 1;

    const paymentIds = payments.map((p: any) => p.id);
    const refundIds = refunds.map((r: any) => r.id);
    const expenseIds = expenses.map((e: any) => e.id);

    // 2. Create Frozen Snapshot CashClosing Record (R-8.4-1)
    const closing = await tx.cashClosing.create({
      data: {
        shiftNumber,
        cashierUserId: ctx.user.id,
        openedAt: payments[0]?.collectedAt || new Date(),
        closedAt: new Date(),
        status: CashShiftStatus.CLOSED,
        countedCashPiasters: input.countedCashPiasters,
        expectedCashPiasters,
        differencePiasters,
        includedTransactionIds: {
          paymentIds,
          refundIds,
          expenseIds,
        },
        closingNotes: input.closingNotes,
      },
    });

    // 3. Stamp transactions with cashShiftId to lock them (R-8.4-3)
    if (paymentIds.length > 0) {
      await tx.payment.updateMany({
        where: { id: { in: paymentIds } },
        data: { cashShiftId: closing.id },
      });
    }
    if (refundIds.length > 0) {
      await tx.refund.updateMany({
        where: { id: { in: refundIds } },
        data: { cashShiftId: closing.id },
      });
    }
    if (expenseIds.length > 0) {
      await tx.expense.updateMany({
        where: { id: { in: expenseIds } },
        data: { cashShiftId: closing.id },
      });
    }

    return closing;
  },
});
