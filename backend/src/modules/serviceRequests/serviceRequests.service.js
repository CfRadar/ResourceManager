'use strict';

/**
 * src/modules/serviceRequests/serviceRequests.service.js
 *
 * Core business domain logic for staff-operated service requests.
 * Spec §4.13, Step 08.
 */

const { serviceRequestRepo } = require('./serviceRequests.repository');
const { resourceRepo }       = require('../resources/resources.repository');
const { policyRepo }         = require('../policies/policies.repository');
const { facilityRepo }       = require('../facilities/facilities.repository');
const { transition }         = require('../../services/transition');
const { assertNoSelfApproval } = require('../../middleware/rbac');
const { Errors }             = require('../../utils/AppError');
const { appendAuditEvent }   = require('../../services/auditChain');

class ServiceRequestService {
  /**
   * Creates a new staff-operated service request.
   */
  async create(requesterId, data) {
    // 1. Verify resource existence & visibility
    const resource = await resourceRepo.findById(data.resourceId);
    if (!resource || resource.is_active === false) {
      throw Errors.NotFound('Resource not found or is currently inactive.');
    }

    // 2. Validate that resource supports STAFF_SERVICE access mode
    const policy = await policyRepo.findCurrentPolicy(data.resourceId);
    const policyModes = policy?.policyData?.supportedAccessModes || resource.access_modes || [];
    if (!policyModes.includes('STAFF_SERVICE')) {
      throw Errors.BadRequest(
        'This resource does not support staff-operated services (STAFF_SERVICE access mode not permitted).'
      );
    }

    const facilityId = resource.facility_id;
    const initialStatus = data.asDraft ? 'DRAFT' : 'SUBMITTED';

    const insertData = {
      resource_id:            data.resourceId,
      requester_id:           requesterId,
      facility_id:            facilityId,
      description:            data.description,
      expected_output:        data.expectedOutput || null,
      submitted_materials:    data.submittedMaterials ? JSON.stringify(data.submittedMaterials) : null,
      estimated_timeline:     data.estimatedTimeline ? JSON.stringify(data.estimatedTimeline) : null,
      status:                 initialStatus,
      policy_version_applied: policy?.policyVersion || 1,
    };

    const request = await serviceRequestRepo.insert(insertData);

    if (initialStatus === 'SUBMITTED') {
      await appendAuditEvent({
        actorId:    requesterId,
        actorRole:  'REQUESTER',
        action:     'SERVICE_REQUEST_SUBMITTED',
        entityType: 'ServiceRequest',
        entityId:   request.id,
        resourceId: resource.id,
        reason:     'Service request submitted by requester',
        visibility: 'PARTIES',
        payload:    { description: data.description },
      });
    }

    return request;
  }

  /**
   * Retrieves detail of a single service request with its active quote.
   */
  async getById(id, user) {
    const request = await serviceRequestRepo.findDetailById(id);
    if (!request) {
      throw Errors.NotFound('Service request not found.');
    }

    const isRequester = request.requester_id === user.sub;
    const isOperator = request.assigned_operator_id === user.sub;
    const isPrivileged = ['MANAGER', 'OPERATOR', 'OWNER', 'ADMIN'].includes(user.role);

    if (!isRequester && !isOperator && !isPrivileged) {
      throw Errors.Forbidden('You are not authorized to view this service request.');
    }

    const activeQuote = await serviceRequestRepo.findActiveQuote(id);

    return {
      ...request,
      quote: activeQuote || null,
    };
  }

  /**
   * Lists service requests for the authenticated user.
   */
  async listMine(userId, query) {
    return serviceRequestRepo.findByRequester(userId, query);
  }

  /**
   * Lists facility queue for lab managers and operators.
   */
  async listFacilityQueue(facilityId, query, user) {
    const facility = await facilityRepo.findById(facilityId);
    if (!facility) {
      throw Errors.NotFound('Facility not found.');
    }

    return serviceRequestRepo.findByFacility(facilityId, query);
  }

  /**
   * Reviews scope feasibility (Manager/Operator).
   */
  async reviewScope(id, data, reviewer) {
    const request = await serviceRequestRepo.findDetailById(id);
    if (!request) {
      throw Errors.NotFound('Service request not found.');
    }

    assertNoSelfApproval(reviewer.sub, request.requester_id);

    const targetStatus = data.feasible ? 'SCOPE_REVIEW' : 'NOT_FEASIBLE';

    const { entity } = await transition(
      'ServiceRequest',
      request,
      targetStatus,
      reviewer,
      data.notes,
      {
        extraUpdates: {
          scope_assessment:     data.notes,
          assigned_operator_id: data.assignedOperatorId || request.assigned_operator_id,
        },
      }
    );

    return entity;
  }

  /**
   * Issues cost estimate quote with itemized line items (Manager).
   */
  async issueQuote(id, quoteData, reviewer) {
    const request = await serviceRequestRepo.findDetailById(id);
    if (!request) {
      throw Errors.NotFound('Service request not found.');
    }

    assertNoSelfApproval(reviewer.sub, request.requester_id);

    const totalCost = quoteData.totalCost != null
      ? quoteData.totalCost
      : quoteData.lineItems.reduce((acc, item) => acc + Number(item.cost || 0), 0);

    const quote = await serviceRequestRepo.createQuote({
      service_request_id: id,
      line_items:         quoteData.lineItems,
      total_cost:         totalCost,
      currency:           quoteData.currency || 'INR',
      notes:              quoteData.notes || null,
      status:             'PENDING',
    });

    const { entity } = await transition(
      'ServiceRequest',
      request,
      'QUOTE_SENT',
      reviewer,
      quoteData.notes || 'Quote issued to requester',
      { payload: { quoteId: quote.id, totalCost } }
    );

    return { request: entity, quote };
  }

  /**
   * Requester responds to quote (ACCEPT or DECLINE).
   */
  async respondQuote(id, { decision, note }, requester) {
    const request = await serviceRequestRepo.findDetailById(id);
    if (!request) {
      throw Errors.NotFound('Service request not found.');
    }

    if (request.requester_id !== requester.sub) {
      throw Errors.Forbidden('Only the requester can accept or decline a quote.');
    }

    const activeQuote = await serviceRequestRepo.findActiveQuote(id);
    if (!activeQuote) {
      throw Errors.BadRequest('No active quote found for this service request.');
    }

    if (decision === 'ACCEPT') {
      await serviceRequestRepo.updateQuoteStatus(activeQuote.id, 'ACCEPTED');

      const targetStatus = request.submitted_materials
        ? 'SERVICE_IN_PROGRESS'
        : 'AWAITING_MATERIALS';

      const { entity } = await transition(
        'ServiceRequest',
        request,
        'QUOTE_ACCEPTED',
        requester,
        note || 'Requester accepted quote'
      );

      // Auto advance to AWAITING_MATERIALS
      const { entity: finalEntity } = await transition(
        'ServiceRequest',
        entity,
        targetStatus,
        requester,
        'Advancing to material intake'
      );

      return { request: finalEntity, decision: 'ACCEPTED' };
    }

    // DECLINE flow
    await serviceRequestRepo.updateQuoteStatus(activeQuote.id, 'DECLINED');

    const { entity } = await transition(
      'ServiceRequest',
      request,
      'QUOTE_DECLINED',
      requester,
      note || 'Requester declined quote'
    );

    const { entity: closedEntity } = await transition(
      'ServiceRequest',
      entity,
      'CLOSED',
      requester,
      'Service request closed following quote decline'
    );

    return { request: closedEntity, decision: 'DECLINED' };
  }

  /**
   * Operator records physical sample receipt.
   */
  async recordMaterialsReceived(id, data, operator) {
    const request = await serviceRequestRepo.findDetailById(id);
    if (!request) {
      throw Errors.NotFound('Service request not found.');
    }

    const { entity } = await transition(
      'ServiceRequest',
      request,
      'MATERIALS_RECEIVED',
      operator,
      data.notes || 'Physical sample intake recorded',
      { payload: data }
    );

    return entity;
  }

  /**
   * Operator updates service progress milestones.
   */
  async updateProgress(id, { stage, note }, operator) {
    const request = await serviceRequestRepo.findDetailById(id);
    if (!request) {
      throw Errors.NotFound('Service request not found.');
    }

    let currentEntity = request;
    if (request.status !== 'SERVICE_IN_PROGRESS') {
      const { entity } = await transition(
        'ServiceRequest',
        request,
        'SERVICE_IN_PROGRESS',
        operator,
        note
      );
      currentEntity = entity;
    }

    await appendAuditEvent({
      actorId:    operator.sub,
      actorRole:  operator.role || 'OPERATOR',
      action:     `SERVICE_PROGRESS_${stage}`,
      entityType: 'ServiceRequest',
      entityId:   id,
      resourceId: request.resource_id,
      reason:     note,
      visibility: 'PARTIES',
      payload:    { stage, note },
    });

    return currentEntity;
  }

  /**
   * Operator delivers final outputs and reports.
   */
  async deliverOutput(id, data, operator) {
    const request = await serviceRequestRepo.findDetailById(id);
    if (!request) {
      throw Errors.NotFound('Service request not found.');
    }

    const { entity } = await transition(
      'ServiceRequest',
      request,
      'OUTPUT_DELIVERED',
      operator,
      data.summaryNotes,
      {
        extraUpdates: {
          expected_output: data.summaryNotes,
        },
        payload: data,
      }
    );

    return entity;
  }

  /**
   * Requester confirms completion or disputes outcome.
   */
  async confirmCompletion(id, { confirmed, disputeReason }, requester) {
    const request = await serviceRequestRepo.findDetailById(id);
    if (!request) {
      throw Errors.NotFound('Service request not found.');
    }

    if (request.requester_id !== requester.sub) {
      throw Errors.Forbidden('Only the requester can confirm completion.');
    }

    if (confirmed) {
      const { entity } = await transition(
        'ServiceRequest',
        request,
        'COMPLETED',
        requester,
        'Requester confirmed completion'
      );

      const { entity: closedEntity } = await transition(
        'ServiceRequest',
        entity,
        'CLOSED',
        requester,
        'Service request closed successfully'
      );

      return { request: closedEntity, status: 'CLOSED' };
    }

    // Dispute flow -> triggers INCIDENT_REPORTED
    const { entity } = await transition(
      'ServiceRequest',
      request,
      'INCIDENT_REPORTED',
      requester,
      disputeReason || 'Requester disputed deliverables',
      { payload: { disputeReason } }
    );

    return { request: entity, status: 'INCIDENT_REPORTED' };
  }

  /**
   * Manager rejects service request with mandatory reason.
   */
  async reject(id, { reason }, reviewer) {
    const request = await serviceRequestRepo.findDetailById(id);
    if (!request) {
      throw Errors.NotFound('Service request not found.');
    }

    assertNoSelfApproval(reviewer.sub, request.requester_id);

    const { entity } = await transition(
      'ServiceRequest',
      request,
      'REJECTED',
      reviewer,
      reason
    );

    return entity;
  }

  /**
   * Requester cancels service request.
   */
  async cancel(id, { reason }, requester) {
    const request = await serviceRequestRepo.findDetailById(id);
    if (!request) {
      throw Errors.NotFound('Service request not found.');
    }

    const isOwner = request.requester_id === requester.sub;
    const isPrivileged = ['MANAGER', 'ADMIN'].includes(requester.role);
    if (!isOwner && !isPrivileged) {
      throw Errors.Forbidden('Not authorized to cancel this service request.');
    }

    const { entity } = await transition(
      'ServiceRequest',
      request,
      'CANCELLED',
      requester,
      reason || 'Cancelled by requester',
      { extraUpdates: { cancellation_reason: reason || null } }
    );

    return entity;
  }
}

const serviceRequestService = new ServiceRequestService();

module.exports = {
  ServiceRequestService,
  serviceRequestService,
};

