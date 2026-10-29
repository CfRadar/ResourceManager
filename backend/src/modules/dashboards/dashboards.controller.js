'use strict';

/**
 * src/modules/dashboards/dashboards.controller.js
 */

const dashboardsService = require('./dashboards.service');

class DashboardsController {
  async getRequesterDashboard(req, res, next) {
    try {
      const data = await dashboardsService.getRequesterDashboard(req.user.sub);
      res.json({
        ok: true,
        data,
      });
    } catch (err) {
      next(err);
    }
  }

  async getManagerDashboard(req, res, next) {
    try {
      const data = await dashboardsService.getManagerDashboard(req.user);
      res.json({
        ok: true,
        data,
      });
    } catch (err) {
      next(err);
    }
  }

  async getCoordinatorDashboard(req, res, next) {
    try {
      const data = await dashboardsService.getCoordinatorDashboard(req.user);
      res.json({
        ok: true,
        data,
      });
    } catch (err) {
      next(err);
    }
  }

  async getAdminDashboard(req, res, next) {
    try {
      const data = await dashboardsService.getAdminDashboard(req.user);
      res.json({
        ok: true,
        data,
      });
    } catch (err) {
      next(err);
    }
  }

  async getUtilisationAnalytics(req, res, next) {
    try {
      const { resourceId, from, to } = req.query;
      const data = await dashboardsService.getUtilisationAnalytics({ resourceId, from, to });
      res.json({
        ok: true,
        data,
      });
    } catch (err) {
      next(err);
    }
  }

  async getDemandAnalytics(req, res, next) {
    try {
      const { resourceId } = req.query;
      const data = await dashboardsService.getDemandAnalytics({ resourceId });
      res.json({
        ok: true,
        data,
      });
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new DashboardsController();

