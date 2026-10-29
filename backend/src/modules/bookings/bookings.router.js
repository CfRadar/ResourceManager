'use strict';

/**
 * src/modules/bookings/bookings.router.js
 *
 * Express routes for Bookings management and calendar actions.
 * Spec §4.11, Step 07.
 */

const { Router }       = require('express');
const { authenticate } = require('../../middleware/auth');
const { validate }     = require('../../middleware/validate');

const ctrl    = require('./bookings.controller');
const schemas = require('./bookings.schema');

const router = Router();

// All booking routes require authentication
router.use(authenticate);

// GET /api/v1/bookings/mine — View upcoming and past bookings
router.get(
  '/mine',
  validate({ query: schemas.queryMyBookingsSchema }),
  ctrl.getMyBookings
);

// GET /api/v1/bookings/:id/calendar.ics — iCal calendar export
router.get(
  '/:id/calendar.ics',
  validate({ params: schemas.bookingIdParamSchema }),
  ctrl.exportIcs
);

// GET /api/v1/bookings/:id — Full detail + QR payload
router.get(
  '/:id',
  validate({ params: schemas.bookingIdParamSchema }),
  ctrl.getBookingById
);

// POST /api/v1/bookings/:id/reschedule — Reschedule slot
router.post(
  '/:id/reschedule',
  validate({ params: schemas.bookingIdParamSchema, body: schemas.rescheduleBookingSchema }),
  ctrl.rescheduleBooking
);

// POST /api/v1/bookings/:id/extend — Extend active/scheduled booking
router.post(
  '/:id/extend',
  validate({ params: schemas.bookingIdParamSchema, body: schemas.extendBookingSchema }),
  ctrl.extendBooking
);

// POST /api/v1/bookings/:id/cancel — Cancel booking
router.post(
  '/:id/cancel',
  validate({ params: schemas.bookingIdParamSchema, body: schemas.cancelBookingSchema }),
  ctrl.cancelBooking
);

// POST /api/v1/bookings/:id/mark-no-show — Manager mark no-show after grace window
router.post(
  '/:id/mark-no-show',
  validate({ params: schemas.bookingIdParamSchema, body: schemas.markNoShowSchema }),
  ctrl.markNoShow
);

// ── Check-in & Condition Reports Sub-routes (Step 07) ────────────────────────
const checkinRouter = require('../checkin/checkin.router');
router.use('/', checkinRouter);

module.exports = router;
