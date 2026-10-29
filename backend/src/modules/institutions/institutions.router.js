'use strict';

/**
 * src/modules/institutions/institutions.router.js
 *
 * Express router for institutions, membership requests, and partner linking.
 * Spec §4.3, §4.4, Step 03.
 */

const express = require('express');
const { institutionsController } = require('./institutions.controller');
const { facilitiesController }   = require('../facilities/facilities.controller');
const { authenticate }           = require('../../middleware/auth');
const {
  requireRole,
  requireInstitutionRole,
  ROLES,
} = require('../../middleware/rbac');
const { validate }               = require('../../middleware/validate');
const {
  listInstitutionsQuerySchema,
  listMembershipRequestsQuerySchema,
  createInstitutionSchema,
  updateInstitutionSchema,
  createMembershipRequestSchema,
  membershipDecisionSchema,
  linkPartnerSchema,
  institutionIdParamSchema,
  decisionParamSchema,
} = require('./institutions.schema');
const {
  createFacilitySchema,
  institutionFacilityParamSchema,
} = require('../facilities/facilities.schema');

const router = express.Router();

// ─── Public routes ────────────────────────────────────────────────────────────

// GET /api/v1/institutions – List verified institutions
router.get(
  '/',
  validate({ query: listInstitutionsQuerySchema }),
  institutionsController.listVerified
);

// GET /api/v1/institutions/:id – Institution detail + public facilities
router.get(
  '/:id',
  validate({ params: institutionIdParamSchema }),
  institutionsController.getById
);

// GET /api/v1/institutions/:id/partners – List partner institutions
router.get(
  '/:id/partners',
  validate({ params: institutionIdParamSchema }),
  institutionsController.listPartners
);

// ─── Platform Admin routes ────────────────────────────────────────────────────

// POST /api/v1/institutions – Register new institution
router.post(
  '/',
  authenticate,
  requireRole(ROLES.ADMIN),
  validate({ body: createInstitutionSchema }),
  institutionsController.register
);

// ─── Institution-scoped Admin routes ──────────────────────────────────────────

// PATCH /api/v1/institutions/:id – Update institution profile
router.patch(
  '/:id',
  authenticate,
  validate({ params: institutionIdParamSchema, body: updateInstitutionSchema }),
  requireInstitutionRole(ROLES.ADMIN, 'id'),
  institutionsController.update
);

// ─── Membership Request routes ────────────────────────────────────────────────

// POST /api/v1/institutions/:id/membership-requests – Submit membership request
router.post(
  '/:id/membership-requests',
  authenticate,
  validate({ params: institutionIdParamSchema, body: createMembershipRequestSchema }),
  institutionsController.createMembershipRequest
);

// GET /api/v1/institutions/:id/membership-requests – List pending applications
router.get(
  '/:id/membership-requests',
  authenticate,
  validate({ params: institutionIdParamSchema, query: listMembershipRequestsQuerySchema }),
  requireInstitutionRole(ROLES.ADMIN, 'id'),
  institutionsController.listMembershipRequests
);

// POST /api/v1/institutions/:id/membership-requests/:reqId/decision – Review decision
router.post(
  '/:id/membership-requests/:reqId/decision',
  authenticate,
  validate({ params: decisionParamSchema, body: membershipDecisionSchema }),
  requireInstitutionRole(ROLES.ADMIN, 'id'),
  institutionsController.decideMembershipRequest
);

// ─── Partner Linking routes ───────────────────────────────────────────────────

// POST /api/v1/institutions/:id/partners – Link partner institution
router.post(
  '/:id/partners',
  authenticate,
  validate({ params: institutionIdParamSchema, body: linkPartnerSchema }),
  requireInstitutionRole(ROLES.ADMIN, 'id'),
  institutionsController.linkPartner
);

// ─── Facility Creation on Institution ─────────────────────────────────────────

// POST /api/v1/institutions/:id/facilities – Create facility for institution
router.post(
  '/:id/facilities',
  authenticate,
  validate({ params: institutionFacilityParamSchema, body: createFacilitySchema }),
  requireInstitutionRole([ROLES.ADMIN, ROLES.OWNER], 'id'),
  facilitiesController.create
);

module.exports = router;
