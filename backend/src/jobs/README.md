# Background Jobs (`src/jobs/`)

Scheduled background tasks run by the Express process (Spec §5.3).

All jobs are registered in `services/scheduler.js` using `node-cron`.
BullMQ + Redis is an optional upgrade if a Redis instance is available.

**Implemented in:** Step 10 — Background Jobs & Audit Chain

---

## Planned jobs

| Job file | Frequency | Action |
|---|---|---|
| `bookingReminders.js` | Every 5 min | 24h, 1h before start and 30min before end — create notifications |
| `overdueCheck.js` | Every 5 min | Mark `OVERDUE` when `now > endAt + graceMinutes` and booking not returned; notify user + manager |
| `noShowCheck.js` | Every 5 min | Flag bookings with no check-in after grace period; manager confirms no-show |
| `docAndTrainingExpiry.js` | Daily | Set document/training records to `EXPIRED` when `expiresAt` passes; notify users |
| `waitlistExpiry.js` | Hourly | Expire stale waitlist entries and pending offers |
| `referralTimeout.js` | Daily | Mark referrals `NO_RESPONSE` after `REFERRAL.NO_RESPONSE_DAYS` days |
| `auditIntegrityCheck.js` | Daily | Run hash-chain verification for all scopes; surface status on admin dashboard |

---

## Rules for all jobs

1. Jobs read and write business data through the same service/repository layer as HTTP handlers — no raw SQL shortcuts.
2. All status transitions go through `services/transition.js`.
3. A job failure is logged and the job is retried on the next run — jobs must be **idempotent**.
4. Jobs never send confidential data (emails, notification payloads) that were not already visible to the recipient.
5. Job run results (started, errors, completed) are written to an admin-visible job status log (Spec §4.23: `GET /admin/jobs`).
