# Module: checkin

Check-in, in-use, check-out, return confirmation, geofencing, signatures, and condition diffs (Spec §4.12).

**Implemented in:** Step 07 — Bookings, Concurrency & Check-in

## Key Capabilities & Constraints
- **Check-In Window Gating:** Valid only within `[startAt - 15 minutes, startAt + graceMinutes]`. Rejects premature or post-grace requests.
- **Soft Haversine Geofencing:** Great-circle distance evaluated in `src/utils/geo.js` (`evaluateGeofence`). Returns `'WITHIN'`, `'OUTSIDE'`, or `'NOT_PROVIDED'` as a soft advisory signal to staff, never blocking checkout.
- **Cryptographic Virtual Electronic Signatures:** SHA-256 hash of payload, actor ID, and timestamp stored with `"demo": true` and audit notice.
- **Condition Reports (BEFORE & AFTER):** Captured on physical handoff with ratings (1-5), notes, and photo references in `condition_reports`.
- **Automated Condition Diffing:** Server evaluates `rating(BEFORE) - rating(AFTER)`. Rating drop >= 2 levels or missing accessories automatically pre-fills an Incident draft for staff review.
- **Manager Return Confirmation:** Manager reviews return; clean returns transition booking to `CLOSED`, while damaged/missing returns flag an incident draft.

## Implemented Endpoints
| Method | Path | Auth | Notes |
|---|---|---|---|
| POST | `/api/v1/bookings/:id/check-in` | Requester/Staff | Condition report BEFORE; transitions to CHECKED_IN |
| POST | `/api/v1/bookings/:id/start-use` | Requester/Operator | Advances CHECKED_IN → IN_USE |
| POST | `/api/v1/bookings/:id/check-out` | Requester/Staff | Condition report AFTER; transitions to RETURNED; computes diff |
| POST | `/api/v1/bookings/:id/confirm-return` | Manager/Operator | Confirms return (CLOSED) or flags incident draft |
| GET  | `/api/v1/bookings/:id/condition-reports` | Requester/Staff | Side-by-side BEFORE/AFTER report inspection |

## Source Files
- `checkin.router.js`: Express routes for check-in lifecycle
- `checkin.controller.js`: Envelope handlers
- `checkin.service.js`: Gating, geofence check, SHA-256 signatures, condition diffing
- `checkin.repository.js`: Data access for `condition_reports` table
- `checkin.schema.js`: Zod validation schemas for check-in, check-out, signatures, and return confirmation
