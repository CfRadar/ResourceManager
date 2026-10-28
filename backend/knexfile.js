/**
 * knexfile.js
 *
 * Knex environment configuration.
 * Used by: `knex migrate:latest`, `knex seed:run`, and src/config/db.js.
 *
 * All database credentials come from environment variables (validated in
 * src/config/env.js). This file NEVER contains real credentials.
 */

'use strict';

require('dotenv').config(); // Load .env before reading process.env

const env = process.env;

/**
 * Build a Knex connection object.
 * Accepts DATABASE_URL or individual DB_* vars (same logic as src/config/db.js).
 */
function buildConnection(overrides = {}) {
  if (env.DATABASE_URL) {
    return {
      connectionString: env.DATABASE_URL,
      ssl: env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
      ...overrides,
    };
  }
  return {
    host:     env.DB_HOST     || 'localhost',
    port:     Number(env.DB_PORT) || 5432,
    database: env.DB_NAME     || 'resource_manager',
    user:     env.DB_USER     || 'postgres',
    password: env.DB_PASSWORD || '',
    ssl:      env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
    ...overrides,
  };
}

/** @type {import('knex').Knex.Config} */
const base = {
  client: 'pg',
  migrations: {
    directory: './migrations',
    tableName:  'knex_migrations',
    extension:  'js',
  },
  seeds: {
    directory: './seeds',
    extension:  'js',
  },
};

module.exports = {
  development: {
    ...base,
    connection: buildConnection(),
    pool: { min: 2, max: 10 },
    debug: true,
    asyncStackTraces: true,
  },

  test: {
    ...base,
    connection: buildConnection({
      database: env.DB_NAME_TEST || 'resource_manager_test',
    }),
    pool: { min: 1, max: 5 },
  },

  production: {
    ...base,
    connection: buildConnection(),
    pool: { min: 2, max: 20 },
    // Never log queries in production.
    debug: false,
  },
};
