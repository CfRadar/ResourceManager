'use strict';

/**
 * src/modules/facilities/facilities.router.js
 *
 * Express router for facility queries and updates.
 * Spec §4.4, §4.5, Step 03 & Step 04.
 */

const express = require('express');
const { facilitiesController }   = require('./facilities.controller');
const { resourcesController }    = require('../resources/resources.controller');
const { authenticate }           = require('../../middleware/auth');
const { validate }               = require('../../middleware/validate');
const {
  listFacilitiesQuerySchema,
  facilityIdParamSchema,
  updateFacilitySchema,
} = require('./facilities.schema');
const {
  createResourceSchema,
} = require('../resources/resources.schema');

const router = express.Router();

// GET /api/v1/facilities – List visible facilities
router.get(
  '/',
  validate({ query: listFacilitiesQuerySchema }),
  facilitiesController.list
);

// GET /api/v1/facilities/:id – Facility details (public fields)
router.get(
  '/:id',
  validate({ params: facilityIdParamSchema }),
  facilitiesController.getById
);

// PATCH /api/v1/facilities/:id – Update facility coordinates or hours (Owner/Admin)
router.patch(
  '/:id',
  authenticate,
  validate({ params: facilityIdParamSchema, body: updateFacilitySchema }),
  facilitiesController.update
);

// POST /api/v1/facilities/:id/resources — Create resource under facility (Owner/Manager)
router.post(
  '/:id/resources',
  authenticate,
  validate({ params: facilityIdParamSchema, body: createResourceSchema }),
  resourcesController.create
);

// GET /api/v1/facilities/:id/access-requests — Reviewer queue for facility (Spec §4.9)
const accessRequestsCtrl = require('../accessRequests/accessRequests.controller');
const { queryRequestsSchema } = require('../accessRequests/accessRequests.schema');

router.get(
  '/:id/access-requests',
  authenticate,
  validate({ params: facilityIdParamSchema, query: queryRequestsSchema }),
  accessRequestsCtrl.getReviewQueue
);

module.exports = router;

