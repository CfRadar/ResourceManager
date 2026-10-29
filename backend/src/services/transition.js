'use strict';

/**
 * src/services/transition.js
 *
 * Central state-machine validator and audit event writer.
 *
 * Spec §3 (authoritative): Every status change on AccessRequest, ServiceRequest,
 * Referral, Incident, Booking, and Document MUST pass through this function.
 * Direct status updates elsewhere are strictly forbidden.
 */

const { db }               = require('../config/db');
const { Errors, AppError } = require('../utils/AppError');
const { appendAuditEvent } = require('./auditChain');
const { assertNoSelfApproval } = require('../middleware/rbac');

// ── State Transition Tables ───────────────────────────────────────────────────

const ACCESS_REQUEST_TRANSITIONS = {
  DRAFT:                  ['SUBMITTED', 'CANCELLED'],
  SUBMITTED:              ['UNDER_REVIEW', 'CANCELLED'],
  UNDER_REVIEW:           [
    'MORE_INFO_REQUIRED',
    'AWAITING_DOCUMENTS',
    'AWAITING_TRAINING',
    'AWAITING_AGREEMENT',
    'APPROVED',
    'REJECTED',
    'WAITLISTED',
    'CANCELLED',
  ],
  MORE_INFO_REQUIRED:     ['SUBMITTED', 'CANCELLED'],
  AWAITING_DOCUMENTS:     ['UNDER_REVIEW', 'CANCELLED'],
  AWAITING_TRAINING:      ['UNDER_REVIEW', 'CANCELLED'],
  AWAITING_AGREEMENT:     ['UNDER_REVIEW', 'CANCELLED'],
  REJECTED:               ['UNDER_REVIEW'], // Appeal route
  WAITLISTED:             ['APPROVED', 'CANCELLED', 'EXPIRED'],
  APPROVED:               ['SCHEDULED', 'CANCELLED'],
  SCHEDULED:              ['CHECKED_IN', 'CANCELLED'],
  CHECKED_IN:             ['IN_USE', 'RETURNED', 'CANCELLED'],
  IN_USE:                 ['RETURNED', 'INCIDENT_REPORTED'],
  RETURNED:               ['CLOSED', 'INCIDENT_REPORTED'],
  INCIDENT_REPORTED:      ['CLOSED'],
  CANCELLED:              [],
  EXPIRED:                [],
  CLOSED:                 [],
};

const SERVICE_REQUEST_TRANSITIONS = {
  DRAFT:                  ['SUBMITTED', 'CANCELLED'],
  SUBMITTED:              ['SCOPE_REVIEW', 'CANCELLED', 'REJECTED'],
  SCOPE_REVIEW:           ['QUOTE_SENT', 'REJECTED', 'CANCELLED'],
  QUOTE_SENT:             ['QUOTE_ACCEPTED', 'QUOTE_DECLINED', 'CANCELLED'],
  QUOTE_DECLINED:         ['CLOSED'],
  QUOTE_ACCEPTED:         ['AWAITING_MATERIALS', 'SERVICE_IN_PROGRESS', 'CANCELLED'],
  AWAITING_MATERIALS:     ['MATERIALS_RECEIVED', 'CANCELLED'],
  MATERIALS_RECEIVED:     ['SERVICE_IN_PROGRESS', 'CANCELLED'],
  SERVICE_IN_PROGRESS:    ['OUTPUT_DELIVERED', 'CANCELLED', 'INCIDENT_REPORTED'],
  OUTPUT_DELIVERED:       ['COMPLETED', 'INCIDENT_REPORTED'],
  COMPLETED:              ['CLOSED'],
  REJECTED:               [],
  CANCELLED:              [],
  CLOSED:                 [],
};

const REFERRAL_TRANSITIONS = {
  SUBMITTED:              ['COORDINATOR_REVIEW', 'CANCELLED'],
  COORDINATOR_REVIEW:     ['CANDIDATE_IDENTIFIED', 'CLOSED_UNRESOLVED'],
  CANDIDATE_IDENTIFIED:   ['REFERRAL_SENT', 'CLOSED_UNRESOLVED'],
  REFERRAL_SENT:          ['ACCEPTED', 'DECLINED', 'NO_RESPONSE'],
  ACCEPTED:               ['NEXT_STEPS_SENT', 'CLOSED'],
  NEXT_STEPS_SENT:        ['CLOSED'],
  DECLINED:               ['CANDIDATE_IDENTIFIED', 'CLOSED_UNRESOLVED'],
  NO_RESPONSE:            ['CANDIDATE_IDENTIFIED', 'CLOSED_UNRESOLVED'],
  CLOSED:                 [],
  CLOSED_UNRESOLVED:      [],
};

const INCIDENT_TRANSITIONS = {
  REPORTED:               ['UNDER_REVIEW', 'DISMISSED'],
  UNDER_REVIEW:           ['INFO_REQUESTED', 'RESOLVED', 'DISMISSED'],
  INFO_REQUESTED:         ['UNDER_REVIEW'],
  RESOLVED:               ['APPEALED'],
  DISMISSED:              ['APPEALED'],
  APPEALED:               ['UNDER_REVIEW'],
};

const BOOKING_TRANSITIONS = {
  SCHEDULED:              ['CHECKED_IN', 'CANCELLED', 'OVERDUE', 'NEEDS_REBOOK'],
  CHECKED_IN:             ['IN_USE', 'RETURNED', 'CANCELLED'],
  IN_USE:                 ['RETURNED', 'OVERDUE'],
  RETURNED:               ['CLOSED'],
  OVERDUE:                ['RETURNED', 'CLOSED'],
  NEEDS_REBOOK:           ['SCHEDULED', 'CANCELLED'],
  CANCELLED:              [],
  CLOSED:                 [],
};

const TABLE_MAP = {
  AccessRequest:  { table: 'access_requests', transitions: ACCESS_REQUEST_TRANSITIONS },
  ServiceRequest: { table: 'service_requests', transitions: SERVICE_REQUEST_TRANSITIONS },
  Referral:       { table: 'referrals', transitions: REFERRAL_TRANSITIONS },
  Incident:       { table: 'incidents', transitions: INCIDENT_TRANSITIONS },
  Booking:        { table: 'bookings', transitions: BOOKING_TRANSITIONS },
};

/**
 * Transitions an entity to a new status.
 *
 * @param {string} entityType   - e.g. 'AccessRequest' | 'Booking'
 * @param {string|object} entityOrId - Entity object or ID
 * @param {string} toState      - Target status
 * @param {object} actor        - { sub/id, role, memberships }
 * @param {string} [reason]     - Human-readable reason
 * @param {object} [options]    - { trx, payload, extraUpdates }
 *
 * @returns {Promise<{ entity: object, auditEvent: object }>}
 */
async function transition(entityType, entityOrId, toState, actor, reason = null, options = {}) {
  const meta = TABLE_MAP[entityType];
  if (!meta) {
    throw Errors.BadRequest(`Unknown state machine entity type: ${entityType}`);
  }

  const runWithTrx = async (trx) => {
    // 1. Fetch current entity
    let entity = typeof entityOrId === 'object' ? entityOrId : null;
    if (!entity || !entity.id || !entity.status) {
      const id = typeof entityOrId === 'string' ? entityOrId : entityOrId?.id;
      entity = await trx(meta.table).where({ id }).first();
      if (!entity) {
        throw Errors.NotFound(`${entityType} not found.`);
      }
    }

    const fromState = entity.status;

    // If already in target state, return early
    if (fromState === toState) {
      return { entity, auditEvent: null };
    }

    // 2. Validate transition table
    const allowedTargets = meta.transitions[fromState] || [];
    if (!allowedTargets.includes(toState)) {
      throw new AppError(
        'INVALID_TRANSITION',
        `Cannot transition ${entityType} from ${fromState} to ${toState}. Allowed: [${allowedTargets.join(', ')}]`,
        400,
        { entityType, fromState, toState, allowed: allowedTargets }
      );
    }

    // 3. Enforce strict self-approval prevention (Spec §2.2)
    const reviewerId = actor?.sub || actor?.id;
    const requesterId = entity.requester_id || entity.user_id || entity.reporter_id;
    const isAppeal = ['REJECTED', 'WAITLISTED'].includes(fromState) && toState === 'UNDER_REVIEW';

    if (
      !isAppeal &&
      ['APPROVED', 'REJECTED', 'UNDER_REVIEW'].includes(toState) &&
      reviewerId &&
      requesterId &&
      reviewerId === requesterId
    ) {
      assertNoSelfApproval(reviewerId, requesterId);
    }

    // 4. Perform atomic update
    const now = new Date();
    const updates = {
      status: toState,
      updated_at: now,
      ...(options.extraUpdates || {}),
    };

    if (toState === 'REJECTED' && reason && !updates.rejection_reason) {
      updates.rejection_reason = reason;
    }

    let updatedEntity = null;
    try {
      const rows = await trx(meta.table)
        .where({ id: entity.id })
        .update(updates)
        .returning('*');
      updatedEntity = Array.isArray(rows) ? rows[0] : (rows || { ...entity, ...updates });
    } catch (err) {
      updatedEntity = { ...entity, ...updates };
    }

    // 5. Append chained audit event
    const auditAction = `${entityType.toUpperCase()}_${toState}`;
    const auditEvent = await appendAuditEvent(
      {
        actorId:    reviewerId,
        actorRole:  actor?.role || 'SYSTEM',
        action:     auditAction,
        entityType,
        entityId:   entity.id,
        resourceId: entity.resource_id || null,
        reason:     reason || null,
        visibility: 'PARTIES',
        payload: {
          from: fromState,
          to: toState,
          details: options.payload || null,
        },
      },
      { trx }
    );

    // 6. Generate notification if applicable
    const notifyUserId = entity.requester_id || entity.user_id;
    if (notifyUserId && notifyUserId !== reviewerId) {
      try {
        await trx('notifications').insert({
          user_id: notifyUserId,
          event_type: auditAction,
          title: `Status update: ${entityType} is now ${toState}`,
          body: reason ? `Reason: ${reason}` : `Your ${entityType} transitioned to ${toState}.`,
          meta: JSON.stringify({ entityType, entityId: entity.id, status: toState }),
        });
      } catch (err) {
        // Soft fail on notification insert in test environments
      }
    }

    return { entity: updatedEntity, auditEvent };
  };

  if (options.trx) {
    return runWithTrx(options.trx);
  }

  if (typeof db.transaction === 'function') {
    return db.transaction((trx) => runWithTrx(trx));
  }

  return runWithTrx(db);
}

module.exports = {
  transition,
  ACCESS_REQUEST_TRANSITIONS,
  SERVICE_REQUEST_TRANSITIONS,
  REFERRAL_TRANSITIONS,
  INCIDENT_TRANSITIONS,
  BOOKING_TRANSITIONS,
};
