'use strict';

/**
 * src/app.js
 *
 * Express application factory.
 *
 * Responsibility: configure the Express app — middleware pipeline, routers,
 * health endpoint, 404 handler, and error handler.
 * This module does NOT bind to a port; that is server.js's job.
 * Keeping them separate lets tests import the app without starting a server.
 *
 * Middleware order (deliberate):
 *   1. helmet()         – security headers (first, always)
 *   2. cors()           – preflight + CORS headers
 *   3. express.json()   – body parsing
 *   4. cookieParser()   – cookie parsing (needed for refresh tokens)
 *   5. apiLimiter       – general rate limit on /api/v1/*
 *   6. /api/v1 router   – all application routes
 *   7. 404 handler      – catch unknown routes (after all valid routes)
 *   8. errorHandler     – centralized error formatter (last)
 */

const express      = require('express');
const cors         = require('cors');
const helmet       = require('helmet');
const cookieParser = require('cookie-parser');

const env                = require('./config/env');
const { REQUEST }        = require('./config/constants');
const { apiLimiter, authLimiter } = require('./middleware/rateLimiter');
const { errorHandler }   = require('./middleware/errorHandler');
const { Errors }         = require('./utils/AppError');

// ─── Application factory ──────────────────────────────────────────────────────

function createApp() {
  const app = express();

  // ── 1. Helmet – secure HTTP headers ────────────────────────────────────────
  app.use(helmet());

  // ── 2. CORS ─────────────────────────────────────────────────────────────────
  // Spec §5.2: CORS allowlist. Never use a wildcard with credentials.
  // FRONTEND_ORIGIN is validated by env.js (must be a URL, not '*').
  app.use(
    cors({
      origin: (origin, cb) => {
        // Allow server-to-server (no origin) and the configured frontend origin.
        if (!origin || origin === env.FRONTEND_ORIGIN) {
          return cb(null, true);
        }
        return cb(
          Errors.Forbidden(`CORS: origin '${origin}' is not allowed.`)
        );
      },
      credentials:     true,   // Required for httpOnly refresh-token cookie
      allowedHeaders:  ['Content-Type', 'Authorization', 'Idempotency-Key'],
      exposedHeaders:  ['RateLimit-Limit', 'RateLimit-Remaining', 'RateLimit-Reset'],
      methods:         ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    })
  );

  // ── 3. Body parsing ─────────────────────────────────────────────────────────
  // Spec §5.2: JSON body limit 2 MB. SyntaxError is caught by errorHandler.
  app.use(express.json({ limit: REQUEST.BODY_LIMIT }));

  // ── 4. Cookie parsing ────────────────────────────────────────────────────────
  // Required for reading the httpOnly refresh-token cookie in Step 02.
  app.use(cookieParser());

  // ── 5. General rate limiter on all /api/v1 routes ───────────────────────────
  app.use('/api/v1', apiLimiter);

  // ── 6. Application router ────────────────────────────────────────────────────
  app.use('/api/v1', buildApiRouter());

  // Legacy root health (retained from original index.js for Makefile smoke test).
  app.get('/health', (_req, res) => {
    res.json({ ok: true, data: { status: 'healthy', timestamp: new Date().toISOString() } });
  });

  // ── 7. 404 – unknown route ───────────────────────────────────────────────────
  // Must come after all route registrations.
  app.use((_req, _res, next) => {
    next(Errors.NotFound('The requested endpoint does not exist.'));
  });

  // ── 8. Centralized error handler ─────────────────────────────────────────────
  // Must be last (4-argument signature).
  app.use(errorHandler);

  return app;
}

// ─── API router ───────────────────────────────────────────────────────────────

function buildApiRouter() {
  const router = express.Router();

  // Health check – spec §4.23: GET /health → { status, db, aiService }
  // Full DB + AI health is implemented in Step 10; this stub satisfies Step 00.
  router.get('/health', (_req, res) => {
    res.json({
      ok:   true,
      data: {
        status:    'healthy',
        timestamp: new Date().toISOString(),
        version:   process.env.npm_package_version || '1.0.0',
      },
    });
  });

  // ── Auth module (Step 02) ─────────────────────────────────────────────────
  const authRouter = require('./modules/auth/auth.router');
  // authLimiter applied here (general auth limit); loginLimiter applied per-route in authRouter.
  router.use('/auth', authLimiter, authRouter);

  // ── Institutions & Facilities modules (Step 03) ───────────────────────────
  const institutionsRouter = require('./modules/institutions/institutions.router');
  const facilitiesRouter   = require('./modules/facilities/facilities.router');
  router.use('/institutions', institutionsRouter);
  router.use('/facilities',   facilitiesRouter);

  // ── Resources & Policies modules (Step 04) ────────────────────────────────
  const resourcesRouter = require('./modules/resources/resources.router');
  router.use('/resources', resourcesRouter);

  // ── Availability Polls voting (Step 05) ───────────────────────────────────
  const { pollsRouter } = require('./modules/availability/availability.router');
  router.use('/availability-polls', pollsRouter);

  return router;
}

module.exports = { createApp };
