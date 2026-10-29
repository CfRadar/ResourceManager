'use strict';

/**
 * src/modules/eligibility/eligibility.schema.js
 *
 * Zod validation schema for eligibility check endpoint.
 * Spec §4.8.
 */

const { z } = require('zod');

const uuidSchema = z.string().uuid({ message: 'Must be a valid UUID' });

const eligibilityCheckSchema = z.object({
  accessMode:        z.enum(['INDEPENDENT', 'SUPERVISED', 'STAFF_SERVICE', 'COLLABORATION']).default('INDEPENDENT'),
  startAt:           z.string().datetime({ offset: true }).optional(),
  endAt:             z.string().datetime({ offset: true }).optional(),
  userGroupOverride: z.string().min(1).max(50).optional(),
}).refine(
  (data) => {
    if ((data.startAt && !data.endAt) || (!data.startAt && data.endAt)) {
      return false;
    }
    return true;
  },
  { message: 'Both startAt and endAt must be provided together', path: ['startAt'] }
).refine(
  (data) => {
    if (data.startAt && data.endAt) {
      return new Date(data.startAt) < new Date(data.endAt);
    }
    return true;
  },
  { message: 'startAt must be earlier than endAt', path: ['startAt'] }
);

const resourceIdParamSchema = z.object({
  id: uuidSchema,
});

module.exports = {
  eligibilityCheckSchema,
  resourceIdParamSchema,
};

