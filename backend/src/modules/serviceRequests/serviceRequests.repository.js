'use strict';

/**
 * src/modules/serviceRequests/serviceRequests.repository.js
 *
 * Data access layer for staff-operated service requests and quotes.
 * Spec §4.13, Step 08.
 */

const { BaseRepository } = require('../../db/BaseRepository');
const { db }             = require('../../config/db');

class ServiceRequestRepository extends BaseRepository {
  constructor() {
    super('service_requests');
  }

  /**
   * Fetches full detail of a service request with resource, facility, and parties.
   */
  async findDetailById(id, trx = null) {
    const qb = trx || db;
    return qb('service_requests as sr')
      .leftJoin('resources as r', 'sr.resource_id', 'r.id')
      .leftJoin('facilities as f', 'sr.facility_id', 'f.id')
      .leftJoin('users as u', 'sr.requester_id', 'u.id')
      .leftJoin('users as op', 'sr.assigned_operator_id', 'op.id')
      .select(
        'sr.*',
        'r.name as resource_name',
        'r.category as resource_category',
        'r.access_modes as resource_access_modes',
        'f.name as facility_name',
        'f.institution_id',
        'f.timezone as facility_timezone',
        'u.name as requester_name',
        'u.email as requester_email',
        'op.name as operator_name',
        'op.email as operator_email'
      )
      .where('sr.id', id)
      .first();
  }

  /**
   * Lists service requests submitted by a specific user.
   */
  async findByRequester(userId, { status, page = 1, limit = 20 } = {}, trx = null) {
    const qb = trx || db;
    const offset = (page - 1) * limit;

    let query = qb('service_requests as sr')
      .leftJoin('resources as r', 'sr.resource_id', 'r.id')
      .leftJoin('facilities as f', 'sr.facility_id', 'f.id')
      .select(
        'sr.*',
        'r.name as resource_name',
        'r.category as resource_category',
        'f.name as facility_name'
      )
      .where('sr.requester_id', userId);

    if (status) {
      query = query.where('sr.status', status);
    }

    const rows = await query
      .orderBy('sr.created_at', 'desc')
      .limit(limit)
      .offset(offset);

    let countQuery = (trx || db)('service_requests').where({ requester_id: userId });
    if (status) {
      countQuery = countQuery.where({ status });
    }
    const countResult = await countQuery.count('id as total').first();
    const total = parseInt(countResult?.total || '0', 10);

    return { items: rows || [], total, page, limit };
  }

  /**
   * Lists service requests for a facility queue (manager/operator).
   */
  async findByFacility(facilityId, { status, page = 1, limit = 20 } = {}, trx = null) {
    const qb = trx || db;
    const offset = (page - 1) * limit;

    let query = qb('service_requests as sr')
      .leftJoin('resources as r', 'sr.resource_id', 'r.id')
      .leftJoin('users as u', 'sr.requester_id', 'u.id')
      .leftJoin('users as op', 'sr.assigned_operator_id', 'op.id')
      .select(
        'sr.*',
        'r.name as resource_name',
        'u.name as requester_name',
        'u.email as requester_email',
        'op.name as operator_name'
      )
      .where('sr.facility_id', facilityId);

    if (status) {
      query = query.where('sr.status', status);
    }

    const rows = await query
      .orderBy('sr.created_at', 'asc')
      .limit(limit)
      .offset(offset);

    let countQuery = (trx || db)('service_requests').where({ facility_id: facilityId });
    if (status) {
      countQuery = countQuery.where({ status });
    }
    const countResult = await countQuery.count('id as total').first();
    const total = parseInt(countResult?.total || '0', 10);

    return { items: rows || [], total, page, limit };
  }

  /**
   * Finds the latest quote for a service request.
   */
  async findActiveQuote(serviceRequestId, trx = null) {
    const qb = trx || db;
    return qb('service_request_quotes')
      .where({ service_request_id: serviceRequestId })
      .orderBy('created_at', 'desc')
      .first();
  }

  /**
   * Inserts an itemized cost estimate quote.
   */
  async createQuote(quoteData, trx = null) {
    const qb = trx || db;
    const rows = await qb('service_request_quotes')
      .insert({
        ...quoteData,
        line_items: JSON.stringify(quoteData.line_items || []),
        demo: true,
      })
      .returning('*');
    return Array.isArray(rows) ? rows[0] : rows;
  }

  /**
   * Updates quote status (e.g. ACCEPTED, DECLINED).
   */
  async updateQuoteStatus(quoteId, status, trx = null) {
    const qb = trx || db;
    const rows = await qb('service_request_quotes')
      .where({ id: quoteId })
      .update({
        status,
        responded_at: new Date(),
      })
      .returning('*');
    return Array.isArray(rows) ? rows[0] : rows;
  }
}

const serviceRequestRepo = new ServiceRequestRepository();

module.exports = {
  ServiceRequestRepository,
  serviceRequestRepo,
};

