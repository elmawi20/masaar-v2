# Masaar Clinic System — Rules Index

Total Rules Defined: **199**  
Spec Reference: [docs/FEATURES-v2.2.md](file:///F:/Claude%20CRM/docs/FEATURES-v2.2.md)  
Rule Permanence Policy: [DEC-025](file:///F:/Claude%20CRM/docs/design/decisions.md) (IDs are permanent and never renumbered)

---

## Summary by Module

| Module | Rules Count | ID Range |
|---|:---:|---|
| Ground Rules | 13 | `R-0-1` – `R-0-13` |
| Roles & Permissions | 27 | `R-1-1` – `R-1.1-21` |
| Clinic Settings | 8 | `R-2-1` – `R-2-8` |
| Staff | 5 | `R-3-1` – `R-3-5` |
| Patients | 30 | `R-4.1-1` – `R-4.3-1` |
| Scheduling | 33 | `R-5.1-1` – `R-5.5-13` |
| Front Desk | 4 | `R-6-1` – `R-6-4` |
| Packages | 8 | `R-7-1` – `R-7-8` |
| Billing | 15 | `R-8.1-1` – `R-8.4-4` |
| Clinical Records | 12 | `R-9.1-1` – `R-9.5-1` |
| Expenses | 3 | `R-10-1` – `R-10-3` |
| Commission | 4 | `R-11-1` – `R-11-4` |
| Reports | 8 | `R-12-1` – `R-12-8` |
| Audit Log | 3 | `R-13-1` – `R-13-3` |
| Notifications | 6 | `R-14-1` – `R-14-6` |
| Authentication & Security | 19 | `R-15.1-1` – `R-15.4-3` |
| Acceptance | 1 | `R-17-1` – `R-17-1` |

---

## Master Rules Catalog

| Rule ID | One-Line Summary | Module |
|---|---|---|
| `R-0-1` | Rules enforced on server and in database, never only in UI | Ground Rules |
| `R-0-2` | Write actions verify active user, role check, validation, transaction, audit log | Ground Rules |
| `R-0-3` | Zero hard deletion; records cancelled, voided, or deactivated | Ground Rules |
| `R-0-4` | Money stored as integer piasters (450.00 EGP = 45000), displayed as EGP | Ground Rules |
| `R-0-5` | Timestamps stored in UTC, displayed in Africa/Cairo time; appointments use clinic dates | Ground Rules |
| `R-0-6` | Calculated values (balances, remaining sessions, totals) are never stored | Ground Rules |
| `R-0-7` | Bilingual interface (Arabic RTL default, English LTR) with light/dark themes | Ground Rules |
| `R-0-8` | No demo data in production; seed script for dev/staging only | Ground Rules |
| `R-0-9` | All screens responsive from 360px width to desktop with zero horizontal scrolling | Ground Rules |
| `R-0-10` | Receptionist screens optimized desktop-first with full tablet support | Ground Rules |
| `R-0-11` | Clinician screens (queue, patient file, session note, nutrition) responsive on tablet and phone | Ground Rules |
| `R-0-12` | Owner and Manager screens (summary, reports, cash closing, approvals) usable on phone | Ground Rules |
| `R-0-13` | Mobile UI adaptations: 44px touch targets, stacked cards for tables, clinician day list calendar, hamburger menu | Ground Rules |
| `R-1-1` | Owner role: full clinic access, staff accounts, settings, security; clinician work | Roles & Permissions |
| `R-1-2` | Manager role: financial & operational management; cannot manage staff accounts/security | Roles & Permissions |
| `R-1-3` | Receptionist role: patient admin, scheduling, payments, closing; no clinical data | Roles & Permissions |
| `R-1-4` | Physiotherapist role: own schedule, own patient clinical records, sessions; no finance | Roles & Permissions |
| `R-1-5` | Nutritionist role: nutrition consultations, InBody, own patient records; no finance | Roles & Permissions |
| `R-1-6` | No Dev role in production; developers use staging environment with synthetic data | Roles & Permissions |
| `R-1.1-1` | Create / edit patient admin data permitted for Owner, Manager, Receptionist | Roles & Permissions |
| `R-1.1-2` | View / edit diagnosis, clinical notes, medical docs for Owner and own clinicians | Roles & Permissions |
| `R-1.1-3` | Document upload permissions; Receptionist cannot view medical docs after upload | Roles & Permissions |
| `R-1.1-4` | Booking, reschedule, cancel, waitlist permissions across clinic roles | Roles & Permissions |
| `R-1.1-5` | Patient check-in permitted for Owner, Manager, Receptionist | Roles & Permissions |
| `R-1.1-6` | Mark / undo no-show same day permitted for front desk and own clinicians | Roles & Permissions |
| `R-1.1-7` | Session completion form submission restricted to treating clinician / Owner | Roles & Permissions |
| `R-1.1-8` | Re-opening completed session restricted strictly to Owner | Roles & Permissions |
| `R-1.1-9` | Create patient package permitted for Owner, Manager, Receptionist | Roles & Permissions |
| `R-1.1-10` | Package extension and balance write-off restricted to Owner and Manager | Roles & Permissions |
| `R-1.1-11` | Payment recording permitted for Owner, Manager, Receptionist | Roles & Permissions |
| `R-1.1-12` | Voiding receipt and issuing refund restricted to Owner and Manager | Roles & Permissions |
| `R-1.1-13` | Price change before payment permitted for front desk with mandatory audit log | Roles & Permissions |
| `R-1.1-14` | Price change after payment exists restricted to Owner/Manager with audit log | Roles & Permissions |
| `R-1.1-15` | Adding expenses: today only for Receptionist; anytime for Owner and Manager | Roles & Permissions |
| `R-1.1-16` | Edit / void expense: Receptionist own same-day before closing; Owner/Manager all | Roles & Permissions |
| `R-1.1-17` | Expense history and report view permissions; clinicians see own commission only | Roles & Permissions |
| `R-1.1-18` | Close cash shift permitted for Owner, Manager, Receptionist | Roles & Permissions |
| `R-1.1-19` | Staff accounts and security restricted to Owner; schedules & rooms to Manager | Roles & Permissions |
| `R-1.1-20` | Audit log viewing and CSV data exports restricted to Owner and Manager | Roles & Permissions |
| `R-1.1-21` | Covering access conditions, reason logging, and active login session duration limit | Roles & Permissions |
| `R-2-1` | Clinic profile configuration: bilingual name, address, phone, logo | Clinic Settings |
| `R-2-2` | Weekly operating hours set per weekday (Sat–Fri) with open/close times, up to 7 days | Clinic Settings |
| `R-2-3` | Clinic closure dates configured with labels (holidays, Eid, etc.) | Clinic Settings |
| `R-2-4` | Rooms and beds configuration with active flags; deactivation instead of deletion | Clinic Settings |
| `R-2-5` | Session types duration/pricing; packages cover Physio/Nutrition; assessments standalone | Clinic Settings |
| `R-2-6` | Package default validity duration is 60 calendar days | Clinic Settings |
| `R-2-7` | Doctor daily soft limit default 10 appointments (warning only, configurable) | Clinic Settings |
| `R-2-8` | Receipt number sequential prefix configured as INV | Clinic Settings |
| `R-3-1` | Staff profile fields, role assignment, active status, commission setup, language | Staff |
| `R-3-2` | Clinician weekly schedule configured per weekday with up to 2 shifts per day | Staff |
| `R-3-3` | Staff leave recording with date range, leave type (annual, sick, other), and notes | Staff |
| `R-3-4` | Staff passwords hashed, no hints, Owner reset requires change at next login, min 8 chars | Staff |
| `R-3-5` | Deactivated staff blocked from login, hidden from booking, history preserved | Staff |
| `R-4.1-1` | Patient full name is required, max 120 characters | Patients |
| `R-4.1-2` | Adult mobile phone required, normalized Egyptian mobile, unique via partial index | Patients |
| `R-4.1-3` | Uses guardian's phone checkbox for child and elderly dependents | Patients |
| `R-4.1-4` | Guardian name required when patient uses guardian's phone | Patients |
| `R-4.1-5` | Guardian relationship required when patient uses guardian's phone | Patients |
| `R-4.1-6` | Guardian phone required for dependents, normalized Egyptian mobile, may repeat | Patients |
| `R-4.1-7` | WhatsApp number defaults to patient mobile or guardian phone | Patients |
| `R-4.1-8` | Date of birth required; patient age is dynamically calculated, never stored | Patients |
| `R-4.1-9` | Patient gender is required (male or female) | Patients |
| `R-4.1-10` | Patient address optional free text field | Patients |
| `R-4.1-11` | Emergency contact person name and telephone number | Patients |
| `R-4.1-12` | Preferred language required (Arabic / English); determines WhatsApp template language | Patients |
| `R-4.1-13` | Referral source required from predefined channels list | Patients |
| `R-4.1-14` | Referring doctor optional text field | Patients |
| `R-4.1-15` | Reason for visit / complaint required; recorded by receptionist (not diagnosis) | Patients |
| `R-4.1-16` | Medical alerts visible in detail to clinicians; receptionist sees indicator only | Patients |
| `R-4.1-17` | Optional assignment to primary treating physiotherapist | Patients |
| `R-4.1-18` | Optional assignment to primary treating nutritionist | Patients |
| `R-4.1-19` | Patient status lifecycle: lead → active → discharged (automated transitions) | Patients |
| `R-4.1-20` | Medical data processing consent is mandatory for registration | Patients |
| `R-4.1-21` | WhatsApp communication consent toggle; shows Opted out if unchecked | Patients |
| `R-4.1-22` | Clinical diagnosis view and update restricted strictly to clinicians | Patients |
| `R-4.2-1` | Egyptian phone format normalization and regex validation for mobile and guardian phone | Patients |
| `R-4.2-2` | Adult mobile uniqueness enforced by DB partial unique index; duplicate shows open file | Patients |
| `R-4.2-3` | Dependents leave mobilePhone empty; guardianPhone stored normalized and may repeat | Patients |
| `R-4.2-4` | Patient search by phone matches both mobilePhone and guardianPhone across family members | Patients |
| `R-4.2-5` | Similar patient name check using Arabic character normalization triggers warning only | Patients |
| `R-4.2-6` | Status activates at check-in; discharged set by clinician; re-activates upon booking | Patients |
| `R-4.2-7` | Treatment sessions do not require a prior consultant assessment | Patients |
| `R-4.3-1` | Patient profile tab layout and role-based tab access | Patients |
| `R-5.1-1` | Appointment data fields, duration range (15–180m, step 15m), and pricing | Scheduling |
| `R-5.1-2` | Price changes write audit entry with oldPrice, newPrice, user; Owner/Manager after payment | Scheduling |
| `R-5.2-1` | Booking rejected if date is a clinic closure or outside opening hours | Scheduling |
| `R-5.2-2` | Booking rejected if clinician is inactive, unscheduled, or on approved leave | Scheduling |
| `R-5.2-3` | Booking rejected if clinician has an active overlapping appointment | Scheduling |
| `R-5.2-4` | Booking rejected if bed has an active overlapping appointment | Scheduling |
| `R-5.2-5` | Booking rejected if patient is booked in another appointment at overlapping time | Scheduling |
| `R-5.2-6` | Patient daily limit: maximum 1 session per session type per patient per day | Scheduling |
| `R-5.2-7` | Package booking validation, available quota calculation, and waitlist session reservation | Scheduling |
| `R-5.2-8` | Session type must match clinician role and assessment privileges | Scheduling |
| `R-5.2-9` | Active appointment definition: status scheduled, arrived, or completed | Scheduling |
| `R-5.2-10` | Bed reservation holds for full scheduled duration even if session completed early | Scheduling |
| `R-5.2-11` | Soft warnings allow booking to proceed: doctor daily soft limit, similar patient name | Scheduling |
| `R-5.2-12` | PostgreSQL btree_gist exclusion constraints physically prevent clinician and bed overlaps | Scheduling |
| `R-5.3-1` | Recurring series booking with per-date preview validation and batch confirmation | Scheduling |
| `R-5.4-1` | Calendar views: Day view (beds x 15-min slots) and Week view per clinician | Scheduling |
| `R-5.4-2` | Calendar filtering by clinician, room, session type, and search by name/phone | Scheduling |
| `R-5.4-3` | Appointment card shows patient, type, clinician, time, payment pill, status color | Scheduling |
| `R-5.4-4` | Card click opens action panel; drag & drop restricted to scheduled/arrived with checks | Scheduling |
| `R-5.4-5` | Calendar waitlist side panel for managing queued patient requests | Scheduling |
| `R-5.5-1` | Status transition: scheduled → arrived by Reception, stores arrivedAt and lateMinutes | Scheduling |
| `R-5.5-2` | Status transition: arrived → scheduled (undo check-in) same day with reason | Scheduling |
| `R-5.5-3` | Status transition: arrived → completed by clinician via completion form, deducts session | Scheduling |
| `R-5.5-4` | Status transition: scheduled → cancelled with required cancellation reason | Scheduling |
| `R-5.5-5` | Status transition: arrived → cancelled when patient leaves with reason | Scheduling |
| `R-5.5-6` | Status transition: scheduled → no_show only after appointment start time with reason | Scheduling |
| `R-5.5-7` | Status transition: no_show → scheduled (undo no-show) same day with reason | Scheduling |
| `R-5.5-8` | Status transition: scheduled → waitlisted frees calendar slot, retains package hold | Scheduling |
| `R-5.5-9` | Status transition: waitlisted → scheduled re-runs full booking and overlap checks | Scheduling |
| `R-5.5-10` | Status transition: waitlisted → cancelled with reason, releases held package session | Scheduling |
| `R-5.5-11` | Status transition: completed → arrived re-opened by Owner with reason, restores session | Scheduling |
| `R-5.5-12` | Undefined status transitions are blocked; cancelled is terminal; all transitions audited | Scheduling |
| `R-5.5-13` | Standard cancellation/no-show reasons; package sessions never deducted for cancel/no-show | Scheduling |
| `R-6-1` | Today screen dashboard metrics, upcoming arrivals, waitlist, unpaid and expiring packages | Front Desk |
| `R-6-2` | Appointment action panel quick operations (no clinical data shown to reception) | Front Desk |
| `R-6-3` | Tomorrow's reminder queue with one-click WhatsApp links and reminder sent logging | Front Desk |
| `R-6-4` | WhatsApp wa.me integration, consent check, guardian routing, templates, and placeholders | Front Desk |
| `R-7-1` | Package fields: patient, session type (physio/nutrition), sessions, price, dates, status | Packages |
| `R-7-2` | Package price and session count entered freely with optional suggestions | Packages |
| `R-7-3` | Per-session value formula (totalPrice ÷ totalSessions) for commission, cancellations, refunds | Packages |
| `R-7-4` | Package status calculation: active, completed, expired (sessions forfeited), cancelled | Packages |
| `R-7-5` | Unpaid package balance owed after expiry; write-off requires Owner/Manager with reason | Packages |
| `R-7-6` | Package extension (+1–365 days) by Owner/Manager with reason and audit; reactivates expired | Packages |
| `R-7-7` | Multiple active packages allowed; booking suggests active package with earliest expiry | Packages |
| `R-7-8` | Future bookings dated after package expiry are strictly blocked | Packages |
| `R-8.1-1` | Charge created for each package (package price) and non-package appointment (appointment price) | Billing |
| `R-8.1-2` | Every payment linked to one charge; no unallocated customer deposits in v1 | Billing |
| `R-8.1-3` | Dynamic balance formula with cancelled package adjustment; balances never stored in DB | Billing |
| `R-8.2-1` | Payment fields, amount bounds (>0 and <= balance), payment methods, and user attribution | Billing |
| `R-8.2-2` | Receipt number sequential per year generated by transactional DB counter (gapless) | Billing |
| `R-8.2-3` | Receipt annual counter rolls over at Cairo midnight on Jan 1 | Billing |
| `R-8.2-4` | Printable receipt layout (A5 / thermal format, bilingual AR/EN, clinic header) | Billing |
| `R-8.3-1` | Receipt void by Owner/Manager with required reason; remains struck through, excluded from totals | Billing |
| `R-8.3-2` | Refund by Owner/Manager; max = paid minus used sessions; expired blocked unless Owner approves | Billing |
| `R-8.3-3` | Cash refund is subtracted from the cash shift closing of the user who handed out cash | Billing |
| `R-8.3-4` | Price changes write audit entry; Owner/Manager only after payment and cannot go below paid | Billing |
| `R-8.4-1` | Expected cash formula: payments - refunds handed out - expenses recorded by user since closing | Billing |
| `R-8.4-2` | System prompts receptionist to close cash shift on logout/switch user if unclosed transactions exist | Billing |
| `R-8.4-3` | Records in a completed cash closing are locked from receptionist edit/void | Billing |
| `R-8.4-4` | Owner/Manager view all closings and variances; non-cash methods listed for reconciliation | Billing |
| `R-9.1-1` | Pain scale recording (0–10 scale) before and after clinical treatment | Clinical Records |
| `R-9.1-2` | SOAP clinical note sections: Subjective, Objective, Assessment, Plan | Clinical Records |
| `R-9.1-3` | Treatment modalities multi-select list (TENS, Ultrasound, Laser, Manual therapy, etc.) | Clinical Records |
| `R-9.1-4` | Home exercises text field carried forward from previous session and editable | Clinical Records |
| `R-9.1-5` | Session completion form clinical file attachments | Clinical Records |
| `R-9.1-6` | Completion form validation requires at least one SOAP field or treatment modality filled | Clinical Records |
| `R-9.1-7` | Form submission transitions appointment to completed and consumes package session | Clinical Records |
| `R-9.2-1` | Author can edit note for 24 hours from completedAt; all edits preserve version history | Clinical Records |
| `R-9.2-2` | Clinical notes locked after 24 hours; only addendum notes may be appended | Clinical Records |
| `R-9.3-1` | Clinicians set and update diagnosis on Clinical tab with change history | Clinical Records |
| `R-9.4-1` | InBody metrics, height pre-fill, auto BMI/BMR, dietary protocol, and progress chart | Clinical Records |
| `R-9.5-1` | Document categories, private server storage (max 10MB), view audit, watermarking, role filters | Clinical Records |
| `R-10-1` | Expense fields: title, category list, amount, method, date, reason, receipt proof, creator | Expenses |
| `R-10-2` | Receptionist can add today's expenses and edit/void own same-day expenses before shift closing | Expenses |
| `R-10-3` | Owner/Manager manage all expenses; edits preserve history; voiding instead of deletion | Expenses |
| `R-11-1` | Commission earned per completed session based on session value and clinician commission type | Commission |
| `R-11-2` | Commission payout generates payout record and expense; sessions marked paid once | Commission |
| `R-11-3` | Clinicians can view their own earned and paid commission totals | Commission |
| `R-11-4` | Commission payout void by Owner/Manager with required reason; voids linked expense and releases sessions | Commission |
| `R-12-1` | Report period filters: today, this week, this month, and custom date range | Reports |
| `R-12-2` | Daily summary report: collections, refunds, expenses, net revenue, sessions, closings | Reports |
| `R-12-3` | Outstanding balances report per patient, sorted oldest debt first | Reports |
| `R-12-4` | Packages report: active, expiring in 7 days, expired with forfeited sessions | Reports |
| `R-12-5` | Clinician performance report: completed sessions, no-shows, utilization rate, commission | Reports |
| `R-12-6` | Attendance report: cancellation and no-show rates grouped by reason | Reports |
| `R-12-7` | Referral sources report: new patient acquisition volume by source | Reports |
| `R-12-8` | CSV export for reports restricted to Owner/Manager, audited, diagnosis strictly excluded | Reports |
| `R-13-1` | Comprehensive audit logging across all entities, status changes, finance, and security events | Audit Log |
| `R-13-2` | Audit log fields: timestamp, user, role, action, entity, entity id, before/after, reason, IP | Audit Log |
| `R-13-3` | Audit log is append-only in dedicated table (no update or delete); viewable and filterable by Owner/Manager | Audit Log |
| `R-14-1` | In-app check-in notification sent to the assigned clinician | Notifications |
| `R-14-2` | Dual-phase late arrival: dashboard alert at >10m overdue; clinician notified upon check-in | Notifications |
| `R-14-3` | Appointment reschedule or cancellation notification sent to assigned clinician | Notifications |
| `R-14-4` | Low package sessions notification triggered when 1 or 0 sessions remain | Notifications |
| `R-14-5` | Package expiry notification triggered when 7 or fewer days remain before expiry | Notifications |
| `R-14-6` | Notifications refresh poll interval every 30 seconds; mark as read capability | Notifications |
| `R-15.1-1` | Email and password authentication with bcrypt/argon2 hashing and min 8 characters | Authentication & Security |
| `R-15.1-2` | Generic login failure error message prevents account enumeration attacks | Authentication & Security |
| `R-15.1-3` | Account lockout for 15 minutes after 5 consecutive failed login attempts; Owner notified | Authentication & Security |
| `R-15.1-4` | Secure httpOnly cookie expires in 12h; screen auto-locks after 15 min idle | Authentication & Security |
| `R-15.1-5` | User re-loaded from DB on every server request; deactivations and role changes take effect instantly | Authentication & Security |
| `R-15.1-6` | Switch user log out and login screen with prompt to close open cash shift | Authentication & Security |
| `R-15.2-1` | Mandatory TOTP 6-digit 30s code via Authenticator app for all staff logins | Authentication & Security |
| `R-15.2-2` | First login OTP enrollment via QR code; generates 10 hashed single-use backup codes | Authentication & Security |
| `R-15.2-3` | Two-step login flow: password followed by OTP code or backup code | Authentication & Security |
| `R-15.2-4` | Trusted device cookie skips OTP for 30 days; all trusted devices revocable by Owner | Authentication & Security |
| `R-15.2-5` | 5 invalid OTP attempts triggers a 15-minute security lockout | Authentication & Security |
| `R-15.2-6` | Owner can reset staff OTP; forces re-enrollment at next login; action is audited | Authentication & Security |
| `R-15.2-7` | OTP secrets stored encrypted using server environment encryption key | Authentication & Security |
| `R-15.3-1` | Password reset via 6-digit email code (10m, max 5 attempts); revokes all sessions/devices | Authentication & Security |
| `R-15.3-2` | Email password reset requires SMTP/transactional email provider configured in .env | Authentication & Security |
| `R-15.3-3` | If email not configured, Owner manual password reset serves as fallback | Authentication & Security |
| `R-15.4-1` | HTTPS only, database isolated from public internet, automated daily off-site backups | Authentication & Security |
| `R-15.4-2` | Rate limiting enforced on login, OTP verification, and password reset endpoints | Authentication & Security |
| `R-15.4-3` | Security audit logging for all authentication, lockout, OTP, and device events | Authentication & Security |
| `R-17-1` | v1 acceptance requires all test checklist items passing on staging and a 2-week pilot | Acceptance |
