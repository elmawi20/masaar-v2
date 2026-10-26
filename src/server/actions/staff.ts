"use server";

import { z } from "zod";
import { defineAction } from "../defineAction";
import { hashPassword } from "../auth/crypto";
import { revokeAllUserSessions } from "../auth/session";
import { revokeAllUserTrustedDevices } from "../auth/trustedDevice";
import { Role, PreferredLanguage, CommissionType } from "@prisma/client";

/**
 * 1. Create Staff Account (Owner Only, R-1.1-19, R-3-1, R-3-4)
 */
export const createStaffAccountAction = defineAction({
  actionKey: "admin.staff.manage_accounts",
  schema: z.object({
    fullName: z.string().min(3),
    email: z.string().email(),
    phone: z.string().min(8),
    jobTitle: z.string().min(2),
    role: z.nativeEnum(Role),
    preferredLanguage: z.nativeEnum(PreferredLanguage).default(PreferredLanguage.AR),
    canAssess: z.boolean().default(false),
    commissionType: z.nativeEnum(CommissionType).default(CommissionType.NONE),
    commissionPercentBasisPoints: z.number().int().min(0).max(10000).default(0),
    commissionFixedPiasters: z.number().int().min(0).default(0),
    initialPassword: z.string().min(8),
  }),
  audit: {
    entityType: "User",
    actionName: "STAFF_ACCOUNT_CREATED",
    getEntityId: (data) => (data as { id: string }).id,
  },
  handler: async ({ input, ctx, tx }) => {
    const normalizedEmail = input.email.toLowerCase().trim();

    const existing = await tx.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (existing) {
      throw new Error("البريد الإلكتروني مسجل بالفعل لموظف آخر.");
    }

    const passwordHash = await hashPassword(input.initialPassword);

    const newUser = await tx.user.create({
      data: {
        fullName: input.fullName,
        email: normalizedEmail,
        phone: input.phone,
        jobTitle: input.jobTitle,
        role: input.role,
        preferredLanguage: input.preferredLanguage,
        canAssess: input.canAssess,
        commissionType: input.commissionType,
        commissionPercentBasisPoints: input.commissionPercentBasisPoints,
        commissionFixedPiasters: input.commissionFixedPiasters,
        passwordHash,
        mustChangePassword: true, // Forces change on first login (R-3-4)
        isActive: true,
        createdByUserId: ctx.user.id,
      },
      select: {
        id: true,
        fullName: true,
        email: true,
        role: true,
        isActive: true,
        createdAt: true,
      },
    });

    return newUser;
  },
});

/**
 * 2. Update Staff Account (Owner Only, R-1.1-19, R-3-1)
 */
export const updateStaffAccountAction = defineAction({
  actionKey: "admin.staff.manage_accounts",
  schema: z.object({
    userId: z.string(),
    fullName: z.string().min(3),
    phone: z.string().min(8),
    jobTitle: z.string().min(2),
    role: z.nativeEnum(Role),
    preferredLanguage: z.nativeEnum(PreferredLanguage),
    canAssess: z.boolean(),
    commissionType: z.nativeEnum(CommissionType),
    commissionPercentBasisPoints: z.number().int().min(0).max(10000),
    commissionFixedPiasters: z.number().int().min(0),
  }),
  audit: {
    entityType: "User",
    actionName: "STAFF_ACCOUNT_UPDATED",
    getEntityId: (_, input) => input.userId,
  },
  handler: async ({ input, tx }) => {
    const updated = await tx.user.update({
      where: { id: input.userId },
      data: {
        fullName: input.fullName,
        phone: input.phone,
        jobTitle: input.jobTitle,
        role: input.role,
        preferredLanguage: input.preferredLanguage,
        canAssess: input.canAssess,
        commissionType: input.commissionType,
        commissionPercentBasisPoints: input.commissionPercentBasisPoints,
        commissionFixedPiasters: input.commissionFixedPiasters,
      },
      select: {
        id: true,
        fullName: true,
        email: true,
        role: true,
        isActive: true,
      },
    });

    return updated;
  },
});

/**
 * 3. Deactivate Staff Account (Owner Only, R-3-5)
 * Deactivated staff cannot log in, disappear from booking lists, history preserved.
 */
export const deactivateStaffAccountAction = defineAction({
  actionKey: "admin.staff.manage_accounts",
  schema: z.object({
    userId: z.string(),
  }),
  audit: {
    entityType: "User",
    actionName: "STAFF_ACCOUNT_DEACTIVATED",
    getEntityId: (_, input) => input.userId,
  },
  handler: async ({ input, tx }) => {
    const user = await tx.user.findUnique({
      where: { id: input.userId },
    });

    if (!user) {
      throw new Error("المستخدم غير موجود.");
    }

    if (user.role === Role.OWNER) {
      throw new Error("لا يمكن تعطيل حساب مالك العيادة الرئيسي.");
    }

    await tx.user.update({
      where: { id: input.userId },
      data: {
        isActive: false,
        deactivatedAt: new Date(),
      },
    });

    // Revoke all sessions and devices immediately (R-3-5, R-15.1-5)
    await revokeAllUserSessions(input.userId);
    await revokeAllUserTrustedDevices(input.userId);

    return {
      success: true,
      message: "تم تعطيل حساب الموظف وإنهاء كافة جلساته النشطة فوراً.",
    };
  },
});

/**
 * 4. Activate Staff Account (Owner Only)
 */
export const activateStaffAccountAction = defineAction({
  actionKey: "admin.staff.manage_accounts",
  schema: z.object({
    userId: z.string(),
  }),
  audit: {
    entityType: "User",
    actionName: "STAFF_ACCOUNT_ACTIVATED",
    getEntityId: (_, input) => input.userId,
  },
  handler: async ({ input, tx }) => {
    await tx.user.update({
      where: { id: input.userId },
      data: {
        isActive: true,
        deactivatedAt: null,
      },
    });

    return {
      success: true,
      message: "تمت إعادة تفعيل حساب الموظف بنجاح.",
    };
  },
});

/**
 * 5. List Staff Accounts (Owner Only, R-1.1-19, R-3-1)
 */
export const listStaffAccountsAction = defineAction({
  actionKey: "admin.staff.manage_accounts",
  schema: z.object({}).optional().default({}),
  handler: async ({ tx }) => {
    return tx.user.findMany({
      orderBy: { createdAt: "asc" },
      select: {
        id: true,
        fullName: true,
        email: true,
        phone: true,
        jobTitle: true,
        role: true,
        isActive: true,
        otpStatus: true,
        mustChangePassword: true,
        canAssess: true,
        commissionType: true,
        commissionPercentBasisPoints: true,
        commissionFixedPiasters: true,
        createdAt: true,
      },
    });
  },
});
