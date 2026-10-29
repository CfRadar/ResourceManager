'use strict';

/**
 * tests/incidents.test.js
 *
 * Step 09 — Incidents, Notes, Impartial Rulings, Appeals, and AI Summaries (Spec §4.16).
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
const { incidentRepo }       = require('../src/modules/incidents/incidents.repository');
const transitionService      = require('../src/services/transition');
const aiClient               = require('../src/services/aiClient');

const app = createApp();

const REPORTER_ID = '11111111-1111-4111-8111-111111111111';
const REVIEWER_ID = '22222222-2222-4222-8222-222222222222';
const BOOKING_USER_ID = '33333333-3333-4333-8333-333333333333';
const INCIDENT_ID = '44444444-4444-4444-8444-444444444444';
const BOOKING_ID  = '55555555-5555-4555-8555-555555555555';

function makeToken(payload = {}) {
  return jwt.sign(
    {
      sub:         REPORTER_ID,
      role:        'REQUESTER',
      memberships: [],
      ...payload,
    },
    process.env.JWT_ACCESS_SECRET,
    { algorithm: 'HS256', expiresIn: '15m' }
  );
}

describe('Step 09 — Incidents & Dispute Resolution', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('1. POST /api/v1/incidents (Filing)', () => {
    it('rejects unauthenticated requests with 401', async () => {
      const res = await request(app).post('/api/v1/incidents').send({});
      expect(res.status).toBe(401);
    });

    it('rejects description shorter than 10 chars with 400', async () => {
      const token = makeToken();
      const res = await request(app)
        .post('/api/v1/incidents')
        .set('Authorization', `Bearer ${token}`)
        .send({
          type:        'DAMAGE',
          description: 'Broken',
        });
      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('files an incident successfully in REPORTED state', async () => {
      jest.spyOn(incidentRepo, 'insert').mockResolvedValue({
        id:          INCIDENT_ID,
        type:        'DAMAGE',
        description: 'Diamond diamond knife edge chipped during ultrathin sectioning',
        status:      'REPORTED',
      });
      jest.spyOn(incidentRepo, 'insertNote').mockResolvedValue({});

      const token = makeToken();
      const res = await request(app)
        .post('/api/v1/incidents')
        .set('Authorization', `Bearer ${token}`)
        .send({
          bookingId:          BOOKING_ID,
          type:               'DAMAGE',
          description:        'Diamond diamond knife edge chipped during ultrathin sectioning',
          severityByReporter: 'HIGH',
        });
      expect(res.status).toBe(201);
      expect(res.body.ok).toBe(true);
      expect(res.body.data.status).toBe('REPORTED');
    });
  });

  describe('2. Detail & Role-Gated Note Visibility', () => {
    it('redacts INTERNAL staff notes for regular requester callers', async () => {
      jest.spyOn(incidentRepo, 'findDetailById').mockResolvedValue({
        id:              INCIDENT_ID,
        reporter_id:     REPORTER_ID,
        booking_user_id: BOOKING_USER_ID,
        status:          'REPORTED',
      });
      jest.spyOn(incidentRepo, 'findNotes').mockResolvedValue([
        { id: 'note-1', content: 'Statement from user', visibility: 'SHARED' },
      ]);

      const token = makeToken({ sub: REPORTER_ID, role: 'REQUESTER' });
      const res = await request(app)
        .get(`/api/v1/incidents/${INCIDENT_ID}`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(incidentRepo.findNotes).toHaveBeenCalledWith(INCIDENT_ID, {
        includeInternal: false,
      });
      expect(res.body.data.notes.length).toBe(1);
    });

    it('includes INTERNAL notes for managers', async () => {
      jest.spyOn(incidentRepo, 'findDetailById').mockResolvedValue({
        id:              INCIDENT_ID,
        reporter_id:     REPORTER_ID,
        booking_user_id: BOOKING_USER_ID,
        status:          'UNDER_REVIEW',
      });
      jest.spyOn(incidentRepo, 'findNotes').mockResolvedValue([
        { id: 'note-1', content: 'Shared note', visibility: 'SHARED' },
        { id: 'note-2', content: 'Internal staff assessment', visibility: 'INTERNAL' },
      ]);

      const token = makeToken({ sub: REVIEWER_ID, role: 'MANAGER' });
      const res = await request(app)
        .get(`/api/v1/incidents/${INCIDENT_ID}`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(incidentRepo.findNotes).toHaveBeenCalledWith(INCIDENT_ID, {
        includeInternal: true,
      });
      expect(res.body.data.notes.length).toBe(2);
    });
  });

  describe('3. Info Requests & Right of Reply', () => {
    it('manager requests info advancing status to INFO_REQUESTED', async () => {
      jest.spyOn(incidentRepo, 'findDetailById').mockResolvedValue({
        id:          INCIDENT_ID,
        reporter_id: REPORTER_ID,
        status:      'REPORTED',
      });
      jest.spyOn(incidentRepo, 'insertNote').mockResolvedValue({});
      jest.spyOn(transitionService, 'transition')
        .mockResolvedValueOnce({ entity: { id: INCIDENT_ID, status: 'UNDER_REVIEW' } })
        .mockResolvedValueOnce({ entity: { id: INCIDENT_ID, status: 'INFO_REQUESTED' } });

      const token = makeToken({ sub: REVIEWER_ID, role: 'MANAGER' });
      const res = await request(app)
        .post(`/api/v1/incidents/${INCIDENT_ID}/request-info`)
        .set('Authorization', `Bearer ${token}`)
        .send({ message: 'Please provide optical microscope photo of the knife edge' });

      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe('INFO_REQUESTED');
    });

    it('party responds with right-of-reply evidence statement returning to UNDER_REVIEW', async () => {
      jest.spyOn(incidentRepo, 'findDetailById').mockResolvedValue({
        id:          INCIDENT_ID,
        reporter_id: REPORTER_ID,
        status:      'INFO_REQUESTED',
      });
      jest.spyOn(incidentRepo, 'insertNote').mockResolvedValue({});
      jest.spyOn(transitionService, 'transition').mockResolvedValue({
        entity: { id: INCIDENT_ID, status: 'UNDER_REVIEW' },
      });

      const token = makeToken({ sub: REPORTER_ID, role: 'REQUESTER' });
      const res = await request(app)
        .post(`/api/v1/incidents/${INCIDENT_ID}/respond`)
        .set('Authorization', `Bearer ${token}`)
        .send({ responseContent: 'High-res micrograph showing pre-existing flaw' });

      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe('UNDER_REVIEW');
    });
  });

  describe('4. Impartial Rulings & Strict Lockouts', () => {
    it('rejects ruling if reviewer is the reporter', async () => {
      jest.spyOn(incidentRepo, 'findDetailById').mockResolvedValue({
        id:          INCIDENT_ID,
        reporter_id: REVIEWER_ID, // same as reviewer
        status:      'UNDER_REVIEW',
      });

      const token = makeToken({ sub: REVIEWER_ID, role: 'MANAGER' });
      const res = await request(app)
        .post(`/api/v1/incidents/${INCIDENT_ID}/resolve`)
        .set('Authorization', `Bearer ${token}`)
        .send({
          outcome:  'RESOLVED',
          findings: 'Operator error observed on security camera',
          reason:   'Damage caused by mishandling',
        });
      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('FORBIDDEN');
    });

    it('rejects ruling if reviewer is party to the booking', async () => {
      jest.spyOn(incidentRepo, 'findDetailById').mockResolvedValue({
        id:              INCIDENT_ID,
        reporter_id:     REPORTER_ID,
        booking_user_id: REVIEWER_ID, // reviewer was the booking user
        status:          'UNDER_REVIEW',
      });

      const token = makeToken({ sub: REVIEWER_ID, role: 'MANAGER' });
      const res = await request(app)
        .post(`/api/v1/incidents/${INCIDENT_ID}/resolve`)
        .set('Authorization', `Bearer ${token}`)
        .send({
          outcome:  'DISMISSED',
          findings: 'No fault found',
          reason:   'Accidental wear and tear',
        });
      expect(res.status).toBe(403);
      expect(res.body.error.message).toMatch(/Reviewer is a party to the incident/);
    });

    it('impartial manager resolves incident with findings and recommended remedy', async () => {
      jest.spyOn(incidentRepo, 'findDetailById').mockResolvedValue({
        id:              INCIDENT_ID,
        reporter_id:     REPORTER_ID,
        booking_user_id: BOOKING_USER_ID,
        status:          'UNDER_REVIEW',
      });
      jest.spyOn(transitionService, 'transition').mockResolvedValue({
        entity: { id: INCIDENT_ID, status: 'RESOLVED' },
      });

      const token = makeToken({ sub: REVIEWER_ID, role: 'MANAGER' });
      const res = await request(app)
        .post(`/api/v1/incidents/${INCIDENT_ID}/resolve`)
        .set('Authorization', `Bearer ${token}`)
        .send({
          outcome:  'RESOLVED',
          findings: 'Evidence supports pre-existing fatigue on blade edge',
          remedy:   { type: 'TRAINING_REQUIRED', tokens: 10 },
          reason:   'Replaced under equipment maintenance fund with refresher required',
        });
      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe('RESOLVED');
    });
  });

  describe('5. Escalation Appeals & Single Appeal Limit', () => {
    it('party escalates ruling to secondary committee via appeal', async () => {
      jest.spyOn(incidentRepo, 'findDetailById').mockResolvedValue({
        id:           INCIDENT_ID,
        status:       'RESOLVED',
        appeal_count: 0,
      });
      jest.spyOn(incidentRepo, 'insertNote').mockResolvedValue({});
      jest.spyOn(transitionService, 'transition')
        .mockResolvedValueOnce({ entity: { id: INCIDENT_ID, status: 'APPEALED', appeal_count: 1 } })
        .mockResolvedValueOnce({ entity: { id: INCIDENT_ID, status: 'UNDER_REVIEW', appeal_count: 1 } });

      const token = makeToken({ sub: REPORTER_ID, role: 'REQUESTER' });
      const res = await request(app)
        .post(`/api/v1/incidents/${INCIDENT_ID}/appeal`)
        .set('Authorization', `Bearer ${token}`)
        .send({ appealReason: 'Additional witness statement proves prior damage before session' });

      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe('UNDER_REVIEW');
    });

    it('rejects second appeal attempt exceeding single appeal limit', async () => {
      jest.spyOn(incidentRepo, 'findDetailById').mockResolvedValue({
        id:           INCIDENT_ID,
        status:       'RESOLVED',
        appeal_count: 1, // Already appealed once
      });

      const token = makeToken({ sub: REPORTER_ID, role: 'REQUESTER' });
      const res = await request(app)
        .post(`/api/v1/incidents/${INCIDENT_ID}/appeal`)
        .set('Authorization', `Bearer ${token}`)
        .send({ appealReason: 'Second appeal attempt' });

      expect(res.status).toBe(400);
      expect(res.body.error.message).toMatch(/Maximum of 1 appeal permitted/);
    });
  });

  describe('6. AI-Assisted Incident Summary Drafting', () => {
    it('generates incident summary draft via AI or deterministic fallback', async () => {
      jest.spyOn(incidentRepo, 'findDetailById').mockResolvedValue({
        id:                     INCIDENT_ID,
        type:                   'DAMAGE',
        description:            'Sample holder bent during specimen insertion',
        status:                 'UNDER_REVIEW',
        severity_by_reporter:   'HIGH',
        appeal_count:           0,
      });
      jest.spyOn(aiClient, 'post').mockRejectedValue(new Error('AI offline'));

      const token = makeToken({ sub: REVIEWER_ID, role: 'MANAGER' });
      const res = await request(app)
        .post(`/api/v1/incidents/${INCIDENT_ID}/draft-summary`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.data.demo).toBe(true);
      expect(res.body.data.summary).toContain('DAMAGE');
      expect(res.body.data.source).toBe('DETERMINISTIC_FALLBACK');
    });
  });
});

