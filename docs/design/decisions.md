# Masaar Clinic System — Architectural & Product Decision Log

This log records all formal decisions, clarifications, and architecture agreements made throughout the design and build phases.

---

## Decision Log

| ID | Date | Decision | Reason | Spec Section / Rule |
|:---:|:---:|---|---|:---:|
| **DEC-001** | 2026-10-25 | Single source of truth is established as `docs/FEATURES-v2.1.md`. Older documentation is moved to `OLD-FEATURES.md` for historical text reference only. | Prevents contradictory requirements and ensures unified system behavior. | Spec §0 |
| **DEC-002** | 2026-10-25 | Currency values stored strictly as integer piasters (e.g. 450.00 EGP = 45000 piasters). | Eliminates floating-point rounding errors in financial transactions and balance tracking. | Spec §0.4 |
| **DEC-003** | 2026-10-25 | Zero hard-deletion of business data (patients, appointments, receipts, expenses, notes, staff). Records are deactivated, voided, or cancelled. | Ensures full legal, clinical, and financial auditability. | Spec §0.3 |
| **DEC-004** | 2026-10-25 | Timestamps stored in UTC; displayed in `Africa/Cairo` time. Local appointment dates use clinic calendar days. | Guarantees timezone consistency across servers while showing local Egyptian clinic time. | Spec §0.5 |
| **DEC-005** | 2026-10-25 | Calculated values (balances, remaining sessions, package status) are never stored in the database. | Prevents data desynchronization bugs and race conditions. | Spec §0.6 |
| **DEC-006** | 2026-10-25 | Exclusion constraints (`btree_gist`) in PostgreSQL enforce non-overlapping bookings for clinicians and beds directly at the database engine level. | Prevents double bookings even during simultaneous concurrent front-desk actions. | Spec §5.2 |
| **DEC-007** | 2026-10-25 | Two-step verification (TOTP Authenticator app) mandatory for all staff logins; no SMS OTP. | Provides zero-cost, offline-capable, high-security authentication without third-party SMS API fees. | Spec §15.2 |
