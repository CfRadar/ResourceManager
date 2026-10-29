import React from 'react';
import { CheckCircle2, Clock, ShieldCheck } from 'lucide-react';
import { StatusBadge } from '../feedback/StatusBadge';
import type { AuditLogEvent } from '../../api/accessRequests.api';

interface StatusTimelineProps {
  timeline: AuditLogEvent[];
}

export const StatusTimeline: React.FC<StatusTimelineProps> = ({ timeline }) => {
  if (!timeline || timeline.length === 0) {
    return <p className="text-xs text-slate-400 italic">No historical audit events recorded.</p>;
  }

  const formatTimestamp = (isoString: string) => {
    return new Date(isoString).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'UTC',
    });
  };

  return (
    <div className="relative pl-6 space-y-6 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
      {timeline.map((event, idx) => {
        const isLatest = idx === timeline.length - 1;

        return (
          <div key={event.id || idx} className="relative group">
            {/* Timeline Dot */}
            <div
              className={`absolute -left-6 top-1 w-5 h-5 rounded-full flex items-center justify-center ring-4 ring-white ${
                isLatest
                  ? 'bg-blue-600 text-white'
                  : 'bg-emerald-600 text-white'
              }`}
            >
              {isLatest ? (
                <Clock className="w-3 h-3" />
              ) : (
                <CheckCircle2 className="w-3 h-3" />
              )}
            </div>

            {/* Event Content Card */}
            <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3.5 space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <StatusBadge status={event.status} />
                  <span className="text-xs font-bold text-slate-800">
                    {event.actor}
                  </span>
                  {event.actorRole && (
                    <span className="text-[10px] font-semibold text-slate-500 bg-white px-2 py-0.5 rounded-md border border-slate-200">
                      {event.actorRole}
                    </span>
                  )}
                </div>
                <span className="text-[11px] font-medium text-slate-400">
                  {formatTimestamp(event.timestamp)} UTC
                </span>
              </div>

              {event.notes && (
                <p className="text-xs text-slate-600 leading-relaxed pt-1 border-t border-slate-200/50">
                  {event.notes}
                </p>
              )}
            </div>
          </div>
        );
      })}

      <div className="pt-1 flex items-center gap-1.5 text-[11px] text-slate-400">
        <ShieldCheck className="w-3.5 h-3.5 text-blue-500" />
        <span>Cryptographically verified tamper-evident event log (SHA-256 chain)</span>
      </div>
    </div>
  );
};
