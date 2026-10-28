'use strict';

/**
 * src/db/BaseRepository.js
 *
 * Thin base class providing common, type-safe CRUD primitives.
 *
 * Design:
 *  - All queries go through Knex. No raw SQL unless there is a strong reason.
 *  - Soft-delete: rows with `deleted_at` are excluded from all reads by default.
 *    Only tables that have a `deleted_at` column support soft-delete.
 *  - Pagination follows Spec §1.5: { page, pageSize } → { data, meta }.
 *  - Transactions: every method optionally accepts a Knex `trx` to participate
 *    in a caller-managed transaction.
 *
 * Usage:
 *   class BookingRepository extends BaseRepository {
 *     constructor() { super('bookings'); }
 *
 *     async findUpcoming(userId, trx) {
 *       return this.qb(trx)
 *         .where({ user_id: userId })
 *         .andWhere('start_at', '>', new Date())
 *         .orderBy('start_at', 'asc');
 *     }
 *   }
 *
 * Note: Repositories are instantiated once and reused (singleton pattern).
 * They do NOT hold any per-request state.
 */

const { db }     = require('../config/db');
const { Errors } = require('../utils/AppError');

class BaseRepository {
  /**
   * @param {string} tableName - The Knex table name for this repository.
   * @param {{ softDelete: boolean }} [options]
   */
  constructor(tableName, options = {}) {
    if (!tableName) throw new Error('BaseRepository requires a tableName');
    this.tableName  = tableName;
    this.softDelete = options.softDelete !== false; // default true
  }

  // ─── Query builder ────────────────────────────────────────────────────────

  /**
   * Return a Knex query builder for this table.
   * If softDelete is enabled, always excludes rows where deleted_at IS NOT NULL.
   * @param {import('knex').Knex.Transaction | null} trx
   * @returns {import('knex').Knex.QueryBuilder}
   */
  qb(trx = null) {
    const base = trx ? trx(this.tableName) : db(this.tableName);
    return this.softDelete ? base.whereNull('deleted_at') : base;
  }

  // ─── Read ─────────────────────────────────────────────────────────────────

  /**
   * Find a row by ID. Throws NOT_FOUND if absent.
   * @param {string} id
   * @param {object} [trx]
   * @returns {Promise<object>}
   */
  async findById(id, trx = null) {
    const row = await this.qb(trx).where({ id }).first();
    if (!row) throw Errors.NotFound(`${this.tableName} not found: ${id}`);
    return row;
  }

  /**
   * Find a row matching a WHERE clause. Returns null if not found.
   * @param {object} where - Column-value pairs.
   * @param {object} [trx]
   * @returns {Promise<object|null>}
   */
  async findOne(where, trx = null) {
    return this.qb(trx).where(where).first() || null;
  }

  /**
   * Find all rows matching a WHERE clause.
   * @param {object} where
   * @param {object} [options] - { orderBy, orderDir }
   * @param {object} [trx]
   * @returns {Promise<object[]>}
   */
  async findAll(where = {}, options = {}, trx = null) {
    const { orderBy = 'created_at', orderDir = 'asc' } = options;
    return this.qb(trx).where(where).orderBy(orderBy, orderDir);
  }

  // ─── Paginate ─────────────────────────────────────────────────────────────

  /**
   * Paginated query following Spec §1.5.
   * @param {object} where     - Base WHERE filter.
   * @param {object} pagination - { page, pageSize }
   * @param {object} [options]  - { orderBy, orderDir, select }
   * @param {object} [trx]
   * @returns {Promise<{ data: object[], meta: { page, pageSize, total } }>}
   */
  async paginate(where = {}, pagination = {}, options = {}, trx = null) {
    const page     = Math.max(1, Number(pagination.page)     || 1);
    const pageSize = Math.min(100, Math.max(1, Number(pagination.pageSize) || 20));
    const offset   = (page - 1) * pageSize;

    const {
      orderBy  = 'created_at',
      orderDir = 'desc',
      select   = '*',
    } = options;

    const [{ count }] = await this.qb(trx).where(where).count('* as count');
    const data = await this.qb(trx)
      .where(where)
      .select(select)
      .orderBy(orderBy, orderDir)
      .limit(pageSize)
      .offset(offset);

    return {
      data,
      meta: { page, pageSize, total: Number(count) },
    };
  }

  // ─── Write ────────────────────────────────────────────────────────────────

  /**
   * Insert a new row and return it.
   * @param {object} data - Column values (omit id; DB generates via gen_random_uuid()).
   * @param {object} [trx]
   * @returns {Promise<object>}
   */
  async insert(data, trx = null) {
    const qb = trx ? trx(this.tableName) : db(this.tableName);
    const [row] = await qb.insert(data).returning('*');
    return row;
  }

  /**
   * Update an existing row by ID and return the updated row.
   * Automatically sets `updated_at = now()` if the table has that column.
   * @param {string} id
   * @param {object} changes
   * @param {object} [trx]
   * @returns {Promise<object>}
   */
  async update(id, changes, trx = null) {
    const qb = trx ? trx(this.tableName) : db(this.tableName);
    const [row] = await qb
      .where({ id })
      .whereNull('deleted_at')
      .update({ ...changes, updated_at: db.fn.now() })
      .returning('*');
    if (!row) throw Errors.NotFound(`${this.tableName} not found for update: ${id}`);
    return row;
  }

  // ─── Soft delete ──────────────────────────────────────────────────────────

  /**
   * Soft-delete a row by setting `deleted_at = now()`.
   * Only works if the table has a `deleted_at` column.
   * @param {string} id
   * @param {object} [trx]
   * @returns {Promise<void>}
   */
  async softRemove(id, trx = null) {
    const qb = trx ? trx(this.tableName) : db(this.tableName);
    const count = await qb
      .where({ id })
      .whereNull('deleted_at')
      .update({ deleted_at: db.fn.now() });
    if (count === 0) throw Errors.NotFound(`${this.tableName} not found for deletion: ${id}`);
  }

  // ─── Existence check ─────────────────────────────────────────────────────

  /**
   * Returns true if at least one row matches.
   * @param {object} where
   * @param {object} [trx]
   * @returns {Promise<boolean>}
   */
  async exists(where, trx = null) {
    const row = await this.qb(trx).where(where).first();
    return Boolean(row);
  }
}

module.exports = { BaseRepository };
