# Module: policies

Resource policy management — versioned JSON policy per resource (Spec §4.6).

**Implemented in:** Step 04 — Resources & Policies

## Planned endpoints
| Method | Path | Auth | Notes |
|---|---|---|---|
| GET | `/api/v1/resources/:id/policy` | Any (public subset) / Manager (full) | Policy detail |
| PUT | `/api/v1/resources/:id/policy` | Owner/Manager | Replace policy; creates policyVersion+1 |

## Key constraints
- Every PUT creates a new policyVersion; bookings store the version they were approved under.
- Policy JSON is validated against the full schema defined in Spec §4.6.

## Files (to be created in Step 04)
- `policies.router.js`
- `policies.controller.js`
- `policies.service.js`
- `policies.schema.js`  — Zod schema for the full policy JSON
