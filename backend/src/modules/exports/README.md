# Module: exports

Document, PDF, and Excel spreadsheet export generation (Spec §4.22, Step 09).

**Implemented in:** Step 09 — Incidents, Tokens, Payments & Exports

## Dependencies & Features
- `exceljs` for binary `.xlsx` workbook streams.
- `pdfkit` for formal `.pdf` dossier and receipt generation.
- Tamper-evident CSV export of SHA-256 chained audit logs.
- Every export logs an `EXPORT_GENERATED` audit event.

## Implemented Endpoints
| Method | Path | Auth | Notes |
|---|---|---|---|
| GET | `/api/v1/exports/bookings.xlsx` | Manager/Owner/Admin | Bookings status, user, hours, outcome spreadsheet |
| GET | `/api/v1/exports/usage-report.xlsx` | Admin | Institutional equipment utilization report |
| GET | `/api/v1/exports/audit.csv` | Admin | Tamper-evident audit trail log CSV |
| GET | `/api/v1/exports/incident-report/:id.pdf` | Manager/Owner/Admin | One-page incident dossier with evidence and rulings |
| GET | `/api/v1/exports/transaction/:requestId.pdf` | Parties | Formal transaction history receipt |

## Files
- `exports.router.js`
- `exports.controller.js`
- `exports.service.js`
- `exports.schema.js`
