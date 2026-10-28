# Module: resources

Resource catalog — listings, photos, deactivation (Spec §4.5).

**Implemented in:** Step 04 — Resources & Policies

## Planned endpoints
| Method | Path | Auth | Notes |
|---|---|---|---|
| GET  | `/api/v1/resources` | Any (visibility-filtered) | Search/browse with eligibilityPreview |
| GET  | `/api/v1/resources/categories` | Any | Category + tag vocabulary |
| GET  | `/api/v1/resources/:id` | Any (visibility-filtered) | Full public detail |
| GET  | `/api/v1/resources/:id/private-details` | Approved requester / Manager / Owner | Access instructions |
| POST | `/api/v1/facilities/:id/resources` | Owner/Manager | Create |
| PATCH | `/api/v1/resources/:id` | Owner/Manager | Edit |
| POST | `/api/v1/resources/:id/photos` | Owner/Manager | Upload photo |
| DELETE | `/api/v1/resources/:id/photos/:photoId` | Owner/Manager | Soft-delete photo |
| POST | `/api/v1/resources/:id/deactivate` | Owner | Soft-deactivate |

## Key constraints
- Field-level redaction: never leak access instructions, door codes, or owner contact in public listings.
- Visibility filter: PUBLIC | NETWORK | INSTITUTION | PRIVATE enforced at the query layer.

## Files (to be created in Step 04)
- `resources.router.js`
- `resources.controller.js`
- `resources.service.js`
- `resources.schema.js`
- `resources.repository.js`
