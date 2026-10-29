'use strict';

/**
 * src/modules/institutions/institutions.service.js
 *
 * Business logic for institutions domain, membership lifecycle,
 * and partner linking.
 * Spec §4.3, §2.1, §2.2, Step 03 §2.
 */

const {
  institutionRepo,
  institutionPartnerRepo,
  membershipRequestRepo,
  institutionMembershipRepo,
  InstitutionRepository,
} = require('./institutions.repository');
const { facilityRepo }   = require('../facilities/facilities.repository');
const { db }             = require('../../config/db');
const { Errors }         = require('../../utils/AppError');
const { assertNoSelfApproval } = require('../../middleware/rbac');

class InstitutionService {
  /**
   * List verified institutions for public browsing.
   */
  async listVerifiedInstitutions(query) {
    const { city, type, q, page, pageSize } = query;
    return institutionRepo.findVerified(
      { city, type, q },
      { page, pageSize }
    );
  }

  /**
   * Retrieve institution details including associated public facilities.
   */
  async getInstitutionById(id) {
    const institution = await institutionRepo.findById(id);
    if (!institution) {
      throw Errors.NotFound(`Institution not found: ${id}`);
    }

    const publicInst = InstitutionRepository.sanitizePublic(institution);
    const facilities = await facilityRepo.findByInstitutionId(id);

    return {
      ...publicInst,
      facilities,
    };
  }

  /**
   * Register a new institution (Platform Admin only).
   */
  async registerInstitution(data, actor) {
    const existing = await institutionRepo.findByName(data.name);
    if (existing) {
      throw Errors.Conflict(
        'DUPLICATE_INSTITUTION',
        `An institution with the name '${data.name}' already exists.`
      );
    }

    const payload = {
      name:        data.name.trim(),
      type:        data.type || 'UNIVERSITY',
      verified:    true, // Admin registration defaults to verified
      city:        data.city || null,
      address:     data.address || null,
      website:     data.website || null,
      description: data.description || null,
    };

    const created = await institutionRepo.insert(payload);
    return InstitutionRepository.sanitizePublic(created);
  }

  /**
   * Update institution profile (Platform Admin or Institution Admin).
   */
  async updateInstitution(id, data, actor) {
    const existing = await institutionRepo.findById(id);
    if (!existing) {
      throw Errors.NotFound(`Institution not found: ${id}`);
    }

    if (data.name && data.name.trim().toLowerCase() !== existing.name.toLowerCase()) {
      const duplicate = await institutionRepo.findByName(data.name);
      if (duplicate && duplicate.id !== id) {
        throw Errors.Conflict(
          'DUPLICATE_INSTITUTION',
          `An institution with the name '${data.name}' already exists.`
        );
      }
    }

    const updates = {};
    if (data.name !== undefined) updates.name = data.name.trim();
    if (data.type !== undefined) updates.type = data.type;
    if (data.city !== undefined) updates.city = data.city;
    if (data.address !== undefined) updates.address = data.address;
    if (data.website !== undefined) updates.website = data.website;
    if (data.description !== undefined) updates.description = data.description;

    const updated = await institutionRepo.update(id, updates);
    return InstitutionRepository.sanitizePublic(updated);
  }

  /**
   * Submit a membership request to an institution.
   */
  async createMembershipRequest(institutionId, data, actor) {
    const institution = await institutionRepo.findById(institutionId);
    if (!institution || !institution.verified) {
      throw Errors.NotFound(`Institution not found or not verified: ${institutionId}`);
    }

    // Check if user already holds active membership
    const existingMembership = await institutionMembershipRepo.findActiveMembership(
      actor.sub,
      institutionId
    );

    if (existingMembership) {
      throw Errors.Conflict(
        'MEMBERSHIP_EXISTS',
        'You already hold an active membership in this institution.'
      );
    }

    // Check if user already has a pending request
    const pendingRequest = await membershipRequestRepo.findPendingByUserAndInstitution(
      actor.sub,
      institutionId
    );

    if (pendingRequest) {
      throw Errors.Conflict(
        'REQUEST_PENDING',
        'A membership request for this institution is already pending review.'
      );
    }

    const payload = {
      user_id:                actor.sub,
      institution_id:         institutionId,
      requested_role:         data.requestedRole || 'REQUESTER',
      message:                data.message || null,
      supporting_document_id: data.supportingDocumentId || null,
      status:                 'PENDING',
    };

    const created = await membershipRequestRepo.insert(payload);
    return {
      id:                   created.id,
      institutionId:        created.institution_id,
      requestedRole:        created.requested_role,
      message:              created.message,
      supportingDocumentId: created.supporting_document_id,
      status:               created.status,
      createdAt:            created.created_at,
    };
  }

  /**
   * List pending membership requests for an institution (Admin only).
   */
  async listMembershipRequests(institutionId, query, actor) {
    const institution = await institutionRepo.findById(institutionId);
    if (!institution) {
      throw Errors.NotFound(`Institution not found: ${institutionId}`);
    }

    const { status = 'PENDING', page, pageSize } = query;
    return membershipRequestRepo.findRequestsWithUser(
      institutionId,
      status,
      { page, pageSize }
    );
  }

  /**
   * Approve or reject a membership request (Admin only).
   * Strict no-self-approval rule enforced.
   * Atomic database transaction.
   */
  async decideMembershipRequest(institutionId, reqId, decisionData, actor) {
    const request = await membershipRequestRepo.findRequestById(reqId);
    if (!request || request.institutionId !== institutionId) {
      throw Errors.NotFound(`Membership request not found: ${reqId}`);
    }

    if (request.status !== 'PENDING') {
      throw Errors.InvalidTransition(
        request.status,
        decisionData.decision === 'APPROVE' ? 'APPROVED' : 'REJECTED'
      );
    }

    // Strict no-self-approval rule (spec §2.2)
    assertNoSelfApproval(actor.sub, request.userId);

    const { decision, role, reason } = decisionData;

    return db.transaction(async (trx) => {
      let createdMembership = null;

      if (decision === 'APPROVE') {
        if (!role) {
          throw Errors.Validation('A valid role is required when approving a membership request.');
        }

        createdMembership = await institutionMembershipRepo.upsertMembership(
          {
            userId:        request.userId,
            institutionId,
            role,
            verifiedBy:    actor.sub,
          },
          trx
        );

        await membershipRequestRepo.updateStatus(
          reqId,
          'APPROVED',
          actor.sub,
          reason || null,
          trx
        );
      } else {
        // REJECT
        await membershipRequestRepo.updateStatus(
          reqId,
          'REJECTED',
          actor.sub,
          reason || null,
          trx
        );
      }

      return {
        decision,
        requestId:     reqId,
        institutionId,
        userId:        request.userId,
        status:        decision === 'APPROVE' ? 'APPROVED' : 'REJECTED',
        membership: createdMembership ? {
          id:            createdMembership.id,
          userId:        createdMembership.user_id || request.userId,
          institutionId: createdMembership.institution_id || institutionId,
          role:          createdMembership.role || role,
          status:        createdMembership.status || 'ACTIVE',
          verifiedBy:    createdMembership.verified_by || actor.sub,
          verifiedAt:    createdMembership.verified_at,
        } : null,
      };
    });
  }

  /**
   * Link two partner institutions for network-wide visibility.
   * Bidirectional and symmetric.
   */
  async linkPartnerInstitution(institutionId, partnerInstitutionId, actor) {
    if (institutionId === partnerInstitutionId) {
      throw Errors.Validation('Cannot link an institution as a partner to itself.');
    }

    const instA = await institutionRepo.findById(institutionId);
    const instB = await institutionRepo.findById(partnerInstitutionId);

    if (!instA || !instA.verified) {
      throw Errors.NotFound(`Institution not found or not verified: ${institutionId}`);
    }
    if (!instB || !instB.verified) {
      throw Errors.NotFound(`Partner institution not found or not verified: ${partnerInstitutionId}`);
    }

    const alreadyPartners = await institutionPartnerRepo.arePartners(
      institutionId,
      partnerInstitutionId
    );

    if (alreadyPartners) {
      throw Errors.Conflict(
        'PARTNER_LINK_EXISTS',
        'Partner link already exists between these institutions.'
      );
    }

    const created = await institutionPartnerRepo.linkPartners(
      institutionId,
      partnerInstitutionId
    );

    return {
      institutionId,
      partnerInstitutionId,
      establishedAt: created.established_at || new Date().toISOString(),
    };
  }

  /**
   * List partner institutions for an institution.
   */
  async listPartnerInstitutions(institutionId) {
    const institution = await institutionRepo.findById(institutionId);
    if (!institution) {
      throw Errors.NotFound(`Institution not found: ${institutionId}`);
    }
    return institutionPartnerRepo.findPartners(institutionId);
  }
}

const institutionService = new InstitutionService();

module.exports = {
  institutionService,
  InstitutionService,
};
