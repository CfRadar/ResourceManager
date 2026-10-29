import { Star, ShieldAlert, CheckCircle2, PackageCheck, PackageX } from 'lucide-react';
import type { IncidentConditionComparison } from '../../api/incidents.api';

interface ConditionCompareViewProps {
  comparison?: IncidentConditionComparison;
}

export function ConditionCompareView({ comparison }: ConditionCompareViewProps) {
  const before = comparison?.before || {
    rating: 5,
    notes: 'Equipment calibrated. Clean optics, baseline alignment verified. All lens caps attached.',
    accessoriesVerified: true,
    timestamp: '2026-10-28T09:00:00Z',
    photoUrls: ['https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&w=400&q=80'],
  };

  const after = comparison?.after || {
    rating: 2,
    notes: 'Objective lens mount has hairline scratch on secondary bezel. High-vacuum collar loose.',
    accessoriesMissing: ['Cryo-Transfer Pin Tool (#CP-04)'],
    timestamp: '2026-10-28T17:30:00Z',
    photoUrls: ['https://images.unsplash.com/photo-1579154204601-01588f351e67?auto=format&fit=crop&w=400&q=80'],
  };

  return (
    <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xs space-y-6">
      <div className="flex items-center justify-between border-b border-slate-100 pb-4">
        <div>
          <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider">
            Hardware Condition Inspection Diff
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Photographic & physical telemetry comparison between session check-in baseline and return
          </p>
        </div>
        <span className="text-xs font-mono font-bold text-amber-700 bg-amber-50 px-3 py-1 rounded-full border border-amber-200">
          Inspection Discrepancy Flagged
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* BEFORE Intake Baseline */}
        <div className="bg-slate-50/70 border border-slate-200 rounded-2xl p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-200/60 pb-3">
            <span className="text-xs font-black uppercase tracking-wider text-slate-700">
              Check-In Baseline (Before)
            </span>
            <span className="text-[11px] font-mono text-slate-400">
              {before.timestamp ? new Date(before.timestamp).toLocaleTimeString() : 'Intake'}
            </span>
          </div>

          {/* Star Rating */}
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-semibold text-slate-500 mr-1">Condition:</span>
            {[1, 2, 3, 4, 5].map((star) => (
              <Star
                key={star}
                className={`w-4 h-4 ${
                  star <= before.rating
                    ? 'fill-amber-400 text-amber-400'
                    : 'fill-slate-200 text-slate-200'
                }`}
              />
            ))}
            <span className="text-xs font-bold text-slate-800 ml-1">
              ({before.rating}/5 - Pristine)
            </span>
          </div>

          {/* Photo */}
          {before.photoUrls && before.photoUrls.length > 0 && (
            <div className="rounded-xl overflow-hidden border border-slate-200 aspect-16/9 bg-slate-100">
              <img
                src={before.photoUrls[0]}
                alt="Baseline Condition"
                className="w-full h-full object-cover"
              />
            </div>
          )}

          {/* Notes */}
          <div className="text-xs text-slate-600 bg-white p-3 rounded-xl border border-slate-200">
            <span className="font-bold text-slate-800 block mb-0.5">Operator Notes:</span>
            <p className="italic">{before.notes}</p>
          </div>

          {/* Accessories */}
          <div className="flex items-center gap-2 text-xs font-semibold text-emerald-700 bg-emerald-50 p-2.5 rounded-xl border border-emerald-200">
            <PackageCheck className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>All cataloged accessories accounted for</span>
          </div>
        </div>

        {/* AFTER Return State */}
        <div className="bg-rose-50/40 border border-rose-200 rounded-2xl p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-rose-200/60 pb-3">
            <span className="text-xs font-black uppercase tracking-wider text-rose-800">
              Checkout Return State (After)
            </span>
            <span className="text-[11px] font-mono text-slate-400">
              {after.timestamp ? new Date(after.timestamp).toLocaleTimeString() : 'Return'}
            </span>
          </div>

          {/* Star Rating */}
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-semibold text-slate-500 mr-1">Condition:</span>
            {[1, 2, 3, 4, 5].map((star) => (
              <Star
                key={star}
                className={`w-4 h-4 ${
                  star <= after.rating
                    ? 'fill-amber-400 text-amber-400'
                    : 'fill-slate-200 text-slate-200'
                }`}
              />
            ))}
            <span className="text-xs font-bold text-rose-700 ml-1">
              ({after.rating}/5 - Degraded)
            </span>
          </div>

          {/* Photo */}
          {after.photoUrls && after.photoUrls.length > 0 && (
            <div className="rounded-xl overflow-hidden border border-rose-300 aspect-16/9 bg-slate-100">
              <img
                src={after.photoUrls[0]}
                alt="Post-Session Condition"
                className="w-full h-full object-cover"
              />
            </div>
          )}

          {/* Notes */}
          <div className="text-xs text-slate-600 bg-white p-3 rounded-xl border border-rose-200">
            <span className="font-bold text-rose-900 block mb-0.5">Return Inspection Notes:</span>
            <p className="italic text-slate-800">{after.notes}</p>
          </div>

          {/* Missing Accessories Flag */}
          {after.accessoriesMissing && after.accessoriesMissing.length > 0 ? (
            <div className="space-y-1 text-xs font-medium text-rose-800 bg-rose-100/70 p-2.5 rounded-xl border border-rose-300">
              <div className="flex items-center gap-1.5 font-bold">
                <PackageX className="w-4 h-4 text-rose-600 shrink-0" />
                <span>Missing Accessories Detected:</span>
              </div>
              <ul className="list-disc list-inside text-[11px] pl-1 font-mono">
                {after.accessoriesMissing.map((item, idx) => (
                  <li key={idx}>{item}</li>
                ))}
              </ul>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-600 bg-white p-2.5 rounded-xl border border-slate-200">
              <CheckCircle2 className="w-4 h-4 text-slate-400 shrink-0" />
              <span>No accessories missing</span>
            </div>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2 p-3 bg-amber-50 rounded-2xl border border-amber-200 text-xs text-amber-900 font-medium">
        <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0" />
        <span>
          Spec §6.8 Notice: Condition delta reports are neutral diagnostic artifacts. Fault determination requires manager review and party right-of-reply.
        </span>
      </div>
    </div>
  );
}

