import { describe, it, expect, vi } from "vitest";
import { z } from "zod";
import { defineAction, type ActionContext, type ActionUser } from "@/server/defineAction";
import { isActionWrapped, assertActionWrapped } from "@/server/checkActionEnforcement";

// Mock prisma for unit tests
vi.mock("@/server/db", () => {
  return {
    prisma: {
      $transaction: vi.fn(async (cb) => {
        const mockTx = {
          auditLog: {
            create: vi.fn().mockResolvedValue({ id: "audit-123" }),
          },
        };
        return cb(mockTx);
      }),
    },
  };
});

describe("defineAction() Pipeline Unit Suite (R-0-2, R-1-1 to R-1-5, R-3-5)", () => {
  const dummySchema = z.object({
    name: z.string().min(3),
    amountPiasters: z.number().int().positive(),
  });

  const sampleAction = defineAction({
    actionKey: "patient.admin.create_edit", // Allowed for OWNER, MANAGER, RECEPTIONIST
    schema: dummySchema,
    audit: {
      entityType: "PATIENT",
      getEntityId: (out: any) => out.patientId,
    },
    handler: async ({ input }) => {
      return { patientId: "pat-999", name: input.name };
    },
  });

  it("fails if unauthenticated session invokes protected action", async () => {
    const result = await sampleAction({ name: "Ahmed", amountPiasters: 1000 }, {});
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.code).toBe("UNAUTHENTICATED");
    }
  });

  it("fails with USER_DEACTIVATED if active user check fails (R-3-5)", async () => {
    const deactivatedUser: ActionUser = {
      id: "u-1",
      email: "staff@masaar.com",
      role: "RECEPTIONIST",
      isActive: false,
    };

    const result = await sampleAction(
      { name: "Ahmed", amountPiasters: 1000 },
      { user: deactivatedUser }
    );

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.code).toBe("USER_DEACTIVATED");
    }
  });

  it("fails with PERMISSION_DENIED if user role is not permitted", async () => {
    const physioUser: ActionUser = {
      id: "u-physio",
      email: "physio@masaar.com",
      role: "PHYSIOTHERAPIST", // blocked for patient.admin.create_edit
      isActive: true,
    };

    const result = await sampleAction(
      { name: "Ahmed", amountPiasters: 1000 },
      { user: physioUser }
    );

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.code).toBe("PERMISSION_DENIED");
    }
  });

  it("succeeds when user role is permitted (RECEPTIONIST)", async () => {
    const receptionist: ActionUser = {
      id: "u-rec",
      email: "reception@masaar.com",
      role: "RECEPTIONIST",
      isActive: true,
    };

    const result = await sampleAction(
      { name: "Ahmed", amountPiasters: 1000 },
      { user: receptionist }
    );

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.patientId).toBe("pat-999");
    }
  });

  it("fails with VALIDATION_ERROR when input schema is violated", async () => {
    const owner: ActionUser = {
      id: "u-owner",
      email: "owner@masaar.com",
      role: "OWNER",
      isActive: true,
    };

    // Invalid: name too short (< 3) and negative amount
    const result = await sampleAction(
      { name: "A", amountPiasters: -500 },
      { user: owner }
    );

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.code).toBe("VALIDATION_ERROR");
      expect(result.error.details).toBeDefined();
    }
  });

  it("enforcement check detects wrapped vs unwrapped actions", () => {
    expect(isActionWrapped(sampleAction)).toBe(true);

    const unwrappedAction = async () => ({ hello: "world" });
    expect(isActionWrapped(unwrappedAction)).toBe(false);

    expect(() => assertActionWrapped(unwrappedAction, "unwrappedAction")).toThrow(
      /Violation of Rule R-0-2/
    );
  });
});
