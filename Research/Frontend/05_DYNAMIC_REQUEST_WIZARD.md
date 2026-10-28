# Step 05: Dynamic Policy-Driven Access Request Wizard

This guide details the 5-step access request wizard (`/resources/:id/request`), interactive slot picker, fair-use meter, and conflict handling.

---

## 1. Wizard Steps Architecture (Section 5.4)

The wizard steps adapt dynamically according to the active resource policy:

```
[Step 1: Access Mode] ──> [Step 2: Pick Time] ──> [Step 3: Purpose & Materials]
                                                           │
[Confirmation] <── [Step 5: Review & Submit] <── [Step 4: Requirements Checklist]
```

### 1.1 Step 1 — Choose Access Mode
- Options: `Independent`, `Supervised`, or `Collaboration` (only modes enabled in policy are selectable).

### 1.2 Step 2 — Pick Time Slot (`SlotPicker.tsx`)
- Fetches bookable slots from `GET /api/v1/resources/:id/slots?date=...&durationMin=...`.
- Displays morning, afternoon, and evening chips.
- Selecting a slot instantly checks for collision:
  - If busy: Displays *"Selected slot is occupied"* and highlights 3 alternative available slots.

### 1.3 Step 3 — Purpose & Outside Materials
- Textarea for research project description (required if `policy.requiresPurposeStatement = true`).
- Outside materials checklist: User declares materials; if policy is `NEEDS_APPROVAL`, notifies user that manager review is required.

### 1.4 Step 4 — Requirements Checklist
- Inline document signer (`SignaturePad`) and safety acknowledgment checkboxes.
- If training is missing, displays clear prompt to book or submit training certificate.

### 1.5 Step 5 — Review & Fair-Use Meter
- Summary of date/time, total cost (or token deduction).
- **Fair-Use Meter:**
  > *"After this booking, you will have used 6 of your 8 permitted hours this week."*
- Prominent notice:
  > *"Submitting this request does not reserve the slot. A manager will review your request."*

---

## 2. Collision & Conflict Recovery State

If the slot was taken while filling out the form (`409 BOOKING_CONFLICT` on submit):
- Wizard does **not** erase user input.
- Displays inline alert: *"This slot was just booked by another user."*
- Offers 3 alternative slot buttons:
  `[Tomorrow 14:00 - 16:00]` `[Thursday 10:00 - 12:00]`
- Clicking an alternative slot immediately updates `startAt`/`endAt` and enables re-submission.

---

## 3. Implementation Checklist

- [ ] Implement `RequestWizard.tsx` with persistent draft state in `sessionStorage`.
- [ ] Build interactive `SlotPicker.tsx` component.
- [ ] Implement `FairUseMeter.tsx` displaying weekly quota usage.
