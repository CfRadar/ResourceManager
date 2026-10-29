'use strict';

/**
 * src/modules/bookings/bookings.schema.js
 *
 * Zod validation schemas for Bookings queries, rescheduling, extension, and cancellation.
 * Spec §4.11, Step 07.
 */

const { z } = require('zod');

const uuidSchema = z.string().uuid({ message: 'Must be a valid UUID' });

const isoDateSchema = z
  .string()
  .datetime({ message: 'Must be a valid ISO-8601 UTC timestamp (e.g. 2026-10-30T10:00:00Z)' });

const bookingStatusEnum = z.enum([
  'SCHEDULED',
  'CHECKED_IN',
  'IN_USE',
  'RETURNED',
  'CLOSED',
  'CANCELLED',
  'OVERDUE',
  'NEEDS_REBOOK',
]);

const queryMyBookingsSchema = z.object({
  status:   bookingStatusEnum.optional(),
  page:     z.coerce.number().int().positive().default(1),
  limit:    z.coerce.number().int().min(1).max(100).default(20),
  upcoming: z.coerce.boolean().optional(),
});

const queryFacilityBookingsSchema = z.object({
  from:   isoDateSchema,
  to:     isoDateSchema,
  status: bookingStatusEnum.optional(),
}).refine(
  (data) => new Date(data.from) < new Date(data.to),
  { message: 'from must be strictly before to', path: ['to'] }
);

const rescheduleBookingSchema = z.object({
  newStartAt: isoDateSchema,
  newEndAt:   isoDateSchema,
  reason:     z.string().min(3).max(500).optional(),
}).refine(
  (data) => new Date(data.newStartAt) < new Date(data.newEndAt),
  { message: 'newStartAt must be strictly before newEndAt', path: ['newEndAt'] }
);

const extendBookingSchema = z.object({
  extensionMinutes: z.coerce.number().int().min(15).max(480), // 15 min to 8 hours
  reason:           z.string().max(500).optional(),
});

const cancelBookingSchema = z.object({
  reason: z.string().min(3, 'Cancellation reason must be at least 3 characters').max(500),
});

const markNoShowSchema = z.object({
  notes: z.string().max(500).optional(),
});

const bookingIdParamSchema = z.object({
  id: uuidSchema,
});

const facilityIdParamSchema = z.object({
  id: uuidSchema,
});

module.exports = {
  uuidSchema,
  bookingStatusEnum,
  queryMyBookingsSchema,
  queryFacilityBookingsSchema,
  rescheduleBookingSchema,
  extendBookingSchema,
  cancelBookingSchema,
  markNoShowSchema,
  bookingIdParamSchema,
  facilityIdParamSchema,
};
