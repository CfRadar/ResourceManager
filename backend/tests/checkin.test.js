'use strict';

/**
 * tests/checkin.test.js
 *
 * Step 07 — Check-in, Start-use, Check-out, Physical Return Confirmation,
 * Soft Haversine Geofencing, Virtual Electronic Signatures, and Automated Condition Diffing.
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
const { bookingRepo }        = require('../src/modules/bookings/bookings.repository');
const { checkInRepo }        = require('../src/modules/checkin/checkin.repository');
const transitionService      = require('../src/services/transition');
const { evaluateGeofence, calculateHaversineDistance } = require('../src/utils/geo');

const app = createApp();

const REQUESTER_ID   = '11111111-1111-4111-8111-111111111111';
const OTHER_USER_ID  = '99999999-9999-4999-8999-999999999999';
const MANAGER_ID     = '22222222-2222-4222-8222-222222222222';
const INSTITUTION_ID = '55555555-5555-4555-8555-555555555555';
const FACILITY_ID    = '44444444-4444-4444-8444-444444444444';
const RESOURCE_ID    = '33333333-3333-4333-8333-333333333333';
const BOOKING_ID     = '77777777-7777-4777-8777-777777777777';

function makeToken(payload = {}) {
  return jwt.sign(
    {
      sub:         REQUESTER_ID,
      role:        'REQUESTER',
      memberships: [],
      ...payload,
    },
    process.env.JWT_ACCESS_SECRET,
    { expiresIn: '1h' }
  );
}

const requesterToken = makeToken();
const otherUserToken = makeToken({ sub: OTHER_USER_ID });
const managerToken   = makeToken({
  sub: MANAGER_ID,
  role: 'MANAGER',
  memberships: [{ institutionId: INSTITUTION_ID, role: 'MANAGER' }],
});

// Mock booking starting right now so check-in window is open
const mockScheduledBooking = {
  id:                     BOOKING_ID,
  resource_id:            RESOURCE_ID,
  user_id:                REQUESTER_ID,
  request_id:             '66666666-6666-4666-8666-666666666666',
  start_at:               new Date(Date.now() + 5 * 60000).toISOString(), // 5 min in future (within 15m window)
  end_at:                 new Date(Date.now() + 3600000).toISOString(),
  status:                 'SCHEDULED',
  resource_name:          'Spectrometer UV-2600',
  facility_id:            FACILITY_ID,
  facility_name:          'Central Analytical Lab',
  facility_lat:           40.7128,
  facility_lng:           -74.0060,
  geofence_radius_meters: 100,
  grace_period_minutes:   15,
  institution_id:         INSTITUTION_ID,
};

describe('Check-In & Physical Returns Module — Step 07', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  // ── 0. Haversine & Geofence Utility Unit Tests ─────────────────────────────
  describe('Geofence & Haversine Utilities', () => {
    it('calculates 0 distance for identical coordinates', () => {
      const d = calculateHaversineDistance(40.7128, -74.0060, 40.7128, -74.0060);
      expect(d).toBeCloseTo(0, 1);
    });

    it('evaluates WITHIN when user is inside geofence radius', () => {
      // 10 meters away from facility
      const status = evaluateGeofence(
        { lat: 40.7128, lng: -74.0060 },
        { lat: 40.71281, lng: -74.00601, accuracy: 5 },
        100
      );
      expect(status).toBe('WITHIN');
    });

    it('evaluates OUTSIDE when user is beyond geofence radius', () => {
      // ~10 km away
      const status = evaluateGeofence(
        { lat: 40.7128, lng: -74.0060 },
        { lat: 40.8000, lng: -74.0060, accuracy: 5 },
        100
      );
      expect(status).toBe('OUTSIDE');
    });

    it('evaluates NOT_PROVIDED when coords are missing', () => {
      const status = evaluateGeofence({ lat: 40.7128, lng: -74.0060 }, null, 100);
      expect(status).toBe('NOT_PROVIDED');
    });
  });

  // ── 1. POST /api/v1/bookings/:id/check-in ──────────────────────────────────
  describe('POST /api/v1/bookings/:id/check-in', () => {
    const validCheckInPayload = {
      equipmentUnitId: 'unit_spec_01',
      accessories: ['quartz_cuvette_1cm', 'calibration_filter'],
      conditionReport: {
        rating: 5,
        notes:  'Optical chamber clean and spotless.',
        photos: ['photo_ref_01'],
      },
      signature: {
        type: 'TYPED',
        text: 'Jane Requester',
      },
      geo: {
        lat: 40.7128,
        lng: -74.0060,
        accuracy: 10,
      },
    };

    it('returns 404 if booking not found', async () => {
      jest.spyOn(bookingRepo, 'findDetailById').mockResolvedValueOnce(null);

      const res = await request(app)
        .post(`/api/v1/bookings/${BOOKING_ID}/check-in`)
        .set('Authorization', `Bearer ${requesterToken}`)
        .send(validCheckInPayload);

      expect(res.status).toBe(404);
    });

    it('returns 403 if unauthorized user attempts check-in', async () => {
      jest.spyOn(bookingRepo, 'findDetailById').mockResolvedValueOnce(mockScheduledBooking);

      const res = await request(app)
        .post(`/api/v1/bookings/${BOOKING_ID}/check-in`)
        .set('Authorization', `Bearer ${otherUserToken}`)
        .send(validCheckInPayload);

      expect(res.status).toBe(403);
    });

    it('returns 400 when check-in is attempted too early (> 15 min before start)', async () => {
      const wayInFuture = new Date(Date.now() + 120 * 60000).toISOString(); // 2 hours in future
      jest.spyOn(bookingRepo, 'findDetailById').mockResolvedValueOnce({
        ...mockScheduledBooking,
        start_at: wayInFuture,
      });

      const res = await request(app)
        .post(`/api/v1/bookings/${BOOKING_ID}/check-in`)
        .set('Authorization', `Bearer ${requesterToken}`)
        .send(validCheckInPayload);

      expect(res.status).toBe(400);
      expect(res.body.error.message).toMatch(/Check-in window opens 15 minutes prior/);
    });

    it('returns 400 when check-in is attempted after grace period has expired', async () => {
      const wayInPast = new Date(Date.now() - 60 * 60000).toISOString(); // 1 hour ago
      jest.spyOn(bookingRepo, 'findDetailById').mockResolvedValueOnce({
        ...mockScheduledBooking,
        start_at: wayInPast,
        grace_period_minutes: 15,
      });

      const res = await request(app)
        .post(`/api/v1/bookings/${BOOKING_ID}/check-in`)
        .set('Authorization', `Bearer ${requesterToken}`)
        .send(validCheckInPayload);

      expect(res.status).toBe(400);
      expect(res.body.error.message).toMatch(/Check-in window closed/);
    });

    it('returns 200 on successful check-in with BEFORE report, soft geofence, and virtual signature', async () => {
      jest.spyOn(bookingRepo, 'findDetailById').mockResolvedValueOnce(mockScheduledBooking);
      jest.spyOn(checkInRepo, 'saveReport').mockResolvedValueOnce({
        id: 'cr_before_01',
        booking_id: BOOKING_ID,
        kind: 'BEFORE',
        rating: 5,
      });
      jest.spyOn(transitionService, 'transition').mockResolvedValueOnce({
        entity: { ...mockScheduledBooking, status: 'CHECKED_IN' },
      });

      const res = await request(app)
        .post(`/api/v1/bookings/${BOOKING_ID}/check-in`)
        .set('Authorization', `Bearer ${requesterToken}`)
        .send(validCheckInPayload);

      expect(res.status).toBe(200);
      expect(res.body.ok).toBe(true);
      expect(res.body.data.booking.status).toBe('CHECKED_IN');
      expect(res.body.data.conditionReport.kind).toBe('BEFORE');
    });
  });

  // ── 2. POST /api/v1/bookings/:id/start-use ─────────────────────────────────
  describe('POST /api/v1/bookings/:id/start-use', () => {
    it('returns 400 if booking is not CHECKED_IN', async () => {
      jest.spyOn(bookingRepo, 'findDetailById').mockResolvedValueOnce(mockScheduledBooking); // SCHEDULED

      const res = await request(app)
        .post(`/api/v1/bookings/${BOOKING_ID}/start-use`)
        .set('Authorization', `Bearer ${requesterToken}`);

      expect(res.status).toBe(400);
      expect(res.body.error.message).toMatch(/Cannot start use on booking in status 'SCHEDULED'/);
    });

    it('returns 200 and transitions status to IN_USE', async () => {
      jest.spyOn(bookingRepo, 'findDetailById').mockResolvedValueOnce({
        ...mockScheduledBooking,
        status: 'CHECKED_IN',
      });
      jest.spyOn(transitionService, 'transition').mockResolvedValueOnce({
        entity: { ...mockScheduledBooking, status: 'IN_USE' },
      });

      const res = await request(app)
        .post(`/api/v1/bookings/${BOOKING_ID}/start-use`)
        .set('Authorization', `Bearer ${requesterToken}`);

      expect(res.status).toBe(200);
      expect(res.body.ok).toBe(true);
      expect(res.body.data.status).toBe('IN_USE');
    });
  });

  // ── 3. POST /api/v1/bookings/:id/check-out ────────────────────────────────
  describe('POST /api/v1/bookings/:id/check-out', () => {
    const validCheckOutPayload = {
      accessoriesReturned: ['quartz_cuvette_1cm'], // missing calibration_filter!
      consumablesUsed:     [{ item: 'lens_paper', quantity: 2 }],
      conditionReport: {
        rating: 3, // Rating dropped from 5 to 3 (drop of 2!)
        notes:  'Calibration filter accidentally misplaced in drawer 2',
        photos: ['photo_ref_02'],
      },
      signature: {
        type: 'TYPED',
        text: 'Jane Requester',
      },
    };

    const mockBeforeReport = {
      id: 'cr_before_01',
      booking_id: BOOKING_ID,
      kind: 'BEFORE',
      rating: 5,
      accessories: ['quartz_cuvette_1cm', 'calibration_filter'],
    };

    it('returns 200 on check-out, updates status to RETURNED, and computes condition diff', async () => {
      jest.spyOn(bookingRepo, 'findDetailById').mockResolvedValueOnce({
        ...mockScheduledBooking,
        status: 'IN_USE',
      });
      jest.spyOn(checkInRepo, 'saveReport').mockResolvedValueOnce({
        id: 'cr_after_01',
        booking_id: BOOKING_ID,
        kind: 'AFTER',
        rating: 3,
        accessories: ['quartz_cuvette_1cm'],
      });
      jest.spyOn(transitionService, 'transition').mockResolvedValueOnce({
        entity: { ...mockScheduledBooking, status: 'RETURNED' },
      });
      jest.spyOn(checkInRepo, 'findReportByKind').mockResolvedValueOnce(mockBeforeReport);

      const res = await request(app)
        .post(`/api/v1/bookings/${BOOKING_ID}/check-out`)
        .set('Authorization', `Bearer ${requesterToken}`)
        .send(validCheckOutPayload);

      expect(res.status).toBe(200);
      expect(res.body.ok).toBe(true);
      expect(res.body.data.booking.status).toBe('RETURNED');

      // Automated diff assertions
      const diff = res.body.data.diff;
      expect(diff).toBeDefined();
      expect(diff.beforeRating).toBe(5);
      expect(diff.afterRating).toBe(3);
      expect(diff.ratingDrop).toBe(2);
      expect(diff.ratingFlagged).toBe(true);
      expect(diff.hasMissingAccessories).toBe(true);
      expect(diff.missingAccessories).toContain('calibration_filter');
      expect(diff.requiresInspection).toBe(true);
    });
  });

  // ── 4. POST /api/v1/bookings/:id/confirm-return ───────────────────────────
  describe('POST /api/v1/bookings/:id/confirm-return', () => {
    it('returns 403 when standard requester tries to confirm return', async () => {
      jest.spyOn(bookingRepo, 'findDetailById').mockResolvedValueOnce(mockScheduledBooking);

      const res = await request(app)
        .post(`/api/v1/bookings/${BOOKING_ID}/confirm-return`)
        .set('Authorization', `Bearer ${requesterToken}`)
        .send({ action: 'CONFIRM', notes: 'Clean' });

      expect(res.status).toBe(403);
    });

    it('returns 400 if booking is not in RETURNED status', async () => {
      jest.spyOn(bookingRepo, 'findDetailById').mockResolvedValueOnce(mockScheduledBooking); // SCHEDULED

      const res = await request(app)
        .post(`/api/v1/bookings/${BOOKING_ID}/confirm-return`)
        .set('Authorization', `Bearer ${managerToken}`)
        .send({ action: 'CONFIRM' });

      expect(res.status).toBe(400);
      expect(res.body.error.message).toMatch(/Cannot confirm return on booking in status 'SCHEDULED'/);
    });

    it('returns 200 and transitions RETURNED -> CLOSED on CONFIRM action', async () => {
      jest.spyOn(bookingRepo, 'findDetailById').mockResolvedValueOnce({
        ...mockScheduledBooking,
        status: 'RETURNED',
      });
      jest.spyOn(transitionService, 'transition').mockResolvedValueOnce({
        entity: { ...mockScheduledBooking, status: 'CLOSED' },
      });

      const res = await request(app)
        .post(`/api/v1/bookings/${BOOKING_ID}/confirm-return`)
        .set('Authorization', `Bearer ${managerToken}`)
        .send({ action: 'CONFIRM', notes: 'Checked and clean' });

      expect(res.status).toBe(200);
      expect(res.body.ok).toBe(true);
      expect(res.body.data.booking.status).toBe('CLOSED');
      expect(res.body.data.incidentDraft).toBeNull();
    });

    it('returns 200 and pre-fills incident draft on FLAG_INCIDENT action', async () => {
      jest.spyOn(bookingRepo, 'findDetailById').mockResolvedValueOnce({
        ...mockScheduledBooking,
        status: 'RETURNED',
      });
      jest.spyOn(checkInRepo, 'findReportByKind')
        .mockResolvedValueOnce({ kind: 'BEFORE', rating: 5, accessories: ['lens'] })
        .mockResolvedValueOnce({ kind: 'AFTER', rating: 3, accessories: [] });

      const res = await request(app)
        .post(`/api/v1/bookings/${BOOKING_ID}/confirm-return`)
        .set('Authorization', `Bearer ${managerToken}`)
        .send({ action: 'FLAG_INCIDENT', notes: 'Damage to lens filter detected' });

      expect(res.status).toBe(200);
      expect(res.body.ok).toBe(true);
      expect(res.body.data.incidentDraft).toBeDefined();
      expect(res.body.data.incidentDraft.bookingId).toBe(BOOKING_ID);
      expect(res.body.data.incidentDraft.severity).toBe('HIGH');
      expect(res.body.data.incidentDraft.demo).toBe(true);
    });
  });

  // ── 5. GET /api/v1/bookings/:id/condition-reports ─────────────────────────
  describe('GET /api/v1/bookings/:id/condition-reports', () => {
    it('returns side-by-side BEFORE and AFTER reports with diff', async () => {
      jest.spyOn(bookingRepo, 'findDetailById').mockResolvedValueOnce(mockScheduledBooking);
      jest.spyOn(checkInRepo, 'findReportsByBookingId').mockResolvedValueOnce([
        { kind: 'BEFORE', rating: 5, accessories: ['cable', 'lens'] },
        { kind: 'AFTER', rating: 4, accessories: ['cable', 'lens'] },
      ]);

      const res = await request(app)
        .get(`/api/v1/bookings/${BOOKING_ID}/condition-reports`)
        .set('Authorization', `Bearer ${requesterToken}`);

      expect(res.status).toBe(200);
      expect(res.body.ok).toBe(true);
      expect(res.body.data.before).toBeDefined();
      expect(res.body.data.after).toBeDefined();
      expect(res.body.data.diff).toBeDefined();
      expect(res.body.data.diff.ratingDrop).toBe(1);
      expect(res.body.data.diff.ratingFlagged).toBe(false);
      expect(res.body.data.diff.hasMissingAccessories).toBe(false);
    });
  });
});
