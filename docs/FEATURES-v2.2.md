# Masaar Clinic System — Product Specification v2.2

> **v2.2 Change List (Applied from Task 1.02 Decisions):**
> 1. **§1.1 & §15.1 (Covering Access Limit):** Clinician covering access explicitly limited to the active login session (max 12h or until logout/idle lock).
> 2. **§1.1, §2, §5.1, §8.3 (Price Change Auditing):** Every price change (before or after payment) writes an audit log entry with old price, new price, and user. Receptionist can adjust price at initial booking before payment; price change after payment remains Owner/Manager only.
> 3. **§1.1, §8.4, §10 (Expense Locking on Closed Shift):** Expenses included in a completed cash shift closing are locked from receptionist edit/void.
> 4. **§4.1 & §4.2 (Patient Phone & Dependents Model):** Adults require unique Egyptian mobile (`01XXXXXXXXX`, DB partial unique index `WHERE mobile_phone IS NOT NULL`). Dependents (child/elderly) have checkbox "Uses guardian's phone" requiring guardian name, relation, and guardian phone (Egyptian mobile format); own mobile empty; WhatsApp routes to guardian phone. Guardian phone may repeat across dependents. Patient search by phone matches both `mobilePhone` and `guardianPhone`. Separate `whatsappConsent` (boolean) toggle from medical data processing consent.
> 5. **§5.2 & §5.5 (Waitlist & Bed Reservation):** Moving to `waitlisted` releases bed and clinician calendar slot, but retains package session deduction against available sessions. Full checks re-run on `waitlisted → scheduled`. Early session completion holds bed reservation for full scheduled slot.
> 6. **§7 (Package Scope):** Packages in v1 cover Physiotherapy or Nutrition only; Consultant Assessments are billed as standalone single visits.
> 7. **§8.1 (Balance Calculation Formula):** Updated formula: `balance = max(0, owed − (non-voided payments − refunds) − write-offs)`, where `owed` = package price (or value of completed sessions if package is cancelled), or appointment price.
> 8. **§8.2 (Receipt Counter Reset):** Annual counter `INV-YYYY-00001` rolls over at 00:00:00 Cairo local time (`Africa/Cairo`) on Jan 1.
> 9. **§8.3 & §8.4 (Cash Refund Drawer & Logout Closing Prompt):** A cash refund counts in the cash closing of the user who handed out the cash. On logout / switch user with an open cash shift, the system prompts the receptionist to close it first.
> 10. **§9.2 & §9.4 (Note Edit Window & InBody Height):** 24-hour note edit countdown starts from `completedAt`. InBody height pre-fills from profile/previous test, remains editable.
> 11. **§11 (Owner Commission Default):** Owner account default commission is `none` (0%), configurable if desired.
> 12. **§14 (Late Arrival Notification):** Alert triggers if clock passes `startTime + 10 min` unarrived; when checked in, `lateMinutes` stored and notification sent to clinician.
> 13. **§0 (Responsive Viewports & Mobile Adaptations — DEC-027):** All screens responsive from 360px to desktop without horizontal scroll. Front desk desktop-first (tablet supported); clinician and manager views fully usable on phone/tablet; 44px touch targets; tables collapse to cards; calendar to clinician day list.

> **Single source of truth for the project.** Where this file conflicts with any older document, THIS FILE wins.  
> Scope: **one clinic, one branch.** Old spec kept as `docs/OLD-FEATURES.md` for reference only (WhatsApp template wording, demo names).

---

## 0. Ground rules for the builder (read first)

1. **R-0-1** **Every rule in this file is enforced on the server and in the database**, never only in the UI. The UI may also check, but the server is the authority.
2. **R-0-2** Every write action: (a) checks the logged-in user is active, (b) checks their role/permission, (c) validates input, (d) runs inside a database transaction, (e) writes an audit log entry.
3. **R-0-3** **Nothing important is ever deleted.** Appointments, receipts, expenses, staff, notes are cancelled / voided / deactivated, never hard-deleted.
4. **R-0-4** Money is stored as **integer piasters** (450.00 EGP = `45000`). Displayed as EGP.
5. **R-0-5** Timestamps stored in **UTC**, displayed in **Africa/Cairo** time. Dates of appointments are clinic-local dates.
6. **R-0-6** Values that can be calculated are **never stored twice** (balances, remaining sessions, totals are calculated).
7. **R-0-7** Bilingual: Arabic (RTL, default) and English (LTR). Light / dark theme.
8. **R-0-8** No demo data in production. Seed script only for development/staging.
9. **R-0-9** **Responsive viewports:** All screens must be responsive from **360px width** (mobile) to desktop with **zero horizontal scrolling**.
10. **R-0-10** **Receptionist screens:** Optimized **desktop-first** for high-volume front desk operations, with full tablet support.
11. **R-0-11** **Clinician screens:** Treating clinician workspaces (today queue, patient clinical file, session completion form, nutrition consultation & InBody) fully responsive on **tablet and phone**.
12. **R-0-12** **Owner / Manager screens:** Operational and executive views (today summary, reports, cash closing reviews, price/void approvals) fully usable on **phone**.
13. **R-0-13** **Mobile UI adaptations:** Minimum touch target size **44px × 44px** for buttons/inputs; data tables collapse into stacked cards on phone; multi-bed calendar converts to single-clinician day list on phone; side menu converts to role-filtered hamburger or bottom navigation bar.

---

## 1. Roles & permissions

| Role | Who | Summary |
|---|---|---|
| **R-1-1** **Owner** | Clinic owner / head consultant | Everything, including staff accounts, settings, security. Also works as a clinician. |
| **R-1-2** **Manager** | Partner / operations | Everything financial & operational. **Cannot** manage staff accounts, roles, or security settings. |
| **R-1-3** **Receptionist** | Front desk | Patients (admin data), scheduling, check-in, payments, today's expenses, cash closing. **No clinical data.** |
| **R-1-4** **Physiotherapist** | Therapist | Own schedule, clinical records of their patients, complete sessions. **No finance.** |
| **R-1-5** **Nutritionist** | Diet doctor | Same as physiotherapist, for nutrition consultations + InBody. **No finance.** |

**R-1-6** (No "Dev" role in production. Developers use the staging copy with fake data.)

### 1.1 Permission matrix

| Action | Owner | Manager | Reception | Physio | Nutrition |
|---|:-:|:-:|:-:|:-:|:-:|
| **R-1.1-1** Create / edit patient admin data | ✅ | ✅ | ✅ | ❌ | ❌ |
| **R-1.1-2** View / edit diagnosis, clinical notes, medical docs | ✅ | ❌ | ❌ | ✅ (own patients*) | ✅ (own patients*) |
| **R-1.1-3** Upload documents | ✅ | ✅ | ✅ (can upload, cannot view medical ones afterwards) | ✅ | ✅ |
| **R-1.1-4** Book / reschedule / cancel / waitlist | ✅ | ✅ | ✅ | ✅ own appts | ✅ own appts |
| **R-1.1-5** Check in | ✅ | ✅ | ✅ | ❌ | ❌ |
| **R-1.1-6** Mark no-show / undo no-show (same day) | ✅ | ✅ | ✅ | ✅ own | ✅ own |
| **R-1.1-7** Complete session | ✅ (as clinician) | ❌ | ❌ | ✅ own | ✅ own |
| **R-1.1-8** Re-open a completed session | ✅ | ❌ | ❌ | ❌ | ❌ |
| **R-1.1-9** Create package | ✅ | ✅ | ✅ | ❌ | ❌ |
| **R-1.1-10** Extend package / write off balance | ✅ | ✅ | ❌ | ❌ | ❌ |
| **R-1.1-11** Record payment | ✅ | ✅ | ✅ | ❌ | ❌ |
| **R-1.1-12** Void receipt / issue refund | ✅ | ✅ | ❌ | ❌ | ❌ |
| **R-1.1-13** Change price before payment | ✅ | ✅ | ✅ (audited) | ❌ | ❌ |
| **R-1.1-14** Change price after payment exists | ✅ | ✅ (audited) | ❌ | ❌ | ❌ |
| **R-1.1-15** Add expense | ✅ | ✅ | ✅ (today only) | ❌ | ❌ |
| **R-1.1-16** Edit / void expense | ✅ | ✅ | ✅ own, same day only (unclosed shift only) | ❌ | ❌ |
| **R-1.1-17** View expenses history, reports, commissions | ✅ | ✅ | ❌ | ❌ | own commission only |
| **R-1.1-18** Close cash shift | ✅ | ✅ | ✅ | ❌ | ❌ |
| **R-1.1-19** Staff accounts, roles, schedules, settings | ✅ | schedules & rooms only | ❌ | ❌ | ❌ |
| **R-1.1-20** View audit log, export CSV | ✅ | ✅ | ❌ | ❌ | ❌ |

**R-1.1-21** \* **Own patients** = patient is assigned to them OR has an appointment with them. A clinician may open any other patient using **"Covering access"** (must type a reason; logged and visible to Owner). Covering access is valid only for the duration of the clinician's active login session (maximum 12 hours or until logout/idle lock). A new covering access reason is required for subsequent sessions or days.

---

## 2. Clinic settings

- **R-2-1** **Profile:** name (AR/EN), address (AR/EN), phone, logo.
- **R-2-2** **Weekly opening hours:** set per weekday (Sat–Fri). Each day: open/closed + open time + close time. Clinic may be open 7 days.
- **R-2-3** **Closures:** specific dates the clinic is closed (holidays, Eid, etc.) with a label.
- **R-2-4** **Rooms & beds:** rooms (name AR/EN, active flag) each with 1..N beds (name, active flag). Deactivate, never delete.
- **R-2-5** **Session types:** Physiotherapy, Nutrition, Consultant Assessment. Each has a **default duration** and **default price** (editable suggestions only — receptionist can change per booking before payment, audited). Packages in v1 cover Physiotherapy or Nutrition only; Consultant Assessments are billed as single visits.
- **R-2-6** **Package expiry days:** default 60.
- **R-2-7** **Doctor daily soft limit:** default 10 (warning only, configurable per doctor).
- **R-2-8** **Receipt prefix:** `INV`.

---

## 3. Staff

**R-3-1** Fields: full name, email (login), phone, job title, role, **active flag**, commission type (`percent` | `fixed_per_session` | `none`, default for Owner is `none`) and value, preferred language.

- **R-3-2** **Weekly schedule** per clinician: for each weekday, working or not + start/end time (can have 2 shifts per day).
- **R-3-3** **Leave:** date range + type (annual, sick, other) + note.
- **R-3-4** Passwords: hashed only. No password hints. Owner can **reset** a password → user must change it at next login. Minimum 8 characters.
- **R-3-5** Deactivated staff cannot log in, disappear from booking lists, but keep all history.

---

## 4. Patients

### 4.1 Fields

| Field | Required | Notes |
|---|:-:|---|
| **R-4.1-1** Full name | ✅ | max 120 chars |
| **R-4.1-2** Mobile phone | ✅ (adults) | Egyptian mobile, stored normalized as `01XXXXXXXXX`. **Unique for adults** (DB partial unique index `WHERE mobile_phone IS NOT NULL`). Left empty for dependents using guardian phone. |
| **R-4.1-3** Uses guardian's phone | — | Checkbox (boolean, default false). Used for children / elderly dependents. |
| **R-4.1-4** Guardian name | — | Required if "Uses guardian's phone" is checked. |
| **R-4.1-5** Guardian relationship | — | Required if "Uses guardian's phone" is checked (e.g. Father, Mother, Son, Daughter, Spouse, Other). |
| **R-4.1-6** Guardian phone | — | Required if "Uses guardian's phone" is checked. Egyptian mobile, validated and stored normalized as `01XXXXXXXXX`. May repeat across dependents (e.g. siblings). |
| **R-4.1-7** WhatsApp number | — | Defaults to mobile phone (adults) or guardian phone (dependents). |
| **R-4.1-8** Date of birth | ✅ | age is calculated, never stored |
| **R-4.1-9** Gender | ✅ | male / female |
| **R-4.1-10** Address | — | free text (area, street) |
| **R-4.1-11** Emergency contact name + phone | — | Contact person for emergencies |
| **R-4.1-12** Preferred language | ✅ | Arabic / English — decides WhatsApp template language |
| **R-4.1-13** Referral source | ✅ | list: Doctor referral, Facebook, Instagram, Google, Friend/family, Walk-in, Other (+ text) |
| **R-4.1-14** Referring doctor | — | text |
| **R-4.1-15** Reason for visit / complaint | ✅ | written by receptionist (NOT a diagnosis) |
| **R-4.1-16** Medical alerts | — | Diabetic, Pacemaker, Hypertension, Osteoporosis, Fall risk, Pregnancy, Other(+text). Visible to clinicians; receptionist sees only "⚠ has alerts" |
| **R-4.1-17** Assigned physiotherapist | — | |
| **R-4.1-18** Assigned nutritionist | — | |
| **R-4.1-19** Status | auto | `lead` → `active` → `discharged` |
| **R-4.1-20** Data consent | ✅ | checkbox + date: patient agreed to medical data processing |
| **R-4.1-21** WhatsApp consent | ✅ | checkbox (boolean, default true): separate consent for receiving WhatsApp messages. If unchecked, profile shows "Opted out" |
| **R-4.1-22** Diagnosis | — | **clinicians only** |

### 4.2 Rules
- **R-4.2-1** **Phone validation:** accept `01XXXXXXXXX`, `+201XXXXXXXXX`, `00201XXXXXXXXX`, with spaces/dashes. Normalize, then validate `^01[0125][0-9]{8}$` for both `mobilePhone` and `guardianPhone`.
- **R-4.2-2** **Adult phone uniqueness:** Duplicate adult mobile → block and show existing patient with **Open file** button. Partial unique index: `CREATE UNIQUE INDEX idx_patients_mobile_phone_unique ON patients (mobile_phone) WHERE mobile_phone IS NOT NULL`.
- **R-4.2-3** **Dependents phone model:** Dependents with "Uses guardian's phone" checked leave `mobilePhone` empty. `guardianPhone` is stored normalized as `01XXXXXXXXX` and is allowed to repeat across multiple dependents (e.g. parent booking for two children).
- **R-4.2-4** **Patient search by phone:** Searching by phone number matches both `mobilePhone` and `guardianPhone`, allowing the receptionist to instantly locate all dependents associated with a parent's mobile number.
- **R-4.2-5** **Similar name:** (Arabic-normalized: أ/إ/آ→ا, ة→ه, ى→ي, remove spaces in "عبد ال...") → warning only.
- **R-4.2-6** **Status:** becomes `active` automatically at first check-in. `discharged` set by clinician/Owner; booking a discharged patient re-activates them (with confirmation).
- **R-4.2-7** No assessment is required before treatment.

### 4.3 Patient profile page (one screen)
**R-4.3-1** Tabs: **Overview** (contact, guardian details if dependent, alerts, assigned doctors, active package, balance) · **Appointments** (past & future) · **Packages** · **Payments** · **Documents** · **Clinical** (clinicians only) · **Nutrition** (clinicians only) · **Activity** (audit, Owner/Manager).

---

## 5. Scheduling

### 5.1 Appointment fields
**R-5.1-1** patient, session type, clinician, room, bed, date, start time, duration (15–180, steps of 15), **price** (EGP; not needed when covered by a package), package (optional), status, notes for reception, created by.
- **R-5.1-2** **Price changes:** Every price change (before or after payment) writes an audit log entry with `oldPrice`, `newPrice`, reason, and user id. Receptionist can adjust price before payment; changing price after payment is Owner/Manager only.

### 5.2 Booking checks (all on the server, all in one transaction)
A booking or reschedule is **rejected** if any of these fail:
1. **R-5.2-1** Date is not a clinic closure and the time is fully inside that weekday's opening hours.
2. **R-5.2-2** Clinician is active, scheduled to work at that time, and not on leave.
3. **R-5.2-3** **Clinician overlap:** no other active appointment for the clinician where `newStart < existingEnd AND newEnd > existingStart`.
4. **R-5.2-4** **Bed overlap:** same rule for the bed.
5. **R-5.2-5** **Patient overlap:** the patient is not booked anywhere else at an overlapping time.
6. **R-5.2-6** **Patient daily limit:** max 1 per session type per patient per day (1 assessment + 1 physio + 1 nutrition allowed same day).
7. **R-5.2-7** If linked to a package: package is active, date ≤ expiry date, and **available sessions > 0** where
   `available = total − completed − future booked (scheduled/arrived/waitlisted)`.
   Moving an appointment to `waitlisted` frees the calendar bed/clinician slot, but retains the package session hold. When moving `waitlisted → scheduled`, full booking overlap checks re-run.
8. **R-5.2-8** Session type must match clinician role (physio types → physiotherapist/Owner; nutrition → nutritionist; assessment → Owner or clinicians flagged "can assess").

**R-5.2-9** "Active appointment" = status `scheduled`, `arrived`, or `completed`.  
**R-5.2-10** **Bed reservation persistence:** When a session is completed early, the bed reservation holds for the full scheduled duration to maintain calendar stability and prevent overlap collisions, unless the front desk explicitly reschedules or books a walk-in.

**R-5.2-11** **Warning only (can continue):** clinician over their daily soft limit; similar-name patient.

**R-5.2-12** **Database safety net:** PostgreSQL exclusion constraints (btree_gist) on (clinician, time range) and (bed, time range) for active appointments, so double booking is impossible even if two receptionists click at the same second.

### 5.3 Recurring booking
**R-5.3-1** "Book a series": days of week (e.g. Sun/Tue/Thu) + time + number of sessions (or until package expiry). System checks every date, shows a preview list with ✅/❌ per date and the reason, receptionist can change failed dates, then confirms all at once.

### 5.4 Calendar
- **R-5.4-1** Day view (columns = beds, rows = 15-minute slots for the day's opening hours) and Week view per clinician.
- **R-5.4-2** Filters: clinician, room, session type. Search by patient name/phone.
- **R-5.4-3** Appointment card: patient name, type, clinician, time, payment pill (Package / Paid / Partly paid / Unpaid), status color.
- **R-5.4-4** Click card → action panel (see 6). Drag & drop allowed only for `scheduled` / `arrived`, runs all checks, rejects with the reason.
- **R-5.4-5** Waitlist side panel.

### 5.5 Appointment statuses & allowed changes

| From → To | Who | Notes |
|---|---|---|
| **R-5.5-1** scheduled → arrived | Reception | stores `arrivedAt`, late minutes |
| **R-5.5-2** arrived → scheduled (undo check-in) | Reception | same day only, reason |
| **R-5.5-3** arrived → completed | Clinician of the appointment | via completion form; deducts package session |
| **R-5.5-4** scheduled → cancelled | Reception, clinician (own) | reason required |
| **R-5.5-5** arrived → cancelled | Reception | patient left; reason |
| **R-5.5-6** scheduled → no_show | Reception, clinician (own) | only after start time; reason |
| **R-5.5-7** no_show → scheduled | Reception, clinician (own) | same day only, reason |
| **R-5.5-8** scheduled → waitlisted | Reception | keeps record, frees bed/clinician slot, retains package session hold |
| **R-5.5-9** waitlisted → scheduled | Reception | full checks re-run as a new booking |
| **R-5.5-10** waitlisted → cancelled | Reception | reason; releases package session hold |
| **R-5.5-11** completed → arrived (re-open) | Owner | reason; restores package session |

**R-5.5-12** Anything not in this table is **blocked**. `cancelled` is final (book again if needed). Every change is audited.

**R-5.5-13** Cancellation / no-show reasons: patient request, illness, transport, emergency, no contact, clinic-initiated, other (+text). **No package session is ever deducted** for cancel / no-show.

---

## 6. Front desk

- **R-6-1** **Today screen:** counts (scheduled, arrived, completed, cancelled, no-show), arriving next, waiting list, unpaid today, packages expiring in ≤ 7 days, packages with ≤ 1 session left.
- **R-6-2** **Appointment action panel:** Patient summary (no clinical data) · Check in · Undo check-in · Reschedule · Cancel · No-show · Collect payment · WhatsApp · Print receipt.
- **R-6-3** **Tomorrow's reminders:** list of all next-day appointments, one-click WhatsApp each, mark "reminder sent" (stored).
- **R-6-4** **WhatsApp:** `wa.me` links (no paid API). Message editor before sending. Check `whatsappConsent` (if false, display "Opted out" warning). Route message to `guardianPhone` if patient uses a guardian phone. Templates in AR/EN by patient's preferred language: welcome, reminder, reschedule (shows old date+time and new date+time), low sessions, balance due, package expiring soon. Use `{packageType}` not hard-coded "physiotherapy". Template text editable by Owner in settings.

---

## 7. Packages

**R-7-1** Fields: patient, session type covered (physio or nutrition only; assessments are standalone single visits), name, total sessions, total price, purchase date, expiry date (purchase + 60 days, end of day), status, created by.

- **R-7-2** Price and session count entered freely (optional templates as suggestions).
- **R-7-3** **Per-session value** = total price ÷ total sessions (used for commission, cancelled package balance, and refunds).
- **R-7-4** Status (calculated):
  - `active` — today ≤ expiry and sessions remain
  - `completed` — all sessions completed
  - `expired` — today > expiry and sessions remain → remaining sessions are **forfeited**
  - `cancelled` — cancelled by Owner/Manager (with refund decision)
- **R-7-5** **Unpaid balance stays owed after expiry.** Owner/Manager can **write off** a balance (reason, audited).
- **R-7-6** **Extension:** Owner/Manager, + N days (1–365), reason required, audited; expired package becomes active again if sessions remain.
- **R-7-7** A patient may have more than one active package (e.g. one physio, one nutrition). When booking, the system suggests the active package of that type with the earliest expiry.
- **R-7-8** Future booked sessions dated after expiry are impossible (blocked at booking; extension does not move them).

---

## 8. Billing

### 8.1 Model
- **R-8.1-1** A **charge** is created for every package (= package price) and every appointment not covered by a package (= appointment price).
- **R-8.1-2** A **payment** is always linked to one charge. No free deposits in v1 (a patient who wants to prepay buys a package).
- **R-8.1-3** **Balance formula:**
  $$\text{balance} = \max(0, \text{owed} - (\text{non-voided payments} - \text{refunds}) - \text{write-offs})$$
  Where:
  - For an active or completed package: $\text{owed} = \text{package.totalPrice}$
  - For a cancelled package: $\text{owed} = \text{completedSessions} \times \text{perSessionValue}$
  - For a standalone appointment: $\text{owed} = \text{appointment.price}$
  - Balances are **never stored in the database**; always calculated dynamically.

### 8.2 Payment
**R-8.2-1** Fields: charge, amount (> 0 and ≤ remaining balance), method (Cash, InstaPay, Vodafone Cash, Visa/Card, Fawry), reference / note, optional proof image, received by (user), date-time.

- **R-8.2-2** Receipt number: `INV-YYYY-00001`, sequential per year, generated by a database counter inside the transaction (no gaps from double clicks, no duplicates).
- **R-8.2-3** Counter resets at 00:00:00 Cairo local time (`Africa/Cairo`) on January 1st of each year.
- **R-8.2-4** Printable receipt (A5 / thermal-friendly page, AR/EN, clinic header) → print or save as PDF from the browser.

### 8.3 Corrections
- **R-8.3-1** **Void** (Owner/Manager): for mistakes. Reason required. Receipt stays visible struck through, excluded from totals.
- **R-8.3-2** **Refund** (Owner/Manager): money returned to patient. Separate record (amount, method, reason). Max = amount paid − value of sessions already used (package) or amount paid (appointment). Policy default: no refund for expired packages unless Owner approves.
  - **R-8.3-3** **Cash refund drawer attribution:** A cash refund reduces the expected cash closing of the specific user who physically handed out the cash.
- **R-8.3-4** **Price changes:** Every price change (before or after payment) writes an audit log entry with `oldPrice`, `newPrice`, reason, and user id. Receptionist can adjust price before payment; changing price after payment exists is Owner/Manager only and cannot go below amount already paid.

### 8.4 Cash closing (end of shift)
- **R-8.4-1** Receptionist clicks **Close shift**: system shows:
  $$\text{expected cash} = \text{cash payments} - \text{cash refunds handed out} - \text{cash expenses recorded}$$
  by that user since their last closing. Receptionist enters counted cash. Difference saved.
- **R-8.4-2** **Logout prompt:** On logout or "Switch user", if the logged-in receptionist has an active unclosed cash shift with recorded cash transactions, the system prompts them to complete their shift closing first.
- **R-8.4-3** **Locking:** Once an expense or transaction is included in a completed Cash Closing, it is locked from modification or voiding by the receptionist. Any subsequent adjustments require an Owner or Manager with an audit explanation.
- **R-8.4-4** Owner/Manager see all closings and differences. Non-cash methods are listed for reconciliation but not counted in cash drawer.

---

## 9. Clinical records (clinicians only)

### 9.1 Session completion form (physiotherapy / assessment)
- **R-9.1-1** Pain before (0–10) and after (0–10) — **0–10 scale**
- **R-9.1-2** SOAP: Subjective, Objective, Assessment, Plan
- **R-9.1-3** Treatment given (multi-select: TENS, Ultrasound, Shockwave, Laser, Manual therapy, Dry needling, Exercise therapy, Other)
- **R-9.1-4** Home exercises (text; carried forward from last session, editable)
- **R-9.1-5** Attachments
- **R-9.1-6** At least one of S/O/A/P or treatment must be filled.

**R-9.1-7** Saving marks the appointment `completed` (and uses one package session if linked).

### 9.2 Note editing
- **R-9.2-1** Author can edit their note for **24 hours**, starting from the exact initial save timestamp (`completedAt`). Every edit keeps a version (who, when, previous text).
- **R-9.2-2** After 24 hours: locked; only **addendum** notes can be added.

### 9.3 Diagnosis
**R-9.3-1** Clinicians set/update the diagnosis on the patient's Clinical tab (with history).

### 9.4 Nutrition consultation
**R-9.4-1** InBody record: date, **height (cm)** (pre-filled from patient profile / previous test, remains editable), weight, target weight, skeletal muscle mass, body fat %, visceral fat (1–20), BMI (auto from height & weight), BMR (auto, Mifflin-St Jeor from weight, height, age, gender — editable if InBody device gives its own), calorie target, protein/carbs/fat grams, protocol (Keto, Anti-inflammatory low carb, Intermittent fasting, Sports, Diabetic/insulin resistance, Post-bariatric, Other), notes, attachments. Progress chart of weight / fat % / muscle over time.

### 9.5 Documents
**R-9.5-1** Categories: Prescription, X-ray, MRI, Lab report, Referral, ID / administrative, Payment proof, Other. Files (images, PDF; max 10 MB) stored privately on the server, opened only through a logged-in, permission-checked link. Every view logged. Medical images shown with a watermark (viewer name + time). Receptionist can view only `ID / administrative` and `Payment proof`.

---

## 10. Expenses
**R-10-1** Fields: title, category (Supplies, Equipment, Maintenance, Rent, Utilities, Salaries, Doctor commission, Hospitality, Marketing, Other), amount, method, date, reason, optional receipt image, created by.
- **R-10-2** Receptionist: add today only; edit/void own same day (only if not yet included in a closed cash shift).
- **R-10-3** Owner/Manager: all; edits keep history; **void instead of delete**.

---

## 11. Commission
- **R-11-1** Earned per **completed** session by the clinician of that session:
  - Value of session = appointment price, or package per-session value.
  - `percent` → value × %; `fixed_per_session` → fixed amount; `none` → 0 (Owner account defaults to `none`).
- **R-11-2** **Payout:** Owner/Manager selects clinician + period → sees unpaid earned sessions → confirms → creates a payout record + expense (`Doctor commission`). Those sessions are marked paid so they can never be paid twice.
- **R-11-3** Clinicians see their own earned / paid totals.
- **R-11-4** **Voiding Payout:** Owner/Manager can void a commission payout voucher with a required reason. Voiding marks the voucher as voided (`isVoided = true`), automatically voids the linked `Doctor commission` expense voucher, and releases the linked completed sessions so they can be recalculated in a subsequent payout run. Action is fully audited.

---

## 12. Reports (Owner/Manager)
**R-12-1** Period filter: today, this week, this month, custom.
1. **R-12-2** **Daily summary:** collections by method, refunds, expenses, net, sessions completed, cash closings.
2. **R-12-3** **Outstanding balances:** per patient, oldest first.
3. **R-12-4** **Packages:** active, expiring in 7 days, expired with forfeited sessions.
4. **R-12-5** **Clinician performance:** sessions completed, no-show rate, utilization (booked minutes ÷ scheduled minutes), commission earned/paid.
5. **R-12-6** **Attendance:** cancellation & no-show rate by reason.
6. **R-12-7** **Referral sources:** new patients by source.
**R-12-8** CSV export for each (Owner/Manager, audited). No diagnosis in exports.

---

## 13. Audit log
**R-13-1** Every create / update / status change / payment / void / refund / write-off / extension / price change / login / failed login / covering access / document view / export / settings change.
**R-13-2** Fields: time, user, role, action, entity, entity id, before, after, reason, IP.
**R-13-3** Stored in its own table; the application has **no update or delete** function for it. Owner/Manager can view and filter.

---

## 14. Notifications (in-app)
- **R-14-1** Patient checked in (to clinician)
- **R-14-2** Late arrival: If current time exceeds appointment start time by > 10 minutes and patient has not arrived, dashboard alert is displayed; when checked in, `lateMinutes` is stored and an immediate notification is sent to the assigned clinician.
- **R-14-3** Appointment changed/cancelled (to clinician)
- **R-14-4** Package with ≤ 1 session
- **R-14-5** Package expiring in ≤ 7 days  
**R-14-6** Refreshed every 30 seconds. Mark as read.

---

## 15. Authentication & security

### 15.1 Login
- **R-15.1-1** Email + password. Passwords hashed (bcrypt/argon2), minimum 8 characters, never shown or stored readable.
- **R-15.1-2** Generic error message ("email or password is incorrect") — never reveal which one is wrong.
- **R-15.1-3** 5 failed attempts → account locked 15 minutes; Owner notified in audit log.
- **R-15.1-4** Session: secure httpOnly cookie, expires after 12 hours; auto-lock after 15 min idle (re-enter password only).
- **R-15.1-5** On **every** server request the user is re-loaded from the database: deactivated users or changed roles take effect immediately.
- **R-15.1-6** Shared front-desk PC: **Switch user** = log out + login screen. If the user has an open cash shift with transactions, system prompts them to close shift before logging out.

### 15.2 OTP — two-step verification (required for all staff)
- **R-15.2-1** Method: **Authenticator app OTP (TOTP)** — Google Authenticator / Microsoft Authenticator. 6-digit code, changes every 30 s. Free, works without internet on the phone, no SMS cost.
- **R-15.2-2** **First login:** user must set up OTP: scan QR code → enter a code to confirm → receives **10 one-time backup codes** (shown once, stored hashed).
- **R-15.2-3** Every login: password → OTP code (or a backup code).
- **R-15.2-4** **Trusted device:** checkbox "Trust this device for 30 days" → no OTP on that browser for 30 days. Owner can revoke all trusted devices of any user.
- **R-15.2-5** 5 wrong OTP codes → 15-minute lock.
- **R-15.2-6** Owner can **reset OTP** for a staff member (lost phone) → user sets it up again at next login. Audited.
- **R-15.2-7** OTP secrets stored encrypted (key in server environment, not in the database).

### 15.3 Forgot password
- **R-15.3-1** "Forgot password" → **6-digit code sent by email**, valid 10 minutes, max 5 attempts, single use → set new password → all sessions and trusted devices of that user are signed out.
- **R-15.3-2** Requires an email sending service (SMTP or transactional email provider) configured in `.env`.
- **R-15.3-3** If email is not configured, only the Owner can reset passwords (user must change it at next login).

### 15.4 Server & data
- **R-15.4-1** HTTPS only. Database not reachable from the internet. Daily off-site backups (see build guide).
- **R-15.4-2** Rate limiting on login, OTP and password-reset endpoints.
- **R-15.4-3** Audit: login success, login failure, lockout, OTP setup, OTP reset, backup code used, password reset, trusted device added/revoked.

---

## 16. Later (NOT in v1)
Insurance (payer, coverage %, patient share, approvals, claims) · patient credit / deposits · home visits · online booking · automatic WhatsApp (Cloud API) · SMS · clinic-network-only access for clinicians (IP allow-list) · multiple branches · e-invoicing (confirm with accountant) · patient mobile app.

---

## 17. Acceptance
**R-17-1** v1 is accepted only when every test in `PhysioFlow_PreDeployment_Test_Checklist.xlsx` (updated for this spec) passes on the **staging** server, and a 2-week pilot runs without data errors.
