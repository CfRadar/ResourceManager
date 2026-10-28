'use strict';

/**
 * src/services/eligibilityEngine.js
 *
 * Deterministic eligibility rule engine (no AI).
 *
 * Spec §4.8: runs the eligibility checklist for a resource + user combination.
 * Called from:
 *   - GET  /resources/:id/eligibility-check (preview, client display)
 *   - POST /access-requests                 (server-side re-run on submit)
 *   - POST /access-requests/:id/decision    (re-run on approval; client result not trusted)
 *
 * Implemented in: Step 05 (Availability, Slots & Eligibility).
 *
 * Interface (to be implemented):
 *
 *   checkEligibility(resourceId, userId, options)
 *     → EligibilityResult
 *
 * @param {string} resourceId
 * @param {string} userId
 * @param {object} [options]
 *   @param {string}  [options.accessMode]
 *   @param {string}  [options.startAt]   - ISO-8601 UTC
 *   @param {string}  [options.endAt]     - ISO-8601 UTC
 *   @param {object}  [options.trx]       - Knex transaction (for atomic checks)
 *
 * @returns {Promise<EligibilityResult>}
 *
 * @typedef {Object} EligibilityResult
 * @property {boolean} eligible          - All hard checks pass.
 * @property {boolean} canRequest        - User may still submit (policy dependent).
 * @property {Array}   checks            - Per-check results with action links.
 * @property {string[]} requiredNextSteps
 */

// Placeholder — full implementation in Step 05.
async function checkEligibility(_resourceId, _userId, _options = {}) {
  throw new Error(
    '[eligibilityEngine] Not yet implemented. This service will be built in Step 05 ' +
    '(Availability, Slots & Eligibility).'
  );
}

module.exports = { checkEligibility };
