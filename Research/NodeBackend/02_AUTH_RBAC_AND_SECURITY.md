# Step 02: Authentication, RBAC & Security Middleware

This guide details authentication (JWT & demo OTP), membership verification, role-based access control, scope enforcement, and security policies.

---

## 1. Authentication Strategy

### 1.1 Token Architecture
- **Access Token:** Short-lived (15 minutes). Passed in `Authorization: Bearer <token>`.
  - Payload: `{ sub: userId, role: platformRole, memberships: [{ institutionId, role }], iat, exp }`.
- **Refresh Token:** Stored in an `httpOnly`, `secure`, `sameSite=strict` cookie. Stored hashed in the database and rotated on each refresh.
- **Demo Virtual Authentication:** Registration creates user with `email_verified = false` and generates a 6-digit OTP. In demo mode, OTP is logged to console and returned in response if demo mode is enabled. Calling `/auth/verify-otp` with valid OTP marks `email_verified = true`.

### 1.2 Auth Endpoints
- `POST /api/v1/auth/register` (Public)
- `POST /api/v1/auth/verify-otp` (Public)
- `POST /api/v1/auth/login` (Public, rate-limited)
- `POST /api/v1/auth/refresh` (Cookie-authenticated)
- `POST /api/v1/auth/logout` (Invalidates refresh token)
- `GET /api/v1/auth/me` (Returns current user profile, memberships, and unread notification counts)

---

## 2. Role-Based Access Control (RBAC)

### 2.1 Role Definitions (Section 2.1)
- `REQUESTER`: Default student / researcher / external user.
- `OPERATOR`: Facility supervisor / service executor.
- `MANAGER`: Facility manager / request reviewer / check-in handler.
- `OWNER`: Resource owner / policy definer.
- `COORDINATOR`: Cross-institutional referral handler.
- `ADMIN`: Institution admin / platform super-admin.

### 2.2 Hard Rules & Middleware

#### A. Authentication Middleware (`src/middleware/auth.js`)
Validates JWT and attaches `req.user` to the request:
```javascript
export const requireAuth = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    throw Errors.Unauthenticated('Missing or invalid authorization header');
  }
  const token = authHeader.split(' ')[1];
  try {
    const payload = jwt.verify(token, process.env.JWT_ACCESS_SECRET);
    req.user = payload;
    next();
  } catch (err) {
    throw Errors.Unauthenticated('Token expired or invalid');
  }
};
```

#### B. Scope & Role Enforcement Middleware (`src/middleware/rbac.js`)
Validates that the user has the required role for a given facility or institution:
```javascript
export const requireRole = (allowedRoles = []) => (req, res, next) => {
  if (!req.user) throw Errors.Unauthenticated();
  
  // Platform admin override
  if (req.user.role === 'ADMIN') return next();

  // Facility / Institution specific check
  const facilityId = req.params.facilityId || req.body.facilityId;
  const userMembership = req.user.memberships.find(m => m.facilityId === facilityId || m.institutionId === req.institutionId);
  
  if (!userMembership || !allowedRoles.includes(userMembership.role)) {
    throw Errors.Forbidden('Insufficient permissions for this facility or institution');
  }
  next();
};
```

#### C. Strict No-Self-Approval Rule
Reviewers must never approve, reject, or verify their own requests:
```javascript
export const assertNoSelfApproval = (reviewerId, requesterId) => {
  if (reviewerId === requesterId) {
    throw Errors.Forbidden('Self-review is strictly prohibited. An independent reviewer must decide.');
  }
};
```

---

## 3. Inter-Service Security (Express to AI Service)

Calls from Express to the internal Python AI service (`UviAge`) must include:
- `X-Internal-Key: <INTERNAL_API_KEY>`
- `X-User-Id: <req.user.sub>` (for audit and telemetry)

---

## 4. Implementation Checklist

- [ ] Implement password hashing with `bcryptjs` (salt rounds: 12).
- [ ] Implement token generator (access + refresh) in `src/modules/auth/service.js`.
- [ ] Implement rate limiter on `/auth/login` (5 requests per 15 minutes per IP).
- [ ] Implement `assertNoSelfApproval` in review and incident controllers.
