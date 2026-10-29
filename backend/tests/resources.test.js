'use strict';

/**
 * tests/resources.test.js
 *
 * Step 04 — Resources catalog, visibility filtering, and redaction layer integration tests.
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
      orWhereRaw() { return this; },
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
  mockDbFn.raw = (str, bindings) => str;
  mockDbFn.transaction = async (cb) => {
    const mockTrx = () => mockMakeQb([]);
    mockTrx.fn = { now: () => new Date() };
    mockTrx.raw = (str, bindings) => str;
    return cb(mockTrx);
  };
  return { db: mockDbFn };
});

const { createApp } = require('../src/app');
const { resourceRepo } = require('../src/modules/resources/resources.repository');
const { facilityRepo } = require('../src/modules/facilities/facilities.repository');
const { institutionPartnerRepo } = require('../src/modules/institutions/institutions.repository');
const { db } = require('../src/config/db');

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
const INST_B   = '22222222-2222-4222-a222-222222222222';
const FAC_A    = '33333333-3333-4333-a333-333333333333';
const RES_ID   = '44444444-4444-4444-a444-444444444444';
const USER_ID  = '55555555-5555-4555-a555-555555555555';

// ── GET /api/v1/resources ─────────────────────────────────────────────────────

describe('GET /api/v1/resources — visibility-filtered browse and search', () => {
  it('returns public resources with confidential fields redacted', async () => {
    jest.spyOn(resourceRepo, 'findVisibleResources').mockResolvedValueOnce({
      data: [
        {
          id:           RES_ID,
          facilityId:   FAC_A,
          name:         '3D Printer Pro',
          category:     '3D Printing',
          description:  'FDM Printer',
          specs: {
            buildVolume: '200x200mm',
            doorCode:    'SECRET-1234', // should be redacted
          },
          privateDetails: {
            accessInstructions: 'Behind the blue curtain', // should be redacted
          },
          capabilities: ['PLA', 'ABS'],
          visibility:   'PUBLIC',
          riskLevel:    'LOW',
          status:       'ACTIVE',
          facility: {
            id:              FAC_A,
            name:            'Fab Lab',
            institutionId:   INST_A,
            institutionName: 'Demo University',
          },
        },
      ],
      meta: { page: 1, pageSize: 20, total: 1, totalPages: 1 },
    });

    const res = await request(app).get('/api/v1/resources');
    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
    expect(res.body.data).toHaveLength(1);

    const item = res.body.data[0];
    expect(item.name).toBe('3D Printer Pro');
    expect(item.specs.buildVolume).toBe('200x200mm');
    // Verify confidential fields are redacted
    expect(item.specs.doorCode).toBeUndefined();
    expect(item.privateDetails).toBeUndefined();
  });

  it('rejects invalid query parameters', async () => {
    const res = await request(app).get('/api/v1/resources?page=0');
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });
});

// ── GET /api/v1/resources/categories ──────────────────────────────────────────

describe('GET /api/v1/resources/categories — vocabulary listing', () => {
  it('returns sorted categories and capability tags', async () => {
    jest.spyOn(resourceRepo, 'findCategoriesAndVocabulary').mockResolvedValueOnce({
      categories: ['3D Printing', 'Laser Cutting'],
      tags:       ['ACRYLIC', 'FDM', 'PLA', 'WOOD'],
    });

    const res = await request(app).get('/api/v1/resources/categories');
    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
    expect(res.body.data.categories).toEqual(['3D Printing', 'Laser Cutting']);
    expect(res.body.data.tags).toContain('FDM');
  });
});

// ── GET /api/v1/resources/:id ─────────────────────────────────────────────────

describe('GET /api/v1/resources/:id — detail & visibility checks', () => {
  it('returns 404 when resource does not exist', async () => {
    jest.spyOn(resourceRepo, 'findByIdWithDetails').mockResolvedValueOnce(null);

    const res = await request(app).get(`/api/v1/resources/${RES_ID}`);
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('NOT_FOUND');
  });

  it('returns 404 for PRIVATE resource when accessed by non-manager user (does not leak existence)', async () => {
    jest.spyOn(resourceRepo, 'findByIdWithDetails').mockResolvedValueOnce({
      id:         RES_ID,
      visibility: 'PRIVATE',
      status:     'ACTIVE',
      facility:   { institutionId: INST_A },
    });

    const token = makeToken({
      role: 'REQUESTER',
      memberships: [{ institutionId: INST_A, role: 'REQUESTER' }],
    });

    const res = await request(app)
      .get(`/api/v1/resources/${RES_ID}`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(404);
  });

  it('allows access to PRIVATE resource for Manager of that institution', async () => {
    jest.spyOn(resourceRepo, 'findByIdWithDetails').mockResolvedValueOnce({
      id:         RES_ID,
      name:       'Confidential Scanner',
      visibility: 'PRIVATE',
      status:     'ACTIVE',
      facility:   { institutionId: INST_A },
      specs:      { resolution: '4K' },
    });

    const token = makeToken({
      role: 'REQUESTER',
      memberships: [{ institutionId: INST_A, role: 'MANAGER' }],
    });

    const res = await request(app)
      .get(`/api/v1/resources/${RES_ID}`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
    expect(res.body.data.name).toBe('Confidential Scanner');
  });

  it('returns 404 for INSTITUTION resource when accessed by external user', async () => {
    jest.spyOn(resourceRepo, 'findByIdWithDetails').mockResolvedValueOnce({
      id:         RES_ID,
      visibility: 'INSTITUTION',
      status:     'ACTIVE',
      facility:   { institutionId: INST_A },
    });

    const token = makeToken({
      role: 'REQUESTER',
      memberships: [{ institutionId: INST_B, role: 'REQUESTER' }], // different institution
    });

    const res = await request(app)
      .get(`/api/v1/resources/${RES_ID}`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(404);
  });
});

// ── GET /api/v1/resources/:id/private-details ─────────────────────────────────

describe('GET /api/v1/resources/:id/private-details — access instructions', () => {
  it('returns 401 when unauthenticated', async () => {
    const res = await request(app).get(`/api/v1/resources/${RES_ID}/private-details`);
    expect(res.status).toBe(401);
  });

  it('returns 403 when user has neither manager role nor approved booking', async () => {
    const token = makeToken({ sub: USER_ID });

    jest.spyOn(resourceRepo, 'findByIdWithDetails').mockResolvedValueOnce({
      id:       RES_ID,
      facility: { institutionId: INST_A },
    });

    const res = await request(app)
      .get(`/api/v1/resources/${RES_ID}/private-details`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('FORBIDDEN');
  });

  it('returns private details when user is Manager or Owner of host institution', async () => {
    const token = makeToken({
      sub: USER_ID,
      memberships: [{ institutionId: INST_A, role: 'MANAGER' }],
    });

    jest.spyOn(resourceRepo, 'findByIdWithDetails').mockResolvedValueOnce({
      id:       RES_ID,
      name:     'Precision Lathe',
      facility: { institutionId: INST_A },
      specs: {
        doorCode:            'KEY-9988',
        accessInstructions:  'Ask security for Room 102 key card',
      },
    });

    const res = await request(app)
      .get(`/api/v1/resources/${RES_ID}/private-details`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
    expect(res.body.data.privateDetails.doorCode).toBe('KEY-9988');
    expect(res.body.data.privateDetails.accessInstructions).toBe('Ask security for Room 102 key card');
  });
});

// ── POST /api/v1/facilities/:id/resources ─────────────────────────────────────

describe('POST /api/v1/facilities/:id/resources — create resource', () => {
  it('returns 401 when unauthenticated', async () => {
    const res = await request(app)
      .post(`/api/v1/facilities/${FAC_A}/resources`)
      .send({ name: 'CNC Machine', category: 'Machining' });
    expect(res.status).toBe(401);
  });

  it('returns 403 when user is not Manager or Owner for facility institution', async () => {
    const token = makeToken({
      role: 'REQUESTER',
      memberships: [{ institutionId: INST_A, role: 'REQUESTER' }],
    });

    jest.spyOn(facilityRepo, 'findById').mockResolvedValueOnce({
      id:             FAC_A,
      institution_id: INST_A,
    });

    const res = await request(app)
      .post(`/api/v1/facilities/${FAC_A}/resources`)
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'CNC Machine', category: 'Machining' });

    expect(res.status).toBe(403);
  });

  it('successfully creates resource when authorized with valid payload', async () => {
    const token = makeToken({
      sub: USER_ID,
      memberships: [{ institutionId: INST_A, role: 'OWNER' }],
    });

    jest.spyOn(facilityRepo, 'findById').mockResolvedValueOnce({
      id:             FAC_A,
      institution_id: INST_A,
    });

    jest.spyOn(resourceRepo, 'insert').mockResolvedValueOnce({
      id: RES_ID,
    });

    jest.spyOn(resourceRepo, 'findByIdWithDetails').mockResolvedValueOnce({
      id:           RES_ID,
      facilityId:   FAC_A,
      name:         'CNC Router 3-Axis',
      category:     'Machining',
      visibility:   'PUBLIC',
      riskLevel:    'MEDIUM',
      status:       'ACTIVE',
      facility:     { institutionId: INST_A },
    });

    const res = await request(app)
      .post(`/api/v1/facilities/${FAC_A}/resources`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        name:         'CNC Router 3-Axis',
        category:     'Machining',
        description:  'Heavy duty CNC router',
        visibility:   'PUBLIC',
        riskLevel:    'MEDIUM',
        capabilities: ['ROUTING', 'WOOD', 'ALUMINUM'],
      });

    expect(res.status).toBe(201);
    expect(res.body.ok).toBe(true);
    expect(res.body.data.name).toBe('CNC Router 3-Axis');
  });
});

// ── PATCH /api/v1/resources/:id ───────────────────────────────────────────────

describe('PATCH /api/v1/resources/:id — edit resource', () => {
  it('returns 403 for unauthorized users', async () => {
    const token = makeToken({
      role: 'REQUESTER',
      memberships: [{ institutionId: INST_A, role: 'REQUESTER' }],
    });

    jest.spyOn(resourceRepo, 'findByIdWithDetails').mockResolvedValueOnce({
      id:       RES_ID,
      facility: { institutionId: INST_A },
    });

    const res = await request(app)
      .patch(`/api/v1/resources/${RES_ID}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Renamed Tool' });

    expect(res.status).toBe(403);
  });

  it('successfully updates resource when authorized', async () => {
    const token = makeToken({
      sub: USER_ID,
      memberships: [{ institutionId: INST_A, role: 'MANAGER' }],
    });

    jest.spyOn(resourceRepo, 'findByIdWithDetails')
      .mockResolvedValueOnce({ id: RES_ID, facility: { institutionId: INST_A } })
      .mockResolvedValueOnce({ id: RES_ID, name: 'Renamed Tool', facility: { institutionId: INST_A } });

    jest.spyOn(resourceRepo, 'update').mockResolvedValueOnce({});

    const res = await request(app)
      .patch(`/api/v1/resources/${RES_ID}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Renamed Tool' });

    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
    expect(res.body.data.name).toBe('Renamed Tool');
  });
});

// ── POST /api/v1/resources/:id/deactivate ─────────────────────────────────────

describe('POST /api/v1/resources/:id/deactivate — soft-deactivate', () => {
  it('returns 403 when user is not Owner of the institution', async () => {
    const token = makeToken({
      sub: USER_ID,
      memberships: [{ institutionId: INST_A, role: 'MANAGER' }], // Manager cannot deactivate; Owner required
    });

    jest.spyOn(resourceRepo, 'findByIdWithDetails').mockResolvedValueOnce({
      id:       RES_ID,
      facility: { institutionId: INST_A },
    });

    const res = await request(app)
      .post(`/api/v1/resources/${RES_ID}/deactivate`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(403);
  });

  it('successfully deactivates resource when invoked by Owner', async () => {
    const token = makeToken({
      sub: USER_ID,
      memberships: [{ institutionId: INST_A, role: 'OWNER' }],
    });

    jest.spyOn(resourceRepo, 'findByIdWithDetails').mockResolvedValueOnce({
      id:       RES_ID,
      facility: { institutionId: INST_A },
    });

    jest.spyOn(resourceRepo, 'softDeactivate').mockResolvedValueOnce({
      id:     RES_ID,
      status: 'INACTIVE',
    });

    const res = await request(app)
      .post(`/api/v1/resources/${RES_ID}/deactivate`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
    expect(res.body.data.status).toBe('INACTIVE');
  });
});

