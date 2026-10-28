# Module: auth

Handles authentication and session management (Spec §4.1).

**Implemented in:** Step 02 — Authentication, RBAC & Security

## Planned endpoints
| Method | Path | Auth | Notes |
|---|---|---|---|
| POST | `/api/v1/auth/register` | Public | Create account; sends demo OTP |
| POST | `/api/v1/auth/verify-otp` | Public | Virtual OTP verification |
| POST | `/api/v1/auth/login` | Public | Returns access token + refresh cookie |
| POST | `/api/v1/auth/refresh` | Cookie | Rotate tokens |
| POST | `/api/v1/auth/logout` | Any | Invalidate refresh token |
| POST | `/api/v1/auth/forgot-password` | Public | P1 |
| POST | `/api/v1/auth/reset-password` | Public | P1 |
| GET  | `/api/v1/auth/me` | Any | Current user + memberships |

## Files (to be created in Step 02)
- `auth.router.js` — route definitions + authLimiter
- `auth.controller.js` — request handlers
- `auth.service.js` — bcrypt, JWT signing, OTP logic
- `auth.schema.js` — Zod schemas for request validation
