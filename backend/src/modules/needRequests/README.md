# Module: needRequests

Missing-resource need requests and candidate discovery (Spec §4.14, Step 08).

**Implemented in:** Step 08 — Service Requests & Referrals

## State machine
`DRAFT → SUBMITTED → UNDER_COORDINATOR_REVIEW → CANDIDATE_IDENTIFIED → CLOSED_MET | CLOSED_UNMET`

## Implemented Endpoints
| Method | Path | Auth | Notes |
|---|---|---|---|
| POST | `/api/v1/need-requests` | Requester | Structured need request |
| GET  | `/api/v1/need-requests/mine` | Requester | Caller's need requests |
| GET  | `/api/v1/need-requests` | Coordinator/Admin | Coordinator network queue |
| GET  | `/api/v1/need-requests/:id` | Requester/Coordinator | Need request detail |
| GET  | `/api/v1/need-requests/:id/candidates` | Coordinator/Admin | Ranked candidate resources (AI / fallback) |
| POST | `/api/v1/need-requests/:id/referrals` | Coordinator/Admin | Create and dispatch referral |
| POST | `/api/v1/need-requests/:id/close` | Coordinator/Admin | Close with outcome (`CLOSED_MET`/`CLOSED_UNMET`) |

## Files
- `needRequests.router.js`
- `needRequests.controller.js`
- `needRequests.service.js`
- `needRequests.repository.js`
- `needRequests.schema.js`
