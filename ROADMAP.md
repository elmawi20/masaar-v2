# Masaar Clinic System — Full Roadmap (low-error, no manual audit)

**Idea:** design everything first, build a "quality machine" that checks the work automatically, then build one module at a time. You don't audit code — the machine does. You only approve designs and look at screenshots.

Spec: `docs/FEATURES-v2.1.md` · Guide: `docs/BUILD-AND-LAUNCH-GUIDE.md`

---

## How manual auditing is replaced

| Old way (manual) | New way (automatic) |
|---|---|
| Asking the AI to audit the code | **Every rule in the spec has an ID** (e.g. `R-5.2-3`). Every test names the rule IDs it covers. A script fails the build if any rule has no test. |
| Clicking through roles to check permissions | Permission matrix is a **code file**; tests are generated for **every action × every role** (allowed / blocked). |
| Checking status changes by hand | Status tables are **code files**; tests are generated for **every From→To pair**. |
| Hoping double bookings don't happen | **Database constraints** make them impossible. |
| Testing the full workflow by hand | **Playwright** robots log in as each role and run the whole clinic day. |
| Checking how screens look | Robots take **screenshots of every page** (AR/EN, light/dark) → you scroll a gallery for 10 minutes. |
| Remembering to run checks | **GitHub Actions** runs everything on every push; code with a failing check cannot be merged. |
| Finding errors after launch | **Error monitoring** (e.g. Sentry) emails you when anything breaks in staging/production. |
| Outdated / vulnerable packages | **Dependabot** opens update requests automatically. |
| Basic security scan | **OWASP ZAP baseline scan** runs automatically against staging. |
| "Did the AI follow the spec?" | **Reviewer session:** a separate Antigravity chat compares the change to the spec and lists gaps (prompt below). |

**Your only manual work:** approve design documents (once), approve each phase plan, look at the screenshot gallery, run the 2-week pilot.

---

## Stage 0 — Prepare (½ day) ✅ mostly done
- [x] Git installed
- [ ] Docker Desktop, Node.js LTS, GitHub account + private repo `masaar-v2`
- [ ] Folder `f:\masaar-v2\docs\` with: FEATURES-v2.1.md, BUILD-AND-LAUNCH-GUIDE.md, ROADMAP.md, OLD-FEATURES.md, audit report, test checklist

---

## Stage 1 — Design (no app code yet) · ~1 week

Each step = one Antigravity session = one document in `docs/design/`. Use the **Master instruction** from the guide + the step prompt. Approve, commit, next.

| Step | Output file | Prompt (add after Master instruction) | You check |
|---|---|---|---|
| 1.1 Rule IDs | `FEATURES-v2.1.md` updated + `design/glossary.md` | "Give every business rule in the spec a unique ID like R-5.2-3 (section-number). Don't change meaning. Create a glossary of all terms in AR/EN." | Meaning unchanged |
| 1.2 Permissions | `design/permissions.md` + `src/domain/permissions.ts` | "Turn spec §1.1 into a single permissions file: list of actions × roles. No other code." | Table matches what you want |
| 1.3 State machines | `design/state-machines.md` + `src/domain/*Status.ts` | "Define the status machines for Appointment, Package, Patient, Charge/Payment, ClinicalNote as data tables (from, to, who, needs reason, side effects)." | Read the tables |
| 1.4 Data model | `design/data-model.md` (diagram) + `prisma/schema.prisma` | "Design the complete database for the whole spec now (all modules). Include indexes, unique constraints, exclusion constraints (btree_gist), money in piasters, UTC timestamps. Show a Mermaid diagram. Do not run migrations." | Diagram makes sense (I can review it for you) |
| 1.5 Screens | `design/screens.md` + low-fidelity wireframes | "List every screen per role, what it shows and which actions it has. Create simple grey wireframes (HTML) for: login, OTP, front desk today, calendar, patient profile, booking, payment, completion form." | Look at wireframes — fix layout now, not later |
| 1.6 Action catalog | `design/actions.md` | "List every server action: name, roles allowed, inputs + validation, rule IDs enforced, audit event, errors returned." | Skim |
| 1.7 Test plan | `design/test-plan.md` | "Map every rule ID and every row of the test checklist to planned tests (unit / integration / e2e)." | Nothing missing |

**Gate 1:** send me `data-model.md`, `permissions.md`, `state-machines.md` before Stage 2 — design mistakes are the most expensive ones.

---

## Stage 2 — Build the quality machine (before any feature) · ~3–4 days

One session, prompt:

```text
Stage 2 — quality infrastructure only, no features:
1. Next.js + TypeScript strict, ESLint, Prettier, Tailwind, next-intl (ar default RTL, en).
2. Docker Compose for local PostgreSQL; Prisma with the approved schema; first migration.
3. Test setup: Vitest (unit), integration tests against a real test PostgreSQL,
   Playwright (e2e) with screenshot capture for every page in ar/en and light/dark.
4. A single `defineAction()` wrapper for all server actions that REQUIRES:
   permission name, Zod schema, and audit event; it runs auth -> active user ->
   permission -> validation -> transaction -> audit. Add a lint rule/test that
   fails if any server action does not use it.
5. Generated tests: every action x role from permissions.ts; every from->to pair
   from the status files.
6. scripts/check-rule-coverage: fails if any rule ID in FEATURES-v2.1.md has no
   test referencing it (list missing IDs). Allowed to report "not built yet" per
   module until that module's phase.
7. Fake data generator (Arabic/English names, Egyptian phones) for dev/staging.
8. Husky pre-commit: typecheck + lint + unit tests.
9. GitHub Actions on every push/PR: install, typecheck, lint, all tests,
   rule coverage, build, upload Playwright screenshots as an artifact.
   Branch protection: main cannot receive failing code.
10. Dependabot config.
Show me the plan first.
```

Then ask for the **deployment files** (guide Part 5.2) and put **staging online** now.
Add: GitHub Actions auto-deploys `main` to staging; ZAP baseline scan runs against staging weekly; error monitoring connected to staging.

**Gate 2:** a pull request with a deliberately failing test is blocked by GitHub. (Ask Antigravity to prove it.)

---

## Stage 3 — Build modules one by one · ~5–6 weeks

Order (each depends on the previous):

| # | Module | Spec |
|---|---|---|
| 3.1 | **Auth: login, lockout, OTP (authenticator app), backup codes, trusted device, forgot password by email, staff accounts** | §1, §3, §15 |
| 3.2 | Clinic setup: hours per weekday, closures, rooms/beds, session types, staff schedules & leave | §2, §3 |
| 3.3 | Patients + profile + documents | §4, §9.5 |
| 3.4 | Scheduling: booking checks, calendar, drag-drop, waitlist, recurring | §5 |
| 3.5 | Front desk: today, action panel, check-in, reasons, WhatsApp, reminders, notifications | §6, §14 |
| 3.6 | Packages | §7 |
| 3.7 | Billing: charges, payments, receipts, print, void, refund, cash closing | §8 |
| 3.8 | Clinical + nutrition | §9 |
| 3.9 | Expenses, commission, reports, exports, audit viewer | §10–§13 |

### The same 7-step loop for every module

1. **Branch:** "Create branch `module-3.x`."
2. **Plan:** "Phase 3.x — implement spec §… Show me the plan: files, DB changes, rule IDs covered." → you OK it (or send it to me).
3. **Tests first:** "Write the tests for all rule IDs of this module first; they should fail now."
4. **Build:** "Implement until all tests pass. Run typecheck, lint, all tests, rule coverage. Paste the summary."
5. **Reviewer session** (new Antigravity chat, paste):
   ```text
   You are a strict reviewer. Compare the changes on branch module-3.x with
   docs/FEATURES-v2.1.md and docs/design/*. List: rules not implemented, rules
   implemented differently, missing tests, permission or privacy leaks, data
   that is deleted instead of voided, values stored that should be calculated.
   Do not change code. Output a numbered list, or "NO ISSUES".
   ```
   Paste the list into the builder session → fix → repeat until "NO ISSUES".
6. **Pull request:** push → GitHub Actions must be green → merge → auto-deploy to staging.
7. **Look (10 min):** open the screenshot gallery + click around staging once. Visual issues only → small fix PR.

Never start the next module with anything red.

---

## Stage 4 — Release · ~2 weeks

1. **Hardening session:** load test with fake data (5,000 patients, 50,000 appointments); fix slow pages.
2. **Security pass:** ZAP scan clean of high issues; Dependabot clean; OTP & lockout tested; backups encrypted.
3. **Restore drill:** restore last night's backup to staging automatically (script) — must pass.
4. **Production** created (no demo data), Owner account, OTP set up.
5. **Clinic setup + import** existing patients (import script with duplicate-phone check).
6. **Training** (3 short sessions) + Arabic user guide (generated from spec).
7. **Pilot 2 weeks** → issues fixed through the same 7-step loop.
8. **Go live.**

---

## Stage 5 — Operate (ongoing)
- Changes always: branch → tests → reviewer → green CI → staging → production.
- Weekly: check error-monitoring emails, Dependabot updates.
- Monthly: automatic restore test result, disk space, uptime report.
- Every change to business rules starts by **editing the spec first** (new rule ID), then the loop.

---

## Rules that keep errors low
1. Spec first, code second. If it isn't in the spec, it isn't built.
2. Design the whole database before building any screen.
3. One module per branch, one session per step.
4. Nothing merges with a red check.
5. Never let the AI "fix" by deleting or skipping a test.
6. Every bug found later becomes a new test before it is fixed.
