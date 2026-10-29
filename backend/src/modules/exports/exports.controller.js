'use strict';

/**
 * src/modules/exports/exports.controller.js
 *
 * HTTP controller streaming XLSX, PDF, and CSV reports.
 * Spec §4.22, Step 09.
 */

const { exportsService } = require('./exports.service');

const exportsController = {
  async exportBookingsExcel(req, res, next) {
    try {
      const buffer = await exportsService.generateBookingsExcel(req.query, req.user);
      res.setHeader(
        'Content-Type',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      );
      res.setHeader('Content-Disposition', 'attachment; filename="bookings.xlsx"');
      return res.send(buffer);
    } catch (err) {
      next(err);
    }
  },

  async exportUsageExcel(req, res, next) {
    try {
      const buffer = await exportsService.generateUsageReportExcel(req.query, req.user);
      res.setHeader(
        'Content-Type',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      );
      res.setHeader('Content-Disposition', 'attachment; filename="usage-report.xlsx"');
      return res.send(buffer);
    } catch (err) {
      next(err);
    }
  },

  async exportAuditCsv(req, res, next) {
    try {
      const buffer = await exportsService.generateAuditCsv(req.query, req.user);
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename="audit.csv"');
      return res.send(buffer);
    } catch (err) {
      next(err);
    }
  },

  async exportIncidentPdf(req, res, next) {
    try {
      const buffer = await exportsService.generateIncidentPdf(req.params.id, req.user);
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="incident-report-${req.params.id}.pdf"`);
      return res.send(buffer);
    } catch (err) {
      next(err);
    }
  },

  async exportTransactionPdf(req, res, next) {
    try {
      const buffer = await exportsService.generateTransactionPdf(req.params.requestId, req.user);
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="transaction-${req.params.requestId}.pdf"`);
      return res.send(buffer);
    } catch (err) {
      next(err);
    }
  },
};

module.exports = {
  exportsController,
};

