'use strict';

/**
 * src/middleware/errorHandler.js
 *
 * Centralized Express error-handling middleware.
 * Must be registered AFTER all routes in app.js.
 *
 * Handles:
 *  1. AppError instances (operational errors) → structured envelope.
 *  2. Zod validation errors (ZodError) → 400 VALIDATION_ERROR with field details.
 *  3. Express body-parser SyntaxError → 400 VALIDATION_ERROR.
 *  4. JWT errors (JsonWebTokenError, TokenExpiredError) → 401 UNAUTHENTICATED.
 *  5. Unknown/programmer errors → 500 INTERNAL_ERROR (never leaks internals in prod).
 *
 * Response shape (always JSON):
 *  { ok: false, error: { code, message, details } }
 */

const { AppError } = require('../utils/AppError');

/**
 * Format a Zod issue array into a flat field-error map.
 * @param {import('zod').ZodIssue[]} issues
 * @returns {{ fields: Array<{ path: string, message: string }> }}
 */
function formatZodIssues(issues) {
  return {
    fields: issues.map((issue) => ({
      path:    issue.path.join('.') || '(root)',
      message: issue.message,
    })),
  };
}

/**
 * Build the standard error response body.
 */
function errorBody(code, message, details = {}) {
  return { ok: false, error: { code, message, details } };
}

/**
 * Central error handler.
 * Express identifies this as an error handler because it has 4 parameters.
 *
 * @param {Error} err
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} _next  - Required by Express (unused)
 */
// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, _next) {
  // Guard: if headers already sent, delegate to Express default handler to
  // avoid "Cannot set headers after they are sent" crashes.
  if (res.headersSent) {
    return;
  }

  const isProd = process.env.NODE_ENV === 'production';

  // ── 1. Operational AppError ───────────────────────────────────────────────
  if (err instanceof AppError && err.isOperational) {
    return res
      .status(err.status)
      .json(errorBody(err.code, err.message, err.details));
  }

  // ── 2. Zod validation error ───────────────────────────────────────────────
  if (err.name === 'ZodError') {
    return res.status(400).json(
      errorBody(
        'VALIDATION_ERROR',
        'Request validation failed.',
        formatZodIssues(err.issues)
      )
    );
  }

  // ── 3. JSON body-parser SyntaxError ──────────────────────────────────────
  if (err instanceof SyntaxError && 'body' in err) {
    return res.status(400).json(
      errorBody('VALIDATION_ERROR', 'Malformed JSON in request body.')
    );
  }

  // ── 4. JWT errors ─────────────────────────────────────────────────────────
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json(
      errorBody('UNAUTHENTICATED', 'Invalid authentication token.')
    );
  }
  if (err.name === 'TokenExpiredError') {
    return res.status(401).json(
      errorBody('UNAUTHENTICATED', 'Authentication token has expired.')
    );
  }
  if (err.name === 'NotBeforeError') {
    return res.status(401).json(
      errorBody('UNAUTHENTICATED', 'Authentication token is not yet valid.')
    );
  }

  // ── 5. Unknown / programmer error ─────────────────────────────────────────
  // Log the full error server-side; never send internals to the client.
  console.error('[errorHandler] Unhandled error:', {
    message:  err.message,
    name:     err.name,
    path:     req.path,
    method:   req.method,
    // Only include stack in non-production logs.
    ...(isProd ? {} : { stack: err.stack }),
  });

  return res.status(500).json(
    errorBody(
      'INTERNAL_ERROR',
      isProd
        ? 'An unexpected error occurred. Please try again later.'
        : err.message  // Show raw message in dev for faster debugging
    )
  );
}

module.exports = { errorHandler };
