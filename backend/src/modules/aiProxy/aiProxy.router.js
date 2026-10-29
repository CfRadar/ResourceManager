'use strict';

/**
 * src/modules/aiProxy/aiProxy.router.js
 *
 * Spec §4.24: AI-facing endpoints on Express (proxy layer).
 */

const express = require('express');
const { authenticate } = require('../../middleware/auth');
const aiProxyController = require('./aiProxy.controller');

const router = express.Router();

router.use(authenticate);

router.post('/match-need',        aiProxyController.matchNeed);
router.post('/parse-need',        aiProxyController.parseNeed);
router.post('/incident-summary',  aiProxyController.incidentSummary);
router.post('/policy-summary',    aiProxyController.policySummary);

module.exports = router;
