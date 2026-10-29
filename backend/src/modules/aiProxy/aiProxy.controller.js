'use strict';

/**
 * src/modules/aiProxy/aiProxy.controller.js
 */

const aiProxyService = require('./aiProxy.service');

class AiProxyController {
  async matchNeed(req, res, next) {
    try {
      const { text } = req.body;
      const result = await aiProxyService.matchNeed(text, req.user);
      res.json({
        ok: true,
        data: result,
      });
    } catch (err) {
      next(err);
    }
  }

  async parseNeed(req, res, next) {
    try {
      const { text } = req.body;
      const result = await aiProxyService.parseNeed(text, req.user);
      res.json({
        ok: true,
        data: result,
      });
    } catch (err) {
      next(err);
    }
  }

  async incidentSummary(req, res, next) {
    try {
      const { incidentId } = req.body;
      const result = await aiProxyService.draftIncidentSummary(incidentId, req.user);
      res.json({
        ok: true,
        data: result,
      });
    } catch (err) {
      next(err);
    }
  }

  async policySummary(req, res, next) {
    try {
      const { policyData } = req.body;
      const result = await aiProxyService.policySummary(policyData, req.user);
      res.json({
        ok: true,
        data: result,
      });
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new AiProxyController();

