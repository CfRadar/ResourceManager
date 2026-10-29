'use strict';

/**
 * src/modules/resources/resources.controller.js
 *
 * HTTP controller for resource catalog endpoints.
 * Spec §4.5, Step 04.
 */

const { resourceService } = require('./resources.service');

const resourcesController = {
  /**
   * GET /api/v1/resources
   * Visibility-filtered search/browse.
   */
  async list(req, res, next) {
    try {
      const result = await resourceService.listResources(req.query, req.user || null);
      return res.status(200).json({
        ok:   true,
        data: result.data,
        meta: result.meta,
      });
    } catch (err) {
      return next(err);
    }
  },

  /**
   * GET /api/v1/resources/categories
   * Category list + tag vocabulary.
   */
  async categories(req, res, next) {
    try {
      const result = await resourceService.getCategories();
      return res.status(200).json({
        ok:   true,
        data: result,
      });
    } catch (err) {
      return next(err);
    }
  },

  /**
   * GET /api/v1/resources/:id
   * Public detail + policy summary (confidential fields redacted).
   */
  async getById(req, res, next) {
    try {
      const resource = await resourceService.getResourceById(req.params.id, req.user || null);
      return res.status(200).json({
        ok:   true,
        data: resource,
      });
    } catch (err) {
      return next(err);
    }
  },

  /**
   * GET /api/v1/resources/:id/private-details
   * Confidential access instructions (Approved requester or Manager/Owner).
   */
  async getPrivateDetails(req, res, next) {
    try {
      const details = await resourceService.getPrivateDetails(req.params.id, req.user);
      return res.status(200).json({
        ok:   true,
        data: details,
      });
    } catch (err) {
      return next(err);
    }
  },

  /**
   * POST /api/v1/facilities/:id/resources
   * Create resource listing under facility.
   */
  async create(req, res, next) {
    try {
      const created = await resourceService.createResource(
        req.params.id,
        req.body,
        req.user
      );
      return res.status(201).json({
        ok:   true,
        data: created,
      });
    } catch (err) {
      return next(err);
    }
  },

  /**
   * PATCH /api/v1/resources/:id
   * Edit resource listing.
   */
  async update(req, res, next) {
    try {
      const updated = await resourceService.updateResource(
        req.params.id,
        req.body,
        req.user
      );
      return res.status(200).json({
        ok:   true,
        data: updated,
      });
    } catch (err) {
      return next(err);
    }
  },

  /**
   * POST /api/v1/resources/:id/deactivate
   * Soft-deactivate resource (Owner only).
   */
  async deactivate(req, res, next) {
    try {
      const result = await resourceService.deactivateResource(req.params.id, req.user);
      return res.status(200).json({
        ok:   true,
        data: result,
      });
    } catch (err) {
      return next(err);
    }
  },
};

module.exports = { resourcesController };

