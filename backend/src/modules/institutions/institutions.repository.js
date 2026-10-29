'use strict';

/**
 * src/modules/institutions/institutions.repository.js
 *
 * Data access repositories for institutions, membership requests, and partner links.
 * All column names adhere to migration 002_institutions_and_facilities.js.
 */

const { BaseRepository } = require('../../db/BaseRepository');
const { db }             = require('../../config/db');

// ─── Institution Repository ───────────────────────────────────────────────────

class InstitutionRepository extends BaseRepository {
  constructor() {
    super('institutions', { softDelete: false });
  }

  /**
   * Sanitizes an institution object to public-safe fields.
   * Strips any internal verification or administrative fields.
   */
  static sanitizePublic(inst) {
    if (!inst) return null;
    return {
      id:          inst.id,
      name:        inst.name,
      type:        inst.type,
      city:        inst.city || null,
      address:     inst.address || null,
      website:     inst.website || null,
      description: inst.description || null,
      createdAt:   inst.created_at,
      updatedAt:   inst.updated_at,
    };
  }

  /**
   * Find verified institutions with filtering and pagination.
   */
  async findVerified(filters = {}, pagination = {}, trx = null) {
    const { city, type, q } = filters;
    const { page = 1, pageSize = 20 } = pagination;
    const offset = (page - 1) * pageSize;

    const queryBuilder = (queryTrx) => {
      const qb = queryTrx ? queryTrx('institutions') : db('institutions');
      qb.where({ verified: true });

      if (city) {
        qb.whereRaw('LOWER(city) = ?', [city.toLowerCase()]);
      }
      if (type) {
        qb.where({ type });
      }
      if (q) {
        const searchTerm = `%${q.toLowerCase()}%`;
        qb.where((nested) => {
          nested
            .whereRaw('LOWER(name) LIKE ?', [searchTerm])
            .orWhereRaw('LOWER(description) LIKE ?', [searchTerm])
            .orWhereRaw('LOWER(city) LIKE ?', [searchTerm]);
        });
      }
      return qb;
    };

    const countQb = queryBuilder(trx);
    const countRes = await countQb.count('* as count').first();
    const total = parseInt(countRes ? countRes.count : 0, 10);

    const rowsQb = queryBuilder(trx);
    const rows = await rowsQb
      .orderBy('name', 'asc')
      .limit(pageSize)
      .offset(offset);

    return {
      data: rows.map(InstitutionRepository.sanitizePublic),
      meta: {
        page: Number(page),
        pageSize: Number(pageSize),
        total,
        totalPages: Math.ceil(total / pageSize) || 1,
      },
    };
  }

  /**
   * Find institution by name (case-insensitive) to prevent duplicates.
   */
  async findByName(name, trx = null) {
    const qb = trx ? trx('institutions') : db('institutions');
    return qb.whereRaw('LOWER(name) = ?', [name.trim().toLowerCase()]).first() || null;
  }
}

// ─── Institution Partner Repository ───────────────────────────────────────────

class InstitutionPartnerRepository extends BaseRepository {
  constructor() {
    super('institution_partners', { softDelete: false });
  }

  /**
   * Canonical ordering of partner IDs: [a, b] where a < b.
   */
  static normalizePair(idA, idB) {
    return idA < idB ? [idA, idB] : [idB, idA];
  }

  /**
   * Check whether two institutions are already partners.
   */
  async arePartners(id1, id2, trx = null) {
    const [instA, instB] = InstitutionPartnerRepository.normalizePair(id1, id2);
    const qb = trx ? trx('institution_partners') : db('institution_partners');
    const existing = await qb
      .where({ institution_id_a: instA, institution_id_b: instB })
      .first();
    return Boolean(existing);
  }

  /**
   * Insert a partner link between two institutions.
   */
  async linkPartners(id1, id2, trx = null) {
    const [instA, instB] = InstitutionPartnerRepository.normalizePair(id1, id2);
    const qb = trx ? trx('institution_partners') : db('institution_partners');
    const [created] = await qb
      .insert({
        institution_id_a: instA,
        institution_id_b: instB,
        established_at:   db.fn.now(),
      })
      .returning('*');
    return created;
  }

  /**
   * Find all partner institutions for an institution.
   */
  async findPartners(institutionId, trx = null) {
    const qb = trx ? trx('institution_partners') : db('institution_partners');
    const partnerRows = await qb
      .where({ institution_id_a: institutionId })
      .orWhere({ institution_id_b: institutionId });

    const partnerIds = partnerRows.map((r) =>
      r.institution_id_a === institutionId ? r.institution_id_b : r.institution_id_a
    );

    if (partnerIds.length === 0) return [];

    const instQb = trx ? trx('institutions') : db('institutions');
    const partners = await instQb
      .whereIn('id', partnerIds)
      .where({ verified: true })
      .orderBy('name', 'asc');

    return partners.map(InstitutionRepository.sanitizePublic);
  }
}

// ─── Membership Request Repository ────────────────────────────────────────────

class MembershipRequestRepository extends BaseRepository {
  constructor() {
    super('membership_requests', { softDelete: false });
  }

  /**
   * Find any existing pending request for this user and institution.
   */
  async findPendingByUserAndInstitution(userId, institutionId, trx = null) {
    const qb = trx ? trx('membership_requests') : db('membership_requests');
    return qb
      .where({
        user_id:        userId,
        institution_id: institutionId,
        status:         'PENDING',
      })
      .first() || null;
  }

  /**
   * List membership requests for an institution, joining user details.
   */
  async findRequestsWithUser(institutionId, status = 'PENDING', pagination = {}, trx = null) {
    const { page = 1, pageSize = 20 } = pagination;
    const offset = (page - 1) * pageSize;

    const baseQb = (queryTrx) => {
      const qb = queryTrx ? queryTrx('membership_requests') : db('membership_requests');
      qb.where({ institution_id: institutionId });
      if (status && status !== 'ALL') {
        qb.where({ status });
      }
      return qb;
    };

    const countQb = baseQb(trx);
    const countRes = await countQb.count('* as count').first();
    const total = parseInt(countRes ? countRes.count : 0, 10);

    const rowsQb = trx ? trx('membership_requests') : db('membership_requests');
    rowsQb
      .join('users', 'membership_requests.user_id', 'users.id')
      .where('membership_requests.institution_id', institutionId);

    if (status && status !== 'ALL') {
      rowsQb.where('membership_requests.status', status);
    }

    const rows = await rowsQb
      .select(
        'membership_requests.id',
        'membership_requests.user_id',
        'membership_requests.institution_id',
        'membership_requests.requested_role',
        'membership_requests.message',
        'membership_requests.supporting_document_id',
        'membership_requests.status',
        'membership_requests.reviewed_by',
        'membership_requests.review_reason',
        'membership_requests.reviewed_at',
        'membership_requests.created_at',
        'membership_requests.updated_at',
        'users.name as user_name',
        'users.email as user_email'
      )
      .orderBy('membership_requests.created_at', 'asc')
      .limit(pageSize)
      .offset(offset);

    const data = rows.map((r) => ({
      id:                   r.id,
      institutionId:        r.institution_id,
      requestedRole:        r.requested_role,
      message:              r.message,
      supportingDocumentId: r.supporting_document_id,
      status:               r.status,
      reviewedBy:           r.reviewed_by,
      reviewReason:         r.review_reason,
      reviewedAt:           r.reviewed_at,
      createdAt:            r.created_at,
      updatedAt:            r.updated_at,
      user: {
        id:    r.user_id,
        name:  r.user_name,
        email: r.user_email,
      },
    }));

    return {
      data,
      meta: {
        page: Number(page),
        pageSize: Number(pageSize),
        total,
        totalPages: Math.ceil(total / pageSize) || 1,
      },
    };
  }

  /**
   * Find single request by ID with user info.
   */
  async findRequestById(id, trx = null) {
    const qb = trx ? trx('membership_requests') : db('membership_requests');
    const row = await qb
      .join('users', 'membership_requests.user_id', 'users.id')
      .where('membership_requests.id', id)
      .select(
        'membership_requests.*',
        'users.name as user_name',
        'users.email as user_email'
      )
      .first();

    if (!row) return null;

    return {
      id:                   row.id,
      userId:               row.user_id,
      institutionId:        row.institution_id,
      requestedRole:        row.requested_role,
      message:              row.message,
      supportingDocumentId: row.supporting_document_id,
      status:               row.status,
      reviewedBy:           row.reviewed_by,
      reviewReason:         row.review_reason,
      reviewedAt:           row.reviewed_at,
      createdAt:            row.created_at,
      updatedAt:            row.updated_at,
      user: {
        id:    row.user_id,
        name:  row.user_name,
        email: row.user_email,
      },
    };
  }

  /**
   * Update request status and review details.
   */
  async updateStatus(id, status, reviewerId, reason, trx = null) {
    return this.update(
      id,
      {
        status,
        reviewed_by:   reviewerId,
        review_reason: reason || null,
        reviewed_at:   trx ? trx.fn.now() : db.fn.now(),
        updated_at:    trx ? trx.fn.now() : db.fn.now(),
      },
      trx
    );
  }
}

// ─── Institution Membership Repository ────────────────────────────────────────

class InstitutionMembershipRepository extends BaseRepository {
  constructor() {
    super('institution_memberships', { softDelete: false });
  }

  async findActiveMembership(userId, institutionId, trx = null) {
    return this.findOne({ user_id: userId, institution_id: institutionId, status: 'ACTIVE' }, trx);
  }

  async findMembership(userId, institutionId, trx = null) {
    return this.findOne({ user_id: userId, institution_id: institutionId }, trx);
  }

  async upsertMembership(data, trx = null) {
    const existing = await this.findMembership(data.userId, data.institutionId, trx);
    if (existing) {
      return this.update(existing.id, {
        role:        data.role,
        status:      'ACTIVE',
        verified_by: data.verifiedBy,
        verified_at: trx ? trx.fn.now() : db.fn.now(),
        updated_at:  trx ? trx.fn.now() : db.fn.now(),
      }, trx);
    }
    return this.insert({
      user_id:        data.userId,
      institution_id: data.institutionId,
      role:           data.role,
      status:         'ACTIVE',
      verified_by:    data.verifiedBy,
      verified_at:    trx ? trx.fn.now() : db.fn.now(),
    }, trx);
  }
}

// ─── Singletons ───────────────────────────────────────────────────────────────

const institutionRepo           = new InstitutionRepository();
const institutionPartnerRepo    = new InstitutionPartnerRepository();
const membershipRequestRepo     = new MembershipRequestRepository();
const institutionMembershipRepo = new InstitutionMembershipRepository();

module.exports = {
  institutionRepo,
  institutionPartnerRepo,
  membershipRequestRepo,
  institutionMembershipRepo,
  InstitutionRepository,
  InstitutionPartnerRepository,
  MembershipRequestRepository,
  InstitutionMembershipRepository,
};
