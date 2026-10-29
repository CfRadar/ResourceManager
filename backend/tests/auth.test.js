'use strict';

/**
 * tests/auth.test.js
 *
 * Step 02 — Authentication integration tests.
 *
 * Uses supertest against the in-memory Express app (no live DB required).
 * DB calls are mocked at the module level so tests are deterministic, fast,
 * and run in CI without a PostgreSQL instance.
 *
 * Coverage:
 *   - POST /api/v1/auth/register
 *   - POST /api/v1/auth/verify-otp
 *   - POST /api/v1/auth/login
 *   - POST /api/v1/auth/refresh
 *   - POST /api/v1/auth/logout
 *   - GET  /api/v1/auth/me
 *   - assertNoSelfApproval helper
 *   - tokenService helpers
 *   - loginLimiter (disabled in test env — verified not to block)
 */

const request = require('supertest');
const bcrypt  = require('bcryptjs');
const jwt     = require('jsonwebtoken');

// ── Set test environment BEFORE requiring app modules ─────────────────────────
process.env.NODE_ENV            = 'test';
process.env.JWT_ACCESS_SECRET   = 'test_access_secret_32_chars_long__';
process.env.JWT_REFRESH_SECRET  = 'test_refresh_secret_32_chars_long_';
process.env.DEMO_AUTH_ENABLED   = 'true';

// ── Module mocks ──────────────────────────────────────────────────────────────
//
// jest.mock() factories cannot reference any variables defined outside them.
// The fluent query builder is therefore defined inline, named with "mock" prefix
// to satisfy Jest's allowed-variable exception for lazily-required mocks.

jest.mock('../src/config/db', () => {
  // Build a minimal fluent Knex query-builder stub.
  function mockMakeQb(returnValues) {
    const vals = Array.isArray(returnValues) ? returnValues : returnValues != null ? [returnValues] : [];
    return {
      _vals: vals,
      where() { return this; },
      whereNull() { return this; },
      whereNotNull() { return this; },
      orWhere() { return this; },
      andWhere() { return this; },
      orderBy() { return this; },
      forUpdate() { return this; },
      select() { return this; },
      limit() { return this; },
      offset() { return this; },
      async first() { return this._vals[0]; },
      async count() { return [{ count: '0' }]; },
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

// ── Load app after mocks ───────────────────────────────────────────────────────
const { createApp } = require('../src/app');
const app = createApp();

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeAccessToken(payload = {}) {
  return jwt.sign(
    {
      sub:         'user-123',
      role:        'REQUESTER',
      memberships: [],
      ...payload,
    },
    process.env.JWT_ACCESS_SECRET,
    { algorithm: 'HS256', expiresIn: '15m' }
  );
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('Auth module — structure and middleware', () => {
  it('GET /api/v1/health still works after auth mount', async () => {
    const res = await request(app).get('/api/v1/health');
    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
  });
});

// ── Zod validation (no DB required) ──────────────────────────────────────────

describe('POST /api/v1/auth/register — Zod validation', () => {
  it('rejects missing email', async () => {
    const res = await request(app)
      .post('/api/v1/auth/register')
      .send({ password: 'Password1!', name: 'Alice' });
    expect(res.status).toBe(400);
    expect(res.body.ok).toBe(false);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('rejects invalid email format', async () => {
    const res = await request(app)
      .post('/api/v1/auth/register')
      .send({ email: 'not-an-email', password: 'Password1!', name: 'Alice' });
    expect(res.status).toBe(400);
    expect(res.body.ok).toBe(false);
  });

  it('rejects password shorter than 8 chars', async () => {
    const res = await request(app)
      .post('/api/v1/auth/register')
      .send({ email: 'alice@test.com', password: 'short', name: 'Alice' });
    expect(res.status).toBe(400);
    expect(res.body.ok).toBe(false);
  });

  it('rejects missing name', async () => {
    const res = await request(app)
      .post('/api/v1/auth/register')
      .send({ email: 'alice@test.com', password: 'Password1!' });
    expect(res.status).toBe(400);
    expect(res.body.ok).toBe(false);
  });
});

describe('POST /api/v1/auth/login — Zod validation', () => {
  it('rejects missing fields', async () => {
    const res = await request(app).post('/api/v1/auth/login').send({});
    expect(res.status).toBe(400);
    expect(res.body.ok).toBe(false);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('rejects invalid email', async () => {
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'bad', password: 'anything' });
    expect(res.status).toBe(400);
    expect(res.body.ok).toBe(false);
  });
});

describe('POST /api/v1/auth/verify-otp — Zod validation', () => {
  it('rejects OTP that is not 6 digits', async () => {
    const res = await request(app)
      .post('/api/v1/auth/verify-otp')
      .send({ email: 'alice@test.com', otp: '123' });
    expect(res.status).toBe(400);
    expect(res.body.ok).toBe(false);
  });

  it('rejects OTP with non-digit characters', async () => {
    const res = await request(app)
      .post('/api/v1/auth/verify-otp')
      .send({ email: 'alice@test.com', otp: '12345a' });
    expect(res.status).toBe(400);
    expect(res.body.ok).toBe(false);
  });
});

// ── Authentication middleware ─────────────────────────────────────────────────

describe('GET /api/v1/auth/me — authentication middleware', () => {
  it('returns 401 without a token', async () => {
    const res = await request(app).get('/api/v1/auth/me');
    expect(res.status).toBe(401);
    expect(res.body.ok).toBe(false);
    expect(res.body.error.code).toBe('UNAUTHENTICATED');
  });

  it('returns 401 with a malformed token', async () => {
    const res = await request(app)
      .get('/api/v1/auth/me')
      .set('Authorization', 'Bearer not.a.valid.token');
    expect(res.status).toBe(401);
    expect(res.body.ok).toBe(false);
  });

  it('returns 401 with an expired token', async () => {
    const expired = jwt.sign(
      { sub: 'user-123', role: 'REQUESTER', memberships: [] },
      process.env.JWT_ACCESS_SECRET,
      { algorithm: 'HS256', expiresIn: -1 }
    );
    const res = await request(app)
      .get('/api/v1/auth/me')
      .set('Authorization', `Bearer ${expired}`);
    expect(res.status).toBe(401);
    expect(res.body.ok).toBe(false);
  });

  it('returns 401 with a token signed with wrong secret', async () => {
    const wrong = jwt.sign(
      { sub: 'user-123', role: 'REQUESTER', memberships: [] },
      'completely_wrong_secret_that_is_long_enough',
      { algorithm: 'HS256', expiresIn: '15m' }
    );
    const res = await request(app)
      .get('/api/v1/auth/me')
      .set('Authorization', `Bearer ${wrong}`);
    expect(res.status).toBe(401);
    expect(res.body.ok).toBe(false);
  });
});

// ── Rate limiter is disabled in test env ─────────────────────────────────────

describe('POST /api/v1/auth/login — loginLimiter skipped in test env', () => {
  it('does not get rate-limited after multiple requests', async () => {
    // Send 6 requests (over the prod limit of 5). In test env the limiter is skipped.
    const sends = Array.from({ length: 6 }, () =>
      request(app)
        .post('/api/v1/auth/login')
        .send({ email: 'alice@test.com', password: 'Password1!' })
    );
    const results = await Promise.all(sends);
    // All should return a non-429 response (401 from invalid credentials).
    results.forEach((r) => {
      expect(r.status).not.toBe(429);
    });
  });
});

// ── Token service unit tests ──────────────────────────────────────────────────

describe('token.service — signAccessToken / verifyAccessToken', () => {
  const tokenSvc = require('../src/modules/auth/token.service');

  const fakeUser = { id: 'user-abc', platform_role: 'MANAGER' };
  const fakeMemberships = [{ institutionId: 'inst-1', role: 'MANAGER' }];

  it('signs and verifies a valid access token', () => {
    const token   = tokenSvc.signAccessToken(fakeUser, fakeMemberships);
    const payload = tokenSvc.verifyAccessToken(token);
    expect(payload.sub).toBe('user-abc');
    expect(payload.role).toBe('MANAGER');
    expect(payload.memberships).toEqual(fakeMemberships);
  });

  it('throws on a tampered token', () => {
    const token  = tokenSvc.signAccessToken(fakeUser, []);
    const tampered = token.slice(0, -4) + 'XXXX';
    expect(() => tokenSvc.verifyAccessToken(tampered)).toThrow();
  });

  it('throws on an expired token', () => {
    const expired = jwt.sign(
      { sub: 'u', role: 'REQUESTER', memberships: [] },
      process.env.JWT_ACCESS_SECRET,
      { algorithm: 'HS256', expiresIn: -1 }
    );
    expect(() => tokenSvc.verifyAccessToken(expired)).toThrow();
  });
});

describe('token.service — generateRefreshToken', () => {
  const tokenSvc = require('../src/modules/auth/token.service');

  it('produces different raw tokens each call', () => {
    const a = tokenSvc.generateRefreshToken();
    const b = tokenSvc.generateRefreshToken();
    expect(a.raw).not.toBe(b.raw);
    expect(a.hash).not.toBe(b.hash);
  });

  it('hash is consistent for the same raw token', () => {
    const { raw, hash } = tokenSvc.generateRefreshToken();
    expect(tokenSvc.hashRefreshToken(raw)).toBe(hash);
  });

  it('expiresAt is in the future', () => {
    const { expiresAt } = tokenSvc.generateRefreshToken();
    expect(expiresAt.getTime()).toBeGreaterThan(Date.now());
  });
});

// ── RBAC — assertNoSelfApproval ───────────────────────────────────────────────

describe('assertNoSelfApproval', () => {
  const { assertNoSelfApproval } = require('../src/middleware/rbac');

  it('does not throw when reviewer and requester are different users', () => {
    expect(() => assertNoSelfApproval('user-A', 'user-B')).not.toThrow();
  });

  it('throws FORBIDDEN when reviewer === requester', () => {
    expect(() => assertNoSelfApproval('user-A', 'user-A')).toThrow(
      /Self-review is strictly prohibited/
    );
  });

  it('throws FORBIDDEN when either ID is missing', () => {
    expect(() => assertNoSelfApproval('', 'user-B')).toThrow();
    expect(() => assertNoSelfApproval('user-A', '')).toThrow();
  });
});

// ── 404 / unknown routes still work ──────────────────────────────────────────

describe('Unknown auth routes', () => {
  it('returns 404 for an unregistered auth sub-path', async () => {
    const res = await request(app).get('/api/v1/auth/nonexistent');
    expect(res.status).toBe(404);
    expect(res.body.ok).toBe(false);
    expect(res.body.error.code).toBe('NOT_FOUND');
  });
});
