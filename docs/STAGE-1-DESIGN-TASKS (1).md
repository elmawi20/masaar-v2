# Stage 1 — Design: One-Session Tasks

**20 tasks · ~2 weeks · no app code** (only small "domain" files that hold rules as data).
Every task = **one new Antigravity session** → one output → you approve → commit → next task.
Never do two tasks in one session. Never skip ahead.

All outputs go in `docs/design/` unless stated. Spec = `docs/FEATURES-v2.2.md`.

---

## Start every design session with this prompt

```text
DESIGN SESSION — Masaar clinic system.
Read docs/FEATURES-v2.2.md, docs/ROADMAP.md and everything already in docs/design/.
Rules:
- Design only. Do NOT create app code, pages, components or migrations,
  except files explicitly named in this task.
- Do only the task below. Do not change other design files unless the task says so.
- If the spec is unclear or contradicts itself, do NOT guess: add the question
  to docs/design/open-questions.md and tell me.
- At the end: list files created/changed and a short "Done when" checklist with
  each item marked ✅ or ❌.
TASK:
```
Then paste the task's **Prompt**.

## After every task
1. Read the "You check" item (5–15 min).
2. If OK → tell Antigravity: `commit with message "design 1.X <name>"`.
3. If not → explain the change in the **same** session, then re-check.

---

## Week 1 — Foundations

### 1.01 Project docs setup & ambiguity scan
- **Prompt:** "Create docs/design/README.md (index of all Stage 1 files with status), docs/design/decisions.md (decision log: date, decision, reason), docs/design/open-questions.md. Then read the whole spec and list every unclear, missing or contradictory point in open-questions.md, numbered, each with your suggested answer. Do not change the spec."
- **Output:** README.md, decisions.md, open-questions.md
- **Done when:** every question has a suggested answer.
- **You check:** answer each question (accept suggestion or change it). Send the list to me if unsure.

### 1.02 Apply answers to the spec
- **Prompt:** "Apply my answers in open-questions.md to FEATURES-v2.1.md. Record each in decisions.md. Mark questions resolved. Bump the spec header to v2.2 with a change list."
- **Output:** FEATURES-v2.2.md (rename file), decisions.md
- **Done when:** open-questions.md has zero unresolved items.
- **You check:** the change list at the top of the spec.

### 1.03 Rule IDs
- **Prompt:** "Give every business rule, validation, limit and permission statement in the spec a unique ID in the form R-<section>-<n> (e.g. R-5.2-3). Put the ID at the start of the line. Do not change any meaning or wording. Create docs/design/rules-index.md: table of ID | one-line summary | module."
- **Output:** spec with IDs, rules-index.md
- **Done when:** count of IDs in spec = rows in rules-index.md (state both numbers).
- **You check:** open 3 random rules — wording unchanged.

### 1.04 Glossary & naming conventions
- **Prompt:** "Create glossary.md: every business term with Arabic label, English label, code name (camelCase), database name (snake_case), and a one-line definition (e.g. Charge, Payment, Receipt, Void, Refund, Write-off, Package, Available sessions, Forfeited, Covering access, Trusted device). Add naming rules for files, DB tables, enums, routes, translation keys."
- **Output:** glossary.md
- **Done when:** every term used in rules-index.md appears in the glossary.
- **You check:** Arabic labels are the words your clinic actually uses.

### 1.05 Permissions as data
- **Prompt:** "From spec §1 create permissions.md (table: action | Owner | Manager | Reception | Physio | Nutrition | conditions like 'own patients only', 'same day only' | rule IDs) and src/domain/permissions.ts exporting the same table as typed data (no logic beyond the data and types). Include auth actions (reset OTP, revoke devices, reset password) and covering access."
- **Output:** permissions.md, src/domain/permissions.ts
- **Done when:** every permission rule ID is referenced; .md and .ts have identical rows (state the count).
- **You check:** read the table row by row — this is who can do what in the clinic.

### 1.06 Status machines as data
- **Prompt:** "Create state-machines.md and src/domain/status/*.ts for: Appointment, Package, Patient, ClinicalNote, Receipt (active/voided), Staff (active/inactive), OTP enrollment (not_set/pending/active). For each: list of statuses, a transition table (from | to | allowed roles | reason required | time limit | side effects e.g. 'restore package session') and a list of forbidden transitions. Data only."
- **Output:** state-machines.md, src/domain/status/*.ts
- **Done when:** every transition in spec §5.5 / §7 / §9.2 is present; forbidden list is explicit.
- **You check:** the Appointment table especially.

### 1.07 Calculations & formulas
- **Prompt:** "Create calculations.md: every calculated value with formula, inputs, rounding (piasters), timezone rules, and 3 worked examples each (normal, edge, invalid). Include: patient age, charge balance, package available sessions, package status, expiry date, per-session value, refund maximum, commission per session, cash closing expected amount, late minutes, BMI, BMR (Mifflin-St Jeor), clinician utilization, no-show rate. Examples must be precise numbers — they will become tests."
- **Output:** calculations.md
- **Done when:** every 'calculated' item in the spec is covered with 3 examples.
- **You check:** package and money examples make business sense (send to me if unsure).

---

## Week 1–2 — Database

> The database is designed in 5 slices, then merged. Each slice adds to the SAME `prisma/schema.prisma` and `data-model.md`.

**Slice prompt template** (replace `<SLICE>`):
```text
Design the database slice: <SLICE>.
Add models to prisma/schema.prisma (do not run migrations) and a section to
docs/design/data-model.md with: purpose of each table, every column (type,
required, default, AR/EN meaning), relations, indexes, unique constraints,
check constraints, which values are NOT stored because they are calculated
(reference calculations.md), and which rule IDs each constraint enforces.
Rules: money = Int piasters; timestamps = UTC DateTime; never-delete
(use status/voided/isActive); created_by / updated_by user ids; created_at /
updated_at everywhere. Add a Mermaid diagram for this slice.
```

### 1.08 Slice A — Clinic, staff & auth
- **<SLICE>:** "Clinic settings, weekly opening hours, closures, rooms, beds, session types, users/staff, staff weekly schedules (up to 2 shifts/day), leave, login attempts, sessions, OTP secrets (encrypted), backup codes (hashed), trusted devices, password reset codes, audit log."
- **You check:** diagram looks complete for settings and staff.

### 1.09 Slice B — Patients & documents
- **<SLICE>:** "Patients (normalized unique phone, DOB, consent, referral source, preferred language, assigned physio and nutritionist, medical alerts), diagnosis history, documents (category, private file key, size, mime), document view log, covering-access log."

### 1.10 Slice C — Scheduling
- **<SLICE>:** "Appointments, appointment series (recurring), status history (every change with reason), reminder-sent records, notifications. Include PostgreSQL exclusion constraints (btree_gist) for clinician and bed overlaps on active statuses, written as raw SQL in data-model.md (to be added as a migration later)."

### 1.11 Slice D — Packages & money
- **<SLICE>:** "Packages, charges, payments, receipt number counter per year, voids, refunds, write-offs, price-change history, package extensions, cash closings."

### 1.12 Slice E — Clinical, nutrition & back office
- **<SLICE>:** "Clinical notes, note versions, addenda, treatment items, pain scores, home exercises, InBody records, expenses (with edit history and void), commission payouts and paid-session links."

### 1.13 Database consolidation & check
- **Prompt:** "Review the full prisma/schema.prisma and data-model.md as one design. Produce: (1) one complete Mermaid ERD, (2) constraints.md listing every unique/check/exclusion constraint and its rule ID, (3) a table 'Rule ID → enforced by (DB constraint / server action / both)' for every rule in rules-index.md, (4) a list of problems found (duplicate data, missing relations, missing indexes for calendar and reports, calculated values stored) and fix them. Run `npx prisma validate` and `npx prisma format` and show the result."
- **Output:** final schema, data-model.md, constraints.md
- **Done when:** prisma validate passes; every rule ID has an enforcement entry.
- **You check:** 🛑 **Send me data-model.md + constraints.md** before continuing.

---

## Week 2 — Screens, actions & tests

### 1.14 Screen map & navigation
- **Prompt:** "Create screens.md: every screen and modal, grouped by role; for each: route, purpose, data shown, actions available (link to permissions.md action names), empty state, error states, AR/EN title. Add a navigation map per role (Mermaid). Mark which data is hidden from which role."
- **Output:** screens.md
- **You check:** each role's menu matches how the clinic works.

### 1.15 Wireframes A — Auth & front desk
- **Prompt:** "Create low-fidelity grey HTML wireframes in docs/design/wireframes/ (plain HTML+CSS, RTL Arabic text, no colors/branding) for: login, OTP setup with QR placeholder + backup codes, OTP entry, forgot password (email + code + new password), front desk Today, calendar day view (beds × 15-min rows), appointment action panel, booking form, recurring series preview with ✅/❌ per date. Add index.html linking all."
- **You check:** open index.html in your browser; fix layout now (cheap) not later (expensive).

### 1.16 Wireframes B — Patients & money
- **Prompt:** same style, for: "patient registration (duplicate phone alert), patient profile with all tabs, package create/extend, collect payment, printable receipt (A5), void/refund dialogs, cash closing."

### 1.17 Wireframes C — Clinical & admin
- **Prompt:** same style, for: "clinician workspace (today's queue), session completion form (pain 0–10, SOAP, treatments, home exercises), note with versions/addendum, nutrition consultation + progress chart placeholder, owner/manager reports, settings (hours per weekday, closures, rooms/beds, session types), staff list + schedule + leave, audit log viewer."

### 1.17b Visual style & colored mockups
- **Prompt:** "Define the visual design system in docs/design/style-guide.md and create colored high-fidelity mockups in docs/design/style/. Calm clinical look, NOT 'AI-looking' (no gradients, glassmorphism, neon/purple, or emoji decorations). One primary color: deep teal, neutral greys, white background, full dark mode support. Status colors always paired with explicit text labels: scheduled blue, arrived amber, completed green, cancelled grey, no-show red, waitlisted slate. Typography: IBM Plex Sans Arabic (fallback Cairo). Compact layouts for front desk and calendar, spacious layout for clinical forms. Egyptian currency '450.00 ج.م', time '5:30 م'. Output docs/design/style-guide.md and colored mockups in docs/design/style/ of: (1) Front desk Today, (2) Patient profile, (3) Session completion form, plus docs/design/style/index.html linking all."
- **Output:** docs/design/style-guide.md, docs/design/style/*.html, docs/design/style/index.html
- **Done when:** style guide complete with tokens and rules; 3 colored mockups with dark mode; index.html links all; strict review passes.


### 1.18 Action catalog
- **Prompt:** "Create actions.md: every server action needed by screens.md. For each: name, permission action (from permissions.ts), input fields with Zod-style validation, rule IDs enforced, DB tables written, transaction yes/no, audit event name, possible errors (code + AR/EN message), idempotency (double-click safe?). Also list read queries per screen with filters and role-based field hiding."
- **Done when:** every screen action in screens.md maps to an action; every rule ID enforced by 'server action' in 1.13 appears here.

### 1.19 Messages catalog
- **Prompt:** "Create messages.md: all user-facing texts in AR and EN as translation keys — validation errors, error codes from actions.md, confirmations, empty states, notifications, and final WhatsApp templates (welcome, reminder, reschedule with old+new date/time, low sessions, balance due, package expiring) using {placeholders} from the glossary. Reuse wording from docs/OLD-FEATURES.md where good."
- **You check:** Arabic sounds natural to your patients and staff.

### 1.20 Test plan & traceability
- **Prompt:** "Create test-plan.md: (1) for every rule ID: test level (unit / integration / e2e), test name, and which calculations.md example or state-machine row it uses; (2) generated test groups: permissions (every action × role) and transitions (every from→to pair); (3) e2e journeys: full clinic day, OTP login, payment+void+refund, package expiry, cash closing; (4) map every row of the old Excel test checklist to a test or mark 'removed in v2' with reason; (5) visual regression testing: Playwright screenshot assertions at phone (390px), tablet (820px), and desktop (1440px) viewports for all responsive screens (R-0-9 to R-0-13). End with coverage counts: rules with ≥1 test / total."
- **Done when:** coverage = 100% of rule IDs.

---

## 1.21 Design freeze (Gate 1)

**Reviewer session** (new chat, do not use the design-session prompt):
```text
You are a strict senior reviewer. Review everything in docs/design/ against
docs/FEATURES-v2.2.md. Report as a numbered list:
1. Rules missing from permissions, state machines, data model, actions or tests.
2. Contradictions between design files.
3. Privacy leaks (receptionist seeing clinical data, exports with diagnosis).
4. Money risks (stored balances, deletable financial records, missing audit).
5. Concurrency risks (double booking, double payment, duplicate receipt numbers).
Do not change files. If nothing is wrong, answer "DESIGN READY".
```
- Fix every item (in a normal design session), re-run the reviewer until **"DESIGN READY"**.
- Update docs/design/README.md: all items ✅.
- Commit: `design freeze v1` and create a Git tag `design-v1`.

➡ Then Stage 2 (quality machine) from ROADMAP.md.

---

## Progress tracker

| # | Task | Done | Commit |
|---|---|:-:|---|
| 1.01 | Docs setup & ambiguity scan | ☐ | |
| 1.02 | Apply answers → spec v2.2 | ☐ | |
| 1.03 | Rule IDs | ☐ | |
| 1.04 | Glossary & naming | ☐ | |
| 1.05 | Permissions | ☐ | |
| 1.06 | Status machines | ☐ | |
| 1.07 | Calculations | ☐ | |
| 1.08 | DB slice A — clinic, staff, auth | ☐ | |
| 1.09 | DB slice B — patients, documents | ☐ | |
| 1.10 | DB slice C — scheduling | ☐ | |
| 1.11 | DB slice D — packages, money | ☐ | |
| 1.12 | DB slice E — clinical, back office | ☐ | |
| 1.13 | DB consolidation 🛑 send to review | ☐ | |
| 1.14 | Screen map | ☐ | |
| 1.15 | Wireframes A | ☐ | |
| 1.16 | Wireframes B | ☐ | |
| 1.17 | Wireframes C | ☐ | |
| 1.17b | Visual style & mockups | ☐ | |
| 1.18 | Action catalog | ☑ | design 1.18 action catalog |
| 1.19 | Messages catalog | ☑ | design 1.19 messages catalog |
| 1.20 | Test plan & traceability | ☑ | design 1.20 test plan |
| 1.21 | Design freeze (Gate 1) | ☐ | tag `design-v1` |
