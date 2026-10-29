'use strict';

/**
 * src/modules/accessRequests/accessRequests.schema.js
 *
 * Zod validation schemas for Access Requests and Decisions.
 * Spec §4.9, §4.10, Step 06.
 */

const { z } = require('zod');

const uuidSchema = z.string().uuid({ message: 'Must be a valid UUID' });

const isoDateSchema = z
  .string()
  .datetime({ message: 'Must be a valid ISO-8601 UTC timestamp (e.g. 2026-10-30T10:00:00Z)' });

const accessModeEnum = z.enum(['INDEPENDENT', 'SUPERVISED', 'STAFF_SERVICE', 'COLLABORATION']);

const createAccessRequestSchema = z
  .object({
    resourceId:        uuidSchema,
    accessMode:        accessModeEnum.default('INDEPENDENT'),
    startAt:           isoDateSchema.optional().nullable(),
    endAt:             isoDateSchema.optional().nullable(),
    purpose:           z.string().min(5, 'Purpose must be at least 5 characters').max(2000),
    outsideMaterials:  z.array(z.any()).optional().default([]),
    acknowledgments:   z.array(z.string()).optional().default([]),
    userGroupOverride: z.string().optional(),
    isDraft:           z.boolean().optional().default(false),
  })
  .refine(
    (data) => {
      if (data.startAt && data.endAt) {
        return new Date(data.startAt) < new Date(data.endAt);
      }
      return true;
    },
    { message: 'startAt must be strictly before endAt', path: ['endAt'] }
  );

const updateAccessRequestSchema = z
  .object({
    accessMode:       accessModeEnum.optional(),
    startAt:          isoDateSchema.optional().nullable(),
    endAt:            isoDateSchema.optional().nullable(),
    purpose:          z.string().min(5).max(2000).optional(),
    outsideMaterials: z.array(z.any()).optional(),
    acknowledgments:  z.array(z.string()).optional(),
  })
  .refine(
    (data) => {
      if (data.startAt && data.endAt) {
        return new Date(data.startAt) < new Date(data.endAt);
      }
      return true;
    },
    { message: 'startAt must be strictly before endAt', path: ['endAt'] }
  );

const requestInfoSchema = z.object({
  question: z.string().min(3, 'Question must be at least 3 characters').max(1000),
});

const respondInfoSchema = z.object({
  response:    z.string().min(2, 'Response must be at least 2 characters').max(2000),
  attachments: z.array(z.any()).optional().default([]),
});

const decisionSchema = z.object({
  decision:   z.enum(['APPROVE', 'REJECT', 'WAITLIST']),
  reason:     z.string().min(3, 'Reason must be at least 3 characters').max(1000),
  conditions: z.union([z.array(z.string()), z.string()]).optional().nullable(),
});

const appealSchema = z.object({
  reason: z.string().min(5, 'Appeal reason must be at least 5 characters').max(1000),
});

const cancelSchema = z.object({
  reason: z.string().max(500).optional().nullable(),
});

const queryRequestsSchema = z.object({
  status:   z.string().optional(),
  page:     z.coerce.number().int().positive().default(1),
  limit:    z.coerce.number().int().min(1).max(100).default(20),
  facilityId: uuidSchema.optional(),
});

module.exports = {
  createAccessRequestSchema,
  updateAccessRequestSchema,
  requestInfoSchema,
  respondInfoSchema,
  decisionSchema,
  appealSchema,
  cancelSchema,
  queryRequestsSchema,
  uuidSchema,
};
