'use strict';

/**
 * src/modules/audit/audit.router.js
 *
 * Spec §4.20: Audit and Transparency endpoints.
 */

const express = require('express');
const { authenticate } = require('../../middleware/auth');
const auditController = require('./audit.controller');

const router = express.Router();

router.use(authenticate);

router.get('/requests/:id',      auditController.getEntityAudit);
router.get('/resources/:id',     auditController.getResourceAudit);
router.get('/institution/:id',   auditController.getInstitutionAudit);
router.get('/verify/:scope/:id', auditController.verifyScope);
router.post('/notes',            auditController.addNote);

module.exports = router;
