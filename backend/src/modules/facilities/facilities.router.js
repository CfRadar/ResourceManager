'use strict';

/**
 * src/modules/facilities/facilities.router.js
 *
 * Express router for facility queries and updates.
 * Spec §4.4, Step 03.
 */

const express = require('express');
const { facilitiesController }   = require('./facilities.controller');
const { authenticate }           = require('../../middleware/auth');
const { validate }               = require('../../middleware/validate');
const {
  listFacilitiesQuerySchema,
  facilityIdParamSchema,
  updateFacilitySchema,
} = require('./facilities.schema');

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

module.exports = router;
