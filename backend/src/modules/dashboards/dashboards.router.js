'use strict';

/**
 * src/modules/dashboards/dashboards.router.js
 *
 * Spec §4.21: Dashboard aggregations and analytics endpoints.
 */

const express = require('express');
const { authenticate } = require('../../middleware/auth');
const dashboardsController = require('./dashboards.controller');

const dashboardRouter = express.Router();
dashboardRouter.use(authenticate);

dashboardRouter.get('/requester',   dashboardsController.getRequesterDashboard);
dashboardRouter.get('/manager',     dashboardsController.getManagerDashboard);
dashboardRouter.get('/coordinator', dashboardsController.getCoordinatorDashboard);
dashboardRouter.get('/admin',       dashboardsController.getAdminDashboard);

const analyticsRouter = express.Router();
analyticsRouter.use(authenticate);

analyticsRouter.get('/utilisation', dashboardsController.getUtilisationAnalytics);
analyticsRouter.get('/demand',      dashboardsController.getDemandAnalytics);

module.exports = {
  dashboardRouter,
  analyticsRouter,
};
