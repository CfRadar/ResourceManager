# Step 06: Requester Dashboard, Requests & Booking Details

This guide details the requester's personal dashboard (`/me`), request detail with appeal workflows, and booking management with live countdowns.

---

## 1. Requester Dashboard (`/me`) (Section 5.7)

```
+-------------------------------------------------------------------+
| Action Required (Pinned at top, highlighted)                      |
|  ⚠️ "Upload safety acknowledgment for Request #R-102"  [Upload]   |
|  ⏰ "Return Prusa i3 by 17:00 today"                  [Check-out] |
+-----------------------------------+-------------------------------+
| Upcoming Bookings (Cards)         | Fair-Use Meters & Tokens      |
| Pending Requests (Cards)          | Recent Notifications          |
| Open Incidents                    | Quick Actions: [Find Resource]|
+-----------------------------------+-------------------------------+
```

---

## 2. Request Detail Page (`/me/requests/:id`) (Section 5.8)

### 2.1 Key Modules
- **Header:** Request ID, StatusBadge (`Submitted`, `Under Review`, `Approved`, `Rejected`, `Waitlisted`).
- **What Happens Next Box:** Plain-language explanation (e.g. *"Dr. Sharma is reviewing your request. Expected response: within 24 hours"*).
- **Reviewer Messages:** Reviewer question with an inline reply input (`POST /access-requests/:id/respond`).
- **Decision Box (If Rejected or Waitlisted):**
  - Displays decision reason and reviewer identity.
  - **`[Appeal this decision]` Button:** Opens a modal allowing one appeal with justification text.
- **Audit Timeline:** Vertical `StatusTimeline` showing submission, reviews, and status changes.

---

## 3. Booking Detail Page (`/me/bookings/:id`) (Section 5.9)

### 3.1 Booking Card Features
- **Countdown Timer:** e.g. *"Starts in 2 hours 15 mins"*.
- **Unlocked Access Instructions:** Door code, Wi-Fi SSID, and safety precautions.
- **Actions:**
  - `[Check In]`: Active only within `[start - 15m, start + grace]`.
  - `[Reschedule]`: Checks alternative slots.
  - `[Cancel]`: Warns if late cancellation policy applies before confirmation.
- **Post-Return View:** Side-by-side comparison of `BEFORE` and `AFTER` condition reports.

---

## 4. Implementation Checklist

- [ ] Implement `RequesterDashboardPage.tsx`.
- [ ] Implement `RequestDetailPage.tsx` with appeal dialog.
- [ ] Implement `BookingDetailPage.tsx` with live countdown hook (`useCountdown`).
