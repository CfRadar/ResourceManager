# Module: users

User profile management (Spec §4.2).

**Implemented in:** Step 02 — Authentication, RBAC & Security

## Planned endpoints
| Method | Path | Auth | Notes |
|---|---|---|---|
| GET   | `/api/v1/users/me` | Any | Own profile |
| PATCH | `/api/v1/users/me` | Any | Update name, phone, bio |
| GET   | `/api/v1/users/:id/public-card` | Any authed | Minimal public card |
| GET   | `/api/v1/users/me/usage-summary` | Any | Fair-use meter data |
| GET   | `/api/v1/users/:id/usage-history` | Manager/Owner scoped | Audited view |
| GET   | `/api/v1/users/me/trainings` | Requester | Own training records |

## Files (to be created in Step 02)
- `users.router.js`
- `users.controller.js`
- `users.service.js`
- `users.schema.js`
