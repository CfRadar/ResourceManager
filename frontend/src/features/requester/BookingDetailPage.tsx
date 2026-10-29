import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  ArrowLeft,
  Clock,
  MapPin,
  QrCode,
  KeyRound,
  Wifi,
  ShieldAlert,
  AlertTriangle,
  RotateCcw,
  XCircle,
  FileText,
  CheckCircle2,
  RefreshCw,
  Download,
} from 'lucide-react';
import { StatusBadge } from '../../components/feedback/StatusBadge';
import { DemoTag } from '../../components/feedback/DemoTag';
import { useCountdown } from '../../hooks/useCountdown';
import { useToast } from '../../context/ToastContext';
import {
  fetchBookingById,
  cancelBooking,
  rescheduleBooking,
  type BookingRecord,
} from '../../api/bookings.api';

export function BookingDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { showToast } = useToast();

  const [booking, setBooking] = useState<BookingRecord | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Cancellation Modal state
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [isCancelling, setIsCancelling] = useState(false);

  // Reschedule Modal state
  const [showRescheduleModal, setShowRescheduleModal] = useState(false);
  const [newDate, setNewDate] = useState('');
  const [newTime, setNewTime] = useState('10:00');
  const [isRescheduling, setIsRescheduling] = useState(false);

  useEffect(() => {
    let isMounted = true;
    async function loadData() {
      if (!id) return;
      setIsLoading(true);
      try {
        const data = await fetchBookingById(id);
        if (isMounted) setBooking(data);
      } catch (err) {
        console.error('Failed to load booking detail', err);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }
    loadData();
    return () => {
      isMounted = false;
    };
  }, [id]);

  const countdown = useCountdown(booking?.startAt || null);

  const handleCancelBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id || !cancelReason.trim()) return;
    setIsCancelling(true);
    try {
      await cancelBooking(id, { reason: cancelReason.trim() });
      showToast({
        type: 'info',
        title: 'Booking cancelled.',
      });
      setShowCancelModal(false);
      if (booking) {
        setBooking({ ...booking, status: 'CANCELLED' });
      }
    } catch {
      showToast({
        type: 'error',
        title: 'Failed to cancel booking.',
      });
    } finally {
      setIsCancelling(false);
    }
  };

  const handleRescheduleBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id || !newDate || !newTime) return;
    setIsRescheduling(true);
    const startStr = `${newDate}T${newTime}:00.000Z`;
    const endStr = new Date(new Date(startStr).getTime() + 4 * 3600000).toISOString();

    try {
      await rescheduleBooking(id, {
        newStartAt: startStr,
        newEndAt: endStr,
        reason: 'Requested by user via self-service rescheduling.',
      });
      showToast({
        type: 'success',
        title: 'Booking successfully rescheduled!',
      });
      setShowRescheduleModal(false);
      if (booking) {
        setBooking({
          ...booking,
          startAt: startStr,
          endAt: endStr,
        });
      }
    } catch {
      showToast({
        type: 'error',
        title: 'Slot unavailable or reschedule limit exceeded.',
      });
    } finally {
      setIsRescheduling(false);
    }
  };

  if (isLoading || !booking) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16 flex flex-col items-center justify-center text-slate-400 gap-3">
        <RefreshCw className="w-8 h-8 animate-spin text-blue-600" />
        <span className="text-sm font-medium">Loading confirmed booking & access pass...</span>
      </div>
    );
  }

  const isCheckInEligible =
    booking.status === 'SCHEDULED' && (countdown.isImminent || countdown.isStarted);

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
                Access Pass & Booking #{booking.id}
              </h1>
              <StatusBadge status={booking.status} />
              <DemoTag label="Active Pass" />
            </div>
            <p className="text-xs text-slate-500">
              {booking.resourceName} • {booking.facilityName} ({booking.room})
            </p>
          </div>

          <div className="flex items-center gap-2">
            <a
              href={`http://localhost:5000/api/v1/bookings/${booking.id}/calendar.ics`}
              download
              className="px-3.5 py-1.5 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors flex items-center gap-1.5"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Add to Calendar (.ICS)</span>
            </a>
          </div>
        </div>
      </div>

      {/* Live Countdown Banner (Spec §5.9 Section 3.1) */}
      <div
        className={`p-5 rounded-2xl border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-xs ${
          countdown.isImminent
            ? 'bg-amber-50 border-amber-300 text-amber-950'
            : countdown.isStarted
            ? 'bg-emerald-50 border-emerald-300 text-emerald-950'
            : 'bg-blue-50 border-blue-200 text-blue-950'
        }`}
      >
        <div className="flex items-center gap-3">
          <div
            className={`p-2.5 rounded-xl ${
              countdown.isImminent
                ? 'bg-amber-200 text-amber-900 animate-pulse'
                : countdown.isStarted
                ? 'bg-emerald-200 text-emerald-900'
                : 'bg-blue-200 text-blue-900'
            }`}
          >
            <Clock className="w-6 h-6" />
          </div>
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider opacity-70">
              Real-Time Countdown
            </span>
            <h3 className="text-lg font-black tracking-tight">{countdown.formatted}</h3>
            <span className="text-xs opacity-80 block mt-0.5">
              Scheduled:{' '}
              {new Date(booking.startAt).toLocaleString('en-US', {
                weekday: 'short',
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
                timeZone: 'UTC',
              })}{' '}
              to{' '}
              {new Date(booking.endAt).toLocaleTimeString('en-US', {
                hour: '2-digit',
                minute: '2-digit',
                timeZone: 'UTC',
              })}{' '}
              UTC
            </span>
          </div>
        </div>

        {/* Check-In / Check-Out Action Button */}
        {booking.status === 'SCHEDULED' && (
          <div>
            {isCheckInEligible ? (
              <Link
                to={`/bookings/${booking.id}/checkin`}
                className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-colors flex items-center gap-2 shadow-xs"
              >
                <QrCode className="w-4 h-4" />
                <span>Begin Check-In Wizard</span>
              </Link>
            ) : (
              <span className="text-xs font-semibold px-3 py-1.5 bg-white/80 rounded-xl border border-slate-200 text-slate-500">
                Check-in opens 15m prior to start
              </span>
            )}
          </div>
        )}

        {booking.status === 'CHECKED_IN' && (
          <Link
            to={`/bookings/${booking.id}/checkout`}
            className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-colors flex items-center gap-2 shadow-xs"
          >
            <QrCode className="w-4 h-4" />
            <span>Check-Out & Return Instrument</span>
          </Link>
        )}
      </div>

      {/* Main Grid: Pass & Credentials + Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Unlocked Access Instructions (Spec §5.9 Section 3.1) */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <KeyRound className="w-4 h-4 text-blue-600" />
                Physical Facility Access Credentials
              </h3>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                Unlocked for Confirmed Booking
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
                <span className="text-[11px] font-semibold text-slate-500 flex items-center gap-1.5">
                  <KeyRound className="w-3.5 h-3.5 text-blue-600" /> Door Keypad PIN
                </span>
                <p className="text-xl font-mono font-black text-slate-900 tracking-wider">
                  {booking.doorCode || '4829#'}
                </p>
                <span className="text-[10px] text-slate-400">
                  Enter # after entering 4-digit numeric code
                </span>
              </div>

              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
                <span className="text-[11px] font-semibold text-slate-500 flex items-center gap-1.5">
                  <KeyRound className="w-3.5 h-3.5 text-amber-600" /> Lockbox Tool PIN
                </span>
                <p className="text-xl font-mono font-black text-slate-900 tracking-wider">
                  {booking.lockboxPin || '9173'}
                </p>
                <span className="text-[10px] text-slate-400">
                  Contains brass nozzle set and scraper
                </span>
              </div>

              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
                <span className="text-[11px] font-semibold text-slate-500 flex items-center gap-1.5">
                  <Wifi className="w-3.5 h-3.5 text-emerald-600" /> Lab Network SSID
                </span>
                <p className="text-sm font-bold text-slate-900">
                  {booking.wifiSsid || 'FabLab-Secure-Guest'}
                </p>
                <span className="text-[10px] text-slate-400 font-mono">
                  Pass: {booking.wifiPassword || 'maker-space-2026'}
                </span>
              </div>

              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
                <span className="text-[11px] font-semibold text-slate-500 flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-purple-600" /> Physical Lab Location
                </span>
                <p className="text-sm font-bold text-slate-900">
                  {booking.facilityName} ({booking.room})
                </p>
                <span className="text-[10px] text-slate-400">
                  {booking.facilityAddress || '105 Innovation Way, Building C'}
                </span>
              </div>
            </div>

            {booking.specialInstructions && (
              <div className="p-4 bg-blue-50/60 border border-blue-200 rounded-xl space-y-1 text-xs">
                <span className="font-bold text-blue-900 flex items-center gap-1.5">
                  <ShieldAlert className="w-3.5 h-3.5 text-blue-600" />
                  Mandatory Instrument Operating Instructions
                </span>
                <p className="text-blue-800 leading-relaxed">
                  {booking.specialInstructions}
                </p>
              </div>
            )}
          </div>

          {/* Post-Return Condition Inspection Diffing (Spec §5.9 Section 3.1) */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-4">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <FileText className="w-4 h-4 text-emerald-600" />
              Pre- & Post-Session Condition Reports (Diff View)
            </h3>

            {booking.conditionReportBefore ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Before Inspection */}
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                      Initial Condition (Before)
                    </span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                      {booking.conditionReportBefore.condition}
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 italic">
                    "{booking.conditionReportBefore.notes}"
                  </p>
                  <span className="text-[11px] text-slate-400 block pt-1 border-t border-slate-200">
                    Cleanliness Score: {booking.conditionReportBefore.cleanlinessScore}/5
                  </span>
                </div>

                {/* After Inspection */}
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                      Return Condition (After)
                    </span>
                    {booking.conditionReportAfter ? (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                        {booking.conditionReportAfter.condition}
                      </span>
                    ) : (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-200 text-slate-600">
                        Pending Check-Out
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-600 italic">
                    {booking.conditionReportAfter
                      ? `"${booking.conditionReportAfter.notes}"`
                      : 'Condition report will be recorded upon physical return check-out.'}
                  </p>
                  {booking.conditionReportAfter && (
                    <span className="text-[11px] text-slate-400 block pt-1 border-t border-slate-200">
                      Cleanliness Score: {booking.conditionReportAfter.cleanlinessScore}/5
                    </span>
                  )}
                </div>
              </div>
            ) : (
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-500 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>
                  Condition inspection report will be captured via digital signature when you check in at the facility.
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Actions (Reschedule, Cancel) & QR Pass */}
        <div className="space-y-6">
          {/* Digital QR Access Badge */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs text-center space-y-3">
            <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Digital Scanner Pass
            </h4>
            <div className="w-40 h-40 mx-auto bg-slate-50 border-2 border-dashed border-slate-300 rounded-2xl flex flex-col items-center justify-center p-3">
              <QrCode className="w-24 h-24 text-slate-900" />
              <span className="text-[9px] font-mono text-slate-400 mt-2">
                {booking.qrCodeData || 'RM-PASS-VERIFIED'}
              </span>
            </div>
            <p className="text-[11px] text-slate-400">
              Hold within 10cm of lab optical scanner to trigger automatic check-in.
            </p>
          </div>

          {/* Booking Modification Card */}
          {booking.status === 'SCHEDULED' && (
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-3">
              <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                Booking Actions
              </h4>

              <div className="space-y-2">
                <button
                  type="button"
                  onClick={() => setShowRescheduleModal(true)}
                  className="w-full py-2.5 px-3 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold transition-colors flex items-center justify-center gap-1.5"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Reschedule Booking Slot</span>
                </button>

                <button
                  type="button"
                  onClick={() => setShowCancelModal(true)}
                  className="w-full py-2.5 px-3 bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 rounded-xl text-xs font-bold transition-colors flex items-center justify-center gap-1.5"
                >
                  <XCircle className="w-3.5 h-3.5" />
                  <span>Cancel Reservation</span>
                </button>
              </div>

              <p className="text-[10px] text-slate-400 leading-tight">
                Cancellations within {booking.cancellationNoticeHours || 12} hours of start time incur a 50% token late fee per lab policy.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Cancellation Modal Dialog */}
      {showCancelModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-2 text-red-600">
              <AlertTriangle className="w-5 h-5" />
              <h3 className="text-base font-bold text-slate-900">Cancel Booking</h3>
            </div>

            <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900">
              <span className="font-bold block">Late Cancellation Policy:</span>
              <span>
                Cancellations submitted with less than {booking.cancellationNoticeHours || 12}h advance notice forfeit half of the fair-use token allocation.
              </span>
            </div>

            <form onSubmit={handleCancelBooking} className="space-y-3">
              <label htmlFor="cancelReasonInput" className="block text-xs font-semibold text-slate-700">
                Reason for cancellation <span className="text-red-500">*</span>
              </label>
              <textarea
                id="cancelReasonInput"
                rows={3}
                required
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                placeholder="State reason (e.g. sample preparation delay, protocol changed)..."
                className="w-full text-xs p-3 border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-red-500"
              />

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCancelModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Keep Booking
                </button>
                <button
                  type="submit"
                  disabled={!cancelReason.trim() || isCancelling}
                  className="px-4 py-2 text-xs font-bold bg-red-600 hover:bg-red-700 text-white rounded-xl shadow-xs disabled:opacity-40"
                >
                  {isCancelling ? 'Cancelling...' : 'Confirm Cancellation'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Reschedule Modal Dialog */}
      {showRescheduleModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-2 text-blue-600">
              <RotateCcw className="w-5 h-5" />
              <h3 className="text-base font-bold text-slate-900">Reschedule Reservation</h3>
            </div>

            <form onSubmit={handleRescheduleBooking} className="space-y-4">
              <div className="space-y-1">
                <label htmlFor="newRescheduleDate" className="block text-xs font-semibold text-slate-700">
                  New Booking Date
                </label>
                <input
                  id="newRescheduleDate"
                  type="date"
                  required
                  value={newDate}
                  onChange={(e) => setNewDate(e.target.value)}
                  className="w-full text-xs p-2.5 border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="space-y-1">
                <label htmlFor="newRescheduleTime" className="block text-xs font-semibold text-slate-700">
                  Start Time (UTC)
                </label>
                <select
                  id="newRescheduleTime"
                  value={newTime}
                  onChange={(e) => setNewTime(e.target.value)}
                  className="w-full text-xs p-2.5 border border-slate-300 rounded-xl outline-none"
                >
                  <option value="09:00">09:00 - 13:00 UTC</option>
                  <option value="13:00">13:00 - 17:00 UTC</option>
                  <option value="17:00">17:00 - 21:00 UTC</option>
                </select>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowRescheduleModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!newDate || isRescheduling}
                  className="px-4 py-2 text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-xs disabled:opacity-40"
                >
                  {isRescheduling ? 'Rescheduling...' : 'Confirm New Window'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
