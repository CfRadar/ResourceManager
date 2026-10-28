# Module: documents

Document templates, submission, review, and secure file streaming (Spec §4.15).

**Implemented in:** Step 05 (eligibility) / Step 09 (documents + file handling)

## Document record state machine
`REQUIRED → SUBMITTED → APPROVED | REJECTED` and `APPROVED → EXPIRED` (automatic when expiresAt passes).

## Planned endpoints
| Method | Path | Auth | Notes |
|---|---|---|---|
| GET  | `/api/v1/document-templates` | Authed | List templates |
| POST | `/api/v1/document-templates` | Admin/Owner | Create template |
| GET  | `/api/v1/requests/:requestId/documents` | Requester/Manager | Checklist |
| POST | `/api/v1/documents/:docRecordId/submit` | Requester | Upload/sign |
| POST | `/api/v1/documents/:docRecordId/review` | Manager/Owner | Approve/reject; not self-reviewable |
| GET  | `/api/v1/documents/:docRecordId/file` | Requester/Manager | Streamed; every read is audited |

## Files (to be created)
- `documents.router.js`
- `documents.controller.js`
- `documents.service.js`
- `documents.schema.js`
