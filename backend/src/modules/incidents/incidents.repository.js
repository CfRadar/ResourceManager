'use strict';

/**
 * src/modules/incidents/incidents.repository.js
 *
 * Data access layer for incidents, notes, and dossier timelines.
 * Spec §4.16, Step 09.
 */

const { BaseRepository } = require('../../db/BaseRepository');
const { db }             = require('../../config/db');

class IncidentRepository extends BaseRepository {
  constructor() {
    super('incidents');
  }

  /**
   * Fetches full incident detail joined with parties and associated booking/service request.
   */
  async findDetailById(id, trx = null) {
    const qb = trx || db;
    return qb('incidents as inc')
      .leftJoin('users as rep', 'inc.reporter_id', 'rep.id')
      .leftJoin('users as rev', 'inc.reviewer_id', 'rev.id')
      .leftJoin('bookings as b', 'inc.booking_id', 'b.id')
      .leftJoin('service_requests as sr', 'inc.service_request_id', 'sr.id')
      .select(
        'inc.*',
        'rep.name as reporter_name',
        'rep.email as reporter_email',
        'rev.name as reviewer_name',
        'b.user_id as booking_user_id',
        'b.resource_id as booking_resource_id',
        'sr.requester_id as service_requester_id',
        'sr.resource_id as service_resource_id'
      )
      .where('inc.id', id)
      .first();
  }

  /**
   * Fetches notes timeline for an incident with visibility filtering.
   */
  async findNotes(incidentId, { includeInternal = false } = {}, trx = null) {
    const qb = trx || db;
    let query = qb('incident_notes as inotes')
      .leftJoin('users as u', 'inotes.author_id', 'u.id')
      .select(
        'inotes.*',
        'u.name as author_name',
        'u.role as author_role'
      )
      .where('inotes.incident_id', incidentId);

    if (!includeInternal) {
      query = query.where('inotes.visibility', 'SHARED');
    }

    const rows = await query.orderBy('inotes.created_at', 'asc');
    return rows || [];
  }

  /**
   * Inserts an immutable note into incident_notes.
   */
  async insertNote(noteData, trx = null) {
    const qb = trx || db;
    const rows = await qb('incident_notes')
      .insert({
        ...noteData,
        attachments: noteData.attachments ? JSON.stringify(noteData.attachments) : null,
      })
      .returning('*');
    return Array.isArray(rows) ? rows[0] : rows;
  }

  /**
   * Lists incidents involving a specific user (reporter or party to booking/service).
   */
  async findByParty(userId, { status, type, page = 1, limit = 20 } = {}, trx = null) {
    const qb = trx || db;
    const offset = (page - 1) * limit;

    let query = qb('incidents as inc')
      .leftJoin('bookings as b', 'inc.booking_id', 'b.id')
      .leftJoin('service_requests as sr', 'inc.service_request_id', 'sr.id')
      .select('inc.*')
      .where(function() {
        this.where('inc.reporter_id', userId)
            .orWhere('b.user_id', userId)
            .orWhere('sr.requester_id', userId);
      });

    if (status) query = query.where('inc.status', status);
    if (type) query = query.where('inc.type', type);

    const rows = await query
      .orderBy('inc.created_at', 'desc')
      .limit(limit)
      .offset(offset);

    let countQuery = (trx || db)('incidents as inc')
      .leftJoin('bookings as b', 'inc.booking_id', 'b.id')
      .leftJoin('service_requests as sr', 'inc.service_request_id', 'sr.id')
      .where(function() {
        this.where('inc.reporter_id', userId)
            .orWhere('b.user_id', userId)
            .orWhere('sr.requester_id', userId);
      });

    if (status) countQuery = countQuery.where('inc.status', status);
    if (type) countQuery = countQuery.where('inc.type', type);

    const countResult = await countQuery.count('inc.id as total').first();
    const total = parseInt(countResult?.total || '0', 10);

    return { items: rows || [], total, page, limit };
  }

  /**
   * Lists incidents for a facility queue (manager desk).
   */
  async findByFacility(facilityId, { status, type, page = 1, limit = 20 } = {}, trx = null) {
    const qb = trx || db;
    const offset = (page - 1) * limit;

    let query = qb('incidents as inc')
      .leftJoin('bookings as b', 'inc.booking_id', 'b.id')
      .leftJoin('service_requests as sr', 'inc.service_request_id', 'sr.id')
      .leftJoin('resources as rb', 'b.resource_id', 'rb.id')
      .leftJoin('resources as rsr', 'sr.resource_id', 'rsr.id')
      .select('inc.*')
      .where(function() {
        this.where('rb.facility_id', facilityId)
            .orWhere('rsr.facility_id', facilityId);
      });

    if (status) query = query.where('inc.status', status);
    if (type) query = query.where('inc.type', type);

    const rows = await query
      .orderBy('inc.created_at', 'asc')
      .limit(limit)
      .offset(offset);

    let countQuery = (trx || db)('incidents as inc')
      .leftJoin('bookings as b', 'inc.booking_id', 'b.id')
      .leftJoin('service_requests as sr', 'inc.service_request_id', 'sr.id')
      .leftJoin('resources as rb', 'b.resource_id', 'rb.id')
      .leftJoin('resources as rsr', 'sr.resource_id', 'rsr.id')
      .where(function() {
        this.where('rb.facility_id', facilityId)
            .orWhere('rsr.facility_id', facilityId);
      });

    if (status) countQuery = countQuery.where('inc.status', status);
    if (type) countQuery = countQuery.where('inc.type', type);

    const countResult = await countQuery.count('inc.id as total').first();
    const total = parseInt(countResult?.total || '0', 10);

    return { items: rows || [], total, page, limit };
  }
}

const incidentRepo = new IncidentRepository();

module.exports = {
  IncidentRepository,
  incidentRepo,
};

