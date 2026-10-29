import { Check, Clock, AlertTriangle, XCircle } from 'lucide-react';
import type { ServiceMilestone } from '../../api/coordination.api';

interface StepDef {
  key: ServiceMilestone;
  label: string;
  description: string;
}

const MILESTONE_STEPS: StepDef[] = [
  { key: 'SUBMITTED', label: 'Submitted', description: 'Intake scope created' },
  { key: 'SCOPE_REVIEWED', label: 'Scope Reviewed', description: 'Feasibility confirmed' },
  { key: 'QUOTE_SENT', label: 'Quote Sent', description: 'Itemized estimate issued' },
  { key: 'QUOTE_ACCEPTED', label: 'Quote Accepted', description: 'Cost agreed' },
  { key: 'MATERIALS_RECEIVED', label: 'Materials Received', description: 'Lab sample verified' },
  { key: 'IN_PROGRESS', label: 'In Progress', description: 'Processing underway' },
  { key: 'OUTPUT_DELIVERED', label: 'Output Delivered', description: 'Deliverables ready' },
  { key: 'COMPLETED', label: 'Completed', description: 'Order finalized' },
];

interface MilestoneStepperProps {
  currentStatus: ServiceMilestone;
  onStepClick?: (step: ServiceMilestone) => void;
}

export function MilestoneStepper({ currentStatus, onStepClick }: MilestoneStepperProps) {
  const isTerminalDispute = currentStatus === 'DISPUTED';
  const isTerminalRejected = currentStatus === 'REJECTED';
  const isTerminalCancelled = currentStatus === 'CANCELLED';

  const currentIndex = MILESTONE_STEPS.findIndex((s) => s.key === currentStatus);

  return (
    <div className="w-full bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider">Service Execution Lifecycle</h3>
          <p className="text-xs text-slate-500 mt-0.5">Automated workflow tracking from technician intake to completion</p>
        </div>

        {isTerminalDispute && (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
            Outcome Disputed
          </span>
        )}
        {isTerminalRejected && (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200">
            <XCircle className="w-3.5 h-3.5 text-rose-600" />
            Request Rejected
          </span>
        )}
        {isTerminalCancelled && (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-700 border border-slate-200">
            Cancelled
          </span>
        )}
      </div>

      {/* Horizontal Stepper Progress */}
      <div className="overflow-x-auto pb-4 pt-2">
        <div className="min-w-[760px] flex items-center justify-between relative">
          {/* Connector Line behind steps */}
          <div className="absolute top-5 left-6 right-6 h-0.5 bg-slate-200 -z-0" />

          {MILESTONE_STEPS.map((step, idx) => {
            const isCompleted = currentIndex > idx;
            const isCurrent = currentIndex === idx;

            return (
              <button
                key={step.key}
                type="button"
                onClick={() => onStepClick?.(step.key)}
                className={`relative z-10 flex flex-col items-center group text-center focus:outline-none transition-transform ${
                  onStepClick ? 'cursor-pointer hover:scale-105' : 'cursor-default'
                }`}
                style={{ width: `${100 / MILESTONE_STEPS.length}%` }}
              >
                {/* Step Circle */}
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-xs transition-all duration-200 shadow-sm ${
                    isCompleted
                      ? 'bg-emerald-600 text-white ring-4 ring-emerald-50'
                      : isCurrent
                      ? 'bg-indigo-600 text-white ring-4 ring-indigo-100 animate-pulse'
                      : 'bg-white border-2 border-slate-300 text-slate-400 group-hover:border-slate-400'
                  }`}
                >
                  {isCompleted ? (
                    <Check className="w-5 h-5 stroke-[2.5]" />
                  ) : isCurrent ? (
                    <Clock className="w-4 h-4 stroke-[2.5]" />
                  ) : (
                    <span>{idx + 1}</span>
                  )}
                </div>

                {/* Step Text */}
                <div className="mt-3 px-1">
                  <p
                    className={`text-xs font-bold leading-tight ${
                      isCurrent
                        ? 'text-indigo-600'
                        : isCompleted
                        ? 'text-slate-900'
                        : 'text-slate-400'
                    }`}
                  >
                    {step.label}
                  </p>
                  <p className="text-[10px] text-slate-400 hidden sm:block mt-0.5 leading-tight">
                    {step.description}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
