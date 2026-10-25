/**
 * Masaar Clinic System — Patient Status Machine
 * 
 * Spec Reference: docs/FEATURES-v2.2.md §4.1 (R-4.1-19), §4.2 (R-4.2-6), §1.1 (R-1.1-1)
 * Rules Index: docs/design/rules-index.md
 * Glossary: docs/design/glossary.md
 * Decisions: DEC-003 (Zero hard deletes)
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

export type PatientStatus =
  | 'LEAD'
  | 'ACTIVE'
  | 'DISCHARGED';

export const PATIENT_STATUSES: readonly PatientStatus[] = [
  'LEAD',
  'ACTIVE',
  'DISCHARGED',
] as const;

export const PATIENT_STATUS_DEFINITIONS: readonly StatusDefinition<PatientStatus>[] = [
  {
    status: 'LEAD',
    labelEn: 'Lead / Registered',
    labelAr: 'عميل محتمل / مسجل جديد',
    descriptionEn: 'Patient registered in system but has not yet attended their first appointment in the clinic.',
    descriptionAr: 'مريض مسجل في النظام ولكن لم يحضر جلسته الأولى في مقر العيادة بعد.',
    isTerminal: false,
  },
  {
    status: 'ACTIVE',
    labelEn: 'Active',
    labelAr: 'نشط',
    descriptionEn: 'Patient who has attended at least one appointment and is currently receiving clinical care.',
    descriptionAr: 'مريض حضر جلسة واحدة على الأقل ويتلقى حالياً رعاية علاجية أو استشارية.',
    isTerminal: false,
  },
  {
    status: 'DISCHARGED',
    labelEn: 'Discharged',
    labelAr: 'تم إنهاء العلاج / تخريج',
    descriptionEn: 'Patient treatment plan concluded by clinician/Owner; profile preserved without active recurring bookings.',
    descriptionAr: 'تم إنهاء البرنامج العلاجي للمريض مع حفظ ملفه السريري كاملاً دون مواعيد نشطة.',
    isTerminal: false,
  },
] as const;

export const PATIENT_TRANSITIONS: readonly StateTransition<PatientStatus>[] = [
  {
    id: 'TR-PAT-01',
    from: 'LEAD',
    to: 'ACTIVE',
    allowedRoles: ['RECEPTIONIST', 'MANAGER', 'OWNER'],
    requiresReason: false,
    timeLimit: 'Automatic upon first physical check-in',
    conditions: 'Patient attends their first scheduled appointment and front desk records arrival',
    sideEffects: [
      'Sets patient status to ACTIVE (R-4.2-6)',
      'Stores firstVisitAt UTC timestamp',
      'Audits initial patient activation (R-13-1)',
    ],
    ruleIds: ['R-4.1-19', 'R-4.2-6', 'R-5.5-1'],
    descriptionEn: 'Automatically activate patient file upon first appointment check-in.',
    descriptionAr: 'تفعيل ملف المريض تلقائياً عند تسجيل حضوره لموعده الأول بالعيادة.',
  },
  {
    id: 'TR-PAT-02',
    from: 'ACTIVE',
    to: 'DISCHARGED',
    allowedRoles: ['PHYSIOTHERAPIST', 'NUTRITIONIST', 'OWNER'],
    requiresReason: true,
    timeLimit: 'At end of treatment plan or goal attainment',
    conditions: 'Treating clinician or Owner confirms discharge after clinical evaluation (R-4.2-6)',
    sideEffects: [
      'Sets patient status to DISCHARGED',
      'Records dischargeAt UTC timestamp and discharging clinician ID',
      'Requires clinical discharge summary or outcome note',
      'Audits patient discharge (R-13-1)',
    ],
    ruleIds: ['R-4.1-19', 'R-4.2-6'],
    descriptionEn: 'Discharge patient upon conclusion of treatment goals (Clinician/Owner only).',
    descriptionAr: 'إنهاء البرنامج العلاجي وتخريج المريض (صلاحية المعالج أو المالك فقط).',
  },
  {
    id: 'TR-PAT-03',
    from: 'DISCHARGED',
    to: 'ACTIVE',
    allowedRoles: ['RECEPTIONIST', 'MANAGER', 'OWNER'],
    requiresReason: true,
    timeLimit: 'Any future return visit',
    conditions: 'Front desk books a new appointment or package for a previously discharged patient (R-4.2-6)',
    sideEffects: [
      'Prompts front-desk user with confirmation dialog to re-activate file',
      'Re-activates patient status to ACTIVE (R-4.2-6)',
      'Records re-activation reason (e.g. recurrence, new complaint, maintenance visit)',
      'Audits patient re-activation (R-13-1)',
    ],
    ruleIds: ['R-4.1-19', 'R-4.2-6'],
    descriptionEn: 'Re-activate a discharged patient when a new booking is created.',
    descriptionAr: 'إعادة تفعيل ملف المريض عند حجز موعد جديد مع تأكيد الاستقبال.',
  },
  {
    id: 'TR-PAT-04',
    from: 'LEAD',
    to: 'DISCHARGED',
    allowedRoles: ['OWNER', 'MANAGER'],
    requiresReason: true,
    timeLimit: 'Administrative review of dormant leads',
    conditions: 'Owner or Manager archives a lead who declined treatment or registered in error',
    sideEffects: [
      'Sets status to DISCHARGED without ever being marked active',
      'Audits lead archiving with recorded reason (R-13-1)',
    ],
    ruleIds: ['R-4.1-19', 'R-13-1'],
    descriptionEn: 'Archive a lead who opted not to proceed with treatment.',
    descriptionAr: 'أرشفة عميل محتمل قرر عدم بدء العلاج أو سُجل خطأً.',
  },
] as const;

export const PATIENT_FORBIDDEN_TRANSITIONS: readonly ForbiddenTransition<PatientStatus>[] = [
  {
    from: 'ACTIVE',
    to: 'LEAD',
    reasonEn: 'Active patients have historical visits and cannot be reverted to a pre-visit lead.',
    reasonAr: 'المريض النشط لديه سجل زيارات ولا يمكن إعادته لحالة عميل محتمل.',
    ruleIds: ['R-4.1-19', 'R-4.2-6'],
  },
  {
    from: 'DISCHARGED',
    to: 'LEAD',
    reasonEn: 'Discharged patients have treatment history and cannot be converted to a lead.',
    reasonAr: 'المريض الذي تم إنهاء علاجه لديه تاريخ علاجي ولا يعود لحالة عميل محتمل.',
    ruleIds: ['R-4.1-19', 'R-4.2-6'],
  },
] as const;

export const PATIENT_STATE_MACHINE: StatusMachineDefinition<PatientStatus> = {
  entityName: 'Patient',
  initialStatus: 'LEAD',
  statuses: PATIENT_STATUS_DEFINITIONS,
  transitions: PATIENT_TRANSITIONS,
  forbiddenTransitions: PATIENT_FORBIDDEN_TRANSITIONS,
};
