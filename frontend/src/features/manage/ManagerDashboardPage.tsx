import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Layers,
  Clock,
  RotateCcw,
  AlertTriangle,
  ArrowRight,
  TrendingUp,
  RefreshCw,
  SlidersHorizontal,
} from 'lucide-react';
import { DemoTag } from '../../components/feedback/DemoTag';
import { NeedsAttentionBar } from '../../components/manage/NeedsAttentionBar';
import { ScheduleTimeline } from '../../components/manage/ScheduleTimeline';
import {
  fetchManagerDashboardStats,
  type ManagerDashboardKPIs,
  type ScheduleEvent,
  type ResourceDemandStat,
} from '../../api/manage.api';

export function ManagerDashboardPage() {
  const [kpis, setKpis] = useState<ManagerDashboardKPIs>({
    requestsToReview: 5,
    returnsToConfirm: 2,
    openIncidents: 1,
    activeTodayBookings: 4,
    facilityUtilizationRate: 78,
    totalEquipmentCount: 6,
  });
  const [schedule, setSchedule] = useState<ScheduleEvent[]>([]);
  const [demand, setDemand] = useState<ResourceDemandStat[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    async function loadStats() {
      setIsLoading(true);
      try {
        const data = await fetchManagerDashboardStats();
        if (isMounted) {
          setKpis(data.kpis);
          setSchedule(data.schedule);
          setDemand(data.demand);
        }
      } catch (err) {
        console.error('Failed to load manager dashboard stats', err);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }
    loadStats();
    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h1 className="text-xl font-black text-slate-900 tracking-tight">
              Facility Operations & Review Desk
            </h1>
            <DemoTag label="Manager Hub" />
          </div>
          <p className="text-xs text-slate-500">
            Digital Fabrication & Precision Machining Center • Review applications, schedule maintenance, and verify hardware returns.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link
            to="/manage/queue"
            className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs transition-colors"
          >
            <Clock className="w-3.5 h-3.5" />
            <span>Process Queue ({kpis.requestsToReview})</span>
          </Link>
          <Link
            to="/manage/checkin"
            className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Returns Desk</span>
          </Link>
        </div>
      </div>

      {/* Pinned Needs Attention Bar (Spec §6.1) */}
      <NeedsAttentionBar
        requestsCount={kpis.requestsToReview}
        returnsCount={kpis.returnsToConfirm}
        incidentsCount={kpis.openIncidents}
      />

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          {
            label: 'PENDING REVIEWS',
            value: kpis.requestsToReview.toString(),
            sub: 'FIFO queue awaiting decision',
            icon: Clock,
            color: 'text-amber-600',
            bg: 'bg-amber-50',
          },
          {
            label: 'SCHEDULED TODAY',
            value: kpis.activeTodayBookings.toString(),
            sub: 'Next run in 45 minutes',
            icon: Layers,
            color: 'text-blue-600',
            bg: 'bg-blue-50',
          },
          {
            label: 'FACILITY UTILISATION',
            value: `${kpis.facilityUtilizationRate}%`,
            sub: '+8% vs weekly target',
            icon: TrendingUp,
            color: 'text-emerald-600',
            bg: 'bg-emerald-50',
          },
          {
            label: 'OPEN INCIDENTS',
            value: kpis.openIncidents.toString(),
            sub: 'Requires condition review',
            icon: AlertTriangle,
            color: 'text-rose-600',
            bg: 'bg-rose-50',
          },
        ].map((kpi, idx) => {
          const Icon = kpi.icon;
          return (
            <div key={idx} className="bg-white border border-slate-200 rounded-2xl p-5 shadow-2xs">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-bold tracking-wider text-slate-400">
                  {kpi.label}
                </span>
                <div className={`p-1.5 rounded-lg ${kpi.bg}`}>
                  <Icon className={`w-4 h-4 ${kpi.color}`} />
                </div>
              </div>
              <p className="text-2xl font-black text-slate-900">{kpi.value}</p>
              <p className="text-[11px] text-slate-500 mt-1">{kpi.sub}</p>
            </div>
          );
        })}
      </div>

      {/* Main Grid: Schedule & Waitlist Demand */}
      {isLoading ? (
        <div className="py-12 flex justify-center text-slate-400">
          <RefreshCw className="w-6 h-6 animate-spin text-blue-600" />
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column (2 spans): Today's Schedule Timeline & Demand */}
          <div className="lg:col-span-2 space-y-6">
            <ScheduleTimeline events={schedule} />

            {/* Waitlist Demand by Resource Card */}
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <SlidersHorizontal className="w-4 h-4 text-purple-600" />
                  Waitlist Demand & Capacity by Instrument
                </h3>
                <span className="text-[11px] font-semibold text-slate-400">
                  Updated in real time
                </span>
              </div>

              <div className="space-y-3">
                {demand.map((d) => (
                  <div
                    key={d.resourceId}
                    className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="text-xs font-bold text-slate-900 block">
                          {d.resourceName}
                        </span>
                        <span className="text-[10px] text-slate-400 uppercase tracking-wider">
                          Category: {d.category}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        {d.waitlistCount > 0 ? (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-100 text-purple-800">
                            {d.waitlistCount} Waitlisted
                          </span>
                        ) : (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                            No Waitlist
                          </span>
                        )}
                        <span className="text-xs font-bold text-slate-800">
                          {d.utilizationPercent}% Utilized
                        </span>
                      </div>
                    </div>

                    <div className="h-2 w-full bg-slate-200 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${
                          d.utilizationPercent >= 90
                            ? 'bg-rose-500'
                            : d.utilizationPercent >= 75
                            ? 'bg-blue-600'
                            : 'bg-emerald-500'
                        }`}
                        style={{ width: `${d.utilizationPercent}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right Column: Quick Links & Decision Log */}
          <div className="space-y-6">
            {/* Quick Actions */}
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-3">
              <h3 className="text-sm font-bold text-slate-900">Desk Operations</h3>
              <div className="space-y-2">
                <Link
                  to="/manage/queue"
                  className="w-full p-3 bg-slate-50 hover:bg-blue-50 border border-slate-200 hover:border-blue-200 rounded-xl flex items-center justify-between text-xs font-semibold text-slate-700 hover:text-blue-700 transition-colors"
                >
                  <span className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-blue-600" />
                    Review Pending Queue
                  </span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>

                <Link
                  to="/manage/checkin"
                  className="w-full p-3 bg-slate-50 hover:bg-emerald-50 border border-slate-200 hover:border-emerald-200 rounded-xl flex items-center justify-between text-xs font-semibold text-slate-700 hover:text-emerald-700 transition-colors"
                >
                  <span className="flex items-center gap-2">
                    <RotateCcw className="w-4 h-4 text-emerald-600" />
                    Check-In & Returns Desk
                  </span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>

            {/* Recent Decisions Audit Log */}
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-3">
              <h3 className="text-sm font-bold text-slate-900">Recent Decisions</h3>
              <div className="space-y-2.5 text-xs">
                <div className="p-3 bg-emerald-50/60 border border-emerald-100 rounded-xl space-y-1">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="font-bold text-emerald-900">Request #req-101 Approved</span>
                    <span className="text-emerald-700">1h ago</span>
                  </div>
                  <p className="text-emerald-800 text-[11px]">
                    Allocated 6h milling slot on Haas VF-2 for aerospace student satellite project.
                  </p>
                </div>

                <div className="p-3 bg-blue-50/60 border border-blue-100 rounded-xl space-y-1">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="font-bold text-blue-900">Clarification Requested</span>
                    <span className="text-blue-700">3h ago</span>
                  </div>
                  <p className="text-blue-800 text-[11px]">
                    Requested thickness confirmation on PMMA acrylic run #req-102.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
