# Module: dashboards

Role-specific dashboard and analytics aggregations (Spec §4.21).

**Implemented in:** Step 10 — Background Jobs & Audit Chain

## Planned endpoints
| Method | Path | Auth | Notes |
|---|---|---|---|
| GET | `/api/v1/dashboard/requester` | Requester | Next booking, pending requests, fair-use meters, tokens |
| GET | `/api/v1/dashboard/manager` | Manager/Owner | Queue counts, today's check-ins/returns, overdue, incidents, utilisation |
| GET | `/api/v1/dashboard/coordinator` | Coordinator | Open need-requests, referral statuses |
| GET | `/api/v1/dashboard/admin` | Admin | Members, resources, utilisation, incident rate, audit-integrity status |
| GET | `/api/v1/analytics/utilisation` | Manager/Owner | Hours used vs available by day/week |
| GET | `/api/v1/analytics/demand` | Manager/Owner | Waitlist length, declined/unmet demand |

## Files (to be created in Step 10)
- `dashboards.router.js`
- `dashboards.controller.js`
- `dashboards.service.js`
