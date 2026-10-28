'use strict';

/**
 * src/config/db.js
 *
 * Knex / PostgreSQL connection pool.
 *
 * Design decisions:
 *  - Config is read from validated env (src/config/env.js), never from
 *    process.env directly, so db.js can be safely required in tests.
 *  - The pool is created lazily (on first require) and exported as a singleton.
 *  - db.js does NOT run migrations — that is a separate CLI step (knex migrate:latest).
 *  - db.js does NOT require a live database to be importable; the pool only
 *    attempts a real connection when the first query is made. Tests that don't
 *    exercise the DB can import src/app.js freely.
 *  - Credentials are NEVER logged. Only the host + database name appear in logs.
 *
 * Exports:
 *   db           – the Knex instance (default query interface)
 *   checkDb()    – async health check; resolves true or throws
 *   destroyDb()  – async graceful pool shutdown (call on SIGTERM)
 */

const knex = require('knex');
const env  = require('./env');

// ─── Build connection config ──────────────────────────────────────────────────

function buildConnection() {
  if (env.DATABASE_URL) {
    return {
      connectionString: env.DATABASE_URL,
      ssl: env.DB_SSL ? { rejectUnauthorized: false } : false,
    };
  }
  if (env.DB_HOST) {
    return {
      host:     env.DB_HOST,
      port:     env.DB_PORT || 5432,
      database: env.DB_NAME,
      user:     env.DB_USER,
      password: env.DB_PASSWORD,
      ssl:      env.DB_SSL ? { rejectUnauthorized: false } : false,
    };
  }
  // No connection config — return null; queries will fail with a clear message.
  return null;
}

// ─── Create Knex instance ─────────────────────────────────────────────────────

const connection = buildConnection();

const db = knex({
  client: 'pg',
  connection: connection || {
    // Dummy values so Knex doesn't throw at module-load time.
    // Real connections are never attempted until a query is made.
    host: 'localhost', port: 5432, database: 'rm_not_configured',
    user: 'not_configured', password: 'not_configured',
  },
  pool: {
    min: 2,
    max: 10,
    acquireTimeoutMillis: 5_000,
    createTimeoutMillis:  5_000,
    idleTimeoutMillis:    30_000,
    reapIntervalMillis:   1_000,
    createRetryIntervalMillis: 200,
  },
  // Log compiled SQL queries in development (without bind parameters to avoid
  // leaking data values). Never log in production.
  debug: env.NODE_ENV === 'development',
  asyncStackTraces: env.NODE_ENV === 'development',
});

// ─── Safe log helper ─────────────────────────────────────────────────────────

function safeDbInfo() {
  if (env.DATABASE_URL) {
    try {
      const u = new URL(env.DATABASE_URL);
      return `${u.host}/${u.pathname.replace(/^\//, '')}`;
    } catch {
      return '<DATABASE_URL>';
    }
  }
  return `${env.DB_HOST || 'localhost'}:${env.DB_PORT || 5432}/${env.DB_NAME || '?'}`;
}

// ─── Health check ─────────────────────────────────────────────────────────────

/**
 * Verifies database connectivity by running a cheap query.
 * @returns {Promise<{ ok: boolean, latencyMs: number }>}
 */
async function checkDb() {
  if (!connection) {
    throw new Error('Database is not configured. Set DATABASE_URL or DB_HOST in the environment.');
  }
  const start = Date.now();
  await db.raw('SELECT 1');
  return { ok: true, latencyMs: Date.now() - start };
}

// ─── Graceful shutdown ────────────────────────────────────────────────────────

/**
 * Destroys the connection pool cleanly.
 * Call this during graceful shutdown (SIGTERM / SIGINT).
 */
async function destroyDb() {
  await db.destroy();
  console.log(`[db] Connection pool closed (${safeDbInfo()})`);
}

// Log the target (host + db name only — no credentials) when the module loads.
if (env.NODE_ENV !== 'test') {
  console.log(`[db] Pool configured → ${safeDbInfo()}`);
}

module.exports = { db, checkDb, destroyDb };
