/**
 * Masaar Clinic System — Domain Permissions Typed Data
 * 
 * Auto-generated data contract corresponding to:
 * - Spec Reference: docs/FEATURES-v2.2.md §1 & §1.1
 * - Matrix Reference: docs/design/permissions.md
 * - Rules Catalog: docs/design/rules-index.md
 * 
 * Design Task 1.05: Strictly typed data file exporting the permissions table.
 * NO application runtime logic, side effects, or database queries beyond pure types and static data.
 */

export type ClinicRole =
  | 'OWNER'
  | 'MANAGER'
  | 'RECEPTIONIST'
  | 'PHYSIOTHERAPIST'
  | 'NUTRITIONIST';

export const ALL_CLINIC_ROLES: readonly ClinicRole[] = [
  'OWNER',
  'MANAGER',
  'RECEPTIONIST',
  'PHYSIOTHERAPIST',
  'NUTRITIONIST',
] as const;

export type PermissionCategory =
  | 'PATIENT_ADMIN_CLINICAL'
  | 'SCHEDULING'
  | 'CLINICAL_SESSION'
  | 'PACKAGES'
  | 'BILLING_DRAWER'
  | 'EXPENSES_COMMISSIONS'
  | 'REPORTS_AUDIT'
  | 'ADMINISTRATION'
  | 'COMMUNICATION'
  | 'AUTH_SECURITY';

export type PermissionCondition =
  | 'NONE'
  | 'OWN_PATIENTS_ONLY'
  | 'COVERING_ACCESS_WITH_REASON'
  | 'DOC_CATEGORY_RESTRICTION'
  | 'OWN_APPTS_ONLY'
  | 'SAME_DAY_ONLY'
  | 'NOTE_AUTHOR_ONLY'
  | 'OWN_SAME_DAY_UNCLOSED_SHIFT_ONLY'
  | 'AS_CLINICIAN'
  | 'SCHEDULES_LEAVE_ROOMS_BEDS'
  | 'OWN_COMMISSION_ONLY'
  | 'CLINICAL_AUDIT_MASKED'
  | 'AUDITED';

export interface PermissionDefinition {
  readonly id: number;
  readonly actionKey: string;
  readonly labelEn: string;
  readonly labelAr: string;
  readonly category: PermissionCategory;
  readonly roles: Readonly<Record<ClinicRole, boolean>>;
  readonly condition: PermissionCondition;
  readonly conditionDetails?: string;
  readonly ruleIds: readonly string[];
}

/**
 * Master Permissions Matrix — 43 Actions
 * Exactly matches the rows in docs/design/permissions.md
 */
export const PERMISSIONS_MATRIX: readonly PermissionDefinition[] = [
  // 1. Patient Administration & Documents
  {
    id: 1,
    actionKey: 'patient.admin.create_edit',
    labelEn: 'Create / edit patient admin data',
    labelAr: 'إنشاء وتعديل البيانات الإدارية للمريض',
    category: 'PATIENT_ADMIN_CLINICAL',
    roles: {
      OWNER: true,
      MANAGER: true,
      RECEPTIONIST: true,
      PHYSIOTHERAPIST: false,
      NUTRITIONIST: false,
    },
    condition: 'NONE',
    conditionDetails: 'Front desk and operations demographic registration',
    ruleIds: ['R-1.1-1', 'R-4.1-1'],
  },
  {
    id: 2,
    actionKey: 'patient.clinical.view_edit',
    labelEn: 'View / edit diagnosis, clinical notes & medical records',
    labelAr: 'عرض وتعديل التشخيص والملف الطبي والملاحظات السريرية',
    category: 'PATIENT_ADMIN_CLINICAL',
    roles: {
      OWNER: true,
      MANAGER: false,
      RECEPTIONIST: false,
      PHYSIOTHERAPIST: true,
      NUTRITIONIST: true,
    },
    condition: 'OWN_PATIENTS_ONLY',
    conditionDetails: 'Treating clinicians (own patients) or covering clinician with logged reason; Receptionist/Manager strictly blocked',
    ruleIds: ['R-1.1-2', 'R-4.1-21', 'R-9.1-1'],
  },
  {
    id: 3,
    actionKey: 'patient.clinical.covering_access',
    labelEn: 'Request covering access to non-assigned patient',
    labelAr: 'طلب صلاحية تغطية مؤقتة لملف مريض غير مخصص',
    category: 'PATIENT_ADMIN_CLINICAL',
    roles: {
      OWNER: true,
      MANAGER: false,
      RECEPTIONIST: false,
      PHYSIOTHERAPIST: true,
      NUTRITIONIST: true,
    },
    condition: 'COVERING_ACCESS_WITH_REASON',
    conditionDetails: 'Valid for active login session (max 12h); reason logged and audited',
    ruleIds: ['R-1.1-21', 'R-9.1-1'],
  },
  {
    id: 4,
    actionKey: 'patient.documents.upload_and_view',
    labelEn: 'Upload patient documents & view admin attachments',
    labelAr: 'رفع المستندات وعرض المرفقات الإدارية وإثباتات الدفع',
    category: 'PATIENT_ADMIN_CLINICAL',
    roles: {
      OWNER: true,
      MANAGER: true,
      RECEPTIONIST: true,
      PHYSIOTHERAPIST: true,
      NUTRITIONIST: true,
    },
    condition: 'DOC_CATEGORY_RESTRICTION',
    conditionDetails: 'Receptionist/Manager view "ID / administrative" & "Payment proof" only; medical files blocked',
    ruleIds: ['R-1.1-3', 'R-4.2-1', 'R-4.2-6'],
  },

  // 2. Scheduling, Calendar & Queue
  {
    id: 5,
    actionKey: 'appointment.book_reschedule_cancel',
    labelEn: 'Book / reschedule / cancel / waitlist appointment',
    labelAr: 'حجز وتعديل وإلغاء المواعيد وإضافة لقائمة الانتظار',
    category: 'SCHEDULING',
    roles: {
      OWNER: true,
      MANAGER: true,
      RECEPTIONIST: true,
      PHYSIOTHERAPIST: true,
      NUTRITIONIST: true,
    },
    condition: 'OWN_APPTS_ONLY',
    conditionDetails: 'Front desk manages all; clinicians restricted to own appointments; cancel requires reason',
    ruleIds: ['R-1.1-4', 'R-5.2-1', 'R-5.2-10', 'R-5.2-11', 'R-5.3-1', 'R-5.5-13'],
  },
  {
    id: 6,
    actionKey: 'appointment.check_in',
    labelEn: 'Check in arrived patient',
    labelAr: 'تسجيل وصول المريض بالعيادة',
    category: 'SCHEDULING',
    roles: {
      OWNER: true,
      MANAGER: true,
      RECEPTIONIST: true,
      PHYSIOTHERAPIST: false,
      NUTRITIONIST: false,
    },
    condition: 'NONE',
    conditionDetails: 'Fast check-in at front desk; alerts assigned clinician; shows balance due (does not block check-in)',
    ruleIds: ['R-1.1-5', 'R-5.5-3', 'R-6-2'],
  },
  {
    id: 7,
    actionKey: 'appointment.undo_check_in',
    labelEn: 'Undo patient check-in',
    labelAr: 'التراجع عن تسجيل وصول المريض',
    category: 'SCHEDULING',
    roles: {
      OWNER: true,
      MANAGER: true,
      RECEPTIONIST: true,
      PHYSIOTHERAPIST: false,
      NUTRITIONIST: false,
    },
    condition: 'SAME_DAY_ONLY',
    conditionDetails: 'Front desk; same day only; reason required',
    ruleIds: ['R-1.1-5', 'R-5.5-3'],
  },
  {
    id: 8,
    actionKey: 'appointment.mark_undo_noshow',
    labelEn: 'Mark no-show / undo no-show',
    labelAr: 'تسجيل التخلف عن الحضور أو التراجع عنه',
    category: 'SCHEDULING',
    roles: {
      OWNER: true,
      MANAGER: true,
      RECEPTIONIST: true,
      PHYSIOTHERAPIST: true,
      NUTRITIONIST: true,
    },
    condition: 'SAME_DAY_ONLY',
    conditionDetails: 'Same day only; mark allowed after appointment start time; clinicians own appointments only',
    ruleIds: ['R-1.1-6', 'R-5.5-7', 'R-5.5-12'],
  },

  // 3. Clinical Session Documentation & Discharge
  {
    id: 9,
    actionKey: 'clinical.session.complete',
    labelEn: 'Complete session & submit treatment form',
    labelAr: 'إتمام الجلسة واعتماد نموذج العلاج',
    category: 'CLINICAL_SESSION',
    roles: {
      OWNER: true,
      MANAGER: false,
      RECEPTIONIST: false,
      PHYSIOTHERAPIST: true,
      NUTRITIONIST: true,
    },
    condition: 'AS_CLINICIAN',
    conditionDetails: 'Requires checked-in appointment; consumes package session; triggers commission',
    ruleIds: ['R-1.1-7', 'R-5.5-5', 'R-9.1-7'],
  },
  {
    id: 10,
    actionKey: 'clinical.session.edit_within_window',
    labelEn: 'Edit session note within lock window',
    labelAr: 'تعديل التقرير الطبي للجلسة خلال مهلة التعديل المسموحة',
    category: 'CLINICAL_SESSION',
    roles: {
      OWNER: true,
      MANAGER: false,
      RECEPTIONIST: false,
      PHYSIOTHERAPIST: true,
      NUTRITIONIST: true,
    },
    condition: 'NOTE_AUTHOR_ONLY',
    conditionDetails: 'Author only (including Owner for own notes) within 24h of save; keeps full version history',
    ruleIds: ['R-2-8', 'R-9.2-1'],
  },
  {
    id: 11,
    actionKey: 'clinical.session.reopen',
    labelEn: 'Re-open completed session note',
    labelAr: 'إعادة فتح تقرير طبي مكتمل ومقفل',
    category: 'CLINICAL_SESSION',
    roles: {
      OWNER: true,
      MANAGER: false,
      RECEPTIONIST: false,
      PHYSIOTHERAPIST: false,
      NUTRITIONIST: false,
    },
    condition: 'AUDITED',
    conditionDetails: 'Strictly restricted to Owner; requires documented audit reason',
    ruleIds: ['R-1.1-8', 'R-9.2-2'],
  },
  {
    id: 12,
    actionKey: 'clinical.session.add_addendum',
    labelEn: 'Add addendum note to locked clinical record',
    labelAr: 'إضافة ملحق لتقرير طبي مقفل',
    category: 'CLINICAL_SESSION',
    roles: {
      OWNER: true,
      MANAGER: false,
      RECEPTIONIST: false,
      PHYSIOTHERAPIST: true,
      NUTRITIONIST: true,
    },
    condition: 'OWN_PATIENTS_ONLY',
    conditionDetails: 'Permitted after 24h lock; appends new timestamped entry without modifying original note',
    ruleIds: ['R-9.2-2'],
  },
  {
    id: 13,
    actionKey: 'clinical.patient.discharge',
    labelEn: 'Discharge patient & finalize summary',
    labelAr: 'إنهاء البرنامج العلاجي للمريض وتوثيق تقرير الخروج',
    category: 'CLINICAL_SESSION',
    roles: {
      OWNER: true,
      MANAGER: false,
      RECEPTIONIST: false,
      PHYSIOTHERAPIST: true,
      NUTRITIONIST: true,
    },
    condition: 'OWN_PATIENTS_ONLY',
    conditionDetails: 'Treating clinician or Owner; records outcome, notes, and discharge date; sets status to discharged',
    ruleIds: ['R-4.1-19', 'R-9.5-1'],
  },

  // 4. Packages & Subscriptions
  {
    id: 14,
    actionKey: 'package.create',
    labelEn: 'Create patient package',
    labelAr: 'إنشاء باقة علاجية لمريض',
    category: 'PACKAGES',
    roles: {
      OWNER: true,
      MANAGER: true,
      RECEPTIONIST: true,
      PHYSIOTHERAPIST: false,
      NUTRITIONIST: false,
    },
    condition: 'NONE',
    conditionDetails: 'Creates package record, generates financial charge, initializes session counters',
    ruleIds: ['R-1.1-9', 'R-7-2'],
  },
  {
    id: 15,
    actionKey: 'package.extend',
    labelEn: 'Extend package validity days',
    labelAr: 'تمديد فترة صلاحية الباقة',
    category: 'PACKAGES',
    roles: {
      OWNER: true,
      MANAGER: true,
      RECEPTIONIST: false,
      PHYSIOTHERAPIST: false,
      NUTRITIONIST: false,
    },
    condition: 'AUDITED',
    conditionDetails: 'Adds 1–365 days to package; requires reason; audited',
    ruleIds: ['R-1.1-10', 'R-7-6'],
  },
  {
    id: 16,
    actionKey: 'package.cancel',
    labelEn: 'Cancel package with refund decision',
    labelAr: 'إلغاء الباقة مع اتخاذ قرار الاسترداد المالي',
    category: 'PACKAGES',
    roles: {
      OWNER: true,
      MANAGER: true,
      RECEPTIONIST: false,
      PHYSIOTHERAPIST: false,
      NUTRITIONIST: false,
    },
    condition: 'AUDITED',
    conditionDetails: 'Adjusts owed amount to completed sessions; refund remaining paid only (no balance credit in v1)',
    ruleIds: ['R-7-4', 'R-7-7', 'R-8.1-3'],
  },

  // 5. Billing, Payments & Drawer
  {
    id: 17,
    actionKey: 'billing.payment.record',
    labelEn: 'Record payment',
    labelAr: 'تسجيل دفعة سداد',
    category: 'BILLING_DRAWER',
    roles: {
      OWNER: true,
      MANAGER: true,
      RECEPTIONIST: true,
      PHYSIOTHERAPIST: false,
      NUTRITIONIST: false,
    },
    condition: 'NONE',
    conditionDetails: 'Must be linked to a charge; amount must be > 0 and <= remaining balance',
    ruleIds: ['R-1.1-11', 'R-8.1-2', 'R-8.2-1'],
  },
  {
    id: 18,
    actionKey: 'billing.price.change_before_payment',
    labelEn: 'Change price before payment',
    labelAr: 'تعديل السعر قبل السداد',
    category: 'BILLING_DRAWER',
    roles: {
      OWNER: true,
      MANAGER: true,
      RECEPTIONIST: true,
      PHYSIOTHERAPIST: false,
      NUTRITIONIST: false,
    },
    condition: 'AUDITED',
    conditionDetails: 'Receptionist can adjust price before payment; reason required; audited',
    ruleIds: ['R-1.1-13', 'R-5.1-2', 'R-8.3-4'],
  },
  {
    id: 19,
    actionKey: 'billing.price.change_after_payment',
    labelEn: 'Change price after payment exists',
    labelAr: 'تعديل السعر بعد وجود سدادات مسجلة',
    category: 'BILLING_DRAWER',
    roles: {
      OWNER: true,
      MANAGER: true,
      RECEPTIONIST: false,
      PHYSIOTHERAPIST: false,
      NUTRITIONIST: false,
    },
    condition: 'AUDITED',
    conditionDetails: 'Owner/Manager only; cannot reduce below amount already paid; audited',
    ruleIds: ['R-1.1-14', 'R-8.3-4'],
  },
  {
    id: 20,
    actionKey: 'billing.receipt.void',
    labelEn: 'Void payment receipt',
    labelAr: 'إلغاء إيصال سداد خاطئ',
    category: 'BILLING_DRAWER',
    roles: {
      OWNER: true,
      MANAGER: true,
      RECEPTIONIST: false,
      PHYSIOTHERAPIST: false,
      NUTRITIONIST: false,
    },
    condition: 'AUDITED',
    conditionDetails: 'Owner/Manager only; reason required; receipt kept struck through; reverses balance effect',
    ruleIds: ['R-1.1-12', 'R-8.3-1'],
  },
  {
    id: 21,
    actionKey: 'billing.receipt.refund',
    labelEn: 'Issue refund to patient',
    labelAr: 'صرف استرداد مالي للمريض',
    category: 'BILLING_DRAWER',
    roles: {
      OWNER: true,
      MANAGER: true,
      RECEPTIONIST: false,
      PHYSIOTHERAPIST: false,
      NUTRITIONIST: false,
    },
    condition: 'AUDITED',
    conditionDetails: 'Owner/Manager only; max bounded by paid minus used sessions; cash refund counts against cashier drawer',
    ruleIds: ['R-1.1-12', 'R-8.3-2', 'R-8.3-3'],
  },
  {
    id: 22,
    actionKey: 'billing.balance.write_off',
    labelEn: 'Write off patient balance / bad debt',
    labelAr: 'إسقاط مديونية مريض / إعفاء مالي',
    category: 'BILLING_DRAWER',
    roles: {
      OWNER: true,
      MANAGER: true,
      RECEPTIONIST: false,
      PHYSIOTHERAPIST: false,
      NUTRITIONIST: false,
    },
    condition: 'AUDITED',
    conditionDetails: 'Owner/Manager only; clears unpaid balance with reason; audited',
    ruleIds: ['R-1.1-10', 'R-7-5'],
  },
  {
    id: 23,
    actionKey: 'billing.cash_shift.close_own',
    labelEn: 'Close own cash shift',
    labelAr: 'تقفيل الوردية النقدية للمستخدم',
    category: 'BILLING_DRAWER',
    roles: {
      OWNER: true,
      MANAGER: true,
      RECEPTIONIST: true,
      PHYSIOTHERAPIST: false,
      NUTRITIONIST: false,
    },
    condition: 'NONE',
    conditionDetails: 'Cashier counts physical cash; system computes expected drawer balance and records variance',
    ruleIds: ['R-1.1-18', 'R-8.4-1'],
  },
  {
    id: 24,
    actionKey: 'billing.cash_shift.close_other_user',
    labelEn: "Close another user's open cash shift",
    labelAr: 'تقفيل وردية مستخدم آخر لحالات الطوارئ',
    category: 'BILLING_DRAWER',
    roles: {
      OWNER: true,
      MANAGER: true,
      RECEPTIONIST: false,
      PHYSIOTHERAPIST: false,
      NUTRITIONIST: false,
    },
    condition: 'AUDITED',
    conditionDetails: "Owner/Manager emergency drawer close with mandatory audit note",
    ruleIds: ['R-1.1-18', 'R-8.4-1'],
  },
  {
    id: 25,
    actionKey: 'billing.cash_shift.view_all_closings',
    labelEn: 'View all cash shift closings & variances',
    labelAr: 'الاطلاع على جميع تقفيلات الورديات وفروق العهدة',
    category: 'BILLING_DRAWER',
    roles: {
      OWNER: true,
      MANAGER: true,
      RECEPTIONIST: false,
      PHYSIOTHERAPIST: false,
      NUTRITIONIST: false,
    },
    condition: 'NONE',
    conditionDetails: 'Full cash drawer oversight across all front-desk staff',
    ruleIds: ['R-8.4-4'],
  },

  // 6. Expenses & Commissions
  {
    id: 26,
    actionKey: 'expense.add',
    labelEn: 'Add operational expense',
    labelAr: 'تسجيل مصروف تشغيلي',
    category: 'EXPENSES_COMMISSIONS',
    roles: {
      OWNER: true,
      MANAGER: true,
      RECEPTIONIST: true,
      PHYSIOTHERAPIST: false,
      NUTRITIONIST: false,
    },
    condition: 'SAME_DAY_ONLY',
    conditionDetails: 'Receptionist can record expenses for current operating day only',
    ruleIds: ['R-1.1-15', 'R-10-1'],
  },
  {
    id: 27,
    actionKey: 'expense.edit_void',
    labelEn: 'Edit / void recorded expense',
    labelAr: 'تعديل أو إلغاء مصروف مسجل',
    category: 'EXPENSES_COMMISSIONS',
    roles: {
      OWNER: true,
      MANAGER: true,
      RECEPTIONIST: true,
      PHYSIOTHERAPIST: false,
      NUTRITIONIST: false,
    },
    condition: 'OWN_SAME_DAY_UNCLOSED_SHIFT_ONLY',
    conditionDetails: 'Receptionist can only edit/void own expenses during unclosed shift; closed shifts are locked',
    ruleIds: ['R-1.1-16', 'R-8.4-3', 'R-10-2', 'R-10-3'],
  },
  {
    id: 28,
    actionKey: 'commission.view_own',
    labelEn: 'View own commission summary',
    labelAr: 'الاطلاع على ملخص العمولة المستحقة للمعالج نفسه',
    category: 'EXPENSES_COMMISSIONS',
    roles: {
      OWNER: true,
      MANAGER: false,
      RECEPTIONIST: false,
      PHYSIOTHERAPIST: true,
      NUTRITIONIST: true,
    },
    condition: 'OWN_COMMISSION_ONLY',
    conditionDetails: 'Clinicians see their own completed sessions and earned totals; cannot see others',
    ruleIds: ['R-1.1-17', 'R-3-5', 'R-11-3'],
  },
  {
    id: 29,
    actionKey: 'commission.view_all_reports',
    labelEn: 'View all staff commission reports',
    labelAr: 'الاطلاع على تقارير عمولات جميع الأطباء بالمركز',
    category: 'EXPENSES_COMMISSIONS',
    roles: {
      OWNER: true,
      MANAGER: true,
      RECEPTIONIST: false,
      PHYSIOTHERAPIST: false,
      NUTRITIONIST: false,
    },
    condition: 'NONE',
    conditionDetails: 'Full clinic commission breakdown by doctor, session count, and payout status',
    ruleIds: ['R-1.1-17', 'R-11-3'],
  },
  {
    id: 30,
    actionKey: 'commission.payout_record',
    labelEn: 'Confirm commission payout',
    labelAr: 'اعتماد صرف عمولات المعالجين وتسجيلها كمصروف',
    category: 'EXPENSES_COMMISSIONS',
    roles: {
      OWNER: true,
      MANAGER: true,
      RECEPTIONIST: false,
      PHYSIOTHERAPIST: false,
      NUTRITIONIST: false,
    },
    condition: 'AUDITED',
    conditionDetails: 'Marks completed sessions as paid and creates corresponding expense entry',
    ruleIds: ['R-11-2'],
  },

  // 7. Reports, Analytics & Audit Log
  {
    id: 31,
    actionKey: 'reports.view_financial_operational',
    labelEn: 'View financial & operational reports',
    labelAr: 'عرض التقارير المالية والتشغيلية الشاملة',
    category: 'REPORTS_AUDIT',
    roles: {
      OWNER: true,
      MANAGER: true,
      RECEPTIONIST: false,
      PHYSIOTHERAPIST: false,
      NUTRITIONIST: false,
    },
    condition: 'NONE',
    conditionDetails: 'Access to daily income, doctor productivity, packages, attendance, debtors, net profit reports',
    ruleIds: ['R-1.1-17', 'R-12-1', 'R-12-2', 'R-12-3', 'R-12-4', 'R-12-5', 'R-12-6', 'R-12-7'],
  },
  {
    id: 32,
    actionKey: 'reports.export_csv',
    labelEn: 'Export reports to CSV',
    labelAr: 'تصدير التقارير إلى ملفات إكسيل CSV',
    category: 'REPORTS_AUDIT',
    roles: {
      OWNER: true,
      MANAGER: true,
      RECEPTIONIST: false,
      PHYSIOTHERAPIST: false,
      NUTRITIONIST: false,
    },
    condition: 'AUDITED',
    conditionDetails: 'Audited export action; strictly excludes patient medical diagnoses',
    ruleIds: ['R-1.1-20', 'R-12-8'],
  },
  {
    id: 33,
    actionKey: 'audit.view_filter',
    labelEn: 'View and filter audit log',
    labelAr: 'استعراض والبحث في سجل الرقابة والعمليات',
    category: 'REPORTS_AUDIT',
    roles: {
      OWNER: true,
      MANAGER: true,
      RECEPTIONIST: false,
      PHYSIOTHERAPIST: false,
      NUTRITIONIST: false,
    },
    condition: 'CLINICAL_AUDIT_MASKED',
    conditionDetails: 'Manager view masks clinical notes/diagnoses to preserve patient privacy',
    ruleIds: ['R-1.1-2', 'R-1.1-20', 'R-13-3'],
  },
  {
    id: 34,
    actionKey: 'audit.view_covering_access_log',
    labelEn: 'View covering-access audit log',
    labelAr: 'الاطلاع على سجل صلاحيات التغطية المؤقتة للأطباء',
    category: 'REPORTS_AUDIT',
    roles: {
      OWNER: true,
      MANAGER: false,
      RECEPTIONIST: false,
      PHYSIOTHERAPIST: false,
      NUTRITIONIST: false,
    },
    condition: 'AUDITED',
    conditionDetails: 'Owner only: audit trail of temporary patient access grants',
    ruleIds: ['R-1.1-21', 'R-13-1'],
  },

  // 8. Staff & Clinic Administration
  {
    id: 35,
    actionKey: 'admin.staff.manage_accounts',
    labelEn: 'Manage staff accounts & roles',
    labelAr: 'إدارة حسابات الموظفين وتعيين الأدوار',
    category: 'ADMINISTRATION',
    roles: {
      OWNER: true,
      MANAGER: false,
      RECEPTIONIST: false,
      PHYSIOTHERAPIST: false,
      NUTRITIONIST: false,
    },
    condition: 'NONE',
    conditionDetails: 'Owner only: create user, assign role, deactivate account',
    ruleIds: ['R-1.1-19', 'R-3-1', 'R-3-3'],
  },
  {
    id: 36,
    actionKey: 'admin.staff.manage_schedules',
    labelEn: 'Manage staff schedules, leave, rooms & beds',
    labelAr: 'إدارة مواعيد العمل والإجازات وتخصيص الغرف والأسرة',
    category: 'ADMINISTRATION',
    roles: {
      OWNER: true,
      MANAGER: true,
      RECEPTIONIST: false,
      PHYSIOTHERAPIST: false,
      NUTRITIONIST: false,
    },
    condition: 'SCHEDULES_LEAVE_ROOMS_BEDS',
    conditionDetails: 'Set working hours, leave, rooms, and beds; Manager cannot alter user credentials or roles',
    ruleIds: ['R-1.1-19', 'R-3-2'],
  },
  {
    id: 37,
    actionKey: 'admin.settings.manage_clinic',
    labelEn: 'Manage clinic settings & catalog',
    labelAr: 'إدارة إعدادات المركز والخدمات والباقات',
    category: 'ADMINISTRATION',
    roles: {
      OWNER: true,
      MANAGER: false,
      RECEPTIONIST: false,
      PHYSIOTHERAPIST: false,
      NUTRITIONIST: false,
    },
    condition: 'NONE',
    conditionDetails: 'Configure clinic profile, opening hours, services, packages, lock window; rooms and beds managed by Owner and Manager (row #36)',
    ruleIds: ['R-1.1-19', 'R-2-1', 'R-2-2', 'R-2-3', 'R-2-4', 'R-2-5', 'R-2-6', 'R-2-8'],
  },

  // 9. Communication & Messaging
  {
    id: 38,
    actionKey: 'communication.whatsapp.send_reminder',
    labelEn: 'Send WhatsApp message & mark reminder sent',
    labelAr: 'إرسال رسائل واتساب والتأشير على إرسال التنبيه',
    category: 'COMMUNICATION',
    roles: {
      OWNER: true,
      MANAGER: true,
      RECEPTIONIST: true,
      PHYSIOTHERAPIST: false,
      NUTRITIONIST: false,
    },
    condition: 'NONE',
    conditionDetails: 'Opens pre-filled wa.me link; marks reminder sent timestamp; respects whatsappConsent',
    ruleIds: ['R-4.1-21', 'R-6-2', 'R-6-3', 'R-6-4'],
  },
  {
    id: 39,
    actionKey: 'admin.settings.whatsapp_templates',
    labelEn: 'Edit WhatsApp message templates',
    labelAr: 'تعديل قوالب رسائل وتنبيهات واتساب',
    category: 'COMMUNICATION',
    roles: {
      OWNER: true,
      MANAGER: false,
      RECEPTIONIST: false,
      PHYSIOTHERAPIST: false,
      NUTRITIONIST: false,
    },
    condition: 'NONE',
    conditionDetails: 'Owner only: configures clinic reminder and notification templates',
    ruleIds: ['R-2-7'],
  },

  // 10. Authentication & Security Administration
  {
    id: 40,
    actionKey: 'auth.password.reset_staff',
    labelEn: 'Reset staff password',
    labelAr: 'إعادة تعيين كلمة المرور للموظف',
    category: 'AUTH_SECURITY',
    roles: {
      OWNER: true,
      MANAGER: false,
      RECEPTIONIST: false,
      PHYSIOTHERAPIST: false,
      NUTRITIONIST: false,
    },
    condition: 'AUDITED',
    conditionDetails: 'Owner only: generates one-time link or temporary password requiring change on login',
    ruleIds: ['R-3-4'],
  },
  {
    id: 41,
    actionKey: 'auth.otp.reset_staff',
    labelEn: 'Reset staff TOTP 2FA secret',
    labelAr: 'إعادة تعيين المصادقة الثنائية لموظف متعثر',
    category: 'AUTH_SECURITY',
    roles: {
      OWNER: true,
      MANAGER: false,
      RECEPTIONIST: false,
      PHYSIOTHERAPIST: false,
      NUTRITIONIST: false,
    },
    condition: 'AUDITED',
    conditionDetails: 'Owner only: resets two-factor authenticator enrollment for locked-out staff; audited',
    ruleIds: ['R-15.2-6'],
  },
  {
    id: 42,
    actionKey: 'auth.devices.revoke',
    labelEn: 'Revoke trusted devices & active sessions',
    labelAr: 'إلغاء الأجهزة الموثوقة والجلسات النشطة للموظف',
    category: 'AUTH_SECURITY',
    roles: {
      OWNER: true,
      MANAGER: false,
      RECEPTIONIST: false,
      PHYSIOTHERAPIST: false,
      NUTRITIONIST: false,
    },
    condition: 'AUDITED',
    conditionDetails: 'Owner only: revokes 30-day device tokens and forces re-authentication on all client machines',
    ruleIds: ['R-15.2-4', 'R-15.2-5'],
  },
  {
    id: 43,
    actionKey: 'auth.profile.change_password',
    labelEn: 'Change own account password',
    labelAr: 'تغيير كلمة المرور الخاصة بالمستخدم الحالي',
    category: 'AUTH_SECURITY',
    roles: {
      OWNER: true,
      MANAGER: true,
      RECEPTIONIST: true,
      PHYSIOTHERAPIST: true,
      NUTRITIONIST: true,
    },
    condition: 'NONE',
    conditionDetails: 'Any active user can change their own password by providing current password',
    ruleIds: ['R-15.1-1'],
  },
] as const;

/**
 * Type-safe lookup mapping by actionKey
 */
export const PERMISSIONS_BY_KEY: Readonly<Record<string, PermissionDefinition>> =
  Object.freeze(
    PERMISSIONS_MATRIX.reduce(
      (acc, perm) => {
        acc[perm.actionKey] = perm;
        return acc;
      },
      {} as Record<string, PermissionDefinition>
    )
  );

/**
 * Fast role check helper (pure data lookup)
 */
export function isRolePermitted(role: ClinicRole, actionKey: string): boolean {
  const perm = PERMISSIONS_BY_KEY[actionKey];
  if (!perm) return false;
  return Boolean(perm.roles[role]);
}
