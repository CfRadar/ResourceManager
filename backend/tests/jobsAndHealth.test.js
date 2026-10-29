'use strict';

/**
 * tests/jobsAndHealth.test.js
 *
 * Step 10 — Background Scheduled Jobs, Admin Operations, Notifications,
 * Dashboards, AI Proxy & Health Probes (Spec §4.19, §4.21, §4.23, §4.24, §5.3).
 */

const request = require('supertest');
const jwt     = require('jsonwebtoken');

process.env.NODE_ENV           = 'test';
process.env.JWT_ACCESS_SECRET  = 'test_access_secret_32_chars_long__';
process.env.JWT_REFRESH_SECRET = 'test_refresh_secret_32_chars_long_';

// Mock DB
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
      andWhereRaw() { return this; },
      join() { return this; },
      leftJoin() { return this; },
      orderBy() { return this; },
      select() { return this; },
      distinctOn() { return this; },
      limit() { return this; },
      offset() { return this; },
      groupBy() { return this; },
      max() { return this; },
      clone() { return this; },
      clearSelect() { return this; },
      async first() { return this._vals[0] || null; },
      async count() { return [{ count: '1', total: '1', unread: '0' }]; },
      async countDistinct() { return [{ total: '1' }]; },
      update() { return this; },
      returning() { return this; },
      async insert() { return this._vals; },
      then(resolve) { return Promise.resolve(this._vals).then(resolve); },
    };
  }

  const mockDbFn = (table) => {
    if (table === 'notifications') {
      return mockMakeQb([
        {
          id:         'notif-1',
          user_id:    '11111111-1111-4111-8111-111111111111',
          event_type: 'BOOKING_REMINDER_24H',
          title:      'Upcoming Booking',
          body:       'Your booking is in 24 hours',
          read:       false,
        },
      ]);
    }
    if (table === 'users') {
      return mockMakeQb([
        {
          id:            'user-to-suspend',
          email:         'test@user.edu',
          name:          'Test User',
          status:        'ACTIVE',
          platform_role: 'REQUESTER',
        },
      ]);
    }
    return mockMakeQb([]);
  };

  mockDbFn.fn = { now: () => new Date() };
  mockDbFn.raw = async () => true;
  mockDbFn.transaction = async (cb) => cb(mockDbFn);

  return { db: mockDbFn };
});

const { createApp } = require('../src/app');
const scheduler = require('../src/services/scheduler');
const { runBookingReminders } = require('../src/jobs/bookingReminders');
const { runOverdueCheck } = require('../src/jobs/overdueCheck');
const { runNoShowCheck } = require('../src/jobs/noShowCheck');
const { runDocAndTrainingExpiry } = require('../src/jobs/docAndTrainingExpiry');
const { runWaitlistExpiry } = require('../src/jobs/waitlistExpiry');
const { runReferralTimeout } = require('../src/jobs/referralTimeout');
const { runAuditIntegrityCheck } = require('../src/jobs/auditIntegrityCheck');

const app = createApp();

const USER_ID  = '11111111-1111-4111-8111-111111111111';
const ADMIN_ID = '22222222-2222-4222-8222-222222222222';
const INST_ID  = '33333333-3333-4333-8333-333333333333';

function makeToken(payload = {}) {
  return jwt.sign(
    {
      sub:         USER_ID,
      role:        'REQUESTER',
      memberships: [],
      ...payload,
    },
    process.env.JWT_ACCESS_SECRET,
    { algorithm: 'HS256', expiresIn: '15m' }
  );
}

describe('Step 10 — Background Jobs, System Health, Notifications & Admin', () => {
  describe('1. Background Job Execution Handlers', () => {
    it('runBookingReminders executes cleanly and returns counts', async () => {
      const res = await runBookingReminders();
      expect(res).toBeDefined();
      expect(typeof res.remindersSent).toBe('number');
    });

    it('runOverdueCheck executes without unhandled errors', async () => {
      const res = await runOverdueCheck();
      expect(res).toBeDefined();
      expect(typeof res.markedOverdue).toBe('number');
    });

    it('runNoShowCheck executes without errors', async () => {
      const res = await runNoShowCheck();
      expect(res).toBeDefined();
      expect(typeof res.flaggedCount).toBe('number');
    });

    it('runDocAndTrainingExpiry executes and reports expired items', async () => {
      const res = await runDocAndTrainingExpiry();
      expect(res).toBeDefined();
      expect(typeof res.expiredDocs).toBe('number');
      expect(typeof res.expiredTrainings).toBe('number');
    });

    it('runWaitlistExpiry executes and checks FIFO candidates', async () => {
      const res = await runWaitlistExpiry();
      expect(res).toBeDefined();
      expect(typeof res.expiredOffers).toBe('number');
      expect(typeof res.newOffers).toBe('number');
    });

    it('runReferralTimeout executes cleanly', async () => {
      const res = await runReferralTimeout();
      expect(res).toBeDefined();
      expect(typeof res.timedOutCount).toBe('number');
    });

    it('runAuditIntegrityCheck validates hash chain and returns status', async () => {
      const res = await runAuditIntegrityCheck();
      expect(res).toBeDefined();
      expect(res.valid).toBe(true);
      expect(res.checkedAt).toBeDefined();
    });

    it('scheduler.runJob executes registered job and updates telemetry', async () => {
      const res = await scheduler.runJob('auditIntegrityCheck');
      expect(res.status).toBe('SUCCESS');
      expect(typeof res.durationMs).toBe('number');

      const statuses = scheduler.getJobStatus();
      const job = statuses.find((j) => j.name === 'auditIntegrityCheck');
      expect(job).toBeDefined();
      expect(job.lastStatus).toBe('SUCCESS');
      expect(job.runCount).toBeGreaterThan(0);
    });
  });

  describe('2. System Health & Probes (Spec §4.23)', () => {
    it('GET /api/v1/health returns status, DB status, and job telemetry', async () => {
      const res = await request(app).get('/api/v1/health');
      expect(res.status).toBe(200);
      expect(res.body.ok).toBe(true);
      expect(res.body.data.status).toBe('healthy');
      expect(res.body.data.db).toBe('connected');
      expect(Array.isArray(res.body.data.jobs)).toBe(true);
    });
  });

  describe('3. Admin Operations (Spec §4.23)', () => {
    it('GET /api/v1/admin/jobs returns background job registry to admin', async () => {
      const adminToken = makeToken({
        sub:         ADMIN_ID,
        role:        'PLATFORM_ADMIN',
        memberships: [{ institutionId: INST_ID, role: 'ADMIN' }],
      });

      const res = await request(app)
        .get('/api/v1/admin/jobs')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.ok).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBeGreaterThanOrEqual(7);
    });

    it('POST /api/v1/admin/jobs/:jobName/run triggers job on-demand', async () => {
      const adminToken = makeToken({
        sub:         ADMIN_ID,
        role:        'PLATFORM_ADMIN',
        memberships: [{ institutionId: INST_ID, role: 'ADMIN' }],
      });

      const res = await request(app)
        .post('/api/v1/admin/jobs/bookingReminders/run')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.ok).toBe(true);
      expect(res.body.data.name).toBe('bookingReminders');
    });

    it('GET /api/v1/admin/users searches user accounts', async () => {
      const adminToken = makeToken({
        sub:         ADMIN_ID,
        role:        'PLATFORM_ADMIN',
        memberships: [{ institutionId: INST_ID, role: 'ADMIN' }],
      });

      const res = await request(app)
        .get('/api/v1/admin/users?query=test')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.ok).toBe(true);
      expect(Array.isArray(res.body.data.items)).toBe(true);
    });

    it('POST /api/v1/admin/users/:id/suspend suspends account and audits', async () => {
      const adminToken = makeToken({
        sub:         ADMIN_ID,
        role:        'PLATFORM_ADMIN',
        memberships: [{ institutionId: INST_ID, role: 'ADMIN' }],
      });

      const res = await request(app)
        .post('/api/v1/admin/users/44444444-4444-4444-4444-444444444444/suspend')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ reason: 'Repeated policy violations and no-show strikes.' });

      expect(res.status).toBe(200);
      expect(res.body.ok).toBe(true);
    });

    it('POST /api/v1/admin/users/:id/suspend prevents self-suspension', async () => {
      const adminToken = makeToken({
        sub:         ADMIN_ID,
        role:        'PLATFORM_ADMIN',
        memberships: [{ institutionId: INST_ID, role: 'ADMIN' }],
      });

      const res = await request(app)
        .post(`/api/v1/admin/users/${ADMIN_ID}/suspend`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ reason: 'Accidental self lockout' });

      expect(res.status).toBe(400);
    });
  });

  describe('4. In-App Notifications (Spec §4.19)', () => {
    it('GET /api/v1/notifications lists user notifications with unread counts', async () => {
      const userToken = makeToken();
      const res = await request(app)
        .get('/api/v1/notifications')
        .set('Authorization', `Bearer ${userToken}`);

      expect(res.status).toBe(200);
      expect(res.body.ok).toBe(true);
      expect(Array.isArray(res.body.data.items)).toBe(true);
    });

    it('POST /api/v1/notifications/:id/read marks notification as read', async () => {
      const userToken = makeToken();
      const res = await request(app)
        .post('/api/v1/notifications/notif-1/read')
        .set('Authorization', `Bearer ${userToken}`);

      expect(res.status).toBe(200);
      expect(res.body.ok).toBe(true);
    });

    it('POST /api/v1/notifications/read-all marks all notifications as read', async () => {
      const userToken = makeToken();
      const res = await request(app)
        .post('/api/v1/notifications/read-all')
        .set('Authorization', `Bearer ${userToken}`);

      expect(res.status).toBe(200);
      expect(res.body.ok).toBe(true);
    });
  });

  describe('5. Role-Specific Dashboards (Spec §4.21)', () => {
    it('GET /api/v1/dashboard/requester returns user dashboard', async () => {
      const userToken = makeToken();
      const res = await request(app)
        .get('/api/v1/dashboard/requester')
        .set('Authorization', `Bearer ${userToken}`);

      expect(res.status).toBe(200);
      expect(res.body.ok).toBe(true);
      expect(res.body.data.pendingRequestsCount).toBeDefined();
    });

    it('GET /api/v1/dashboard/manager returns manager queue telemetry', async () => {
      const managerToken = makeToken({
        role:        'MANAGER',
        memberships: [{ institutionId: INST_ID, role: 'MANAGER' }],
      });

      const res = await request(app)
        .get('/api/v1/dashboard/manager')
        .set('Authorization', `Bearer ${managerToken}`);

      expect(res.status).toBe(200);
      expect(res.body.ok).toBe(true);
      expect(res.body.data.queueCounts).toBeDefined();
    });

    it('GET /api/v1/dashboard/admin returns institutional counts and audit integrity', async () => {
      const adminToken = makeToken({
        sub:         ADMIN_ID,
        role:        'PLATFORM_ADMIN',
        memberships: [{ institutionId: INST_ID, role: 'ADMIN' }],
      });

      const res = await request(app)
        .get('/api/v1/dashboard/admin')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.ok).toBe(true);
      expect(res.body.data.auditIntegrity).toBeDefined();
    });
  });

  describe('6. AI Proxy Layer & Fallback (Spec §4.24)', () => {
    it('POST /api/v1/ai/match-need returns keyword fallback when AI service is offline', async () => {
      const userToken = makeToken();
      const res = await request(app)
        .post('/api/v1/ai/match-need')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ text: 'Need a high precision 3D printer for medical implants' });

      expect(res.status).toBe(200);
      expect(res.body.ok).toBe(true);
      expect(res.body.data.source).toBe('KEYWORD_FALLBACK');
      expect(Array.isArray(res.body.data.rankedResources)).toBe(true);
    });

    it('POST /api/v1/ai/parse-need structures free text input', async () => {
      const userToken = makeToken();
      const res = await request(app)
        .post('/api/v1/ai/parse-need')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ text: 'Laser cutting 5mm birch plywood for architectural model' });

      expect(res.status).toBe(200);
      expect(res.body.ok).toBe(true);
      expect(res.body.data.technicalRequirements).toBeDefined();
    });
  });
});
