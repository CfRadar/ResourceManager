'use strict';

/**
 * src/modules/tokens/tokens.controller.js
 *
 * HTTP controller for fair-use token ledger.
 * Spec §4.17, Step 09.
 */

const tokenService = require('../../services/tokenService');

const tokensController = {
  async getBalance(req, res, next) {
    try {
      const data = await tokenService.balance(req.user.sub);
      return res.status(200).json({ ok: true, data });
    } catch (err) {
      next(err);
    }
  },

  async getLedger(req, res, next) {
    try {
      const result = await tokenService.getLedger(req.user.sub, req.query);
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

  async grant(req, res, next) {
    try {
      const data = await tokenService.grant(
        req.body.userId,
        req.body.amount,
        req.user.sub,
        req.body.reason
      );
      return res.status(201).json({ ok: true, data });
    } catch (err) {
      next(err);
    }
  },
};

module.exports = {
  tokensController,
};

