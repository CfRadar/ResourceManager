'use strict';

/**
 * src/modules/referrals/referrals.service.js
 *
 * Core business domain logic for cross-institutional referrals.
 * Spec §4.14, Step 08.
 */

const { referralRepo }       = require('./referrals.repository');
const { needRequestRepo }    = require('../needRequests/needRequests.repository');
const { transition }         = require('../../services/transition');
const { appendAuditEvent }   = require('../../services/auditChain');
const { assertNoSelfApproval } = require('../../middleware/rbac');
const { Errors }             = require('../../utils/AppError');

class ReferralService {
  /**
   * Coordinator dispatches a referral to a partner institution.
   */
  async createReferral(needRequestId, data, coordinator) {
    const need = await needRequestRepo.findDetailById(needRequestId);
    if (!need) {
      throw Errors.NotFound('Need request not found.');
    }

    const insertData = {
      need_request_id:       needRequestId,
      coordinator_id:        coordinator.sub,
      target_institution_id: data.toInstitutionId,
      target_resource_id:    data.resourceId || null,
      referral_message:      data.messageToReceiver,
      contact_released:      false,
      status:                'REFERRAL_SENT',
    };

    const referral = await referralRepo.insert(insertData);

    await appendAuditEvent({
      actorId:    coordinator.sub,
      actorRole:  coordinator.role || 'COORDINATOR',
      action:     'REFERRAL_SENT',
      entityType: 'Referral',
      entityId:   referral.id,
      reason:     data.messageToReceiver,
      visibility: 'PARTIES',
      payload:    { targetInstitutionId: data.toInstitutionId, needRequestId },
    });

    return referral;
  }

  /**
   * Retrieves detail of a single referral with privacy filtering.
   */
  async getById(id, user) {
    const record = await referralRepo.findDetailById(id);
    if (!record) {
      throw Errors.NotFound('Referral not found.');
    }

    const isRequester = record.requester_id === user.sub;
    const isCoordinator = record.coordinator_id === user.sub;
    const isReceiver = (user.memberships || []).some(
      (m) => m.institutionId === record.target_institution_id
    ) || user.role === 'ADMIN';

    if (!isRequester && !isCoordinator && !isReceiver) {
      throw Errors.Forbidden('Not authorized to view this referral.');
    }

    if (!isRequester) {
      return referralRepo.sanitizeContact(record);
    }

    return record;
  }

  /**
   * Lists incoming referrals for the receiving institution.
   */
  async listInbox(user, query) {
    let institutionId = query.institutionId;

    if (!institutionId) {
      const primaryMembership = (user.memberships || [])[0];
      institutionId = primaryMembership?.institutionId;
    }

    if (!institutionId && user.role !== 'ADMIN') {
      throw Errors.Forbidden('You must belong to an institution to view its incoming referrals.');
    }

    const result = await referralRepo.findInbox({
      institutionId,
      status: query.status,
      page:   query.page,
      limit:  query.limit,
    });

    return {
      ...result,
      items: result.items.map((item) => referralRepo.sanitizeContact(item)),
    };
  }

  /**
   * Receiving institution responds to referral (ACCEPT or DECLINE).
   */
  async respond(id, { response, responseMessage, nextSteps }, responder) {
    const referral = await referralRepo.findDetailById(id);
    if (!referral) {
      throw Errors.NotFound('Referral not found.');
    }

    // 1. Verify that responder belongs to receiving institution (Spec §3.3)
    const isMemberOfTarget = (responder.memberships || []).some(
      (m) => m.institutionId === referral.target_institution_id
    );
    const isPlatformAdmin = responder.role === 'ADMIN';

    if (!isMemberOfTarget && !isPlatformAdmin) {
      throw Errors.Forbidden(
        'Only users affiliated with the receiving institution can respond to this referral.'
      );
    }

    // 2. Strict no-self-approval
    assertNoSelfApproval(responder.sub, referral.requester_id);

    const targetStatus = response === 'ACCEPT' ? 'ACCEPTED' : 'DECLINED';

    const { entity } = await transition(
      'Referral',
      referral,
      targetStatus,
      responder,
      responseMessage,
      {
        extraUpdates: {
          responded_by:     responder.sub,
          response_message: responseMessage,
          responded_at:     new Date(),
        },
        payload: { nextSteps: nextSteps || null },
      }
    );

    return entity;
  }

  /**
   * Releases requester contact details to the receiving institution.
   */
  async releaseContact(id, { note }, coordinator) {
    const referral = await referralRepo.findDetailById(id);
    if (!referral) {
      throw Errors.NotFound('Referral not found.');
    }

    if (!referral.requester_consented) {
      throw Errors.BadRequest(
        'Requester has not given consent to share contact information.'
      );
    }

    if (referral.status !== 'ACCEPTED') {
      throw Errors.BadRequest(
        'Contact details can only be released after the referral has been accepted by the receiving institution.'
      );
    }

    const updated = await referralRepo.update(id, {
      contact_released: true,
      updated_at:       new Date(),
    });

    await appendAuditEvent({
      actorId:    coordinator.sub,
      actorRole:  coordinator.role || 'COORDINATOR',
      action:     'REFERRAL_CONTACT_RELEASED',
      entityType: 'Referral',
      entityId:   id,
      reason:     note || 'Requester contact released following referral acceptance',
      visibility: 'PARTIES',
      payload:    { targetInstitutionId: referral.target_institution_id },
    });

    return {
      ...referral,
      ...updated,
      contact_released: true,
    };
  }
}

const referralService = new ReferralService();

module.exports = {
  ReferralService,
  referralService,
};

