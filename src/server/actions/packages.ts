"use server";

import { z } from "zod";
import { defineAction } from "../defineAction";
import { SessionCategory, AppointmentStatus } from "@prisma/client";

// ============================================================================
// Helper: Dynamic Package Calculation (calculations.md §4.3 - §4.5)
// ============================================================================

function calculatePackageMetrics(pkg: {
  id: string;
  totalSessions: number;
  totalPricePiasters: number;
  expiryDate: Date;
  cancelledAt: Date | null;
  cancellationReason: string | null;
  appointments?: Array<{ status: AppointmentStatus }>;
}) {
  const appointments = pkg.appointments || [];
  
  const completedSessions = appointments.filter(
    (a) => a.status === AppointmentStatus.COMPLETED
  ).length;

  const futureBookedSessions = appointments.filter(
    (a) =>
      a.status === AppointmentStatus.SCHEDULED ||
      a.status === AppointmentStatus.ARRIVED ||
      a.status === AppointmentStatus.WAITLISTED
  ).length;

  const perSessionValuePiasters = Math.floor(
    pkg.totalPricePiasters / Math.max(1, pkg.totalSessions)
  );

  const today = new Date();
  const isPastExpiry = today > new Date(pkg.expiryDate);

  let status: "ACTIVE" | "COMPLETED" | "EXPIRED" | "CANCELLED" = "ACTIVE";
  if (pkg.cancelledAt) {
    status = "CANCELLED";
  } else if (completedSessions >= pkg.totalSessions) {
    status = "COMPLETED";
  } else if (isPastExpiry) {
    status = "EXPIRED";
  } else {
    status = "ACTIVE";
  }

  let availableSessions = 0;
  let forfeitedSessions = 0;

  if (status === "ACTIVE") {
    availableSessions = Math.max(0, pkg.totalSessions - completedSessions - futureBookedSessions);
  } else if (status === "EXPIRED") {
    forfeitedSessions = Math.max(0, pkg.totalSessions - completedSessions);
    availableSessions = 0;
  } else if (status === "COMPLETED" || status === "CANCELLED") {
    availableSessions = 0;
  }

  return {
    completedSessions,
    futureBookedSessions,
    availableSessions,
    forfeitedSessions,
    perSessionValuePiasters,
    status,
  };
}

// ============================================================================
// 1. Create Package (R-7-1, R-7-2, R-7-3, R-8.1-1, DEC-009)
// Permitted: OWNER, MANAGER, RECEPTIONIST
// ============================================================================

export const createPackageAction = defineAction({
  actionKey: "package.create",
  schema: z.object({
    patientId: z.string().uuid(),
    sessionTypeId: z.string().uuid(),
    totalSessions: z.number().int().min(1).max(100),
    totalPricePiasters: z.number().int().min(0),
    startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    notes: z.string().optional().nullable(),
  }),
  audit: {
    entityType: "Package",
    actionName: "PACKAGE_CREATED",
    getEntityId: (data) => (data as { id?: string })?.id,
  },
  handler: async ({ input, ctx, tx }) => {
    // 1. Verify Session Type category: PT or Nutrition only (R-7-1, DEC-009)
    const sessionType = await tx.sessionType.findUnique({
      where: { id: input.sessionTypeId },
    });
    if (!sessionType || !sessionType.isActive) {
      throw new Error("نوع الجلسة غير موجود أو غير مفعل");
    }

    if (sessionType.category === SessionCategory.CONSULTANT_ASSESSMENT) {
      throw new Error("لا يمكن إنشاء باقة لجلسات الكشف والتقييم الاستشاري (جلسات فردية فقط)");
    }

    // 2. Calculate Start & Expiry Date (+60 days Cairo local default R-2-6, R-7-1)
    const start = input.startDate ? new Date(input.startDate) : new Date();
    const expiry = new Date(start.getTime());
    expiry.setUTCDate(expiry.getUTCDate() + 60);

    // 3. Create Package
    const pkg = await tx.package.create({
      data: {
        patientId: input.patientId,
        sessionTypeId: input.sessionTypeId,
        totalSessions: input.totalSessions,
        totalPricePiasters: input.totalPricePiasters,
        startDate: start,
        expiryDate: expiry,
        notes: input.notes,
        createdByUserId: ctx.user.id,
      },
      include: {
        sessionType: true,
      },
    });

    // 4. Create Charge for Package (R-8.1-1)
    await tx.charge.create({
      data: {
        patientId: input.patientId,
        packageId: pkg.id,
        amountPiasters: input.totalPricePiasters,
        description: `باقة ${sessionType.nameAr} (${input.totalSessions} جلسات)`,
        createdByUserId: ctx.user.id,
      },
    });

    const metrics = calculatePackageMetrics({
      ...pkg,
      appointments: [],
    });

    return {
      ...pkg,
      ...metrics,
    };
  },
});

export const getPackageSessionTypesAction = defineAction({
  actionKey: "package.create",
  schema: z.object({}),
  handler: async ({ tx }) => {
    const sessionTypes = await tx.sessionType.findMany({
      where: {
        isActive: true,
        category: {
          in: [SessionCategory.PHYSIOTHERAPY, SessionCategory.NUTRITION],
        },
      },
      orderBy: { nameAr: "asc" },
    });
    return sessionTypes;
  },
});

// ============================================================================
// 2. Get Patient Packages with Dynamic Status (calculations.md §4.3)
// Permitted: ALL logged-in staff
// ============================================================================

export const getPatientPackagesAction = defineAction({
  actionKey: "patient.admin.create_edit",
  schema: z.object({
    patientId: z.string().uuid(),
  }),
  handler: async ({ input, tx }) => {
    const rawPackages = await tx.package.findMany({
      where: { patientId: input.patientId },
      include: {
        sessionType: true,
        appointments: {
          select: {
            id: true,
            status: true,
            appointmentDate: true,
            startTime: true,
          },
        },
        extensions: {
          include: {
            extendedByUser: {
              select: { fullName: true },
            },
          },
          orderBy: { extendedAt: "desc" },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    const packages = rawPackages.map((pkg) => {
      const metrics = calculatePackageMetrics(pkg);
      return {
        ...pkg,
        ...metrics,
      };
    });

    return { packages };
  },
});

// ============================================================================
// 3. Extend Package Validity (R-7-6)
// Permitted: OWNER, MANAGER only
// ============================================================================

export const extendPackageAction = defineAction({
  actionKey: "package.extend",
  schema: z.object({
    packageId: z.string().uuid(),
    daysToAdd: z.number().int().min(1).max(365),
    reason: z.string().min(3),
  }),
  audit: {
    entityType: "PackageExtension",
    actionName: "PACKAGE_EXTENDED",
    getEntityId: (data) => (data as { id?: string })?.id,
    getReason: (input) => input.reason,
  },
  handler: async ({ input, ctx, tx }) => {
    const pkg = await tx.package.findUnique({
      where: { id: input.packageId },
      include: {
        appointments: { select: { status: true } },
      },
    });

    if (!pkg) {
      throw new Error("الباقة غير موجودة");
    }
    if (pkg.cancelledAt) {
      throw new Error("لا يمكن تمديد باقة ملغاة");
    }

    const previousExpiryDate = pkg.expiryDate;
    const today = new Date();
    // If already expired, extend from today; otherwise extend from previous expiry
    const baseDate = previousExpiryDate > today ? previousExpiryDate : today;
    const newExpiryDate = new Date(baseDate.getTime());
    newExpiryDate.setUTCDate(newExpiryDate.getUTCDate() + input.daysToAdd);

    // 1. Create extension audit record
    await tx.packageExtension.create({
      data: {
        packageId: pkg.id,
        previousExpiryDate,
        newExpiryDate,
        daysAdded: input.daysToAdd,
        reason: input.reason,
        extendedByUserId: ctx.user.id,
      },
    });

    // 2. Update package expiryDate
    const updatedPkg = await tx.package.update({
      where: { id: pkg.id },
      data: {
        expiryDate: newExpiryDate,
        updatedByUserId: ctx.user.id,
      },
      include: {
        sessionType: true,
        appointments: { select: { status: true } },
      },
    });

    const metrics = calculatePackageMetrics(updatedPkg);

    return {
      ...updatedPkg,
      ...metrics,
    };
  },
});

// ============================================================================
// 4. Cancel Package (R-7-4, R-8.1-3, TR-PKG-04)
// Permitted: OWNER, MANAGER only
// ============================================================================

export const cancelPackageAction = defineAction({
  actionKey: "package.cancel",
  schema: z.object({
    packageId: z.string().uuid(),
    reason: z.string().min(2),
    reasonNotes: z.string().optional().nullable(),
  }),
  audit: {
    entityType: "Package",
    actionName: "PACKAGE_CANCELLED",
    getEntityId: (data) => (data as { id?: string })?.id,
    getReason: (input) => input.reason,
  },
  handler: async ({ input, ctx, tx }) => {
    const pkg = await tx.package.findUnique({
      where: { id: input.packageId },
      include: {
        appointments: { select: { id: true, status: true } },
      },
    });

    if (!pkg) {
      throw new Error("الباقة غير موجودة");
    }
    if (pkg.cancelledAt) {
      throw new Error("الباقة ملغاة بالفعل");
    }

    const cancellationReason = input.reasonNotes
      ? `${input.reason}: ${input.reasonNotes}`
      : input.reason;

    // 1. Mark package cancelled
    const updatedPkg = await tx.package.update({
      where: { id: pkg.id },
      data: {
        cancelledAt: new Date(),
        cancellationReason,
        updatedByUserId: ctx.user.id,
      },
    });

    // 2. Free future scheduled/waitlisted sessions booked under this package
    await tx.appointment.updateMany({
      where: {
        packageId: pkg.id,
        status: { in: [AppointmentStatus.SCHEDULED, AppointmentStatus.WAITLISTED] },
      },
      data: {
        status: AppointmentStatus.CANCELLED,
        cancelledAt: new Date(),
        cancellationReason: "إلغاء الباقة المرتبطة بالموعد",
      },
    });

    return {
      success: true,
      package: updatedPkg,
    };
  },
});

// ============================================================================
// 5. Write Off Balance (R-7-5, R-8.1-4)
// Permitted: OWNER, MANAGER only
// ============================================================================

export const writeOffBalanceAction = defineAction({
  actionKey: "billing.balance.write_off",
  schema: z.object({
    chargeId: z.string().uuid(),
    amountPiasters: z.number().int().min(1),
    reason: z.string().min(3),
  }),
  audit: {
    entityType: "WriteOff",
    actionName: "BALANCE_WRITTEN_OFF",
    getEntityId: (data) => (data as { id?: string })?.id,
    getReason: (input) => input.reason,
  },
  handler: async ({ input, ctx, tx }) => {
    const charge = await tx.charge.findUnique({
      where: { id: input.chargeId },
    });
    if (!charge) {
      throw new Error("المطالبة المالية غير موجودة");
    }

    const writeOff = await tx.writeOff.create({
      data: {
        chargeId: input.chargeId,
        amountPiasters: input.amountPiasters,
        reason: input.reason,
        approvedByUserId: ctx.user.id,
      },
    });

    return writeOff;
  },
});
