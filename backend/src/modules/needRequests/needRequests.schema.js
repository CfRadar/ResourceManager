'use strict';

/**
 * src/modules/needRequests/needRequests.schema.js
 *
 * Validation schemas for missing-resource need requests (Spec §4.14).
 */

const { z } = require('zod');

const uuidSchema = z.string().uuid({ message: 'Must be a valid UUID' });

const createNeedRequestSchema = z.object({
  capabilityNeeded:       z.string().optional(),
  category:               z.string().optional(),
  description:            z.string().min(10, 'Description must be at least 10 characters'),
  technicalRequirements:  z.array(z.string()).optional(),
  requiredCapabilities:   z.array(z.string()).optional(),
  locationPreference:     z.string().optional(),
  preferredDates:         z.any().optional(),
  accessModePreference:   z.enum(['INDEPENDENT', 'SUPERVISED', 'STAFF_SERVICE', 'COLLABORATION']).optional(),
  consentShareContact:    z.boolean().default(false),
  asDraft:                z.boolean().default(false).optional(),
});

const closeNeedRequestSchema = z.object({
  outcome:     z.enum(['CLOSED_MET', 'CLOSED_UNMET']),
  closeReason: z.string().min(3, 'Close reason must be at least 3 characters'),
});

const needRequestIdParamSchema = z.object({
  id: uuidSchema,
});

const listNeedRequestsQuerySchema = z.object({
  status:   z.string().optional(),
  category: z.string().optional(),
  page:     z.coerce.number().int().min(1).default(1),
  limit:    z.coerce.number().int().min(1).max(100).default(20),
});

module.exports = {
  createNeedRequestSchema,
  closeNeedRequestSchema,
  needRequestIdParamSchema,
  listNeedRequestsQuerySchema,
};

