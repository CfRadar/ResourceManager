# Step 08: Manager Dashboard, Review Queue & Returns Desk

This guide details facility manager operations (`/manage`), review queues, decision execution with `ReasonDialog`, strict no-self-approval lockouts, and the returns desk.

---

## 1. Manager Dashboard (`/manage`) (Section 6.1)

```
+--------------------------------------------------------------------+
| Needs Attention Bar:                                               |
|  - 5 requests to review   - 2 returns to confirm  - 1 open incident|
+------------------------------------+-------------------------------+
| Today's Schedule (Timeline View)   | Facility Utilisation Rate (%) |
| Waitlist Demand by Resource        | Recent Review Decisions       |
+------------------------------------+-------------------------------+
```

---

## 2. Review Queue & Review Detail (`/manage/queue`, `/:id`) (Section 6.2)

### 2.1 Queue View
Data table displaying:
- Requester Name, Institution, and Verified badge.
- Resource, Requested Time, and Access Mode.
- **Eligibility Indicator Icons:** Affiliation / Training / Documents / Fair-Use.
- Waiting duration & Status.

### 2.2 Review Detail
- **System Eligibility Verification:** Displays live checklist. Checks marked `overridable` allow manager override with documented justification.
- **Strict No-Self-Approval UI Lockout:**
  > If `currentUserId === request.requesterId`:
  > Decision buttons are completely hidden, replaced with:
  > *"You cannot review your own request. An independent manager must review this application."*
- **Action Buttons:**
  - `[Approve]` -> Opens `ReasonDialog` -> Submits approval.
  - `[Request Info]` -> Prompts for question to requester.
  - `[Waitlist]` -> Moves request to FIFO queue.
  - `[Reject]` -> Mandatory rejection reason.

---

## 3. Check-In & Returns Desk (`/manage/checkin`) (Section 6.4)

Two-column layout:
- **Arriving Today:** Users due to check in. Button: `[Assist Check-In]`.
- **Due Back Today:** Bookings ending today.
  - Button: `[Confirm Return]` -> Opens Before/After condition comparison modal.
  - Button: `[Flag Issue]` -> Opens pre-populated incident draft.
  - Button: `[Mark No-Show]` -> Active after grace period ends.

---

## 4. Implementation Checklist

- [ ] Implement `ManagerDashboardPage.tsx` and `ReviewQueuePage.tsx`.
- [ ] Implement `ReviewDetailPage.tsx` with self-approval lockout guard.
- [ ] Build `CheckInDeskPage.tsx` with side-by-side condition diff inspection.
