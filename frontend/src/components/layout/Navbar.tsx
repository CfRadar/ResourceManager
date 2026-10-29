import { Link, useLocation } from 'react-router-dom';
import {
  Compass,
  Layers,
  Calendar,
  CheckSquare,
  Network,
  ShieldAlert,
  LogOut,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useRole } from '../../context/RoleContext';
import { RoleSwitcher } from './RoleSwitcher';

export function Navbar() {
  const { user, isAuthenticated, logout } = useAuth();
  const { currentRole } = useRole();
  const location = useLocation();

  const isActive = (path: string) => location.pathname === path;

  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-40 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
        {/* Brand & Identity */}
        <div className="flex items-center gap-6">
          <Link to="/" className="flex items-center gap-2.5 group">
            <div className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center font-black text-lg shadow-sm group-hover:bg-blue-700 transition-colors">
              RM
            </div>
            <div>
              <span className="font-extrabold text-slate-900 text-base tracking-tight leading-none block">
                Resource Manager
              </span>
              <span className="text-[10px] text-slate-500 font-medium tracking-wide uppercase">
                Cross-Institutional Access
              </span>
            </div>
          </Link>

          {/* Primary Navigation Links */}
          <nav className="hidden md:flex items-center gap-1 text-sm font-medium">
            <Link
              to="/"
              className={`px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5 ${
                isActive('/') ? 'bg-blue-50 text-blue-700 font-semibold' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              Home
            </Link>

            <Link
              to="/discover"
              className={`px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5 ${
                isActive('/discover') ? 'bg-blue-50 text-blue-700 font-semibold' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              <Compass className="w-4 h-4" />
              AI Discovery
            </Link>

            <Link
              to="/resources"
              className={`px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5 ${
                isActive('/resources') ? 'bg-blue-50 text-blue-700 font-semibold' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              <Layers className="w-4 h-4" />
              Catalog
            </Link>

            {/* Role-Specific Navigation Links */}
            {currentRole === 'REQUESTER' && (
              <>
                <Link
                  to="/dashboard"
                  className={`px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5 ${
                    isActive('/dashboard') ? 'bg-blue-50 text-blue-700 font-semibold' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                  }`}
                >
                  <Calendar className="w-4 h-4" />
                  My Requests
                </Link>
                <Link
                  to="/my-bookings"
                  className={`px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5 ${
                    isActive('/my-bookings') ? 'bg-blue-50 text-blue-700 font-semibold' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                  }`}
                >
                  <Calendar className="w-4 h-4" />
                  Bookings
                </Link>
              </>
            )}

            {currentRole === 'MANAGER' && (
              <>
                <Link
                  to="/manage/queue"
                  className={`px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5 ${
                    isActive('/manage/queue') ? 'bg-blue-50 text-blue-700 font-semibold' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                  }`}
                >
                  <CheckSquare className="w-4 h-4" />
                  Review Queue
                </Link>
                <Link
                  to="/manage/dashboard"
                  className={`px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5 ${
                    isActive('/manage/dashboard') ? 'bg-blue-50 text-blue-700 font-semibold' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                  }`}
                >
                  <Layers className="w-4 h-4" />
                  Facility Desk
                </Link>
              </>
            )}

            {currentRole === 'COORDINATOR' && (
              <Link
                to="/coordinate/desk"
                className={`px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5 ${
                  isActive('/coordinate/desk') ? 'bg-blue-50 text-blue-700 font-semibold' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                }`}
              >
                <Network className="w-4 h-4" />
                Referral Coordination
              </Link>
            )}

            {currentRole === 'ADMIN' && (
              <Link
                to="/admin/dashboard"
                className={`px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5 ${
                  isActive('/admin/dashboard') ? 'bg-blue-50 text-blue-700 font-semibold' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                }`}
              >
                <ShieldAlert className="w-4 h-4" />
                Admin Oversight
              </Link>
            )}
          </nav>
        </div>

        {/* Right Tools: Role Switcher & Auth */}
        <div className="flex items-center gap-3">
          <RoleSwitcher />

          {isAuthenticated && user ? (
            <div className="flex items-center gap-2.5 pl-2 border-l border-slate-200">
              <div className="hidden sm:block text-right">
                <span className="text-xs font-bold text-slate-800 block leading-tight">
                  {user.name}
                </span>
                <span className="text-[10px] text-slate-500 block leading-tight">
                  {user.institutionName || 'Institutional Member'}
                </span>
              </div>
              <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-xs border border-blue-200">
                {user.name.charAt(0)}
              </div>
              <button
                onClick={() => logout()}
                className="text-slate-400 hover:text-slate-700 p-1.5 rounded-lg transition-colors"
                title="Sign out"
                aria-label="Sign out"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Link
                to="/login"
                className="text-xs font-semibold px-3 py-1.5 text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
              >
                Sign In
              </Link>
              <Link
                to="/register"
                className="text-xs font-semibold px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg shadow-xs transition-colors"
              >
                Register
              </Link>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
