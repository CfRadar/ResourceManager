'use strict';

/**
 * src/modules/facilities/facilities.repository.js
 *
 * Data access repository for facilities.
 * All column names adhere to migration 002_institutions_and_facilities.js.
 */

const { BaseRepository } = require('../../db/BaseRepository');
const { db }             = require('../../config/db');

class FacilityRepository extends BaseRepository {
  constructor() {
    super('facilities', { softDelete: false });
  }

  /**
   * Sanitizes a facility record for public API consumption.
   */
  static sanitizePublic(fac) {
    if (!fac) return null;
    let parsedWorkingHours = fac.working_hours;
    if (typeof parsedWorkingHours === 'string') {
      try {
        parsedWorkingHours = JSON.parse(parsedWorkingHours);
      } catch {
        parsedWorkingHours = null;
      }
    }

    return {
      id:                   fac.id,
      institutionId:        fac.institution_id,
      name:                 fac.name,
      address:              fac.address || null,
      lat:                  fac.lat != null ? Number(fac.lat) : null,
      lng:                  fac.lng != null ? Number(fac.lng) : null,
      timezone:             fac.timezone || 'UTC',
      workingHours:         parsedWorkingHours || null,
      geofenceRadiusMeters: fac.geofence_radius_meters != null ? Number(fac.geofence_radius_meters) : 150,
      createdAt:            fac.created_at,
      updatedAt:            fac.updated_at,
      institution: fac.institution_name ? {
        id:   fac.institution_id,
        name: fac.institution_name,
        city: fac.institution_city || null,
      } : undefined,
    };
  }

  /**
   * Find facilities belonging to an institution.
   */
  async findByInstitutionId(institutionId, trx = null) {
    const qb = trx ? trx('facilities') : db('facilities');
    const rows = await qb
      .where({ institution_id: institutionId })
      .orderBy('name', 'asc');
    return rows.map(FacilityRepository.sanitizePublic);
  }

  /**
   * Find facilities with optional filters and pagination.
   */
  async findFacilitiesWithFilters(filters = {}, pagination = {}, trx = null) {
    const { institutionId, city, q } = filters;
    const { page = 1, pageSize = 20 } = pagination;
    const offset = (page - 1) * pageSize;

    const baseQb = (queryTrx) => {
      const qb = queryTrx ? queryTrx('facilities') : db('facilities');
      qb.join('institutions', 'facilities.institution_id', 'institutions.id');

      if (institutionId) {
        qb.where('facilities.institution_id', institutionId);
      }
      if (city) {
        qb.whereRaw('LOWER(institutions.city) = ?', [city.toLowerCase()]);
      }
      if (q) {
        const searchTerm = `%${q.toLowerCase()}%`;
        qb.where((nested) => {
          nested
            .whereRaw('LOWER(facilities.name) LIKE ?', [searchTerm])
            .orWhereRaw('LOWER(facilities.address) LIKE ?', [searchTerm]);
        });
      }
      return qb;
    };

    const countQb = baseQb(trx);
    const countRes = await countQb.count('facilities.id as count').first();
    const total = parseInt(countRes ? countRes.count : 0, 10);

    const rowsQb = baseQb(trx);
    const rows = await rowsQb
      .select(
        'facilities.*',
        'institutions.name as institution_name',
        'institutions.city as institution_city'
      )
      .orderBy('facilities.name', 'asc')
      .limit(pageSize)
      .offset(offset);

    return {
      data: rows.map(FacilityRepository.sanitizePublic),
      meta: {
        page: Number(page),
        pageSize: Number(pageSize),
        total,
        totalPages: Math.ceil(total / pageSize) || 1,
      },
    };
  }

  /**
   * Find single facility by ID with institution info.
   */
  async findByIdWithInstitution(id, trx = null) {
    const qb = trx ? trx('facilities') : db('facilities');
    const row = await qb
      .join('institutions', 'facilities.institution_id', 'institutions.id')
      .where('facilities.id', id)
      .select(
        'facilities.*',
        'institutions.name as institution_name',
        'institutions.city as institution_city'
      )
      .first();

    if (!row) return null;
    return FacilityRepository.sanitizePublic(row);
  }
}

const facilityRepo = new FacilityRepository();

module.exports = {
  facilityRepo,
  FacilityRepository,
};
