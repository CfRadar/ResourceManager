import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  ArrowLeft,
  CheckCircle2,
  ShieldAlert,
  Send,
  RefreshCw,
} from 'lucide-react';
import { StarRating } from '../../components/checkin/StarRating';
import { SignaturePad } from '../../components/form/SignaturePad';
import { ConditionDiffCard } from '../../components/checkin/ConditionDiffCard';
import { DemoTag } from '../../components/feedback/DemoTag';
import { useToast } from '../../context/ToastContext';
import { fetchBookingById, type BookingRecord } from '../../api/bookings.api';
import {
  fetchConditionReports,
  submitCheckOut,
  type StoredConditionReport,
  type SignatureData,
} from '../../api/checkin.api';

export function CheckOutPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { showToast } = useToast();

  const [booking, setBooking] = useState<BookingRecord | null>(null);
  const [beforeReport, setBeforeReport] = useState<StoredConditionReport | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form State
  const [returnRating, setReturnRating] = useState<number>(5);
  const [returnNotes, setReturnNotes] = useState<string>('');
  const baselineAccessories = [
    'Safety Goggles',
    'Tool Kit & Scraper',
    'Power Cord & Adapter',
    'PEI Clean Sheet',
  ];
  const [returnedAccessories, setReturnedAccessories] = useState<string[]>(baselineAccessories);
  const [workspaceCleaned, setWorkspaceCleaned] = useState<boolean>(true);
  const [returnSignature, setReturnSignature] = useState<SignatureData | null>(null);

  // Incident Modal State
  const [showIncidentModal, setShowIncidentModal] = useState<boolean>(false);
  const [incidentDescription, setIncidentDescription] = useState<string>('');
  const [incidentSeverity, setIncidentSeverity] = useState<'LOW' | 'MEDIUM' | 'HIGH'>('LOW');

  useEffect(() => {
    let isMounted = true;
    async function loadData() {
      if (!id) return;
      setIsLoading(true);
      try {
        const [bkData, reports] = await Promise.all([
          fetchBookingById(id),
          fetchConditionReports(id),
        ]);
        if (isMounted) {
          setBooking(bkData);
          setBeforeReport(reports.beforeReport);
          if (reports.beforeReport?.accessoriesConfirmed) {
            setReturnedAccessories(reports.beforeReport.accessoriesConfirmed);
          }
        }
      } catch (err) {
        console.error('Failed to load check-out data', err);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }
    loadData();
    return () => {
      isMounted = false;
    };
  }, [id]);

  const toggleReturnedAccessory = (item: string) => {
    if (returnedAccessories.includes(item)) {
      setReturnedAccessories(returnedAccessories.filter((a) => a !== item));
    } else {
      setReturnedAccessories([...returnedAccessories, item]);
    }
  };

  const handleAttachIncidentNote = (e: React.FormEvent) => {
    e.preventDefault();
    if (!incidentDescription.trim()) return;
    setReturnNotes((prev) =>
      prev ? `${prev}\n[INCIDENT REPORTED: ${incidentSeverity}] ${incidentDescription}` : `[INCIDENT REPORTED: ${incidentSeverity}] ${incidentDescription}`
    );
    setShowIncidentModal(false);
    showToast({
      type: 'warning',
      title: 'Incident notice attached to return inspection report.',
    });
  };

  const handleSubmitCheckOut = async () => {
    if (!id || !booking || !returnSignature) return;
    setIsSubmitting(true);
    try {
      await submitCheckOut(id, {
        conditionReport: {
          rating: returnRating,
          notes: returnNotes.trim(),
        },
        accessoriesReturned: returnedAccessories,
        signature: returnSignature,
      });

      showToast({
        type: 'success',
        title: 'Check-out completed! Equipment marked returned.',
      });
      navigate(`/bookings/${id}`);
    } catch {
      showToast({
        type: 'error',
        title: 'Check-out submission failed.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading || !booking) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16 flex flex-col items-center justify-center text-slate-400 gap-3">
        <RefreshCw className="w-8 h-8 animate-spin text-blue-600" />
        <span className="text-sm font-medium">Preparing return check-out inspection...</span>
      </div>
    );
  }

  const defaultBeforeReport: StoredConditionReport = beforeReport || {
    reportType: 'BEFORE',
    rating: 5,
    notes: 'Clean build surface, PEI sheet wiped down with alcohol, zero filament debris.',
    cleanlinessScore: 5,
    accessoriesConfirmed: baselineAccessories,
    createdAt: new Date().toISOString(),
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
      {/* Header */}
      <div>
        <Link
          to={`/bookings/${booking.id}`}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-blue-600 mb-3 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Back to Access Pass
        </Link>
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">
            Equipment Return & Check-Out
          </h1>
          <DemoTag label="Condition Diff" />
        </div>
        <p className="text-xs text-slate-500 mt-1">
          {booking.resourceName} • Booking #{booking.id}
        </p>
      </div>

      {/* Split Comparison View: BEFORE vs AFTER (Spec §5.11) */}
      <ConditionDiffCard
        beforeReport={defaultBeforeReport}
        currentRating={returnRating}
        currentNotes={returnNotes}
        selectedAccessories={returnedAccessories}
        baselineAccessories={baselineAccessories}
        onOpenIncidentModal={() => setShowIncidentModal(true)}
      />

      {/* Return Form Details */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-6">
        <div>
          <h3 className="text-base font-bold text-slate-900">
            Record Final Equipment Condition & Handover
          </h3>
          <p className="text-xs text-slate-500 mt-1">
            Rate the condition of the instrument following your operational run. Report any jams, tool wear, or irregularities.
          </p>
        </div>

        {/* Return Star Rating */}
        <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-2">
          <span className="text-xs font-bold text-slate-800 block">
            Post-Operation Surface & Function Rating
          </span>
          <StarRating rating={returnRating} onChange={(val) => setReturnRating(val)} size="lg" />
        </div>

        {/* Return Notes */}
        <div className="space-y-1.5">
          <label htmlFor="checkoutNotesInput" className="block text-xs font-bold text-slate-800">
            Return Inspection Remarks & Observations
          </label>
          <textarea
            id="checkoutNotesInput"
            rows={3}
            value={returnNotes}
            onChange={(e) => setReturnNotes(e.target.value)}
            placeholder="Cleaned PEI plate, returned tools, shutdown procedure followed..."
            className="w-full text-xs p-3.5 border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50/50 focus:bg-white"
          />
        </div>

        {/* Returned Accessories Checklist */}
        <div className="space-y-3">
          <span className="text-xs font-bold text-slate-800 block">
            Confirm Returned Accessories & Tools
          </span>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {baselineAccessories.map((item) => {
              const isChecked = returnedAccessories.includes(item);
              return (
                <button
                  key={item}
                  type="button"
                  onClick={() => toggleReturnedAccessory(item)}
                  className={`p-3 rounded-xl border text-left flex items-center justify-between transition-all ${
                    isChecked
                      ? 'border-blue-600 bg-blue-50/50 text-blue-900'
                      : 'border-red-200 bg-red-50/40 text-red-800'
                  }`}
                >
                  <span className="text-xs font-semibold">{item}</span>
                  <div
                    className={`w-5 h-5 rounded-md border flex items-center justify-center ${
                      isChecked
                        ? 'bg-blue-600 border-blue-600 text-white'
                        : 'border-red-300 bg-white text-red-500'
                    }`}
                  >
                    {isChecked && <CheckCircle2 className="w-3.5 h-3.5" />}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Hygiene & Shutdown Attestation */}
        <label className="flex items-start gap-3 p-4 bg-slate-50 border border-slate-200 rounded-2xl cursor-pointer">
          <input
            type="checkbox"
            checked={workspaceCleaned}
            onChange={(e) => setWorkspaceCleaned(e.target.checked)}
            className="mt-0.5 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
          />
          <div className="text-xs">
            <span className="font-bold text-slate-900 block">
              Facility Cleanliness & Instrument Shutdown Complete
            </span>
            <span className="text-slate-500 text-[11px]">
              I confirm the instrument has completed its standard cooldown cycle, residual debris has been removed with approved solvent, and the bench is left in clean state for the next reservation.
            </span>
          </div>
        </label>

        {/* Digital Signature Pad */}
        <div className="space-y-2">
          <SignaturePad
            documentTitle="Final Return Handover Attestation"
            onSave={(sig) => setReturnSignature(sig)}
          />
        </div>

        {/* Submit Check-Out Button */}
        <div className="pt-2 flex justify-end">
          <button
            type="button"
            onClick={handleSubmitCheckOut}
            disabled={!returnSignature || !workspaceCleaned || isSubmitting}
            className="px-8 py-3 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl transition-colors flex items-center gap-2 shadow-xs disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {isSubmitting ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Recording Handover...</span>
              </>
            ) : (
              <>
                <Send className="w-4 h-4" />
                <span>Confirm Check-Out & Release Workstation</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Incident / Damage Drawer Modal */}
      {showIncidentModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-2 text-amber-600">
              <ShieldAlert className="w-5 h-5" />
              <h3 className="text-base font-bold text-slate-900">
                Report Incident or Hardware Damage
              </h3>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Transparent reporting of machine jams or missing tools prevents administrative penalties and notifies facility technicians immediately.
            </p>

            <form onSubmit={handleAttachIncidentNote} className="space-y-3">
              <div className="space-y-1">
                <label htmlFor="incidentSeveritySelect" className="block text-xs font-semibold text-slate-700">Severity Level</label>
                <select
                  id="incidentSeveritySelect"
                  value={incidentSeverity}
                  onChange={(e) =>
                    setIncidentSeverity(e.target.value as 'LOW' | 'MEDIUM' | 'HIGH')
                  }
                  className="w-full text-xs p-2.5 border border-slate-300 rounded-xl outline-none"
                >
                  <option value="LOW">Low: Cosmetic wear / Non-critical tool misplaced</option>
                  <option value="MEDIUM">Medium: Jammed nozzle / Requires recalibration</option>
                  <option value="HIGH">High: Mechanical failure / Spillage / Stop engaged</option>
                </select>
              </div>

              <div className="space-y-1">
                <label htmlFor="incidentDescriptionInput" className="block text-xs font-semibold text-slate-700">Incident Details</label>
                <textarea
                  id="incidentDescriptionInput"
                  rows={4}
                  required
                  value={incidentDescription}
                  onChange={(e) => setIncidentDescription(e.target.value)}
                  placeholder="Describe what occurred, any error codes displayed on instrument LCD, and immediate remedial steps taken..."
                  className="w-full text-xs p-3 border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowIncidentModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-bold bg-amber-600 hover:bg-amber-700 text-white rounded-xl shadow-xs"
                >
                  Attach to Return Report
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
