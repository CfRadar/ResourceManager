'use strict';

/**
 * src/modules/admin/admin.controller.js
 */

const adminService = require('./admin.service');
const { suspendUserSchema, searchUsersQuerySchema } = require('./admin.schema');

class AdminController {
  async listUsers(req, res, next) {
    try {
      const parsedQuery = searchUsersQuerySchema.parse(req.query);
      const result = await adminService.listUsers(req.user, parsedQuery);
      res.json({
        ok: true,
        data: result,
      });
    } catch (err) {
      next(err);
    }
  }

  async suspendUser(req, res, next) {
    try {
      const { id } = req.params;
      const { reason } = suspendUserSchema.parse(req.body);
      const updated = await adminService.suspendUser(id, req.user, reason);
      res.json({
        ok: true,
        data: updated,
      });
    } catch (err) {
      next(err);
    }
  }

  async getJobs(req, res, next) {
    try {
      const jobs = await adminService.getSchedulerJobs(req.user);
      res.json({
        ok: true,
        data: jobs,
      });
    } catch (err) {
      next(err);
    }
  }

  async triggerJob(req, res, next) {
    try {
      const { jobName } = req.params;
      const result = await adminService.triggerJob(jobName, req.user);
      res.json({
        ok: true,
        data: result,
      });
    } catch (err) {
      next(err);
    }
  }

  async seedDemo(req, res, next) {
    try {
      const result = await adminService.seedDemo(req.user);
      res.json({
        ok: true,
        data: result,
      });
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new AdminController();

