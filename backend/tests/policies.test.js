'use strict';

/**
 * tests/policies.test.js
 *
 * Step 04 — Dynamic resource policy and versioning integration tests.
 */

const request = require('supertest');
const jwt     = require('jsonwebtoken');

process.env.NODE_ENV           = 'test';
process.env.JWT_ACCESS_SECRET  = 'test_access_secret_32_chars_long__';
process.env.JWT_REFRESH_SECRET = 'test_refresh_secret_32_chars_long_';

// ── Mock DB ───────────────────────────────────────────────────────────────────
jest.mock('../src/config/db', () => {
  function mockMakeQb(returnValues) {
    const vals = Array.isArray(returnValues) ? returnValues : returnValues != null ? [returnValues] : [];
    return {
      _vals: vals,
      where() { return this; },
      whereNull() { return this; },
      whereNotNull() { return this; },
      whereRaw() { return this; },
      whereIn() { return this; },
      orWhere() { return this; },
      andWhere() { return this; },
      join() { return this; },
      leftJoin() { return this; },
      orderBy() { return this; },
      forUpdate() { return this; },
      select() { return this; },
      limit() { return this; },
      offset() { return this; },
      async first() { return this._vals[0]; },
      async count() { return [{ count: '1' }]; },
      async increment() { return 1; },
      async update() { return this._vals; },
      returning() { return this; },
      async insert() { return this._vals; },
      then(resolve) { return Promise.resolve(this._vals).then(resolve); },
    };
  }

  const mockDbFn = () => mockMakeQb([]);
  mockDbFn.fn = { now: () => new Date() };
  mockDbFn.transaction = async (cb) => {
    const mockTrx = () => mockMakeQb([]);
    mockTrx.fn = { now: () => new Date() };
    return cb(mockTrx);
  };
  return { db: mockDbFn };
});

const { createApp } = require('../src/app');
const { policyRepo } = require('../src/modules/policies/policies.repository');
const { resourceRepo } = require('../src/modules/resources/resources.repository');
const { ResourcePolicySchema } = require('../src/modules/policies/policies.schema');

const app = createApp();

function makeToken(payload = {}) {
  return jwt.sign(
    {
      sub:         'user-test-uuid',
      role:        'REQUESTER',
      memberships: [],
      ...payload,
    },
    process.env.JWT_ACCESS_SECRET,
    { algorithm: 'HS256', expiresIn: '15m' }
  );
}

const INST_A   = '11111111-1111-4111-a111-111111111111';
const RES_ID   = '44444444-4444-4444-a444-444444444444';
const USER_ID  = '55555555-5555-4555-a555-555555555555';

// ── Unit Tests: ResourcePolicySchema validation ───────────────────────────────

describe('ResourcePolicySchema validation', () => {
  const validPolicy = {
    supportedAccessModes:     ['INDEPENDENT', 'SUPERVISED'],
    permittedUserGroups:      ['INTERNAL_STUDENT', 'INTERNAL_STAFF'],
    requiresPurposeStatement: true,
    requiresApproval:         true,
    requiredTrainingIds:      ['train-101'],
    requiredDocumentTemplateIds: ['doc-202'],
    supervisionRequiredFor:   ['INTERNAL_STUDENT'],
    allowOutsideMaterials:    'NEEDS_APPROVAL',
    prohibitedUses:           ['commercial weapon parts'],
    limits: {
      maxActiveBookings:     2,
      maxHoursPerWeek:       10,
      maxSingleBookingHours: 4,
      advanceBookingDays:    14,
    },
    cancellation: {
      freeUntilHoursBefore: 24,
      noShowStrikeLimit:    3,
    },
    lateReturn: {
      graceMinutes:          15,
      reminderMinutesBefore: 30,
    },
    pricing: {
      model:         'TOKENS',
      hourlyRate:    0,
      operatorFee:   10,
      tokensPerHour: 50,
    },
    geofenceCheckIn: {
      enabled:      true,
      radiusMeters: 100,
    },
    conditionReport: {
      requireBefore: true,
      requireAfter:  true,
      requirePhotos: 'REQUIRED',
    },
  };

  it('validates a complete, compliant resource policy', () => {
    const parsed = ResourcePolicySchema.safeParse(validPolicy);
    expect(parsed.success).toBe(true);
    expect(parsed.data.supportedAccessModes).toContain('INDEPENDENT');
    expect(parsed.data.pricing.model).toBe('TOKENS');
  });

  it('rejects policy with empty supportedAccessModes', () => {
    const invalid = { ...validPolicy, supportedAccessModes: [] };
    const parsed = ResourcePolicySchema.safeParse(invalid);
    expect(parsed.success).toBe(false);
  });

  it('rejects policy with invalid pricing model', () => {
    const invalid = {
      ...validPolicy,
      pricing: { ...validPolicy.pricing, model: 'BITCOIN_PAYMENT' },
    };
    const parsed = ResourcePolicySchema.safeParse(invalid);
    expect(parsed.success).toBe(false);
  });

  it('rejects negative limits', () => {
    const invalid = {
      ...validPolicy,
      limits: { ...validPolicy.limits, maxSingleBookingHours: -2 },
    };
    const parsed = ResourcePolicySchema.safeParse(invalid);
    expect(parsed.success).toBe(false);
  });
});

// ── GET /api/v1/resources/:id/policy ──────────────────────────────────────────

describe('GET /api/v1/resources/:id/policy', () => {
  it('returns 404 if resource does not exist', async () => {
    jest.spyOn(resourceRepo, 'findById').mockResolvedValueOnce(null);

    const res = await request(app).get(`/api/v1/resources/${RES_ID}/policy`);
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('NOT_FOUND');
  });

  it('returns active policy for an existing resource', async () => {
    jest.spyOn(resourceRepo, 'findById').mockResolvedValueOnce({ id: RES_ID });
    jest.spyOn(policyRepo, 'findCurrentPolicy').mockResolvedValueOnce({
      id:            'pol-1',
      resourceId:    RES_ID,
      policyVersion: 2,
      isCurrent:     true,
      policyData: {
        supportedAccessModes: ['INDEPENDENT'],
        pricing: { model: 'FREE' },
      },
    });

    const res = await request(app).get(`/api/v1/resources/${RES_ID}/policy`);
    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
    expect(res.body.data.policyVersion).toBe(2);
    expect(res.body.data.policyData.supportedAccessModes).toContain('INDEPENDENT');
  });
});

// ── PUT /api/v1/resources/:id/policy ──────────────────────────────────────────

describe('PUT /api/v1/resources/:id/policy — replace policy & version bump', () => {
  const newPolicyPayload = {
    supportedAccessModes:     ['INDEPENDENT', 'COLLABORATION'],
    permittedUserGroups:      ['INTERNAL_STUDENT', 'PUBLIC'],
    requiresPurposeStatement: false,
    requiresApproval:         false,
    limits: {
      maxActiveBookings:     3,
      maxHoursPerWeek:       15,
      maxSingleBookingHours: 5,
      advanceBookingDays:    21,
    },
    pricing: {
      model:      'HOURLY',
      hourlyRate: 25.5,
    },
  };

  it('returns 401 when unauthenticated', async () => {
    const res = await request(app)
      .put(`/api/v1/resources/${RES_ID}/policy`)
      .send(newPolicyPayload);
    expect(res.status).toBe(401);
  });

  it('returns 403 when user is not Manager or Owner of host institution', async () => {
    const token = makeToken({
      sub: USER_ID,
      memberships: [{ institutionId: INST_A, role: 'OPERATOR' }], // Operator cannot change policy
    });

    jest.spyOn(resourceRepo, 'findByIdWithDetails').mockResolvedValueOnce({
      id:       RES_ID,
      facility: { institutionId: INST_A },
    });

    const res = await request(app)
      .put(`/api/v1/resources/${RES_ID}/policy`)
      .set('Authorization', `Bearer ${token}`)
      .send(newPolicyPayload);

    expect(res.status).toBe(403);
  });

  it('successfully creates new policy version when invoked by Manager/Owner', async () => {
    const token = makeToken({
      sub: USER_ID,
      memberships: [{ institutionId: INST_A, role: 'MANAGER' }],
    });

    jest.spyOn(resourceRepo, 'findByIdWithDetails').mockResolvedValueOnce({
      id:       RES_ID,
      facility: { institutionId: INST_A },
    });

    jest.spyOn(policyRepo, 'createVersion').mockResolvedValueOnce({
      id:            'pol-v2-id',
      resourceId:    RES_ID,
      policyVersion: 2, // version incremented!
      isCurrent:     true,
      policyData:    newPolicyPayload,
      updatedBy:     USER_ID,
      createdAt:     new Date().toISOString(),
    });

    const res = await request(app)
      .put(`/api/v1/resources/${RES_ID}/policy`)
      .set('Authorization', `Bearer ${token}`)
      .send(newPolicyPayload);

    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
    expect(res.body.data.policyVersion).toBe(2);
    expect(res.body.data.isCurrent).toBe(true);
    expect(res.body.data.policyData.pricing.hourlyRate).toBe(25.5);
  });
});

