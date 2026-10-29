# Module: referrals

Cross-institution referral lifecycle and privacy-preserving contact sharing (Spec §4.14, Step 08).

**Implemented in:** Step 08 — Service Requests & Referrals

## State machine
`SUBMITTED → COORDINATOR_REVIEW → CANDIDATE_IDENTIFIED → REFERRAL_SENT → ACCEPTED | DECLINED | NO_RESPONSE`
`ACCEPTED` can only be set by a user belonging to the receiving institution.

## Implemented Endpoints
| Method | Path | Auth | Notes |
|---|---|---|---|
| GET  | `/api/v1/referrals/inbox` | Member of receiving institution | Incoming referrals (contact withheld by default) |
| GET  | `/api/v1/referrals/:id` | Parties / Receiving staff | Detail with privacy sanitization |
| POST | `/api/v1/referrals/:id/respond` | Receiving institution member | ACCEPT/DECLINE (`assertNoSelfApproval`) |
| POST | `/api/v1/referrals/:id/release-contact` | Coordinator/Admin | Release contact if requester consented and accepted |

## Key constraints
- Requester contact is **withheld by default** unless `consentShareContact === true` and referral is `ACCEPTED`.
- System never auto-accepts a referral.
- No self-approval: requester cannot accept referral on receiving side.

## Files
- `referrals.router.js`
- `referrals.controller.js`
- `referrals.service.js`
- `referrals.repository.js`
- `referrals.schema.js`
