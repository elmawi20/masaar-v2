---
name: design-task
description: Use when the user asks to do a Stage 1 design task (numbered 1.01 to 1.21) for the Masaar clinic system, e.g. "design task 1.05".
---

# Stage 1 design task

1. Open docs/STAGE-1-DESIGN-TASKS.md and find the task number the user gave.
2. Read the spec, docs/ROADMAP.md, and every file already in docs/design/.
3. Produce an implementation plan: which files you will create/change and what each will contain. Wait for approval.
4. Execute ONLY that task's Prompt. For database slices (1.08–1.12) use the "Slice prompt template" in the same file.
5. Do not create app code, pages, components or migrations.
6. Unclear points go to docs/design/open-questions.md (with a suggested answer) — never guess.
7. Update the task's row in docs/design/README.md (status: done, date).
8. Finish with:
   - files created/changed
   - the task's "Done when" checklist marked ✅/❌
   - the task's "You check" item rewritten as 2–4 simple questions for the user
9. Do NOT commit. Wait for the user to say "commit".
