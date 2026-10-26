-- CreateEnum
CREATE TYPE "Role" AS ENUM ('OWNER', 'MANAGER', 'RECEPTIONIST', 'PHYSIOTHERAPIST', 'NUTRITIONIST');

-- CreateEnum
CREATE TYPE "PreferredLanguage" AS ENUM ('AR', 'EN');

-- CreateEnum
CREATE TYPE "OtpStatus" AS ENUM ('NOT_SET', 'PENDING', 'ACTIVE');

-- CreateEnum
CREATE TYPE "CommissionType" AS ENUM ('PERCENT', 'FIXED_PER_SESSION', 'NONE');

-- CreateEnum
CREATE TYPE "SessionCategory" AS ENUM ('PHYSIOTHERAPY', 'NUTRITION', 'CONSULTANT_ASSESSMENT');

-- CreateEnum
CREATE TYPE "LeaveType" AS ENUM ('ANNUAL', 'SICK', 'UNPAID', 'OTHER');

-- CreateEnum
CREATE TYPE "LeaveStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "Gender" AS ENUM ('MALE', 'FEMALE');

-- CreateEnum
CREATE TYPE "PatientStatus" AS ENUM ('LEAD', 'ACTIVE', 'DISCHARGED');

-- CreateEnum
CREATE TYPE "GuardianRelation" AS ENUM ('FATHER', 'MOTHER', 'SON', 'DAUGHTER', 'SPOUSE', 'OTHER');

-- CreateEnum
CREATE TYPE "ReferralSource" AS ENUM ('DOCTOR', 'FACEBOOK', 'INSTAGRAM', 'GOOGLE', 'FRIEND_FAMILY', 'WALK_IN', 'OTHER');

-- CreateEnum
CREATE TYPE "DocumentCategory" AS ENUM ('PRESCRIPTION', 'X_RAY', 'MRI', 'LAB_REPORT', 'REFERRAL', 'ID_ADMINISTRATIVE', 'PAYMENT_PROOF', 'OTHER');

-- CreateEnum
CREATE TYPE "AppointmentStatus" AS ENUM ('SCHEDULED', 'ARRIVED', 'COMPLETED', 'CANCELLED', 'NO_SHOW', 'WAITLISTED');

-- CreateEnum
CREATE TYPE "ReminderChannel" AS ENUM ('WHATSAPP', 'MANUAL_CALL');

-- CreateEnum
CREATE TYPE "ReminderStatus" AS ENUM ('PENDING', 'SENT', 'FAILED', 'DELIVERED', 'READ');

-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('PATIENT_CHECKED_IN', 'PATIENT_LATE_ARRIVAL', 'APPOINTMENT_CANCELLED', 'APPOINTMENT_RESCHEDULED', 'PACKAGE_LOW_SESSIONS', 'PACKAGE_EXPIRING_SOON', 'SYSTEM_ALERT');

-- CreateEnum
CREATE TYPE "PackageStatus" AS ENUM ('ACTIVE', 'COMPLETED', 'EXPIRED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "ChargeStatus" AS ENUM ('ACTIVE', 'CANCELLED');

-- CreateEnum
CREATE TYPE "PaymentMethod" AS ENUM ('CASH', 'INSTAPAY', 'VODAFONE_CASH', 'CARD', 'FAWRY', 'BANK_TRANSFER');

-- CreateEnum
CREATE TYPE "CashShiftStatus" AS ENUM ('OPEN', 'CLOSED');

-- CreateEnum
CREATE TYPE "TreatmentModality" AS ENUM ('TENS', 'ULTRASOUND', 'SHOCKWAVE', 'LASER', 'MANUAL_THERAPY', 'DRY_NEEDLING', 'EXERCISE_THERAPY', 'OTHER');

-- CreateEnum
CREATE TYPE "DietaryProtocol" AS ENUM ('KETO', 'LOW_CARB_ANTI_INFLAMMATORY', 'INTERMITTENT_FASTING', 'SPORTS_NUTRITION', 'DIABETIC_INSULIN_RESISTANCE', 'POST_BARIATRIC', 'BALANCED_LIFESTYLE', 'OTHER');

-- CreateEnum
CREATE TYPE "ExpenseCategory" AS ENUM ('SUPPLIES', 'EQUIPMENT', 'MAINTENANCE', 'RENT', 'UTILITIES', 'SALARIES', 'DOCTOR_COMMISSION', 'HOSPITALITY', 'MARKETING', 'OTHER');

-- CreateTable
CREATE TABLE "clinic_settings" (
    "id" TEXT NOT NULL,
    "name_ar" VARCHAR(120) NOT NULL,
    "name_en" VARCHAR(120) NOT NULL,
    "address_ar" TEXT,
    "address_en" TEXT,
    "phone" VARCHAR(30) NOT NULL,
    "logo_url" TEXT,
    "timezone" VARCHAR(50) NOT NULL DEFAULT 'Africa/Cairo',
    "default_package_expiry_days" INTEGER NOT NULL DEFAULT 60,
    "doctor_daily_soft_limit" INTEGER NOT NULL DEFAULT 10,
    "receipt_prefix" VARCHAR(10) NOT NULL DEFAULT 'INV',
    "note_edit_window_hours" INTEGER NOT NULL DEFAULT 24,
    "updated_by_user_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "clinic_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "clinic_opening_hours" (
    "id" TEXT NOT NULL,
    "day_of_week" INTEGER NOT NULL,
    "is_open" BOOLEAN NOT NULL DEFAULT true,
    "open_time" VARCHAR(5) NOT NULL DEFAULT '09:00',
    "close_time" VARCHAR(5) NOT NULL DEFAULT '21:00',
    "updated_by_user_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "clinic_opening_hours_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "clinic_closures" (
    "id" TEXT NOT NULL,
    "closure_date" DATE NOT NULL,
    "reason_ar" VARCHAR(150) NOT NULL,
    "reason_en" VARCHAR(150) NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_by_user_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "clinic_closures_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rooms" (
    "id" TEXT NOT NULL,
    "name_ar" VARCHAR(100) NOT NULL,
    "name_en" VARCHAR(100) NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_by_user_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "rooms_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "beds" (
    "id" TEXT NOT NULL,
    "room_id" TEXT NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_by_user_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "beds_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "session_types" (
    "id" TEXT NOT NULL,
    "code" VARCHAR(50) NOT NULL,
    "category" "SessionCategory" NOT NULL DEFAULT 'PHYSIOTHERAPY',
    "name_ar" VARCHAR(120) NOT NULL,
    "name_en" VARCHAR(120) NOT NULL,
    "default_duration_minutes" INTEGER NOT NULL DEFAULT 45,
    "default_price_piasters" INTEGER NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_by_user_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "session_types_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" VARCHAR(255) NOT NULL,
    "password_hash" VARCHAR(255) NOT NULL,
    "full_name" VARCHAR(120) NOT NULL,
    "phone" VARCHAR(30) NOT NULL,
    "job_title" VARCHAR(100) NOT NULL,
    "role" "Role" NOT NULL,
    "preferred_language" "PreferredLanguage" NOT NULL DEFAULT 'AR',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "deactivated_at" TIMESTAMP(3),
    "must_change_password" BOOLEAN NOT NULL DEFAULT false,
    "failed_login_count" INTEGER NOT NULL DEFAULT 0,
    "locked_until" TIMESTAMP(3),
    "otp_status" "OtpStatus" NOT NULL DEFAULT 'NOT_SET',
    "can_assess" BOOLEAN NOT NULL DEFAULT false,
    "commission_type" "CommissionType" NOT NULL DEFAULT 'NONE',
    "commission_percent_basis_points" INTEGER NOT NULL DEFAULT 0,
    "commission_fixed_piasters" INTEGER NOT NULL DEFAULT 0,
    "created_by_user_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "staff_schedules" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "day_of_week" INTEGER NOT NULL,
    "shift_number" INTEGER NOT NULL,
    "is_working" BOOLEAN NOT NULL DEFAULT true,
    "start_time" VARCHAR(5) NOT NULL,
    "end_time" VARCHAR(5) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "staff_schedules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "staff_leaves" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "start_date" DATE NOT NULL,
    "end_date" DATE NOT NULL,
    "leave_type" "LeaveType" NOT NULL,
    "status" "LeaveStatus" NOT NULL DEFAULT 'APPROVED',
    "note" TEXT,
    "approved_by_user_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "staff_leaves_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "login_attempts" (
    "id" TEXT NOT NULL,
    "email" VARCHAR(255) NOT NULL,
    "ip_address" VARCHAR(45) NOT NULL,
    "user_agent" TEXT,
    "is_successful" BOOLEAN NOT NULL,
    "failure_reason" VARCHAR(100),
    "attempted_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "login_attempts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_sessions" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "token_hash" VARCHAR(255) NOT NULL,
    "ip_address" VARCHAR(45) NOT NULL,
    "user_agent" TEXT,
    "last_active_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "is_revoked" BOOLEAN NOT NULL DEFAULT false,
    "revoked_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "otp_secrets" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "secret_encrypted" TEXT NOT NULL,
    "verified_at" TIMESTAMP(3),
    "failed_otp_attempts" INTEGER NOT NULL DEFAULT 0,
    "otp_locked_until" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "otp_secrets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "otp_backup_codes" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "code_hash" VARCHAR(255) NOT NULL,
    "is_used" BOOLEAN NOT NULL DEFAULT false,
    "used_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "otp_backup_codes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "trusted_devices" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "device_token_hash" VARCHAR(255) NOT NULL,
    "device_name" VARCHAR(120) NOT NULL,
    "ip_address" VARCHAR(45) NOT NULL,
    "user_agent" TEXT,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "is_revoked" BOOLEAN NOT NULL DEFAULT false,
    "revoked_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "trusted_devices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "password_reset_codes" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "code_hash" VARCHAR(255) NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "attempts_count" INTEGER NOT NULL DEFAULT 0,
    "is_used" BOOLEAN NOT NULL DEFAULT false,
    "used_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "password_reset_codes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "message_templates" (
    "id" TEXT NOT NULL,
    "key" VARCHAR(50) NOT NULL,
    "language" "PreferredLanguage" NOT NULL,
    "template_text" TEXT NOT NULL,
    "updated_by_user_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "message_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "user_id" TEXT,
    "user_role" VARCHAR(50),
    "action" VARCHAR(100) NOT NULL,
    "entity_type" VARCHAR(100) NOT NULL,
    "entity_id" VARCHAR(100),
    "before_state" JSONB,
    "after_state" JSONB,
    "reason" TEXT,
    "ip_address" VARCHAR(45),
    "user_agent" TEXT,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "patients" (
    "id" TEXT NOT NULL,
    "file_number" SERIAL NOT NULL,
    "full_name" VARCHAR(120) NOT NULL,
    "mobile_phone" VARCHAR(15),
    "is_dependent" BOOLEAN NOT NULL DEFAULT false,
    "guardian_name" VARCHAR(120),
    "guardian_relation" "GuardianRelation",
    "guardian_phone" VARCHAR(15),
    "whatsapp_phone" VARCHAR(15),
    "date_of_birth" DATE NOT NULL,
    "gender" "Gender" NOT NULL,
    "address" TEXT,
    "emergency_contact_name" VARCHAR(120),
    "emergency_contact_phone" VARCHAR(30),
    "preferred_language" "PreferredLanguage" NOT NULL DEFAULT 'AR',
    "referral_source" "ReferralSource" NOT NULL,
    "referral_source_details" VARCHAR(255),
    "referring_doctor" VARCHAR(120),
    "initial_complaint" TEXT NOT NULL,
    "has_diabetes" BOOLEAN NOT NULL DEFAULT false,
    "has_pacemaker" BOOLEAN NOT NULL DEFAULT false,
    "has_hypertension" BOOLEAN NOT NULL DEFAULT false,
    "has_osteoporosis" BOOLEAN NOT NULL DEFAULT false,
    "has_fall_risk" BOOLEAN NOT NULL DEFAULT false,
    "is_pregnant" BOOLEAN NOT NULL DEFAULT false,
    "medical_alerts_notes" TEXT,
    "assigned_physiotherapist_id" TEXT,
    "assigned_nutritionist_id" TEXT,
    "status" "PatientStatus" NOT NULL DEFAULT 'LEAD',
    "data_consent" BOOLEAN NOT NULL DEFAULT false,
    "data_consent_date" TIMESTAMP(3),
    "whatsapp_consent" BOOLEAN NOT NULL DEFAULT true,
    "reception_notes" TEXT,
    "first_visit_at" TIMESTAMP(3),
    "discharged_at" TIMESTAMP(3),
    "discharged_by_user_id" TEXT,
    "discharge_reason" TEXT,
    "created_by_user_id" TEXT,
    "updated_by_user_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "patients_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "patient_diagnoses" (
    "id" TEXT NOT NULL,
    "patient_id" TEXT NOT NULL,
    "diagnosis_text" TEXT NOT NULL,
    "diagnosed_by_user_id" TEXT NOT NULL,
    "diagnosed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "resolved_at" TIMESTAMP(3),
    "notes" TEXT,
    "created_by_user_id" TEXT,
    "updated_by_user_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "patient_diagnoses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "patient_documents" (
    "id" TEXT NOT NULL,
    "patient_id" TEXT NOT NULL,
    "category" "DocumentCategory" NOT NULL,
    "title" VARCHAR(150) NOT NULL,
    "file_key" VARCHAR(500) NOT NULL,
    "file_name" VARCHAR(255) NOT NULL,
    "file_size_bytes" INTEGER NOT NULL,
    "mime_type" VARCHAR(100) NOT NULL,
    "is_medical" BOOLEAN NOT NULL DEFAULT true,
    "uploaded_by_user_id" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "voided_at" TIMESTAMP(3),
    "void_reason" TEXT,
    "created_by_user_id" TEXT,
    "updated_by_user_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "patient_documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "document_view_logs" (
    "id" TEXT NOT NULL,
    "document_id" TEXT NOT NULL,
    "viewed_by_user_id" TEXT NOT NULL,
    "viewed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "watermark_applied" BOOLEAN NOT NULL DEFAULT true,
    "ip_address" VARCHAR(45) NOT NULL,
    "user_agent" TEXT,

    CONSTRAINT "document_view_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "covering_access_logs" (
    "id" TEXT NOT NULL,
    "patient_id" TEXT NOT NULL,
    "clinician_id" TEXT NOT NULL,
    "session_id" TEXT,
    "reason" TEXT NOT NULL,
    "granted_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "ip_address" VARCHAR(45) NOT NULL,
    "user_agent" TEXT,

    CONSTRAINT "covering_access_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "appointments" (
    "id" TEXT NOT NULL,
    "patient_id" TEXT NOT NULL,
    "session_type_id" TEXT NOT NULL,
    "clinician_id" TEXT NOT NULL,
    "room_id" TEXT NOT NULL,
    "bed_id" TEXT NOT NULL,
    "series_id" TEXT,
    "package_id" TEXT,
    "appointment_date" DATE NOT NULL,
    "start_time" VARCHAR(5) NOT NULL,
    "end_time" VARCHAR(5) NOT NULL,
    "starts_at" TIMESTAMP(3) NOT NULL,
    "ends_at" TIMESTAMP(3) NOT NULL,
    "duration_minutes" INTEGER NOT NULL DEFAULT 45,
    "price_piasters" INTEGER,
    "status" "AppointmentStatus" NOT NULL DEFAULT 'SCHEDULED',
    "notes_for_reception" TEXT,
    "check_in_at" TIMESTAMP(3),
    "completed_at" TIMESTAMP(3),
    "cancelled_at" TIMESTAMP(3),
    "cancellation_reason" TEXT,
    "no_show_at" TIMESTAMP(3),
    "no_show_reason" TEXT,
    "created_by_user_id" TEXT,
    "updated_by_user_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "appointments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "appointment_series" (
    "id" TEXT NOT NULL,
    "patient_id" TEXT NOT NULL,
    "session_type_id" TEXT NOT NULL,
    "clinician_id" TEXT NOT NULL,
    "room_id" TEXT NOT NULL,
    "bed_id" TEXT NOT NULL,
    "days_of_week" INTEGER[],
    "start_time" VARCHAR(5) NOT NULL,
    "duration_minutes" INTEGER NOT NULL DEFAULT 45,
    "total_sessions" INTEGER NOT NULL,
    "start_date" DATE NOT NULL,
    "end_date" DATE,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_by_user_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "appointment_series_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "appointment_status_history" (
    "id" TEXT NOT NULL,
    "appointment_id" TEXT NOT NULL,
    "from_status" "AppointmentStatus",
    "to_status" "AppointmentStatus" NOT NULL,
    "changed_by_user_id" TEXT,
    "reason" TEXT,
    "transitioned_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ip_address" VARCHAR(45),
    "user_agent" TEXT,

    CONSTRAINT "appointment_status_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "appointment_reminders" (
    "id" TEXT NOT NULL,
    "appointment_id" TEXT NOT NULL,
    "channel" "ReminderChannel" NOT NULL DEFAULT 'WHATSAPP',
    "recipient_phone" VARCHAR(30) NOT NULL,
    "sent_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" "ReminderStatus" NOT NULL DEFAULT 'PENDING',
    "error_message" TEXT,
    "template_key" VARCHAR(50),
    "sent_by_user_id" TEXT,

    CONSTRAINT "appointment_reminders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "in_app_notifications" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "type" "NotificationType" NOT NULL,
    "title_ar" VARCHAR(150) NOT NULL,
    "title_en" VARCHAR(150) NOT NULL,
    "body_ar" TEXT NOT NULL,
    "body_en" TEXT NOT NULL,
    "appointment_id" TEXT,
    "patient_id" TEXT,
    "is_read" BOOLEAN NOT NULL DEFAULT false,
    "read_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "in_app_notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "packages" (
    "id" TEXT NOT NULL,
    "patient_id" TEXT NOT NULL,
    "session_type_id" TEXT NOT NULL,
    "total_sessions" INTEGER NOT NULL,
    "total_price_piasters" INTEGER NOT NULL,
    "start_date" DATE NOT NULL,
    "expiry_date" DATE NOT NULL,
    "notes" TEXT,
    "cancelled_at" TIMESTAMP(3),
    "cancellation_reason" TEXT,
    "created_by_user_id" TEXT,
    "updated_by_user_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "packages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "package_extensions" (
    "id" TEXT NOT NULL,
    "package_id" TEXT NOT NULL,
    "previous_expiry_date" DATE NOT NULL,
    "new_expiry_date" DATE NOT NULL,
    "days_added" INTEGER NOT NULL,
    "reason" TEXT NOT NULL,
    "extended_by_user_id" TEXT NOT NULL,
    "extended_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "package_extensions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "charges" (
    "id" TEXT NOT NULL,
    "patient_id" TEXT NOT NULL,
    "package_id" TEXT,
    "appointment_id" TEXT,
    "amount_piasters" INTEGER NOT NULL,
    "description" VARCHAR(200) NOT NULL,
    "status" "ChargeStatus" NOT NULL DEFAULT 'ACTIVE',
    "created_by_user_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "charges_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payments" (
    "id" TEXT NOT NULL,
    "charge_id" TEXT NOT NULL,
    "receipt_number" VARCHAR(30) NOT NULL,
    "receipt_year" INTEGER NOT NULL,
    "receipt_sequence" INTEGER NOT NULL,
    "amount_piasters" INTEGER NOT NULL,
    "payment_method" "PaymentMethod" NOT NULL,
    "cash_shift_id" TEXT,
    "is_voided" BOOLEAN NOT NULL DEFAULT false,
    "voided_at" TIMESTAMP(3),
    "void_reason" TEXT,
    "voided_by_user_id" TEXT,
    "collected_by_user_id" TEXT NOT NULL,
    "collected_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "receipt_counters" (
    "id" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "last_value" INTEGER NOT NULL DEFAULT 0,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "receipt_counters_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "refunds" (
    "id" TEXT NOT NULL,
    "charge_id" TEXT NOT NULL,
    "payment_id" TEXT,
    "amount_piasters" INTEGER NOT NULL,
    "refund_method" "PaymentMethod" NOT NULL,
    "handed_out_by_user_id" TEXT NOT NULL,
    "cash_shift_id" TEXT,
    "reason" TEXT NOT NULL,
    "approved_by_user_id" TEXT NOT NULL,
    "refunded_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "refunds_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "write_offs" (
    "id" TEXT NOT NULL,
    "charge_id" TEXT NOT NULL,
    "amount_piasters" INTEGER NOT NULL,
    "reason" TEXT NOT NULL,
    "approved_by_user_id" TEXT NOT NULL,
    "written_off_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "write_offs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "price_change_history" (
    "id" TEXT NOT NULL,
    "entity_type" VARCHAR(50) NOT NULL,
    "entity_id" VARCHAR(100) NOT NULL,
    "appointment_id" TEXT,
    "charge_id" TEXT,
    "package_id" TEXT,
    "old_price_piasters" INTEGER NOT NULL,
    "new_price_piasters" INTEGER NOT NULL,
    "reason" TEXT NOT NULL,
    "changed_by_user_id" TEXT NOT NULL,
    "changed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "price_change_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cash_closings" (
    "id" TEXT NOT NULL,
    "shift_number" INTEGER NOT NULL,
    "cashier_user_id" TEXT NOT NULL,
    "opened_at" TIMESTAMP(3) NOT NULL,
    "closed_at" TIMESTAMP(3),
    "status" "CashShiftStatus" NOT NULL DEFAULT 'OPEN',
    "counted_cash_piasters" INTEGER,
    "expected_cash_piasters" INTEGER,
    "difference_piasters" INTEGER,
    "included_transaction_ids" JSONB,
    "closing_notes" TEXT,
    "witness_user_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cash_closings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "clinical_notes" (
    "id" TEXT NOT NULL,
    "appointment_id" TEXT NOT NULL,
    "patient_id" TEXT NOT NULL,
    "clinician_id" TEXT NOT NULL,
    "pain_before" INTEGER NOT NULL,
    "pain_after" INTEGER NOT NULL,
    "subjective" TEXT,
    "objective" TEXT,
    "assessment" TEXT,
    "plan" TEXT,
    "treatment_modalities" "TreatmentModality"[],
    "treatment_notes" TEXT,
    "home_exercises" TEXT,
    "completed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "is_locked" BOOLEAN NOT NULL DEFAULT false,
    "is_voided" BOOLEAN NOT NULL DEFAULT false,
    "void_reason" TEXT,
    "voided_at" TIMESTAMP(3),
    "voided_by_user_id" TEXT,
    "created_by_user_id" TEXT,
    "updated_by_user_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "clinical_notes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "clinical_note_versions" (
    "id" TEXT NOT NULL,
    "note_id" TEXT NOT NULL,
    "version_number" INTEGER NOT NULL,
    "pain_before" INTEGER NOT NULL,
    "pain_after" INTEGER NOT NULL,
    "subjective" TEXT,
    "objective" TEXT,
    "assessment" TEXT,
    "plan" TEXT,
    "treatment_modalities" "TreatmentModality"[],
    "treatment_notes" TEXT,
    "home_exercises" TEXT,
    "edited_by_user_id" TEXT NOT NULL,
    "edited_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "change_summary" TEXT,

    CONSTRAINT "clinical_note_versions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "clinical_note_addenda" (
    "id" TEXT NOT NULL,
    "note_id" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "author_id" TEXT NOT NULL,
    "is_voided" BOOLEAN NOT NULL DEFAULT false,
    "void_reason" TEXT,
    "voided_at" TIMESTAMP(3),
    "voided_by_user_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "clinical_note_addenda_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "inbody_records" (
    "id" TEXT NOT NULL,
    "patient_id" TEXT NOT NULL,
    "appointment_id" TEXT,
    "test_date" TIMESTAMP(3) NOT NULL,
    "height_cm" DECIMAL(5,1) NOT NULL,
    "weight_kg" DECIMAL(5,2) NOT NULL,
    "target_weight_kg" DECIMAL(5,2),
    "skeletal_muscle_mass_kg" DECIMAL(5,2),
    "body_fat_percentage" DECIMAL(4,1),
    "visceral_fat_level" INTEGER,
    "device_bmr_kcal" INTEGER,
    "calorie_target_kcal" INTEGER,
    "target_protein_grams" INTEGER,
    "target_carbs_grams" INTEGER,
    "target_fat_grams" INTEGER,
    "protocol" "DietaryProtocol" NOT NULL DEFAULT 'BALANCED_LIFESTYLE',
    "protocol_notes" TEXT,
    "clinical_notes" TEXT,
    "recorded_by_user_id" TEXT NOT NULL,
    "is_voided" BOOLEAN NOT NULL DEFAULT false,
    "void_reason" TEXT,
    "voided_at" TIMESTAMP(3),
    "voided_by_user_id" TEXT,
    "created_by_user_id" TEXT,
    "updated_by_user_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "inbody_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "expenses" (
    "id" TEXT NOT NULL,
    "title" VARCHAR(150) NOT NULL,
    "category" "ExpenseCategory" NOT NULL,
    "amount_piasters" INTEGER NOT NULL,
    "payment_method" "PaymentMethod" NOT NULL,
    "expense_date" TIMESTAMP(3) NOT NULL,
    "reason" TEXT,
    "receipt_file_key" VARCHAR(500),
    "cash_shift_id" TEXT,
    "is_voided" BOOLEAN NOT NULL DEFAULT false,
    "void_reason" TEXT,
    "voided_at" TIMESTAMP(3),
    "voided_by_user_id" TEXT,
    "created_by_user_id" TEXT NOT NULL,
    "updated_by_user_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "expenses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "expense_edit_history" (
    "id" TEXT NOT NULL,
    "expense_id" TEXT NOT NULL,
    "previous_title" VARCHAR(150) NOT NULL,
    "previous_category" "ExpenseCategory" NOT NULL,
    "previous_amount_piasters" INTEGER NOT NULL,
    "previous_payment_method" "PaymentMethod" NOT NULL,
    "previous_expense_date" TIMESTAMP(3) NOT NULL,
    "previous_reason" TEXT,
    "edited_by_user_id" TEXT NOT NULL,
    "edited_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "edit_reason" TEXT NOT NULL,

    CONSTRAINT "expense_edit_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "commission_payouts" (
    "id" TEXT NOT NULL,
    "clinician_id" TEXT NOT NULL,
    "period_start_date" TIMESTAMP(3) NOT NULL,
    "period_end_date" TIMESTAMP(3) NOT NULL,
    "total_payout_piasters" INTEGER NOT NULL,
    "payment_method" "PaymentMethod" NOT NULL,
    "payout_date" TIMESTAMP(3) NOT NULL,
    "expense_id" TEXT,
    "notes" TEXT,
    "is_voided" BOOLEAN NOT NULL DEFAULT false,
    "void_reason" TEXT,
    "voided_at" TIMESTAMP(3),
    "voided_by_user_id" TEXT,
    "created_by_user_id" TEXT NOT NULL,
    "updated_by_user_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "commission_payouts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "commission_payout_sessions" (
    "id" TEXT NOT NULL,
    "payout_id" TEXT NOT NULL,
    "appointment_id" TEXT NOT NULL,
    "session_value_piasters" INTEGER NOT NULL,
    "commission_rate_snapshot" DECIMAL(5,2) NOT NULL,
    "commission_amount_piasters" INTEGER NOT NULL,
    "is_voided" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "commission_payout_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "clinic_opening_hours_day_of_week_key" ON "clinic_opening_hours"("day_of_week");

-- CreateIndex
CREATE UNIQUE INDEX "clinic_closures_closure_date_key" ON "clinic_closures"("closure_date");

-- CreateIndex
CREATE UNIQUE INDEX "beds_room_id_name_key" ON "beds"("room_id", "name");

-- CreateIndex
CREATE UNIQUE INDEX "session_types_code_key" ON "session_types"("code");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "staff_schedules_user_id_day_of_week_shift_number_key" ON "staff_schedules"("user_id", "day_of_week", "shift_number");

-- CreateIndex
CREATE INDEX "staff_leaves_user_id_start_date_end_date_idx" ON "staff_leaves"("user_id", "start_date", "end_date");

-- CreateIndex
CREATE INDEX "login_attempts_email_attempted_at_idx" ON "login_attempts"("email", "attempted_at");

-- CreateIndex
CREATE INDEX "login_attempts_ip_address_attempted_at_idx" ON "login_attempts"("ip_address", "attempted_at");

-- CreateIndex
CREATE UNIQUE INDEX "user_sessions_token_hash_key" ON "user_sessions"("token_hash");

-- CreateIndex
CREATE INDEX "user_sessions_user_id_is_revoked_idx" ON "user_sessions"("user_id", "is_revoked");

-- CreateIndex
CREATE UNIQUE INDEX "otp_secrets_user_id_key" ON "otp_secrets"("user_id");

-- CreateIndex
CREATE INDEX "otp_backup_codes_user_id_is_used_idx" ON "otp_backup_codes"("user_id", "is_used");

-- CreateIndex
CREATE UNIQUE INDEX "trusted_devices_device_token_hash_key" ON "trusted_devices"("device_token_hash");

-- CreateIndex
CREATE INDEX "trusted_devices_user_id_is_revoked_idx" ON "trusted_devices"("user_id", "is_revoked");

-- CreateIndex
CREATE INDEX "password_reset_codes_user_id_is_used_idx" ON "password_reset_codes"("user_id", "is_used");

-- CreateIndex
CREATE UNIQUE INDEX "message_templates_key_language_key" ON "message_templates"("key", "language");

-- CreateIndex
CREATE INDEX "audit_logs_user_id_created_at_idx" ON "audit_logs"("user_id", "created_at");

-- CreateIndex
CREATE INDEX "audit_logs_entity_type_entity_id_idx" ON "audit_logs"("entity_type", "entity_id");

-- CreateIndex
CREATE INDEX "audit_logs_action_created_at_idx" ON "audit_logs"("action", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "patients_file_number_key" ON "patients"("file_number");

-- CreateIndex
CREATE INDEX "patients_full_name_idx" ON "patients"("full_name");

-- CreateIndex
CREATE INDEX "patients_mobile_phone_idx" ON "patients"("mobile_phone");

-- CreateIndex
CREATE INDEX "patients_guardian_phone_idx" ON "patients"("guardian_phone");

-- CreateIndex
CREATE INDEX "patients_status_idx" ON "patients"("status");

-- CreateIndex
CREATE INDEX "patients_assigned_physiotherapist_id_idx" ON "patients"("assigned_physiotherapist_id");

-- CreateIndex
CREATE INDEX "patients_assigned_nutritionist_id_idx" ON "patients"("assigned_nutritionist_id");

-- CreateIndex
CREATE INDEX "patient_diagnoses_patient_id_is_active_idx" ON "patient_diagnoses"("patient_id", "is_active");

-- CreateIndex
CREATE INDEX "patient_diagnoses_diagnosed_by_user_id_idx" ON "patient_diagnoses"("diagnosed_by_user_id");

-- CreateIndex
CREATE INDEX "patient_documents_patient_id_category_idx" ON "patient_documents"("patient_id", "category");

-- CreateIndex
CREATE INDEX "patient_documents_uploaded_by_user_id_idx" ON "patient_documents"("uploaded_by_user_id");

-- CreateIndex
CREATE INDEX "patient_documents_is_active_idx" ON "patient_documents"("is_active");

-- CreateIndex
CREATE INDEX "document_view_logs_document_id_viewed_at_idx" ON "document_view_logs"("document_id", "viewed_at");

-- CreateIndex
CREATE INDEX "document_view_logs_viewed_by_user_id_viewed_at_idx" ON "document_view_logs"("viewed_by_user_id", "viewed_at");

-- CreateIndex
CREATE INDEX "covering_access_logs_clinician_id_patient_id_granted_at_idx" ON "covering_access_logs"("clinician_id", "patient_id", "granted_at");

-- CreateIndex
CREATE INDEX "covering_access_logs_session_id_idx" ON "covering_access_logs"("session_id");

-- CreateIndex
CREATE INDEX "appointments_patient_id_appointment_date_idx" ON "appointments"("patient_id", "appointment_date");

-- CreateIndex
CREATE INDEX "appointments_clinician_id_starts_at_ends_at_idx" ON "appointments"("clinician_id", "starts_at", "ends_at");

-- CreateIndex
CREATE INDEX "appointments_bed_id_starts_at_ends_at_idx" ON "appointments"("bed_id", "starts_at", "ends_at");

-- CreateIndex
CREATE INDEX "appointments_appointment_date_status_idx" ON "appointments"("appointment_date", "status");

-- CreateIndex
CREATE INDEX "appointments_room_id_appointment_date_idx" ON "appointments"("room_id", "appointment_date");

-- CreateIndex
CREATE INDEX "appointments_clinician_id_appointment_date_status_idx" ON "appointments"("clinician_id", "appointment_date", "status");

-- CreateIndex
CREATE INDEX "appointments_series_id_idx" ON "appointments"("series_id");

-- CreateIndex
CREATE INDEX "appointment_series_patient_id_idx" ON "appointment_series"("patient_id");

-- CreateIndex
CREATE INDEX "appointment_series_clinician_id_idx" ON "appointment_series"("clinician_id");

-- CreateIndex
CREATE INDEX "appointment_status_history_appointment_id_transitioned_at_idx" ON "appointment_status_history"("appointment_id", "transitioned_at");

-- CreateIndex
CREATE INDEX "appointment_status_history_changed_by_user_id_transitioned__idx" ON "appointment_status_history"("changed_by_user_id", "transitioned_at");

-- CreateIndex
CREATE INDEX "appointment_reminders_appointment_id_sent_at_idx" ON "appointment_reminders"("appointment_id", "sent_at");

-- CreateIndex
CREATE INDEX "appointment_reminders_status_idx" ON "appointment_reminders"("status");

-- CreateIndex
CREATE INDEX "in_app_notifications_user_id_is_read_created_at_idx" ON "in_app_notifications"("user_id", "is_read", "created_at");

-- CreateIndex
CREATE INDEX "packages_patient_id_cancelled_at_idx" ON "packages"("patient_id", "cancelled_at");

-- CreateIndex
CREATE INDEX "packages_expiry_date_cancelled_at_idx" ON "packages"("expiry_date", "cancelled_at");

-- CreateIndex
CREATE INDEX "package_extensions_package_id_idx" ON "package_extensions"("package_id");

-- CreateIndex
CREATE INDEX "package_extensions_extended_by_user_id_idx" ON "package_extensions"("extended_by_user_id");

-- CreateIndex
CREATE INDEX "charges_patient_id_status_idx" ON "charges"("patient_id", "status");

-- CreateIndex
CREATE INDEX "charges_package_id_idx" ON "charges"("package_id");

-- CreateIndex
CREATE INDEX "charges_appointment_id_idx" ON "charges"("appointment_id");

-- CreateIndex
CREATE UNIQUE INDEX "payments_receipt_number_key" ON "payments"("receipt_number");

-- CreateIndex
CREATE INDEX "payments_charge_id_is_voided_idx" ON "payments"("charge_id", "is_voided");

-- CreateIndex
CREATE INDEX "payments_collected_by_user_id_collected_at_idx" ON "payments"("collected_by_user_id", "collected_at");

-- CreateIndex
CREATE INDEX "payments_collected_at_is_voided_idx" ON "payments"("collected_at", "is_voided");

-- CreateIndex
CREATE INDEX "payments_cash_shift_id_idx" ON "payments"("cash_shift_id");

-- CreateIndex
CREATE INDEX "payments_payment_method_idx" ON "payments"("payment_method");

-- CreateIndex
CREATE UNIQUE INDEX "receipt_counters_year_key" ON "receipt_counters"("year");

-- CreateIndex
CREATE INDEX "refunds_charge_id_idx" ON "refunds"("charge_id");

-- CreateIndex
CREATE INDEX "refunds_handed_out_by_user_id_idx" ON "refunds"("handed_out_by_user_id");

-- CreateIndex
CREATE INDEX "refunds_cash_shift_id_idx" ON "refunds"("cash_shift_id");

-- CreateIndex
CREATE INDEX "write_offs_charge_id_idx" ON "write_offs"("charge_id");

-- CreateIndex
CREATE INDEX "price_change_history_entity_type_entity_id_idx" ON "price_change_history"("entity_type", "entity_id");

-- CreateIndex
CREATE INDEX "price_change_history_changed_by_user_id_changed_at_idx" ON "price_change_history"("changed_by_user_id", "changed_at");

-- CreateIndex
CREATE INDEX "cash_closings_cashier_user_id_status_idx" ON "cash_closings"("cashier_user_id", "status");

-- CreateIndex
CREATE INDEX "cash_closings_cashier_user_id_opened_at_closed_at_idx" ON "cash_closings"("cashier_user_id", "opened_at", "closed_at");

-- CreateIndex
CREATE INDEX "cash_closings_opened_at_closed_at_idx" ON "cash_closings"("opened_at", "closed_at");

-- CreateIndex
CREATE UNIQUE INDEX "clinical_notes_appointment_id_key" ON "clinical_notes"("appointment_id");

-- CreateIndex
CREATE INDEX "clinical_notes_patient_id_completed_at_idx" ON "clinical_notes"("patient_id", "completed_at");

-- CreateIndex
CREATE INDEX "clinical_notes_clinician_id_idx" ON "clinical_notes"("clinician_id");

-- CreateIndex
CREATE INDEX "clinical_notes_is_voided_idx" ON "clinical_notes"("is_voided");

-- CreateIndex
CREATE INDEX "clinical_note_versions_note_id_idx" ON "clinical_note_versions"("note_id");

-- CreateIndex
CREATE INDEX "clinical_note_versions_edited_by_user_id_idx" ON "clinical_note_versions"("edited_by_user_id");

-- CreateIndex
CREATE UNIQUE INDEX "clinical_note_versions_note_id_version_number_key" ON "clinical_note_versions"("note_id", "version_number");

-- CreateIndex
CREATE INDEX "clinical_note_addenda_note_id_idx" ON "clinical_note_addenda"("note_id");

-- CreateIndex
CREATE INDEX "clinical_note_addenda_author_id_idx" ON "clinical_note_addenda"("author_id");

-- CreateIndex
CREATE UNIQUE INDEX "inbody_records_appointment_id_key" ON "inbody_records"("appointment_id");

-- CreateIndex
CREATE INDEX "inbody_records_patient_id_test_date_idx" ON "inbody_records"("patient_id", "test_date");

-- CreateIndex
CREATE INDEX "inbody_records_recorded_by_user_id_idx" ON "inbody_records"("recorded_by_user_id");

-- CreateIndex
CREATE INDEX "inbody_records_is_voided_idx" ON "inbody_records"("is_voided");

-- CreateIndex
CREATE INDEX "expenses_category_expense_date_idx" ON "expenses"("category", "expense_date");

-- CreateIndex
CREATE INDEX "expenses_expense_date_is_voided_idx" ON "expenses"("expense_date", "is_voided");

-- CreateIndex
CREATE INDEX "expenses_cash_shift_id_idx" ON "expenses"("cash_shift_id");

-- CreateIndex
CREATE INDEX "expenses_created_by_user_id_idx" ON "expenses"("created_by_user_id");

-- CreateIndex
CREATE INDEX "expenses_is_voided_idx" ON "expenses"("is_voided");

-- CreateIndex
CREATE INDEX "expense_edit_history_expense_id_idx" ON "expense_edit_history"("expense_id");

-- CreateIndex
CREATE INDEX "expense_edit_history_edited_by_user_id_idx" ON "expense_edit_history"("edited_by_user_id");

-- CreateIndex
CREATE UNIQUE INDEX "commission_payouts_expense_id_key" ON "commission_payouts"("expense_id");

-- CreateIndex
CREATE INDEX "commission_payouts_clinician_id_payout_date_idx" ON "commission_payouts"("clinician_id", "payout_date");

-- CreateIndex
CREATE INDEX "commission_payouts_is_voided_idx" ON "commission_payouts"("is_voided");

-- CreateIndex
CREATE UNIQUE INDEX "commission_payout_sessions_appointment_id_key" ON "commission_payout_sessions"("appointment_id");

-- CreateIndex
CREATE INDEX "commission_payout_sessions_payout_id_idx" ON "commission_payout_sessions"("payout_id");

-- CreateIndex
CREATE INDEX "commission_payout_sessions_appointment_id_idx" ON "commission_payout_sessions"("appointment_id");

-- AddForeignKey
ALTER TABLE "clinic_settings" ADD CONSTRAINT "clinic_settings_updated_by_user_id_fkey" FOREIGN KEY ("updated_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "clinic_opening_hours" ADD CONSTRAINT "clinic_opening_hours_updated_by_user_id_fkey" FOREIGN KEY ("updated_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "clinic_closures" ADD CONSTRAINT "clinic_closures_created_by_user_id_fkey" FOREIGN KEY ("created_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rooms" ADD CONSTRAINT "rooms_created_by_user_id_fkey" FOREIGN KEY ("created_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "beds" ADD CONSTRAINT "beds_room_id_fkey" FOREIGN KEY ("room_id") REFERENCES "rooms"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "beds" ADD CONSTRAINT "beds_created_by_user_id_fkey" FOREIGN KEY ("created_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "session_types" ADD CONSTRAINT "session_types_created_by_user_id_fkey" FOREIGN KEY ("created_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_created_by_user_id_fkey" FOREIGN KEY ("created_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "staff_schedules" ADD CONSTRAINT "staff_schedules_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "staff_leaves" ADD CONSTRAINT "staff_leaves_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "staff_leaves" ADD CONSTRAINT "staff_leaves_approved_by_user_id_fkey" FOREIGN KEY ("approved_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_sessions" ADD CONSTRAINT "user_sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "otp_secrets" ADD CONSTRAINT "otp_secrets_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "otp_backup_codes" ADD CONSTRAINT "otp_backup_codes_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trusted_devices" ADD CONSTRAINT "trusted_devices_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "password_reset_codes" ADD CONSTRAINT "password_reset_codes_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "message_templates" ADD CONSTRAINT "message_templates_updated_by_user_id_fkey" FOREIGN KEY ("updated_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "patients" ADD CONSTRAINT "patients_assigned_physiotherapist_id_fkey" FOREIGN KEY ("assigned_physiotherapist_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "patients" ADD CONSTRAINT "patients_assigned_nutritionist_id_fkey" FOREIGN KEY ("assigned_nutritionist_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "patients" ADD CONSTRAINT "patients_discharged_by_user_id_fkey" FOREIGN KEY ("discharged_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "patients" ADD CONSTRAINT "patients_created_by_user_id_fkey" FOREIGN KEY ("created_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "patients" ADD CONSTRAINT "patients_updated_by_user_id_fkey" FOREIGN KEY ("updated_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "patient_diagnoses" ADD CONSTRAINT "patient_diagnoses_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "patients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "patient_diagnoses" ADD CONSTRAINT "patient_diagnoses_diagnosed_by_user_id_fkey" FOREIGN KEY ("diagnosed_by_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "patient_diagnoses" ADD CONSTRAINT "patient_diagnoses_created_by_user_id_fkey" FOREIGN KEY ("created_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "patient_diagnoses" ADD CONSTRAINT "patient_diagnoses_updated_by_user_id_fkey" FOREIGN KEY ("updated_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "patient_documents" ADD CONSTRAINT "patient_documents_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "patients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "patient_documents" ADD CONSTRAINT "patient_documents_uploaded_by_user_id_fkey" FOREIGN KEY ("uploaded_by_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "patient_documents" ADD CONSTRAINT "patient_documents_created_by_user_id_fkey" FOREIGN KEY ("created_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "patient_documents" ADD CONSTRAINT "patient_documents_updated_by_user_id_fkey" FOREIGN KEY ("updated_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "document_view_logs" ADD CONSTRAINT "document_view_logs_document_id_fkey" FOREIGN KEY ("document_id") REFERENCES "patient_documents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "document_view_logs" ADD CONSTRAINT "document_view_logs_viewed_by_user_id_fkey" FOREIGN KEY ("viewed_by_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "covering_access_logs" ADD CONSTRAINT "covering_access_logs_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "patients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "covering_access_logs" ADD CONSTRAINT "covering_access_logs_clinician_id_fkey" FOREIGN KEY ("clinician_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "covering_access_logs" ADD CONSTRAINT "covering_access_logs_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "user_sessions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "patients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_session_type_id_fkey" FOREIGN KEY ("session_type_id") REFERENCES "session_types"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_clinician_id_fkey" FOREIGN KEY ("clinician_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_room_id_fkey" FOREIGN KEY ("room_id") REFERENCES "rooms"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_bed_id_fkey" FOREIGN KEY ("bed_id") REFERENCES "beds"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_series_id_fkey" FOREIGN KEY ("series_id") REFERENCES "appointment_series"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_package_id_fkey" FOREIGN KEY ("package_id") REFERENCES "packages"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_created_by_user_id_fkey" FOREIGN KEY ("created_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_updated_by_user_id_fkey" FOREIGN KEY ("updated_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "appointment_series" ADD CONSTRAINT "appointment_series_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "patients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "appointment_series" ADD CONSTRAINT "appointment_series_session_type_id_fkey" FOREIGN KEY ("session_type_id") REFERENCES "session_types"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "appointment_series" ADD CONSTRAINT "appointment_series_clinician_id_fkey" FOREIGN KEY ("clinician_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "appointment_series" ADD CONSTRAINT "appointment_series_room_id_fkey" FOREIGN KEY ("room_id") REFERENCES "rooms"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "appointment_series" ADD CONSTRAINT "appointment_series_bed_id_fkey" FOREIGN KEY ("bed_id") REFERENCES "beds"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "appointment_series" ADD CONSTRAINT "appointment_series_created_by_user_id_fkey" FOREIGN KEY ("created_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "appointment_status_history" ADD CONSTRAINT "appointment_status_history_appointment_id_fkey" FOREIGN KEY ("appointment_id") REFERENCES "appointments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "appointment_status_history" ADD CONSTRAINT "appointment_status_history_changed_by_user_id_fkey" FOREIGN KEY ("changed_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "appointment_reminders" ADD CONSTRAINT "appointment_reminders_appointment_id_fkey" FOREIGN KEY ("appointment_id") REFERENCES "appointments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "appointment_reminders" ADD CONSTRAINT "appointment_reminders_sent_by_user_id_fkey" FOREIGN KEY ("sent_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "in_app_notifications" ADD CONSTRAINT "in_app_notifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "in_app_notifications" ADD CONSTRAINT "in_app_notifications_appointment_id_fkey" FOREIGN KEY ("appointment_id") REFERENCES "appointments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "in_app_notifications" ADD CONSTRAINT "in_app_notifications_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "patients"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "packages" ADD CONSTRAINT "packages_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "patients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "packages" ADD CONSTRAINT "packages_session_type_id_fkey" FOREIGN KEY ("session_type_id") REFERENCES "session_types"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "packages" ADD CONSTRAINT "packages_created_by_user_id_fkey" FOREIGN KEY ("created_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "packages" ADD CONSTRAINT "packages_updated_by_user_id_fkey" FOREIGN KEY ("updated_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "package_extensions" ADD CONSTRAINT "package_extensions_package_id_fkey" FOREIGN KEY ("package_id") REFERENCES "packages"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "package_extensions" ADD CONSTRAINT "package_extensions_extended_by_user_id_fkey" FOREIGN KEY ("extended_by_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "charges" ADD CONSTRAINT "charges_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "patients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "charges" ADD CONSTRAINT "charges_package_id_fkey" FOREIGN KEY ("package_id") REFERENCES "packages"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "charges" ADD CONSTRAINT "charges_appointment_id_fkey" FOREIGN KEY ("appointment_id") REFERENCES "appointments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "charges" ADD CONSTRAINT "charges_created_by_user_id_fkey" FOREIGN KEY ("created_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_charge_id_fkey" FOREIGN KEY ("charge_id") REFERENCES "charges"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_cash_shift_id_fkey" FOREIGN KEY ("cash_shift_id") REFERENCES "cash_closings"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_voided_by_user_id_fkey" FOREIGN KEY ("voided_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_collected_by_user_id_fkey" FOREIGN KEY ("collected_by_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "refunds" ADD CONSTRAINT "refunds_charge_id_fkey" FOREIGN KEY ("charge_id") REFERENCES "charges"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "refunds" ADD CONSTRAINT "refunds_payment_id_fkey" FOREIGN KEY ("payment_id") REFERENCES "payments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "refunds" ADD CONSTRAINT "refunds_handed_out_by_user_id_fkey" FOREIGN KEY ("handed_out_by_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "refunds" ADD CONSTRAINT "refunds_cash_shift_id_fkey" FOREIGN KEY ("cash_shift_id") REFERENCES "cash_closings"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "refunds" ADD CONSTRAINT "refunds_approved_by_user_id_fkey" FOREIGN KEY ("approved_by_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "write_offs" ADD CONSTRAINT "write_offs_charge_id_fkey" FOREIGN KEY ("charge_id") REFERENCES "charges"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "write_offs" ADD CONSTRAINT "write_offs_approved_by_user_id_fkey" FOREIGN KEY ("approved_by_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "price_change_history" ADD CONSTRAINT "price_change_history_appointment_id_fkey" FOREIGN KEY ("appointment_id") REFERENCES "appointments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "price_change_history" ADD CONSTRAINT "price_change_history_charge_id_fkey" FOREIGN KEY ("charge_id") REFERENCES "charges"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "price_change_history" ADD CONSTRAINT "price_change_history_package_id_fkey" FOREIGN KEY ("package_id") REFERENCES "packages"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "price_change_history" ADD CONSTRAINT "price_change_history_changed_by_user_id_fkey" FOREIGN KEY ("changed_by_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cash_closings" ADD CONSTRAINT "cash_closings_cashier_user_id_fkey" FOREIGN KEY ("cashier_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cash_closings" ADD CONSTRAINT "cash_closings_witness_user_id_fkey" FOREIGN KEY ("witness_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "clinical_notes" ADD CONSTRAINT "clinical_notes_appointment_id_fkey" FOREIGN KEY ("appointment_id") REFERENCES "appointments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "clinical_notes" ADD CONSTRAINT "clinical_notes_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "patients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "clinical_notes" ADD CONSTRAINT "clinical_notes_clinician_id_fkey" FOREIGN KEY ("clinician_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "clinical_notes" ADD CONSTRAINT "clinical_notes_voided_by_user_id_fkey" FOREIGN KEY ("voided_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "clinical_notes" ADD CONSTRAINT "clinical_notes_created_by_user_id_fkey" FOREIGN KEY ("created_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "clinical_notes" ADD CONSTRAINT "clinical_notes_updated_by_user_id_fkey" FOREIGN KEY ("updated_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "clinical_note_versions" ADD CONSTRAINT "clinical_note_versions_note_id_fkey" FOREIGN KEY ("note_id") REFERENCES "clinical_notes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "clinical_note_versions" ADD CONSTRAINT "clinical_note_versions_edited_by_user_id_fkey" FOREIGN KEY ("edited_by_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "clinical_note_addenda" ADD CONSTRAINT "clinical_note_addenda_note_id_fkey" FOREIGN KEY ("note_id") REFERENCES "clinical_notes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "clinical_note_addenda" ADD CONSTRAINT "clinical_note_addenda_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "clinical_note_addenda" ADD CONSTRAINT "clinical_note_addenda_voided_by_user_id_fkey" FOREIGN KEY ("voided_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inbody_records" ADD CONSTRAINT "inbody_records_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "patients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inbody_records" ADD CONSTRAINT "inbody_records_appointment_id_fkey" FOREIGN KEY ("appointment_id") REFERENCES "appointments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inbody_records" ADD CONSTRAINT "inbody_records_recorded_by_user_id_fkey" FOREIGN KEY ("recorded_by_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inbody_records" ADD CONSTRAINT "inbody_records_voided_by_user_id_fkey" FOREIGN KEY ("voided_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inbody_records" ADD CONSTRAINT "inbody_records_created_by_user_id_fkey" FOREIGN KEY ("created_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inbody_records" ADD CONSTRAINT "inbody_records_updated_by_user_id_fkey" FOREIGN KEY ("updated_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_cash_shift_id_fkey" FOREIGN KEY ("cash_shift_id") REFERENCES "cash_closings"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_voided_by_user_id_fkey" FOREIGN KEY ("voided_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_created_by_user_id_fkey" FOREIGN KEY ("created_by_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_updated_by_user_id_fkey" FOREIGN KEY ("updated_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "expense_edit_history" ADD CONSTRAINT "expense_edit_history_expense_id_fkey" FOREIGN KEY ("expense_id") REFERENCES "expenses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "expense_edit_history" ADD CONSTRAINT "expense_edit_history_edited_by_user_id_fkey" FOREIGN KEY ("edited_by_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "commission_payouts" ADD CONSTRAINT "commission_payouts_clinician_id_fkey" FOREIGN KEY ("clinician_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "commission_payouts" ADD CONSTRAINT "commission_payouts_expense_id_fkey" FOREIGN KEY ("expense_id") REFERENCES "expenses"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "commission_payouts" ADD CONSTRAINT "commission_payouts_voided_by_user_id_fkey" FOREIGN KEY ("voided_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "commission_payouts" ADD CONSTRAINT "commission_payouts_created_by_user_id_fkey" FOREIGN KEY ("created_by_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "commission_payouts" ADD CONSTRAINT "commission_payouts_updated_by_user_id_fkey" FOREIGN KEY ("updated_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "commission_payout_sessions" ADD CONSTRAINT "commission_payout_sessions_payout_id_fkey" FOREIGN KEY ("payout_id") REFERENCES "commission_payouts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "commission_payout_sessions" ADD CONSTRAINT "commission_payout_sessions_appointment_id_fkey" FOREIGN KEY ("appointment_id") REFERENCES "appointments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- ============================================================================
-- Raw SQL from constraints.md (Extensions, Exclusion Constraints, Indexes, Triggers)
-- ============================================================================

-- 1. Prerequisites
CREATE EXTENSION IF NOT EXISTS btree_gist;

-- 2. Exclusion Constraints (btree_gist) on appointments
ALTER TABLE appointments 
ADD CONSTRAINT exclude_clinician_time_overlap 
EXCLUDE USING gist (
    clinician_id WITH =,
    tsrange(starts_at, ends_at, '[)') WITH &&
)
WHERE (status IN ('SCHEDULED', 'ARRIVED', 'COMPLETED'));

ALTER TABLE appointments 
ADD CONSTRAINT exclude_bed_time_overlap 
EXCLUDE USING gist (
    bed_id WITH =,
    tsrange(starts_at, ends_at, '[)') WITH &&
)
WHERE (status IN ('SCHEDULED', 'ARRIVED', 'COMPLETED'));

ALTER TABLE appointments 
ADD CONSTRAINT exclude_patient_time_overlap 
EXCLUDE USING gist (
    patient_id WITH =,
    tsrange(starts_at, ends_at, '[)') WITH &&
)
WHERE (status IN ('SCHEDULED', 'ARRIVED', 'COMPLETED'));

-- 3. Partial Unique Indexes
CREATE UNIQUE INDEX IF NOT EXISTS idx_patients_mobile_phone_unique 
ON patients (mobile_phone) 
WHERE mobile_phone IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_active_paid_session 
ON commission_payout_sessions (appointment_id) 
WHERE is_voided = false;

-- 4. PostgreSQL Immutability & Integrity Triggers

-- 4.1 Audit Log Immutability
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

-- 4.2 Patient Hard-Delete Prevention
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

-- 4.3 Closed Cash Shift Payment Lock
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

    IF OLD.cash_shift_id IS NOT NULL THEN
        SELECT status INTO shift_status FROM cash_closings WHERE id = OLD.cash_shift_id;
        IF shift_status = 'CLOSED' THEN
            IF NEW.amount_piasters <> OLD.amount_piasters OR
               NEW.payment_method <> OLD.payment_method OR
               NEW.collected_at <> OLD.collected_at OR
               NEW.collected_by_user_id <> OLD.collected_by_user_id OR
               NEW.charge_id <> OLD.charge_id OR
               (NEW.cash_shift_id IS DISTINCT FROM OLD.cash_shift_id) THEN
                RAISE EXCEPTION 'Payment belongs to a closed cash shift. Core financial fields and shift linkage cannot be modified.'
                    USING ERRCODE = 'integrity_constraint_violation';
            END IF;

            IF OLD.is_voided = true AND NEW.is_voided = false THEN
                RAISE EXCEPTION 'A voided payment in a closed cash drawer shift cannot be unvoided.'
                    USING ERRCODE = 'integrity_constraint_violation';
            END IF;
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_lock_closed_shift_payments
BEFORE UPDATE OR DELETE ON payments
FOR EACH ROW
EXECUTE FUNCTION trg_check_closed_shift_payment_lock();

-- 4.4 Closed Cash Shift Expense Lock
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

    IF OLD.cash_shift_id IS NOT NULL THEN
        SELECT status INTO shift_status FROM cash_closings WHERE id = OLD.cash_shift_id;
        IF shift_status = 'CLOSED' THEN
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

            IF OLD.is_voided = true AND NEW.is_voided = false THEN
                RAISE EXCEPTION 'A voided expense in a closed cash drawer shift cannot be unvoided.'
                    USING ERRCODE = 'integrity_constraint_violation';
            END IF;
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_lock_closed_shift_expenses
BEFORE UPDATE OR DELETE ON expenses
FOR EACH ROW
EXECUTE FUNCTION trg_check_closed_shift_expense_lock();

-- 4.5 24-Hour Clinical Note Edit Window Lock
CREATE OR REPLACE FUNCTION trg_check_clinical_note_edit_window()
RETURNS TRIGGER AS $$
DECLARE
    appt_status VARCHAR(50);
BEGIN
    SELECT status INTO appt_status FROM appointments WHERE id = OLD.appointment_id;
    IF appt_status = 'ARRIVED' THEN
        RETURN NEW;
    END IF;

    IF NEW.is_voided = true AND OLD.is_voided = false THEN
        RETURN NEW;
    END IF;

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

-- 4.6 Immutability for Auxiliary Audit Tables
CREATE OR REPLACE FUNCTION trg_block_immutable_log_mutation()
RETURNS TRIGGER AS $$
BEGIN
    RAISE EXCEPTION 'Audit and tracking logs are immutable. UPDATE and DELETE operations are prohibited.'
        USING ERRCODE = 'integrity_constraint_violation';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_document_view_logs_immutability
BEFORE UPDATE OR DELETE ON document_view_logs
FOR EACH ROW
EXECUTE FUNCTION trg_block_immutable_log_mutation();

CREATE TRIGGER trg_covering_access_logs_immutability
BEFORE UPDATE OR DELETE ON covering_access_logs
FOR EACH ROW
EXECUTE FUNCTION trg_block_immutable_log_mutation();

CREATE TRIGGER trg_appointment_status_history_immutability
BEFORE UPDATE OR DELETE ON appointment_status_history
FOR EACH ROW
EXECUTE FUNCTION trg_block_immutable_log_mutation();

CREATE TRIGGER trg_price_change_history_immutability
BEFORE UPDATE OR DELETE ON price_change_history
FOR EACH ROW
EXECUTE FUNCTION trg_block_immutable_log_mutation();

