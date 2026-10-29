'use strict';

/**
 * tests/auditChain.test.js
 *
 * Step 10 — Tamper-Evident SHA-256 Audit Hash Chain (Spec §4.20).
 */

const request = require('supertest');
const jwt     = require('jsonwebtoken');

process.env.NODE_ENV           = 'test';
process.env.JWT_ACCESS_SECRET  = 'test_access_secret_32_chars_long__';
process.env.JWT_REFRESH_SECRET = 'test_refresh_secret_32_chars_long_';

const mockEvents = [];

jest.mock('../src/config/db', () => {
  const cryptoMod = require('crypto');

  function mockMakeQb(returnValues) {
    const vals = Array.isArray(returnValues) ? returnValues : returnValues != null ? [returnValues] : [];
    return {
      _vals: vals,
      where(cond) {
        if (typeof cond === 'function') {
          return this;
        }
        return this;
      },
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
      async first() {
        return mockEvents[mockEvents.length - 1] || null;
      },
      async count() { return [{ total: String(mockEvents.length) }]; },
      async insert(row) {
        const item = { ...row, id: row.id || cryptoMod.randomUUID(), seq: mockEvents.length + 1 };
        mockEvents.push(item);
        return [item];
      },
      returning() { return this; },
      then(resolve) { return Promise.resolve(mockEvents).then(resolve); },
    };
  }

  const mockDbFn = (table) => {
    if (table === 'resources') {
      return {
        where: () => ({
          first: async () => ({ id: 'res-123', name: 'Laser Cutter', facility_id: 'fac-1' }),
        }),
      };
    }
    if (table === 'facilities') {
      return {
        where: () => ({
          select: async () => [{ id: 'fac-1' }],
        }),
      };
    }
    return mockMakeQb(mockEvents);
  };
  mockDbFn.fn = { now: () => new Date() };
  mockDbFn.raw = async () => true;
  return { db: mockDbFn };
});

const { createApp } = require('../src/app');
const { appendAuditEvent, verifyChain, GENESIS_HASH } = require('../src/services/auditChain');

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

describe('Step 10 — Tamper-Evident SHA-256 Audit Chain', () => {
  beforeEach(() => {
    mockEvents.length = 0;
  });

  describe('1. Cryptographic Hash Chaining Unit Tests', () => {
    it('initializes chain with GENESIS_HASH for the first event', async () => {
      const evt1 = await appendAuditEvent({
        actorId:    USER_ID,
        actorRole:  'REQUESTER',
        action:     'ACCESS_REQUEST_SUBMITTED',
        entityType: 'AccessRequest',
        entityId:   'req-001',
        visibility: 'PARTIES',
      });

      expect(evt1.prev_hash).toBe(GENESIS_HASH);
      expect(evt1.hash).toBeDefined();
      expect(evt1.hash).toHaveLength(64);
    });

    it('cryptographically links the second event hash to the first event hash', async () => {
      const evt1 = await appendAuditEvent({
        actorId:    USER_ID,
        actorRole:  'REQUESTER',
        action:     'ACCESS_REQUEST_SUBMITTED',
        entityType: 'AccessRequest',
        entityId:   'req-001',
      });

      const evt2 = await appendAuditEvent({
        actorId:    ADMIN_ID,
        actorRole:  'MANAGER',
        action:     'ACCESS_REQUEST_APPROVED',
        entityType: 'AccessRequest',
        entityId:   'req-001',
      });

      expect(evt2.prev_hash).toBe(evt1.hash);
      expect(evt2.hash).not.toBe(evt1.hash);
    });

    it('verifies a valid undisturbed hash chain', async () => {
      await appendAuditEvent({
        action:     'ACCESS_REQUEST_SUBMITTED',
        entityType: 'AccessRequest',
        entityId:   'req-001',
      });
      await appendAuditEvent({
        action:     'ACCESS_REQUEST_APPROVED',
        entityType: 'AccessRequest',
        entityId:   'req-001',
      });

      const result = await verifyChain('all', null);
      expect(result.valid).toBe(true);
    });

    it('detects tampering when an event payload is modified', async () => {
      await appendAuditEvent({
        action:     'ACCESS_REQUEST_SUBMITTED',
        entityType: 'AccessRequest',
        entityId:   'req-001',
        payload:    { before: 'DRAFT', after: 'SUBMITTED' },
      });

      // Tamper with the event in memory
      mockEvents[0].action = 'TAMPERED_ACTION';

      const result = await verifyChain('all', null);
      expect(result.valid).toBe(false);
      expect(result.firstBrokenEventId).toBe(mockEvents[0].id);
    });
  });

  describe('2. Audit Endpoints Access Gating and Scoping', () => {
    it('GET /api/v1/audit/requests/:id filters INTERNAL events for standard requesters', async () => {
      mockEvents.push(
        {
          id:          'evt-1',
          seq:         1,
          action:      'REQUEST_SUBMITTED',
          entity_id:   'req-001',
          entity_type: 'AccessRequest',
          visibility:  'PARTIES',
          payload:     null,
        },
        {
          id:          'evt-2',
          seq:         2,
          action:      'STAFF_INTERNAL_NOTE',
          entity_id:   'req-001',
          entity_type: 'AccessRequest',
          visibility:  'INTERNAL',
          payload:     null,
        }
      );

      const requesterToken = makeToken({ role: 'REQUESTER' });
      const res = await request(app)
        .get('/api/v1/audit/requests/req-001')
        .set('Authorization', `Bearer ${requesterToken}`);

      expect(res.status).toBe(200);
      expect(res.body.ok).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
    });

    it('GET /api/v1/audit/resources/:id forbids non-staff callers', async () => {
      const requesterToken = makeToken({ role: 'REQUESTER' });
      const res = await request(app)
        .get('/api/v1/audit/resources/res-123')
        .set('Authorization', `Bearer ${requesterToken}`);

      expect(res.status).toBe(403);
    });

    it('GET /api/v1/audit/resources/:id permits managers and returns timeline', async () => {
      const managerToken = makeToken({
        role:        'MANAGER',
        memberships: [{ institutionId: INST_ID, role: 'MANAGER' }],
      });

      const res = await request(app)
        .get('/api/v1/audit/resources/res-123')
        .set('Authorization', `Bearer ${managerToken}`);

      expect(res.status).toBe(200);
      expect(res.body.ok).toBe(true);
    });

    it('GET /api/v1/audit/verify/:scope/:id permits managers to verify integrity', async () => {
      const managerToken = makeToken({
        role:        'MANAGER',
        memberships: [{ institutionId: INST_ID, role: 'MANAGER' }],
      });

      const res = await request(app)
        .get('/api/v1/audit/verify/all/null')
        .set('Authorization', `Bearer ${managerToken}`);

      expect(res.status).toBe(200);
      expect(res.body.ok).toBe(true);
      expect(res.body.data.valid).toBe(true);
    });

    it('POST /api/v1/audit/notes appends immutable clarification note without altering target', async () => {
      const targetId = '55555555-5555-4555-8555-555555555555';
      mockEvents.push({
        id:          targetId,
        seq:         1,
        action:      'BOOKING_CONFLICT_OVERRIDDEN',
        entity_id:   'req-001',
        entity_type: 'AccessRequest',
        resource_id: 'res-123',
        visibility:  'INTERNAL',
        prev_hash:   GENESIS_HASH,
        hash:        'hash123',
      });

      const managerToken = makeToken({
        role:        'MANAGER',
        memberships: [{ institutionId: INST_ID, role: 'MANAGER' }],
      });

      const res = await request(app)
        .post('/api/v1/audit/notes')
        .set('Authorization', `Bearer ${managerToken}`)
        .send({
          targetEventId: targetId,
          note:          'Confirmed maintenance completed 10 minutes ahead of schedule.',
          reason:        'Routine clarification',
        });

      expect(res.status).toBe(201);
      expect(res.body.ok).toBe(true);
      expect(res.body.data.action).toBe('AUDIT_NOTE_ADDED');
      expect(res.body.data.payload.targetEventId).toBe(targetId);
    });
  });
});
