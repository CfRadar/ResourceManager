import { Send, Inbox, Building2 } from 'lucide-react';
import { DemoTag } from '../../components/feedback/DemoTag';

export function CoordinatorDeskPage() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h1 className="text-xl font-black text-slate-900">Cross-Institutional Referral Desk</h1>
            <DemoTag />
          </div>
          <p className="text-xs text-slate-500">
            Route unmet capability demands, negotiate reciprocal fee structures, and manage institutional referrals.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { label: 'OPEN NEED REQUESTS', value: '3', sub: 'Missing local equipment', icon: Inbox, color: 'text-blue-600' },
          { label: 'ACTIVE REFERRALS', value: '2', sub: 'Pending partner approval', icon: Send, color: 'text-amber-600' },
          { label: 'PARTNER INSTITUTIONS', value: '4', sub: 'Exchange agreements active', icon: Building2, color: 'text-emerald-600' },
        ].map((kpi, idx) => {
          const Icon = kpi.icon;
          return (
            <div key={idx} className="bg-white border border-slate-200 rounded-2xl p-5">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-bold tracking-wider text-slate-400">{kpi.label}</span>
                <Icon className={`w-4 h-4 ${kpi.color}`} />
              </div>
              <p className="text-2xl font-black text-slate-900">{kpi.value}</p>
              <p className="text-[11px] text-slate-500 mt-1">{kpi.sub}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
