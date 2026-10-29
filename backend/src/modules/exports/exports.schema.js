'use strict';

/**
 * src/modules/exports/exports.schema.js
 *
 * Validation schemas for document, PDF, and spreadsheet exports (Spec §4.22).
 */

const { z } = require('zod');

const uuidSchema = z.string().uuid({ message: 'Must be a valid UUID' });

const bookingExportQuerySchema = z.object({
  facilityId: uuidSchema.optional(),
  from:       z.string().optional(),
  to:         z.string().optional(),
});

const usageReportQuerySchema = z.object({
  institutionId: uuidSchema.optional(),
});

const auditExportQuerySchema = z.object({
  scope:      z.string().optional(),
  entityType: z.string().optional(),
  from:       z.string().optional(),
  to:         z.string().optional(),
});

const incidentReportParamSchema = z.object({
  id: uuidSchema,
});

const transactionReportParamSchema = z.object({
  requestId: uuidSchema,
});

module.exports = {
  bookingExportQuerySchema,
  usageReportQuerySchema,
  auditExportQuerySchema,
  incidentReportParamSchema,
  transactionReportParamSchema,
};

