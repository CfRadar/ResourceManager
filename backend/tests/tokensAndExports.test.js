'use strict';

/**
 * tests/tokensAndExports.test.js
 *
 * Step 09 — Tokens, Invoicing, and Spreadsheet/PDF Document Exports (Spec §4.17, §4.18, §4.22).
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
      groupBy() { return this; },
      select() { return this; },
      limit() { return this; },
      offset() { return this; },
      max() { return this; },
      clone() { return this; },
      clearSelect() { return this; },
      async first() { return this._vals[0]; },
      async sum() { return this._vals[0] || { total: '100' }; },
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
  mockDbFn.raw = (str) => str;
  mockDbFn.transaction = async (cb) => {
    const mockTrx = () => mockMakeQb([]);
    mockTrx.fn = { now: () => new Date() };
    return cb(mockTrx);
  };
  return { db: mockDbFn };
});

const { createApp }          = require('../src/app');
const tokenService           = require('../src/services/tokenService');
const { bookingRepo }        = require('../src/modules/bookings/bookings.repository');
const { policyRepo }         = require('../src/modules/policies/policies.repository');
const { incidentRepo }       = require('../src/modules/incidents/incidents.repository');
const { exportsService }     = require('../src/modules/exports/exports.service');

const app = createApp();

const USER_ID     = '11111111-1111-4111-8111-111111111111';
const ADMIN_ID    = '22222222-2222-4222-8222-222222222222';
const BOOKING_ID  = '33333333-3333-4333-8333-333333333333';
const INCIDENT_ID = '44444444-4444-4444-8444-444444444444';

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

describe('Step 09 — Tokens, Invoicing & Document Exports', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('1. Fair-Use Token Ledger (/tokens)', () => {
    it('GET /api/v1/tokens/balance returns balance and hold breakdown', async () => {
      jest.spyOn(tokenService, 'balance').mockResolvedValue({
        balance:          150,
        held:             20,
        available:        130,
        monthlyAllowance: 100,
      });

      const token = makeToken();
      const res = await request(app)
        .get('/api/v1/tokens/balance')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.ok).toBe(true);
      expect(res.body.data.balance).toBe(150);
      expect(res.body.data.held).toBe(20);
    });

    it('GET /api/v1/tokens/ledger returns paginated ledger entries', async () => {
      jest.spyOn(tokenService, 'getLedger').mockResolvedValue({
        items: [
          { id: 'tok-1', amount: 100, type: 'ALLOWANCE', reason: 'Monthly grant' },
          { id: 'tok-2', amount: -20, type: 'HOLD', reason: 'Booking hold' },
        ],
        total: 2,
        page:  1,
        limit: 20,
      });

      const token = makeToken();
      const res = await request(app)
        .get('/api/v1/tokens/ledger')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.data.length).toBe(2);
      expect(res.body.meta.total).toBe(2);
    });

    it('POST /api/v1/admin/tokens/grant rejects non-admin with 403', async () => {
      const token = makeToken({ role: 'REQUESTER' });
      const res = await request(app)
        .post('/api/v1/admin/tokens/grant')
        .set('Authorization', `Bearer ${token}`)
        .send({
          userId: USER_ID,
          amount: 50,
          reason: 'Hackathon grant',
        });
      expect(res.status).toBe(403);
    });

    it('POST /api/v1/admin/tokens/grant grants tokens when called by admin', async () => {
      jest.spyOn(tokenService, 'grant').mockResolvedValue({
        id:      'tok-grant-1',
        user_id: USER_ID,
        amount:  50,
        type:    'GRANT',
        reason:  'Project scholarship',
      });

      const token = makeToken({ sub: ADMIN_ID, role: 'ADMIN' });
      const res = await request(app)
        .post('/api/v1/admin/tokens/grant')
        .set('Authorization', `Bearer ${token}`)
        .send({
          userId: USER_ID,
          amount: 50,
          reason: 'Project scholarship',
        });

      expect(res.status).toBe(201);
      expect(res.body.data.amount).toBe(50);
    });
  });

  describe('2. Simulated Billing & Invoicing (/bookings/:id/cost-estimate, /invoices)', () => {
    it('calculates cost estimate with hourly and operator rates and demo: true', async () => {
      jest.spyOn(bookingRepo, 'findDetailById').mockResolvedValue({
        id:          BOOKING_ID,
        resource_id: 'res-1111',
        start_time:  '2026-11-01T10:00:00Z',
        end_time:    '2026-11-01T12:00:00Z', // 2 hours
      });
      jest.spyOn(policyRepo, 'findCurrentPolicy').mockResolvedValue({
        policyData: {
          pricing: {
            model:         'HOURLY',
            hourlyRate:    500,
            operatorFee:   200,
            tokensPerHour: 5,
          },
        },
      });

      const token = makeToken();
      const res = await request(app)
        .get(`/api/v1/bookings/${BOOKING_ID}/cost-estimate`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.data.demo).toBe(true);
      expect(res.body.data.totalCost).toBe(1200); // 2 * 500 + 200
      expect(res.body.data.tokenEstimate).toBe(10); // 2 * 5
    });

    it('POST /api/v1/bookings/:id/invoice generates demo invoice', async () => {
      jest.spyOn(bookingRepo, 'findDetailById').mockResolvedValue({
        id:          BOOKING_ID,
        resource_id: 'res-1111',
        start_time:  '2026-11-01T10:00:00Z',
        end_time:    '2026-11-01T12:00:00Z',
      });
      jest.spyOn(policyRepo, 'findCurrentPolicy').mockResolvedValue({
        policyData: {
          pricing: { model: 'HOURLY', hourlyRate: 500 },
        },
      });

      const token = makeToken({ role: 'MANAGER' });
      const res = await request(app)
        .post(`/api/v1/bookings/${BOOKING_ID}/invoice`)
        .set('Authorization', `Bearer ${token}`)
        .send({});

      expect(res.status).toBe(201);
      expect(res.body.data.demo).toBe(true);
      expect(res.body.data.status).toBe('UNPAID');
    });

    it('POST /api/v1/invoices/:id/mark-paid confirms simulated payment', async () => {
      const token = makeToken({ role: 'MANAGER' });
      const res = await request(app)
        .post('/api/v1/invoices/inv-101/mark-paid')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.data.demo).toBe(true);
      expect(res.body.data.status).toBe('PAID');
      expect(res.body.data.notice).toContain('Simulated payment in sandbox');
    });
  });

  describe('3. Document & Spreadsheet Exports (/exports)', () => {
    it('GET /api/v1/exports/bookings.xlsx streams Excel workbook', async () => {
      jest.spyOn(exportsService, 'generateBookingsExcel').mockResolvedValue(
        Buffer.from('fake-xlsx-binary-stream')
      );

      const token = makeToken({ role: 'MANAGER' });
      const res = await request(app)
        .get('/api/v1/exports/bookings.xlsx')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.headers['content-type']).toContain('spreadsheetml.sheet');
      expect(res.headers['content-disposition']).toContain('bookings.xlsx');
    });

    it('GET /api/v1/exports/audit.csv streams CSV text log', async () => {
      jest.spyOn(exportsService, 'generateAuditCsv').mockResolvedValue(
        Buffer.from('seq,at,action,hash\n1,2026-10-29T10:00:00Z,BOOKING_APPROVED,abc123hash')
      );

      const token = makeToken({ role: 'ADMIN' });
      const res = await request(app)
        .get('/api/v1/exports/audit.csv')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.headers['content-type']).toContain('text/csv');
      expect(res.text).toContain('seq,at,action,hash');
    });

    it('GET /api/v1/exports/incident-report/:id.pdf streams PDF dossier', async () => {
      jest.spyOn(exportsService, 'generateIncidentPdf').mockResolvedValue(
        Buffer.from('%PDF-1.4 simulated pdf data')
      );

      const token = makeToken({ role: 'MANAGER' });
      const res = await request(app)
        .get(`/api/v1/exports/incident-report/${INCIDENT_ID}.pdf`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.headers['content-type']).toBe('application/pdf');
    });

    it('GET /api/v1/exports/transaction/:requestId.pdf streams receipt PDF', async () => {
      jest.spyOn(exportsService, 'generateTransactionPdf').mockResolvedValue(
        Buffer.from('%PDF-1.4 simulated receipt data')
      );

      const token = makeToken();
      const res = await request(app)
        .get(`/api/v1/exports/transaction/${BOOKING_ID}.pdf`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.headers['content-type']).toBe('application/pdf');
    });
  });
});

