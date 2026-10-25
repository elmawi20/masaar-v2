# Masaar Clinic System — Open Questions & Ambiguity Scan (Task 1.01)

This document lists every unclear, missing, or contradictory point identified during the comprehensive review of [FEATURES-v2.1.md](file:///F:/Claude%20CRM/docs/FEATURES-v2.1.md).

Each question is numbered and includes a **Suggested Answer** for the clinic owner/builder to review. Approved answers will be applied to the specification in Task 1.02, recorded in [decisions.md](file:///F:/Claude%20CRM/docs/design/decisions.md), and bumped to `FEATURES-v2.2.md`.

---

### Q-01: Waitlisted Appointments — Slot Freeing vs Package Session Reservation
- **Spec Reference:** §5.2 item 7 & §5.5 (Appointment statuses)
- **Question:** §5.5 states that changing an appointment status from `scheduled` to `waitlisted` "keeps record, frees slot." However, §5.2 item 7 states that available package sessions are calculated by deducting future booked sessions, including `waitlisted` (`available = total − completed − future booked (scheduled/arrived/waitlisted)`). If a waitlisted appointment frees the bed and clinician slot so someone else can book that time, does it still hold a session against the patient's package?
- **Suggested Answer:** **Yes.** When an appointment is moved to `waitlisted`, the assigned bed and clinician time slots are released on the calendar (allowing another patient to be booked in that physical slot). However, it continues to count against the patient's package session balance to prevent overbooking beyond their paid package quota. If the appointment is later re-scheduled into a confirmed slot (`waitlisted → scheduled`), all booking overlap checks run fresh. If cancelled, the held package session is freed immediately.
- **Status:** Pending Review

---

### Q-02: Package Coverage Scope for Consultant Assessment Sessions
- **Spec Reference:** §2 (Session types) & §7 (Packages)
- **Question:** §2 defines three session types: *Physiotherapy*, *Nutrition*, and *Consultant Assessment*. §7 states that packages have a "session type covered (physio or nutrition)." Are "Consultant Assessment" sessions ever eligible to be included in a multi-session package, or are assessments always billed as individual, standalone visits?
- **Suggested Answer:** **Standalone only in v1.** Packages in v1 are strictly for Physiotherapy or Nutrition treatment courses. Consultant Assessments are always single-visit charges with individual pricing, unless the Owner explicitly creates a custom service package in future updates.
- **Status:** Pending Review

---

### Q-03: Owner Commission Tracking When Providing Clinical Treatments
- **Spec Reference:** §1 (Roles) & §11 (Commission)
- **Question:** §1 states that the Owner "also works as a clinician." §11 specifies that commissions are calculated per completed session for the clinician who performed it and generates a payout expense under `Doctor commission`. Does the Owner's user account generate commission payouts and expenses when completing sessions?
- **Suggested Answer:** **No commission by default (`none`).** The system sets the Owner's default commission type to `none` (0%), avoiding artificial clinic expenses paid to the owner. However, the system allows the Owner to optionally configure a commission rate if they choose to track their personal clinical earnings separately from clinic profit.
- **Status:** Pending Review

---

### Q-04: Multi-User Cash Shift Closing on Shared Front-Desk Terminal
- **Spec Reference:** §8.4 (Cash closing) & §15.1 (Shared PC switch user)
- **Question:** Front-desk receptionists often share a single workstation and use the "Switch user" button (§15.1). §8.4 states that clicking "Close shift" calculates expected cash based on cash transactions "recorded by that user since their last closing." If Receptionist A switches to Receptionist B in the afternoon without closing their shift, how is cash drawer accountability maintained?
- **Suggested Answer:** **Per-user closing accountability.** Each receptionist is prompted to close their cash shift before switching users or logging out at the end of their shift. If Receptionist A does not close and Receptionist B logs in, Receptionist B's closing only accounts for payments and refunds recorded under Receptionist B's user ID. Receptionist A's balance remains open until Receptionist A logs back in to close it, or an Owner/Manager closes it on their behalf with an audit note.
- **Status:** Pending Review

---

### Q-05: Receptionist Price Override / Discount Authority Prior to Payment
- **Spec Reference:** §1.1 (Matrix), §2 (Session types), §5.1 (Appointment fields)
- **Question:** §2 notes that session type default prices are suggestions and that "receptionist can change per booking." Meanwhile, §1.1 explicitly restricts "Change price after payment exists" to Owner and Manager only. Does the receptionist have unlimited authority to lower or raise prices when booking an appointment before any payment is entered, or should there be a minimum price threshold?
- **Suggested Answer:** **Allowed before payment, audited.** Receptionists can edit the appointment price at initial booking (e.g. for an agreed introductory discount) before any payment is collected. Once a payment or receipt has been recorded, the price is strictly locked and can only be altered by an Owner or Manager.
- **Status:** Pending Review

---

### Q-06: Duration and Scope of Clinician "Covering Access"
- **Spec Reference:** §1.1 (Permission matrix footnote)
- **Question:** A clinician can view/edit non-assigned patients by clicking "Covering access" and typing a mandatory reason (which is logged in the audit trail). How long does this covering access permission remain active for that clinician?
- **Suggested Answer:** **Active session only (max 12 hours).** Covering access expires when the clinician logs out, when their session times out after 12 hours, or after 15 minutes of idle lock. If the clinician returns the next day or in a new session, they must enter a fresh reason to access that patient's file again.
- **Status:** Pending Review

---

### Q-07: Unique Phone Number Constraint vs Family Members Sharing a Mobile
- **Spec Reference:** §4.1 (Patient fields) & §4.2 (Rules)
- **Question:** Mobile phones are required to be unique Egyptian numbers (`01XXXXXXXXX`) with a strict database unique constraint. In Egypt, parents frequently book physiotherapy or nutrition sessions for their young children or elderly parents using the family head's phone number. How does the system accommodate family members without violating the unique phone constraint?
- **Suggested Answer:** **Unique primary phone, with an Emergency/Guardian phone field.** The primary `mobilePhone` field retains its strict database unique constraint to prevent duplicate patient profiles and guarantee correct WhatsApp routing. For dependents sharing a contact, the guardian's phone is placed in `emergencyContactPhone` or an optional `guardianPhone` field with the dependent's own full name, allowing multiple children to reference the same guardian phone.
- **Status:** Pending Review

---

### Q-08: Refund Payment Method & Cash Drawer Reconciliation
- **Spec Reference:** §8.3 (Corrections) & §8.4 (Cash closing)
- **Question:** §8.3 allows issuing refunds for mistakes or cancellations. §8.4 computes expected cash as `cash payments − cash refunds − cash expenses`. If a patient originally paid by Visa, InstaPay, or Vodafone Cash, can the refund be issued in physical cash from the front-desk drawer?
- **Suggested Answer:** **Tracked by refund payout method.** When an Owner or Manager issues a refund, they must select the refund payout method (Cash, InstaPay, Visa, etc.). Only refunds designated as `Cash` reduce the front-desk receptionist's expected physical drawer cash. Non-cash refunds are recorded under electronic adjustment reports and do not affect physical cash closing.
- **Status:** Pending Review

---

### Q-09: 24-Hour Clinical Note Editable Window Start Trigger
- **Spec Reference:** §9.2 (Note editing)
- **Question:** §9.2 states: "Author can edit their note for 24 hours. Every edit keeps a version... After 24 hours: locked; only addendum notes can be added." Does this 24-hour edit countdown start from the scheduled appointment start time, or from the exact moment the clinician first completes and saves the note?
- **Suggested Answer:** **From initial note save time (`completedAt`).** The 24-hour edit window is calculated from the exact UTC timestamp when the session completion form was first submitted and saved.
- **Status:** Pending Review

---

### Q-10: Annual Receipt Number Sequence Reset Timezone
- **Spec Reference:** §8.2 (Receipt counter)
- **Question:** Receipt numbers are formatted as `INV-YYYY-00001`, resetting sequentially each year. Does the year change and counter reset occur at 00:00:00 UTC or 00:00:00 Cairo local time (`Africa/Cairo`)?
- **Suggested Answer:** **00:00:00 Cairo local time (`Africa/Cairo`).** Because the clinic operates in Egypt, the annual receipt sequence rolls over on January 1st at midnight Cairo time, matching the clinic's local financial and tax year.
- **Status:** Pending Review

---

### Q-11: Late Arrival Definition & Notification Timing Threshold
- **Spec Reference:** §5.5 (Status changes) & §14 (Notifications)
- **Question:** §5.5 states that changing status to `arrived` records `arrivedAt` and `lateMinutes`. §14 specifies an in-app notification for "late arrival (> 10 min)". Is the alert triggered when the current clock exceeds appointment start time + 10 minutes without check-in, or when the patient actually arrives and is checked in after > 10 minutes late?
- **Suggested Answer:** **Both triggers:**
  1. If the current time passes `startTime + 10 minutes` and the patient has not arrived, the front-desk dashboard displays a visual alert (indicating a potentially tardy patient).
  2. When the receptionist clicks "Check in" more than 10 minutes after `startTime`, `lateMinutes` is computed and stored, and an immediate notification is sent to the assigned clinician's screen.
- **Status:** Pending Review

---

### Q-12: InBody Height Measurement Pre-Fill and Editability
- **Spec Reference:** §9.4 (Nutrition consultation)
- **Question:** InBody records include height (cm), weight, BMI, and BMR. Is height automatically retrieved from the patient profile, or must the nutritionist measure and type it on every InBody record?
- **Suggested Answer:** **Pre-filled from previous record, always editable.** The form pre-populates height from the patient's most recent consultation or profile, saving time for adults whose height does not change, while remaining editable for children, teenagers, or measurement corrections.
- **Status:** Pending Review

---

### Q-13: Expenses Edit/Void Locking Upon Cash Shift Closing
- **Spec Reference:** §1.1 (Matrix), §8.4 (Cash closing), §10 (Expenses)
- **Question:** §1.1 states that a receptionist can add an expense (today only) and edit/void their own expense on the same day. What happens if the receptionist submits their end-of-shift Cash Closing at 3:00 PM, and later realizes an expense entered at 1:00 PM was erroneous? Can they still edit/void it?
- **Suggested Answer:** **Locked once included in a closed shift.** Once an expense has been factored into a completed Cash Closing, it is locked from modification or voiding by the receptionist. Any subsequent adjustments require an Owner or Manager to void the expense and record an audit explanation.
- **Status:** Pending Review

---

### Q-14: Bed Schedule Reservation on Early Session Completion
- **Spec Reference:** §5.1, §5.2, §9.1
- **Question:** Appointments are booked in 15-minute increments (e.g. 60 minutes). If a clinician completes the session in 40 minutes and submits the completion form, is the remaining 20 minutes of the bed reservation immediately freed on the calendar for walk-ins, or does the reservation remain blocked for the full scheduled duration?
- **Suggested Answer:** **Reservation holds for full scheduled slot.** The bed remains reserved for the full scheduled duration to maintain calendar stability and prevent double-booking collisions, unless the front-desk staff explicitly edits the appointment or schedules a walk-in.
- **Status:** Pending Review

---

### Q-15: WhatsApp Communication Consent Opt-Out Distinction
- **Spec Reference:** §4.1 (Data consent) & §6 (Front desk WhatsApp)
- **Question:** §4.1 mentions a single checkbox for data consent: "patient agreed to data processing & WhatsApp messages." If a patient wishes to receive clinical treatment but specifically opts out of receiving WhatsApp messages, can they be registered?
- **Suggested Answer:** **Separate WhatsApp messaging consent.** Medical data processing consent is mandatory for registration, while WhatsApp messaging consent is an independent toggle. If a patient opts out of WhatsApp, the WhatsApp buttons on their profile display an "Opted out" indicator to respect their communication preference.
- **Status:** Pending Review
