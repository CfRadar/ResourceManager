'use strict';

/**
 * src/modules/checkin/checkin.router.js
 *
 * Express routes for Check-In, In-Use, Check-Out, and Return Confirmation.
 * Spec §4.12, Step 07.
 */

const { Router }       = require('express');
const { authenticate } = require('../../middleware/auth');
const { validate }     = require('../../middleware/validate');
const { z }            = require('zod');

const ctrl   = require('./checkin.controller');
const schemas = require('./checkin.schema');

const router = Router({ mergeParams: true });

const paramsIdSchema = z.object({
  id: schemas.uuidSchema,
});

router.use(authenticate);

// POST /api/v1/bookings/:id/check-in — Check-in with BEFORE condition report
router.post(
  '/:id/check-in',
  validate({ params: paramsIdSchema, body: schemas.checkInSchema }),
  ctrl.checkIn
);

// POST /api/v1/bookings/:id/start-use — Transition CHECKED_IN -> IN_USE
router.post(
  '/:id/start-use',
  validate({ params: paramsIdSchema }),
  ctrl.startUse
);

// POST /api/v1/bookings/:id/check-out — Check-out with AFTER condition report & diff
router.post(
  '/:id/check-out',
  validate({ params: paramsIdSchema, body: schemas.checkOutSchema }),
  ctrl.checkOut
);

// POST /api/v1/bookings/:id/confirm-return — Manager confirm clean return or flag incident
router.post(
  '/:id/confirm-return',
  validate({ params: paramsIdSchema, body: schemas.confirmReturnSchema }),
  ctrl.confirmReturn
);

// GET /api/v1/bookings/:id/condition-reports — View BEFORE and AFTER reports + diff
router.get(
  '/:id/condition-reports',
  validate({ params: paramsIdSchema }),
  ctrl.getConditionReports
);

module.exports = router;
