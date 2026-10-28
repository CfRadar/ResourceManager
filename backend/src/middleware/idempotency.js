'use strict';

/**
 * src/middleware/idempotency.js
 *
 * Idempotency-Key header support foundation.
 *
 * ─── IMPORTANT LIMITATION NOTICE ───────────────────────────────────────────
 * Spec §1.7 requires idempotency for POST endpoints that create bookings,
 * requests, or ledger entries (to prevent duplicate creation on retry).
 *
 * Production-grade idempotency for booking and payment operations REQUIRES
 * durable, atomic storage — the key and its cached response must be written
 * in the same database transaction as the business operation, so that:
 *   - A request that races with itself sees "already processing" atomically.
 *   - A server crash between the key write and the business write cannot
 *     leave a phantom idempotency record without a business record.
 *
 * This module provides:
 *   1. Key extraction, format validation, and req.idempotencyKey attachment.
 *   2. A clearly-documented interface (IdempotencyStore) that Step 06/07
 *      will implement using the Knex database.
 *   3. A NullStore (in-process, non-durable) that is used ONLY in development
 *      and testing to make the interface testable without a DB.
 *
 * ⚠ The NullStore does NOT provide real idempotency guarantees.
 *   It is explicitly documented as a development scaffold.
 *   Production deployments MUST plug in a database-backed store.
 *
 * Key design (from spec §1.7 and industry practice):
 *   - Scope:       Per-user + per-endpoint (key is namespaced to prevent
 *                  a key colliding across different routes).
 *   - Expiration:  24 hours (configurable in IDEMPOTENCY_TTL_MS).
 *   - Fingerprint: SHA-256 of (method + path + sorted body) stored alongside
 *                  the cached response so that a retry with a different body
 *                  is rejected (HTTP 422).
 *   - Duplicate:   Return the cached response without re-executing the handler.
 *
 * Usage (once a real store is plugged in via Step 06):
 *   const { idempotent } = require('../middleware/idempotency');
 *   router.post('/bookings', authenticate, idempotent(), bookingController.create);
 * ──────────────────────────────────────────────────────────────────────────────
 */

const crypto = require('crypto');
const { IDEMPOTENCY } = require('../config/constants');

// ─── Interface contract (implemented by real DB store in Step 06/07) ──────────

/**
 * @typedef {Object} IdempotencyRecord
 * @property {string} key          - The raw Idempotency-Key value.
 * @property {string} scope        - Namespaced key (userId + route).
 * @property {string} fingerprint  - SHA-256 of request signature.
 * @property {number} status       - Cached HTTP status code.
 * @property {object} body         - Cached response body.
 * @property {Date}   createdAt
 * @property {Date}   expiresAt
 */

/**
 * @interface IdempotencyStore
 *
 * Implementations must be atomic: get + set must be a single DB transaction.
 * Use SELECT ... FOR UPDATE or INSERT ... ON CONFLICT DO NOTHING as appropriate.
 */
// eslint-disable-next-line no-unused-vars
class IdempotencyStore {
  /** @returns {Promise<IdempotencyRecord|null>} */
  async get(scope) { throw new Error('Not implemented'); }
  /** @returns {Promise<void>} */
  async set(scope, record) { throw new Error('Not implemented'); }
}

// ─── NullStore (development / test only) ─────────────────────────────────────

class NullStore {
  constructor() {
    this._map = new Map();
    if (process.env.NODE_ENV === 'production') {
      throw new Error(
        '[idempotency] NullStore must not be used in production. ' +
        'Plug in a database-backed store before deploying.'
      );
    }
  }

  async get(scope) {
    const rec = this._map.get(scope);
    if (!rec) return null;
    if (Date.now() > rec.expiresAt) {
      this._map.delete(scope);
      return null;
    }
    return rec;
  }

  async set(scope, record) {
    this._map.set(scope, record);
  }
}

// ─── Constants ────────────────────────────────────────────────────────────────

const IDEMPOTENCY_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

// Singleton dev store (replaced in tests or production).
let _store = null;

function getStore() {
  if (!_store) _store = new NullStore();
  return _store;
}

/**
 * Replace the backing store. Call this once at startup with a DB-backed store.
 * @param {IdempotencyStore} store
 */
function setIdempotencyStore(store) {
  _store = store;
}

// ─── Request fingerprint ──────────────────────────────────────────────────────

function buildFingerprint(req) {
  const body  = JSON.stringify(
    Object.fromEntries(Object.entries(req.body || {}).sort())
  );
  const input = `${req.method}:${req.path}:${body}`;
  return crypto.createHash('sha256').update(input).digest('hex');
}

// ─── Middleware factory ───────────────────────────────────────────────────────

/**
 * Returns an Express middleware that enforces idempotency for the route.
 *
 * ⚠ This middleware MUST run after authenticate so req.user is available
 *   for key scoping. Using an un-scoped key would allow key collisions
 *   across different users.
 *
 * @returns {import('express').RequestHandler}
 */
function idempotent() {
  return async (req, res, next) => {
    const rawKey = req.headers[IDEMPOTENCY.KEY_HEADER.toLowerCase()];

    // No key supplied — let the request proceed normally.
    if (!rawKey) return next();

    // Validate key format.
    if (typeof rawKey !== 'string' || rawKey.length > IDEMPOTENCY.KEY_MAX_LENGTH) {
      return res.status(400).json({
        ok: false,
        error: {
          code:    'VALIDATION_ERROR',
          message: `Idempotency-Key must be a string of at most ${IDEMPOTENCY.KEY_MAX_LENGTH} characters.`,
        },
      });
    }

    // Scope: namespaced to the authenticated user + route to prevent cross-user
    // key collisions. Falls back to IP for unauthenticated routes (not recommended).
    const userId = req.user?.sub || req.ip;
    const scope  = `${userId}:${req.method}:${req.path}:${rawKey}`;

    const fingerprint = buildFingerprint(req);
    const store       = getStore();

    try {
      const existing = await store.get(scope);

      if (existing) {
        // Fingerprint mismatch → same key, different body (user error).
        if (existing.fingerprint !== fingerprint) {
          return res.status(422).json({
            ok: false,
            error: {
              code:    'IDEMPOTENCY_CONFLICT',
              message: 'The Idempotency-Key was already used with a different request body.',
            },
          });
        }
        // Return the cached response.
        return res.status(existing.status).json(existing.body);
      }

      // ⚠ DEV NOTE: For real production safety, the store.set() call must happen
      // *inside* the same database transaction as the business operation.
      // The current scaffold captures the response by monkey-patching res.json,
      // which is NOT atomic with the business write.
      // Step 06/07 will replace this with proper transactional idempotency.

      const originalJson = res.json.bind(res);
      res.json = async (body) => {
        try {
          await store.set(scope, {
            key:         rawKey,
            scope,
            fingerprint,
            status:      res.statusCode,
            body,
            createdAt:   Date.now(),
            expiresAt:   Date.now() + IDEMPOTENCY_TTL_MS,
          });
        } catch (storeErr) {
          // Log but don't fail the response — the business operation already succeeded.
          console.error('[idempotency] Failed to persist idempotency record:', storeErr.message);
        }
        return originalJson(body);
      };

      // Attach key to req for controllers that want to log it.
      req.idempotencyKey = rawKey;
      return next();

    } catch (err) {
      // Store error — do not block the request; log and proceed.
      console.error('[idempotency] Store error:', err.message);
      return next();
    }
  };
}

module.exports = { idempotent, setIdempotencyStore, IdempotencyStore, NullStore };
