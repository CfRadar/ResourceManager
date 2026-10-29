'use strict';

/**
 * src/modules/policies/policies.controller.js
 *
 * HTTP controller for versioned resource policy endpoints.
 * Spec §4.6, Step 04 §2.
 */

const { policyService } = require('./policies.service');

const policiesController = {
  /**
   * GET /api/v1/resources/:id/policy
   * Current policy detail.
   */
  async getPolicy(req, res, next) {
    try {
      const policy = await policyService.getPolicy(req.params.id, req.user || null);
      return res.status(200).json({
        ok:   true,
        data: policy,
      });
    } catch (err) {
      return next(err);
    }
  },

  /**
   * PUT /api/v1/resources/:id/policy
   * Replace policy, creating a new policy_version + 1.
   */
  async updatePolicy(req, res, next) {
    try {
      const newVersion = await policyService.updatePolicy(
        req.params.id,
        req.body,
        req.user
      );
      return res.status(200).json({
        ok:   true,
        data: newVersion,
      });
    } catch (err) {
      return next(err);
    }
  },
};

module.exports = { policiesController };

