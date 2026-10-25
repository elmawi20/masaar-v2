/**
 * Masaar Clinic System — Clinical Note Status Machine
 * 
 * Spec Reference: docs/FEATURES-v2.2.md §9.1 (R-9.1-1..7), §9.2 (R-9.2-1..2), §1.1 (R-1.1-2, R-1.1-8)
 * Rules Index: docs/design/rules-index.md
 * Glossary: docs/design/glossary.md
 * Decisions: DEC-003 (No hard deletes), DEC-016 (24h edit window from completedAt)
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

export type ClinicalNoteStatus =
  | 'DRAFT'
  | 'COMPLETED'
  | 'LOCKED'
  | 'REOPENED';

export const CLINICAL_NOTE_STATUSES: readonly ClinicalNoteStatus[] = [
  'DRAFT',
  'COMPLETED',
  'LOCKED',
  'REOPENED',
] as const;

export const CLINICAL_NOTE_STATUS_DEFINITIONS: readonly StatusDefinition<ClinicalNoteStatus>[] = [
  {
    status: 'DRAFT',
    labelEn: 'Draft / In Progress',
    labelAr: 'مسودة / قيد التحرير',
    descriptionEn: 'Clinical SOAP note or InBody consultation form currently being written by clinician.',
    descriptionAr: 'نموذج التوثيق السريري أو استشارة التغذية قيد التدوين من قبل المعالج.',
    isTerminal: false,
  },
  {
    status: 'COMPLETED',
    labelEn: 'Completed / Submitted',
    labelAr: 'مكتمل / معتمد',
    descriptionEn: 'Session note formally submitted; editable strictly by the author for 24 hours.',
    descriptionAr: 'ملاحظة سريرية معتمدة؛ قابلة للتعديل بواسطة كاتبها فقط خلال 24 ساعة من الحفظ الأول.',
    isTerminal: false,
  },
  {
    status: 'LOCKED',
    labelEn: 'Locked (Immutable)',
    labelAr: 'مغلق (غير قابل للتعديل)',
    descriptionEn: '24-hour edit countdown elapsed; original note text is locked permanently; addenda only.',
    descriptionAr: 'انقضت مهلة الـ 24 ساعة؛ النص الأصلي مقفل نهائياً ويُسمح فقط بإضافة ملاحق تكميلية.',
    isTerminal: true,
  },
  {
    status: 'REOPENED',
    labelEn: 'Reopened by Owner',
    labelAr: 'معاد فتحه بواسطة المالك',
    descriptionEn: 'Session note re-opened following Owner re-opening of the completed appointment.',
    descriptionAr: 'تم إعادة فتح الملاحظة السريرية تبعاً لإعادة فتح الموعد بواسطة المالك لتصحيح التوثيق.',
    isTerminal: false,
  },
] as const;

export const CLINICAL_NOTE_TRANSITIONS: readonly StateTransition<ClinicalNoteStatus>[] = [
  {
    id: 'TR-NOTE-01',
    from: 'DRAFT',
    to: 'COMPLETED',
    allowedRoles: ['PHYSIOTHERAPIST', 'NUTRITIONIST', 'OWNER'],
    requiresReason: false,
    timeLimit: 'Submitted at completion of session',
    conditions: 'Validation passes: at least one S/O/A/P or treatment item filled (R-9.1-6)',
    sideEffects: [
      'Sets completedAt UTC timestamp (starts exact 24-hour edit countdown, DEC-016)',
      'Transitions linked appointment to COMPLETED (R-9.1-7)',
      'Deducts package session if linked (R-9.1-7)',
      'Calculates clinician commission (R-11-1)',
      'Audits note submission (R-13-1)',
    ],
    ruleIds: ['R-9.1-6', 'R-9.1-7', 'R-9.2-1', 'R-11-1', 'R-13-1'],
    descriptionEn: 'Initial submission of clinical session note, starting 24h countdown.',
    descriptionAr: 'الاعتماد الأولي للملاحظة السريرية وبدء العد التنازلي لمهلة الـ 24 ساعة.',
  },
  {
    id: 'TR-NOTE-02',
    from: 'COMPLETED',
    to: 'COMPLETED',
    allowedRoles: ['PHYSIOTHERAPIST', 'NUTRITIONIST', 'OWNER'],
    requiresReason: false,
    timeLimit: 'Strictly within 24 hours of completedAt (DEC-016)',
    conditions: 'Current user must be the original note author (R-9.2-1); Owner may only edit if author',
    sideEffects: [
      'Creates immutable version history record (who, when, previous text snapshot, R-9.2-1)',
      'Increments versionNumber',
      'Updates updatedAt UTC timestamp',
      'Audits note modification (R-13-1)',
    ],
    ruleIds: ['R-9.2-1', 'R-13-1'],
    descriptionEn: 'Edit note within 24h window by original author, recording version diff.',
    descriptionAr: 'تعديل الملاحظة خلال نافذة الـ 24 ساعة بواسطة كاتبها مع حفظ نسخة كاملة من النص السابق.',
  },
  {
    id: 'TR-NOTE-03',
    from: 'COMPLETED',
    to: 'LOCKED',
    allowedRoles: ['OWNER', 'MANAGER', 'RECEPTIONIST', 'PHYSIOTHERAPIST', 'NUTRITIONIST'],
    requiresReason: false,
    timeLimit: 'Automatic when current UTC time > completedAt + 24 hours',
    conditions: 'System time passes 24-hour mark from completedAt (DEC-016)',
    sideEffects: [
      'Sets isLocked = true and lockedAt UTC timestamp (R-9.2-2)',
      'Disallows any direct editing of note body for all roles including author and Owner',
      'Restricts future modifications strictly to appending Addendum notes (R-9.2-2)',
    ],
    ruleIds: ['R-9.2-1', 'R-9.2-2'],
    descriptionEn: 'Permanently lock note body after 24 hours elapsed.',
    descriptionAr: 'إغلاق وتجميد نص الملاحظة السريرية نهائياً بعد مرور 24 ساعة.',
  },
  {
    id: 'TR-NOTE-04',
    from: 'LOCKED',
    to: 'LOCKED',
    allowedRoles: ['PHYSIOTHERAPIST', 'NUTRITIONIST', 'OWNER'],
    requiresReason: true,
    timeLimit: 'Any time post-lock',
    conditions: 'Clinician (author or covering clinician with reason) appending a supplementary clinical addendum',
    sideEffects: [
      'Creates separate Addendum record linked to the note (text, createdBy, createdAt)',
      'Leaves original locked note body completely untouched and immutable',
      'Audits addendum addition with clinical rationale (R-13-1)',
    ],
    ruleIds: ['R-9.2-2', 'R-13-1'],
    descriptionEn: 'Append an immutable addendum note to a locked clinical record.',
    descriptionAr: 'إضافة ملحق تكميلي لملاحظة سريرية مغلقة دون المساس بالنص الأصلي.',
  },
  {
    id: 'TR-NOTE-05',
    from: 'COMPLETED',
    to: 'REOPENED',
    allowedRoles: ['OWNER'],
    requiresReason: true,
    timeLimit: 'Triggered when Owner re-opens a completed appointment',
    conditions: 'Owner invokes re-open completed appointment action (R-5.5-11, R-1.1-8)',
    sideEffects: [
      'Sets note status to REOPENED',
      'Allows author to revise charting following appointment restoration',
      'Restores package session to patient package (R-5.5-11)',
      'Audits administrative re-opening with mandatory justification (R-13-1)',
    ],
    ruleIds: ['R-5.5-11', 'R-1.1-8', 'R-13-1'],
    descriptionEn: 'Reopen completed note when Owner re-opens appointment.',
    descriptionAr: 'إعادة فتح الملاحظة السريرية عند قيام المالك بإعادة فتح الموعد.',
  },
  {
    id: 'TR-NOTE-06',
    from: 'LOCKED',
    to: 'REOPENED',
    allowedRoles: ['OWNER'],
    requiresReason: true,
    timeLimit: 'Exceptional Owner clinical audit re-opening',
    conditions: 'Owner re-opens completed appointment even if 24h passed, requiring formal clinical explanation',
    sideEffects: [
      'Unlocks note under strict Owner audit oversight',
      'Restores linked appointment to ARRIVED status',
      'Restores package session if consumed',
      'Records extensive high-priority audit entry (R-13-1)',
    ],
    ruleIds: ['R-5.5-11', 'R-1.1-8', 'R-13-1'],
    descriptionEn: 'Exceptional re-opening of locked note via Owner appointment re-open.',
    descriptionAr: 'إعادة فتح استثنائية لملاحظة مغلقة بواسطة المالك مع توثيق إلزامي مشدد.',
  },
  {
    id: 'TR-NOTE-07',
    from: 'REOPENED',
    to: 'COMPLETED',
    allowedRoles: ['PHYSIOTHERAPIST', 'NUTRITIONIST', 'OWNER'],
    requiresReason: false,
    timeLimit: 'Re-submitted following correction',
    conditions: 'Author re-submits corrected note and marks appointment completed again',
    sideEffects: [
      'Resets completedAt timestamp to current UTC time',
      'Deducts package session',
      'Re-calculates commission',
      'Restarts 24h author edit window',
      'Audits re-submission (R-13-1)',
    ],
    ruleIds: ['R-9.1-7', 'R-9.2-1', 'R-13-1'],
    descriptionEn: 'Re-submit corrected note after re-opening.',
    descriptionAr: 'إعادة اعتماد الملاحظة السريرية بعد تصحيحها.',
  },
] as const;

export const CLINICAL_NOTE_FORBIDDEN_TRANSITIONS: readonly ForbiddenTransition<ClinicalNoteStatus>[] = [
  {
    from: 'LOCKED',
    to: 'COMPLETED',
    reasonEn: 'Locked notes cannot be directly unlocked to COMPLETED; only Addenda may be added unless Owner re-opens session.',
    reasonAr: 'الملاحظة المغلقة لا تُعاد لمكتمل مباشرة؛ التعديل عبر الملاحق التكميلية فقط ما لم يُعد المالك فتح الموعد.',
    ruleIds: ['R-9.2-2'],
  },
  {
    from: 'LOCKED',
    to: 'DRAFT',
    reasonEn: 'Locked notes cannot revert to a draft.',
    reasonAr: 'الملاحظة المغلقة لا يمكن إعادتها لحالة مسودة.',
    ruleIds: ['R-9.2-2'],
  },
  {
    from: 'COMPLETED',
    to: 'DRAFT',
    reasonEn: 'Submitted notes cannot be reverted to unsubmitted drafts; edits must be versioned.',
    reasonAr: 'الملاحظة المعتمدة لا تعود لمسودة؛ أي تعديل يتم عبر تتبع الإصدارات.',
    ruleIds: ['R-9.2-1'],
  },
] as const;

export const CLINICAL_NOTE_STATE_MACHINE: StatusMachineDefinition<ClinicalNoteStatus> = {
  entityName: 'ClinicalNote',
  initialStatus: 'DRAFT',
  statuses: CLINICAL_NOTE_STATUS_DEFINITIONS,
  transitions: CLINICAL_NOTE_TRANSITIONS,
  forbiddenTransitions: CLINICAL_NOTE_FORBIDDEN_TRANSITIONS,
};
