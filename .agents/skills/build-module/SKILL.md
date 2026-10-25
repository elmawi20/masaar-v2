---
name: build-module
description: Use when the user asks to build a Stage 3 module (3.1 to 3.9) of the Masaar clinic system, e.g. "build module 3.3".
---

# Build one module (Stage 3)

Follow these steps in order. Stop and wait for the user where marked ⏸.

1. Find the module in docs/ROADMAP.md (Stage 3 table) and its spec sections and rule IDs.
2. Create branch `module-3.x`.
3. Plan: files to create/change, database changes, rule IDs covered, tests to write. ⏸ wait for approval.
4. Write the tests first for every rule ID of this module (from docs/design/test-plan.md). Run them; they should fail. Show the summary.
5. Implement until all tests pass. Use defineAction() for every server action.
6. Run: typecheck, lint, all tests (unit, integration, e2e), rule coverage, build. Paste the summary. Never weaken or skip tests.
7. Generate the Playwright screenshots for the new screens (ar/en, light/dark).
8. Report in simple language: what was built, what the user should look at (max 5 items), anything not done. ⏸
9. Commit and push only when the user says so. Then the user runs the strict-review skill in a NEW conversation.
