import { Sparkles, Building2, MapPin, Send, CheckCircle2 } from 'lucide-react';
import type { NeedCandidate } from '../../api/coordination.api';

interface CandidateMatchCardProps {
  candidate: NeedCandidate;
  onProposeReferral: (candidate: NeedCandidate) => void;
  isReferred?: boolean;
}

export function CandidateMatchCard({ candidate, onProposeReferral, isReferred = false }: CandidateMatchCardProps) {
  // Normalize matchScore to 0-100 percentage
  const scorePercent = Math.round(
    candidate.matchScore > 1 ? candidate.matchScore : candidate.matchScore * 100
  );

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-5 hover:border-indigo-300 transition-all hover:shadow-md space-y-4">
      {/* Top Header: Resource & Match Score */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h4 className="text-sm font-bold text-slate-900 line-clamp-1">{candidate.resourceName}</h4>
            <span
              className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-black tracking-wide ${
                scorePercent >= 85
                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                  : scorePercent >= 65
                  ? 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                  : 'bg-amber-50 text-amber-700 border border-amber-200'
              }`}
            >
              <Sparkles className="w-3 h-3" />
              {scorePercent}% Match
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500">
            <span className="flex items-center gap-1 font-medium text-slate-700">
              <Building2 className="w-3.5 h-3.5 text-slate-400" />
              {candidate.institutionName}
            </span>
            {candidate.facilityName && (
              <span className="text-slate-400">• {candidate.facilityName}</span>
            )}
            {candidate.estimatedDistanceKm !== undefined && (
              <span className="flex items-center gap-0.5 text-slate-500">
                <MapPin className="w-3 h-3 text-slate-400" />
                ~{candidate.estimatedDistanceKm} km away
              </span>
            )}
          </div>
        </div>

        {/* Action Button */}
        <div>
          {isReferred ? (
            <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-slate-100 text-slate-500 font-bold text-xs border border-slate-200 select-none">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              Referral Sent
            </span>
          ) : (
            <button
              type="button"
              onClick={() => onProposeReferral(candidate)}
              className="px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-xs hover:shadow transition-all flex items-center gap-1.5"
            >
              <Send className="w-3.5 h-3.5" />
              Propose Referral
            </button>
          )}
        </div>
      </div>

      {/* Match Reasons Badges */}
      {candidate.matchReasons && candidate.matchReasons.length > 0 && (
        <div className="space-y-1.5">
          <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">AI Alignment Analysis</p>
          <div className="flex flex-wrap gap-1.5">
            {candidate.matchReasons.map((reason, idx) => (
              <span
                key={idx}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] bg-slate-50 text-slate-700 border border-slate-200 font-medium"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
                {reason}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Footer Info: Access modes, available capacity & demo rate */}
      <div className="flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-slate-100 text-[11px] text-slate-500">
        <div className="flex items-center gap-1.5">
          <span className="font-semibold text-slate-600">Access:</span>
          {candidate.accessModes?.map((mode) => (
            <span
              key={mode}
              className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-mono font-medium"
            >
              {mode}
            </span>
          )) || <span className="text-slate-400">Standard</span>}
        </div>

        <div className="flex items-center gap-3">
          {candidate.availableSlotCount !== undefined && (
            <span className="text-slate-600">
              <strong className="text-slate-900">{candidate.availableSlotCount}</strong> upcoming slots
            </span>
          )}
          {candidate.pricingRate !== undefined && (
            <span className="text-indigo-600 font-mono font-semibold">
              {candidate.pricingRate} {candidate.currency || 'Tokens'}/hr
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

