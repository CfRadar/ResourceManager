# Background Jobs (`src/jobs/`)

Scheduled background tasks run by the Express process (Spec §5.3).

All jobs are registered in `services/scheduler.js` using `node-cron`.

**Status:** Completed in Step 10 — Background Jobs & Audit Chain

---

## Registered Jobs

| Job file | Frequency | Action |
|---|---|---|
| `bookingReminders.js` | Every 5 min (`*/5 * * * *`) | 24h, 1h before start and 30min before end — create in-app notifications |
| `overdueCheck.js` | Every 5 min (`*/5 * * * *`) | Mark `OVERDUE` via `transition()` when `now > endAt + graceMinutes` and booking not returned; notify user |
| `noShowCheck.js` | Every 5 min (`*/5 * * * *`) | Flag bookings with no check-in after grace period; warn user and flag for manager review |
| `docAndTrainingExpiry.js` | Daily at 01:00 UTC (`0 1 * * *`) | Set document/training records to `EXPIRED` when `expiresAt` passes; notify users |
| `waitlistExpiry.js` | Hourly (`0 * * * *`) | Expire stale 24h waitlist offers and promote next FIFO candidate |
| `referralTimeout.js` | Daily at 02:00 UTC (`0 2 * * *`) | Mark referrals `NO_RESPONSE` after `REFERRAL.NO_RESPONSE_DAYS` days without response |
| `auditIntegrityCheck.js` | Daily at 03:00 UTC (`0 3 * * *`) | Run hash-chain verification for all scopes; surface status on admin dashboard |

---

## Operational Control

- All jobs are managed by `services/scheduler.js`.
- Telemetry, run counts, execution durations, and error logs are exposed via `GET /api/v1/admin/jobs`.
- Any registered job can be triggered on demand via `POST /api/v1/admin/jobs/:jobName/run`.
