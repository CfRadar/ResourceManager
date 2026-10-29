'use strict';

/**
 * src/modules/auth/auth.router.js
 *
 * Routes for /api/v1/auth/*.
 * Mounted in src/app.js under the authLimiter.
 *
 * Route-level concerns:
 *   - Zod validation via the validate() factory.
 *   - authenticate middleware (for /me).
 *   - loginLimiter on POST /login (5 req / 15 min — spec §5.2).
 *   - authLimiter already applied by app.js to the entire /auth prefix.
 */

const express  = require('express');
const { validate }     = require('../../middleware/validate');
const { authenticate } = require('../../middleware/auth');
const { loginLimiter } = require('../../middleware/rateLimiter');
const ctrl = require('./auth.controller');

const router = express.Router();

// POST /api/v1/auth/register
router.post(
  '/register',
  validate({ body: ctrl.registerSchema }),
  ctrl.register
);

// POST /api/v1/auth/verify-otp
router.post(
  '/verify-otp',
  validate({ body: ctrl.verifyOtpSchema }),
  ctrl.verifyOtp
);

// POST /api/v1/auth/login  — strict 5/15-min rate limit per IP
router.post(
  '/login',
  loginLimiter,
  validate({ body: ctrl.loginSchema }),
  ctrl.login
);

// POST /api/v1/auth/refresh  — read refresh cookie, rotate, return new access token
router.post('/refresh', ctrl.refresh);

// POST /api/v1/auth/logout  — revoke refresh token, clear cookie
router.post('/logout', ctrl.logout);

// GET /api/v1/auth/me  — requires valid access token
router.get('/me', authenticate, ctrl.me);

module.exports = router;
