'use strict';

/**
 * src/services/tokenService.js
 *
 * Append-only token/credit ledger service.
 *
 * Spec §4.17: internal credit ledger that discourages monopolisation.
 * Ledger rows are NEVER updated or deleted.
 * Balance = SUM of all entries for the user.
 *
 * Operations:
 *   hold(userId, amount, refEntityType, refEntityId, reason, trx)     – reserve tokens on approval
 *   charge(userId, amount, refEntityType, refEntityId, reason, trx)   – deduct on completion
 *   refund(userId, amount, refEntityType, refEntityId, reason, trx)   – credit on valid cancellation
 *   grant(userId, amount, grantedBy, reason, trx)                    – admin grant
 *   balance(userId, trx)                                              – balance + held + available
 *   getLedger(userId, { page, limit }, trx)                           – paginated entries
 *
 * Implemented in: Step 09 (Incidents, Tokens, Payments & Exports).
 */

const { db }     = require('../config/db');
const { Errors } = require('../utils/AppError');

/**
 * Computes current token balance, active holds, and available credits.
 */
async function balance(userId, trx = null) {
  const qb = trx || db;

  const totalRow = await qb('token_ledger')
    .where({ user_id: userId })
    .sum('amount as total')
    .first();

  const totalBalance = parseInt(totalRow?.total || '0', 10);

  // Active holds are HOLD entries that have not been refunded or settled
  const holdRow = await qb('token_ledger')
    .where({ user_id: userId, type: 'HOLD' })
    .sum('amount as total_hold')
    .first();

  const rawHold = parseInt(holdRow?.total_hold || '0', 10);
  const heldAmount = Math.abs(rawHold);

  return {
    balance:          totalBalance,
    held:             heldAmount,
    available:        Math.max(0, totalBalance),
    monthlyAllowance: 100, // Standard default demonstration allowance
  };
}

/**
 * Places a pre-authorization hold for a booking or access reservation.
 */
async function hold(userId, amount, refEntityType = null, refEntityId = null, reason = 'Pre-authorization hold', trx = null) {
  const qb = trx || db;
  const numAmount = Math.abs(Number(amount));

  const current = await balance(userId, qb);
  if (current.available < numAmount) {
    throw Errors.BadRequest(
      `Insufficient token balance (${current.available} available, ${numAmount} required for hold).`
    );
  }

  const rows = await qb('token_ledger')
    .insert({
      user_id:         userId,
      amount:          -numAmount,
      type:            'HOLD',
      ref_entity_type: refEntityType,
      ref_entity_id:   refEntityId,
      reason,
    })
    .returning('*');

  return Array.isArray(rows) ? rows[0] : rows;
}

/**
 * Charges settled tokens on booking completion.
 */
async function charge(userId, amount, refEntityType = null, refEntityId = null, reason = 'Usage charge', trx = null) {
  const qb = trx || db;
  const numAmount = Math.abs(Number(amount));

  const rows = await qb('token_ledger')
    .insert({
      user_id:         userId,
      amount:          -numAmount,
      type:            'CHARGE',
      ref_entity_type: refEntityType,
      ref_entity_id:   refEntityId,
      reason,
    })
    .returning('*');

  return Array.isArray(rows) ? rows[0] : rows;
}

/**
 * Releases hold or credits refund on cancellation.
 */
async function refund(userId, amount, refEntityType = null, refEntityId = null, reason = 'Hold release / refund', trx = null) {
  const qb = trx || db;
  const numAmount = Math.abs(Number(amount));

  const rows = await qb('token_ledger')
    .insert({
      user_id:         userId,
      amount:          numAmount,
      type:            'REFUND',
      ref_entity_type: refEntityType,
      ref_entity_id:   refEntityId,
      reason,
    })
    .returning('*');

  return Array.isArray(rows) ? rows[0] : rows;
}

/**
 * Admin grants credits to user with reason.
 */
async function grant(userId, amount, grantedBy = null, reason = 'Administrative grant', trx = null) {
  const qb = trx || db;
  const numAmount = Math.abs(Number(amount));

  const rows = await qb('token_ledger')
    .insert({
      user_id:         userId,
      amount:          numAmount,
      type:            'GRANT',
      ref_entity_type: 'User',
      ref_entity_id:   grantedBy,
      reason,
    })
    .returning('*');

  return Array.isArray(rows) ? rows[0] : rows;
}

/**
 * Lists user's immutable ledger history.
 */
async function getLedger(userId, { page = 1, limit = 20 } = {}, trx = null) {
  const qb = trx || db;
  const offset = (page - 1) * limit;

  const rows = await qb('token_ledger')
    .where({ user_id: userId })
    .orderBy('created_at', 'desc')
    .limit(limit)
    .offset(offset);

  const countRow = await (trx || db)('token_ledger')
    .where({ user_id: userId })
    .count('id as total')
    .first();

  const total = parseInt(countRow?.total || '0', 10);

  return { items: rows || [], total, page, limit };
}

module.exports = {
  balance,
  hold,
  charge,
  refund,
  grant,
  getLedger,
};
