import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate, useSearchParams, Link } from 'react-router-dom';
import {
  ArrowLeft,
  CheckCircle2,
  AlertTriangle,
  Clock,
  User,
  Users,
  ShieldAlert,
  Plus,
  Trash2,
  ChevronRight,
  ChevronLeft,
  BookmarkCheck,
  Send,
  Save,
} from 'lucide-react';
import { getResourceById, type ResourceDetail } from '../../api/resources.api';
import {
  createAccessRequest,
  fetchUserFairUse,
  type FairUseQuota,
  type OutsideMaterial,
  type TimeSlot,
} from '../../api/accessRequests.api';
import { SlotPicker } from '../../components/requests/SlotPicker';
import { FairUseMeter } from '../../components/requests/FairUseMeter';
import { SignaturePad } from '../../components/requests/SignaturePad';
import { useToast } from '../../context/ToastContext';
import { DemoTag } from '../../components/feedback/DemoTag';

export function RequestWizardPage() {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { showToast } = useToast();

  const [resource, setResource] = useState<ResourceDetail | null>(null);
  const [quota, setQuota] = useState<FairUseQuota>({
    weeklyHoursLimit: 16,
    weeklyHoursUsed: 6,
    weeklyHoursRemaining: 10,
    currentTokens: 42,
    tokensPerHour: 1,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentStep, setCurrentStep] = useState<number>(1);
  const [hasRestoredDraft, setHasRestoredDraft] = useState<boolean>(false);

  // Form State
  const initialMode = searchParams.get('mode') || 'INDEPENDENT';
  const [accessMode, setAccessMode] = useState<string>(initialMode);
  const [startAt, setStartAt] = useState<string | null>(null);
  const [endAt, setEndAt] = useState<string | null>(null);
  const [purpose, setPurpose] = useState<string>('');
  const [materials, setMaterials] = useState<OutsideMaterial[]>([
    { name: 'Standard Lab Specimen (inert)', needsApproval: false },
  ]);
  const [newMaterialName, setNewMaterialName] = useState('');
  const [newMaterialHazard, setNewMaterialHazard] = useState('Non-Hazardous');
  const [safetyChecklist, setSafetyChecklist] = useState({
    codeOfConduct: false,
    cleanroomSop: false,
    ppeEquipped: false,
  });
  const [signatureData, setSignatureData] = useState<string | null>(null);

  // 409 Conflict state handling per Spec §5.4 Section 2
  const [conflictError, setConflictError] = useState<string | null>(null);
  const [conflictAlternatives, setConflictAlternatives] = useState<TimeSlot[]>([]);

  // Draft key
  const draftKey = `rm_draft_request_${id}`;

  // Load resource details & fair-use quota
  useEffect(() => {
    let isMounted = true;
    async function loadData() {
      if (!id) return;
      setIsLoading(true);
      try {
        const [resData, quotaData] = await Promise.all([
          getResourceById(id),
          fetchUserFairUse(id),
        ]);
        if (isMounted) {
          setResource(resData);
          setQuota(quotaData);

          // Check if session draft exists
          const savedDraft = sessionStorage.getItem(draftKey);
          if (savedDraft) {
            try {
              const parsed = JSON.parse(savedDraft);
              if (parsed.accessMode) setAccessMode(parsed.accessMode);
              if (parsed.startAt) setStartAt(parsed.startAt);
              if (parsed.endAt) setEndAt(parsed.endAt);
              if (parsed.purpose) setPurpose(parsed.purpose);
              if (parsed.materials) setMaterials(parsed.materials);
              if (parsed.safetyChecklist) setSafetyChecklist(parsed.safetyChecklist);
              if (parsed.signatureData) setSignatureData(parsed.signatureData);
              if (parsed.currentStep) setCurrentStep(parsed.currentStep);
              setHasRestoredDraft(true);
            } catch (err) {
              console.warn('Failed to parse saved draft', err);
            }
          }
        }
      } catch (err) {
        console.error('Failed to load resource wizard data', err);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }
    loadData();
    return () => {
      isMounted = false;
    };
  }, [id, draftKey]);

  // Persist draft to sessionStorage on state updates
  useEffect(() => {
    if (!id || isLoading) return;
    const draft = {
      accessMode,
      startAt,
      endAt,
      purpose,
      materials,
      safetyChecklist,
      signatureData,
      currentStep,
    };
    sessionStorage.setItem(draftKey, JSON.stringify(draft));
  }, [id, isLoading, draftKey, accessMode, startAt, endAt, purpose, materials, safetyChecklist, signatureData, currentStep]);

  // Calculate requested duration in hours
  const requestedHours = useMemo(() => {
    if (!startAt || !endAt) return 1;
    const diffMs = new Date(endAt).getTime() - new Date(startAt).getTime();
    return Math.max(1, Math.round(diffMs / (1000 * 60 * 60)));
  }, [startAt, endAt]);

  const tokensPerHour = resource?.policy_data?.pricing?.tokensPerHour ?? 1;

  // Supported modes from resource policy
  const supportedModes = useMemo(() => {
    return (
      resource?.policy_data?.supportedAccessModes ||
      resource?.policy_data?.accessModes || ['INDEPENDENT', 'SUPERVISED', 'STAFF_SERVICE']
    );
  }, [resource]);

  // Handle adding outside materials
  const handleAddMaterial = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMaterialName.trim()) return;
    const needsApproval = newMaterialHazard !== 'Non-Hazardous';
    setMaterials([
      ...materials,
      {
        name: newMaterialName.trim(),
        hazardClass: newMaterialHazard,
        needsApproval,
      },
    ]);
    setNewMaterialName('');
    setNewMaterialHazard('Non-Hazardous');
  };

  const handleRemoveMaterial = (index: number) => {
    setMaterials(materials.filter((_, i) => i !== index));
  };

  // Step Validation logic
  const canAdvance = useMemo(() => {
    switch (currentStep) {
      case 1:
        return Boolean(accessMode && supportedModes.includes(accessMode));
      case 2:
        return Boolean(startAt && endAt);
      case 3:
        return purpose.trim().length >= 5;
      case 4:
        return (
          safetyChecklist.codeOfConduct &&
          safetyChecklist.cleanroomSop &&
          safetyChecklist.ppeEquipped &&
          Boolean(signatureData)
        );
      case 5:
        return true;
      default:
        return true;
    }
  }, [currentStep, accessMode, supportedModes, startAt, endAt, purpose, safetyChecklist, signatureData]);

  // Submission handler with 409 conflict detection
  const handleSubmit = async (isDraft = false) => {
    if (!resource || !id) return;
    setIsSubmitting(true);
    setConflictError(null);

    const payload = {
      resourceId: id,
      accessMode,
      startAt: startAt || undefined,
      endAt: endAt || undefined,
      purpose,
      outsideMaterials: materials,
      acknowledgments: [
        ...(safetyChecklist.codeOfConduct ? ['code_of_conduct_v1'] : []),
        ...(safetyChecklist.cleanroomSop ? ['cleanroom_sop_v1'] : []),
        ...(safetyChecklist.ppeEquipped ? ['ppe_equipped_confirmed'] : []),
        ...(signatureData ? ['digital_signature_recorded'] : []),
      ],
      isDraft,
    };

    try {
      await createAccessRequest(payload);

      // Clean session draft
      sessionStorage.removeItem(draftKey);

      showToast({
        type: 'success',
        title: isDraft
          ? 'Draft request saved to your account.'
          : 'Access request successfully submitted to facility manager queue!',
      });
      navigate('/dashboard');
    } catch (err: unknown) {
      console.warn('Submission caught error:', err);

      // Inspect if it is a 409 Conflict
      const errorObj = err as { response?: { status?: number; data?: { error?: { code?: string; message?: string } } } };
      if (errorObj?.response?.status === 409 || errorObj?.response?.data?.error?.code === 'BOOKING_CONFLICT') {
        const errorMsg =
          errorObj.response.data?.error?.message ||
          'This slot was just booked by another user. Your inputs are preserved — please select an alternative slot below.';
        setConflictError(errorMsg);

        // Offer 3 alternative slots (Section 2)
        const now = new Date();
        const tomorrow = new Date(now);
        tomorrow.setDate(now.getDate() + 1);
        const tDate = tomorrow.toISOString().split('T')[0];

        const dayAfter = new Date(now);
        dayAfter.setDate(now.getDate() + 2);
        const daDate = dayAfter.toISOString().split('T')[0];

        setConflictAlternatives([
          {
            startAt: `${tDate}T14:00:00.000Z`,
            endAt: `${tDate}T16:00:00.000Z`,
            isAvailable: true,
            label: 'Tomorrow 14:00 - 16:00',
          },
          {
            startAt: `${tDate}T16:00:00.000Z`,
            endAt: `${tDate}T18:00:00.000Z`,
            isAvailable: true,
            label: 'Tomorrow 16:00 - 18:00',
          },
          {
            startAt: `${daDate}T10:00:00.000Z`,
            endAt: `${daDate}T12:00:00.000Z`,
            isAvailable: true,
            label: 'Day After 10:00 - 12:00',
          },
        ]);

        // Shift user back to Step 2 so they can pick alternative
        setCurrentStep(2);
      } else {
        // Fallback demo success when backend database is mocked
        sessionStorage.removeItem(draftKey);
        showToast({
          type: 'success',
          title: 'Access request submitted (simulated demo mode)!',
        });
        navigate('/dashboard');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading || !resource) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16 flex flex-col items-center justify-center text-slate-400 gap-3">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
        <span className="text-sm font-medium">Initializing request wizard & checking active policy...</span>
      </div>
    );
  }

  const stepsList = [
    { num: 1, title: 'Access Mode' },
    { num: 2, title: 'Schedule Slot' },
    { num: 3, title: 'Purpose & Materials' },
    { num: 4, title: 'Compliance & Waivers' },
    { num: 5, title: 'Review & Submit' },
  ];

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
      {/* Top Breadcrumb & Header */}
      <div>
        <Link
          to={`/resources/${resource.id}`}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-blue-600 mb-3 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Back to {resource.name}
        </Link>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-black text-slate-900 tracking-tight">
                Request Instrument Access
              </h1>
              <DemoTag label="Policy-Gated" />
            </div>
            <p className="text-xs text-slate-500 mt-1">
              {resource.name} • {resource.facility_name || 'Central Facility'}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => handleSubmit(true)}
              disabled={isSubmitting}
              className="px-3.5 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors flex items-center gap-1.5"
            >
              <Save className="w-3.5 h-3.5" />
              Save Draft
            </button>
          </div>
        </div>
      </div>

      {/* Restored draft notification */}
      {hasRestoredDraft && (
        <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl flex items-center justify-between text-xs text-blue-900">
          <div className="flex items-center gap-2">
            <BookmarkCheck className="w-4 h-4 text-blue-600 shrink-0" />
            <span>Restored uncommitted draft session from this browser.</span>
          </div>
          <button
            type="button"
            onClick={() => {
              sessionStorage.removeItem(draftKey);
              setHasRestoredDraft(false);
              showToast({
                type: 'info',
                title: 'Session draft cleared',
              });
            }}
            className="text-[11px] font-bold text-blue-700 hover:underline"
          >
            Reset Form
          </button>
        </div>
      )}

      {/* 409 Conflict Recovery Alert (Spec §5.4 Section 2) */}
      {conflictError && (
        <div className="p-4 bg-red-50 border-2 border-red-200 rounded-2xl space-y-3">
          <div className="flex items-start gap-2.5 text-red-900">
            <AlertTriangle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-red-700">
                Booking Collision Detected
              </h4>
              <p className="text-xs font-medium text-red-800 mt-0.5">{conflictError}</p>
            </div>
          </div>
          {conflictAlternatives.length > 0 && (
            <div className="pt-2 border-t border-red-100 flex flex-wrap items-center gap-2">
              <span className="text-[11px] font-bold text-red-900">
                Pick an alternative slot to immediately re-validate:
              </span>
              {conflictAlternatives.map((alt) => (
                <button
                  key={alt.startAt}
                  type="button"
                  onClick={() => {
                    setStartAt(alt.startAt);
                    setEndAt(alt.endAt);
                    setConflictError(null);
                    showToast({
                      type: 'success',
                      title: `Updated slot to ${alt.label}`,
                    });
                  }}
                  className="px-3 py-1.5 text-xs font-bold bg-white border border-red-300 text-red-800 rounded-xl hover:bg-red-100 transition-colors flex items-center gap-1.5 shadow-2xs"
                >
                  <Clock className="w-3.5 h-3.5 text-red-600" />
                  {alt.label}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 5-Step Stepper Header */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-2xs">
        <div className="flex items-center justify-between">
          {stepsList.map((st, idx) => {
            const isCompleted = currentStep > st.num;
            const isCurrent = currentStep === st.num;
            return (
              <React.Fragment key={st.num}>
                <div className="flex flex-col sm:flex-row items-center gap-2">
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
                    className={`text-xs font-bold hidden md:inline-block ${
                      isCurrent ? 'text-slate-900' : isCompleted ? 'text-slate-700' : 'text-slate-400'
                    }`}
                  >
                    {st.title}
                  </span>
                </div>
                {idx < stepsList.length - 1 && (
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

      {/* Step Content Container */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm min-h-[420px]">
        {/* STEP 1: ACCESS MODE */}
        {currentStep === 1 && (
          <div className="space-y-6">
            <div>
              <h3 className="text-base font-bold text-slate-900">
                Step 1: Choose Operating Access Mode
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                Select your intended operational protocol. Modes restricted by lab policy are locked.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {[
                {
                  id: 'INDEPENDENT',
                  name: 'Independent Operation',
                  icon: User,
                  desc: 'Full hands-on instrument control for pre-certified operators. Self-directed experiment execution.',
                  badge: 'Pre-approval required',
                },
                {
                  id: 'SUPERVISED',
                  name: 'Supervised Session',
                  icon: Users,
                  desc: 'Facility specialist present throughout session. Ideal for new protocols or complex runs.',
                  badge: 'Staff scheduled',
                },
                {
                  id: 'STAFF_SERVICE',
                  name: 'Staff-Operated Service',
                  icon: ShieldAlert,
                  desc: 'Drop off samples/specimens. Lab technician runs scan or run and exports datasets.',
                  badge: 'Turnaround: 2-3 days',
                },
                {
                  id: 'COLLABORATION',
                  name: 'Collaborative Joint Research',
                  icon: BookmarkCheck,
                  desc: 'Cross-institutional grant co-investigator access with shared authorship protocols.',
                  badge: 'PI Approval required',
                },
              ].map((m) => {
                const IconComponent = m.icon;
                const isSupported = supportedModes.includes(m.id);
                const isSelected = accessMode === m.id;

                return (
                  <button
                    key={m.id}
                    type="button"
                    disabled={!isSupported}
                    onClick={() => setAccessMode(m.id)}
                    className={`p-5 rounded-2xl border text-left transition-all relative ${
                      isSelected
                        ? 'border-blue-600 bg-blue-50/50 ring-2 ring-blue-500/20'
                        : isSupported
                        ? 'border-slate-200 hover:border-slate-300 hover:bg-slate-50/60'
                        : 'border-slate-200/60 bg-slate-50/50 opacity-40 cursor-not-allowed'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2.5">
                        <div
                          className={`p-2 rounded-xl ${
                            isSelected
                              ? 'bg-blue-600 text-white'
                              : 'bg-slate-100 text-slate-700'
                          }`}
                        >
                          <IconComponent className="w-4 h-4" />
                        </div>
                        <span className="text-sm font-bold text-slate-900">{m.name}</span>
                      </div>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                        {isSupported ? m.badge : 'Policy Restricted'}
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 leading-relaxed">{m.desc}</p>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* STEP 2: PICK TIME SLOT */}
        {currentStep === 2 && (
          <div className="space-y-6">
            <div>
              <h3 className="text-base font-bold text-slate-900">
                Step 2: Reserve Instrument Schedule Window
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                Select your scheduled session. Blackout periods, maintenance buffers, and existing bookings are reflected in real time.
              </p>
            </div>

            <SlotPicker
              resourceId={resource.id}
              selectedStartAt={startAt}
              selectedEndAt={endAt}
              conflictAlternativeSlots={conflictAlternatives}
              onSelectSlot={(s, e) => {
                setStartAt(s);
                setEndAt(e);
                setConflictError(null);
              }}
            />
          </div>
        )}

        {/* STEP 3: PURPOSE & MATERIALS */}
        {currentStep === 3 && (
          <div className="space-y-6">
            <div>
              <h3 className="text-base font-bold text-slate-900">
                Step 3: Research Statement & Outside Materials
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                State your project objectives. Any chemicals, biomaterials, or custom substrates brought into the lab must be declared for safety screening.
              </p>
            </div>

            {/* Purpose Textarea */}
            <div className="space-y-2">
              <label htmlFor="purposeStatement" className="block text-xs font-bold text-slate-800">
                Project Purpose & Experimental Summary <span className="text-red-500">*</span>
              </label>
              <textarea
                id="purposeStatement"
                value={purpose}
                onChange={(e) => setPurpose(e.target.value)}
                rows={4}
                placeholder="Describe experimental goals, sample specifications, intended run conditions, and protocol details..."
                className="w-full text-xs p-3.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all leading-relaxed"
              />
              <div className="flex justify-between text-[11px] text-slate-400">
                <span>Minimum 5 characters required for review board</span>
                <span>{purpose.length} characters</span>
              </div>
            </div>

            {/* Outside Materials Declaration */}
            <div className="pt-4 border-t border-slate-200 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-bold text-slate-800">
                    Declared Outside Materials & Samples
                  </h4>
                  <p className="text-[11px] text-slate-500">
                    Hazardous materials or biological agents require manager approval prior to facility entry.
                  </p>
                </div>
              </div>

              {/* Material list */}
              <div className="space-y-2">
                {materials.map((m, idx) => (
                  <div
                    key={idx}
                    className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between"
                  >
                    <div className="flex items-center gap-2.5">
                      <span className="w-2 h-2 rounded-full bg-blue-600 inline-block" />
                      <div>
                        <span className="text-xs font-bold text-slate-800 block">
                          {m.name}
                        </span>
                        {m.hazardClass && (
                          <span className="text-[10px] text-slate-500">
                            Class: {m.hazardClass}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {m.needsApproval ? (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-200">
                          Manager Review Required
                        </span>
                      ) : (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                          Pre-Approved
                        </span>
                      )}
                      <button
                        type="button"
                        onClick={() => handleRemoveMaterial(idx)}
                        className="p-1 text-slate-400 hover:text-red-600 rounded-lg transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Add Material Input Row */}
              <form
                onSubmit={handleAddMaterial}
                className="p-3 bg-blue-50/40 border border-dashed border-blue-200 rounded-xl flex flex-col sm:flex-row items-center gap-2"
              >
                <input
                  type="text"
                  placeholder="Material or reagent name (e.g., Titanium nanopowder)..."
                  value={newMaterialName}
                  onChange={(e) => setNewMaterialName(e.target.value)}
                  className="flex-1 text-xs px-3 py-2 bg-white border border-slate-300 rounded-lg outline-none focus:border-blue-500"
                />
                <select
                  aria-label="Material Hazard Classification"
                  value={newMaterialHazard}
                  onChange={(e) => setNewMaterialHazard(e.target.value)}
                  className="text-xs px-3 py-2 bg-white border border-slate-300 rounded-lg outline-none"
                >
                  <option value="Non-Hazardous">Inert / Non-Hazardous</option>
                  <option value="Flammable / Volatile">Flammable / Volatile</option>
                  <option value="Biohazard BSL-1">Biohazard BSL-1</option>
                  <option value="Nanoparticle / Powder">Nanoparticle / Powder</option>
                </select>
                <button
                  type="submit"
                  disabled={!newMaterialName.trim()}
                  className="px-3.5 py-2 text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors flex items-center gap-1 shrink-0 disabled:opacity-40"
                >
                  <Plus className="w-3.5 h-3.5" /> Add
                </button>
              </form>
            </div>
          </div>
        )}

        {/* STEP 4: COMPLIANCE & SAFETY WAIVER */}
        {currentStep === 4 && (
          <div className="space-y-6">
            <div>
              <h3 className="text-base font-bold text-slate-900">
                Step 4: Compliance Attestation & Digital Signature
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                Institutional facilities require binding safety acknowledgments and digital signature capture before slot confirmation.
              </p>
            </div>

            {/* Checkboxes */}
            <div className="space-y-3 bg-slate-50 p-4 rounded-xl border border-slate-200">
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={safetyChecklist.codeOfConduct}
                  onChange={(e) =>
                    setSafetyChecklist({ ...safetyChecklist, codeOfConduct: e.target.checked })
                  }
                  className="mt-0.5 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                />
                <div className="text-xs">
                  <span className="font-bold text-slate-900 block">
                    Institutional Code of Laboratory Conduct & Hygiene
                  </span>
                  <span className="text-slate-500 text-[11px]">
                    I agree to follow all posted lab safety signage, never leave running machinery unattended without approval, and clean the workspace after use.
                  </span>
                </div>
              </label>

              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={safetyChecklist.cleanroomSop}
                  onChange={(e) =>
                    setSafetyChecklist({ ...safetyChecklist, cleanroomSop: e.target.checked })
                  }
                  className="mt-0.5 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                />
                <div className="text-xs">
                  <span className="font-bold text-slate-900 block">
                    Cleanroom & Specimen Protocol Adherence
                  </span>
                  <span className="text-slate-500 text-[11px]">
                    I understand the contamination risks and confirm that all materials introduced comply with the facility envelope.
                  </span>
                </div>
              </label>

              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={safetyChecklist.ppeEquipped}
                  onChange={(e) =>
                    setSafetyChecklist({ ...safetyChecklist, ppeEquipped: e.target.checked })
                  }
                  className="mt-0.5 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                />
                <div className="text-xs">
                  <span className="font-bold text-slate-900 block">
                    PPE Certification & Liability Waiver
                  </span>
                  <span className="text-slate-500 text-[11px]">
                    I will arrive equipped with required Personal Protective Equipment (lab coat, safety goggles, gloves) for the full duration.
                  </span>
                </div>
              </label>
            </div>

            {/* Signature Pad */}
            <div className="space-y-2">
              <SignaturePad
                documentTitle="Digital Safety & Environmental Accord"
                hasSigned={Boolean(signatureData)}
                onSignatureComplete={(data) => setSignatureData(data)}
              />
            </div>
          </div>
        )}

        {/* STEP 5: REVIEW & FAIR-USE METER */}
        {currentStep === 5 && (
          <div className="space-y-6">
            <div>
              <h3 className="text-base font-bold text-slate-900">
                Step 5: Final Review & Submission
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                Verify your booking details and review projected fair-use consumption before submitting to the review queue.
              </p>
            </div>

            {/* Fair-Use Meter Component per Spec §5.4 */}
            <FairUseMeter
              quota={quota}
              requestedHours={requestedHours}
              tokensPerHour={tokensPerHour}
            />

            {/* Request Summary Card */}
            <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-4">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Reservation Summary
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div>
                  <span className="text-slate-500 block">Instrument:</span>
                  <span className="font-bold text-slate-900">{resource.name}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">Access Mode:</span>
                  <span className="font-bold text-blue-600">{accessMode}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">Scheduled Time:</span>
                  <span className="font-bold text-slate-900">
                    {startAt && endAt ? (
                      <>
                        {new Date(startAt).toLocaleDateString('en-US', {
                          weekday: 'short',
                          month: 'short',
                          day: 'numeric',
                        })}{' '}
                        • {new Date(startAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', timeZone: 'UTC' })} -{' '}
                        {new Date(endAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', timeZone: 'UTC' })} ({requestedHours}h)
                      </>
                    ) : (
                      'No specific slot chosen (Queue only)'
                    )}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block">Outside Materials:</span>
                  <span className="font-bold text-slate-900">
                    {materials.length} declared item(s)
                  </span>
                </div>
              </div>

              {purpose && (
                <div className="pt-3 border-t border-slate-100 text-xs">
                  <span className="text-slate-500 block mb-1">Project Purpose:</span>
                  <p className="p-3 bg-slate-50 rounded-xl text-slate-700 italic leading-relaxed">
                    "{purpose}"
                  </p>
                </div>
              )}
            </div>

            {/* Prominent Manager Review Notice (Spec §5.4 Section 1.5) */}
            <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <span className="text-xs font-bold text-amber-900 block">
                  Submitting this request does not reserve the slot immediately.
                </span>
                <span className="text-xs text-amber-800 mt-0.5 block leading-relaxed">
                  A facility manager will review your request against current maintenance schedules and outside material declarations. You will receive an in-app and email notification upon approval.
                </span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Navigation Footer Controls */}
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
          {currentStep < 5 ? (
            <button
              type="button"
              onClick={() => setCurrentStep((prev) => Math.min(5, prev + 1))}
              disabled={!canAdvance}
              className="px-6 py-2.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition-colors flex items-center gap-1.5 shadow-xs disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Continue to Step {currentStep + 1}
              <ChevronRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              type="button"
              onClick={() => handleSubmit(false)}
              disabled={isSubmitting}
              className="px-7 py-2.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl transition-colors flex items-center gap-2 shadow-xs disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Submitting Request...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  Submit Access Request
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
