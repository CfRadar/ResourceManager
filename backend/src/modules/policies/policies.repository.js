'use strict';

/**
 * src/modules/policies/policies.repository.js
 *
 * Data access repository for versioned resource policies.
 * Spec §4.6, Step 04 §2.
 */

const { BaseRepository } = require('../../db/BaseRepository');
const { db }             = require('../../config/db');

class PolicyRepository extends BaseRepository {
  constructor() {
    super('resource_policies', { softDelete: false });
  }

  /**
   * Find the current active policy for a resource.
   */
  async findCurrentPolicy(resourceId, trx = null) {
    const qb = trx ? trx('resource_policies') : db('resource_policies');
    const row = await qb
      .where({ resource_id: resourceId, is_current: true })
      .first();

    if (!row) return null;

    let parsedData = row.policy_data;
    if (typeof parsedData === 'string') {
      try { parsedData = JSON.parse(parsedData); } catch { parsedData = {}; }
    }

    return {
      id:            row.id,
      resourceId:    row.resource_id,
      policyVersion: row.policy_version,
      isCurrent:     Boolean(row.is_current),
      policyData:    parsedData,
      updatedBy:     row.updated_by,
      createdAt:     row.created_at,
    };
  }

  /**
   * Find policy by specific version number.
   */
  async findPolicyByVersion(resourceId, version, trx = null) {
    const qb = trx ? trx('resource_policies') : db('resource_policies');
    const row = await qb
      .where({ resource_id: resourceId, policy_version: version })
      .first();

    if (!row) return null;

    let parsedData = row.policy_data;
    if (typeof parsedData === 'string') {
      try { parsedData = JSON.parse(parsedData); } catch { parsedData = {}; }
    }

    return {
      id:            row.id,
      resourceId:    row.resource_id,
      policyVersion: row.policy_version,
      isCurrent:     Boolean(row.is_current),
      policyData:    parsedData,
      updatedBy:     row.updated_by,
      createdAt:     row.created_at,
    };
  }

  /**
   * Atomically save a new version of the resource policy.
   * Marks previous versions `is_current = false`.
   */
  async createVersion(resourceId, policyData, userId, trx = null) {
    const execute = async (t) => {
      // Find latest version
      const latest = await t('resource_policies')
        .where({ resource_id: resourceId })
        .orderBy('policy_version', 'desc')
        .first();

      const nextVersion = latest ? Number(latest.policy_version) + 1 : 1;

      // Unset previous current flag
      await t('resource_policies')
        .where({ resource_id: resourceId, is_current: true })
        .update({ is_current: false });

      // Insert new version
      const [inserted] = await t('resource_policies')
        .insert({
          resource_id:    resourceId,
          policy_version: nextVersion,
          policy_data:    typeof policyData === 'string' ? policyData : JSON.stringify(policyData),
          updated_by:     userId,
          is_current:     true,
        })
        .returning('*');

      let parsedData = inserted.policy_data;
      if (typeof parsedData === 'string') {
        try { parsedData = JSON.parse(parsedData); } catch { parsedData = {}; }
      }

      return {
        id:            inserted.id,
        resourceId:    inserted.resource_id,
        policyVersion: inserted.policy_version,
        isCurrent:     Boolean(inserted.is_current),
        policyData:    parsedData,
        updatedBy:     inserted.updated_by,
        createdAt:     inserted.created_at,
      };
    };

    if (trx) {
      return execute(trx);
    }
    return db.transaction(execute);
  }
}

const policyRepo = new PolicyRepository();

module.exports = {
  policyRepo,
  PolicyRepository,
};

