import React from 'react';
import { Coins, AlertCircle, Info, ShieldCheck } from 'lucide-react';
import type { FairUseQuota } from '../../api/accessRequests.api';

interface FairUseMeterProps {
  quota: FairUseQuota;
  requestedHours: number;
  tokensPerHour?: number;
}

export const FairUseMeter: React.FC<FairUseMeterProps> = ({
  quota,
  requestedHours,
  tokensPerHour = 1,
}) => {
  const currentUsed = quota.weeklyHoursUsed;
  const limit = quota.weeklyHoursLimit || 16;
  const projectedTotal = currentUsed + requestedHours;
  const projectedPercent = Math.min(100, Math.round((projectedTotal / limit) * 100));
  const currentPercent = Math.min(100, Math.round((currentUsed / limit) * 100));
  const isOverQuota = projectedTotal > limit;
  const isNearLimit = projectedPercent >= 80 && !isOverQuota;

  const totalTokensNeeded = requestedHours * tokensPerHour;
  const hasSufficientTokens = quota.currentTokens >= totalTokensNeeded;

  return (
    <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Coins className="w-5 h-5 text-amber-500" />
          <h4 className="text-sm font-bold text-slate-900">
            Fair-Use & Token Consumption Meter
          </h4>
        </div>
        <span className="text-[11px] font-semibold text-slate-500 bg-white px-2.5 py-1 rounded-lg border border-slate-200">
          Weekly Quota Reset: Every Sunday 00:00 UTC
        </span>
      </div>

      {/* Progress Bar Container */}
      <div className="space-y-1.5">
        <div className="flex justify-between text-xs">
          <span className="font-medium text-slate-600">Weekly Laboratory Hours</span>
          <span className="font-bold text-slate-900">
            {projectedTotal}h / {limit}h max
          </span>
        </div>

        {/* Multi-segment visual bar */}
        <div className="h-3 w-full bg-slate-200 rounded-full overflow-hidden flex">
          {/* Currently used portion */}
          <div
            style={{ width: `${currentPercent}%` }}
            className="h-full bg-blue-600 transition-all duration-300"
            title={`Currently used: ${currentUsed}h`}
          />
          {/* Newly requested portion */}
          <div
            style={{ width: `${projectedPercent - currentPercent}%` }}
            className={`h-full transition-all duration-300 ${
              isOverQuota
                ? 'bg-red-500 animate-pulse'
                : isNearLimit
                ? 'bg-amber-500'
                : 'bg-emerald-500'
            }`}
            title={`This request: +${requestedHours}h`}
          />
        </div>

        {/* Legend */}
        <div className="flex items-center justify-between text-[11px] text-slate-500 pt-0.5">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-blue-600 inline-block" />
              Prior Bookings ({currentUsed}h)
            </span>
            <span className="flex items-center gap-1.5">
              <span
                className={`w-2.5 h-2.5 rounded-full inline-block ${
                  isOverQuota ? 'bg-red-500' : isNearLimit ? 'bg-amber-500' : 'bg-emerald-500'
                }`}
              />
              This Booking (+{requestedHours}h)
            </span>
          </div>
          <span className="font-medium">
            {Math.max(0, limit - projectedTotal)}h remaining
          </span>
        </div>
      </div>

      {/* Narrative Callout per Spec §5.4 */}
      <div
        className={`p-3.5 rounded-xl text-xs flex items-start gap-2.5 border ${
          isOverQuota
            ? 'bg-red-50 border-red-200 text-red-900'
            : isNearLimit
            ? 'bg-amber-50 border-amber-200 text-amber-900'
            : 'bg-blue-50 border-blue-200 text-blue-900'
        }`}
      >
        {isOverQuota ? (
          <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
        ) : isNearLimit ? (
          <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
        ) : (
          <Info className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
        )}
        <div>
          <span className="font-semibold block">
            {isOverQuota
              ? `Weekly quota exceeded by ${projectedTotal - limit} hour(s).`
              : `After this booking, you will have used ${projectedTotal} of your ${limit} permitted hours this week.`}
          </span>
          <span className="text-[11px] opacity-80 mt-0.5 block">
            {isOverQuota
              ? 'Requests exceeding weekly fair-use allocations require prior dean / chair authorization or waitlisting.'
              : 'Fair-use allocation guarantees equal instrument availability for all institutional researchers.'}
          </span>
        </div>
      </div>

      {/* Token Ledger Estimate */}
      <div className="pt-2 border-t border-slate-200/80 flex items-center justify-between text-xs">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-emerald-600" />
          <span className="text-slate-600">Your Token Balance:</span>
          <span className="font-bold text-slate-900">{quota.currentTokens} Tokens</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-slate-500">Deduction:</span>
          <span className="font-bold text-blue-600">
            {totalTokensNeeded} Token{totalTokensNeeded !== 1 ? 's' : ''} ({tokensPerHour}/hr)
          </span>
          {!hasSufficientTokens && (
            <span className="text-[10px] text-red-600 font-bold bg-red-100 px-1.5 py-0.5 rounded-sm ml-1">
              Insufficient
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

