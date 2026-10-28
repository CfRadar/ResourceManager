# Step 01: Design System, Tokens & Shared Component Primitives

This guide establishes the visual design tokens, typography, accessibility standards (WCAG AA), and the shared component primitives defined in Section 3 of the specification.

---

## 1. Visual Style & Color Tokens (Section 12)

The UI uses a trustworthy, modern palette with semantic status colors. Color is **never the sole indicator of state**; every status badge pairs color with an explicit icon and text label.

```css
:root {
  /* Primary & Slate Brand */
  --primary-50: #eff6ff;
  --primary-600: #2563eb;
  --primary-700: #1d4ed8;

  /* Semantic Statuses */
  --status-approved: #16a34a;  /* Green - CheckCircle */
  --status-pending: #d97706;   /* Amber - Clock */
  --status-rejected: #dc2626;  /* Red - AlertCircle */
  --status-in-use: #0284c7;    /* Sky Blue - Activity */
  --status-closed: #64748b;    /* Slate - CheckCheck */
}
```

---

## 2. Shared Component Primitives (Section 3)

### 2.1 `StatusBadge` Component (`components/feedback/StatusBadge.tsx`)
Displays request, booking, or incident state with icon + color + accessible label:

```tsx
import { CheckCircle2, Clock, XCircle, AlertTriangle, PlayCircle, Archive } from 'lucide-react';

export type EntityStatus = 
  | 'DRAFT' | 'SUBMITTED' | 'UNDER_REVIEW' | 'APPROVED' 
  | 'SCHEDULED' | 'CHECKED_IN' | 'IN_USE' | 'RETURNED' 
  | 'CLOSED' | 'REJECTED' | 'WAITLISTED' | 'MORE_INFO_REQUIRED';

const statusConfig: Record<EntityStatus, { label: string; bg: string; text: string; icon: any }> = {
  APPROVED: { label: 'Approved', bg: 'bg-green-50', text: 'text-green-700', icon: CheckCircle2 },
  SCHEDULED: { label: 'Scheduled', bg: 'bg-emerald-50', text: 'text-emerald-700', icon: Clock },
  SUBMITTED: { label: 'Submitted', bg: 'bg-blue-50', text: 'text-blue-700', icon: Clock },
  UNDER_REVIEW: { label: 'Under Review', bg: 'bg-amber-50', text: 'text-amber-700', icon: Clock },
  IN_USE: { label: 'In Use', bg: 'bg-sky-50', text: 'text-sky-700', icon: PlayCircle },
  REJECTED: { label: 'Rejected', bg: 'bg-red-50', text: 'text-red-700', icon: XCircle },
  WAITLISTED: { label: 'Waitlisted', bg: 'bg-purple-50', text: 'text-purple-700', icon: AlertTriangle },
  CLOSED: { label: 'Closed', bg: 'bg-slate-100', text: 'text-slate-600', icon: Archive },
  // Additional states...
};

export function StatusBadge({ status }: { status: EntityStatus }) {
  const config = statusConfig[status] || statusConfig.CLOSED;
  const Icon = config.icon;
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${config.bg} ${config.text}`}>
      <Icon className="w-3.5 h-3.5 shrink-0" />
      {config.label}
    </span>
  );
}
```

### 2.2 `ReasonDialog` (`components/feedback/ReasonDialog.tsx`)
Mandatory dialog for any reviewer or manager action (Approve, Reject, Waitlist, Incident Ruling):

```tsx
export function ReasonDialog({
  isOpen,
  title,
  actionLabel,
  actionVariant = 'primary',
  onConfirm,
  onClose
}: {
  isOpen: boolean;
  title: string;
  actionLabel: string;
  actionVariant?: 'primary' | 'danger' | 'warning';
  onConfirm: (reason: string, conditions?: string) => void;
  onClose: () => void;
}) {
  const [reason, setReason] = useState('');
  const [conditions, setConditions] = useState('');

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-xl max-w-lg w-full p-6 shadow-xl">
        <h3 className="text-lg font-bold text-slate-900 mb-2">{title}</h3>
        <p className="text-sm text-slate-500 mb-4">
          A clear, documented reason is required. This will be visible to the user and recorded in the immutable audit trail.
        </p>
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Reason / Justification <span className="text-red-500">*</span>
            </label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Provide clear rationale for this decision..."
              rows={3}
              className="w-full text-sm border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Optional Conditions or Instructions
            </label>
            <input
              type="text"
              value={conditions}
              onChange={(e) => setConditions(e.target.value)}
              placeholder="e.g. Bring own safety glasses, complete check-in with lab assistant"
              className="w-full text-sm border border-slate-300 rounded-lg p-2.5"
            />
          </div>
        </div>
        <div className="flex justify-end gap-3 mt-6">
          <button onClick={onClose} className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg">
            Cancel
          </button>
          <button
            disabled={!reason.trim()}
            onClick={() => onConfirm(reason, conditions)}
            className="px-4 py-2 text-sm font-semibold text-white bg-blue-600 disabled:opacity-50 hover:bg-blue-700 rounded-lg"
          >
            {actionLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
```

### 2.3 Transparent Badges (`DemoTag`, `AiSuggestionBadge`, `AuditIntegrityBadge`)
- **`DemoTag`**: `<span className="bg-amber-100 text-amber-800 text-[10px] font-bold px-2 py-0.5 rounded">DEMO</span>`
- **`AiSuggestionBadge`**: Displays *"AI suggestion"* or *"Keyword fallback"* with a popover showing the exact matched fields.
- **`AuditIntegrityBadge`**: Displays a green badge with a shield icon *"History verified"* or red warning *"Integrity check failed"*.

---

## 3. Implementation Checklist

- [ ] Build `StatusBadge`, `StatusTimeline`, and `ReasonDialog`.
- [ ] Implement `DemoBanner` at the top of the root layout: *"All institutions, users, resources, and simulated transactions are demonstration data."*
- [ ] Verify color contrast ratios meet WCAG AA (>= 4.5:1).
