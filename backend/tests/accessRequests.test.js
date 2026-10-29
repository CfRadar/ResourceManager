'use strict';

/**
 * tests/accessRequests.test.js
 *
 * Step 06 — Access Requests, State Machine, Review Queue, Decisions, and Appeals.
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
const { accessRequestRepo }     = require('../src/modules/accessRequests/accessRequests.repository');
const { resourceRepo }          = require('../src/modules/resources/resources.repository');
const { facilityRepo }          = require('../src/modules/facilities/facilities.repository');
const eligibilityEngine         = require('../src/services/eligibilityEngine');
const transitionService         = require('../src/services/transition');

const app = createApp();

const REQUESTER_ID = '11111111-1111-4111-8111-111111111111';
const REVIEWER_ID  = '22222222-2222-4222-8222-222222222222';
const RESOURCE_ID  = '33333333-3333-4333-8333-333333333333';
const FACILITY_ID  = '44444444-4444-4444-8444-444444444444';
const INSTITUTION_ID = '55555555-5555-4555-8555-555555555555';
const REQUEST_ID   = '66666666-6666-4666-8666-666666666666';

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

describe('Step 06 — Access Requests & State Machine', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('1. POST /api/v1/access-requests (Creation & Drafts)', () => {
    it('rejects unauthenticated requests with 401', async () => {
      const res = await request(app).post('/api/v1/access-requests').send({});
      expect(res.status).toBe(401);
      expect(res.body.ok).toBe(false);
    });

    it('rejects invalid body schema with 400 (purpose too short)', async () => {
      const token = makeToken();
      const res = await request(app)
        .post('/api/v1/access-requests')
        .set('Authorization', `Bearer ${token}`)
        .send({
          resourceId: RESOURCE_ID,
          purpose: 'hi', // < 5 chars
        });
      expect(res.status).toBe(400);
      expect(res.body.ok).toBe(false);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('creates a DRAFT request when isDraft is true', async () => {
      jest.spyOn(resourceRepo, 'findById').mockResolvedValue({
        id: RESOURCE_ID,
        facility_id: FACILITY_ID,
        status: 'ACTIVE',
      });
      jest.spyOn(facilityRepo, 'findById').mockResolvedValue({
        id: FACILITY_ID,
        institution_id: INSTITUTION_ID,
      });

      const mockDraft = {
        id: REQUEST_ID,
        resource_id: RESOURCE_ID,
        requester_id: REQUESTER_ID,
        status: 'DRAFT',
        purpose: 'Academic project on polymers',
      };
      jest.spyOn(accessRequestRepo, 'insert').mockResolvedValue(mockDraft);

      const token = makeToken();
      const res = await request(app)
        .post('/api/v1/access-requests')
        .set('Authorization', `Bearer ${token}`)
        .send({
          resourceId: RESOURCE_ID,
          purpose: 'Academic project on polymers',
          isDraft: true,
        });

      expect(res.status).toBe(201);
      expect(res.body.ok).toBe(true);
      expect(res.body.data.request.status).toBe('DRAFT');
    });

    it('submits a request directly when eligible, transitioning to SUBMITTED', async () => {
      jest.spyOn(resourceRepo, 'findById').mockResolvedValue({
        id: RESOURCE_ID,
        facility_id: FACILITY_ID,
        status: 'ACTIVE',
      });
      jest.spyOn(facilityRepo, 'findById').mockResolvedValue({
        id: FACILITY_ID,
        institution_id: INSTITUTION_ID,
      });
      jest.spyOn(eligibilityEngine, 'checkEligibility').mockResolvedValue({
        eligible: true,
        canRequest: true,
        checks: [
          { key: 'membership_verified', status: 'PASS' },
          { key: 'user_group_allowed', status: 'PASS' },
          { key: 'training', status: 'PASS' },
          { key: 'documents', status: 'PASS' },
        ],
      });

      const mockCreated = {
        id: REQUEST_ID,
        resource_id: RESOURCE_ID,
        requester_id: REQUESTER_ID,
        status: 'DRAFT',
        purpose: 'Researching quantum dot synthesis',
      };
      jest.spyOn(accessRequestRepo, 'insert').mockResolvedValue(mockCreated);
      jest.spyOn(transitionService, 'transition').mockResolvedValue({
        entity: { ...mockCreated, status: 'SUBMITTED' },
        auditEvent: { id: 'audit-1' },
      });

      const token = makeToken();
      const res = await request(app)
        .post('/api/v1/access-requests')
        .set('Authorization', `Bearer ${token}`)
        .send({
          resourceId: RESOURCE_ID,
          purpose: 'Researching quantum dot synthesis',
          startAt: '2026-11-01T10:00:00Z',
          endAt: '2026-11-01T12:00:00Z',
          isDraft: false,
        });

      expect(res.status).toBe(201);
      expect(res.body.ok).toBe(true);
      expect(res.body.data.request.status).toBe('SUBMITTED');
      expect(res.body.data.eligibility.eligible).toBe(true);
    });
  });

  describe('2. GET /api/v1/access-requests/mine & :id', () => {
    it('returns requester own requests list', async () => {
      jest.spyOn(accessRequestRepo, 'findByRequester').mockResolvedValue({
        items: [{ id: REQUEST_ID, status: 'SUBMITTED' }],
        meta: { page: 1, limit: 20, total: 1, totalPages: 1 },
      });

      const token = makeToken();
      const res = await request(app)
        .get('/api/v1/access-requests/mine')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.ok).toBe(true);
      expect(res.body.data).toHaveLength(1);
    });

    it('returns request detail if user is the requester', async () => {
      jest.spyOn(accessRequestRepo, 'findDetailById').mockResolvedValue({
        id: REQUEST_ID,
        requester_id: REQUESTER_ID,
        institution_id: INSTITUTION_ID,
        status: 'UNDER_REVIEW',
      });

      const token = makeToken();
      const res = await request(app)
        .get(`/api/v1/access-requests/${REQUEST_ID}`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.ok).toBe(true);
      expect(res.body.data.id).toBe(REQUEST_ID);
    });

    it('forbids viewing another user request if not facility staff or admin', async () => {
      jest.spyOn(accessRequestRepo, 'findDetailById').mockResolvedValue({
        id: REQUEST_ID,
        requester_id: 'other-user-uuid',
        institution_id: INSTITUTION_ID,
        status: 'UNDER_REVIEW',
      });

      const token = makeToken();
      const res = await request(app)
        .get(`/api/v1/access-requests/${REQUEST_ID}`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(403);
      expect(res.body.ok).toBe(false);
    });
  });

  describe('3. Reviewer Workflow & No Self-Approval (Spec §2.2)', () => {
    it('blocks requester from starting review on their own request (403)', async () => {
      jest.spyOn(accessRequestRepo, 'findById').mockResolvedValue({
        id: REQUEST_ID,
        requester_id: REQUESTER_ID,
        status: 'SUBMITTED',
      });

      // Token sub matches request.requester_id
      const token = makeToken({ sub: REQUESTER_ID });
      const res = await request(app)
        .post(`/api/v1/access-requests/${REQUEST_ID}/start-review`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(403);
      expect(res.body.ok).toBe(false);
      expect(res.body.error.message).toMatch(/self-review is strictly prohibited/i);
    });

    it('allows a distinct reviewer to start review (SUBMITTED -> UNDER_REVIEW)', async () => {
      const mockReq = {
        id: REQUEST_ID,
        requester_id: REQUESTER_ID,
        status: 'SUBMITTED',
      };
      jest.spyOn(accessRequestRepo, 'findById').mockResolvedValue(mockReq);
      jest.spyOn(transitionService, 'transition').mockResolvedValue({
        entity: { ...mockReq, status: 'UNDER_REVIEW', reviewer_id: REVIEWER_ID },
        auditEvent: { id: 'audit-2' },
      });

      const reviewerToken = makeToken({ sub: REVIEWER_ID, role: 'MANAGER' });
      const res = await request(app)
        .post(`/api/v1/access-requests/${REQUEST_ID}/start-review`)
        .set('Authorization', `Bearer ${reviewerToken}`);

      expect(res.status).toBe(200);
      expect(res.body.ok).toBe(true);
      expect(res.body.data.status).toBe('UNDER_REVIEW');
    });

    it('blocks requester from deciding on their own request (403)', async () => {
      jest.spyOn(accessRequestRepo, 'findDetailById').mockResolvedValue({
        id: REQUEST_ID,
        requester_id: REQUESTER_ID,
        status: 'UNDER_REVIEW',
      });

      const token = makeToken({ sub: REQUESTER_ID });
      const res = await request(app)
        .post(`/api/v1/access-requests/${REQUEST_ID}/decision`)
        .set('Authorization', `Bearer ${token}`)
        .send({
          decision: 'APPROVE',
          reason: 'I approve my own request',
        });

      expect(res.status).toBe(403);
      expect(res.body.ok).toBe(false);
      expect(res.body.error.message).toMatch(/self-review is strictly prohibited/i);
    });
  });

  describe('4. Review Decisions (APPROVE, REJECT, WAITLIST)', () => {
    it('executes REJECT with mandatory reason', async () => {
      const mockReq = {
        id: REQUEST_ID,
        requester_id: REQUESTER_ID,
        status: 'UNDER_REVIEW',
      };
      jest.spyOn(accessRequestRepo, 'findDetailById').mockResolvedValue(mockReq);
      jest.spyOn(transitionService, 'transition').mockResolvedValue({
        entity: { ...mockReq, status: 'REJECTED', rejection_reason: 'Equipment unavailable' },
        auditEvent: { id: 'audit-rej' },
      });

      const reviewerToken = makeToken({ sub: REVIEWER_ID, role: 'MANAGER' });
      const res = await request(app)
        .post(`/api/v1/access-requests/${REQUEST_ID}/decision`)
        .set('Authorization', `Bearer ${reviewerToken}`)
        .send({
          decision: 'REJECT',
          reason: 'Equipment unavailable due to maintenance',
        });

      expect(res.status).toBe(200);
      expect(res.body.ok).toBe(true);
      expect(res.body.data.request.status).toBe('REJECTED');
    });

    it('executes WAITLIST and generates FIFO queue position', async () => {
      const mockReq = {
        id: REQUEST_ID,
        resource_id: RESOURCE_ID,
        requester_id: REQUESTER_ID,
        start_at: '2026-11-01T10:00:00Z',
        end_at: '2026-11-01T12:00:00Z',
        status: 'UNDER_REVIEW',
      };
      jest.spyOn(accessRequestRepo, 'findDetailById').mockResolvedValue(mockReq);
      jest.spyOn(transitionService, 'transition').mockResolvedValue({
        entity: { ...mockReq, status: 'WAITLISTED' },
        auditEvent: { id: 'audit-wait' },
      });
      jest.spyOn(accessRequestRepo, 'insertWaitlistEntry').mockResolvedValue({
        id: 'waitlist-entry-1',
        resource_id: RESOURCE_ID,
        request_id: REQUEST_ID,
        position: 1,
        status: 'PENDING',
      });

      const reviewerToken = makeToken({ sub: REVIEWER_ID, role: 'MANAGER' });
      const res = await request(app)
        .post(`/api/v1/access-requests/${REQUEST_ID}/decision`)
        .set('Authorization', `Bearer ${reviewerToken}`)
        .send({
          decision: 'WAITLIST',
          reason: 'Queueing until slot opens',
        });

      expect(res.status).toBe(200);
      expect(res.body.ok).toBe(true);
      expect(res.body.data.request.status).toBe('WAITLISTED');
      expect(res.body.data.waitlist.position).toBe(1);
    });

    it('returns 409 BOOKING_CONFLICT with alternatives when approving a colliding slot', async () => {
      const mockReq = {
        id: REQUEST_ID,
        resource_id: RESOURCE_ID,
        requester_id: REQUESTER_ID,
        start_at: '2026-11-01T10:00:00Z',
        end_at: '2026-11-01T12:00:00Z',
        status: 'UNDER_REVIEW',
      };
      jest.spyOn(accessRequestRepo, 'findDetailById').mockResolvedValue(mockReq);
      jest.spyOn(eligibilityEngine, 'checkEligibility').mockResolvedValue({
        eligible: true,
        checks: [],
      });
      jest.spyOn(accessRequestRepo, 'findOverlappingBookings').mockResolvedValue([
        { id: 'collision-booking-1', start_at: '2026-11-01T10:30:00Z', end_at: '2026-11-01T11:30:00Z' },
      ]);
      jest.spyOn(resourceRepo, 'findById').mockResolvedValue({ id: RESOURCE_ID, facility_id: FACILITY_ID });
      jest.spyOn(facilityRepo, 'findById').mockResolvedValue({ id: FACILITY_ID });

      const reviewerToken = makeToken({ sub: REVIEWER_ID, role: 'MANAGER' });
      const res = await request(app)
        .post(`/api/v1/access-requests/${REQUEST_ID}/decision`)
        .set('Authorization', `Bearer ${reviewerToken}`)
        .send({
          decision: 'APPROVE',
          reason: 'Approved request',
        });

      expect(res.status).toBe(409);
      expect(res.body.ok).toBe(false);
      expect(res.body.error.code).toBe('BOOKING_CONFLICT');
      expect(res.body.error.details.alternativeSlots).toBeDefined();
    });

    it('successfully APPROVES clean slot: creates Booking and transitions to SCHEDULED', async () => {
      const mockReq = {
        id: REQUEST_ID,
        resource_id: RESOURCE_ID,
        requester_id: REQUESTER_ID,
        start_at: '2026-11-01T10:00:00Z',
        end_at: '2026-11-01T12:00:00Z',
        status: 'UNDER_REVIEW',
      };
      jest.spyOn(accessRequestRepo, 'findDetailById').mockResolvedValue(mockReq);
      jest.spyOn(eligibilityEngine, 'checkEligibility').mockResolvedValue({
        eligible: true,
        checks: [],
      });
      jest.spyOn(accessRequestRepo, 'findOverlappingBookings').mockResolvedValue([]);
      const mockBooking = {
        id: 'booking-uuid-1',
        request_id: REQUEST_ID,
        resource_id: RESOURCE_ID,
        user_id: REQUESTER_ID,
        status: 'SCHEDULED',
      };
      jest.spyOn(accessRequestRepo, 'createBooking').mockResolvedValue(mockBooking);
      jest.spyOn(transitionService, 'transition')
        .mockResolvedValueOnce({ entity: { ...mockReq, status: 'APPROVED' }, auditEvent: {} })
        .mockResolvedValueOnce({ entity: { ...mockReq, status: 'SCHEDULED' }, auditEvent: {} });

      const reviewerToken = makeToken({ sub: REVIEWER_ID, role: 'MANAGER' });
      const res = await request(app)
        .post(`/api/v1/access-requests/${REQUEST_ID}/decision`)
        .set('Authorization', `Bearer ${reviewerToken}`)
        .send({
          decision: 'APPROVE',
          reason: 'Approved clean slot',
        });

      expect(res.status).toBe(200);
      expect(res.body.ok).toBe(true);
      expect(res.body.data.booking.status).toBe('SCHEDULED');
      expect(res.body.data.request.status).toBe('SCHEDULED');
    });
  });

  describe('5. Appeals Workflow', () => {
    it('allows requester to appeal a rejection, transitioning back to UNDER_REVIEW', async () => {
      const mockReq = {
        id: REQUEST_ID,
        requester_id: REQUESTER_ID,
        status: 'REJECTED',
        appeal_count: 0,
      };
      jest.spyOn(accessRequestRepo, 'findById').mockResolvedValue(mockReq);
      jest.spyOn(transitionService, 'transition').mockResolvedValue({
        entity: { ...mockReq, status: 'UNDER_REVIEW', appeal_count: 1 },
        auditEvent: { id: 'audit-appeal' },
      });

      const token = makeToken();
      const res = await request(app)
        .post(`/api/v1/access-requests/${REQUEST_ID}/appeal`)
        .set('Authorization', `Bearer ${token}`)
        .send({
          reason: 'Project timeline has been expedited by dean approval',
        });

      expect(res.status).toBe(200);
      expect(res.body.ok).toBe(true);
      expect(res.body.data.status).toBe('UNDER_REVIEW');
      expect(res.body.data.appeal_count).toBe(1);
    });

    it('rejects a second appeal attempt (appeal_count >= 1)', async () => {
      const mockReq = {
        id: REQUEST_ID,
        requester_id: REQUESTER_ID,
        status: 'REJECTED',
        appeal_count: 1, // already appealed once
      };
      jest.spyOn(accessRequestRepo, 'findById').mockResolvedValue(mockReq);

      const token = makeToken();
      const res = await request(app)
        .post(`/api/v1/access-requests/${REQUEST_ID}/appeal`)
        .set('Authorization', `Bearer ${token}`)
        .send({
          reason: 'Second appeal attempt should fail',
        });

      expect(res.status).toBe(400);
      expect(res.body.ok).toBe(false);
      expect(res.body.error.message).toMatch(/only one appeal is permitted/i);
    });
  });
});
