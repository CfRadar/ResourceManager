import { CheckCircle2, XCircle, AlertCircle, ArrowRight, ShieldCheck, Sparkles } from 'lucide-react';
import type { EligibilityCheck } from '../../api/resources.api';
import { useToast } from '../../context/ToastContext';

interface EligibilityChecklistProps {
  checks: EligibilityCheck[];
  eligible?: boolean;
  canRequest?: boolean;
  isLoading?: boolean;
}

export function EligibilityChecklist({
  checks,
  eligible = false,
  canRequest = false,
  isLoading = false,
}: EligibilityChecklistProps) {
  const { showToast } = useToast();

  const handleAction = (action?: { type: string; label?: string; url?: string }) => {
    if (!action) return;
    if (action.type === 'BOOK_TRAINING') {
      showToast({
        type: 'info',
        title: 'Training Module Registered',
        message: 'Your training enrollment has been recorded. Complete the 20-minute safety video before check-in.',
      });
    } else {
      showToast({
        type: 'info',
        title: 'Prerequisite Action',
        message: action.label || 'Action recorded.',
      });
    }
  };

  return (
    <div className="bg-slate-50 border border-slate-200 rounded-3xl p-5 sm:p-6 space-y-4">
      {/* Header & Overall Status */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 pb-3.5">
        <div>
          <div className="flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-blue-600" />
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800">
              Deterministic Eligibility Verification
            </h4>
          </div>
          <p className="text-[11px] text-slate-500 mt-0.5">
            Real-time evaluation against 6 safety, compliance, and governance criteria
          </p>
        </div>

        <div>
          {isLoading ? (
            <span className="text-xs text-slate-400 font-semibold animate-pulse">
              Evaluating criteria...
            </span>
          ) : eligible ? (
            <span className="inline-flex items-center gap-1 text-xs text-emerald-800 font-bold bg-emerald-100 border border-emerald-200 px-3 py-1 rounded-full">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              <span>Fully Eligible to Book</span>
            </span>
          ) : canRequest ? (
            <span className="inline-flex items-center gap-1 text-xs text-amber-800 font-bold bg-amber-100 border border-amber-200 px-3 py-1 rounded-full">
              <Sparkles className="w-3.5 h-3.5 text-amber-600" />
              <span>Eligible (Prerequisites Pending)</span>
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 text-xs text-rose-800 font-bold bg-rose-100 border border-rose-200 px-3 py-1 rounded-full">
              <XCircle className="w-3.5 h-3.5 text-rose-600" />
              <span>Action Required Before Booking</span>
            </span>
          )}
        </div>
      </div>

      {/* 6 Deterministic Checks List */}
      <div className="divide-y divide-slate-200/80">
        {checks.map((check) => {
          const isPass = check.status === 'PASS';
          const isFail = check.status === 'FAIL';
          const isMissing = check.status === 'MISSING';

          return (
            <div key={check.key} className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-start gap-2.5">
                <div className="mt-0.5 shrink-0">
                  {isPass && <CheckCircle2 className="w-4 h-4 text-emerald-600" />}
                  {isFail && <XCircle className="w-4 h-4 text-rose-600" />}
                  {isMissing && <AlertCircle className="w-4 h-4 text-amber-600" />}
                </div>
                <div>
                  <span className="text-xs font-semibold text-slate-800 block">
                    {check.label}
                  </span>
                  {check.reason && (
                    <span className="text-[11px] text-slate-500 block mt-0.5">
                      {check.reason}
                    </span>
                  )}
                </div>
              </div>

              <div className="sm:self-center shrink-0 ml-6 sm:ml-0">
                {isPass ? (
                  <span className="text-[11px] text-emerald-700 font-bold bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-md">
                    Satisfied
                  </span>
                ) : check.action ? (
                  <button
                    type="button"
                    onClick={() => handleAction(check.action)}
                    className="text-[11px] font-bold text-blue-600 hover:text-blue-800 hover:underline flex items-center gap-1 transition-colors"
                  >
                    <span>
                      {check.action.type === 'BOOK_TRAINING' ? 'Book Training Module' : 'Complete Prerequisite'}
                    </span>
                    <ArrowRight className="w-3 h-3" />
                  </button>
                ) : isFail ? (
                  <span className="text-[11px] text-rose-700 font-bold bg-rose-50 border border-rose-200 px-2.5 py-0.5 rounded-md">
                    Ineligible
                  </span>
                ) : (
                  <span className="text-[11px] text-amber-700 font-bold bg-amber-50 border border-amber-200 px-2.5 py-0.5 rounded-md">
                    Pending
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

