'use strict';

/**
 * tests/referrals.test.js
 *
 * Step 08 — Missing-Resource Need Requests and Cross-Institutional Referrals (Spec §4.14).
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

const { createApp }          = require('../src/app');
const { needRequestRepo }   = require('../src/modules/needRequests/needRequests.repository');
const { referralRepo }      = require('../src/modules/referrals/referrals.repository');
const transitionService      = require('../src/services/transition');
const aiClient              = require('../src/services/aiClient');

const app = createApp();

const REQUESTER_ID        = '11111111-1111-4111-8111-111111111111';
const COORDINATOR_ID      = '22222222-2222-4222-8222-222222222222';
const RECEIVER_ID         = '33333333-3333-4333-8333-333333333333';
const INSTITUTION_HOST_ID = '44444444-4444-4444-8444-444444444444';
const INSTITUTION_PARTNER = '55555555-5555-4555-8555-555555555555';
const NEED_ID             = '66666666-6666-4666-8666-666666666666';
const REFERRAL_ID         = '77777777-7777-4777-8777-777777777777';
const RESOURCE_ID         = '88888888-8888-4888-8888-888888888888';

function makeToken(payload = {}) {
  return jwt.sign(
    {
      sub:         REQUESTER_ID,
      role:        'REQUESTER',
      memberships: [{ institutionId: INSTITUTION_HOST_ID, role: 'MEMBER' }],
      ...payload,
    },
    process.env.JWT_ACCESS_SECRET,
    { algorithm: 'HS256', expiresIn: '15m' }
  );
}

describe('Step 08 — Missing-Resource Need Requests & Cross-Institutional Referrals', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('1. POST /api/v1/need-requests (Creation & Intake)', () => {
    it('rejects unauthenticated calls with 401', async () => {
      const res = await request(app).post('/api/v1/need-requests').send({});
      expect(res.status).toBe(401);
    });

    it('creates a missing-resource request successfully', async () => {
      jest.spyOn(needRequestRepo, 'insert').mockResolvedValue({
        id:          NEED_ID,
        category:    'Electron Microscopy',
        description: 'Need Cryo-TEM time for protein structure determination',
        status:      'SUBMITTED',
      });

      const token = makeToken();
      const res = await request(app)
        .post('/api/v1/need-requests')
        .set('Authorization', `Bearer ${token}`)
        .send({
          category:              'Electron Microscopy',
          description:           'Need Cryo-TEM time for protein structure determination',
          technicalRequirements: ['300kV', 'Autoloader', 'K3 Detector'],
          consentShareContact:   true,
        });
      expect(res.status).toBe(201);
      expect(res.body.ok).toBe(true);
      expect(res.body.data.id).toBe(NEED_ID);
    });
  });

  describe('2. Candidate Discovery (AI & Fallback)', () => {
    it('queries candidate resources and falls back gracefully when AI is offline', async () => {
      jest.spyOn(needRequestRepo, 'findDetailById').mockResolvedValue({
        id:                    NEED_ID,
        category:              'Electron Microscopy',
        description:           'Need Cryo-TEM time',
        required_capabilities: ['300kV'],
        status:                'SUBMITTED',
      });
      jest.spyOn(aiClient, 'post').mockRejectedValue(new Error('AI offline'));
      jest.spyOn(needRequestRepo, 'findCandidateResources').mockResolvedValue([
        {
          resource_id:           RESOURCE_ID,
          resource_name:         'Titan Krios 300kV Cryo-TEM',
          resource_category:     'Electron Microscopy',
          facility_id:           'fa1-1111-2222-3333-444444444444',
          facility_name:         'Advanced Bio-Imaging Center',
          institution_id:        INSTITUTION_PARTNER,
          institution_name:      'Partner Institute of Science',
        },
      ]);
      jest.spyOn(transitionService, 'transition').mockResolvedValue({
        entity: { id: NEED_ID, status: 'CANDIDATE_IDENTIFIED' },
      });

      const token = makeToken({ sub: COORDINATOR_ID, role: 'COORDINATOR' });
      const res = await request(app)
        .get(`/api/v1/need-requests/${NEED_ID}/candidates`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.data.candidates.length).toBe(1);
      expect(res.body.data.candidates[0].resourceName).toBe('Titan Krios 300kV Cryo-TEM');
      expect(res.body.data.engine).toBe('KEYWORD_FALLBACK');
    });
  });

  describe('3. Cross-Institutional Referral Dispatch', () => {
    it('coordinator creates and dispatches a referral to partner institution', async () => {
      jest.spyOn(needRequestRepo, 'findDetailById').mockResolvedValue({
        id:       NEED_ID,
        category: 'Electron Microscopy',
      });
      jest.spyOn(referralRepo, 'insert').mockResolvedValue({
        id:                    REFERRAL_ID,
        need_request_id:       NEED_ID,
        target_institution_id: INSTITUTION_PARTNER,
        status:                'REFERRAL_SENT',
        contact_released:      false,
      });

      const token = makeToken({ sub: COORDINATOR_ID, role: 'COORDINATOR' });
      const res = await request(app)
        .post(`/api/v1/need-requests/${NEED_ID}/referrals`)
        .set('Authorization', `Bearer ${token}`)
        .send({
          toInstitutionId:   INSTITUTION_PARTNER,
          resourceId:        RESOURCE_ID,
          messageToReceiver: 'Researcher requires 2 sessions on your Cryo-TEM for cryo-EM data collection',
        });
      expect(res.status).toBe(201);
      expect(res.body.data.status).toBe('REFERRAL_SENT');
      expect(res.body.data.contact_released).toBe(false);
    });
  });

  describe('4. Receiving Institution Inbox & Privacy Redaction', () => {
    it('withholds requester contact info in inbox when contact_released is false', async () => {
      jest.spyOn(referralRepo, 'findInbox').mockResolvedValue({
        items: [
          {
            id:                  REFERRAL_ID,
            need_category:       'Electron Microscopy',
            target_institution_name: 'Partner Institute of Science',
            requester_name:      'Dr. Alice Researcher',
            requester_email:     'alice@university.edu',
            contact_released:    false,
          },
        ],
        total: 1,
        page:  1,
        limit: 20,
      });

      const token = makeToken({
        sub:         RECEIVER_ID,
        role:        'MANAGER',
        memberships: [{ institutionId: INSTITUTION_PARTNER, role: 'MANAGER' }],
      });
      const res = await request(app)
        .get('/api/v1/referrals/inbox')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.data[0].requester_email).toBe('[WITHHELD - Contact not released]');
    });
  });

  describe('5. Referral Response & Self-Approval Prevention', () => {
    it('rejects response from user not affiliated with the receiving institution', async () => {
      jest.spyOn(referralRepo, 'findDetailById').mockResolvedValue({
        id:                    REFERRAL_ID,
        target_institution_id: INSTITUTION_PARTNER,
        requester_id:          REQUESTER_ID,
        status:                'REFERRAL_SENT',
      });

      // User belongs to INSTITUTION_HOST_ID, not INSTITUTION_PARTNER
      const token = makeToken({
        sub:         '99999999-9999-9999-9999-999999999999',
        role:        'MANAGER',
        memberships: [{ institutionId: INSTITUTION_HOST_ID, role: 'MANAGER' }],
      });
      const res = await request(app)
        .post(`/api/v1/referrals/${REFERRAL_ID}/respond`)
        .set('Authorization', `Bearer ${token}`)
        .send({
          response:        'ACCEPT',
          responseMessage: 'We have availability next month',
        });
      expect(res.status).toBe(403);
      expect(res.body.error.message).toMatch(/Only users affiliated with the receiving institution/);
    });

    it('enforces assertNoSelfApproval if responder is also the requester', async () => {
      jest.spyOn(referralRepo, 'findDetailById').mockResolvedValue({
        id:                    REFERRAL_ID,
        target_institution_id: INSTITUTION_PARTNER,
        requester_id:          RECEIVER_ID, // same as responder
        status:                'REFERRAL_SENT',
      });

      const token = makeToken({
        sub:         RECEIVER_ID,
        role:        'MANAGER',
        memberships: [{ institutionId: INSTITUTION_PARTNER, role: 'MANAGER' }],
      });
      const res = await request(app)
        .post(`/api/v1/referrals/${REFERRAL_ID}/respond`)
        .set('Authorization', `Bearer ${token}`)
        .send({
          response:        'ACCEPT',
          responseMessage: 'We have availability',
        });
      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('FORBIDDEN');
    });

    it('receiving institution accepts referral (ACCEPTED)', async () => {
      jest.spyOn(referralRepo, 'findDetailById').mockResolvedValue({
        id:                    REFERRAL_ID,
        target_institution_id: INSTITUTION_PARTNER,
        requester_id:          REQUESTER_ID,
        status:                'REFERRAL_SENT',
      });
      jest.spyOn(transitionService, 'transition').mockResolvedValue({
        entity: { id: REFERRAL_ID, status: 'ACCEPTED' },
      });

      const token = makeToken({
        sub:         RECEIVER_ID,
        role:        'MANAGER',
        memberships: [{ institutionId: INSTITUTION_PARTNER, role: 'MANAGER' }],
      });
      const res = await request(app)
        .post(`/api/v1/referrals/${REFERRAL_ID}/respond`)
        .set('Authorization', `Bearer ${token}`)
        .send({
          response:        'ACCEPT',
          responseMessage: 'We can accommodate your Cryo-TEM session on Nov 15th',
          nextSteps:       'Contact facility manager for grid preparation protocols',
        });
      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe('ACCEPTED');
    });
  });

  describe('6. Contact Release Gating', () => {
    it('rejects contact release if requester did not consent', async () => {
      jest.spyOn(referralRepo, 'findDetailById').mockResolvedValue({
        id:                  REFERRAL_ID,
        status:              'ACCEPTED',
        requester_consented: false, // No consent
      });

      const token = makeToken({ sub: COORDINATOR_ID, role: 'COORDINATOR' });
      const res = await request(app)
        .post(`/api/v1/referrals/${REFERRAL_ID}/release-contact`)
        .set('Authorization', `Bearer ${token}`)
        .send({ note: 'Releasing email' });
      expect(res.status).toBe(400);
      expect(res.body.error.message).toMatch(/Requester has not given consent/);
    });

    it('rejects contact release if referral has not been accepted', async () => {
      jest.spyOn(referralRepo, 'findDetailById').mockResolvedValue({
        id:                  REFERRAL_ID,
        status:              'REFERRAL_SENT', // not yet accepted
        requester_consented: true,
      });

      const token = makeToken({ sub: COORDINATOR_ID, role: 'COORDINATOR' });
      const res = await request(app)
        .post(`/api/v1/referrals/${REFERRAL_ID}/release-contact`)
        .set('Authorization', `Bearer ${token}`)
        .send({ note: 'Releasing email' });
      expect(res.status).toBe(400);
      expect(res.body.error.message).toMatch(/can only be released after the referral has been accepted/);
    });

    it('releases contact info successfully when consented and accepted', async () => {
      jest.spyOn(referralRepo, 'findDetailById').mockResolvedValue({
        id:                    REFERRAL_ID,
        status:                'ACCEPTED',
        requester_consented:   true,
        target_institution_id: INSTITUTION_PARTNER,
        requester_email:       'alice@university.edu',
      });
      jest.spyOn(referralRepo, 'update').mockResolvedValue({
        id:               REFERRAL_ID,
        contact_released: true,
      });

      const token = makeToken({ sub: COORDINATOR_ID, role: 'COORDINATOR' });
      const res = await request(app)
        .post(`/api/v1/referrals/${REFERRAL_ID}/release-contact`)
        .set('Authorization', `Bearer ${token}`)
        .send({ note: 'Releasing contact details following acceptance' });
      expect(res.status).toBe(200);
      expect(res.body.data.contact_released).toBe(true);
      expect(res.body.data.requester_email).toBe('alice@university.edu');
    });
  });

  describe('7. POST /api/v1/need-requests/:id/close (Closure)', () => {
    it('coordinator closes need request as CLOSED_MET', async () => {
      jest.spyOn(needRequestRepo, 'findDetailById').mockResolvedValue({
        id:     NEED_ID,
        status: 'CANDIDATE_IDENTIFIED',
      });
      jest.spyOn(transitionService, 'transition').mockResolvedValue({
        entity: { id: NEED_ID, status: 'CLOSED_MET' },
      });

      const token = makeToken({ sub: COORDINATOR_ID, role: 'COORDINATOR' });
      const res = await request(app)
        .post(`/api/v1/need-requests/${NEED_ID}/close`)
        .set('Authorization', `Bearer ${token}`)
        .send({
          outcome:     'CLOSED_MET',
          closeReason: 'Partner institute referral accepted and booked',
        });
      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe('CLOSED_MET');
    });
  });
});

