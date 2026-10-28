'use strict';

/**
 * src/services/auditChain.js
 *
 * SHA-256 tamper-evident hash chain for audit events.
 *
 * Spec §4.20: every critical event produces an immutable, SHA-256 chained
 * audit record. The hash chain makes the log tamper-evident without a
 * real blockchain (spec explicitly says: do not call it a blockchain).
 *
 * hash = SHA256(prevHash + canonicalJSON(event without hash))
 *
 * Implemented in: Step 10 (Background Jobs & Audit Chain).
 *
 * Interface (to be implemented):
 *
 *   appendAuditEvent(event, options)
 *     → { auditEvent: { id, seq, hash, prevHash, ... } }
 *
 *   verifyChain(scope, scopeId)
 *     → { valid: boolean, firstBrokenEventId?: string }
 *
 * @param {object} event
 *   @param {string} event.actorId
 *   @param {string} event.actorRole
 *   @param {string} event.action      - e.g. 'ACCESS_REQUEST_APPROVED'
 *   @param {string} event.entityType
 *   @param {string} event.entityId
 *   @param {string} [event.resourceId]
 *   @param {string} [event.reason]
 *   @param {'PARTIES'|'INTERNAL'} event.visibility
 *   @param {object} [event.payload]   - { before, after }
 * @param {object} [options]
 *   @param {object} [options.trx]     - Knex transaction
 */

// Placeholder — full implementation in Step 10.
async function appendAuditEvent(_event, _options = {}) {
  throw new Error(
    '[auditChain] Not yet implemented. This service will be built in Step 10 ' +
    '(Background Jobs & Audit Chain).'
  );
}

async function verifyChain(_scope, _scopeId) {
  throw new Error('[auditChain] Not yet implemented. Step 10.');
}

module.exports = { appendAuditEvent, verifyChain };
