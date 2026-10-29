'use strict';

/**
 * src/modules/audit/audit.service.js
 *
 * Implements tamper-evident audit event queries, scoped chain verification,
 * and clarification notes appending per Spec §4.20.
 */

const { db } = require('../../config/db');
const { Errors } = require('../../utils/AppError');
const { appendAuditEvent, verifyChain } = require('../../services/auditChain');

class AuditService {
  /**
   * Retrieves timeline for a single entity (AccessRequest, Booking, ServiceRequest, etc.).
   * Requester sees non-internal events only (visibility = 'PARTIES').
   * Staff/Managers see all events including INTERNAL.
   */
  async getEntityAudit(entityId, actor) {
    const isPlatformAdmin = actor.role === 'PLATFORM_ADMIN';
    const isStaff = (actor.memberships || []).some((m) =>
      ['ADMIN', 'MANAGER', 'OWNER', 'OPERATOR'].includes(m.role)
    );

    let query = db('audit_events')
      .where({ entity_id: entityId })
      .orderBy('seq', 'asc');

    if (!isPlatformAdmin && !isStaff) {
      query = query.where({ visibility: 'PARTIES' });
    }

    const events = await query;
    return events.map((e) => ({
      ...e,
      payload: typeof e.payload === 'string' ? JSON.parse(e.payload) : e.payload,
    }));
  }

  /**
   * Retrieves audit and policy history for a resource.
   */
  async getResourceAudit(resourceId, actor) {
    const resource = await db('resources').where({ id: resourceId }).first();
    if (!resource) {
      throw Errors.NotFound('Resource not found.');
    }

    const isPlatformAdmin = actor.role === 'PLATFORM_ADMIN';
    const isStaff = (actor.memberships || []).some((m) =>
      ['ADMIN', 'MANAGER', 'OWNER'].includes(m.role)
    );

    if (!isPlatformAdmin && !isStaff) {
      throw Errors.Forbidden('Only staff or administrators may view resource audit history.');
    }

    const events = await db('audit_events')
      .where(function () {
        this.where({ resource_id: resourceId })
          .orWhere({ entity_id: resourceId, entity_type: 'Resource' });
      })
      .orderBy('seq', 'desc');

    return events.map((e) => ({
      ...e,
      payload: typeof e.payload === 'string' ? JSON.parse(e.payload) : e.payload,
    }));
  }

  /**
   * Retrieves filterable audit trail for an institution.
   */
  async getInstitutionAudit(institutionId, actor, filters = {}) {
    const isPlatformAdmin = actor.role === 'PLATFORM_ADMIN';
    const isInstAdmin = (actor.memberships || []).some(
      (m) => m.institutionId === institutionId && m.role === 'ADMIN'
    );

    if (!isPlatformAdmin && !isInstAdmin) {
      throw Errors.Forbidden('Only institution administrators or platform admins may view institution audit logs.');
    }

    const { actor: actorFilter, action, from, to, page = 1, pageSize = 20 } = filters;
    const offset = (Math.max(1, page) - 1) * pageSize;

    // Get resources belonging to this institution
    const institutionFacilities = await db('facilities')
      .where({ institution_id: institutionId })
      .select('id');
    const facilityIds = institutionFacilities.map((f) => f.id);

    const institutionResources = await db('resources')
      .whereIn('facility_id', facilityIds)
      .select('id');
    const resourceIds = institutionResources.map((r) => r.id);

    let baseQuery = db('audit_events').where(function () {
      this.whereIn('resource_id', resourceIds)
        .orWhereIn('entity_id', resourceIds)
        .orWhere({ entity_type: 'Institution', entity_id: institutionId });
    });

    if (actorFilter) {
      baseQuery = baseQuery.where({ actor_id: actorFilter });
    }
    if (action) {
      baseQuery = baseQuery.where({ action });
    }
    if (from) {
      baseQuery = baseQuery.where('at', '>=', new Date(from));
    }
    if (to) {
      baseQuery = baseQuery.where('at', '<=', new Date(to));
    }

    const [countResult] = await baseQuery.clone().count('* as total');
    const total = parseInt(countResult?.total || '0', 10);

    const events = await baseQuery
      .orderBy('seq', 'desc')
      .limit(pageSize)
      .offset(offset);

    const parsedEvents = events.map((e) => ({
      ...e,
      payload: typeof e.payload === 'string' ? JSON.parse(e.payload) : e.payload,
    }));

    return {
      items: parsedEvents,
      pagination: {
        page: Number(page),
        pageSize: Number(pageSize),
        total,
        totalPages: Math.ceil(total / pageSize) || 1,
      },
    };
  }

  /**
   * Recomputes SHA-256 hash chain for a given scope.
   */
  async verifyAuditChain(scope, scopeId, actor) {
    const isPlatformAdmin = actor.role === 'PLATFORM_ADMIN';
    const isStaff = (actor.memberships || []).some((m) =>
      ['ADMIN', 'MANAGER', 'OWNER'].includes(m.role)
    );

    if (!isPlatformAdmin && !isStaff) {
      throw Errors.Forbidden('Only staff or administrators may verify audit hash chains.');
    }

    const verification = await verifyChain(scope, scopeId);
    return verification;
  }

  /**
   * Appends a clarification note referencing an earlier audit event.
   * Spec §4.20: Never edits the original event; appends an immutable AUDIT_NOTE_ADDED event.
   */
  async addClarificationNote(actor, { targetEventId, note, reason = null }) {
    const isPlatformAdmin = actor.role === 'PLATFORM_ADMIN';
    const isStaff = (actor.memberships || []).some((m) =>
      ['ADMIN', 'MANAGER', 'OWNER'].includes(m.role)
    );

    if (!isPlatformAdmin && !isStaff) {
      throw Errors.Forbidden('Only staff or administrators may append audit clarification notes.');
    }

    const targetEvent = await db('audit_events').where({ id: targetEventId }).first();
    if (!targetEvent) {
      throw Errors.NotFound('Target audit event not found.');
    }

    const newEvent = await appendAuditEvent({
      actorId:    actor.sub,
      actorRole:  actor.role,
      action:     'AUDIT_NOTE_ADDED',
      entityType: targetEvent.entity_type,
      entityId:   targetEvent.entity_id,
      resourceId: targetEvent.resource_id,
      reason:     reason || 'Clarification note attached to earlier audit event',
      visibility: 'INTERNAL',
      payload:    {
        targetEventId: targetEvent.id,
        targetAction:  targetEvent.action,
        note,
      },
    });

    return {
      ...newEvent,
      payload: typeof newEvent.payload === 'string' ? JSON.parse(newEvent.payload) : newEvent.payload,
    };
  }
}

module.exports = new AuditService();
