'use strict';

/**
 * src/modules/tokens/tokens.router.js
 *
 * Express routes for fair-use token ledger.
 * Spec §4.17, Step 09.
 */

const express = require('express');
const { tokensController }    = require('./tokens.controller');
const { authenticate }        = require('../../middleware/auth');
const { requireRole }         = require('../../middleware/rbac');
const { validate }            = require('../../middleware/validate');
const {
  grantTokensSchema,
  listLedgerQuerySchema,
} = require('./tokens.schema');

const tokensRouter = express.Router();

// GET /api/v1/tokens/balance — User's active tokens and hold summary
tokensRouter.get(
  '/balance',
  authenticate,
  tokensController.getBalance
);

// GET /api/v1/tokens/ledger — User's append-only ledger entries
tokensRouter.get(
  '/ledger',
  authenticate,
  validate({ query: listLedgerQuerySchema }),
  tokensController.getLedger
);

// Admin sub-router for /api/v1/admin/tokens/grant
const adminTokensRouter = express.Router();

adminTokensRouter.post(
  '/grant',
  authenticate,
  requireRole('ADMIN'),
  validate({ body: grantTokensSchema }),
  tokensController.grant
);

module.exports = {
  tokensRouter,
  adminTokensRouter,
};

