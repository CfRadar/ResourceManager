# Step 00: Architecture, Project Structure & Setup

This guide establishes the foundational architecture, modular layout, standard response envelopes, and error handling for the Express backend.

---

## 1. Directory Structure

Adopt the modular architecture defined in Section 5.1 of the Backend API Spec:

```
backend/
├── package.json
├── .env.example
├── index.js                  # Entrypoint wrapper
├── src/
│   ├── app.js                # Express app configuration & middleware pipeline
│   ├── server.js             # HTTP listener and graceful shutdown
│   ├── config/               # Environment variables, database connection, storage config
│   │   ├── env.js            # Validated env variables via Zod / dotenv
│   │   ├── db.js             # Knex / PostgreSQL client pool
│   │   └── constants.js      # App-wide constants (pagination limits, timeouts)
│   ├── middleware/           # Reusable Express middlewares
│   │   ├── auth.js           # JWT verification & req.user attachment
│   │   ├── rbac.js           # Role & institution scope verification
│   │   ├── validate.js       # Zod schema request validator
│   │   ├── rateLimiter.js    # Express-rate-limit configuration
│   │   ├── idempotency.js    # Idempotency-Key handler
│   │   └── errorHandler.js   # Centralized error formatter
│   ├── modules/              # Domain-specific feature modules
│   │   ├── auth/             # Routes, controllers, schemas, services
│   │   ├── users/
│   │   ├── institutions/
│   │   ├── facilities/
│   │   ├── resources/
│   │   ├── policies/
│   │   ├── availability/
│   │   ├── eligibility/
│   │   ├── accessRequests/
│   │   ├── bookings/
│   │   ├── checkin/
│   │   ├── serviceRequests/
│   │   ├── needRequests/
│   │   ├── referrals/
│   │   ├── documents/
│   │   ├── trainings/
│   │   ├── incidents/
│   │   ├── tokens/
│   │   ├── payments/
│   │   ├── notifications/
│   │   ├── audit/
│   │   ├── dashboards/
│   │   ├── exports/
│   │   └── aiProxy/
│   ├── services/             # Cross-cutting business engines
│   │   ├── transition.js     # Central state machine validator & audit logger
│   │   ├── eligibilityEngine.js
│   │   ├── bookingEngine.js  # Overlap prevention & slot calculator
│   │   ├── auditChain.js     # SHA-256 hash chaining
│   │   ├── scheduler.js      # Cron job runners
│   │   ├── tokenService.js   # Append-only credit ledger
│   │   └── fileService.js    # Local / S3 upload handling
│   └── jobs/                 # Scheduled background tasks
```

---

## 2. Standard Response Envelopes

Every endpoint must conform to Section 1.3 of the spec:

### Success Envelope
```json
{
  "ok": true,
  "data": { ... },
  "meta": {
    "page": 1,
    "pageSize": 20,
    "total": 134
  }
}
```

### Error Envelope
```json
{
  "ok": false,
  "error": {
    "code": "BOOKING_CONFLICT",
    "message": "The selected time slot overlaps with an existing booking.",
    "details": {
      "conflictingSlot": {
        "startAt": "2026-11-01T10:00:00Z",
        "endAt": "2026-11-01T12:00:00Z"
      }
    }
  }
}
```

---

## 3. Standard HTTP Error Codes

Implement custom application error classes that map to the standard error codes (Section 1.4):

```javascript
class AppError extends Error {
  constructor(code, message, status = 400, details = {}) {
    super(message);
    this.code = code;
    this.status = status;
    this.details = details;
  }
}

// Predefined error helpers
const Errors = {
  Validation: (msg, details) => new AppError('VALIDATION_ERROR', msg, 400, details),
  Unauthenticated: (msg = 'Authentication required') => new AppError('UNAUTHENTICATED', msg, 401),
  Forbidden: (msg = 'Access denied') => new AppError('FORBIDDEN', msg, 403),
  NotEligible: (msg, details) => new AppError('NOT_ELIGIBLE', msg, 403, details),
  NotFound: (msg = 'Resource not found') => new AppError('NOT_FOUND', msg, 404),
  Conflict: (code, msg, details) => new AppError(code, msg, 409, details),
  BookingConflict: (details) => new AppError('BOOKING_CONFLICT', 'Slot overlaps an existing booking', 409, details),
  InvalidTransition: (from, to) => new AppError('INVALID_TRANSITION', `Cannot transition from ${from} to ${to}`, 409),
  PolicyLimit: (msg, details) => new AppError('POLICY_LIMIT', msg, 409, details),
  DocumentMissing: (details) => new AppError('DOCUMENT_MISSING', 'Required document not satisfied', 422, details),
  AiUnavailable: (msg = 'AI service temporarily unavailable') => new AppError('AI_UNAVAILABLE', msg, 502)
};
```

---

## 4. Implementation Steps

1. **Install Core Dependencies**:
   ```bash
   npm i express cors helmet dotenv zod bcryptjs jsonwebtoken cookie-parser
   npm i -D nodemon supertest jest
   ```
2. **Setup Global Middlewares** in `src/app.js`:
   - `helmet()` for secure HTTP headers.
   - `cors()` configured with explicit frontend origin (`http://localhost:5173`).
   - `express.json({ limit: '2mb' })` with JSON syntax error handling.
   - `cookieParser()` for secure refresh token retrieval.
3. **Configure Central Error Middleware** in `src/middleware/errorHandler.js`:
   - Catch `AppError`, Zod validation errors, and uncaught exceptions.
   - Format response matching `{ ok: false, error: { code, message, details } }`.
4. **Setup Base Router**:
   - Prefix all routes with `/api/v1/...`.
   - Add `/health` route returning `{ ok: true, data: { status: 'healthy', timestamp: '...' } }`.
