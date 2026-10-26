import { describe, it, expect } from "vitest";
import {
  APPOINTMENT_STATE_MACHINE,
  PACKAGE_STATE_MACHINE,
  PATIENT_STATE_MACHINE,
  CLINICAL_NOTE_STATE_MACHINE,
  RECEIPT_STATE_MACHINE,
  STAFF_STATE_MACHINE,
  OTP_ENROLLMENT_STATE_MACHINE,
  type StatusMachineDefinition,
} from "@/domain/status";

const ALL_STATE_MACHINES: StatusMachineDefinition<any>[] = [
  APPOINTMENT_STATE_MACHINE,
  PACKAGE_STATE_MACHINE,
  PATIENT_STATE_MACHINE,
  CLINICAL_NOTE_STATE_MACHINE,
  RECEIPT_STATE_MACHINE,
  STAFF_STATE_MACHINE,
  OTP_ENROLLMENT_STATE_MACHINE,
];

describe("Generated Status Transitions Test Suite (All 7 Domain Machines)", () => {
  describe.each(ALL_STATE_MACHINES)(
    "State Machine: $entityName",
    (machine: StatusMachineDefinition<any>) => {
      it("has a valid initial status and defined statuses", () => {
        expect(machine.initialStatus).toBeDefined();
        expect(machine.statuses.length).toBeGreaterThan(1);
      });

      // 1. Test every allowed transition
      describe("Allowed Transitions", () => {
        for (const t of machine.transitions) {
          it(`allows transition: ${String(t.from)} -> ${String(t.to)}`, () => {
            expect(t.from).toBeDefined();
            expect(t.to).toBeDefined();
            expect(t.allowedRoles.length).toBeGreaterThan(0);
            expect(t.ruleIds.length).toBeGreaterThan(0);
          });
        }
      });

      // 2. Test every forbidden transition
      describe("Forbidden Transitions", () => {
        for (const ft of machine.forbiddenTransitions) {
          it(`documents forbidden transition: ${String(ft.from)} -> ${String(ft.to)}`, () => {
            expect(ft.from).toBeDefined();
            expect(ft.to).toBeDefined();
            expect(ft.ruleIds.length).toBeGreaterThan(0);
            expect(ft.reasonEn).toBeDefined();
            expect(ft.reasonAr).toBeDefined();
          });
        }
      });
    }
  );
});
