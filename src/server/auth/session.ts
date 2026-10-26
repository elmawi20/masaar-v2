import { prisma } from "../db";
import { generateRandomToken, hashToken } from "./crypto";
import type { User, Role } from "@prisma/client";

export const SESSION_COOKIE_NAME = "masaar_session";
export const SESSION_MAX_AGE_SECONDS = 12 * 60 * 60; // 12 hours absolute maximum (R-15.1-4)
export const SESSION_IDLE_LIMIT_MINUTES = 15; // 15-minute idle limit (R-15.1-4)

export interface SessionValidationResult {
  session: {
    id: string;
    userId: string;
    lastActiveAt: Date;
    expiresAt: Date;
    isIdle: boolean;
  };
  user: User;
}

/**
 * Checks if a session has been idle for more than 15 minutes.
 * In accordance with Rule R-15.1-4.
 */
export function isSessionIdle(
  lastActiveAt: Date,
  idleLimitMinutes: number = SESSION_IDLE_LIMIT_MINUTES
): boolean {
  const idleMs = idleLimitMinutes * 60 * 1000;
  return Date.now() - new Date(lastActiveAt).getTime() > idleMs;
}

/**
 * Creates a new user session in the database.
 * Token is stored strictly as SHA-256 hash.
 */
export async function createSession(params: {
  userId: string;
  ipAddress: string;
  userAgent?: string;
}): Promise<{ sessionToken: string; expiresAt: Date }> {
  const sessionToken = generateRandomToken(32);
  const tokenHash = hashToken(sessionToken);
  const now = new Date();
  const expiresAt = new Date(now.getTime() + SESSION_MAX_AGE_SECONDS * 1000);

  await prisma.userSession.create({
    data: {
      userId: params.userId,
      tokenHash,
      ipAddress: params.ipAddress,
      userAgent: params.userAgent || null,
      lastActiveAt: now,
      expiresAt,
    },
  });

  return { sessionToken, expiresAt };
}

/**
 * Validates a session token.
 * Re-loads user from database on every request to ensure active status and role freshness (R-15.1-5).
 */
export async function validateSession(
  sessionToken: string
): Promise<SessionValidationResult | null> {
  if (!sessionToken) return null;

  const tokenHash = hashToken(sessionToken);
  const now = new Date();

  const session = await prisma.userSession.findUnique({
    where: { tokenHash },
    include: { user: true },
  });

  if (!session) return null;

  // Check revocation and expiration
  if (session.isRevoked || session.expiresAt <= now) {
    return null;
  }

  // Active User Check (R-15.1-5 and R-3-5)
  if (!session.user.isActive) {
    // Revoke session immediately
    await prisma.userSession.update({
      where: { id: session.id },
      data: { isRevoked: true, revokedAt: now },
    });
    return null;
  }

  const isIdle = isSessionIdle(session.lastActiveAt);

  // Update lastActiveAt if not idle
  if (!isIdle) {
    await prisma.userSession.update({
      where: { id: session.id },
      data: { lastActiveAt: now },
    });
  }

  return {
    session: {
      id: session.id,
      userId: session.userId,
      lastActiveAt: session.lastActiveAt,
      expiresAt: session.expiresAt,
      isIdle,
    },
    user: session.user,
  };
}

/**
 * Revokes a single session.
 */
export async function revokeSession(sessionToken: string): Promise<void> {
  if (!sessionToken) return;
  const tokenHash = hashToken(sessionToken);
  await prisma.userSession.updateMany({
    where: { tokenHash },
    data: { isRevoked: true, revokedAt: new Date() },
  });
}

/**
 * Revokes all sessions for a user (e.g. after password reset or deactivation).
 */
export async function revokeAllUserSessions(userId: string): Promise<void> {
  await prisma.userSession.updateMany({
    where: { userId, isRevoked: false },
    data: { isRevoked: true, revokedAt: new Date() },
  });
}
