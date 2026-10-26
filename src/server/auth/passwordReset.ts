import { prisma } from "../db";
import crypto from "crypto";
import { hashToken } from "./crypto";

export const RESET_CODE_VALIDITY_MINUTES = 10; // 10 minutes (R-15.3-1)
export const MAX_RESET_ATTEMPTS = 5; // Max 5 attempts (R-15.3-1)

/**
 * Creates a 6-digit numeric password reset code.
 * In accordance with Rule R-15.3-1.
 */
export function createPasswordResetCode(): {
  code: string;
  codeHash: string;
  expiresAt: Date;
} {
  // Generate 6-digit numeric code (e.g. 100000 - 999999)
  const codeNum = crypto.randomInt(100000, 1000000);
  const code = String(codeNum);
  const codeHash = hashToken(code);
  const expiresAt = new Date(Date.now() + RESET_CODE_VALIDITY_MINUTES * 60 * 1000);

  return { code, codeHash, expiresAt };
}

/**
 * Initiates password reset for a user email.
 * Saves hashed code to DB and prints to terminal in local/dev per prompt instructions.
 */
export async function initiatePasswordReset(email: string): Promise<boolean> {
  const user = await prisma.user.findUnique({
    where: { email: email.toLowerCase().trim() },
  });

  if (!user || !user.isActive) {
    // Avoid user enumeration
    return true;
  }

  const { code, codeHash, expiresAt } = createPasswordResetCode();

  // Invalidate any previous unused codes for this user
  await prisma.passwordResetCode.updateMany({
    where: { userId: user.id, isUsed: false },
    data: { isUsed: true },
  });

  await prisma.passwordResetCode.create({
    data: {
      userId: user.id,
      codeHash,
      expiresAt,
    },
  });

  // Print reset code to terminal for local development (R-15.3-2)
  console.log(`\n=======================================================`);
  console.log(`🔑 [AUTH DEV] Password Reset Code for: ${user.email}`);
  console.log(`👉 Code: ${code}`);
  console.log(`⏳ Valid for: 10 minutes | Max attempts: 5`);
  console.log(`=======================================================\n`);

  return true;
}

/**
 * Verifies a 6-digit password reset code.
 * Enforces max 5 attempts and single use.
 */
export async function verifyPasswordResetCode(
  email: string,
  code: string
): Promise<{ success: boolean; userId?: string; error?: string }> {
  const user = await prisma.user.findUnique({
    where: { email: email.toLowerCase().trim() },
  });

  if (!user || !user.isActive) {
    return { success: false, error: "INVALID_CODE" };
  }

  const now = new Date();
  const resetRecord = await prisma.passwordResetCode.findFirst({
    where: {
      userId: user.id,
      isUsed: false,
      expiresAt: { gt: now },
    },
    orderBy: { createdAt: "desc" },
  });

  if (!resetRecord) {
    return { success: false, error: "CODE_EXPIRED_OR_NOT_FOUND" };
  }

  if (resetRecord.attemptsCount >= MAX_RESET_ATTEMPTS) {
    // Lock code
    await prisma.passwordResetCode.update({
      where: { id: resetRecord.id },
      data: { isUsed: true },
    });
    return { success: false, error: "MAX_ATTEMPTS_EXCEEDED" };
  }

  const codeHash = hashToken(code.trim());
  if (codeHash !== resetRecord.codeHash) {
    // Increment attempts count
    await prisma.passwordResetCode.update({
      where: { id: resetRecord.id },
      data: { attemptsCount: resetRecord.attemptsCount + 1 },
    });
    return { success: false, error: "INVALID_CODE" };
  }

  // Mark code as used
  await prisma.passwordResetCode.update({
    where: { id: resetRecord.id },
    data: { isUsed: true, usedAt: now },
  });

  return { success: true, userId: user.id };
}
