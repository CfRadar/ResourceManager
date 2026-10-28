# Module: needRequests

Missing-resource need requests (Spec §4.14).

**Implemented in:** Step 08 — Service Requests & Referrals

## Planned endpoints
| Method | Path | Auth | Notes |
|---|---|---|---|
| POST | `/api/v1/need-requests` | Requester | Structured need; optionally preceded by AI parse |
| GET  | `/api/v1/need-requests/mine` | Requester | Status + responses |
| GET  | `/api/v1/need-requests` | Coordinator | Queue (scoped) |
| GET  | `/api/v1/need-requests/:id` | Requester/Coordinator | Detail |
| GET  | `/api/v1/need-requests/:id/candidates` | Coordinator | Ranked candidates from AI or deterministic fallback |
| POST | `/api/v1/need-requests/:id/referrals` | Coordinator | Create referral |
| POST | `/api/v1/need-requests/:id/close` | Coordinator | Close with outcome |

## Files (to be created in Step 08)
- `needRequests.router.js`
- `needRequests.controller.js`
- `needRequests.service.js`
- `needRequests.schema.js`
