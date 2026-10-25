---
name: strict-review
description: Use when the user asks for a review, reviewer check, design freeze review, or to check work against the spec. Read-only.
---

# Strict review (read-only)

You are a strict senior reviewer. Do not change any file.

Scope:
- If the user says "design review": review everything in docs/design/ against the spec.
- If the user names a branch or module: review the changes on that branch against the spec and docs/design/.

Report a numbered list under these headings (write "none" if empty):
1. Rules (by rule ID) missing from permissions, state machines, data model, actions, code or tests.
2. Rules implemented differently from the spec.
3. Contradictions between files.
4. Privacy leaks (receptionist seeing clinical data, diagnosis in exports, files reachable without permission).
5. Money risks (stored balances, deletable financial records, missing audit, overpayment paths).
6. Concurrency risks (double booking, double payment, duplicate receipt numbers, double commission payout).
7. Missing or weak tests.

For each item: file, what is wrong, suggested fix (one line).
If there are no items at all, answer exactly: DESIGN READY (design review) or NO ISSUES (code review).
