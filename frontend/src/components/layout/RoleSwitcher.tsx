import { UserCheck } from 'lucide-react';
import { useRole } from '../../context/RoleContext';
import type { UserRole } from '../../api/auth.api';

export function RoleSwitcher() {
  const { currentRole, setRole, availableRoles } = useRole();

  return (
    <div className="flex items-center gap-1.5 bg-slate-900 text-white text-xs px-2.5 py-1 rounded-full border border-slate-700 shadow-xs">
      <UserCheck className="w-3.5 h-3.5 text-blue-400 shrink-0" />
      <span className="text-slate-400 hidden sm:inline">Role:</span>
      <select
        value={currentRole}
        onChange={(e) => setRole(e.target.value as UserRole)}
        className="bg-transparent text-white font-medium focus:outline-none cursor-pointer pr-1"
        aria-label="Switch active simulated role"
      >
        {availableRoles.map((r) => (
          <option key={r} value={r} className="bg-slate-900 text-white">
            {r === 'COMMUNITY_PARTNER' ? 'Community' : r.charAt(0) + r.slice(1).toLowerCase()}
          </option>
        ))}
      </select>
    </div>
  );
}
