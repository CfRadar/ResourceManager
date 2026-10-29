'use strict';

/**
 * src/modules/referrals/referrals.router.js
 *
 * Express routes for cross-institutional referrals.
 * Spec §4.14, Step 08.
 */

const express = require('express');
const { referralsController } = require('./referrals.controller');
const { authenticate }        = require('../../middleware/auth');
const { requireAnyRole }      = require('../../middleware/rbac');
const { validate }            = require('../../middleware/validate');
const {
  respondReferralSchema,
  releaseContactSchema,
  referralIdParamSchema,
  listReferralsQuerySchema,
} = require('./referrals.schema');

const router = express.Router();

// GET /api/v1/referrals/inbox — Receiving institution's referrals inbox
router.get(
  '/inbox',
  authenticate,
  validate({ query: listReferralsQuerySchema }),
  referralsController.listInbox
);

// GET /api/v1/referrals/:id — Detail view (with contact sanitization if not released)
router.get(
  '/:id',
  authenticate,
  validate({ params: referralIdParamSchema }),
  referralsController.getById
);

// POST /api/v1/referrals/:id/respond — Receiving institution responds (ACCEPT or DECLINE)
router.post(
  '/:id/respond',
  authenticate,
  validate({ params: referralIdParamSchema, body: respondReferralSchema }),
  referralsController.respond
);

// POST /api/v1/referrals/:id/release-contact — Coordinator releases contact info
router.post(
  '/:id/release-contact',
  authenticate,
  requireAnyRole(['COORDINATOR', 'ADMIN']),
  validate({ params: referralIdParamSchema, body: releaseContactSchema }),
  referralsController.releaseContact
);

module.exports = router;

