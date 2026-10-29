import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  ArrowLeft,
  CheckCircle2,
  XCircle,
  Clock,
  ShieldAlert,
  User,
  Scale,
  MessageSquare,
  RefreshCw,
  Building2,
  AlertTriangle,
} from 'lucide-react';
import { StatusBadge } from '../../components/feedback/StatusBadge';
import { DemoTag } from '../../components/feedback/DemoTag';
import { ReasonDialog } from '../../components/feedback/ReasonDialog';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import {
  fetchQueueItemById,
  submitReviewDecision,
  requestClarification,
  type QueueItem,
} from '../../api/manage.api';

export function ReviewDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { showToast } = useToast();

  const [item, setItem] = useState<QueueItem | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Decision Modal State
  const [decisionModal, setDecisionModal] = useState<{
    type: 'approve' | 'reject' | 'waitlist';
  } | null>(null);

  // Request Clarification Modal State
  const [showQuestionModal, setShowQuestionModal] = useState(false);
  const [questionText, setQuestionText] = useState('');
  const [isSendingQuestion, setIsSendingQuestion] = useState(false);

  // Manager Override state for failed checks
  const [overriddenChecks, setOverriddenChecks] = useState<string[]>([]);
  const [overrideRationale, setOverrideRationale] = useState<string>('');

  useEffect(() => {
    let isMounted = true;
    async function loadItem() {
      if (!id) return;
      setIsLoading(true);
      try {
        const data = await fetchQueueItemById(id);
        if (isMounted) setItem(data);
      } catch (err) {
        console.error('Failed to load review queue item', err);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }
    loadItem();
    return () => {
      isMounted = false;
    };
  }, [id]);

  if (isLoading || !item) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16 flex flex-col items-center justify-center text-slate-400 gap-3">
        <RefreshCw className="w-8 h-8 animate-spin text-blue-600" />
        <span className="text-sm font-medium">Loading applicant dossier and eligibility logs...</span>
      </div>
    );
  }

  // Strict No-Self-Approval Lockout check (Spec §6.2 Section 2.2)
  const isSelfRequest =
    (user?.id && user.id === item.requesterId) ||
    (user?.email && item.requesterEmail && user.email.toLowerCase() === item.requesterEmail.toLowerCase());

  const toggleOverride = (checkKey: string) => {
    if (overriddenChecks.includes(checkKey)) {
      setOverriddenChecks(overriddenChecks.filter((k) => k !== checkKey));
    } else {
      setOverriddenChecks([...overriddenChecks, checkKey]);
    }
  };

  const handleDecisionConfirm = async (reason: string, conditions?: string) => {
    if (!id || !decisionModal) return;

    try {
      const decisionMap: Record<'approve' | 'reject' | 'waitlist', 'APPROVE' | 'REJECT' | 'WAITLIST'> = {
        approve: 'APPROVE',
        reject: 'REJECT',
        waitlist: 'WAITLIST',
      };

      await submitReviewDecision(id, {
        decision: decisionMap[decisionModal.type],
        reason: reason.trim(),
        conditions: conditions?.trim(),
        overrideCheckKeys: overriddenChecks,
      });

      showToast({
        type: 'success',
        title: `Request ${decisionModal.type === 'approve' ? 'Approved' : decisionModal.type === 'reject' ? 'Rejected' : 'Moved to Waitlist'}`,
        message: 'Immutable audit record committed to blockchain ledger.',
      });

      setDecisionModal(null);
      navigate('/manage/queue');
    } catch {
      showToast({
        type: 'error',
        title: 'Failed to record decision.',
      });
    }
  };

  const handleSendQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id || !questionText.trim()) return;
    setIsSendingQuestion(true);
    try {
      await requestClarification(id, questionText.trim());
      showToast({
        type: 'info',
        title: 'Clarification inquiry dispatched to researcher.',
      });
      setShowQuestionModal(false);
      setQuestionText('');
      setItem({ ...item, status: 'UNDER_REVIEW' });
    } catch {
      showToast({
        type: 'error',
        title: 'Failed to send inquiry.',
      });
    } finally {
      setIsSendingQuestion(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
      {/* Top Header */}
      <div>
        <Link
          to="/manage/queue"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-blue-600 mb-3 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Back to Review Queue
        </Link>
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5 mb-1">
              <h1 className="text-2xl font-black text-slate-900 tracking-tight">
                Review Application #{item.id}
              </h1>
              <StatusBadge status={item.status} />
              <DemoTag label="Impartial Review" />
            </div>
            <p className="text-xs text-slate-500">
              Submitted {item.waitingHours} hours ago by {item.requesterName} ({item.requesterInstitution})
            </p>
          </div>
        </div>
      </div>

      {/* Strict Anti-Self-Approval UI Lockout Banner (Spec §6.2 Section 2.2) */}
      {isSelfRequest && (
        <div className="p-5 bg-red-50 border-2 border-red-300 rounded-2xl flex items-start gap-3 shadow-xs">
          <ShieldAlert className="w-6 h-6 text-red-600 shrink-0 mt-0.5" />
          <div>
            <h4 className="text-sm font-black text-red-900">
              Anti-Self-Approval Lockout Engaged
            </h4>
            <p className="text-xs text-red-800 mt-1 leading-relaxed">
              You cannot review or approve your own access request. Platform policy dictates that an independent facility manager, department chair, or administrative reviewer must adjudicate this application. Decision actions have been restricted.
            </p>
          </div>
        </div>
      )}

      {/* Dossier Grid: Applicant Profile + Instrument Parameters */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Applicant Profile */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-3">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2">
            <span className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
              <User className="w-4 h-4 text-blue-600" /> Researcher Profile
            </span>
            {item.isVerifiedResearcher ? (
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-50 text-blue-800 border border-blue-200 flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3 text-blue-600" /> Verified Affiliate
              </span>
            ) : (
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-50 text-amber-800">
                External / Pending
              </span>
            )}
          </div>

          <div className="space-y-1.5 text-xs">
            <div>
              <span className="text-slate-400 block">Full Name:</span>
              <span className="font-bold text-slate-900">{item.requesterName}</span>
            </div>
            <div>
              <span className="text-slate-400 block">Home Institution:</span>
              <span className="font-semibold text-slate-700">{item.requesterInstitution}</span>
            </div>
            {item.requesterEmail && (
              <div>
                <span className="text-slate-400 block">Institutional Email:</span>
                <span className="font-mono text-slate-600">{item.requesterEmail}</span>
              </div>
            )}
          </div>
        </div>

        {/* Target Instrument & Operational Window */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-3">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2">
            <span className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
              <Building2 className="w-4 h-4 text-emerald-600" /> Requested Resource
            </span>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
              {item.accessMode}
            </span>
          </div>

          <div className="space-y-1.5 text-xs">
            <div>
              <span className="text-slate-400 block">Equipment Name:</span>
              <span className="font-bold text-slate-900">{item.resourceName}</span>
            </div>
            <div>
              <span className="text-slate-400 block">Workstation Location:</span>
              <span className="font-semibold text-slate-700">{item.facilityName}</span>
            </div>
            <div>
              <span className="text-slate-400 block">Schedule Timeslot:</span>
              <span className="font-semibold text-slate-800">
                {new Date(item.requestedSlotStart).toLocaleDateString('en-US', {
                  weekday: 'short',
                  month: 'short',
                  day: 'numeric',
                })}{' '}
                •{' '}
                {new Date(item.requestedSlotStart).toLocaleTimeString('en-US', {
                  hour: '2-digit',
                  minute: '2-digit',
                  timeZone: 'UTC',
                })}{' '}
                -{' '}
                {new Date(item.requestedSlotEnd).toLocaleTimeString('en-US', {
                  hour: '2-digit',
                  minute: '2-digit',
                  timeZone: 'UTC',
                })}{' '}
                UTC
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Purpose & Declared Materials */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-4">
        <h3 className="text-sm font-bold text-slate-900">
          Experimental Project Statement & Outside Materials
        </h3>
        <p className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 italic leading-relaxed">
          "{item.purpose}"
        </p>

        {item.outsideMaterials && item.outsideMaterials.length > 0 && (
          <div className="pt-2 space-y-2">
            <span className="text-xs font-bold text-slate-800 block">Declared Materials:</span>
            <div className="flex flex-wrap gap-2">
              {item.outsideMaterials.map((m, idx) => (
                <div
                  key={idx}
                  className="p-2.5 rounded-xl border bg-slate-50 border-slate-200 text-xs flex items-center gap-2"
                >
                  <span className="font-bold text-slate-900">{m.name}</span>
                  {m.needsApproval && (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-900">
                      Hazard Review Needed
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* System Eligibility Checklist & Manager Override Section (Spec §6.2 Section 2.1) */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <Scale className="w-4 h-4 text-blue-600" />
            System Eligibility Evaluation (Deterministic Checks)
          </h3>
          <span className="text-[11px] font-semibold text-slate-400">
            Automated platform verification
          </span>
        </div>

        <div className="space-y-2.5">
          {(item.checks || []).map((check) => {
            const isPass = check.status === 'PASS';
            const isOverridden = overriddenChecks.includes(check.key);

            return (
              <div
                key={check.key}
                className={`p-3.5 rounded-xl border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 ${
                  isPass
                    ? 'bg-emerald-50/50 border-emerald-200 text-emerald-950'
                    : isOverridden
                    ? 'bg-amber-50/80 border-amber-300 text-amber-950'
                    : 'bg-red-50/60 border-red-200 text-red-950'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  {isPass ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  ) : isOverridden ? (
                    <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                  ) : (
                    <XCircle className="w-4 h-4 text-red-600 shrink-0" />
                  )}
                  <div>
                    <span className="text-xs font-bold block">{check.label}</span>
                    {check.reason && (
                      <span className="text-[11px] opacity-80 block">{check.reason}</span>
                    )}
                  </div>
                </div>

                {!isPass && !isSelfRequest && (
                  <label className="flex items-center gap-2 text-xs font-semibold cursor-pointer shrink-0">
                    <input
                      type="checkbox"
                      checked={isOverridden}
                      onChange={() => toggleOverride(check.key)}
                      className="rounded border-slate-300 text-amber-600 focus:ring-amber-500"
                    />
                    <span className="text-amber-900">
                      {isOverridden ? 'Manager Overridden' : 'Apply Manager Override'}
                    </span>
                  </label>
                )}
              </div>
            );
          })}
        </div>

        {overriddenChecks.length > 0 && (
          <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-xl space-y-2">
            <span className="text-xs font-bold text-amber-900 block">
              Documented Override Justification (Audited):
            </span>
            <input
              type="text"
              required
              placeholder="e.g., Operator will be directly supervised by senior post-doc Dr. Lin..."
              value={overrideRationale}
              onChange={(e) => setOverrideRationale(e.target.value)}
              className="w-full text-xs p-2.5 bg-white border border-amber-300 rounded-lg outline-none focus:ring-2 focus:ring-amber-500"
            />
          </div>
        )}
      </div>

      {/* Decision Action Toolbar (Hidden if Self-Request) */}
      {!isSelfRequest ? (
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowQuestionModal(true)}
              className="px-4 py-2.5 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors flex items-center gap-1.5"
            >
              <MessageSquare className="w-3.5 h-3.5 text-blue-600" />
              <span>Request Info</span>
            </button>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              type="button"
              onClick={() => setDecisionModal({ type: 'reject' })}
              className="flex-1 sm:flex-initial px-4 py-2.5 text-xs font-bold text-red-700 bg-red-50 hover:bg-red-100 border border-red-200 rounded-xl transition-colors flex items-center justify-center gap-1.5"
            >
              <XCircle className="w-3.5 h-3.5 text-red-600" />
              <span>Reject Request</span>
            </button>

            <button
              type="button"
              onClick={() => setDecisionModal({ type: 'waitlist' })}
              className="flex-1 sm:flex-initial px-4 py-2.5 text-xs font-bold text-purple-700 bg-purple-50 hover:bg-purple-100 border border-purple-200 rounded-xl transition-colors flex items-center justify-center gap-1.5"
            >
              <Clock className="w-3.5 h-3.5 text-purple-600" />
              <span>Move to Waitlist</span>
            </button>

            <button
              type="button"
              onClick={() => setDecisionModal({ type: 'approve' })}
              className="flex-1 sm:flex-initial px-6 py-2.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl transition-colors flex items-center justify-center gap-1.5 shadow-xs"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Approve Access</span>
            </button>
          </div>
        </div>
      ) : (
        <div className="text-center text-xs text-slate-400 italic">
          Action controls locked due to anti-self-approval rule.
        </div>
      )}

      {/* Decision Rationale Modal with ReasonDialog */}
      <ReasonDialog
        isOpen={Boolean(decisionModal)}
        title={
          decisionModal?.type === 'approve'
            ? 'Confirm Approval Decision'
            : decisionModal?.type === 'reject'
            ? 'Mandatory Rejection Rationale'
            : 'Move to FIFO Waitlist Queue'
        }
        actionLabel={
          decisionModal?.type === 'approve'
            ? 'Confirm Approval'
            : decisionModal?.type === 'reject'
            ? 'Confirm Rejection'
            : 'Move to Waitlist'
        }
        actionVariant={
          decisionModal?.type === 'approve'
            ? 'success'
            : decisionModal?.type === 'reject'
            ? 'danger'
            : 'warning'
        }
        onConfirm={handleDecisionConfirm}
        onClose={() => setDecisionModal(null)}
      />

      {/* Clarification Inquiry Modal */}
      {showQuestionModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-2 text-blue-600">
              <MessageSquare className="w-5 h-5" />
              <h3 className="text-base font-bold text-slate-900">
                Request Clarification from Applicant
              </h3>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Inquire regarding material specifications, project protocol, or scheduling flexibility. The applicant will be notified to respond directly.
            </p>

            <form onSubmit={handleSendQuestion} className="space-y-3">
              <textarea
                rows={4}
                required
                value={questionText}
                onChange={(e) => setQuestionText(e.target.value)}
                placeholder="Type your question or clarification request..."
                className="w-full text-xs p-3.5 border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-blue-500"
              />

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowQuestionModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!questionText.trim() || isSendingQuestion}
                  className="px-4 py-2 text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-xs disabled:opacity-40"
                >
                  {isSendingQuestion ? 'Sending...' : 'Send Inquiry'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
