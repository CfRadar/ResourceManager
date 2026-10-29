# Module: bookings

Booking management, concurrency control, and calendar feeds (Spec §4.11).

**Implemented in:** Step 07 — Bookings, Concurrency & Check-in

## Key Capabilities & Constraints
- **Double-booking Prevention:** PostgreSQL GiST exclusion constraint (`no_overlapping_bookings`) using `tstzrange(start_at, end_at)` catching PostgreSQL error `23P01` and mapping to `409 BOOKING_CONFLICT`.
- **10-Client Concurrency Verification:** Tested in `tests/concurrency/booking.test.js`, verifying 1 success and 9 conflicts.
- **Calendar Feed:** Standard facility booking feed within `[from, to]` range for staff members.
- **Rescheduling & Extensions:** Prevents overlapping collisions and preserves immutable audit history via `appendAuditEvent`.
- **FIFO Waitlist Promotion:** Automatically queries pending waitlist entries when a booking is cancelled and notifies candidates (`WAITLIST_SLOT_AVAILABLE`).
- **No-Show Strikes:** Gated by grace period window (`startAt + graceMinutes`); records strike on offender.
- **RFC 5545 iCalendar Export:** Generates standard `.ics` stream for import into Google Calendar / Outlook.

## Implemented Endpoints
| Method | Path | Auth | Notes |
|---|---|---|---|
| GET  | `/api/v1/bookings/mine` | Requester | Upcoming and past bookings |
| GET  | `/api/v1/bookings/:id` | Requester/Staff | Detail with digital QR check-in payload |
| GET  | `/api/v1/facilities/:id/bookings` | Manager/Operator/Admin | Facility calendar feed within `[from, to]` |
| POST | `/api/v1/bookings/:id/reschedule` | Requester/Admin | Reschedule slot with conflict check |
| POST | `/api/v1/bookings/:id/extend` | Requester/Admin | Extend duration with adjacent slot conflict check |
| POST | `/api/v1/bookings/:id/cancel` | Requester/Manager | Cancel booking; triggers FIFO waitlist notification |
| POST | `/api/v1/bookings/:id/mark-no-show` | Manager/Operator | Mark no-show after grace window; records strike |
| GET  | `/api/v1/bookings/:id/calendar.ics` | Requester/Staff | RFC 5545 `.ics` export stream |

## Source Files
- `bookings.router.js`: Express route definitions and validation middleware mounting
- `bookings.controller.js`: Request/response envelope handling
- `bookings.service.js`: Domain logic, conflict checks, iCal generation, and waitlist integration
- `bookings.repository.js`: Knex database queries and join projections
- `bookings.schema.js`: Zod input schemas for query, reschedule, extend, cancel, and no-show
