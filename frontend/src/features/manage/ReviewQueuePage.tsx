import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  Clock,
  Search,
  CheckCircle2,
  RefreshCw,
  ArrowRight,
  Filter,
} from 'lucide-react';
import { StatusBadge } from '../../components/feedback/StatusBadge';
import { DemoTag } from '../../components/feedback/DemoTag';
import { EligibilityIndicators } from '../../components/manage/EligibilityIndicators';
import { fetchReviewQueue, type QueueItem } from '../../api/manage.api';

export function ReviewQueuePage() {
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'SUBMITTED' | 'UNDER_REVIEW' | 'WAITLISTED'>('ALL');

  useEffect(() => {
    let isMounted = true;
    async function loadQueue() {
      setIsLoading(true);
      try {
        const data = await fetchReviewQueue();
        if (isMounted) setQueue(data);
      } catch (err) {
        console.error('Failed to load review queue', err);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }
    loadQueue();
    return () => {
      isMounted = false;
    };
  }, []);

  const filteredQueue = useMemo(() => {
    return queue.filter((item) => {
      const matchesStatus = statusFilter === 'ALL' || item.status === statusFilter;
      const q = searchQuery.toLowerCase().trim();
      const matchesQuery =
        !q ||
        item.requesterName.toLowerCase().includes(q) ||
        item.resourceName.toLowerCase().includes(q) ||
        item.requesterInstitution.toLowerCase().includes(q) ||
        item.id.toLowerCase().includes(q);
      return matchesStatus && matchesQuery;
    });
  }, [queue, statusFilter, searchQuery]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h1 className="text-xl font-black text-slate-900 tracking-tight">
              Access Request Review Queue
            </h1>
            <DemoTag label="FIFO Ordered" />
          </div>
          <p className="text-xs text-slate-500">
            Strict FIFO queue (<code className="bg-slate-100 px-1 py-0.5 rounded text-[11px]">created_at ASC</code>). Verify system eligibility checks, inspect material declarations, and log documented rationale.
          </p>
        </div>

        <Link
          to="/manage/dashboard"
          className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors"
        >
          Operations Dashboard
        </Link>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by researcher name, institution, or resource..."
            className="w-full text-xs pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white"
          />
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto">
          <Filter className="w-4 h-4 text-slate-400 shrink-0" />
          {(['ALL', 'SUBMITTED', 'UNDER_REVIEW', 'WAITLISTED'] as const).map((status) => (
            <button
              key={status}
              type="button"
              onClick={() => setStatusFilter(status)}
              className={`px-3 py-1.5 text-xs font-bold rounded-xl transition-all whitespace-nowrap ${
                statusFilter === status
                  ? 'bg-blue-600 text-white shadow-2xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {status === 'ALL' ? 'All Requests' : status.replace('_', ' ')}
            </button>
          ))}
        </div>
      </div>

      {/* Queue Data Table */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
        {isLoading ? (
          <div className="py-16 flex flex-col items-center justify-center text-slate-400 gap-2">
            <RefreshCw className="w-6 h-6 animate-spin text-blue-600" />
            <span className="text-xs">Loading queue items...</span>
          </div>
        ) : filteredQueue.length === 0 ? (
          <div className="py-16 text-center text-slate-400 text-xs">
            No access requests matching current filters in review queue.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                  <th className="py-3 px-4">Researcher & Institution</th>
                  <th className="py-3 px-4">Equipment & Mode</th>
                  <th className="py-3 px-4">Requested Window</th>
                  <th className="py-3 px-4 text-center">Eligibility Checks</th>
                  <th className="py-3 px-4 text-center">Queue Age / Status</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredQueue.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50/70 transition-colors">
                    {/* Researcher */}
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-slate-900">{item.requesterName}</span>
                        {item.isVerifiedResearcher && (
                          <span title="Verified Institutional Researcher">
                            <CheckCircle2 className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                          </span>
                        )}
                      </div>
                      <span className="text-[11px] text-slate-500 block">{item.requesterInstitution}</span>
                      <span className="text-[10px] font-mono text-slate-400">ID: {item.id}</span>
                    </td>

                    {/* Equipment */}
                    <td className="py-3.5 px-4">
                      <span className="font-bold text-slate-900 block">{item.resourceName}</span>
                      <span className="text-[11px] text-blue-600 font-semibold">{item.accessMode}</span>
                    </td>

                    {/* Window */}
                    <td className="py-3.5 px-4 text-slate-700">
                      <span className="font-semibold block">
                        {new Date(item.requestedSlotStart).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                        })}
                      </span>
                      <span className="text-[11px] text-slate-500">
                        {new Date(item.requestedSlotStart).toLocaleTimeString('en-US', {
                          hour: '2-digit',
                          minute: '2-digit',
                          timeZone: 'UTC',
                        })}{' '}
                        -{' '}
                        {new Date(item.requestedSlotEnd).toLocaleTimeString('en-US', {
                          hour: '2-digit',
                          minute: '2-digit',
                          timeZone: 'UTC',
                        })}{' '}
                        UTC
                      </span>
                    </td>

                    {/* Eligibility Indicators */}
                    <td className="py-3.5 px-4">
                      <div className="flex justify-center">
                        <EligibilityIndicators indicators={item.indicators} />
                      </div>
                    </td>

                    {/* Age & Status */}
                    <td className="py-3.5 px-4 text-center">
                      <div className="inline-flex flex-col items-center gap-1">
                        <StatusBadge status={item.status} />
                        <span className="text-[10px] text-slate-400 flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {item.waitingHours}h ago
                        </span>
                      </div>
                    </td>

                    {/* Action Link */}
                    <td className="py-3.5 px-4 text-right">
                      <Link
                        to={`/manage/queue/${item.id}`}
                        className="px-3.5 py-1.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition-colors inline-flex items-center gap-1 shadow-2xs"
                      >
                        <span>Review</span>
                        <ArrowRight className="w-3 h-3" />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
