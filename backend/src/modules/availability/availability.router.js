'use strict';

/**
 * src/modules/availability/availability.router.js
 *
 * Availability, slots, blackouts, and polls routing.
 * Spec §4.7.
 */

const express = require('express');
const { authenticate } = require('../../middleware/auth');
const { validate } = require('../../middleware/validate');
const { availabilityController } = require('./availability.controller');
const {
  availabilityQuerySchema,
  slotsQuerySchema,
  createBlackoutSchema,
  resourceIdParamSchema,
  blackoutParamsSchema,
  createPollSchema,
  votePollParamSchema,
} = require('./availability.schema');

const availabilityRouter = express.Router({ mergeParams: true });

// Availability & Slots
availabilityRouter.get(
  '/availability',
  authenticate.optional,
  validate({ params: resourceIdParamSchema, query: availabilityQuerySchema }),
  availabilityController.getAvailability
);

availabilityRouter.get(
  '/slots',
  authenticate,
  validate({ params: resourceIdParamSchema, query: slotsQuerySchema }),
  availabilityController.getSlots
);

// Blackout Management
availabilityRouter.post(
  '/blackouts',
  authenticate,
  validate({ params: resourceIdParamSchema, body: createBlackoutSchema }),
  availabilityController.createBlackout
);

availabilityRouter.delete(
  '/blackouts/:blackoutId',
  authenticate,
  validate({ params: blackoutParamsSchema }),
  availabilityController.deleteBlackout
);

// Availability Polls (Resource-scoped)
availabilityRouter.get(
  '/availability-polls',
  authenticate,
  validate({ params: resourceIdParamSchema }),
  availabilityController.listPolls
);

availabilityRouter.post(
  '/availability-polls',
  authenticate,
  validate({ params: resourceIdParamSchema, body: createPollSchema }),
  availabilityController.createPoll
);

// Poll Voting router (Top-level /availability-polls)
const pollsRouter = express.Router();
pollsRouter.post(
  '/:pollId/vote',
  authenticate,
  validate({ params: votePollParamSchema }),
  availabilityController.votePoll
);

module.exports = {
  availabilityRouter,
  pollsRouter,
};
