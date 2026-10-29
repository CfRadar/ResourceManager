'use strict';

/**
 * src/modules/auth/auth.controller.js
 *
 * Thin controller layer — validates input, calls the service, formats responses.
 * No business logic here; all invariants live in auth.service.js.
 *
 * Error handling: all async errors propagate to the centralized error handler
 * via the Express 5 automatic async error propagation, or Express 4 explicit
 * next(err) calls — both patterns are supported here.
 */

const { validate }      = require('../../middleware/validate');
const { authenticate }  = require('../../middleware/auth');
const authService       = require('./auth.service');
const { registerSchema, verifyOtpSchema, loginSchema } = require('./auth.schemas');

// ─── POST /api/v1/auth/register ───────────────────────────────────────────────

/**
 * Public. Creates a new user and issues an OTP.
 * In demo mode: returns { demoOtp } in the response.
 */
async function register(req, res) {
  // Input is already Zod-validated by the route middleware.
  const result = await authService.register(req.body);
  res.status(201).json({ ok: true, data: result });
}

// ─── POST /api/v1/auth/verify-otp ─────────────────────────────────────────────

/**
 * Public. Verifies the demo OTP and issues access + refresh tokens.
 */
async function verifyOtp(req, res) {
  const result = await authService.verifyOtp(req.body, res);
  res.json({ ok: true, data: result });
}

// ─── POST /api/v1/auth/login ──────────────────────────────────────────────────

/**
 * Public, rate-limited. Authenticates credentials and issues tokens.
 */
async function login(req, res) {
  const result = await authService.login(req.body, res);
  res.json({ ok: true, data: result });
}

// ─── POST /api/v1/auth/refresh ────────────────────────────────────────────────

/**
 * Cookie-authenticated. Rotates refresh token and returns new access token.
 */
async function refresh(req, res) {
  const result = await authService.refresh(req, res);
  res.json({ ok: true, data: result });
}

// ─── POST /api/v1/auth/logout ─────────────────────────────────────────────────

/**
 * Revokes the refresh token and clears the cookie. Idempotent.
 */
async function logout(req, res) {
  await authService.logout(req, res);
  res.json({ ok: true, data: { message: 'Logged out successfully.' } });
}

// ─── GET /api/v1/auth/me ──────────────────────────────────────────────────────

/**
 * Requires authentication. Returns profile, memberships, and notification count.
 */
async function me(req, res) {
  // req.user.sub is set by the authenticate middleware from verified JWT.
  const result = await authService.getMe(req.user.sub);
  res.json({ ok: true, data: result });
}

module.exports = {
  register,
  verifyOtp,
  login,
  refresh,
  logout,
  me,
  // Export schemas for router wiring
  registerSchema,
  verifyOtpSchema,
  loginSchema,
};
