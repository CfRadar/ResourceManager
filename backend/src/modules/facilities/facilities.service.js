'use strict';

/**
 * src/modules/facilities/facilities.service.js
 *
 * Business logic for facilities domain, coordinate management,
 * working hours evaluation, and timezone scheduling.
 * Spec §4.4, Step 03 §3.
 */

const { facilityRepo, FacilityRepository } = require('./facilities.repository');
const { institutionRepo }                 = require('../institutions/institutions.repository');
const { Errors }                          = require('../../utils/AppError');
const { ROLES }                           = require('../../middleware/rbac');

// ─── Timezone & Working Hours Helper ──────────────────────────────────────────

/**
 * Extract weekday ('monday', ...), 24h time ('HH:mm'), and local date ('YYYY-MM-DD')
 * for a Date in a specific IANA timezone.
 */
function getLocalDayAndTime(date, timeZone) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    weekday:   'long',
    year:      'numeric',
    month:     '2-digit',
    day:       '2-digit',
    hour:      '2-digit',
    minute:    '2-digit',
    hourCycle: 'h23',
  }).formatToParts(date);

  const get = (type) => parts.find((p) => p.type === type)?.value;
  return {
    weekday: (get('weekday') || '').toLowerCase(),
    time:    `${get('hour')}:${get('minute')}`,
    dateStr: `${get('year')}-${get('month')}-${get('day')}`,
  };
}

/**
 * Checks whether a requested start and end interval falls entirely within
 * the facility's working hours, taking the facility's timezone into account.
 *
 * @param {object} facility - Must contain { timezone, working_hours }
 * @param {string|Date} startAt - ISO date string or Date
 * @param {string|Date} endAt   - ISO date string or Date
 * @returns {boolean}
 */
function isWithinWorkingHours(facility, startAt, endAt) {
  if (!facility) return false;

  const startDate = new Date(startAt);
  const endDate   = new Date(endAt);

  if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
    return false;
  }
  if (startDate >= endDate) {
    return false;
  }

  let workingHours = facility.workingHours || facility.working_hours;
  if (typeof workingHours === 'string') {
    try {
      workingHours = JSON.parse(workingHours);
    } catch {
      return false;
    }
  }

  // If no working hours are configured, assume open 24/7 or unconstrained.
  if (!workingHours || typeof workingHours !== 'object') {
    return true;
  }

  const tz = facility.timezone || 'UTC';
  let startLocal;
  let endLocal;

  try {
    startLocal = getLocalDayAndTime(startDate, tz);
    endLocal   = getLocalDayAndTime(endDate, tz);
  } catch {
    return false;
  }

  const dayKeyFull = startLocal.weekday;        // e.g. 'monday'
  const dayKeyShort = dayKeyFull.slice(0, 3);    // e.g. 'mon'

  const schedule = workingHours[dayKeyFull] !== undefined
    ? workingHours[dayKeyFull]
    : workingHours[dayKeyShort];

  // null or undefined means closed on that day
  if (schedule === null || schedule === undefined) {
    return false;
  }

  // Normalize interval list
  const intervals = Array.isArray(schedule) ? schedule : [schedule];
  if (intervals.length === 0) return false;

  for (const interval of intervals) {
    if (!interval || !interval.open || !interval.close) continue;

    const { open, close } = interval;

    // Normal intraday schedule: e.g. 08:00 to 18:00
    if (open < close) {
      if (
        startLocal.dateStr === endLocal.dateStr &&
        startLocal.time >= open &&
        endLocal.time <= close
      ) {
        return true;
      }
    } else if (open > close) {
      // Overnight schedule: e.g. open 20:00, close 04:00 next day
      const durationMs = endDate.getTime() - startDate.getTime();
      if (durationMs > 24 * 60 * 60 * 1000) {
        continue;
      }

      if (startLocal.dateStr === endLocal.dateStr) {
        // Same evening: e.g. 20:30 to 23:30
        if (startLocal.time >= open && endLocal.time >= open && startLocal.time <= endLocal.time) {
          return true;
        }
      } else {
        // Crosses midnight to next day: e.g. 21:00 to 02:00 next day
        if (startLocal.time >= open && endLocal.time <= close) {
          return true;
        }
      }
    } else {
      // open === close: zero-duration or invalid
      continue;
    }
  }

  return false;
}

// ─── Service Methods ──────────────────────────────────────────────────────────

class FacilityService {
  /**
   * List facilities with filters and pagination.
   */
  async listFacilities(query) {
    const { institutionId, city, q, page, pageSize } = query;
    return facilityRepo.findFacilitiesWithFilters(
      { institutionId, city, q },
      { page, pageSize }
    );
  }

  /**
   * Retrieve facility details by ID.
   */
  async getFacilityById(id) {
    const facility = await facilityRepo.findByIdWithInstitution(id);
    if (!facility) {
      throw Errors.NotFound(`Facility not found: ${id}`);
    }
    return facility;
  }

  /**
   * Create a new facility for an institution.
   */
  async createFacility(institutionId, data, actor) {
    const institution = await institutionRepo.findById(institutionId);
    if (!institution) {
      throw Errors.NotFound(`Institution not found: ${institutionId}`);
    }

    const payload = {
      institution_id:         institutionId,
      name:                   data.name,
      address:                data.address || null,
      lat:                    data.lat != null ? data.lat : null,
      lng:                    data.lng != null ? data.lng : null,
      timezone:               data.timezone || 'UTC',
      geofence_radius_meters: data.geofenceRadiusMeters != null ? data.geofenceRadiusMeters : 150,
      working_hours:          data.workingHours ? JSON.stringify(data.workingHours) : null,
    };

    const created = await facilityRepo.insert(payload);
    return FacilityRepository.sanitizePublic(created);
  }

  /**
   * Update an existing facility.
   * Authorized for platform admins or institution owners/admins.
   */
  async updateFacility(facilityId, data, actor) {
    const existing = await facilityRepo.findById(facilityId);
    if (!existing) {
      throw Errors.NotFound(`Facility not found: ${facilityId}`);
    }

    // Authorization check
    if (actor.role !== ROLES.ADMIN) {
      const isAuthorized = actor.memberships.some(
        (m) =>
          m.institutionId === existing.institution_id &&
          (m.role === ROLES.ADMIN || m.role === ROLES.OWNER)
      );
      if (!isAuthorized) {
        throw Errors.Forbidden('You are not authorized to update facilities for this institution.');
      }
    }

    const updates = {};
    if (data.name !== undefined) updates.name = data.name;
    if (data.address !== undefined) updates.address = data.address;
    if (data.lat !== undefined) updates.lat = data.lat;
    if (data.lng !== undefined) updates.lng = data.lng;
    if (data.timezone !== undefined) updates.timezone = data.timezone;
    if (data.geofenceRadiusMeters !== undefined) updates.geofence_radius_meters = data.geofenceRadiusMeters;
    if (data.workingHours !== undefined) {
      updates.working_hours = data.workingHours ? JSON.stringify(data.workingHours) : null;
    }

    const updated = await facilityRepo.update(facilityId, updates);
    return FacilityRepository.sanitizePublic(updated);
  }

  /**
   * Export the working hours checker helper as part of the service.
   */
  isWithinWorkingHours(facility, startAt, endAt) {
    return isWithinWorkingHours(facility, startAt, endAt);
  }
}

const facilityService = new FacilityService();

module.exports = {
  facilityService,
  FacilityService,
  isWithinWorkingHours,
};
