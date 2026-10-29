'use strict';

/**
 * tests/availability.test.js
 *
 * Step 05 — Availability windows, discrete slots, blackout collision gating,
 * and availability polling integration tests.
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

const { createApp }          = require('../src/app');
const { resourceRepo }       = require('../src/modules/resources/resources.repository');
const { facilityRepo }       = require('../src/modules/facilities/facilities.repository');
const { policyRepo }         = require('../src/modules/policies/policies.repository');
const { availabilityRepo }   = require('../src/modules/availability/availability.repository');
const { ROLES }              = require('../src/middleware/rbac');

const app = createApp();

function makeToken(payload = {}) {
  return jwt.sign(
    {
      sub:         'user-test-uuid',
      role:        ROLES.REQUESTER,
      memberships: [],
      ...payload,
    },
    process.env.JWT_ACCESS_SECRET,
    { algorithm: 'HS256', expiresIn: '15m' }
  );
}

const INST_ID    = '11111111-1111-4111-a111-111111111111';
const FACILITY_ID= '22222222-2222-4222-a222-222222222222';
const RES_ID     = '33333333-3333-4333-a333-333333333333';
const POLL_ID    = '44444444-4444-4444-a444-444444444444';
const BLACKOUT_ID= '55555555-5555-4555-a555-555555555555';

const sampleFacility = {
  id:             FACILITY_ID,
  institution_id: INST_ID,
  name:           'Advanced Fabrication Facility',
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
  name:        'Stereolithography 3D Printer',
  status:      'ACTIVE',
  visibility:  'PUBLIC',
};

const samplePolicy = {
  resource_id:    RES_ID,
  policy_version: 1,
  is_current:     true,
  policy_data: {
    limits: {
      maxSingleBookingHours: 4,
      minBookingHours:       1,
      advanceBookingDays:    14,
    },
  },
};

afterEach(() => {
  jest.restoreAllMocks();
});

// ── GET /api/v1/resources/:id/availability ──────────────────────────────────

describe('GET /api/v1/resources/:id/availability', () => {
  it('rejects invalid query without from and to parameters with 400', async () => {
    const res = await request(app).get(`/api/v1/resources/${RES_ID}/availability`);
    expect(res.status).toBe(400);
    expect(res.body.ok).toBe(false);
  });

  it('rejects query when from >= to with 400', async () => {
    const res = await request(app).get(
      `/api/v1/resources/${RES_ID}/availability?from=2026-11-02T18:00:00Z&to=2026-11-02T08:00:00Z`
    );
    expect(res.status).toBe(400);
    expect(res.body.ok).toBe(false);
  });

  it('returns 404 when resource does not exist', async () => {
    jest.spyOn(resourceRepo, 'findById').mockResolvedValueOnce(null);

    const res = await request(app).get(
      `/api/v1/resources/${RES_ID}/availability?from=2026-11-02T08:00:00Z&to=2026-11-02T18:00:00Z`
    );
    expect(res.status).toBe(404);
  });

  it('computes merged open, busy, and blackout blocks with strictly anonymized busy intervals', async () => {
    jest.spyOn(resourceRepo, 'findById').mockResolvedValueOnce(sampleResource);
    jest.spyOn(facilityRepo, 'findById').mockResolvedValueOnce(sampleFacility);

    // Monday 2026-11-02: working hours 08:00 to 18:00 UTC
    // Booking from 10:00 to 12:00
    // Blackout from 14:00 to 15:00
    jest.spyOn(availabilityRepo, 'findActiveBookingsInInterval').mockResolvedValueOnce([
      {
        id:         'booking-1',
        user_id:    'sensitive-user-uuid',
        user_name:  'Dr. Alice Secret', // should NOT leak
        start_at:   '2026-11-02T10:00:00.000Z',
        end_at:     '2026-11-02T12:00:00.000Z',
        status:     'SCHEDULED',
      },
    ]);

    jest.spyOn(availabilityRepo, 'findActiveBlackoutsInInterval').mockResolvedValueOnce([
      {
        id:         BLACKOUT_ID,
        start_at:   '2026-11-02T14:00:00.000Z',
        end_at:     '2026-11-02T15:00:00.000Z',
        reason:     'Laser Recalibration',
      },
    ]);

    const res = await request(app).get(
      `/api/v1/resources/${RES_ID}/availability?from=2026-11-02T08:00:00Z&to=2026-11-02T18:00:00Z`
    );

    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
    expect(res.body.data.resourceId).toBe(RES_ID);

    const intervals = res.body.data.intervals;
    expect(intervals).toBeInstanceOf(Array);
    expect(intervals.length).toBe(5);

    // 1. Open: 08:00 - 10:00
    expect(intervals[0]).toEqual({
      label:   'Open',
      startAt: '2026-11-02T08:00:00.000Z',
      endAt:   '2026-11-02T10:00:00.000Z',
    });

    // 2. Booked: 10:00 - 12:00 (anonymized)
    expect(intervals[1]).toEqual({
      label:   'Booked',
      startAt: '2026-11-02T10:00:00.000Z',
      endAt:   '2026-11-02T12:00:00.000Z',
    });
    expect(intervals[1].user_id).toBeUndefined();
    expect(intervals[1].user_name).toBeUndefined();

    // 3. Open: 12:00 - 14:00
    expect(intervals[2]).toEqual({
      label:   'Open',
      startAt: '2026-11-02T12:00:00.000Z',
      endAt:   '2026-11-02T14:00:00.000Z',
    });

    // 4. Blackout: 14:00 - 15:00
    expect(intervals[3]).toEqual({
      label:   'Blackout',
      reason:  'Laser Recalibration',
      startAt: '2026-11-02T14:00:00.000Z',
      endAt:   '2026-11-02T15:00:00.000Z',
    });

    // 5. Open: 15:00 - 18:00
    expect(intervals[4]).toEqual({
      label:   'Open',
      startAt: '2026-11-02T15:00:00.000Z',
      endAt:   '2026-11-02T18:00:00.000Z',
    });
  });
});

// ── GET /api/v1/resources/:id/slots ─────────────────────────────────────────

describe('GET /api/v1/resources/:id/slots', () => {
  it('requires authentication (401 without token)', async () => {
    const res = await request(app).get(
      `/api/v1/resources/${RES_ID}/slots?date=2026-11-02&durationMin=60`
    );
    expect(res.status).toBe(401);
  });

  it('rejects invalid date format with 400', async () => {
    const token = makeToken();
    const res = await request(app)
      .get(`/api/v1/resources/${RES_ID}/slots?date=invalid-date`)
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(400);
  });

  it('rejects duration that exceeds policy maxSingleBookingHours with 400', async () => {
    const token = makeToken();
    jest.spyOn(resourceRepo, 'findById').mockResolvedValueOnce(sampleResource);
    jest.spyOn(facilityRepo, 'findById').mockResolvedValueOnce(sampleFacility);
    jest.spyOn(policyRepo, 'findCurrentPolicy').mockResolvedValueOnce(samplePolicy);
    jest.spyOn(availabilityRepo, 'findActiveBookingsInInterval').mockResolvedValueOnce([]);
    jest.spyOn(availabilityRepo, 'findActiveBlackoutsInInterval').mockResolvedValueOnce([]);

    // Policy maxSingleBookingHours = 4, request 300 minutes (5 hours)
    const res = await request(app)
      .get(`/api/v1/resources/${RES_ID}/slots?date=2026-11-02&durationMin=300`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(400);
    expect(res.body.error.message).toMatch(/exceeds maximum single booking duration/);
  });

  it('slices available open time into discrete durationMin slots', async () => {
    const token = makeToken();
    jest.spyOn(resourceRepo, 'findById').mockResolvedValueOnce(sampleResource);
    jest.spyOn(facilityRepo, 'findById').mockResolvedValueOnce(sampleFacility);
    jest.spyOn(policyRepo, 'findCurrentPolicy').mockResolvedValueOnce(samplePolicy);

    // Day 2026-11-02: open 08:00 to 12:00 (simulate afternoon closed/booked)
    jest.spyOn(availabilityRepo, 'findActiveBookingsInInterval').mockResolvedValueOnce([
      {
        start_at: '2026-11-02T12:00:00.000Z',
        end_at:   '2026-11-02T18:00:00.000Z',
        status:   'SCHEDULED',
      },
    ]);
    jest.spyOn(availabilityRepo, 'findActiveBlackoutsInInterval').mockResolvedValueOnce([]);

    const res = await request(app)
      .get(`/api/v1/resources/${RES_ID}/slots?date=2026-11-02&durationMin=60`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
    expect(res.body.data.slots).toBeInstanceOf(Array);
    // 08:00-09:00, 09:00-10:00, 10:00-11:00, 11:00-12:00 = 4 slots
    expect(res.body.data.slots.length).toBe(4);
    expect(res.body.data.slots[0]).toEqual({
      startAt: '2026-11-02T08:00:00.000Z',
      endAt:   '2026-11-02T09:00:00.000Z',
    });
  });
});

// ── Blackout Management (POST / DELETE) ─────────────────────────────────────

describe('Blackout Management: POST / DELETE', () => {
  const managerToken = makeToken({
    sub:         'manager-user-uuid',
    memberships: [{ institutionId: INST_ID, role: ROLES.MANAGER }],
  });

  const requesterToken = makeToken({
    sub:         'requester-user-uuid',
    memberships: [{ institutionId: INST_ID, role: ROLES.REQUESTER }],
  });

  it('rejects unauthorized requester attempting to create blackout with 403', async () => {
    jest.spyOn(resourceRepo, 'findById').mockResolvedValueOnce(sampleResource);
    jest.spyOn(facilityRepo, 'findById').mockResolvedValueOnce(sampleFacility);

    const res = await request(app)
      .post(`/api/v1/resources/${RES_ID}/blackouts`)
      .set('Authorization', `Bearer ${requesterToken}`)
      .send({
        startAt: '2026-11-05T08:00:00Z',
        endAt:   '2026-11-05T12:00:00Z',
        reason:  'Facility Cleaning',
      });

    expect(res.status).toBe(403);
  });

  it('returns 409 BOOKING_CONFLICT when blackout collides with bookings and confirmCancelAffected is false', async () => {
    jest.spyOn(resourceRepo, 'findById').mockResolvedValueOnce(sampleResource);
    jest.spyOn(facilityRepo, 'findById').mockResolvedValueOnce(sampleFacility);

    jest.spyOn(availabilityRepo, 'findActiveBookingsInInterval').mockResolvedValueOnce([
      {
        id:       'colliding-booking-1',
        user_id:  'user-123',
        start_at: '2026-11-05T09:00:00Z',
        end_at:   '2026-11-05T11:00:00Z',
        status:   'SCHEDULED',
      },
    ]);

    const res = await request(app)
      .post(`/api/v1/resources/${RES_ID}/blackouts`)
      .set('Authorization', `Bearer ${managerToken}`)
      .send({
        startAt: '2026-11-05T08:00:00Z',
        endAt:   '2026-11-05T12:00:00Z',
        reason:  'Facility Cleaning',
        confirmCancelAffected: false,
      });

    expect(res.status).toBe(409);
    expect(res.body.ok).toBe(false);
    expect(res.body.error.code).toBe('BOOKING_CONFLICT');
    expect(res.body.error.details.affectedBookings.length).toBe(1);
  });

  it('transitions colliding bookings to NEEDS_REBOOK and creates blackout when confirmCancelAffected is true', async () => {
    jest.spyOn(resourceRepo, 'findById').mockResolvedValueOnce(sampleResource);
    jest.spyOn(facilityRepo, 'findById').mockResolvedValueOnce(sampleFacility);

    jest.spyOn(availabilityRepo, 'findActiveBookingsInInterval').mockResolvedValueOnce([
      {
        id:       'colliding-booking-1',
        user_id:  'user-123',
        start_at: '2026-11-05T09:00:00Z',
        end_at:   '2026-11-05T11:00:00Z',
        status:   'SCHEDULED',
      },
    ]);

    const updateStatusSpy = jest.spyOn(availabilityRepo, 'updateBookingsStatus').mockResolvedValueOnce(1);
    const insertBlackoutSpy = jest.spyOn(availabilityRepo, 'insertBlackout').mockResolvedValueOnce({
      id:          BLACKOUT_ID,
      resource_id: RES_ID,
      start_at:    '2026-11-05T08:00:00Z',
      end_at:      '2026-11-05T12:00:00Z',
      reason:      'Facility Cleaning',
      created_by:  'manager-user-uuid',
    });

    const res = await request(app)
      .post(`/api/v1/resources/${RES_ID}/blackouts`)
      .set('Authorization', `Bearer ${managerToken}`)
      .send({
        startAt: '2026-11-05T08:00:00Z',
        endAt:   '2026-11-05T12:00:00Z',
        reason:  'Facility Cleaning',
        confirmCancelAffected: true,
      });

    expect(res.status).toBe(201);
    expect(res.body.ok).toBe(true);
    expect(res.body.data.affectedBookingsCount).toBe(1);
    expect(updateStatusSpy).toHaveBeenCalledWith(['colliding-booking-1'], 'NEEDS_REBOOK', expect.anything());
    expect(insertBlackoutSpy).toHaveBeenCalled();
  });

  it('soft-deletes blackout when manager requests deletion', async () => {
    jest.spyOn(resourceRepo, 'findById').mockResolvedValueOnce(sampleResource);
    jest.spyOn(facilityRepo, 'findById').mockResolvedValueOnce(sampleFacility);
    jest.spyOn(availabilityRepo, 'softDeleteBlackout').mockResolvedValueOnce(1);

    const res = await request(app)
      .delete(`/api/v1/resources/${RES_ID}/blackouts/${BLACKOUT_ID}`)
      .set('Authorization', `Bearer ${managerToken}`);

    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
    expect(res.body.data.id).toBe(BLACKOUT_ID);
  });
});

// ── Availability Polls ──────────────────────────────────────────────────────

describe('Availability Polls (GET, POST, vote)', () => {
  const token = makeToken();

  it('lists active polls for a resource', async () => {
    jest.spyOn(resourceRepo, 'findById').mockResolvedValueOnce(sampleResource);
    jest.spyOn(availabilityRepo, 'findActivePolls').mockResolvedValueOnce([
      {
        id:                POLL_ID,
        resource_id:       RES_ID,
        label:             'Saturday mornings',
        preferred_windows: JSON.stringify([{ dayOfWeek: 'saturday', startHour: 9, endHour: 13 }]),
        vote_count:        5,
        active:            true,
        created_by:        'user-abc',
        created_at:        new Date().toISOString(),
      },
    ]);

    const res = await request(app)
      .get(`/api/v1/resources/${RES_ID}/availability-polls`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
    expect(res.body.data.polls.length).toBe(1);
    expect(res.body.data.polls[0].label).toBe('Saturday mornings');
    expect(res.body.data.polls[0].voteCount).toBe(5);
  });

  it('creates a new availability poll with vote_count = 1', async () => {
    jest.spyOn(resourceRepo, 'findById').mockResolvedValueOnce(sampleResource);
    jest.spyOn(availabilityRepo, 'insertPoll').mockResolvedValueOnce({
      id:          POLL_ID,
      resource_id: RES_ID,
      label:       'Sunday late nights',
      vote_count:  1,
      active:      true,
      created_at:  new Date().toISOString(),
    });

    const res = await request(app)
      .post(`/api/v1/resources/${RES_ID}/availability-polls`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        label: 'Sunday late nights',
        preferredWindows: [{ dayOfWeek: 'sunday', startHour: 20, endHour: 24 }],
      });

    expect(res.status).toBe(201);
    expect(res.body.ok).toBe(true);
    expect(res.body.data.label).toBe('Sunday late nights');
    expect(res.body.data.voteCount).toBe(1);
  });

  it('votes on an existing poll and increments vote_count', async () => {
    jest.spyOn(availabilityRepo, 'findPollById').mockResolvedValueOnce({
      id:         POLL_ID,
      active:     true,
      vote_count: 3,
    });
    jest.spyOn(availabilityRepo, 'incrementPollVote').mockResolvedValueOnce({
      id:         POLL_ID,
      vote_count: 4,
    });

    const res = await request(app)
      .post(`/api/v1/availability-polls/${POLL_ID}/vote`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
    expect(res.body.data.voteCount).toBe(4);
  });
});

