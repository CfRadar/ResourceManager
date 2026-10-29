'use strict';

/**
 * src/modules/availability/availability.schema.js
 *
 * Zod validation schemas for availability, slots, blackouts, and polls.
 * Spec §4.7.
 */

const { z } = require('zod');

const uuidSchema = z.string().uuid({ message: 'Must be a valid UUID' });

const availabilityQuerySchema = z.object({
  from: z.string().datetime({ offset: true, message: 'from must be an ISO-8601 date string' }),
  to:   z.string().datetime({ offset: true, message: 'to must be an ISO-8601 date string' }),
}).refine(
  (data) => new Date(data.from) < new Date(data.to),
  { message: 'from must be earlier than to', path: ['from'] }
).refine(
  (data) => {
    const diffMs = new Date(data.to).getTime() - new Date(data.from).getTime();
    const maxDays = 90;
    return diffMs <= maxDays * 24 * 60 * 60 * 1000;
  },
  { message: 'Requested date range cannot exceed 90 days', path: ['to'] }
);

const slotsQuerySchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, { message: 'date must be in YYYY-MM-DD format' }),
  durationMin: z.coerce.number().int().min(15).max(1440).default(60),
});

const createBlackoutSchema = z.object({
  startAt: z.string().datetime({ offset: true, message: 'startAt must be an ISO-8601 date string' }),
  endAt:   z.string().datetime({ offset: true, message: 'endAt must be an ISO-8601 date string' }),
  reason:  z.string().min(1).max(500).default('Scheduled Maintenance'),
  confirmCancelAffected: z.boolean().default(false),
}).refine(
  (data) => new Date(data.startAt) < new Date(data.endAt),
  { message: 'startAt must be earlier than endAt', path: ['startAt'] }
);

const resourceIdParamSchema = z.object({
  id: uuidSchema,
});

const blackoutParamsSchema = z.object({
  id:         uuidSchema,
  blackoutId: uuidSchema,
});

const createPollSchema = z.object({
  label: z.string().min(1, 'Label is required').max(255),
  preferredWindows: z.array(z.object({
    dayOfWeek: z.string().min(1),
    startHour: z.number().int().min(0).max(23),
    endHour:   z.number().int().min(0).max(24),
  })).optional(),
});

const votePollParamSchema = z.object({
  pollId: uuidSchema,
});

module.exports = {
  availabilityQuerySchema,
  slotsQuerySchema,
  createBlackoutSchema,
  resourceIdParamSchema,
  blackoutParamsSchema,
  createPollSchema,
  votePollParamSchema,
};

