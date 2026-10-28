# Module: aiProxy

Express proxy layer for the Python AI service (Spec §4.24).

**Implemented in:** Step 10 (proxy scaffolding) + dependent on Step 08 (need-requests)

## Design
- Express wraps the Python AI service so the frontend never calls Python directly.
- Auth/visibility stays in one place (Express); Python receives only resource IDs
  the user is already allowed to see (`visibleResourceIds[]`).
- Express runs a deterministic keyword fallback if the AI service is down or times out (> 4 s).
- Returns `source: "KEYWORD_FALLBACK"` and logs `AI_UNAVAILABLE` on fallback.
- All hallucinated resource IDs are dropped (any ID not in `visibleResourceIds` or DB is removed).

## Planned endpoints
| Method | Path | Auth | Notes |
|---|---|---|---|
| POST | `/api/v1/ai/match-need` | Authed | NL text → parsed need + ranked visible resources |
| POST | `/api/v1/ai/parse-need` | Authed | Free text → structured need-request form fields |
| POST | `/api/v1/ai/incident-summary` | Manager | Draft summary of incident + timeline |
| POST | `/api/v1/ai/policy-summary` | Authed | Plain-language policy summary (P2) |

## Internal communication
- Header: `X-Internal-Key: <AI_INTERNAL_KEY>` + `X-User-Id: <userId>` for logging.
- Timeout: 4 000 ms (from `TIMEOUT.AI_SERVICE_MS`).

## Files (to be created in Step 10)
- `aiProxy.router.js`
- `aiProxy.controller.js`
- `aiProxy.service.js`  — fetch wrapper with timeout + fallback
