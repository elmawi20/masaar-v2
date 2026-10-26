import { describe, it, expect, beforeAll } from "vitest";
import { testDb, resetTestDatabase } from "../helpers/db";
import {
  createStaffAccountAction,
} from "@/server/actions/staff";
import {
  loginAction,
  firstLoginChangePasswordAction,
  enrollOtpAction,
} from "@/server/actions/auth";
import { isRouteAllowedForRole } from "@/domain/routePermissions";
import { Role } from "@prisma/client";
import { hashPassword } from "@/server/auth/crypto";
import { authenticator } from "otplib";

describe("Bug 2 Integration: Receptionist Account Onboarding & Role Segregation [R-1-6, R-3-1, R-3-4, R-15.2-2]", () => {
  const uniqueSuffix = Date.now().toString(36) + "_" + Math.random().toString(36).slice(2, 6);
  let ownerUser: { id: string; email: string; role: Role; isActive: boolean };
  const receptionistEmail = `receptionist_${uniqueSuffix}@masaar.local`;
  const tempPassword = "TemporaryPassword123!";
  const permanentPassword = "PermanentPassword123!";

  beforeAll(async () => {
    const passwordHash = await hashPassword("OwnerPassword123!");
    const owner = await testDb.user.create({
      data: {
        email: `owner_${uniqueSuffix}@masaar.local`,
        fullName: "د. طارق المعوي",
        phone: "010" + Math.floor(10000000 + Math.random() * 90000000),
        jobTitle: "المالك ورئيس المركز",
        role: "OWNER",
        passwordHash,
        isActive: true,
      },
    });

    ownerUser = {
      id: owner.id,
      email: owner.email,
      role: owner.role as Role,
      isActive: owner.isActive,
    };
  });

  it("completes full receptionist lifecycle: Owner creates account, receptionist forced to change password & enroll 2FA, has reception-only access", async () => {
    // 1. Owner creates the receptionist account
    const createRes = await createStaffAccountAction(
      {
        fullName: "سارة كمال (موظفة استقبال)",
        email: receptionistEmail,
        phone: "01099887766",
        jobTitle: "موظفة استقبال أولى",
        role: "RECEPTIONIST",
        preferredLanguage: "AR",
        canAssess: false,
        commissionType: "NONE",
        commissionPercentBasisPoints: 0,
        commissionFixedPiasters: 0,
        initialPassword: tempPassword,
      },
      { user: ownerUser }
    );

    expect(createRes.success).toBe(true);
    if (!createRes.success) return;
    expect((createRes.data as { role: string }).role).toBe("RECEPTIONIST");

    // Verify DB state
    const createdUser = await testDb.user.findUnique({ where: { email: receptionistEmail } });
    expect(createdUser?.mustChangePassword).toBe(true);
    expect(createdUser?.otpStatus).toBe("NOT_SET");

    // 2. Receptionist logs in with temporary password
    const loginStep1 = await loginAction({
      email: receptionistEmail,
      password: tempPassword,
    });

    expect(loginStep1.success).toBe(true);
    if (!loginStep1.success) return;
    expect(loginStep1.data.status).toBe("MUST_CHANGE_PASSWORD");
    const tempToken = loginStep1.data.tempToken;
    expect(tempToken).toBeDefined();

    // 3. Receptionist is forced to change temporary password to permanent one
    const changePassRes = await firstLoginChangePasswordAction({
      tempToken: tempToken!,
      newPassword: permanentPassword,
    });

    expect(changePassRes.success).toBe(true);
    if (!changePassRes.success) return;
    expect(changePassRes.data.status).toBe("REQUIRES_OTP_ENROLLMENT");
    const otpSecret = changePassRes.data.secret;
    expect(otpSecret).toBeDefined();

    // Verify password was changed in DB and mustChangePassword is false
    const updatedUser = await testDb.user.findUnique({ where: { email: receptionistEmail } });
    expect(updatedUser?.mustChangePassword).toBe(false);

    // 4. Receptionist generates TOTP code and completes OTP enrollment
    const validOtpCode = authenticator.generate(otpSecret!);
    const enrollRes = await enrollOtpAction({
      tempToken: tempToken!,
      code: validOtpCode,
    });

    expect(enrollRes.success).toBe(true);
    if (!enrollRes.success) return;
    expect(enrollRes.data.backupCodes).toHaveLength(10);

    // Verify OTP status is now ACTIVE in DB
    const finalUser = await testDb.user.findUnique({ where: { email: receptionistEmail } });
    expect(finalUser?.otpStatus).toBe("ACTIVE");

    // 5. Verify Receptionist Route Segregation: Only reception pages allowed
    expect(isRouteAllowedForRole("/reception/today", Role.RECEPTIONIST)).toBe(true);
    expect(isRouteAllowedForRole("/reception/calendar", Role.RECEPTIONIST)).toBe(true);
    expect(isRouteAllowedForRole("/reception/patients", Role.RECEPTIONIST)).toBe(true);
    expect(isRouteAllowedForRole("/reception/billing", Role.RECEPTIONIST)).toBe(true);
    expect(isRouteAllowedForRole("/reception/expenses", Role.RECEPTIONIST)).toBe(true);
    expect(isRouteAllowedForRole("/reception/cash-closing", Role.RECEPTIONIST)).toBe(true);

    // Forbidden routes MUST return false
    expect(isRouteAllowedForRole("/admin/staff", Role.RECEPTIONIST)).toBe(false);
    expect(isRouteAllowedForRole("/admin/settings", Role.RECEPTIONIST)).toBe(false);
    expect(isRouteAllowedForRole("/admin/templates", Role.RECEPTIONIST)).toBe(false);
    expect(isRouteAllowedForRole("/admin/audit-log", Role.RECEPTIONIST)).toBe(false);
    expect(isRouteAllowedForRole("/management/resources", Role.RECEPTIONIST)).toBe(false);
    expect(isRouteAllowedForRole("/management/staff-schedules", Role.RECEPTIONIST)).toBe(false);
    expect(isRouteAllowedForRole("/management/reports", Role.RECEPTIONIST)).toBe(false);
    expect(isRouteAllowedForRole("/clinical/queue", Role.RECEPTIONIST)).toBe(false);
    expect(isRouteAllowedForRole("/clinical/my-commissions", Role.RECEPTIONIST)).toBe(false);
    expect(isRouteAllowedForRole("/nutrition/queue", Role.RECEPTIONIST)).toBe(false);
    expect(isRouteAllowedForRole("/nutrition/my-commissions", Role.RECEPTIONIST)).toBe(false);
  });
});
