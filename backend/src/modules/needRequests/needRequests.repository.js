'use strict';

/**
 * src/modules/needRequests/needRequests.repository.js
 *
 * Data access layer for missing-resource need requests.
 * Spec §4.14, Step 08.
 */

const { BaseRepository } = require('../../db/BaseRepository');
const { db }             = require('../../config/db');

class NeedRequestRepository extends BaseRepository {
  constructor() {
    super('need_requests');
  }

  /**
   * Fetches full detail of a need request with requester details.
   */
  async findDetailById(id, trx = null) {
    const qb = trx || db;
    return qb('need_requests as nr')
      .leftJoin('users as u', 'nr.requester_id', 'u.id')
      .leftJoin('institutions as inst', 'nr.institution_id', 'inst.id')
      .leftJoin('users as coord', 'nr.coordinator_id', 'coord.id')
      .select(
        'nr.*',
        'u.name as requester_name',
        'u.email as requester_email',
        'u.affiliation as requester_affiliation',
        'inst.name as institution_name',
        'coord.name as coordinator_name'
      )
      .where('nr.id', id)
      .first();
  }

  /**
   * Lists need requests created by a specific user.
   */
  async findByRequester(userId, { status, page = 1, limit = 20 } = {}, trx = null) {
    const qb = trx || db;
    const offset = (page - 1) * limit;

    let query = qb('need_requests as nr')
      .leftJoin('institutions as inst', 'nr.institution_id', 'inst.id')
      .select('nr.*', 'inst.name as institution_name')
      .where('nr.requester_id', userId);

    if (status) {
      query = query.where('nr.status', status);
    }

    const rows = await query
      .orderBy('nr.created_at', 'desc')
      .limit(limit)
      .offset(offset);

    let countQuery = (trx || db)('need_requests').where({ requester_id: userId });
    if (status) {
      countQuery = countQuery.where({ status });
    }
    const countResult = await countQuery.count('id as total').first();
    const total = parseInt(countResult?.total || '0', 10);

    return { items: rows || [], total, page, limit };
  }

  /**
   * Lists coordinator queue of need requests.
   */
  async findCoordinatorQueue({ status, category, page = 1, limit = 20 } = {}, trx = null) {
    const qb = trx || db;
    const offset = (page - 1) * limit;

    let query = qb('need_requests as nr')
      .leftJoin('users as u', 'nr.requester_id', 'u.id')
      .leftJoin('institutions as inst', 'nr.institution_id', 'inst.id')
      .select(
        'nr.*',
        'u.name as requester_name',
        'u.affiliation as requester_affiliation',
        'inst.name as institution_name'
      );

    if (status) {
      query = query.where('nr.status', status);
    }
    if (category) {
      query = query.where('nr.category', category);
    }

    const rows = await query
      .orderBy('nr.created_at', 'asc')
      .limit(limit)
      .offset(offset);

    let countQuery = (trx || db)('need_requests');
    if (status) {
      countQuery = countQuery.where({ status });
    }
    if (category) {
      countQuery = countQuery.where({ category });
    }
    const countResult = await countQuery.count('id as total').first();
    const total = parseInt(countResult?.total || '0', 10);

    return { items: rows || [], total, page, limit };
  }

  /**
   * Deterministic search for candidate resources based on category or capability tags.
   */
  async findCandidateResources({ category, capabilities = [] }, trx = null) {
    const qb = trx || db;
    let query = qb('resources as r')
      .join('facilities as f', 'r.facility_id', 'f.id')
      .join('institutions as inst', 'f.institution_id', 'inst.id')
      .select(
        'r.id as resource_id',
        'r.name as resource_name',
        'r.category as resource_category',
        'r.capabilities as resource_capabilities',
        'r.access_modes',
        'f.id as facility_id',
        'f.name as facility_name',
        'inst.id as institution_id',
        'inst.name as institution_name'
      )
      .where('r.is_active', true);

    if (category) {
      query = query.where(function() {
        this.where('r.category', category)
            .orWhereILike('r.name', `%${category}%`)
            .orWhereILike('r.description', `%${category}%`);
      });
    }

    const rows = await query.limit(10);
    return rows || [];
  }
}

const needRequestRepo = new NeedRequestRepository();

module.exports = {
  NeedRequestRepository,
  needRequestRepo,
};

