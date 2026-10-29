'use strict';

/**
 * src/modules/institutions/institutions.controller.js
 *
 * HTTP controller for institutions, membership requests, and partner links.
 * Spec §4.3, §1.5, Step 03 §2.
 */

const { institutionService } = require('./institutions.service');

const institutionsController = {
  /**
   * GET /api/v1/institutions
   * List verified institutions (public fields).
   */
  async listVerified(req, res, next) {
    try {
      const result = await institutionService.listVerifiedInstitutions(req.query);
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
   * GET /api/v1/institutions/:id
   * Detail + associated public facilities.
   */
  async getById(req, res, next) {
    try {
      const institution = await institutionService.getInstitutionById(req.params.id);
      return res.status(200).json({
        ok:   true,
        data: institution,
      });
    } catch (err) {
      return next(err);
    }
  },

  /**
   * POST /api/v1/institutions
   * Register institution (Platform Admin only).
   */
  async register(req, res, next) {
    try {
      const institution = await institutionService.registerInstitution(req.body, req.user);
      return res.status(201).json({
        ok:   true,
        data: institution,
      });
    } catch (err) {
      return next(err);
    }
  },

  /**
   * PATCH /api/v1/institutions/:id
   * Update institution profile (Admin only).
   */
  async update(req, res, next) {
    try {
      const updated = await institutionService.updateInstitution(
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
   * POST /api/v1/institutions/:id/membership-requests
   * Submit membership application (Authenticated user).
   */
  async createMembershipRequest(req, res, next) {
    try {
      const request = await institutionService.createMembershipRequest(
        req.params.id,
        req.body,
        req.user
      );
      return res.status(201).json({
        ok:   true,
        data: request,
      });
    } catch (err) {
      return next(err);
    }
  },

  /**
   * GET /api/v1/institutions/:id/membership-requests
   * List pending membership requests (Admin only).
   */
  async listMembershipRequests(req, res, next) {
    try {
      const result = await institutionService.listMembershipRequests(
        req.params.id,
        req.query,
        req.user
      );
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
   * POST /api/v1/institutions/:id/membership-requests/:reqId/decision
   * Approve or reject membership request (Admin only).
   */
  async decideMembershipRequest(req, res, next) {
    try {
      const result = await institutionService.decideMembershipRequest(
        req.params.id,
        req.params.reqId,
        req.body,
        req.user
      );
      return res.status(200).json({
        ok:   true,
        data: result,
      });
    } catch (err) {
      return next(err);
    }
  },

  /**
   * POST /api/v1/institutions/:id/partners
   * Establish partner institution link (Admin only).
   */
  async linkPartner(req, res, next) {
    try {
      const result = await institutionService.linkPartnerInstitution(
        req.params.id,
        req.body.partnerInstitutionId,
        req.user
      );
      return res.status(201).json({
        ok:   true,
        data: result,
      });
    } catch (err) {
      return next(err);
    }
  },

  /**
   * GET /api/v1/institutions/:id/partners
   * List partner institutions.
   */
  async listPartners(req, res, next) {
    try {
      const partners = await institutionService.listPartnerInstitutions(req.params.id);
      return res.status(200).json({
        ok:   true,
        data: partners,
      });
    } catch (err) {
      return next(err);
    }
  },
};

module.exports = { institutionsController };
