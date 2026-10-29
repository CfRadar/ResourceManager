import { useState } from 'react';
import { DollarSign, CheckCircle2, XCircle, Clock, ShieldCheck, AlertCircle } from 'lucide-react';
import { DemoTag } from '../feedback/DemoTag';
import type { ServiceQuote } from '../../api/coordination.api';

interface QuoteReviewCardProps {
  quote: ServiceQuote;
  onAccept: () => Promise<void>;
  onDecline: (reason?: string) => Promise<void>;
  disabled?: boolean;
}

export function QuoteReviewCard({ quote, onAccept, onDecline, disabled = false }: QuoteReviewCardProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showDeclineModal, setShowDeclineModal] = useState(false);
  const [declineReason, setDeclineReason] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleAccept = async () => {
    try {
      setIsSubmitting(true);
      setError(null);
      await onAccept();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to accept quote';
      setError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDecline = async () => {
    try {
      setIsSubmitting(true);
      setError(null);
      await onDecline(declineReason);
      setShowDeclineModal(false);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to decline quote';
      setError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h3 className="text-base font-black text-slate-900">Service Cost Quotation</h3>
            <DemoTag label="DEMO CURRENCY" />
          </div>
          <p className="text-xs text-slate-500">
            Formally calculated staff operation, facility maintenance, and consumable charges
          </p>
        </div>

        <div>
          {quote.status === 'ACCEPTED' && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              Quote Accepted
            </span>
          )}
          {quote.status === 'DECLINED' && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200">
              <XCircle className="w-3.5 h-3.5 text-rose-600" />
              Quote Declined
            </span>
          )}
          {quote.status === 'PENDING' && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200">
              <Clock className="w-3.5 h-3.5 text-amber-600" />
              Awaiting Your Decision
            </span>
          )}
        </div>
      </div>

      {error && (
        <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-center gap-2 text-xs text-rose-700">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Itemized Table */}
      <div className="overflow-hidden border border-slate-200 rounded-xl">
        <table className="min-w-full divide-y divide-slate-200 text-left text-xs">
          <thead className="bg-slate-50 font-bold text-slate-600 uppercase tracking-wider text-[11px]">
            <tr>
              <th scope="col" className="px-4 py-3">Description / Line Item</th>
              <th scope="col" className="px-4 py-3 text-right">Amount ({quote.currency || 'INR'})</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 bg-white font-medium text-slate-700">
            {quote.lineItems.map((item, idx) => (
              <tr key={idx} className="hover:bg-slate-50/60 transition-colors">
                <td className="px-4 py-3">{item.description}</td>
                <td className="px-4 py-3 text-right font-mono font-semibold">
                  {item.cost.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot className="bg-slate-50 font-black text-slate-900 border-t border-slate-200">
            <tr>
              <td className="px-4 py-3 uppercase tracking-wider text-[11px]">Total Estimated Quote</td>
              <td className="px-4 py-3 text-right font-mono text-sm text-indigo-700">
                {quote.totalCost.toLocaleString('en-IN', { minimumFractionDigits: 2 })} {quote.currency || 'INR'}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>

      {/* Technician Notes & Validity */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs text-slate-600 bg-slate-50 p-4 rounded-xl border border-slate-100">
        <div>
          <span className="font-bold text-slate-800 block mb-0.5">Technician Scope Notes:</span>
          <p className="text-slate-600 italic">{quote.notes || 'No special handling instructions indicated.'}</p>
        </div>
        <div>
          <span className="font-bold text-slate-800 block mb-0.5">Quote Validity:</span>
          <p className="flex items-center gap-1.5 text-slate-600">
            <Clock className="w-3.5 h-3.5 text-slate-400" />
            {quote.validUntil ? new Date(quote.validUntil).toLocaleDateString() : 'Valid for 14 days from issue'}
          </p>
        </div>
      </div>

      {/* Reciprocal Policy Notice */}
      <div className="flex items-start gap-2.5 text-[11px] text-slate-500 bg-indigo-50/60 p-3 rounded-xl border border-indigo-100">
        <ShieldCheck className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
        <p>
          Quotes are billed through the institution-to-institution reciprocal token exchange or research grant demo ledger. No credit card transaction will be requested.
        </p>
      </div>

      {/* Decision Buttons (Active when PENDING) */}
      {quote.status === 'PENDING' && (
        <div className="flex flex-col sm:flex-row items-center justify-end gap-3 pt-2">
          <button
            type="button"
            disabled={disabled || isSubmitting}
            onClick={() => setShowDeclineModal(true)}
            className="w-full sm:w-auto px-5 py-2.5 rounded-xl border border-rose-300 text-rose-700 hover:bg-rose-50 font-bold text-xs transition-colors disabled:opacity-50"
          >
            Decline Quote
          </button>
          <button
            type="button"
            disabled={disabled || isSubmitting}
            onClick={handleAccept}
            className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-sm transition-all hover:shadow disabled:opacity-50 flex items-center justify-center gap-1.5"
          >
            <DollarSign className="w-4 h-4" />
            {isSubmitting ? 'Accepting...' : 'Accept Quote & Authorize Service'}
          </button>
        </div>
      )}

      {/* Decline Reason Modal */}
      {showDeclineModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-200 space-y-4">
            <h4 className="text-sm font-black text-slate-900">Decline Service Quote</h4>
            <p className="text-xs text-slate-600">
              Declining this quote will cancel the current service schedule. Please indicate why you are declining:
            </p>
            <textarea
              value={declineReason}
              onChange={(e) => setDeclineReason(e.target.value)}
              placeholder="e.g. Budget constraints, project timeline change, or alternative facility identified..."
              rows={3}
              className="w-full text-xs p-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowDeclineModal(false)}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isSubmitting}
                onClick={handleDecline}
                className="px-4 py-2 text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white rounded-lg transition-colors disabled:opacity-50"
              >
                {isSubmitting ? 'Declining...' : 'Confirm Decline'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

