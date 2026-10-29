'use strict';

/**
 * src/modules/eligibility/eligibility.router.js
 *
 * Eligibility check router.
 * Spec §4.8.
 */

const express = require('express');
const { authenticate } = require('../../middleware/auth');
const { validate } = require('../../middleware/validate');
const { eligibilityController } = require('./eligibility.controller');
const {
  eligibilityCheckSchema,
  resourceIdParamSchema,
} = require('./eligibility.schema');

const eligibilityRouter = express.Router({ mergeParams: true });

eligibilityRouter.post(
  '/eligibility-check',
  authenticate,
  validate({ params: resourceIdParamSchema, body: eligibilityCheckSchema }),
  eligibilityController.checkEligibility
);

module.exports = { eligibilityRouter };
