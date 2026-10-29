import { Outlet } from 'react-router-dom';
import { DemoBanner } from './DemoBanner';
import { Navbar } from './Navbar';
import { JudgeToolbar } from './JudgeToolbar';

export function AppLayout() {
  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900 pb-16">
      <DemoBanner />
      <Navbar />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <Outlet />
      </main>

      <footer className="bg-white border-t border-slate-200 mt-auto py-6 text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p>© 2026 Institutional Resource Access & Coordination Network. All rights reserved.</p>
          <div className="flex items-center gap-4">
            <span className="text-slate-400">Spec §1.1 • Express + React 19 + UviAge</span>
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500" title="System Operational" />
          </div>
        </div>
      </footer>

      <JudgeToolbar />
    </div>
  );
}
