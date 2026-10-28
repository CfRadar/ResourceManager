# Step 03: Institutions, Facilities & Memberships

This guide details institution onboarding, facility configurations, working hours, geofencing, and member verification.

---

## 1. Institutions Domain (`/institutions`)

### 1.1 Endpoints
- `GET /api/v1/institutions` — List verified institutions (public fields).
- `GET /api/v1/institutions/:id` — Detail + associated facilities.
- `POST /api/v1/institutions` — Platform admin: register new institution.
- `PATCH /api/v1/institutions/:id` — Admin of institution: update profile.
- `POST /api/v1/institutions/:id/membership-requests` — Requester: apply for membership.
- `GET /api/v1/institutions/:id/membership-requests` — Admin: list pending applications.
- `POST /api/v1/institutions/:id/membership-requests/:reqId/decision` — Admin: `{ decision: 'APPROVE' | 'REJECT', role, reason }`.
- `POST /api/v1/institutions/:id/partners` — Link partner institutions for cross-network sharing.

### 1.2 Membership Lifecycle
1. User submits request with student ID or staff email proof.
2. Institution Admin reviews and assigns role (`REQUESTER`, `OPERATOR`, `MANAGER`, `OWNER`).
3. Approving creates `InstitutionMembership` with `verifiedBy = adminId` and `verifiedAt = NOW()`.
4. User's future JWT refresh includes the updated membership.

---

## 2. Facilities Domain (`/facilities`)

### 2.1 Schema & Location Coordinates
Facilities represent physical buildings or labs hosting equipment:
- `name`: e.g. "Advanced Fabrication Lab - Room 204"
- `lat` & `lng`: Decimal coordinates for distance calculations.
- `timezone`: IANA timezone string (e.g. `'America/New_York'`, `'Asia/Kolkata'`) used to interpret operating hours.
- `geofenceRadiusMeters`: Buffer distance (default `150m`) for soft-check-in verification.
- `workingHours`: Structured JSON schedule:
  ```json
  {
    "monday": { "open": "08:00", "close": "18:00" },
    "tuesday": { "open": "08:00", "close": "18:00" },
    "wednesday": { "open": "08:00", "close": "18:00" },
    "thursday": { "open": "08:00", "close": "18:00" },
    "friday": { "open": "08:00", "close": "17:00" },
    "saturday": null,
    "sunday": null
  }
  ```

### 2.2 Endpoints
- `GET /api/v1/facilities` — Filter by `institutionId`, `city`, `q`.
- `GET /api/v1/facilities/:id` — Detail (public view).
- `POST /api/v1/institutions/:id/facilities` — Owner / Admin create facility.
- `PATCH /api/v1/facilities/:id` — Update hours or coordinates.

---

## 3. Implementation Checklist

- [ ] Write Zod schemas for membership application and decision payloads.
- [ ] Implement `facilityService.isWithinWorkingHours(facility, startAt, endAt)` helper considering timezones.
- [ ] Implement partner institution linking table queries for network visibility queries.
