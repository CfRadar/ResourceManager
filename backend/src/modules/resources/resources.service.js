'use strict';

/**
 * src/modules/resources/resources.service.js
 *
 * Business logic for resources catalog, visibility filtering,
 * access control, and private details management.
 * Spec §4.5, §2.2, Step 04.
 */

const { resourceRepo } = require('./resources.repository');
const { facilityRepo } = require('../facilities/facilities.repository');
const { institutionPartnerRepo } = require('../institutions/institutions.repository');
const { policyRepo } = require('../policies/policies.repository');
const { db } = require('../../config/db');
const { Errors } = require('../../utils/AppError');
const { ROLES } = require('../../middleware/rbac');
const { redactResource, isAuthorizedForPrivateDetails } = require('./redaction');

class ResourceService {
  /**
   * Search/browse visible resources with redaction.
   */
  async listResources(query, userContext = null) {
    const result = await resourceRepo.findVisibleResources(query, userContext, {
      page: query.page,
      pageSize: query.pageSize,
    });

    // Apply redaction to each resource item
    const redactedData = result.data.map((r) => redactResource(r, userContext));

    return {
      data: redactedData,
      meta: result.meta,
    };
  }

  /**
   * Get resource detail by ID, strictly enforcing visibility rules.
   * If the resource is not visible to the caller, return 404 (never leak private existence).
   */
  async getResourceById(id, userContext = null) {
    const resource = await resourceRepo.findByIdWithDetails(id);
    if (!resource) {
      throw Errors.NotFound(`Resource not found: ${id}`);
    }

    const hostInstId = resource.facility?.institutionId;
    const userMemberships = userContext?.memberships || [];
    const isPlatformAdmin = userContext?.role === ROLES.ADMIN;
    const isHostMember = userMemberships.some((m) => m.institutionId === hostInstId);
    const isHostManagerOrOwner = userMemberships.some(
      (m) => m.institutionId === hostInstId && (m.role === ROLES.ADMIN || m.role === ROLES.OWNER || m.role === ROLES.MANAGER)
    );

    // ── Check INACTIVE status ───────────────────────────────────────────────
    if (resource.status !== 'ACTIVE' && !isPlatformAdmin && !isHostManagerOrOwner) {
      throw Errors.NotFound(`Resource not found: ${id}`);
    }

    // ── Check Visibility ────────────────────────────────────────────────────
    if (resource.visibility === 'PRIVATE') {
      if (!isPlatformAdmin && !isHostManagerOrOwner) {
        throw Errors.NotFound(`Resource not found: ${id}`);
      }
    } else if (resource.visibility === 'INSTITUTION') {
      if (!isPlatformAdmin && !isHostMember) {
        throw Errors.NotFound(`Resource not found: ${id}`);
      }
    } else if (resource.visibility === 'NETWORK') {
      if (!isPlatformAdmin && !isHostMember) {
        // Check if user is a member of any partner institution
        const userInstIds = userMemberships.map((m) => m.institutionId);
        const isPartner = await institutionPartnerRepo.arePartners(hostInstId, userInstIds[0] || '');
        if (!isPartner) {
          throw Errors.NotFound(`Resource not found: ${id}`);
        }
      }
    }

    return redactResource(resource, userContext);
  }

  /**
   * Retrieve unredacted confidential private details.
   * Authorized only for:
   * 1. Platform Admin
   * 2. Host institution Owner or Manager
   * 3. Requesters with an APPROVED, SCHEDULED, ACTIVE, or CHECKED_IN booking.
   */
  async getPrivateDetails(id, userContext) {
    if (!userContext) {
      throw Errors.Unauthenticated('Authentication required to access private details.');
    }

    const resource = await resourceRepo.findByIdWithDetails(id);
    if (!resource) {
      throw Errors.NotFound(`Resource not found: ${id}`);
    }

    const hostInstId = resource.facility?.institutionId;

    // Check if user has an approved or active booking
    let hasApprovedBooking = false;
    const activeBooking = await db('bookings')
      .where({ resource_id: id, user_id: userContext.sub })
      .whereIn('status', ['APPROVED', 'SCHEDULED', 'ACTIVE', 'CHECKED_IN'])
      .first();

    if (activeBooking) {
      hasApprovedBooking = true;
    }

    const authorized = isAuthorizedForPrivateDetails(userContext, hostInstId, hasApprovedBooking);
    if (!authorized) {
      throw Errors.Forbidden('Access to confidential private details requires an approved booking or manager role.');
    }

    const specs = resource.specs || {};
    const privateDetails = specs.privateDetails || {
      accessInstructions: specs.accessInstructions || null,
      doorCode: specs.doorCode || null,
      maintenancePassword: specs.maintenancePassword || null,
      safetyNotes: specs.safetyNotes || null,
      ownerContact: specs.ownerContact || null,
    };

    return {
      resourceId: resource.id,
      name: resource.name,
      privateDetails,
    };
  }

  /**
   * Create a new resource under a facility.
   * Authorized for Facility Institution Owner or Manager (or Platform Admin).
   */
  async createResource(facilityId, data, userContext) {
    const facility = await facilityRepo.findById(facilityId);
    if (!facility) {
      throw Errors.NotFound(`Facility not found: ${facilityId}`);
    }

    const hostInstId = facility.institution_id;
    if (userContext.role !== ROLES.ADMIN) {
      const isAuthorized = Array.isArray(userContext.memberships) && userContext.memberships.some(
        (m) => m.institutionId === hostInstId && (m.role === ROLES.ADMIN || m.role === ROLES.OWNER || m.role === ROLES.MANAGER)
      );
      if (!isAuthorized) {
        throw Errors.Forbidden('Creating resources in this facility requires an Owner or Manager role.');
      }
    }

    const specs = data.specs ? { ...data.specs } : {};
    if (data.privateDetails) {
      specs.privateDetails = data.privateDetails;
    }

    const payload = {
      facility_id: facilityId,
      name: data.name.trim(),
      category: data.category.trim(),
      description: data.description || null,
      specs: JSON.stringify(specs),
      capabilities: db.raw('?::text[]', [data.capabilities || []]),
      visibility: data.visibility || 'PUBLIC',
      risk_level: data.riskLevel || 'LOW',
      status: 'ACTIVE',
      created_by: userContext.sub,
    };

    const created = await resourceRepo.insert(payload);
    return resourceRepo.findByIdWithDetails(created.id);
  }

  /**
   * Update an existing resource.
   */
  async updateResource(id, data, userContext) {
    const resource = await resourceRepo.findByIdWithDetails(id);
    if (!resource) {
      throw Errors.NotFound(`Resource not found: ${id}`);
    }

    const hostInstId = resource.facility?.institutionId;
    if (userContext.role !== ROLES.ADMIN) {
      const isAuthorized = Array.isArray(userContext.memberships) && userContext.memberships.some(
        (m) => m.institutionId === hostInstId && (m.role === ROLES.ADMIN || m.role === ROLES.OWNER || m.role === ROLES.MANAGER)
      );
      if (!isAuthorized) {
        throw Errors.Forbidden('Updating this resource requires an Owner or Manager role.');
      }
    }

    const updates = {};
    if (data.name !== undefined) updates.name = data.name.trim();
    if (data.category !== undefined) updates.category = data.category.trim();
    if (data.description !== undefined) updates.description = data.description;
    if (data.visibility !== undefined) updates.visibility = data.visibility;
    if (data.riskLevel !== undefined) updates.risk_level = data.riskLevel;
    if (data.capabilities !== undefined) {
      updates.capabilities = db.raw('?::text[]', [data.capabilities]);
    }

    if (data.specs !== undefined || data.privateDetails !== undefined) {
      const existingSpecs = resource.specs || {};
      const newSpecs = data.specs !== undefined ? { ...data.specs } : { ...existingSpecs };
      if (data.privateDetails !== undefined) {
        newSpecs.privateDetails = data.privateDetails;
      }
      updates.specs = JSON.stringify(newSpecs);
    }

    await resourceRepo.update(id, updates);
    return resourceRepo.findByIdWithDetails(id);
  }

  /**
   * Soft deactivation (never hard-deletes; keeps history).
   * Only Owner (or Platform Admin) can deactivate.
   */
  async deactivateResource(id, userContext) {
    const resource = await resourceRepo.findByIdWithDetails(id);
    if (!resource) {
      throw Errors.NotFound(`Resource not found: ${id}`);
    }

    const hostInstId = resource.facility?.institutionId;
    if (userContext.role !== ROLES.ADMIN) {
      const isOwner = Array.isArray(userContext.memberships) && userContext.memberships.some(
        (m) => m.institutionId === hostInstId && (m.role === ROLES.ADMIN || m.role === ROLES.OWNER)
      );
      if (!isOwner) {
        throw Errors.Forbidden('Deactivating a resource requires the Owner role.');
      }
    }

    await resourceRepo.softDeactivate(id);
    return {
      id,
      status: 'INACTIVE',
      message: 'Resource successfully deactivated. New booking requests are blocked.',
    };
  }

  /**
   * Categories and vocabulary.
   */
  async getCategories() {
    return resourceRepo.findCategoriesAndVocabulary();
  }
}

const resourceService = new ResourceService();

module.exports = {
  resourceService,
  ResourceService,
};

