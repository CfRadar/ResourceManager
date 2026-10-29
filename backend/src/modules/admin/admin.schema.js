'use strict';

/**
 * src/modules/admin/admin.schema.js
 */

const { z } = require('zod');

const suspendUserSchema = z.object({
  reason: z.string().min(5, 'Suspension reason must be at least 5 characters').max(500),
});

const searchUsersQuerySchema = z.object({
  institutionId: z.string().uuid().optional(),
  query:         z.string().optional(),
  role:          z.enum(['ADMIN', 'MANAGER', 'OPERATOR', 'OWNER', 'REQUESTER']).optional(),
  status:        z.enum(['ACTIVE', 'SUSPENDED', 'PENDING_VERIFICATION']).optional(),
  page:          z.coerce.number().int().positive().default(1),
  pageSize:      z.coerce.number().int().positive().max(100).default(20),
});

module.exports = {
  suspendUserSchema,
  searchUsersQuerySchema,
};

