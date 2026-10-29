'use strict';

/**
 * src/modules/eligibility/eligibility.controller.js
 *
 * HTTP controller for deterministic eligibility check.
 * Spec §4.8.
 */

const { checkEligibility } = require('../../services/eligibilityEngine');

const eligibilityController = {
  async checkEligibility(req, res, next) {
    try {
      const data = await checkEligibility(
        req.params.id,
        req.user.sub,
        req.body
      );
      res.json({ ok: true, data });
    } catch (err) {
      next(err);
    }
  },
};

module.exports = { eligibilityController };

