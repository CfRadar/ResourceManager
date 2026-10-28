# Module: bookings

Booking management and calendar (Spec §4.11).

**Implemented in:** Step 07 — Bookings, Concurrency & Check-in

## Key constraints
- Overlap prevention: PostgreSQL GIST exclusion constraint + advisory lock fallback.
- Concurrency test: 10 simultaneous requests for same slot → exactly 1 success.
- `bookingEngine.reserveSlot()` is called in a single DB transaction during approval.

## Planned endpoints
| Method | Path | Auth | Notes |
|---|---|---|---|
| GET  | `/api/v1/bookings/mine` | Requester | Upcoming + past |
| GET  | `/api/v1/bookings/:id` | Requester/Manager/Owner | Detail |
| GET  | `/api/v1/facilities/:id/bookings` | Manager/Operator/Owner | Calendar feed |
| POST | `/api/v1/bookings/:id/reschedule` | Requester | New slot request |
| POST | `/api/v1/bookings/:id/extend` | Requester | Extension request |
| POST | `/api/v1/bookings/:id/cancel` | Requester/Manager | Cancel; triggers waitlist |
| POST | `/api/v1/bookings/:id/mark-no-show` | Manager/Operator | After grace window |
| GET  | `/api/v1/bookings/:id/calendar.ics` | Requester | iCal export (P1) |

## Files (to be created in Step 07)
- `bookings.router.js`
- `bookings.controller.js`
- `bookings.service.js`
- `bookings.schema.js`
