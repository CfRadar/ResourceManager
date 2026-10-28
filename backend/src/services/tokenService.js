'use strict';

/**
 * src/services/tokenService.js
 *
 * Append-only token/credit ledger service.
 *
 * Spec §4.17: internal credit ledger that discourages monopolisation.
 * This is NOT a cryptocurrency. Ledger rows are never updated or deleted.
 * Balance = SUM of all entries for the user.
 *
 * Operations (called internally; not exposed as direct HTTP endpoints):
 *   hold(userId, amount, bookingId, reason, trx)     – reserve tokens on approval
 *   charge(userId, amount, bookingId, reason, trx)   – deduct on return confirmation
 *   refund(userId, amount, bookingId, reason, trx)   – credit on valid cancellation
 *   grant(userId, amount, grantedBy, reason, trx)    – admin grant
 *   balance(userId)                                  – current balance + held amount
 *
 * Implemented in: Step 09 (Incidents, Tokens, Payments & Exports).
 *
 * All operations require a Knex transaction to be atomic with the triggering
 * business operation (booking approval, cancellation, etc.).
 */

// Placeholder — full implementation in Step 09.
async function hold()    { throw new Error('[tokenService] Not yet implemented. Step 09.'); }
async function charge()  { throw new Error('[tokenService] Not yet implemented. Step 09.'); }
async function refund()  { throw new Error('[tokenService] Not yet implemented. Step 09.'); }
async function grant()   { throw new Error('[tokenService] Not yet implemented. Step 09.'); }
async function balance() { throw new Error('[tokenService] Not yet implemented. Step 09.'); }

module.exports = { hold, charge, refund, grant, balance };
