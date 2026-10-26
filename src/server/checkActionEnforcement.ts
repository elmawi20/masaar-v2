import { ACTION_WRAPPED_SYMBOL } from "./defineAction";

/**
 * Validates whether a given exported action was constructed via defineAction().
 * Used by unit tests and CI linters to fail if any server action bypasses defineAction().
 */
export function isActionWrapped(fn: unknown): boolean {
  if (typeof fn !== "function") return false;
  return Boolean((fn as unknown as Record<symbol, unknown>)[ACTION_WRAPPED_SYMBOL]);
}

export function assertActionWrapped(fn: unknown, actionName: string): void {
  if (!isActionWrapped(fn)) {
    throw new Error(
      `Violation of Rule R-0-2: Server action "${actionName}" must be created using defineAction(). Direct unwrapped functions are prohibited.`
    );
  }
}
