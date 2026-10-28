'use strict';

/**
 * src/services/transition.js
 *
 * Central state-machine validator and audit event writer.
 *
 * Spec §3 (authoritative): every status change on AccessRequest, ServiceRequest,
 * Referral, Incident, and Document MUST pass through this function.
 * Direct status updates in controllers or repositories are forbidden.
 *
 * Implemented in: Step 06 (Access Requests & State Machine).
 *
 * Interface (to be implemented):
 *
 *   transition(entity, toState, actor, reason, options)
 *     → { entity: updatedEntity, auditEvent }
 *
 * @param {object} entity       - The database record being transitioned.
 *                                Must have `id`, `status`, and entity-type metadata.
 * @param {string} toState      - Target status label (e.g. 'APPROVED').
 * @param {object} actor        - req.user — { sub, role, memberships }.
 * @param {string} reason       - Human-readable reason (required for most transitions).
 * @param {object} [options]    - { trx: KnexTransaction, overrideChecks: [...] }
 *
 * @returns {Promise<{ entity: object, auditEvent: object }>}
 * @throws  AppError('INVALID_TRANSITION')  – if the transition is not allowed.
 * @throws  AppError('FORBIDDEN')           – if the actor's role is not permitted.
 *
 * Transition tables by entity type are defined in each module's state-machine
 * config (modules/{domain}/stateMachine.js) and validated here.
 */

// Placeholder — full implementation in Step 06.
async function transition(_entity, _toState, _actor, _reason, _options = {}) {
  throw new Error(
    '[transition] Not yet implemented. This service will be built in Step 06 ' +
    '(Access Requests & State Machine).'
  );
}

module.exports = { transition };
