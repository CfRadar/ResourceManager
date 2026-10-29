# Module: serviceRequests

Staff-operated service request lifecycle (Spec §4.13, Step 08).

**Implemented in:** Step 08 — Service Requests & Referrals

## State machine
`DRAFT → SUBMITTED → SCOPE_REVIEW → QUOTE_SENT → QUOTE_ACCEPTED → AWAITING_MATERIALS → MATERIALS_RECEIVED → SERVICE_IN_PROGRESS → OUTPUT_DELIVERED → COMPLETED → CLOSED`
See Spec §3.2 for full transition table.

## Implemented Endpoints
| Method | Path | Auth | Notes |
|---|---|---|---|
| POST | `/api/v1/service-requests` | Requester | Create (draft or submitted) |
| GET  | `/api/v1/service-requests/mine` | Requester | User's own service requests |
| GET  | `/api/v1/service-requests/:id` | Requester/Manager/Operator/Owner | Detail view + active quote |
| GET  | `/api/v1/facilities/:id/service-requests` | Manager/Operator | Queue for facility |
| POST | `/api/v1/service-requests/:id/scope-review` | Manager/Operator | Feasibility assessment (`assertNoSelfApproval`) |
| POST | `/api/v1/service-requests/:id/quote` | Manager | Itemized quote (`demo: true`) |
| POST | `/api/v1/service-requests/:id/quote/respond` | Requester | ACCEPT/DECLINE |
| POST | `/api/v1/service-requests/:id/materials-received` | Operator/Manager | Sample intake recording |
| POST | `/api/v1/service-requests/:id/progress` | Operator | Milestone update (STARTED, IN_ANALYSIS) |
| POST | `/api/v1/service-requests/:id/deliver-output` | Operator | Deliver outputs & summary |
| POST | `/api/v1/service-requests/:id/confirm-completion` | Requester | Sign off or flag dispute |
| POST | `/api/v1/service-requests/:id/decision` | Manager | Reject with reason |
| POST | `/api/v1/service-requests/:id/cancel` | Requester/Admin | Cancel request |

## Files
- `serviceRequests.router.js`
- `serviceRequests.controller.js`
- `serviceRequests.service.js`
- `serviceRequests.repository.js`
- `serviceRequests.schema.js`
