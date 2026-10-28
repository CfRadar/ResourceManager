'use strict';

/**
 * src/utils/AppError.js
 *
 * Reusable application error class and helpers for every error code defined in
 * the Backend API Spec, Section 1.4.
 *
 * Usage:
 *   const { Errors } = require('../utils/AppError');
 *   throw Errors.NotFound('Resource not found');
 *   throw Errors.BookingConflict({ conflictingSlot: { startAt, endAt } });
 *
 * The global error handler (middleware/errorHandler.js) formats every AppError
 * instance into the standard envelope:
 *   { ok: false, error: { code, message, details } }
 */

class AppError extends Error {
  /**
   * @param {string} code    - Machine-readable error code (e.g. 'NOT_FOUND').
   * @param {string} message - Human-readable description shown to the caller.
   * @param {number} status  - HTTP status code (default 400).
   * @param {object} details - Optional structured details (field errors, conflict info, etc.).
   */
  constructor(code, message, status = 400, details = {}) {
    super(message);
    this.name = 'AppError';
    this.code = code;
    this.status = status;
    this.details = details;
    /** true = operational error (expected, safe to send to client); false = programmer error */
    this.isOperational = true;
    // Capture a clean stack trace excluding this constructor frame.
    Error.captureStackTrace?.(this, this.constructor);
  }
}

// ─── Error Helpers ────────────────────────────────────────────────────────────
// Each factory mirrors exactly one row in Spec §1.4.

const Errors = {
  /**
   * 400 VALIDATION_ERROR – body/query failed Zod schema validation.
   * @param {string} msg
   * @param {object} [details] - Field-level issues: { field: 'email', message: '...' }[]
   */
  Validation: (msg, details = {}) =>
    new AppError('VALIDATION_ERROR', msg, 400, details),

  /**
   * 401 UNAUTHENTICATED – missing or expired JWT.
   * @param {string} [msg]
   */
  Unauthenticated: (msg = 'Authentication required') =>
    new AppError('UNAUTHENTICATED', msg, 401),

  /**
   * 403 FORBIDDEN – authenticated but role/scope not allowed.
   * @param {string} [msg]
   */
  Forbidden: (msg = 'Access denied') =>
    new AppError('FORBIDDEN', msg, 403),

  /**
   * 403 NOT_ELIGIBLE – eligibility rule failed; details lists failed checks.
   * @param {string} msg
   * @param {object} [details] - { failedChecks: [...] }
   */
  NotEligible: (msg, details = {}) =>
    new AppError('NOT_ELIGIBLE', msg, 403, details),

  /**
   * 404 NOT_FOUND – entity absent OR hidden from caller (do not leak existence
   * of private resources — return 404, not 403, for hidden resources).
   * @param {string} [msg]
   */
  NotFound: (msg = 'Resource not found') =>
    new AppError('NOT_FOUND', msg, 404),

  /**
   * 409 – generic conflict with a caller-supplied code.
   * Prefer a specific helper (BookingConflict, InvalidTransition, PolicyLimit)
   * when the code is known.
   * @param {string} code
   * @param {string} msg
   * @param {object} [details]
   */
  Conflict: (code, msg, details = {}) =>
    new AppError(code, msg, 409, details),

  /**
   * 409 BOOKING_CONFLICT – slot overlaps an approved/scheduled booking.
   * @param {object} [details] - { conflictingSlot: { startAt, endAt }, alternatives: [...] }
   */
  BookingConflict: (details = {}) =>
    new AppError(
      'BOOKING_CONFLICT',
      'The selected time slot overlaps with an existing booking.',
      409,
      details
    ),

  /**
   * 409 INVALID_TRANSITION – state change not allowed from current state.
   * @param {string} from - Current state label.
   * @param {string} to   - Attempted target state label.
   */
  InvalidTransition: (from, to) =>
    new AppError(
      'INVALID_TRANSITION',
      `Cannot transition from '${from}' to '${to}'.`,
      409,
      { from, to }
    ),

  /**
   * 409 POLICY_LIMIT – fair-use limit exceeded.
   * @param {string} msg
   * @param {object} [details] - { limit, current, resetsAt }
   */
  PolicyLimit: (msg, details = {}) =>
    new AppError('POLICY_LIMIT', msg, 409, details),

  /**
   * 422 DOCUMENT_MISSING – required document/acknowledgment not satisfied.
   * @param {object} [details] - { missingDocuments: [...] }
   */
  DocumentMissing: (details = {}) =>
    new AppError(
      'DOCUMENT_MISSING',
      'A required document or acknowledgment has not been satisfied.',
      422,
      details
    ),

  /**
   * 502 AI_UNAVAILABLE – AI service down; fallback used where possible.
   * @param {string} [msg]
   */
  AiUnavailable: (msg = 'AI service temporarily unavailable') =>
    new AppError('AI_UNAVAILABLE', msg, 502),
};

module.exports = { AppError, Errors };
