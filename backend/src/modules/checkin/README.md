# Module: checkin

Check-in, in-use, check-out, and return confirmation (Spec §4.12).

**Implemented in:** Step 07 — Bookings, Concurrency & Check-in

## Planned endpoints
| Method | Path | Auth | Notes |
|---|---|---|---|
| POST | `/api/v1/bookings/:id/check-in` | Booking user / Manager | Condition report BEFORE; CHECKED_IN |
| POST | `/api/v1/bookings/:id/start-use` | Booking user / Operator | CHECKED_IN→IN_USE (P1) |
| POST | `/api/v1/bookings/:id/check-out` | Booking user | Condition report AFTER; RETURNED; diff computed |
| POST | `/api/v1/bookings/:id/confirm-return` | Manager/Operator | Confirm or flag (opens incident draft) |
| GET  | `/api/v1/bookings/:id/condition-reports` | Booking user / Manager / Owner | Before + after side by side |
| POST | `/api/v1/uploads/condition-photo` | Authed | Upload photo; returns fileId |

## Key constraints
- Virtual signature: `{type: "TYPED"|"DRAWN", text|pngDataUrl}`. Stored with userId, timestamp, IP, SHA-256 hash.
- GPS: soft signal only — never an automatic block.
- BEFORE diff AFTER: rating drop + missing accessories computed server-side.

## Files (to be created in Step 07)
- `checkin.router.js`
- `checkin.controller.js`
- `checkin.service.js`
- `checkin.schema.js`
