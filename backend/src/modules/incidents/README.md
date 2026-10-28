# Module: incidents

Incident reporting, review, rulings, and appeals (Spec §4.16).

**Implemented in:** Step 09 — Incidents, Tokens, Payments & Exports

## State machine
`REPORTED → UNDER_REVIEW → (INFO_REQUESTED ↔ UNDER_REVIEW) → RESOLVED | DISMISSED`
`RESOLVED/DISMISSED → APPEALED → UNDER_REVIEW (second reviewer) → RESOLVED | DISMISSED`
Reviewer cannot be a party to the incident.

## Planned endpoints
| Method | Path | Auth | Notes |
|---|---|---|---|
| POST | `/api/v1/incidents` | Requester/Operator/Manager | Report incident |
| GET  | `/api/v1/incidents/mine` | Authed | Incidents the user is party to |
| GET  | `/api/v1/facilities/:id/incidents` | Manager/Owner | Queue |
| GET  | `/api/v1/incidents/:id` | Parties/Manager/Owner/Admin | Detail; internal notes hidden from requester |
| POST | `/api/v1/incidents/:id/notes` | Manager (internal) / Parties (shared) | Append-only |
| POST | `/api/v1/incidents/:id/request-info` | Manager | Request more evidence |
| POST | `/api/v1/incidents/:id/respond` | Party | Counter-statement + evidence |
| POST | `/api/v1/incidents/:id/resolve` | Manager/Owner | Outcome + optional remedy recommendation |
| POST | `/api/v1/incidents/:id/appeal` | Party | Escalate |
| POST | `/api/v1/incidents/:id/draft-summary` | Manager | Call AI draft (human edits required) |

## Files (to be created in Step 09)
- `incidents.router.js`
- `incidents.controller.js`
- `incidents.service.js`
- `incidents.schema.js`
- `incidents.stateMachine.js`
