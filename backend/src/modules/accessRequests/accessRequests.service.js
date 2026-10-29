'use strict';

/**
 * src/modules/accessRequests/accessRequests.service.js
 *
 * Core domain logic for Access Requests, Review Queue, Decisions, and Appeals.
 * Spec §3.1, §4.9, §4.10, Step 06.
 */

const { accessRequestRepo }      = require('./accessRequests.repository');
const { resourceRepo }           = require('../resources/resources.repository');
const { facilityRepo }           = require('../facilities/facilities.repository');
const eligibilityEngine         = require('../../services/eligibilityEngine');
const transitionService         = require('../../services/transition');
const { getSuggestedSlots, calculateAvailabilityIntervals } = require('../../services/bookingEngine');
const { Errors, AppError }       = require('../../utils/AppError');
const { assertNoSelfApproval }   = require('../../middleware/rbac');
const { db }                     = require('../../config/db');

class AccessRequestService {
  /**
   * Submits or drafts an access request.
   */
  async createRequest(userId, data) {
    const resource = await resourceRepo.findById(data.resourceId);
    if (!resource || resource.status !== 'ACTIVE') {
      throw Errors.NotFound('Resource not found or is currently inactive.');
    }

    const facility = await facilityRepo.findById(resource.facility_id);
    if (!facility) {
      throw Errors.NotFound('Facility associated with this resource does not exist.');
    }

    // 1. If draft, save directly without hard eligibility enforcement
    if (data.isDraft) {
      const draftRecord = await accessRequestRepo.insert({
        resource_id:       data.resourceId,
        requester_id:      userId,
        access_mode:       data.accessMode,
        start_at:          data.startAt || null,
        end_at:            data.endAt || null,
        purpose:           data.purpose,
        outside_materials: data.outsideMaterials ? JSON.stringify(data.outsideMaterials) : null,
        acknowledgments:   data.acknowledgments ? JSON.stringify(data.acknowledgments) : null,
        status:            'DRAFT',
      });
      return { request: draftRecord, eligibility: null };
    }

    // 2. Submitting: run server-side deterministic eligibility check
    const eligibility = await eligibilityEngine.checkEligibility(data.resourceId, userId, {
      accessMode:        data.accessMode,
      startAt:           data.startAt,
      endAt:             data.endAt,
      userGroupOverride: data.userGroupOverride,
    });

    if (!eligibility.canRequest) {
      throw new AppError(
        'NOT_ELIGIBLE',
        'You do not meet the minimum prerequisites to submit a request for this resource.',
        400,
        { checks: eligibility.checks, requiredNextSteps: eligibility.requiredNextSteps }
      );
    }

    // Determine target initial status based on non-blocking requirements
    let initialStatus = 'SUBMITTED';
    const trainingCheck = eligibility.checks.find((c) => c.key === 'training');
    const docsCheck     = eligibility.checks.find((c) => c.key === 'documents');

    if (trainingCheck && trainingCheck.status !== 'PASS') {
      initialStatus = 'AWAITING_TRAINING';
    } else if (docsCheck && docsCheck.status !== 'PASS') {
      initialStatus = 'AWAITING_DOCUMENTS';
    }

    // Insert base request record
    const record = await accessRequestRepo.insert({
      resource_id:       data.resourceId,
      requester_id:      userId,
      access_mode:       data.accessMode,
      start_at:          data.startAt || null,
      end_at:            data.endAt || null,
      purpose:           data.purpose,
      outside_materials: data.outsideMaterials ? JSON.stringify(data.outsideMaterials) : null,
      acknowledgments:   data.acknowledgments ? JSON.stringify(data.acknowledgments) : null,
      status:            'DRAFT',
    });

    // Central state machine initial transition: DRAFT -> initialStatus
    const { entity } = await transitionService.transition(
      'AccessRequest',
      record,
      initialStatus,
      { sub: userId, role: 'REQUESTER' },
      'Initial request submission'
    );

    return { request: entity, eligibility };
  }

  /**
   * Lists requests for the authenticated user.
   */
  async getMyRequests(userId, query) {
    return accessRequestRepo.findByRequester(userId, query);
  }

  /**
   * Retrieves single request details with authorization check.
   */
  async getRequestById(requestId, actor) {
    const request = await accessRequestRepo.findDetailById(requestId);
    if (!request) {
      throw Errors.NotFound('Access request not found.');
    }

    const isRequester = request.requester_id === actor.sub;
    const isPlatformAdmin = actor.role === 'PLATFORM_ADMIN';
    const isFacilityStaff = (actor.memberships || []).some(
      (m) => m.institutionId === request.institution_id && ['ADMIN', 'MANAGER', 'OPERATOR'].includes(m.role)
    );

    if (!isRequester && !isPlatformAdmin && !isFacilityStaff) {
      throw Errors.Forbidden('You are not authorized to view this access request.');
    }

    return request;
  }

  /**
   * Updates request fields while in DRAFT or MORE_INFO_REQUIRED.
   */
  async updateDraft(requestId, userId, data) {
    const request = await accessRequestRepo.findById(requestId);
    if (!request) {
      throw Errors.NotFound('Access request not found.');
    }
    if (request.requester_id !== userId) {
      throw Errors.Forbidden('You can only edit your own request.');
    }
    if (!['DRAFT', 'MORE_INFO_REQUIRED'].includes(request.status)) {
      throw Errors.BadRequest(`Cannot edit request in status ${request.status}. Only DRAFT or MORE_INFO_REQUIRED can be updated.`);
    }

    const updates = {};
    if (data.accessMode) updates.access_mode = data.accessMode;
    if (data.startAt !== undefined) updates.start_at = data.startAt;
    if (data.endAt !== undefined) updates.end_at = data.endAt;
    if (data.purpose) updates.purpose = data.purpose;
    if (data.outsideMaterials) updates.outside_materials = JSON.stringify(data.outsideMaterials);
    if (data.acknowledgments) updates.acknowledgments = JSON.stringify(data.acknowledgments);
    updates.updated_at = new Date();

    const updated = await accessRequestRepo.update(requestId, updates);
    return updated;
  }

  /**
   * Submits a draft request.
   */
  async submitDraft(requestId, userId) {
    const request = await accessRequestRepo.findById(requestId);
    if (!request) {
      throw Errors.NotFound('Access request not found.');
    }
    if (request.requester_id !== userId) {
      throw Errors.Forbidden('You can only submit your own request.');
    }
    if (request.status !== 'DRAFT') {
      throw Errors.BadRequest(`Cannot submit request currently in status ${request.status}.`);
    }

    const eligibility = await eligibilityEngine.checkEligibility(request.resource_id, userId, {
      accessMode: request.access_mode,
      startAt:    request.start_at,
      endAt:      request.end_at,
    });

    if (!eligibility.canRequest) {
      throw new AppError('NOT_ELIGIBLE', 'You do not meet the minimum prerequisites.', 400, {
        checks: eligibility.checks,
      });
    }

    const { entity } = await transition(
      'AccessRequest',
      request,
      'SUBMITTED',
      { sub: userId, role: 'REQUESTER' },
      'Requester submitted draft'
    );

    return { request: entity, eligibility };
  }

  /**
   * Cancels an access request.
   */
  async cancelRequest(requestId, actor, reason = 'Cancelled by requester') {
    const request = await accessRequestRepo.findById(requestId);
    if (!request) {
      throw Errors.NotFound('Access request not found.');
    }

    const isRequester = request.requester_id === actor.sub;
    const isPlatformAdmin = actor.role === 'PLATFORM_ADMIN';
    if (!isRequester && !isPlatformAdmin) {
      throw Errors.Forbidden('Only the requester or an administrator can cancel this request.');
    }

    const { entity } = await transitionService.transition(
      'AccessRequest',
      request,
      'CANCELLED',
      actor,
      reason
    );

    return entity;
  }

  /**
   * Retrieves review queue for a facility or institution (Spec §4.9).
   */
  async getReviewQueue(actor, query = {}) {
    return accessRequestRepo.findReviewQueue(query);
  }

  /**
   * Locks reviewer and begins evaluation: SUBMITTED -> UNDER_REVIEW.
   */
  async startReview(requestId, reviewer) {
    const request = await accessRequestRepo.findById(requestId);
    if (!request) {
      throw Errors.NotFound('Access request not found.');
    }

    // Strict self-approval prevention (Spec §2.2)
    assertNoSelfApproval(reviewer.sub, request.requester_id);

    const { entity } = await transitionService.transition(
      'AccessRequest',
      request,
      'UNDER_REVIEW',
      reviewer,
      'Review started by staff member',
      {
        extraUpdates: {
          reviewer_id: reviewer.sub,
          reviewer_locked_at: new Date(),
        },
      }
    );

    return entity;
  }

  /**
   * Requests more information from the requester.
   */
  async requestInfo(requestId, reviewer, { question }) {
    const request = await accessRequestRepo.findById(requestId);
    if (!request) {
      throw Errors.NotFound('Access request not found.');
    }

    assertNoSelfApproval(reviewer.sub, request.requester_id);

    const { entity } = await transitionService.transition(
      'AccessRequest',
      request,
      'MORE_INFO_REQUIRED',
      reviewer,
      question,
      {
        extraUpdates: {
          review_conditions: question,
        },
      }
    );

    return entity;
  }

  /**
   * Requester responds to a request for information.
   */
  async respondInfo(requestId, requesterId, { response, attachments }) {
    const request = await accessRequestRepo.findById(requestId);
    if (!request) {
      throw Errors.NotFound('Access request not found.');
    }
    if (request.requester_id !== requesterId) {
      throw Errors.Forbidden('Only the requester can respond to this inquiry.');
    }
    if (request.status !== 'MORE_INFO_REQUIRED') {
      throw Errors.BadRequest(`Cannot respond to a request in status ${request.status}.`);
    }

    const { entity } = await transitionService.transition(
      'AccessRequest',
      request,
      'SUBMITTED',
      { sub: requesterId, role: 'REQUESTER' },
      response,
      {
        payload: { response, attachments },
      }
    );

    return entity;
  }

  /**
   * Executes a review decision (APPROVE | REJECT | WAITLIST) per Spec §4.10.
   */
  async makeDecision(requestId, reviewer, { decision, reason, conditions }) {
    const request = await accessRequestRepo.findDetailById(requestId);
    if (!request) {
      throw Errors.NotFound('Access request not found.');
    }

    // Strict no-self-approval assertion
    assertNoSelfApproval(reviewer.sub, request.requester_id);

    if (request.status !== 'UNDER_REVIEW') {
      throw Errors.BadRequest(
        `Cannot execute decision on request in status '${request.status}'. Request must be in 'UNDER_REVIEW'.`
      );
    }

    // ── REJECT ─────────────────────────────────────────────────────────────
    if (decision === 'REJECT') {
      const { entity } = await transitionService.transition(
        'AccessRequest',
        request,
        'REJECTED',
        reviewer,
        reason,
        {
          extraUpdates: {
            rejection_reason: reason,
            reviewer_id: reviewer.sub,
          },
        }
      );
      return { request: entity, booking: null };
    }

    // ── WAITLIST ───────────────────────────────────────────────────────────
    if (decision === 'WAITLIST') {
      const { entity } = await transitionService.transition(
        'AccessRequest',
        request,
        'WAITLISTED',
        reviewer,
        reason,
        {
          extraUpdates: {
            reviewer_id: reviewer.sub,
            review_conditions: conditions ? JSON.stringify(conditions) : null,
          },
        }
      );

      const waitlistEntry = await accessRequestRepo.insertWaitlistEntry({
        resource_id:   request.resource_id,
        request_id:    request.id,
        desired_start: request.start_at,
        desired_end:   request.end_at,
        priority_reason: reason,
      });

      return { request: entity, waitlist: waitlistEntry, booking: null };
    }

    // ── APPROVE ────────────────────────────────────────────────────────────
    if (decision === 'APPROVE') {
      // 1. Re-run server-side eligibility check
      const eligibility = await eligibilityEngine.checkEligibility(request.resource_id, request.requester_id, {
        accessMode: request.access_mode,
        startAt:    request.start_at,
        endAt:      request.end_at,
      });

      if (!eligibility.eligible) {
        throw new AppError(
          'NOT_ELIGIBLE',
          'Requester failed server-side eligibility checks upon approval.',
          400,
          { checks: eligibility.checks, requiredNextSteps: eligibility.requiredNextSteps }
        );
      }

      // 2. Overlap concurrency check
      const overlaps = await accessRequestRepo.findOverlappingBookings(
        request.resource_id,
        request.start_at,
        request.end_at
      );

      if (overlaps.length > 0) {
        // Compute 3 alternative suggested slots
        const resource = await resourceRepo.findById(request.resource_id);
        const facility = await facilityRepo.findById(resource.facility_id);

        let alternativeSlots = [];
        try {
          const intervals = await calculateAvailabilityIntervals(
            request.resource_id,
            request.start_at,
            new Date(new Date(request.start_at).getTime() + 7 * 86400000).toISOString()
          );
          alternativeSlots = getSuggestedSlots(intervals, facility, {}, 60).slice(0, 3);
        } catch {
          // Fallback slots if computation fails
          const reqDurationMs = new Date(request.end_at) - new Date(request.start_at);
          const nextDayStart  = new Date(new Date(request.start_at).getTime() + 86400000);
          alternativeSlots = [
            {
              startAt: nextDayStart.toISOString(),
              endAt:   new Date(nextDayStart.getTime() + reqDurationMs).toISOString(),
            },
          ];
        }

        throw new AppError(
          'BOOKING_CONFLICT',
          'Selected slot is no longer available due to a conflicting booking.',
          409,
          {
            conflictingBookings: overlaps.map((b) => ({ id: b.id, startAt: b.start_at, endAt: b.end_at })),
            alternativeSlots,
          }
        );
      }

      // 3. Atomic creation of Booking and state transition to APPROVED -> SCHEDULED
      return db.transaction(async (trx) => {
        const booking = await accessRequestRepo.createBooking(
          {
            request_id:  request.id,
            resource_id: request.resource_id,
            user_id:     request.requester_id,
            start_at:    request.start_at,
            end_at:      request.end_at,
            status:      'SCHEDULED',
            policy_version_applied: request.policy_version_applied || null,
          },
          trx
        );

        // Transition UNDER_REVIEW -> APPROVED
        const { entity: approvedReq } = await transitionService.transition(
          'AccessRequest',
          request,
          'APPROVED',
          reviewer,
          reason,
          {
            trx,
            extraUpdates: {
              reviewer_id: reviewer.sub,
              review_conditions: conditions ? JSON.stringify(conditions) : null,
            },
          }
        );

        // Transition APPROVED -> SCHEDULED
        const { entity: scheduledReq } = await transitionService.transition(
          'AccessRequest',
          approvedReq,
          'SCHEDULED',
          reviewer,
          `Booking created: ${booking.id}`,
          { trx }
        );

        return { request: scheduledReq, booking };
      });
    }

    throw Errors.BadRequest(`Unknown decision: ${decision}`);
  }

  /**
   * Submits an appeal on a REJECTED or WAITLISTED request.
   */
  async appealDecision(requestId, requesterId, { reason }) {
    const request = await accessRequestRepo.findById(requestId);
    if (!request) {
      throw Errors.NotFound('Access request not found.');
    }
    if (request.requester_id !== requesterId) {
      throw Errors.Forbidden('Only the original requester can appeal this decision.');
    }
    if (!['REJECTED', 'WAITLISTED'].includes(request.status)) {
      throw Errors.BadRequest(`Cannot appeal request in status ${request.status}. Appeals only apply to REJECTED or WAITLISTED requests.`);
    }
    if (request.appeal_count >= 1) {
      throw Errors.BadRequest('Only one appeal is permitted per request.');
    }

    const { entity } = await transitionService.transition(
      'AccessRequest',
      request,
      'UNDER_REVIEW',
      { sub: requesterId, role: 'REQUESTER' },
      `Appeal submitted: ${reason}`,
      {
        extraUpdates: {
          appeal_count: (request.appeal_count || 0) + 1,
          reviewer_id: null,
          reviewer_locked_at: null,
        },
        payload: { appealReason: reason },
      }
    );

    return entity;
  }
}

const accessRequestService = new AccessRequestService();
module.exports = { accessRequestService, AccessRequestService };
