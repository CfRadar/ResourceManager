'use strict';

/**
 * src/modules/incidents/incidents.service.js
 *
 * Business logic for incident reporting, impartial rulings, and appeals.
 * Spec §4.16, Step 09.
 */

const { incidentRepo }       = require('./incidents.repository');
const { transition }         = require('../../services/transition');
const { appendAuditEvent }   = require('../../services/auditChain');
const { assertNoSelfApproval } = require('../../middleware/rbac');
const aiClient               = require('../../services/aiClient');
const { Errors }             = require('../../utils/AppError');

class IncidentService {
  /**
   * Reports a new incident against a booking or service request.
   */
  async report(reporterId, data) {
    const insertData = {
      booking_id:           data.bookingId || null,
      service_request_id:   data.serviceRequestId || null,
      reporter_id:          reporterId,
      type:                 data.type,
      description:          data.description,
      severity_by_reporter: data.severityByReporter || 'MEDIUM',
      occurred_at:          data.occurredAt ? new Date(data.occurredAt) : new Date(),
      status:               'REPORTED',
      appeal_count:         0,
    };

    const incident = await incidentRepo.insert(insertData);

    // Record initial incident report note
    await incidentRepo.insertNote({
      incident_id: incident.id,
      author_id:   reporterId,
      content:     data.description,
      visibility:  'SHARED',
      attachments: data.attachments || null,
    });

    await appendAuditEvent({
      actorId:    reporterId,
      actorRole:  'REQUESTER',
      action:     'INCIDENT_REPORTED',
      entityType: 'Incident',
      entityId:   incident.id,
      reason:     `Incident filed: ${data.type}`,
      visibility: 'PARTIES',
      payload:    { type: data.type, severity: data.severityByReporter },
    });

    return incident;
  }

  /**
   * Retrieves incident detail with role-gated note visibility.
   */
  async getById(id, user) {
    const incident = await incidentRepo.findDetailById(id);
    if (!incident) {
      throw Errors.NotFound('Incident not found.');
    }

    const isReporter = incident.reporter_id === user.sub;
    const isParty = incident.booking_user_id === user.sub ||
      incident.service_requester_id === user.sub;
    const isPrivileged = ['MANAGER', 'OWNER', 'ADMIN'].includes(user.role);

    if (!isReporter && !isParty && !isPrivileged) {
      throw Errors.Forbidden('Not authorized to view this incident.');
    }

    const notes = await incidentRepo.findNotes(id, {
      includeInternal: isPrivileged,
    });

    return {
      ...incident,
      notes,
    };
  }

  /**
   * Lists incidents for the authenticated user.
   */
  async listMine(userId, query) {
    return incidentRepo.findByParty(userId, query);
  }

  /**
   * Lists facility incident queue for managers.
   */
  async listFacilityQueue(facilityId, query) {
    return incidentRepo.findByFacility(facilityId, query);
  }

  /**
   * Appends an immutable note to the incident timeline.
   */
  async addNote(id, { content, visibility = 'SHARED', attachments }, author) {
    const incident = await incidentRepo.findDetailById(id);
    if (!incident) {
      throw Errors.NotFound('Incident not found.');
    }

    const isPrivileged = ['MANAGER', 'OWNER', 'ADMIN'].includes(author.role);
    // Non-staff parties can only post SHARED notes
    const effectiveVisibility = isPrivileged ? visibility : 'SHARED';

    const note = await incidentRepo.insertNote({
      incident_id: id,
      author_id:   author.sub,
      content,
      visibility:  effectiveVisibility,
      attachments: attachments || null,
    });

    await appendAuditEvent({
      actorId:    author.sub,
      actorRole:  author.role || 'USER',
      action:     'INCIDENT_NOTE_ADDED',
      entityType: 'Incident',
      entityId:   id,
      reason:     'Note appended to incident timeline',
      visibility: effectiveVisibility === 'INTERNAL' ? 'INTERNAL' : 'PARTIES',
    });

    return note;
  }

  /**
   * Manager requests additional information or evidence from parties.
   */
  async requestInfo(id, { message }, manager) {
    const incident = await incidentRepo.findDetailById(id);
    if (!incident) {
      throw Errors.NotFound('Incident not found.');
    }

    assertNoSelfApproval(manager.sub, incident.reporter_id);

    await incidentRepo.insertNote({
      incident_id: id,
      author_id:   manager.sub,
      content:     `[INFO REQUESTED]: ${message}`,
      visibility:  'SHARED',
    });

    let currentEntity = incident;
    if (incident.status === 'REPORTED') {
      const { entity: underReview } = await transition(
        'Incident',
        incident,
        'UNDER_REVIEW',
        manager,
        'Commencing investigation'
      );
      currentEntity = underReview;
    }

    const { entity } = await transition(
      'Incident',
      currentEntity,
      'INFO_REQUESTED',
      manager,
      message
    );

    return entity;
  }

  /**
   * Party provides right-of-reply statement and evidence.
   */
  async respondInfo(id, { responseContent, attachments }, party) {
    const incident = await incidentRepo.findDetailById(id);
    if (!incident) {
      throw Errors.NotFound('Incident not found.');
    }

    await incidentRepo.insertNote({
      incident_id: id,
      author_id:   party.sub,
      content:     `[RESPONSE]: ${responseContent}`,
      visibility:  'SHARED',
      attachments: attachments || null,
    });

    const { entity } = await transition(
      'Incident',
      incident,
      'UNDER_REVIEW',
      party,
      'Party submitted response and evidence'
    );

    return entity;
  }

  /**
   * Impartial ruling and resolution by facility manager / owner.
   */
  async resolve(id, { outcome, findings, remedy, reason }, reviewer) {
    const incident = await incidentRepo.findDetailById(id);
    if (!incident) {
      throw Errors.NotFound('Incident not found.');
    }

    // Strict impartiality: Reviewer cannot be reporter or a party to the incident
    assertNoSelfApproval(reviewer.sub, incident.reporter_id);
    if (reviewer.sub === incident.booking_user_id || reviewer.sub === incident.service_requester_id) {
      throw Errors.Forbidden('Reviewer is a party to the incident and cannot rule on it.');
    }

    let currentEntity = incident;
    if (incident.status === 'REPORTED') {
      const { entity: underReview } = await transition(
        'Incident',
        incident,
        'UNDER_REVIEW',
        reviewer,
        'Commencing formal review'
      );
      currentEntity = underReview;
    }

    const { entity } = await transition(
      'Incident',
      currentEntity,
      outcome,
      reviewer,
      reason,
      {
        extraUpdates: {
          findings,
          remedy:      remedy ? JSON.stringify(remedy) : null,
          reviewer_id: reviewer.sub,
        },
        payload: { outcome, remedy, findings },
      }
    );

    return entity;
  }

  /**
   * Party escalates ruling via single-level appeal to administration.
   */
  async appeal(id, { appealReason }, appellant) {
    const incident = await incidentRepo.findDetailById(id);
    if (!incident) {
      throw Errors.NotFound('Incident not found.');
    }

    if (!['RESOLVED', 'DISMISSED'].includes(incident.status)) {
      throw Errors.BadRequest('Only resolved or dismissed incidents may be appealed.');
    }

    if (incident.appeal_count >= 1) {
      throw Errors.BadRequest('Maximum of 1 appeal permitted per incident.');
    }

    await incidentRepo.insertNote({
      incident_id: id,
      author_id:   appellant.sub,
      content:     `[APPEAL FILED]: ${appealReason}`,
      visibility:  'SHARED',
    });

    const { entity: appealed } = await transition(
      'Incident',
      incident,
      'APPEALED',
      appellant,
      appealReason,
      { extraUpdates: { appeal_count: incident.appeal_count + 1 } }
    );

    const { entity: underSecondaryReview } = await transition(
      'Incident',
      appealed,
      'UNDER_REVIEW',
      appellant,
      'Escalated to secondary review committee'
    );

    return underSecondaryReview;
  }

  /**
   * Generates AI-assisted factual summary draft of incident dossier.
   */
  async draftSummary(id, manager) {
    const incident = await incidentRepo.findDetailById(id);
    if (!incident) {
      throw Errors.NotFound('Incident not found.');
    }

    let draft = null;
    let source = 'AI';

    try {
      const response = await aiClient.post(
        '/ai/incident-summary',
        { incidentId: id },
        manager.sub
      );
      if (response?.summary) {
        draft = response.summary;
      }
    } catch (err) {
      source = 'DETERMINISTIC_FALLBACK';
    }

    if (!draft) {
      draft = `Incident Dossier Summary:
Type: ${incident.type}
Severity: ${incident.severity_by_reporter || 'MEDIUM'}
Description: ${incident.description}
Current Status: ${incident.status}
Appeal Count: ${incident.appeal_count}`;
    }

    return {
      incidentId: id,
      summary:    draft,
      source,
      demo:       true,
    };
  }
}

const incidentService = new IncidentService();

module.exports = {
  IncidentService,
  incidentService,
};

