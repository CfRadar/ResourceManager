# Module: payments

Simulated billing and invoicing (Spec §4.18).

**Implemented in:** Step 09 — Incidents, Tokens, Payments & Exports

> ⚠ All payments are SIMULATED (demo). No real money is moved.
> All payment-related responses must include `"demo": true`.

## Planned endpoints
| Method | Path | Auth | Notes |
|---|---|---|---|
| GET  | `/api/v1/bookings/:id/cost-estimate` | Requester/Manager | Cost breakdown; QUOTE model shows "Quotation required" |
| POST | `/api/v1/bookings/:id/invoice` | Manager | Generate demo invoice (`demo: true`) |
| POST | `/api/v1/invoices/:id/mark-paid` | Manager | Mark paid (simulated). UI shows disclaimer |

## Files (to be created in Step 09)
- `payments.router.js`
- `payments.controller.js`
- `payments.service.js`
- `payments.schema.js`
