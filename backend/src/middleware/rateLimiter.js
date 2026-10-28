'use strict';

/**
 * src/middleware/rateLimiter.js
 *
 * Configurable rate-limiting middleware using express-rate-limit.
 * Exports two pre-built limiters:
 *
 *   apiLimiter   – applied to all /api/v1/* routes (generous window for dev)
 *   authLimiter  – applied only to /api/v1/auth/* (strict, per spec §5.2)
 *
 * Configuration is read from validated env (src/config/env.js).
 * When NODE_ENV=test the limiters are disabled (skip: () => true) so
 * integration tests are never throttled by the rate limiter itself.
 *
 * The spec error code for rate limiting is RATE_LIMITED (HTTP 429).
 */

const rateLimit = require('express-rate-limit');
const env       = require('../config/env');

/** Standard 429 response matching the project error envelope. */
function rateLimitHandler(req, res) {
  res.status(429).json({
    ok:    false,
    error: {
      code:    'RATE_LIMITED',
      message: 'Too many requests. Please slow down and try again later.',
      details: {
        retryAfterMs: res.getHeader('Retry-After')
          ? Number(res.getHeader('Retry-After')) * 1000
          : env.RATE_LIMIT_WINDOW_MS,
      },
    },
  });
}

const isTest = env.NODE_ENV === 'test';

/**
 * General API rate limiter.
 * Applied to all /api/v1/* routes in app.js.
 * Default: 100 requests / 60 s per IP.
 */
const apiLimiter = rateLimit({
  windowMs:         env.RATE_LIMIT_WINDOW_MS,     // default 60 000 ms
  max:              env.RATE_LIMIT_MAX_REQUESTS,   // default 100
  standardHeaders:  true,   // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders:    false,  // Disable the `X-RateLimit-*` headers
  handler:          rateLimitHandler,
  skip:             () => isTest,
});

/**
 * Strict authentication rate limiter.
 * Applied to /api/v1/auth/* routes in app.js.
 * Default: 10 requests / 60 s per IP.
 * Spec §5.2: "stricter on /auth/*"
 */
const authLimiter = rateLimit({
  windowMs:         env.RATE_LIMIT_WINDOW_MS,
  max:              env.AUTH_RATE_LIMIT_MAX_REQUESTS, // default 10
  standardHeaders:  true,
  legacyHeaders:    false,
  handler:          rateLimitHandler,
  skip:             () => isTest,
});

module.exports = { apiLimiter, authLimiter };
