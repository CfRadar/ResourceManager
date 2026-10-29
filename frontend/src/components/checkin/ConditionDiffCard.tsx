import React from 'react';
import { AlertTriangle, CheckCircle2, ShieldAlert } from 'lucide-react';
import { StarRating } from './StarRating';
import type { StoredConditionReport } from '../../api/checkin.api';

interface ConditionDiffCardProps {
  beforeReport: StoredConditionReport;
  currentRating: number;
  currentNotes: string;
  selectedAccessories: string[];
  baselineAccessories: string[];
  onOpenIncidentModal?: () => void;
}

export const ConditionDiffCard: React.FC<ConditionDiffCardProps> = ({
  beforeReport,
  currentRating,
  currentNotes,
  selectedAccessories,
  baselineAccessories,
  onOpenIncidentModal,
}) => {
  const ratingDelta = currentRating - beforeReport.rating;
  const isRatingDegraded = ratingDelta < 0;

  const missingAccessories = baselineAccessories.filter(
    (item) => !selectedAccessories.includes(item)
  );
  const hasMissingAccessories = missingAccessories.length > 0;

  const hasIssues = isRatingDegraded || hasMissingAccessories;

  return (
    <div className="space-y-4">
      {/* Side-by-Side Comparison Container */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* BEFORE (Check-in Baseline) */}
        <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-3">
          <div className="flex items-center justify-between border-b border-slate-200/80 pb-2">
            <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
              Check-In Baseline (Before)
            </span>
            <span className="text-[10px] font-semibold text-slate-400">
              {new Date(beforeReport.createdAt).toLocaleTimeString('en-US', {
                hour: '2-digit',
                minute: '2-digit',
                timeZone: 'UTC',
              })}{' '}
              UTC
            </span>
          </div>

          <StarRating rating={beforeReport.rating} readOnly size="sm" />

          {beforeReport.notes && (
            <p className="text-xs text-slate-600 bg-white p-2.5 rounded-xl border border-slate-200/60 italic leading-relaxed">
              "{beforeReport.notes}"
            </p>
          )}

          <div className="pt-2 border-t border-slate-200/60">
            <span className="text-[11px] font-bold text-slate-600 block mb-1">
              Verified Items at Arrival:
            </span>
            <div className="flex flex-wrap gap-1.5">
              {(beforeReport.accessoriesConfirmed || baselineAccessories).map((item) => (
                <span
                  key={item}
                  className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 flex items-center gap-1"
                >
                  <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                  {item}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* AFTER (Current Return State) */}
        <div className="p-4 bg-white border border-slate-200 rounded-2xl space-y-3 shadow-2xs">
          <div className="flex items-center justify-between border-b border-slate-200 pb-2">
            <span className="text-xs font-bold text-blue-900 uppercase tracking-wider">
              Return State (After Run)
            </span>
            <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">
              Live Preview
            </span>
          </div>

          <StarRating rating={currentRating} readOnly size="sm" />

          {currentNotes ? (
            <p className="text-xs text-slate-700 bg-slate-50 p-2.5 rounded-xl border border-slate-200 italic leading-relaxed">
              "{currentNotes}"
            </p>
          ) : (
            <p className="text-xs text-slate-400 italic">No return notes entered yet.</p>
          )}

          <div className="pt-2 border-t border-slate-200">
            <span className="text-[11px] font-bold text-slate-600 block mb-1">
              Items Returned Today:
            </span>
            <div className="flex flex-wrap gap-1.5">
              {baselineAccessories.map((item) => {
                const isPresent = selectedAccessories.includes(item);
                return (
                  <span
                    key={item}
                    className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border flex items-center gap-1 ${
                      isPresent
                        ? 'bg-blue-50 text-blue-800 border-blue-200'
                        : 'bg-red-50 text-red-800 border-red-200'
                    }`}
                  >
                    {isPresent ? (
                      <CheckCircle2 className="w-3 h-3 text-blue-600" />
                    ) : (
                      <AlertTriangle className="w-3 h-3 text-red-600" />
                    )}
                    {item}
                  </span>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Degradation / Missing Accessories Alert Banner (Spec §5.11) */}
      {hasIssues && (
        <div className="p-4 bg-amber-50 border-2 border-amber-300 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-2xs">
          <div className="flex items-start gap-3 text-amber-950">
            <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-amber-900">
                Condition Discrepancy Detected
              </h4>
              <p className="text-xs text-amber-800 mt-0.5 leading-relaxed">
                {isRatingDegraded && (
                  <span>
                    Condition score decreased by {Math.abs(ratingDelta)} star(s).{' '}
                  </span>
                )}
                {hasMissingAccessories && (
                  <span>
                    Missing items: <strong>{missingAccessories.join(', ')}</strong>.
                  </span>
                )}
              </p>
            </div>
          </div>

          {onOpenIncidentModal && (
            <button
              type="button"
              onClick={onOpenIncidentModal}
              className="px-3.5 py-1.5 text-xs font-bold bg-amber-600 hover:bg-amber-700 text-white rounded-xl transition-colors flex items-center gap-1.5 shadow-xs shrink-0"
            >
              <ShieldAlert className="w-3.5 h-3.5" />
              <span>Flag Incident Note</span>
            </button>
          )}
        </div>
      )}
    </div>
  );
};

