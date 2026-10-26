# Masaar Clinic System — Database Constraints & Rule Enforcement Specification

> **Specification Reference:** [docs/FEATURES-v2.2.md](file:///F:/Claude%20CRM/docs/FEATURES-v2.2.md)  
> **Data Model Reference:** [docs/design/data-model.md](file:///F:/Claude%20CRM/docs/design/data-model.md)  
> **Prisma Schema Reference:** [`prisma/schema.prisma`](file:///F:/Claude%20CRM/prisma/schema.prisma)  
> **Calculations Reference:** [docs/design/calculations.md](file:///F:/Claude%20CRM/docs/design/calculations.md)  
> **Rules Index Reference:** [docs/design/rules-index.md](file:///F:/Claude%20CRM/docs/design/rules-index.md)  
> **Decision Log Reference:** [docs/design/decisions.md](file:///F:/Claude%20CRM/docs/design/decisions.md) (`DEC-026`)  
> **Database Engine:** PostgreSQL 16+ with `btree_gist` extension  
> **Status:** Stage 1 Design Consolidated Baseline (Task 1.13)

---

## 1. Executive Summary & Constraint Metrics

This document provides a comprehensive audit and registry of all database constraints, indexes, triggers, and rule enforcement mechanisms across the complete Masaar Clinic System.

### 1.1 Key Architecture Metrics
- **Total Database Tables:** **44 tables** (Slice A: 17, Slice B: 5, Slice C: 5, Slice D: 9, Slice E: 8).
  - *Slice A (17 tables):* `clinic_settings`, `clinic_opening_hours`, `clinic_closures`, `rooms`, `beds`, `session_types`, `users`, `staff_schedules`, `staff_leaves`, `login_attempts`, `user_sessions`, `otp_secrets`, `otp_backup_codes`, `trusted_devices`, `password_reset_codes`, `message_templates` (WhatsApp templates), `audit_logs`.
  - *Slice B (5 tables):* `patients`, `patient_diagnoses`, `patient_documents`, `document_view_logs`, `covering_access_logs`.
  - *Slice C (5 tables):* `appointments`, `appointment_series`, `appointment_status_history`, `appointment_reminders`, `in_app_notifications`.
  - *Slice D (9 tables):* `packages`, `package_extensions`, `charges`, `payments`, `receipt_counters`, `refunds`, `write_offs`, `price_change_history`, `cash_closings`.
  - *Slice E (8 tables):* `clinical_notes`, `clinical_note_versions`, `clinical_note_addenda`, `inbody_records`, `expenses`, `expense_edit_history`, `commission_payouts`, `commission_payout_sessions`.
- **Total Foreign Key Relations:** **115 relations**
  - **47 Restrict relations (`ON DELETE RESTRICT`):** Protects 100% of clinical, financial, author, and audit records against accidental or administrative deletion.
  - **55 SetNull relations (`ON DELETE SET NULL`):** Auditing and optional references (e.g. `created_by_user_id`, `cash_shift_id`).
  - **13 Cascade relations (`ON DELETE CASCADE`):** Strictly confined to internal user credentials (`UserSession`, `OtpSecret`, `OtpBackupCode`, `TrustedDevice`, `PasswordResetCode`, `StaffSchedule`, `StaffLeave`, `InAppNotification`) where user account deactivation is used rather than hard deletion. Zero cascade deletes touch clinical or financial records.
- **Total Unique Constraints & Partial Unique Indexes:** **22 constraints**
- **Total Check Constraints:** **20 table check constraints**
- **Total Exclusion Constraints (`btree_gist`):** **3 exclusion constraints** (Clinician Overlap, Bed Overlap, Patient Overlap).
- **Total Immutability & Business Triggers:** **11 PostgreSQL triggers** (Audit Log Immutability, Patient Delete Block, Document Views, Covering Access, Staff Shifts Order, Status History, Receipt Number Generator, Price History, 24h Note Edit Window, Closed Shift Payments Lock, Closed Shift Expenses Lock).

---

## 2. Table-by-Table Constraint & Schema Registry

| Table Name | Purpose | Primary Key | Foreign Keys (Delete Policy) | Unique Constraints & Partial Indexes | Check Constraints & Triggers |
|---|---|---|---|---|---|
| `clinic_settings` | Global clinic config | `id` (UUID) | `updated_by_user_id` (SetNull) | None (Singleton) | None |
| `clinic_opening_hours` | Weekly schedule (0..6) | `id` (UUID) | `updated_by_user_id` (SetNull) | `UNIQUE (day_of_week)` | Day of week 0..6 |
| `clinic_closures` | Specific closure dates | `id` (UUID) | `created_by_user_id` (SetNull) | `UNIQUE (closure_date)` | None |
| `rooms` | Treatment rooms | `id` (UUID) | `created_by_user_id` (SetNull) | None | None |
| `beds` | Physical treatment beds | `id` (UUID) | `room_id` (Restrict), `created_by_user_id` (SetNull) | `UNIQUE (room_id, name)` | None |
| `session_types` | Clinical service types | `id` (UUID) | `created_by_user_id` (SetNull) | `UNIQUE (code)` | `default_price_piasters > 0` |
| `users` | Staff accounts & roles | `id` (UUID) | `created_by_user_id` (SetNull) | `UNIQUE (email)` | Role enum, Commission enum |
| `staff_schedules` | Weekly shifts (up to 2/day) | `id` (UUID) | `user_id` (Cascade) | `UNIQUE (user_id, day_of_week, shift_number)` | `trg_staff_schedules_shift_order` |
| `staff_leaves` | Vacation / sick leaves | `id` (UUID) | `user_id` (Cascade), `approved_by_user_id` (SetNull) | None | `start_date <= end_date` |
| `login_attempts` | Security rate-limit log | `id` (UUID) | None | None | None |
| `user_sessions` | Active sessions (12h max) | `id` (UUID) | `user_id` (Cascade) | `UNIQUE (token_hash)` | None |
| `otp_secrets` | TOTP 2FA encrypted keys | `id` (UUID) | `user_id` (Cascade) | `UNIQUE (user_id)` | None |
| `otp_backup_codes` | 1 of 10 recovery hashes | `id` (UUID) | `user_id` (Cascade) | None | None |
| `trusted_devices` | 30-day device tokens | `id` (UUID) | `user_id` (Cascade) | `UNIQUE (device_token_hash)` | None |
| `password_reset_codes` | 10-min email reset codes | `id` (UUID) | `user_id` (Cascade) | None | `attempts_count <= 5` |
| `message_templates` | WhatsApp text templates | `id` (UUID) | `updated_by_user_id` (SetNull) | `UNIQUE (key, language)` | Language enum (AR, EN) |
| `audit_logs` | Append-only system audit | `id` (UUID) | `user_id` (Restrict) | None | `trg_audit_logs_immutability` (strictly blocks UPDATE/DELETE) |
| `patients` | Patient demographic & clinical summary | `id` (UUID) | `assigned_physiotherapist_id` (SetNull), `assigned_nutritionist_id` (SetNull), `discharged_by_user_id` (SetNull), `created_by_user_id` (SetNull), `updated_by_user_id` (SetNull) | `UNIQUE (file_number)`, Partial UK: `idx_patients_mobile_phone_unique (mobile_phone) WHERE mobile_phone IS NOT NULL` | `chk_patients_mobile_phone_format`, `chk_patients_guardian_phone_format`, `chk_patients_dependent_integrity`, `trg_patients_prevent_hard_delete` |
| `patient_diagnoses` | Clinical diagnoses | `id` (UUID) | `patient_id` (Restrict), `diagnosed_by_user_id` (Restrict), `created_by_user_id` (SetNull), `updated_by_user_id` (SetNull) | None | None |
| `patient_documents` | Attached medical/admin files | `id` (UUID) | `patient_id` (Restrict), `uploaded_by_user_id` (Restrict), `created_by_user_id` (SetNull), `updated_by_user_id` (SetNull) | None | `chk_patient_documents_file_size` (<=10MB), `chk_patient_documents_mime_type` |
| `document_view_logs` | Document inspection audit | `id` (UUID) | `document_id` (Cascade), `viewed_by_user_id` (Restrict) | None | `trg_document_view_logs_immutability` (blocks UPDATE/DELETE) |
| `covering_access_logs` | Emergency covering audit | `id` (UUID) | `patient_id` (Restrict), `clinician_id` (Restrict), `session_id` (SetNull) | None | `trg_covering_access_logs_immutability` (blocks UPDATE/DELETE) |
| `appointments` | Calendar bookings | `id` (UUID) | `patient_id` (Restrict), `session_type_id` (Restrict), `clinician_id` (Restrict), `room_id` (Restrict), `bed_id` (Restrict), `series_id` (SetNull), `package_id` (SetNull), `created_by_user_id` (SetNull), `updated_by_user_id` (SetNull) | None | **Exclusion Constraints:** Clinician, Bed, Patient Overlap. **Checks:** `duration 15..180 % 15 = 0`, `starts_at < ends_at` |
| `appointment_series` | Recurring schedule series | `id` (UUID) | `patient_id` (Restrict), `session_type_id` (Restrict), `clinician_id` (Restrict), `room_id` (Restrict), `bed_id` (Restrict), `created_by_user_id` (SetNull) | None | `total_sessions > 0` |
| `appointment_status_history` | Appointment transition log | `id` (UUID) | `appointment_id` (Cascade), `changed_by_user_id` (SetNull) | None | `trg_appointment_status_history_immutability` (blocks UPDATE/DELETE) |
| `appointment_reminders` | WhatsApp reminders | `id` (UUID) | `appointment_id` (Cascade), `sent_by_user_id` (SetNull) | None | Channel enum (`WHATSAPP`, `MANUAL_CALL`) |
| `in_app_notifications` | Staff workspace alerts | `id` (UUID) | `user_id` (Cascade), `appointment_id` (SetNull), `patient_id` (SetNull) | None | None |
| `packages` | Prepaid session bundles | `id` (UUID) | `patient_id` (Restrict), `session_type_id` (Restrict), `created_by_user_id` (SetNull), `updated_by_user_id` (SetNull) | None | `chk_packages_positive_price` (`total_price_piasters > 0 AND total_sessions > 0`) |
| `package_extensions` | Validity extensions | `id` (UUID) | `package_id` (Restrict), `extended_by_user_id` (Restrict) | None | `days_added >= 1 AND days_added <= 365` |
| `charges` | Billing obligations | `id` (UUID) | `patient_id` (Restrict), `package_id` (SetNull), `appointment_id` (SetNull), `created_by_user_id` (SetNull) | None | `chk_charges_positive_amount` (`amount_piasters > 0`) |
| `payments` | Collected receipts | `id` (UUID) | `charge_id` (Restrict), `cash_shift_id` (SetNull), `voided_by_user_id` (SetNull), `collected_by_user_id` (Restrict) | `UNIQUE (receipt_number)` | `chk_payments_positive_amount` (`amount_piasters > 0`), `trg_generate_receipt_number`, `trg_lock_closed_shift_payments` |
| `receipt_counters` | Annual serial counters | `id` (UUID) | None | `UNIQUE (year)` | None |
| `refunds` | Financial refunds | `id` (UUID) | `charge_id` (Restrict), `payment_id` (SetNull), `cash_shift_id` (SetNull), `handed_out_by_user_id` (Restrict), `approved_by_user_id` (Restrict) | None | `chk_refunds_positive_amount` (`amount_piasters > 0`) |
| `write_offs` | Debt write-offs | `id` (UUID) | `charge_id` (Restrict), `approved_by_user_id` (Restrict) | None | `chk_write_offs_positive_amount` (`amount_piasters > 0`) |
| `price_change_history` | Price alteration audit | `id` (UUID) | `appointment_id` (SetNull), `charge_id` (SetNull), `package_id` (SetNull), `changed_by_user_id` (Restrict) | None | `trg_price_change_history_immutability` (blocks UPDATE/DELETE) |
| `cash_closings` | End-of-shift drawer count & frozen snapshot | `id` (UUID) | `cashier_user_id` (Restrict), `witness_user_id` (SetNull) | None | Status enum (`OPEN`, `CLOSED`), frozen snapshot fields |
| `clinical_notes` | Session completion form | `id` (UUID) | `appointment_id` (Restrict), `patient_id` (Restrict), `clinician_id` (Restrict), `voided_by_user_id` (SetNull), `created_by_user_id` (SetNull), `updated_by_user_id` (SetNull) | `UNIQUE (appointment_id)` | `chk_clinical_notes_pain_before` (0..10), `chk_clinical_notes_pain_after` (0..10), `trg_clinical_notes_edit_window` (24h lock) |
| `clinical_note_versions` | 24-hour note edit snapshot | `id` (UUID) | `note_id` (Cascade), `edited_by_user_id` (Restrict) | `UNIQUE (note_id, version_number)` | Pain 0..10 |
| `clinical_note_addenda` | Post-24h note addenda | `id` (UUID) | `note_id` (Cascade), `author_id` (Restrict), `voided_by_user_id` (SetNull) | None | None |
| `inbody_records` | Nutrition & body test | `id` (UUID) | `patient_id` (Restrict), `appointment_id` (SetNull), `recorded_by_user_id` (Restrict), `voided_by_user_id` (SetNull), `created_by_user_id` (SetNull), `updated_by_user_id` (SetNull) | `UNIQUE (appointment_id)` | `chk_inbody_records_height` (50..250 cm), `chk_inbody_records_weight` (20..300 kg), `chk_inbody_records_visceral_fat` (1..20) |
| `expenses` | Expense vouchers | `id` (UUID) | `cash_shift_id` (SetNull), `voided_by_user_id` (SetNull), `created_by_user_id` (Restrict), `updated_by_user_id` (SetNull) | None | `chk_expenses_positive_amount` (`amount_piasters > 0`), `trg_lock_closed_shift_expenses` |
| `expense_edit_history` | Expense edit audit trail | `id` (UUID) | `expense_id` (Restrict), `edited_by_user_id` (Restrict) | None | None |
| `commission_payouts` | Doctor commission voucher | `id` (UUID) | `clinician_id` (Restrict), `expense_id` (SetNull), `voided_by_user_id` (SetNull), `created_by_user_id` (Restrict), `updated_by_user_id` (SetNull) | `UNIQUE (expense_id)` | `period_start_date <= period_end_date`, `total_payout_piasters >= 0` |
| `commission_payout_sessions` | Commission session link | `id` (UUID) | `payout_id` (Restrict), `appointment_id` (Restrict) | Partial UK: `idx_unique_active_paid_session (appointment_id) WHERE is_voided = false` | Single active commission payment guarantee |

---

## 3. Exclusion Constraints Deep Dive (PostgreSQL `btree_gist`)

PostgreSQL exclusion constraints guarantee at the database storage engine level that overlapping time intervals for the same physical resource are physically rejected by the disk engine, even under concurrent multi-user race conditions.

### 3.1 Prerequisite Extension
```sql
CREATE EXTENSION IF NOT EXISTS btree_gist;
```

### 3.2 Constraints DDL & Behavior

#### 1. Clinician Calendar Overlap Block (`R-5.2-3`, `R-5.2-12`)
```sql
ALTER TABLE appointments 
ADD CONSTRAINT exclude_clinician_time_overlap 
EXCLUDE USING gist (
    clinician_id WITH =,
    tstzrange(starts_at, ends_at, '[)') WITH &&
)
WHERE (status IN ('SCHEDULED', 'ARRIVED', 'COMPLETED'));
```
- **Invariant:** A single clinician cannot be booked for overlapping time intervals across active appointments.
- **Active Filter:** Cancelled (`CANCELLED`) and waitlisted (`WAITLISTED`) slots are ignored, releasing the clinician for re-booking.

#### 2. Bed Calendar Overlap Block (`R-5.2-4`, `R-5.2-12`, `DEC-006`, `DEC-021`)
```sql
ALTER TABLE appointments 
ADD CONSTRAINT exclude_bed_time_overlap 
EXCLUDE USING gist (
    bed_id WITH =,
    tstzrange(starts_at, ends_at, '[)') WITH &&
)
WHERE (status IN ('SCHEDULED', 'ARRIVED', 'COMPLETED'));
```
- **Invariant:** A single physical treatment bed cannot accommodate more than one patient during any time slice.
- **Reservation Persistence:** Even if a patient finishes early, the bed reservation holds through the scheduled `ends_at` boundary to ensure calendar stability.

#### 3. Patient Calendar Overlap Block (`R-5.2-5`)
```sql
ALTER TABLE appointments 
ADD CONSTRAINT exclude_patient_time_overlap 
EXCLUDE USING gist (
    patient_id WITH =,
    tstzrange(starts_at, ends_at, '[)') WITH &&
)
WHERE (status IN ('SCHEDULED', 'ARRIVED', 'COMPLETED'));
```
- **Invariant:** A patient cannot be booked for two concurrent appointments across different rooms or clinicians simultaneously.

---

## 4. Partial Unique Indexes

### 4.1 Adult Egyptian Mobile Phone Uniqueness (`R-4.1-2`, `R-4.2-2`)
```sql
CREATE UNIQUE INDEX IF NOT EXISTS idx_patients_mobile_phone_unique 
ON patients (mobile_phone) 
WHERE mobile_phone IS NOT NULL;
```
- **Business Rule:** Adult patients must have a unique Egyptian mobile phone number (`01XXXXXXXXX`).
- **Dependent Support:** Dependent patients (children, elderly) leave `mobile_phone` as `NULL` and store `guardian_phone` instead. The partial index ignores `NULL`, permitting multiple children to share the same parent phone number without violating uniqueness.

### 4.2 Commission Single-Payout Guarantee (`R-11-2`, `R-11-4`, `DEC-026`)
```sql
CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_active_paid_session 
ON commission_payout_sessions (appointment_id) 
WHERE is_voided = false;
```
- **Business Rule:** A completed appointment session can **never be paid commission twice**.
- **Void Release:** If a parent commission payout voucher is voided by an Owner or Manager (`is_voided = true`), the partial index releases the appointment session, allowing it to be legitimately recalculated and included in a subsequent corrected payout run.

---

## 5. PostgreSQL Immutability & Audit Triggers (Raw SQL DDL)

The following triggers are implemented in PostgreSQL to provide rock-solid, database-engine-level guarantees for audit logging, record protection, and shift security:

### 5.1 Immutable Audit Log Trigger (`R-13-3`)
```sql
-- Completely blocks UPDATE and DELETE statements on audit_logs.
CREATE OR REPLACE FUNCTION trg_block_audit_log_mutation()
RETURNS TRIGGER AS $$
BEGIN
    RAISE EXCEPTION 'Audit log entries are immutable. UPDATE and DELETE operations are prohibited.'
        USING ERRCODE = 'integrity_constraint_violation';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_audit_logs_immutability
BEFORE UPDATE OR DELETE ON audit_logs
FOR EACH ROW
EXECUTE FUNCTION trg_block_audit_log_mutation();
```

### 5.2 Patient Hard-Delete Prevention Trigger (`R-0-3`)
```sql
-- Completely blocks hard DELETE statements on the patients table.
-- Patients can only be soft-deactivated (is_active = false) or clinically discharged.
CREATE OR REPLACE FUNCTION trg_prevent_patient_hard_delete()
RETURNS TRIGGER AS $$
BEGIN
    RAISE EXCEPTION 'Patient records cannot be hard-deleted. Use soft deactivation (is_active = false) or clinical discharge.'
        USING ERRCODE = 'integrity_constraint_violation';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_patients_prevent_hard_delete
BEFORE DELETE ON patients
FOR EACH ROW
EXECUTE FUNCTION trg_prevent_patient_hard_delete();
```

### 5.3 Closed Cash Shift Modification Locks (`R-8.4-3`, `R-10-2`, `DEC-020`)
```sql
-- After a shift is closed, blocks changes to amount, method, date, collected-by and shift link.
-- ALLOWS setting void fields (is_voided, voided_at, voided_by_user_id, void_reason) so Owner/Manager can void closed-shift transactions without altering historical closing snapshots.
CREATE OR REPLACE FUNCTION trg_check_closed_shift_payment_lock()
RETURNS TRIGGER AS $$
DECLARE
    shift_status VARCHAR(20);
BEGIN
    IF TG_OP = 'DELETE' THEN
        IF OLD.cash_shift_id IS NOT NULL THEN
            SELECT status INTO shift_status FROM cash_closings WHERE id = OLD.cash_shift_id;
            IF shift_status = 'CLOSED' THEN
                RAISE EXCEPTION 'Payments in a closed cash drawer shift cannot be hard-deleted.'
                    USING ERRCODE = 'integrity_constraint_violation';
            END IF;
        END IF;
        RETURN OLD;
    END IF;

    -- For UPDATE operations:
    IF OLD.cash_shift_id IS NOT NULL THEN
        SELECT status INTO shift_status FROM cash_closings WHERE id = OLD.cash_shift_id;
        IF shift_status = 'CLOSED' THEN
            -- Block changes to amount, payment method, collected_at, collector, charge, or shift linkage
            IF NEW.amount_piasters <> OLD.amount_piasters OR
               NEW.payment_method <> OLD.payment_method OR
               NEW.collected_at <> OLD.collected_at OR
               NEW.collected_by_user_id <> OLD.collected_by_user_id OR
               NEW.charge_id <> OLD.charge_id OR
               (NEW.cash_shift_id IS DISTINCT FROM OLD.cash_shift_id) THEN
                RAISE EXCEPTION 'Payment belongs to a closed cash shift. Core financial fields and shift linkage cannot be modified.'
                    USING ERRCODE = 'integrity_constraint_violation';
            END IF;

            -- Prevent unvoiding once voided
            IF OLD.is_voided = true AND NEW.is_voided = false THEN
                RAISE EXCEPTION 'A voided payment in a closed cash drawer shift cannot be unvoided.'
                    USING ERRCODE = 'integrity_constraint_violation';
            END IF;

            -- ALLOW setting void fields: is_voided, voided_at, voided_by_user_id, void_reason
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_lock_closed_shift_payments
BEFORE UPDATE OR DELETE ON payments
FOR EACH ROW
EXECUTE FUNCTION trg_check_closed_shift_payment_lock();

-- After a shift is closed, blocks changes to amount, method, date, creator, title, category, and shift link.
-- ALLOWS setting void fields (is_voided, voided_at, voided_by_user_id, void_reason) so Owner/Manager can void closed-shift expenses.
CREATE OR REPLACE FUNCTION trg_check_closed_shift_expense_lock()
RETURNS TRIGGER AS $$
DECLARE
    shift_status VARCHAR(20);
BEGIN
    IF TG_OP = 'DELETE' THEN
        IF OLD.cash_shift_id IS NOT NULL THEN
            SELECT status INTO shift_status FROM cash_closings WHERE id = OLD.cash_shift_id;
            IF shift_status = 'CLOSED' THEN
                RAISE EXCEPTION 'Expenses in a closed cash drawer shift cannot be hard-deleted.'
                    USING ERRCODE = 'integrity_constraint_violation';
            END IF;
        END IF;
        RETURN OLD;
    END IF;

    -- For UPDATE operations:
    IF OLD.cash_shift_id IS NOT NULL THEN
        SELECT status INTO shift_status FROM cash_closings WHERE id = OLD.cash_shift_id;
        IF shift_status = 'CLOSED' THEN
            -- Block changes to amount, payment method, date, creator, title, category, or shift linkage
            IF NEW.amount_piasters <> OLD.amount_piasters OR
               NEW.payment_method <> OLD.payment_method OR
               NEW.expense_date <> OLD.expense_date OR
               NEW.created_by_user_id <> OLD.created_by_user_id OR
               NEW.title <> OLD.title OR
               NEW.category <> OLD.category OR
               (NEW.cash_shift_id IS DISTINCT FROM OLD.cash_shift_id) THEN
                RAISE EXCEPTION 'Expense belongs to a closed cash shift. Core expense fields and shift linkage cannot be modified.'
                    USING ERRCODE = 'integrity_constraint_violation';
            END IF;

            -- Prevent unvoiding once voided
            IF OLD.is_voided = true AND NEW.is_voided = false THEN
                RAISE EXCEPTION 'A voided expense in a closed cash drawer shift cannot be unvoided.'
                    USING ERRCODE = 'integrity_constraint_violation';
            END IF;

            -- ALLOW setting void fields: is_voided, voided_at, voided_by_user_id, void_reason
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_lock_closed_shift_expenses
BEFORE UPDATE OR DELETE ON expenses
FOR EACH ROW
EXECUTE FUNCTION trg_check_closed_shift_expense_lock();
```

### 5.4 24-Hour Clinical Note Edit Window Lock (`R-9.2-1`, `DEC-016`)
```sql
-- Allows author to edit note within 24 hours of initial completion.
-- Does NOT block: inserting addenda (stored in clinical_note_addenda), inserting note versions (clinical_note_versions),
-- or the Owner re-open flow (appointment COMPLETED -> ARRIVED, where appt status is ARRIVED).
CREATE OR REPLACE FUNCTION trg_check_clinical_note_edit_window()
RETURNS TRIGGER AS $$
DECLARE
    appt_status VARCHAR(50);
BEGIN
    -- 1. Check if parent appointment has been re-opened by Owner (R-5.5-11)
    SELECT status INTO appt_status FROM appointments WHERE id = OLD.appointment_id;
    IF appt_status = 'ARRIVED' THEN
        -- Owner re-open flow active: allow editing and re-completing the clinical note
        RETURN NEW;
    END IF;

    -- 2. Allow setting void fields (soft voiding note with reason)
    IF NEW.is_voided = true AND OLD.is_voided = false THEN
        RETURN NEW;
    END IF;

    -- 3. If 24 hours have elapsed since completed_at, block changes to clinical content
    IF now() > (OLD.completed_at + INTERVAL '24 hours') THEN
        IF (NEW.pain_before IS DISTINCT FROM OLD.pain_before OR
            NEW.pain_after IS DISTINCT FROM OLD.pain_after OR
            NEW.subjective IS DISTINCT FROM OLD.subjective OR
            NEW.objective IS DISTINCT FROM OLD.objective OR
            NEW.assessment IS DISTINCT FROM OLD.assessment OR
            NEW.plan IS DISTINCT FROM OLD.plan OR
            NEW.treatment_modalities IS DISTINCT FROM OLD.treatment_modalities OR
            NEW.treatment_notes IS DISTINCT FROM OLD.treatment_notes OR
            NEW.home_exercises IS DISTINCT FROM OLD.home_exercises) THEN
            RAISE EXCEPTION 'The 24-hour edit window for this clinical note has expired. Please append an addendum instead.'
                USING ERRCODE = 'integrity_constraint_violation';
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_clinical_notes_edit_window
BEFORE UPDATE ON clinical_notes
FOR EACH ROW
EXECUTE FUNCTION trg_check_clinical_note_edit_window();
```

---

## 6. Non-Stored Derived Values & Snapshot Policy Audit

In strict compliance with **Rule R-0-6** and **DEC-005**, the database schema was audited to verify that calculated values are not stored as mutable columns, with the explicit exception of frozen historical snapshots on signed records:

### 6.1 The Snapshot Values Policy
> **Snapshot Values Rule:** **Snapshot values are allowed only for closed, signed records.**  
> - Open records must **never** store derived figures (balances, remaining sessions, age, BMI/BMR).
> - When an operational entity is permanently closed and signed (specifically end-of-shift **`cash_closings`** when `status = CLOSED`), the derived figures (`expected_cash_piasters` and `difference_piasters`) are evaluated at that exact second and frozen immutably alongside the list of included transaction IDs (`included_transaction_ids`). Once closed, these historical snapshot figures are immutable and are never recalculated.

### 6.2 Derived Values Matrix
| Entity / Metric | Formula Source | Reason Not Stored | Verification Status |
|---|---|---|:---:|
| **Patient Age** | [calculations.md §1.1](file:///F:/Claude%20CRM/docs/design/calculations.md#11-patient-age-calculation) | `date_of_birth` stored; age becomes stale on birthdays | ✅ Verified Omitted |
| **Charge Balance** | [calculations.md §5.1](file:///F:/Claude%20CRM/docs/design/calculations.md#51-charge-balance-calculation) | Computed: `amount - non_voided_payments + refunds - write_offs` | ✅ Verified Omitted |
| **Package Available Sessions** | [calculations.md §4.4](file:///F:/Claude%20CRM/docs/design/calculations.md#44-available-sessions-for-booking) | Computed: `total_sessions - completed - future_booked` | ✅ Verified Omitted |
| **Package Completed / Remaining Sessions** | [calculations.md §4.3](file:///F:/Claude%20CRM/docs/design/calculations.md#43-package-status-dynamic-resolution) | Computed dynamically by counting completed appointments (`package_id = id AND status = 'COMPLETED'`) | ✅ Confirmed NO Stored Column |
| **Package Operational Status** | [calculations.md §4.3](file:///F:/Claude%20CRM/docs/design/calculations.md#43-package-status-dynamic-resolution) | Resolved from `cancelled_at`, session count, and `today > expiry_date` | ✅ Confirmed NO Stored Column |
| **Body Mass Index (BMI)** | [calculations.md §6.1](file:///F:/Claude%20CRM/docs/design/calculations.md#61-body-mass-index-bmi) | Computed: `weight_kg / (height_m^2)` rounded to 1 decimal place | ✅ Verified Omitted |
| **Basal Metabolic Rate (BMR)** | [calculations.md §6.2](file:///F:/Claude%20CRM/docs/design/calculations.md#62-basal-metabolic-rate-bmr--mifflin-st-jeor) | Computed via Mifflin-St Jeor equation | ✅ Verified Omitted |
| **Cash Shift Closed Expected Cash** | [calculations.md §5.4](file:///F:/Claude%20CRM/docs/design/calculations.md#54-cash-shift-closing-end-of-shift) | Stored as frozen snapshot upon closing (`status = CLOSED`) alongside `included_transaction_ids` | ✅ Signed Snapshot Allowed |
| **Cash Shift Closed Discrepancy** | [calculations.md §5.4](file:///F:/Claude%20CRM/docs/design/calculations.md#54-cash-shift-closing-end-of-shift) | Stored as frozen snapshot upon closing (`counted - expected`) | ✅ Signed Snapshot Allowed |
| **Price Adjustment Variance** | [calculations.md §3.1](file:///F:/Claude%20CRM/docs/design/calculations.md#31-appointment-overlap-detection) | Computed: `new_price - old_price` | ✅ Verified Omitted |
| **Late Arrival Minutes** | [calculations.md §3.2](file:///F:/Claude%20CRM/docs/design/calculations.md#32-late-minutes--arrival-alert) | Computed: `max(0, floor((check_in_at - starts_at)/60s))` | ✅ Verified Omitted |

---

## 7. Master Rule ID Traceability Matrix (All 194 Rules)

The table below maps every business rule in [rules-index.md](file:///F:/Claude%20CRM/docs/design/rules-index.md) (`R-0-1` through `R-17-1`) to its enforcement level:
- **`DB constraint`:** Enforced strictly by PostgreSQL constraint, type, or trigger.
- **`Server action`:** Enforced in Next.js Server Action / domain validator.
- **`Both`:** Enforced in Server Action with DB constraint as a hard backstop (defense-in-depth).

| Rule ID | One-Line Summary | Module | Enforced By | Specific Enforcement Mechanism |
|---|---|---|:---:|---|
| `R-0-1` | Rules enforced on server and in database, never only in UI | Ground Rules | **Both** | System-wide architectural invariant: dual validation in server action (defineAction) and DB constraints |
| `R-0-2` | Write actions verify active user, role check, validation, transaction, audit log | Ground Rules | **Both** | defineAction() pipeline + foreign key user references & audit_logs DB trigger |
| `R-0-3` | Zero hard deletion; records cancelled, voided, or deactivated | Ground Rules | **DB constraint** | Foreign keys use ON DELETE RESTRICT on all business records; trg_patients_prevent_hard_delete blocks hard-delete |
| `R-0-4` | Money stored as integer piasters (450.00 EGP = 45000), displayed as EGP | Ground Rules | **Both** | Integer piasters columns (INT/BIGINT) + chk_*_positive_amount check constraints + Zod int validation |
| `R-0-5` | Timestamps stored in UTC, displayed in Africa/Cairo time; appointments use clinic dates | Ground Rules | **Both** | UTC TIMESTAMPTZ database storage + date-fns Africa/Cairo query evaluation |
| `R-0-6` | Calculated values (balances, remaining sessions, totals) are never stored | Ground Rules | **Both** | Strictly omitted from DB schema (snapshot values allowed only for closed, signed records per calculations.md) |
| `R-0-7` | Bilingual interface (Arabic RTL default, English LTR) with light/dark themes | Ground Rules | **Server action** | next-intl localization middleware, RTL layout direction, and client theme toggle |
| `R-0-8` | No demo data in production; seed script for dev/staging only | Ground Rules | **Server action** | Database seed scripts restricted strictly to development and staging environments |
| `R-1-1` | Owner role: full clinic access, staff accounts, settings, security; clinician work | Roles & Permissions | **Server action** | defineAction() RBAC permission check against src/domain/permissions.ts |
| `R-1-2` | Manager role: financial & operational management; cannot manage staff accounts/security | Roles & Permissions | **Server action** | defineAction() RBAC permission check against src/domain/permissions.ts |
| `R-1-3` | Receptionist role: patient admin, scheduling, payments, closing; no clinical data | Roles & Permissions | **Server action** | defineAction() RBAC permission check against src/domain/permissions.ts |
| `R-1-4` | Physiotherapist role: own schedule, own patient clinical records, sessions; no finance | Roles & Permissions | **Server action** | defineAction() RBAC permission check against src/domain/permissions.ts |
| `R-1-5` | Nutritionist role: nutrition consultations, InBody, own patient records; no finance | Roles & Permissions | **Server action** | defineAction() RBAC permission check against src/domain/permissions.ts |
| `R-1-6` | No Dev role in production; developers use staging environment with synthetic data | Roles & Permissions | **Server action** | defineAction() RBAC permission check against src/domain/permissions.ts |
| `R-1.1-1` | Create / edit patient admin data permitted for Owner, Manager, Receptionist | Roles & Permissions | **Server action** | defineAction() RBAC permission check against src/domain/permissions.ts |
| `R-1.1-2` | View / edit diagnosis, clinical notes, medical docs for Owner and own clinicians | Roles & Permissions | **Server action** | defineAction() RBAC permission check against src/domain/permissions.ts |
| `R-1.1-3` | Document upload permissions; Receptionist cannot view medical docs after upload | Roles & Permissions | **Server action** | defineAction() RBAC permission check against src/domain/permissions.ts |
| `R-1.1-4` | Booking, reschedule, cancel, waitlist permissions across clinic roles | Roles & Permissions | **Server action** | defineAction() RBAC permission check against src/domain/permissions.ts |
| `R-1.1-5` | Patient check-in permitted for Owner, Manager, Receptionist | Roles & Permissions | **Server action** | defineAction() RBAC permission check against src/domain/permissions.ts |
| `R-1.1-6` | Mark / undo no-show same day permitted for front desk and own clinicians | Roles & Permissions | **Server action** | defineAction() RBAC permission check against src/domain/permissions.ts |
| `R-1.1-7` | Session completion form submission restricted to treating clinician / Owner | Roles & Permissions | **Both** | Server action permission check + appointment_id unique constraint on clinical_notes |
| `R-1.1-8` | Re-opening completed session restricted strictly to Owner | Roles & Permissions | **Both** | Server action Owner role check + 24h edit window trigger trg_clinical_notes_edit_window |
| `R-1.1-9` | Create patient package permitted for Owner, Manager, Receptionist | Roles & Permissions | **Server action** | defineAction() RBAC permission check against src/domain/permissions.ts |
| `R-1.1-10` | Package extension and balance write-off restricted to Owner and Manager | Roles & Permissions | **Both** | Server action Owner/Manager check + package_extensions audit record requirement |
| `R-1.1-11` | Payment recording permitted for Owner, Manager, Receptionist | Roles & Permissions | **Server action** | defineAction() RBAC permission check against src/domain/permissions.ts |
| `R-1.1-12` | Voiding receipt and issuing refund restricted to Owner and Manager | Roles & Permissions | **Both** | Server action Owner/Manager check + payments voided_by_user_id FK & void fields |
| `R-1.1-13` | Price change before payment permitted for front desk with mandatory audit log | Roles & Permissions | **Server action** | defineAction() RBAC permission check against src/domain/permissions.ts |
| `R-1.1-14` | Price change after payment exists restricted to Owner/Manager with audit log | Roles & Permissions | **Server action** | defineAction() RBAC permission check against src/domain/permissions.ts |
| `R-1.1-15` | Adding expenses: today only for Receptionist; anytime for Owner and Manager | Roles & Permissions | **Server action** | defineAction() RBAC permission check against src/domain/permissions.ts |
| `R-1.1-16` | Edit / void expense: Receptionist own same-day before closing; Owner/Manager all | Roles & Permissions | **Server action** | defineAction() RBAC permission check against src/domain/permissions.ts |
| `R-1.1-17` | Expense history and report view permissions; clinicians see own commission only | Roles & Permissions | **Server action** | defineAction() RBAC permission check against src/domain/permissions.ts |
| `R-1.1-18` | Close cash shift permitted for Owner, Manager, Receptionist | Roles & Permissions | **Both** | Server action Receptionist/Owner/Manager check + trg_lock_closed_shift_payments DB trigger |
| `R-1.1-19` | Staff accounts and security restricted to Owner; schedules & rooms to Manager | Roles & Permissions | **Server action** | defineAction() RBAC permission check against src/domain/permissions.ts |
| `R-1.1-20` | Audit log viewing and CSV data exports restricted to Owner and Manager | Roles & Permissions | **Server action** | defineAction() RBAC permission check against src/domain/permissions.ts |
| `R-1.1-21` | Covering access conditions, reason logging, and active login session duration limit | Roles & Permissions | **Both** | Server action covering authorization check + covering_access_logs immutable DB trigger |
| `R-2-1` | Clinic profile configuration: bilingual name, address, phone, logo | Clinic Settings | **Both** | Server action Owner check + clinic_opening_hours unique day_of_week constraint |
| `R-2-2` | Weekly operating hours set per weekday (Sat–Fri) with open/close times, up to 7 days | Clinic Settings | **Both** | Server action Owner check + clinic_opening_hours unique day_of_week constraint |
| `R-2-3` | Clinic closure dates configured with labels (holidays, Eid, etc.) | Clinic Settings | **Both** | Server action closure validation + clinic_closures unique closure_date constraint |
| `R-2-4` | Rooms and beds configuration with active flags; deactivation instead of deletion | Clinic Settings | **Both** | Server action room/bed management + beds unique room_id, name constraint |
| `R-2-5` | Session types duration/pricing; packages cover Physio/Nutrition; assessments standalone | Clinic Settings | **Both** | Server action room/bed management + beds unique room_id, name constraint |
| `R-2-6` | Package default validity duration is 60 calendar days | Clinic Settings | **Both** | Server action session type validation + session_types unique code constraint |
| `R-2-7` | Doctor daily soft limit default 10 appointments (warning only, configurable) | Clinic Settings | **Server action** | WhatsApp click-to-chat URL formatting via message_templates table |
| `R-2-8` | Receipt number sequential prefix configured as INV | Clinic Settings | **Both** | Server action setting validation + clinic_settings singleton model |
| `R-3-1` | Staff profile fields, role assignment, active status, commission setup, language | Staff | **Both** | Server action commission config + users commission_type enum and basis points check |
| `R-3-2` | Clinician weekly schedule configured per weekday with up to 2 shifts per day | Staff | **Both** | Server action schedule validator + trg_staff_schedules_shift_order DB trigger + unique (user_id, day, shift) |
| `R-3-3` | Staff leave recording with date range, leave type (annual, sick, other), and notes | Staff | **Both** | Server action leave booking + staff_leaves date range index |
| `R-3-4` | Staff passwords hashed, no hints, Owner reset requires change at next login, min 8 chars | Staff | **Both** | Server action leave approval + staff_leaves approved_by_user_id FK |
| `R-3-5` | Deactivated staff blocked from login, hidden from booking, history preserved | Staff | **Server action** | Staff profile query excluding inactive staff unless explicitly requested |
| `R-4.1-1` | Patient full name is required, max 120 characters | Patients | **Both** | Server action name validation + patients full_name NOT NULL constraint & sequential file_number UK |
| `R-4.1-2` | Adult mobile phone required, normalized Egyptian mobile, unique via partial index | Patients | **Both** | Server action phone normalization + chk_patients_mobile_phone_format + idx_patients_mobile_phone_unique partial UK |
| `R-4.1-3` | Uses guardian's phone checkbox for child and elderly dependents | Patients | **Both** | Server action dependent validation + chk_patients_dependent_integrity check constraint |
| `R-4.1-4` | Guardian name required when patient uses guardian's phone | Patients | **Both** | Server action dependent validation + chk_patients_dependent_integrity check constraint |
| `R-4.1-5` | Guardian relationship required when patient uses guardian's phone | Patients | **Server action** | Enforced via server action workflow and domain validation |
| `R-4.1-6` | Guardian phone required for dependents, normalized Egyptian mobile, may repeat | Patients | **Both** | Server action dependent validation + chk_patients_dependent_integrity check constraint |
| `R-4.1-7` | WhatsApp number defaults to patient mobile or guardian phone | Patients | **Server action** | Enforced via server action workflow and domain validation |
| `R-4.1-8` | Date of birth required; patient age is dynamically calculated, never stored | Patients | **Both** | patients date_of_birth NOT NULL constraint + age dynamically computed per calculations.md §1.1 |
| `R-4.1-9` | Patient gender is required (male or female) | Patients | **DB constraint** | Gender enum (MALE, FEMALE) NOT NULL column in patients |
| `R-4.1-10` | Patient address optional free text field | Patients | **Server action** | Enforced via server action workflow and domain validation |
| `R-4.1-11` | Emergency contact person name and telephone number | Patients | **Server action** | Enforced via server action workflow and domain validation |
| `R-4.1-12` | Preferred language required (Arabic / English); determines WhatsApp template language | Patients | **Server action** | Enforced via server action workflow and domain validation |
| `R-4.1-13` | Referral source required from predefined channels list | Patients | **Server action** | Enforced via server action workflow and domain validation |
| `R-4.1-14` | Referring doctor optional text field | Patients | **Server action** | Enforced via server action workflow and domain validation |
| `R-4.1-15` | Reason for visit / complaint required; recorded by receptionist (not diagnosis) | Patients | **Server action** | Enforced via server action workflow and domain validation |
| `R-4.1-16` | Medical alerts visible in detail to clinicians; receptionist sees indicator only | Patients | **Both** | Server action alerts filter + patients boolean flags & medical_alerts_notes column |
| `R-4.1-17` | Optional assignment to primary treating physiotherapist | Patients | **Both** | Server action clinician assignment + patients FK to users(id) ON DELETE SET NULL |
| `R-4.1-18` | Optional assignment to primary treating nutritionist | Patients | **Both** | Server action clinician assignment + patients FK to users(id) ON DELETE SET NULL |
| `R-4.1-19` | Patient status lifecycle: lead → active → discharged (automated transitions) | Patients | **Both** | Server action patient status transition + patients status PatientStatus enum & discharge audit columns |
| `R-4.1-20` | Medical data processing consent is mandatory for registration | Patients | **Server action** | Enforced via server action workflow and domain validation |
| `R-4.1-21` | WhatsApp communication consent toggle; shows Opted out if unchecked | Patients | **Server action** | Enforced via server action workflow and domain validation |
| `R-4.1-22` | Clinical diagnosis view and update restricted strictly to clinicians | Patients | **Server action** | Enforced via server action workflow and domain validation |
| `R-4.2-1` | Egyptian phone format normalization and regex validation for mobile and guardian phone | Patients | **Both** | Server action phone normalization + chk_patients_mobile_phone_format + idx_patients_mobile_phone_unique partial UK |
| `R-4.2-2` | Adult mobile uniqueness enforced by DB partial unique index; duplicate shows open file | Patients | **Both** | Server action phone normalization + chk_patients_mobile_phone_format + idx_patients_mobile_phone_unique partial UK |
| `R-4.2-3` | Dependents leave mobilePhone empty; guardianPhone stored normalized and may repeat | Patients | **Both** | Server action dependent validation + chk_patients_dependent_integrity check constraint |
| `R-4.2-4` | Patient search by phone matches both mobilePhone and guardianPhone across family members | Patients | **Both** | trg_patients_prevent_hard_delete blocks DELETE statements; deactivation / discharge only |
| `R-4.2-5` | Similar patient name check using Arabic character normalization triggers warning only | Patients | **Both** | Patient profile search action querying mobile_phone and guardian_phone indexes |
| `R-4.2-6` | Status activates at check-in; discharged set by clinician; re-activates upon booking | Patients | **Both** | Server action patient status transition + patients status PatientStatus enum & discharge audit columns |
| `R-4.2-7` | Treatment sessions do not require a prior consultant assessment | Patients | **Server action** | Enforced via server action workflow and domain validation |
| `R-4.3-1` | Patient profile tab layout and role-based tab access | Patients | **Both** | Full audit logging of all demographic updates via defineAction() & audit_logs |
| `R-5.1-1` | Appointment data fields, duration range (15–180m, step 15m), and pricing | Scheduling | **Both** | Appointment datetime bounds + chk_appointments_duration_step (15..180 % 15 = 0) |
| `R-5.1-2` | Price changes write audit entry with oldPrice, newPrice, user; Owner/Manager after payment | Scheduling | **Both** | Server action price change validator + price_change_history audit table & trigger |
| `R-5.2-1` | Booking rejected if date is a clinic closure or outside opening hours | Scheduling | **Both** | Server action calendar validator + clinic_opening_hours & clinic_closures tables |
| `R-5.2-2` | Booking rejected if clinician is inactive, unscheduled, or on approved leave | Scheduling | **Both** | Server action shift validator + staff_schedules & staff_leaves active rows |
| `R-5.2-3` | Booking rejected if clinician has an active overlapping appointment | Scheduling | **Both** | PostgreSQL exclusion constraint exclude_clinician_time_overlap on appointments (btree_gist) |
| `R-5.2-4` | Booking rejected if bed has an active overlapping appointment | Scheduling | **Both** | PostgreSQL exclusion constraint exclude_bed_time_overlap on appointments (btree_gist) |
| `R-5.2-5` | Booking rejected if patient is booked in another appointment at overlapping time | Scheduling | **Both** | PostgreSQL exclusion constraint exclude_patient_time_overlap on appointments (btree_gist) |
| `R-5.2-6` | Patient daily limit: maximum 1 session per session type per patient per day | Scheduling | **Server action** | Booking action queries active appointments for same patient + date + session_type (max 1) |
| `R-5.2-7` | Package booking validation, available quota calculation, and waitlist session reservation | Scheduling | **Server action** | Available sessions computed dynamically: total - completed - future_booked per calculations.md §4.4 |
| `R-5.2-8` | Session type must match clinician role and assessment privileges | Scheduling | **Both** | Appointment series batch generator running individual slot validation within a single DB transaction |
| `R-5.2-9` | Active appointment definition: status scheduled, arrived, or completed | Scheduling | **Both** | Exclusion constraints filter WHERE (status IN ('SCHEDULED', 'ARRIVED', 'COMPLETED')) |
| `R-5.2-10` | Bed reservation holds for full scheduled duration even if session completed early | Scheduling | **Both** | Exclusion constraint holds through scheduled ends_at boundary (reservation persistence) |
| `R-5.2-11` | Soft warnings allow booking to proceed: doctor daily soft limit, similar patient name | Scheduling | **Server action** | Calendar booking UI queries daily appointment count against clinic_settings.doctor_daily_soft_limit |
| `R-5.2-12` | PostgreSQL btree_gist exclusion constraints physically prevent clinician and bed overlaps | Scheduling | **Both** | Dual exclusion constraints (exclude_clinician_time_overlap and exclude_bed_time_overlap) |
| `R-5.3-1` | Recurring series booking with per-date preview validation and batch confirmation | Scheduling | **Server action** | Appointment reschedule action with slot vacancy check and cancellation_reason |
| `R-5.4-1` | Calendar views: Day view (beds x 15-min slots) and Week view per clinician | Scheduling | **Both** | Cancellation/no-show action records reason in appointments & appointment_status_history |
| `R-5.4-2` | Calendar filtering by clinician, room, session type, and search by name/phone | Scheduling | **Both** | Cancellation/no-show action records reason in appointments & appointment_status_history |
| `R-5.4-3` | Appointment card shows patient, type, clinician, time, payment pill, status color | Scheduling | **Both** | Status transition action records changed_by_user_id & trg_appointment_status_history_immutability |
| `R-5.4-4` | Card click opens action panel; drag & drop restricted to scheduled/arrived with checks | Scheduling | **Server action** | Enforced via server action workflow and domain validation |
| `R-5.4-5` | Calendar waitlist side panel for managing queued patient requests | Scheduling | **Server action** | Enforced via server action workflow and domain validation |
| `R-5.5-1` | Status transition: scheduled → arrived by Reception, stores arrivedAt and lateMinutes | Scheduling | **Both** | AppointmentStatus enum column + appointment state machine validation in src/domain/status/appointment.ts |
| `R-5.5-2` | Status transition: arrived → scheduled (undo check-in) same day with reason | Scheduling | **Server action** | Enforced via server action workflow and domain validation |
| `R-5.5-3` | Status transition: arrived → completed by clinician via completion form, deducts session | Scheduling | **Server action** | Enforced via server action workflow and domain validation |
| `R-5.5-4` | Status transition: scheduled → cancelled with required cancellation reason | Scheduling | **Server action** | Enforced via server action workflow and domain validation |
| `R-5.5-5` | Status transition: arrived → cancelled when patient leaves with reason | Scheduling | **Server action** | Enforced via server action workflow and domain validation |
| `R-5.5-6` | Status transition: scheduled → no_show only after appointment start time with reason | Scheduling | **Server action** | Enforced via server action workflow and domain validation |
| `R-5.5-7` | Status transition: no_show → scheduled (undo no-show) same day with reason | Scheduling | **Server action** | Enforced via server action workflow and domain validation |
| `R-5.5-8` | Status transition: scheduled → waitlisted frees calendar slot, retains package hold | Scheduling | **Server action** | Enforced via server action workflow and domain validation |
| `R-5.5-9` | Status transition: waitlisted → scheduled re-runs full booking and overlap checks | Scheduling | **Server action** | Enforced via server action workflow and domain validation |
| `R-5.5-10` | Status transition: waitlisted → cancelled with reason, releases held package session | Scheduling | **Server action** | Enforced via server action workflow and domain validation |
| `R-5.5-11` | Status transition: completed → arrived re-opened by Owner with reason, restores session | Scheduling | **Server action** | Enforced via server action workflow and domain validation |
| `R-5.5-12` | Undefined status transitions are blocked; cancelled is terminal; all transitions audited | Scheduling | **Server action** | Enforced via server action workflow and domain validation |
| `R-5.5-13` | Standard cancellation/no-show reasons; package sessions never deducted for cancel/no-show | Scheduling | **Server action** | Enforced via server action workflow and domain validation |
| `R-6-1` | Today screen dashboard metrics, upcoming arrivals, waitlist, unpaid and expiring packages | Front Desk | **Server action** | Today dashboard query filters appointments by Cairo date and evaluates package expiry alerts |
| `R-6-2` | Appointment action panel quick operations (no clinical data shown to reception) | Front Desk | **Both** | Check-in server action records check_in_at timestamp on appointment |
| `R-6-3` | Tomorrow's reminder queue with one-click WhatsApp links and reminder sent logging | Front Desk | **Server action** | Front desk action panel generates wa.me click-to-chat URL with pre-filled message template |
| `R-6-4` | WhatsApp wa.me integration, consent check, guardian routing, templates, and placeholders | Front Desk | **Server action** | Front desk quick registration modal with inline duplicate phone check |
| `R-7-1` | Package fields: patient, session type (physio/nutrition), sessions, price, dates, status | Packages | **Both** | Server action package creation + chk_packages_positive_price check constraint |
| `R-7-2` | Package price and session count entered freely with optional suggestions | Packages | **Both** | Server action cancellation requires reason; records cancelled_at and cancellation_reason |
| `R-7-3` | Per-session value formula (totalPrice ÷ totalSessions) for commission, cancellations, refunds | Packages | **Both** | Dynamically computed: floor(total_price_piasters / total_sessions) per calculations.md §4.5 |
| `R-7-4` | Package status calculation: active, completed, expired (sessions forfeited), cancelled | Packages | **Both** | Dynamic status resolution (ACTIVE, COMPLETED, EXPIRED, CANCELLED) per calculations.md §4.3 (never stored in DB) |
| `R-7-5` | Unpaid package balance owed after expiry; write-off requires Owner/Manager with reason | Packages | **Server action** | Billing query maintains package charge balance as strictly owed regardless of expiration |
| `R-7-6` | Package extension (+1–365 days) by Owner/Manager with reason and audit; reactivates expired | Packages | **Both** | Server action extension validation (1..365 days) + package_extensions audit table & FK ON DELETE RESTRICT |
| `R-7-7` | Multiple active packages allowed; booking suggests active package with earliest expiry | Packages | **Server action** | Package session booking binds appointment to package_id, reducing available sessions |
| `R-7-8` | Future bookings dated after package expiry are strictly blocked | Packages | **Server action** | Booking action rejects package bookings if package status resolves to EXPIRED or COMPLETED |
| `R-8.1-1` | Charge created for each package (package price) and non-package appointment (appointment price) | Billing | **Both** | Server action charge creation + chk_charges_positive_amount check constraint |
| `R-8.1-2` | Every payment linked to one charge; no unallocated customer deposits in v1 | Billing | **Both** | Charge balance computed dynamically: max(0, amount - non_voided_payments + refunds) per calculations.md §5.1 |
| `R-8.1-3` | Dynamic balance formula with cancelled package adjustment; balances never stored in DB | Billing | **Server action** | Package cancellation calculates liability: used_sessions * per_session_value |
| `R-8.2-1` | Payment fields, amount bounds (>0 and <= balance), payment methods, and user attribution | Billing | **Both** | Server action payment validation (amount <= balance) + chk_payments_positive_amount check constraint |
| `R-8.2-2` | Receipt number sequential per year generated by transactional DB counter (gapless) | Billing | **Both** | payments receipt_number UNIQUE constraint + trg_generate_receipt_number trigger with receipt_counters table |
| `R-8.2-3` | Receipt annual counter rolls over at Cairo midnight on Jan 1 | Billing | **Both** | payments receipt_number UNIQUE constraint + trg_generate_receipt_number trigger with receipt_counters table |
| `R-8.2-4` | Printable receipt layout (A5 / thermal format, bilingual AR/EN, clinic header) | Billing | **Server action** | Print receipt rendering action (A5 PDF layout with Cairo timestamp & clinic receipt_prefix) |
| `R-8.3-1` | Receipt void by Owner/Manager with required reason; remains struck through, excluded from totals | Billing | **Both** | Void action records voided_at, voided_by_user_id, void_reason + trg_lock_closed_shift_payments trigger |
| `R-8.3-2` | Refund by Owner/Manager; max = paid minus used sessions; expired blocked unless Owner approves | Billing | **Both** | Server action refund ceiling check + chk_refunds_positive_amount check constraint |
| `R-8.3-3` | Cash refund is subtracted from the cash shift closing of the user who handed out cash | Billing | **Both** | Refund records handed_out_by_user_id & optional cash_shift_id FK |
| `R-8.3-4` | Price changes write audit entry; Owner/Manager only after payment and cannot go below paid | Billing | **Both** | Price change history recorded with old/new prices + trg_price_change_history_immutability trigger |
| `R-8.4-1` | Expected cash formula: payments - refunds handed out - expenses recorded by user since closing | Billing | **Both** | Cash closing action records counted_cash_piasters, snapshot expected/difference piasters & includedTransactionIds |
| `R-8.4-2` | System prompts receptionist to close cash shift on logout/switch user if unclosed transactions exist | Billing | **Both** | Cash closing action records counted_cash_piasters, snapshot expected/difference piasters & includedTransactionIds |
| `R-8.4-3` | Records in a completed cash closing are locked from receptionist edit/void | Billing | **DB constraint** | trg_lock_closed_shift_payments & trg_lock_closed_shift_expenses block modifying transactions in closed shifts |
| `R-8.4-4` | Owner/Manager view all closings and variances; non-cash methods listed for reconciliation | Billing | **Both** | Cash closing action requires witness_user_id FK |
| `R-9.1-1` | Pain scale recording (0–10 scale) before and after clinical treatment | Clinical Records | **Both** | Server action validation + chk_clinical_notes_pain_before & chk_clinical_notes_pain_after (0..10) |
| `R-9.1-2` | SOAP clinical note sections: Subjective, Objective, Assessment, Plan | Clinical Records | **Both** | Clinical note SOAP text fields and TreatmentModality enum array column |
| `R-9.1-3` | Treatment modalities multi-select list (TENS, Ultrasound, Laser, Manual therapy, etc.) | Clinical Records | **Both** | Clinical note SOAP text fields and TreatmentModality enum array column |
| `R-9.1-4` | Home exercises text field carried forward from previous session and editable | Clinical Records | **Server action** | Note creation pre-fills home_exercises from patient previous completed clinical note |
| `R-9.1-5` | Session completion form clinical file attachments | Clinical Records | **Server action** | Home exercises printout action formatting patient exercises |
| `R-9.1-6` | Completion form validation requires at least one SOAP field or treatment modality filled | Clinical Records | **Server action** | Clinician workspace queue displaying checked-in patients for today |
| `R-9.1-7` | Form submission transitions appointment to completed and consumes package session | Clinical Records | **Both** | clinical_notes appointment_id UNIQUE constraint (1-to-1 with Appointment) |
| `R-9.2-1` | Author can edit note for 24 hours from completedAt; all edits preserve version history | Clinical Records | **Both** | Author edit creates clinical_note_versions row + trg_clinical_notes_edit_window enforces 24h limit |
| `R-9.2-2` | Clinical notes locked after 24 hours; only addendum notes may be appended | Clinical Records | **Both** | Post-24h remarks require clinical_note_addenda table; original clinical note fields are immutable |
| `R-9.3-1` | Clinicians set and update diagnosis on Clinical tab with change history | Clinical Records | **Both** | patient_diagnoses table with patient_id FK ON DELETE RESTRICT & diagnosed_by_user_id FK |
| `R-9.4-1` | InBody metrics, height pre-fill, auto BMI/BMR, dietary protocol, and progress chart | Clinical Records | **Both** | chk_inbody_records_height & chk_inbody_records_weight; BMI and BMR calculated dynamically per calculations.md §6 |
| `R-9.5-1` | Document categories, private server storage (max 10MB), view audit, watermarking, role filters | Clinical Records | **Both** | chk_patient_documents_file_size (<=10MB) + chk_patient_documents_mime_type + trg_document_view_logs_immutability |
| `R-10-1` | Expense fields: title, category list, amount, method, date, reason, receipt proof, creator | Expenses | **Both** | Server action expense validation + chk_expenses_positive_amount check constraint |
| `R-10-2` | Receptionist can add today's expenses and edit/void own same-day expenses before shift closing | Expenses | **Both** | Cash expense linked to active cash_shift_id + trg_lock_closed_shift_expenses DB trigger |
| `R-10-3` | Owner/Manager manage all expenses; edits preserve history; voiding instead of deletion | Expenses | **Both** | Expense modification creates expense_edit_history row; voiding requires reason |
| `R-11-1` | Commission earned per completed session based on session value and clinician commission type | Commission | **Both** | Commission amount computed per session per calculations.md §5.5 (nearest integer piaster) |
| `R-11-2` | Commission payout generates payout record and expense; sessions marked paid once | Commission | **Both** | commission_payout_sessions partial unique index idx_unique_active_paid_session (WHERE is_voided = false) + expense_id UK |
| `R-11-3` | Clinicians can view their own earned and paid commission totals | Commission | **Both** | Clinician commission summary query filtering earned vs paid totals |
| `R-11-4` | Commission payout void by Owner/Manager with required reason; voids linked expense and releases sessions | Commission | **Both** | Commission payout void by Owner/Manager releases sessions via partial UK and voids linked expense (DEC-026) |
| `R-12-1` | Report period filters: today, this week, this month, and custom date range | Reports | **Server action** | Aggregated analytics queries utilizing database indexes, computing KPIs per calculations.md |
| `R-12-2` | Daily summary report: collections, refunds, expenses, net revenue, sessions, closings | Reports | **Server action** | Aggregated analytics queries utilizing database indexes, computing KPIs per calculations.md |
| `R-12-3` | Outstanding balances report per patient, sorted oldest debt first | Reports | **Server action** | Aggregated analytics queries utilizing database indexes, computing KPIs per calculations.md |
| `R-12-4` | Packages report: active, expiring in 7 days, expired with forfeited sessions | Reports | **Server action** | Aggregated analytics queries utilizing database indexes, computing KPIs per calculations.md |
| `R-12-5` | Clinician performance report: completed sessions, no-shows, utilization rate, commission | Reports | **Server action** | Aggregated analytics queries utilizing database indexes, computing KPIs per calculations.md |
| `R-12-6` | Attendance report: cancellation and no-show rates grouped by reason | Reports | **Server action** | Aggregated analytics queries utilizing database indexes, computing KPIs per calculations.md |
| `R-12-7` | Referral sources report: new patient acquisition volume by source | Reports | **Server action** | Aggregated analytics queries utilizing database indexes, computing KPIs per calculations.md |
| `R-12-8` | CSV export for reports restricted to Owner/Manager, audited, diagnosis strictly excluded | Reports | **Server action** | Aggregated analytics queries utilizing database indexes, computing KPIs per calculations.md |
| `R-13-1` | Comprehensive audit logging across all entities, status changes, finance, and security events | Audit Log | **Both** | defineAction() automatic audit log insertion + trg_audit_logs_immutability DB trigger |
| `R-13-2` | Audit log fields: timestamp, user, role, action, entity, entity id, before/after, reason, IP | Audit Log | **Both** | Audit log stores user_id, action, before_state, after_state, ip_address, user_agent |
| `R-13-3` | Audit log is append-only in dedicated table (no update or delete); viewable and filterable by Owner/Manager | Audit Log | **DB constraint** | audit_logs table has no UPDATE or DELETE triggers; trg_audit_logs_immutability strictly blocks mutation |
| `R-14-1` | In-app check-in notification sent to the assigned clinician | Notifications | **Both** | Server event trigger inserts in_app_notifications record + broadcasts via server-sent events |
| `R-14-2` | Dual-phase late arrival: dashboard alert at >10m overdue; clinician notified upon check-in | Notifications | **Both** | Server event trigger inserts in_app_notifications record + broadcasts via server-sent events |
| `R-14-3` | Appointment reschedule or cancellation notification sent to assigned clinician | Notifications | **Both** | Server event trigger inserts in_app_notifications record + broadcasts via server-sent events |
| `R-14-4` | Low package sessions notification triggered when 1 or 0 sessions remain | Notifications | **Both** | Server event trigger inserts in_app_notifications record + broadcasts via server-sent events |
| `R-14-5` | Package expiry notification triggered when 7 or fewer days remain before expiry | Notifications | **Both** | Server event trigger inserts in_app_notifications record + broadcasts via server-sent events |
| `R-14-6` | Notifications refresh poll interval every 30 seconds; mark as read capability | Notifications | **Both** | Notification mark-as-read action updates is_read = true and read_at timestamp |
| `R-15.1-1` | Email and password authentication with bcrypt/argon2 hashing and min 8 characters | Authentication & Security | **Both** | bcrypt hash comparison in auth action + users password_hash NOT NULL column |
| `R-15.1-2` | Generic login failure error message prevents account enumeration attacks | Authentication & Security | **Both** | Server action lockout logic + users failed_login_count & locked_until columns |
| `R-15.1-3` | Account lockout for 15 minutes after 5 consecutive failed login attempts; Owner notified | Authentication & Security | **Both** | Server action lockout logic + users failed_login_count & locked_until columns |
| `R-15.1-4` | Secure httpOnly cookie expires in 12h; screen auto-locks after 15 min idle | Authentication & Security | **Both** | Authentication server action + security database models |
| `R-15.1-5` | User re-loaded from DB on every server request; deactivations and role changes take effect instantly | Authentication & Security | **Both** | Authentication server action + security database models |
| `R-15.1-6` | Switch user log out and login screen with prompt to close open cash shift | Authentication & Security | **Both** | Authentication server action + security database models |
| `R-15.2-1` | Mandatory TOTP 6-digit 30s code via Authenticator app for all staff logins | Authentication & Security | **Both** | TOTP validation (speakeasy/otplib) + otp_secrets secret_encrypted column (AES-256-GCM) |
| `R-15.2-2` | First login OTP enrollment via QR code; generates 10 hashed single-use backup codes | Authentication & Security | **Both** | Backup code bcrypt verification + otp_backup_codes code_hash column & is_used flag |
| `R-15.2-3` | Two-step login flow: password followed by OTP code or backup code | Authentication & Security | **Both** | Trusted device token validation (30-day expiry) + trusted_devices table |
| `R-15.2-4` | Trusted device cookie skips OTP for 30 days; all trusted devices revocable by Owner | Authentication & Security | **Both** | Authentication server action + security database models |
| `R-15.2-5` | 5 invalid OTP attempts triggers a 15-minute security lockout | Authentication & Security | **Both** | Authentication server action + security database models |
| `R-15.2-6` | Owner can reset staff OTP; forces re-enrollment at next login; action is audited | Authentication & Security | **Both** | Authentication server action + security database models |
| `R-15.2-7` | OTP secrets stored encrypted using server environment encryption key | Authentication & Security | **Both** | Authentication server action + security database models |
| `R-15.3-1` | Password reset via 6-digit email code (10m, max 5 attempts); revokes all sessions/devices | Authentication & Security | **Both** | Password reset code email dispatch + password_reset_codes code_hash & expires_at (10 min) |
| `R-15.3-2` | Email password reset requires SMTP/transactional email provider configured in .env | Authentication & Security | **Both** | Password reset code email dispatch + password_reset_codes code_hash & expires_at (10 min) |
| `R-15.3-3` | If email not configured, Owner manual password reset serves as fallback | Authentication & Security | **Both** | Password reset code email dispatch + password_reset_codes code_hash & expires_at (10 min) |
| `R-15.4-1` | HTTPS only, database isolated from public internet, automated daily off-site backups | Authentication & Security | **Both** | Session middleware idle lock (15 min) & max lifetime (12h) + user_sessions table |
| `R-15.4-2` | Rate limiting enforced on login, OTP verification, and password reset endpoints | Authentication & Security | **Both** | Session middleware idle lock (15 min) & max lifetime (12h) + user_sessions table |
| `R-15.4-3` | Security audit logging for all authentication, lockout, OTP, and device events | Authentication & Security | **Both** | Session middleware idle lock (15 min) & max lifetime (12h) + user_sessions table |
| `R-17-1` | v1 acceptance requires all test checklist items passing on staging and a 2-week pilot | Acceptance | **Server action** | End-to-end acceptance test suite verifying all modules before production launch |

---

## 8. Rule Enforcement Summary Counts

| Enforcement Tier | Count | Percentage | Description |
|---|:---:|:---:|---|
| **Both (DB + Server)** | **115** | **59.3%** | Dual-layer validation (user-friendly validation error + DB integrity guarantee) |
| **Server Action Only** | **75** | **38.7%** | Role permissions (RBAC), UI workflow checks, complex business conditions |
| **DB Constraint Only** | **4** | **2.1%** | Hard schema constraints, immutable audit triggers, exclusion filter definitions |
| **Total Rules Tracked** | **194** | **100.0%** | Full coverage of all rules defined in [rules-index.md](file:///F:/Claude%20CRM/docs/design/rules-index.md) |

