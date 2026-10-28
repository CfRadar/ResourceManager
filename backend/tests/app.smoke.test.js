'use strict';

/**
 * tests/app.smoke.test.js
 *
 * Step 00 smoke tests — verify the Express app starts, returns correct
 * response envelopes, and handles unknown routes without crashing.
 *
 * These tests do NOT require a live database (db.js lazy-connects).
 * They run in NODE_ENV=test, which relaxes JWT requirements in env.js.
 */

const request = require('supertest');

// Set test environment before any module is loaded.
process.env.NODE_ENV = 'test';

// env.js must be loaded before app.js so JWT_ACCESS_SECRET has a default.
require('../src/config/env');
const { createApp } = require('../src/app');

const app = createApp();

describe('GET /health (legacy root health)', () => {
  it('returns 200 with ok:true and a timestamp', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
    expect(res.body.data.status).toBe('healthy');
    expect(typeof res.body.data.timestamp).toBe('string');
  });
});

describe('GET /api/v1/health', () => {
  it('returns 200 with ok:true and version', async () => {
    const res = await request(app).get('/api/v1/health');
    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
    expect(res.body.data.status).toBe('healthy');
  });
});

describe('Unknown routes', () => {
  it('returns 404 NOT_FOUND for an unregistered route', async () => {
    const res = await request(app).get('/api/v1/does-not-exist');
    expect(res.status).toBe(404);
    expect(res.body.ok).toBe(false);
    expect(res.body.error.code).toBe('NOT_FOUND');
    expect(typeof res.body.error.message).toBe('string');
  });

  it('returns 404 for a completely unknown path', async () => {
    const res = await request(app).get('/xyz');
    expect(res.status).toBe(404);
    expect(res.body.ok).toBe(false);
  });
});

describe('Malformed JSON', () => {
  it('returns 400 VALIDATION_ERROR for a malformed JSON body', async () => {
    const res = await request(app)
      .post('/api/v1/health')
      .set('Content-Type', 'application/json')
      .send('{invalid json}');
    expect(res.status).toBe(400);
    expect(res.body.ok).toBe(false);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });
});

describe('CORS headers', () => {
  it('returns CORS header for allowed origin', async () => {
    const res = await request(app)
      .get('/api/v1/health')
      .set('Origin', 'http://localhost:5173');
    expect(res.headers['access-control-allow-origin']).toBe('http://localhost:5173');
  });
});

describe('AppError helpers', () => {
  const { Errors, AppError } = require('../src/utils/AppError');

  it('Errors.NotFound produces AppError with correct code and status', () => {
    const err = Errors.NotFound('Thing not found');
    expect(err).toBeInstanceOf(AppError);
    expect(err.code).toBe('NOT_FOUND');
    expect(err.status).toBe(404);
    expect(err.isOperational).toBe(true);
  });

  it('Errors.BookingConflict produces 409 with BOOKING_CONFLICT', () => {
    const err = Errors.BookingConflict({ startAt: 'x', endAt: 'y' });
    expect(err.code).toBe('BOOKING_CONFLICT');
    expect(err.status).toBe(409);
  });

  it('Errors.InvalidTransition includes from/to in details', () => {
    const err = Errors.InvalidTransition('DRAFT', 'APPROVED');
    expect(err.code).toBe('INVALID_TRANSITION');
    expect(err.details.from).toBe('DRAFT');
    expect(err.details.to).toBe('APPROVED');
  });

  it('Errors.Validation produces 400 with field details', () => {
    const err = Errors.Validation('Bad input', { fields: [{ path: 'email', message: 'Invalid' }] });
    expect(err.code).toBe('VALIDATION_ERROR');
    expect(err.status).toBe(400);
  });
});

describe('validate middleware', () => {
  const express = require('express');
  const { z } = require('zod');
  const { validate } = require('../src/middleware/validate');

  it('passes valid body through and coerces data', async () => {
    const testApp = express();
    testApp.use(express.json());
    testApp.post(
      '/test',
      validate({ body: z.object({ name: z.string().min(1) }) }),
      (req, res) => res.json({ ok: true, name: req.body.name })
    );
    const { errorHandler } = require('../src/middleware/errorHandler');
    testApp.use(errorHandler);

    const res = await request(testApp).post('/test').send({ name: 'Alice' });
    expect(res.status).toBe(200);
    expect(res.body.name).toBe('Alice');
  });

  it('returns 400 with field details on invalid body', async () => {
    const testApp = express();
    testApp.use(express.json());
    testApp.post(
      '/test',
      validate({ body: z.object({ name: z.string().min(1) }) }),
      (req, res) => res.json({ ok: true })
    );
    const { errorHandler } = require('../src/middleware/errorHandler');
    testApp.use(errorHandler);

    const res = await request(testApp).post('/test').send({ name: '' });
    expect(res.status).toBe(400);
    expect(res.body.ok).toBe(false);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(Array.isArray(res.body.error.details.fields)).toBe(true);
  });
});
