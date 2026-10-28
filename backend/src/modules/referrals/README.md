# Module: referrals

Cross-institution referral lifecycle (Spec §4.14).

**Implemented in:** Step 08 — Service Requests & Referrals

## State machine
`SUBMITTED → COORDINATOR_REVIEW → CANDIDATE_IDENTIFIED → REFERRAL_SENT → ACCEPTED | DECLINED | NO_RESPONSE`
ACCEPTED can only be set by a user belonging to the receiving institution.

## Planned endpoints
| Method | Path | Auth | Notes |
|---|---|---|---|
| GET  | `/api/v1/referrals/inbox` | Owner/Manager/Coordinator of receiving institution | Incoming referrals |
| POST | `/api/v1/referrals/:id/respond` | Receiving institution user | ACCEPT/DECLINE |
| POST | `/api/v1/referrals/:id/release-contact` | Coordinator (only if requester consented) | Share contact info; audited |

## Key constraints
- Requester contact is NOT shared unless `consentShareContact` was set on the need request.
- System never auto-accepts a referral.

## Files (to be created in Step 08)
- `referrals.router.js`
- `referrals.controller.js`
- `referrals.service.js`
- `referrals.schema.js`
- `referrals.stateMachine.js`
