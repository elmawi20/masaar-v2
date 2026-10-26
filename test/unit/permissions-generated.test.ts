import { describe, it, expect } from "vitest";
import {
  PERMISSIONS_MATRIX,
  ALL_CLINIC_ROLES,
  type ClinicRole,
  type PermissionDefinition,
} from "@/domain/permissions";
import { defineAction, type ActionUser } from "@/server/defineAction";
import { z } from "zod";

describe("Generated Permissions Test Suite (43 Actions × 5 Roles = 215 Test Cases)", () => {
  it("verifies permissions matrix completeness (all 43 actions present)", () => {
    expect(PERMISSIONS_MATRIX.length).toBe(43);
    for (const p of PERMISSIONS_MATRIX) {
      expect(p.actionKey).toBeDefined();
      expect(p.ruleIds.length).toBeGreaterThan(0);
      expect(Object.keys(p.roles).length).toBe(5);
    }
  });

  // Generated tests: Every action × every role
  describe.each(PERMISSIONS_MATRIX)("Action: $actionKey ($labelEn)", (p: PermissionDefinition) => {
    describe.each(ALL_CLINIC_ROLES)("Role: %s", (role: ClinicRole) => {
      const isAllowed = p.roles[role];

      it(`correctly ${isAllowed ? "grants" : "denies"} access to ${role}`, async () => {
        // 1. Static assertion on the permissions matrix
        expect(p.roles[role]).toBe(isAllowed);

        // 2. Dynamic execution through defineAction pipeline
        const action = defineAction({
          actionKey: p.actionKey,
          schema: z.object({ dummy: z.string().optional() }),
          handler: async () => ({ ok: true }),
        });

        const user: ActionUser = {
          id: `test-user-${role.toLowerCase()}`,
          email: `${role.toLowerCase()}@masaar.com`,
          role,
          isActive: true,
        };

        const result = await action({ dummy: "test" }, { user });

        if (isAllowed) {
          expect(result.success).toBe(true);
        } else {
          expect(result.success).toBe(false);
          if (!result.success) {
            expect(result.error.code).toBe("PERMISSION_DENIED");
          }
        }
      });
    });
  });
});
