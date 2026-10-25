/**
 * Masaar Clinic System — Package Status Machine
 * 
 * Spec Reference: docs/FEATURES-v2.2.md §7 (R-7-1 through R-7-8), §8.1 (R-8.1-3), §8.3 (R-8.3-2)
 * Rules Index: docs/design/rules-index.md
 * Glossary: docs/design/glossary.md
 * Decisions: DEC-005 (Calculated values), DEC-009 (Physio/Nutrition scope), DEC-023 (Cancelled balance formula)
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

export type PackageStatus =
  | 'ACTIVE'
  | 'COMPLETED'
  | 'EXPIRED'
  | 'CANCELLED';

export const PACKAGE_STATUSES: readonly PackageStatus[] = [
  'ACTIVE',
  'COMPLETED',
  'EXPIRED',
  'CANCELLED',
] as const;

export const PACKAGE_STATUS_DEFINITIONS: readonly StatusDefinition<PackageStatus>[] = [
  {
    status: 'ACTIVE',
    labelEn: 'Active',
    labelAr: 'نشط',
    descriptionEn: 'Package is within validity date (today <= expiryDate) and has remaining available sessions.',
    descriptionAr: 'الباقة سارية الصلاحية وتحتوي على جلسات متبقية متاحة للحجز.',
    isTerminal: false,
  },
  {
    status: 'COMPLETED',
    labelEn: 'Completed',
    labelAr: 'مكتمل',
    descriptionEn: 'All sessions in the package have been consumed (completedSessions == totalSessions).',
    descriptionAr: 'تم استهلاك جميع جلسات الباقة بالكامل.',
    isTerminal: false,
  },
  {
    status: 'EXPIRED',
    labelEn: 'Expired',
    labelAr: 'منتهي الصلاحية',
    descriptionEn: 'Validity date passed (today > expiryDate) while sessions remained; remaining sessions are forfeited.',
    descriptionAr: 'انتهت فترة الصلاحية مع بقاء جلسات غير مستخدمة؛ تُسقط الجلسات المتبقية ويبقى الرصيد مستحقاً.',
    isTerminal: false,
  },
  {
    status: 'CANCELLED',
    labelEn: 'Cancelled',
    labelAr: 'ملغي',
    descriptionEn: 'Package cancelled by Owner/Manager; financial liability recalculated to completed sessions.',
    descriptionAr: 'تم إلغاء الباقة بقرار إداري مع إعادة احتساب القيمة المستحقة على الجلسات المنفذة فقط.',
    isTerminal: true,
  },
] as const;

export const PACKAGE_CANCELLATION_REASONS = [
  'PATIENT_RELOCATION',
  'MEDICAL_CONTRAINDICATION',
  'PATIENT_DISSATISFACTION',
  'FINANCIAL_DIFFICULTY',
  'TREATMENT_PLAN_CHANGED',
  'OTHER',
] as const;

export type PackageCancellationReason = typeof PACKAGE_CANCELLATION_REASONS[number];

export const PACKAGE_TRANSITIONS: readonly StateTransition<PackageStatus>[] = [
  {
    id: 'TR-PKG-01',
    from: 'ACTIVE',
    to: 'COMPLETED',
    allowedRoles: ['PHYSIOTHERAPIST', 'NUTRITIONIST', 'OWNER'],
    requiresReason: false,
    timeLimit: 'Automatic on last session completion',
    conditions: 'Completed sessions count equals total package sessions count (completedSessions == totalSessions)',
    sideEffects: [
      'Sets completed package lifecycle state',
      'Prevents any further bookings against this package',
      'Remaining sessions become 0',
      'Audits package completion (R-13-1)',
    ],
    ruleIds: ['R-7-4', 'R-9.1-7'],
    descriptionEn: 'Transition to completed when all sessions are performed.',
    descriptionAr: 'التحول إلى مكتمل عند تنفيذ كافة جلسات الباقة.',
  },
  {
    id: 'TR-PKG-02',
    from: 'ACTIVE',
    to: 'EXPIRED',
    allowedRoles: ['OWNER', 'MANAGER', 'RECEPTIONIST'],
    requiresReason: false,
    timeLimit: 'Triggered when calendar day exceeds expiryDate (purchaseDate + 60 days)',
    conditions: 'Current date > expiryDate AND available sessions remain > 0',
    sideEffects: [
      'Unused remaining sessions are permanently forfeited (R-7-4)',
      'Blocks booking future appointments after expiry date (R-7-8)',
      'Unpaid monetary balance remains strictly owed by patient (R-7-5)',
      'Triggers front-desk alert / reporting entry (R-6-1, R-12-4)',
    ],
    ruleIds: ['R-7-4', 'R-7-5', 'R-7-8', 'R-12-4'],
    descriptionEn: 'Expire package when validity date passes, forfeiting unconsumed sessions.',
    descriptionAr: 'انتهاء صلاحية الباقة وسقوط الجلسات المتبقية مع بقاء أي رصيد مالي مستحقاً.',
  },
  {
    id: 'TR-PKG-03',
    from: 'EXPIRED',
    to: 'ACTIVE',
    allowedRoles: ['OWNER', 'MANAGER'],
    requiresReason: true,
    timeLimit: 'Extension range: 1 to 365 days',
    conditions: 'Owner or Manager extends package validity (+N days) with mandatory justification note',
    sideEffects: [
      'Updates expiryDate = previous expiryDate + N days (R-7-6)',
      'Restores previously forfeited sessions to ACTIVE available status',
      'Allows scheduling new sessions up to the new expiry date (R-7-8)',
      'Audits package extension with days count, user, and reason (R-13-1)',
    ],
    ruleIds: ['R-7-6', 'R-1.1-10', 'R-13-1'],
    descriptionEn: 'Extend package validity and reactivate forfeited sessions (Owner/Manager only).',
    descriptionAr: 'تمديد صلاحية الباقة وإعادة تنشيط الجلسات الساقطة (صلاحية المالك أو المدير فقط).',
  },
  {
    id: 'TR-PKG-04',
    from: 'ACTIVE',
    to: 'CANCELLED',
    allowedRoles: ['OWNER', 'MANAGER'],
    requiresReason: true,
    reasonOptions: PACKAGE_CANCELLATION_REASONS,
    timeLimit: 'Any time prior to full consumption',
    conditions: 'Administrative cancellation by Owner or Manager with financial refund/settlement decision',
    sideEffects: [
      'Recalculates owed liability: owed = completedSessions * perSessionValue (R-8.1-3, DEC-023)',
      'Cancels any future scheduled sessions tied to this package and frees bed/clinician slots',
      'Enables issuance of financial refund if total non-voided payments exceed owed amount (R-8.3-2)',
      'Package is permanently closed (terminal)',
      'Audits package cancellation with mandatory reason (R-13-1)',
    ],
    ruleIds: ['R-7-4', 'R-1.1-10', 'R-8.1-3', 'R-8.3-2', 'R-13-1'],
    descriptionEn: 'Cancel active package and recalculate financial balance to used sessions only.',
    descriptionAr: 'إلغاء الباقة النشطة وتعديل المبلغ المستحق ليطابق الجلسات المستهلكة فقط.',
  },
  {
    id: 'TR-PKG-05',
    from: 'EXPIRED',
    to: 'CANCELLED',
    allowedRoles: ['OWNER', 'MANAGER'],
    requiresReason: true,
    reasonOptions: PACKAGE_CANCELLATION_REASONS,
    timeLimit: 'Post-expiration administrative settlement',
    conditions: 'Owner or Manager cancels expired package to close account or process exception refund',
    sideEffects: [
      'Recalculates owed liability: owed = completedSessions * perSessionValue (R-8.1-3)',
      'Permits Owner-approved exceptional refund if payments exceeded completed session value (R-8.3-2)',
      'Allows remaining unpaid balance to be written off if uncollectible (R-7-5)',
      'Audits package cancellation (R-13-1)',
    ],
    ruleIds: ['R-7-4', 'R-7-5', 'R-8.1-3', 'R-8.3-2', 'R-13-1'],
    descriptionEn: 'Cancel expired package and settle account balance.',
    descriptionAr: 'إلغاء باقة منتهية الصلاحية وتسوية الرصيد المالي المتبقي.',
  },
  {
    id: 'TR-PKG-06',
    from: 'COMPLETED',
    to: 'ACTIVE',
    allowedRoles: ['OWNER'],
    requiresReason: true,
    timeLimit: 'Automatic upon Owner re-opening a completed appointment',
    conditions: 'Triggered when Owner re-opens a completed appointment (R-5.5-11) within package validity',
    sideEffects: [
      'Decrements completedSessions count by 1',
      'Restores 1 available session to package (R-5.5-11)',
      'If today <= expiryDate, package status reverts to ACTIVE',
      'If today > expiryDate, package status transitions to EXPIRED with 1 forfeited session',
      'Audits appointment re-open and session restoration (R-13-1)',
    ],
    ruleIds: ['R-5.5-11', 'R-7-4', 'R-1.1-8'],
    descriptionEn: 'Restore package to active when Owner re-opens a completed appointment.',
    descriptionAr: 'إعادة الباقة للحالة النشطة عند إعادة فتح موعد مكتمل بواسطة المالك.',
  },
] as const;

export const PACKAGE_FORBIDDEN_TRANSITIONS: readonly ForbiddenTransition<PackageStatus>[] = [
  {
    from: 'CANCELLED',
    to: 'ACTIVE',
    reasonEn: 'Cancelled packages are permanently closed. A new package must be purchased.',
    reasonAr: 'الباقة الملغاة مغلقة نهائياً؛ يجب شراء باقة جديدة للمريض.',
    ruleIds: ['R-7-4'],
  },
  {
    from: 'CANCELLED',
    to: 'COMPLETED',
    reasonEn: 'Cannot complete a cancelled package.',
    reasonAr: 'لا يمكن إكمال باقة تم إلغاؤها مسبقاً.',
    ruleIds: ['R-7-4'],
  },
  {
    from: 'CANCELLED',
    to: 'EXPIRED',
    reasonEn: 'Cannot expire an already cancelled package.',
    reasonAr: 'لا يمكن إنهاء صلاحية باقة ملغاة.',
    ruleIds: ['R-7-4'],
  },
  {
    from: 'COMPLETED',
    to: 'EXPIRED',
    reasonEn: 'Completed packages have zero unconsumed sessions, so no sessions exist to forfeit.',
    reasonAr: 'الباقة المكتملة لا تحتوي على جلسات متبقية لتسقط بانتهاء الصلاحية.',
    ruleIds: ['R-7-4'],
  },
] as const;

export const PACKAGE_STATE_MACHINE: StatusMachineDefinition<PackageStatus> = {
  entityName: 'Package',
  initialStatus: 'ACTIVE',
  statuses: PACKAGE_STATUS_DEFINITIONS,
  transitions: PACKAGE_TRANSITIONS,
  forbiddenTransitions: PACKAGE_FORBIDDEN_TRANSITIONS,
};
