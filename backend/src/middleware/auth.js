'use strict';

/**
 * src/middleware/auth.js
 *
 * JWT bearer-token verification middleware.
 *
 * Design:
 *  - Reads `Authorization: Bearer <token>` from the request header.
 *  - Verifies the token using JWT_ACCESS_SECRET from validated env.
 *  - On success: attaches a sanitized identity object to req.user.
 *    req.user shape (from JWT payload — spec §1.2):
 *      { sub, role, memberships: [{ institutionId, role }], iat, exp }
 *  - On failure: returns standard 401 UNAUTHENTICATED envelope.
 *  - NEVER trusts user IDs or roles from req.body / req.query.
 *  - Does NOT implement login or token refresh (Step 02).
 *
 * Usage:
 *   const { authenticate } = require('../middleware/auth');
 *   router.get('/protected', authenticate, controller.handler);
 *
 *   // Optional — allow unauthenticated access but still read user if token present:
 *   router.get('/public', authenticate.optional, controller.handler);
 */

const jwt    = require('jsonwebtoken');
const env    = require('../config/env');
const { Errors } = require('../utils/AppError');

// ─── Token extraction ─────────────────────────────────────────────────────────

/**
 * Extract a Bearer token from the Authorization header.
 * Returns null if the header is absent or malformed.
 * @param {import('express').Request} req
 * @returns {string|null}
 */
function extractBearerToken(req) {
  const header = req.headers['authorization'];
  if (!header || !header.startsWith('Bearer ')) return null;
  const token = header.slice(7).trim();
  return token.length > 0 ? token : null;
}

// ─── Payload sanitization ────────────────────────────────────────────────────

/**
 * Build a safe req.user object from the verified JWT payload.
 * Only whitelisted fields are included — never raw payload passthrough.
 * @param {object} payload - Verified JWT payload
 * @returns {{ sub: string, role: string, memberships: Array<{institutionId: string, role: string}> }}
 */
function buildUserContext(payload) {
  return {
    sub:         String(payload.sub ?? ''),
    role:        String(payload.role ?? ''),
    memberships: Array.isArray(payload.memberships) ? payload.memberships : [],
    iat:         payload.iat,
    exp:         payload.exp,
  };
}

// ─── Core verify helper ────────────────────────────────────────────────────────

/**
 * Verify a JWT token and return the sanitized user context, or null on failure.
 * @param {string} token
 * @returns {{ sub: string, role: string, memberships: Array } | null}
 */
function verifyToken(token) {
  try {
    const payload = jwt.verify(token, env.JWT_ACCESS_SECRET);
    return buildUserContext(payload);
  } catch {
    return null;
  }
}

// ─── Middleware: authenticate (required) ──────────────────────────────────────

/**
 * Requires a valid JWT. Returns 401 if missing or invalid.
 */
function authenticate(req, _res, next) {
  const token = extractBearerToken(req);

  if (!token) {
    return next(Errors.Unauthenticated('No authentication token provided.'));
  }

  const user = verifyToken(token);
  if (!user) {
    return next(Errors.Unauthenticated('Invalid or expired authentication token.'));
  }

  req.user = user;
  return next();
}

// ─── Middleware: authenticate.optional ───────────────────────────────────────

/**
 * Does NOT require a JWT. If a valid token is present, attaches req.user.
 * If the token is absent or invalid, req.user remains undefined.
 * Useful for endpoints that show extra data to authenticated users.
 */
authenticate.optional = function optionalAuthenticate(req, _res, next) {
  const token = extractBearerToken(req);
  if (token) {
    const user = verifyToken(token);
    if (user) req.user = user;
  }
  return next();
};

module.exports = { authenticate };
