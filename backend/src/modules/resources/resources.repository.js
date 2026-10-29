'use strict';

/**
 * src/modules/resources/resources.repository.js
 *
 * Data access repository for resources, photos, and categories.
 * All column names adhere to migration 003_resources_and_policies.js.
 */

const { BaseRepository } = require('../../db/BaseRepository');
const { db }             = require('../../config/db');
const { ROLES }          = require('../../middleware/rbac');

class ResourceRepository extends BaseRepository {
  constructor() {
    super('resources', { softDelete: false });
  }

  /**
   * Sanitizes a raw database resource row with joined facility and policy into safe API object.
   */
  static formatResource(row) {
    if (!row) return null;

    let specs = row.specs;
    if (typeof specs === 'string') {
      try { specs = JSON.parse(specs); } catch { specs = null; }
    }

    let policySummary = null;
    if (row.policy_data) {
      let pData = row.policy_data;
      if (typeof pData === 'string') {
        try { pData = JSON.parse(pData); } catch { pData = null; }
      }
      if (pData) {
        policySummary = {
          version:              row.policy_version || 1,
          supportedAccessModes: pData.supportedAccessModes || pData.accessModes || [],
          pricingModel:         pData.pricing?.model || pData.pricingModel || 'FREE',
          hourlyRate:           pData.pricing?.hourlyRate || 0,
          tokensPerHour:        pData.pricing?.tokensPerHour || pData.demoTokenCostPerHour || 0,
          requiresApproval:     Boolean(pData.requiresApproval),
        };
      }
    }

    return {
      id:           row.id,
      facilityId:   row.facility_id,
      name:         row.name,
      category:     row.category,
      description:  row.description || null,
      specs:        specs || null,
      capabilities: Array.isArray(row.capabilities) ? row.capabilities : [],
      visibility:   row.visibility,
      riskLevel:    row.risk_level,
      status:       row.status,
      createdBy:    row.created_by || null,
      createdAt:    row.created_at,
      updatedAt:    row.updated_at,
      facility: row.facility_name ? {
        id:                   row.facility_id,
        name:                 row.facility_name,
        address:              row.facility_address || null,
        institutionId:        row.institution_id,
        institutionName:      row.institution_name || null,
        city:                 row.institution_city || null,
        timezone:             row.facility_timezone || 'UTC',
        geofenceRadiusMeters: row.facility_geofence_radius || 150,
      } : undefined,
      policySummary: policySummary || undefined,
    };
  }

  /**
   * Resolve partner institution IDs for given institution IDs to evaluate NETWORK visibility.
   */
  async resolvePartnerInstitutions(institutionIds, trx = null) {
    if (!institutionIds || institutionIds.length === 0) return [];
    const qb = trx ? trx('institution_partners') : db('institution_partners');
    const partnerRows = await qb
      .whereIn('institution_id_a', institutionIds)
      .orWhereIn('institution_id_b', institutionIds);

    const partnerIds = new Set();
    for (const r of partnerRows) {
      if (institutionIds.includes(r.institution_id_a)) {
        partnerIds.add(r.institution_id_b);
      }
      if (institutionIds.includes(r.institution_id_b)) {
        partnerIds.add(r.institution_id_a);
      }
    }
    return Array.from(partnerIds);
  }

  /**
   * Search/browse resources enforcing visibility and filters.
   */
  async findVisibleResources(filters = {}, userContext = null, pagination = {}, trx = null) {
    const {
      q,
      category,
      institutionId,
      facilityId,
      accessMode,
      city,
    } = filters;

    const { page = 1, pageSize = 20 } = pagination;
    const offset = (page - 1) * pageSize;

    // Collect user memberships
    const userMemberships = userContext?.memberships || [];
    const directInstitutions = userMemberships.map((m) => m.institutionId);
    const managerOwnerInstitutions = userMemberships
      .filter((m) => m.role === ROLES.ADMIN || m.role === ROLES.OWNER || m.role === ROLES.MANAGER)
      .map((m) => m.institutionId);

    // Resolve network partners
    let networkAllowedInstitutions = directInstitutions;
    if (directInstitutions.length > 0) {
      const partnerIds = await this.resolvePartnerInstitutions(directInstitutions, trx);
      networkAllowedInstitutions = Array.from(new Set([...directInstitutions, ...partnerIds]));
    }

    const baseQb = (queryTrx) => {
      const qb = queryTrx ? queryTrx('resources') : db('resources');
      qb.join('facilities', 'resources.facility_id', 'facilities.id')
        .join('institutions', 'facilities.institution_id', 'institutions.id')
        .leftJoin('resource_policies', function () {
          this.on('resources.id', '=', 'resource_policies.resource_id')
              .andOn('resource_policies.is_current', '=', queryTrx ? queryTrx.raw('?', [true]) : db.raw('?', [true]));
        });

      // ── Visibility Rules ───────────────────────────────────────────────────
      qb.where((vQb) => {
        // PUBLIC + ACTIVE is always visible to everyone
        vQb.where((pub) => {
          pub.where('resources.visibility', 'PUBLIC').andWhere('resources.status', 'ACTIVE');
        });

        // INSTITUTION visible to direct members
        if (directInstitutions.length > 0) {
          vQb.orWhere((inst) => {
            inst
              .where('resources.visibility', 'INSTITUTION')
              .whereIn('facilities.institution_id', directInstitutions)
              .andWhere('resources.status', 'ACTIVE');
          });
        }

        // NETWORK visible to direct members + verified partners
        if (networkAllowedInstitutions.length > 0) {
          vQb.orWhere((net) => {
            net
              .where('resources.visibility', 'NETWORK')
              .whereIn('facilities.institution_id', networkAllowedInstitutions)
              .andWhere('resources.status', 'ACTIVE');
          });
        }

        // Platform Admin can see everything (including PRIVATE & INACTIVE)
        if (userContext?.role === ROLES.ADMIN) {
          vQb.orWhereRaw('1 = 1');
        } else if (managerOwnerInstitutions.length > 0) {
          // Managers / Owners can see their institution's PRIVATE & INACTIVE listings
          vQb.orWhere((priv) => {
            priv.whereIn('facilities.institution_id', managerOwnerInstitutions);
          });
        }
      });

      // ── Specific Search Filters ────────────────────────────────────────────
      if (category) {
        qb.whereRaw('LOWER(resources.category) = ?', [category.trim().toLowerCase()]);
      }
      if (institutionId) {
        qb.where('facilities.institution_id', institutionId);
      }
      if (facilityId) {
        qb.where('resources.facility_id', facilityId);
      }
      if (city) {
        qb.whereRaw('LOWER(institutions.city) = ?', [city.trim().toLowerCase()]);
      }
      if (q) {
        const searchTerm = `%${q.trim().toLowerCase()}%`;
        qb.where((nested) => {
          nested
            .whereRaw('LOWER(resources.name) LIKE ?', [searchTerm])
            .orWhereRaw('LOWER(resources.description) LIKE ?', [searchTerm])
            .orWhereRaw('LOWER(resources.category) LIKE ?', [searchTerm]);
        });
      }
      if (accessMode) {
        // Look inside policy_data for supportedAccessModes or accessModes
        qb.whereRaw(
          `(resource_policies.policy_data->'supportedAccessModes' ? ? OR resource_policies.policy_data->'accessModes' ? ?)`,
          [accessMode, accessMode]
        );
      }

      return qb;
    };

    const countQb = baseQb(trx);
    const countRes = await countQb.count('resources.id as count').first();
    const total = parseInt(countRes ? countRes.count : 0, 10);

    const rowsQb = baseQb(trx);
    const rows = await rowsQb
      .select(
        'resources.*',
        'facilities.name as facility_name',
        'facilities.address as facility_address',
        'facilities.institution_id',
        'facilities.timezone as facility_timezone',
        'facilities.geofence_radius_meters as facility_geofence_radius',
        'institutions.name as institution_name',
        'institutions.city as institution_city',
        'resource_policies.policy_version',
        'resource_policies.policy_data'
      )
      .orderBy('resources.name', 'asc')
      .limit(pageSize)
      .offset(offset);

    return {
      data: rows.map(ResourceRepository.formatResource),
      meta: {
        page: Number(page),
        pageSize: Number(pageSize),
        total,
        totalPages: Math.ceil(total / pageSize) || 1,
      },
    };
  }

  /**
   * Find single resource with joined facility, institution, policy, and photos.
   */
  async findByIdWithDetails(id, trx = null) {
    const qb = trx ? trx('resources') : db('resources');
    const row = await qb
      .join('facilities', 'resources.facility_id', 'facilities.id')
      .join('institutions', 'facilities.institution_id', 'institutions.id')
      .leftJoin('resource_policies', function () {
        this.on('resources.id', '=', 'resource_policies.resource_id')
            .andOn('resource_policies.is_current', '=', qb.client ? qb.client.raw('?', [true]) : db.raw('?', [true]));
      })
      .where('resources.id', id)
      .select(
        'resources.*',
        'facilities.name as facility_name',
        'facilities.address as facility_address',
        'facilities.institution_id',
        'facilities.timezone as facility_timezone',
        'facilities.geofence_radius_meters as facility_geofence_radius',
        'institutions.name as institution_name',
        'institutions.city as institution_city',
        'resource_policies.policy_version',
        'resource_policies.policy_data'
      )
      .first();

    if (!row) return null;

    const formatted = ResourceRepository.formatResource(row);

    // Fetch active photos
    const photoQb = trx ? trx('resource_photos') : db('resource_photos');
    const photos = await photoQb
      .where({ resource_id: id })
      .whereNull('deleted_at')
      .orderBy('sort_order', 'asc');

    formatted.photos = photos.map((p) => ({
      id:        p.id,
      fileId:    p.file_id,
      caption:   p.caption || null,
      isPrimary: Boolean(p.is_primary),
      sortOrder: p.sort_order,
    }));

    return formatted;
  }

  /**
   * Retrieve distinct categories and tags vocabulary.
   */
  async findCategoriesAndVocabulary(trx = null) {
    const qb = trx ? trx('resources') : db('resources');
    const rows = await qb
      .where({ status: 'ACTIVE' })
      .select('category', 'capabilities');

    const categoriesSet = new Set();
    const tagsSet = new Set();

    for (const r of rows) {
      if (r.category) categoriesSet.add(r.category);
      if (Array.isArray(r.capabilities)) {
        r.capabilities.forEach((cap) => tagsSet.add(cap));
      }
    }

    return {
      categories: Array.from(categoriesSet).sort(),
      tags:       Array.from(tagsSet).sort(),
    };
  }

  /**
   * Soft deactivation.
   */
  async softDeactivate(id, trx = null) {
    const qb = trx ? trx('resources') : db('resources');
    await qb
      .where({ id })
      .update({ status: 'INACTIVE', updated_at: db.fn.now() });
    return this.findById(id, trx);
  }
}

// ─── Resource Photos Repository ───────────────────────────────────────────────

class ResourcePhotoRepository extends BaseRepository {
  constructor() {
    super('resource_photos', { softDelete: true });
  }

  async findActiveByResourceId(resourceId, trx = null) {
    return this.findAll({ resource_id: resourceId }, { orderBy: 'sort_order' }, trx);
  }
}

const resourceRepo      = new ResourceRepository();
const resourcePhotoRepo = new ResourcePhotoRepository();

module.exports = {
  resourceRepo,
  resourcePhotoRepo,
  ResourceRepository,
  ResourcePhotoRepository,
};

