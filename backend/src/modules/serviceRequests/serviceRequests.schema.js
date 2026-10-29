'use strict';

/**
 * src/modules/serviceRequests/serviceRequests.schema.js
 *
 * Validation schemas for Staff-Operated Service Requests (Spec §4.13).
 */

const { z } = require('zod');

const uuidSchema = z.string().uuid({ message: 'Must be a valid UUID' });

const createServiceRequestSchema = z.object({
  resourceId:         uuidSchema,
  description:        z.string().min(10, 'Description must be at least 10 characters'),
  expectedOutput:     z.string().optional(),
  submittedMaterials: z.any().optional(),
  estimatedTimeline:  z.any().optional(),
  budget:             z.number().nonnegative().optional(),
  asDraft:            z.boolean().optional().default(false),
});

const scopeReviewSchema = z.object({
  feasible:           z.boolean(),
  notes:              z.string().min(3, 'Notes must be at least 3 characters'),
  assignedOperatorId: uuidSchema.optional(),
});

const quoteLineItemSchema = z.object({
  description: z.string().min(1, 'Item description is required'),
  cost:        z.number().nonnegative('Cost must be >= 0'),
  currency:    z.string().default('INR').optional(),
});

const createQuoteSchema = z.object({
  lineItems:  z.array(quoteLineItemSchema).min(1, 'At least one line item is required'),
  totalCost:  z.number().nonnegative().optional(),
  currency:   z.string().default('INR').optional(),
  notes:      z.string().optional(),
  validUntil: z.string().optional(),
});

const respondQuoteSchema = z.object({
  decision: z.enum(['ACCEPT', 'DECLINE']),
  note:     z.string().optional(),
});

const materialsReceivedSchema = z.object({
  notes:              z.string().optional(),
  intakePhotoUrl:     z.string().url().optional(),
  conditionRating:    z.number().int().min(1).max(5).optional(),
  accessoryChecklist: z.record(z.any()).optional(),
});

const progressUpdateSchema = z.object({
  stage: z.enum(['STARTED', 'IN_ANALYSIS', 'COMPLETED']),
  note:  z.string().min(1, 'Note is required for milestone update'),
});

const deliverableItemSchema = z.object({
  title:   z.string().min(1, 'Deliverable title is required'),
  fileUrl: z.string().optional(),
  notes:   z.string().optional(),
});

const deliverOutputSchema = z.object({
  deliverables: z.array(deliverableItemSchema).min(1).optional(),
  summaryNotes: z.string().min(1, 'Summary notes are required upon delivery'),
});

const confirmCompletionSchema = z.object({
  confirmed:     z.boolean(),
  disputeReason: z.string().optional(),
});

const decisionSchema = z.object({
  decision: z.enum(['REJECT']),
  reason:   z.string().min(5, 'Rejection reason must be at least 5 characters'),
});

const cancelServiceRequestSchema = z.object({
  reason: z.string().optional(),
});

const serviceRequestIdParamSchema = z.object({
  id: uuidSchema,
});

const listServiceRequestsQuerySchema = z.object({
  status: z.string().optional(),
  page:   z.coerce.number().int().min(1).default(1),
  limit:  z.coerce.number().int().min(1).max(100).default(20),
});

module.exports = {
  createServiceRequestSchema,
  scopeReviewSchema,
  createQuoteSchema,
  respondQuoteSchema,
  materialsReceivedSchema,
  progressUpdateSchema,
  deliverOutputSchema,
  confirmCompletionSchema,
  decisionSchema,
  cancelServiceRequestSchema,
  serviceRequestIdParamSchema,
  listServiceRequestsQuerySchema,
};

