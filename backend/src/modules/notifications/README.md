# Module: notifications

In-app notification management and delivery (Spec §4.19).

**Status:** Completed in Step 10 — Background Jobs & Audit Chain

## Events that create notifications
Booking reminders (24h, 1h, 30m end), overdue return alerts, no-show warnings, waitlist slot offers, referral timeouts, document and training expirations, and incident updates.

## Endpoints
| Method | Path | Auth | Notes |
|---|---|---|---|
| GET  | `/api/v1/notifications` | Authed | In-app notification list (`?unread=true`, pagination) |
| POST | `/api/v1/notifications/:id/read` | Authed | Mark single notification as read |
| POST | `/api/v1/notifications/read-all` | Authed | Mark all user notifications as read |

## Implementation Files
- `notifications.router.js`
- `notifications.controller.js`
- `notifications.service.js`
