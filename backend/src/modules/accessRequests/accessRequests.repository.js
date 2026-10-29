'use strict';

/**
 * src/modules/accessRequests/accessRequests.repository.js
 *
 * Data access layer for Access Requests, Review Queue, Bookings, and Waitlist.
 * Spec §4.9, §4.10, Step 06.
 */

const { BaseRepository } = require('../../db/BaseRepository');
const { db }             = require('../../config/db');

class AccessRequestRepository extends BaseRepository {
  constructor() {
    super('access_requests');
  }

  /**
   * Fetches full detail of an access request, joining resource, facility, and requester.
   */
  async findDetailById(id, trx = null) {
    const qb = trx || db;
    return qb('access_requests as ar')
      .leftJoin('resources as r', 'ar.resource_id', 'r.id')
      .leftJoin('facilities as f', 'r.facility_id', 'f.id')
      .leftJoin('users as u', 'ar.requester_id', 'u.id')
      .leftJoin('users as rev', 'ar.reviewer_id', 'rev.id')
      .select(
        'ar.*',
        'r.name as resource_name',
        'r.category as resource_category',
        'r.facility_id',
        'f.name as facility_name',
        'f.institution_id',
        'f.timezone as facility_timezone',
        'u.name as requester_name',
        'u.email as requester_email',
        'rev.name as reviewer_name'
      )
      .where('ar.id', id)
      .first();
  }

  /**
   * Retrieves access requests for a specific requester.
   */
  async findByRequester(userId, { status, page = 1, limit = 20 } = {}, trx = null) {
    const qb = trx || db;
    const offset = (page - 1) * limit;

    let query = qb('access_requests as ar')
      .leftJoin('resources as r', 'ar.resource_id', 'r.id')
      .leftJoin('facilities as f', 'r.facility_id', 'f.id')
      .select(
        'ar.*',
        'r.name as resource_name',
        'r.category as resource_category',
        'f.name as facility_name'
      )
      .where('ar.requester_id', userId);

    if (status) {
      query = query.where('ar.status', status);
    }

    const [rows, countRes] = await Promise.all([
      query.clone().orderBy('ar.created_at', 'desc').limit(limit).offset(offset),
      query.clone().clearSelect().count('ar.id as total').first(),
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
   * Review queue: ordered oldest first (created_at ASC) per Spec §4.9.
   */
  async findReviewQueue({ facilityId, institutionId, status, page = 1, limit = 20 } = {}, trx = null) {
    const qb = trx || db;
    const offset = (page - 1) * limit;

    let query = qb('access_requests as ar')
      .leftJoin('resources as r', 'ar.resource_id', 'r.id')
      .leftJoin('facilities as f', 'r.facility_id', 'f.id')
      .leftJoin('users as u', 'ar.requester_id', 'u.id')
      .select(
        'ar.*',
        'r.name as resource_name',
        'r.category as resource_category',
        'f.name as facility_name',
        'f.institution_id',
        'u.name as requester_name',
        'u.email as requester_email'
      );

    if (facilityId) {
      query = query.where('r.facility_id', facilityId);
    }
    if (institutionId) {
      query = query.where('f.institution_id', institutionId);
    }
    if (status) {
      query = query.where('ar.status', status);
    } else {
      // Default queue shows actionable requests
      query = query.whereIn('ar.status', ['SUBMITTED', 'UNDER_REVIEW', 'AWAITING_DOCUMENTS', 'AWAITING_TRAINING']);
    }

    const [rows, countRes] = await Promise.all([
      query.clone().orderBy('ar.created_at', 'asc').limit(limit).offset(offset),
      query.clone().clearSelect().count('ar.id as total').first(),
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
   * Finds overlapping bookings on a resource within a given time range.
   */
  async findOverlappingBookings(resourceId, startAt, endAt, excludeBookingId = null, trx = null) {
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
   * Inserts confirmed booking record upon request approval.
   */
  async createBooking(bookingData, trx = null) {
    const qb = trx || db;
    const rows = await qb('bookings').insert(bookingData).returning('*');
    return Array.isArray(rows) ? rows[0] : (rows || bookingData);
  }

  /**
   * Inserts an entry into waitlist_entries with FIFO ordering.
   */
  async insertWaitlistEntry(entryData, trx = null) {
    const qb = trx || db;

    // Calculate next position
    const maxRow = await qb('waitlist_entries')
      .where({ resource_id: entryData.resource_id, status: 'PENDING' })
      .max('position as max_pos')
      .first();

    const nextPos = (maxRow?.max_pos || 0) + 1;
    const rowToInsert = {
      ...entryData,
      position: nextPos,
      status:   'PENDING',
    };

    const rows = await qb('waitlist_entries').insert(rowToInsert).returning('*');
    return Array.isArray(rows) ? rows[0] : (rows || rowToInsert);
  }
}

const accessRequestRepo = new AccessRequestRepository();
module.exports = { accessRequestRepo, AccessRequestRepository };
