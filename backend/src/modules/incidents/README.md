# Module: incidents

Incident reporting, review, rulings, and appeals (Spec §4.16, Step 09).

**Implemented in:** Step 09 — Incidents, Tokens, Payments & Exports

## State machine
`REPORTED → UNDER_REVIEW → (INFO_REQUESTED ↔ UNDER_REVIEW) → RESOLVED | DISMISSED`
`RESOLVED/DISMISSED → APPEALED → UNDER_REVIEW (second reviewer) → RESOLVED | DISMISSED`
Reviewer cannot be a party to the incident (`assertNoSelfApproval`).

## Implemented Endpoints
| Method | Path | Auth | Notes |
|---|---|---|---|
| POST | `/api/v1/incidents` | Requester/Operator/Manager | File incident |
| GET  | `/api/v1/incidents/mine` | Authed | Incidents user is party to |
| GET  | `/api/v1/facilities/:id/incidents` | Manager/Owner | Facility incident queue |
| GET  | `/api/v1/incidents/:id` | Parties/Manager/Owner/Admin | Detail (internal notes sanitized) |
| POST | `/api/v1/incidents/:id/notes` | Manager (internal) / Parties (shared) | Append-only notes |
| POST | `/api/v1/incidents/:id/request-info` | Manager | Request evidence/statement |
| POST | `/api/v1/incidents/:id/respond` | Party | Right-of-reply evidence statement |
| POST | `/api/v1/incidents/:id/resolve` | Manager/Owner | Impartial ruling + remedy |
| POST | `/api/v1/incidents/:id/appeal` | Party | Escalate (single appeal limit) |
| POST | `/api/v1/incidents/:id/draft-summary` | Manager | AI draft summary |

## Files
- `incidents.router.js`
- `incidents.controller.js`
- `incidents.service.js`
- `incidents.repository.js`
- `incidents.schema.js`
