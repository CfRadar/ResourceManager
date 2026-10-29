'use strict';

/**
 * tests/bookings.test.js
 *
 * Step 07 — Booking management, calendar feeds, reschedule, extension,
 * cancellation with FIFO waitlist, no-show strike tracking, and iCal RFC 5545 exports.
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
const { facilityRepo }       = require('../src/modules/facilities/facilities.repository');
const transitionService      = require('../src/services/transition');
const { reserveSlot }        = require('../src/services/bookingEngine');

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
const adminToken     = makeToken({ role: 'PLATFORM_ADMIN' });

const mockBookingRow = {
  id:                     BOOKING_ID,
  resource_id:            RESOURCE_ID,
  user_id:                REQUESTER_ID,
  request_id:             '66666666-6666-4666-8666-666666666666',
  start_at:               new Date(Date.now() + 3600000).toISOString(),
  end_at:                 new Date(Date.now() + 7200000).toISOString(),
  status:                 'SCHEDULED',
  resource_name:          'Spectrometer UV-2600',
  facility_id:            FACILITY_ID,
  facility_name:          'Central Analytical Lab',
  facility_timezone:      'America/New_York',
  institution_id:         INSTITUTION_ID,
  institution_name:       'State University',
  user_full_name:         'Jane Requester',
  user_email:             'jane@state.edu',
  cancellation_reason:    null,
  no_show_count:          0,
};

describe('Bookings Module — Step 07', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  // ── 1. GET /api/v1/bookings/mine ───────────────────────────────────────────
  describe('GET /api/v1/bookings/mine', () => {
    it('returns 401 when no token is provided', async () => {
      const res = await request(app).get('/api/v1/bookings/mine');
      expect(res.status).toBe(401);
    });

    it('returns user bookings list with pagination', async () => {
      jest.spyOn(bookingRepo, 'findByUser').mockResolvedValueOnce({
        items: [mockBookingRow],
        meta: { page: 1, limit: 10, total: 1, totalPages: 1 },
      });

      const res = await request(app)
        .get('/api/v1/bookings/mine?status=SCHEDULED&page=1&limit=10')
        .set('Authorization', `Bearer ${requesterToken}`);

      expect(res.status).toBe(200);
      expect(res.body.ok).toBe(true);
      expect(res.body.data).toHaveLength(1);
      expect(res.body.data[0].id).toBe(BOOKING_ID);
      expect(res.body.meta.total).toBe(1);
    });
  });

  // ── 2. GET /api/v1/bookings/:id ───────────────────────────────────────────
  describe('GET /api/v1/bookings/:id', () => {
    it('returns 404 when booking does not exist', async () => {
      jest.spyOn(bookingRepo, 'findDetailById').mockResolvedValueOnce(null);

      const res = await request(app)
        .get(`/api/v1/bookings/${BOOKING_ID}`)
        .set('Authorization', `Bearer ${requesterToken}`);

      expect(res.status).toBe(404);
      expect(res.body.ok).toBe(false);
    });

    it('returns 403 when another requester attempts to view booking', async () => {
      jest.spyOn(bookingRepo, 'findDetailById').mockResolvedValueOnce(mockBookingRow);

      const res = await request(app)
        .get(`/api/v1/bookings/${BOOKING_ID}`)
        .set('Authorization', `Bearer ${otherUserToken}`);

      expect(res.status).toBe(403);
    });

    it('returns 200 with qrPayload for booking owner', async () => {
      jest.spyOn(bookingRepo, 'findDetailById').mockResolvedValueOnce(mockBookingRow);

      const res = await request(app)
        .get(`/api/v1/bookings/${BOOKING_ID}`)
        .set('Authorization', `Bearer ${requesterToken}`);

      expect(res.status).toBe(200);
      expect(res.body.ok).toBe(true);
      expect(res.body.data.id).toBe(BOOKING_ID);
      expect(res.body.data.qrPayload).toMatchObject({
        bookingId:  BOOKING_ID,
        resourceId: RESOURCE_ID,
        userId:     REQUESTER_ID,
        demo:       true,
      });
    });

    it('returns 200 when facility manager views the booking', async () => {
      jest.spyOn(bookingRepo, 'findDetailById').mockResolvedValueOnce(mockBookingRow);

      const res = await request(app)
        .get(`/api/v1/bookings/${BOOKING_ID}`)
        .set('Authorization', `Bearer ${managerToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.id).toBe(BOOKING_ID);
    });
  });

  // ── 3. GET /api/v1/facilities/:id/bookings (Calendar Feed) ────────────────
  describe('GET /api/v1/facilities/:id/bookings', () => {
    const from = new Date().toISOString();
    const to   = new Date(Date.now() + 86400000 * 7).toISOString();

    it('returns 403 when requester tries to view facility calendar', async () => {
      jest.spyOn(facilityRepo, 'findById').mockResolvedValueOnce({
        id: FACILITY_ID,
        institution_id: INSTITUTION_ID,
      });

      const res = await request(app)
        .get(`/api/v1/facilities/${FACILITY_ID}/bookings?from=${from}&to=${to}`)
        .set('Authorization', `Bearer ${requesterToken}`);

      expect(res.status).toBe(403);
    });

    it('returns 200 with facility bookings for staff member', async () => {
      jest.spyOn(facilityRepo, 'findById').mockResolvedValueOnce({
        id: FACILITY_ID,
        institution_id: INSTITUTION_ID,
      });
      jest.spyOn(bookingRepo, 'findFacilityCalendar').mockResolvedValueOnce([mockBookingRow]);

      const res = await request(app)
        .get(`/api/v1/facilities/${FACILITY_ID}/bookings?from=${from}&to=${to}`)
        .set('Authorization', `Bearer ${managerToken}`);

      expect(res.status).toBe(200);
      expect(res.body.ok).toBe(true);
      expect(res.body.data).toHaveLength(1);
    });
  });

  // ── 4. POST /api/v1/bookings/:id/reschedule ────────────────────────────────
  describe('POST /api/v1/bookings/:id/reschedule', () => {
    const newStartAt = new Date(Date.now() + 86400000).toISOString();
    const newEndAt   = new Date(Date.now() + 86400000 + 3600000).toISOString();

    it('returns 400 when startAt >= endAt', async () => {
      const res = await request(app)
        .post(`/api/v1/bookings/${BOOKING_ID}/reschedule`)
        .set('Authorization', `Bearer ${requesterToken}`)
        .send({
          newStartAt: newEndAt,
          newEndAt:   newStartAt,
          reason:     'Change schedule',
        });

      expect(res.status).toBe(400);
    });

    it('returns 400 if booking is already CHECKED_IN or not SCHEDULED', async () => {
      jest.spyOn(bookingRepo, 'findDetailById').mockResolvedValueOnce({
        ...mockBookingRow,
        status: 'CHECKED_IN',
      });

      const res = await request(app)
        .post(`/api/v1/bookings/${BOOKING_ID}/reschedule`)
        .set('Authorization', `Bearer ${requesterToken}`)
        .send({ newStartAt, newEndAt, reason: 'Shift time' });

      expect(res.status).toBe(400);
      expect(res.body.error.message).toMatch(/Only SCHEDULED bookings can be rescheduled/);
    });

    it('returns 409 BOOKING_CONFLICT when overlapping with another booking', async () => {
      jest.spyOn(bookingRepo, 'findDetailById').mockResolvedValueOnce(mockBookingRow);
      jest.spyOn(bookingRepo, 'findOverlapping').mockResolvedValueOnce([
        { id: '88888888-8888-4888-8888-888888888888', start_at: newStartAt, end_at: newEndAt },
      ]);

      const res = await request(app)
        .post(`/api/v1/bookings/${BOOKING_ID}/reschedule`)
        .set('Authorization', `Bearer ${requesterToken}`)
        .send({ newStartAt, newEndAt, reason: 'Shift time' });

      expect(res.status).toBe(409);
      expect(res.body.error.code).toBe('BOOKING_CONFLICT');
    });

    it('returns 200 when reschedule is successful', async () => {
      jest.spyOn(bookingRepo, 'findDetailById').mockResolvedValueOnce(mockBookingRow);
      jest.spyOn(bookingRepo, 'findOverlapping').mockResolvedValueOnce([]);
      jest.spyOn(bookingRepo, 'update').mockResolvedValueOnce({
        ...mockBookingRow,
        start_at: newStartAt,
        end_at:   newEndAt,
      });

      const res = await request(app)
        .post(`/api/v1/bookings/${BOOKING_ID}/reschedule`)
        .set('Authorization', `Bearer ${requesterToken}`)
        .send({ newStartAt, newEndAt, reason: 'Rescheduling for experiment' });

      expect(res.status).toBe(200);
      expect(res.body.ok).toBe(true);
      expect(res.body.data.start_at).toBe(newStartAt);
    });
  });

  // ── 5. POST /api/v1/bookings/:id/extend ────────────────────────────────────
  describe('POST /api/v1/bookings/:id/extend', () => {
    it('returns 400 when extensionMinutes is invalid (< 15)', async () => {
      const res = await request(app)
        .post(`/api/v1/bookings/${BOOKING_ID}/extend`)
        .set('Authorization', `Bearer ${requesterToken}`)
        .send({ extensionMinutes: 5, reason: 'Need 5 more mins' });

      expect(res.status).toBe(400);
    });

    it('returns 409 BOOKING_CONFLICT when adjacent slot is blocked', async () => {
      jest.spyOn(bookingRepo, 'findDetailById').mockResolvedValueOnce(mockBookingRow);
      const extendedTime = new Date(new Date(mockBookingRow.end_at).getTime() + 3600000).toISOString();

      jest.spyOn(bookingRepo, 'findOverlapping').mockResolvedValueOnce([
        { id: 'another-booking-id', start_at: mockBookingRow.end_at, end_at: extendedTime },
      ]);

      const res = await request(app)
        .post(`/api/v1/bookings/${BOOKING_ID}/extend`)
        .set('Authorization', `Bearer ${requesterToken}`)
        .send({ extensionMinutes: 60, reason: 'Need more time' });

      expect(res.status).toBe(409);
      expect(res.body.error.code).toBe('BOOKING_CONFLICT');
    });

    it('returns 200 on successful extension', async () => {
      jest.spyOn(bookingRepo, 'findDetailById').mockResolvedValueOnce(mockBookingRow);
      const extendedTime = new Date(new Date(mockBookingRow.end_at).getTime() + 3600000).toISOString();
      jest.spyOn(bookingRepo, 'findOverlapping').mockResolvedValueOnce([]);
      jest.spyOn(bookingRepo, 'update').mockResolvedValueOnce({
        ...mockBookingRow,
        end_at: extendedTime,
      });

      const res = await request(app)
        .post(`/api/v1/bookings/${BOOKING_ID}/extend`)
        .set('Authorization', `Bearer ${requesterToken}`)
        .send({ extensionMinutes: 60, reason: 'Experiment prolonged' });

      expect(res.status).toBe(200);
      expect(res.body.ok).toBe(true);
      expect(res.body.data.end_at).toBe(extendedTime);
    });
  });

  // ── 6. POST /api/v1/bookings/:id/cancel ────────────────────────────────────
  describe('POST /api/v1/bookings/:id/cancel', () => {
    it('returns 200 and transitions booking to CANCELLED', async () => {
      jest.spyOn(bookingRepo, 'findDetailById').mockResolvedValueOnce(mockBookingRow);
      jest.spyOn(transitionService, 'transition').mockResolvedValueOnce({
        entity: { ...mockBookingRow, status: 'CANCELLED' },
      });

      const res = await request(app)
        .post(`/api/v1/bookings/${BOOKING_ID}/cancel`)
        .set('Authorization', `Bearer ${requesterToken}`)
        .send({ reason: 'Sick leave today' });

      expect(res.status).toBe(200);
      expect(res.body.ok).toBe(true);
      expect(res.body.data.booking.status).toBe('CANCELLED');
    });
  });

  // ── 7. POST /api/v1/bookings/:id/mark-no-show ──────────────────────────────
  describe('POST /api/v1/bookings/:id/mark-no-show', () => {
    it('returns 403 when standard requester attempts to mark no-show', async () => {
      jest.spyOn(bookingRepo, 'findDetailById').mockResolvedValueOnce(mockBookingRow);

      const res = await request(app)
        .post(`/api/v1/bookings/${BOOKING_ID}/mark-no-show`)
        .set('Authorization', `Bearer ${requesterToken}`)
        .send({ notes: 'Did not arrive' });

      expect(res.status).toBe(403);
    });

    it('returns 400 when grace window has not elapsed yet', async () => {
      // Booking starting right now, with 15 min grace window
      const futureStart = new Date(Date.now() - 5 * 60000).toISOString(); // 5 min ago
      jest.spyOn(bookingRepo, 'findDetailById').mockResolvedValueOnce({
        ...mockBookingRow,
        start_at: futureStart,
      });

      const res = await request(app)
        .post(`/api/v1/bookings/${BOOKING_ID}/mark-no-show`)
        .set('Authorization', `Bearer ${managerToken}`)
        .send({ notes: 'Did not show up' });

      expect(res.status).toBe(400);
      expect(res.body.error.message).toMatch(/Grace period has not elapsed yet/);
    });

    it('returns 200 when grace window has elapsed and records strike', async () => {
      // Booking starting 30 mins ago
      const pastStart = new Date(Date.now() - 30 * 60000).toISOString();
      jest.spyOn(bookingRepo, 'findDetailById').mockResolvedValueOnce({
        ...mockBookingRow,
        start_at: pastStart,
      });
      jest.spyOn(bookingRepo, 'update').mockResolvedValueOnce({
        ...mockBookingRow,
        status:        'CANCELLED',
        no_show_count: 1,
      });

      const res = await request(app)
        .post(`/api/v1/bookings/${BOOKING_ID}/mark-no-show`)
        .set('Authorization', `Bearer ${managerToken}`)
        .send({ notes: 'Did not show up after 30 mins' });

      expect(res.status).toBe(200);
      expect(res.body.ok).toBe(true);
      expect(res.body.data.status).toBe('CANCELLED');
      expect(res.body.data.no_show_count).toBe(1);
    });
  });

  // ── 8. GET /api/v1/bookings/:id/calendar.ics ──────────────────────────────
  describe('GET /api/v1/bookings/:id/calendar.ics', () => {
    it('returns RFC 5545 iCalendar stream with correct headers and VEVENT', async () => {
      jest.spyOn(bookingRepo, 'findDetailById').mockResolvedValueOnce(mockBookingRow);

      const res = await request(app)
        .get(`/api/v1/bookings/${BOOKING_ID}/calendar.ics`)
        .set('Authorization', `Bearer ${requesterToken}`);

      expect(res.status).toBe(200);
      expect(res.headers['content-type']).toMatch(/text\/calendar/);
      expect(res.headers['content-disposition']).toMatch(/attachment; filename="?booking-/);
      expect(res.text).toContain('BEGIN:VCALENDAR');
      expect(res.text).toContain('VERSION:2.0');
      expect(res.text).toContain('BEGIN:VEVENT');
      expect(res.text).toContain(`SUMMARY:Reservation: ${mockBookingRow.resource_name}`);
      expect(res.text).toContain('END:VEVENT');
      expect(res.text).toContain('END:VCALENDAR');
    });
  });

  // ── 9. Concurrency: reserveSlot with GiST 23P01 mapping ────────────────────
  describe('Concurrency & GiST Exclusion Mapping', () => {
    it('catches PostgreSQL GiST 23P01 exclusion error and maps to 409 BOOKING_CONFLICT', async () => {
      const gistError = new Error('exclusion constraint "no_overlapping_bookings"');
      gistError.code = '23P01';

      const mockTrx = () => ({
        where: () => ({
          whereIn: () => ({
            where: () => ({
              where: () => ({
                select: async () => [], // No soft overlap detected, simulates racing insert
              }),
            }),
          }),
        }),
        insert: () => ({
          returning: () => Promise.reject(gistError),
        }),
      });

      await expect(
        reserveSlot(
          {
            resourceId: RESOURCE_ID,
            userId:     REQUESTER_ID,
            requestId:  'some-req-id',
            startAt:    new Date().toISOString(),
            endAt:      new Date(Date.now() + 3600000).toISOString(),
          },
          { trx: mockTrx }
        )
      ).rejects.toMatchObject({
        status: 409,
        code:   'BOOKING_CONFLICT',
      });
    });
  });
});
