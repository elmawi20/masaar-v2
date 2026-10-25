/**
 * Masaar Clinic System — Staff Status Machine
 * 
 * Spec Reference: docs/FEATURES-v2.2.md §3 (R-3-1..5), §1.1 (R-1.1-19), §15.1 (R-15.1-5)
 * Rules Index: docs/design/rules-index.md
 * Glossary: docs/design/glossary.md
 * Decisions: DEC-003 (No hard deletes)
 * 
 * Design Task 1.06: Typed status data file.
 * Pure data and types only. No runtime application logic or database queries.
 */

import type { ClinicRole } from '../permissions';
import type {
  StatusDefinition,
  StateTransition,
  ForbiddenTransition,
  StatusMachineDefinition,
} from './types';

export type StaffStatus =
  | 'ACTIVE'
  | 'INACTIVE';

export const STAFF_STATUSES: readonly StaffStatus[] = [
  'ACTIVE',
  'INACTIVE',
] as const;

export const STAFF_STATUS_DEFINITIONS: readonly StatusDefinition<StaffStatus>[] = [
  {
    status: 'ACTIVE',
    labelEn: 'Active',
    labelAr: 'نشط',
    descriptionEn: 'Staff member is active, permitted to authenticate, and eligible for appointment scheduling.',
    descriptionAr: 'الموظف نشط، مصرح له بتسجيل الدخول والظهور في جداول الحجز واستقبال المرضى.',
    isTerminal: false,
  },
  {
    status: 'INACTIVE',
    labelEn: 'Inactive / Deactivated',
    labelAr: 'معطل / غير نشط',
    descriptionEn: 'Staff account deactivated; login immediately blocked; removed from scheduling; historical data fully preserved.',
    descriptionAr: 'حساب الموظف معطل؛ يُمنع من الدخول فوراً ويُحجب من جداول الحجز مع الاحتفاظ الكامل بسجلاته التاريخية.',
    isTerminal: false,
  },
] as const;

export const STAFF_TRANSITIONS: readonly StateTransition<StaffStatus>[] = [
  {
    id: 'TR-STF-01',
    from: 'ACTIVE',
    to: 'INACTIVE',
    allowedRoles: ['OWNER'],
    requiresReason: true,
    timeLimit: 'Immediate administrative action',
    conditions: 'Owner deactivates staff member (R-1.1-19); Owner cannot deactivate their own active account',
    sideEffects: [
      'Sets isActive = false (R-3-1, R-3-5)',
      'Stores deactivatedAt UTC timestamp and deactivatedByUserId',
      'Terminates all active login sessions immediately on next server request (R-15.1-5)',
      'Revokes all registered trusted devices for the user (R-15.2-4)',
      'Hides staff member from active calendar booking clinician dropdowns (R-3-5)',
      'Preserves all clinical charting, receipts, commissions, and audit records intact (R-3-5, DEC-003)',
      'Audits staff deactivation with high severity (R-13-1)',
    ],
    ruleIds: ['R-3-5', 'R-1.1-19', 'R-15.1-5', 'R-15.2-4', 'R-13-1'],
    descriptionEn: 'Deactivate staff member account (Owner only).',
    descriptionAr: 'تعطيل حساب موظف ومنعه الفوري من الدخول (صلاحية المالك فقط).',
  },
  {
    id: 'TR-STF-02',
    from: 'INACTIVE',
    to: 'ACTIVE',
    allowedRoles: ['OWNER'],
    requiresReason: true,
    timeLimit: 'Discretionary owner action',
    conditions: 'Owner re-activates a previously deactivated employee account',
    sideEffects: [
      'Sets isActive = true',
      'Restores login capabilities (subject to password & OTP verification)',
      'Restores visibility in active appointment booking dropdowns',
      'Audits staff re-activation (R-13-1)',
    ],
    ruleIds: ['R-3-5', 'R-1.1-19', 'R-13-1'],
    descriptionEn: 'Reactivate previously deactivated staff account (Owner only).',
    descriptionAr: 'إعادة تفعيل حساب موظف معطل (صلاحية المالك فقط).',
  },
] as const;

export const STAFF_FORBIDDEN_TRANSITIONS: readonly ForbiddenTransition<StaffStatus>[] = [
  {
    from: 'ACTIVE',
    to: 'INACTIVE',
    reasonEn: 'Owner is strictly forbidden from deactivating their own account to prevent administrative lockout.',
    reasonAr: 'يُحظر على المالك تعطيل حسابه الشخصي لمنع فقدان التحكم في النظام.',
    ruleIds: ['R-1.1-19', 'R-15.1-5'],
  },
] as const;

export const STAFF_STATE_MACHINE: StatusMachineDefinition<StaffStatus> = {
  entityName: 'Staff',
  initialStatus: 'ACTIVE',
  statuses: STAFF_STATUS_DEFINITIONS,
  transitions: STAFF_TRANSITIONS,
  forbiddenTransitions: STAFF_FORBIDDEN_TRANSITIONS,
};
