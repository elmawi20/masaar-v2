import { prisma } from "../db";
import { generateRandomToken, hashToken } from "./crypto";

export const TRUSTED_DEVICE_COOKIE_NAME = "masaar_trusted_device";
export const TRUSTED_DEVICE_MAX_AGE_SECONDS = 30 * 24 * 60 * 60; // 30 days (R-15.2-4)

/**
 * Creates a 30-day trusted device token for the user.
 * In accordance with Rule R-15.2-4.
 */
export async function createTrustedDevice(params: {
  userId: string;
  deviceName?: string;
  ipAddress: string;
  userAgent?: string;
}): Promise<{ deviceToken: string; expiresAt: Date }> {
  const deviceToken = generateRandomToken(32);
  const deviceTokenHash = hashToken(deviceToken);
  const now = new Date();
  const expiresAt = new Date(now.getTime() + TRUSTED_DEVICE_MAX_AGE_SECONDS * 1000);

  await prisma.trustedDevice.create({
    data: {
      userId: params.userId,
      deviceTokenHash,
      deviceName: params.deviceName || "Browser Device",
      ipAddress: params.ipAddress,
      userAgent: params.userAgent || null,
      expiresAt,
    },
  });

  return { deviceToken, expiresAt };
}

/**
 * Checks if the provided device token is valid and trusted for the user.
 */
export async function isDeviceTrusted(
  userId: string,
  deviceToken: string | undefined | null
): Promise<boolean> {
  if (!userId || !deviceToken) return false;

  const deviceTokenHash = hashToken(deviceToken);
  const now = new Date();

  const device = await prisma.trustedDevice.findFirst({
    where: {
      userId,
      deviceTokenHash,
      isRevoked: false,
      expiresAt: { gt: now },
    },
  });

  return Boolean(device);
}

/**
 * Revokes all trusted devices for a user.
 * Can be triggered by Owner in accordance with Rule R-15.2-4.
 */
export async function revokeAllUserTrustedDevices(userId: string): Promise<void> {
  await prisma.trustedDevice.updateMany({
    where: { userId, isRevoked: false },
    data: { isRevoked: true, revokedAt: new Date() },
  });
}
