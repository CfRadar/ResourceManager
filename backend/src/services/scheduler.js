'use strict';

/**
 * src/services/scheduler.js
 *
 * Background job manager using node-cron.
 * Spec §5.3 & §4.23: Scheduled jobs and execution telemetry.
 */

const cron = require('node-cron');
const { runBookingReminders }     = require('../jobs/bookingReminders');
const { runOverdueCheck }         = require('../jobs/overdueCheck');
const { runNoShowCheck }          = require('../jobs/noShowCheck');
const { runDocAndTrainingExpiry } = require('../jobs/docAndTrainingExpiry');
const { runWaitlistExpiry }       = require('../jobs/waitlistExpiry');
const { runReferralTimeout }      = require('../jobs/referralTimeout');
const { runAuditIntegrityCheck, getLatestIntegrityStatus } = require('../jobs/auditIntegrityCheck');
const { Errors }                  = require('../utils/AppError');

const REGISTERED_JOBS = {
  bookingReminders: {
    schedule: '*/5 * * * *',
    handler:  runBookingReminders,
    description: 'Send reminders 24h/1h before start and 30m before end',
  },
  overdueCheck: {
    schedule: '*/5 * * * *',
    handler:  runOverdueCheck,
    description: 'Flag active bookings as OVERDUE past grace period',
  },
  noShowCheck: {
    schedule: '*/5 * * * *',
    handler:  runNoShowCheck,
    description: 'Flag scheduled bookings with no check-in past grace period',
  },
  docAndTrainingExpiry: {
    schedule: '0 1 * * *',
    handler:  runDocAndTrainingExpiry,
    description: 'Transition expired documents and training records to EXPIRED',
  },
  waitlistExpiry: {
    schedule: '0 * * * *',
    handler:  runWaitlistExpiry,
    description: 'Expire 24h waitlist offers and promote next FIFO candidate',
  },
  referralTimeout: {
    schedule: '0 2 * * *',
    handler:  runReferralTimeout,
    description: 'Mark referrals NO_RESPONSE after 7 days without response',
  },
  auditIntegrityCheck: {
    schedule: '0 3 * * *',
    handler:  runAuditIntegrityCheck,
    description: 'Validate cryptographic SHA-256 audit hash chain integrity',
  },
};

const jobState = {};

// Initialize state map
for (const [name, def] of Object.entries(REGISTERED_JOBS)) {
  jobState[name] = {
    name,
    schedule:       def.schedule,
    description:    def.description,
    lastRunAt:      null,
    lastStatus:     'IDLE',
    lastDurationMs: null,
    lastError:      null,
    runCount:       0,
    cronTask:       null,
  };
}

let isRunning = false;

/**
 * Executes a single job and records execution telemetry.
 */
async function runJob(name) {
  const def = REGISTERED_JOBS[name];
  if (!def) {
    throw Errors.NotFound(`Job '${name}' is not registered.`);
  }

  const state = jobState[name];
  const start = Date.now();
  state.lastRunAt = new Date().toISOString();
  state.lastStatus = 'RUNNING';

  try {
    const result = await def.handler();
    state.lastDurationMs = Date.now() - start;
    state.lastStatus = 'SUCCESS';
    state.lastError = null;
    state.runCount += 1;
    return { name, status: 'SUCCESS', durationMs: state.lastDurationMs, result };
  } catch (err) {
    state.lastDurationMs = Date.now() - start;
    state.lastStatus = 'ERROR';
    state.lastError = err.message;
    state.runCount += 1;
    console.error(`[scheduler] Error executing job '${name}':`, err.message);
    return { name, status: 'ERROR', durationMs: state.lastDurationMs, error: err.message };
  }
}

/**
 * Starts all scheduled cron jobs.
 */
function startScheduler() {
  if (isRunning) return;

  for (const [name, def] of Object.entries(REGISTERED_JOBS)) {
    const task = cron.schedule(def.schedule, async () => {
      await runJob(name);
    });
    jobState[name].cronTask = task;
  }

  isRunning = true;
  console.log(`[scheduler] Started ${Object.keys(REGISTERED_JOBS).length} background cron jobs.`);
}

/**
 * Stops all scheduled cron jobs during graceful shutdown.
 */
function stopScheduler() {
  for (const [name, state] of Object.entries(jobState)) {
    if (state.cronTask) {
      state.cronTask.stop();
      state.cronTask = null;
    }
  }
  isRunning = false;
  console.log('[scheduler] All background cron jobs stopped.');
}

/**
 * Returns telemetry data for all registered background jobs.
 */
function getJobStatus() {
  return Object.values(jobState).map((s) => ({
    name:           s.name,
    schedule:       s.schedule,
    description:    s.description,
    lastRunAt:      s.lastRunAt,
    lastStatus:     s.lastStatus,
    lastDurationMs: s.lastDurationMs,
    lastError:      s.lastError,
    runCount:       s.runCount,
    active:         isRunning && !!s.cronTask,
  }));
}

module.exports = {
  startScheduler,
  stopScheduler,
  runJob,
  getJobStatus,
  getLatestIntegrityStatus,
  REGISTERED_JOBS,
};
