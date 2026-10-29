# Module: availability

Availability windows, blackouts, slots, and availability polls (Spec §4.7).

**Status:** Implemented in Step 05.

## Endpoints
| Method | Path | Auth | Notes |
|---|---|---|---|
| GET  | `/api/v1/resources/:id/availability?from=&to=` | Any | Open/busy/blackout blocks (no personal data in busy blocks) |
| GET  | `/api/v1/resources/:id/slots?date=&durationMin=` | Authenticated | Bookable discrete slot suggestions |
| POST | `/api/v1/resources/:id/blackouts` | Manager/Owner | Add blackout; 409 conflict unless confirmCancelAffected: true |
| DELETE | `/api/v1/resources/:id/blackouts/:blackoutId` | Manager/Owner | Soft-delete blackout |
| GET  | `/api/v1/resources/:id/availability-polls` | Authenticated | List open availability polls |
| POST | `/api/v1/resources/:id/availability-polls` | Authenticated | Create an availability poll |
| POST | `/api/v1/availability-polls/:pollId/vote` | Authenticated | Increment vote on a poll |

## Implemented Files
- `availability.router.js`: Route definitions for availability, slots, blackouts, and polls.
- `availability.controller.js`: Request handling and response envelopes.
- `availability.service.js`: Interval calculation, slot slicing, collision gating, and polling.
- `availability.repository.js`: Knex database queries on bookings, blackouts, and polls.
- `availability.schema.js`: Zod validation schemas for all inputs.
