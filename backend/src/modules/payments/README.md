# Module: payments

Simulated billing and invoicing (Spec §4.18, Step 09).

**Implemented in:** Step 09 — Incidents, Tokens, Payments & Exports

> ⚠ All payments are SIMULATED (demo). No real money is moved.
> All payment-related responses must include `"demo": true`.

## Implemented Endpoints
| Method | Path | Auth | Notes |
|---|---|---|---|
| GET  | `/api/v1/bookings/:id/cost-estimate` | Requester/Manager | Cost breakdown; QUOTE model shows "Quotation required" |
| POST | `/api/v1/bookings/:id/invoice` | Manager | Generate demo invoice (`demo: true`) |
| POST | `/api/v1/invoices/:id/mark-paid` | Manager | Mark paid (simulated notice returned) |

## Files
- `payments.router.js`
- `payments.controller.js`
- `payments.service.js`
- `payments.schema.js`
