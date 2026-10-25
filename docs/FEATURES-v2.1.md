# Masaar Clinic System — Product Specification v2.1
> v2.1 change: section 15 expanded (login, OTP two-step verification, forgot password).

> **Single source of truth for the new project.** Where this file conflicts with any older document, THIS FILE wins.
> Scope: **one clinic, one branch.** Old spec kept as `docs/OLD-FEATURES.md` for reference only (WhatsApp template wording, demo names).

---

## 0. Ground rules for the builder (read first)

1. **Every rule in this file is enforced on the server and in the database**, never only in the UI. The UI may also check, but the server is the authority.
2. Every write action: (a) checks the logged-in user is active, (b) checks their role/permission, (c) validates input, (d) runs inside a database transaction, (e) writes an audit log entry.
3. **Nothing important is ever deleted.** Appointments, receipts, expenses, staff, notes are cancelled / voided / deactivated, never hard-deleted.
4. Money is stored as **integer piasters** (450.00 EGP = `45000`). Displayed as EGP.
5. Timestamps stored in **UTC**, displayed in **Africa/Cairo** time. Dates of appointments are clinic-local dates.
6. Values that can be calculated are **never stored twice** (balances, remaining sessions, totals are calculated).
7. Bilingual: Arabic (RTL, default) and English (LTR). Light / dark theme.
8. No demo data in production. Seed script only for development/staging.

---

## 1. Roles & permissions

| Role | Who | Summary |
|---|---|---|
| **Owner** | Clinic owner / head consultant | Everything, including staff accounts, settings, security. Also works as a clinician. |
| **Manager** | Partner / operations | Everything financial & operational. **Cannot** manage staff accounts, roles, or security settings. |
| **Receptionist** | Front desk | Patients (admin data), scheduling, check-in, payments, today's expenses, cash closing. **No clinical data.** |
| **Physiotherapist** | Therapist | Own schedule, clinical records of their patients, complete sessions. **No finance.** |
| **Nutritionist** | Diet doctor | Same as physiotherapist, for nutrition consultations + InBody. **No finance.** |

(No "Dev" role in production. Developers use the staging copy with fake data.)

### 1.1 Permission matrix

| Action | Owner | Manager | Reception | Physio | Nutrition |
|---|:-:|:-:|:-:|:-:|:-:|
| Create / edit patient admin data | ✅ | ✅ | ✅ | ❌ | ❌ |
| View / edit diagnosis, clinical notes, medical docs | ✅ | ❌ | ❌ | ✅ (own patients*) | ✅ (own patients*) |
| Upload documents | ✅ | ✅ | ✅ (can upload, cannot view medical ones afterwards) | ✅ | ✅ |
| Book / reschedule / cancel / waitlist | ✅ | ✅ | ✅ | ✅ own appts | ✅ own appts |
| Check in | ✅ | ✅ | ✅ | ❌ | ❌ |
| Mark no-show / undo no-show (same day) | ✅ | ✅ | ✅ | ✅ own | ✅ own |
| Complete session | ✅ (as clinician) | ❌ | ❌ | ✅ own | ✅ own |
| Re-open a completed session | ✅ | ❌ | ❌ | ❌ | ❌ |
| Create package | ✅ | ✅ | ✅ | ❌ | ❌ |
| Extend package / write off balance | ✅ | ✅ | ❌ | ❌ | ❌ |
| Record payment | ✅ | ✅ | ✅ | ❌ | ❌ |
| Void receipt / issue refund | ✅ | ✅ | ❌ | ❌ | ❌ |
| Change price after payment exists | ✅ | ✅ | ❌ | ❌ | ❌ |
| Add expense | ✅ | ✅ | ✅ (today only) | ❌ | ❌ |
| Edit / void expense | ✅ | ✅ | ✅ own, same day only | ❌ | ❌ |
| View expenses history, reports, commissions | ✅ | ✅ | ❌ | ❌ | own commission only |
| Close cash shift | ✅ | ✅ | ✅ | ❌ | ❌ |
| Staff accounts, roles, schedules, settings | ✅ | schedules & rooms only | ❌ | ❌ | ❌ |
| View audit log, export CSV | ✅ | ✅ | ❌ | ❌ | ❌ |

\* **Own patients** = patient is assigned to them OR has an appointment with them. A clinician may open any other patient using **"Covering access"** (must type a reason; logged and visible to Owner).

---

## 2. Clinic settings

- **Profile:** name (AR/EN), address (AR/EN), phone, logo.
- **Weekly opening hours:** set per weekday (Sat–Fri). Each day: open/closed + open time + close time. Clinic may be open 7 days.
- **Closures:** specific dates the clinic is closed (holidays, Eid, etc.) with a label.
- **Rooms & beds:** rooms (name AR/EN, active flag) each with 1..N beds (name, active flag). Deactivate, never delete.
- **Session types:** Physiotherapy, Nutrition, Consultant Assessment. Each has a **default duration** and **default price** (editable suggestions only — receptionist can change per booking).
- **Package expiry days:** default 60.
- **Doctor daily soft limit:** default 10 (warning only, configurable per doctor).
- **Receipt prefix:** `INV`.

---

## 3. Staff

Fields: full name, email (login), phone, job title, role, **active flag**, commission type (`percent` | `fixed_per_session` | `none`) and value, preferred language.

- **Weekly schedule** per clinician: for each weekday, working or not + start/end time (can have 2 shifts per day).
- **Leave:** date range + type (annual, sick, other) + note.
- Passwords: hashed only. No password hints. Owner can **reset** a password → user must change it at next login. Minimum 8 characters.
- Deactivated staff cannot log in, disappear from booking lists, but keep all history.

---

## 4. Patients

### 4.1 Fields

| Field | Required | Notes |
|---|:-:|---|
| Full name | ✅ | max 120 chars |
| Mobile phone | ✅ | Egyptian mobile, stored normalized as `01XXXXXXXXX`, **unique** (DB unique index) |
| WhatsApp number | — | defaults to mobile |
| Date of birth | ✅ | age is calculated, never stored |
| Gender | ✅ | male / female |
| Address | — | free text (area, street) |
| Emergency contact name + phone | — | |
| Preferred language | ✅ | Arabic / English — decides WhatsApp template language |
| Referral source | ✅ | list: Doctor referral, Facebook, Instagram, Google, Friend/family, Walk-in, Other (+ text) |
| Referring doctor | — | text |
| Reason for visit / complaint | ✅ | written by receptionist (NOT a diagnosis) |
| Medical alerts | — | Diabetic, Pacemaker, Hypertension, Osteoporosis, Fall risk, Pregnancy, Other(+text). Visible to clinicians; receptionist sees only "⚠ has alerts" |
| Assigned physiotherapist | — | |
| Assigned nutritionist | — | |
| Status | auto | `lead` → `active` → `discharged` |
| Data consent | ✅ | checkbox + date: patient agreed to data processing & WhatsApp messages |
| Diagnosis | — | **clinicians only** |

### 4.2 Rules
- Phone: accept `01XXXXXXXXX`, `+201XXXXXXXXX`, `00201XXXXXXXXX`, with spaces/dashes. Normalize, then validate `^01[0125][0-9]{8}$`. Duplicate → block and show existing patient with **Open file** button.
- Similar name (Arabic-normalized: أ/إ/آ→ا, ة→ه, ى→ي, remove spaces in "عبد ال...") → warning only.
- Status: becomes `active` automatically at first check-in. `discharged` set by clinician/Owner; booking a discharged patient re-activates them (with confirmation).
- No assessment is required before treatment.

### 4.3 Patient profile page (one screen)
Tabs: **Overview** (contact, alerts, assigned doctors, active package, balance) · **Appointments** (past & future) · **Packages** · **Payments** · **Documents** · **Clinical** (clinicians only) · **Nutrition** (clinicians only) · **Activity** (audit, Owner/Manager).

---

## 5. Scheduling

### 5.1 Appointment fields
patient, session type, clinician, room, bed, date, start time, duration (15–180, steps of 15), **price** (EGP; not needed when covered by a package), package (optional), status, notes for reception, created by.

### 5.2 Booking checks (all on the server, all in one transaction)
A booking or reschedule is **rejected** if any of these fail:
1. Date is not a clinic closure and the time is fully inside that weekday's opening hours.
2. Clinician is active, scheduled to work at that time, and not on leave.
3. **Clinician overlap:** no other active appointment for the clinician where `newStart < existingEnd AND newEnd > existingStart`.
4. **Bed overlap:** same rule for the bed.
5. **Patient overlap:** the patient is not booked anywhere else at an overlapping time.
6. **Patient daily limit:** max 1 per session type per patient per day (1 assessment + 1 physio + 1 nutrition allowed same day).
7. If linked to a package: package is active, date ≤ expiry date, and **available sessions > 0** where
   `available = total − completed − future booked (scheduled/arrived/waitlisted)`.
8. Session type must match clinician role (physio types → physiotherapist/Owner; nutrition → nutritionist; assessment → Owner or clinicians flagged "can assess").

"Active appointment" = status `scheduled`, `arrived`, or `completed`.

**Warning only (can continue):** clinician over their daily soft limit; similar-name patient.

**Database safety net:** PostgreSQL exclusion constraints (btree_gist) on (clinician, time range) and (bed, time range) for active appointments, so double booking is impossible even if two receptionists click at the same second.

### 5.3 Recurring booking
"Book a series": days of week (e.g. Sun/Tue/Thu) + time + number of sessions (or until package expiry). System checks every date, shows a preview list with ✅/❌ per date and the reason, receptionist can change failed dates, then confirms all at once.

### 5.4 Calendar
- Day view (columns = beds, rows = 15-minute slots for the day's opening hours) and Week view per clinician.
- Filters: clinician, room, session type. Search by patient name/phone.
- Appointment card: patient name, type, clinician, time, payment pill (Package / Paid / Partly paid / Unpaid), status color.
- Click card → action panel (see 6). Drag & drop allowed only for `scheduled` / `arrived`, runs all checks, rejects with the reason.
- Waitlist side panel.

### 5.5 Appointment statuses & allowed changes

| From → To | Who | Notes |
|---|---|---|
| scheduled → arrived | Reception | stores `arrivedAt`, late minutes |
| arrived → scheduled (undo check-in) | Reception | same day only, reason |
| arrived → completed | Clinician of the appointment | via completion form; deducts package session |
| scheduled → cancelled | Reception, clinician (own) | reason required |
| arrived → cancelled | Reception | patient left; reason |
| scheduled → no_show | Reception, clinician (own) | only after start time; reason |
| no_show → scheduled | Reception, clinician (own) | same day only, reason |
| scheduled → waitlisted | Reception | keeps record, frees slot |
| waitlisted → scheduled | Reception | full checks as a new booking |
| waitlisted → cancelled | Reception | reason |
| completed → arrived (re-open) | Owner | reason; restores package session |

Anything not in this table is **blocked**. `cancelled` is final (book again if needed). Every change is audited.

Cancellation / no-show reasons: patient request, illness, transport, emergency, no contact, clinic-initiated, other (+text). **No package session is ever deducted** for cancel / no-show.

---

## 6. Front desk

- **Today screen:** counts (scheduled, arrived, completed, cancelled, no-show), arriving next, waiting list, unpaid today, packages expiring in ≤ 7 days, packages with ≤ 1 session left.
- **Appointment action panel:** Patient summary (no clinical data) · Check in · Undo check-in · Reschedule · Cancel · No-show · Collect payment · WhatsApp · Print receipt.
- **Tomorrow's reminders:** list of all next-day appointments, one-click WhatsApp each, mark "reminder sent" (stored).
- **WhatsApp:** `wa.me` links (no paid API). Message editor before sending. Templates in AR/EN by patient's preferred language: welcome, reminder, reschedule (shows old date+time and new date+time), low sessions, balance due, package expiring soon. Use `{packageType}` not hard-coded "physiotherapy". Template text editable by Owner in settings.

---

## 7. Packages

Fields: patient, session type covered (physio or nutrition), name, total sessions, total price, purchase date, expiry date (purchase + 60 days, end of day), status, created by.

- Price and session count entered freely (optional templates as suggestions).
- **Per-session value** = total price ÷ total sessions (used for commission and refunds).
- Status (calculated):
  - `active` — today ≤ expiry and sessions remain
  - `completed` — all sessions completed
  - `expired` — today > expiry and sessions remain → remaining sessions are **forfeited**
  - `cancelled` — cancelled by Owner/Manager (with refund decision)
- **Unpaid balance stays owed after expiry.** Owner/Manager can **write off** a balance (reason, audited).
- **Extension:** Owner/Manager, + N days (1–365), reason required, audited; expired package becomes active again if sessions remain.
- A patient may have more than one active package (e.g. one physio, one nutrition). When booking, the system suggests the active package of that type with the earliest expiry.
- Future booked sessions dated after expiry are impossible (blocked at booking; extension does not move them).

---

## 8. Billing

### 8.1 Model
- A **charge** is created for every package (= package price) and every appointment not covered by a package (= appointment price).
- A **payment** is always linked to one charge. No free deposits in v1 (a patient who wants to prepay buys a package).
- Charge balance = charge amount − non-voided payments + refunds − write-offs. Never stored, always calculated.

### 8.2 Payment
Fields: charge, amount (> 0 and ≤ remaining balance), method (Cash, InstaPay, Vodafone Cash, Visa/Card, Fawry), reference / note, optional proof image, received by (user), date-time.

- Receipt number: `INV-YYYY-00001`, sequential per year, generated by a database counter inside the transaction (no gaps from double clicks, no duplicates).
- Printable receipt (A5 / thermal-friendly page, AR/EN, clinic header) → print or save as PDF from the browser.

### 8.3 Corrections
- **Void** (Owner/Manager): for mistakes. Reason required. Receipt stays visible struck through, excluded from totals.
- **Refund** (Owner/Manager): money returned to patient. Separate record (amount, method, reason). Max = amount paid − value of sessions already used (package) or amount paid (appointment). Policy default: no refund for expired packages unless Owner approves.
- **Price change after payment:** Owner/Manager only, reason, cannot go below amount already paid.

### 8.4 Cash closing (end of shift)
Receptionist clicks **Close shift**: system shows expected cash = cash payments − cash refunds − cash expenses recorded by that user since their last closing. Receptionist enters counted cash. Difference saved. Owner/Manager see all closings and differences. Non-cash methods are listed for reconciliation but not counted.

---

## 9. Clinical records (clinicians only)

### 9.1 Session completion form (physiotherapy / assessment)
- Pain before (0–10) and after (0–10) — **0–10 scale**
- SOAP: Subjective, Objective, Assessment, Plan
- Treatment given (multi-select: TENS, Ultrasound, Shockwave, Laser, Manual therapy, Dry needling, Exercise therapy, Other)
- Home exercises (text; carried forward from last session, editable)
- Attachments
- At least one of S/O/A/P or treatment must be filled.

Saving marks the appointment `completed` (and uses one package session if linked).

### 9.2 Note editing
- Author can edit their note for **24 hours**. Every edit keeps a version (who, when, previous text).
- After 24 hours: locked; only **addendum** notes can be added.

### 9.3 Diagnosis
Clinicians set/update the diagnosis on the patient's Clinical tab (with history).

### 9.4 Nutrition consultation
InBody record: date, **height (cm)**, weight, target weight, skeletal muscle mass, body fat %, visceral fat (1–20), BMI (auto from height & weight), BMR (auto, Mifflin-St Jeor from weight, height, age, gender — editable if InBody device gives its own), calorie target, protein/carbs/fat grams, protocol (Keto, Anti-inflammatory low carb, Intermittent fasting, Sports, Diabetic/insulin resistance, Post-bariatric, Other), notes, attachments. Progress chart of weight / fat % / muscle over time.

### 9.5 Documents
Categories: Prescription, X-ray, MRI, Lab report, Referral, ID / administrative, Payment proof, Other. Files (images, PDF; max 10 MB) stored privately on the server, opened only through a logged-in, permission-checked link. Every view logged. Medical images shown with a watermark (viewer name + time). Receptionist can view only `ID / administrative` and `Payment proof`.

---

## 10. Expenses
Fields: title, category (Supplies, Equipment, Maintenance, Rent, Utilities, Salaries, Doctor commission, Hospitality, Marketing, Other), amount, method, date, reason, optional receipt image, created by.
- Receptionist: add today only; edit/void own same day.
- Owner/Manager: all; edits keep history; **void instead of delete**.

---

## 11. Commission
- Earned per **completed** session by the clinician of that session:
  - Value of session = appointment price, or package per-session value.
  - `percent` → value × %; `fixed_per_session` → fixed amount; `none` → 0.
- **Payout:** Owner/Manager selects clinician + period → sees unpaid earned sessions → confirms → creates a payout record + expense (`Doctor commission`). Those sessions are marked paid so they can never be paid twice.
- Clinicians see their own earned / paid totals.

---

## 12. Reports (Owner/Manager)
Period filter: today, this week, this month, custom.
1. **Daily summary:** collections by method, refunds, expenses, net, sessions completed, cash closings.
2. **Outstanding balances:** per patient, oldest first.
3. **Packages:** active, expiring in 7 days, expired with forfeited sessions.
4. **Clinician performance:** sessions completed, no-show rate, utilization (booked minutes ÷ scheduled minutes), commission earned/paid.
5. **Attendance:** cancellation & no-show rate by reason.
6. **Referral sources:** new patients by source.
CSV export for each (Owner/Manager, audited). No diagnosis in exports.

---

## 13. Audit log
Every create / update / status change / payment / void / refund / write-off / extension / login / failed login / covering access / document view / export / settings change.
Fields: time, user, role, action, entity, entity id, before, after, reason, IP.
Stored in its own table; the application has **no update or delete** function for it. Owner/Manager can view and filter.

---

## 14. Notifications (in-app)
Patient checked in (to clinician), late arrival (> 10 min), appointment changed/cancelled (to clinician), package with ≤ 1 session, package expiring in ≤ 7 days. Refreshed every 30 seconds. Mark as read.

---

## 15. Authentication & security

### 15.1 Login
- Email + password. Passwords hashed (bcrypt/argon2), minimum 8 characters, never shown or stored readable.
- Generic error message ("email or password is incorrect") — never reveal which one is wrong.
- 5 failed attempts → account locked 15 minutes; Owner notified in audit log.
- Session: secure httpOnly cookie, expires after 12 hours; auto-lock after 15 min idle (re-enter password only).
- On **every** server request the user is re-loaded from the database: deactivated users or changed roles take effect immediately.
- Shared front-desk PC: **Switch user** = log out + login screen.

### 15.2 OTP — two-step verification (required for all staff)
- Method: **Authenticator app OTP (TOTP)** — Google Authenticator / Microsoft Authenticator. 6-digit code, changes every 30 s. Free, works without internet on the phone, no SMS cost.
- **First login:** user must set up OTP: scan QR code → enter a code to confirm → receives **10 one-time backup codes** (shown once, stored hashed).
- Every login: password → OTP code (or a backup code).
- **Trusted device:** checkbox "Trust this device for 30 days" → no OTP on that browser for 30 days. Owner can revoke all trusted devices of any user.
- 5 wrong OTP codes → 15-minute lock.
- Owner can **reset OTP** for a staff member (lost phone) → user sets it up again at next login. Audited.
- OTP secrets stored encrypted (key in server environment, not in the database).

### 15.3 Forgot password
- "Forgot password" → **6-digit code sent by email**, valid 10 minutes, max 5 attempts, single use → set new password → all sessions and trusted devices of that user are signed out.
- Requires an email sending service (SMTP or transactional email provider) configured in `.env`.
- If email is not configured, only the Owner can reset passwords (user must change it at next login).

### 15.4 Server & data
- HTTPS only. Database not reachable from the internet. Daily off-site backups (see build guide).
- Rate limiting on login, OTP and password-reset endpoints.
- Audit: login success, login failure, lockout, OTP setup, OTP reset, backup code used, password reset, trusted device added/revoked.

---

## 16. Later (NOT in v1)
Insurance (payer, coverage %, patient share, approvals, claims) · patient credit / deposits · home visits · online booking · automatic WhatsApp (Cloud API) · SMS · clinic-network-only access for clinicians (IP allow-list) · multiple branches · e-invoicing (confirm with accountant) · patient mobile app.

---

## 17. Acceptance
v1 is accepted only when every test in `PhysioFlow_PreDeployment_Test_Checklist.xlsx` (updated for this spec) passes on the **staging** server, and a 2-week pilot runs without data errors.
