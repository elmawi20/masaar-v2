# Masaar Clinic System — Glossary & Naming Conventions

This document establishes the official bilingual business vocabulary, code naming conventions, database schema standards, and system-wide architectural rules for the Masaar Clinic System.

- **Spec Reference:** [docs/FEATURES-v2.2.md](file:///F:/Claude%20CRM/docs/FEATURES-v2.2.md)
- **Rules Catalog Reference:** [docs/design/rules-index.md](file:///F:/Claude%20CRM/docs/design/rules-index.md)
- **Decision References:** [DEC-002](file:///F:/Claude%20CRM/docs/design/decisions.md) (Money in piasters), [DEC-003](file:///F:/Claude%20CRM/docs/design/decisions.md) (No hard deletes), [DEC-004](file:///F:/Claude%20CRM/docs/design/decisions.md) (UTC/Cairo time), [DEC-014](file:///F:/Claude%20CRM/docs/design/decisions.md) (Guardian phones), [DEC-025](file:///F:/Claude%20CRM/docs/design/decisions.md) (Permanent rule IDs).

---

## 1. System Naming Conventions & Architectural Standards

### 1.1 File & Directory Structure
- **Directories:** Use lowercase `kebab-case` (e.g. `src/domain/`, `src/actions/`, `src/components/`, `docs/design/`).
- **TypeScript Code Files:** Use lowercase `kebab-case` (e.g. `define-action.ts`, `patient-repository.ts`, `audit-logger.ts`, `auth-options.ts`).
- **React Components:** Use lowercase `kebab-case` for file names (e.g. `appointment-card.tsx`, `patient-header.tsx`, `cash-closing-modal.tsx`). Component identifiers inside code use `PascalCase` (`AppointmentCard`).
- **Documentation:** Use UPPERCASE for root/policy files (`AGENTS.md`, `README.md`) and lowercase `kebab-case` for design deliverables (`rules-index.md`, `glossary.md`, `permissions.md`).

### 1.2 Database Schema Conventions (PostgreSQL & Prisma)
- **Table Names:** Plural, lowercase `snake_case` (e.g. `users`, `patients`, `appointments`, `packages`, `charges`, `payments`, `cash_shifts`, `audit_logs`).
- **Column Names:** Lowercase `snake_case` (e.g. `full_name`, `mobile_phone`, `guardian_name`).
- **Foreign Keys:** Singular table name with suffix `_id` (e.g. `patient_id`, `clinician_id`, `created_by_user_id`, `package_id`).
- **Timestamps:**
  - Stored strictly in **UTC** as `timestamptz`.
  - Always suffixed with `_at` (e.g. `created_at`, `updated_at`, `starts_at`, `ends_at`, `completed_at`, `locked_at`, `revoked_at`).
  - Clinic operational dates (without time) use `DATE` type with suffix `_date` (e.g. `appointment_date`, `birth_date`, `expiry_date`).
- **Currency & Money:**
  - Stored strictly as **integer piasters** (`BIGINT` or `INTEGER`, where 100 piasters = 1.00 EGP).
  - Column names must explicitly include the suffix `_piasters` (e.g. `amount_piasters`, `price_piasters`, `total_price_piasters`, `per_session_piasters`, `expected_cash_piasters`, `counted_cash_piasters`).
  - Floating point numbers are strictly forbidden for currency.
- **Boolean Flags:**
  - Prefix with `is_` or `has_` (e.g. `is_active`, `is_dependent`, `has_metal_implants`, `whatsapp_consent`, `data_consent`).
- **Soft Deletion / Status Fields:**
  - Business records are never hard-deleted ([DEC-003](file:///F:/Claude%20CRM/docs/design/decisions.md)). Use status enums (e.g. `status = 'VOIDED'`) or deactivation flags (`is_active = false`, `deactivated_at`).

### 1.3 TypeScript Types, Interfaces & Enums
- **Interfaces & Type Aliases:** Use `PascalCase` (e.g. `PatientRecord`, `AppointmentBookingInput`, `CashClosingResult`).
- **Enums & Union Types:** Use `PascalCase` for enum type names, and string literals or `SCREAMING_SNAKE_CASE` for values:
  - Role: `'OWNER' | 'MANAGER' | 'RECEPTIONIST' | 'PHYSIOTHERAPIST' | 'NUTRITIONIST'`
  - Appointment Status: `'SCHEDULED' | 'CONFIRMED' | 'ARRIVED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED' | 'NO_SHOW' | 'RESCHEDULED'`
  - Package Status: `'ACTIVE' | 'COMPLETED' | 'EXPIRED' | 'CANCELLED' | 'REFUNDED'`
- **Functions & Methods:** Use `camelCase` (e.g. `calculatePatientBalance`, `verifyTotpCode`, `recordPayment`).
- **Constants:** Use `SCREAMING_SNAKE_CASE` (e.g. `SESSION_NOTE_LOCK_HOURS_DEFAULT`, `MAX_LOGIN_ATTEMPTS`).

### 1.4 Server Actions & API Routes
- **Server Action Functions:** Placed in `src/actions/`, suffixed with `Action` in `camelCase` (e.g. `createAppointmentAction`, `closeCashShiftAction`, `voidReceiptAction`).
- **Action Pipeline:** Every write action must pass through the mandatory pipeline: `auth` → `activeUser` → `permissionCheck` → `zodValidation` → `transaction` → `auditLog` ([R-0-2](file:///F:/Claude%20CRM/docs/FEATURES-v2.2.md)).
- **URL Routes:** App router paths use lowercase `kebab-case` (e.g. `/patients/[fileNumber]/clinical`, `/daily-closing`, `/calendar/day`).

### 1.5 Translation Keys (`next-intl`)
- **Default Locale:** Arabic (`ar-EG`, RTL). Alternate: English (`en-US`, LTR).
- **Structure:** Hierarchical dot-separated strings formatted as `domain.entity.element`:
  - `billing.receipt.thermalHeader`
  - `appointments.status.arrived`
  - `patient.validation.mobileEgyptian`
  - `auth.lockout.message`

---

## 2. Master Business Terms Dictionary

| English Term | Arabic Label (المصطلح الطبي / الإداري) | Code Name (camelCase) | Database Name (snake_case) | Definition & Business Meaning | Domain / Module |
|---|---|---|---|---|---|
| **Ground Rules** | القواعد العامة للنظام | `groundRules` | `ground_rules` | Core architectural rules enforced unconditionally on server and database level | Ground Rules |
| **Integer Piasters** | قروش صحيحة | `piasters` | `amount_piasters` | Integer representation of money where 100 piasters = 1.00 EGP to prevent floating-point errors (DEC-002, R-0-4) | Ground Rules |
| **Calculated Value** | قيمة محتسبة ديناميكياً | `calculatedValue` | *(not stored in DB)* | Dynamic metric (e.g. balance, remaining sessions) never persisted to database tables (DEC-005, R-0-6) | Ground Rules |
| **Bilingual Support** | دعم ثنائي اللغة | `bilingualLocale` | `locale` | Arabic (RTL, default) and English (LTR) language support with Cairo timezone (R-0-5, R-0-7) | Ground Rules |
| **Zero Hard Delete** | منع الحذف النهائي | `softDelete` | `is_active` / `status` | Business rule ensuring clinical, financial, and patient records remain archived forever (DEC-003, R-0-3) | Ground Rules |
| **Owner** | المالك / الاستشاري الرئيسي | `owner` | `'OWNER'` | Highest role: full medical, administrative, financial, staff, and security authority | Roles & Permissions |
| **Manager** | مدير التشغيل والماليات | `manager` | `'MANAGER'` | Operations and financial partner role: reports, expenses, closings, voids, refunds; no medical access | Roles & Permissions |
| **Receptionist** | موظف الاستقبال | `receptionist` | `'RECEPTIONIST'` | Front desk role: registration, scheduling, check-in, payment collection, shift closing; no medical data | Roles & Permissions |
| **Physiotherapist** | أخصائي علاج طبيعي | `physiotherapist` | `'PHYSIOTHERAPIST'` | Clinician role: own schedule, own patient medical records, SOAP notes, and session completion | Roles & Permissions |
| **Nutritionist** | أخصائي تغذية علاجية | `nutritionist` | `'NUTRITIONIST'` | Clinician role: nutrition consultations, InBody assessments, dietary protocols, and progress charts | Roles & Permissions |
| **Covering Access** | صلاحية تغطية مؤقتة | `coveringAccess` | `covering_access_logs` | Temporary 12-hour session-bound access granted to a substitute clinician to treat another doctor's patient (DEC-013, R-9.1-1) | Roles & Permissions |
| **Permission Check** | فحص الصلاحية | `permissionCheck` | *(server check)* | Mandatory role and context verification executed before any server action or page access | Roles & Permissions |
| **Clinic Settings** | إعدادات المركز | `clinicSettings` | `clinic_settings` | Configuration singleton: clinic branding, working hours, services, packages, booths, and lock windows | Clinic Settings |
| **Service Catalog** | دليل الخدمات والأسعار | `serviceCatalog` | `services` | Master list of clinic billable services, default durations in minutes, and prices in piasters | Clinic Settings |
| **Package Template** | نموذج باقة معتمد | `packageTemplate` | `package_templates` | Predefined package offer: name, specialty, session count, validity days, and price in piasters | Clinic Settings |
| **Room / Booth** | غرفة كشف / كابينة | `room` | `rooms` | Physical consultation room or treatment cubicle in the clinic | Clinic Settings |
| **Bed** | سرير علاج | `bed` | `beds` | Specific physical treatment bed inside a booth, constrained by PostgreSQL exclusion against double-booking (DEC-006, R-5.2-4) | Clinic Settings |
| **Expense Category** | بند مصروفات | `expenseCategory` | `expense_categories` | Classification category for operational clinic outlays (e.g. Rent, Supplies, Salaries, Doctor Commission) | Clinic Settings |
| **WhatsApp Template** | قالب رسائل واتساب | `whatsappTemplate` | `whatsapp_templates` | Standardized Arabic notification text with dynamic placeholders (patient name, date, balance) | Clinic Settings |
| **Note Lock Window** | مهلة تعديل التقرير الطبي | `lockWindowHours` | `lock_window_hours` | Configurable duration (default 24 hours from saving) during which the author can edit a clinical note (DEC-016, R-2-8, R-9.2-1) | Clinic Settings |
| **Staff Member** | موظف / معالج | `staffUser` | `users` | User account representing a doctor, receptionist, manager, or owner in the clinic | Staff Management |
| **Working Shift** | وردية العمل المجدولة | `workingShift` | `user_shifts` | Weekly schedule specifying the days and time intervals a clinician or staff member is available | Staff Management |
| **Commission Rate** | نسبة / قيمة العمولة | `commissionRate` | `commission_rate` | Clinician compensation structure: fixed piasters per session or percentage of session value (R-3-1, R-11-1) | Staff Management |
| **Active Staff** | موظف نشط | `isActiveStaff` | `is_active = true` | Staff status allowing system login, calendar appearance, and appointment booking | Staff Management |
| **Deactivated Staff** | موظف معطل | `isDeactivatedStaff` | `is_active = false` | Deactivated account: immediately revokes active sessions and hides from booking while preserving past logs (R-3-3, R-15.1-5) | Staff Management |
| **Patient** | مريض | `patient` | `patients` | Central demographic and clinical record for an individual receiving clinic care | Patients |
| **Patient File Number** | رقم الملف الطبي | `fileNumber` | `file_number` | Permanent sequential read-only identifier (e.g. `M-0001`) assigned automatically upon registration (R-4.1-1) | Patients |
| **Adult Patient** | مريض بالغ | `isAdult` | *(age >= 18)* | Patient aged 18 or older requiring their own strictly unique Egyptian mobile number (DEC-014, R-4.1-3) | Patients |
| **Dependent** | مريض تابع (طفل / مسن) | `isDependent` | `is_dependent` | Minor or elderly patient linked to a responsible guardian's mobile phone (DEC-014, R-4.1-4) | Patients |
| **Guardian** | ولي الأمر / المرافق | `guardian` | `guardian_name`, `guardian_phone` | Legal guardian responsible for a dependent; phone number may repeat across multiple dependents (DEC-014, R-4.1-4) | Patients |
| **Egyptian Mobile Phone** | رقم هاتف مصري | `mobilePhone` | `mobile_phone` | 11-digit mobile string validated against Egyptian regex `^01[0125][0-9]{8}$` (R-4.1-3) | Patients |
| **National ID** | الرقم القومي | `nationalId` | `national_id` | Optional 14-digit Egyptian national identification number (R-4.1-7) | Patients |
| **Medical Alerts Banner** | شريط التحذيرات الطبية | `activeAlerts` | `active_alerts` | Prominent red banner on patient header displaying critical precautions (e.g. Pacemaker, Pregnancy, Knee implant) (R-4.1-15) | Patients |
| **Medical History Tag** | تصنيف السجل المرضي | `medicalTag` | `medical_history_tags` | Standardized clinical contraindication flags (Hypertension, Diabetes, Cardiac, Implants, Osteoporosis) (R-4.1-13) | Patients |
| **Patient Status** | حالة ملف المريض | `patientStatus` | `status` | State of patient file: `ACTIVE` or `ARCHIVED` (hides from search dropdowns while keeping history) (R-4.1-18) | Patients |
| **Patient Merge** | دمج ملفي مريض | `mergePatients` | `patient_merges` | Owner/Manager administrative action merging duplicated records into a primary file number with audit logging (R-4.1-19) | Patients |
| **Patient Document** | مرفق فحص / تقرير | `patientDocument` | `patient_documents` | File attachment (PDF, JPG, PNG up to 10MB) stored on filesystem outside web root and served via auth API (R-4.2-1, R-4.2-5) | Patients |
| **Document Category** | نوع المرفق | `docCategory` | `category` | Classification tag: X-Ray, MRI, Lab Results, Medical Referral, InBody Printout, Other (R-4.2-2) | Patients |
| **Reception Notes** | ملاحظات الاستقبال | `receptionNotes` | `reception_notes` | Non-clinical notes visible to front desk staff (e.g. "needs wheelchair", "prefers late afternoon") (R-4.3-1) | Patients |
| **Appointment** | موعد حجز | `appointment` | `appointments` | Scheduled consultation or treatment time slot linking a patient, clinician, room, bed, and service | Scheduling |
| **Day Calendar View** | عرض اليوم بالجدول | `dayCalendarView` | *(UI view)* | Primary scheduling grid: clinician columns vs 15-minute time intervals (R-5.1-1) | Scheduling |
| **Clinician Overlap** | تداخل مواعيد المعالج | `clinicianOverlap` | *(DB exclusion)* | Collision check rejecting bookings where new time intersects with existing active clinician appointments (R-5.2-3) | Scheduling |
| **Bed Overlap** | تداخل حجز السرير | `bedOverlap` | *(btree_gist)* | PostgreSQL database exclusion constraint preventing two appointments from occupying the same bed simultaneously (DEC-006, R-5.2-4) | Scheduling |
| **Patient Overlap** | تداخل مواعيد المريض | `patientOverlap` | *(DB check)* | Validation rejecting simultaneous overlapping bookings for the same patient across different beds or services (R-5.2-5) | Scheduling |
| **Daily Soft Limit** | الحد اليومي الاسترشادي للجلسات | `dailySoftLimit` | `daily_soft_limit` | Configurable advisory maximum of daily sessions per clinician; triggers a warning dialog but does not block booking (R-5.2-11) | Scheduling |
| **Waitlist** | قائمة الانتظار | `waitlist` | `waitlist_entries` | Queue holding patients seeking booked slots; holds package session allocation while freeing bed/clinician calendars (DEC-008, R-5.3-1) | Scheduling |
| **Walk-in** | حضور مباشر بدون موعد | `walkIn` | `is_walk_in = true` | Unscheduled patient arriving at front desk and routed to immediate available doctor or walk-in queue (R-5.4-1) | Scheduling |
| **Walk-in Queue** | طابور الانتظار الفوري | `walkInQueue` | `walk_in_queue` | Ordered lobby arrival list with estimated wait time and drag-and-drop reordering capability (R-5.4-2, R-5.4-3) | Scheduling |
| **Scheduled Status** | موعد محجوز | `scheduled` | `'SCHEDULED'` | Initial appointment state confirming clinician, bed, and time allocation (R-5.5-1) | Scheduling |
| **Confirmed Status** | موعد مؤكد | `confirmed` | `'CONFIRMED'` | Appointment state after patient confirms attendance via phone or WhatsApp (R-5.5-2) | Scheduling |
| **Arrived / Checked In** | وصل / تم تسجيل الحضور | `arrived` | `'ARRIVED'` | Status set upon physical arrival at front desk; alerts treating clinician and checks balance (R-5.5-3, R-6-2) | Scheduling |
| **In Progress / In Consultation** | داخل الجلسة / الكشف | `inProgress` | `'IN_PROGRESS'` | Active clinical status when doctor calls patient into treatment room (R-5.5-4) | Scheduling |
| **Completed Status** | جلسة مكتملة | `completed` | `'COMPLETED'` | Final clinical status after clinician submits session form; consumes package session and triggers commission (R-5.5-5, R-9.1-7) | Scheduling |
| **Cancelled Status** | موعد ملغي | `cancelled` | `'CANCELLED'` | Cancelled booking with mandatory reason; restores package session and frees bed reservation (R-5.5-6, R-5.2-11) | Scheduling |
| **No-Show Status** | تخلف عن الحضور | `noShow` | `'NO_SHOW'` | Status marked after start time + 30 minutes of unexcused absence; package deduction governed by clinic policy (R-5.5-7, R-5.5-12) | Scheduling |
| **Rescheduled Status** | موعد معاد جدولته | `rescheduled` | `'RESCHEDULED'` | Previous booking slot superseded by a new time; auditable with prior and new timestamps (R-5.5-8, R-5.2-10) | Scheduling |
| **Late Arrival** | تأخر عن الموعد | `lateArrival` | `late_minutes` | Dual-phase notification: dashboard alert if >10m overdue; stores `lateMinutes` and alerts clinician upon check-in (DEC-018, R-14-2) | Scheduling |
| **Bed Reservation Persistence** | استمرار حجز السرير للمدة المحددة | `bedPersistence` | *(calendar logic)* | Policy keeping bed booked for entire scheduled slot even if clinical treatment concludes early (DEC-021, R-5.2-10) | Scheduling |
| **Fast Check-in** | تسجيل وصول سريع | `fastCheckIn` | *(action)* | One-click reception dashboard action to mark patient arrived and alert clinician (R-6-2) | Front Desk |
| **Package** | باقة جلسات | `package` | `packages` | Multi-session prepaid bundle for Physiotherapy or Nutrition with defined session count and validity (DEC-009, R-7-1) | Packages |
| **Total Sessions** | إجمالي جلسات الباقة | `totalSessions` | `total_sessions` | Total treatment count granted by package purchase (e.g. 12 sessions) | Packages |
| **Used Sessions** | الجلسات المنفذة | `usedSessions` | *(calculated)* | Count of completed sessions credited against the package | Packages |
| **Booked Sessions** | الجلسات المحجوزة مستقبلاً | `bookedSessions` | *(calculated)* | Count of future appointments currently holding a package session in scheduled, arrived, or waitlisted state | Packages |
| **Remaining Sessions** | الجلسات المتبقية بالرصيد | `remainingSessions` | *(calculated)* | Total package sessions minus completed sessions (`total - completed`) | Packages |
| **Available Sessions** | الجلسات المتاحة للحجز الجديد | `availableSessions` | *(calculated)* | Dynamic slots available to book: `total - completed - future_booked` (DEC-008, R-5.2-7) | Packages |
| **Forfeited Sessions** | جلسات مهدرة لانتهاء الصلاحية | `forfeitedSessions` | *(calculated)* | Remaining unused sessions cancelled automatically upon reaching package expiry date (R-7-4) | Packages |
| **Per-Session Value** | القيمة الدفترية للجلسة | `perSessionPiasters` | *(calculated)* | Pro-rata value: `totalPrice / totalSessions` used for commission and refund calculations (R-7-3) | Packages |
| **Package Expiry** | تاريخ انتهاء صلاحية الباقة | `expiryDate` | `expiry_date` | Cut-off calendar date beyond which unbooked package sessions cannot be used without extension (R-7-4, R-7-5) | Packages |
| **Package Extension** | تمديد صلاحية باقة | `packageExtension` | `package_extensions` | Owner/Manager action adding 1–365 days of validity to an expired or expiring package with audit reason (R-7-6) | Packages |
| **Package Transfer** | تحويل باقة لقريب | `packageTransfer` | `package_transfers` | Owner/Manager action reassigning remaining package sessions to a verified first-degree relative (R-7-8) | Packages |
| **Multi-Specialty Package** | باقة تخصصات مشتركة | `multiSpecialtyPackage`| `package_counters` | Bundle combining separate discipline session counters (e.g. 12 PT + 4 Nutrition) under one patient charge (R-7-6) | Packages |
| **Charge** | استحقاق مالي | `charge` | `charges` | Financial invoice obligation generated for a package purchase or standalone non-package appointment (R-8.1-1) | Billing & Payments |
| **Payment** | دفعة سداد | `payment` | `payments` | Financial credit transaction always linked to a specific charge; records amount, method, and cashier (R-8.1-2, R-8.2-1) | Billing & Payments |
| **Payment Method** | طريقة الدفع | `paymentMethod` | `payment_method` | Transaction channel: Cash, InstaPay, Vodafone Cash, Visa / Debit Card, Fawry, Bank Transfer (R-8.2-1) | Billing & Payments |
| **Split Payment** | دفع مجزأ بوسائل متعددة | `splitPayment` | `payments` *(multiple)*| Settling a single charge with multiple methods (e.g. 200 EGP cash + 300 EGP Visa) (R-8.2-2) | Billing & Payments |
| **Partial Payment** | سداد جزئي | `partialPayment` | `payments` *(partial)* | Paying less than total charge amount, leaving the remainder on patient balance (R-8.2-3) | Billing & Payments |
| **Receipt Number** | رقم إيصال الدفع | `receiptNumber` | `receipt_number` | Annual gapless sequential receipt string formatted as `INV-YYYY-00001` generated by transactional counter (DEC-017, R-8.2-2) | Billing & Payments |
| **Annual Counter Rollover** | تصفير العداد السنوي | `counterRollover` | `receipt_counters` | Automated counter reset to 00001 occurring at 00:00:00 Cairo local time on January 1st (DEC-017, R-8.2-3) | Billing & Payments |
| **Thermal Receipt** | إيصال طابعة حرارية | `thermalReceipt` | *(layout)* | 80mm thermal printer format in Arabic containing clinic header, items, amounts, balance, and cashier name (R-8.2-4) | Billing & Payments |
| **Void Receipt** | إلغاء إيصال خاطئ | `voidReceipt` | `receipt_voids` | Owner/Manager action marking a receipt voided with reason, reversing balance effect without hard deletion (R-8.3-1) | Billing & Payments |
| **Refund** | استرداد مالي للمريض | `refund` | `refunds` | Returning money to patient with separate record; maximum refund bounded by paid amount minus used sessions value (DEC-015, R-8.3-2) | Billing & Payments |
| **Cash Refund Drawer Attribution** | خصم الاسترداد من وردية الصارف | `cashRefundAttribution` | *(cash calculation)* | Policy deducting cash refunds directly from the cash shift closing of the user who physically dispensed money (DEC-015, R-8.3-3) | Billing & Payments |
| **Price Override** | تعديل السعر | `priceChange` | `price_changes` | Modifying charge price; audited with old/new values; Owner/Manager only after payment exists (DEC-012, R-8.3-4) | Billing & Payments |
| **Discount** | خصم مالي | `discount` | `discount_piasters` | Reduction on charge; Receptionist may apply up to 10% with reason; larger discounts require Owner/Manager (R-8.1-2) | Billing & Payments |
| **Patient Balance** | رصيد المريض المتبقي | `patientBalance` | *(calculated)* | Dynamic balance: `max(0, owed - (payments - refunds) - writeOffs)` displayed prominently in red if > 0 (DEC-023, R-8.1-3) | Billing & Payments |
| **Owed Amount** | إجمالي المبلغ المستحق | `owedPiasters` | *(calculated)* | Total billable obligation: package total price, completed sessions value (if cancelled), or visit price (DEC-023, R-8.1-3) | Billing & Payments |
| **Balance Settlement** | سداد رصيد سابق | `balanceSettlement` | `is_settlement = true` | Receipt issued specifically when a debtor patient clears an outstanding historical balance (R-8.4-4) | Billing & Payments |
| **Debt Write-Off** | إسقاط مديونية / إعفاء | `debtWriteOff` | `debt_write_offs` | Owner/Manager action waiving an unpaid patient balance with documented reason (e.g. charity, uncollectible) (R-8.4-3) | Billing & Payments |
| **Cash Shift** | وردية الخزينة النقدية | `cashShift` | `cash_shifts` | Discrete cashier operating session tracking all cash payments, cash refunds, and cash expenses per user (DEC-011, R-8.4-1) | Billing & Payments |
| **Cash Drawer** | درج النقدية | `cashDrawer` | *(physical drawer)* | Physical cash container managed by the logged-in front desk user | Billing & Payments |
| **Daily Cash Close** | تقفيل الوردية النقدية | `closeCashShift` | `cash_shift_closings` | Formal reconciliation process where cashier counts physical cash and system computes expected drawer balance (R-8.4-1) | Billing & Payments |
| **Expected Cash** | الرصيد الدفتري المتوقع | `expectedCashPiasters`| *(calculated)* | Formula: `cash_payments - cash_refunds_handed_out - cash_expenses_recorded` since last closing (DEC-011, R-8.4-1) | Billing & Payments |
| **Counted Cash** | الرصيد الفعلي المعدود | `countedCashPiasters` | `counted_cash_piasters`| Physical amount of cash counted and entered by cashier during shift closing (R-8.4-1) | Billing & Payments |
| **Cash Variance** | عجز / زيادة الخزينة | `cashVariancePiasters` | `variance_piasters` | Difference between counted cash and expected cash (`counted - expected`) saved for manager review (R-8.4-1) | Billing & Payments |
| **Shift Closing Prompt on Logout** | تنبيه إغلاق الوردية عند الخروج | `shiftClosingPrompt` | *(UI check)* | Intercept prompt on logout/switch-user requiring receptionist with active cash transactions to close shift first (DEC-011, R-8.4-2) | Billing & Payments |
| **Cash Closing Lock** | قفل المعاملات المقفلة | `closingLock` | `is_locked = true` | Automatic locking preventing receptionists from editing or voiding transactions included in a completed closing (DEC-020, R-8.4-3) | Billing & Payments |
| **Clinical Record (EMR)** | الملف الطبي السريري | `clinicalRecord` | `clinical_records` | Patient medical file restricted strictly to treating clinicians and clinic Owner (R-9.1-1) | Clinical Records |
| **Treating Clinician** | المعالج الأساسي | `treatingClinician` | `primary_clinician_id` | Assigned doctor authorized to view and document medical notes for a specific patient (R-9.1-1) | Clinical Records |
| **Chief Complaint** | الشكوى الرئيسية | `chiefComplaint` | `chief_complaint` | Patient's primary symptom, pain site, or reason for seeking physical therapy or nutrition care (R-9.1-2) | Clinical Records |
| **Diagnosis** | التشخيص الطبي | `diagnosis` | `diagnoses` | Official clinical diagnosis assigned and maintained by doctors with history tracking (R-9.3-1) | Clinical Records |
| **Affected Body Part** | العضو / المفصل المصاب | `affectedBodyPart` | `affected_body_part` | Specific anatomical site treated (e.g. Lumbar spine, Cervical, Right knee, Left shoulder) (R-9.1-2) | Clinical Records |
| **Contraindications / Precautions**| موانع العلاج والمحاذير | `contraindications` | `contraindications` | Clinical conditions precluding specific modalities (e.g. heat on acute inflammation, electrical stimulation on pacemaker) (R-9.1-3) | Clinical Records |
| **Session Note History** | سجل الجلسات السابقة | `sessionTimeline` | `session_notes` | Chronological list of past visits, treating doctors, session sequence numbers, and clinical observations (R-9.1-6) | Clinical Records |
| **Draft Auto-Save** | الحفظ التلقائي للمسودة | `draftAutoSave` | `session_drafts` | Background timer saving clinical note draft every 30 seconds while clinician is typing to prevent loss (R-9.1-7) | Clinical Records |
| **SOAP Note** | التقييم الطبي الرباعي (SOAP) | `soapNote` | `soap_notes` | Standard clinical documentation format: Subjective, Objective, Assessment, Plan (R-9.2-1) | Clinical Records |
| **Subjective (S)** | التقييم الذاتي للمريض | `subjective` | `soap_subjective` | Patient's reported pain level (0–10 scale), symptoms, and personal functional observations (R-9.1-1, R-9.2-1) | Clinical Records |
| **Objective (O)** | الفحص السريري الموضوعي | `objective` | `soap_objective` | Measurable clinician findings: range of motion, muscle strength, swelling, palpation tests (R-9.2-1) | Clinical Records |
| **Assessment (A)** | التقييم المهني للمعالج | `assessment` | `soap_assessment` | Clinician's professional analysis of patient progress and response to previous therapy (R-9.2-1) | Clinical Records |
| **Plan (P)** | خطة الجلسات القادمة | `plan` | `soap_plan` | Planned treatment progression, next modalities, and frequency of upcoming visits (R-9.2-1) | Clinical Records |
| **Treatment Modality** | وسيلة / جهاز علاجي | `treatmentModality` | `modalities` | Specific therapeutic interventions applied: TENS, Ultrasound, Shockwave, Laser, Manual therapy, Dry needling, Exercise (R-9.1-3) | Clinical Records |
| **Home Exercises** | تمارين علاجية منزلية | `homeExercises` | `home_exercises` | Exercise regimen prescribed to patient, automatically carried forward from previous session and editable (R-9.1-4) | Clinical Records |
| **Note Lock** | إقفال التقرير الطبي | `isNoteLocked` | `is_locked = true` | Permanent state applied 24 hours after submission; prevents further alterations (DEC-016, R-9.2-2) | Clinical Records |
| **Addendum Note** | ملحق للتقرير المقفل | `addendumNote` | `note_addendums` | Supplementary dated note appended to a locked clinical record without modifying historical content (R-9.2-2) | Clinical Records |
| **Treatment Goal** | الهدف العلاجي | `treatmentGoal` | `treatment_goals` | Measurable target established by clinician (e.g. "Full knee flexion in 6 weeks, 12 sessions") with countdown slider (R-9.4-1) | Clinical Records |
| **Discharge Summary** | تقرير خروج وإنهاء العلاج | `dischargeSummary` | `discharge_summaries` | Final clinical assessment upon episode conclusion: Outcome (Recovered, Improved, Discontinued, Referred), notes, date (R-9.5-1) | Clinical Records |
| **InBody Record** | قياسات جهاز إن بادي | `inBodyRecord` | `inbody_records` | Detailed biometric record tracking weight, body fat %, muscle mass, visceral fat, BMI, BMR, and water weight (R-9.4-1) | Clinical Records |
| **Body Mass Index (BMI)** | مؤشر كتلة الجسم | `bmi` | `bmi` | Metric calculated automatically from weight and height ($kg / m^2$) (R-9.4-1) | Clinical Records |
| **Basal Metabolic Rate (BMR)** | معدل الأيض الأساسي | `bmr` | `bmr` | Daily caloric burn at rest calculated via Mifflin-St Jeor equation or entered from device (R-9.4-1) | Clinical Records |
| **Visceral Fat Level** | مستوى الدهون الحشوية | `visceralFat` | `visceral_fat` | Rating (1–20) measuring abdominal fat surrounding internal organs (R-9.4-1) | Clinical Records |
| **Skeletal Muscle Mass** | كتلة العضلات الهيكلية | `skeletalMuscleMass` | `skeletal_muscle_mass`| Weight of voluntary skeletal muscles in kilograms (R-9.4-1) | Clinical Records |
| **Dietary Protocol** | النظام الغذائي العلاجي | `dietaryProtocol` | `dietary_protocol` | Nutritional strategy prescribed: Keto, Low Carb, Intermittent Fasting, Sports, Diabetic, Post-Bariatric (R-9.4-1) | Clinical Records |
| **Expense** | مصروف تشغيلي | `expense` | `expenses` | Recorded clinic operating cost (date, category, amount in piasters, vendor, receipt photo) (R-10-1) | Expenses |
| **Recurring Expense** | مصروف دوري متكرر | `recurringExpense` | `recurring_expenses` | Monthly recurring liabilities (Rent, Utilities, Software) auto-logged or prompted on 1st of month (R-10-2) | Expenses |
| **Expense Approval** | اعتماد المصروفات الكبيرة | `expenseApproval` | `is_approved` | Optional threshold requirement: expenses > 1,000 EGP logged by Manager require Owner approval (R-10-3) | Expenses |
| **Doctor Commission** | عمولة الطبيب عن الجلسات | `doctorCommission` | `doctor_commissions` | Earned compensation calculated exclusively on completed clinical sessions (R-11-1, R-11-2) | Doctor Commissions |
| **Commission Payout** | صرف عمولات الأطباء | `commissionPayout` | `commission_payouts` | Formal payout record marking earned sessions paid and logging corresponding expense entry (R-11-2) | Doctor Commissions |
| **Daily Income Report** | تقرير الدخل والتحصيل اليومي | `dailyIncomeReport` | *(report view)* | Financial statement breaking down collections by method, receipts, refunds, and net cash (R-12-1) | Reports & Analytics |
| **Doctor Productivity Report**| تقرير إنتاجية الأطباء | `doctorProductivityReport`| *(report view)* | Operations report showing completed sessions, working hours, and earned commission per doctor (R-12-2) | Reports & Analytics |
| **Package Performance Report**| تقرير أداء الباقات | `packagePerformanceReport`| *(report view)* | Analysis of packages sold, active, expired, and total revenue collected (R-12-3) | Reports & Analytics |
| **Attendance Report** | تقرير الحضور والغياب | `attendanceReport` | *(report view)* | Attendance metrics: attended %, no-show %, and cancellation % with categorized reasons (R-12-4) | Reports & Analytics |
| **Outstanding Balances Report**| تقرير المديونيات المتأخرة | `debtorsReport` | *(report view)* | Aging list of patients with balance > 0 sorted by amount and days overdue (<30, 30–60, 60+) (R-12-5) | Reports & Analytics |
| **Net Profit Summary** | ملخص صافي الأرباح | `netProfitReport` | *(report view)* | Executive summary: `Total Collections - Expenses - Doctor Commissions = Net Profit` (R-12-7) | Reports & Analytics |
| **CSV Export** | تصدير بيانات إكسيل | `csvExport` | *(audited export)* | Downloadable CSV report for Owner/Manager; strictly audited and excludes medical diagnoses (R-12-8) | Reports & Analytics |
| **Audit Log** | سجل العمليات والرقابة | `auditLog` | `audit_logs` | Tamper-proof record storing every create, update, payment, void, login, export, or settings change (R-13-1) | Audit Log |
| **Append-Only Table** | جدول حفظ تراكمي مانع للحذف | `appendOnlyTable` | `audit_logs` | Database design where records can only be inserted, never updated or deleted by any user or action (R-13-3) | Audit Log |
| **Audit Actor** | المستخدم المنفذ للعملية | `auditActor` | `user_id`, `role`, `ip` | Logged identification of the specific staff member, role, and IP address that performed an action (R-13-2) | Audit Log |
| **Before / After State** | حالة السجل قبل وبعد التعديل | `beforeAfterState` | `before_state`, `after_state`| JSON snapshots capturing exact entity data prior to and immediately following an edit (R-13-2) | Audit Log |
| **In-App Notification** | إشعار داخلي بالنظام | `notification` | `notifications` | Real-time system alert (check-in, late arrival, cancellations, low sessions, expiring package) (R-14-1) | Notifications |
| **Mark as Read** | تمييز كمقروء | `markAsRead` | `read_at` | User action dismissing or acknowledging an in-app notification badge (R-14-6) | Notifications |
| **WhatsApp Message** | رسالة واتساب آلية | `whatsappMessage` | `whatsapp_logs` | Automated customer message sent to adult patient or dependent's guardian via wa.me link (DEC-014, R-4.1-20) | Notifications |
| **WhatsApp Consent** | موافقة استقبال رسائل واتساب | `whatsappConsent` | `whatsapp_consent` | Explicit patient toggle allowing or declining automated WhatsApp communications (DEC-022, R-4.1-20) | Notifications |
| **Medical Data Consent** | إقرار معالجة البيانات الطبية | `dataConsent` | `data_consent` | Mandatory patient agreement authorizing clinical record storage and medical treatment (DEC-022) | Notifications |
| **Password Hash** | تشفير كلمة المرور | `passwordHash` | `password_hash` | Irreversible cryptographic hash (bcrypt/argon2) of user passwords (minimum 8 characters) (R-15.1-1) | Authentication & Security |
| **Account Lockout** | إيقاف الحساب المؤقت | `accountLockout` | `locked_until` | 15-minute login freeze triggered after 5 consecutive failed authentication attempts (R-15.1-3) | Authentication & Security |
| **Session Cookie** | ملف الجلسة المشفر | `sessionCookie` | *(httpOnly cookie)* | Secure encrypted httpOnly cookie expiring after 12 hours with database re-validation on every request (R-15.1-4, R-15.1-5) | Authentication & Security |
| **Idle Screen Lock** | قفل الشاشة عند الخمول | `idleLock` | *(client state)* | Automatic security overlay locking screen after 15 minutes of inactivity; requires password to resume (R-15.1-4) | Authentication & Security |
| **Switch User** | تبديل المستخدم على نفس الجهاز | `switchUser` | *(logout flow)* | Shared front-desk workstation feature logging out current staff with shift closing prompt (DEC-011, R-15.1-6) | Authentication & Security |
| **Two-Factor Authentication (TOTP)**| المصادقة الثنائية | `totpAuth` | `totp_secret` | Mandatory 6-digit time-based one-time password generated via Authenticator app (DEC-007, R-15.2-1) | Authentication & Security |
| **Authenticator App** | تطبيق توليد الرموز السرية | `authenticatorApp` | *(external app)* | Mobile app (Google Authenticator, Microsoft Authenticator) used by staff for offline OTP generation (DEC-007, R-15.2-1) | Authentication & Security |
| **Recovery Code** | رمز استرداد الحساب | `recoveryCode` | `recovery_codes` | Set of 8 hashed single-use emergency backup codes generated during TOTP setup for account rescue (R-15.2-3) | Authentication & Security |
| **Trusted Device** | جهاز عمل موثوق | `trustedDevice` | `trusted_devices` | Clinic PC or tablet remembered for 30 days to bypass routine TOTP prompts on subsequent logins (R-15.2-4) | Authentication & Security |
| **Device Fingerprint** | البصمة التعريفية للجهاز | `deviceFingerprint` | `device_fingerprint` | Hash of browser and hardware headers used to identify and authorize trusted devices (R-15.2-4) | Authentication & Security |
| **Rate Limiting** | حماية من التكرار والضغط | `rateLimit` | *(memory/redis)* | Request throttling protecting login (5 attempts/15m) and sensitive endpoints from abuse (R-15.1-3, R-15.4-2) | Authentication & Security |
| **Database Backup** | نسخة احتياطية لقاعدة البيانات | `databaseBackup` | *(pg_dump)* | Automated daily encrypted database dump retained locally and offsite with integrity testing (R-15.3-1) | Authentication & Security |
| **Acceptance Criteria** | معايير القبول والتشغيل التجريبي | `acceptanceCriteria` | *(test suite)* | Verification benchmark confirming complete clinic day operations execute end-to-end without bugs (R-17-1) | Acceptance |

---

## 3. Rules Coverage Verification

Every rule defined in [docs/design/rules-index.md](file:///F:/Claude%20CRM/docs/design/rules-index.md) relies on standardized terminology from this glossary:

- **Ground Rules (`R-0-1` to `R-0-8`):** `integer_piasters`, `utc_timestamp`, `cairo_timezone`, `calculated_value`, `bilingual_rtl_ltr`, `soft_delete`.
- **Roles & Permissions (`R-1-1` to `R-1.1-21`):** `owner`, `manager`, `receptionist`, `physiotherapist`, `nutritionist`, `covering_access`, `permission_check`.
- **Clinic Settings (`R-2-1` to `R-2-8`):** `clinic_settings`, `service_catalog`, `package_template`, `room`, `bed`, `expense_category`, `whatsapp_template`, `note_lock_window`.
- **Staff Management (`R-3-1` to `R-3-5`):** `staff_user`, `working_shift`, `is_active_staff`, `is_deactivated_staff`, `commission_rate`.
- **Patients & Records (`R-4.1-1` to `R-4.3-1`):** `patient`, `file_number`, `adult_patient`, `dependent`, `guardian`, `mobile_phone`, `national_id`, `active_alerts`, `medical_tags`, `patient_merge`, `patient_document`, `reception_notes`.
- **Scheduling & Front Desk (`R-5.1-1` to `R-6-4`):** `appointment`, `clinician_overlap`, `bed_overlap`, `patient_overlap`, `daily_soft_limit`, `waitlist`, `walk_in`, `walk_in_queue`, `scheduled`, `confirmed`, `arrived`, `in_progress`, `completed`, `cancelled`, `no_show`, `rescheduled`, `late_arrival`, `bed_persistence`, `fast_check_in`.
- **Packages & Subscriptions (`R-7-1` to `R-7-8`):** `package`, `total_sessions`, `used_sessions`, `booked_sessions`, `remaining_sessions`, `available_sessions`, `forfeited_sessions`, `per_session_value`, `package_expiry`, `package_extension`, `package_transfer`, `multi_specialty_package`.
- **Billing, Invoicing & Cash Drawer (`R-8.1-1` to `R-8.4-4`):** `charge`, `payment`, `payment_method`, `split_payment`, `partial_payment`, `receipt_number`, `counter_rollover`, `thermal_receipt`, `void_receipt`, `refund`, `cash_refund_attribution`, `price_override`, `discount`, `patient_balance`, `owed_amount`, `balance_settlement`, `debt_write_off`, `cash_shift`, `cash_drawer`, `daily_cash_close`, `expected_cash`, `counted_cash`, `cash_variance`, `closing_lock`.
- **Clinical Records & Nutrition (`R-9.1-1` to `R-9.5-1`):** `clinical_record`, `treating_clinician`, `chief_complaint`, `diagnosis`, `affected_body_part`, `contraindications`, `session_history`, `draft_auto_save`, `soap_note`, `treatment_modality`, `home_exercises`, `note_lock`, `addendum_note`, `treatment_goal`, `discharge_summary`, `inbody_record`, `bmi`, `bmr`, `visceral_fat`, `skeletal_muscle_mass`, `dietary_protocol`.
- **Expenses & Commissions (`R-10-1` to `R-11-3`):** `expense`, `recurring_expense`, `expense_approval`, `doctor_commission`, `commission_payout`.
- **Reports & Analytics (`R-12-1` to `R-12-8`):** `daily_income_report`, `productivity_report`, `package_performance_report`, `attendance_report`, `debtors_report`, `net_profit_report`, `csv_export`.
- **Audit Log (`R-13-1` to `R-13-3`):** `audit_log`, `append_only_table`, `audit_actor`, `before_after_state`.
- **Notifications (`R-14-1` to `R-14-6`):** `notification`, `mark_as_read`, `whatsapp_message`, `whatsapp_consent`, `data_consent`.
- **Authentication & Security (`R-15.1-1` to `R-15.4-3`):** `password_hash`, `account_lockout`, `session_cookie`, `idle_lock`, `switch_user`, `totp_auth`, `authenticator_app`, `recovery_code`, `trusted_device`, `device_fingerprint`, `rate_limiting`, `database_backup`.
- **Acceptance Criteria (`R-17-1`):** `acceptance_criteria`.
