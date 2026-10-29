import React from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, Clock, ArrowRight } from 'lucide-react';

export interface ActionItem {
  id: string;
  type: 'UPLOAD' | 'RETURN' | 'RESPOND' | 'INCIDENT';
  title: string;
  description: string;
  actionLabel: string;
  actionUrl: string;
  deadline?: string;
  severity: 'WARNING' | 'URGENT';
}

interface ActionRequiredBannerProps {
  actions?: ActionItem[];
}

export const ActionRequiredBanner: React.FC<ActionRequiredBannerProps> = ({ actions }) => {
  const defaultActions: ActionItem[] = [
    {
      id: 'act-1',
      type: 'RESPOND',
      title: 'Reviewer Question Pending on Request #req-103',
      description: 'Dr. Sarah Lin requested verification of acrylic sheet thickness (max 6mm).',
      actionLabel: 'Respond to Reviewer',
      actionUrl: '/requests/req-103',
      deadline: 'Within 24 hours',
      severity: 'WARNING',
    },
    {
      id: 'act-2',
      type: 'RETURN',
      title: 'Session Check-In Window Opening Soon',
      description: 'Prusa i3 MK3S+ in Digital Fabrication Lab (Room 204). Door PIN unlocked.',
      actionLabel: 'View Access Pass',
      actionUrl: '/bookings/bk-501',
      deadline: 'Starts in 2h',
      severity: 'URGENT',
    },
  ];

  const items = actions && actions.length > 0 ? actions : defaultActions;

  if (items.length === 0) return null;

  return (
    <div className="space-y-3">
      {items.map((act) => {
        const isUrgent = act.severity === 'URGENT';
        return (
          <div
            key={act.id}
            className={`p-4 rounded-2xl border transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs ${
              isUrgent
                ? 'bg-amber-50/80 border-amber-300 text-amber-950'
                : 'bg-blue-50/70 border-blue-200 text-blue-950'
            }`}
          >
            <div className="flex items-start gap-3">
              <div
                className={`p-2 rounded-xl mt-0.5 shrink-0 ${
                  isUrgent ? 'bg-amber-200 text-amber-900' : 'bg-blue-200 text-blue-900'
                }`}
              >
                {isUrgent ? <Clock className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                    Action Required
                  </span>
                  {act.deadline && (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-white/80 border border-slate-200 text-slate-700">
                      {act.deadline}
                    </span>
                  )}
                </div>
                <h4 className="text-sm font-bold mt-0.5">{act.title}</h4>
                <p className="text-xs text-slate-600 mt-0.5">{act.description}</p>
              </div>
            </div>

            <Link
              to={act.actionUrl}
              className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors shrink-0 shadow-2xs ${
                isUrgent
                  ? 'bg-amber-600 hover:bg-amber-700 text-white'
                  : 'bg-blue-600 hover:bg-blue-700 text-white'
              }`}
            >
              <span>{act.actionLabel}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        );
      })}
    </div>
  );
};
