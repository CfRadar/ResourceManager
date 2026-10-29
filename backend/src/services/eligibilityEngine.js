'use strict';

/**
 * src/services/eligibilityEngine.js
 *
 * Deterministic eligibility rule engine (no AI / LLM).
 * Spec §4.8, Step 05.
 *
 * Evaluates the 6 standard checks:
 *   1. membership_verified
 *   2. user_group_allowed
 *   3. training
 *   4. documents
 *   5. fair_use
 *   6. slot_free
 */

const { db } = require('../config/db');
const { Errors } = require('../utils/AppError');
const { isWithinWorkingHours } = require('../modules/facilities/facilities.service');

/**
 * Deterministically checks eligibility for a user on a resource.
 *
 * @param {string} resourceId
 * @param {string} userId
 * @param {object} [options]
 *   @param {string} [options.accessMode]        - 'INDEPENDENT' | 'SUPERVISED' | etc.
 *   @param {string} [options.startAt]           - ISO-8601 UTC
 *   @param {string} [options.endAt]             - ISO-8601 UTC
 *   @param {string} [options.userGroupOverride] - Test/review override
 *   @param {object} [options.trx]               - Knex transaction
 *
 * @returns {Promise<EligibilityResult>}
 */
async function checkEligibility(resourceId, userId, options = {}) {
  const trx = options.trx || null;
  const qb = trx ? trx : db;

  // 1. Fetch resource with facility and current policy
  const resource = await qb('resources').where({ id: resourceId }).first();
  if (!resource || resource.status !== 'ACTIVE') {
    throw Errors.NotFound('Resource not found or is currently inactive.');
  }

  const facility = await qb('facilities').where({ id: resource.facility_id }).first();
  if (!facility) {
    throw Errors.NotFound('Facility associated with this resource does not exist.');
  }

  const currentPolicyRow = await qb('resource_policies')
    .where({ resource_id: resourceId, is_current: true })
    .first();

  let policyData = {};
  if (currentPolicyRow?.policy_data) {
    policyData = typeof currentPolicyRow.policy_data === 'string'
      ? JSON.parse(currentPolicyRow.policy_data)
      : currentPolicyRow.policy_data;
  }

  // Fetch user
  const user = await qb('users').where({ id: userId }).first();
  if (!user) {
    throw Errors.NotFound('User not found.');
  }

  const checks = [];
  const requiredNextSteps = [];

  // ── CHECK 1: membership_verified ───────────────────────────────────────────
  // User must have an active verified membership in the host institution
  // or in a verified partner institution.
  const hostInstitutionId = facility.institution_id;
  const directMembership = await qb('institution_memberships')
    .where({
      institution_id: hostInstitutionId,
      user_id:        userId,
      status:         'ACTIVE',
    })
    .first();

  let partnerMembership = null;
  if (!directMembership) {
    // Check if user belongs to an approved partner institution
    const partners = await qb('institution_partners')
      .where((builder) => {
        builder.where('institution_id', hostInstitutionId)
               .orWhere('partner_institution_id', hostInstitutionId);
      });

    const partnerInstIds = partners.map((p) =>
      p.institution_id === hostInstitutionId ? p.partner_institution_id : p.institution_id
    );

    if (partnerInstIds.length > 0) {
      partnerMembership = await qb('institution_memberships')
        .whereIn('institution_id', partnerInstIds)
        .andWhere({ user_id: userId, status: 'ACTIVE' })
        .first();
    }
  }

  const verifiedMembership = directMembership || partnerMembership;
  if (verifiedMembership) {
    checks.push({
      key:    'membership_verified',
      label:  'Verified affiliation',
      status: 'PASS',
      details: {
        institutionId: verifiedMembership.institution_id,
        role:          verifiedMembership.role,
      },
    });
  } else {
    checks.push({
      key:    'membership_verified',
      label:  'Verified affiliation',
      status: 'FAIL',
      reason: 'No active verified membership found for host or partner institution.',
      action: {
        type:          'APPLY_MEMBERSHIP',
        institutionId: hostInstitutionId,
      },
    });
    requiredNextSteps.push('Apply for verified institutional membership');
  }

  // ── CHECK 2: user_group_allowed ────────────────────────────────────────────
  const permittedGroups = policyData.permittedUserGroups || policyData.allowedUserGroups || [];
  const userGroup = options.userGroupOverride || verifiedMembership?.role || user.role || 'REQUESTER';

  const isGroupAllowed =
    permittedGroups.length === 0 ||
    permittedGroups.includes('*') ||
    permittedGroups.some((g) => g.toUpperCase() === String(userGroup).toUpperCase());

  if (isGroupAllowed) {
    checks.push({
      key:    'user_group_allowed',
      label:  'Permitted user group',
      status: 'PASS',
      details: { userGroup },
    });
  } else {
    checks.push({
      key:    'user_group_allowed',
      label:  'Permitted user group',
      status: 'FAIL',
      reason: `User group '${userGroup}' is not allowed to access this resource. Allowed: ${permittedGroups.join(', ')}`,
    });
    requiredNextSteps.push(`Access restricted to permitted user groups (${permittedGroups.join(', ')})`);
  }

  // ── CHECK 3: training ──────────────────────────────────────────────────────
  const requiredTrainingIds = policyData.prerequisites?.requiredTrainingIds ||
                              policyData.requiredTrainingIds || [];

  if (requiredTrainingIds.length === 0) {
    checks.push({
      key:    'training',
      label:  'Training prerequisites',
      status: 'PASS',
      details: { count: 0 },
    });
  } else {
    const verifiedUserTrainings = await qb('user_trainings')
      .where({ user_id: userId, status: 'VERIFIED' })
      .whereIn('training_id', requiredTrainingIds)
      .andWhere((b) => {
        b.whereNull('expires_at').orWhere('expires_at', '>', qb.fn.now());
      });

    const verifiedIds = new Set(verifiedUserTrainings.map((ut) => ut.training_id));
    const missingTrainingIds = requiredTrainingIds.filter((tId) => !verifiedIds.has(tId));

    if (missingTrainingIds.length === 0) {
      checks.push({
        key:    'training',
        label:  'Training prerequisites',
        status: 'PASS',
        details: { count: requiredTrainingIds.length },
      });
    } else {
      const trainingRecords = await qb('trainings').whereIn('id', missingTrainingIds);
      const firstMissingId = missingTrainingIds[0];
      const firstTrainingRecord = trainingRecords.find((r) => r.id === firstMissingId);
      const trainingName = firstTrainingRecord?.name || 'Required Safety Training';

      checks.push({
        key:    'training',
        label:  trainingName,
        status: 'FAIL',
        reason: `Missing verified training: ${trainingName}`,
        action: {
          type:       'BOOK_TRAINING',
          trainingId: firstMissingId,
        },
      });
      requiredNextSteps.push(`Complete ${trainingName} training`);
    }
  }

  // ── CHECK 4: documents ─────────────────────────────────────────────────────
  const requiredDocTemplateIds = policyData.prerequisites?.requiredDocumentTemplateIds ||
                                 policyData.requiredDocumentTemplateIds || [];

  if (requiredDocTemplateIds.length === 0) {
    checks.push({
      key:    'documents',
      label:  'Required documents',
      status: 'PASS',
      details: { count: 0 },
    });
  } else {
    const approvedDocs = await qb('user_documents')
      .where({ user_id: userId, status: 'APPROVED' })
      .whereIn('template_id', requiredDocTemplateIds)
      .andWhere((b) => {
        b.whereNull('expires_at').orWhere('expires_at', '>', qb.fn.now());
      });

    const approvedIds = new Set(approvedDocs.map((ud) => ud.template_id));
    const missingTemplateIds = requiredDocTemplateIds.filter((dId) => !approvedIds.has(dId));

    if (missingTemplateIds.length === 0) {
      checks.push({
        key:    'documents',
        label:  'Required documents',
        status: 'PASS',
        details: { count: requiredDocTemplateIds.length },
      });
    } else {
      const templateRecords = await qb('document_templates').whereIn('id', missingTemplateIds);
      const firstMissingDocId = missingTemplateIds[0];
      const firstDocRecord = templateRecords.find((r) => r.id === firstMissingDocId);
      const docTitle = firstDocRecord?.title || 'Required Document / Safety Acknowledgment';

      checks.push({
        key:    'documents',
        label:  docTitle,
        status: 'MISSING',
        reason: `Document '${docTitle}' has not been approved or signed.`,
        action: {
          type:       'SIGN_DOCUMENT',
          templateId: firstMissingDocId,
        },
      });
      requiredNextSteps.push(`Sign or submit ${docTitle}`);
    }
  }

  // ── CHECK 5: fair_use ──────────────────────────────────────────────────────
  const limits = policyData.limits || {};
  const cancellation = policyData.cancellation || {};
  const maxActiveBookings = limits.maxActiveBookings || 5;
  const maxHoursPerWeek   = limits.maxHoursPerWeek || 20;
  const noShowStrikeLimit = cancellation.noShowStrikeLimit || 3;

  // Active bookings count
  const activeBookingsCountRow = await qb('bookings')
    .where({ user_id: userId })
    .whereIn('status', ['SCHEDULED', 'CHECKED_IN', 'IN_USE'])
    .count('id as count')
    .first();
  const activeBookingsCount = Number(activeBookingsCountRow?.count || 0);

  // Cumulative strikes
  const noShowStrikesRow = await qb('bookings')
    .where({ user_id: userId })
    .sum('no_show_count as strikes')
    .first();
  const noShowStrikes = Number(noShowStrikesRow?.strikes || 0);

  // Weekly hours used
  const now = new Date();
  const dayOfWeek = now.getUTCDay();
  const distanceToMonday = (dayOfWeek + 6) % 7;
  const startOfWeek = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - distanceToMonday, 0, 0, 0));
  const endOfWeek   = new Date(startOfWeek.getTime() + 7 * 24 * 60 * 60 * 1000 - 1);

  const weeklyBookings = await qb('bookings')
    .where({ user_id: userId })
    .whereIn('status', ['SCHEDULED', 'CHECKED_IN', 'IN_USE', 'RETURNED', 'CLOSED'])
    .where('start_at', '<', endOfWeek.toISOString())
    .where('end_at', '>', startOfWeek.toISOString())
    .select('start_at', 'end_at');

  let weeklyHoursUsed = 0;
  for (const b of weeklyBookings) {
    const s = Math.max(new Date(b.start_at).getTime(), startOfWeek.getTime());
    const e = Math.min(new Date(b.end_at).getTime(), endOfWeek.getTime());
    if (e > s) {
      weeklyHoursUsed += (e - s) / (1000 * 60 * 60);
    }
  }

  let requestedHours = 0;
  if (options.startAt && options.endAt) {
    requestedHours = (new Date(options.endAt) - new Date(options.startAt)) / (1000 * 60 * 60);
  }

  let fairUsePassed = true;
  let fairUseReason = null;

  if (activeBookingsCount >= maxActiveBookings) {
    fairUsePassed = false;
    fairUseReason = `Active bookings count (${activeBookingsCount}) reaches or exceeds maximum allowed (${maxActiveBookings}).`;
  } else if (noShowStrikes >= noShowStrikeLimit) {
    fairUsePassed = false;
    fairUseReason = `User has accumulated ${noShowStrikes} no-show strikes (limit: ${noShowStrikeLimit}).`;
  } else if ((weeklyHoursUsed + requestedHours) > maxHoursPerWeek) {
    fairUsePassed = false;
    fairUseReason = `Requested reservation brings weekly usage to ${(weeklyHoursUsed + requestedHours).toFixed(1)} hrs, exceeding weekly fair-use limit of ${maxHoursPerWeek} hrs.`;
  }

  if (fairUsePassed) {
    checks.push({
      key:    'fair_use',
      label:  `Weekly hours (${weeklyHoursUsed.toFixed(1)} of ${maxHoursPerWeek} used)`,
      status: 'PASS',
      details: {
        activeBookings: activeBookingsCount,
        maxActiveBookings,
        weeklyHoursUsed,
        maxHoursPerWeek,
        noShowStrikes,
      },
    });
  } else {
    checks.push({
      key:    'fair_use',
      label:  'Fair-use limits',
      status: 'FAIL',
      reason: fairUseReason,
    });
    requiredNextSteps.push(fairUseReason);
  }

  // ── CHECK 6: slot_free ─────────────────────────────────────────────────────
  if (options.startAt && options.endAt) {
    const { startAt, endAt } = options;

    // Check facility working hours
    const withinHours = isWithinWorkingHours(facility, startAt, endAt);
    if (!withinHours) {
      checks.push({
        key:    'slot_free',
        label:  'Selected slot is within working hours',
        status: 'FAIL',
        reason: 'Selected time slot is outside facility operating hours.',
      });
      requiredNextSteps.push('Choose a time slot within facility working hours');
    } else {
      // Check booking collisions
      const collision = await qb('bookings')
        .where('resource_id', resourceId)
        .whereIn('status', ['SCHEDULED', 'CHECKED_IN', 'IN_USE'])
        .where('start_at', '<', endAt)
        .where('end_at', '>', startAt)
        .first();

      if (collision) {
        checks.push({
          key:    'slot_free',
          label:  'Selected slot is free',
          status: 'FAIL',
          reason: 'Selected time slot collides with an existing reservation.',
        });
        requiredNextSteps.push('Choose a different time slot that is not reserved');
      } else {
        // Check blackout collisions
        const blackout = await qb('blackout_periods')
          .where('resource_id', resourceId)
          .whereNull('deleted_at')
          .where('start_at', '<', endAt)
          .where('end_at', '>', startAt)
          .first();

        if (blackout) {
          checks.push({
            key:    'slot_free',
            label:  'Selected slot is free',
            status: 'FAIL',
            reason: `Selected time slot overlaps a scheduled blackout (${blackout.reason || 'Maintenance'}).`,
          });
          requiredNextSteps.push('Choose a time slot outside scheduled blackout periods');
        } else {
          checks.push({
            key:    'slot_free',
            label:  'Selected slot is free',
            status: 'PASS',
          });
        }
      }
    }
  } else {
    // If no slot was specified, slot check is passed as preview
    checks.push({
      key:    'slot_free',
      label:  'Selected slot is free (preview)',
      status: 'PASS',
      details: { note: 'No slot specified; slot availability will be validated upon reservation.' },
    });
  }

  // ── SYNTHESIS ──────────────────────────────────────────────────────────────
  const eligible = checks.every((c) => c.status === 'PASS');
  // Can request: user may submit if structural membership and fair use pass,
  // even if training or documents are pending (they land in AWAITING_*).
  const canRequest =
    checks.find((c) => c.key === 'membership_verified')?.status === 'PASS' &&
    checks.find((c) => c.key === 'user_group_allowed')?.status === 'PASS' &&
    checks.find((c) => c.key === 'fair_use')?.status === 'PASS';

  return {
    eligible,
    canRequest,
    checks,
    requiredNextSteps,
  };
}

module.exports = {
  checkEligibility,
};
