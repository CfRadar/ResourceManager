import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  MapPin,
  ArrowRight,
  Info,
  Calendar,
  ShieldCheck,
  Coins,
  ChevronRight,
  Sparkles,
  AlertTriangle,
} from 'lucide-react';
import type { ResourceMatch, ResourceItem } from '../../api/discovery.api';
import { StatusBadge } from '../feedback/StatusBadge';
import { AiSuggestionBadge } from '../feedback/AiSuggestionBadge';

interface ResourceCardProps {
  match?: ResourceMatch;
  resource?: ResourceItem;
  defaultSource?: string;
}

export function ResourceCard({ match, resource, defaultSource = 'AI_EMBEDDING' }: ResourceCardProps) {
  const [showReasonDialog, setShowReasonDialog] = useState(false);

  // Unify resource object from either direct resource prop or match metadata
  const res: Partial<ResourceItem> = resource || match?.resource || {
    id: match?.resourceId,
    name: match?.name,
    category: match?.category || 'laboratory',
    status: 'ACTIVE',
  };

  const id = res.id || match?.resourceId || 'unknown';
  const name = res.name || match?.name || 'Research Equipment';
  const category = res.category || match?.category || 'General';
  const facilityName = res.facility_name || 'Central Facility';
  const facilityCity = res.facility_city || 'Cambridge';
  const capabilities = res.capabilities || [];
  const source = match?.source || defaultSource;
  const score = match?.score;
  const matchType = match?.matchType || 'AVAILABLE_LISTING';
  const reasons = match?.reasons || [];
  const caveats = match?.caveats || [];

  // Match type pill styling
  const matchBadgeConfig: Record<string, { label: string; bg: string; text: string; border: string }> = {
    AVAILABLE_LISTING: {
      label: 'Available Listing',
      bg: 'bg-emerald-50',
      text: 'text-emerald-700',
      border: 'border-emerald-200',
    },
    POTENTIAL_MATCH: {
      label: 'Potential Match (Verify)',
      bg: 'bg-amber-50',
      text: 'text-amber-700',
      border: 'border-amber-200',
    },
    INACTIVE: {
      label: 'Not Currently Available',
      bg: 'bg-slate-100',
      text: 'text-slate-600',
      border: 'border-slate-200',
    },
  };

  const currentBadge = matchBadgeConfig[matchType] || matchBadgeConfig.AVAILABLE_LISTING;
  const policy = res.policySummary;
  const tokenCost = policy?.tokensPerHour !== undefined ? policy.tokensPerHour : 2;

  return (
    <div className="bg-white border border-slate-200 hover:border-blue-300 hover:shadow-lg rounded-3xl p-6 transition-all flex flex-col justify-between group">
      <div>
        {/* Top Header Row: Match Type & Source */}
        <div className="flex items-center justify-between gap-2 mb-3">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span
              className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${currentBadge.bg} ${currentBadge.text} ${currentBadge.border}`}
            >
              {currentBadge.label}
            </span>
            {match && (
              <AiSuggestionBadge
                source={source}
                score={score}
                reasons={reasons}
                matchedFields={match.matchedFields}
              />
            )}
          </div>
          <StatusBadge status={res.status || 'ACTIVE'} size="sm" />
        </div>

        {/* Title & Category */}
        <div className="mb-2">
          <span className="text-[10px] font-bold tracking-wider uppercase text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md">
            {category}
          </span>
          <h3 className="font-bold text-slate-900 text-base mt-1.5 group-hover:text-blue-600 transition-colors line-clamp-2">
            {name}
          </h3>
        </div>

        {/* Location & Facility */}
        <p className="text-xs text-slate-500 flex items-center gap-1.5 mb-3.5">
          <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
          <span>{facilityName} • {facilityCity}</span>
        </p>

        {/* Capabilities Pills */}
        {capabilities.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-4">
            {capabilities.slice(0, 4).map((c, i) => (
              <span
                key={i}
                className="text-[10px] bg-slate-50 text-slate-600 border border-slate-200 px-2.5 py-0.5 rounded-md font-medium"
              >
                {c}
              </span>
            ))}
          </div>
        )}

        {/* Why this match? Reasoning trigger */}
        {reasons.length > 0 && (
          <div className="mb-4 bg-slate-50 border border-slate-200 rounded-2xl p-3 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-700 flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                Why this match?
              </span>
              <button
                type="button"
                onClick={() => setShowReasonDialog(true)}
                className="text-[11px] text-blue-600 hover:underline font-semibold flex items-center gap-0.5"
              >
                <span>View Details</span>
                <Info className="w-3 h-3" />
              </button>
            </div>
            <p className="text-slate-600 text-[11px] mt-1 line-clamp-1">
              {reasons[0]}
            </p>
          </div>
        )}

        {/* Key Indicators Row: Cost & Eligibility */}
        <div className="grid grid-cols-2 gap-2 pt-3 border-t border-slate-100 text-xs text-slate-600 mb-4">
          <div className="flex items-center gap-1.5">
            <Coins className="w-3.5 h-3.5 text-amber-500 shrink-0" />
            <span className="font-semibold text-slate-800">
              {tokenCost === 0 ? 'Free' : `${tokenCost} tokens/hr`}
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
            <span className="text-[11px] text-slate-700 font-medium truncate">
              Eligible to Request
            </span>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="pt-4 border-t border-slate-100 flex items-center justify-between gap-2">
        <Link
          to={`/resources/${id}`}
          className="text-xs font-semibold text-slate-600 hover:text-slate-900 flex items-center gap-1"
        >
          <span>Specifications</span>
          <ChevronRight className="w-3.5 h-3.5" />
        </Link>

        <Link
          to={`/resources/${id}`}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-colors shadow-xs flex items-center gap-1"
        >
          <Calendar className="w-3.5 h-3.5" />
          <span>Book Working Slot</span>
          <ArrowRight className="w-3 h-3 ml-0.5" />
        </Link>
      </div>

      {/* Reasoning Modal Dialog */}
      {showReasonDialog && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4"
        >
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="font-bold text-slate-900 text-sm">Match Rationale & Explanation</h4>
                  <p className="text-[11px] text-slate-500 font-mono">{id}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowReasonDialog(false)}
                className="text-slate-400 hover:text-slate-600 text-sm font-bold p-1"
              >
                ✕
              </button>
            </div>

            <div>
              <p className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                Match Criteria & Inferred Capabilities
              </p>
              <ul className="space-y-1.5 text-xs text-slate-600">
                {reasons.map((r, i) => (
                  <li key={i} className="flex items-start gap-2 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                    <span className="text-blue-600 font-bold shrink-0">•</span>
                    <span>{r}</span>
                  </li>
                ))}
              </ul>
            </div>

            {caveats.length > 0 && (
              <div className="bg-amber-50 border border-amber-200 rounded-2xl p-3 text-xs text-amber-900">
                <p className="font-bold flex items-center gap-1 mb-1">
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                  Access Caveats:
                </p>
                <ul className="list-disc list-inside space-y-0.5 text-[11px]">
                  {caveats.map((c, i) => (
                    <li key={i}>{c}</li>
                  ))}
                </ul>
              </div>
            )}

            <button
              type="button"
              onClick={() => setShowReasonDialog(false)}
              className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold transition-colors"
            >
              Close Rationale
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

