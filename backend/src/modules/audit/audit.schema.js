'use strict';

/**
 * src/modules/audit/audit.schema.js
 */

const { z } = require('zod');

const addAuditNoteSchema = z.object({
  targetEventId: z.string().uuid({ message: 'targetEventId must be a valid UUID' }),
  note:          z.string().min(3, 'Note must be at least 3 characters').max(2000),
  reason:        z.string().optional(),
});

const institutionAuditQuerySchema = z.object({
  actor:    z.string().uuid().optional(),
  action:   z.string().optional(),
  from:     z.string().datetime({ offset: true }).optional(),
  to:       z.string().datetime({ offset: true }).optional(),
  page:     z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(20),
});

module.exports = {
  addAuditNoteSchema,
  institutionAuditQuerySchema,
};

