# Step 07: Bookings, Concurrency, Check-In & Physical Returns

This guide details booking confirmation, concurrency safeguards, the check-in/out cycle, condition reporting, electronic signatures, and geofence verification.

---

## 1. Concurrency Control & Double-Booking Prevention

Section 4.11 mandates strict overlap prevention:

### 1.1 PostgreSQL GIST Exclusion
Leverage the PostgreSQL GiST exclusion constraint (`no_overlapping_bookings`) created in Step 01. When a transaction attempts to insert or update a booking that overlaps with another active booking for the same resource, Postgres raises an exclusion violation (error code `23P01`).
Catch error `23P01` in the controller and map it to `409 BOOKING_CONFLICT`.

### 1.2 Concurrency Test Requirement
Create an automated test in `tests/concurrency/booking.test.js`:
- Spawns 10 parallel HTTP requests for the exact same slot.
- Asserts that exactly **1 request succeeds** and **9 requests return 409 BOOKING_CONFLICT**.

---

## 2. Check-In Lifecycle (`/bookings/:id/check-in`)

### 2.1 Check-In Window
Valid only within:
`[startAt - 15 minutes, startAt + graceMinutes]`

### 2.2 Payload & Verification
```json
{
  "equipmentUnitId": "eq_laser_01",
  "accessories": ["focus_lens_2in", "honeycomb_bed"],
  "conditionReport": {
    "rating": 5,
    "notes": "Machine clean, optical mirrors spotless",
    "photos": ["file_abc123"]
  },
  "signature": {
    "type": "DRAWN",
    "data": "data:image/png;base64,..."
  },
  "geo": {
    "lat": 40.7128,
    "lng": -74.0060,
    "accuracy": 12.5
  }
}
```

### 2.3 Verification Mechanics:
1. **Virtual Signature:** Compute SHA-256 hash of `{ bookingId, conditionReport, timestamp, userId }` and store alongside signature. Wording: *"Acknowledged electronically (demo)"*.
2. **Geofence Check:** Calculate Haversine distance between `geo` and facility coordinates. If distance <= `facility.geofenceRadiusMeters`, mark `geoStatus = 'WITHIN'`, else `'OUTSIDE'`. This is a soft signal displayed to the manager, never an automated block.
3. **Condition Report:** Insert `condition_reports` row with `kind = 'BEFORE'`.
4. **State Transition:** Advance booking `SCHEDULED -> CHECKED_IN`.

---

## 3. Check-Out & Return Diffing (`/bookings/:id/check-out`)

### 3.1 Return Submission
- User uploads `AFTER` condition report, lists returned accessories, notes any consumables used, and signs.
- Advance booking `CHECKED_IN / IN_USE -> RETURNED`.

### 3.2 Automated Diff Computation
When the manager reviews the return (`POST /bookings/:id/confirm-return`):
- Compare `rating(BEFORE)` vs `rating(AFTER)`.
- If rating dropped >= 2 levels or accessories are missing:
  - Manager flags return and the system automatically pre-fills an **Incident draft**.
- If clean:
  - Manager confirms return; booking advances `RETURNED -> CLOSED`; user tokens are settled.

---

## 4. Implementation Checklist

- [ ] Implement Haversine formula distance utility in `src/utils/geo.js`.
- [ ] Implement Before/After condition report comparison diff logic.
- [ ] Write 10-client concurrency test to verify transaction isolation.
