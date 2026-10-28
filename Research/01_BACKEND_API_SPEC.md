# Backend Specification: Express (Node.js) API + Python AI Service

**Project:** Institutional Resource Access and Coordination Network
**Scope:** Every endpoint the Express backend must expose, what each one does, who may call it, and how the Python AI service plugs in.
**Database:** Not decided yet. This document is DB-agnostic. Where a database feature matters (e.g. preventing double-booking), the required *behaviour* is stated, with a suggested implementation for PostgreSQL (the recommended default) and a portable fallback.

> All institutions, users, resources, payments, tokens and signatures in the prototype are **demonstration data**. Nothing here is a real payment, a legally binding agreement, or a real identity verification. Every such feature must be labelled "Demo" in API responses (`"demo": true`) and in the UI.

---

## 0. Architecture at a Glance

```
React frontend
      |
      v
Express API (Node.js)  ----------->  Python AI service (FastAPI)
  - auth, RBAC                         - NL need -> resource matching
  - business rules                     - incident summary draft
  - state machines                     - (optional) policy summary
  - audit hash chain                   Reads DB (read-only) + returns
  - scheduler (reminders, overdue)     suggestions only. NEVER writes
      |                                decisions.
      v
   Database (TBD)  <---- file storage (local disk / S3-compatible)
```

**Golden rules**
1. Express is the only writer of business data. The Python service has a **read-only** DB user and returns *suggestions*; Express decides what to persist.
2. Authentication (who you are) is separate from authorization (what you may do) and from eligibility (whether you may use *this* resource).
3. Availability is not eligibility. A free slot never implies permission.
4. Humans make every restricted decision (approve, reject, waitlist, incident ruling). The system only checks rules and records outcomes.
5. History is append-only. Corrections are new events, never edits.

---

## 1. Conventions

### 1.1 Base URL and versioning
`/api/v1/...`. The AI service is internal only: `http://ai-service:8000/ai/...`.

### 1.2 Auth
- `Authorization: Bearer <JWT>` (short-lived access token, 15 min) plus refresh token in an `httpOnly` cookie.
- JWT payload: `sub` (user id), `role` (platform role), `memberships` (array of `{institutionId, role}`), `iat`, `exp`.
- Express to AI service: header `X-Internal-Key: <shared secret>` and a forwarded `X-User-Id` for logging. The AI service is not exposed publicly.

### 1.3 Standard response envelope
Success:
```json
{ "ok": true, "data": { }, "meta": { "page": 1, "pageSize": 20, "total": 134 } }
```
Error:
```json
{ "ok": false, "error": { "code": "BOOKING_CONFLICT", "message": "Human readable text", "details": { } } }
```

### 1.4 Error codes
| HTTP | Code | Meaning |
|---|---|---|
| 400 | `VALIDATION_ERROR` | Body/query failed schema validation (use Zod or Joi) |
| 401 | `UNAUTHENTICATED` | Missing or expired token |
| 403 | `FORBIDDEN` | Authenticated but role/scope not allowed |
| 403 | `NOT_ELIGIBLE` | Eligibility rule failed (details lists failed checks) |
| 404 | `NOT_FOUND` | Entity absent **or** hidden from caller (do not leak existence of private resources) |
| 409 | `BOOKING_CONFLICT` | Slot overlaps an approved/scheduled booking |
| 409 | `INVALID_TRANSITION` | State change not allowed from current state |
| 409 | `POLICY_LIMIT` | Fair-use limit exceeded |
| 422 | `DOCUMENT_MISSING` | Required document/acknowledgment not satisfied |
| 429 | `RATE_LIMITED` | Too many requests |
| 502 | `AI_UNAVAILABLE` | AI service down (fallback used where possible; see section 7) |

### 1.5 Pagination, filtering, sorting
`?page=1&pageSize=20&sort=createdAt:desc&status=SUBMITTED`. Max pageSize 100.

### 1.6 Time
All timestamps are ISO-8601 UTC. Booking slots are `startAt` / `endAt` (half-open interval `[start, end)`). Facility timezone is stored on the facility and used only for display and working-hours checks.

### 1.7 Idempotency
`POST` endpoints that create bookings, requests, or ledger entries accept `Idempotency-Key` header to prevent duplicate creation on retry.

---

## 2. Roles and Permission Model

### 2.1 Roles
| Role | Scope | Notes |
|---|---|---|
| `REQUESTER` | Platform | Default after signup (student, researcher, creator, startup). |
| `OWNER` | Per institution/resource | Owns resources and sets policy. For MVP, Owner may also act as Manager. |
| `MANAGER` | Per facility | Reviews requests, verifies documents/training, runs check-in/out, resolves incidents. |
| `OPERATOR` | Per facility | Supervises use or performs staff-operated services; marks service progress. |
| `COORDINATOR` | Per institution/network | Handles missing-resource requests and referrals. |
| `ADMIN` | Per institution (and one platform super-admin for demo) | Verifies organisations/members, manages memberships, views audits. |

A user can hold different roles at different institutions (stored in `InstitutionMembership`).

### 2.2 Hard rules enforced in middleware/services
- **No self-approval:** `reviewerId !== requesterId` on every approval, rejection, document verification and incident ruling.
- **Scope check:** Managers/Operators/Owners may only act on resources inside facilities where they hold that role.
- **Verified-only:** A requester without a verified institution membership/affiliation can browse public listings but cannot submit restricted requests (policy-dependent).
- **Visibility:** Resource `visibility` = `PUBLIC` | `NETWORK` (partner institutions only) | `INSTITUTION` | `PRIVATE`. Search and detail endpoints filter by this before anything else.
- **Field-level redaction:** Public listing responses never include access instructions, door codes, internal safety details, owner contact details, or other users' data.

### 2.3 Permission matrix (summary)
| Action | Requester | Operator | Manager | Owner | Coordinator | Admin |
|---|:-:|:-:|:-:|:-:|:-:|:-:|
| Browse public resources | Y | Y | Y | Y | Y | Y |
| Create/edit resource & policy | | | edit | Y | | Y |
| Submit access/service request | Y | | | | | |
| Review/approve/reject/waitlist | | | Y | Y | | |
| Verify training/documents | | Y (training) | Y | Y | | |
| Check-in / check-out | own | assist | Y | Y | | |
| Report incident | Y (own) | Y | Y | Y | | |
| Rule on incident | | | Y | Y | | Y (escalation) |
| Missing-resource request | create | | | | handle | view |
| Referral send/respond | | | | respond | Y | view |
| View audit (scoped) | own | facility | facility | resource | institution | institution |
| Verify memberships | | | | | | Y |

---

## 3. State Machines (authoritative)

Every state change goes through one service function `transition(entity, toState, actor, reason)` that (a) validates the transition table below, (b) checks the actor's role, (c) writes the audit event in the same transaction. Direct status updates elsewhere are forbidden.

### 3.1 AccessRequest (independent or supervised use)
```
DRAFT -> SUBMITTED -> UNDER_REVIEW
UNDER_REVIEW -> MORE_INFO_REQUIRED -> SUBMITTED (requester responds)
UNDER_REVIEW -> AWAITING_DOCUMENTS | AWAITING_TRAINING | AWAITING_AGREEMENT
(AWAITING_*) -> UNDER_REVIEW (when requirement satisfied)
UNDER_REVIEW -> APPROVED | REJECTED | WAITLISTED
WAITLISTED -> APPROVED (slot freed, human or policy-confirmed) | CANCELLED | EXPIRED
APPROVED -> SCHEDULED (booking confirmed) -> CHECKED_IN -> IN_USE -> RETURNED -> CLOSED
Any non-terminal -> CANCELLED (by requester, with cancellation rule applied)
RETURNED/IN_USE -> INCIDENT_REPORTED -> (after ruling) CLOSED
```

### 3.2 ServiceRequest (staff-operated)
```
DRAFT -> SUBMITTED -> SCOPE_REVIEW -> QUOTE_SENT -> QUOTE_ACCEPTED (or QUOTE_DECLINED -> CLOSED)
QUOTE_ACCEPTED -> AWAITING_MATERIALS -> MATERIALS_RECEIVED -> SERVICE_IN_PROGRESS
SERVICE_IN_PROGRESS -> OUTPUT_DELIVERED -> COMPLETED (requester confirms) -> CLOSED
Any -> REJECTED (reviewer, with reason) | CANCELLED
```

### 3.3 Referral (missing-resource)
```
SUBMITTED -> COORDINATOR_REVIEW -> CANDIDATE_IDENTIFIED -> REFERRAL_SENT
REFERRAL_SENT -> ACCEPTED | DECLINED | NO_RESPONSE(expired)
ACCEPTED -> NEXT_STEPS_SENT -> CLOSED
DECLINED/NO_RESPONSE -> CANDIDATE_IDENTIFIED (try another) | CLOSED_UNRESOLVED
```
`ACCEPTED` can only be set by a user belonging to the receiving institution. The system never marks a referral accepted on its own.

### 3.4 Incident
```
REPORTED -> UNDER_REVIEW -> (INFO_REQUESTED <-> UNDER_REVIEW) -> RESOLVED | DISMISSED
RESOLVED/DISMISSED -> APPEALED -> UNDER_REVIEW (second reviewer) -> RESOLVED | DISMISSED
```

### 3.5 Document record
`REQUIRED -> SUBMITTED -> APPROVED | REJECTED`, and `APPROVED -> EXPIRED` (automatic when `expiresAt` passes).

---

## 4. Endpoint Reference

Legend: **Auth** column lists who may call. "Owner of X" means ownership/scope check on that entity.

### 4.1 Auth and Session
| Method | Path | Auth | Function |
|---|---|---|---|
| POST | `/auth/register` | Public | Create account (name, email, password, affiliation text). Sends demo OTP. Password hashed with bcrypt/argon2. |
| POST | `/auth/verify-otp` | Public | **Virtual authentication (demo):** verifies 6-digit OTP (logged to console/email stub). Marks email verified. |
| POST | `/auth/login` | Public | Returns access token + sets refresh cookie. Rate limited. Lockout after repeated failures. |
| POST | `/auth/refresh` | Cookie | Rotates tokens. |
| POST | `/auth/logout` | Any | Invalidates refresh token. |
| POST | `/auth/forgot-password` / `/auth/reset-password` | Public | Standard reset flow (P1). |
| GET | `/auth/me` | Any | Current user, memberships, roles, unread notification count. |

### 4.2 Users and Profiles
| Method | Path | Auth | Function |
|---|---|---|---|
| GET | `/users/me` | Any | Own profile. |
| PATCH | `/users/me` | Any | Update name, phone, bio, affiliation text. Cannot change role or verification status. |
| GET | `/users/:id/public-card` | Any authed | Minimal card (name, institution, verified badge, training badges). No email/phone. |
| GET | `/users/me/usage-summary` | Any | Own bookings count, hours this period, no-shows, tokens balance (feeds fair-use meter). |
| GET | `/users/:id/usage-history` | Manager/Owner of a resource the user used | Authorised review of a user's history **for that facility only**. Logged in audit when viewed. |

### 4.3 Institutions and Memberships
| Method | Path | Auth | Function |
|---|---|---|---|
| GET | `/institutions` | Any | List verified institutions (public fields). |
| GET | `/institutions/:id` | Any | Detail + public facilities. |
| POST | `/institutions` | Platform admin | Create institution (demo seeding). |
| PATCH | `/institutions/:id` | Admin of institution | Update profile and default policies. |
| POST | `/institutions/:id/membership-requests` | Requester | Request membership (student/staff/external), with optional supporting document. |
| GET | `/institutions/:id/membership-requests` | Admin | Pending requests. |
| POST | `/institutions/:id/membership-requests/:reqId/decision` | Admin | `{decision: APPROVE|REJECT, role, reason}`. Creates `InstitutionMembership` on approve. |
| GET | `/institutions/:id/members` | Admin | Member list with roles. |
| PATCH | `/institutions/:id/members/:userId` | Admin | Change member role / suspend. Audited. |
| POST | `/institutions/:id/partners` | Admin / platform admin | Link a partner institution (verified network, MVP: seeded). |

### 4.4 Facilities
| Method | Path | Auth | Function |
|---|---|---|---|
| GET | `/facilities` | Any | List visible facilities (filter by institution, city). |
| GET | `/facilities/:id` | Any | Detail (public fields; hours, location text, map coords if allowed). |
| POST | `/institutions/:id/facilities` | Admin/Owner | Create facility (name, address, lat/lng, timezone, working hours, geofence radius). |
| PATCH | `/facilities/:id` | Owner/Admin | Update. |

### 4.5 Resources (listings)
| Method | Path | Auth | Function |
|---|---|---|---|
| GET | `/resources` | Any (visibility-filtered) | Search/browse. Query: `q`, `category`, `institutionId`, `facilityId`, `accessMode`, `maxCost`, `availableFrom`, `availableTo`, `city`, `lat`, `lng`, `radiusKm`, `eligibleOnly`. Returns card data plus an `eligibilityPreview` for logged-in users (see 4.8). |
| GET | `/resources/:id` | Any (visibility-filtered) | Full public detail: specs, capabilities, photos, policy summary, supported access modes, cost model, restrictions, availability summary. Redacts confidential fields. |
| GET | `/resources/:id/private-details` | Approved requester with a SCHEDULED+ booking, Manager, Owner | Access instructions, operating notes, safety sheet links. Logged. |
| POST | `/facilities/:id/resources` | Owner/Manager | Create resource. Body: name, category, description, specs (JSON), capabilities (tags), visibility, riskLevel (`LOW|MEDIUM|HIGH`), photos. |
| PATCH | `/resources/:id` | Owner/Manager | Edit. Any change to policy-relevant fields creates an audit event with before/after snapshot. |
| POST | `/resources/:id/photos` | Owner/Manager | Upload image (jpg/png/webp, max 5 MB, MIME sniffed, re-encoded). |
| DELETE | `/resources/:id/photos/:photoId` | Owner/Manager | Remove photo (soft delete). |
| POST | `/resources/:id/deactivate` | Owner | Soft-deactivate (never hard delete; keeps history). Blocks new requests; existing bookings are listed for manual handling. |
| GET | `/resources/categories` | Any | Category list + tag vocabulary for search filters. |

### 4.6 Resource Policy (configurable rules)
One `ResourcePolicy` per resource. Lets the owner switch checks on/off in proportion to risk.

| Method | Path | Auth | Function |
|---|---|---|---|
| GET | `/resources/:id/policy` | Any (public subset) / Manager (full) | Policy detail. |
| PUT | `/resources/:id/policy` | Owner/Manager | Replace policy. Validated schema below. Versioned: each save creates `policyVersion + 1`; bookings store the version they were approved under. |

Policy JSON (validated):
```json
{
  "supportedAccessModes": ["INDEPENDENT", "SUPERVISED", "STAFF_SERVICE", "COLLABORATION"],
  "permittedUserGroups": ["INTERNAL_STUDENT", "INTERNAL_STAFF", "PARTNER_INSTITUTION", "EXTERNAL_COMMERCIAL", "PUBLIC"],
  "requiresPurposeStatement": true,
  "requiresApproval": true,
  "requiredTrainingIds": ["trn_3dp_basic"],
  "requiredDocumentTemplateIds": ["doc_safety_ack"],
  "supervisionRequiredFor": ["EXTERNAL_COMMERCIAL"],
  "allowOutsideMaterials": "NEEDS_APPROVAL",
  "prohibitedUses": ["weapons manufacture"],
  "limits": { "maxActiveBookings": 2, "maxHoursPerWeek": 8, "maxSingleBookingHours": 4, "advanceBookingDays": 21 },
  "cancellation": { "freeUntilHoursBefore": 12, "noShowStrikeLimit": 3 },
  "lateReturn": { "graceMinutes": 15, "reminderMinutesBefore": 30 },
  "pricing": { "model": "FREE|HOURLY|COST_RECOVERY|QUOTE|TOKENS", "hourlyRate": 0, "operatorFee": 0, "consumablesNote": "", "tokensPerHour": 0 },
  "geofenceCheckIn": { "enabled": false, "radiusMeters": 150 },
  "conditionReport": { "requireBefore": true, "requireAfter": true, "requirePhotos": "OPTIONAL" },
  "confidentialityNote": "Free text shown to user; not a legal agreement",
  "priorityRules": [{ "id": "deadline", "label": "Academic deadline (proof required)", "enabled": false }]
}
```
`priorityRules` exist only when the institution has explicitly defined them. No hidden scoring.

### 4.7 Availability, Blackouts and Slots
| Method | Path | Auth | Function |
|---|---|---|---|
| GET | `/resources/:id/availability?from=&to=` | Any | Returns open/busy/blackout blocks. Busy blocks show **no personal data** (only "Booked"). |
| GET | `/resources/:id/slots?date=&durationMin=` | Any authed | Bookable slot suggestions inside working hours, excluding bookings and blackouts. |
| POST | `/resources/:id/blackouts` | Manager/Owner | Add maintenance/blackout window. If it collides with existing bookings, returns the affected bookings and requires `confirmCancelAffected: true`; affected users are notified and bookings go to `NEEDS_REBOOK`. |
| DELETE | `/resources/:id/blackouts/:blackoutId` | Manager/Owner | Remove blackout (audited). |
| GET | `/resources/:id/availability-polls` | Any authed | **Availability polling (from your sketch):** list open polls where users signal interest in a time window for a resource that is rarely open. |
| POST | `/resources/:id/availability-polls` | Requester | Create a poll: "I'd use this on Saturday mornings". |
| POST | `/availability-polls/:pollId/vote` | Requester | Add interest. Managers see aggregated demand to decide on opening more hours. (P1) |

### 4.8 Eligibility Check (deterministic, no AI)
| Method | Path | Auth | Function |
|---|---|---|---|
| POST | `/resources/:id/eligibility-check` | Requester | Body: `{accessMode, startAt?, endAt?, userGroupOverride?}`. Runs the rule engine and returns a checklist. |

Response:
```json
{
  "eligible": false,
  "canRequest": true,
  "checks": [
    { "key": "membership_verified", "label": "Verified affiliation", "status": "PASS" },
    { "key": "user_group_allowed", "label": "Permitted user group", "status": "PASS" },
    { "key": "training", "label": "3D Printer Basics training", "status": "FAIL", "action": { "type": "BOOK_TRAINING", "trainingId": "trn_3dp_basic" } },
    { "key": "documents", "label": "Safety acknowledgment", "status": "MISSING", "action": { "type": "SIGN_DOCUMENT", "templateId": "doc_safety_ack" } },
    { "key": "fair_use", "label": "Weekly hours (6 of 8 used)", "status": "PASS" },
    { "key": "slot_free", "label": "Selected slot is free", "status": "PASS" }
  ],
  "requiredNextSteps": ["Complete training", "Sign safety acknowledgment"]
}
```
- `eligible` = all hard checks pass (can be auto-confirmed to the review queue).
- `canRequest` = user may still submit and the request will land in an `AWAITING_*` state (policy dependent).
- Every failure carries a human-readable reason and a next action. The same service is called again server-side on submit; the client result is never trusted.

### 4.9 Access Requests (independent / supervised / collaboration)
| Method | Path | Auth | Function |
|---|---|---|---|
| POST | `/access-requests` | Requester | Create `DRAFT` or `SUBMITTED`. Body: `resourceId`, `accessMode`, `startAt`, `endAt`, `purpose`, `outsideMaterials[]`, `acknowledgments[]`. Re-runs eligibility. Does **not** reserve the slot (a pending request is not a booking). |
| GET | `/access-requests/mine` | Requester | Own requests with status and next action. |
| GET | `/access-requests/:id` | Requester (own) / Manager/Owner of resource | Detail incl. eligibility snapshot, documents, timeline. |
| PATCH | `/access-requests/:id` | Requester (only in `DRAFT` / `MORE_INFO_REQUIRED`) | Edit fields. |
| POST | `/access-requests/:id/submit` | Requester | `DRAFT -> SUBMITTED`. |
| POST | `/access-requests/:id/cancel` | Requester | Cancel with reason; applies cancellation policy; frees any hold. |
| GET | `/facilities/:id/access-requests?status=` | Manager/Owner | **Review queue**, oldest first, with eligibility summary and flags (e.g. "Missing training"). |
| POST | `/access-requests/:id/start-review` | Manager/Owner | `SUBMITTED -> UNDER_REVIEW`; locks reviewer; rejects if reviewer is the requester. |
| POST | `/access-requests/:id/request-info` | Manager/Owner | Sends a question; state `MORE_INFO_REQUIRED`. |
| POST | `/access-requests/:id/respond` | Requester | Answer a question / upload requested items. |
| POST | `/access-requests/:id/decision` | Manager/Owner | `{decision: APPROVE\|REJECT\|WAITLIST, reason (required), conditions[]}`. See 4.10. |
| POST | `/access-requests/:id/appeal` | Requester | One appeal on reject/waitlist; assigned to a different reviewer or the Admin. Requires text. |

### 4.10 Decision logic (what `/decision` does)
**APPROVE**
1. Re-run eligibility; refuse with `NOT_ELIGIBLE` if a hard check fails (reviewer may override only checks marked `overridable` in policy, and the override reason is audited).
2. In **one transaction**: lock the resource's schedule, re-check overlap, create `Booking` (`SCHEDULED`), set request `APPROVED -> SCHEDULED`, hold/charge tokens if token pricing, write audit, create notification.
3. If overlap is found: return `409 BOOKING_CONFLICT` with 3 alternative slots (from `/slots` logic); request stays `UNDER_REVIEW`.

**REJECT** - reason required; user sees reason and appeal option.

**WAITLIST** - creates `WaitlistEntry { resourceId, requestId, desiredStart, desiredEnd, position, createdAt }`. Position is **FIFO by `createdAt`** unless the institution enabled explicit `priorityRules`; any priority applied is shown to the user ("Moved ahead because: Academic deadline, verified by Dr. X"). When a booking is cancelled, the server finds the first waitlist entry whose window fits and sends the manager a "Slot freed, confirm to offer" notification. The system does not silently grant access.

### 4.11 Bookings
| Method | Path | Auth | Function |
|---|---|---|---|
| GET | `/bookings/mine` | Requester | Upcoming and past. |
| GET | `/bookings/:id` | Requester (own) / Manager/Owner | Detail. |
| GET | `/facilities/:id/bookings?from=&to=` | Manager/Operator/Owner | Calendar feed (full detail). |
| POST | `/bookings/:id/reschedule` | Requester | Request new slot; follows same conflict + fair-use checks. |
| POST | `/bookings/:id/extend` | Requester | Request extension; allowed only if next slot is free and limits OK; manager approval if policy says so. |
| POST | `/bookings/:id/cancel` | Requester / Manager | Cancel; notes whether late-cancellation rule applied; triggers waitlist offer. |
| POST | `/bookings/:id/mark-no-show` | Manager/Operator | After grace window; increments no-show strike (visible to user; reviewable on appeal). |
| GET | `/bookings/:id/calendar.ics` | Requester | iCal export (P1). |

**Overlap prevention (required behaviour)**
- Booking table stores `resourceId, startAt, endAt, status`.
- PostgreSQL: exclusion constraint `EXCLUDE USING gist (resource_id WITH =, tstzrange(start_at, end_at) WITH &&) WHERE (status IN ('SCHEDULED','CHECKED_IN','IN_USE'))`.
- Portable fallback (any DB): `BEGIN; SELECT ... FOR UPDATE` on the resource row (or an advisory lock keyed by resourceId); count overlapping active bookings; insert only if zero; `COMMIT`. Write a concurrency test that fires 10 simultaneous requests for the same slot and asserts exactly one success.

### 4.12 Check-in, In-use, Check-out (physical resources)
| Method | Path | Auth | Function |
|---|---|---|---|
| POST | `/bookings/:id/check-in` | Booking user (or Manager on their behalf) | Valid only within window `[start - 15 min, start + grace]`. Body: `{equipmentUnitId, accessories[], consumables[], conditionReport:{rating, notes, photos[]}, signature, geo?:{lat,lng,accuracy}}`. Creates `ConditionReport(kind=BEFORE)`, `Booking -> CHECKED_IN`, audit. |
| POST | `/bookings/:id/start-use` | Booking user / Operator | `CHECKED_IN -> IN_USE` (P1; can be merged with check-in for MVP). |
| POST | `/bookings/:id/check-out` | Booking user | Body: `{conditionReport(AFTER), accessoriesReturned[], consumablesUsed[], signature, geo?}`. Creates `ConditionReport(kind=AFTER)`, `Booking -> RETURNED`. The server computes a **diff** between BEFORE and AFTER (rating drop, notes flagged, missing accessories). |
| POST | `/bookings/:id/confirm-return` | Manager/Operator | Manager confirms or flags the return. Confirm closes the booking and settles tokens; flag opens an incident draft. |
| GET | `/bookings/:id/condition-reports` | Booking user / Manager / Owner | Both reports side by side. |
| POST | `/uploads/condition-photo` | Authed | Upload one photo (max 5 MB, jpg/png/webp). Returns `fileId`. Files are served only through authorised signed URLs. |

**Virtual signature (demo):** `signature` is either `{type: "TYPED", text}` or `{type: "DRAWN", pngDataUrl}`. The server stores it with `userId`, timestamp, IP, and a SHA-256 hash of the exact document/report content signed. UI wording: "Acknowledged electronically (demo). This is a record of acknowledgment, not a legally verified signature."

**GPS (optional, consent-based):** if `policy.geofenceCheckIn.enabled`, server computes distance between `geo` and facility coordinates and stores `geoStatus: WITHIN | OUTSIDE | NOT_PROVIDED`. It is a **soft signal** shown to the manager, never an automatic block or penalty. Raw coordinates are stored only for the check-in event and are deleted per the retention rule.

**Overdue handling:** scheduler (section 5.3) flags `OVERDUE` when `now > endAt + graceMinutes` and booking not returned; sends reminders; manager can extend or open an incident.

### 4.13 Staff-operated Service Requests
| Method | Path | Auth | Function |
|---|---|---|---|
| POST | `/service-requests` | Requester | Body: `resourceId` (or `serviceId`), `description`, `sampleInfo`, `desiredOutput`, `deadline`, `purpose`, `budget?`. |
| GET | `/service-requests/mine` | Requester | List. |
| GET | `/service-requests/:id` | Requester (own) / Manager/Operator/Owner | Detail + timeline. |
| GET | `/facilities/:id/service-requests` | Manager/Operator | Queue. |
| POST | `/service-requests/:id/scope-review` | Manager | Mark feasible / not feasible with notes. |
| POST | `/service-requests/:id/quote` | Manager | `{lineItems:[{label, amount}], validUntil, termsNote}`. Creates `CostEstimate` (demo currency). |
| POST | `/service-requests/:id/quote/respond` | Requester | `ACCEPT` or `DECLINE`. |
| POST | `/service-requests/:id/materials-received` | Operator/Manager | Record sample intake (description, photo, condition). |
| POST | `/service-requests/:id/progress` | Operator | Add status update (`STARTED`, `IN_ANALYSIS`, note). |
| POST | `/service-requests/:id/deliver-output` | Operator | Upload result file(s) + notes. `-> OUTPUT_DELIVERED`. |
| POST | `/service-requests/:id/confirm-completion` | Requester | Confirm or dispute (dispute opens incident). |
| POST | `/service-requests/:id/decision` | Manager | Reject with reason (when infeasible/prohibited). |

### 4.14 Missing-resource Requests and Referrals
| Method | Path | Auth | Function |
|---|---|---|---|
| POST | `/need-requests` | Requester | Structured request: `capabilityNeeded`, `technicalRequirements`, `purpose`, `locationPreference`/`maxTravelKm`, `timeframe`, `durationOrFrequency`, `budget?`, `staffServiceAcceptable`. Optionally preceded by AI parse (section 6.1). |
| GET | `/need-requests/mine` | Requester | Status and any responses. |
| GET | `/need-requests` | Coordinator | Queue (scoped to coordinator's network). |
| GET | `/need-requests/:id` | Requester (own) / Coordinator | Detail. |
| GET | `/need-requests/:id/candidates` | Coordinator | Ranked candidate resources/facilities from network (calls AI service or deterministic fallback). Each carries a `matchType`: `AVAILABLE_LISTING`, `POTENTIAL_NEEDS_VERIFICATION`, `NOT_CURRENTLY_AVAILABLE`, plus matched-fields explanation. |
| POST | `/need-requests/:id/referrals` | Coordinator | Create referral to a receiving institution/facility. Body: `{toInstitutionId, toFacilityId?, resourceId?, messageToReceiver, shareRequesterContact: false}`. Requester contact details are **not** shared unless the requester has opted in on the need request (`consentShareContact`) and the receiver accepts. |
| GET | `/referrals/inbox` | Owner/Manager/Coordinator of receiving institution | Incoming referrals. |
| POST | `/referrals/:id/respond` | Receiving institution user | `{response: ACCEPT\|DECLINE, note, nextSteps?}`. Only receiving-side users may set ACCEPT. |
| POST | `/referrals/:id/release-contact` | Coordinator (only if requester consented) | Share minimal contact info with receiver. Audited. |
| POST | `/need-requests/:id/close` | Coordinator | Close with outcome (`RESOLVED`, `UNRESOLVED`) and note. |

### 4.15 Documents, Agreements and Training
| Method | Path | Auth | Function |
|---|---|---|---|
| GET | `/document-templates?institutionId=` | Authed | List configured checklists/acknowledgment templates (safety ack, confidentiality note, insurance proof, etc.). |
| POST | `/document-templates` | Admin/Owner | Create template (title, body text, `requiresUpload`, `requiresSignature`, `expiresAfterDays`, `legalReviewed` boolean + reviewer name). Body text is entered by the institution; the platform ships no legal terms. |
| GET | `/requests/:requestId/documents` | Requester/Manager | Checklist with status (`REQUIRED/SUBMITTED/APPROVED/REJECTED/EXPIRED`). |
| POST | `/documents/:docRecordId/submit` | Requester | Upload file (pdf/jpg/png, max 10 MB) and/or sign. |
| POST | `/documents/:docRecordId/review` | Manager/Owner | `{decision: APPROVE\|REJECT, reason}`. Not self-reviewable. |
| GET | `/documents/:docRecordId/file` | Requester (own) / Manager of resource | Streams the file through an access check; no public URLs. Every read is audited. |
| GET | `/trainings` | Authed | List trainings (by resource/institution). |
| POST | `/trainings` | Owner/Manager | Define a training requirement (name, validityDays, how verified). |
| GET | `/users/me/trainings` | Requester | Own training records. |
| POST | `/trainings/:id/records` | Manager/Operator | Record that a user completed training (`userId`, date, assessor). |
| POST | `/trainings/:id/self-declare` | Requester | Upload certificate or declare; status `PENDING_VERIFICATION` until a Manager verifies. |
| POST | `/training-records/:id/verify` | Manager/Operator | Verify or reject. |

### 4.16 Incidents and Disputes
| Method | Path | Auth | Function |
|---|---|---|---|
| POST | `/incidents` | Requester/Operator/Manager | Body: `bookingId` or `serviceRequestId`, `type` (`DAMAGE`, `DELAY`, `CONFLICT`, `SAFETY`, `MISSING_ITEM`, `OTHER`), `description`, `severityByReporter`, `attachments[]`, `occurredAt`. Status `REPORTED`. |
| GET | `/incidents/mine` | Authed | Incidents the user reported or is party to. |
| GET | `/facilities/:id/incidents` | Manager/Owner | Queue. |
| GET | `/incidents/:id` | Parties / Manager / Owner / Admin | Detail; internal notes hidden from the requester. |
| POST | `/incidents/:id/notes` | Manager/Owner (internal) / parties (shared) | Add note, `visibility: INTERNAL|SHARED`. Append-only. |
| POST | `/incidents/:id/request-info` | Manager | Ask party for more details/evidence. |
| POST | `/incidents/:id/respond` | Party | Add counter-statement and evidence (right of reply). |
| POST | `/incidents/:id/resolve` | Manager/Owner | `{outcome: RESOLVED\|DISMISSED, findings, remedy?:{type, amount?, tokens?}, reason}`. A remedy (e.g. token deduction) is only a **recorded recommendation** in MVP; no automatic charge. Reviewer cannot be a party. |
| POST | `/incidents/:id/appeal` | Party | Escalate to Admin / second reviewer. |
| POST | `/incidents/:id/draft-summary` | Manager | Calls AI draft summary (section 6.2); returns draft for human edit. |

### 4.17 Tokens / Credits (fair-use economy, demo)
Your sketch lists a "Token System". Recommended interpretation: **an internal credit ledger** that discourages monopolisation and supports "free but fairly rationed" access. It is not a cryptocurrency and not real money.

| Method | Path | Auth | Function |
|---|---|---|---|
| GET | `/tokens/balance` | Requester | Balance, held tokens, monthly allowance. |
| GET | `/tokens/ledger` | Requester | Own ledger (append-only entries). |
| POST | `/admin/tokens/grant` | Admin | Grant tokens to a user/group (allowance, sponsorship), with reason. |
| (internal) | service `tokenService.hold/charge/refund` | System | Hold on approval, charge on return confirmation, refund on valid cancellation. Not exposed directly. |

Rules: ledger rows are never updated or deleted; balance = sum of entries. Tokens per hour are set per resource policy. Token pricing is optional per resource.

### 4.18 Costs and Payments (simulated)
| Method | Path | Auth | Function |
|---|---|---|---|
| GET | `/bookings/:id/cost-estimate` | Requester/Manager | Breakdown: hourly, operator fee, consumables note; `model: QUOTE` shows "Quotation required". |
| POST | `/bookings/:id/invoice` | Manager | Generate demo invoice record (`demo: true`). |
| POST | `/invoices/:id/mark-paid` | Manager | Mark as paid (simulated). UI shows "Simulated payment, no money moved". |

### 4.19 Notifications
| Method | Path | Auth | Function |
|---|---|---|---|
| GET | `/notifications?unread=true` | Authed | In-app list. |
| POST | `/notifications/:id/read` | Authed | Mark read. |
| POST | `/notifications/read-all` | Authed | Mark all read. |
| GET/PUT | `/notifications/preferences` | Authed | Toggle email/in-app per event type (P1). |

Events that create notifications: request submitted/needs info/approved/rejected/waitlisted, waitlist slot offered, booking reminder (24 h and 1 h before), overdue, return confirmed, incident created/updated/resolved, referral sent/responded, document expiring, training expiring. Email delivery is a pluggable adapter (console logger in the demo; SMTP/Resend in P1).

### 4.20 Audit and Transparency
| Method | Path | Auth | Function |
|---|---|---|---|
| GET | `/audit/requests/:id` | Requester (own, filtered) / Manager / Owner | Timeline for one request/booking/service. Requester sees non-internal events only. |
| GET | `/audit/resources/:id` | Owner/Manager | Listing and policy change history, with before/after diffs. |
| GET | `/audit/institution/:id?actor=&action=&from=&to=` | Admin | Filterable institution audit. |
| GET | `/audit/verify/:scope/:id` | Manager/Admin | Recomputes the hash chain for the scope and returns `{valid: true|false, firstBrokenEventId?}`. |
| POST | `/audit/notes` | Manager/Owner | Add a correction/clarification note referencing an earlier event (never edits it). |

**Audit event shape**
```json
{
  "id": "evt_...", "seq": 1042, "at": "2026-10-28T10:15:00Z",
  "actorId": "usr_...", "actorRole": "MANAGER",
  "action": "ACCESS_REQUEST_APPROVED",
  "entityType": "AccessRequest", "entityId": "req_...", "resourceId": "res_...",
  "reason": "Training verified, slot free",
  "visibility": "PARTIES | INTERNAL",
  "payload": { "before": {}, "after": {} },
  "prevHash": "ab12...", "hash": "9f3c..."
}
```
`hash = SHA256(prevHash + canonicalJSON(event without hash))`. This is a **tamper-evident log** (the lightweight, honest version of the "transparent blockchain" idea in your sketch). The UI can describe it as "tamper-evident hash-chained history". Do not call it a blockchain unless a real chain is actually implemented. Optional P2 enhancement: publish the latest hash daily to a public place (or testnet) as an external anchor.

### 4.21 Dashboards and Analytics
| Method | Path | Auth | Function |
|---|---|---|---|
| GET | `/dashboard/requester` | Requester | Next booking, pending requests, actions required, fair-use meters, tokens. |
| GET | `/dashboard/manager?facilityId=` | Manager/Owner | Pending queue counts, today's check-ins/returns, overdue, open incidents, utilisation %. |
| GET | `/dashboard/coordinator` | Coordinator | Open need-requests, referral statuses, response times. |
| GET | `/dashboard/admin?institutionId=` | Admin | Members, resources, utilisation, incident rate, audit-integrity status. |
| GET | `/analytics/utilisation?resourceId=&from=&to=` | Manager/Owner | Hours used vs available, by day/week. |
| GET | `/analytics/demand?resourceId=` | Manager/Owner | Waitlist length, declined/unmet demand, availability-poll interest. |

### 4.22 Exports ("Document / Excel compile")
| Method | Path | Auth | Function |
|---|---|---|---|
| GET | `/exports/bookings.xlsx?facilityId=&from=&to=` | Manager/Owner | Bookings with status, user, hours, outcome. |
| GET | `/exports/usage-report.xlsx?institutionId=` | Admin | Utilisation per resource and per user group. |
| GET | `/exports/audit.csv?scope=` | Admin | Audit events export. |
| GET | `/exports/incident-report/:id.pdf` | Manager/Owner | One-page incident dossier (details, evidence list, timeline, ruling). |
| GET | `/exports/transaction/:requestId.pdf` | Parties | Full transaction history receipt. |

Use `exceljs` for XLSX and `pdfkit` or `puppeteer` for PDF. Exports obey the same scoping as the underlying data and log an audit event.

### 4.23 Admin and System
| Method | Path | Auth | Function |
|---|---|---|---|
| GET | `/health` | Public | `{status, db, aiService}`. |
| POST | `/admin/seed-demo` | Platform admin (non-production only) | Reset and load demo data. |
| GET | `/admin/users` | Admin | Search users in institution. |
| POST | `/admin/users/:id/suspend` | Admin | Suspend with reason (audited). |
| GET | `/admin/jobs` | Admin | Scheduler job status (reminders, overdue, expiries). |

### 4.24 AI-facing endpoints on Express (proxy layer)
Express wraps the AI service so the frontend never calls Python directly, auth/visibility stays in one place, and a deterministic fallback can run if AI is down.

| Method | Path | Auth | Function |
|---|---|---|---|
| POST | `/ai/match-need` | Authed | Body `{text}`. Returns parsed need + ranked resources (each with `reasons[]`, `matchType`, `source`: `AI` or `KEYWORD_FALLBACK`). Only resources visible to this user are returned. |
| POST | `/ai/parse-need` | Authed | Turns free text into the structured need-request form fields (user edits before submitting). |
| POST | `/ai/incident-summary` | Manager | Draft summary of incident + timeline. Returns draft text plus `sources[]` (event IDs). |
| POST | `/ai/policy-summary` | Authed | Plain-language summary of a resource policy (P2; policy is already structured, so this is optional). |

---

## 5. Cross-cutting Backend Services

### 5.1 Recommended module layout (Express)
```
src/
  app.js, server.js
  config/            env, db, storage, mail adapters
  middleware/        auth, rbac, scope, validate (Zod), rateLimit, upload, errorHandler, idempotency
  modules/
    auth/  users/  institutions/  facilities/  resources/  policies/
    availability/  eligibility/  accessRequests/  bookings/  checkin/
    serviceRequests/  needRequests/  referrals/  documents/  trainings/
    incidents/  tokens/  payments/  notifications/  audit/  dashboards/
    exports/  ai-proxy/
  services/          transition.js, eligibilityEngine.js, bookingEngine.js,
                     auditChain.js, scheduler.js, tokenService.js, fileService.js
  jobs/              reminders, overdueCheck, docExpiry, waitlistOffer
  tests/             unit, integration, concurrency
```

### 5.2 Security checklist (build into the middleware)
- Helmet, CORS allowlist, JSON body limit, rate limiting (stricter on `/auth/*`).
- Input validation on every route; reject unknown fields.
- Password hashing (argon2/bcrypt), JWT secrets from env, refresh rotation.
- Parameterised queries / ORM only.
- Upload checks: extension + MIME sniffing + size cap, random filenames, stored outside web root, served via authorised endpoints, optional image re-encode to strip EXIF/GPS.
- Redaction layer for public responses; resource visibility enforced in query, not only in UI.
- Data minimisation: no ID numbers or government documents are requested; "verified affiliation" is a manager-confirmed flag.
- Retention: condition photos and geo data purge N days after booking closure (configurable); audit events retained but personal payload fields can be redacted by Admin (redaction is itself an event, hash chain keeps the redaction record).
- Never hard-delete users, bookings, incidents, or audit events. Use soft-delete or anonymisation.

### 5.3 Scheduler jobs (node-cron or BullMQ if Redis is available; node-cron is enough for MVP)
| Job | Frequency | Action |
|---|---|---|
| `bookingReminders` | every 5 min | 24 h and 1 h before start, 30 min before end. |
| `overdueCheck` | every 5 min | Mark `OVERDUE`, notify user and manager. |
| `noShowCheck` | every 5 min | Flag bookings with no check-in after grace; manager confirms no-show. |
| `docAndTrainingExpiry` | daily | Set `EXPIRED`, notify. |
| `waitlistExpiry` | hourly | Expire stale waitlist entries and offers. |
| `referralTimeout` | daily | Mark `NO_RESPONSE` after X days; notify coordinator. |
| `auditIntegrityCheck` | daily | Run chain verification and show status on admin dashboard. |

### 5.4 Fair-use enforcement points
- Eligibility check and decision both evaluate `maxActiveBookings`, `maxHoursPerWeek`, `maxSingleBookingHours`, `advanceBookingDays`, no-show strikes.
- Failures return `POLICY_LIMIT` with the exact number and when it resets. There is no hidden score.
- Managers can grant a documented exception (reason required, audited).
- Every rejection/waitlist includes the reason and an appeal route.

---

## 6. Python AI Service (FastAPI)

### 6.1 Purpose and boundaries
The AI service **recommends and drafts**. It cannot approve, reject, penalise, or write business data. It has a read-only database connection (DB type TBD; use a thin repository layer so only one file changes when the DB is chosen).

Two features are recommended for the hackathon:
1. **Need-based resource matching** (primary).
2. **Incident summary draft** (secondary; only if time permits).

### 6.2 Endpoints
| Method | Path | Function |
|---|---|---|
| GET | `/ai/health` | Liveness, model status, DB connectivity. |
| POST | `/ai/parse-need` | Input: `{text}`. Output: structured need `{categories[], capabilities[], specs[], accessModePreference, duration, location, budget, staffServiceOk, confidence}`. User reviews and edits before use. |
| POST | `/ai/match-need` | Input: `{text, userContext:{userGroup, institutionIds[], lat?, lng?}, visibleResourceIds[]}`. Express passes the list of resource IDs the user is allowed to see, so the AI service cannot leak hidden resources. Output below. |
| POST | `/ai/alternatives` | Input: `{resourceId, desiredStart, desiredEnd}`. Output: similar resources or nearby slots (uses deterministic availability + similarity). |
| POST | `/ai/incident-summary` | Input: `{incidentId}`. Reads incident, condition reports, timeline. Output: `{summary, factsFromRecords[], unverifiedClaims[], missingInfo[], sources[]}`. Text is a **draft** and does not assign blame. |
| POST | `/ai/policy-summary` | Input: `{resourceId}`. Plain-language bullet summary (P2). |
| POST | `/ai/reindex` | Internal. Rebuilds embeddings after listing changes (called by Express on resource create/update, or nightly). |

`/ai/match-need` output:
```json
{
  "parsedNeed": { "items": [
    { "need": "3D printer", "categories": ["fabrication"], "capabilities": ["FDM","PLA"] },
    { "need": "soldering station", "categories": ["electronics"] },
    { "need": "oscilloscope", "categories": ["test-equipment"] }
  ]},
  "matches": [
    {
      "forNeed": "3D printer",
      "resourceId": "res_001",
      "score": 0.87,
      "matchType": "AVAILABLE_LISTING",
      "reasons": ["Category fabrication", "Capability: FDM, PLA", "Open slots this week"],
      "matchedFields": ["capabilities","category"],
      "caveats": ["Training required: 3D Printer Basics"]
    }
  ],
  "unmatchedNeeds": [],
  "source": "AI_EMBEDDING | KEYWORD_FALLBACK",
  "disclaimer": "Suggestions only. Eligibility and approval are decided separately."
}
```
`matchType` values: `AVAILABLE_LISTING` (verified listing with open slots), `POTENTIAL_NEEDS_VERIFICATION` (capability similar or listing incomplete), `NOT_CURRENTLY_AVAILABLE` (matches but fully booked/blacked out).

### 6.3 Implementation approach (simple and reliable)
1. Build a "searchable document" per resource: name + category + capabilities + specs + description + policy highlights.
2. **Embedding path:** sentence-transformers (e.g. `all-MiniLM-L6-v2`, runs locally, no API cost) or a hosted embedding API; store vectors in memory (numpy) or a DB vector column; cosine similarity.
3. **LLM path (optional):** one prompt that turns free text into the parsed-need JSON (strict JSON schema, validated with Pydantic; one retry on invalid JSON).
4. **Re-rank with deterministic filters** (Express-supplied `visibleResourceIds`, category match, distance, availability), then add `reasons[]` from matched fields. Reasons must come from real fields, never invented.
5. **Deterministic fallback (no model):** keyword and synonym dictionary (`"3d printing" -> fabrication`, `"scope" -> oscilloscope`), TF-IDF/BM25 over the searchable text (`scikit-learn` or `rank_bm25`). Response sets `source: "KEYWORD_FALLBACK"` and the UI shows "Keyword search (AI unavailable)".

### 6.4 Failure handling
| Failure | Behaviour |
|---|---|
| AI service down/timeouts (> 4 s) | Express catches, runs the Node-side keyword fallback, returns `source: KEYWORD_FALLBACK`, logs `AI_UNAVAILABLE`. |
| Model returns invalid JSON | Retry once; then fallback. |
| Zero matches | Return empty `matches` and suggest the missing-resource request flow. |
| Hallucinated resource ID | Express drops any ID not in `visibleResourceIds` or the DB. |
| Low confidence parse | Pre-fill fields, mark low-confidence fields, require user confirmation. |

### 6.5 Rules for AI outputs
- Always labelled "AI suggestion" with the reasons shown.
- Always correctable: user can edit the parsed need; coordinators can override matches and record why.
- AI never sees private fields (access instructions, user documents, personal contact details).
- Log `ai_request_id`, input hash, model/fallback used, and latency in audit (not the full prompt text if it contains personal data).

### 6.6 Python project layout
```
ai_service/
  main.py                 FastAPI app, routes
  schemas.py              Pydantic request/response models
  repository.py           read-only DB access (swap when DB decided)
  matching/embedder.py, matching/fallback.py, matching/rerank.py
  parsing/need_parser.py
  incidents/summarizer.py
  config.py, auth.py      internal key check
  tests/
```
Dependencies: `fastapi`, `uvicorn`, `pydantic`, `sentence-transformers` or provider SDK, `scikit-learn`/`rank_bm25`, DB driver (TBD).

---

## 7. Data Entities the API Relies On (DB-agnostic summary)

| Entity | Key fields | Notes |
|---|---|---|
| User | id, name, email, passwordHash, emailVerified, status | |
| Institution | id, name, type, verified, city, partnerIds | |
| InstitutionMembership | userId, institutionId, role, affiliationType, verifiedBy, verifiedAt | Authorisation source |
| Facility | id, institutionId, name, lat, lng, timezone, workingHours, geofenceRadius | |
| Resource | id, facilityId, name, category, description, specs(JSON), capabilities[], visibility, riskLevel, status | Soft-deactivate only |
| ResourcePolicy | resourceId, version, json, createdBy | Versioned |
| Blackout | resourceId, startAt, endAt, reason | |
| TrainingRequirement / TrainingRecord | trainingId, userId, status, verifiedBy, expiresAt | |
| DocumentTemplate / DocumentRecord | templateId, requestId, userId, status, fileId, signatureHash, expiresAt | |
| AccessRequest | id, resourceId, userId, accessMode, startAt, endAt, purpose, status, eligibilitySnapshot, decidedBy, decisionReason | |
| Booking | id, requestId, resourceId, userId, startAt, endAt, status, policyVersion | Overlap constraint |
| WaitlistEntry | requestId, resourceId, window, position, createdAt | |
| ServiceRequest | id, resourceId, userId, status, scope, quoteId | |
| CostEstimate / Invoice | refType, refId, lineItems, total, status, demo | |
| TokenLedger | userId, delta, reason, refId, createdAt | Append-only |
| ConditionReport | bookingId, kind(BEFORE/AFTER), rating, notes, photos[], signatureHash, geoStatus | |
| Incident / IncidentNote | id, refType, refId, type, severityByReporter, status, resolution | Notes append-only |
| NeedRequest / Referral | structured fields, status, consentShareContact | |
| Notification | userId, type, payload, readAt | |
| AuditEvent | seq, actor, action, entity, reason, payload, prevHash, hash | Append-only, hash-chained |
| AvailabilityPoll / Vote | resourceId, window, votes | P1 |

---

## 8. Priority Map

**P0 (needed for the end-to-end judge journey)**
Auth + OTP demo, memberships (seeded + admin approve), resources + policy, search (keyword + AI match with fallback), availability/slots, eligibility check, access request + review queue + decision (approve/reject/waitlist), bookings with overlap protection, check-in/check-out with condition reports + signature, incident report + resolve, audit chain + verify, notifications (in-app), dashboards (requester, manager), tokens or fair-use limits.

**P1**
Service-request flow with quotes, need-request + referral flow (the UI can be simple), documents/training review, availability polls, blackouts with impact handling, exports (XLSX/PDF), reschedule/extend, geofence soft check, email notifications, incident AI summary, coordinator and admin dashboards.

**P2**
Policy summary AI, external hash anchoring, real payments, SSO, hardware access control, calendar sync, multi-institution federation.

---

## 9. Testing Strategy (backend)
- **Unit:** eligibility engine (table-driven tests), state machine transitions (every illegal transition returns `INVALID_TRANSITION`), audit hash chain, token ledger sums.
- **Integration (Supertest):** full journey (register -> request -> approve -> check-in -> check-out -> confirm), RBAC denial cases, self-approval blocked, hidden-resource not returned for outsiders.
- **Concurrency:** 10 parallel approvals for the same slot, exactly one succeeds.
- **AI contract:** schema validation of AI responses; fallback path with AI service stopped.
- **Security smoke:** upload of `.exe` renamed `.png` rejected; access to another user's document returns 404/403; token expiry.

## 10. Environment Variables
```
PORT, NODE_ENV, DATABASE_URL, JWT_SECRET, JWT_REFRESH_SECRET,
AI_SERVICE_URL, AI_INTERNAL_KEY, FILE_STORAGE_PATH (or S3_*),
MAIL_ADAPTER (console|smtp), CORS_ORIGINS, DEMO_MODE=true
```

## 11. Honest Limitations to Document
- OTP, signatures, payments, tokens and geo-checks are demonstrations, not verified identity, legally binding agreements, or real financial transactions.
- The hash-chained log is tamper-evident, not a decentralised blockchain.
- Partner network is a seeded fictional set.
- AI is a suggestion layer; fallback search is keyword-based.
