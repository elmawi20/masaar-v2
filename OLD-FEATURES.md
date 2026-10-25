# OLD-FEATURES.md — REFERENCE ONLY

> ⚠️ This is the feature list extracted from the OLD prototype. It is kept only for reference
> (wording, WhatsApp templates, demo names). Many statements here are NOT true or are superseded.
> **docs/FEATURES-v2.x.md always wins.** Do not implement anything from this file unless the new spec says so.

---

# CLINIC PRODUCT FEATURE SPECIFICATION (FEATURES.MD)
Masaar Physiotherapy, Rehabilitation & Clinical Nutrition Center

## 1. Overview

### 1.1 Clinic Domain & Mission
The system is a comprehensive, multi-role Clinical Practice Management and Electronic Medical Records (EMR) platform tailored for outpatient physiotherapy clinics, sports rehabilitation centers, and medical clinical nutrition practices operating in the Egyptian private healthcare sector.

The platform coordinates front-desk operations, automated patient flow, multi-room physical therapy scheduling, clinical SOAP charting, InBody metabolic tracking, custom treatment package lifecycles, point-of-sale receipting, clinic operating expenses, commission calculations, and audit governance.

### 1.2 Clinic Profile & Operating Parameters
- **Clinic Name:** Masaar Clinic (عيادة مسار)
- **Branch:** Main Center (الفرع الرئيسي)
- **Location:** 14 Road 213, Degla, Maadi, Cairo, Egypt (١٤ شارع ٢١٣، دجلة، المعادي، القاهرة)
- **Primary Contact Phone:** +201002345678
- **Primary Currency:** Egyptian Pound (EGP / ج.م)
- **Operating Hours:** 09:00 AM to 09:00 PM (12-hour operational window daily)
- **Default Scheduling Interval:** 15-minute granularity (supporting session durations from 15 to 180 minutes)
- **Facility Capacity:** 4 dedicated treatment rooms accommodating 6 simultaneous treatment beds/stations.

### 1.3 Localization & Language Support
- **Dual Language Architecture:** Complete native support for both Modern Standard Arabic (العربية) and Professional Medical English.
- **Dynamic Bidirectional Mirroring:** Instant toggling between RTL (Arabic) and LTR (English).
- **Cultural & Regional Adaptation:**
  - Egyptian mobile phone formatting and validation (`01XXXXXXXXX` and `+201XXXXXXXXX`).
  - Egyptian financial rounding and currency rendering (`EGP` / `ج.م`).
  - Culturally appropriate Arabic clinical terminology alongside standardized English medical abbreviations.
  - Zero-cost direct WhatsApp messaging formatted for Egyptian telecommunication channels.

### 1.4 Visual Theme & Ergonomics
- **Dual Visual Theme System:** Deep Dark Mode and Clean Light Mode, single toggle.
- **Accessibility & Contrast:** High-contrast clinical indicators, color-coded appointment bubble tags, and role-based color branding (Receptionist = Deep Teal, Physiotherapy = Emerald Green, Clinical Nutrition = Vivid Amber, Administration = Rich Violet/Slate).

---

## 2. User Roles & Permissions Matrix

| Role Profile | Primary Domain | Visibility Scope | Administrative Auth |
|---|---|---|---|
| Admin | Owner / Consultant | Full Clinic-Wide | Full Privileges |
| Dev | Systems Engineer | Full Diagnostics | Full Privileges |
| Co-Admin | Executive Partner | Operations/Ledger | Full Privileges |
| Receptionist | Front Desk | Front-Desk Focus | Operational Only |
| Physiotherapist | Physical Therapy | Assigned Patients | Clinical Only |
| Diet Doctor | Clinical Nutrition | Diet & Nutrition | Clinical Only |

### 2.1 Admin (Clinic Owner & Head Consultant Doctor)
- **Sees:** clinic-wide financial dashboards, net revenue, doctor commission breakdowns, full patient directory, full calendar, packages ledger, petty cash & expenses ledger, voided receipts log, security configuration, full audit logs.
- **Can:**
  - Create, edit, and discharge patients.
  - Book, reschedule, cancel, and complete appointments.
  - Change appointment prices even after payments have been recorded.
  - Extend package expiration dates with mandatory logged justification.
  - Collect payments and void receipts with mandatory logged reasons.
  - Manage staff profiles, assign commission rates, update passwords.
  - Configure pricing, package tiers, rooms, and bed counts.
  - Log, edit, and delete operating expenses.
  - Process doctor commission payouts (registered automatically as expenses).
  - Export CSV reports (Patients, Receipts, Expenses) and full JSON backups.
  - Toggle geofence security controls and simulator parameters.
- **Hidden:** Nothing.

### 2.2 Dev (Lead Systems Architect & Security Engineer)
- Same visibility as Admin plus developer diagnostic panels, location simulator overrides, security telemetry. Nothing hidden.

### 2.3 Co-Admin (Managing Partner & Operations Director)
- Sees all financial metrics, KPIs, caseloads, billing, expenses, facility settings.
- Same daily operations as Admin (payments, voids, extensions, price updates, expenses, exports).
- Cannot delete primary owner credentials.

### 2.4 Receptionist (Head of Front Desk & Patient Relations)
- **Sees:** front desk overview, today's schedule, calendar grid, patient directory, lead statuses, package balances, today's petty cash expenses, front desk notifications.
- **Can:**
  - Register patients with Egyptian phone uniqueness verification.
  - Book, reschedule, cancel appointments with mandatory reasons.
  - Check in arriving patients (arrival timestamp, no package deduction).
  - Move appointments to and from the waitlist.
  - Collect payments for appointments, packages, or patient accounts.
  - Log today's expenses (coffee, emergency supplies, water).
  - Send WhatsApp confirmations, intake welcomes, schedule updates.
- **Restricted:**
  - No clinical access (SOAP notes, diagnoses, medical attachments).
  - No historical expenses; cannot edit/delete expenses.
  - No receipt voiding.
  - No post-payment price changes.
  - No package extensions.
  - No staff or pricing configuration.

### 2.5 Physiotherapist (Specialist Physical Therapist)
- **Sees:** daily schedule of assigned patients, medical history, diagnoses, precautions banner, package balances, home exercises, documents (X-rays, MRI, prescriptions), clinical notifications.
- **Can:** view assigned patients (today and upcoming); review scans in a protected viewer; complete sessions, record notes, attach scans; prescribe home exercises; mark/undo no-shows; reschedule sessions.
- **Restricted:** geofence (blocked outside clinic Wi-Fi); only own patients; no financial data; no system settings.

### 2.6 Diet Doctor (Clinical Nutrition & Medical Diet Consultant)
- **Sees:** nutrition workspace, consultations, InBody records, dietary history, body composition analytics (Weight, Skeletal Muscle Mass, Body Fat %, Visceral Fat, BMI, BMR), macro targets, nutrition protocols.
- **Can:** record InBody measurements and target weights; prescribe protocols (Ketogenic, Low Carb Anti-Inflammatory, Intermittent Fasting, Diabetic Management, Post-Bariatric, Sports Athletic); set calories and macros; review lab reports; complete consultations.
- **Restricted:** geofence; cannot alter physiotherapy notes; no clinic financials.

---

## 3. Screens and Dashboards

### 3.1 Global Application Shell & Top Navigation Bar
- Clinic branding: logo, Arabic name (عيادة مسار), English name (Masaar), branch tag.
- Urgent Alerts button: badge with count of patients with ≤ 1 session left or overdue balances; opens Urgent Alerts Drawer.
- Notifications Center: arrivals, delay warnings, reschedules, cancellations.
- Language switcher (العربية RTL / English LTR).
- Theme switcher (moon/sun).
- Active user badge & quick switcher (opens Staff Role Switcher / Authentication Modal).
- Role-aware tabs:
  - Receptionist: Front Desk Overview, Appointments Calendar, Patients Directory, Completed Cases, Treatment Packages.
  - Physiotherapist: Clinical Workspace, Appointments Calendar, My Patients, Completed Cases.
  - Diet Doctor: Nutrition Workspace, Appointments Calendar, My Patients, Completed Cases.
  - Admin / Co-Admin: Executive Dashboard, Appointments Calendar, Patients Directory, Completed Cases, Treatment Packages, Management Console.

### 3.2 Receptionist Dashboard (Front Desk Overview)
- **Today's cards:** Scheduled, Arrived (waiting), Completed, Cancelled & No-Show, doctor workload alert (10 sessions/day).
- **Quick actions:** + New Patient Intake, + Book Appointment, + Today's Expense.
- **Urgent follow-up widget:** patients with 1 session left or pending balances, with one-click WhatsApp reminders.
- **Calendar grid:** today's bed utilization; clicking an appointment opens the action popover.
- **Action popover:** View Patient Details (diagnosis, doctor, package balance, contact), Check In, Reschedule, Collect Payment, Cancel (reason), Mark No-Show (reason), Send WhatsApp.

### 3.3 Physiotherapist Clinical Dashboard
- Geofence banner / lock screen outside clinic network.
- Doctor profile card: name, title, avatar, workload meter (total, completed, remaining).
- Date selector (today / upcoming).
- Patient queue cards (by time): time badge (12-hour), location (e.g. Room 1 - Bed 1), status pill (Scheduled, Arrived, Completed, No-Show), name/age/gender/phone, diagnosis badge (e.g. ACL Reconstruction Rehab (Week 6)), precautions banner (e.g. Hypertension Controlled, Pacemaker), package meter, home exercises, Medical Docs button, actions (No-Show, Undo No-Show, Reschedule, Start/Complete Session).

### 3.4 Diet Doctor Clinical Nutrition Dashboard
- Geofence shield.
- Overview banner: doctor details, today's consultation count.
- Protocol filter: All, Anti-Inflammatory Low Carb, Ketogenic, Intermittent Fasting, Diabetic Management, Sports Athletic, Post-Bariatric.
- InBody history table: patient, date, current & target weight, skeletal muscle mass, body fat %, visceral fat, BMI, BMR, daily calorie goal, protein/carb/fat grams, protocol badge.
- Actions: + New InBody Assessment, Patient Medical Documents, Complete Consultation (deducts session).

### 3.5 Executive Admin Overview Dashboard
- Timeframe filter: Today, Custom Range, Month, Year, All Time.
- KPI cards: Collected Revenue (non-voided receipts), Operating Expenses, Net Operating Profit, Outstanding Balance Due, Completed Sessions, Active Patients.
- Selected day financial deep-dive (collections minus petty expenses).
- Collection channels distribution: InstaPay, Vodafone Cash, Cash, Visa/Card, Fawry.
- Staff caseload & commission register: name, title, active patients, sessions completed, commission rate (% or fixed), commission earned, Payout Commission button (creates expense + audit log).
- Receipts table: sequential number (INV-2026-00001), date/time, patient, item/package, amount, method badge, collected by, transfer screenshot thumbnail, voided styling with [VOIDED] badge and reason, Void Receipt button (Admin/Co-Admin).
- Export & backup: CSV (Patients, Receipts, Expenses) and full JSON backup.

### 3.6 Appointments & Resource Calendar Grid
- Columns: rooms and beds (Room 1 - Bed 1, Room 1 - Bed 2, Room 2 - Bed 1, Room 3, Room 4).
- Rows: hourly slots 09:00 AM – 09:00 PM; red line indicators for non-zero-minute starts (10:15, 11:30).
- Drag and drop: move to new room/time with conflict check; drop on Waitlist sets status `waitlisted` (no delete); drag from Waitlist to slot books it.
- Search by patient name.
- Right sidebar: waitlist and quick patient roster.

### 3.7 Patient Directory & EMR Screen
- Search: name, mobile, WhatsApp, diagnosis. Filters: status (All, Active, Lead), attending doctor, clinical need (All, Physiotherapy, Nutrition, Head Consultant Assessment).
- Patient cards: initials avatar, full name (inline edit for Admin/Receptionist), age & gender, click-to-call and click-to-WhatsApp, billing type badge (Package, Cash, Insurance + company), assigned doctor, diagnosis (inline edit for Doctors/Admin), precaution pills, package meter, documents counter.
- Actions: Edit Profile, Book Session, Docs & Scans, WhatsApp, Export CSV.

### 3.8 Completed Cases & Clinical Logs
- Filters: date, search (name/phone/notes), doctor.
- Records: date/time, patient, doctor, sessions deducted, clinical notes (hidden from receptionist), attachments, Edit Clinical Notes, Re-open / Undo Completed (restores session).

### 3.9 Treatment Packages & Revenue Ledger
- Cards: package title, patient, purchase & expiry dates, status (Active, X days left, Completed, Forfeited (Expired)), sessions progress, price / paid / balance, Collect Bill, Extend (Admin only, days + reason).

### 3.10 Administrative Management Console (6 panels)
1. Doctors & Staff Management: view, add, edit, update passwords, remove staff.
2. Doctor Commissions: % or fixed per-session amounts; payouts.
3. Clinic Session Pricing: Single Session, Initial Head Consultant Assessment, Home Care Visit.
4. Standard Package Tiers: create, edit, deactivate templates (6-Session Targeted, 10-Session Comprehensive, 12-Session Sports Rehab, 16-Session Neuro Recovery).
5. Rooms & Beds: add, rename, activate/deactivate, bed capacity.
6. Clinic Profile, Working Hours & Geofence: name, branch, address, phone, hours, Wi-Fi SSID geofence; database reset and backup tools.

### 3.11 Clinic Expenses Console
- Toggle: Expenses Ledger vs. Equipment & Capital Assets Register.
- Receptionist sees today only; Admin/Co-Admin: today, month, all time.
- Table: title, category, amount, method, date, logged by, reason, edit history.
- Actions: add, edit amount with reason, delete (Admin), export CSV.

---

## 4. Features by Module

### Module 1: Patient Management & Registration

**Feature 1: Patient Registration Wizard** — fields:
1. Full Name (required; soft check for similar names)
2. Egyptian Mobile Phone (required; `/^(\+20|0)?1[0125][0-9]{8}$/`; normalized; duplicates blocked)
3. WhatsApp Number (optional; mirrors phone)
4. Age (required, 1–120)
5. Gender (Male ذكر / Female أنثى)
6. Status (Active Patient مريض نشط / Prospective Lead عميل مرتقب)
7. Payment Arrangement (Cash / Per-Session نقدي / كاش, Treatment Package باقة جلسات, Medical Insurance تأمين طبي)
8. Insurance Company Name (required only if insurance)
9. Referring Physician / Channel (optional)
10. Primary Clinical Diagnosis (required; free text + 8 quick chips: ACL Rehab, Lumbar Disc Herniation, Frozen Shoulder, Cervical Radiculopathy, Ankle Sprain, Patellofemoral Syndrome, Tennis Elbow, Stroke Rehab)
11. Assigned Treating Doctor (required)
12. Medical Safety Alerts (Diabetic, Pacemaker, Hypertension, Osteoporosis, Fall Risk, Prior Meniscus Surgery)
13. General Clinical Notes (optional)
14. Package Enrollment toggle (Package Name, Session Count, Total Price, Deposit Paid, Payment Method)

**Feature 2: Phone Uniqueness & Normalization** — strips spaces, symbols, +20 and leading 0; duplicate → button disabled, alert with existing patient's name, ID and "Open patient file" button.

**Feature 3: Profile Editing & Guardrails** — validates phone and uniqueness; diagnosis editing restricted to clinical staff and admins.

**Feature 4: Medical Documents & Scan Archive (Anti-Screenshot Shield)** — fields: Title, Category (Doctor Prescription روشتة طبيب بشري, X-Ray Scan أشعة سينية X-Ray, MRI Scan رنين مغناطيسي MRI, Lab Report تقرير معمل / تحاليل, Other مستند طبي آخر), Clinical Notes, File Upload / Camera (compressed to WebP < 50 KB). Shield: blur + watermark (staff name, time) on focus loss or PrintScreen / Ctrl+P / Ctrl+S.

**Feature 5: Discharge & Case Archive** — patient moved to Completed Cases when package complete, history preserved.

### Module 2: Scheduling & Calendar

**Feature 6: Room & Bed Calendar** — Room 1: Bed 1 (Electrotherapy), Bed 2 (Manual Therapy); Room 2: Bed 1 (Shockwave), Bed 2 (Laser / Cryo); Room 3: Bed 1 (Consultant Assessment); Room 4: Bed 1 (Clinical Nutrition & InBody).

**Feature 7: Booking Modal** — Session Category (Physiotherapy علاج طبيعي, Clinical Nutrition تغذية علاجية, Consultant Assessment كشف استشاري أول), Patient, Attending Doctor, Date, Start Time (15-min steps, 09:00–21:00), Duration (15–180, default 45), Session Price (free entry), Room, Bed. After booking: WhatsApp reminder option.

**Feature 8: Conflict Engine** — doctor overlap, bed overlap, doctor daily cap 10, package expiry check, working hours 09:00–21:00.

**Feature 9: Drag-and-Drop Rescheduling** — conflict check; drop cancelled with reason on conflict.

**Feature 10: Waitlist** — status `waitlisted`, record kept; drag back to book.

**Feature 11: Check-In** — status `arrived`, `arrivedAt` stored, no package deduction.

**Feature 12: Reschedule Modal** — date, time, duration, room/bed, price; price locked after payment (🔒 Paid (Admin only)).

**Feature 13: Cancellation & No-Show Reasons** — patient_request (طلب المريض), illness (مرض أو وعكة صحية), transport (مواصلات أو عائق طريق), emergency (ظرف عائلي / طارئ), no_contact (تعذر التواصل مع المريض), other (سبب آخر) + notes; stores cancelledAt/cancellationReason or markedNoShowAt/noShowReason.

### Module 3: Clinical Documentation (EMR)

**Feature 14: Session Completion** — Doctor's Clinical Notes (required, "Set N/A" button), attachments; marks completed and deducts 1 package session.
**Feature 15: SOAP** — Subjective, Objective (ROM, MMT, palpation, special tests), Assessment, Plan.
**Feature 16: Pain Scale** — 1–10 per session.
**Feature 17: Home Exercises** — stretching, strengthening, postural drills.

### Module 4: Clinical Nutrition

**Feature 18: InBody Logger** — Patient, Current Weight, Target Weight, Skeletal Muscle Mass, Body Fat %, Visceral Fat (1–20), BMI (auto), BMR (auto), Daily Calories, Protein g, Carbs g, Fats g, Protocol (Medical Ketogenic, Anti-Inflammatory Low Carb, Intermittent Fasting, Sports Nutrition & Muscle Hypertrophy, Diabetic & Insulin Resistance, Post-Bariatric Surgery Care).

### Module 5: Packages

**Feature 19:** manual creation, free price and session count.
**Feature 20:** expiry = purchase + 60 days; "X days left"; booking after expiry blocked; remaining sessions forfeited.
**Feature 21:** Admin/Co-Admin extension: days (1–365, default 30) + reason; restores forfeited; audited.
**Feature 22:** amountPaid / balanceDue calculated from non-voided receipts.

### Module 6: Billing

**Feature 23: Payments** linked to package, appointment, or patient account. Fields: Amount (> 0), Method (InstaPay إنستاباي, Vodafone Cash فودافون كاش, Cash نقدي / كاش, Visa / Card فيزا / بطاقة بنكية, Fawry فوري), screenshot (WebP < 50 KB), notes.
**Feature 24: Overpayment blocked** (e.g. "Payment amount (500 EGP) exceeds remaining balance (300 EGP)").
**Feature 25: Receipt numbers** INV-YYYY-XXXXX.
**Feature 26: Void** (Admin) with reason; struck through, [VOIDED], excluded from totals.
**Feature 27: Payment pills** Package (Teal), Paid (Emerald), Due (Amber), Unpaid (Rose).

### Module 7: Expenses

**Feature 28: Expense Logger** — Title, Amount, Category (Medical & Therapy Supplies, Equipment & Machines Asset, Facility Maintenance, Clinic Rent & Lease, Utilities: Electricity, Water & Internet, Doctor Commission Payout, Staff Salaries, Hospitality & Patient Coffee, Advertising & Marketing, Miscellaneous Other), Method, Date, Reason, Notes.
**Feature 29:** edit history (editedAt, editedBy, userRole, previousAmount, newAmount, reason).
**Feature 30:** receptionist sees today only.
**Feature 31:** equipment asset register (filter of equipment + maintenance).

### Module 8: Staff, Security & Access

**Feature 32: Staff** — Full Name, Email, Phone, Specialty, Role, Commission %, Initial Password, Password Hint.
**Feature 33:** password reset by admin.
**Feature 34:** commission engine + payout as expense.
**Feature 35:** rooms & beds manager (1 or 2 beds per room).
**Feature 36:** Wi-Fi SSID geofence (`Masaar_Staff_5G`) with simulator override.
**Feature 37:** user switcher with password.

### Module 9: Notifications

**Feature 38:** arrival ("Patient Arrived: In Waiting Area"), late ("Late Arrival: X minutes late"), reschedule, cancellation.
**Feature 39:** low balance (≤ 1 session) and overdue balance alerts.

### Module 10: WhatsApp (wa.me links)

**Feature 40:** message editor before sending.

#### Template 1 — Welcome (`welcomeIntake`)
Arabic:
```
مرحباً {patientName} 👋
أهلاً بك في عيادة {clinicName}.
تم تسجيل بياناتك بنجاح وسيتواصل معك الفريق لتأكيد مواعيد جلساتك.
نتمنى لك دوام الصحة والعافية!
```
English:
```
Hello {patientName},
Welcome to {clinicName}. Your intake has been registered successfully. Our team will contact you shortly to confirm your session schedule.
Wishing you a rapid recovery!
```

#### Template 2 — Reminder (`appointmentReminder`)
Arabic:
```
تذكير بموعد الجلسة 🩺

أهلاً {patientName}،
نذكرك بموعد جلستك القادمة مع {doctorName} في {clinicName}:
📅 التاريخ: {date}
⏰ الوقت: {time}

يرجى الحضور قبل الموعد بـ 10 دقائق. لتأكيد أو تعديل الموعد برجاء الرد على هذه الرسالة.
```
English:
```
Session Reminder 🩺

Dear {patientName},
This is a reminder for your upcoming session with {doctorName} at {clinicName}:
📅 Date: {date}
⏰ Time: {time}

Please arrive 10 minutes prior. To confirm or reschedule, reply directly to this message.
```

#### Template 3 — Reschedule (`rescheduleNotice`)
Arabic:
```
تعديل موعد جلسة العلاج الطبيعي 🔄

أهلاً {patientName}،
تم تعديل موعد جلستك مع {doctorName} في مركز {clinicName}:
📅 التاريخ: {date}
⏰ الموعد الجديد: {newTime} (الموعد السابق: {oldTime})

يسعدنا تأكيدك للموعد الجديد!
```
English:
```
Appointment Rescheduled 🔄

Dear {patientName},
Your session with {doctorName} at {clinicName} has been adjusted:
📅 Date: {date}
⏰ New Time: {newTime} (Previously: {oldTime})

Please let us know if this time suits you!
```

#### Template 4 — Low sessions (`lowSessionAlert`)
Arabic:
```
أهلاً {patientName} 🌸
نحيطك علماً بأنه متبقي لديك ({remainingSessions}) جلسة فقط من باقة العلاج الطبيعي الخاصة بك:
"{packageName}".

لضمان استمرار الخطة العلاجية دون انقطاع، يسعدنا تجديد الباقة وتثبيت مواعيدك مع الأخصائي المعالج. مركز {clinicName}.
```
English:
```
Dear {patientName} 🌸
Friendly notice from {clinicName}: You have only ({remainingSessions}) session(s) left in your package: "{packageName}".
To guarantee uninterrupted recovery, we are glad to assist you with renewing your package.
```

#### Template 5 — Balance due (`balanceDueReminder`)
Arabic:
```
أهلاً {patientName} 📋
تحية طيبة من مركز {clinicName}.
نود تذكيرك بالرصيد المتبقي على باقة العلاج الطبيعي ({packageName}):
المبلغ المستحق: {balanceDue} ج.م.

يمكنك السداد عبر إنستاباي (InstaPay) أو فودافون كاش أو بالعيادة نقداً/فيزا.
لأي استفسار يسعدنا تواصلك دائماً!
```
English:
```
Dear {patientName} 📋
Greetings from {clinicName}.
Friendly reminder regarding the pending balance for package ({packageName}):
Amount Due: {balanceDue} EGP.
Payment can be made via InstaPay, Vodafone Cash, or in-clinic (Cash/Card). Thank you!
```

### Module 11: Exports & Audit

**Feature 41: Patients CSV** — AR: المعرف، الاسم بالكامل، الهاتف (مصري)، نوع الدفع، العمر، النوع، الحالة، التشخيص، إجمالي الجلسات، المتبقي، الرصيد المستحق (ج.م) · EN: ID, Full Name, Phone (Egyptian), Payment Type, Age, Gender, Status, Diagnosis, Total Sessions, Remaining, Balance Due (EGP).
**Feature 42: Receipts CSV** — AR: المعرف، التاريخ والوقت، المريض، الباقة، المبلغ (ج.م)، طريقة الدفع، المسؤول، ملاحظات · EN: Receipt ID, Date & Time, Patient Name, Package, Amount (EGP), Payment Method, Collected By, Notes.
**Feature 43: Expenses CSV** — AR: المعرف، التاريخ، العنوان والوصف، سبب ومبرر الصرف، التصنيف، المبلغ (ج.م)، طريقة الدفع، المسؤول · EN: Expense ID, Date, Title & Description, Reason / Justification, Category, Amount (EGP), Payment Method, Logged By.
**Feature 44:** JSON full backup export.
**Feature 45: Audit trail** — who (ID, name, role), when, what (action + details), before/after. Events: patient create/edit, booking, reschedule, cancellation, no-show, check-in, payment, void, package extension, commission payout, expense create/edit, security changes.

---

## 5. Data Entities (old)

- **Clinic:** id, name, nameAr, branch, branchAr, address, addressAr, phone, currency, pricingConfig (single session, assessment, home visit), workingHours (start 9, end 21, slot 60), securityConfig (geofence, SSID, allowed IPs, simulator state).
- **User:** id, clinicId, name, email, role, specialty, commissionRate, avatar, phone, password, passwordHint.
- **Patient:** id, clinicId, fullName, phone, whatsapp, age, gender, status (active/lead), paymentType (package/cash/insurance), insuranceCompany, referringDoctor, primaryDiagnosis, assignedPhysioId, medicalAlerts[], notes, documents[], createdAt.
- **PatientDocument:** id, patientId, clinicId, title, type (prescription/xray/mri/lab_report/other), fileData (Base64 WebP), uploadedAt, uploadedBy, notes.
- **TreatmentPackage:** id, clinicId, patientId, packageName, totalSessions, completedSessions, remainingSessions, totalPrice, amountPaid, balanceDue, paymentMethod, status (active/completed/expired/forfeited), startDate, purchaseDate, expiryDate, receipts[].
- **Appointment:** id, clinicId, patientId, physioId, packageId, date, startTime, duration, price, roomOrBed, roomId, bedNumber, status (scheduled/arrived/completed/cancelled/no-show/waitlisted), sessionType (physiotherapy/nutrition/consultant_assessment), arrivedAt, delayMinutes, earlyMinutes, painScore, soapNotes, doctorNotes, homeExercises, attachments[], cancellationReason, cancelledAt, noShowReason, markedNoShowAt.
- **PaymentReceipt:** id, clinicId, receiptNumber, packageId, appointmentId, patientId, amount, paymentMethod, date, receiptImage, notes, collectedBy, isVoided, voidedAt, voidedBy, voidReason.
- **ClinicExpense:** id, clinicId, title, amount, category, paymentMethod, date, loggedBy, loggedById, reason, receiptImage, notes, editHistory[], createdAt, updatedAt.
- **InBodyRecord:** id, patientId, date, weightKg, targetWeightKg, skeletalMuscleMassKg, bodyFatPercentage, visceralFatLevel, bmi, bmrKcal, dailyCalorieTarget, proteinGrams, carbsGrams, fatsGrams, protocol.
- **AuditLog:** id, clinicId, userId, userName, userRole, action, details, before, after, timestamp.

---

## 6. Business Rules (old)
- Phone unique, normalized, Egyptian format; duplicate name = warning only; no prior assessment required.
- Overlap: NewStart < ExistingEnd AND NewEnd > ExistingStart. Doctor max 10/day. Room bed capacity 1–2. Waitlist keeps record.
- Packages: free pricing; 60-day validity; booking after expiry blocked; forfeiture; admin extension with reason; deduction only on completion.
- Billing: overpayment blocked; balances calculated from receipts; sequential receipts; admin void with reason; price lock after payment.
- Clinical/ops: geofence for clinicians; receptionist clinical masking; receptionist expenses today only; audit with before/after.

## 7. Status Matrix (old)
The old prototype marked all 45 features as "WORKING". This was NOT verified and is not reliable.

---

## 8. Demo Data Reference (for staging only — never production)

**Clinic:** `clinic-cairo-01`, Masaar Clinic (عيادة مسار), Main Center, 14 Road 213, Degla, Maadi, Cairo; +201002345678; EGP. Example prices: single session 450 EGP, assessment 600 EGP, home visit 850 EGP.

**Rooms:** Room 1 (غرفة ١): 2 beds — Electrotherapy & Manual Therapy · Room 2 (غرفة ٢): 2 beds — Shockwave, Laser & Cryotherapy · Room 3 (غرفة ٣): 1 bed — Consultant Assessment & Neuro · Room 4 (غرفة ٤): 1 bed — Clinical Nutrition & InBody.

**Demo staff (names only — old demo passwords removed on purpose):**
1. Dr. Tarek Mansour — Admin/Owner — Consultant Orthopedic & Sports Physio (PhD)
2. Mariam El-Shennawy — Receptionist — Head of Front Desk & Patient Relations
3. Dr. Ahmed Radwan — Physiotherapist — Senior Sports Injury & Spine Specialist — 25%
4. Dr. Nourhan Adel — Physiotherapist — Pediatric & Neurological Rehab Specialist — 20%
5. Eng. Karim El-Sayed — Co-Admin — Managing Partner & Executive Operations
6. Dr. Salma Hegazy — Diet Doctor — Clinical Nutrition & Medical Diet Consultant — 30%
7. Eng. Mostafa — Dev (removed in v2)

**Example package templates:** 6-Session Targeted Recovery (باقة التعافي المركز) 2,500 EGP · 10-Session Comprehensive Rehab (باقة التأهيل المتكامل) 4,000 EGP · 12-Session Sports & Post-Op Protocol (باقة الرياضيين وما بعد الجراحة) 4,800 EGP · 16-Session Neurological Neuro-Facilitation (باقة التأهيل العصبي والحركي) 6,800 EGP.

---

## 9. Old "Future" Notes (moved to v2 spec §16 "Later")
Multi-branch tenant partitioning · ETA Egypt e-invoicing · WhatsApp Cloud API automated reminders · object storage for files · real-time WebSocket calendar sync.
