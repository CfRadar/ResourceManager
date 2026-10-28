# Module: trainings

Training requirements, records, and verification (Spec §4.15).

**Implemented in:** Step 05 — Availability, Slots & Eligibility

## Planned endpoints
| Method | Path | Auth | Notes |
|---|---|---|---|
| GET  | `/api/v1/trainings` | Authed | List by resource/institution |
| POST | `/api/v1/trainings` | Owner/Manager | Define training requirement |
| POST | `/api/v1/trainings/:id/records` | Manager/Operator | Record completion |
| POST | `/api/v1/trainings/:id/self-declare` | Requester | Upload certificate; PENDING_VERIFICATION |
| POST | `/api/v1/training-records/:id/verify` | Manager/Operator | Verify or reject |

## Files (to be created in Step 05)
- `trainings.router.js`
- `trainings.controller.js`
- `trainings.service.js`
- `trainings.schema.js`
