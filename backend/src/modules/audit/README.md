# Module: audit

Audit event log and cryptographic SHA-256 hash-chain verification (Spec §4.20).

**Status:** Completed in Step 10 — Background Jobs & Audit Chain

## Key Constraints
- **Append-only:** Never edit or delete audit events in `audit_events`.
- **Hash chain:** `hash = SHA256(prevHash + canonicalJSON(event))`.
- **Clarification notes:** `POST /api/v1/audit/notes` appends an immutable `AUDIT_NOTE_ADDED` event referencing the target event ID; never mutates the original record.
- **Scoping & Redaction:** Requesters only see `visibility: 'PARTIES'` events; internal staff see both `PARTIES` and `INTERNAL` events.

## Endpoints
| Method | Path | Auth | Notes |
|---|---|---|---|
| GET  | `/api/v1/audit/requests/:id` | Requester (filtered) / Manager / Owner | Timeline for one entity |
| GET  | `/api/v1/audit/resources/:id` | Owner / Manager / Platform Admin | Resource and policy change history |
| GET  | `/api/v1/audit/institution/:id` | Admin | Filterable institution audit trail |
| GET  | `/api/v1/audit/verify/:scope/:id` | Manager / Admin | Recomputes SHA-256 hash chain; returns `{ valid: true }` or broken event |
| POST | `/api/v1/audit/notes` | Manager / Owner | Append correction/clarification note |

## Implementation Files
- `audit.router.js`
- `audit.controller.js`
- `audit.service.js`
- `audit.schema.js`
- Delegates to `services/auditChain.js`
