'use strict';

/**
 * src/modules/needRequests/needRequests.controller.js
 *
 * HTTP controller for missing-resource need requests.
 * Spec §4.14, Step 08.
 */

const { needRequestService } = require('./needRequests.service');
const { referralService }    = require('../referrals/referrals.service');

const needRequestsController = {
  async create(req, res, next) {
    try {
      const data = await needRequestService.create(req.user.sub, req.body);
      return res.status(201).json({ ok: true, data });
    } catch (err) {
      next(err);
    }
  },

  async getById(req, res, next) {
    try {
      const data = await needRequestService.getById(req.params.id, req.user);
      return res.status(200).json({ ok: true, data });
    } catch (err) {
      next(err);
    }
  },

  async listMine(req, res, next) {
    try {
      const result = await needRequestService.listMine(req.user.sub, req.query);
      return res.status(200).json({
        ok:   true,
        data: result.items,
        meta: {
          total: result.total,
          page:  result.page,
          limit: result.limit,
        },
      });
    } catch (err) {
      next(err);
    }
  },

  async listCoordinatorQueue(req, res, next) {
    try {
      const result = await needRequestService.listCoordinatorQueue(req.query);
      return res.status(200).json({
        ok:   true,
        data: result.items,
        meta: {
          total: result.total,
          page:  result.page,
          limit: result.limit,
        },
      });
    } catch (err) {
      next(err);
    }
  },

  async getCandidates(req, res, next) {
    try {
      const data = await needRequestService.getCandidates(req.params.id, req.user);
      return res.status(200).json({ ok: true, data });
    } catch (err) {
      next(err);
    }
  },

  async createReferral(req, res, next) {
    try {
      const data = await referralService.createReferral(req.params.id, req.body, req.user);
      return res.status(201).json({ ok: true, data });
    } catch (err) {
      next(err);
    }
  },

  async close(req, res, next) {
    try {
      const data = await needRequestService.close(req.params.id, req.body, req.user);
      return res.status(200).json({ ok: true, data });
    } catch (err) {
      next(err);
    }
  },
};

module.exports = {
  needRequestsController,
};

