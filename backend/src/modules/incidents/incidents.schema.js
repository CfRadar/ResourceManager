'use strict';

/**
 * src/modules/incidents/incidents.schema.js
 *
 * Validation schemas for incidents, notes, rulings, and appeals.
 * Spec §4.16, Step 09.
 */

const { z } = require('zod');

const uuidSchema = z.string().uuid({ message: 'Must be a valid UUID' });

const createIncidentSchema = z.object({
  bookingId:          uuidSchema.optional(),
  serviceRequestId:   uuidSchema.optional(),
  type:               z.enum(['DAMAGE', 'DELAY', 'CONFLICT', 'SAFETY', 'MISSING_ITEM', 'OTHER']),
  description:        z.string().min(10, 'Description must be at least 10 characters'),
  severityByReporter: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']).optional(),
  attachments:        z.array(z.any()).optional(),
  occurredAt:         z.string().optional(),
});

const addNoteSchema = z.object({
  content:     z.string().min(1, 'Content is required'),
  visibility:  z.enum(['INTERNAL', 'SHARED']).default('SHARED').optional(),
  attachments: z.array(z.any()).optional(),
});

const requestInfoSchema = z.object({
  message: z.string().min(3, 'Question or message must be at least 3 characters'),
});

const respondInfoSchema = z.object({
  responseContent: z.string().min(3, 'Response content is required'),
  attachments:     z.array(z.any()).optional(),
});

const resolveIncidentSchema = z.object({
  outcome:  z.enum(['RESOLVED', 'DISMISSED']),
  findings: z.string().min(5, 'Findings must be at least 5 characters'),
  remedy:   z.object({
    type:   z.string(),
    amount: z.number().optional(),
    tokens: z.number().optional(),
  }).optional(),
  reason:   z.string().min(3, 'Reason must be at least 3 characters'),
});

const appealIncidentSchema = z.object({
  appealReason: z.string().min(5, 'Appeal reason must be at least 5 characters'),
});

const incidentIdParamSchema = z.object({
  id: uuidSchema,
});

const listIncidentsQuerySchema = z.object({
  status: z.string().optional(),
  type:   z.string().optional(),
  page:   z.coerce.number().int().min(1).default(1),
  limit:  z.coerce.number().int().min(1).max(100).default(20),
});

module.exports = {
  createIncidentSchema,
  addNoteSchema,
  requestInfoSchema,
  respondInfoSchema,
  resolveIncidentSchema,
  appealIncidentSchema,
  incidentIdParamSchema,
  listIncidentsQuerySchema,
};

