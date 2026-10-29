# Module: facilities

Facility listings and management (Spec §4.4).

**Implemented in:** Step 03 — Institutions, Facilities & Memberships

## Implemented Endpoints
| Method | Path | Auth | Notes |
|---|---|---|---|
| GET  | `/api/v1/facilities` | Any | List visible facilities (filter by institutionId, city, q) |
| GET  | `/api/v1/facilities/:id` | Any | Detail (public fields + institution info) |
| POST | `/api/v1/institutions/:id/facilities` | Admin / Owner | Create facility |
| PATCH | `/api/v1/facilities/:id` | Owner / Admin | Update facility coordinates or hours |

## Files
- `facilities.router.js`
- `facilities.controller.js`
- `facilities.service.js`
- `facilities.repository.js`
- `facilities.schema.js`
