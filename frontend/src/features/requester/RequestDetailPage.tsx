import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  ArrowLeft,
  Clock,
  MessageSquare,
  AlertTriangle,
  Send,
  Scale,
  Calendar,
  XCircle,
  RefreshCw,
  Building2,
} from 'lucide-react';
import { StatusBadge } from '../../components/feedback/StatusBadge';
import { DemoTag } from '../../components/feedback/DemoTag';
import { StatusTimeline } from '../../components/requester/StatusTimeline';
import { useToast } from '../../context/ToastContext';
import {
  fetchRequestById,
  respondToReviewer,
  appealRequest,
  cancelRequest,
  type AccessRequestDetail,
} from '../../api/accessRequests.api';

export function RequestDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { showToast } = useToast();

  const [request, setRequest] = useState<AccessRequestDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [replyMessage, setReplyMessage] = useState('');
  const [isSendingReply, setIsSendingReply] = useState(false);

  // Appeal Modal state
  const [showAppealModal, setShowAppealModal] = useState(false);
  const [appealJustification, setAppealJustification] = useState('');
  const [isSubmittingAppeal, setIsSubmittingAppeal] = useState(false);

  // Cancel Request state
  const [isCancelling, setIsCancelling] = useState(false);

  useEffect(() => {
    let isMounted = true;
    async function loadData() {
      if (!id) return;
      setIsLoading(true);
      try {
        const data = await fetchRequestById(id);
        if (isMounted) setRequest(data);
      } catch (err) {
        console.error('Failed to load request detail', err);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }
    loadData();
    return () => {
      isMounted = false;
    };
  }, [id]);

  const handleSendReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id || !replyMessage.trim()) return;
    setIsSendingReply(true);
    try {
      await respondToReviewer(id, replyMessage.trim());
      showToast({
        type: 'success',
        title: 'Response sent to reviewer.',
      });

      // Add to local message list for instant feedback
      if (request) {
        setRequest({
          ...request,
          messages: [
            ...(request.messages || []),
            {
              id: `msg-rep-${Date.now()}`,
              sender: 'REQUESTER',
              senderName: 'You (Researcher)',
              message: replyMessage.trim(),
              timestamp: new Date().toISOString(),
            },
          ],
        });
      }
      setReplyMessage('');
    } catch {
      showToast({
        type: 'error',
        title: 'Failed to send response.',
      });
    } finally {
      setIsSendingReply(false);
    }
  };

  const handleSubmitAppeal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id || !appealJustification.trim()) return;
    setIsSubmittingAppeal(true);
    try {
      await appealRequest(id, appealJustification.trim());
      showToast({
        type: 'success',
        title: 'Appeal submitted for administrative review.',
      });
      setShowAppealModal(false);
      setAppealJustification('');
      if (request) {
        setRequest({
          ...request,
          status: 'UNDER_REVIEW',
        });
      }
    } catch {
      showToast({
        type: 'error',
        title: 'Failed to submit appeal.',
      });
    } finally {
      setIsSubmittingAppeal(false);
    }
  };

  const handleCancelRequest = async () => {
    if (!id) return;
    if (!window.confirm('Are you sure you want to cancel this access request?')) return;
    setIsCancelling(true);
    try {
      await cancelRequest(id, 'Cancelled by requester');
      showToast({
        type: 'info',
        title: 'Access request has been cancelled.',
      });
      if (request) {
        setRequest({
          ...request,
          status: 'CANCELLED',
        });
      }
    } catch {
      showToast({
        type: 'error',
        title: 'Failed to cancel request.',
      });
    } finally {
      setIsCancelling(false);
    }
  };

  if (isLoading || !request) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16 flex flex-col items-center justify-center text-slate-400 gap-3">
        <RefreshCw className="w-8 h-8 animate-spin text-blue-600" />
        <span className="text-sm font-medium">Loading access request details...</span>
      </div>
    );
  }

  const isPending = request.status === 'SUBMITTED' || request.status === 'UNDER_REVIEW';
  const isRejectedOrWaitlisted = request.status === 'REJECTED' || request.status === 'WAITLISTED';

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
      {/* Top Breadcrumb Navigation */}
      <div>
        <Link
          to="/dashboard"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-blue-600 mb-3 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Back to Dashboard
        </Link>

        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5 mb-1">
              <h1 className="text-2xl font-black text-slate-900 tracking-tight">
                Access Request #{request.id}
              </h1>
              <StatusBadge status={request.status} />
              <DemoTag label="Audited" />
            </div>
            <p className="text-xs text-slate-500">
              Submitted on{' '}
              {new Date(request.created_at || Date.now()).toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
              })}
            </p>
          </div>

          {isPending && (
            <button
              type="button"
              onClick={handleCancelRequest}
              disabled={isCancelling}
              className="px-3.5 py-1.5 text-xs font-bold text-red-600 bg-red-50 hover:bg-red-100 rounded-xl transition-colors flex items-center gap-1.5 border border-red-200"
            >
              <XCircle className="w-3.5 h-3.5" />
              <span>Cancel Request</span>
            </button>
          )}
        </div>
      </div>

      {/* "What Happens Next" Explanatory Box (Spec §5.8) */}
      <div className="p-4 bg-blue-50 border border-blue-200 rounded-2xl flex items-start gap-3">
        <Clock className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <h4 className="text-xs font-bold uppercase tracking-wider text-blue-900">
            What Happens Next?
          </h4>
          <p className="text-xs text-blue-800 leading-relaxed">
            {request.status === 'SUBMITTED'
              ? 'Your request has entered the facility intake queue. An equipment reviewer will verify training certification and review your material hazards within 24 hours.'
              : request.status === 'UNDER_REVIEW'
              ? `${request.reviewerName || 'A facility manager'} is currently reviewing your project statement and safety declarations. Expected response: within ${request.expectedTurnaroundHours || 24} hours.`
              : request.status === 'APPROVED'
              ? 'Your reservation is confirmed! Unlocked access credentials (door PIN, lab Wi-Fi, and startup instructions) are now accessible on your pass.'
              : request.status === 'WAITLISTED'
              ? `You are currently in waitlist queue position #${request.waitlistPosition || 1}. You will be auto-promoted if a prior reservation is cancelled or rescheduled.`
              : 'This request was not approved. You have the right to file an administrative appeal below.'}
          </p>
        </div>
      </div>

      {/* Decision Box (If Rejected or Waitlisted) with Appeal CTA */}
      {isRejectedOrWaitlisted && (
        <div className="p-5 bg-amber-50 border-2 border-amber-300 rounded-2xl space-y-3 shadow-xs">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-2.5">
              <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <h4 className="text-xs font-bold text-amber-900 uppercase tracking-wider">
                  Reviewer Decision Notice
                </h4>
                <p className="text-xs font-medium text-amber-800 mt-1 leading-relaxed">
                  Reason:{' '}
                  <strong className="text-amber-950">
                    {request.decisionReason || 'Schedule capacity constraint during peak operational window.'}
                  </strong>
                </p>
                {request.decisionBy && (
                  <span className="text-[11px] text-amber-700 block mt-0.5">
                    Decided by: {request.decisionBy}
                  </span>
                )}
              </div>
            </div>

            <button
              type="button"
              onClick={() => setShowAppealModal(true)}
              className="px-4 py-2 text-xs font-bold bg-amber-600 hover:bg-amber-700 text-white rounded-xl transition-colors flex items-center gap-1.5 shadow-xs shrink-0"
            >
              <Scale className="w-3.5 h-3.5" />
              <span>Appeal This Decision</span>
            </button>
          </div>
        </div>
      )}

      {/* Main Grid: Details + Messages */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Request Details & Reviewer Messages */}
        <div className="lg:col-span-2 space-y-6">
          {/* Resource & Schedule Card */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-4">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Building2 className="w-4 h-4 text-blue-600" />
              Equipment & Operating Parameters
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div>
                <span className="text-slate-400 block mb-0.5">Target Resource:</span>
                <span className="font-bold text-slate-900 text-sm">
                  {request.resourceName || 'Laboratory Instrument'}
                </span>
              </div>

              <div>
                <span className="text-slate-400 block mb-0.5">Facility Location:</span>
                <span className="font-semibold text-slate-800">
                  {request.facilityName || 'Central Laboratory Facility'}
                </span>
              </div>

              <div>
                <span className="text-slate-400 block mb-0.5">Requested Access Mode:</span>
                <span className="font-bold text-blue-600">{request.access_mode}</span>
              </div>

              <div>
                <span className="text-slate-400 block mb-0.5">Requested Window:</span>
                <span className="font-semibold text-slate-800">
                  {request.start_at && request.end_at ? (
                    <>
                      {new Date(request.start_at).toLocaleDateString('en-US', {
                        weekday: 'short',
                        month: 'short',
                        day: 'numeric',
                      })}{' '}
                      •{' '}
                      {new Date(request.start_at).toLocaleTimeString('en-US', {
                        hour: '2-digit',
                        minute: '2-digit',
                        timeZone: 'UTC',
                      })}{' '}
                      -{' '}
                      {new Date(request.end_at).toLocaleTimeString('en-US', {
                        hour: '2-digit',
                        minute: '2-digit',
                        timeZone: 'UTC',
                      })}{' '}
                      UTC
                    </>
                  ) : (
                    'Unscheduled / Waitlist Intake'
                  )}
                </span>
              </div>
            </div>

            {request.purpose && (
              <div className="pt-3 border-t border-slate-100 text-xs">
                <span className="text-slate-400 block mb-1">Declared Project Statement:</span>
                <p className="p-3 bg-slate-50 border border-slate-200/60 rounded-xl text-slate-700 leading-relaxed italic">
                  "{request.purpose}"
                </p>
              </div>
            )}
          </div>

          {/* Reviewer Q&A Dialogue Thread (Spec §5.8 Section 2.1) */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-blue-600" />
                Reviewer Correspondence & Clarifications
              </h3>
              <span className="text-[11px] text-slate-400 font-semibold">
                {request.messages?.length || 0} message(s)
              </span>
            </div>

            <div className="space-y-3">
              {(!request.messages || request.messages.length === 0) ? (
                <div className="py-6 text-center text-slate-400 text-xs italic">
                  No clarification questions have been posted by the reviewer.
                </div>
              ) : (
                request.messages.map((msg) => {
                  const isReviewer = msg.sender === 'REVIEWER';
                  return (
                    <div
                      key={msg.id}
                      className={`p-3.5 rounded-2xl text-xs space-y-1.5 ${
                        isReviewer
                          ? 'bg-amber-50/70 border border-amber-200 text-amber-950 mr-8'
                          : 'bg-blue-50/70 border border-blue-200 text-blue-950 ml-8'
                      }`}
                    >
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="font-bold">
                          {isReviewer ? `Reviewer (${msg.senderName || 'Staff'})` : 'You (Researcher)'}
                        </span>
                        <span className="text-slate-400">
                          {new Date(msg.timestamp).toLocaleTimeString('en-US', {
                            hour: '2-digit',
                            minute: '2-digit',
                            timeZone: 'UTC',
                          })}{' '}
                          UTC
                        </span>
                      </div>
                      <p className="leading-relaxed">{msg.message}</p>
                    </div>
                  );
                })
              )}
            </div>

            {/* Inline Reply Form */}
            {isPending && (
              <form onSubmit={handleSendReply} className="pt-2 flex items-center gap-2">
                <input
                  type="text"
                  placeholder="Reply to reviewer with requested clarification..."
                  value={replyMessage}
                  onChange={(e) => setReplyMessage(e.target.value)}
                  className="flex-1 text-xs px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
                />
                <button
                  type="submit"
                  disabled={!replyMessage.trim() || isSendingReply}
                  className="px-4 py-2.5 text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-xl transition-colors flex items-center gap-1.5 shadow-xs disabled:opacity-40 shrink-0"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Send</span>
                </button>
              </form>
            )}
          </div>
        </div>

        {/* Right Column: Vertical Audit Timeline */}
        <div className="space-y-6">
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-4">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Calendar className="w-4 h-4 text-emerald-600" />
              Lifecycle Audit Timeline
            </h3>

            <StatusTimeline timeline={request.auditTimeline || []} />
          </div>
        </div>
      </div>

      {/* Appeal Justification Modal */}
      {showAppealModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-2 text-amber-600">
              <Scale className="w-5 h-5" />
              <h3 className="text-base font-bold text-slate-900">
                Appeal Access Request Decision
              </h3>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Institutional policy allows one appeal per request. Please provide research justification, urgent grant deadlines, or modified operating parameters.
            </p>

            <form onSubmit={handleSubmitAppeal} className="space-y-3">
              <textarea
                rows={4}
                required
                value={appealJustification}
                onChange={(e) => setAppealJustification(e.target.value)}
                placeholder="State why this decision should be re-evaluated..."
                className="w-full text-xs p-3.5 border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-amber-500"
              />

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAppealModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!appealJustification.trim() || isSubmittingAppeal}
                  className="px-4 py-2 text-xs font-bold bg-amber-600 hover:bg-amber-700 text-white rounded-xl transition-colors shadow-xs disabled:opacity-40"
                >
                  {isSubmittingAppeal ? 'Submitting...' : 'Submit Appeal'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

