'use strict';

/**
 * src/modules/referrals/referrals.schema.js
 *
 * Validation schemas for cross-institutional referrals (Spec §4.14).
 */

const { z } = require('zod');

const uuidSchema = z.string().uuid({ message: 'Must be a valid UUID' });

const createReferralSchema = z.object({
  toInstitutionId:       uuidSchema,
  toFacilityId:          uuidSchema.optional(),
  resourceId:            uuidSchema.optional(),
  messageToReceiver:     z.string().min(5, 'Message to receiver must be at least 5 characters'),
  shareRequesterContact: z.boolean().default(false).optional(),
});

const respondReferralSchema = z.object({
  response:        z.enum(['ACCEPT', 'DECLINE']),
  responseMessage: z.string().min(3, 'Response message must be at least 3 characters'),
  nextSteps:       z.string().optional(),
});

const releaseContactSchema = z.object({
  note: z.string().optional(),
});

const referralIdParamSchema = z.object({
  id: uuidSchema,
});

const listReferralsQuerySchema = z.object({
  status:        z.string().optional(),
  institutionId: uuidSchema.optional(),
  page:          z.coerce.number().int().min(1).default(1),
  limit:         z.coerce.number().int().min(1).max(100).default(20),
});

module.exports = {
  createReferralSchema,
  respondReferralSchema,
  releaseContactSchema,
  referralIdParamSchema,
  listReferralsQuerySchema,
};

