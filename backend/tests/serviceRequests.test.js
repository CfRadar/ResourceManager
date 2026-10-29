'use strict';

/**
 * tests/serviceRequests.test.js
 *
 * Step 08 — Staff-Operated Service Requests lifecycle tests (Spec §4.13).
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
      whereNot() { return this; },
      whereNull() { return this; },
      whereNotNull() { return this; },
      whereRaw() { return this; },
      whereIn() { return this; },
      orWhere() { return this; },
      andWhere() { return this; },
      join() { return this; },
      leftJoin() { return this; },
      orderBy() { return this; },
      select() { return this; },
      limit() { return this; },
      offset() { return this; },
      max() { return this; },
      clone() { return this; },
      clearSelect() { return this; },
      async first() { return this._vals[0]; },
      async count() { return [{ total: '1' }]; },
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

const { createApp }             = require('../src/app');
const { serviceRequestRepo }    = require('../src/modules/serviceRequests/serviceRequests.repository');
const { resourceRepo }          = require('../src/modules/resources/resources.repository');
const { policyRepo }            = require('../src/modules/policies/policies.repository');
const { facilityRepo }          = require('../src/modules/facilities/facilities.repository');
const transitionService         = require('../src/services/transition');

const app = createApp();

const REQUESTER_ID = '11111111-1111-4111-8111-111111111111';
const REVIEWER_ID  = '22222222-2222-4222-8222-222222222222';
const OPERATOR_ID  = '33333333-3333-4333-8333-333333333333';
const RESOURCE_ID  = '44444444-4444-4444-8444-444444444444';
const FACILITY_ID  = '55555555-5555-4555-8555-555555555555';
const REQUEST_ID   = '66666666-6666-4666-8666-666666666666';
const QUOTE_ID     = '77777777-7777-4777-8777-777777777777';

function makeToken(payload = {}) {
  return jwt.sign(
    {
      sub:         REQUESTER_ID,
      role:        'REQUESTER',
      memberships: [],
      ...payload,
    },
    process.env.JWT_ACCESS_SECRET,
    { algorithm: 'HS256', expiresIn: '15m' }
  );
}

describe('Step 08 — Staff-Operated Service Requests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('1. POST /api/v1/service-requests (Creation & Gating)', () => {
    it('rejects unauthenticated requests with 401', async () => {
      const res = await request(app).post('/api/v1/service-requests').send({});
      expect(res.status).toBe(401);
      expect(res.body.ok).toBe(false);
    });

    it('rejects short description with 400', async () => {
      const token = makeToken();
      const res = await request(app)
        .post('/api/v1/service-requests')
        .set('Authorization', `Bearer ${token}`)
        .send({
          resourceId:  RESOURCE_ID,
          description: 'Short',
        });
      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('returns 404 if resource does not exist', async () => {
      jest.spyOn(resourceRepo, 'findById').mockResolvedValue(null);
      const token = makeToken();
      const res = await request(app)
        .post('/api/v1/service-requests')
        .set('Authorization', `Bearer ${token}`)
        .send({
          resourceId:  RESOURCE_ID,
          description: 'High resolution FIB-SEM milling for TEM sample prep',
        });
      expect(res.status).toBe(404);
      expect(res.body.ok).toBe(false);
    });

    it('returns 400 if resource does not support STAFF_SERVICE', async () => {
      jest.spyOn(resourceRepo, 'findById').mockResolvedValue({
        id:           RESOURCE_ID,
        is_active:    true,
        facility_id:  FACILITY_ID,
        access_modes: ['INDEPENDENT'],
      });
      jest.spyOn(policyRepo, 'findCurrentPolicy').mockResolvedValue({
        policyData: { supportedAccessModes: ['INDEPENDENT'] },
      });

      const token = makeToken();
      const res = await request(app)
        .post('/api/v1/service-requests')
        .set('Authorization', `Bearer ${token}`)
        .send({
          resourceId:  RESOURCE_ID,
          description: 'High resolution FIB-SEM milling for TEM sample prep',
        });
      expect(res.status).toBe(400);
      expect(res.body.error.message).toMatch(/STAFF_SERVICE access mode not permitted/);
    });

    it('creates a service request successfully in SUBMITTED state', async () => {
      jest.spyOn(resourceRepo, 'findById').mockResolvedValue({
        id:           RESOURCE_ID,
        is_active:    true,
        facility_id:  FACILITY_ID,
        access_modes: ['STAFF_SERVICE', 'INDEPENDENT'],
      });
      jest.spyOn(policyRepo, 'findCurrentPolicy').mockResolvedValue({
        policyData:    { supportedAccessModes: ['STAFF_SERVICE'] },
        policyVersion: 1,
      });
      jest.spyOn(serviceRequestRepo, 'insert').mockResolvedValue({
        id:          REQUEST_ID,
        resource_id: RESOURCE_ID,
        status:      'SUBMITTED',
      });

      const token = makeToken();
      const res = await request(app)
        .post('/api/v1/service-requests')
        .set('Authorization', `Bearer ${token}`)
        .send({
          resourceId:  RESOURCE_ID,
          description: 'High resolution FIB-SEM milling for TEM sample prep',
        });
      expect(res.status).toBe(201);
      expect(res.body.ok).toBe(true);
      expect(res.body.data.status).toBe('SUBMITTED');
    });
  });

  describe('2. GET /api/v1/service-requests/:id (Detail & Authorization)', () => {
    it('returns 404 for non-existent service request', async () => {
      jest.spyOn(serviceRequestRepo, 'findDetailById').mockResolvedValue(null);
      const token = makeToken();
      const res = await request(app)
        .get(`/api/v1/service-requests/${REQUEST_ID}`)
        .set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(404);
    });

    it('returns 403 if requester is neither owner nor privileged staff', async () => {
      jest.spyOn(serviceRequestRepo, 'findDetailById').mockResolvedValue({
        id:           REQUEST_ID,
        requester_id: '99999999-9999-9999-9999-999999999999',
        status:       'SUBMITTED',
      });
      const token = makeToken({ sub: REQUESTER_ID, role: 'REQUESTER' });
      const res = await request(app)
        .get(`/api/v1/service-requests/${REQUEST_ID}`)
        .set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(403);
    });

    it('returns detail and active quote for authorized requester', async () => {
      jest.spyOn(serviceRequestRepo, 'findDetailById').mockResolvedValue({
        id:           REQUEST_ID,
        requester_id: REQUESTER_ID,
        status:       'QUOTE_SENT',
      });
      jest.spyOn(serviceRequestRepo, 'findActiveQuote').mockResolvedValue({
        id:         QUOTE_ID,
        total_cost: 2500,
        currency:   'INR',
        demo:       true,
      });

      const token = makeToken();
      const res = await request(app)
        .get(`/api/v1/service-requests/${REQUEST_ID}`)
        .set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(200);
      expect(res.body.data.id).toBe(REQUEST_ID);
      expect(res.body.data.quote.total_cost).toBe(2500);
    });
  });

  describe('3. Scope Review & Strict No-Self-Approval', () => {
    it('enforces strict assertNoSelfApproval if reviewer is also requester', async () => {
      jest.spyOn(serviceRequestRepo, 'findDetailById').mockResolvedValue({
        id:           REQUEST_ID,
        requester_id: REVIEWER_ID, // same as reviewer
        status:       'SUBMITTED',
      });

      const token = makeToken({ sub: REVIEWER_ID, role: 'MANAGER' });
      const res = await request(app)
        .post(`/api/v1/service-requests/${REQUEST_ID}/scope-review`)
        .set('Authorization', `Bearer ${token}`)
        .send({
          feasible: true,
          notes:    'Sample looks feasible for 5nm resolution imaging',
        });
      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('FORBIDDEN');
    });

    it('advances status to SCOPE_REVIEW when marked feasible', async () => {
      jest.spyOn(serviceRequestRepo, 'findDetailById').mockResolvedValue({
        id:           REQUEST_ID,
        requester_id: REQUESTER_ID,
        status:       'SUBMITTED',
      });
      jest.spyOn(transitionService, 'transition').mockResolvedValue({
        entity: { id: REQUEST_ID, status: 'SCOPE_REVIEW' },
      });

      const token = makeToken({ sub: REVIEWER_ID, role: 'MANAGER' });
      const res = await request(app)
        .post(`/api/v1/service-requests/${REQUEST_ID}/scope-review`)
        .set('Authorization', `Bearer ${token}`)
        .send({
          feasible: true,
          notes:    'Sample looks feasible for milling',
        });
      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe('SCOPE_REVIEW');
    });
  });

  describe('4. Quotes (Issuance, Acceptance & Declination)', () => {
    it('creates an itemized quote with demo: true and sets QUOTE_SENT', async () => {
      jest.spyOn(serviceRequestRepo, 'findDetailById').mockResolvedValue({
        id:           REQUEST_ID,
        requester_id: REQUESTER_ID,
        status:       'SCOPE_REVIEW',
      });
      jest.spyOn(serviceRequestRepo, 'createQuote').mockResolvedValue({
        id:         QUOTE_ID,
        total_cost: 3500,
        currency:   'INR',
        demo:       true,
      });
      jest.spyOn(transitionService, 'transition').mockResolvedValue({
        entity: { id: REQUEST_ID, status: 'QUOTE_SENT' },
      });

      const token = makeToken({ sub: REVIEWER_ID, role: 'MANAGER' });
      const res = await request(app)
        .post(`/api/v1/service-requests/${REQUEST_ID}/quote`)
        .set('Authorization', `Bearer ${token}`)
        .send({
          lineItems: [
            { description: 'FIB-SEM 2 hours operator time', cost: 3000 },
            { description: 'Gold sputter coating', cost: 500 },
          ],
          notes: 'Standard turn-around 3 business days',
        });
      expect(res.status).toBe(201);
      expect(res.body.data.quote.demo).toBe(true);
      expect(res.body.data.request.status).toBe('QUOTE_SENT');
    });

    it('requester accepts quote, advancing to AWAITING_MATERIALS', async () => {
      jest.spyOn(serviceRequestRepo, 'findDetailById').mockResolvedValue({
        id:                  REQUEST_ID,
        requester_id:        REQUESTER_ID,
        status:              'QUOTE_SENT',
        submitted_materials: null,
      });
      jest.spyOn(serviceRequestRepo, 'findActiveQuote').mockResolvedValue({
        id:     QUOTE_ID,
        status: 'PENDING',
      });
      jest.spyOn(serviceRequestRepo, 'updateQuoteStatus').mockResolvedValue({
        id:     QUOTE_ID,
        status: 'ACCEPTED',
      });
      jest.spyOn(transitionService, 'transition')
        .mockResolvedValueOnce({ entity: { id: REQUEST_ID, status: 'QUOTE_ACCEPTED' } })
        .mockResolvedValueOnce({ entity: { id: REQUEST_ID, status: 'AWAITING_MATERIALS' } });

      const token = makeToken({ sub: REQUESTER_ID, role: 'REQUESTER' });
      const res = await request(app)
        .post(`/api/v1/service-requests/${REQUEST_ID}/quote/respond`)
        .set('Authorization', `Bearer ${token}`)
        .send({
          decision: 'ACCEPT',
          note:     'Accepted estimate, shipping sample tomorrow',
        });
      expect(res.status).toBe(200);
      expect(res.body.data.decision).toBe('ACCEPTED');
      expect(res.body.data.request.status).toBe('AWAITING_MATERIALS');
    });

    it('requester declines quote, closing request', async () => {
      jest.spyOn(serviceRequestRepo, 'findDetailById').mockResolvedValue({
        id:           REQUEST_ID,
        requester_id: REQUESTER_ID,
        status:       'QUOTE_SENT',
      });
      jest.spyOn(serviceRequestRepo, 'findActiveQuote').mockResolvedValue({
        id:     QUOTE_ID,
        status: 'PENDING',
      });
      jest.spyOn(serviceRequestRepo, 'updateQuoteStatus').mockResolvedValue({
        id:     QUOTE_ID,
        status: 'DECLINED',
      });
      jest.spyOn(transitionService, 'transition')
        .mockResolvedValueOnce({ entity: { id: REQUEST_ID, status: 'QUOTE_DECLINED' } })
        .mockResolvedValueOnce({ entity: { id: REQUEST_ID, status: 'CLOSED' } });

      const token = makeToken({ sub: REQUESTER_ID, role: 'REQUESTER' });
      const res = await request(app)
        .post(`/api/v1/service-requests/${REQUEST_ID}/quote/respond`)
        .set('Authorization', `Bearer ${token}`)
        .send({
          decision: 'DECLINE',
          note:     'Over budget',
        });
      expect(res.status).toBe(200);
      expect(res.body.data.decision).toBe('DECLINED');
      expect(res.body.data.request.status).toBe('CLOSED');
    });
  });

  describe('5. Sample Intake, Progress Updates & Output Delivery', () => {
    it('operator records materials receipt (MATERIALS_RECEIVED)', async () => {
      jest.spyOn(serviceRequestRepo, 'findDetailById').mockResolvedValue({
        id:           REQUEST_ID,
        requester_id: REQUESTER_ID,
        status:       'AWAITING_MATERIALS',
      });
      jest.spyOn(transitionService, 'transition').mockResolvedValue({
        entity: { id: REQUEST_ID, status: 'MATERIALS_RECEIVED' },
      });

      const token = makeToken({ sub: OPERATOR_ID, role: 'OPERATOR' });
      const res = await request(app)
        .post(`/api/v1/service-requests/${REQUEST_ID}/materials-received`)
        .set('Authorization', `Bearer ${token}`)
        .send({
          notes:           'Received package with 3 silicon wafers in safe container',
          conditionRating: 5,
        });
      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe('MATERIALS_RECEIVED');
    });

    it('operator delivers output (OUTPUT_DELIVERED)', async () => {
      jest.spyOn(serviceRequestRepo, 'findDetailById').mockResolvedValue({
        id:           REQUEST_ID,
        requester_id: REQUESTER_ID,
        status:       'SERVICE_IN_PROGRESS',
      });
      jest.spyOn(transitionService, 'transition').mockResolvedValue({
        entity: { id: REQUEST_ID, status: 'OUTPUT_DELIVERED' },
      });

      const token = makeToken({ sub: OPERATOR_ID, role: 'OPERATOR' });
      const res = await request(app)
        .post(`/api/v1/service-requests/${REQUEST_ID}/deliver-output`)
        .set('Authorization', `Bearer ${token}`)
        .send({
          summaryNotes: 'Analysis completed, SEM micrographs and spectrum files attached',
          deliverables: [{ title: 'spectrum.csv' }, { title: 'cross-section.tiff' }],
        });
      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe('OUTPUT_DELIVERED');
    });

    it('requester signs off on completion (CLOSED)', async () => {
      jest.spyOn(serviceRequestRepo, 'findDetailById').mockResolvedValue({
        id:           REQUEST_ID,
        requester_id: REQUESTER_ID,
        status:       'OUTPUT_DELIVERED',
      });
      jest.spyOn(transitionService, 'transition')
        .mockResolvedValueOnce({ entity: { id: REQUEST_ID, status: 'COMPLETED' } })
        .mockResolvedValueOnce({ entity: { id: REQUEST_ID, status: 'CLOSED' } });

      const token = makeToken({ sub: REQUESTER_ID, role: 'REQUESTER' });
      const res = await request(app)
        .post(`/api/v1/service-requests/${REQUEST_ID}/confirm-completion`)
        .set('Authorization', `Bearer ${token}`)
        .send({
          confirmed: true,
        });
      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe('CLOSED');
    });

    it('requester disputes deliverables (INCIDENT_REPORTED)', async () => {
      jest.spyOn(serviceRequestRepo, 'findDetailById').mockResolvedValue({
        id:           REQUEST_ID,
        requester_id: REQUESTER_ID,
        status:       'OUTPUT_DELIVERED',
      });
      jest.spyOn(transitionService, 'transition').mockResolvedValue({
        entity: { id: REQUEST_ID, status: 'INCIDENT_REPORTED' },
      });

      const token = makeToken({ sub: REQUESTER_ID, role: 'REQUESTER' });
      const res = await request(app)
        .post(`/api/v1/service-requests/${REQUEST_ID}/confirm-completion`)
        .set('Authorization', `Bearer ${token}`)
        .send({
          confirmed:     false,
          disputeReason: 'Wafer cross-section milled at incorrect target angle',
        });
      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe('INCIDENT_REPORTED');
    });
  });
});

