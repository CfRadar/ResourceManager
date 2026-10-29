'use strict';

/**
 * tests/eligibility.test.js
 *
 * Step 05 — Deterministic eligibility rule engine integration tests.
 * Zero AI / 100% deterministic evaluation of the 6 standard checks.
 */

const request = require('supertest');
const jwt     = require('jsonwebtoken');

process.env.NODE_ENV           = 'test';
process.env.JWT_ACCESS_SECRET  = 'test_access_secret_32_chars_long__';
process.env.JWT_REFRESH_SECRET = 'test_refresh_secret_32_chars_long_';

// ── Mock DB ───────────────────────────────────────────────────────────────────
// We use a flexible query builder mock that routes queries by table name.
let mockTableHandlers = {};

jest.mock('../src/config/db', () => {
  function makeQb(tableName) {
    const handler = mockTableHandlers[tableName] || (() => []);
    let rows = handler();
    if (!Array.isArray(rows)) rows = rows != null ? [rows] : [];

    const builder = {
      _tableName: tableName,
      _rows:      rows,
      where(cond, val) {
        if (typeof cond === 'function') {
          // Nested builder
          const nested = makeQb(tableName);
          cond(nested);
        }
        return this;
      },
      whereNull() { return this; },
      whereNotNull() { return this; },
      whereRaw() { return this; },
      whereIn(_col, vals) {
        return this;
      },
      orWhere() { return this; },
      andWhere(fn) {
        if (typeof fn === 'function') {
          const nested = makeQb(tableName);
          fn(nested);
        }
        return this;
      },
      select() { return this; },
      count() {
        this._isCount = true;
        return this;
      },
      sum() {
        this._isSum = true;
        return this;
      },
      async first() {
        if (this._isCount) return { count: String(this._rows.length) };
        if (this._isSum) return { strikes: 0 };
        return this._rows[0] || null;
      },
      then(resolve) {
        if (this._isCount) return Promise.resolve([{ count: String(this._rows.length) }]).then(resolve);
        if (this._isSum) return Promise.resolve([{ strikes: 0 }]).then(resolve);
        return Promise.resolve(this._rows).then(resolve);
      },
    };
    return builder;
  }

  const mockDbFn = (tableName) => makeQb(tableName);
  mockDbFn.fn = { now: () => new Date() };
  mockDbFn.raw = (str) => str;
  return { db: mockDbFn };
});

const { createApp } = require('../src/app');
const { ROLES }     = require('../src/middleware/rbac');

const app = createApp();

function makeToken(payload = {}) {
  return jwt.sign(
    {
      sub:         '55555555-5555-4555-a555-555555555555',
      role:        ROLES.REQUESTER,
      memberships: [],
      ...payload,
    },
    process.env.JWT_ACCESS_SECRET,
    { algorithm: 'HS256', expiresIn: '15m' }
  );
}

const INST_ID     = '11111111-1111-4111-a111-111111111111';
const FACILITY_ID = '22222222-2222-4222-a222-222222222222';
const RES_ID      = '33333333-3333-4333-a333-333333333333';
const USER_ID     = '55555555-5555-4555-a555-555555555555';
const TRN_ID      = '66666666-6666-4666-a666-666666666666';
const DOC_ID      = '77777777-7777-4777-a777-777777777777';

const sampleFacility = {
  id:             FACILITY_ID,
  institution_id: INST_ID,
  name:           'Advanced Materials Lab',
  timezone:       'UTC',
  working_hours: {
    monday:    { open: '08:00', close: '18:00' },
    tuesday:   { open: '08:00', close: '18:00' },
    wednesday: { open: '08:00', close: '18:00' },
    thursday:  { open: '08:00', close: '18:00' },
    friday:    { open: '08:00', close: '18:00' },
    saturday:  null,
    sunday:    null,
  },
};

const sampleResource = {
  id:          RES_ID,
  facility_id: FACILITY_ID,
  name:        'Laser Sintering Unit',
  status:      'ACTIVE',
};

const sampleUser = {
  id:    USER_ID,
  role:  'REQUESTER',
  email: 'student@university.edu',
};

const defaultPolicyData = {
  permittedUserGroups: ['REQUESTER', 'RESEARCHER'],
  prerequisites: {
    requiredTrainingIds:         [TRN_ID],
    requiredDocumentTemplateIds: [DOC_ID],
  },
  limits: {
    maxActiveBookings: 3,
    maxHoursPerWeek:   10,
  },
  cancellation: {
    noShowStrikeLimit: 3,
  },
};

beforeEach(() => {
  mockTableHandlers = {
    resources: () => [sampleResource],
    facilities: () => [sampleFacility],
    users: () => [sampleUser],
    resource_policies: () => [{
      resource_id:    RES_ID,
      is_current:     true,
      policy_data:    defaultPolicyData,
      policy_version: 1,
    }],
    institution_memberships: () => [{
      id:             'mem-1',
      institution_id: INST_ID,
      user_id:        USER_ID,
      role:           'REQUESTER',
      status:         'ACTIVE',
    }],
    institution_partners: () => [],
    user_trainings: () => [{
      id:          'ut-1',
      user_id:     USER_ID,
      training_id: TRN_ID,
      status:      'VERIFIED',
      expires_at:  null,
    }],
    trainings: () => [{
      id:   TRN_ID,
      name: 'Laser Safety Level 1',
    }],
    user_documents: () => [{
      id:          'ud-1',
      user_id:     USER_ID,
      template_id: DOC_ID,
      status:      'APPROVED',
      expires_at:  null,
    }],
    document_templates: () => [{
      id:    DOC_ID,
      title: 'Lab Safety Protocol Agreement',
    }],
    bookings: () => [],
    blackout_periods: () => [],
  };
});

afterEach(() => {
  jest.restoreAllMocks();
});

// ── POST /api/v1/resources/:id/eligibility-check ────────────────────────────

describe('POST /api/v1/resources/:id/eligibility-check', () => {
  it('requires authentication (401 when no token)', async () => {
    const res = await request(app)
      .post(`/api/v1/resources/${RES_ID}/eligibility-check`)
      .send({ accessMode: 'INDEPENDENT' });

    expect(res.status).toBe(401);
  });

  it('evaluates all 6 checks as PASS when user satisfies all prerequisites and slot is free', async () => {
    const token = makeToken();

    // Monday 2026-11-02 10:00 to 12:00 UTC (inside 08:00 - 18:00 working hours)
    const res = await request(app)
      .post(`/api/v1/resources/${RES_ID}/eligibility-check`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        accessMode: 'INDEPENDENT',
        startAt:    '2026-11-02T10:00:00.000Z',
        endAt:      '2026-11-02T12:00:00.000Z',
      });

    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);

    const { eligible, canRequest, checks, requiredNextSteps } = res.body.data;
    expect(eligible).toBe(true);
    expect(canRequest).toBe(true);
    expect(requiredNextSteps).toEqual([]);
    expect(checks.length).toBe(6);

    for (const c of checks) {
      expect(c.status).toBe('PASS');
    }
  });

  it('fails membership_verified check when user has no affiliation', async () => {
    const token = makeToken();
    mockTableHandlers.institution_memberships = () => [];

    const res = await request(app)
      .post(`/api/v1/resources/${RES_ID}/eligibility-check`)
      .set('Authorization', `Bearer ${token}`)
      .send({ accessMode: 'INDEPENDENT' });

    expect(res.status).toBe(200);
    expect(res.body.data.eligible).toBe(false);
    expect(res.body.data.canRequest).toBe(false);

    const memCheck = res.body.data.checks.find((c) => c.key === 'membership_verified');
    expect(memCheck.status).toBe('FAIL');
    expect(memCheck.action).toEqual({
      type:          'APPLY_MEMBERSHIP',
      institutionId: INST_ID,
    });
  });

  it('fails user_group_allowed check when policy restricts access to other roles', async () => {
    const token = makeToken();
    mockTableHandlers.resource_policies = () => [{
      resource_id:    RES_ID,
      is_current:     true,
      policy_data: {
        ...defaultPolicyData,
        permittedUserGroups: ['FACULTY'],
      },
    }];

    const res = await request(app)
      .post(`/api/v1/resources/${RES_ID}/eligibility-check`)
      .set('Authorization', `Bearer ${token}`)
      .send({ accessMode: 'INDEPENDENT' });

    expect(res.status).toBe(200);
    expect(res.body.data.eligible).toBe(false);
    expect(res.body.data.canRequest).toBe(false);

    const groupCheck = res.body.data.checks.find((c) => c.key === 'user_group_allowed');
    expect(groupCheck.status).toBe('FAIL');
  });

  it('fails training check with action BOOK_TRAINING when prerequisite is unverified', async () => {
    const token = makeToken();
    mockTableHandlers.user_trainings = () => []; // no completed training

    const res = await request(app)
      .post(`/api/v1/resources/${RES_ID}/eligibility-check`)
      .set('Authorization', `Bearer ${token}`)
      .send({ accessMode: 'INDEPENDENT' });

    expect(res.status).toBe(200);
    expect(res.body.data.eligible).toBe(false);
    // User can still submit draft/request (enters AWAITING_TRAINING)
    expect(res.body.data.canRequest).toBe(true);

    const trainingCheck = res.body.data.checks.find((c) => c.key === 'training');
    expect(trainingCheck.status).toBe('FAIL');
    expect(trainingCheck.action).toEqual({
      type:       'BOOK_TRAINING',
      trainingId: TRN_ID,
    });
    expect(res.body.data.requiredNextSteps).toContain('Complete Laser Safety Level 1 training');
  });

  it('fails documents check with action SIGN_DOCUMENT when agreement is missing', async () => {
    const token = makeToken();
    mockTableHandlers.user_documents = () => []; // no signed document

    const res = await request(app)
      .post(`/api/v1/resources/${RES_ID}/eligibility-check`)
      .set('Authorization', `Bearer ${token}`)
      .send({ accessMode: 'INDEPENDENT' });

    expect(res.status).toBe(200);
    expect(res.body.data.eligible).toBe(false);
    expect(res.body.data.canRequest).toBe(true);

    const docCheck = res.body.data.checks.find((c) => c.key === 'documents');
    expect(docCheck.status).toBe('MISSING');
    expect(docCheck.action).toEqual({
      type:       'SIGN_DOCUMENT',
      templateId: DOC_ID,
    });
    expect(res.body.data.requiredNextSteps).toContain('Sign or submit Lab Safety Protocol Agreement');
  });

  it('fails slot_free check when requested interval is outside facility operating hours', async () => {
    const token = makeToken();

    // Sunday (facility closed)
    const res = await request(app)
      .post(`/api/v1/resources/${RES_ID}/eligibility-check`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        accessMode: 'INDEPENDENT',
        startAt:    '2026-11-01T10:00:00.000Z',
        endAt:      '2026-11-01T12:00:00.000Z',
      });

    expect(res.status).toBe(200);
    expect(res.body.data.eligible).toBe(false);

    const slotCheck = res.body.data.checks.find((c) => c.key === 'slot_free');
    expect(slotCheck.status).toBe('FAIL');
    expect(slotCheck.reason).toMatch(/outside facility operating hours/);
  });

  it('fails slot_free check when requested interval collides with another booking', async () => {
    const token = makeToken();
    mockTableHandlers.bookings = () => [{
      id:       'existing-booking',
      start_at: '2026-11-02T09:00:00.000Z',
      end_at:   '2026-11-02T11:00:00.000Z',
      status:   'SCHEDULED',
    }];

    const res = await request(app)
      .post(`/api/v1/resources/${RES_ID}/eligibility-check`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        accessMode: 'INDEPENDENT',
        startAt:    '2026-11-02T10:00:00.000Z',
        endAt:      '2026-11-02T12:00:00.000Z',
      });

    expect(res.status).toBe(200);
    expect(res.body.data.eligible).toBe(false);

    const slotCheck = res.body.data.checks.find((c) => c.key === 'slot_free');
    expect(slotCheck.status).toBe('FAIL');
    expect(slotCheck.reason).toMatch(/collides with an existing reservation/);
  });
});

