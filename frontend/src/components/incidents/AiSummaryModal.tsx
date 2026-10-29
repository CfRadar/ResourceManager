import { useState, useEffect } from 'react';
import { Sparkles, X, Check, ShieldCheck, AlertCircle, FileText, Database, ArrowRight } from 'lucide-react';
import type { AiIncidentSummary } from '../../api/incidents.api';
import { DemoTag } from '../feedback/DemoTag';

interface AiSummaryModalProps {
  isOpen: boolean;
  onClose: () => void;
  summary: AiIncidentSummary | null;
  isLoading: boolean;
  onApplyDraft: (findings: string, remedyType?: string, tokenAdjustment?: number) => void;
}

export function AiSummaryModal({
  isOpen,
  onClose,
  summary,
  isLoading,
  onApplyDraft,
}: AiSummaryModalProps) {
  const [editableFindings, setEditableFindings] = useState('');
  const [remedyType, setRemedyType] = useState('TOKEN_ADJUSTMENT');
  const [tokenAdjustment, setTokenAdjustment] = useState<number>(0);

  useEffect(() => {
    if (summary) {
      setEditableFindings(summary.suggestedFindings || '');
      if (summary.recommendedRemedyType) setRemedyType(summary.recommendedRemedyType);
      if (summary.recommendedTokensAdjustment) setTokenAdjustment(summary.recommendedTokensAdjustment);
    }
  }, [summary]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-2xl w-full p-6 shadow-2xl border border-slate-200 space-y-6 my-8 animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-start justify-between border-b border-slate-100 pb-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-black uppercase tracking-wider text-purple-700 bg-purple-50 px-2 py-0.5 rounded-full border border-purple-200 flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5" /> AI Resolution Assistant
              </span>
              <DemoTag label="SPEC §6.8" />
            </div>
            <h3 className="text-base font-black text-slate-900">
              Impartial Incident Summary & Synthesis
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Automated synthesis distinguishing verified telemetry from subjective claims
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {isLoading ? (
          <div className="py-12 text-center space-y-3">
            <Sparkles className="w-8 h-8 text-purple-600 animate-spin mx-auto" />
            <p className="text-xs font-bold text-slate-700">Synthesizing session audit events, photos, and timelines...</p>
            <p className="text-[11px] text-slate-400">Verifying SHA-256 chain anchors and operator inspection ratings</p>
          </div>
        ) : !summary ? (
          <div className="py-8 text-center text-slate-500 text-xs">
            No synthesis available. Please try drafting again.
          </div>
        ) : (
          <div className="space-y-5">
            {/* 1. Recorded Facts from System Records */}
            <div className="p-4 bg-emerald-50/60 rounded-2xl border border-emerald-200/80 space-y-2">
              <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-900">
                <Database className="w-4 h-4 text-emerald-600" />
                <span>Recorded Facts (Cryptographically Verified System Events)</span>
              </div>
              <ul className="space-y-1 text-xs text-emerald-950">
                {summary.recordedFacts.map((fact, idx) => (
                  <li key={idx} className="flex items-start gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-1.5 shrink-0" />
                    <span>{fact}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* 2. Unverified Claims / Conflicting Assertions */}
            <div className="p-4 bg-amber-50/60 rounded-2xl border border-amber-200/80 space-y-2">
              <div className="flex items-center gap-1.5 text-xs font-bold text-amber-900">
                <AlertCircle className="w-4 h-4 text-amber-600" />
                <span>Unverified Statements / Subjective Claims</span>
              </div>
              <ul className="space-y-1 text-xs text-amber-950">
                {summary.unverifiedClaims.map((claim, idx) => (
                  <li key={idx} className="flex items-start gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500 mt-1.5 shrink-0" />
                    <span>{claim}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* 3. Event Sources Log */}
            {summary.eventSources && summary.eventSources.length > 0 && (
              <div className="space-y-1.5">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                  Referenced Event Sources
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] font-mono text-slate-600">
                  {summary.eventSources.map((src, idx) => (
                    <div key={idx} className="p-2 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between">
                      <span className="font-semibold truncate">{src.event}</span>
                      <span className="text-slate-400 text-[10px] shrink-0 ml-1">{src.source}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 4. Editable Suggested Findings */}
            <div className="space-y-2 pt-2 border-t border-slate-100">
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-1.5 text-xs font-bold text-slate-800">
                  <FileText className="w-4 h-4 text-indigo-600" />
                  Synthesized Manager Ruling Text (Editable)
                </label>
                <span className="text-[10px] font-bold text-slate-400">Review and modify before applying</span>
              </div>
              <textarea
                rows={4}
                value={editableFindings}
                onChange={(e) => setEditableFindings(e.target.value)}
                className="w-full text-xs p-3.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-normal leading-relaxed"
              />
            </div>

            {/* 5. Recommended Remedy Adjustment */}
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div>
                <span className="text-xs font-bold text-slate-800 block">Recommended Non-Monetary Remedy</span>
                <p className="text-[11px] text-slate-500">
                  Fair-use quota adjustment. Spec §6.8 forbids punitive bank debit card charges.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-600">Tokens:</span>
                <input
                  type="number"
                  value={tokenAdjustment}
                  onChange={(e) => setTokenAdjustment(Number(e.target.value))}
                  className="w-20 text-xs p-2 rounded-lg border border-slate-200 font-mono text-right font-bold"
                />
              </div>
            </div>

            {/* Legal / Policy Disclaimer */}
            <div className="flex items-center gap-2 text-[11px] text-slate-500">
              <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>AI summaries serve as advisory scaffolding. Final responsibility rests with the facility manager.</span>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
              >
                Discard
              </button>
              <button
                type="button"
                onClick={() => {
                  onApplyDraft(editableFindings, remedyType, tokenAdjustment);
                  onClose();
                }}
                className="px-5 py-2.5 rounded-xl bg-purple-700 hover:bg-purple-800 text-white font-bold text-xs shadow-sm transition-all flex items-center gap-1.5"
              >
                <Check className="w-4 h-4" />
                Apply to Resolution Desk
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

