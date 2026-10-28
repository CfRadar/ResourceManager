# Module: tokens

Append-only token/credit ledger — fair-use economy (Spec §4.17).

**Implemented in:** Step 09 — Incidents, Tokens, Payments & Exports

## Key constraints
- Ledger rows are NEVER updated or deleted. Balance = SUM of entries.
- Token operations (hold, charge, refund) are internal; they are called by other services
  within database transactions, not exposed as direct endpoints.
- `tokenService.js` is the canonical interface.

## Planned endpoints
| Method | Path | Auth | Notes |
|---|---|---|---|
| GET  | `/api/v1/tokens/balance` | Requester | Balance + held + monthly allowance |
| GET  | `/api/v1/tokens/ledger` | Requester | Own ledger (append-only entries) |
| POST | `/api/v1/admin/tokens/grant` | Admin | Grant tokens with reason |

## Files (to be created in Step 09)
- `tokens.router.js`
- `tokens.controller.js`
- (delegates to `services/tokenService.js`)
