import { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { LogIn, Sparkles, UserCheck } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
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
  const next = queryParams.get('next') || '/';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    setIsSubmitting(true);
    try {
      await login(email, password);
      navigate(next);
    } catch {
      // toast shown by AuthContext
    } finally {
      setIsSubmitting(false);
    }
  };

  const demoPersonas: { role: UserRole; label: string }[] = [
    { role: 'REQUESTER', label: 'Requester (Dr. Sarah Chen)' },
    { role: 'MANAGER', label: 'Facility Manager (David Miller)' },
    { role: 'COORDINATOR', label: 'Coordinator (Elena Rostova)' },
    { role: 'ADMIN', label: 'Administrator (Dean Vance)' },
  ];

  return (
    <div className="max-w-md mx-auto py-8">
      <div className="bg-white border border-slate-200 rounded-3xl p-8 shadow-sm">
        <div className="text-center mb-6">
          <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-3 border border-blue-100 font-bold text-xl">
            <LogIn className="w-6 h-6" />
          </div>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight">Sign In</h2>
          <p className="text-xs text-slate-500 mt-1">Access institutional equipment and reviews</p>
        </div>

        {/* Demo Fast Login Buttons */}
        <div className="mb-6 bg-slate-50 border border-slate-200 rounded-2xl p-4">
          <div className="flex items-center justify-between mb-2.5">
            <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              1-Click Demo Evaluation Sign In
            </span>
            <DemoTag />
          </div>
          <div className="grid grid-cols-1 gap-1.5">
            {demoPersonas.map((p) => (
              <button
                key={p.role}
                type="button"
                onClick={async () => {
                  await quickLoginAs(p.role);
                  navigate(next);
                }}
                className="text-left text-xs px-3 py-2 rounded-xl bg-white hover:bg-blue-50 hover:text-blue-700 hover:border-blue-200 border border-slate-200 font-medium transition-colors flex items-center justify-between"
              >
                <span>{p.label}</span>
                <UserCheck className="w-3.5 h-3.5 opacity-60" />
              </button>
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
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">Password</label>
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
