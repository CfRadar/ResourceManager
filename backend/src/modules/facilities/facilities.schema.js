'use strict';

/**
 * src/modules/facilities/facilities.schema.js
 *
 * Zod validation schemas for facility endpoints, coordinates, and working hours.
 * Spec §4.4, Step 03 §3.1, §3.2.
 */

const { z } = require('zod');
const { PAGINATION } = require('../../config/constants');

const TIME_REGEX = /^([01]\d|2[0-3]):[0-5]\d$/;

// ─── Timezone validator ───────────────────────────────────────────────────────

function isValidIanaTimezone(tz) {
  if (typeof tz !== 'string' || !tz.trim()) return false;
  try {
    Intl.DateTimeFormat(undefined, { timeZone: tz.trim() });
    return true;
  } catch {
    return false;
  }
}

const timezoneSchema = z.string().refine(isValidIanaTimezone, {
  message: 'Timezone must be a valid IANA timezone identifier (e.g. Asia/Kolkata, America/New_York, UTC)',
});

// ─── Working hours schema ─────────────────────────────────────────────────────

const intervalSchema = z.object({
  open: z.string().regex(TIME_REGEX, 'Time must be in strict 24-hour HH:mm format (00:00 to 23:59)'),
  close: z.string().regex(TIME_REGEX, 'Time must be in strict 24-hour HH:mm format (00:00 to 23:59)'),
});

const dayScheduleSchema = z.union([
  z.null(),
  intervalSchema,
  z.array(intervalSchema),
]);

const workingHoursSchema = z.object({
  monday:    dayScheduleSchema.optional(),
  tuesday:   dayScheduleSchema.optional(),
  wednesday: dayScheduleSchema.optional(),
  thursday:  dayScheduleSchema.optional(),
  friday:    dayScheduleSchema.optional(),
  saturday:  dayScheduleSchema.optional(),
  sunday:    dayScheduleSchema.optional(),
  // Also support 3-letter abbreviations
  mon:       dayScheduleSchema.optional(),
  tue:       dayScheduleSchema.optional(),
  wed:       dayScheduleSchema.optional(),
  thu:       dayScheduleSchema.optional(),
  fri:       dayScheduleSchema.optional(),
  sat:       dayScheduleSchema.optional(),
  sun:       dayScheduleSchema.optional(),
}).passthrough();

// ─── Facility Schemas ─────────────────────────────────────────────────────────

const createFacilitySchema = z.object({
  name: z.string().trim().min(1, 'Facility name is required').max(255),
  address: z.string().trim().max(1000).optional().nullable(),
  lat: z.coerce.number().min(-90, 'Latitude must be between -90 and 90').max(90, 'Latitude must be between -90 and 90').optional().nullable(),
  lng: z.coerce.number().min(-180, 'Longitude must be between -180 and 180').max(180, 'Longitude must be between -180 and 180').optional().nullable(),
  timezone: timezoneSchema.default('UTC'),
  geofenceRadiusMeters: z.coerce.number().int().positive('Geofence radius must be a positive integer').default(150),
  workingHours: workingHoursSchema.optional().nullable(),
});

const updateFacilitySchema = z.object({
  name: z.string().trim().min(1).max(255).optional(),
  address: z.string().trim().max(1000).optional().nullable(),
  lat: z.coerce.number().min(-90).max(90).optional().nullable(),
  lng: z.coerce.number().min(-180).max(180).optional().nullable(),
  timezone: timezoneSchema.optional(),
  geofenceRadiusMeters: z.coerce.number().int().positive('Geofence radius must be a positive integer').optional(),
  workingHours: workingHoursSchema.optional().nullable(),
}).strict();

const listFacilitiesQuerySchema = z.object({
  institutionId: z.string().uuid('Invalid institution ID format').optional(),
  city: z.string().trim().min(1).optional(),
  q: z.string().trim().min(1).optional(),
  page: z.coerce.number().int().min(1).default(PAGINATION.DEFAULT_PAGE),
  pageSize: z.coerce.number().int().min(1).max(PAGINATION.MAX_PAGE_SIZE).default(PAGINATION.DEFAULT_PAGE_SIZE),
});

const facilityIdParamSchema = z.object({
  id: z.string().uuid('Invalid facility ID format'),
});

const institutionFacilityParamSchema = z.object({
  id: z.string().uuid('Invalid institution ID format'),
});

module.exports = {
  isValidIanaTimezone,
  workingHoursSchema,
  createFacilitySchema,
  updateFacilitySchema,
  listFacilitiesQuerySchema,
  facilityIdParamSchema,
  institutionFacilityParamSchema,
};
