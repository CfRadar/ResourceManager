'use strict';

/**
 * src/modules/bookings/bookings.repository.js
 *
 * Data access repository for Bookings, Calendar Feeds, and Waitlist Promotion.
 * Spec §4.11, Step 07.
 */

const { BaseRepository } = require('../../db/BaseRepository');
const { db }             = require('../../config/db');

class BookingRepository extends BaseRepository {
  constructor() {
    super('bookings', { softDelete: false });
  }

  /**
   * Fetches full detail of a booking including resource, facility, and user info.
   */
  async findDetailById(id, trx = null) {
    const qb = trx || db;
    return qb('bookings as b')
      .leftJoin('resources as r', 'b.resource_id', 'r.id')
      .leftJoin('facilities as f', 'r.facility_id', 'f.id')
      .leftJoin('users as u', 'b.user_id', 'u.id')
      .leftJoin('access_requests as ar', 'b.request_id', 'ar.id')
      .select(
        'b.*',
        'r.name as resource_name',
        'r.category as resource_category',
        'r.facility_id',
        'f.name as facility_name',
        'f.institution_id',
        'f.timezone as facility_timezone',
        'f.lat as facility_lat',
        'f.lng as facility_lng',
        'f.geofence_radius_meters',
        'u.name as user_name',
        'u.email as user_email',
        'ar.access_mode',
        'ar.purpose'
      )
      .where('b.id', id)
      .first();
  }

  /**
   * Lists bookings for a specific user.
   */
  async findByUser(userId, { status, upcoming, page = 1, limit = 20 } = {}, trx = null) {
    const qb = trx || db;
    const offset = (page - 1) * limit;

    let query = qb('bookings as b')
      .leftJoin('resources as r', 'b.resource_id', 'r.id')
      .leftJoin('facilities as f', 'r.facility_id', 'f.id')
      .select(
        'b.*',
        'r.name as resource_name',
        'r.category as resource_category',
        'f.name as facility_name',
        'f.timezone as facility_timezone'
      )
      .where('b.user_id', userId);

    if (status) {
      query = query.where('b.status', status);
    }
    if (upcoming === true) {
      query = query.where('b.end_at', '>=', new Date());
    }

    const [rows, countRes] = await Promise.all([
      query.clone().orderBy('b.start_at', upcoming ? 'asc' : 'desc').limit(limit).offset(offset),
      query.clone().clearSelect().count('b.id as total').first(),
    ]);

    const total = parseInt(countRes?.total || 0, 10);
    return {
      items: rows,
      meta: {
        page: Number(page),
        limit: Number(limit),
        total,
        totalPages: Math.ceil(total / limit) || 1,
      },
    };
  }

  /**
   * Calendar feed for a facility within a time window [from, to].
   */
  async findFacilityCalendar(facilityId, from, to, status = null, trx = null) {
    const qb = trx || db;

    let query = qb('bookings as b')
      .join('resources as r', 'b.resource_id', 'r.id')
      .leftJoin('users as u', 'b.user_id', 'u.id')
      .select(
        'b.id',
        'b.resource_id',
        'r.name as resource_name',
        'r.category as resource_category',
        'b.start_at',
        'b.end_at',
        'b.status',
        'u.id as user_id',
        'u.name as user_name',
        'u.email as user_email'
      )
      .where('r.facility_id', facilityId)
      .where('b.end_at', '>=', from)
      .where('b.start_at', '<=', to);

    if (status) {
      query = query.where('b.status', status);
    } else {
      query = query.whereNot('b.status', 'CANCELLED');
    }

    return query.orderBy('b.start_at', 'asc');
  }

  /**
   * Finds any booking overlapping a desired window on a resource.
   */
  async findOverlapping(resourceId, startAt, endAt, excludeBookingId = null, trx = null) {
    const qb = trx || db;
    let query = qb('bookings')
      .where('resource_id', resourceId)
      .whereIn('status', ['SCHEDULED', 'CHECKED_IN', 'IN_USE'])
      .where('start_at', '<', endAt)
      .where('end_at', '>', startAt);

    if (excludeBookingId) {
      query = query.whereNot('id', excludeBookingId);
    }

    return query.select('*');
  }

  /**
   * Finds the first active waitlist entry whose desired slot fits inside the freed time window.
   */
  async findFirstFittingWaitlist(resourceId, freedStart, freedEnd, trx = null) {
    const qb = trx || db;
    return qb('waitlist_entries as w')
      .join('users as u', 'w.request_id', 'u.id') // fallback join or request
      .where('w.resource_id', resourceId)
      .where('w.status', 'PENDING')
      .where('w.desired_start', '>=', freedStart)
      .where('w.desired_end', '<=', freedEnd)
      .orderBy('w.position', 'asc')
      .select('w.*')
      .first();
  }
}

const bookingRepo = new BookingRepository();
module.exports = { bookingRepo, BookingRepository };
