# Masaar Clinic System — Project Rules (always on)

## Source of truth
- docs/FEATURES-v2.2.md (or the newest FEATURES-v2.x.md) is the spec. If anything conflicts, the spec wins.
- docs/ROADMAP.md and docs/STAGE-1-DESIGN-TASKS.md define the order of work.
- docs/design/ holds approved design files. Read them before any work.

## Current stage
CURRENT_STAGE: 1 (Design)   <!-- update to 2, 3, 4 as you progress -->

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


