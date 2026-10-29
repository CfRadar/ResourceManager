# Module: resources

Resource catalog — listings, visibility filtering, confidential redaction, and deactivation (Spec §4.5).

**Implemented in:** Step 04 — Resources & Policies

## Implemented Endpoints
| Method | Path | Auth | Notes |
|---|---|---|---|
| GET  | `/api/v1/resources` | Any (visibility-filtered) | Search/browse with query filters & redaction |
| GET  | `/api/v1/resources/categories` | Any | Category + tag vocabulary |
| GET  | `/api/v1/resources/:id` | Any (visibility-filtered) | Full public detail with confidential fields stripped |
| GET  | `/api/v1/resources/:id/private-details` | Approved requester / Manager / Owner | Access instructions & confidential codes |
| POST | `/api/v1/facilities/:id/resources` | Owner / Manager | Create resource under facility |
| PATCH | `/api/v1/resources/:id` | Owner / Manager | Edit resource listing |
| POST | `/api/v1/resources/:id/deactivate` | Owner | Soft-deactivate listing (blocks new bookings) |

## Files
- `resources.router.js`
- `resources.controller.js`
- `resources.service.js`
- `resources.repository.js`
- `resources.schema.js`
- `redaction.js`
