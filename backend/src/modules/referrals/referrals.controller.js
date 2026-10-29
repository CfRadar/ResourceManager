'use strict';

/**
 * src/modules/referrals/referrals.controller.js
 *
 * HTTP controller for cross-institutional referrals.
 * Spec §4.14, Step 08.
 */

const { referralService } = require('./referrals.service');

const referralsController = {
  async getById(req, res, next) {
    try {
      const data = await referralService.getById(req.params.id, req.user);
      return res.status(200).json({ ok: true, data });
    } catch (err) {
      next(err);
    }
  },

  async listInbox(req, res, next) {
    try {
      const result = await referralService.listInbox(req.user, req.query);
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

  async respond(req, res, next) {
    try {
      const data = await referralService.respond(req.params.id, req.body, req.user);
      return res.status(200).json({ ok: true, data });
    } catch (err) {
      next(err);
    }
  },

  async releaseContact(req, res, next) {
    try {
      const data = await referralService.releaseContact(req.params.id, req.body, req.user);
      return res.status(200).json({ ok: true, data });
    } catch (err) {
      next(err);
    }
  },
};

module.exports = {
  referralsController,
};

