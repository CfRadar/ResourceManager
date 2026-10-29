'use strict';

/**
 * src/modules/institutions/institutions.schema.js
 *
 * Zod validation schemas for institution and membership endpoints.
 * Spec §4.3, §1.4, §2.1.
 */

const { z } = require('zod');
const { PAGINATION } = require('../../config/constants');

const INSTITUTION_TYPES = ['UNIVERSITY', 'POLYTECHNIC', 'RESEARCH_INSTITUTE', 'INNOVATION_HUB'];
const MEMBERSHIP_ROLES = ['REQUESTER', 'OPERATOR', 'MANAGER', 'OWNER'];
const MEMBERSHIP_DECISIONS = ['APPROVE', 'REJECT'];

// ─── Query Schemas ────────────────────────────────────────────────────────────

const listInstitutionsQuerySchema = z.object({
  city: z.string().trim().min(1).optional(),
  type: z.enum(INSTITUTION_TYPES).optional(),
  q: z.string().trim().min(1).optional(),
  page: z.coerce.number().int().min(1).default(PAGINATION.DEFAULT_PAGE),
  pageSize: z.coerce.number().int().min(1).max(PAGINATION.MAX_PAGE_SIZE).default(PAGINATION.DEFAULT_PAGE_SIZE),
});

const listMembershipRequestsQuerySchema = z.object({
  status: z.enum(['PENDING', 'APPROVED', 'REJECTED', 'ALL']).default('PENDING'),
  page: z.coerce.number().int().min(1).default(PAGINATION.DEFAULT_PAGE),
  pageSize: z.coerce.number().int().min(1).max(PAGINATION.MAX_PAGE_SIZE).default(PAGINATION.DEFAULT_PAGE_SIZE),
});

// ─── Body Schemas ─────────────────────────────────────────────────────────────

const createInstitutionSchema = z.object({
  name: z.string().trim().min(1, 'Institution name is required').max(255),
  type: z.enum(INSTITUTION_TYPES).default('UNIVERSITY'),
  city: z.string().trim().max(128).optional().nullable(),
  address: z.string().trim().max(1000).optional().nullable(),
  website: z.string().trim().max(512).optional().nullable(),
  description: z.string().trim().max(2000).optional().nullable(),
});

const updateInstitutionSchema = z.object({
  name: z.string().trim().min(1).max(255).optional(),
  type: z.enum(INSTITUTION_TYPES).optional(),
  city: z.string().trim().max(128).optional().nullable(),
  address: z.string().trim().max(1000).optional().nullable(),
  website: z.string().trim().max(512).optional().nullable(),
  description: z.string().trim().max(2000).optional().nullable(),
}).strict(); // Disallow unknown/privileged fields like 'verified', 'id'

const createMembershipRequestSchema = z.object({
  requestedRole: z.enum(MEMBERSHIP_ROLES).default('REQUESTER'),
  affiliationType: z.string().trim().max(64).optional().nullable(),
  message: z.string().trim().max(2000).optional().nullable(),
  supportingDocumentId: z.string().trim().max(255).optional().nullable(),
});

const membershipDecisionSchema = z.object({
  decision: z.enum(MEMBERSHIP_DECISIONS),
  role: z.enum(MEMBERSHIP_ROLES).optional(),
  reason: z.string().trim().max(1000).optional().nullable(),
}).refine(
  (data) => {
    if (data.decision === 'APPROVE') {
      return Boolean(data.role);
    }
    return true;
  },
  {
    message: "A valid membership role ('REQUESTER', 'OPERATOR', 'MANAGER', 'OWNER') is required when approving a request.",
    path: ['role'],
  }
);

const linkPartnerSchema = z.object({
  partnerInstitutionId: z.string().uuid('Invalid partner institution UUID'),
});

const institutionIdParamSchema = z.object({
  id: z.string().uuid('Invalid institution ID format'),
});

const decisionParamSchema = z.object({
  id: z.string().uuid('Invalid institution ID format'),
  reqId: z.string().uuid('Invalid membership request ID format'),
});

module.exports = {
  INSTITUTION_TYPES,
  MEMBERSHIP_ROLES,
  MEMBERSHIP_DECISIONS,
  listInstitutionsQuerySchema,
  listMembershipRequestsQuerySchema,
  createInstitutionSchema,
  updateInstitutionSchema,
  createMembershipRequestSchema,
  membershipDecisionSchema,
  linkPartnerSchema,
  institutionIdParamSchema,
  decisionParamSchema,
};
