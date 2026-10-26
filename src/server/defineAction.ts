import { z } from "zod";
import { prisma } from "./db";
import { Prisma } from "@prisma/client";
import { PERMISSIONS_MATRIX, type ClinicRole } from "@/domain/permissions";

export interface ActionUser {
  id: string;
  email: string;
  role: ClinicRole;
  isActive: boolean;
}

export interface ActionContext {
  user?: ActionUser;
  ipAddress?: string;
  userAgent?: string;
}

export interface AuditConfig<TInput, TOutput> {
  entityType: string;
  actionName?: string;
  getEntityId?: (data: TOutput, input: TInput) => string | undefined;
  getBeforeState?: (input: TInput, ctx: ActionContext) => Promise<unknown> | unknown;
  getAfterState?: (data: TOutput, input: TInput) => unknown;
  getReason?: (input: TInput) => string | undefined;
}

export interface DefineActionConfig<TInput, TOutput> {
  actionKey: string;
  schema: z.ZodType<TInput>;
  isPublic?: boolean;
  audit?: AuditConfig<TInput, TOutput>;
  authorizeCondition?: (params: {
    user: ActionUser;
    input: TInput;
    ctx: ActionContext;
  }) => Promise<boolean | string> | boolean | string;
  handler: (params: {
    input: TInput;
    ctx: ActionContext & { user: ActionUser };
    tx: Prisma.TransactionClient;
  }) => Promise<TOutput>;
}

export type ActionResult<TOutput> =
  | { success: true; data: TOutput }
  | { success: false; error: { code: string; message: string; details?: unknown } };

export const ACTION_WRAPPED_SYMBOL = Symbol.for("masaar.defineAction");

/**
 * Uniform server action wrapper enforcing:
 * auth -> active user -> RBAC permission -> Zod validation -> transaction -> audit log.
 * In accordance with Rule R-0-2 and Stage 2 architectural requirements.
 */
export function defineAction<TInput, TOutput>(
  config: DefineActionConfig<TInput, TOutput>
) {
  const wrappedAction = async (
    rawInput: unknown,
    invocationContext?: ActionContext
  ): Promise<ActionResult<TOutput>> => {
    try {
      // 1. Session & Auth Check
      const ctx: ActionContext = {
        ...invocationContext,
      };

      if (!config.isPublic) {
        if (!ctx.user) {
          return {
            success: false,
            error: {
              code: "UNAUTHENTICATED",
              message: "Authentication required to perform this action",
            },
          };
        }

        // 2. Active User Check (R-3-5)
        if (!ctx.user.isActive) {
          return {
            success: false,
            error: {
              code: "USER_DEACTIVATED",
              message: "User account is deactivated",
            },
          };
        }

        // 3. Permission & Role RBAC Check (from permissions.ts)
        const permission = PERMISSIONS_MATRIX.find(
          (p) => p.actionKey === config.actionKey
        );

        if (!permission) {
          return {
            success: false,
            error: {
              code: "PERMISSION_DENIED",
              message: `Unknown permission action: ${config.actionKey}`,
            },
          };
        }

        const isRoleAllowed = permission.roles[ctx.user.role];
        if (!isRoleAllowed) {
          return {
            success: false,
            error: {
              code: "PERMISSION_DENIED",
              message: `Role ${ctx.user.role} is not authorized for action ${config.actionKey}`,
            },
          };
        }

        // Dynamic Condition check (e.g. OWN_PATIENTS_ONLY)
        if (config.authorizeCondition) {
          const conditionPassed = await config.authorizeCondition({
            user: ctx.user,
            input: rawInput as TInput,
            ctx,
          });

          if (conditionPassed !== true) {
            const reason =
              typeof conditionPassed === "string"
                ? conditionPassed
                : "Permission condition failed";
            return {
              success: false,
              error: {
                code: "PERMISSION_DENIED",
                message: reason,
              },
            };
          }
        }
      }

      // 4. Input Zod Validation
      const parseResult = config.schema.safeParse(rawInput);
      if (!parseResult.success) {
        return {
          success: false,
          error: {
            code: "VALIDATION_ERROR",
            message: "Input validation failed",
            details: parseResult.error.format(),
          },
        };
      }
      const validatedInput = parseResult.data;

      // 5. Database Transaction + Audit Log
      let beforeState: unknown = null;
      if (config.audit?.getBeforeState) {
        beforeState = await config.audit.getBeforeState(validatedInput, ctx);
      }

      const result = await prisma.$transaction(async (tx) => {
        const handlerResult = await config.handler({
          input: validatedInput,
          ctx: ctx as ActionContext & { user: ActionUser },
          tx,
        });

        // 6. Audit Log Insertion inside transaction
        if (config.audit) {
          const entityId = config.audit.getEntityId
            ? config.audit.getEntityId(handlerResult, validatedInput)
            : undefined;

          const afterState = config.audit.getAfterState
            ? config.audit.getAfterState(handlerResult, validatedInput)
            : handlerResult;

          const reason = config.audit.getReason
            ? config.audit.getReason(validatedInput)
            : undefined;

          await tx.auditLog.create({
            data: {
              userId: ctx.user?.id,
              userRole: ctx.user?.role,
              action: config.audit.actionName || config.actionKey,
              entityType: config.audit.entityType,
              entityId: entityId ? String(entityId) : null,
              beforeState: (beforeState as Prisma.InputJsonValue) ?? Prisma.JsonNull,
              afterState: (afterState as Prisma.InputJsonValue) ?? Prisma.JsonNull,
              reason: reason ?? null,
              ipAddress: ctx.ipAddress ?? null,
              userAgent: ctx.userAgent ?? null,
            },
          });
        }

        return handlerResult;
      });

      return {
        success: true,
        data: result,
      };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Internal action error";
      return {
        success: false,
        error: {
          code: "SERVER_ERROR",
          message,
        },
      };
    }
  };

  // Mark function with metadata symbol for linting and test enforcement
  (wrappedAction as unknown as Record<symbol, unknown>)[ACTION_WRAPPED_SYMBOL] = {
    actionKey: config.actionKey,
    schema: config.schema,
    audit: config.audit,
  };

  return wrappedAction;
}
