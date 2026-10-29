# Module: institutions

Institution profiles, membership requests, and partner links (Spec §4.3).

**Implemented in:** Step 03 — Institutions, Facilities & Memberships

## Implemented Endpoints
| Method | Path | Auth | Notes |
|---|---|---|---|
| GET  | `/api/v1/institutions` | Any | Public verified list with pagination and search |
| GET  | `/api/v1/institutions/:id` | Any | Detail + public facilities |
| POST | `/api/v1/institutions` | Platform admin | Create institution |
| PATCH | `/api/v1/institutions/:id` | Admin of institution | Update profile |
| POST | `/api/v1/institutions/:id/membership-requests` | Requester | Join request (supports proof) |
| GET  | `/api/v1/institutions/:id/membership-requests` | Admin | Pending requests list with user info |
| POST | `/api/v1/institutions/:id/membership-requests/:reqId/decision` | Admin | Approve/reject with strict no-self-approval |
| POST | `/api/v1/institutions/:id/partners` | Admin | Bidirectional partner link |
| GET  | `/api/v1/institutions/:id/partners` | Any | List partner institutions |
| POST | `/api/v1/institutions/:id/facilities` | Admin / Owner | Create facility on institution |

## Files
- `institutions.router.js`
- `institutions.controller.js`
- `institutions.service.js`
- `institutions.repository.js`
- `institutions.schema.js`
