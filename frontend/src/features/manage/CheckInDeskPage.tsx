import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowLeft,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  QrCode,
  ShieldAlert,
  User,
  RefreshCw,
} from 'lucide-react';
import { StatusBadge } from '../../components/feedback/StatusBadge';
import { DemoTag } from '../../components/feedback/DemoTag';
import { useToast } from '../../context/ToastContext';
import {
  fetchDeskBookings,
  confirmReturn,
  markNoShow,
  type DeskBookingItem,
} from '../../api/manage.api';

export function CheckInDeskPage() {
  const { showToast } = useToast();
  const [arriving, setArriving] = useState<DeskBookingItem[]>([]);
  const [dueBack, setDueBack] = useState<DeskBookingItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Return Confirmation Modal state
  const [returnModal, setReturnModal] = useState<DeskBookingItem | null>(null);
  const [returnNotes, setReturnNotes] = useState('');
  const [isSubmittingReturn, setIsSubmittingReturn] = useState(false);

  // Flag Issue Modal state
  const [flagModal, setFlagModal] = useState<DeskBookingItem | null>(null);
  const [issueFindings, setIssueFindings] = useState('');
  const [isSubmittingFlag, setIsSubmittingFlag] = useState(false);

  useEffect(() => {
    let isMounted = true;
    async function loadDesk() {
      setIsLoading(true);
      try {
        const data = await fetchDeskBookings();
        if (isMounted) {
          setArriving(data.arrivingToday);
          setDueBack(data.dueBackToday);
        }
      } catch (err) {
        console.error('Failed to load desk bookings', err);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }
    loadDesk();
    return () => {
      isMounted = false;
    };
  }, []);

  const handleConfirmReturn = async () => {
    if (!returnModal) return;
    setIsSubmittingReturn(true);
    try {
      await confirmReturn(returnModal.id, {
        action: 'CONFIRM',
        notes: returnNotes.trim() || 'Verified by manager on desk.',
      });
      showToast({
        type: 'success',
        title: 'Return confirmed & equipment released.',
      });
      setDueBack(dueBack.filter((b) => b.id !== returnModal.id));
      setReturnModal(null);
      setReturnNotes('');
    } catch {
      showToast({
        type: 'error',
        title: 'Failed to confirm return.',
      });
    } finally {
      setIsSubmittingReturn(false);
    }
  };

  const handleFlagIssue = async () => {
    if (!flagModal || !issueFindings.trim()) return;
    setIsSubmittingFlag(true);
    try {
      await confirmReturn(flagModal.id, {
        action: 'FLAG_INCIDENT',
        findings: issueFindings.trim(),
      });
      showToast({
        type: 'warning',
        title: 'Incident report generated and routed for technician investigation.',
      });
      setDueBack(dueBack.filter((b) => b.id !== flagModal.id));
      setFlagModal(null);
      setIssueFindings('');
    } catch {
      showToast({
        type: 'error',
        title: 'Failed to record incident.',
      });
    } finally {
      setIsSubmittingFlag(false);
    }
  };

  const handleMarkNoShow = async (bookingId: string) => {
    if (!window.confirm('Mark this reservation as No-Show? Late penalty tokens will apply.')) return;
    try {
      await markNoShow(bookingId);
      showToast({
        type: 'info',
        title: 'Reservation marked as NO_SHOW.',
      });
      setArriving(arriving.filter((b) => b.id !== bookingId));
    } catch {
      showToast({
        type: 'error',
        title: 'Failed to mark no-show.',
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <Link
          to="/manage/dashboard"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-blue-600 mb-3 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Back to Operations Dashboard
        </Link>
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h1 className="text-2xl font-black text-slate-900 tracking-tight">
                Check-In & Returns Desk
              </h1>
              <DemoTag label="Hardware Concierge" />
            </div>
            <p className="text-xs text-slate-500">
              Stationary desk terminal for laboratory assistants and facility staff to facilitate handovers, verify return cleanliness, and record incidents.
            </p>
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="py-16 flex flex-col items-center justify-center text-slate-400 gap-2">
          <RefreshCw className="w-6 h-6 animate-spin text-blue-600" />
          <span className="text-xs">Loading arrival and departure schedules...</span>
        </div>
      ) : (
        /* Two-Column Layout (Spec §6.4) */
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* COLUMN 1: ARRIVING TODAY */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <QrCode className="w-4 h-4 text-blue-600" />
                  Arriving Today (Check-In Queue)
                </h3>
                <span className="text-[11px] text-slate-400">
                  {arriving.length} users scheduled to begin runs today
                </span>
              </div>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700">
                Arrivals
              </span>
            </div>

            {arriving.length === 0 ? (
              <div className="py-12 text-center text-slate-400 text-xs italic">
                No scheduled check-ins remaining today.
              </div>
            ) : (
              <div className="space-y-3">
                {arriving.map((bk) => (
                  <div
                    key={bk.id}
                    className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3 hover:border-slate-300 transition-all"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <StatusBadge status={bk.status} />
                          <span className="text-[10px] font-mono text-slate-400">ID: {bk.id}</span>
                        </div>
                        <h4 className="text-xs font-bold text-slate-900">{bk.resourceName}</h4>
                        <span className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5">
                          <User className="w-3 h-3 text-slate-400" />
                          {bk.requesterName} • {bk.facilityName}
                        </span>
                      </div>

                      <div className="text-right text-xs">
                        <span className="font-bold text-slate-800 block">
                          {new Date(bk.startAt).toLocaleTimeString('en-US', {
                            hour: '2-digit',
                            minute: '2-digit',
                            timeZone: 'UTC',
                          })}{' '}
                          UTC
                        </span>
                        <span className="text-[10px] text-slate-400">
                          to{' '}
                          {new Date(bk.endAt).toLocaleTimeString('en-US', {
                            hour: '2-digit',
                            minute: '2-digit',
                            timeZone: 'UTC',
                          })}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-slate-200/60">
                      <button
                        type="button"
                        onClick={() => handleMarkNoShow(bk.id)}
                        className="text-[11px] font-semibold text-slate-500 hover:text-red-600 transition-colors"
                      >
                        Mark No-Show
                      </button>

                      <Link
                        to={`/bookings/${bk.id}/checkin`}
                        className="px-3.5 py-1.5 text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-xl transition-colors flex items-center gap-1 shadow-2xs"
                      >
                        <QrCode className="w-3.5 h-3.5" />
                        <span>Assist Check-In</span>
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* COLUMN 2: DUE BACK TODAY */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <RotateCcw className="w-4 h-4 text-emerald-600" />
                  Due Back Today (Returns & Inspection)
                </h3>
                <span className="text-[11px] text-slate-400">
                  {dueBack.length} active sessions concluding today
                </span>
              </div>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700">
                Returns
              </span>
            </div>

            {dueBack.length === 0 ? (
              <div className="py-12 text-center text-slate-400 text-xs italic">
                All scheduled equipment has been verified and returned.
              </div>
            ) : (
              <div className="space-y-3">
                {dueBack.map((bk) => (
                  <div
                    key={bk.id}
                    className={`p-4 rounded-xl border space-y-3 transition-all ${
                      bk.isOverdue
                        ? 'bg-amber-50/70 border-amber-300'
                        : 'bg-slate-50 border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <StatusBadge status={bk.status} />
                          {bk.isOverdue && (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-100 text-red-800">
                              Overdue Return
                            </span>
                          )}
                          <span className="text-[10px] font-mono text-slate-400">ID: {bk.id}</span>
                        </div>
                        <h4 className="text-xs font-bold text-slate-900">{bk.resourceName}</h4>
                        <span className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5">
                          <User className="w-3 h-3 text-slate-400" />
                          {bk.requesterName} • {bk.facilityName}
                        </span>
                      </div>

                      <div className="text-right text-xs">
                        <span className="font-bold text-slate-800 block">
                          End:{' '}
                          {new Date(bk.endAt).toLocaleTimeString('en-US', {
                            hour: '2-digit',
                            minute: '2-digit',
                            timeZone: 'UTC',
                          })}{' '}
                          UTC
                        </span>
                        <span className="text-[10px] text-slate-400">
                          Initial: {bk.conditionBeforeRating || 5}/5 stars
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200/60">
                      <button
                        type="button"
                        onClick={() => setFlagModal(bk)}
                        className="px-3 py-1.5 text-xs font-bold text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded-xl transition-colors flex items-center gap-1"
                      >
                        <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                        <span>Flag Issue</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setReturnModal(bk)}
                        className="px-3.5 py-1.5 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl transition-colors flex items-center gap-1 shadow-2xs"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Confirm Return</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Confirm Return Modal */}
      {returnModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-2 text-emerald-600">
              <CheckCircle2 className="w-5 h-5" />
              <h3 className="text-base font-bold text-slate-900">
                Confirm Return & Cleanliness
              </h3>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Verify that {returnModal.resourceName} was returned in acceptable working condition, accessories were accounted for, and no active error states persist.
            </p>

            <div className="space-y-1">
              <label htmlFor="deskManagerNotes" className="block text-xs font-semibold text-slate-700">Manager Verification Notes (Optional)</label>
              <textarea
                id="deskManagerNotes"
                rows={3}
                value={returnNotes}
                onChange={(e) => setReturnNotes(e.target.value)}
                placeholder="Inspected by staff. Build surface clean, tools returned..."
                className="w-full text-xs p-3 border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setReturnModal(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmReturn}
                disabled={isSubmittingReturn}
                className="px-5 py-2 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-xs disabled:opacity-40"
              >
                {isSubmittingReturn ? 'Confirming...' : 'Approve Return'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Flag Issue Modal */}
      {flagModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-2 text-amber-600">
              <ShieldAlert className="w-5 h-5" />
              <h3 className="text-base font-bold text-slate-900">
                Flag Damage or Missing Tool
              </h3>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Generating an incident note logs an immutable audit event and holds the user's return deposit until resolved by a technician.
            </p>

            <div className="space-y-1">
              <label htmlFor="findingsTextarea" className="block text-xs font-semibold text-slate-700">Findings & Damage Description</label>
              <textarea
                id="findingsTextarea"
                rows={4}
                required
                value={issueFindings}
                onChange={(e) => setIssueFindings(e.target.value)}
                placeholder="Detail the issue: e.g. Broken nozzle, missing scraper, deep bed gouge..."
                className="w-full text-xs p-3 border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setFlagModal(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleFlagIssue}
                disabled={!issueFindings.trim() || isSubmittingFlag}
                className="px-5 py-2 text-xs font-bold bg-amber-600 hover:bg-amber-700 text-white rounded-xl shadow-xs disabled:opacity-40"
              >
                {isSubmittingFlag ? 'Logging Issue...' : 'Flag & Record Incident'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
