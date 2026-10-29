'use strict';

/**
 * src/services/bookingEngine.js
 *
 * Availability interval computation, bookable slot generation,
 * and atomic booking reservation with overlap prevention.
 *
 * Spec §4.7, §4.11; Step 05.
 */

const { Errors, AppError } = require('../utils/AppError');

/**
 * Converts a local date string (YYYY-MM-DD) and time (HH:mm) in a specific IANA
 * timezone into a UTC JavaScript Date instance.
 */
function zonedTimeToUtc(dateStr, timeStr, timeZone = 'UTC') {
  const [year, month, day] = dateStr.split('-').map(Number);
  const [hour, min]        = timeStr.split(':').map(Number);

  // Initial UTC guess
  const guess = new Date(Date.UTC(year, month - 1, day, hour, min));

  try {
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone,
      year:      'numeric',
      month:     'numeric',
      day:       'numeric',
      hour:      'numeric',
      minute:    'numeric',
      second:    'numeric',
      hourCycle: 'h23',
    }).formatToParts(guess);

    const get = (type) => Number(parts.find((p) => p.type === type)?.value);
    const offset = Date.UTC(
      get('year'),
      get('month') - 1,
      get('day'),
      get('hour'),
      get('minute'),
      get('second') || 0
    ) - guess.getTime();

    return new Date(guess.getTime() - offset);
  } catch {
    return guess;
  }
}

/**
 * Formats a Date in a given IANA timezone to extract its local weekday and YYYY-MM-DD.
 */
function getLocalDateParts(date, timeZone = 'UTC') {
  try {
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone,
      weekday:   'long',
      year:      'numeric',
      month:     '2-digit',
      day:       '2-digit',
    }).formatToParts(date);

    const get = (type) => parts.find((p) => p.type === type)?.value;
    return {
      weekday: (get('weekday') || '').toLowerCase(),
      dateStr: `${get('year')}-${get('month')}-${get('day')}`,
    };
  } catch {
    const iso = date.toISOString().slice(0, 10);
    const day = date.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();
    return { weekday: day, dateStr: iso };
  }
}

/**
 * Subtracts a list of blocking intervals from a list of open intervals.
 * All intervals are { start: Date, end: Date }.
 */
function subtractIntervals(openIntervals, blockers) {
  let remaining = [...openIntervals];

  for (const blocker of blockers) {
    const nextRemaining = [];
    const bStart = blocker.start.getTime();
    const bEnd   = blocker.end.getTime();

    for (const open of remaining) {
      const oStart = open.start.getTime();
      const oEnd   = open.end.getTime();

      // No overlap
      if (bEnd <= oStart || bStart >= oEnd) {
        nextRemaining.push(open);
      } else {
        // Overlap: keep segment before blocker start
        if (bStart > oStart) {
          nextRemaining.push({ start: new Date(oStart), end: new Date(bStart) });
        }
        // Keep segment after blocker end
        if (bEnd < oEnd) {
          nextRemaining.push({ start: new Date(bEnd), end: new Date(oEnd) });
        }
      }
    }
    remaining = nextRemaining;
  }

  return remaining.filter((i) => i.end.getTime() > i.start.getTime());
}

/**
 * Computes open intervals based on facility working hours across a requested range [from, to].
 *
 * @param {object} facility
 * @param {Date} fromDate
 * @param {Date} toDate
 * @returns {Array<{ start: Date, end: Date }>}
 */
function getWorkingHoursIntervals(facility, fromDate, toDate) {
  const tz = facility?.timezone || 'UTC';
  let workingHours = facility?.workingHours || facility?.working_hours;

  if (typeof workingHours === 'string') {
    try {
      workingHours = JSON.parse(workingHours);
    } catch {
      workingHours = null;
    }
  }

  // If no working hours defined, facility is unconstrained 24/7 across the interval.
  if (!workingHours || typeof workingHours !== 'object') {
    return [{ start: new Date(fromDate), end: new Date(toDate) }];
  }

  const intervals = [];
  // Iterate day by day in local timezone from fromDate - 1 day to toDate + 1 day to catch overnight schedules
  const cur = new Date(fromDate.getTime() - 24 * 60 * 60 * 1000);
  const endLimit = new Date(toDate.getTime() + 24 * 60 * 60 * 1000);

  while (cur <= endLimit) {
    const { weekday, dateStr } = getLocalDateParts(cur, tz);
    const dayKeyShort = weekday.slice(0, 3);
    const sched = workingHours[weekday] !== undefined ? workingHours[weekday] : workingHours[dayKeyShort];

    if (sched) {
      const dayIntervals = Array.isArray(sched) ? sched : [sched];
      for (const item of dayIntervals) {
        if (!item || !item.open || !item.close) continue;

        const { open, close } = item;
        if (open < close) {
          // Standard daytime interval
          const startUtc = zonedTimeToUtc(dateStr, open, tz);
          const endUtc   = zonedTimeToUtc(dateStr, close, tz);

          // Clip to [fromDate, toDate]
          const clippedStart = new Date(Math.max(startUtc.getTime(), fromDate.getTime()));
          const clippedEnd   = new Date(Math.min(endUtc.getTime(), toDate.getTime()));

          if (clippedStart < clippedEnd) {
            intervals.push({ start: clippedStart, end: clippedEnd });
          }
        } else if (open > close) {
          // Overnight interval: starts on dateStr, ends next day
          const startUtc = zonedTimeToUtc(dateStr, open, tz);
          const nextDay = new Date(cur.getTime() + 24 * 60 * 60 * 1000);
          const { dateStr: nextDateStr } = getLocalDateParts(nextDay, tz);
          const endUtc = zonedTimeToUtc(nextDateStr, close, tz);

          const clippedStart = new Date(Math.max(startUtc.getTime(), fromDate.getTime()));
          const clippedEnd   = new Date(Math.min(endUtc.getTime(), toDate.getTime()));

          if (clippedStart < clippedEnd) {
            intervals.push({ start: clippedStart, end: clippedEnd });
          }
        }
      }
    }

    cur.setDate(cur.getDate() + 1);
  }

  // Deduplicate and merge contiguous open intervals
  intervals.sort((a, b) => a.start.getTime() - b.start.getTime());
  const merged = [];
  for (const interval of intervals) {
    if (merged.length === 0) {
      merged.push(interval);
    } else {
      const last = merged[merged.length - 1];
      if (interval.start.getTime() <= last.end.getTime()) {
        if (interval.end.getTime() > last.end.getTime()) {
          last.end = interval.end;
        }
      } else {
        merged.push(interval);
      }
    }
  }

  return merged;
}

/**
 * Computes availability intervals (OPEN, BUSY, BLACKOUT) across a requested range.
 *
 * @param {object} facility - Facility object with timezone and working_hours
 * @param {Array} bookings   - Array of active booking rows with start_at, end_at
 * @param {Array} blackouts  - Array of blackout rows with start_at, end_at, reason
 * @param {string|Date} from - ISO range start
 * @param {string|Date} to   - ISO range end
 * @returns {Array<{ label: string, startAt: string, endAt: string, reason?: string }>}
 */
function calculateAvailabilityIntervals(facility, bookings = [], blackouts = [], from, to) {
  const fromDate = new Date(from);
  const toDate   = new Date(to);

  if (isNaN(fromDate.getTime()) || isNaN(toDate.getTime())) {
    throw Errors.Validation('Invalid from or to timestamp.');
  }
  if (fromDate >= toDate) {
    throw Errors.Validation('The from parameter must precede the to parameter.');
  }

  // 1. Working hours open intervals (clipped to from-to)
  const baseOpenIntervals = getWorkingHoursIntervals(facility, fromDate, toDate);

  // 2. Format & clip BUSY intervals (anonymized)
  const busyIntervals = [];
  for (const b of bookings) {
    const bStart = new Date(b.start_at || b.startAt);
    const bEnd   = new Date(b.end_at || b.endAt);
    const start  = new Date(Math.max(bStart.getTime(), fromDate.getTime()));
    const end    = new Date(Math.min(bEnd.getTime(), toDate.getTime()));

    if (start < end) {
      busyIntervals.push({
        label:   'Booked',
        start,
        end,
      });
    }
  }

  // 3. Format & clip BLACKOUT intervals
  const blackoutIntervals = [];
  for (const bo of blackouts) {
    const boStart = new Date(bo.start_at || bo.startAt);
    const boEnd   = new Date(bo.end_at || bo.endAt);
    const start   = new Date(Math.max(boStart.getTime(), fromDate.getTime()));
    const end     = new Date(Math.min(boEnd.getTime(), toDate.getTime()));

    if (start < end) {
      blackoutIntervals.push({
        label:   'Blackout',
        reason:  bo.reason || 'Maintenance',
        start,
        end,
      });
    }
  }

  // 4. Subtract BUSY and BLACKOUT intervals from base open working hours
  const allBlockers = [
    ...busyIntervals.map((i) => ({ start: i.start, end: i.end })),
    ...blackoutIntervals.map((i) => ({ start: i.start, end: i.end })),
  ];
  allBlockers.sort((a, b) => a.start.getTime() - b.start.getTime());

  const remainingOpen = subtractIntervals(baseOpenIntervals, allBlockers);

  // 5. Combine and sort all intervals chronologically
  const result = [
    ...remainingOpen.map((o) => ({
      label:   'Open',
      startAt: o.start.toISOString(),
      endAt:   o.end.toISOString(),
    })),
    ...busyIntervals.map((b) => ({
      label:   'Booked',
      startAt: b.start.toISOString(),
      endAt:   b.end.toISOString(),
    })),
    ...blackoutIntervals.map((bo) => ({
      label:   'Blackout',
      reason:  bo.reason,
      startAt: bo.start.toISOString(),
      endAt:   bo.end.toISOString(),
    })),
  ];

  result.sort((a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime());
  return result;
}

/**
 * Computes discrete bookable slot suggestions for a specific calendar date.
 *
 * @param {object} facility
 * @param {object} policy
 * @param {Array} bookings
 * @param {Array} blackouts
 * @param {string} dateStr     - 'YYYY-MM-DD'
 * @param {number} durationMin - Duration in minutes (e.g. 30, 60)
 * @param {object} [options]
 * @returns {Array<{ startAt: string, endAt: string }>}
 */
function getSuggestedSlots(facility, policy, bookings = [], blackouts = [], dateStr, durationMin = 60, options = {}) {
  const tz = facility?.timezone || 'UTC';
  const now = options.now || new Date();

  // Validate policy limits on duration
  const limits = policy?.limits || {};
  if (limits.maxSingleBookingHours && (durationMin / 60) > limits.maxSingleBookingHours) {
    throw Errors.Validation(
      `Requested duration (${durationMin} min) exceeds maximum single booking duration (${limits.maxSingleBookingHours} hours).`
    );
  }
  if (limits.minBookingHours && (durationMin / 60) < limits.minBookingHours) {
    throw Errors.Validation(
      `Requested duration (${durationMin} min) is below minimum booking duration (${limits.minBookingHours} hours).`
    );
  }

  // Check advanceBookingDays
  const advanceDays = limits.advanceBookingDays || 30;
  const targetDayStart = zonedTimeToUtc(dateStr, '00:00', tz);
  const targetDayEnd   = zonedTimeToUtc(dateStr, '23:59', tz);
  const maxAdvanceDate = new Date(now.getTime() + advanceDays * 24 * 60 * 60 * 1000);

  if (targetDayStart > maxAdvanceDate) {
    throw Errors.Validation(
      `Date ${dateStr} exceeds maximum advance booking limit of ${advanceDays} days.`
    );
  }

  // Calculate open intervals for the whole day
  const intervals = calculateAvailabilityIntervals(
    facility,
    bookings,
    blackouts,
    targetDayStart.toISOString(),
    targetDayEnd.toISOString()
  );

  const openIntervals = intervals.filter((i) => i.label === 'Open');
  const durationMs = durationMin * 60 * 1000;
  const slots = [];

  for (const interval of openIntervals) {
    let cur = new Date(interval.startAt).getTime();
    const end = new Date(interval.endAt).getTime();

    while (cur + durationMs <= end) {
      const slotStart = new Date(cur);
      const slotEnd   = new Date(cur + durationMs);

      // Only suggest future slots
      if (slotStart.getTime() >= now.getTime()) {
        slots.push({
          startAt: slotStart.toISOString(),
          endAt:   slotEnd.toISOString(),
        });
      }

      // Step by durationMin
      cur += durationMs;
    }
  }

  return slots;
}

/**
 * Atomically reserves a booking slot for a resource, enforcing concurrency isolation
 * and PostgreSQL GiST exclusion constraint (23P01 error).
 *
 * @param {object} bookingData
 *   @param {string} bookingData.resourceId
 *   @param {string} bookingData.userId
 *   @param {string} bookingData.requestId
 *   @param {string} bookingData.startAt
 *   @param {string} bookingData.endAt
 *   @param {number} [bookingData.policyVersionApplied]
 * @param {object} [options]
 *   @param {object} [options.trx]
 *
 * @returns {Promise<object>} The confirmed booking row
 */
async function reserveSlot(bookingData, options = {}) {
  const { db } = require('../config/db');
  const qb = options.trx || db;

  // 1. Check for overlapping active bookings
  const overlaps = await qb('bookings')
    .where('resource_id', bookingData.resourceId)
    .whereIn('status', ['SCHEDULED', 'CHECKED_IN', 'IN_USE'])
    .where('start_at', '<', bookingData.endAt)
    .where('end_at', '>', bookingData.startAt)
    .select('id', 'start_at', 'end_at');

  if (overlaps.length > 0) {
    throw Errors.BookingConflict({
      conflictingBookings: overlaps.map((b) => ({ id: b.id, startAt: b.start_at, endAt: b.end_at })),
    });
  }

  // 2. Insert into bookings, catching Postgres GiST 23P01 exclusion
  try {
    const row = {
      resource_id: bookingData.resourceId,
      user_id:     bookingData.userId,
      request_id:  bookingData.requestId,
      start_at:    bookingData.startAt,
      end_at:      bookingData.endAt,
      status:      'SCHEDULED',
      policy_version_applied: bookingData.policyVersionApplied || null,
    };
    const rows = await qb('bookings').insert(row).returning('*');
    return Array.isArray(rows) ? rows[0] : (rows || row);
  } catch (err) {
    if (err.code === '23P01') {
      throw Errors.BookingConflict({
        reason: 'PostgreSQL GiST exclusion: slot already booked concurrently',
      });
    }
    throw err;
  }
}

module.exports = {
  calculateAvailabilityIntervals,
  getSuggestedSlots,
  zonedTimeToUtc,
  getLocalDateParts,
  subtractIntervals,
  reserveSlot,
};
