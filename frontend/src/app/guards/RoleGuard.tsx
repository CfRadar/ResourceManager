import { ShieldAlert, RefreshCw } from 'lucide-react';
import type { UserRole } from '../../api/auth.api';
import { useRole } from '../../context/RoleContext';

interface RoleGuardProps {
  allowedRoles: UserRole[];
  children: React.ReactNode;
}

export function RoleGuard({ allowedRoles, children }: RoleGuardProps) {
  const { currentRole, setRole, availableRoles } = useRole();

  const isAllowed = allowedRoles.includes(currentRole);

  if (!isAllowed) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-white border border-slate-200 rounded-2xl p-8 text-center shadow-sm">
          <div className="w-14 h-14 bg-amber-50 text-amber-600 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-amber-100">
            <ShieldAlert className="w-7 h-7" />
          </div>
          <h2 className="text-xl font-bold text-slate-900 mb-2">Access Restricted</h2>
          <p className="text-sm text-slate-600 mb-6">
            This module requires one of the following permissions:{' '}
            <span className="font-semibold text-slate-800">
              {allowedRoles.map((r) => r.toLowerCase()).join(', ')}
            </span>
            . You are currently acting as{' '}
            <span className="font-semibold text-amber-700">{currentRole.toLowerCase()}</span>.
          </p>

          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-left mb-6">
            <p className="text-xs font-semibold text-slate-700 mb-2 flex items-center gap-1.5">
              <RefreshCw className="w-3.5 h-3.5" />
              Switch simulated role for evaluation:
            </p>
            <div className="flex flex-wrap gap-2">
              {availableRoles.map((role) => (
                <button
                  key={role}
                  onClick={() => setRole(role)}
                  className={`text-xs px-2.5 py-1.5 rounded-lg font-medium transition-colors ${
                    role === currentRole
                      ? 'bg-blue-600 text-white'
                      : allowedRoles.includes(role)
                      ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200'
                      : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
                  }`}
                >
                  {role.charAt(0) + role.slice(1).toLowerCase()}
                </button>
              ))}
            </div>
          </div>

          <a
            href="/"
            className="inline-block text-sm font-semibold text-blue-600 hover:text-blue-700 hover:underline"
          >
            ← Return to Discovery Portal
          </a>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
