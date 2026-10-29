'use strict';

/**
 * src/modules/serviceRequests/serviceRequests.router.js
 *
 * Express routes for staff-operated service requests.
 * Spec §4.13, Step 08.
 */

const express = require('express');
const { serviceRequestsController } = require('./serviceRequests.controller');
const { authenticate }              = require('../../middleware/auth');
const { requireAnyRole }            = require('../../middleware/rbac');
const { validate }                  = require('../../middleware/validate');
const {
  createServiceRequestSchema,
  scopeReviewSchema,
  createQuoteSchema,
  respondQuoteSchema,
  materialsReceivedSchema,
  progressUpdateSchema,
  deliverOutputSchema,
  confirmCompletionSchema,
  decisionSchema,
  cancelServiceRequestSchema,
  serviceRequestIdParamSchema,
  listServiceRequestsQuerySchema,
} = require('./serviceRequests.schema');

const router = express.Router();

// POST /api/v1/service-requests — Create request (draft or submit)
router.post(
  '/',
  authenticate,
  validate({ body: createServiceRequestSchema }),
  serviceRequestsController.create
);

// GET /api/v1/service-requests/mine — Requester's service requests
router.get(
  '/mine',
  authenticate,
  validate({ query: listServiceRequestsQuerySchema }),
  serviceRequestsController.listMine
);

// GET /api/v1/service-requests/:id — Service request detail + active quote
router.get(
  '/:id',
  authenticate,
  validate({ params: serviceRequestIdParamSchema }),
  serviceRequestsController.getById
);

// POST /api/v1/service-requests/:id/scope-review — Manager marks feasible / not feasible
router.post(
  '/:id/scope-review',
  authenticate,
  requireAnyRole(['MANAGER', 'OPERATOR', 'OWNER', 'ADMIN']),
  validate({ params: serviceRequestIdParamSchema, body: scopeReviewSchema }),
  serviceRequestsController.reviewScope
);

// POST /api/v1/service-requests/:id/quote — Manager issues itemized quote
router.post(
  '/:id/quote',
  authenticate,
  requireAnyRole(['MANAGER', 'OWNER', 'ADMIN']),
  validate({ params: serviceRequestIdParamSchema, body: createQuoteSchema }),
  serviceRequestsController.issueQuote
);

// POST /api/v1/service-requests/:id/quote/respond — Requester accepts or declines
router.post(
  '/:id/quote/respond',
  authenticate,
  validate({ params: serviceRequestIdParamSchema, body: respondQuoteSchema }),
  serviceRequestsController.respondQuote
);

// POST /api/v1/service-requests/:id/materials-received — Operator records sample intake
router.post(
  '/:id/materials-received',
  authenticate,
  requireAnyRole(['OPERATOR', 'MANAGER', 'OWNER', 'ADMIN']),
  validate({ params: serviceRequestIdParamSchema, body: materialsReceivedSchema }),
  serviceRequestsController.recordMaterialsReceived
);

// POST /api/v1/service-requests/:id/progress — Milestone updates (STARTED, IN_ANALYSIS)
router.post(
  '/:id/progress',
  authenticate,
  requireAnyRole(['OPERATOR', 'MANAGER', 'OWNER', 'ADMIN']),
  validate({ params: serviceRequestIdParamSchema, body: progressUpdateSchema }),
  serviceRequestsController.updateProgress
);

// POST /api/v1/service-requests/:id/deliver-output — Upload outputs/deliverables
router.post(
  '/:id/deliver-output',
  authenticate,
  requireAnyRole(['OPERATOR', 'MANAGER', 'OWNER', 'ADMIN']),
  validate({ params: serviceRequestIdParamSchema, body: deliverOutputSchema }),
  serviceRequestsController.deliverOutput
);

// POST /api/v1/service-requests/:id/confirm-completion — Requester confirms or disputes
router.post(
  '/:id/confirm-completion',
  authenticate,
  validate({ params: serviceRequestIdParamSchema, body: confirmCompletionSchema }),
  serviceRequestsController.confirmCompletion
);

// POST /api/v1/service-requests/:id/decision — Manager rejects request with reason
router.post(
  '/:id/decision',
  authenticate,
  requireAnyRole(['MANAGER', 'OWNER', 'ADMIN']),
  validate({ params: serviceRequestIdParamSchema, body: decisionSchema }),
  serviceRequestsController.reject
);

// POST /api/v1/service-requests/:id/cancel — Cancel request
router.post(
  '/:id/cancel',
  authenticate,
  validate({ params: serviceRequestIdParamSchema, body: cancelServiceRequestSchema }),
  serviceRequestsController.cancel
);

module.exports = router;

