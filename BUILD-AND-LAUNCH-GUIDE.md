# Masaar Clinic System — Build & Launch Guide

For you (the builder/owner of the project). Plain language. Follow it in order.

---

## Part 1 — What the system is made of (simple explanation)

Think of a restaurant:

| Restaurant | Your system | Technology we use |
|---|---|---|
| Dining room (what customers see) | **Frontend** — the screens staff use | Next.js + React + Tailwind |
| Kitchen (where rules are applied) | **Backend** — checks permissions & business rules, saves data | Next.js Server Actions (same project) |
| Storage room | **Database** — patients, appointments, payments | PostgreSQL |
| Recipe enforcement | **ORM** — the safe way the backend talks to the database | Prisma |
| Door with a key | **Login** | Auth.js (passwords hashed with bcrypt) |
| Filing cabinet | **Files** — X-rays, receipts | Private folder on the server |
| The building | **Server** | Your Contabo VPS (Ubuntu) |
| Front door + lock | **HTTPS + web gateway** | Caddy (free automatic SSL certificate) |
| Moving boxes | **Docker** — packages app + database so they run the same everywhere | Docker Compose |
| Safe deposit box | **Backups** off the server | Daily copy to cloud storage (e.g. Backblaze B2 or Google Drive via rclone) |

**Why this stack:** one project for frontend + backend (less to learn), PostgreSQL can *physically block* double bookings and duplicate phones, everything runs on the Contabo VPS you already have, no monthly cloud fees except a few dollars for backup storage.

```
Staff browser ──HTTPS──► Caddy ──► Next.js app ──► PostgreSQL
                                        └────────► /uploads (private files)
Nightly: database + uploads ──► off-site backup storage
```

---

## Part 2 — How we avoid errors

No software is ever 100% error-free. We get as close as possible by:

1. **Rules live in the database + server**, not only in screens (spec §0).
2. **Small phases.** Build one module, test it, save, then the next. Never "build everything".
3. **Automated tests** written by Antigravity for every business rule (Vitest) and every main workflow (Playwright). They run before every change is accepted.
4. **Git checkpoint** after every passing phase, so any mistake can be undone.
5. **Two copies online:** `test.` (staging, fake data) and the real one (production). Every update goes to test first.
6. **Pilot:** 2 weeks of real use alongside the clinic's current method before full switch.

---

## Part 3 — Tools to install on your PC (once)

1. **Git** — saves checkpoints. (git-scm.com)
2. **Docker Desktop** — runs PostgreSQL on your PC for development. (docker.com)
3. **Node.js LTS** (nodejs.org)
4. **Antigravity** (you have it)
5. A **GitHub** private repository — online copy of your code (also used to send code to the server).

---

## Part 4 — Build phases

### Step 0 — Start the new project
Create an empty folder `f:\masaar-v2`. Copy into `docs/`:
- `FEATURES-v2.md` (this spec)
- old `FEATURES.md` renamed `OLD-FEATURES.md`
- the audit report and the test checklist

### Master instruction — paste at the start of EVERY Antigravity session

```text
You are building the Masaar clinic system. docs/FEATURES-v2.md is the single
source of truth; follow it exactly, especially section 0 (ground rules).
Stack: Next.js (App Router, TypeScript), Server Actions, PostgreSQL, Prisma,
Auth.js credentials + bcrypt, Tailwind, Zod validation, Vitest + Playwright.
Arabic RTL default + English, light/dark theme.

Working rules:
- Only do the phase I ask for. Do not touch other modules.
- Before coding: list the files you will create/change and the database
  changes, and wait for my OK.
- Every server action: auth check -> active user check -> permission check ->
  Zod validation -> transaction -> audit log.
- Write tests for every rule in the phase. Run typecheck, lint and all tests.
  Do not tell me "done" unless they all pass; paste the test summary.
- Never delete data; never store calculated values; money in piasters.
- If the spec is unclear, ask me instead of guessing.
```

### Phases (one Antigravity session each)

| # | Phase | Ask Antigravity | You test (by hand) |
|---|---|---|---|
| 1 | **Foundation** | Project setup, Docker Compose for local Postgres, Prisma, login/logout, roles & permission helper, audit log table, layout (AR/EN, theme), Owner seed account, staff management (spec §1, §3 accounts, §13, §15). | Login as each role; wrong password ×5 locks; deactivated user can't log in; menus differ per role. |
| 2 | **Clinic setup** | Settings, weekly opening hours, closures, rooms & beds, session types, staff weekly schedules & leave (§2, §3). | Close Friday → can't book Friday (later); add room/bed; add leave. |
| 3 | **Patients** | Patient fields, phone normalize + unique index, similar-name warning, profile page shell, consent, documents storage (§4, §9.5). | Duplicate phone blocked in all formats; receptionist can't see diagnosis or X-ray. |
| 4 | **Scheduling** | Booking with all 8 checks, exclusion constraints, calendar day/week, drag-drop, waitlist, status table, recurring series (§5). | Every row in §5.2 and §5.5; two browsers booking same slot at once → only one succeeds. |
| 5 | **Front desk** | Today screen, action panel, check-in, cancel/no-show reasons, WhatsApp templates & tomorrow's reminders, notifications (§6, §14). | Full patient day: book → remind → check in → … |
| 6 | **Packages** | Packages, available-sessions logic, expiry/forfeit, extension, write-off (§7). | Book more sessions than remain → blocked; date after expiry → blocked. |
| 7 | **Billing** | Charges, payments, receipt counter, print receipt, void, refund, price change, cash closing (§8). | Overpay blocked; receipt numbers sequential; void reduces totals; cash closing difference correct. |
| 8 | **Clinical** | Completion form, SOAP, pain 0–10, note versions & 24h lock, addendum, diagnosis history, nutrition/InBody + chart (§9). | Package session deducted only on completion; note locked after 24h. |
| 9 | **Back office** | Expenses, commission & payouts, reports, CSV exports, audit viewer (§10–§13). | Commission can't be paid twice; reports match receipts. |
| 10 | **Hardening** | Full Playwright run of the checklist, security review, performance with 5,000 fake patients / 50,000 appointments. | Whole Excel checklist on staging. |

**After each phase:** run app → do your hand tests → if OK: `git commit` (Antigravity can do it: "commit with message 'phase 3 patients done'") → push to GitHub.

**Phase prompt example:**
```text
Phase 4 — Scheduling. Implement docs/FEATURES-v2.md section 5 completely
(5.1 to 5.5), including PostgreSQL exclusion constraints via a raw SQL
migration (btree_gist). Start by showing me the plan.
```

---

## Part 5 — Publishing on your Contabo VPS

Do this first for **staging** (`test.yourdomain.com`), later the same for production (`app.yourdomain.com`).

### 5.1 What you need
- Contabo VPS with **Ubuntu 24.04** (4 vCPU / 8 GB RAM is more than enough for one clinic).
- A **domain name** (e.g. `masaarclinic.com`) — point two DNS "A records" (`app` and `test`) to the VPS IP.
- Backup storage account (Backblaze B2 or Google Drive).

### 5.2 Ask Antigravity to prepare deployment files (once, after Phase 1)
```text
Prepare production deployment for a single Ubuntu 24.04 VPS:
- Dockerfile for the Next.js app (standalone output).
- docker-compose.yml with services: app, postgres (volume, NOT exposed to
  the internet), caddy (automatic HTTPS for the domain in .env).
- Two environments on the same VPS: staging and production, separate
  databases, separate upload folders, separate .env files.
- scripts/backup.sh: daily pg_dump + uploads archive, upload with rclone,
  keep 30 daily + 12 monthly; scripts/restore.sh.
- docs/DEPLOY.md: exact step-by-step commands for a beginner, including
  firewall (ufw: allow 22, 80, 443 only), creating a non-root user,
  SSH keys, installing Docker, first deploy, updating, and restoring.
```

### 5.3 Then on the server (follow DEPLOY.md)
1. Secure the server: new user, SSH key login, disable root password login, firewall.
2. Install Docker.
3. Clone your GitHub repo, create `.env`, run `docker compose up -d`.
4. Open `https://test.yourdomain.com` → log in as Owner.
5. Turn on the daily backup (cron) → **test a restore** into staging. A backup you never restored is not a backup.
6. Add a free uptime monitor (e.g. UptimeRobot) to alert you if the site goes down.

### 5.4 Updating later
Change on PC → tests pass → push to GitHub → on server: deploy to **staging** → check → deploy to **production**. Backup runs automatically before each production update (put it in the update script).

> If any server step feels risky, hire a freelancer for 2–3 hours just for 5.3 steps 1–5 with DEPLOY.md in hand. Patient data makes this worth it.

---

## Part 6 — Giving it to your client

### 6.1 Recommended model: you host it, client pays monthly
- You keep the server, backups, updates, security → client just opens a website.
- Monthly fee covers hosting, backups, support, small fixes. New features quoted separately.

### 6.2 Before go-live
1. Production created, **no demo data**.
2. Owner account for the clinic owner (they change password on first login); they create staff accounts (or you do with them).
3. Fill settings: hours, closures, rooms/beds, session types/prices, staff schedules, WhatsApp templates.
4. **Import existing patients** (if they have an Excel list) — ask Antigravity for a one-time import script with duplicate-phone check.
5. **Training:** 1 session for reception, 1 for clinicians, 1 for owner/manager (30–45 min each). Short user guide (Antigravity can generate one from the spec in Arabic).
6. **Pilot 2 weeks** → fix issues on staging → update production.

### 6.3 Put in writing (simple contract)
- What's included (spec v1) and what isn't (§16 Later).
- Monthly fee, support hours, response time.
- **Data belongs to the clinic**; you provide a full export if they leave.
- You process patient health data on their behalf → confidentiality and data-protection clause. Egypt's Personal Data Protection Law (151/2020) treats health data as sensitive; have a lawyer review the clause and any licensing obligations.
- Backup frequency and restore time.

---

## Part 7 — Your timeline (realistic for one person with Antigravity)

| Weeks | Work |
|---|---|
| 1 | Install tools, Phase 1, deployment files, staging online |
| 2–3 | Phases 2–4 (setup, patients, scheduling — the hardest part) |
| 4 | Phases 5–6 |
| 5 | Phases 7–8 |
| 6 | Phases 9–10, full checklist on staging |
| 7–8 | Production, training, pilot |

Deploy staging in week 1 on purpose: problems with the server are found early, not at the end.
