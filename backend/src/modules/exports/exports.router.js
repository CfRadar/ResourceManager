'use strict';

/**
 * src/modules/exports/exports.router.js
 *
 * Express routes for Excel, PDF, and CSV document exports.
 * Spec §4.22, Step 09.
 */

const express = require('express');
const { exportsController } = require('./exports.controller');
const { authenticate }      = require('../../middleware/auth');
const { requireRole, requireAnyRole } = require('../../middleware/rbac');
const { validate }          = require('../../middleware/validate');
const {
  bookingExportQuerySchema,
  usageReportQuerySchema,
  auditExportQuerySchema,
  incidentReportParamSchema,
  transactionReportParamSchema,
} = require('./exports.schema');

const router = express.Router();

// GET /api/v1/exports/bookings.xlsx — Facility booking report spreadsheet
router.get(
  '/bookings.xlsx',
  authenticate,
  requireAnyRole(['MANAGER', 'OWNER', 'ADMIN']),
  validate({ query: bookingExportQuerySchema }),
  exportsController.exportBookingsExcel
);

// GET /api/v1/exports/usage-report.xlsx — Equipment utilization report
router.get(
  '/usage-report.xlsx',
  authenticate,
  requireRole('ADMIN'),
  validate({ query: usageReportQuerySchema }),
  exportsController.exportUsageExcel
);

// GET /api/v1/exports/audit.csv — Tamper-evident audit log CSV
router.get(
  '/audit.csv',
  authenticate,
  requireRole('ADMIN'),
  validate({ query: auditExportQuerySchema }),
  exportsController.exportAuditCsv
);

// GET /api/v1/exports/incident-report/:id.pdf — Formal incident dossier PDF
router.get(
  '/incident-report/:id.pdf',
  authenticate,
  requireAnyRole(['MANAGER', 'OWNER', 'ADMIN']),
  validate({ params: incidentReportParamSchema }),
  exportsController.exportIncidentPdf
);

// GET /api/v1/exports/transaction/:requestId.pdf — Transaction history receipt PDF
router.get(
  '/transaction/:requestId.pdf',
  authenticate,
  validate({ params: transactionReportParamSchema }),
  exportsController.exportTransactionPdf
);

module.exports = router;

