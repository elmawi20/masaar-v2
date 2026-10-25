# Masaar Clinic System — Permissions Matrix & Access Control Model

This document specifies the complete role-based access control (RBAC) and context-aware security permissions for the Masaar Clinic System.

- **Spec Reference:** [docs/FEATURES-v2.2.md §1 & §1.1](file:///F:/Claude%20CRM/docs/FEATURES-v2.2.md)
- **Rules Catalog Reference:** [docs/design/rules-index.md](file:///F:/Claude%20CRM/docs/design/rules-index.md)
- **Typed Implementation:** [`src/domain/permissions.ts`](file:///F:/Claude%20CRM/src/domain/permissions.ts)
- **Decision References:** [DEC-011](file:///F:/Claude%20CRM/docs/design/decisions.md) (Drawer closing per user), [DEC-012](file:///F:/Claude%20CRM/docs/design/decisions.md) (Price override audit), [DEC-013](file:///F:/Claude%20CRM/docs/design/decisions.md) (Covering access session limit), [DEC-020](file:///F:/Claude%20CRM/docs/design/decisions.md) (Locked closed expenses).

---

## 1. System Roles Overview

The system defines 5 strict, mutually exclusive operational roles. Developers and staging testers use synthetic accounts on staging environments; there is **no developer role in production** ([R-1-6](file:///F:/Claude%20CRM/docs/FEATURES-v2.2.md)).

| Role | Role Key | Arabic Title | Scope & Authority |
|---|---|---|---|
| **Owner** | `OWNER` | المالك / الاستشاري الرئيسي | Complete clinical, operational, financial, staff, and security authority. Can perform clinician work, re-open completed clinical notes, manage staff accounts, configure settings, view covering-access logs, and edit message templates. ([R-1-1](file:///F:/Claude%20CRM/docs/FEATURES-v2.2.md)) |
| **Manager** | `MANAGER` | مدير التشغيل والماليات | Full operational and financial management. Access to all reports, daily cash closings, expenses, pricing overrides, voids, refunds, staff schedules, leave, rooms, and beds. **Cannot** view medical records, medical attachments, or manage staff security credentials. ([R-1-2](file:///F:/Claude%20CRM/docs/FEATURES-v2.2.md)) |
| **Receptionist** | `RECEPTIONIST` | موظف الاستقبال | Front desk operations. Patient demographic registration, appointment scheduling, check-in, payment collection, shift closing, same-day expense logging, and WhatsApp reminders. **Strictly blocked** from clinical diagnoses and medical notes. ([R-1-3](file:///F:/Claude%20CRM/docs/FEATURES-v2.2.md)) |
| **Physiotherapist** | `PHYSIOTHERAPIST` | أخصائي علاج طبيعي | Clinical physical therapy. Manages own schedule, assigned patient medical records, SOAP notes, and session completion. Can view own earned commission. **No access** to clinic billing, pricing, or expenses. ([R-1-4](file:///F:/Claude%20CRM/docs/FEATURES-v2.2.md)) |
| **Nutritionist** | `NUTRITIONIST` | أخصائي تغذية علاجية | Clinical nutrition. Manages own schedule, nutrition consultations, InBody measurements, dietary plans, and progress charts. Can view own earned commission. **No access** to clinic billing or expenses. ([R-1-5](file:///F:/Claude%20CRM/docs/FEATURES-v2.2.md)) |

---

## 2. Guard Conditions & Contextual Constraints

Permissions depend on runtime business conditions enforced on the server and in the database:

1. **`OWN_PATIENTS_ONLY`**: Clinicians may only access patients assigned to them or with whom they have an active appointment ([R-1.1-2](file:///F:/Claude%20CRM/docs/FEATURES-v2.2.md)).
2. **`COVERING_ACCESS`**: A clinician may open a non-assigned patient's clinical file by providing an explicit reason. This temporary grant is valid **only for the duration of the active login session** (max 12 hours or until logout/idle lock) and is logged for Owner review ([DEC-013](file:///F:/Claude%20CRM/docs/design/decisions.md), [R-1.1-21](file:///F:/Claude%20CRM/docs/FEATURES-v2.2.md)).
3. **`OWN_APPTS_ONLY`**: Clinicians may only book, reschedule, or cancel appointments where they are the designated provider ([R-1.1-4](file:///F:/Claude%20CRM/docs/FEATURES-v2.2.md), [R-5.5-13](file:///F:/Claude%20CRM/docs/FEATURES-v2.2.md)).
4. **`SAME_DAY_ONLY`**: The action is restricted to the clinic's current operating day ([R-1.1-6](file:///F:/Claude%20CRM/docs/FEATURES-v2.2.md), [R-1.1-15](file:///F:/Claude%20CRM/docs/FEATURES-v2.2.md)).
5. **`OWN_SAME_DAY_UNCLOSED_SHIFT_ONLY`**: Receptionists can edit or void their own recorded expenses only during their active unclosed cash shift on the same day. Once the cash shift is closed, records are permanently locked from front-desk modification ([DEC-020](file:///F:/Claude%20CRM/docs/design/decisions.md), [R-1.1-16](file:///F:/Claude%20CRM/docs/FEATURES-v2.2.md)).
6. **`DOC_CATEGORY_RESTRICTION`**: Receptionists and Managers may view document attachments categorized as "ID / administrative" and "Payment proof" only; clinical categories (X-ray, MRI, lab, clinical reports) are blocked ([R-1.1-3](file:///F:/Claude%20CRM/docs/FEATURES-v2.2.md), [R-4.2-6](file:///F:/Claude%20CRM/docs/FEATURES-v2.2.md)).
7. **`NOTE_AUTHOR_ONLY`**: Author can edit a session note for 24h from initial save; this applies to the Owner as well (Owner may edit only notes they personally authored within the 24h window) ([R-2-8](file:///F:/Claude%20CRM/docs/FEATURES-v2.2.md), [R-9.2-1](file:///F:/Claude%20CRM/docs/FEATURES-v2.2.md)).
8. **`CLINICAL_AUDIT_MASKED`**: When the Manager views the system audit log, audit entries relating to clinical records, diagnoses, and medical session notes have all clinical content masked/redacted to preserve patient medical privacy. Only the Owner views unmasked clinical audit entries ([R-1.1-2](file:///F:/Claude%20CRM/docs/FEATURES-v2.2.md), [R-1.1-20](file:///F:/Claude%20CRM/docs/FEATURES-v2.2.md), [R-13-3](file:///F:/Claude%20CRM/docs/FEATURES-v2.2.md)).
9. **`AUDITED`**: The action writes an immutable entry in the audit log capturing the user, timestamp, before/after JSON states, and required rationale ([R-0-2](file:///F:/Claude%20CRM/docs/FEATURES-v2.2.md), [R-13-1](file:///F:/Claude%20CRM/docs/FEATURES-v2.2.md)).

---

## 3. Master Permission Matrix

The table below lists all **43** permissions across the clinic system. Every row maps 1-to-1 to [`src/domain/permissions.ts`](file:///F:/Claude%20CRM/src/domain/permissions.ts).

| # | Action / Permission | Owner | Manager | Reception | Physio | Nutrition | Conditions / Guard Rules | Rule IDs |
|:---:|---|:---:|:---:|:---:|:---:|:---:|---|---|
| **1** | Create / edit patient admin data | ✅ | ✅ | ✅ | ❌ | ❌ | Front desk and operations demographic registration | `R-1.1-1`, `R-4.1-1` |
| **2** | View / edit diagnosis, clinical notes & medical records | ✅ | ❌ | ❌ | ✅ (own*) | ✅ (own*) | Treating clinicians (own patients) or covering clinician with logged reason; Receptionist/Manager strictly blocked | `R-1.1-2`, `R-4.1-21`, `R-9.1-1` |
| **3** | Request covering access to non-assigned patient | ✅ | ❌ | ❌ | ✅ (reason) | ✅ (reason) | Valid for active login session (max 12h); reason logged and audited | `R-1.1-21`, `R-9.1-1` |
| **4** | Upload patient documents & view admin attachments | ✅ | ✅ (admin only) | ✅ (admin only) | ✅ (own*) | ✅ (own*) | Receptionist/Manager view "ID / administrative" & "Payment proof" only; medical files blocked | `R-1.1-3`, `R-4.2-1`, `R-4.2-6` |
| **5** | Book / reschedule / cancel / waitlist appointment | ✅ | ✅ | ✅ | ✅ (own appts) | ✅ (own appts) | Front desk manages all; clinicians restricted to own appointments; cancel requires reason | `R-1.1-4`, `R-5.2-1`, `R-5.2-10`, `R-5.2-11`, `R-5.3-1`, `R-5.5-13` |
| **6** | Check in arrived patient | ✅ | ✅ | ✅ | ❌ | ❌ | Fast check-in at front desk; alerts assigned clinician; shows balance due (does not block check-in) | `R-1.1-5`, `R-5.5-3`, `R-6-2` |
| **7** | Undo patient check-in | ✅ | ✅ | ✅ | ❌ | ❌ | Front desk; same day only; reason required | `R-1.1-5`, `R-5.5-3` |
| **8** | Mark no-show / undo no-show | ✅ | ✅ | ✅ | ✅ (own appts) | ✅ (own appts) | Same day only; mark allowed after appointment start time; clinicians own appointments only | `R-1.1-6`, `R-5.5-7`, `R-5.5-12` |
| **9** | Complete session & submit treatment form | ✅ (clinician) | ❌ | ❌ | ✅ (own) | ✅ (own) | Requires checked-in appointment; consumes package session; triggers commission | `R-1.1-7`, `R-5.5-5`, `R-9.1-7` |
| **10** | Edit session note within lock window | ✅ (author only) | ❌ | ❌ | ✅ (author only) | ✅ (author only) | Author only (including Owner for own notes) within 24h of save; keeps full version history | `R-2-8`, `R-9.2-1` |
| **11** | Re-open completed session note | ✅ | ❌ | ❌ | ❌ | ❌ | Strictly restricted to Owner; requires documented audit reason | `R-1.1-8`, `R-9.2-2` |
| **12** | Add addendum note to locked clinical record | ✅ | ❌ | ❌ | ✅ (own*) | ✅ (own*) | Permitted after 24h lock; appends new timestamped entry without modifying original note | `R-9.2-2` |
| **13** | Discharge patient & finalize summary | ✅ | ❌ | ❌ | ✅ (own) | ✅ (own) | Treating clinician or Owner; records outcome, notes, and discharge date; sets status to discharged | `R-4.1-19`, `R-9.5-1` |
| **14** | Create patient package | ✅ | ✅ | ✅ | ❌ | ❌ | Creates package record, generates financial charge, initializes session counters | `R-1.1-9`, `R-7-2` |
| **15** | Extend package validity days | ✅ | ✅ | ❌ | ❌ | ❌ | Adds 1–365 days to package; requires reason; audited | `R-1.1-10`, `R-7-6` |
| **16** | Cancel package with refund decision | ✅ | ✅ | ❌ | ❌ | ❌ | Adjusts owed amount to completed sessions; refund remaining paid only (no balance credit in v1) | `R-7-4`, `R-7-7`, `R-8.1-3` |
| **17** | Record payment | ✅ | ✅ | ✅ | ❌ | ❌ | Must be linked to a charge; amount must be > 0 and <= remaining balance | `R-1.1-11`, `R-8.1-2`, `R-8.2-1` |
| **18** | Change price before payment | ✅ | ✅ | ✅ (audited) | ❌ | ❌ | Receptionist can adjust price before payment; reason required; audited | `R-1.1-13`, `R-5.1-2`, `R-8.3-4` |
| **19** | Change price after payment exists | ✅ | ✅ (audited) | ❌ | ❌ | ❌ | Owner/Manager only; cannot reduce below amount already paid; audited | `R-1.1-14`, `R-8.3-4` |
| **20** | Void payment receipt | ✅ | ✅ | ❌ | ❌ | ❌ | Owner/Manager only; reason required; receipt kept struck through; reverses balance effect | `R-1.1-12`, `R-8.3-1` |
| **21** | Issue refund to patient | ✅ | ✅ | ❌ | ❌ | ❌ | Owner/Manager only; max bounded by paid minus used sessions; cash refund counts against cashier drawer | `R-1.1-12`, `R-8.3-2`, `R-8.3-3` |
| **22** | Write off patient balance / bad debt | ✅ | ✅ | ❌ | ❌ | ❌ | Owner/Manager only; clears unpaid balance with reason; audited | `R-1.1-10`, `R-7-5` |
| **23** | Close own cash shift | ✅ | ✅ | ✅ | ❌ | ❌ | Cashier counts physical cash; system computes expected drawer balance and records variance | `R-1.1-18`, `R-8.4-1` |
| **24** | Close another user's open cash shift | ✅ | ✅ | ❌ | ❌ | ❌ | Owner/Manager emergency drawer close with mandatory audit note | `R-1.1-18`, `R-8.4-1` |
| **25** | View all cash shift closings & variances | ✅ | ✅ | ❌ | ❌ | ❌ | Full cash drawer oversight across all front-desk staff | `R-8.4-4` |
| **26** | Add operational expense | ✅ | ✅ | ✅ (today only) | ❌ | ❌ | Receptionist can record expenses for current operating day only | `R-1.1-15`, `R-10-1` |
| **27** | Edit / void recorded expense | ✅ | ✅ | ✅ (own shift) | ❌ | ❌ | Receptionist can only edit/void own expenses during unclosed shift; closed shifts are locked | `R-1.1-16`, `R-8.4-3`, `R-10-2`, `R-10-3` |
| **28** | View own commission summary | ✅ | ❌ | ❌ | ✅ (own) | ✅ (own) | Clinicians see their own completed sessions and earned totals; cannot see others | `R-1.1-17`, `R-3-5`, `R-11-3` |
| **29** | View all staff commission reports | ✅ | ✅ | ❌ | ❌ | ❌ | Full clinic commission breakdown by doctor, session count, and payout status | `R-1.1-17`, `R-11-3` |
| **30** | Confirm commission payout | ✅ | ✅ | ❌ | ❌ | ❌ | Marks completed sessions as paid and creates corresponding expense entry | `R-11-2` |
| **31** | View financial & operational reports | ✅ | ✅ | ❌ | ❌ | ❌ | Access to daily income, doctor productivity, packages, attendance, debtors, net profit reports | `R-1.1-17`, `R-12-1` to `R-12-7` |
| **32** | Export reports to CSV | ✅ | ✅ | ❌ | ❌ | ❌ | Audited export action; strictly excludes patient medical diagnoses | `R-1.1-20`, `R-12-8` |
| **33** | View and filter audit log | ✅ | ✅ (masked) | ❌ | ❌ | ❌ | Full visibility; Manager view masks clinical notes/diagnoses to preserve patient privacy | `R-1.1-2`, `R-1.1-20`, `R-13-3` |
| **34** | View covering-access audit log | ✅ | ❌ | ❌ | ❌ | ❌ | Owner only: audit trail of temporary patient access grants | `R-1.1-21`, `R-13-1` |
| **35** | Manage staff accounts & roles | ✅ | ❌ | ❌ | ❌ | ❌ | Owner only: create user, assign role, deactivate account | `R-1.1-19`, `R-3-1`, `R-3-3` |
| **36** | Manage staff schedules, leave, rooms & beds | ✅ | ✅ | ❌ | ❌ | ❌ | Set working hours, leave, rooms, and beds; Manager cannot alter user credentials or roles | `R-1.1-19`, `R-3-2` |
| **37** | Manage clinic settings & catalog | ✅ | ❌ | ❌ | ❌ | ❌ | Configure clinic profile, opening hours, services, packages, lock window; rooms and beds managed by Owner and Manager (row #36) | `R-1.1-19`, `R-2-1` to `R-2-6`, `R-2-8` |
| **38** | Send WhatsApp message & mark reminder sent | ✅ | ✅ | ✅ | ❌ | ❌ | Opens pre-filled wa.me link; marks reminder sent timestamp; respects whatsappConsent | `R-4.1-21`, `R-6-2`, `R-6-3`, `R-6-4` |
| **39** | Edit WhatsApp message templates | ✅ | ❌ | ❌ | ❌ | ❌ | Owner only: configures clinic reminder and notification templates | `R-2-7` |
| **40** | Reset staff password | ✅ | ❌ | ❌ | ❌ | ❌ | Owner only: generates one-time link or temporary password requiring change on login | `R-3-4` |
| **41** | Reset staff TOTP 2FA secret | ✅ | ❌ | ❌ | ❌ | ❌ | Owner only: resets two-factor authenticator enrollment for locked-out staff; audited | `R-15.2-6` |
| **42** | Revoke trusted devices & active sessions | ✅ | ❌ | ❌ | ❌ | ❌ | Owner only: revokes 30-day device tokens and forces re-authentication on all client machines | `R-15.2-4`, `R-15.2-5` |
| **43** | Change own account password | ✅ | ✅ | ✅ | ✅ | ✅ | Any active user can change their own password by providing current password | `R-15.1-1` |

---

## 4. Verification Check

This document maps to [`src/domain/permissions.ts`](file:///F:/Claude%20CRM/src/domain/permissions.ts).
- Total actions defined: **43**
- All 21 permission rules in spec §1.1 (`R-1.1-1` through `R-1.1-21`) are explicitly represented.
- All auth security administrative operations (`R-3-4`, `R-15.2-4`, `R-15.2-6`) and covering access (`R-1.1-21`) are explicitly represented.
- Every Rule ID cited in the matrix exists in [`docs/design/rules-index.md`](file:///F:/Claude%20CRM/docs/design/rules-index.md).
