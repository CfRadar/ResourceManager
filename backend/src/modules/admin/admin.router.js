'use strict';

/**
 * src/modules/admin/admin.router.js
 *
 * Spec §4.23: Admin and System control routes.
 */

const express = require('express');
const { authenticate } = require('../../middleware/auth');
const adminController = require('./admin.controller');

const router = express.Router();

router.use(authenticate);

router.get('/jobs',                 adminController.getJobs);
router.post('/jobs/:jobName/run',   adminController.triggerJob);
router.get('/users',                adminController.listUsers);
router.post('/users/:id/suspend',   adminController.suspendUser);
router.post('/seed-demo',           adminController.seedDemo);

module.exports = router;
