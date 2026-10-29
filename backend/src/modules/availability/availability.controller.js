'use strict';

/**
 * src/modules/availability/availability.controller.js
 *
 * HTTP controller for availability intervals, slots, blackouts, and polls.
 * Spec §4.7.
 */

const { availabilityService } = require('./availability.service');

const availabilityController = {
  async getAvailability(req, res, next) {
    try {
      const data = await availabilityService.getAvailability(
        req.params.id,
        req.query,
        req.user
      );
      res.json({ ok: true, data });
    } catch (err) {
      next(err);
    }
  },

  async getSlots(req, res, next) {
    try {
      const data = await availabilityService.getSlots(
        req.params.id,
        req.query,
        req.user
      );
      res.json({ ok: true, data });
    } catch (err) {
      next(err);
    }
  },

  async createBlackout(req, res, next) {
    try {
      const data = await availabilityService.createBlackout(
        req.params.id,
        req.body,
        req.user
      );
      res.status(201).json({ ok: true, data });
    } catch (err) {
      next(err);
    }
  },

  async deleteBlackout(req, res, next) {
    try {
      const data = await availabilityService.deleteBlackout(
        req.params.id,
        req.params.blackoutId,
        req.user
      );
      res.json({ ok: true, data });
    } catch (err) {
      next(err);
    }
  },

  async listPolls(req, res, next) {
    try {
      const data = await availabilityService.listPolls(req.params.id, req.user);
      res.json({ ok: true, data });
    } catch (err) {
      next(err);
    }
  },

  async createPoll(req, res, next) {
    try {
      const data = await availabilityService.createPoll(
        req.params.id,
        req.body,
        req.user
      );
      res.status(201).json({ ok: true, data });
    } catch (err) {
      next(err);
    }
  },

  async votePoll(req, res, next) {
    try {
      const data = await availabilityService.votePoll(
        req.params.pollId,
        req.user
      );
      res.json({ ok: true, data });
    } catch (err) {
      next(err);
    }
  },
};

module.exports = { availabilityController };

