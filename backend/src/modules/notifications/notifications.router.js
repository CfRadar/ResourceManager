'use strict';

/**
 * src/modules/notifications/notifications.router.js
 *
 * Spec §4.19: In-app notifications endpoints.
 */

const express = require('express');
const { authenticate } = require('../../middleware/auth');
const notificationsController = require('./notifications.controller');

const router = express.Router();

router.use(authenticate);

router.get('/',               notificationsController.listMine);
router.post('/read-all',      notificationsController.markAllRead);
router.post('/:id/read',      notificationsController.markRead);

module.exports = router;
