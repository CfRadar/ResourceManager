'use strict';

/**
 * tests/institutions.test.js
 *
 * Step 03 — Institutions domain, membership requests, decisions, and partner linking tests.
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
      orWhere() { return this; },
      andWhere() { return this; },
      whereIn() { return this; },
      join() { return this; },
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
const {
  institutionRepo,
  institutionPartnerRepo,
  membershipRequestRepo,
  institutionMembershipRepo,
} = require('../src/modules/institutions/institutions.repository');
const { facilityRepo } = require('../src/modules/facilities/facilities.repository');

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

const INST_ID    = '11111111-1111-4111-a111-111111111111';
const PARTNER_ID = '22222222-2222-4222-a222-222222222222';
const REQ_ID     = '33333333-3333-4333-a333-333333333333';
const USER_ID    = '44444444-4444-4444-a444-444444444444';
const ADMIN_ID   = '55555555-5555-4555-a555-555555555555';

// ── GET /api/v1/institutions ──────────────────────────────────────────────────

describe('GET /api/v1/institutions — list verified institutions', () => {
  it('returns paginated verified institutions with public fields only', async () => {
    jest.spyOn(institutionRepo, 'findVerified').mockResolvedValueOnce({
      data: [
        {
          id: INST_ID,
          name: 'Demo University',
          type: 'UNIVERSITY',
          city: 'Bangalore',
          address: '1 University Road',
          website: 'https://demo.edu',
          description: 'A research university',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ],
      meta: { page: 1, pageSize: 20, total: 1, totalPages: 1 },
    });

    const res = await request(app).get('/api/v1/institutions');
    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data[0].id).toBe(INST_ID);
    expect(res.body.data[0].verified).toBeUndefined(); // internal verification field excluded
  });

  it('rejects invalid query parameters', async () => {
    const res = await request(app).get('/api/v1/institutions?page=-1');
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });
});

// ── GET /api/v1/institutions/:id ──────────────────────────────────────────────

describe('GET /api/v1/institutions/:id — detail and facilities', () => {
  it('returns 404 when institution does not exist', async () => {
    jest.spyOn(institutionRepo, 'findById').mockResolvedValueOnce(null);

    const res = await request(app).get(`/api/v1/institutions/${INST_ID}`);
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('NOT_FOUND');
  });

  it('returns institution detail with its public facilities', async () => {
    jest.spyOn(institutionRepo, 'findById').mockResolvedValueOnce({
      id: INST_ID,
      name: 'Demo University',
      type: 'UNIVERSITY',
      city: 'Bangalore',
      verified: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

    jest.spyOn(facilityRepo, 'findByInstitutionId').mockResolvedValueOnce([
      { id: 'fac-1', name: 'Optics Lab', geofenceRadiusMeters: 150 },
    ]);

    const res = await request(app).get(`/api/v1/institutions/${INST_ID}`);
    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
    expect(res.body.data.id).toBe(INST_ID);
    expect(res.body.data.facilities).toHaveLength(1);
    expect(res.body.data.facilities[0].name).toBe('Optics Lab');
  });
});

// ── POST /api/v1/institutions ─────────────────────────────────────────────────

describe('POST /api/v1/institutions — registration by Platform Admin', () => {
  it('rejects unauthenticated requests with 401', async () => {
    const res = await request(app)
      .post('/api/v1/institutions')
      .send({ name: 'New Tech Institute' });
    expect(res.status).toBe(401);
  });

  it('rejects non-platform-admin users with 403', async () => {
    const token = makeToken({ role: 'REQUESTER' });
    const res = await request(app)
      .post('/api/v1/institutions')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'New Tech Institute' });
    expect(res.status).toBe(403);
  });

  it('rejects duplicate institution name with 409', async () => {
    const token = makeToken({ role: 'ADMIN' });

    jest.spyOn(institutionRepo, 'findByName').mockResolvedValueOnce({
      id: INST_ID,
      name: 'Demo University',
    });

    const res = await request(app)
      .post('/api/v1/institutions')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Demo University' });

    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('DUPLICATE_INSTITUTION');
  });

  it('successfully creates an institution when invoked by platform admin', async () => {
    const token = makeToken({ role: 'ADMIN' });

    jest.spyOn(institutionRepo, 'findByName').mockResolvedValueOnce(null);
    jest.spyOn(institutionRepo, 'insert').mockResolvedValueOnce({
      id: INST_ID,
      name: 'National Research Center',
      type: 'RESEARCH_INSTITUTE',
      verified: true,
      city: 'Delhi',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

    const res = await request(app)
      .post('/api/v1/institutions')
      .set('Authorization', `Bearer ${token}`)
      .send({
        name: 'National Research Center',
        type: 'RESEARCH_INSTITUTE',
        city: 'Delhi',
      });

    expect(res.status).toBe(201);
    expect(res.body.ok).toBe(true);
    expect(res.body.data.name).toBe('National Research Center');
    expect(res.body.data.type).toBe('RESEARCH_INSTITUTE');
  });
});

// ── PATCH /api/v1/institutions/:id ────────────────────────────────────────────

describe('PATCH /api/v1/institutions/:id — profile update', () => {
  it('rejects update when user is neither platform admin nor institution admin', async () => {
    const token = makeToken({
      role: 'REQUESTER',
      memberships: [{ institutionId: INST_ID, role: 'REQUESTER' }],
    });

    const res = await request(app)
      .patch(`/api/v1/institutions/${INST_ID}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ city: 'Pune' });

    expect(res.status).toBe(403);
  });

  it('rejects client attempts to modify forbidden fields like verified or id', async () => {
    const token = makeToken({
      role: 'REQUESTER',
      memberships: [{ institutionId: INST_ID, role: 'ADMIN' }],
    });

    const res = await request(app)
      .patch(`/api/v1/institutions/${INST_ID}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ verified: true }); // strict schema should reject unknown/forbidden field

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('allows institution admin to update profile details', async () => {
    const token = makeToken({
      role: 'REQUESTER',
      memberships: [{ institutionId: INST_ID, role: 'ADMIN' }],
    });

    jest.spyOn(institutionRepo, 'findById').mockResolvedValueOnce({
      id: INST_ID,
      name: 'Demo University',
      type: 'UNIVERSITY',
      verified: true,
    });

    jest.spyOn(institutionRepo, 'update').mockResolvedValueOnce({
      id: INST_ID,
      name: 'Demo University',
      type: 'UNIVERSITY',
      city: 'Mumbai',
      address: 'Marine Lines',
      verified: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

    const res = await request(app)
      .patch(`/api/v1/institutions/${INST_ID}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ city: 'Mumbai', address: 'Marine Lines' });

    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
    expect(res.body.data.city).toBe('Mumbai');
  });
});

// ── POST /api/v1/institutions/:id/membership-requests ─────────────────────────

describe('POST /api/v1/institutions/:id/membership-requests — application submission', () => {
  it('returns 401 when unauthenticated', async () => {
    const res = await request(app)
      .post(`/api/v1/institutions/${INST_ID}/membership-requests`)
      .send({ requestedRole: 'REQUESTER' });
    expect(res.status).toBe(401);
  });

  it('returns 404 if target institution does not exist or is unverified', async () => {
    const token = makeToken({ sub: USER_ID });
    jest.spyOn(institutionRepo, 'findById').mockResolvedValueOnce(null);

    const res = await request(app)
      .post(`/api/v1/institutions/${INST_ID}/membership-requests`)
      .set('Authorization', `Bearer ${token}`)
      .send({ requestedRole: 'REQUESTER' });

    expect(res.status).toBe(404);
  });

  it('returns 409 if user already has an active membership in the institution', async () => {
    const token = makeToken({ sub: USER_ID });

    jest.spyOn(institutionRepo, 'findById').mockResolvedValueOnce({
      id: INST_ID,
      verified: true,
    });

    jest.spyOn(institutionMembershipRepo, 'findActiveMembership').mockResolvedValueOnce({
      id: 'mem-1',
      status: 'ACTIVE',
    });

    const res = await request(app)
      .post(`/api/v1/institutions/${INST_ID}/membership-requests`)
      .set('Authorization', `Bearer ${token}`)
      .send({ requestedRole: 'REQUESTER' });

    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('MEMBERSHIP_EXISTS');
  });

  it('returns 409 if user already has a pending membership request', async () => {
    const token = makeToken({ sub: USER_ID });

    jest.spyOn(institutionRepo, 'findById').mockResolvedValueOnce({
      id: INST_ID,
      verified: true,
    });

    jest.spyOn(institutionMembershipRepo, 'findActiveMembership').mockResolvedValueOnce(null);

    jest.spyOn(membershipRequestRepo, 'findPendingByUserAndInstitution').mockResolvedValueOnce({
      id: REQ_ID,
      status: 'PENDING',
    });

    const res = await request(app)
      .post(`/api/v1/institutions/${INST_ID}/membership-requests`)
      .set('Authorization', `Bearer ${token}`)
      .send({ requestedRole: 'REQUESTER' });

    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('REQUEST_PENDING');
  });

  it('successfully creates pending membership request', async () => {
    const token = makeToken({ sub: USER_ID });

    jest.spyOn(institutionRepo, 'findById').mockResolvedValueOnce({
      id: INST_ID,
      verified: true,
    });

    jest.spyOn(institutionMembershipRepo, 'findActiveMembership').mockResolvedValueOnce(null);
    jest.spyOn(membershipRequestRepo, 'findPendingByUserAndInstitution').mockResolvedValueOnce(null);

    jest.spyOn(membershipRequestRepo, 'insert').mockResolvedValueOnce({
      id: REQ_ID,
      institution_id: INST_ID,
      user_id: USER_ID,
      requested_role: 'REQUESTER',
      message: 'Student ID: 2024-CS-09',
      supporting_document_id: 'doc-file-123',
      status: 'PENDING',
      created_at: new Date().toISOString(),
    });

    const res = await request(app)
      .post(`/api/v1/institutions/${INST_ID}/membership-requests`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        requestedRole: 'REQUESTER',
        message: 'Student ID: 2024-CS-09',
        supportingDocumentId: 'doc-file-123',
      });

    expect(res.status).toBe(201);
    expect(res.body.ok).toBe(true);
    expect(res.body.data.id).toBe(REQ_ID);
    expect(res.body.data.status).toBe('PENDING');
  });
});

// ── GET /api/v1/institutions/:id/membership-requests ──────────────────────────

describe('GET /api/v1/institutions/:id/membership-requests — list applications', () => {
  it('returns 403 for non-admin users', async () => {
    const token = makeToken({
      role: 'REQUESTER',
      memberships: [{ institutionId: INST_ID, role: 'REQUESTER' }],
    });

    const res = await request(app)
      .get(`/api/v1/institutions/${INST_ID}/membership-requests`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(403);
  });

  it('returns pending applications when queried by institution admin', async () => {
    const token = makeToken({
      role: 'REQUESTER',
      memberships: [{ institutionId: INST_ID, role: 'ADMIN' }],
    });

    jest.spyOn(institutionRepo, 'findById').mockResolvedValueOnce({
      id: INST_ID,
      verified: true,
    });

    jest.spyOn(membershipRequestRepo, 'findRequestsWithUser').mockResolvedValueOnce({
      data: [
        {
          id: REQ_ID,
          institutionId: INST_ID,
          requestedRole: 'REQUESTER',
          status: 'PENDING',
          user: { id: USER_ID, name: 'Alice Student', email: 'alice@demo.rm' },
        },
      ],
      meta: { page: 1, pageSize: 20, total: 1, totalPages: 1 },
    });

    const res = await request(app)
      .get(`/api/v1/institutions/${INST_ID}/membership-requests`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
    expect(res.body.data[0].user.name).toBe('Alice Student');
  });
});

// ── POST /api/v1/institutions/:id/membership-requests/:reqId/decision ─────────

describe('POST /api/v1/institutions/:id/membership-requests/:reqId/decision — review', () => {
  it('enforces strict no-self-approval rule (returns 403 if reviewer approves own request)', async () => {
    const adminToken = makeToken({
      sub: USER_ID, // same as requester
      role: 'ADMIN',
    });

    jest.spyOn(membershipRequestRepo, 'findRequestById').mockResolvedValueOnce({
      id: REQ_ID,
      userId: USER_ID, // same user!
      institutionId: INST_ID,
      status: 'PENDING',
    });

    const res = await request(app)
      .post(`/api/v1/institutions/${INST_ID}/membership-requests/${REQ_ID}/decision`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ decision: 'APPROVE', role: 'REQUESTER', reason: 'Self verify' });

    expect(res.status).toBe(403);
    expect(res.body.error.message).toMatch(/strictly prohibited/i);
  });

  it('rejects approval when no valid membership role is provided', async () => {
    const adminToken = makeToken({
      sub: ADMIN_ID,
      role: 'ADMIN',
    });

    const res = await request(app)
      .post(`/api/v1/institutions/${INST_ID}/membership-requests/${REQ_ID}/decision`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ decision: 'APPROVE' }); // missing role

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('rejects repeated decision on already processed request with 409', async () => {
    const adminToken = makeToken({
      sub: ADMIN_ID,
      role: 'ADMIN',
    });

    jest.spyOn(membershipRequestRepo, 'findRequestById').mockResolvedValueOnce({
      id: REQ_ID,
      userId: USER_ID,
      institutionId: INST_ID,
      status: 'APPROVED', // already approved!
    });

    const res = await request(app)
      .post(`/api/v1/institutions/${INST_ID}/membership-requests/${REQ_ID}/decision`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ decision: 'APPROVE', role: 'REQUESTER' });

    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('INVALID_TRANSITION');
  });

  it('successfully approves request and assigns active membership', async () => {
    const adminToken = makeToken({
      sub: ADMIN_ID,
      role: 'ADMIN',
    });

    jest.spyOn(membershipRequestRepo, 'findRequestById').mockResolvedValueOnce({
      id: REQ_ID,
      userId: USER_ID,
      institutionId: INST_ID,
      status: 'PENDING',
    });

    jest.spyOn(institutionMembershipRepo, 'upsertMembership').mockResolvedValueOnce({
      id: 'mem-new',
      user_id: USER_ID,
      institution_id: INST_ID,
      role: 'REQUESTER',
      status: 'ACTIVE',
      verified_by: ADMIN_ID,
      verified_at: new Date().toISOString(),
    });

    jest.spyOn(membershipRequestRepo, 'updateStatus').mockResolvedValueOnce({});

    const res = await request(app)
      .post(`/api/v1/institutions/${INST_ID}/membership-requests/${REQ_ID}/decision`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        decision: 'APPROVE',
        role: 'REQUESTER',
        reason: 'Student identity verified',
      });

    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
    expect(res.body.data.status).toBe('APPROVED');
    expect(res.body.data.decision).toBe('APPROVE');
  });

  it('successfully rejects request without creating membership', async () => {
    const adminToken = makeToken({
      sub: ADMIN_ID,
      role: 'ADMIN',
    });

    jest.spyOn(membershipRequestRepo, 'findRequestById').mockResolvedValueOnce({
      id: REQ_ID,
      userId: USER_ID,
      institutionId: INST_ID,
      status: 'PENDING',
    });

    jest.spyOn(membershipRequestRepo, 'updateStatus').mockResolvedValueOnce({});

    const res = await request(app)
      .post(`/api/v1/institutions/${INST_ID}/membership-requests/${REQ_ID}/decision`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        decision: 'REJECT',
        reason: 'Incomplete documentation',
      });

    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
    expect(res.body.data.status).toBe('REJECTED');
    expect(res.body.data.membership).toBeNull();
  });
});

// ── POST /api/v1/institutions/:id/partners ────────────────────────────────────

describe('POST /api/v1/institutions/:id/partners — partner link creation', () => {
  it('prevents self-linking with 400', async () => {
    const adminToken = makeToken({
      role: 'ADMIN',
    });

    const res = await request(app)
      .post(`/api/v1/institutions/${INST_ID}/partners`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ partnerInstitutionId: INST_ID });

    expect(res.status).toBe(400);
    expect(res.body.error.message).toMatch(/cannot link an institution as a partner to itself/i);
  });

  it('rejects duplicate partner links with 409', async () => {
    const adminToken = makeToken({
      role: 'ADMIN',
    });

    jest.spyOn(institutionRepo, 'findById')
      .mockResolvedValueOnce({ id: INST_ID, verified: true })
      .mockResolvedValueOnce({ id: PARTNER_ID, verified: true });

    jest.spyOn(institutionPartnerRepo, 'arePartners').mockResolvedValueOnce(true);

    const res = await request(app)
      .post(`/api/v1/institutions/${INST_ID}/partners`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ partnerInstitutionId: PARTNER_ID });

    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('PARTNER_LINK_EXISTS');
  });

  it('successfully creates partner link between verified institutions', async () => {
    const adminToken = makeToken({
      role: 'ADMIN',
    });

    jest.spyOn(institutionRepo, 'findById')
      .mockResolvedValueOnce({ id: INST_ID, verified: true })
      .mockResolvedValueOnce({ id: PARTNER_ID, verified: true });

    jest.spyOn(institutionPartnerRepo, 'arePartners').mockResolvedValueOnce(false);
    jest.spyOn(institutionPartnerRepo, 'linkPartners').mockResolvedValueOnce({
      institution_id_a: INST_ID,
      institution_id_b: PARTNER_ID,
      established_at: new Date().toISOString(),
    });

    const res = await request(app)
      .post(`/api/v1/institutions/${INST_ID}/partners`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ partnerInstitutionId: PARTNER_ID });

    expect(res.status).toBe(201);
    expect(res.body.ok).toBe(true);
    expect(res.body.data.partnerInstitutionId).toBe(PARTNER_ID);
  });
});

// ── GET /api/v1/institutions/:id/partners ─────────────────────────────────────

describe('GET /api/v1/institutions/:id/partners — list partners', () => {
  it('lists partner institutions', async () => {
    jest.spyOn(institutionRepo, 'findById').mockResolvedValueOnce({
      id: INST_ID,
      verified: true,
    });

    jest.spyOn(institutionPartnerRepo, 'findPartners').mockResolvedValueOnce([
      { id: PARTNER_ID, name: 'Partner Hub', city: 'Hyderabad' },
    ]);

    const res = await request(app).get(`/api/v1/institutions/${INST_ID}/partners`);
    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0].id).toBe(PARTNER_ID);
  });
});
