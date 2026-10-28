# Module: eligibility

Deterministic eligibility check engine — no AI (Spec §4.8).

**Implemented in:** Step 05 — Availability, Slots & Eligibility

## Planned endpoints
| Method | Path | Auth | Notes |
|---|---|---|---|
| POST | `/api/v1/resources/:id/eligibility-check` | Requester | Run checklist; client result is never trusted server-side |

## Key constraints
- The same service (`services/eligibilityEngine.js`) is re-run server-side on request submit and on approval decision.
- Returns per-check pass/fail with actionable next steps.
- `eligible` = all hard checks pass; `canRequest` = may submit into AWAITING_* state.

## Files (to be created in Step 05)
- `eligibility.router.js`
- `eligibility.controller.js`
- (delegates to `services/eligibilityEngine.js`)
