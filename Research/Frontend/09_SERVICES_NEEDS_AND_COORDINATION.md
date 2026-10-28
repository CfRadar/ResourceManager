# Step 09: Staff-Operated Services & Network Coordination

This guide details staff-operated service tracking (`/me/services/:id`), the structured missing-resource form (`/need`), and the network coordinator desk (`/coordinate`).

---

## 1. Staff-Operated Service Tracking (`/me/services/:id`) (Section 5.12)

Horizontal interactive milestone stepper:
`Submitted` ➔ `Scope Reviewed` ➔ `Quote Sent` ➔ `Quote Accepted` ➔ `Materials Received` ➔ `In Progress` ➔ `Output Delivered` ➔ `Completed`

### 1.1 Key Actions
- **Quote Review Card:** Displays itemized line items with a **`Demo currency`** badge and buttons: `[Accept Quote]` or `[Decline Quote]`.
- **Intake Confirmation:** Displays sample intake photo taken by lab technician.
- **Output Files:** Download button for authenticated result files.
- **Completion Confirmation:** Button `[Confirm Completion]` or `[Dispute Result]` (opens incident draft).

---

## 2. Missing-Resource Request Form (`/need`) (Section 5.6)

```
+---------------------------------------------------------------+
| "Tell us what you need"                                       |
| [ Describe need in plain English... ] [Auto-fill with AI]     |
|---------------------------------------------------------------|
| Capability or Result Needed: [Textarea]                       |
| Technical Specs:             [Input / Tags]                   |
| Travel Radius Preference:    [Slider: 10 km - 250 km]         |
| Timeframe / Deadlines:       [Date range picker]              |
| [ ] Staff-operated service is acceptable                      |
| [ ] Allow my contact details to be shared with receiving      |
|     institution *only if they accept the referral*            |
| [Submit Need Request]                                         |
+---------------------------------------------------------------+
```

---

## 3. Network Coordinator Desk (`/coordinate`) (Section 7)

### 3.1 Need Request Review (`/coordinate/needs/:id`)
- Left: Researcher's submitted need and privacy settings.
- Right: Ranked candidate facilities from the AI / keyword matching engine.
- **Referral Composer:**
  - Select receiving partner institution.
  - Review message preview.
  - Contact sharing toggle: **Locked to OFF** unless user opted in.
  - Submitting sends referral to partner inbox.

### 3.2 Referral Inbox (`/coordinate/referrals`)
- Receiving institution staff view incoming referrals.
- Buttons: `[Accept with Next Steps]` or `[Decline with Reason]`.
- *The system never marks a referral accepted on its own.*

---

## 4. Implementation Checklist

- [ ] Implement `ServiceTrackingPage.tsx` with milestone stepper.
- [ ] Build `MissingResourceNeedPage.tsx` with AI auto-fill button.
- [ ] Implement `CoordinatorDeskPage.tsx` with referral composer.
