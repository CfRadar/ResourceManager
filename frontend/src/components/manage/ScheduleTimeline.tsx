import React from 'react';
import { Clock, Calendar } from 'lucide-react';
import type { ScheduleEvent } from '../../api/manage.api';

interface ScheduleTimelineProps {
  events: ScheduleEvent[];
}

export const ScheduleTimeline: React.FC<ScheduleTimelineProps> = ({ events }) => {
  const hours = [8, 10, 12, 14, 16, 18, 20];

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
          <Calendar className="w-4 h-4 text-blue-600" />
          Today's Instrument Schedule (Timeline View)
        </h3>
        <span className="text-[11px] font-semibold text-slate-500 flex items-center gap-1">
          <Clock className="w-3.5 h-3.5" /> 08:00 - 20:00 UTC
        </span>
      </div>

      {/* Hourly Timeline Axis */}
      <div className="space-y-3">
        <div className="flex justify-between text-[11px] font-bold text-slate-400 border-b border-slate-100 pb-1 px-1">
          {hours.map((h) => (
            <span key={h}>{h}:00</span>
          ))}
        </div>

        {/* Event Blocks */}
        <div className="space-y-2.5">
          {events.map((ev) => {
            const startOffset = Math.max(0, ((ev.startHour - 8) / 12) * 100);
            const widthPct = Math.min(100 - startOffset, (ev.durationHours / 12) * 100);
            const isCheckedIn = ev.status === 'CHECKED_IN';

            return (
              <div key={ev.id} className="relative h-11 bg-slate-50 rounded-xl overflow-hidden flex items-center px-2">
                <div
                  style={{
                    left: `${startOffset}%`,
                    width: `${widthPct}%`,
                  }}
                  className={`absolute top-1 bottom-1 rounded-lg px-2.5 flex items-center justify-between text-xs font-bold transition-all truncate shadow-2xs ${
                    isCheckedIn
                      ? 'bg-emerald-600 text-white'
                      : 'bg-blue-600 text-white'
                  }`}
                  title={`${ev.resourceName} (${ev.requesterName}) • ${ev.durationHours}h`}
                >
                  <span className="truncate">{ev.resourceName}</span>
                  <span className="text-[10px] opacity-90 hidden sm:inline ml-1 font-mono">
                    {ev.requesterName}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1">
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-600 inline-block" />
            Active Session (Checked In)
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-blue-600 inline-block" />
            Scheduled Slot
          </span>
        </div>
        <span>Times shown in UTC</span>
      </div>
    </div>
  );
};
