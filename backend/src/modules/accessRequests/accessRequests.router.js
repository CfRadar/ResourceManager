'use strict';

/**
 * src/modules/accessRequests/accessRequests.router.js
 *
 * Express routes for Access Requests and Review Workflow.
 * Spec §4.9, §4.10, Step 06.
 */

const { Router }       = require('express');
const { authenticate } = require('../../middleware/auth');
const { validate }     = require('../../middleware/validate');
const { z }            = require('zod');

const ctrl = require('./accessRequests.controller');
const schemas = require('./accessRequests.schema');

const router = Router();

const paramsIdSchema = z.object({
  id: schemas.uuidSchema,
});

// All access request routes require authentication
router.use(authenticate);

// ── Requesters Endpoints ─────────────────────────────────────────────────────

// POST /api/v1/access-requests — Create draft or submitted access request
router.post(
  '/',
  validate({ body: schemas.createAccessRequestSchema }),
  ctrl.createRequest
);

// GET /api/v1/access-requests/mine — View own requests
router.get(
  '/mine',
  validate({ query: schemas.queryRequestsSchema }),
  ctrl.getMyRequests
);

// GET /api/v1/access-requests/:id — View request detail
router.get(
  '/:id',
  validate({ params: paramsIdSchema }),
  ctrl.getRequestById
);

// PATCH /api/v1/access-requests/:id — Edit draft or update following info request
router.patch(
  '/:id',
  validate({ params: paramsIdSchema, body: schemas.updateAccessRequestSchema }),
  ctrl.updateDraft
);

// POST /api/v1/access-requests/:id/submit — Submit draft
router.post(
  '/:id/submit',
  validate({ params: paramsIdSchema }),
  ctrl.submitDraft
);

// POST /api/v1/access-requests/:id/cancel — Cancel request
router.post(
  '/:id/cancel',
  validate({ params: paramsIdSchema, body: schemas.cancelSchema }),
  ctrl.cancelRequest
);

// POST /api/v1/access-requests/:id/respond — Respond to info request
router.post(
  '/:id/respond',
  validate({ params: paramsIdSchema, body: schemas.respondInfoSchema }),
  ctrl.respondInfo
);

// POST /api/v1/access-requests/:id/appeal — Appeal rejection or waitlist
router.post(
  '/:id/appeal',
  validate({ params: paramsIdSchema, body: schemas.appealSchema }),
  ctrl.appealDecision
);

// ── Reviewer & Manager Endpoints ─────────────────────────────────────────────

// POST /api/v1/access-requests/:id/start-review — Lock reviewer and begin review
router.post(
  '/:id/start-review',
  validate({ params: paramsIdSchema }),
  ctrl.startReview
);

// POST /api/v1/access-requests/:id/request-info — Request clarification/info
router.post(
  '/:id/request-info',
  validate({ params: paramsIdSchema, body: schemas.requestInfoSchema }),
  ctrl.requestInfo
);

// POST /api/v1/access-requests/:id/decision — Approve, reject, or waitlist
router.post(
  '/:id/decision',
  validate({ params: paramsIdSchema, body: schemas.decisionSchema }),
  ctrl.makeDecision
);

module.exports = router;
