import { Info } from 'lucide-react';
import { DemoTag } from '../feedback/DemoTag';

export function DemoBanner() {
  return (
    <aside
      aria-label="Demonstration Notice"
      className="bg-amber-500 text-slate-950 px-4 py-1.5 text-xs font-semibold flex items-center justify-between shadow-xs border-b border-amber-600"
    >
      <div className="flex items-center gap-2 mx-auto">
        <DemoTag />
        <span className="flex items-center gap-1.5">
          <Info className="w-3.5 h-3.5 shrink-0" />
          <span>
            Demonstration Environment: All institutions, laboratory resources, booking schedules, and token transactions are simulated demo data.
          </span>
        </span>
      </div>
    </aside>
  );
}
