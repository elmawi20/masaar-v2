# Masaar Clinic System — Stage 1 Design Documentation

This directory contains all approved Stage 1 design specifications, matrices, diagrams, and domain data models for the Masaar Clinic System.

- **Specification Reference:** [FEATURES-v2.2.md](file:///F:/Claude%20CRM/docs/FEATURES-v2.2.md)
- **Current Stage:** Stage 1 (Design)
- **Status:** In Progress

---

## Stage 1 Design Deliverables & Progress Tracker

| Task | Output File / Deliverable | Description | Status | Completed Date |
|:---:|---|---|:---:|:---:|
| **1.01** | [`README.md`](file:///F:/Claude%20CRM/docs/design/README.md)<br>[`decisions.md`](file:///F:/Claude%20CRM/docs/design/decisions.md)<br>[`open-questions.md`](file:///F:/Claude%20CRM/docs/design/open-questions.md) | Project docs setup & ambiguity scan | **Done** | 2026-10-25 |
| **1.02** | [`FEATURES-v2.2.md`](file:///F:/Claude%20CRM/docs/FEATURES-v2.2.md)<br>[`decisions.md`](file:///F:/Claude%20CRM/docs/design/decisions.md) | Apply answers to spec & bump version | **Done** | 2026-10-25 |
| **1.03** | [`rules-index.md`](file:///F:/Claude%20CRM/docs/design/rules-index.md)<br>[`FEATURES-v2.2.md`](file:///F:/Claude%20CRM/docs/FEATURES-v2.2.md) | Unique rule IDs (R-section-n) index | **Done** | 2026-10-25 |
| **1.04** | [`glossary.md`](file:///F:/Claude%20CRM/docs/design/glossary.md) | AR/EN business terms, DB & code naming | **Done** | 2026-10-25 |
| **1.05** | [`permissions.md`](file:///F:/Claude%20CRM/docs/design/permissions.md)<br>[`src/domain/permissions.ts`](file:///F:/Claude%20CRM/src/domain/permissions.ts) | Complete permission matrix & data tables | **Done** | 2026-10-25 |
| **1.06** | [`state-machines.md`](file:///F:/Claude%20CRM/docs/design/state-machines.md)<br>[`src/domain/status/*.ts`](file:///F:/Claude%20CRM/src/domain/status/) | State machine definitions & forbidden transitions | **Done** | 2026-10-25 |
| **1.07** | [`calculations.md`](file:///F:/Claude%20CRM/docs/design/calculations.md) | All formulas, piasters rounding, edge cases | **Done** | 2026-10-25 |
| **1.08** | [`data-model.md`](file:///F:/Claude%20CRM/docs/design/data-model.md) (Slice A)<br>[`prisma/schema.prisma`](file:///F:/Claude%20CRM/prisma/schema.prisma) | DB Slice A: Clinic, staff & auth | **Done** | 2026-10-25 |
| **1.09** | [`data-model.md`](file:///F:/Claude%20CRM/docs/design/data-model.md) (Slice B)<br>[`prisma/schema.prisma`](file:///F:/Claude%20CRM/prisma/schema.prisma) | DB Slice B: Patients & documents | **Done** | 2026-10-25 |
| **1.10** | [`data-model.md`](file:///F:/Claude%20CRM/docs/design/data-model.md) (Slice C)<br>[`prisma/schema.prisma`](file:///F:/Claude%20CRM/prisma/schema.prisma) | DB Slice C: Scheduling & exclusion constraints | **Done** | 2026-10-25 |
| **1.11** | [`data-model.md`](file:///F:/Claude%20CRM/docs/design/data-model.md) (Slice D)<br>[`prisma/schema.prisma`](file:///F:/Claude%20CRM/prisma/schema.prisma) | DB Slice D: Packages & money | **Done** | 2026-10-25 |
| **1.12** | [`data-model.md`](file:///F:/Claude%20CRM/docs/design/data-model.md) (Slice E)<br>[`prisma/schema.prisma`](file:///F:/Claude%20CRM/prisma/schema.prisma) | DB Slice E: Clinical, nutrition & back office | **Done** | 2026-10-25 |
| **1.13** | [`constraints.md`](file:///F:/Claude%20CRM/docs/design/constraints.md)<br>[`prisma/schema.prisma`](file:///F:/Claude%20CRM/prisma/schema.prisma) | DB consolidation, complete ERD & constraints | **Done** | 2026-10-25 |
| **1.14** | [`screens.md`](file:///F:/Claude%20CRM/docs/design/screens.md) | Screen catalog & navigation map by role | **Done** | 2026-10-25 |
| **1.15** | [`wireframes/`](file:///F:/Claude%20CRM/docs/design/wireframes/index.html) (Auth & Front Desk) | Low-fidelity HTML wireframes: Auth & Front desk | **Done** | 2026-10-25 |
| **1.16** | [`wireframes/`](file:///F:/Claude%20CRM/docs/design/wireframes/index.html#section-116) (Patients & Money) | Low-fidelity HTML wireframes: Patients & Billing | **Done** | 2026-10-25 |
| **1.17** | [`wireframes/`](file:///F:/Claude%20CRM/docs/design/wireframes/index.html#section-117) (Clinical & Admin) | Low-fidelity HTML wireframes: Clinical & Admin | **Done** | 2026-10-25 |
| **1.17b** | [`style-guide.md`](file:///F:/Claude%20CRM/docs/design/style-guide.md)<br>[`style/`](file:///F:/Claude%20CRM/docs/design/style/index.html) | Visual style guide & colored high-fidelity mockups | **Done** | 2026-10-25 |
| **1.18** | [`actions.md`](file:///F:/Claude%20CRM/docs/design/actions.md) | Server actions catalog with validation & audit | **Done** | 2026-10-25 |
| **1.19** | `messages.md` | AR/EN translation keys & WhatsApp templates | Pending | — |
| **1.20** | `test-plan.md` | 100% Rule ID traceability & test suites | Pending | — |
| **1.21** | Design freeze (Gate 1) | Strict reviewer verification & Git tag `design-v1` | Pending | — |

---

## Working Guidelines for Stage 1

1. **No Application Code:** Only design documentation in `docs/design/`, Prisma schema definitions in `prisma/schema.prisma`, and domain data files in `src/domain/`.
2. **Zero Hard Deletes:** Status flags (`voided`, `cancelled`, `deactivated`) are used across all entities.
3. **Integer Piasters:** All currency amounts are stored as integer piasters (1 EGP = 100 piasters).
4. **Calculated Values:** Values derived from other fields (balances, remaining sessions, totals) are never stored in the database.
5. **Traceability:** Every business rule will have a unique ID linked to tests and implementation actions.
