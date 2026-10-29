# Module: aiProxy

Express proxy layer for the Python AI service (Spec §4.24).

**Status:** Completed in Step 10 — Background Jobs & Audit Chain

## Design
- Express wraps the Python AI service with standard authentication and role checks.
- Enforces a 4,000 ms timeout (`TIMEOUT.AI_SERVICE_MS`). If the AI microservice times out or is offline, executes a deterministic keyword fallback returning `source: "KEYWORD_FALLBACK"`.
- Appends `AI_UNAVAILABLE_FALLBACK` audit events on fallback activation.

## Endpoints
| Method | Path | Auth | Notes |
|---|---|---|---|
| POST | `/api/v1/ai/match-need` | Authed | Natural language need text → ranked resources with fallback |
| POST | `/api/v1/ai/parse-need` | Authed | Free text → structured need-request fields |
| POST | `/api/v1/ai/incident-summary` | Manager / Owner | Neutral factual summary of incident timeline |
| POST | `/api/v1/ai/policy-summary` | Authed | Plain-language resource policy summary |

## Implementation Files
- `aiProxy.router.js`
- `aiProxy.controller.js`
- `aiProxy.service.js`
