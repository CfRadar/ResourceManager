# Module: admin

Administrative control panel and background job orchestration (Spec §4.23).

**Status:** Completed in Step 10 — Background Jobs & Audit Chain

## Endpoints
| Method | Path | Auth | Notes |
|---|---|---|---|
| GET  | `/api/v1/admin/jobs` | Admin / Staff | Registry of background cron jobs, schedules, and run telemetry |
| POST | `/api/v1/admin/jobs/:jobName/run` | Admin / Staff | Trigger background job immediately on demand |
| GET  | `/api/v1/admin/users` | Admin | Filterable user listing across institutions |
| POST | `/api/v1/admin/users/:id/suspend` | Admin | Suspend user account with reason (audited: `USER_SUSPENDED`) |
| POST | `/api/v1/admin/seed-demo` | Platform Admin | Load realistic demo entities into database (non-production only) |

## Implementation Files
- `admin.router.js`
- `admin.controller.js`
- `admin.service.js`
- `admin.schema.js`
