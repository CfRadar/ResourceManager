'use strict';

/**
 * src/modules/payments/payments.router.js
 *
 * Express routes for simulated billing and invoicing.
 * Spec §4.18, Step 09.
 */

const express = require('express');
const { paymentsController } = require('./payments.controller');
const { authenticate }       = require('../../middleware/auth');
const { requireAnyRole }     = require('../../middleware/rbac');
const { validate }           = require('../../middleware/validate');
const {
  bookingIdParamSchema,
  invoiceIdParamSchema,
  createInvoiceSchema,
} = require('./payments.schema');

const paymentsRouter = express.Router();

// GET /api/v1/bookings/:id/cost-estimate — Dynamic pricing breakdown
paymentsRouter.get(
  '/bookings/:id/cost-estimate',
  authenticate,
  validate({ params: bookingIdParamSchema }),
  paymentsController.getCostEstimate
);

// POST /api/v1/bookings/:id/invoice — Issue demo invoice (Manager)
paymentsRouter.post(
  '/bookings/:id/invoice',
  authenticate,
  requireAnyRole(['MANAGER', 'OWNER', 'ADMIN']),
  validate({ params: bookingIdParamSchema, body: createInvoiceSchema }),
  paymentsController.generateInvoice
);

// POST /api/v1/invoices/:id/mark-paid — Simulate payment receipt
const invoicesRouter = express.Router();

invoicesRouter.post(
  '/:id/mark-paid',
  authenticate,
  requireAnyRole(['MANAGER', 'OWNER', 'ADMIN']),
  validate({ params: invoiceIdParamSchema }),
  paymentsController.markPaid
);

module.exports = {
  paymentsRouter,
  invoicesRouter,
};

