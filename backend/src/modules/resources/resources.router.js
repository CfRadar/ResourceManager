'use strict';

/**
 * src/modules/resources/resources.router.js
 *
 * Express router for resources catalog, policies, availability, and eligibility.
 * Spec §4.5, §4.6, §4.7, §4.8, Steps 04 & 05.
 */

const express = require('express');
const { resourcesController }   = require('./resources.controller');
const { policiesController }    = require('../policies/policies.controller');
const { availabilityRouter }    = require('../availability/availability.router');
const { eligibilityRouter }     = require('../eligibility/eligibility.router');
const { authenticate }          = require('../../middleware/auth');
const { validate }              = require('../../middleware/validate');
const {
  listResourcesQuerySchema,
  createResourceSchema,
  updateResourceSchema,
  resourceIdParamSchema,
} = require('./resources.schema');
const { updatePolicySchema }    = require('../policies/policies.schema');

const router = express.Router();

// ─── Public / Visibility-filtered endpoints ───────────────────────────────────

// GET /api/v1/resources/categories — Category list + tag vocabulary
router.get(
  '/categories',
  resourcesController.categories
);

// GET /api/v1/resources — Search/browse catalog
router.get(
  '/',
  authenticate.optional,
  validate({ query: listResourcesQuerySchema }),
  resourcesController.list
);

// GET /api/v1/resources/:id — Public detail + policy summary
router.get(
  '/:id',
  authenticate.optional,
  validate({ params: resourceIdParamSchema }),
  resourcesController.getById
);

// ─── Confidential Details ─────────────────────────────────────────────────────

// GET /api/v1/resources/:id/private-details — Access instructions (Approved booking / Manager)
router.get(
  '/:id/private-details',
  authenticate,
  validate({ params: resourceIdParamSchema }),
  resourcesController.getPrivateDetails
);

// ─── Management endpoints ─────────────────────────────────────────────────────

// PATCH /api/v1/resources/:id — Edit listing
router.patch(
  '/:id',
  authenticate,
  validate({ params: resourceIdParamSchema, body: updateResourceSchema }),
  resourcesController.update
);

// POST /api/v1/resources/:id/deactivate — Soft-deactivate listing (Owner only)
router.post(
  '/:id/deactivate',
  authenticate,
  validate({ params: resourceIdParamSchema }),
  resourcesController.deactivate
);

// ─── Policy Sub-routes (Spec §4.6) ────────────────────────────────────────────

// GET /api/v1/resources/:id/policy — Policy detail
router.get(
  '/:id/policy',
  authenticate.optional,
  validate({ params: resourceIdParamSchema }),
  policiesController.getPolicy
);

// PUT /api/v1/resources/:id/policy — Replace policy (bumps policy_version + 1)
router.put(
  '/:id/policy',
  authenticate,
  validate({ params: resourceIdParamSchema, body: updatePolicySchema }),
  policiesController.updatePolicy
);

// ─── Availability, Slots, Blackouts, & Polls (Step 05, Spec §4.7) ────────────
router.use('/:id', availabilityRouter);

// ─── Deterministic Eligibility Check (Step 05, Spec §4.8) ────────────────────
router.use('/:id', eligibilityRouter);

module.exports = router;
