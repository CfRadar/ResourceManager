# Module: dashboards

Role-specific dashboard aggregations and analytics (Spec §4.21).

**Status:** Completed in Step 10 — Background Jobs & Audit Chain

## Endpoints
| Method | Path | Auth | Notes |
|---|---|---|---|
| GET | `/api/v1/dashboard/requester` | Requester | Next booking, pending requests, tokens, unread alerts |
| GET | `/api/v1/dashboard/manager` | Manager / Owner | Queue counts, today's bookings, overdue equipment |
| GET | `/api/v1/dashboard/coordinator` | Coordinator | Open need-requests, referral statuses |
| GET | `/api/v1/dashboard/admin` | Admin | Members, resources, facilities, audit integrity |
| GET | `/api/v1/analytics/utilisation` | Manager / Owner | Hours used vs available by resource/window |
| GET | `/api/v1/analytics/demand` | Manager / Owner | Waitlist length, unfulfilled demand |

## Implementation Files
- `dashboards.router.js`
- `dashboards.controller.js`
- `dashboards.service.js`
