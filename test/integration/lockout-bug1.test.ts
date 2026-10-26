import { describe, it, expect, beforeAll } from "vitest";
import { testDb, resetTestDatabase } from "../helpers/db";
import { loginAction } from "@/server/actions/auth";
import { hashPassword } from "@/server/auth/crypto";

describe("Bug 1 Reproduction: 15-minute Account Lockout after 5 Failed Attempts [R-15.1-3]", () => {
  const uniqueSuffix = Date.now().toString(36) + "_" + Math.random().toString(36).slice(2, 6);
  const testEmail = `lockout_${uniqueSuffix}@masaar.local`;
  const correctPassword = "CorrectPassword123!";
  const wrongPassword = "WrongPassword999!";

  beforeAll(async () => {
    const passwordHash = await hashPassword(correctPassword);
    await testDb.user.create({
      data: {
        email: testEmail,
        fullName: "محمد أحمد فؤاد",
        phone: "010" + Math.floor(10000000 + Math.random() * 90000000),
        jobTitle: "موظف استقبال",
        role: "RECEPTIONIST",
        passwordHash,
        isActive: true,
      },
    });
  });

  it("reproduces lockout: entering wrong password 5 times must persist 15-min lock, refuse correct password, and log audit event", async () => {
    // Attempts 1 to 4 with wrong password
    for (let i = 1; i <= 4; i++) {
      const res = await loginAction({ email: testEmail, password: wrongPassword });
      const userInDb = await testDb.user.findUnique({ where: { email: testEmail } });
      expect(res.success).toBe(false);
      expect(userInDb?.failedLoginCount).toBe(i);
      expect(userInDb?.lockedUntil).toBeNull();
    }

    // 5th attempt with wrong password: MUST trigger 15-minute lock
    const fifthAttempt = await loginAction({ email: testEmail, password: wrongPassword });
    expect(fifthAttempt.success).toBe(false);

    // Verify DB state after 5th failed attempt
    const lockedUser = await testDb.user.findUnique({ where: { email: testEmail } });
    expect(lockedUser?.lockedUntil).not.toBeNull();
    expect(lockedUser!.lockedUntil!.getTime()).toBeGreaterThan(Date.now() + 14 * 60 * 1000);

    // Verify audit log has the lockout event visible to Owner
    const auditLogs = await testDb.auditLog.findMany({
      where: {
        entityType: "User",
        action: "AUTH_LOCKOUT_TRIGGERED",
      },
    });
    expect(auditLogs.length).toBeGreaterThan(0);

    // Correct password during lock window MUST be refused
    const attemptWithCorrectPassword = await loginAction({ email: testEmail, password: correctPassword });
    expect(attemptWithCorrectPassword.success).toBe(false);
    if (!attemptWithCorrectPassword.success) {
      expect(attemptWithCorrectPassword.error.message).toMatch(/مقفل مؤقتاً|locked/i);
    }

    // Advance clock past 15 minutes: simulate lock expiry
    await testDb.user.update({
      where: { email: testEmail },
      data: {
        lockedUntil: new Date(Date.now() - 1000), // 1 second in the past
      },
    });

    // Login with correct password after lock expires MUST succeed
    const afterExpiry = await loginAction({ email: testEmail, password: correctPassword });
    expect(afterExpiry.success).toBe(true);

    // Verify failed login count is reset to 0 and lockedUntil cleared
    const unlockedUser = await testDb.user.findUnique({ where: { email: testEmail } });
    expect(unlockedUser?.failedLoginCount).toBe(0);
    expect(unlockedUser?.lockedUntil).toBeNull();
  });
});
