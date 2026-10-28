# Module: availability

Availability windows, blackouts, slots, and availability polls (Spec §4.7).

**Implemented in:** Step 05 — Availability, Slots & Eligibility

## Planned endpoints
| Method | Path | Auth | Notes |
|---|---|---|---|
| GET  | `/api/v1/resources/:id/availability` | Any | Open/busy/blackout blocks (no personal data in busy blocks) |
| GET  | `/api/v1/resources/:id/slots` | Any authed | Bookable slot suggestions |
| POST | `/api/v1/resources/:id/blackouts` | Manager/Owner | Add blackout; returns affected bookings |
| DELETE | `/api/v1/resources/:id/blackouts/:blackoutId` | Manager/Owner | Remove blackout |
| GET  | `/api/v1/resources/:id/availability-polls` | Any authed | List polls |
| POST | `/api/v1/resources/:id/availability-polls` | Requester | Create poll |
| POST | `/api/v1/availability-polls/:pollId/vote` | Requester | Vote (P1) |

## Files (to be created in Step 05)
- `availability.router.js`
- `availability.controller.js`
- `availability.service.js`
- `availability.schema.js`
