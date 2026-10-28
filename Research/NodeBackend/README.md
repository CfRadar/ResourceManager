# Node.js (Express) Backend Implementation Guides

This directory contains modular, step-by-step implementation blueprints for building the entire Node.js / Express API service according to [Research/01_BACKEND_API_SPEC.md](../01_BACKEND_API_SPEC.md).

---

## Guide Index

| Step | File | Core Topics Covered |
|---|---|---|
| **00** | [00_ARCHITECTURE_AND_SETUP.md](./00_ARCHITECTURE_AND_SETUP.md) | Express 5 project layout, modular pattern, response envelope, global error handling, environment configs |
| **01** | [01_DATABASE_MODELS_AND_MIGRATIONS.md](./01_DATABASE_MODELS_AND_MIGRATIONS.md) | Data schemas, PostgreSQL / Knex setup, migrations, relationships, indexes, GIST constraints |
| **02** | [02_AUTH_RBAC_AND_SECURITY.md](./02_AUTH_RBAC_AND_SECURITY.md) | JWT access/refresh rotation, demo OTP verification, role hierarchies, scope verification, no-self-approval rule |
| **03** | [03_INSTITUTIONS_FACILITIES_MEMBERSHIPS.md](./03_INSTITUTIONS_FACILITIES_MEMBERSHIPS.md) | Institutions, member requests & approvals, facility timezones, working hours, geofencing setup |
| **04** | [04_RESOURCES_AND_POLICIES.md](./04_RESOURCES_AND_POLICIES.md) | Resource catalog, category taxonomy, JSON `ResourcePolicy` schema, visibility rules, field redaction |
| **05** | [05_AVAILABILITY_SLOTS_AND_ELIGIBILITY.md](./05_AVAILABILITY_SLOTS_AND_ELIGIBILITY.md) | Working hours calculation, blackout windows, availability polls, deterministic eligibility engine |
| **06** | [06_ACCESS_REQUESTS_AND_STATE_MACHINE.md](./06_ACCESS_REQUESTS_AND_STATE_MACHINE.md) | Central `transition()` service, review queue, info requests, appeals, FIFO waitlist mechanics |
| **07** | [07_BOOKINGS_CONCURRENCY_AND_CHECKIN.md](./07_BOOKINGS_CONCURRENCY_AND_CHECKIN.md) | Atomic reservation, race condition prevention (advisory lock/GIST), check-in/out, condition reports, digital signatures |
| **08** | [08_SERVICE_REQUESTS_AND_REFERRALS.md](./08_SERVICE_REQUESTS_AND_REFERRALS.md) | Staff-operated service lifecycle (scope, quote, sample intake, deliverables), missing-resource referrals |
| **09** | [09_INCIDENTS_TOKENS_PAYMENTS_EXPORTS.md](./09_INCIDENTS_TOKENS_PAYMENTS_EXPORTS.md) | Incident reporting & rulings, token ledger (append-only), simulated billing/invoicing, Excel/PDF document exports |
| **10** | [10_BACKGROUND_JOBS_AND_AUDIT_CHAIN.md](./10_BACKGROUND_JOBS_AND_AUDIT_CHAIN.md) | Background schedulers (reminders, overdue, no-show, expiries), SHA-256 tamper-evident hash chain, healthcheck, seed data |

---

## Core Principles to Maintain

1. **Express is the Sole Writer of Business Data**: The Python AI service suggests; Express validates and persists.
2. **Deterministic State Transitions**: All state changes must pass through `transition(entity, toState, actor, reason)`. Direct SQL status updates are prohibited.
3. **Audit Hash Chain**: Every critical event produces an immutable, SHA-256 chained audit record.
4. **Field-Level Redaction**: Private notes, access codes, and contact details must never leak in public listing endpoints.
5. **Demonstration Data Transparency**: All simulated financial/legal transactions are marked with `"demo": true`.
