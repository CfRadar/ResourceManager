import { useState } from 'react';
import { UserCheck, Sparkles, ChevronUp, ChevronDown, RefreshCw } from 'lucide-react';
import { useAuth, DEMO_USERS } from '../../context/AuthContext';
import type { UserRole } from '../../api/auth.api';
import { DemoTag } from '../feedback/DemoTag';

export function JudgeToolbar() {
  const [isExpanded, setIsExpanded] = useState(false);
  const { user, quickLoginAs, logout } = useAuth();

  const personas: { role: UserRole; title: string; desc: string }[] = [
    { role: 'REQUESTER', title: 'Requester', desc: DEMO_USERS.REQUESTER.name },
    { role: 'MANAGER', title: 'Lab Manager', desc: DEMO_USERS.MANAGER.name },
    { role: 'COORDINATOR', title: 'Coordinator', desc: DEMO_USERS.COORDINATOR.name },
    { role: 'ADMIN', title: 'Platform Admin', desc: DEMO_USERS.ADMIN.name },
    { role: 'COMMUNITY_PARTNER', title: 'Community', desc: DEMO_USERS.COMMUNITY_PARTNER.name },
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-slate-900 border-t border-slate-800 text-white shadow-2xl transition-all">
      {/* Collapsed Strip */}
      <div className="max-w-7xl mx-auto px-4 py-2 flex items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2">
          <DemoTag label="JUDGE TOOLBAR" />
          <span className="text-slate-300 hidden md:inline">
            Quick-switch test personas for evaluation:
          </span>
          <div className="flex items-center gap-1.5 flex-wrap">
            {personas.map((p) => {
              const isCurrent = user?.role === p.role;
              return (
                <button
                  key={p.role}
                  onClick={() => quickLoginAs(p.role)}
                  className={`px-2.5 py-1 rounded-md font-semibold transition-all flex items-center gap-1 text-[11px] ${
                    isCurrent
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white border border-slate-700'
                  }`}
                  title={`Sign in as ${p.desc} (${p.title})`}
                >
                  <UserCheck className="w-3 h-3 opacity-75" />
                  <span>{p.title}</span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              logout();
              localStorage.clear();
              window.location.reload();
            }}
            className="text-[11px] text-slate-400 hover:text-rose-400 flex items-center gap-1 px-2 py-1 rounded hover:bg-slate-800 transition-colors"
            title="Clear all stored tokens and reset demo session"
          >
            <RefreshCw className="w-3 h-3" />
            <span className="hidden sm:inline">Reset Sandbox</span>
          </button>

          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="text-slate-400 hover:text-white p-1 rounded hover:bg-slate-800"
            aria-label="Toggle details"
          >
            {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Expanded Persona Guide */}
      {isExpanded && (
        <div className="border-t border-slate-800 bg-slate-950 px-4 py-3 max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-5 gap-3 text-[11px]">
          {personas.map((p) => (
            <div key={p.role} className="bg-slate-900 border border-slate-800 rounded-lg p-2.5">
              <div className="flex items-center justify-between mb-1">
                <span className="font-bold text-blue-400">{p.title}</span>
                <span className="text-slate-400 text-[10px]">{p.role}</span>
              </div>
              <p className="font-semibold text-slate-200">{p.desc}</p>
              <p className="text-slate-400 text-[10px] mt-0.5">{DEMO_USERS[p.role].institution}</p>
              <button
                onClick={() => quickLoginAs(p.role)}
                className="mt-2 w-full py-1 bg-slate-800 hover:bg-blue-600 text-white rounded text-[10px] font-semibold transition-colors flex items-center justify-center gap-1"
              >
                <Sparkles className="w-3 h-3 text-amber-400" />
                Activate Persona
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
