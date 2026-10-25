/**
 * Masaar Clinic System — Receipt Status Machine
 * 
 * Spec Reference: docs/FEATURES-v2.2.md §8.2 (R-8.2-1..4), §8.3 (R-8.3-1..3), §1.1 (R-1.1-11, R-1.1-12)
 * Rules Index: docs/design/rules-index.md
 * Glossary: docs/design/glossary.md
 * Decisions: DEC-003 (No hard deletes), DEC-017 (Annual sequence reset)
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

export type ReceiptStatus =
  | 'ACTIVE'
  | 'VOIDED';

export const RECEIPT_STATUSES: readonly ReceiptStatus[] = [
  'ACTIVE',
  'VOIDED',
] as const;

export const RECEIPT_STATUS_DEFINITIONS: readonly StatusDefinition<ReceiptStatus>[] = [
  {
    status: 'ACTIVE',
    labelEn: 'Active / Valid',
    labelAr: 'نشط / ساري',
    descriptionEn: 'Valid payment receipt; credited towards charge balance and cash drawer totals.',
    descriptionAr: 'إيصال دفع رسمي ساري؛ محسوب في سداد الرصيد وإيرادات وردية الخزينة.',
    isTerminal: false,
  },
  {
    status: 'VOIDED',
    labelEn: 'Voided',
    labelAr: 'ملغي / باطل',
    descriptionEn: 'Receipt voided due to billing error; remains visible struck through; excluded from financial totals.',
    descriptionAr: 'إيصال باطل ملغي بسبب خطأ في الإدخال؛ يظهر مشطوباً ويُستبعد تماماً من الإيرادات.',
    isTerminal: true,
  },
] as const;

export const RECEIPT_VOID_REASONS = [
  'DATA_ENTRY_ERROR',
  'WRONG_PAYMENT_METHOD',
  'WRONG_PATIENT_CHARGE',
  'DUPLICATE_ENTRY',
  'TEST_RECORD',
  'OTHER',
] as const;

export type ReceiptVoidReason = typeof RECEIPT_VOID_REASONS[number];

export const RECEIPT_TRANSITIONS: readonly StateTransition<ReceiptStatus>[] = [
  {
    id: 'TR-RCP-01',
    from: 'ACTIVE',
    to: 'VOIDED',
    allowedRoles: ['OWNER', 'MANAGER'],
    requiresReason: true,
    reasonOptions: RECEIPT_VOID_REASONS,
    timeLimit: 'Post-issuance administrative correction',
    conditions: 'Owner or Manager voids receipt due to clerical or transaction error (R-8.3-1); Receptionist strictly blocked (R-1.1-12)',
    sideEffects: [
      'Sets receipt status to VOIDED',
      'Stores voidedAt UTC timestamp and voidedByUserId',
      'Stores mandatory voidReason text note (R-8.3-1)',
      'Receipt remains permanently visible in UI struck through (R-8.3-1)',
      'Excluded from collections, revenue reports, and cash drawer totals (R-8.3-1)',
      'Restores outstanding balance on the associated charge by the voided amount (R-8.1-3)',
      'If payment was in closed cash shift, flags shift discrepancy and requires audit note (R-8.4-3)',
      'Audits void event with high severity (R-13-1)',
    ],
    ruleIds: ['R-8.3-1', 'R-1.1-12', 'R-8.1-3', 'R-8.4-3', 'R-13-1'],
    descriptionEn: 'Void payment receipt for administrative correction (Owner/Manager only).',
    descriptionAr: 'إلغاء وإبطال إيصال سداد بسبب خطأ مالي (صلاحية المالك أو المدير فقط).',
  },
] as const;

export const RECEIPT_FORBIDDEN_TRANSITIONS: readonly ForbiddenTransition<ReceiptStatus>[] = [
  {
    from: 'VOIDED',
    to: 'ACTIVE',
    reasonEn: 'Voided receipts are immutable and permanently invalid. A new payment must be recorded if needed.',
    reasonAr: 'الإيصال الباطل لا يمكن إعادة تفعيله إطلاقاً؛ يجب تسجيل إيصال دفع جديد.',
    ruleIds: ['R-8.3-1', 'DEC-003'],
  },
] as const;

export const RECEIPT_STATE_MACHINE: StatusMachineDefinition<ReceiptStatus> = {
  entityName: 'Receipt',
  initialStatus: 'ACTIVE',
  statuses: RECEIPT_STATUS_DEFINITIONS,
  transitions: RECEIPT_TRANSITIONS,
  forbiddenTransitions: RECEIPT_FORBIDDEN_TRANSITIONS,
};
