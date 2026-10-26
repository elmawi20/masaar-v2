"use server";

import { z } from "zod";
import { cookies, headers } from "next/headers";
import { defineAction } from "../defineAction";
import { prisma } from "../db";
import {
  hashPassword,
  verifyPassword,
  encryptSecret,
  decryptSecret,
  generateRandomToken,
  hashToken,
} from "../auth/crypto";
import {
  generateTotpSecret,
  generateTotpQrCode,
  verifyTotpToken,
  generateBackupCodes,
  verifyBackupCode,
} from "../auth/totp";
import {
  createSession,
  revokeSession,
  revokeAllUserSessions,
  SESSION_COOKIE_NAME,
  SESSION_MAX_AGE_SECONDS,
} from "../auth/session";
import {
  createTrustedDevice,
  isDeviceTrusted,
  revokeAllUserTrustedDevices,
  TRUSTED_DEVICE_COOKIE_NAME,
  TRUSTED_DEVICE_MAX_AGE_SECONDS,
} from "../auth/trustedDevice";
import {
  initiatePasswordReset,
  verifyPasswordResetCode,
} from "../auth/passwordReset";

// Helper to get client IP and User Agent
async function getClientMetadata(): Promise<{ ipAddress: string; userAgent?: string }> {
  try {
    const headerStore = await headers();
    const ipAddress =
      headerStore.get("x-forwarded-for")?.split(",")[0]?.trim() || "127.0.0.1";
    const userAgent = headerStore.get("user-agent") || undefined;
    return { ipAddress, userAgent };
  } catch {
    return { ipAddress: "127.0.0.1", userAgent: undefined };
  }
}

async function safeGetCookie(name: string): Promise<string | undefined> {
  try {
    const cookieStore = await cookies();
    return cookieStore.get(name)?.value;
  } catch {
    return undefined;
  }
}

async function safeSetCookie(
  name: string,
  value: string,
  options: {
    httpOnly: boolean;
    secure: boolean;
    sameSite: "lax" | "strict" | "none";
    path: string;
    maxAge: number;
  }
): Promise<void> {
  try {
    const cookieStore = await cookies();
    cookieStore.set(name, value, options);
  } catch {
    // Safely skipped when called outside HTTP request context (e.g. tests)
  }
}

async function safeDeleteCookie(name: string): Promise<void> {
  try {
    const cookieStore = await cookies();
    cookieStore.delete(name);
  } catch {
    // Safely skipped when called outside HTTP request context
  }
}

// In-memory or temporary cache for 2FA login pending state (valid for 5 minutes)
const pendingAuthCache = new Map<
  string,
  {
    userId: string;
    email: string;
    expiresAt: number;
    pendingSecret?: string;
  }
>();

// Clean up expired tokens periodically
function cleanupPendingCache() {
  const now = Date.now();
  for (const [token, data] of pendingAuthCache.entries()) {
    if (data.expiresAt < now) {
      pendingAuthCache.delete(token);
    }
  }
}

/**
 * 1. Login Action: Email + Password step
 * Validates credentials, checks 15-minute lockout (R-15.1-3),
 * generic error on failure (R-15.1-2), checks trusted device (R-15.2-4).
 */
export const loginAction = defineAction({
  actionKey: "auth.login",
  isPublic: true,
  schema: z.object({
    email: z.string().email(),
    password: z.string().min(1),
    trustDevice: z.boolean().optional(),
  }),
  audit: {
    entityType: "UserSession",
    actionName: "AUTH_LOGIN_STEP1",
  },
  handler: async ({ input, tx }) => {
    cleanupPendingCache();
    const { ipAddress, userAgent } = await getClientMetadata();
    const normalizedEmail = input.email.toLowerCase().trim();

    const user = await tx.user.findUnique({
      where: { email: normalizedEmail },
      include: { otpSecret: true },
    });

    const now = new Date();

    // Check account lockout (R-15.1-3)
    if (user?.lockedUntil && user.lockedUntil > now) {
      const remainingMinutes = Math.max(
        1,
        Math.ceil((user.lockedUntil.getTime() - now.getTime()) / (60 * 1000))
      );
      throw new Error(
        `الحساب مقفل مؤقتاً لمدة ${remainingMinutes} دقيقة بعد محاولات فاشلة متكررة.`
      );
    }

    // Generic verification to prevent user enumeration (R-15.1-2)
    const isPasswordValid = user
      ? await verifyPassword(input.password, user.passwordHash)
      : false;

    if (!user || !user.isActive || !isPasswordValid) {
      if (user) {
        const nextFailedCount = user.failedLoginCount + 1;
        const willLock = nextFailedCount >= 5;
        const lockedUntil = willLock ? new Date(now.getTime() + 15 * 60 * 1000) : null;

        await prisma.user.update({
          where: { id: user.id },
          data: {
            failedLoginCount: willLock ? 0 : nextFailedCount,
            lockedUntil,
          },
        });

        await prisma.loginAttempt.create({
          data: {
            email: normalizedEmail,
            ipAddress,
            userAgent,
            isSuccessful: false,
            failureReason: willLock ? "ACCOUNT_LOCKED_5_FAILURES" : "INVALID_PASSWORD",
          },
        });

        if (willLock) {
          await prisma.auditLog.create({
            data: {
              userId: user.id,
              userRole: user.role,
              action: "AUTH_LOCKOUT_TRIGGERED",
              entityType: "User",
              entityId: user.id,
              reason: "5 consecutive failed password attempts triggered 15-minute lockout",
              ipAddress,
              userAgent,
            },
          });

          throw new Error("تم تجاوز الحد الأقصى للمحاولات (5 محاولات). تم قفل الحساب مؤقتاً لمدة 15 دقيقة.");
        }
      } else {
        await prisma.loginAttempt.create({
          data: {
            email: normalizedEmail,
            ipAddress,
            userAgent,
            isSuccessful: false,
            failureReason: "USER_NOT_FOUND",
          },
        });
      }

      throw new Error("البريد الإلكتروني أو كلمة المرور غير صحيحة");
    }

    // Reset failed count upon valid password
    await prisma.user.update({
      where: { id: user.id },
      data: { failedLoginCount: 0, lockedUntil: null },
    });

    // Check if user must change password
    if (user.mustChangePassword) {
      const tempToken = generateRandomToken();
      pendingAuthCache.set(tempToken, {
        userId: user.id,
        email: user.email,
        expiresAt: Date.now() + 5 * 60 * 1000,
      });
      return {
        status: "MUST_CHANGE_PASSWORD" as const,
        tempToken,
      };
    }

    // Check OTP Status: If NOT_SET, user must enroll 2FA (R-15.2-2)
    if (user.otpStatus === "NOT_SET" || !user.otpSecret) {
      const { secret, otpAuthUrl } = generateTotpSecret(user.email);
      const qrCode = await generateTotpQrCode(otpAuthUrl);
      const tempToken = generateRandomToken();

      pendingAuthCache.set(tempToken, {
        userId: user.id,
        email: user.email,
        expiresAt: Date.now() + 10 * 60 * 1000,
        pendingSecret: secret,
      });

      return {
        status: "REQUIRES_OTP_ENROLLMENT" as const,
        tempToken,
        qrCode,
        secret,
      };
    }

    // Check Trusted Device (R-15.2-4)
    const trustedToken = await safeGetCookie(TRUSTED_DEVICE_COOKIE_NAME);
    const isTrusted = await isDeviceTrusted(user.id, trustedToken);

    if (isTrusted) {
      // Skip OTP, log in directly
      const { sessionToken } = await createSession({
        userId: user.id,
        ipAddress,
        userAgent,
      });

      await safeSetCookie(SESSION_COOKIE_NAME, sessionToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        maxAge: SESSION_MAX_AGE_SECONDS,
      });

      await tx.loginAttempt.create({
        data: {
          email: normalizedEmail,
          ipAddress,
          userAgent,
          isSuccessful: true,
          failureReason: "TRUSTED_DEVICE_BYPASS",
        },
      });

      return {
        status: "AUTHENTICATED" as const,
        user: {
          id: user.id,
          fullName: user.fullName,
          email: user.email,
          role: user.role,
        },
      };
    }

    // Standard 2FA Step required (R-15.2-3)
    const tempToken = generateRandomToken();
    pendingAuthCache.set(tempToken, {
      userId: user.id,
      email: user.email,
      expiresAt: Date.now() + 5 * 60 * 1000,
    });

    return {
      status: "REQUIRES_OTP" as const,
      tempToken,
    };
  },
});

/**
 * 2. Verify OTP Action: TOTP 6-digit or Backup Code verification
 */
export const verifyOtpAction = defineAction({
  actionKey: "auth.verify_otp",
  isPublic: true,
  schema: z.object({
    tempToken: z.string(),
    code: z.string(),
    isBackupCode: z.boolean().optional(),
    trustDevice: z.boolean().optional(),
    deviceName: z.string().optional(),
  }),
  audit: {
    entityType: "UserSession",
    actionName: "AUTH_VERIFY_OTP",
  },
  handler: async ({ input, tx }) => {
    cleanupPendingCache();
    const pending = pendingAuthCache.get(input.tempToken);
    if (!pending || pending.expiresAt < Date.now()) {
      throw new Error("انتهت صلاحية جلسة التحقق، يرجى إعادة تسجيل الدخول.");
    }

    const { ipAddress, userAgent } = await getClientMetadata();
    const user = await tx.user.findUnique({
      where: { id: pending.userId },
      include: { otpSecret: true, backupCodes: true },
    });

    if (!user || !user.isActive || !user.otpSecret) {
      throw new Error("حساب المستخدم غير متاح أو لم يفعل المصادقة.");
    }

    const now = new Date();
    // Check OTP Lockout (R-15.2-5)
    if (user.otpSecret.otpLockedUntil && user.otpSecret.otpLockedUntil > now) {
      const remainingMinutes = Math.ceil(
        (user.otpSecret.otpLockedUntil.getTime() - now.getTime()) / (60 * 1000)
      );
      throw new Error(
        `رمز التحقق مقفل مؤقتاً لمدة ${remainingMinutes} دقيقة بسبب محاولات خاطئة متكررة.`
      );
    }

    let isValid = false;

    if (input.isBackupCode) {
      // Verify Backup Code (R-15.2-2, R-15.2-3)
      const cleanCode = input.code.trim().toUpperCase();
      const backupCode = user.backupCodes.find(
        (b) => !b.isUsed && verifyBackupCode(cleanCode, b.codeHash)
      );

      if (backupCode) {
        isValid = true;
        // Mark backup code as used
        await tx.otpBackupCode.update({
          where: { id: backupCode.id },
          data: { isUsed: true, usedAt: now },
        });
      }
    } else {
      // Verify TOTP token (R-15.2-1)
      const decryptedSecret = decryptSecret(user.otpSecret.secretEncrypted);
      isValid = verifyTotpToken(decryptedSecret, input.code);
    }

    if (!isValid) {
      const nextFailures = user.otpSecret.failedOtpAttempts + 1;
      const willLock = nextFailures >= 5;

      await tx.otpSecret.update({
        where: { id: user.otpSecret.id },
        data: {
          failedOtpAttempts: willLock ? 0 : nextFailures,
          otpLockedUntil: willLock ? new Date(now.getTime() + 15 * 60 * 1000) : null,
        },
      });

      if (willLock) {
        throw new Error(
          "تم إدخال رمز خاطئ 5 مرات متتالية. تم قفل التحقق مؤقتاً لمدة 15 دقيقة."
        );
      }

      throw new Error(
        input.isBackupCode ? "رمز النسخ الاحتياطي غير صحيح أو تم استخدامه مسبقاً" : "رمز التحقق غير صحيح أو منتهي الصلاحية"
      );
    }

    // Success! Reset failed OTP attempts
    await tx.otpSecret.update({
      where: { id: user.otpSecret.id },
      data: { failedOtpAttempts: 0, otpLockedUntil: null, verifiedAt: now },
    });

    pendingAuthCache.delete(input.tempToken);

    // Create session (R-15.1-4)
    const { sessionToken } = await createSession({
      userId: user.id,
      ipAddress,
      userAgent,
    });

    await safeSetCookie(SESSION_COOKIE_NAME, sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: SESSION_MAX_AGE_SECONDS,
    });

    // Handle Trusted Device if requested (R-15.2-4)
    if (input.trustDevice) {
      const { deviceToken } = await createTrustedDevice({
        userId: user.id,
        deviceName: input.deviceName || "Personal Trusted Device",
        ipAddress,
        userAgent,
      });

      await safeSetCookie(TRUSTED_DEVICE_COOKIE_NAME, deviceToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        maxAge: TRUSTED_DEVICE_MAX_AGE_SECONDS,
      });
    }

    await tx.loginAttempt.create({
      data: {
        email: user.email,
        ipAddress,
        userAgent,
        isSuccessful: true,
        failureReason: input.isBackupCode ? "BACKUP_CODE_LOGIN" : "TOTP_LOGIN",
      },
    });

    return {
      status: "AUTHENTICATED" as const,
      user: {
        id: user.id,
        fullName: user.fullName,
        email: user.email,
        role: user.role,
      },
    };
  },
});

/**
 * 3. Enroll OTP Action (First login setup with QR Code + 10 backup codes)
 */
export const enrollOtpAction = defineAction({
  actionKey: "auth.enroll_otp",
  isPublic: true,
  schema: z.object({
    tempToken: z.string(),
    code: z.string(),
  }),
  audit: {
    entityType: "OtpSecret",
    actionName: "AUTH_ENROLL_OTP",
  },
  handler: async ({ input, tx }) => {
    cleanupPendingCache();
    const pending = pendingAuthCache.get(input.tempToken);
    if (!pending || !pending.pendingSecret || pending.expiresAt < Date.now()) {
      throw new Error("انتهت صلاحية جلسة التسجيل، يرجى تسجيل الدخول مرة أخرى.");
    }

    const isValid = verifyTotpToken(pending.pendingSecret, input.code);
    if (!isValid) {
      throw new Error("رمز التحقق غير صحيح، يرجى التأكد من مسح الرمز بشكل سليم.");
    }

    const { ipAddress, userAgent } = await getClientMetadata();
    const encryptedSecret = encryptSecret(pending.pendingSecret);

    // Save encrypted OTP secret (R-15.2-7)
    await tx.otpSecret.upsert({
      where: { userId: pending.userId },
      update: {
        secretEncrypted: encryptedSecret,
        verifiedAt: new Date(),
        failedOtpAttempts: 0,
        otpLockedUntil: null,
      },
      create: {
        userId: pending.userId,
        secretEncrypted: encryptedSecret,
        verifiedAt: new Date(),
      },
    });

    // Generate 10 single-use backup codes (R-15.2-2)
    const { plainCodes, hashedCodes } = generateBackupCodes(10);

    // Delete any old backup codes and insert new ones
    await tx.otpBackupCode.deleteMany({
      where: { userId: pending.userId },
    });

    await tx.otpBackupCode.createMany({
      data: hashedCodes.map((codeHash) => ({
        userId: pending.userId,
        codeHash,
      })),
    });

    // Update user status
    await tx.user.update({
      where: { id: pending.userId },
      data: { otpStatus: "ACTIVE" },
    });

    pendingAuthCache.delete(input.tempToken);

    // Create session and log in
    const { sessionToken } = await createSession({
      userId: pending.userId,
      ipAddress,
      userAgent,
    });

    await safeSetCookie(SESSION_COOKIE_NAME, sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: SESSION_MAX_AGE_SECONDS,
    });

    return {
      status: "ENROLLED" as const,
      backupCodes: plainCodes,
    };
  },
});

/**
 * 4. Request Password Reset (Email Code)
 */
export const requestPasswordResetAction = defineAction({
  actionKey: "auth.password.request_reset",
  isPublic: true,
  schema: z.object({
    email: z.string().email(),
  }),
  audit: {
    entityType: "PasswordResetCode",
    actionName: "AUTH_REQUEST_PASSWORD_RESET",
  },
  handler: async ({ input }) => {
    await initiatePasswordReset(input.email);
    return {
      message:
        "إذا كان البريد الإلكتروني مسجلاً، فقد تم إرسال رمز التحقق المكون من 6 أرقام.",
    };
  },
});

/**
 * 5. Reset Password with Code
 */
export const resetPasswordWithCodeAction = defineAction({
  actionKey: "auth.password.reset_with_code",
  isPublic: true,
  schema: z.object({
    email: z.string().email(),
    code: z.string(),
    newPassword: z.string().min(8),
  }),
  audit: {
    entityType: "User",
    actionName: "AUTH_RESET_PASSWORD_WITH_CODE",
  },
  handler: async ({ input, tx }) => {
    const verification = await verifyPasswordResetCode(input.email, input.code);
    if (!verification.success || !verification.userId) {
      throw new Error("رمز التحقق غير صحيح أو منتهي الصلاحية.");
    }

    const passwordHash = await hashPassword(input.newPassword);

    await tx.user.update({
      where: { id: verification.userId },
      data: {
        passwordHash,
        mustChangePassword: false,
        failedLoginCount: 0,
        lockedUntil: null,
      },
    });

    // Revoke all existing sessions and trusted devices (R-15.3-1)
    await revokeAllUserSessions(verification.userId);
    await revokeAllUserTrustedDevices(verification.userId);

    return {
      success: true,
      message: "تم تحديث كلمة المرور بنجاح. يرجى تسجيل الدخول مجدداً.",
    };
  },
});

/**
 * 6. Change Own Password (Authenticated)
 */
export const changePasswordAction = defineAction({
  actionKey: "auth.profile.change_password",
  schema: z.object({
    currentPassword: z.string(),
    newPassword: z.string().min(8),
  }),
  audit: {
    entityType: "User",
    actionName: "AUTH_CHANGE_OWN_PASSWORD",
  },
  handler: async ({ input, ctx, tx }) => {
    const user = await tx.user.findUnique({
      where: { id: ctx.user.id },
    });

    if (!user) {
      throw new Error("المستخدم غير موجود.");
    }

    const isValid = await verifyPassword(input.currentPassword, user.passwordHash);
    if (!isValid) {
      throw new Error("كلمة المرور الحالية غير صحيحة.");
    }

    const passwordHash = await hashPassword(input.newPassword);

    await tx.user.update({
      where: { id: user.id },
      data: {
        passwordHash,
        mustChangePassword: false,
      },
    });

    return {
      success: true,
      message: "تم تغيير كلمة المرور بنجاح.",
    };
  },
});

/**
 * 6b. First Login / Forced Password Change (public with tempToken)
 */
export const firstLoginChangePasswordAction = defineAction({
  actionKey: "auth.profile.change_password",
  isPublic: true,
  schema: z.object({
    tempToken: z.string(),
    newPassword: z.string().min(8),
  }),
  audit: {
    entityType: "User",
    actionName: "AUTH_FIRST_LOGIN_CHANGE_PASSWORD",
  },
  handler: async ({ input, tx }) => {
    cleanupPendingCache();
    const pending = pendingAuthCache.get(input.tempToken);
    if (!pending || pending.expiresAt < Date.now()) {
      throw new Error("انتهت صلاحية جلسة التحقق، يرجى إعادة تسجيل الدخول.");
    }

    const passwordHash = await hashPassword(input.newPassword);
    await tx.user.update({
      where: { id: pending.userId },
      data: {
        passwordHash,
        mustChangePassword: false,
      },
    });

    const user = await tx.user.findUnique({
      where: { id: pending.userId },
      include: { otpSecret: true },
    });

    if (!user) {
      throw new Error("المستخدم غير موجود.");
    }

    // If OTP setup is needed (R-15.2-2)
    if (user.otpStatus === "NOT_SET" || !user.otpSecret) {
      const { secret, otpAuthUrl } = generateTotpSecret(user.email);
      const qrCode = await generateTotpQrCode(otpAuthUrl);

      pending.pendingSecret = secret;
      pending.expiresAt = Date.now() + 10 * 60 * 1000;

      return {
        status: "REQUIRES_OTP_ENROLLMENT" as const,
        tempToken: input.tempToken,
        qrCode,
        secret,
      };
    }

    return {
      status: "REQUIRES_OTP" as const,
      tempToken: input.tempToken,
    };
  },
});

/**
 * 7. Logout / Switch User Action
 * Prompts user if they have an active open cash shift (R-15.1-6)
 */
export const logoutAction = defineAction({
  actionKey: "auth.logout",
  isPublic: true,
  schema: z.object({
    force: z.boolean().optional(),
  }),
  audit: {
    entityType: "UserSession",
    actionName: "AUTH_LOGOUT",
  },
  handler: async ({ input, tx }) => {
    const token = await safeGetCookie(SESSION_COOKIE_NAME);

    if (token) {
      const session = await tx.userSession.findUnique({
        where: { tokenHash: hashToken(token) },
        include: { user: true },
      });

      if (session && !input.force) {
        // Check for open cash shift for receptionist/cashier (R-15.1-6)
        const openShift = await tx.cashClosing.findFirst({
          where: {
            cashierUserId: session.userId,
            status: "OPEN",
          },
        });

        if (openShift) {
          return {
            hasOpenCashShift: true,
            promptMessage:
              "لديك وردية نقدية مفتوحة! يرجى إغلاق الوردية قبل تسجيل الخروج أو تبديل المستخدم.",
          };
        }
      }

      await revokeSession(token);
    }

    await safeDeleteCookie(SESSION_COOKIE_NAME);

    return {
      hasOpenCashShift: false,
      loggedOut: true,
    };
  },
});

/**
 * 8. Owner Reset Staff Password (R-3-4, R-1.1-19)
 */
export const ownerResetStaffPasswordAction = defineAction({
  actionKey: "auth.password.reset_staff",
  schema: z.object({
    userId: z.string(),
    temporaryPassword: z.string().min(8),
  }),
  audit: {
    entityType: "User",
    actionName: "OWNER_RESET_STAFF_PASSWORD",
    getEntityId: (_, input) => input.userId,
  },
  handler: async ({ input, tx }) => {
    const targetUser = await tx.user.findUnique({
      where: { id: input.userId },
    });

    if (!targetUser) {
      throw new Error("الموظف غير موجود.");
    }

    const passwordHash = await hashPassword(input.temporaryPassword);

    await tx.user.update({
      where: { id: input.userId },
      data: {
        passwordHash,
        mustChangePassword: true, // Forces change at next login (R-3-4)
        failedLoginCount: 0,
        lockedUntil: null,
      },
    });

    // Invalidate staff sessions and devices
    await revokeAllUserSessions(input.userId);
    await revokeAllUserTrustedDevices(input.userId);

    return {
      success: true,
      message: "تم تعيين كلمة مرور مؤقتة للموظف وسيُطلب منه تغييرها عند الدخول.",
    };
  },
});

/**
 * 9. Owner Reset Staff OTP (R-15.2-6, R-1.1-19)
 */
export const ownerResetStaffOtpAction = defineAction({
  actionKey: "auth.otp.reset_staff",
  schema: z.object({
    userId: z.string(),
  }),
  audit: {
    entityType: "OtpSecret",
    actionName: "OWNER_RESET_STAFF_OTP",
    getEntityId: (_, input) => input.userId,
  },
  handler: async ({ input, tx }) => {
    await tx.user.update({
      where: { id: input.userId },
      data: { otpStatus: "NOT_SET" },
    });

    await tx.otpSecret.deleteMany({
      where: { userId: input.userId },
    });

    await tx.otpBackupCode.deleteMany({
      where: { userId: input.userId },
    });

    // Invalidate staff sessions and devices
    await revokeAllUserSessions(input.userId);
    await revokeAllUserTrustedDevices(input.userId);

    return {
      success: true,
      message: "تمت إعادة تعيين المصادقة الثنائية للموظف بنجاح وسيُطلب منه إعدادها مجدداً.",
    };
  },
});

/**
 * 10. Owner Revoke Staff Trusted Devices (R-15.2-4, R-1.1-19)
 */
export const ownerRevokeStaffDevicesAction = defineAction({
  actionKey: "auth.devices.revoke",
  schema: z.object({
    userId: z.string(),
  }),
  audit: {
    entityType: "TrustedDevice",
    actionName: "OWNER_REVOKE_STAFF_DEVICES",
    getEntityId: (_, input) => input.userId,
  },
  handler: async ({ input }) => {
    await revokeAllUserTrustedDevices(input.userId);
    return {
      success: true,
      message: "تم إلغاء كافة الأجهزة الموثوقة للموظف بنجاح.",
    };
  },
});
