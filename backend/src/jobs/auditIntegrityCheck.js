'use strict';

/**
 * src/jobs/auditIntegrityCheck.js
 *
 * Spec §5.3 & §4.20: Daily integrity check validating SHA-256 hash chains across audit events.
 */

const { verifyChain } = require('../services/auditChain');

let latestIntegrityStatus = {
  valid:              true,
  firstBrokenEventId: null,
  checkedAt:          new Date().toISOString(),
};

async function runAuditIntegrityCheck() {
  const result = await verifyChain('all', null);
  latestIntegrityStatus = {
    valid:              result.valid,
    firstBrokenEventId: result.firstBrokenEventId || null,
    checkedAt:          new Date().toISOString(),
  };

  return latestIntegrityStatus;
}

function getLatestIntegrityStatus() {
  return latestIntegrityStatus;
}

module.exports = { runAuditIntegrityCheck, getLatestIntegrityStatus };

