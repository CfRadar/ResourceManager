# Step 04: Resource Detail & Eligibility Verification

This guide details the comprehensive resource detail page (`/resources/:id`), tabbed view, policy summaries, locked confidential cards, and the live `EligibilityChecklist`.

---

## 1. Page Architecture (`/resources/:id`) (Section 5.3)

```
+-------------------------------------------------------------------------+
| Photo Gallery (Main + Thumbnails) | Name, Category, Risk Level Tag      |
|                                   | Facility, Institution, Cost Model   |
+-------------------------------------------------------------------------+
| Mode Selector: [Independent] [Supervised] [Staff Service] [Collab]      |
| (Unsupported modes appear greyed out with "Not offered")                |
+-------------------------------------------------------------------------+
| Tabs: [Overview] [Technical Specs] [Rules & Policy] [Calendar] [History]|
+-------------------------------------------------------------------------+
| Tab Content:                                                            |
|  - Overview: Description, safety requirements                           |
|  - Your Eligibility: Live EligibilityChecklist                          |
|  - Rules: PolicySummaryCard                                             |
|  - Availability: Interactive weekly schedule calendar                   |
|  - Confidential Instructions: (Locked Card: "Unlocks after booking")    |
+-------------------------------------------------------------------------+
| Sticky Bottom Bar: [Request Access] or [Request Service]                |
+-------------------------------------------------------------------------+
```

---

## 2. The `EligibilityChecklist` Component (`components/feedback/EligibilityChecklist.tsx`)

Calls `POST /api/v1/resources/:id/eligibility-check` with the user's selected access mode:

```tsx
export function EligibilityChecklist({ checks }: { checks: EligibilityCheck[] }) {
  return (
    <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
      <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
        Your Eligibility Status
      </h4>
      <div className="divide-y divide-slate-200">
        {checks.map((check) => (
          <div key={check.key} className="py-2.5 flex items-center justify-between text-sm">
            <div className="flex items-center gap-2.5">
              {check.status === 'PASS' && <CheckCircle2 className="w-4 h-4 text-green-600" />}
              {check.status === 'FAIL' && <XCircle className="w-4 h-4 text-red-600" />}
              {check.status === 'MISSING' && <AlertCircle className="w-4 h-4 text-amber-600" />}
              <span className="font-medium text-slate-800">{check.label}</span>
            </div>
            <div>
              {check.status === 'PASS' ? (
                <span className="text-xs text-green-700 font-semibold bg-green-100 px-2 py-0.5 rounded">Satisfied</span>
              ) : check.action ? (
                <button
                  onClick={() => handleAction(check.action)}
                  className="text-xs font-semibold text-blue-600 hover:text-blue-800 hover:underline"
                >
                  {check.action.type === 'BOOK_TRAINING' ? 'Book Training ->' : 'Sign Document ->'}
                </button>
              ) : (
                <span className="text-xs text-red-600 font-semibold">Not eligible</span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
```

---

## 3. Policy Summary Card (`PolicySummaryCard.tsx`)

Renders human-readable rules directly from the dynamic JSON policy:
- **Permitted Groups:** Students, Staff, Partner Institutions.
- **Fair-Use Limits:** Max 8 hours/week, up to 4 hours per single booking.
- **Cancellation Rule:** Free cancellation up to 12 hours prior to start.
- **Prohibited Uses:** Explicit list of forbidden materials or activities.

---

## 4. Implementation Checklist

- [ ] Implement `ResourceDetailPage.tsx` with photo carousel and tab switching.
- [ ] Connect `EligibilityChecklist` with API mutation.
- [ ] Implement locked confidential instructions card.
