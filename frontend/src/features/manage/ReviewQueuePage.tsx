import { useState } from 'react';
import { CheckCircle, XCircle, AlertTriangle, ShieldCheck } from 'lucide-react';
import { ReasonDialog } from '../../components/feedback/ReasonDialog';
import { DemoTag } from '../../components/feedback/DemoTag';
import { useToast } from '../../context/ToastContext';

export function ReviewQueuePage() {
  const [selectedAction, setSelectedAction] = useState<{
    type: 'approve' | 'reject' | 'waitlist';
    requestId: string;
    resourceName: string;
  } | null>(null);

  const { showToast } = useToast();

  const queueItems = [
    {
      id: 'req_101',
      requester: 'Dr. Sarah Chen',
      institution: 'Applied Tech',
      resourceName: 'Haas VF-2 CNC Vertical Mill',
      requestedSlot: 'Nov 04, 2026 (09:00 - 15:00 UTC)',
      purpose: 'Fabricating aluminum heat sink brackets for nano-satellite payload.',
      eligibility: 'PASSED (6/6 checks verified)',
      submittedAt: '2 hours ago',
    },
    {
      id: 'req_102',
      requester: 'Michael Chang',
      institution: 'Metropolitan Univ',
      resourceName: 'Epilog Fusion Pro Laser Cutter',
      requestedSlot: 'Nov 05, 2026 (14:00 - 17:00 UTC)',
      purpose: 'Precision engraving of acrylic microfluidic manifolds.',
      eligibility: 'WARNING: Safety module expires in 3 days',
      submittedAt: '4 hours ago',
    },
  ];

  const handleConfirmDecision = (reason: string, _conditions?: string) => {
    if (!selectedAction) return;

    showToast({
      type: 'success',
      title: `Request ${selectedAction.type === 'approve' ? 'Approved' : selectedAction.type === 'reject' ? 'Rejected' : 'Waitlisted'}`,
      message: `Logged immutable audit event with rationale: "${reason}"`,
    });

    setSelectedAction(null);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h1 className="text-xl font-black text-slate-900">Review Queue</h1>
            <DemoTag />
          </div>
          <p className="text-xs text-slate-500">
            Ordered strictly FIFO (<code className="bg-slate-100 px-1 py-0.5 rounded text-[11px]">created_at ASC</code>). Documented rationale required for all actions.
          </p>
        </div>
      </div>

      <div className="space-y-4">
        {queueItems.map((item) => (
          <div key={item.id} className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3 border-b border-slate-100 pb-3">
              <div>
                <span className="text-[10px] text-slate-400 font-mono block">REQUEST #{item.id}</span>
                <h3 className="font-bold text-slate-900 text-base">{item.resourceName}</h3>
                <p className="text-xs text-slate-500">
                  Requester: <span className="font-medium text-slate-800">{item.requester}</span> ({item.institution})
                </p>
              </div>

              <div className="text-right">
                <span className="text-xs font-semibold text-slate-700 block">{item.requestedSlot}</span>
                <span className="text-[11px] text-slate-400">Received {item.submittedAt}</span>
              </div>
            </div>

            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 text-xs text-slate-700 mb-4">
              <p className="font-semibold text-slate-800 mb-0.5">Project Scope / Justification:</p>
              <p className="leading-relaxed">{item.purpose}</p>
              <div className="mt-2 pt-2 border-t border-slate-200/60 flex items-center gap-1.5 text-emerald-700 font-semibold text-[11px]">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                <span>Eligibility Engine: {item.eligibility}</span>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2">
              <button
                onClick={() =>
                  setSelectedAction({
                    type: 'reject',
                    requestId: item.id,
                    resourceName: item.resourceName,
                  })
                }
                className="px-3.5 py-2 text-xs font-semibold text-red-700 hover:bg-red-50 border border-red-200 rounded-xl transition-colors flex items-center gap-1"
              >
                <XCircle className="w-3.5 h-3.5" />
                <span>Reject</span>
              </button>

              <button
                onClick={() =>
                  setSelectedAction({
                    type: 'waitlist',
                    requestId: item.id,
                    resourceName: item.resourceName,
                  })
                }
                className="px-3.5 py-2 text-xs font-semibold text-purple-700 hover:bg-purple-50 border border-purple-200 rounded-xl transition-colors flex items-center gap-1"
              >
                <AlertTriangle className="w-3.5 h-3.5" />
                <span>FIFO Waitlist</span>
              </button>

              <button
                onClick={() =>
                  setSelectedAction({
                    type: 'approve',
                    requestId: item.id,
                    resourceName: item.resourceName,
                  })
                }
                className="px-4 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-xs transition-colors flex items-center gap-1"
              >
                <CheckCircle className="w-3.5 h-3.5" />
                <span>Approve Slot</span>
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Mandatory Reason Dialog */}
      {selectedAction && (
        <ReasonDialog
          isOpen={true}
          title={`${selectedAction.type === 'approve' ? 'Approve' : selectedAction.type === 'reject' ? 'Reject' : 'Waitlist'} Request #${selectedAction.requestId}`}
          actionLabel={selectedAction.type === 'approve' ? 'Confirm Approval' : selectedAction.type === 'reject' ? 'Confirm Rejection' : 'Confirm Waitlist Placement'}
          actionVariant={selectedAction.type === 'approve' ? 'success' : selectedAction.type === 'reject' ? 'danger' : 'warning'}
          onConfirm={handleConfirmDecision}
          onClose={() => setSelectedAction(null)}
        />
      )}
    </div>
  );
}
