# Module: facilities

Facility listings and management (Spec §4.4).

**Implemented in:** Step 03 — Institutions, Facilities & Memberships

## Planned endpoints
| Method | Path | Auth | Notes |
|---|---|---|---|
| GET  | `/api/v1/facilities` | Any | List visible facilities |
| GET  | `/api/v1/facilities/:id` | Any | Detail (public fields) |
| POST | `/api/v1/institutions/:id/facilities` | Admin/Owner | Create facility |
| PATCH | `/api/v1/facilities/:id` | Owner/Admin | Update |

## Files (to be created in Step 03)
- `facilities.router.js`
- `facilities.controller.js`
- `facilities.service.js`
- `facilities.schema.js`
