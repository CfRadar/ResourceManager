import { Link } from 'react-router-dom';
import { Calendar, Clock, PlusCircle, CheckCircle, AlertCircle } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { StatusBadge } from '../../components/feedback/StatusBadge';
import { DemoTag } from '../../components/feedback/DemoTag';

export function MyDashboardPage() {
  const { user } = useAuth();

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h1 className="text-xl font-black text-slate-900">Requester Dashboard</h1>
            <DemoTag />
          </div>
          <p className="text-xs text-slate-500">
            Welcome, {user?.name || 'Researcher'}. Track active requests, slot approvals, and tokens.
          </p>
        </div>

        <Link
          to="/resources"
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-xs transition-colors"
        >
          <PlusCircle className="w-3.5 h-3.5" />
          <span>New Equipment Request</span>
        </Link>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        {[
          { label: 'ACTIVE BOOKINGS', value: '1', sub: 'Next: Today 17:00', icon: Calendar, color: 'text-blue-600' },
          { label: 'PENDING APPROVAL', value: '2', sub: 'In review queue', icon: Clock, color: 'text-amber-600' },
          { label: 'COMPLETED SESSIONS', value: '14', sub: '38 total hours', icon: CheckCircle, color: 'text-emerald-600' },
          { label: 'AVAILABLE TOKENS', value: '120 hrs', sub: 'Monthly fair-use cap', icon: AlertCircle, color: 'text-purple-600' },
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

      {/* Recent Access Requests */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6">
        <h2 className="text-sm font-bold text-slate-900 mb-4">Recent Access Requests</h2>
        <div className="divide-y divide-slate-100 text-xs">
          {[
            { id: 'req_001', resource: 'Prusa i3 MK3S+ 3D Printer', date: 'Oct 30, 2026', status: 'APPROVED', hours: '4 hrs' },
            { id: 'req_002', resource: 'Epilog Fusion Pro Laser Cutter', date: 'Nov 02, 2026', status: 'UNDER_REVIEW', hours: '2 hrs' },
            { id: 'req_003', resource: 'Haas VF-2 CNC Vertical Mill', date: 'Nov 05, 2026', status: 'MORE_INFO_REQUIRED', hours: '6 hrs' },
          ].map((item) => (
            <div key={item.id} className="py-3 flex items-center justify-between gap-4">
              <div>
                <p className="font-bold text-slate-900">{item.resource}</p>
                <p className="text-slate-400 text-[11px] mt-0.5">Slot: {item.date} • {item.hours}</p>
              </div>
              <StatusBadge status={item.status} size="sm" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
