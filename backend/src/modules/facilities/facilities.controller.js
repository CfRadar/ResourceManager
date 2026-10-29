'use strict';

/**
 * src/modules/facilities/facilities.controller.js
 *
 * HTTP controller for facilities management, geolocation, and working hours.
 * Spec §4.4, Step 03 §3.
 */

const { facilityService } = require('./facilities.service');

const facilitiesController = {
  /**
   * GET /api/v1/facilities
   * List visible facilities (supports filters by institutionId, city, q).
   */
  async list(req, res, next) {
    try {
      const result = await facilityService.listFacilities(req.query);
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
   * GET /api/v1/facilities/:id
   * Detail (public fields).
   */
  async getById(req, res, next) {
    try {
      const facility = await facilityService.getFacilityById(req.params.id);
      return res.status(200).json({
        ok:   true,
        data: facility,
      });
    } catch (err) {
      return next(err);
    }
  },

  /**
   * POST /api/v1/institutions/:id/facilities
   * Create facility (Institution Admin or Owner).
   */
  async create(req, res, next) {
    try {
      const created = await facilityService.createFacility(
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
   * PATCH /api/v1/facilities/:id
   * Update facility (Owner or Admin).
   */
  async update(req, res, next) {
    try {
      const updated = await facilityService.updateFacility(
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
};

module.exports = { facilitiesController };
