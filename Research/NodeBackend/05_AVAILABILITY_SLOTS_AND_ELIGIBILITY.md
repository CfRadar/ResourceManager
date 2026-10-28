# Step 05: Availability, Blackouts, Slots & Deterministic Eligibility

This guide details schedule availability calculations, blackout management, slot generation, availability polling, and the deterministic rule engine.

---

## 1. Availability & Slot Generation (`/availability`, `/slots`)

### 1.1 Availability Computation (`GET /resources/:id/availability?from=&to=`)
1. Determine facility working hours for the date range.
2. Query active bookings (`SCHEDULED`, `CHECKED_IN`, `IN_USE`) in the interval.
3. Query active `blackout_periods`.
4. Return merged intervals labeled:
   - `OPEN`: Within working hours and unreserved.
   - `BUSY`: Reserved by another booking (shows **no user info**; purely `"Booked"`).
   - `BLACKOUT`: Facility maintenance or holiday.

### 1.2 Slot Generation (`GET /resources/:id/slots?date=&durationMin=`)
- Slices available time into bookable increments matching `durationMin`.
- Filters out slots within `policy.limits.advanceBookingDays` or violating `maxSingleBookingHours`.

### 1.3 Blackouts & Collisions (`POST /resources/:id/blackouts`)
- If a blackout collides with existing bookings:
  - If `confirmCancelAffected !== true`: Return colliding bookings with code `BOOKING_CONFLICT`.
  - If `confirmCancelAffected === true`: Set affected bookings to `NEEDS_REBOOK` or `CANCELLED`, trigger notifications to users, and insert blackout.

---

## 2. Deterministic Eligibility Engine (Section 4.8)

> **Golden Rule:** Eligibility is 100% deterministic code. No AI is used in eligibility determinations.

### 2.1 The 6 Standard Checks
When a requester checks eligibility (`POST /resources/:id/eligibility-check`), evaluate:

1. `membership_verified`: Does user have a verified membership with an approved institution?
2. `user_group_allowed`: Is user's group in `policy.permittedUserGroups`?
3. `training`: Has user completed all `policy.requiredTrainingIds` and are certificates unexpired?
   - If missing: Return status `FAIL` with action `{ type: "BOOK_TRAINING", trainingId }`.
4. `documents`: Has user signed/uploaded all `policy.requiredDocumentTemplateIds`?
   - If missing: Return status `MISSING` with action `{ type: "SIGN_DOCUMENT", templateId }`.
5. `fair_use`:
   - Active bookings count < `policy.limits.maxActiveBookings`?
   - Hours booked this week + requested hours <= `policy.limits.maxHoursPerWeek`?
   - Strikes < `policy.cancellation.noShowStrikeLimit`?
6. `slot_free`: Is the desired slot completely free of collisions and within working hours?

### 2.2 Response Contract
```json
{
  "eligible": false,
  "canRequest": true,
  "checks": [
    { "key": "membership_verified", "label": "Verified affiliation", "status": "PASS" },
    { "key": "training", "label": "3D Printer Basics", "status": "FAIL", "action": { "type": "BOOK_TRAINING", "trainingId": "trn_3dp" } }
  ],
  "requiredNextSteps": ["Complete 3D Printer Basics training"]
}
```
- `eligible = true`: All hard checks pass.
- `canRequest = true`: User may submit; request enters `AWAITING_TRAINING` or `AWAITING_DOCUMENTS`.

---

## 3. Implementation Checklist

- [ ] Write `src/services/eligibilityEngine.js` evaluating the 6 checks.
- [ ] Implement `src/services/bookingEngine.js` calculating free/busy time slices.
- [ ] Unit test eligibility edge cases (e.g., user exactly at weekly hour limit).
