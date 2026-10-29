import { useState } from 'react';
import { ShieldCheck, AlertCircle, X } from 'lucide-react';

interface ReasonDialogProps {
  isOpen: boolean;
  title: string;
  description?: string;
  actionLabel: string;
  actionVariant?: 'primary' | 'danger' | 'warning' | 'success';
  placeholder?: string;
  requireConditions?: boolean;
  onConfirm: (reason: string, conditions?: string) => void;
  onClose: () => void;
}

export function ReasonDialog({
  isOpen,
  title,
  description = 'A clear, documented reason is required. This justification will be visible to the user and recorded in the immutable audit trail.',
  actionLabel,
  actionVariant = 'primary',
  placeholder = 'Provide clear rationale for this decision...',
  requireConditions = false,
  onConfirm,
  onClose,
}: ReasonDialogProps) {
  const [reason, setReason] = useState('');
  const [conditions, setConditions] = useState('');

  if (!isOpen) return null;

  const handleConfirm = () => {
    if (!reason.trim()) return;
    onConfirm(reason.trim(), conditions.trim() || undefined);
    setReason('');
    setConditions('');
  };

  const buttonColors =
    actionVariant === 'danger'
      ? 'bg-red-600 hover:bg-red-700 text-white'
      : actionVariant === 'warning'
      ? 'bg-amber-600 hover:bg-amber-700 text-white'
      : actionVariant === 'success'
      ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
      : 'bg-blue-600 hover:bg-blue-700 text-white';

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="dialog-title"
    >
      <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200">
        <div className="flex items-start justify-between gap-3 mb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 border border-blue-100">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 id="dialog-title" className="text-base font-bold text-slate-900">
                {title}
              </h3>
              <p className="text-xs text-slate-500">Immutable Audit Entry</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
            aria-label="Close dialog"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <p className="text-xs text-slate-600 mb-4 bg-slate-50 border border-slate-200 rounded-xl p-3 leading-relaxed">
          {description}
        </p>

        <div className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Reason / Justification <span className="text-red-500">*</span>
            </label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder={placeholder}
              rows={3}
              className="w-full text-sm border border-slate-300 rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent placeholder:text-slate-400"
              autoFocus
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Conditions or Operational Instructions{' '}
              {requireConditions ? (
                <span className="text-red-500">*</span>
              ) : (
                <span className="text-slate-400 font-normal">(Optional)</span>
              )}
            </label>
            <input
              type="text"
              value={conditions}
              onChange={(e) => setConditions(e.target.value)}
              placeholder="e.g. Mandatory safety goggles; check in with lab assistant prior to start"
              className="w-full text-sm border border-slate-300 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent placeholder:text-slate-400"
            />
          </div>
        </div>

        <div className="flex items-center justify-between gap-3 mt-6 pt-4 border-t border-slate-100">
          <span className="text-xs text-slate-400 flex items-center gap-1">
            <AlertCircle className="w-3.5 h-3.5" />
            Signed with active credentials
          </span>
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 rounded-xl transition-colors"
            >
              Cancel
            </button>
            <button
              disabled={!reason.trim() || (requireConditions && !conditions.trim())}
              onClick={handleConfirm}
              className={`px-4 py-2 text-xs font-semibold rounded-xl shadow-xs transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${buttonColors}`}
            >
              {actionLabel}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
