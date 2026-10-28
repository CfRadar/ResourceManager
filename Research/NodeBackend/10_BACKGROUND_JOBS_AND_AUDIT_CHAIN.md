# Step 10: Scheduled Jobs & Tamper-Evident Audit Hash Chain

This guide details background scheduled jobs (reminders, overdue handling, expiry) and the cryptographic SHA-256 audit hash chain.

---

## 1. Scheduled Background Jobs (`src/jobs/`)

Implement lightweight background jobs using `node-cron` (Section 5.3):

| Job Name | Schedule | Action |
|---|---|---|
| `bookingReminders` | Every 5 mins (`*/5 * * * *`) | Send reminders 24h and 1h prior to `startAt`, and 30m prior to `endAt`. |
| `overdueCheck` | Every 5 mins (`*/5 * * * *`) | Flag bookings as `OVERDUE` when `now > endAt + graceMinutes` without return. |
| `noShowCheck` | Every 5 mins (`*/5 * * * *`) | Flag bookings where user failed to check-in within grace period. |
| `docAndTrainingExpiry` | Daily at 01:00 UTC (`0 1 * * *`) | Transition expired documents and training records to `EXPIRED`. |
| `waitlistExpiry` | Hourly (`0 * * * *`) | Expire unaccepted waitlist offers after 24h and notify the next user in FIFO queue. |
| `auditIntegrityCheck` | Daily at 03:00 UTC (`0 3 * * *`) | Validate cryptographic integrity of audit records. |

---

## 2. Cryptographic Tamper-Evident Audit Hash Chain

Section 4.20 requires an immutable, verifiable audit log.

### 2.1 Audit Event Shape
```json
{
  "id": "evt_01JABCDEF123456",
  "seq": 1042,
  "at": "2026-10-28T10:15:00Z",
  "actorId": "usr_987",
  "actorRole": "MANAGER",
  "action": "ACCESS_REQUEST_APPROVED",
  "entityType": "AccessRequest",
  "entityId": "req_456",
  "resourceId": "res_123",
  "reason": "Training verified, slot free",
  "visibility": "PARTIES",
  "payload": { "before": { "status": "UNDER_REVIEW" }, "after": { "status": "APPROVED" } },
  "prevHash": "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
  "hash": "4a5e1e4baab89f3a32518a88c31bc87f618f76673e2cc77ab2127b7afdeda33b"
}
```

### 2.2 Hash Calculation
The hash for sequence `N` is computed from the previous record's hash plus canonical JSON of the current record:

```javascript
import crypto from 'crypto';

export function computeEventHash(prevHash, eventData) {
  // Canonical string: deterministic key ordering
  const canonicalPayload = JSON.stringify(eventData, Object.keys(eventData).sort());
  const input = `${prevHash || 'GENESIS'}:${canonicalPayload}`;
  return crypto.createHash('sha256').update(input).digest('hex');
}
```

### 2.3 Verification Endpoint (`GET /api/v1/audit/verify/:scope/:id`)
Iterates through all audit records in order of `seq ASC`, recomputes each hash, and confirms:
`computedHash === record.hash && record.prevHash === previousRecord.hash`
Returns `{ valid: true }` or `{ valid: false, brokenAtSeq: 1042 }`.

---

## 3. Demo Data Seeder (`POST /admin/seed-demo`)

Populates the database with realistic sample entities:
- 3 Partner Institutions (Engineering University, Innovation Hub, Medical Research Lab).
- 5 Facilities with working hours.
- 10 Diverse Resources (3D printers, CNC mills, SEM electron microscope, autoclaves).
- Standard document templates (Safety Acknowledgment, Lab Protocol).
- Demo users across all roles (`requester@demo.edu`, `manager@demo.edu`, `admin@demo.edu`).

---

## 4. Implementation Checklist

- [ ] Write `src/services/auditChain.js` for hashing and verification.
- [ ] Initialize `src/jobs/scheduler.js` in Express `server.js` startup lifecycle.
- [ ] Implement seed script with realistic demonstration data.
