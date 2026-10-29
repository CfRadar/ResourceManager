'use strict';

/**
 * src/modules/incidents/incidents.router.js
 *
 * Express routes for incidents, rulings, notes, and appeals.
 * Spec §4.16, Step 09.
 */

const express = require('express');
const { incidentsController } = require('./incidents.controller');
const { authenticate }        = require('../../middleware/auth');
const { requireAnyRole }      = require('../../middleware/rbac');
const { validate }            = require('../../middleware/validate');
const {
  createIncidentSchema,
  addNoteSchema,
  requestInfoSchema,
  respondInfoSchema,
  resolveIncidentSchema,
  appealIncidentSchema,
  incidentIdParamSchema,
  listIncidentsQuerySchema,
} = require('./incidents.schema');

const router = express.Router();

// POST /api/v1/incidents — File a new incident
router.post(
  '/',
  authenticate,
  validate({ body: createIncidentSchema }),
  incidentsController.report
);

// GET /api/v1/incidents/mine — Incidents caller is party to
router.get(
  '/mine',
  authenticate,
  validate({ query: listIncidentsQuerySchema }),
  incidentsController.listMine
);

// GET /api/v1/incidents/:id — Detail view (internal notes sanitized for requesters)
router.get(
  '/:id',
  authenticate,
  validate({ params: incidentIdParamSchema }),
  incidentsController.getById
);

// POST /api/v1/incidents/:id/notes — Append note (visibility: INTERNAL | SHARED)
router.post(
  '/:id/notes',
  authenticate,
  validate({ params: incidentIdParamSchema, body: addNoteSchema }),
  incidentsController.addNote
);

// POST /api/v1/incidents/:id/request-info — Manager asks party for clarification
router.post(
  '/:id/request-info',
  authenticate,
  requireAnyRole(['MANAGER', 'OWNER', 'ADMIN']),
  validate({ params: incidentIdParamSchema, body: requestInfoSchema }),
  incidentsController.requestInfo
);

// POST /api/v1/incidents/:id/respond — Party right-of-reply response & evidence
router.post(
  '/:id/respond',
  authenticate,
  validate({ params: incidentIdParamSchema, body: respondInfoSchema }),
  incidentsController.respondInfo
);

// POST /api/v1/incidents/:id/resolve — Manager issues impartial ruling
router.post(
  '/:id/resolve',
  authenticate,
  requireAnyRole(['MANAGER', 'OWNER', 'ADMIN']),
  validate({ params: incidentIdParamSchema, body: resolveIncidentSchema }),
  incidentsController.resolve
);

// POST /api/v1/incidents/:id/appeal — Escalate ruling to second reviewer
router.post(
  '/:id/appeal',
  authenticate,
  validate({ params: incidentIdParamSchema, body: appealIncidentSchema }),
  incidentsController.appeal
);

// POST /api/v1/incidents/:id/draft-summary — AI-assisted incident summary draft
router.post(
  '/:id/draft-summary',
  authenticate,
  requireAnyRole(['MANAGER', 'OWNER', 'ADMIN']),
  validate({ params: incidentIdParamSchema }),
  incidentsController.draftSummary
);

module.exports = router;

