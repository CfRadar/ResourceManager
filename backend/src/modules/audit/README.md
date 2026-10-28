# Module: audit

Audit event log and hash-chain verification (Spec §4.20).

**Implemented in:** Step 10 — Background Jobs & Audit Chain

## Key constraints
- Append-only. Never edit or delete audit events.
- Hash chain: `hash = SHA256(prevHash + canonicalJSON(event without hash))`.
- Corrections are new events that reference the earlier one — never edits.
- Field-level redaction (e.g. removing PII) is itself an audited event.

## Planned endpoints
| Method | Path | Auth | Notes |
|---|---|---|---|
| GET  | `/api/v1/audit/requests/:id` | Requester (filtered) / Manager / Owner | Timeline for one entity |
| GET  | `/api/v1/audit/resources/:id` | Owner/Manager | Listing + policy change history |
| GET  | `/api/v1/audit/institution/:id` | Admin | Filterable institution audit |
| GET  | `/api/v1/audit/verify/:scope/:id` | Manager/Admin | Recompute hash chain; returns valid/broken |
| POST | `/api/v1/audit/notes` | Manager/Owner | Add correction note; never edits earlier event |

## Files (to be created in Step 10)
- `audit.router.js`
- `audit.controller.js`
- (delegates to `services/auditChain.js`)
