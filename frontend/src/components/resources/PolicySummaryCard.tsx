import { Clock, ShieldAlert, FileText, Ban, Check, Users } from 'lucide-react';
import type { ResourcePolicyData } from '../../api/resources.api';

interface PolicySummaryCardProps {
  policy?: ResourcePolicyData;
}

export function PolicySummaryCard({ policy = {} }: PolicySummaryCardProps) {
  const maxHours = policy.maxSingleBookingHours || 4;
  const maxWeekly = policy.maxWeeklyHours || 8;
  const advanceDays = policy.advanceBookingDays || 14;
  const cancelHours = policy.cancellationNoticeHours || 12;
  const prohibited = policy.prohibitedActivities || [
    'Uncertified third-party filaments or powders',
    'Unattended hazardous thermal cycles exceeding 260°C',
    'Biological hazards or volatile organic solvents without fume hood',
  ];

  return (
    <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 space-y-6 shadow-xs">
      <div>
        <h3 className="text-base font-black text-slate-900 tracking-tight">
          Facility Access Policy & Governance Rules
        </h3>
        <p className="text-xs text-slate-500 mt-1">
          Active operational boundaries enforced dynamically by institutional smart contracts
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Fair Use Duration */}
        <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 flex items-start gap-3">
          <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 border border-blue-100">
            <Clock className="w-4 h-4" />
          </div>
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-0.5">
              FAIR-USE ALLOCATION
            </span>
            <span className="text-xs font-bold text-slate-900 block">
              {maxHours} hrs per slot / {maxWeekly} hrs per week
            </span>
            <span className="text-[11px] text-slate-500">
              Slots must start and end within facility operating hours.
            </span>
          </div>
        </div>

        {/* Advance Notice Window */}
        <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 flex items-start gap-3">
          <div className="w-9 h-9 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center shrink-0 border border-purple-100">
            <FileText className="w-4 h-4" />
          </div>
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-0.5">
              ADVANCE RESERVATION
            </span>
            <span className="text-xs font-bold text-slate-900 block">
              Up to {advanceDays} days ahead
            </span>
            <span className="text-[11px] text-slate-500">
              Minimum 2 hours notice required prior to slot activation.
            </span>
          </div>
        </div>

        {/* Cancellation Rule */}
        <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 flex items-start gap-3">
          <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 border border-emerald-100">
            <Check className="w-4 h-4" />
          </div>
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-0.5">
              CANCELLATION POLICY
            </span>
            <span className="text-xs font-bold text-slate-900 block">
              Free up to {cancelHours} hrs before
            </span>
            <span className="text-[11px] text-slate-500">
              Full token refund returned to departmental ledger.
            </span>
          </div>
        </div>
      </div>

      {/* Permitted Groups */}
      <div className="border-t border-slate-100 pt-5">
        <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
          <Users className="w-4 h-4 text-slate-500" />
          <span>Authorized User Cohorts</span>
        </h4>
        <div className="flex flex-wrap gap-2 text-xs">
          {[
            'Institutional Faculty & Principal Investigators',
            'Enrolled Graduate & Postdoctoral Researchers',
            'Federated Partner Exchange Members',
            'Vetted Community Innovation Partners',
          ].map((group, i) => (
            <span
              key={i}
              className="inline-flex items-center gap-1.5 bg-slate-50 border border-slate-200 text-slate-700 px-3 py-1.5 rounded-xl font-medium"
            >
              <Check className="w-3.5 h-3.5 text-emerald-600" />
              <span>{group}</span>
            </span>
          ))}
        </div>
      </div>

      {/* Prohibited Materials & Actions */}
      <div className="border-t border-slate-100 pt-5">
        <h4 className="text-xs font-bold text-rose-800 uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
          <Ban className="w-4 h-4 text-rose-600" />
          <span>Strictly Prohibited Materials & Activities</span>
        </h4>
        <div className="space-y-1.5">
          {prohibited.map((item, i) => (
            <div
              key={i}
              className="flex items-start gap-2 bg-rose-50/60 border border-rose-200/60 text-rose-900 p-2.5 rounded-xl text-xs"
            >
              <ShieldAlert className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <span>{item}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

