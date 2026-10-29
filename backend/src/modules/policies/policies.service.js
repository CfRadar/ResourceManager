'use strict';

/**
 * src/modules/policies/policies.service.js
 *
 * Business logic for resource policy versioning and access control.
 * Spec §4.6, Step 04 §2.
 */

const { policyRepo }     = require('./policies.repository');
const { resourceRepo }   = require('../resources/resources.repository');
const { Errors }         = require('../../utils/AppError');
const { ROLES }          = require('../../middleware/rbac');

class PolicyService {
  /**
   * Check if user is authorized as Owner or Manager of the resource's institution.
   */
  async assertManagerOrOwner(resourceId, userContext) {
    if (!userContext) {
      throw Errors.Unauthenticated('Authentication required.');
    }
    if (userContext.role === ROLES.ADMIN) {
      return true; // Platform admin
    }

    const resource = await resourceRepo.findByIdWithDetails(resourceId);
    if (!resource) {
      throw Errors.NotFound(`Resource not found: ${resourceId}`);
    }

    const hostInstitutionId = resource.facility?.institutionId;
    const isAuthorized = Array.isArray(userContext.memberships) && userContext.memberships.some(
      (m) => m.institutionId === hostInstitutionId && (m.role === ROLES.ADMIN || m.role === ROLES.OWNER || m.role === ROLES.MANAGER)
    );

    if (!isAuthorized) {
      throw Errors.Forbidden('This action requires an Owner or Manager role for this facility.');
    }

    return resource;
  }

  /**
   * Get policy detail for a resource.
   */
  async getPolicy(resourceId, userContext = null) {
    const resource = await resourceRepo.findById(resourceId);
    if (!resource) {
      throw Errors.NotFound(`Resource not found: ${resourceId}`);
    }

    const policy = await policyRepo.findCurrentPolicy(resourceId);
    if (!policy) {
      throw Errors.NotFound(`No active policy configured for resource: ${resourceId}`);
    }

    return policy;
  }

  /**
   * Replace/update resource policy. Creates policy_version + 1.
   */
  async updatePolicy(resourceId, policyData, userContext) {
    await this.assertManagerOrOwner(resourceId, userContext);
    return policyRepo.createVersion(resourceId, policyData, userContext.sub);
  }
}

const policyService = new PolicyService();

module.exports = {
  policyService,
  PolicyService,
};

