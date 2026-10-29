'use strict';

/**
 * src/modules/referrals/referrals.repository.js
 *
 * Data access layer for cross-institutional referrals.
 * Spec §4.14, Step 08.
 */

const { BaseRepository } = require('../../db/BaseRepository');
const { db }             = require('../../config/db');

class ReferralRepository extends BaseRepository {
  constructor() {
    super('referrals');
  }

  /**
   * Fetches full detail of a referral joined with need request, target institution, and parties.
   */
  async findDetailById(id, trx = null) {
    const qb = trx || db;
    return qb('referrals as ref')
      .join('need_requests as nr', 'ref.need_request_id', 'nr.id')
      .leftJoin('users as u', 'nr.requester_id', 'u.id')
      .leftJoin('institutions as inst', 'ref.target_institution_id', 'inst.id')
      .leftJoin('resources as r', 'ref.target_resource_id', 'r.id')
      .leftJoin('users as coord', 'ref.coordinator_id', 'coord.id')
      .leftJoin('users as resp', 'ref.responded_by', 'resp.id')
      .select(
        'ref.*',
        'nr.category as need_category',
        'nr.description as need_description',
        'nr.required_capabilities as need_capabilities',
        'nr.consent_share_contact as requester_consented',
        'nr.requester_id',
        'u.name as requester_name',
        'u.email as requester_email',
        'u.affiliation as requester_affiliation',
        'inst.name as target_institution_name',
        'r.name as target_resource_name',
        'coord.name as coordinator_name',
        'resp.name as responder_name'
      )
      .where('ref.id', id)
      .first();
  }

  /**
   * Lists referrals received by an institution (Inbox).
   */
  async findInbox({ institutionId, status, page = 1, limit = 20 } = {}, trx = null) {
    const qb = trx || db;
    const offset = (page - 1) * limit;

    let query = qb('referrals as ref')
      .join('need_requests as nr', 'ref.need_request_id', 'nr.id')
      .leftJoin('users as u', 'nr.requester_id', 'u.id')
      .leftJoin('institutions as inst', 'ref.target_institution_id', 'inst.id')
      .leftJoin('resources as r', 'ref.target_resource_id', 'r.id')
      .select(
        'ref.*',
        'nr.category as need_category',
        'nr.description as need_description',
        'nr.consent_share_contact as requester_consented',
        'u.name as requester_name',
        'u.email as requester_email',
        'inst.name as target_institution_name',
        'r.name as target_resource_name'
      );

    if (institutionId) {
      query = query.where('ref.target_institution_id', institutionId);
    }
    if (status) {
      query = query.where('ref.status', status);
    }

    const rows = await query
      .orderBy('ref.created_at', 'desc')
      .limit(limit)
      .offset(offset);

    let countQuery = (trx || db)('referrals as ref');
    if (institutionId) {
      countQuery = countQuery.where('ref.target_institution_id', institutionId);
    }
    if (status) {
      countQuery = countQuery.where('ref.status', status);
    }
    const countResult = await countQuery.count('ref.id as total').first();
    const total = parseInt(countResult?.total || '0', 10);

    return { items: rows || [], total, page, limit };
  }

  /**
   * Sanitizes requester contact information if not released.
   */
  sanitizeContact(record) {
    if (!record) return record;
    const sanitized = { ...record };

    if (!sanitized.contact_released) {
      sanitized.requester_email = '[WITHHELD - Contact not released]';
    }

    return sanitized;
  }
}

const referralRepo = new ReferralRepository();

module.exports = {
  ReferralRepository,
  referralRepo,
};

