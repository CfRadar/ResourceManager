'use strict';

/**
 * src/services/bookingEngine.js
 *
 * Atomic booking creation with overlap prevention.
 *
 * Spec §4.11 + Overlap prevention note:
 *   - PostgreSQL: exclusion constraint EXCLUDE USING gist (resource_id WITH =,
 *     tstzrange(start_at, end_at) WITH &&) WHERE (status IN ('SCHEDULED','CHECKED_IN','IN_USE')).
 *   - Portable fallback: BEGIN; SELECT ... FOR UPDATE; count overlapping active
 *     bookings; insert only if zero; COMMIT.
 *   - A concurrency test must confirm exactly one success from 10 simultaneous
 *     requests for the same slot.
 *
 * Implemented in: Step 07 (Bookings, Concurrency & Check-in).
 *
 * Interface (to be implemented):
 *
 *   reserveSlot(resourceId, requestId, startAt, endAt, actor, options)
 *     → { booking }
 *   @throws AppError('BOOKING_CONFLICT') with up to 3 alternative slots.
 *
 *   getSuggestedSlots(resourceId, date, durationMin, options)
 *     → { slots: [{ startAt, endAt }] }
 */

// Placeholder — full implementation in Step 07.
async function reserveSlot() {
  throw new Error(
    '[bookingEngine] Not yet implemented. This service will be built in Step 07 ' +
    '(Bookings, Concurrency & Check-in).'
  );
}

async function getSuggestedSlots() {
  throw new Error(
    '[bookingEngine] Not yet implemented. This service will be built in Step 07.'
  );
}

module.exports = { reserveSlot, getSuggestedSlots };
