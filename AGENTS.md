# Masaar Clinic System — Project Rules (always on)

## Source of truth
- docs/FEATURES-v2.2.md (or the newest FEATURES-v2.x.md) is the spec. If anything conflicts, the spec wins.
- docs/ROADMAP.md and docs/STAGE-1-DESIGN-TASKS.md define the order of work.
- docs/design/ holds approved design files. Read them before any work.

## Current stage
CURRENT_STAGE: 3 (Build)   <!-- update to 2, 3, 4 as you progress -->

## Always
- Do ONLY the task the user names. Never start the next task by yourself.
- Start every task by producing an implementation plan and wait for approval.
- If the spec is unclear or contradictory: do not guess. Add it to docs/design/open-questions.md and tell the user.
- End every task with: files created/changed + a "Done when" checklist marked ✅/❌.
- Never commit, push, delete files, or run database migrations unless the user explicitly asks.
- Explain things in simple, non-technical language; the user is not a developer.

## Stage 1 (Design)
- No app code, pages, components or migrations. Only the files a design task names
  (docs/design/*, prisma/schema.prisma, src/domain/* data files).

## Stage 2+ (Build)
- Stack: Next.js (App Router, TypeScript strict), Server Actions, PostgreSQL, Prisma, Auth.js + bcrypt,
  TOTP OTP, Tailwind, Zod, next-intl (Arabic RTL default + English), Vitest, Playwright.
- Every server action uses defineAction(): auth -> active user -> permission -> Zod validation -> transaction -> audit log.
- Money = integer piasters. Timestamps = UTC, shown in Africa/Cairo. Never store calculated values.
- Never hard-delete business records (use void / cancel / deactivate).
- Write tests for every rule ID touched; run typecheck, lint, all tests and rule coverage; never report "done" with anything failing.
- Never delete, skip or weaken a test to make it pass.

## Deployment policy
- Until I explicitly say "start launch stage", everything runs locally only (http://localhost:3000).
- Runtime: Node.js 24 LTS. PostgreSQL 18.
- Local development uses PostgreSQL 18 installed natively on Windows (no Docker on the PC).
  Databases: masaar_dev (manual use) and masaar_test (automatic tests only).
- The postgres password lives only in .env (never in code, docs, commits or chat).
- Do not create, configure or connect to any server, VPS, domain or hosting.
- GitHub is used only as a private code backup and for automatic checks (no deployment workflows).
- Use only fake data (seed script) in development. Never real patient data.

## Command safety rules (strict — always apply)

### Allowed (may run when needed)
- npm install / npm ci / npx create-next-app / npx playwright install
- npx prisma generate / npx prisma migrate dev / npx prisma validate / npx prisma format
- npm run test / lint / typecheck / build / dev / db:seed
- git status / diff / log / add / commit / tag / push (normal push only)

### Forbidden (never run, never suggest as a fix)
- rm -rf, Remove-Item -Recurse, rmdir /s, del /s, or any mass delete
- git reset --hard, git push --force, git push -f, git clean -fd, rewriting history
- prisma migrate reset or prisma db push --force-reset on masaar_dev
- DROP DATABASE, DROP TABLE, TRUNCATE on masaar_dev
- Any command touching files or folders outside this project folder
- Reading, printing, copying or committing .env or any password/secret

### Exception
- prisma migrate reset / dropping data is allowed ONLY on masaar_test (the automatic test database).

### If a forbidden action seems necessary
STOP. Do not run it and do not look for a workaround. Explain in simple words why it seems
needed and what the safe alternatives are, then wait for my explicit decision.

### Deleting single files
Deleting or renaming a single file inside the project is allowed only when it is part of the
approved plan and listed in it.
