import { Users, Server, FileCheck, CheckCircle2 } from 'lucide-react';
import { DemoTag } from '../../components/feedback/DemoTag';
import { AuditIntegrityBadge } from '../../components/feedback/AuditIntegrityBadge';

export function AdminDashboardPage() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h1 className="text-xl font-black text-slate-900">Platform Governance & Oversight</h1>
            <DemoTag />
          </div>
          <p className="text-xs text-slate-500">
            System administration, cross-institutional user management, background cron telemetry, and audit validation.
          </p>
        </div>

        <div>
          <AuditIntegrityBadge isValid={true} eventCount={142} lastCheckedAt="Today, 03:00 UTC" />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        {[
          { label: 'NETWORK USERS', value: '48', sub: 'Across 4 campuses', icon: Users, color: 'text-blue-600' },
          { label: 'LAB FACILITIES', value: '8', sub: '100% compliant', icon: Server, color: 'text-emerald-600' },
          { label: 'SCHEDULED CRON JOBS', value: '7', sub: 'Scheduler active (0 overdue)', icon: FileCheck, color: 'text-purple-600' },
          { label: 'SECURITY INCIDENTS', value: '0', sub: 'Zero breaches', icon: CheckCircle2, color: 'text-emerald-600' },
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
