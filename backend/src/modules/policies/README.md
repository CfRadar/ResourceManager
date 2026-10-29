# Module: policies

Resource policy management — versioned JSON policy per resource (Spec §4.6).

**Implemented in:** Step 04 — Resources & Policies

## Implemented Endpoints
| Method | Path | Auth | Notes |
|---|---|---|---|
| GET | `/api/v1/resources/:id/policy` | Any | Policy detail |
| PUT | `/api/v1/resources/:id/policy` | Owner / Manager | Replace policy; creates policy_version + 1 |

## Files
- `policies.router.js`
- `policies.controller.js`
- `policies.service.js`
- `policies.repository.js`
- `policies.schema.js`
