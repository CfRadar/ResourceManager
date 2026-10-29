'use strict';

/**
 * src/modules/audit/audit.controller.js
 */

const auditService = require('./audit.service');
const { addAuditNoteSchema, institutionAuditQuerySchema } = require('./audit.schema');

class AuditController {
  async getEntityAudit(req, res, next) {
    try {
      const { id } = req.params;
      const events = await auditService.getEntityAudit(id, req.user);
      res.json({
        ok: true,
        data: events,
      });
    } catch (err) {
      next(err);
    }
  }

  async getResourceAudit(req, res, next) {
    try {
      const { id } = req.params;
      const events = await auditService.getResourceAudit(id, req.user);
      res.json({
        ok: true,
        data: events,
      });
    } catch (err) {
      next(err);
    }
  }

  async getInstitutionAudit(req, res, next) {
    try {
      const { id } = req.params;
      const parsedQuery = institutionAuditQuerySchema.parse(req.query);
      const result = await auditService.getInstitutionAudit(id, req.user, parsedQuery);
      res.json({
        ok: true,
        data: result,
      });
    } catch (err) {
      next(err);
    }
  }

  async verifyScope(req, res, next) {
    try {
      const { scope, id } = req.params;
      const result = await auditService.verifyAuditChain(scope, id, req.user);
      res.json({
        ok: true,
        data: result,
      });
    } catch (err) {
      next(err);
    }
  }

  async addNote(req, res, next) {
    try {
      const body = addAuditNoteSchema.parse(req.body);
      const result = await auditService.addClarificationNote(req.user, body);
      res.status(201).json({
        ok: true,
        data: result,
      });
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new AuditController();

