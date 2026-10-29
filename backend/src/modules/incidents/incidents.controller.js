'use strict';

/**
 * src/modules/incidents/incidents.controller.js
 *
 * HTTP controller for incidents, rulings, and appeals.
 * Spec §4.16, Step 09.
 */

const { incidentService } = require('./incidents.service');

const incidentsController = {
  async report(req, res, next) {
    try {
      const data = await incidentService.report(req.user.sub, req.body);
      return res.status(201).json({ ok: true, data });
    } catch (err) {
      next(err);
    }
  },

  async getById(req, res, next) {
    try {
      const data = await incidentService.getById(req.params.id, req.user);
      return res.status(200).json({ ok: true, data });
    } catch (err) {
      next(err);
    }
  },

  async listMine(req, res, next) {
    try {
      const result = await incidentService.listMine(req.user.sub, req.query);
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
      const result = await incidentService.listFacilityQueue(req.params.id, req.query);
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

  async addNote(req, res, next) {
    try {
      const data = await incidentService.addNote(req.params.id, req.body, req.user);
      return res.status(201).json({ ok: true, data });
    } catch (err) {
      next(err);
    }
  },

  async requestInfo(req, res, next) {
    try {
      const data = await incidentService.requestInfo(req.params.id, req.body, req.user);
      return res.status(200).json({ ok: true, data });
    } catch (err) {
      next(err);
    }
  },

  async respondInfo(req, res, next) {
    try {
      const data = await incidentService.respondInfo(req.params.id, req.body, req.user);
      return res.status(200).json({ ok: true, data });
    } catch (err) {
      next(err);
    }
  },

  async resolve(req, res, next) {
    try {
      const data = await incidentService.resolve(req.params.id, req.body, req.user);
      return res.status(200).json({ ok: true, data });
    } catch (err) {
      next(err);
    }
  },

  async appeal(req, res, next) {
    try {
      const data = await incidentService.appeal(req.params.id, req.body, req.user);
      return res.status(200).json({ ok: true, data });
    } catch (err) {
      next(err);
    }
  },

  async draftSummary(req, res, next) {
    try {
      const data = await incidentService.draftSummary(req.params.id, req.user);
      return res.status(200).json({ ok: true, data });
    } catch (err) {
      next(err);
    }
  },
};

module.exports = {
  incidentsController,
};

