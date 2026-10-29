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

// GET /api/v1/facilities/:id/bookings — Facility calendar feed (Spec §4.11)
const bookingsCtrl = require('../bookings/bookings.controller');
const { queryFacilityBookingsSchema } = require('../bookings/bookings.schema');

router.get(
  '/:id/bookings',
  authenticate,
  validate({ params: facilityIdParamSchema, query: queryFacilityBookingsSchema }),
  bookingsCtrl.getFacilityCalendar
);

// GET /api/v1/facilities/:id/service-requests — Service request queue for facility (Spec §4.13)
const { serviceRequestsController } = require('../serviceRequests/serviceRequests.controller');
const { listServiceRequestsQuerySchema } = require('../serviceRequests/serviceRequests.schema');

router.get(
  '/:id/service-requests',
  authenticate,
  validate({ params: facilityIdParamSchema, query: listServiceRequestsQuerySchema }),
  serviceRequestsController.listFacilityQueue
);

// GET /api/v1/facilities/:id/incidents — Facility incident queue (Spec §4.16)
const { incidentsController } = require('../incidents/incidents.controller');
const { listIncidentsQuerySchema } = require('../incidents/incidents.schema');

router.get(
  '/:id/incidents',
  authenticate,
  validate({ params: facilityIdParamSchema, query: listIncidentsQuerySchema }),
  incidentsController.listFacilityQueue
);

module.exports = router;

