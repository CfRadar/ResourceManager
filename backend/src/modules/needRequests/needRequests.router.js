'use strict';

/**
 * src/modules/needRequests/needRequests.router.js
 *
 * Express routes for missing-resource need requests.
 * Spec §4.14, Step 08.
 */

const express = require('express');
const { needRequestsController } = require('./needRequests.controller');
const { authenticate }           = require('../../middleware/auth');
const { requireAnyRole }         = require('../../middleware/rbac');
const { validate }               = require('../../middleware/validate');
const {
  createNeedRequestSchema,
  closeNeedRequestSchema,
  needRequestIdParamSchema,
  listNeedRequestsQuerySchema,
} = require('./needRequests.schema');
const { createReferralSchema }   = require('../referrals/referrals.schema');

const router = express.Router();

// POST /api/v1/need-requests — Create a missing-resource request
router.post(
  '/',
  authenticate,
  validate({ body: createNeedRequestSchema }),
  needRequestsController.create
);

// GET /api/v1/need-requests/mine — Requester's need requests
router.get(
  '/mine',
  authenticate,
  validate({ query: listNeedRequestsQuerySchema }),
  needRequestsController.listMine
);

// GET /api/v1/need-requests — Coordinator queue
router.get(
  '/',
  authenticate,
  requireAnyRole(['COORDINATOR', 'ADMIN']),
  validate({ query: listNeedRequestsQuerySchema }),
  needRequestsController.listCoordinatorQueue
);

// GET /api/v1/need-requests/:id — Need request detail
router.get(
  '/:id',
  authenticate,
  validate({ params: needRequestIdParamSchema }),
  needRequestsController.getById
);

// GET /api/v1/need-requests/:id/candidates — Candidate resource discovery (AI / deterministic)
router.get(
  '/:id/candidates',
  authenticate,
  requireAnyRole(['COORDINATOR', 'ADMIN']),
  validate({ params: needRequestIdParamSchema }),
  needRequestsController.getCandidates
);

// POST /api/v1/need-requests/:id/referrals — Coordinator creates referral
router.post(
  '/:id/referrals',
  authenticate,
  requireAnyRole(['COORDINATOR', 'ADMIN']),
  validate({ params: needRequestIdParamSchema, body: createReferralSchema }),
  needRequestsController.createReferral
);

// POST /api/v1/need-requests/:id/close — Coordinator closes request with outcome
router.post(
  '/:id/close',
  authenticate,
  requireAnyRole(['COORDINATOR', 'ADMIN']),
  validate({ params: needRequestIdParamSchema, body: closeNeedRequestSchema }),
  needRequestsController.close
);

module.exports = router;

