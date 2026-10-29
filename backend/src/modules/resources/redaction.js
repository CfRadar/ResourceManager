'use strict';

/**
 * src/modules/resources/redaction.js
 *
 * Confidential field-level redaction utility.
 * Spec §2.2, Step 04 §1.2.
 */

const { ROLES } = require('../../middleware/rbac');

const CONFIDENTIAL_KEYS = [
  'doorCode',
  'door_code',
  'accessInstructions',
  'access_instructions',
  'maintenancePassword',
  'maintenance_password',
  'safetyNotes',
  'safety_notes',
  'ownerContact',
  'owner_contact',
  'internalNotes',
  'internal_notes',
  'privateDetails',
  'private_details',
];

/**
 * Determines whether the given user is authorized to view unredacted private details.
 *
 * @param {object|null} userContext - req.user ({ sub, role, memberships })
 * @param {string} hostInstitutionId - ID of the institution owning the resource
 * @param {boolean} [hasApprovedBooking=false] - True if user has an active/approved booking
 * @returns {boolean}
 */
function isAuthorizedForPrivateDetails(userContext, hostInstitutionId, hasApprovedBooking = false) {
  if (!userContext) return false;
  if (userContext.role === ROLES.ADMIN) return true;
  if (hasApprovedBooking) return true;

  if (Array.isArray(userContext.memberships) && hostInstitutionId) {
    const membership = userContext.memberships.find(
      (m) => m.institutionId === hostInstitutionId
    );
    if (membership && (membership.role === ROLES.ADMIN || membership.role === ROLES.OWNER || membership.role === ROLES.MANAGER)) {
      return true;
    }
  }

  return false;
}

/**
 * Strips confidential fields from a resource object unless the caller is authorized.
 *
 * @param {object} resource
 * @param {object|null} userContext
 * @param {boolean} [hasApprovedBooking=false]
 * @returns {object} Redacted or full safe resource object
 */
function redactResource(resource, userContext = null, hasApprovedBooking = false) {
  if (!resource) return null;

  const hostInstitutionId = resource.institutionId || resource.institution_id || resource.facility?.institutionId;
  const isAuthorized = isAuthorizedForPrivateDetails(userContext, hostInstitutionId, hasApprovedBooking);

  const clean = { ...resource };

  if (!isAuthorized) {
    // Redact top-level private details
    delete clean.privateDetails;
    delete clean.private_details;

    // Redact confidential keys from specs if present
    if (clean.specs && typeof clean.specs === 'object') {
      const sanitizedSpecs = { ...clean.specs };
      for (const key of CONFIDENTIAL_KEYS) {
        delete sanitizedSpecs[key];
      }
      clean.specs = sanitizedSpecs;
    }
  }

  return clean;
}

module.exports = {
  CONFIDENTIAL_KEYS,
  isAuthorizedForPrivateDetails,
  redactResource,
};

