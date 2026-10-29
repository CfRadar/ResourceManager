import React from 'react';
import { Link } from 'react-router-dom';
import { AlertCircle, Clock, RotateCcw, ArrowRight } from 'lucide-react';

interface NeedsAttentionBarProps {
  requestsCount?: number;
  returnsCount?: number;
  incidentsCount?: number;
}

export const NeedsAttentionBar: React.FC<NeedsAttentionBarProps> = ({
  requestsCount = 5,
  returnsCount = 2,
  incidentsCount = 1,
}) => {
  return (
    <div className="bg-amber-50/90 border border-amber-200 rounded-2xl p-4 shadow-xs">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-amber-200 text-amber-900">
            <AlertCircle className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-amber-800 block">
              Facility Needs Attention
            </span>
            <div className="flex flex-wrap items-center gap-2 mt-0.5 text-xs font-semibold text-slate-800">
              <Link
                to="/manage/queue"
                className="hover:underline flex items-center gap-1 text-blue-700"
              >
                <Clock className="w-3.5 h-3.5 text-blue-600" />
                <span>{requestsCount} requests to review</span>
              </Link>
              <span className="text-slate-300">•</span>
              <Link
                to="/manage/checkin"
                className="hover:underline flex items-center gap-1 text-emerald-700"
              >
                <RotateCcw className="w-3.5 h-3.5 text-emerald-600" />
                <span>{returnsCount} returns to confirm</span>
              </Link>
              <span className="text-slate-300">•</span>
              <span className="text-rose-700 font-bold flex items-center gap-1">
                <span>{incidentsCount} open incident note</span>
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Link
            to="/manage/queue"
            className="px-3.5 py-1.5 text-xs font-bold bg-amber-600 hover:bg-amber-700 text-white rounded-xl transition-colors flex items-center gap-1 shadow-2xs"
          >
            <span>Open Review Queue</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>
    </div>
  );
};

