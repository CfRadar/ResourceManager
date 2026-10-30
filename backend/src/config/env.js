'use strict';

/**
 * src/config/env.js
 *
 * Loads .env via dotenv and validates every required variable using Zod.
 * This module MUST be required before anything else (done in index.js).
 *
 * Rules:
 *  - Required variables that are missing or invalid cause an immediate,
 *    human-readable process exit. The error message names the variable
 *    and the expected format; it never logs the value.
 *  - Only safe development defaults (NODE_ENV, PORT, FRONTEND_ORIGIN) are
 *    provided. Secrets and database credentials have NO defaults — they must
 *    be present in the environment or the process refuses to start.
 *  - module.exports exposes the validated, typed config object so callers
 *    never read process.env directly.
 */

const path = require('path');
const { z } = require('zod');

// Load .env from the backend root (one level above src/).
// dotenv silently does nothing if the file is absent (production uses real env vars).
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });

// ─── Schema ──────────────────────────────────────────────────────────────────

const envSchema = z.object({
  // Application
  NODE_ENV: z
    .enum(['development', 'test', 'production'])
    .default('development'),
  PORT: z
    .string()
    .regex(/^\d+$/, 'PORT must be a numeric string')
    .default('5000')
    .transform(Number),
  FRONTEND_ORIGIN: z
    .string()
    .url('FRONTEND_ORIGIN must be a valid URL')
    .default('https://resource-manager-seven-pied.vercel.app'),

  // Database – accept DATABASE_URL OR individual fields.
  // Individual fields are optional here; db.js decides how to connect.
  DATABASE_URL: z.string().url().optional(),
  DB_HOST: z.string().optional(),
  DB_PORT: z
    .string()
    .regex(/^\d+$/)
    .transform(Number)
    .optional(),
  DB_NAME: z.string().optional(),
  DB_USER: z.string().optional(),
  DB_PASSWORD: z.string().optional(),
  DB_SSL: z
    .enum(['true', 'false'])
    .default('false')
    .transform((v) => v === 'true'),

  // JWT – required; no defaults because a default would be a security hole.
  JWT_ACCESS_SECRET: z
    .string()
    .min(32, 'JWT_ACCESS_SECRET must be at least 32 characters'),
  JWT_REFRESH_SECRET: z
    .string()
    .min(32, 'JWT_REFRESH_SECRET must be at least 32 characters'),
  JWT_ACCESS_EXPIRES_IN: z.string().default('15m'),
  JWT_REFRESH_EXPIRES_IN: z.string().default('7d'),

  // Internal service communication
  AI_SERVICE_URL: z
    .string()
    .url('AI_SERVICE_URL must be a valid URL')
    .default('https://resourcemanager-vkgn.onrender.com'),
  AI_INTERNAL_KEY: z.string().optional(),

  // Rate limiting (optional overrides)
  RATE_LIMIT_WINDOW_MS: z
    .string()
    .regex(/^\d+$/)
    .default('60000')
    .transform(Number),
  RATE_LIMIT_MAX_REQUESTS: z
    .string()
    .regex(/^\d+$/)
    .default('100')
    .transform(Number),
  AUTH_RATE_LIMIT_MAX_REQUESTS: z
    .string()
    .regex(/^\d+$/)
    .default('10')
    .transform(Number),
  // Strict login limiter: spec §5.2 — 5 req / 15 min per IP
  LOGIN_RATE_LIMIT_MAX: z
    .string()
    .regex(/^\d+$/)
    .default('5')
    .transform(Number),
  LOGIN_RATE_LIMIT_WINDOW_MS: z
    .string()
    .regex(/^\d+$/)
    .default('900000')  // 15 minutes
    .transform(Number),

  // Demo authentication flag (spec §1.3 demo mode).
  // When true and NODE_ENV != production: OTP is returned in register response.
  // NEVER enable in production.
  DEMO_AUTH_ENABLED: z
    .enum(['true', 'false'])
    .default('false')
    .transform((v) => v === 'true'),
});

// ─── Validation ───────────────────────────────────────────────────────────────

// In the 'test' environment, relax JWT requirements so the app can be imported
// without real secrets.  Tests that exercise auth must supply their own secrets.
const schemaToUse =
  process.env.NODE_ENV === 'test'
    ? envSchema.extend({
        JWT_ACCESS_SECRET: z.string().default('test_access_secret_32_chars_long__'),
        JWT_REFRESH_SECRET: z.string().default('test_refresh_secret_32_chars_long_'),
        DATABASE_URL: z.string().optional().default('postgresql://test:test@localhost:5432/rm_test'),
      })
    : envSchema;

const result = schemaToUse.safeParse(process.env);

if (!result.success) {
  const issues = result.error.issues
    .map((i) => `  • ${i.path.join('.')}: ${i.message}`)
    .join('\n');
  // Use process.stderr directly — logger may not be available yet.
  process.stderr.write(
    `\n[env] ❌ Environment validation failed. Fix the following:\n${issues}\n\n` +
      `  See backend/.env.example for the full list of required variables.\n\n`
  );
  process.exit(1);
}

/** @type {z.infer<typeof envSchema>} */
const env = result.data;

// Sanity-check: ensure at least one database connection method is present.
if (!env.DATABASE_URL && !env.DB_HOST && env.NODE_ENV !== 'test') {
  process.stderr.write(
    '\n[env] ❌ No database configuration found.\n' +
      '  Set DATABASE_URL or (DB_HOST + DB_PORT + DB_NAME + DB_USER + DB_PASSWORD).\n\n'
  );
  process.exit(1);
}

module.exports = env;
