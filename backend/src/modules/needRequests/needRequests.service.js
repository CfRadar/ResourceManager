'use strict';

/**
 * src/modules/needRequests/needRequests.service.js
 *
 * Business logic for missing-resource requests and candidate discovery.
 * Spec §4.14, Step 08.
 */

const { needRequestRepo }  = require('./needRequests.repository');
const { transition }       = require('../../services/transition');
const { appendAuditEvent } = require('../../services/auditChain');
const aiClient             = require('../../services/aiClient');
const { Errors }           = require('../../utils/AppError');

class NeedRequestService {
  /**
   * Creates a missing-resource request.
   */
  async create(requesterId, data) {
    const initialStatus = data.asDraft ? 'DRAFT' : 'SUBMITTED';

    const capabilities = data.requiredCapabilities ||
      data.technicalRequirements ||
      (data.capabilityNeeded ? [data.capabilityNeeded] : []);

    const insertData = {
      requester_id:           requesterId,
      free_text:              data.description,
      category:               data.category || data.capabilityNeeded || 'General Equipment',
      description:            data.description,
      required_capabilities:  JSON.stringify(capabilities),
      preferred_dates:        data.preferredDates ? JSON.stringify(data.preferredDates) : null,
      access_mode_preference: data.accessModePreference || 'INDEPENDENT',
      consent_share_contact:  Boolean(data.consentShareContact),
      status:                 initialStatus,
    };

    const record = await needRequestRepo.insert(insertData);

    if (initialStatus === 'SUBMITTED') {
      await appendAuditEvent({
        actorId:    requesterId,
        actorRole:  'REQUESTER',
        action:     'NEED_REQUEST_SUBMITTED',
        entityType: 'NeedRequest',
        entityId:   record.id,
        reason:     'Missing-resource need request submitted',
        visibility: 'PARTIES',
        payload:    { category: record.category, capabilities },
      });
    }

    return record;
  }

  /**
   * Retrieves detail of a single need request.
   */
  async getById(id, user) {
    const record = await needRequestRepo.findDetailById(id);
    if (!record) {
      throw Errors.NotFound('Need request not found.');
    }

    const isRequester = record.requester_id === user.sub;
    const isPrivileged = ['COORDINATOR', 'ADMIN', 'MANAGER'].includes(user.role);

    if (!isRequester && !isPrivileged) {
      throw Errors.Forbidden('Not authorized to view this need request.');
    }

    return record;
  }

  /**
   * Lists need requests submitted by the caller.
   */
  async listMine(userId, query) {
    return needRequestRepo.findByRequester(userId, query);
  }

  /**
   * Lists open need requests for network coordinators.
   */
  async listCoordinatorQueue(query) {
    return needRequestRepo.findCoordinatorQueue(query);
  }

  /**
   * Discovers candidate partner resources via AI matching engine or deterministic fallback.
   */
  async getCandidates(id, user) {
    const need = await needRequestRepo.findDetailById(id);
    if (!need) {
      throw Errors.NotFound('Need request not found.');
    }

    let candidates = [];
    let source = 'AI';

    // 1. Attempt AI matching
    try {
      const aiResponse = await aiClient.post(
        '/ai/match-need',
        {
          text:        need.description || need.category,
          userContext: { userId: user.sub, userGroup: 'INTERNAL_STAFF' },
        },
        user.sub
      );

      if (aiResponse?.candidates && Array.isArray(aiResponse.candidates) && aiResponse.candidates.length > 0) {
        candidates = aiResponse.candidates.map((c) => ({
          resourceId:      c.resourceId || c.id,
          resourceName:    c.name || c.resourceName,
          facilityId:      c.facilityId,
          facilityName:    c.facilityName,
          institutionId:   c.institutionId,
          institutionName: c.institutionName,
          matchType:       c.matchType || 'AVAILABLE_LISTING',
          reasons:         c.reasons || ['Matched by AI vector similarity'],
          source:          'AI',
        }));
      }
    } catch (err) {
      // Graceful fallback to deterministic keyword/category search
      source = 'KEYWORD_FALLBACK';
    }

    // 2. Deterministic keyword fallback if AI is cold or returned no items
    if (candidates.length === 0) {
      const capabilities = Array.isArray(need.required_capabilities)
        ? need.required_capabilities
        : [];

      const rows = await needRequestRepo.findCandidateResources({
        category:     need.category,
        capabilities,
      });

      candidates = rows.map((r) => ({
        resourceId:      r.resource_id,
        resourceName:    r.resource_name,
        facilityId:      r.facility_id,
        facilityName:    r.facility_name,
        institutionId:   r.institution_id,
        institutionName: r.institution_name,
        matchType:       'POTENTIAL_NEEDS_VERIFICATION',
        reasons:         [
          `Matches category: ${r.resource_category || need.category}`,
          'Partner institution listing',
        ],
        source:          'KEYWORD_FALLBACK',
      }));
    }

    // Advance status to CANDIDATE_IDENTIFIED if in early review stages
    if (candidates.length > 0 && ['SUBMITTED', 'UNDER_COORDINATOR_REVIEW'].includes(need.status)) {
      try {
        await transition(
          'NeedRequest',
          need,
          'CANDIDATE_IDENTIFIED',
          user,
          `Discovered ${candidates.length} potential matching candidate(s)`
        );
      } catch (err) {
        // Non-blocking transition
      }
    }

    return {
      needRequestId: id,
      candidates,
      total:         candidates.length,
      engine:        source,
    };
  }

  /**
   * Closes a need request with resolution outcome.
   */
  async close(id, { outcome, closeReason }, coordinator) {
    const need = await needRequestRepo.findDetailById(id);
    if (!need) {
      throw Errors.NotFound('Need request not found.');
    }

    const { entity } = await transition(
      'NeedRequest',
      need,
      outcome,
      coordinator,
      closeReason,
      {
        extraUpdates: {
          close_reason:   closeReason,
          coordinator_id: coordinator.sub,
        },
      }
    );

    return entity;
  }
}

const needRequestService = new NeedRequestService();

module.exports = {
  NeedRequestService,
  needRequestService,
};

