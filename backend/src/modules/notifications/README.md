# Module: notifications

In-app notification management (Spec §4.19).

**Implemented in:** Step 10 — Background Jobs & Audit Chain (notification dispatch)

## Events that create notifications
Request submitted/needs info/approved/rejected/waitlisted, waitlist slot offered,
booking reminder (24h + 1h before), overdue, return confirmed, incident
created/updated/resolved, referral sent/responded, document/training expiring.

Email delivery: console logger in demo; SMTP/Resend adapter in P1.

## Planned endpoints
| Method | Path | Auth | Notes |
|---|---|---|---|
| GET  | `/api/v1/notifications` | Authed | In-app list (filter: ?unread=true) |
| POST | `/api/v1/notifications/:id/read` | Authed | Mark read |
| POST | `/api/v1/notifications/read-all` | Authed | Mark all read |
| GET/PUT | `/api/v1/notifications/preferences` | Authed | Toggle per-event type (P1) |

## Files (to be created in Step 10)
- `notifications.router.js`
- `notifications.controller.js`
- `notifications.service.js`
