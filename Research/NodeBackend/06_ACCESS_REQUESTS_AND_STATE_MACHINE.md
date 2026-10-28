# Step 06: Access Requests & The Central State Machine

This guide details the `AccessRequest` lifecycle, reviewer queues, appeals, waitlist FIFO mechanics, and the central `transition()` function.

---

## 1. The Central Transition Engine (`src/services/transition.js`)

> **Hard Spec Rule (Section 3):** Every state change in the system must route through one centralized function:
> `transition(entityType, entityId, toState, actor, reason, payload)`
> Direct SQL `UPDATE ... SET status = ...` anywhere else in the application is strictly forbidden.

### 1.1 Transition Responsibilities
1. **Validate Transition:** Asserts that the transition from `entity.status` to `toState` is allowed in the state table.
2. **Validate Role & Scoping:** Checks that `actor` has authority to trigger this specific transition.
3. **No Self-Approval:** Enforces `actor.id !== entity.requester_id` for approvals and rejections.
4. **Atomic Transaction:** Inside a single DB transaction:
   - Updates status and `updated_at`.
   - Records an immutable `audit_events` row chained to the previous hash.
   - Generates an in-app `notification`.

---

## 2. AccessRequest State Machine (Section 3.1)

```
[DRAFT] ──> [SUBMITTED] ──> [UNDER_REVIEW]
                                │
   ┌────────────────────────────┼───────────────────────────┐
   ▼                            ▼                           ▼
[MORE_INFO_REQUIRED]    [AWAITING_DOCS/TRAINING]       [REJECTED / APPEALED]
   │                            │                           ▲
   └──────> [SUBMITTED]         └──────> [UNDER_REVIEW]     │
                                           │                │
                        ┌──────────────────┴────────────────┤
                        ▼                                   ▼
                   [APPROVED]                         [WAITLISTED]
                        │                                   │ (slot freed)
                        ▼                                   ▼
                   [SCHEDULED] <────────────────────────────┘
```

---

## 3. Review Queue & Decisions (`/access-requests/:id/decision`)

### 3.1 Reviewer Queue (`GET /facilities/:id/access-requests?status=`)
Managers view submitted requests ordered by `created_at ASC` (oldest first). Each request displays an eligibility badge summary.

### 3.2 Decision Execution:
- **`APPROVE`**:
  1. Re-runs server-side eligibility check.
  2. Acquires slot lock and verifies no overlapping booking exists.
  3. Creates `Booking` record with status `SCHEDULED`.
  4. Holds user tokens if token pricing is enabled.
  5. Transitions request `UNDER_REVIEW -> APPROVED -> SCHEDULED`.
  6. If overlap occurs: Returns `409 BOOKING_CONFLICT` with 3 alternative suggested slots; request remains `UNDER_REVIEW`.
- **`REJECT`**: Requires mandatory human-readable `reason`. Enables one appeal route.
- **`WAITLIST`**: Creates `waitlist_entries` record. Position is strictly **FIFO by `created_at`** unless an explicit documented policy exception applies. When an existing booking cancels, the scheduler notifies the manager to offer the slot.

---

## 4. Implementation Checklist

- [ ] Define transition lookup table in `src/services/transition.js`.
- [ ] Implement atomic transaction wrapper ensuring audit event is written simultaneously.
- [ ] Implement FIFO waitlist promotion logic on booking cancellation.
