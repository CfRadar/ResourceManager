# Module: accessRequests

Access request lifecycle — independent/supervised/collaboration use (Spec §4.9, §4.10).

**Implemented in:** Step 06 — Access Requests & State Machine

## State machine
`DRAFT → SUBMITTED → UNDER_REVIEW → APPROVED → SCHEDULED → CHECKED_IN → IN_USE → RETURNED → CLOSED`
See Spec §3.1 for full transition table. All transitions go through `services/transition.js`.

## Planned endpoints
| Method | Path | Auth | Notes |
|---|---|---|---|
| POST | `/api/v1/access-requests` | Requester | Create DRAFT or SUBMITTED |
| GET  | `/api/v1/access-requests/mine` | Requester | Own requests |
| GET  | `/api/v1/access-requests/:id` | Requester/Manager/Owner | Detail |
| PATCH | `/api/v1/access-requests/:id` | Requester (DRAFT/MORE_INFO only) | Edit |
| POST | `/api/v1/access-requests/:id/submit` | Requester | DRAFT→SUBMITTED |
| POST | `/api/v1/access-requests/:id/cancel` | Requester | Cancel with reason |
| GET  | `/api/v1/facilities/:id/access-requests` | Manager/Owner | Review queue |
| POST | `/api/v1/access-requests/:id/start-review` | Manager/Owner | Lock reviewer; no-self-approval |
| POST | `/api/v1/access-requests/:id/request-info` | Manager/Owner | MORE_INFO_REQUIRED |
| POST | `/api/v1/access-requests/:id/respond` | Requester | Answer / upload |
| POST | `/api/v1/access-requests/:id/decision` | Manager/Owner | APPROVE/REJECT/WAITLIST |
| POST | `/api/v1/access-requests/:id/appeal` | Requester | One appeal per decision |

## Files (to be created in Step 06)
- `accessRequests.router.js`
- `accessRequests.controller.js`
- `accessRequests.service.js`
- `accessRequests.schema.js`
- `accessRequests.stateMachine.js`
