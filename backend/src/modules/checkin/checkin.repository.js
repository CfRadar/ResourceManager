'use strict';

/**
 * src/modules/checkin/checkin.repository.js
 *
 * Data access repository for condition reports (BEFORE and AFTER).
 * Spec §4.12, Step 07.
 */

const { BaseRepository } = require('../../db/BaseRepository');
const { db }             = require('../../config/db');

class CheckInRepository extends BaseRepository {
  constructor() {
    super('condition_reports', { softDelete: false });
  }

  /**
   * Retrieves both BEFORE and AFTER condition reports for a booking.
   */
  async findReportsByBookingId(bookingId, trx = null) {
    const qb = trx || db;
    return qb('condition_reports')
      .where({ booking_id: bookingId })
      .orderBy('submitted_at', 'asc');
  }

  /**
   * Retrieves a specific report kind ('BEFORE' or 'AFTER') for a booking.
   */
  async findReportByKind(bookingId, kind, trx = null) {
    const qb = trx || db;
    return qb('condition_reports')
      .where({ booking_id: bookingId, kind })
      .first();
  }

  /**
   * Inserts or upserts a condition report.
   */
  async saveReport(reportData, trx = null) {
    const qb = trx || db;
    const rows = await qb('condition_reports')
      .insert(reportData)
      .returning('*');
    return Array.isArray(rows) ? rows[0] : (rows || reportData);
  }
}

const checkInRepo = new CheckInRepository();
module.exports = { checkInRepo, CheckInRepository };
