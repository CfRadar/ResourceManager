'use strict';

/**
 * src/modules/payments/payments.controller.js
 *
 * HTTP controller for simulated invoicing and cost estimates.
 * Spec §4.18, Step 09.
 */

const { paymentsService } = require('./payments.service');

const paymentsController = {
  async getCostEstimate(req, res, next) {
    try {
      const data = await paymentsService.getCostEstimate(req.params.id, req.user);
      return res.status(200).json({ ok: true, data });
    } catch (err) {
      next(err);
    }
  },

  async generateInvoice(req, res, next) {
    try {
      const data = await paymentsService.generateInvoice(req.params.id, req.body, req.user);
      return res.status(201).json({ ok: true, data });
    } catch (err) {
      next(err);
    }
  },

  async markPaid(req, res, next) {
    try {
      const data = await paymentsService.markPaid(req.params.id, req.user);
      return res.status(200).json({ ok: true, data });
    } catch (err) {
      next(err);
    }
  },
};

module.exports = {
  paymentsController,
};

