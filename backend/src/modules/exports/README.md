# Module: exports

Document/spreadsheet export generation (Spec §4.22).

**Implemented in:** Step 09 — Incidents, Tokens, Payments & Exports

## Dependencies
- `exceljs` for XLSX generation.
- `pdfkit` or `puppeteer` for PDF.
- All exports obey the same scoping as the underlying data.
- Every export generates an audit event.

## Planned endpoints
| Method | Path | Auth | Notes |
|---|---|---|---|
| GET | `/api/v1/exports/bookings.xlsx` | Manager/Owner | Bookings with status, user, hours, outcome |
| GET | `/api/v1/exports/usage-report.xlsx` | Admin | Utilisation per resource + user group |
| GET | `/api/v1/exports/audit.csv` | Admin | Audit events export |
| GET | `/api/v1/exports/incident-report/:id.pdf` | Manager/Owner | Incident dossier |
| GET | `/api/v1/exports/transaction/:requestId.pdf` | Parties | Transaction history receipt |

## Files (to be created in Step 09)
- `exports.router.js`
- `exports.controller.js`
- `exports.service.js`
