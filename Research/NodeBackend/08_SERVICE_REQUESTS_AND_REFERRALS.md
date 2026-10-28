# Step 08: Staff-Operated Services & Cross-Institutional Referrals

This guide details staff-operated service requests (scope review, quotes, sample intake, delivery) and missing-resource network referrals.

---

## 1. Staff-Operated Service Requests (`/service-requests`)

Used when specialized lab staff or technicians operate the equipment on behalf of a researcher (Section 4.13).

### 1.1 State Machine Lifecycle
```
[DRAFT] ──> [SUBMITTED] ──> [SCOPE_REVIEW] ──> [QUOTE_SENT]
                                                    │
                 ┌──────────────────────────────────┴──────────────────────────────────┐
                 ▼                                                                     ▼
          [QUOTE_ACCEPTED]                                                      [QUOTE_DECLINED]
                 │                                                                     │
                 ▼                                                                     ▼
        [AWAITING_MATERIALS]                                                        [CLOSED]
                 │
                 ▼
        [MATERIALS_RECEIVED]
                 │
                 ▼
       [SERVICE_IN_PROGRESS]
                 │
                 ▼
        [OUTPUT_DELIVERED]
                 │
                 ▼
       [CONFIRMED_COMPLETED] ──> [CLOSED]
```

### 1.2 Endpoints & Actions
- `POST /api/v1/service-requests` — Create request (sample info, deliverables, deadlines).
- `POST /api/v1/service-requests/:id/scope-review` — Manager marks feasible / infeasible.
- `POST /api/v1/service-requests/:id/quote` — Manager issues cost estimate with itemized breakdown and expiration date.
- `POST /api/v1/service-requests/:id/quote/respond` — Requester accepts or declines.
- `POST /api/v1/service-requests/:id/materials-received` — Operator confirms physical sample receipt with intake photo.
- `POST /api/v1/service-requests/:id/progress` — Status milestone updates (`STARTED`, `IN_ANALYSIS`).
- `POST /api/v1/service-requests/:id/deliver-output` — Upload analysis results / CAD outputs (`OUTPUT_DELIVERED`).
- `POST /api/v1/service-requests/:id/confirm-completion` — Requester signs off or disputes (disputes trigger incident creation).

---

## 2. Missing-Resource Requests & Network Referrals (`/need-requests`, `/referrals`)

When an institution lacks a specific tool (e.g., TEM microscope), users file a structured `NeedRequest`. Network coordinators locate matching facilities and issue cross-institution referrals (Section 4.14).

### 2.1 Workflow
1. **Requester Submits Need:**
   - Body: `{ capabilityNeeded, technicalRequirements, locationPreference, budget, consentShareContact: false }`.
2. **Coordinator Discovers Candidates:**
   - Calls `/need-requests/:id/candidates` which queries the AI matching engine or keyword fallback.
3. **Coordinator Dispatches Referral:**
   - Sends referral to partner institution (`POST /need-requests/:id/referrals`).
   - Requester contact info is **redacted by default**.
4. **Receiving Institution Decides:**
   - Manager reviews in `/referrals/inbox` and accepts or declines.
   - Only receiving staff can set status to `ACCEPTED`.
5. **Contact Release:**
   - If accepted and `consentShareContact === true`, coordinator releases contact info.

---

## 3. Implementation Checklist

- [ ] Implement `serviceRequests` controller and transition definitions.
- [ ] Implement referral privacy filters preventing unsolicited contact sharing.
- [ ] Link deliverables upload with authorized signed file download URLs.
