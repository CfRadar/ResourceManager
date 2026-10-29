import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Calendar,
  Clock,
  PlusCircle,
  CheckCircle,
  Coins,
  ArrowRight,
  Search,
  FileQuestion,
  RefreshCw,
  Bell,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { StatusBadge } from '../../components/feedback/StatusBadge';
import { DemoTag } from '../../components/feedback/DemoTag';
import { ActionRequiredBanner } from '../../components/requester/ActionRequiredBanner';
import { BookingCard } from '../../components/requester/BookingCard';
import { fetchMyBookings, type BookingRecord } from '../../api/bookings.api';
import { fetchMyRequests, type AccessRequestDetail } from '../../api/accessRequests.api';

export function MyDashboardPage() {
  const { user } = useAuth();
  const [bookings, setBookings] = useState<BookingRecord[]>([]);
  const [requests, setRequests] = useState<AccessRequestDetail[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    async function loadDashboard() {
      setIsLoading(true);
      try {
        const [bkData, rqData] = await Promise.all([
          fetchMyBookings(),
          fetchMyRequests(),
        ]);
        if (isMounted) {
          setBookings(bkData);
          setRequests(rqData);
        }
      } catch (err) {
        console.error('Failed to load dashboard data', err);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }
    loadDashboard();
    return () => {
      isMounted = false;
    };
  }, []);

  const upcomingBookings = bookings.filter(
    (b) => b.status === 'SCHEDULED' || b.status === 'CHECKED_IN'
  );
  const pendingRequests = requests.filter(
    (r) => r.status === 'SUBMITTED' || r.status === 'UNDER_REVIEW' || r.status === 'WAITLISTED'
  );

  return (
    <div className="space-y-6">
      {/* Page Title & Profile Welcome */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h1 className="text-xl font-black text-slate-900 tracking-tight">
              Researcher Dashboard
            </h1>
            <DemoTag label="Requester Hub" />
          </div>
          <p className="text-xs text-slate-500">
            Welcome back, <strong className="text-slate-800">{user?.name || 'Fellow Researcher'}</strong>. Track instrument bookings, review queues, and institutional fair-use quotas.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Link
            to="/discover"
            className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-xs transition-colors"
          >
            <Search className="w-3.5 h-3.5" />
            <span>Discover Equipment</span>
          </Link>
        </div>
      </div>

      {/* Pinned Action Required Banner (Spec §5.7) */}
      <ActionRequiredBanner />

      {/* KPI Metric Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          {
            label: 'UPCOMING SESSIONS',
            value: upcomingBookings.length.toString(),
            sub: upcomingBookings[0] ? `Next: ${new Date(upcomingBookings[0].startAt).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}` : 'No upcoming sessions',
            icon: Calendar,
            color: 'text-blue-600',
            bg: 'bg-blue-50',
          },
          {
            label: 'PENDING REVIEWS',
            value: pendingRequests.length.toString(),
            sub: 'Waiting on facility manager',
            icon: Clock,
            color: 'text-amber-600',
            bg: 'bg-amber-50',
          },
          {
            label: 'COMPLETED RUNS',
            value: '14',
            sub: '38 verified laboratory hours',
            icon: CheckCircle,
            color: 'text-emerald-600',
            bg: 'bg-emerald-50',
          },
          {
            label: 'FAIR-USE TOKENS',
            value: '42 Tokens',
            sub: '6 / 16 weekly hours consumed',
            icon: Coins,
            color: 'text-purple-600',
            bg: 'bg-purple-50',
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

      {/* Main 2-Column Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column (2 spans): Upcoming Bookings & Pending Requests */}
        <div className="lg:col-span-2 space-y-6">
          {/* Upcoming Bookings Section */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-blue-600" />
                <h2 className="text-sm font-bold text-slate-900">Upcoming Scheduled Bookings</h2>
              </div>
              <Link
                to="/my-bookings"
                className="text-xs font-bold text-blue-600 hover:underline flex items-center gap-1"
              >
                <span>All Passes</span>
                <ArrowRight className="w-3 h-3" />
              </Link>
            </div>

            {isLoading ? (
              <div className="py-8 flex justify-center text-slate-400">
                <RefreshCw className="w-5 h-5 animate-spin" />
              </div>
            ) : upcomingBookings.length === 0 ? (
              <div className="py-8 text-center text-slate-400 text-xs">
                No active bookings scheduled. Browse available instruments to reserve a slot.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {upcomingBookings.map((bk) => (
                  <BookingCard key={bk.id} booking={bk} />
                ))}
              </div>
            )}
          </div>

          {/* Pending Access Requests Section */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-amber-600" />
                <h2 className="text-sm font-bold text-slate-900">Pending Access Requests & Appeals</h2>
              </div>
              <span className="text-[11px] font-semibold text-slate-400">
                {pendingRequests.length} Active in Queue
              </span>
            </div>

            {isLoading ? (
              <div className="py-8 flex justify-center text-slate-400">
                <RefreshCw className="w-5 h-5 animate-spin" />
              </div>
            ) : pendingRequests.length === 0 ? (
              <div className="py-8 text-center text-slate-400 text-xs">
                No requests currently pending review.
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {pendingRequests.map((req) => (
                  <div
                    key={req.id}
                    className="py-4 first:pt-0 last:pb-0 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3"
                  >
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <StatusBadge status={req.status} />
                        {req.waitlistPosition && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-100 text-purple-800">
                            Waitlist #{req.waitlistPosition}
                          </span>
                        )}
                        <span className="text-[10px] font-mono text-slate-400">
                          ID: {req.id}
                        </span>
                      </div>
                      <h4 className="text-xs font-bold text-slate-900">
                        {req.resourceName || 'Requested Instrument'}
                      </h4>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        Mode: <strong className="text-slate-700">{req.access_mode}</strong> •{' '}
                        {req.reviewerName ? `Reviewer: ${req.reviewerName}` : 'Under committee evaluation'}
                      </p>
                    </div>

                    <Link
                      to={`/requests/${req.id}`}
                      className="px-3 py-1.5 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors flex items-center gap-1 shrink-0"
                    >
                      <span>Track Request</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Fair Use Meter, Notifications, Quick Actions */}
        <div className="space-y-6">
          {/* Fair-Use Quota Card */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Coins className="w-4 h-4 text-amber-500" />
                Fair-Use Quota Status
              </h3>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                Healthy
              </span>
            </div>

            <div className="space-y-1.5">
              <div className="flex justify-between text-xs">
                <span className="text-slate-500">Weekly Quota Consumption</span>
                <span className="font-bold text-slate-800">6 / 16 hrs (38%)</span>
              </div>
              <div className="h-2.5 w-full bg-slate-100 rounded-full overflow-hidden">
                <div className="h-full bg-blue-600 rounded-full" style={{ width: '38%' }} />
              </div>
              <p className="text-[11px] text-slate-400">
                10 lab hours remaining until Sunday 00:00 UTC cycle reset.
              </p>
            </div>

            <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
              <span className="text-slate-500">Institutional Balance:</span>
              <span className="font-bold text-slate-900">42 Available Tokens</span>
            </div>
          </div>

          {/* Quick Actions Card */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-3">
            <h3 className="text-sm font-bold text-slate-900">Quick Actions</h3>
            <div className="space-y-2">
              <Link
                to="/discover"
                className="w-full p-2.5 bg-slate-50 hover:bg-blue-50 border border-slate-200 hover:border-blue-200 rounded-xl flex items-center gap-2.5 text-xs font-semibold text-slate-700 hover:text-blue-700 transition-colors"
              >
                <Search className="w-4 h-4 text-blue-600" />
                <span>Search Equipment by Experiment Need</span>
              </Link>

              <Link
                to="/my-bookings"
                className="w-full p-2.5 bg-slate-50 hover:bg-emerald-50 border border-slate-200 hover:border-emerald-200 rounded-xl flex items-center gap-2.5 text-xs font-semibold text-slate-700 hover:text-emerald-700 transition-colors"
              >
                <PlusCircle className="w-4 h-4 text-emerald-600" />
                <span>Access Passes & QR Entry Badges</span>
              </Link>

              <Link
                to="/discover?missing=true"
                className="w-full p-2.5 bg-slate-50 hover:bg-purple-50 border border-slate-200 hover:border-purple-200 rounded-xl flex items-center gap-2.5 text-xs font-semibold text-slate-700 hover:text-purple-700 transition-colors"
              >
                <FileQuestion className="w-4 h-4 text-purple-600" />
                <span>Request Unlisted Equipment / Referral</span>
              </Link>
            </div>
          </div>

          {/* Recent In-App Activity Notifications */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-3">
            <div className="flex items-center gap-2">
              <Bell className="w-4 h-4 text-slate-400" />
              <h3 className="text-sm font-bold text-slate-900">Recent Notifications</h3>
            </div>
            <div className="space-y-2.5 text-xs">
              <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-100">
                <span className="font-bold text-slate-800 block">
                  Request #req-102 Approved
                </span>
                <span className="text-[11px] text-slate-500">
                  Prusa i3 3D printer slot confirmed for today 17:00.
                </span>
              </div>
              <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-100">
                <span className="font-bold text-slate-800 block">
                  Reviewer Clarification Required
                </span>
                <span className="text-[11px] text-slate-500">
                  Laser cutter safety query on #req-103.
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
