'use strict';

/**
 * src/modules/auth/token.service.js
 *
 * JWT access-token and refresh-token generation.
 *
 * Design:
 *  - Access tokens:  signed HS256 JWT, 15-minute lifetime, payload per spec §1.2.
 *  - Refresh tokens: 32-byte cryptographically random value, stored only as
 *    SHA-256 hash in the database, delivered exclusively via httpOnly cookie.
 *  - All secrets come from validated env (src/config/env.js). No defaults.
 *  - Algorithm is explicitly set on sign AND verify to prevent algorithm confusion.
 *  - Raw refresh tokens are NEVER logged.
 *
 * Cookie naming convention: `rm_rt` (Resource Manager Refresh Token).
 */

const crypto = require('crypto');
const jwt    = require('jsonwebtoken');
const env    = require('../../config/env');

// ─── Constants ────────────────────────────────────────────────────────────────

const JWT_ALGORITHM    = 'HS256';
const REFRESH_COOKIE   = 'rm_rt';
const REFRESH_BYTES    = 32; // 256 bits of entropy

// Refresh token expiry in milliseconds (parsed from env, e.g. '7d').
const REFRESH_EXPIRES_MS = parseExpiry(env.JWT_REFRESH_EXPIRES_IN);

// ─── Access token ─────────────────────────────────────────────────────────────

/**
 * Generate a short-lived access token.
 *
 * Payload shape (spec §1.2):
 *   { sub, role, memberships: [{ institutionId, role }], iat, exp }
 *
 * @param {{ id: string, platform_role: string }} user
 * @param {Array<{ institutionId: string, role: string }>} memberships
 * @returns {string} Signed JWT
 */
function signAccessToken(user, memberships) {
  const payload = {
    sub:         user.id,
    role:        user.platform_role,
    memberships: memberships || [],
  };
  return jwt.sign(payload, env.JWT_ACCESS_SECRET, {
    algorithm: JWT_ALGORITHM,
    expiresIn: env.JWT_ACCESS_EXPIRES_IN, // '15m'
  });
}

/**
 * Verify an access token and return the decoded payload.
 * Explicitly enforces HS256 — rejects tokens signed with any other algorithm.
 *
 * @param {string} token
 * @returns {object} Verified payload
 * @throws {JsonWebTokenError|TokenExpiredError}
 */
function verifyAccessToken(token) {
  return jwt.verify(token, env.JWT_ACCESS_SECRET, { algorithms: [JWT_ALGORITHM] });
}

// ─── Refresh token ────────────────────────────────────────────────────────────

/**
 * Generate a cryptographically random refresh token.
 * Returns both the raw token (for cookie delivery) and its SHA-256 hash
 * (for database storage).
 *
 * @returns {{ raw: string, hash: string, expiresAt: Date }}
 */
function generateRefreshToken() {
  const raw      = crypto.randomBytes(REFRESH_BYTES).toString('hex');
  const hash     = crypto.createHash('sha256').update(raw).digest('hex');
  const expiresAt = new Date(Date.now() + REFRESH_EXPIRES_MS);
  return { raw, hash, expiresAt };
}

/**
 * Hash a raw refresh token for database lookup.
 * @param {string} raw
 * @returns {string}
 */
function hashRefreshToken(raw) {
  return crypto.createHash('sha256').update(raw).digest('hex');
}

// ─── Cookie helpers ───────────────────────────────────────────────────────────

/**
 * Build the httpOnly cookie options for the refresh token.
 * Spec §1.1: httpOnly, secure (production), sameSite=strict.
 *
 * @param {Date} expiresAt
 * @returns {import('express').CookieOptions}
 */
function refreshCookieOptions(expiresAt) {
  return {
    httpOnly: true,
    secure:   env.NODE_ENV === 'production', // HTTPS only in prod
    sameSite: 'strict',
    path:     '/api/v1/auth',               // Scoped to avoid sending on every request
    expires:  expiresAt,
  };
}

/**
 * Set the refresh-token httpOnly cookie on the response.
 * @param {import('express').Response} res
 * @param {string} rawToken
 * @param {Date}   expiresAt
 */
function setRefreshCookie(res, rawToken, expiresAt) {
  res.cookie(REFRESH_COOKIE, rawToken, refreshCookieOptions(expiresAt));
}

/**
 * Clear the refresh-token cookie (for logout).
 * Must use matching path/sameSite options to properly remove the cookie.
 * @param {import('express').Response} res
 */
function clearRefreshCookie(res) {
  res.clearCookie(REFRESH_COOKIE, {
    httpOnly: true,
    secure:   env.NODE_ENV === 'production',
    sameSite: 'strict',
    path:     '/api/v1/auth',
  });
}

/**
 * Read the raw refresh token from the request cookie.
 * Returns null if not present.
 * @param {import('express').Request} req
 * @returns {string|null}
 */
function getRefreshCookie(req) {
  return (req.cookies && req.cookies[REFRESH_COOKIE]) || null;
}

// ─── Utility ──────────────────────────────────────────────────────────────────

/**
 * Parse a JWT expiry string (e.g. '7d', '15m', '3600s') into milliseconds.
 * Used to set cookie and DB expiry dates consistently.
 * @param {string} expiry
 * @returns {number} milliseconds
 */
function parseExpiry(expiry) {
  if (!expiry) return 7 * 24 * 60 * 60 * 1000; // default 7d
  const match = String(expiry).match(/^(\d+)([smhd])$/);
  if (!match) return 7 * 24 * 60 * 60 * 1000;
  const [, num, unit] = match;
  const multipliers = { s: 1000, m: 60_000, h: 3_600_000, d: 86_400_000 };
  return Number(num) * multipliers[unit];
}

module.exports = {
  REFRESH_COOKIE,
  signAccessToken,
  verifyAccessToken,
  generateRefreshToken,
  hashRefreshToken,
  setRefreshCookie,
  clearRefreshCookie,
  getRefreshCookie,
  refreshCookieOptions,
};
