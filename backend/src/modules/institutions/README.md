# Module: institutions

Institution profiles, membership requests, and partner links (Spec §4.3).

**Implemented in:** Step 03 — Institutions, Facilities & Memberships

## Planned endpoints
| Method | Path | Auth | Notes |
|---|---|---|---|
| GET  | `/api/v1/institutions` | Any | Public list |
| GET  | `/api/v1/institutions/:id` | Any | Detail + public facilities |
| POST | `/api/v1/institutions` | Platform admin | Demo seeding only |
| PATCH | `/api/v1/institutions/:id` | Admin of institution | Update profile |
| POST | `/api/v1/institutions/:id/membership-requests` | Requester | Join request |
| GET  | `/api/v1/institutions/:id/membership-requests` | Admin | Pending requests |
| POST | `/api/v1/institutions/:id/membership-requests/:reqId/decision` | Admin | Approve/reject |
| GET  | `/api/v1/institutions/:id/members` | Admin | Member list |
| PATCH | `/api/v1/institutions/:id/members/:userId` | Admin | Role / suspend |
| POST | `/api/v1/institutions/:id/partners` | Admin | Link partner |

## Files (to be created in Step 03)
- `institutions.router.js`
- `institutions.controller.js`
- `institutions.service.js`
- `institutions.schema.js`
