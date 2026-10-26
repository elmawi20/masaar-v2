import { cookies, headers } from "next/headers";
import { SESSION_COOKIE_NAME, validateSession } from "./session";
import type { ActionUser, ActionContext } from "../defineAction";

/**
 * Retrieves the current authenticated user from session cookie.
 * In accordance with Rule R-15.1-4 and R-15.1-5 (re-loads user from DB every request).
 */
export async function getCurrentUser(): Promise<ActionUser | null> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
    if (!token) return null;

    const result = await validateSession(token);
    if (!result || !result.user.isActive) return null;

    return {
      id: result.user.id,
      email: result.user.email,
      fullName: result.user.fullName,
      role: result.user.role,
      isActive: result.user.isActive,
    };
  } catch {
    return null;
  }
}

/**
 * Resolves action context (user, IP, User-Agent) from Next.js server headers and cookies.
 */
export async function resolveActionContext(): Promise<ActionContext> {
  try {
    const user = await getCurrentUser();
    const headerStore = await headers();
    const ipAddress =
      headerStore.get("x-forwarded-for")?.split(",")[0]?.trim() || "127.0.0.1";
    const userAgent = headerStore.get("user-agent") || undefined;

    return {
      user: user ?? undefined,
      ipAddress,
      userAgent,
    };
  } catch {
    return {};
  }
}
