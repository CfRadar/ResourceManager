import { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { LogIn, Sparkles, UserCheck, KeyRound } from 'lucide-react';
import { useAuth, DEMO_USERS } from '../../context/AuthContext';
import type { UserRole } from '../../api/auth.api';
import { DemoTag } from '../../components/feedback/DemoTag';

export function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { login, quickLoginAs } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const queryParams = new URLSearchParams(location.search);
  const next = queryParams.get('next') || '/dashboard';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    setIsSubmitting(true);
    try {
      await login(email, password || 'Password123!');
      navigate(next);
    } catch {
      // Toast displayed by AuthContext
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleFillDemoCreds = (role: UserRole) => {
    const cred = DEMO_USERS[role];
    if (cred) {
      setEmail(cred.email);
      setPassword('Password123!');
    }
  };

  const demoPersonas: { role: UserRole; label: string }[] = [
    { role: 'REQUESTER', label: 'Requester (Dr. Sarah Chen)' },
    { role: 'MANAGER', label: 'Facility Manager (David Miller)' },
    { role: 'COORDINATOR', label: 'Coordinator (Elena Rostova)' },
    { role: 'ADMIN', label: 'Administrator (Dean Vance)' },
  ];

  return (
    <div className="max-w-md mx-auto py-8 px-4">
      <div className="bg-white border border-slate-200 rounded-3xl p-8 shadow-sm">
        <div className="text-center mb-6">
          <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-3 border border-blue-100 font-bold text-xl">
            <LogIn className="w-6 h-6" />
          </div>
          <div className="flex items-center justify-center gap-2 mb-1">
            <h2 className="text-2xl font-black text-slate-900 tracking-tight">Sign In</h2>
            <DemoTag />
          </div>
          <p className="text-xs text-slate-500">Access cross-institutional laboratory network</p>
        </div>

        {/* Demo Fast Login Buttons */}
        <div className="mb-6 bg-slate-50 border border-slate-200 rounded-2xl p-4">
          <div className="flex items-center justify-between mb-2.5">
            <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              1-Click Demo Evaluation Sign In
            </span>
            <DemoTag label="FAST-LOGIN" />
          </div>
          <div className="grid grid-cols-1 gap-1.5">
            {demoPersonas.map((p) => (
              <div key={p.role} className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={async () => {
                    await quickLoginAs(p.role);
                    navigate(next);
                  }}
                  className="flex-1 text-left text-xs px-3 py-2 rounded-xl bg-white hover:bg-blue-50 hover:text-blue-700 hover:border-blue-200 border border-slate-200 font-medium transition-colors flex items-center justify-between"
                  title="Direct 1-click login and session initialization"
                >
                  <span>{p.label}</span>
                  <UserCheck className="w-3.5 h-3.5 opacity-60" />
                </button>
                <button
                  type="button"
                  onClick={() => handleFillDemoCreds(p.role)}
                  className="px-2 py-2 text-[10px] text-slate-500 hover:text-blue-600 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors"
                  title="Fill email/password into input fields"
                >
                  Fill
                </button>
              </div>
            ))}
          </div>
        </div>

        <div className="relative mb-6">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-slate-200" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-white px-3 text-slate-400 font-medium">Or enter credentials</span>
          </div>
        </div>

        {/* Standard Credentials Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">Email Address</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="e.g. sarah.chen@mit.edu"
              required
              className="w-full text-sm border border-slate-300 rounded-xl px-3.5 py-2.5 focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-semibold text-slate-700">Password</label>
              <button
                type="button"
                onClick={() => setPassword('Password123!')}
                className="text-[10px] text-blue-600 hover:underline font-medium flex items-center gap-0.5"
              >
                <KeyRound className="w-3 h-3" />
                <span>Fill Default</span>
              </button>
            </div>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full text-sm border border-slate-300 rounded-xl px-3.5 py-2.5 focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />
          </div>

          <button
            type="submit"
            disabled={isSubmitting || !email}
            className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl font-semibold text-sm transition-colors shadow-xs"
          >
            {isSubmitting ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        <p className="text-center text-xs text-slate-500 mt-6">
          Don't have an account?{' '}
          <Link to="/register" className="text-blue-600 font-semibold hover:underline">
            Register here
          </Link>
        </p>
      </div>
    </div>
  );
}
