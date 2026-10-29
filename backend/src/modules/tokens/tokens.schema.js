'use strict';

/**
 * src/modules/tokens/tokens.schema.js
 *
 * Validation schemas for fair-use token ledger (Spec §4.17).
 */

const { z } = require('zod');

const uuidSchema = z.string().uuid({ message: 'Must be a valid UUID' });

const grantTokensSchema = z.object({
  userId: uuidSchema,
  amount: z.number().int().positive('Token amount must be a positive integer'),
  reason: z.string().min(3, 'Reason must be at least 3 characters'),
});

const listLedgerQuerySchema = z.object({
  page:  z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

module.exports = {
  grantTokensSchema,
  listLedgerQuerySchema,
};

