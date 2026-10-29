import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  ArrowLeft,
  CheckCircle2,
  MapPin,
  Camera,
  ShieldCheck,
  ChevronRight,
  ChevronLeft,
  RefreshCw,
  QrCode,
  User,
  Wrench,
  Navigation,
} from 'lucide-react';
import { StarRating } from '../../components/checkin/StarRating';
import { SignaturePad } from '../../components/form/SignaturePad';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { DemoTag } from '../../components/feedback/DemoTag';
import {
  fetchBookingById,
  type BookingRecord,
} from '../../api/bookings.api';
import {
  submitCheckIn,
  type SignatureData,
  type GeoLocationData,
} from '../../api/checkin.api';

export function CheckInPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { showToast } = useToast();

  const [booking, setBooking] = useState<BookingRecord | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form State
  const [rating, setRating] = useState<number>(5);
  const [notes, setNotes] = useState<string>('');
  const [uploadedPhotos, setUploadedPhotos] = useState<string[]>([]);
  const [accessories, setAccessories] = useState<string[]>([
    'Safety Goggles',
    'Tool Kit & Scraper',
    'Power Cord & Adapter',
    'PEI Clean Sheet',
  ]);
  const [signature, setSignature] = useState<SignatureData | null>(null);

  // Soft Geolocation state (Spec §5.10 Section 1.3)
  const [geoCoords, setGeoCoords] = useState<GeoLocationData | null>(null);
  const [geoStatus, setGeoStatus] = useState<'PENDING' | 'ACQUIRED' | 'NOT_PROVIDED'>('PENDING');

  useEffect(() => {
    let isMounted = true;
    async function loadData() {
      if (!id) return;
      setIsLoading(true);
      try {
        const data = await fetchBookingById(id);
        if (isMounted) setBooking(data);
      } catch (err) {
        console.error('Failed to load booking for check-in', err);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }
    loadData();

    // Trigger soft GPS request without blocking
    if (typeof window !== 'undefined' && 'geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          if (isMounted) {
            setGeoCoords({
              lat: pos.coords.latitude,
              lng: pos.coords.longitude,
              accuracy: pos.coords.accuracy,
            });
            setGeoStatus('ACQUIRED');
          }
        },
        () => {
          if (isMounted) setGeoStatus('NOT_PROVIDED');
        },
        { timeout: 4000 }
      );
    } else {
      setGeoStatus('NOT_PROVIDED');
    }

    return () => {
      isMounted = false;
    };
  }, [id]);

  const toggleAccessory = (item: string) => {
    if (accessories.includes(item)) {
      setAccessories(accessories.filter((a) => a !== item));
    } else {
      setAccessories([...accessories, item]);
    }
  };

  const handleSimulatePhoto = () => {
    const photoId = `photo-${Date.now()}`;
    setUploadedPhotos([...uploadedPhotos, photoId]);
    showToast({
      type: 'info',
      title: 'Equipment surface photo attached.',
    });
  };

  // Validation
  const canAdvance = useMemo(() => {
    switch (currentStep) {
      case 1:
        return true;
      case 2:
        // Mandatory notes if rating <= 3
        if (rating <= 3 && notes.trim().length < 5) return false;
        return true;
      case 3:
        return accessories.length > 0;
      case 4:
        return Boolean(signature);
      default:
        return true;
    }
  }, [currentStep, rating, notes, accessories, signature]);

  const handleSubmitCheckIn = async () => {
    if (!id || !booking || !signature) return;
    setIsSubmitting(true);
    try {
      await submitCheckIn(id, {
        equipmentUnitId: booking.resourceId,
        accessories,
        conditionReport: {
          rating,
          notes: notes.trim(),
          photos: uploadedPhotos,
        },
        signature,
        geo: geoCoords,
      });

      showToast({
        type: 'success',
        title: 'Check-in verified! In-use session active.',
      });
      navigate(`/bookings/${id}`);
    } catch {
      showToast({
        type: 'error',
        title: 'Check-in failed. Please verify with facility manager.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading || !booking) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-16 flex flex-col items-center justify-center text-slate-400 gap-3">
        <RefreshCw className="w-8 h-8 animate-spin text-blue-600" />
        <span className="text-sm font-medium">Preparing hardware check-in terminal...</span>
      </div>
    );
  }

  const steps = [
    { num: 1, title: 'Identity & Equipment' },
    { num: 2, title: 'Initial Condition' },
    { num: 3, title: 'Accessories' },
    { num: 4, title: 'Location & Sign' },
  ];

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">
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
            Equipment Check-In Wizard
          </h1>
          <DemoTag label="Hardware Intake" />
        </div>
        <p className="text-xs text-slate-500 mt-1">
          {booking.resourceName} • Booking #{booking.id}
        </p>
      </div>

      {/* 4-Step Stepper Header */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-2xs">
        <div className="flex items-center justify-between">
          {steps.map((st, idx) => {
            const isCompleted = currentStep > st.num;
            const isCurrent = currentStep === st.num;
            return (
              <React.Fragment key={st.num}>
                <div className="flex items-center gap-2">
                  <div
                    className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                      isCompleted
                        ? 'bg-emerald-600 text-white'
                        : isCurrent
                        ? 'bg-blue-600 text-white ring-4 ring-blue-100'
                        : 'bg-slate-100 text-slate-400'
                    }`}
                  >
                    {isCompleted ? <CheckCircle2 className="w-4 h-4" /> : st.num}
                  </div>
                  <span
                    className={`text-xs font-bold hidden sm:inline-block ${
                      isCurrent ? 'text-slate-900' : isCompleted ? 'text-slate-700' : 'text-slate-400'
                    }`}
                  >
                    {st.title}
                  </span>
                </div>
                {idx < steps.length - 1 && (
                  <div
                    className={`flex-1 h-0.5 mx-2 transition-colors ${
                      isCompleted ? 'bg-emerald-500' : 'bg-slate-200'
                    }`}
                  />
                )}
              </React.Fragment>
            );
          })}
        </div>
      </div>

      {/* Step Content */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm min-h-[400px]">
        {/* STEP 1: CONFIRM IDENTITY & EQUIPMENT */}
        {currentStep === 1 && (
          <div className="space-y-6">
            <div>
              <h3 className="text-base font-bold text-slate-900">
                Step 1: Confirm Researcher & Hardware Unit
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                Verify operator identity and confirm physical arrival at the assigned workstation.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-2">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-blue-600" /> Authorized Operator
                </span>
                <p className="text-sm font-bold text-slate-900">{user?.name || 'Verified Researcher'}</p>
                <p className="text-xs text-slate-500 font-mono">{user?.email || 'operator@institution.edu'}</p>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 inline-block mt-1">
                  Role: {user?.role || 'REQUESTER'}
                </span>
              </div>

              <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-2">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                  <Wrench className="w-3.5 h-3.5 text-emerald-600" /> Assigned Unit
                </span>
                <p className="text-sm font-bold text-slate-900">{booking.resourceName}</p>
                <p className="text-xs text-slate-500 flex items-center gap-1">
                  <MapPin className="w-3 h-3 text-slate-400" />
                  {booking.facilityName} ({booking.room})
                </p>
                <span className="text-[10px] font-mono text-slate-500 block">
                  Serial / Tag: SN-LAB-{booking.resourceId.slice(0, 8).toUpperCase()}
                </span>
              </div>
            </div>

            <div className="p-4 bg-blue-50 border border-blue-200 rounded-2xl text-xs text-blue-900 flex items-start gap-3">
              <ShieldCheck className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold block">Safety Protocols Acknowledgment:</span>
                <span className="text-[11px] opacity-80 mt-0.5 block leading-relaxed">
                  Before powering on equipment, ensure proper eye protection is donned, ventilation ducts are unobstructed, and emergency stop switches are identified.
                </span>
              </div>
            </div>
          </div>
        )}

        {/* STEP 2: INITIAL CONDITION REPORT */}
        {currentStep === 2 && (
          <div className="space-y-6">
            <div>
              <h3 className="text-base font-bold text-slate-900">
                Step 2: Inspect Initial Hardware Condition
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                Rate the initial state before beginning your run. Ratings of 3 stars or below require descriptive notes.
              </p>
            </div>

            {/* Star Rating Component */}
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-2">
              <span className="text-xs font-bold text-slate-800 block">
                Equipment Surface & Cleanliness Rating
              </span>
              <StarRating rating={rating} onChange={(val) => setRating(val)} size="lg" />
            </div>

            {/* Mandatory Notes Field */}
            <div className="space-y-1.5">
              <div className="flex justify-between items-center text-xs">
                <label htmlFor="checkinInspectionNotes" className="font-bold text-slate-800">
                  Condition Inspection Notes {rating <= 3 && <span className="text-red-500">* (Mandatory for rating $\le$ 3)</span>}
                </label>
                <span className="text-slate-400">{notes.length}/500</span>
              </div>
              <textarea
                id="checkinInspectionNotes"
                rows={3}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Note any visible scratches, residue, previous user filament, or loose bolts..."
                className={`w-full text-xs p-3.5 border rounded-xl outline-none focus:ring-2 focus:bg-white transition-all ${
                  rating <= 3 && !notes.trim()
                    ? 'border-red-300 bg-red-50/30 focus:ring-red-500'
                    : 'border-slate-300 bg-slate-50/50 focus:ring-blue-500'
                }`}
              />
              {rating <= 3 && !notes.trim() && (
                <p className="text-[11px] text-red-600 font-semibold">
                  Please describe the blemish or defect so you are not held liable upon return check-out.
                </p>
              )}
            </div>

            {/* Photo Upload Simulation */}
            <div className="p-4 bg-slate-50 border border-dashed border-slate-300 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-white border border-slate-200 text-slate-600">
                  <Camera className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <span className="text-xs font-bold text-slate-800 block">
                    Surface & Calibration Photographs
                  </span>
                  <span className="text-[11px] text-slate-500">
                    {uploadedPhotos.length} photo(s) captured for baseline audit record.
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={handleSimulatePhoto}
                className="px-4 py-2 text-xs font-bold bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 rounded-xl transition-colors shadow-2xs flex items-center gap-1.5"
              >
                <Camera className="w-3.5 h-3.5 text-blue-600" />
                <span>Snap / Attach Photo</span>
              </button>
            </div>
          </div>
        )}

        {/* STEP 3: ACCESSORIES CHECKLIST */}
        {currentStep === 3 && (
          <div className="space-y-6">
            <div>
              <h3 className="text-base font-bold text-slate-900">
                Step 3: Confirm Required Accessories Present
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                Check off all auxiliary tools and calibration accessories present at the workstation.
              </p>
            </div>

            <div className="space-y-2.5">
              {[
                { name: 'Safety Goggles', desc: 'ANSI Z87.1 certified eye protection in bench caddy' },
                { name: 'Tool Kit & Scraper', desc: 'Hex wrench set, brass wire brush, steel scraper' },
                { name: 'Power Cord & Adapter', desc: 'Grounded 240W heavy-duty power connector' },
                { name: 'PEI Clean Sheet', desc: 'Magnetic flexible build surface sheet installed' },
              ].map((acc) => {
                const isChecked = accessories.includes(acc.name);
                return (
                  <button
                    key={acc.name}
                    type="button"
                    onClick={() => toggleAccessory(acc.name)}
                    className={`w-full p-4 rounded-2xl border text-left flex items-start justify-between gap-3 transition-all ${
                      isChecked
                        ? 'border-blue-600 bg-blue-50/50 ring-2 ring-blue-500/20'
                        : 'border-slate-200 bg-white hover:border-slate-300'
                    }`}
                  >
                    <div>
                      <span className="text-xs font-bold text-slate-900 block">{acc.name}</span>
                      <span className="text-[11px] text-slate-500">{acc.desc}</span>
                    </div>
                    <div
                      className={`w-5 h-5 rounded-md border flex items-center justify-center transition-colors ${
                        isChecked
                          ? 'bg-blue-600 border-blue-600 text-white'
                          : 'border-slate-300 bg-white'
                      }`}
                    >
                      {isChecked && <CheckCircle2 className="w-3.5 h-3.5" />}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* STEP 4: SOFT GEOLOCATION & SIGNATURE */}
        {currentStep === 4 && (
          <div className="space-y-6">
            <div>
              <h3 className="text-base font-bold text-slate-900">
                Step 4: Geolocation Verification & Sign-Off
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                Confirm your arrival location and provide your digital signature to unlock the hardware session.
              </p>
            </div>

            {/* Soft Geolocation Signal Box (Spec §5.10 Section 1.3) */}
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div
                  className={`p-2.5 rounded-xl ${
                    geoStatus === 'ACQUIRED'
                      ? 'bg-emerald-100 text-emerald-800'
                      : 'bg-slate-200 text-slate-600'
                  }`}
                >
                  <Navigation className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-xs font-bold text-slate-800 block">
                    Soft Geolocation Signal
                  </span>
                  <span className="text-[11px] text-slate-500">
                    {geoStatus === 'ACQUIRED'
                      ? `GPS verified near lab premises (${geoCoords?.lat.toFixed(4)}, ${geoCoords?.lng.toFixed(4)})`
                      : 'GPS signal skipped or permission not provided (soft check does not block access).'}
                  </span>
                </div>
              </div>

              <span
                className={`text-[10px] font-bold px-2.5 py-1 rounded-full ${
                  geoStatus === 'ACQUIRED'
                    ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                    : 'bg-slate-200 text-slate-600'
                }`}
              >
                {geoStatus === 'ACQUIRED' ? 'Geofence Verified' : 'Soft Skipped'}
              </span>
            </div>

            {/* Dual Mode SignaturePad */}
            <SignaturePad
              documentTitle="Initial Condition Attestation"
              onSave={(sig) => setSignature(sig)}
            />
          </div>
        )}
      </div>

      {/* Stepper Footer Navigation */}
      <div className="flex items-center justify-between pt-2">
        <button
          type="button"
          onClick={() => setCurrentStep((prev) => Math.max(1, prev - 1))}
          disabled={currentStep === 1}
          className="px-4 py-2.5 text-xs font-bold text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-xl transition-colors flex items-center gap-1.5 disabled:opacity-30 disabled:cursor-not-allowed shadow-2xs"
        >
          <ChevronLeft className="w-4 h-4" /> Previous
        </button>

        <div className="flex items-center gap-2">
          {currentStep < 4 ? (
            <button
              type="button"
              onClick={() => setCurrentStep((prev) => Math.min(4, prev + 1))}
              disabled={!canAdvance}
              className="px-6 py-2.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition-colors flex items-center gap-1.5 shadow-xs disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Continue to Step {currentStep + 1}
              <ChevronRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              type="button"
              onClick={handleSubmitCheckIn}
              disabled={!canAdvance || isSubmitting}
              className="px-7 py-2.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl transition-colors flex items-center gap-2 shadow-xs disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Verifying Check-In...</span>
                </>
              ) : (
                <>
                  <QrCode className="w-4 h-4" />
                  <span>Complete Check-In & Unlock Session</span>
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

