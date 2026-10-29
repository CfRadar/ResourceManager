'use strict';

/**
 * src/services/aiClient.js
 *
 * HTTP client for calls from Express → Python UviAge AI service.
 *
 * Security (spec §3, Step 02):
 *   Every request includes:
 *     X-Internal-Key: <AI_INTERNAL_KEY>   — shared secret, validated in Python service
 *     X-User-Id: <req.user.sub>           — for audit and telemetry on the AI side
 *
 * Design:
 *   - Uses Node's built-in `fetch` (Node 18+).
 *   - Throws AppError on non-2xx responses so callers get standard error envelopes.
 *   - Never logs the internal key value — only its presence.
 *   - AI_INTERNAL_KEY is optional in dev (env.js has it as optional); log a
 *     warning if missing so the issue is caught before production.
 *
 * Usage:
 *   const aiClient = require('../services/aiClient');
 *   const result   = await aiClient.post('/ai/parse-need', { text }, req.user.sub);
 */

const env    = require('../config/env');
const { Errors } = require('../utils/AppError');

const BASE_URL = env.AI_SERVICE_URL; // e.g. 'http://localhost:8000'

if (!env.AI_INTERNAL_KEY && env.NODE_ENV !== 'test') {
  // eslint-disable-next-line no-console
  console.warn(
    '[aiClient] ⚠ AI_INTERNAL_KEY is not set. Requests to the AI service will lack the ' +
    'X-Internal-Key header. Set this in your .env before going to production.'
  );
}

/**
 * Build standard headers for every call to the AI service.
 * @param {string} [userId] - Authenticated user ID for audit; undefined for system calls.
 * @returns {Record<string, string>}
 */
function buildHeaders(userId) {
  const headers = {
    'Content-Type':  'application/json',
    'Accept':        'application/json',
  };

  if (env.AI_INTERNAL_KEY) {
    headers['X-Internal-Key'] = env.AI_INTERNAL_KEY;
  }

  if (userId) {
    headers['X-User-Id'] = String(userId);
  }

  return headers;
}

/**
 * Internal fetch wrapper. Throws an AppError on non-2xx responses.
 * @param {string} path   - Relative path (e.g. '/ai/parse-need').
 * @param {object} options - fetch options.
 * @returns {Promise<object>} Parsed JSON response body.
 */
async function request(path, options) {
  const url = `${BASE_URL}${path}`;

  let response;
  try {
    response = await fetch(url, { ...options, signal: AbortSignal.timeout(30_000) });
  } catch (err) {
    throw Errors.InternalError(
      `AI service is unreachable at ${BASE_URL}. Check that UviAge is running.`
    );
  }

  let body;
  try {
    body = await response.json();
  } catch {
    throw Errors.InternalError('AI service returned a non-JSON response.');
  }

  if (!response.ok) {
    throw Errors.InternalError(
      `AI service returned ${response.status}: ${body?.detail || body?.message || 'Unknown error'}`
    );
  }

  return body;
}

/**
 * POST to the AI service.
 * @param {string}  path
 * @param {object}  payload
 * @param {string}  [userId]
 */
function post(path, payload, userId) {
  return request(path, {
    method:  'POST',
    headers: buildHeaders(userId),
    body:    JSON.stringify(payload),
  });
}

/**
 * GET from the AI service.
 * @param {string} path
 * @param {string} [userId]
 */
function get(path, userId) {
  return request(path, {
    method:  'GET',
    headers: buildHeaders(userId),
  });
}

module.exports = { post, get };
