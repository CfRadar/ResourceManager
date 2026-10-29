# Module: tokens

Append-only token/credit ledger — fair-use economy (Spec §4.17, Step 09).

**Implemented in:** Step 09 — Incidents, Tokens, Payments & Exports

## Key constraints
- Ledger rows are NEVER updated or deleted. Balance = SUM of entries.
- Operations (`hold`, `charge`, `refund`, `grant`) are append-only.
- `tokenService.js` is the canonical interface.

## Implemented Endpoints
| Method | Path | Auth | Notes |
|---|---|---|---|
| GET  | `/api/v1/tokens/balance` | Requester | Balance + held + available credits |
| GET  | `/api/v1/tokens/ledger` | Requester | Own ledger history (append-only) |
| POST | `/api/v1/admin/tokens/grant` | Admin | Grant tokens with reason |

## Files
- `tokens.router.js`
- `tokens.controller.js`
- `tokens.schema.js`
- `../../services/tokenService.js`
