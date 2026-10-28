'use strict';

/**
 * src/services/scheduler.js
 *
 * Background job runner (cron jobs via node-cron or BullMQ).
 *
 * Spec §5.3 scheduled jobs:
 *   - bookingReminders   – every 5 min – 24h, 1h, 30min reminders
 *   - overdueCheck       – every 5 min – mark OVERDUE, notify
 *   - noShowCheck        – every 5 min – flag bookings with no check-in
 *   - docAndTrainingExpiry – daily     – set EXPIRED, notify
 *   - waitlistExpiry     – hourly      – expire stale entries
 *   - referralTimeout    – daily       – mark NO_RESPONSE
 *   - auditIntegrityCheck – daily      – chain verification
 *
 * Implemented in: Step 10 (Background Jobs & Audit Chain).
 *
 * Interface (to be implemented):
 *
 *   startScheduler()  – register all cron jobs; call once on server start.
 *   stopScheduler()   – stop all jobs; call during graceful shutdown.
 */

// Placeholder — full implementation in Step 10.
function startScheduler() {
  // No-op until Step 10.
  if (process.env.NODE_ENV !== 'test') {
    console.log('[scheduler] Scheduler not yet implemented (Step 10).');
  }
}

function stopScheduler() {
  // No-op until Step 10.
}

module.exports = { startScheduler, stopScheduler };
