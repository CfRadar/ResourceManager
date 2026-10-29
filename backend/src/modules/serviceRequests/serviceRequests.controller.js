'use strict';

/**
 * src/modules/serviceRequests/serviceRequests.controller.js
 *
 * HTTP controller for staff-operated service requests.
 * Spec §4.13, Step 08.
 */

const { serviceRequestService } = require('./serviceRequests.service');

const serviceRequestsController = {
  async create(req, res, next) {
    try {
      const data = await serviceRequestService.create(req.user.sub, req.body);
      return res.status(201).json({ ok: true, data });
    } catch (err) {
      next(err);
    }
  },

  async getById(req, res, next) {
    try {
      const data = await serviceRequestService.getById(req.params.id, req.user);
      return res.status(200).json({ ok: true, data });
    } catch (err) {
      next(err);
    }
  },

  async listMine(req, res, next) {
    try {
      const result = await serviceRequestService.listMine(req.user.sub, req.query);
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

  async listFacilityQueue(req, res, next) {
    try {
      const result = await serviceRequestService.listFacilityQueue(
        req.params.id,
        req.query,
        req.user
      );
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

  async reviewScope(req, res, next) {
    try {
      const data = await serviceRequestService.reviewScope(req.params.id, req.body, req.user);
      return res.status(200).json({ ok: true, data });
    } catch (err) {
      next(err);
    }
  },

  async issueQuote(req, res, next) {
    try {
      const data = await serviceRequestService.issueQuote(req.params.id, req.body, req.user);
      return res.status(201).json({ ok: true, data });
    } catch (err) {
      next(err);
    }
  },

  async respondQuote(req, res, next) {
    try {
      const data = await serviceRequestService.respondQuote(req.params.id, req.body, req.user);
      return res.status(200).json({ ok: true, data });
    } catch (err) {
      next(err);
    }
  },

  async recordMaterialsReceived(req, res, next) {
    try {
      const data = await serviceRequestService.recordMaterialsReceived(
        req.params.id,
        req.body,
        req.user
      );
      return res.status(200).json({ ok: true, data });
    } catch (err) {
      next(err);
    }
  },

  async updateProgress(req, res, next) {
    try {
      const data = await serviceRequestService.updateProgress(
        req.params.id,
        req.body,
        req.user
      );
      return res.status(200).json({ ok: true, data });
    } catch (err) {
      next(err);
    }
  },

  async deliverOutput(req, res, next) {
    try {
      const data = await serviceRequestService.deliverOutput(
        req.params.id,
        req.body,
        req.user
      );
      return res.status(200).json({ ok: true, data });
    } catch (err) {
      next(err);
    }
  },

  async confirmCompletion(req, res, next) {
    try {
      const data = await serviceRequestService.confirmCompletion(
        req.params.id,
        req.body,
        req.user
      );
      return res.status(200).json({ ok: true, data });
    } catch (err) {
      next(err);
    }
  },

  async reject(req, res, next) {
    try {
      const data = await serviceRequestService.reject(req.params.id, req.body, req.user);
      return res.status(200).json({ ok: true, data });
    } catch (err) {
      next(err);
    }
  },

  async cancel(req, res, next) {
    try {
      const data = await serviceRequestService.cancel(req.params.id, req.body, req.user);
      return res.status(200).json({ ok: true, data });
    } catch (err) {
      next(err);
    }
  },
};

module.exports = {
  serviceRequestsController,
};

