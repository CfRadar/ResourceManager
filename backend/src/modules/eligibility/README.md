# Module: eligibility

Deterministic eligibility check engine — 100% deterministic, zero AI (Spec §4.8).

**Status:** Implemented in Step 05.

## Endpoints
| Method | Path | Auth | Notes |
|---|---|---|---|
| POST | `/api/v1/resources/:id/eligibility-check` | Authenticated | Runs 6 standard checks; returns checklist + required next steps |

## The 6 Standard Checks
1. `membership_verified`: Active verified affiliation with host or partner institution.
2. `user_group_allowed`: Permitted user group from policy.
3. `training`: All required unexpired training prerequisites completed (`BOOK_TRAINING` action).
4. `documents`: All required document templates signed/approved (`SIGN_DOCUMENT` action).
5. `fair_use`: Active bookings count, weekly hours limit, and no-show strike cap.
6. `slot_free`: Operating hours boundary check and active reservation/blackout collision prevention.

## Implemented Files
- `eligibility.router.js`: Express route definition mounted on `/resources/:id/eligibility-check`.
- `eligibility.controller.js`: Request dispatching to `services/eligibilityEngine.js`.
- `eligibility.schema.js`: Zod schema validating access mode and optional slot timestamps.
- `src/services/eligibilityEngine.js`: Core deterministic rule engine evaluating all 6 checks.
