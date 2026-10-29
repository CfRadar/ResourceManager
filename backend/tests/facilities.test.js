'use strict';

/**
 * tests/facilities.test.js
 *
 * Step 03 — Facilities domain, working hours, and coordinates integration tests.
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
      join() { return this; },
      orderBy() { return this; },
      forUpdate() { return this; },
      select() { return this; },
      limit() { return this; },
      offset() { return this; },
      async first() { return this._vals[0]; },
      async count() { return [{ count: '1' }]; },
      async increment() { return 1; },
      async update() { return 1; },
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
  isWithinWorkingHours,
} = require('../src/modules/facilities/facilities.service');
const { facilityRepo } = require('../src/modules/facilities/facilities.repository');
const { institutionRepo } = require('../src/modules/institutions/institutions.repository');

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

const INST_ID = '11111111-1111-4111-a111-111111111111';
const FAC_ID  = '22222222-2222-4222-a222-222222222222';

// ── Unit Tests: isWithinWorkingHours ───────────────────────────────────────────

describe('Facility working hours and timezone calculation (isWithinWorkingHours)', () => {
  const facilityIST = {
    timezone: 'Asia/Kolkata', // UTC + 05:30
    working_hours: {
      monday:    { open: '08:00', close: '18:00' },
      tuesday:   { open: '08:00', close: '18:00' },
      wednesday: { open: '08:00', close: '18:00' },
      thursday:  { open: '08:00', close: '18:00' },
      friday:    { open: '08:00', close: '17:00' },
      saturday:  null, // closed
      sunday:    null, // closed
    },
  };

  it('returns true when booking is strictly within opening hours in facility timezone', () => {
    // 2026-11-02 is a Monday.
    // 10:00 to 12:00 IST is 04:30 to 06:30 UTC.
    const startAt = '2026-11-02T04:30:00.000Z';
    const endAt   = '2026-11-02T06:30:00.000Z';
    expect(isWithinWorkingHours(facilityIST, startAt, endAt)).toBe(true);
  });

  it('returns false when booking starts before opening time', () => {
    // 07:30 IST is 02:00 UTC (opens at 08:00 IST).
    const startAt = '2026-11-02T02:00:00.000Z';
    const endAt   = '2026-11-02T04:30:00.000Z';
    expect(isWithinWorkingHours(facilityIST, startAt, endAt)).toBe(false);
  });

  it('returns false when booking ends after closing time', () => {
    // 18:30 IST is 13:00 UTC (closes at 18:00 IST).
    const startAt = '2026-11-02T11:00:00.000Z';
    const endAt   = '2026-11-02T13:00:00.000Z';
    expect(isWithinWorkingHours(facilityIST, startAt, endAt)).toBe(false);
  });

  it('returns false when facility is closed on that day (Saturday null)', () => {
    // 2026-11-07 is Saturday.
    const startAt = '2026-11-07T05:00:00.000Z';
    const endAt   = '2026-11-07T07:00:00.000Z';
    expect(isWithinWorkingHours(facilityIST, startAt, endAt)).toBe(false);
  });

  it('returns false for invalid date strings or start >= end', () => {
    expect(isWithinWorkingHours(facilityIST, 'bad-date', '2026-11-02T10:00:00Z')).toBe(false);
    expect(isWithinWorkingHours(facilityIST, '2026-11-02T10:00:00Z', '2026-11-02T09:00:00Z')).toBe(false);
  });

  it('supports overnight schedule', () => {
    const overnightFacility = {
      timezone: 'UTC',
      working_hours: {
        monday: { open: '20:00', close: '04:00' },
      },
    };
    // 21:00 on Monday to 02:00 on Tuesday morning
    const startAt = '2026-11-02T21:00:00.000Z';
    const endAt   = '2026-11-03T02:00:00.000Z';
    expect(isWithinWorkingHours(overnightFacility, startAt, endAt)).toBe(true);
  });

  it('returns true if facility has no working hours configured (open 24/7)', () => {
    const openFacility = { timezone: 'UTC', working_hours: null };
    expect(isWithinWorkingHours(openFacility, '2026-11-02T10:00:00Z', '2026-11-02T12:00:00Z')).toBe(true);
  });
});

// ── GET /api/v1/facilities ────────────────────────────────────────────────────

describe('GET /api/v1/facilities', () => {
  it('rejects invalid query parameters (e.g. non-uuid institutionId)', async () => {
    const res = await request(app).get('/api/v1/facilities?institutionId=not-a-uuid');
    expect(res.status).toBe(400);
    expect(res.body.ok).toBe(false);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('returns paginated facility list with public fields', async () => {
    jest.spyOn(facilityRepo, 'findFacilitiesWithFilters').mockResolvedValueOnce({
      data: [
        {
          id: FAC_ID,
          institutionId: INST_ID,
          name: 'Advanced Fabrication Lab',
          address: 'Building 1',
          lat: 12.9716,
          lng: 77.5946,
          timezone: 'Asia/Kolkata',
          geofenceRadiusMeters: 150,
          workingHours: null,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ],
      meta: { page: 1, pageSize: 20, total: 1, totalPages: 1 },
    });

    const res = await request(app).get('/api/v1/facilities');
    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data[0].id).toBe(FAC_ID);
    expect(res.body.meta.total).toBe(1);
  });
});

// ── GET /api/v1/facilities/:id ────────────────────────────────────────────────

describe('GET /api/v1/facilities/:id', () => {
  it('rejects invalid UUID format with 400', async () => {
    const res = await request(app).get('/api/v1/facilities/123-bad-id');
    expect(res.status).toBe(400);
    expect(res.body.ok).toBe(false);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('returns 404 when facility does not exist', async () => {
    jest.spyOn(facilityRepo, 'findByIdWithInstitution').mockResolvedValueOnce(null);

    const res = await request(app).get(`/api/v1/facilities/${FAC_ID}`);
    expect(res.status).toBe(404);
    expect(res.body.ok).toBe(false);
    expect(res.body.error.code).toBe('NOT_FOUND');
  });

  it('returns facility details when found', async () => {
    jest.spyOn(facilityRepo, 'findByIdWithInstitution').mockResolvedValueOnce({
      id: FAC_ID,
      institutionId: INST_ID,
      name: 'Clean Room Alpha',
      address: 'North Wing',
      lat: 12.97,
      lng: 77.59,
      timezone: 'UTC',
      workingHours: { monday: { open: '09:00', close: '17:00' } },
      geofenceRadiusMeters: 150,
      institution: { id: INST_ID, name: 'Demo University', city: 'Bangalore' },
    });

    const res = await request(app).get(`/api/v1/facilities/${FAC_ID}`);
    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
    expect(res.body.data.name).toBe('Clean Room Alpha');
    expect(res.body.data.institution.name).toBe('Demo University');
  });
});

// ── POST /api/v1/institutions/:id/facilities ──────────────────────────────────

describe('POST /api/v1/institutions/:id/facilities — creation and validation', () => {
  it('returns 401 when unauthenticated', async () => {
    const res = await request(app)
      .post(`/api/v1/institutions/${INST_ID}/facilities`)
      .send({ name: 'Robotics Lab' });
    expect(res.status).toBe(401);
  });

  it('returns 403 when user is not admin or owner of the institution', async () => {
    const token = makeToken({
      role: 'REQUESTER',
      memberships: [{ institutionId: INST_ID, role: 'REQUESTER' }],
    });

    const res = await request(app)
      .post(`/api/v1/institutions/${INST_ID}/facilities`)
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Robotics Lab' });
    expect(res.status).toBe(403);
  });

  it('rejects invalid latitude or longitude', async () => {
    const token = makeToken({ role: 'ADMIN' }); // platform admin

    const res = await request(app)
      .post(`/api/v1/institutions/${INST_ID}/facilities`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        name: 'Bad Coordinates Lab',
        lat: 95.0, // invalid > 90
        lng: 77.59,
      });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('rejects invalid or negative geofence radius', async () => {
    const token = makeToken({ role: 'ADMIN' });

    const res = await request(app)
      .post(`/api/v1/institutions/${INST_ID}/facilities`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        name: 'Negative Geofence Lab',
        geofenceRadiusMeters: -50,
      });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('rejects invalid IANA timezone', async () => {
    const token = makeToken({ role: 'ADMIN' });

    const res = await request(app)
      .post(`/api/v1/institutions/${INST_ID}/facilities`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        name: 'Bad Timezone Lab',
        timezone: 'Mars/Colony_1',
      });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('rejects malformed working hours schedule', async () => {
    const token = makeToken({ role: 'ADMIN' });

    const res = await request(app)
      .post(`/api/v1/institutions/${INST_ID}/facilities`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        name: 'Bad Hours Lab',
        workingHours: {
          monday: { open: '25:00', close: '18:00' }, // invalid hour
        },
      });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('successfully creates facility when authorized with valid payload', async () => {
    const token = makeToken({
      role: 'REQUESTER',
      memberships: [{ institutionId: INST_ID, role: 'OWNER' }],
    });

    jest.spyOn(institutionRepo, 'findById').mockResolvedValueOnce({
      id: INST_ID,
      name: 'Demo Inst',
      verified: true,
    });

    jest.spyOn(facilityRepo, 'insert').mockResolvedValueOnce({
      id:                     FAC_ID,
      institution_id:         INST_ID,
      name:                   'Laser & Optics Lab',
      address:                'Building 4, Room 101',
      lat:                    12.9716,
      lng:                    77.5946,
      timezone:               'Asia/Kolkata',
      geofence_radius_meters: 150,
      working_hours:          JSON.stringify({
        monday: { open: '08:00', close: '18:00' },
      }),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

    const res = await request(app)
      .post(`/api/v1/institutions/${INST_ID}/facilities`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        name:                 'Laser & Optics Lab',
        address:              'Building 4, Room 101',
        lat:                  12.9716,
        lng:                  77.5946,
        timezone:             'Asia/Kolkata',
        geofenceRadiusMeters: 150,
        workingHours: {
          monday: { open: '08:00', close: '18:00' },
        },
      });

    expect(res.status).toBe(201);
    expect(res.body.ok).toBe(true);
    expect(res.body.data.name).toBe('Laser & Optics Lab');
    expect(res.body.data.timezone).toBe('Asia/Kolkata');
  });
});

// ── PATCH /api/v1/facilities/:id ──────────────────────────────────────────────

describe('PATCH /api/v1/facilities/:id — partial update', () => {
  it('returns 403 when user does not have owner/admin role for this facility', async () => {
    const token = makeToken({
      role: 'REQUESTER',
      memberships: [{ institutionId: 'other-inst', role: 'ADMIN' }],
    });

    jest.spyOn(facilityRepo, 'findById').mockResolvedValueOnce({
      id: FAC_ID,
      institution_id: INST_ID,
      name: 'Lab',
    });

    const res = await request(app)
      .patch(`/api/v1/facilities/${FAC_ID}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Renamed Lab' });

    expect(res.status).toBe(403);
  });

  it('allows facility update by platform admin or institution admin', async () => {
    const token = makeToken({ role: 'ADMIN' }); // platform admin

    jest.spyOn(facilityRepo, 'findById').mockResolvedValueOnce({
      id: FAC_ID,
      institution_id: INST_ID,
      name: 'Old Name',
    });

    jest.spyOn(facilityRepo, 'update').mockResolvedValueOnce({
      id: FAC_ID,
      institution_id: INST_ID,
      name: 'New Name',
      timezone: 'UTC',
      geofence_radius_meters: 200,
      working_hours: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

    const res = await request(app)
      .patch(`/api/v1/facilities/${FAC_ID}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'New Name', geofenceRadiusMeters: 200 });

    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
    expect(res.body.data.name).toBe('New Name');
    expect(res.body.data.geofenceRadiusMeters).toBe(200);
  });
});
