# Module: serviceRequests

Staff-operated service request lifecycle (Spec §4.13).

**Implemented in:** Step 08 — Service Requests & Referrals

## State machine
`DRAFT → SUBMITTED → SCOPE_REVIEW → QUOTE_SENT → QUOTE_ACCEPTED → AWAITING_MATERIALS → MATERIALS_RECEIVED → SERVICE_IN_PROGRESS → OUTPUT_DELIVERED → COMPLETED → CLOSED`
See Spec §3.2 for full transition table.

## Planned endpoints
| Method | Path | Auth | Notes |
|---|---|---|---|
| POST | `/api/v1/service-requests` | Requester | Create |
| GET  | `/api/v1/service-requests/mine` | Requester | List |
| GET  | `/api/v1/service-requests/:id` | Requester/Manager/Operator/Owner | Detail |
| GET  | `/api/v1/facilities/:id/service-requests` | Manager/Operator | Queue |
| POST | `/api/v1/service-requests/:id/scope-review` | Manager | Feasibility |
| POST | `/api/v1/service-requests/:id/quote` | Manager | Quote with line items |
| POST | `/api/v1/service-requests/:id/quote/respond` | Requester | ACCEPT/DECLINE |
| POST | `/api/v1/service-requests/:id/materials-received` | Operator/Manager | Sample intake |
| POST | `/api/v1/service-requests/:id/progress` | Operator | Progress update |
| POST | `/api/v1/service-requests/:id/deliver-output` | Operator | Upload result |
| POST | `/api/v1/service-requests/:id/confirm-completion` | Requester | Confirm or dispute |
| POST | `/api/v1/service-requests/:id/decision` | Manager | Reject with reason |

## Files (to be created in Step 08)
- `serviceRequests.router.js`
- `serviceRequests.controller.js`
- `serviceRequests.service.js`
- `serviceRequests.schema.js`
- `serviceRequests.stateMachine.js`
