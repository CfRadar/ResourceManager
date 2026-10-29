'use strict';

/**
 * src/modules/payments/payments.schema.js
 *
 * Validation schemas for simulated billing and invoicing (Spec §4.18).
 */

const { z } = require('zod');

const uuidSchema = z.string().uuid({ message: 'Must be a valid UUID' });

const bookingIdParamSchema = z.object({
  id: uuidSchema,
});

const invoiceIdParamSchema = z.object({
  id: z.string().min(1, 'Invoice ID is required'),
});

const createInvoiceSchema = z.object({
  lineItems: z.array(
    z.object({
      description: z.string().min(1, 'Description is required'),
      amount:      z.number().nonnegative('Amount must be >= 0'),
    })
  ).min(1).optional(),
  notes: z.string().optional(),
});

module.exports = {
  bookingIdParamSchema,
  invoiceIdParamSchema,
  createInvoiceSchema,
};

