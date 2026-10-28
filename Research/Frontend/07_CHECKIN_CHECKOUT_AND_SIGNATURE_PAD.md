# Step 07: Check-In, Check-Out & Digital Signature Pad

This guide details physical check-in/out workflows, 5-star condition reporting, canvas signature capture, and geofence verification.

---

## 1. Check-In Wizard (`/me/bookings/:id/check-in`) (Section 5.10)

```
[Step 1: Confirm Identity & Equipment] ──> [Step 2: Initial Condition Report]
                                                    │
[Confirmation & "In-Use" Status] <── [Step 4: Location & Sign] <── [Step 3: Accessories Checklist]
```

### 1.1 Step 2 — Initial Condition Report
- **Condition Rating:** 1 to 5 Stars (Clean / Minor wear / Defect present).
- **Notes Field:** Mandatory if rating <= 3.
- **Photo Upload:** Upload photos of equipment surface/mirrors.

### 1.2 Step 3 — Accessories Checklist
Checkboxes for items present (e.g. `[x] Safety Goggles`, `[x] Tool Kit`, `[x] Power Cord`).

### 1.3 Step 4 — Rules Acknowledgment & SignaturePad
- **GPS Verification (Soft signal):** Prompts for geolocation. If denied or skipped, marks `geoStatus = 'NOT_PROVIDED'`. Never blocks the user.
- **`SignaturePad`:** Allows user to draw on a HTML5 canvas or type their name:
  > *"Acknowledged electronically (demo). This records your verification of initial equipment condition."*

---

## 2. The `SignaturePad` Component (`components/form/SignaturePad.tsx`)

```tsx
import { useRef, useState } from 'react';

export function SignaturePad({ onSave }: { onSave: (sig: { type: 'DRAWN' | 'TYPED'; data: string }) => void }) {
  const [tab, setTab] = useState<'DRAW' | 'TYPE'>('DRAW');
  const [typedName, setTypedName] = useState('');
  const canvasRef = useRef<HTMLCanvasElement>(null);

  return (
    <div className="border border-slate-300 rounded-xl p-4 bg-white">
      <div className="flex gap-4 border-b border-slate-200 pb-2 mb-3 text-xs font-semibold">
        <button onClick={() => setTab('DRAW')} className={tab === 'DRAW' ? 'text-blue-600' : 'text-slate-500'}>
          Draw Signature
        </button>
        <button onClick={() => setTab('TYPE')} className={tab === 'TYPE' ? 'text-blue-600' : 'text-slate-500'}>
          Type Name
        </button>
      </div>

      {tab === 'DRAW' ? (
        <canvas ref={canvasRef} width={400} height={120} className="border border-dashed border-slate-300 rounded-lg w-full bg-slate-50" />
      ) : (
        <input
          type="text"
          value={typedName}
          onChange={(e) => setTypedName(e.target.value)}
          placeholder="Type your full legal name"
          className="w-full text-lg font-serif italic border border-slate-300 rounded-lg p-3"
        />
      )}
      <p className="text-[11px] text-slate-400 mt-2">Acknowledged electronically (demo record).</p>
    </div>
  );
}
```

---

## 3. Check-Out / Return Page (`/me/bookings/:id/check-out`) (Section 5.11)

- **Split View:** Left side displays the check-in report (`BEFORE`); right side displays the checkout form (`AFTER`).
- **Diff Alert:** If rating dropped or accessories are missing, alerts the user and prompts:
  > *"Would you like to report an incident or damage note for the manager?"*

---

## 4. Implementation Checklist

- [ ] Implement `CheckInPage.tsx` and `CheckOutPage.tsx`.
- [ ] Build `SignaturePad.tsx` with canvas touch and mouse listeners.
- [ ] Integrate HTML5 Geolocation API with graceful denial fallback.
