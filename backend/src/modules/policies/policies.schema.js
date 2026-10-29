'use strict';

/**
 * src/modules/policies/policies.schema.js
 *
 * Zod validation schemas for dynamic resource policy configuration.
 * Spec §4.6, Step 04 §2.
 */

const { z } = require('zod');

const ACCESS_MODES = ['INDEPENDENT', 'SUPERVISED', 'STAFF_SERVICE', 'COLLABORATION'];
const USER_GROUPS  = ['INTERNAL_STUDENT', 'INTERNAL_STAFF', 'PARTNER_INSTITUTION', 'EXTERNAL_COMMERCIAL', 'PUBLIC'];
const MATERIAL_POLICIES = ['ALLOWED', 'PROHIBITED', 'NEEDS_APPROVAL'];
const PRICING_MODELS = ['FREE', 'HOURLY', 'COST_RECOVERY', 'QUOTE', 'TOKENS'];
const PHOTO_POLICIES = ['NONE', 'OPTIONAL', 'REQUIRED'];

const limitsSchema = z.object({
  maxActiveBookings:     z.coerce.number().int().min(1).default(2),
  maxHoursPerWeek:       z.coerce.number().int().min(1).default(20),
  maxSingleBookingHours: z.coerce.number().int().min(1).default(4),
  advanceBookingDays:    z.coerce.number().int().min(1).default(14),
});

const cancellationSchema = z.object({
  freeUntilHoursBefore: z.coerce.number().int().min(0).default(12),
  noShowStrikeLimit:    z.coerce.number().int().min(1).default(3),
});

const lateReturnSchema = z.object({
  graceMinutes:          z.coerce.number().int().min(0).default(15),
  reminderMinutesBefore: z.coerce.number().int().min(0).default(30),
});

const pricingSchema = z.object({
  model:         z.enum(PRICING_MODELS).default('FREE'),
  hourlyRate:    z.coerce.number().min(0).default(0),
  operatorFee:   z.coerce.number().min(0).default(0),
  tokensPerHour: z.coerce.number().min(0).default(0),
});

const geofenceCheckInSchema = z.object({
  enabled:      z.boolean().default(true),
  radiusMeters: z.coerce.number().int().positive().default(150),
});

const conditionReportSchema = z.object({
  requireBefore: z.boolean().default(false),
  requireAfter:  z.boolean().default(false),
  requirePhotos: z.enum(PHOTO_POLICIES).default('NONE'),
});

const ResourcePolicySchema = z.object({
  supportedAccessModes:        z.array(z.enum(ACCESS_MODES)).min(1, 'At least one access mode is required'),
  permittedUserGroups:         z.array(z.enum(USER_GROUPS)).min(1, 'At least one user group is required'),
  requiresPurposeStatement:    z.boolean().default(false),
  requiresApproval:            z.boolean().default(false),
  requiredTrainingIds:         z.array(z.string().trim()).default([]),
  requiredDocumentTemplateIds: z.array(z.string().trim()).default([]),
  supervisionRequiredFor:      z.array(z.string().trim()).default([]),
  allowOutsideMaterials:       z.enum(MATERIAL_POLICIES).default('NEEDS_APPROVAL'),
  prohibitedUses:              z.array(z.string().trim()).default([]),
  limits:                      limitsSchema.default({}),
  cancellation:                cancellationSchema.default({}),
  lateReturn:                  lateReturnSchema.default({}),
  pricing:                     pricingSchema.default({}),
  geofenceCheckIn:             geofenceCheckInSchema.default({}),
  conditionReport:             conditionReportSchema.default({}),
}).passthrough();

const updatePolicySchema = ResourcePolicySchema;

module.exports = {
  ACCESS_MODES,
  USER_GROUPS,
  MATERIAL_POLICIES,
  PRICING_MODELS,
  PHOTO_POLICIES,
  ResourcePolicySchema,
  updatePolicySchema,
};

