'use strict';

/**
 * src/config/constants.js
 *
 * Single source of truth for shared, app-wide configuration values.
 * All values come from the Backend API Spec (Section 1.5, 5.2, etc.).
 * Where the spec is silent, conservative defaults are used and documented.
 *
 * DO NOT read process.env here — use src/config/env.js for env vars.
 * DO NOT duplicate these constants in individual modules.
 */

// ─── Pagination ───────────────────────────────────────────────────────────────
// Spec §1.5: ?page=1&pageSize=20, max pageSize 100.
const PAGINATION = {
  DEFAULT_PAGE:      1,
  DEFAULT_PAGE_SIZE: 20,
  MAX_PAGE_SIZE:     100,
};

// ─── Request Limits ───────────────────────────────────────────────────────────
// Spec §5.2: JSON body limit.
const REQUEST = {
  BODY_LIMIT:        '2mb',    // express.json({ limit })
  UPLOAD_PHOTO_MAX:  5_242_880,  // 5 MB in bytes  (resource/condition photos)
  UPLOAD_DOC_MAX:    10_485_760, // 10 MB in bytes (document submissions §4.15)
  UPLOAD_MIME_ALLOW: ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'],
};

// ─── Timeouts ─────────────────────────────────────────────────────────────────
// Spec §6.4: AI service timeout > 4 s triggers keyword fallback.
const TIMEOUT = {
  AI_SERVICE_MS:      4_000,  // abort AI fetch after 4 s
  DB_ACQUIRE_MS:      5_000,  // Knex pool acquire timeout
  DB_CREATE_MS:       5_000,  // Knex pool create timeout
  GRACEFUL_SHUTDOWN:  10_000, // ms to wait for in-flight requests on SIGTERM
};

// ─── JWT / Auth ───────────────────────────────────────────────────────────────
// Access token duration is set in env (JWT_ACCESS_EXPIRES_IN).
// These constants are for logic that needs numeric ms values.
const AUTH = {
  BCRYPT_ROUNDS:         12,          // cost factor for bcrypt password hashing
  OTP_LENGTH:            6,           // demo virtual OTP digit count
  OTP_EXPIRES_MS:        10 * 60_000, // 10 minutes
  REFRESH_COOKIE_NAME:   'rm_refresh',
  LOGIN_MAX_ATTEMPTS:    5,           // lockout after N failed attempts
  LOGIN_LOCKOUT_MS:      15 * 60_000, // 15-minute lockout window
};

// ─── Booking / Availability ───────────────────────────────────────────────────
// Spec §4.12 check-in window, overdue detection, etc.
const BOOKING = {
  CHECK_IN_EARLY_MIN:  15,  // can check in up to 15 min before slot starts
  NO_SHOW_GRACE_MIN:   15,  // mark no-show after grace period from start
  LATE_RETURN_GRACE:   15,  // minutes before overdue flag is set
  REMINDER_HOURS:      [24, 1], // send reminders at these hours before start
  REMINDER_BEFORE_END: 30,  // minutes before end
};

// ─── Idempotency ─────────────────────────────────────────────────────────────
// Spec §1.7: POST endpoints that create bookings/requests accept Idempotency-Key.
const IDEMPOTENCY = {
  KEY_HEADER:     'Idempotency-Key',
  KEY_MAX_LENGTH: 128,
  // IMPORTANT: durable storage (DB) is required for production-grade idempotency.
  // The current middleware provides interface scaffolding only — see middleware/idempotency.js.
};

// ─── Waitlist ────────────────────────────────────────────────────────────────
const WAITLIST = {
  OFFER_EXPIRES_HOURS: 24, // hours coordinator has to act on a freed slot
};

// ─── Referrals ────────────────────────────────────────────────────────────────
const REFERRAL = {
  NO_RESPONSE_DAYS: 7, // days before a referral is marked NO_RESPONSE
};

// ─── Retention ────────────────────────────────────────────────────────────────
// Spec §5.2: condition photos and geo purge N days after booking closure.
const RETENTION = {
  CONDITION_PHOTO_DAYS: 365,
  GEO_DATA_DAYS:        90,
};

// ─── Demo flag ────────────────────────────────────────────────────────────────
// Spec §0: All financial/legal demo features must include "demo": true.
const DEMO = {
  ENABLED: true, // always true in this prototype; set false once real payments land
};

module.exports = {
  PAGINATION,
  REQUEST,
  TIMEOUT,
  AUTH,
  BOOKING,
  IDEMPOTENCY,
  WAITLIST,
  REFERRAL,
  RETENTION,
  DEMO,
};
