import { Layers, CheckCircle, Clock, AlertTriangle } from 'lucide-react';
import { DemoTag } from '../../components/feedback/DemoTag';

export function ManagerDashboardPage() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h1 className="text-xl font-black text-slate-900">Facility Operations Desk</h1>
            <DemoTag />
          </div>
          <p className="text-xs text-slate-500">
            Digital Fabrication Lab • Real-time equipment status, queue occupancy, and safety records.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        {[
          { label: 'EQUIPMENT MANAGED', value: '6', sub: '5 online, 1 calibration', icon: Layers, color: 'text-blue-600' },
          { label: 'PENDING REVIEWS', value: '2', sub: 'Action required', icon: Clock, color: 'text-amber-600' },
          { label: 'TODAY SCHEDULED', value: '4', sub: 'First slot at 10:00', icon: CheckCircle, color: 'text-emerald-600' },
          { label: 'OPEN INCIDENTS', value: '1', sub: 'Nozzle obstruction', icon: AlertTriangle, color: 'text-rose-600' },
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
