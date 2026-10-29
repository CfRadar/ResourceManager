'use strict';

/**
 * src/modules/resources/resources.schema.js
 *
 * Zod validation schemas for resource listings, filtering, creation, and updates.
 * Spec §4.5, Step 04 §1.
 */

const { z } = require('zod');
const { PAGINATION } = require('../../config/constants');

const VISIBILITY_LEVELS = ['PUBLIC', 'NETWORK', 'INSTITUTION', 'PRIVATE'];
const RISK_LEVELS = ['LOW', 'MEDIUM', 'HIGH'];
const ACCESS_MODES = ['INDEPENDENT', 'SUPERVISED', 'STAFF_SERVICE', 'COLLABORATION'];

// ─── Query Schemas ────────────────────────────────────────────────────────────

const listResourcesQuerySchema = z.object({
  q:             z.string().trim().min(1).optional(),
  category:      z.string().trim().min(1).optional(),
  institutionId: z.string().uuid('Invalid institution ID').optional(),
  facilityId:    z.string().uuid('Invalid facility ID').optional(),
  accessMode:    z.enum(ACCESS_MODES).optional(),
  city:          z.string().trim().min(1).optional(),
  eligibleOnly:  z.enum(['true', 'false']).transform((v) => v === 'true').optional(),
  page:          z.coerce.number().int().min(1).default(PAGINATION.DEFAULT_PAGE),
  pageSize:      z.coerce.number().int().min(1).max(PAGINATION.MAX_PAGE_SIZE).default(PAGINATION.DEFAULT_PAGE_SIZE),
});

// ─── Body Schemas ─────────────────────────────────────────────────────────────

const privateDetailsSchema = z.object({
  accessInstructions:   z.string().trim().max(2000).optional().nullable(),
  doorCode:             z.string().trim().max(64).optional().nullable(),
  maintenancePassword:  z.string().trim().max(128).optional().nullable(),
  safetyNotes:          z.string().trim().max(2000).optional().nullable(),
  ownerContact:         z.string().trim().max(255).optional().nullable(),
}).passthrough();

const createResourceSchema = z.object({
  name:           z.string().trim().min(1, 'Resource name is required').max(255),
  category:       z.string().trim().min(1, 'Category is required').max(128),
  description:    z.string().trim().max(4000).optional().nullable(),
  specs:          z.record(z.any()).optional().nullable(),
  capabilities:   z.array(z.string().trim()).default([]),
  visibility:     z.enum(VISIBILITY_LEVELS).default('PUBLIC'),
  riskLevel:      z.enum(RISK_LEVELS).default('LOW'),
  privateDetails: privateDetailsSchema.optional().nullable(),
});

const updateResourceSchema = z.object({
  name:           z.string().trim().min(1).max(255).optional(),
  category:       z.string().trim().min(1).max(128).optional(),
  description:    z.string().trim().max(4000).optional().nullable(),
  specs:          z.record(z.any()).optional().nullable(),
  capabilities:   z.array(z.string().trim()).optional(),
  visibility:     z.enum(VISIBILITY_LEVELS).optional(),
  riskLevel:      z.enum(RISK_LEVELS).optional(),
  privateDetails: privateDetailsSchema.optional().nullable(),
}).strict();

// ─── Param Schemas ────────────────────────────────────────────────────────────

const resourceIdParamSchema = z.object({
  id: z.string().uuid('Invalid resource ID format'),
});

const facilityIdParamSchema = z.object({
  id: z.string().uuid('Invalid facility ID format'),
});

module.exports = {
  VISIBILITY_LEVELS,
  RISK_LEVELS,
  ACCESS_MODES,
  listResourcesQuerySchema,
  createResourceSchema,
  updateResourceSchema,
  resourceIdParamSchema,
  facilityIdParamSchema,
};

