# Masaar Clinic System — Open Questions & Ambiguity Scan (Task 1.01 & 1.02)

This document lists every unclear, missing, or contradictory point identified during the comprehensive review of the specification, along with the approved resolution and decision records incorporated into [docs/FEATURES-v2.2.md](file:///F:/Claude%20CRM/docs/FEATURES-v2.2.md).

**Summary:** 16 questions scanned · **16 Resolved** · **0 Unresolved**

---

### Q-01: Waitlisted Appointments — Slot Freeing vs Package Session Reservation
- **Spec Reference:** §5.2 item 7 & §5.5 (Appointment statuses)
- **Question:** §5.5 states that changing an appointment status from `scheduled` to `waitlisted` "keeps record, frees slot." However, §5.2 item 7 states that available package sessions are calculated by deducting future booked sessions, including `waitlisted` (`available = total − completed − future booked (scheduled/arrived/waitlisted)`). If a waitlisted appointment frees the bed and clinician slot so someone else can book that time, does it still hold a session against the patient's package?
- **Suggested Answer:** Yes. When an appointment is moved to `waitlisted`, the assigned bed and clinician time slots are released on the calendar (allowing another patient to be booked in that physical slot). However, it continues to count against the patient's package session balance to prevent overbooking beyond their paid package quota. If the appointment is later re-scheduled into a confirmed slot (`waitlisted → scheduled`), all booking overlap checks run fresh. If cancelled, the held package session is freed immediately.
- **Approved Resolution:** **Accepted.** Waitlisted appointments release bed and clinician calendar slots, but hold a package session against `availableSessions` until scheduled or cancelled. Full checks re-run on `waitlisted → scheduled`.
- **Status:** **Resolved** (Recorded in [DEC-008](file:///F:/Claude%20CRM/docs/design/decisions.md) & applied to spec §5.2, §5.5)

---

### Q-02: Package Coverage Scope for Consultant Assessment Sessions
- **Spec Reference:** §2 (Session types) & §7 (Packages)
- **Question:** §2 defines three session types: *Physiotherapy*, *Nutrition*, and *Consultant Assessment*. §7 states that packages have a "session type covered (physio or nutrition)." Are "Consultant Assessment" sessions ever eligible to be included in a multi-session package, or are assessments always billed as individual, standalone visits?
- **Suggested Answer:** Standalone only in v1. Packages in v1 are strictly for Physiotherapy or Nutrition treatment courses. Consultant Assessments are always single-visit charges with individual pricing, unless the Owner explicitly creates a custom service package in future updates.
- **Approved Resolution:** **Accepted.** Multi-session packages in v1 cover Physiotherapy or Nutrition only; Consultant Assessments are billed as standalone single visits.
- **Status:** **Resolved** (Recorded in [DEC-009](file:///F:/Claude%20CRM/docs/design/decisions.md) & applied to spec §2, §7)

---

### Q-03: Owner Commission Tracking When Providing Clinical Treatments
- **Spec Reference:** §1 (Roles) & §11 (Commission)
- **Question:** §1 states that the Owner "also works as a clinician." §11 specifies that commissions are calculated per completed session for the clinician who performed it and generates a payout expense under `Doctor commission`. Does the Owner's user account generate commission payouts and expenses when completing sessions?
- **Suggested Answer:** No commission by default (`none`). The system sets the Owner's default commission type to `none` (0%), avoiding artificial clinic expenses paid to the owner. However, the system allows the Owner to optionally configure a commission rate if they choose to track their personal clinical earnings separately from clinic profit.
- **Approved Resolution:** **Accepted.** Owner account default commission is set to `none` (0%), avoiding artificial clinic expenses, but remains configurable if desired.
- **Status:** **Resolved** (Recorded in [DEC-010](file:///F:/Claude%20CRM/docs/design/decisions.md) & applied to spec §1, §3, §11)

---

### Q-04: Multi-User Cash Shift Closing on Shared Front-Desk Terminal
- **Spec Reference:** §8.4 (Cash closing) & §15.1 (Shared PC switch user)
- **Question:** Front-desk receptionists often share a single workstation and use the "Switch user" button (§15.1). §8.4 states that clicking "Close shift" calculates expected cash based on cash transactions "recorded by that user since their last closing." If Receptionist A switches to Receptionist B in the afternoon without closing their shift, how is cash drawer accountability maintained?
- **Suggested Answer:** Per-user closing accountability. Each receptionist is prompted to close their cash shift before switching users or logging out at the end of their shift. If Receptionist A does not close and Receptionist B logs in, Receptionist B's closing only accounts for payments and refunds recorded under Receptionist B's user ID. Receptionist A's balance remains open until Receptionist A logs back in to close it, or an Owner/Manager closes it on their behalf with an audit note.
- **Approved Resolution:** **Accepted, plus logout prompt.** Cash shift closing is tracked strictly per user ID. In addition, whenever a receptionist attempts to log out or "Switch user" with an active unclosed cash shift containing cash transactions, the system prompts them to complete closing first.
- **Status:** **Resolved** (Recorded in [DEC-011](file:///F:/Claude%20CRM/docs/design/decisions.md) & applied to spec §8.4, §15.1)

---

### Q-05: Receptionist Price Override / Discount Authority Prior to Payment
- **Spec Reference:** §1.1 (Matrix), §2 (Session types), §5.1 (Appointment fields), §8.3 (Corrections)
- **Question:** §2 notes that session type default prices are suggestions and that "receptionist can change per booking." Meanwhile, §1.1 explicitly restricts "Change price after payment exists" to Owner and Manager only. Does the receptionist have unlimited authority to lower or raise prices when booking an appointment before any payment is entered, or should there be a minimum price threshold?
- **Suggested Answer:** Allowed before payment, audited. Receptionists can edit the appointment price at initial booking (e.g. for an agreed introductory discount) before any payment is collected. Once a payment or receipt has been recorded, the price is strictly locked and can only be altered by an Owner or Manager.
- **Approved Resolution:** **Accepted, plus mandatory audit logging.** Receptionist can adjust the price at initial booking before payment; changing price after payment exists is Owner/Manager only. Every price change (before or after payment) writes an audit log entry with `oldPrice`, `newPrice`, reason, and user id.
- **Status:** **Resolved** (Recorded in [DEC-012](file:///F:/Claude%20CRM/docs/design/decisions.md) & applied to spec §1.1, §2, §5.1, §8.3)

---

### Q-06: Duration and Scope of Clinician "Covering Access"
- **Spec Reference:** §1.1 (Permission matrix footnote)
- **Question:** A clinician can view/edit non-assigned patients by clicking "Covering access" and typing a mandatory reason (which is logged in the audit trail). How long does this covering access permission remain active for that clinician?
- **Suggested Answer:** Active session only (max 12 hours). Covering access expires when the clinician logs out, when their session times out after 12 hours, or after 15 minutes of idle lock. If the clinician returns the next day or in a new session, they must enter a fresh reason to access that patient's file again.
- **Approved Resolution:** **Accepted.** Clinician Covering Access is strictly valid only for the active login session (maximum 12 hours or until logout/idle lock). Subsequent sessions require entering a fresh reason.
- **Status:** **Resolved** (Recorded in [DEC-013](file:///F:/Claude%20CRM/docs/design/decisions.md) & applied to spec §1.1)

---

### Q-07: Unique Phone Number Constraint vs Family Members Sharing a Mobile
- **Spec Reference:** §4.1 (Patient fields) & §4.2 (Rules)
- **Question:** Mobile phones are required to be unique Egyptian numbers (`01XXXXXXXXX`) with a strict database unique constraint. In Egypt, parents frequently book physiotherapy or nutrition sessions for their young children or elderly parents using the family head's phone number. How does the system accommodate family members without violating the unique phone constraint?
- **Suggested Answer:** Unique primary phone, with an Emergency/Guardian phone field.
- **Approved Resolution:** **Changed & refined by user.**
  - **Adults:** Own mobile phone required and strictly unique (`01XXXXXXXXX`), enforced by a database partial unique index (`CREATE UNIQUE INDEX idx_patients_mobile_phone_unique ON patients (mobile_phone) WHERE mobile_phone IS NOT NULL`).
  - **Dependents (child / elderly):** Checkbox `"Uses guardian's phone"`. When checked:
    - `guardianName`, `guardianRelation`, and `guardianPhone` are required.
    - Patient's own `mobilePhone` is left empty (`NULL`).
    - `guardianPhone` must pass Egyptian mobile validation (`^01[0125][0-9]{8}$`) and be stored normalized as `01XXXXXXXXX`.
    - WhatsApp messages are routed to `guardianPhone`.
    - `guardianPhone` may repeat across multiple dependents (e.g. siblings sharing a parent's number).
  - **Patient Search:** Searching by phone number matches both `mobilePhone` and `guardianPhone`, so the receptionist finds all dependents associated with a parent's number.
- **Status:** **Resolved** (Recorded in [DEC-014](file:///F:/Claude%20CRM/docs/design/decisions.md) & applied to spec §4.1, §4.2)

---

### Q-08: Refund Payment Method & Cash Drawer Reconciliation
- **Spec Reference:** §8.3 (Corrections) & §8.4 (Cash closing)
- **Question:** §8.3 allows issuing refunds for mistakes or cancellations. §8.4 computes expected cash as `cash payments − cash refunds − cash expenses`. If a patient originally paid by Visa, InstaPay, or Vodafone Cash, can the refund be issued in physical cash from the front-desk drawer?
- **Suggested Answer:** Tracked by refund payout method. Only refunds designated as `Cash` reduce the front-desk receptionist's expected physical drawer cash.
- **Approved Resolution:** **Accepted, plus explicit user drawer attribution.** When a refund is issued, the payout method is recorded. If paid in cash, the refund is subtracted from the cash shift closing of the specific user who physically handed out the cash.
- **Status:** **Resolved** (Recorded in [DEC-015](file:///F:/Claude%20CRM/docs/design/decisions.md) & applied to spec §8.3, §8.4)

---

### Q-09: 24-Hour Clinical Note Editable Window Start Trigger
- **Spec Reference:** §9.2 (Note editing)
- **Question:** §9.2 states: "Author can edit their note for 24 hours. Every edit keeps a version... After 24 hours: locked; only addendum notes can be added." Does this 24-hour edit countdown start from the scheduled appointment start time, or from the exact moment the clinician first completes and saves the note?
- **Suggested Answer:** From initial note save time (`completedAt`). The 24-hour edit window is calculated from the exact UTC timestamp when the session completion form was first submitted and saved.
- **Approved Resolution:** **Accepted.** 24-hour clinical note edit window is calculated from the exact initial save timestamp (`completedAt`).
- **Status:** **Resolved** (Recorded in [DEC-016](file:///F:/Claude%20CRM/docs/design/decisions.md) & applied to spec §9.2)

---

### Q-10: Annual Receipt Number Sequence Reset Timezone
- **Spec Reference:** §8.2 (Receipt counter)
- **Question:** Receipt numbers are formatted as `INV-YYYY-00001`, resetting sequentially each year. Does the year change and counter reset occur at 00:00:00 UTC or 00:00:00 Cairo local time (`Africa/Cairo`)?
- **Suggested Answer:** 00:00:00 Cairo local time (`Africa/Cairo`). Because the clinic operates in Egypt, the annual receipt sequence rolls over on January 1st at midnight Cairo time, matching the clinic's local financial and tax year.
- **Approved Resolution:** **Accepted.** Annual receipt number sequence (`INV-YYYY-00001`) rolls over on January 1st at 00:00:00 Cairo local time (`Africa/Cairo`).
- **Status:** **Resolved** (Recorded in [DEC-017](file:///F:/Claude%20CRM/docs/design/decisions.md) & applied to spec §8.2)

---

### Q-11: Late Arrival Definition & Notification Timing Threshold
- **Spec Reference:** §5.5 (Status changes) & §14 (Notifications)
- **Question:** §5.5 states that changing status to `arrived` records `arrivedAt` and `lateMinutes`. §14 specifies an in-app notification for "late arrival (> 10 min)". Is the alert triggered when the current clock exceeds appointment start time + 10 minutes without check-in, or when the patient actually arrives and is checked in after > 10 minutes late?
- **Suggested Answer:** Both triggers: (1) Visual alert on front-desk dashboard if current time passes `startTime + 10 min` unarrived; (2) When check-in occurs after `startTime + 10 min`, `lateMinutes` is recorded and an immediate notification is sent to the assigned clinician.
- **Approved Resolution:** **Accepted.** Dual-phase late arrival detection: visual dashboard alert if current time exceeds `startTime + 10 min` unarrived; when checked in, `lateMinutes` stored and clinician notified.
- **Status:** **Resolved** (Recorded in [DEC-018](file:///F:/Claude%20CRM/docs/design/decisions.md) & applied to spec §5.5, §14)

---

### Q-12: InBody Height Measurement Pre-Fill and Editability
- **Spec Reference:** §9.4 (Nutrition consultation)
- **Question:** InBody records include height (cm), weight, BMI, and BMR. Is height automatically retrieved from the patient profile, or must the nutritionist measure and type it on every InBody record?
- **Suggested Answer:** Pre-filled from previous record, always editable. The form pre-populates height from the patient's most recent consultation or profile, saving time for adults while remaining editable for children, teenagers, or measurement corrections.
- **Approved Resolution:** **Accepted.** InBody height pre-fills from patient profile or previous consultation, but remains freely editable.
- **Status:** **Resolved** (Recorded in [DEC-019](file:///F:/Claude%20CRM/docs/design/decisions.md) & applied to spec §9.4)

---

### Q-13: Expenses Edit/Void Locking Upon Cash Shift Closing
- **Spec Reference:** §1.1 (Matrix), §8.4 (Cash closing), §10 (Expenses)
- **Question:** §1.1 states that a receptionist can add an expense (today only) and edit/void their own expense on the same day. What happens if the receptionist submits their end-of-shift Cash Closing at 3:00 PM, and later realizes an expense entered at 1:00 PM was erroneous? Can they still edit/void it?
- **Suggested Answer:** Locked once included in a closed shift. Once an expense has been factored into a completed Cash Closing, it is locked from modification or voiding by the receptionist. Any subsequent adjustments require an Owner or Manager to void the expense and record an audit explanation.
- **Approved Resolution:** **Accepted.** Expenses included in a completed cash closing are locked from receptionist edit/void. Subsequent changes require Owner/Manager void with audit reason.
- **Status:** **Resolved** (Recorded in [DEC-020](file:///F:/Claude%20CRM/docs/design/decisions.md) & applied to spec §1.1, §8.4, §10)

---

### Q-14: Bed Schedule Reservation on Early Session Completion
- **Spec Reference:** §5.1, §5.2, §9.1
- **Question:** Appointments are booked in 15-minute increments (e.g. 60 minutes). If a clinician completes the session in 40 minutes and submits the completion form, is the remaining 20 minutes of the bed reservation immediately freed on the calendar for walk-ins, or does the reservation remain blocked for the full scheduled duration?
- **Suggested Answer:** Reservation holds for full scheduled slot. The bed remains reserved for the full scheduled duration to maintain calendar stability and prevent double-booking collisions, unless the front-desk staff explicitly edits the appointment or schedules a walk-in.
- **Approved Resolution:** **Accepted.** Bed reservations persist through the full scheduled duration even if a session is completed early.
- **Status:** **Resolved** (Recorded in [DEC-021](file:///F:/Claude%20CRM/docs/design/decisions.md) & applied to spec §5.1, §5.2, §9.1)

---

### Q-15: WhatsApp Communication Consent Opt-Out Distinction
- **Spec Reference:** §4.1 (Data consent) & §6 (Front desk WhatsApp)
- **Question:** §4.1 mentions a single checkbox for data consent: "patient agreed to data processing & WhatsApp messages." If a patient wishes to receive clinical treatment but specifically opts out of receiving WhatsApp messages, can they be registered?
- **Suggested Answer:** Separate WhatsApp messaging consent. Medical data processing consent is mandatory for registration, while WhatsApp messaging consent is an independent toggle. If a patient opts out of WhatsApp, the WhatsApp buttons on their profile display an "Opted out" indicator to respect their communication preference.
- **Approved Resolution:** **Accepted.** WhatsApp messaging consent (`whatsappConsent`) is a separate boolean toggle from mandatory medical data processing consent (`dataConsent`). If false, WhatsApp buttons show "Opted out".
- **Status:** **Resolved** (Recorded in [DEC-022](file:///F:/Claude%20CRM/docs/design/decisions.md) & applied to spec §4.1, §6)

---

### Q-16: Commission Payout Voiding Authority & Session Release
- **Spec Reference:** §11 (Commission) & §1.1 (Permissions)
- **Question:** The specification defines creating commission payouts (§11 `R-11-2`) where sessions are marked paid so they can never be paid twice. However, the spec does not explicitly describe voiding a commission payout voucher if an error occurs (e.g. wrong clinician selected or wrong date range). Does the system permit voiding a commission payout? If so, who has authority, what happens to the linked expense voucher, and do the sessions become available to be paid again?
- **Suggested Answer:** Voiding allowed for Owner and Manager only, with mandatory reason and full audit logging. When a commission payout voucher is voided:
  1. `commission_payouts.is_voided = true` is set, recording `voided_at`, `voided_by_user_id`, and `void_reason`.
  2. The linked `Doctor commission` expense voucher in `expenses` is automatically voided.
  3. The linked sessions in `commission_payout_sessions` are set to `is_voided = true`. By virtue of the partial unique index `idx_unique_active_paid_session (appointment_id) WHERE is_voided = false`, voiding releases the completed sessions so they can legitimately be included in a subsequent corrected payout run.
- **Approved Resolution:** **Accepted.** Owner and Manager can void a commission payout voucher with a mandatory reason and full audit logging. The linked `Doctor commission` expense is automatically voided and completed sessions released via the partial unique index for recalculation.
- **Status:** **Resolved** (Recorded in [DEC-026](file:///F:/Claude%20CRM/docs/design/decisions.md) & applied to spec §11, `R-11-4`)

