# Step 10: Incidents, Admin Dashboards & Transaction History

This guide details incident reporting, manager dispute resolution with AI draft assistance, the immutable transaction history view (`/history/:type/:id`), and institutional admin controls.

---

## 1. Incident Reporting & Resolution (Sections 5.13 & 6.8)

### 1.1 Reporting an Incident (`/me/incidents/new`)
- Select related booking or service request.
- Select incident type: `DAMAGE`, `DELAY`, `SAFETY`, `CONFLICT`, `MISSING_ITEM`.
- Upload photos / evidence.
- Neutral banner: *"This report will be reviewed by facility managers. No penalty is automatically applied."*

### 1.2 Manager Incident Dossier (`/manage/incidents/:id`)
- Side-by-side condition report comparison (`BEFORE` vs `AFTER`).
- Shared timeline with right-of-reply from all parties.
- **`[Draft Summary with AI]` Button:**
  - Calls `/ai/incident-summary` and displays draft in editable modal.
  - Separates facts from records, unverified claims, and lists event sources.
- **`[Resolve Incident]` Dialog:**
  - Requires mandatory findings text and reason.
  - Optional recorded remedy (e.g. recommended token adjustment; not an automatic bank charge).

---

## 2. Universal Transaction History View (`/history/:type/:id`) (Section 9)

An immutable receipt page accessible to both requesters and managers:

```
+-------------------------------------------------------------------+
| Header: Booking #B-204 | Laser Cutter 60W | Status: CLOSED        |
| [Download Official PDF Receipt]                                   |
+-------------------------------------------------------------------+
| Timeline of Record:                                               |
|  - 2026-10-28 10:00: Request submitted by Alice (Student)         |
|  - 2026-10-28 10:15: Approved by Dr. Rao (Manager)                |
|  - 2026-10-28 14:02: Checked in with 5-star report & signature    |
|  - 2026-10-28 16:00: Returned with 5-star report & signature      |
|  - 2026-10-28 16:10: Return confirmed by Operator Mike           |
+-------------------------------------------------------------------+
| Footer: [AuditIntegrityBadge: "Cryptographic Hash Chain Verified"]|
+-------------------------------------------------------------------+
```

---

## 3. Institution Admin Controls (`/admin`) (Section 8)

| Screen | Functions |
|---|---|
| `/admin` | Institution-wide utilization metrics, member counts, hash-chain integrity badge. |
| `/admin/members` | Review pending membership applications; approve/suspend members. |
| `/admin/templates` | Create custom safety checklists and document templates. |
| `/admin/audit` | Filterable immutable audit trail, CSV export, and live integrity verification probe. |

---

## 4. Implementation Checklist

- [ ] Implement `IncidentReportPage.tsx` and `ManagerIncidentDossierPage.tsx`.
- [ ] Implement `TransactionHistoryPage.tsx` with PDF download button.
- [ ] Implement `AdminDashboardPage.tsx` with audit log filter table.
