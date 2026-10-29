import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Calendar, Coins, MapPin, CheckCircle2 } from 'lucide-react';
import { resourcesApi } from '../../api/resources.api';
import type { ResourceDetail, EligibilityResult } from '../../api/resources.api';
import { StatusBadge } from '../../components/feedback/StatusBadge';
import { DemoTag } from '../../components/feedback/DemoTag';
import { EligibilityChecklist } from '../../components/feedback/EligibilityChecklist';
import { PolicySummaryCard } from '../../components/resources/PolicySummaryCard';
import { ConfidentialInstructionsCard } from '../../components/resources/ConfidentialInstructionsCard';
import { useAuth } from '../../context/AuthContext';

export function ResourceDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [resource, setResource] = useState<ResourceDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Mode & Tabs
  const [activeMode, setActiveMode] = useState<string>('INDEPENDENT');
  const [activeTab, setActiveTab] = useState<'overview' | 'specs' | 'policy' | 'availability' | 'confidential'>('overview');

  // Live Eligibility Check
  const [eligibility, setEligibility] = useState<EligibilityResult | null>(null);
  const [isCheckingEligibility, setIsCheckingEligibility] = useState(false);

  const { isAuthenticated, user } = useAuth();
  const navigate = useNavigate();

  // Load Resource Data
  useEffect(() => {
    async function fetchResource() {
      if (!id) return;
      setIsLoading(true);
      try {
        const res = await resourcesApi.getResourceById(id);
        if (res?.ok && res.data) {
          setResource(res.data);
          const supported = res.data.policySummary?.supportedAccessModes || ['INDEPENDENT', 'SUPERVISED'];
          if (supported.length > 0 && !supported.includes(activeMode)) {
            setActiveMode(supported[0]);
          }
        }
      } catch {
        // Fallback demo resource data
        setResource({
          id: id || 'res_001',
          name: 'Prusa i3 MK3S+ 3D Printer',
          category: 'fabrication',
          facility_name: 'Digital Fabrication Lab',
          facility_city: 'Cambridge',
          institution_name: 'Institute of Applied Technology',
          status: 'ACTIVE',
          riskLevel: 'LOW',
          description:
            'High-precision FDM desktop 3D printer featuring automated mesh bed leveling, filament runout detection, and magnetic spring-steel PEI print sheets. Designed for rapid prototyping of mechanical fixtures, architectural models, and non-structural components.',
          capabilities: ['FDM', 'PLA', 'PETG', 'ABS', 'rapid-prototyping', '0.1mm-resolution', 'dual-color'],
          specs: {
            technology: 'Fused Deposition Modeling (FDM)',
            buildVolume: '250 x 210 x 210 mm',
            layerResolution: '0.05 - 0.35 mm',
            nozzleDiameter: '0.4 mm brass',
            maxHotendTemp: '300 °C',
            maxBedTemp: '120 °C',
            powerRating: '240W / 120-240V',
          },
          policy_data: {
            accessModes: ['INDEPENDENT', 'SUPERVISED', 'STAFF_SERVICE'],
            supportedAccessModes: ['INDEPENDENT', 'SUPERVISED', 'STAFF_SERVICE'],
            maxSingleBookingHours: 8,
            maxWeeklyHours: 16,
            advanceBookingDays: 14,
            cancellationNoticeHours: 12,
            requiredTrainings: ['train_3d_basics'],
            requiredDocuments: ['doc_safety_waiver_v2'],
            requiresStaffSupervision: false,
            pricing: {
              model: 'FAIR_USE_TOKENS',
              tokensPerHour: 1,
              hourlyRate: 0,
            },
          },
          policySummary: {
            version: 1,
            supportedAccessModes: ['INDEPENDENT', 'SUPERVISED', 'STAFF_SERVICE'],
            pricingModel: 'FAIR_USE_TOKENS',
            tokensPerHour: 1,
            requiresApproval: false,
          },
          confidentialDetails: {
            doorCode: '4829#',
            lockboxPin: '9173',
            specialInstructions: 'Clean PEI sheet with 99% isopropyl alcohol after part removal. Return brass wire brush to tool rack.',
          },
        });
      } finally {
        setIsLoading(false);
      }
    }

    fetchResource();
  }, [id]);

  // Run live eligibility check whenever mode or user changes
  useEffect(() => {
    async function evaluateEligibility() {
      if (!id) return;
      setIsCheckingEligibility(true);
      try {
        const res = await resourcesApi.checkEligibility(id, { accessMode: activeMode });
        if (res?.ok && res.data) {
          setEligibility(res.data);
        }
      } catch {
        // Fallback demo eligibility result
        setEligibility({
          eligible: true,
          canRequest: true,
          checks: [
            {
              key: 'membership_verified',
              label: 'Institutional affiliation verified',
              status: 'PASS',
            },
            {
              key: 'user_group_allowed',
              label: 'Permitted under active policy rules',
              status: 'PASS',
            },
            {
              key: 'training',
              label: '3D Printing Safety Certification (Module 101)',
              status: isAuthenticated ? 'PASS' : 'MISSING',
              action: !isAuthenticated ? { type: 'BOOK_TRAINING', label: 'Enroll in Module' } : undefined,
            },
            {
              key: 'documents',
              label: 'Annual Lab Safety Waiver signed',
              status: 'PASS',
            },
            {
              key: 'fair_use',
              label: 'Fair-use departmental token balance',
              status: 'PASS',
            },
            {
              key: 'slot_free',
              label: 'Operating schedule window available',
              status: 'PASS',
            },
          ],
          requiredNextSteps: [],
        });
      } finally {
        setIsCheckingEligibility(false);
      }
    }

    evaluateEligibility();
  }, [id, activeMode, isAuthenticated, user]);

  if (isLoading) {
    return (
      <div className="max-w-5xl mx-auto py-16 text-center text-slate-400 text-xs">
        Loading technical specifications and working envelope...
      </div>
    );
  }

  if (!resource) {
    return (
      <div className="max-w-5xl mx-auto py-16 text-center text-slate-600">
        Resource not found.
      </div>
    );
  }

  const supportedModes = resource.policySummary?.supportedAccessModes || ['INDEPENDENT', 'SUPERVISED'];
  const tokenCost = resource.policySummary?.tokensPerHour ?? 1;

  const modeOptions = [
    { id: 'INDEPENDENT', title: 'Independent Operation', desc: 'Direct access after badge check-in' },
    { id: 'SUPERVISED', title: 'Staff Supervised', desc: 'Lab operator present during use' },
    { id: 'STAFF_SERVICE', title: 'Staff-Operated Service', desc: 'Submit job; staff executes process' },
    { id: 'COLLABORATIVE', title: 'Collaborative Research', desc: 'Joint institutional partnership' },
  ];

  return (
    <div className="space-y-8 max-w-5xl mx-auto pb-24 px-4">
      {/* Back Link */}
      <Link
        to="/discover"
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-900 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Back to Equipment Discovery</span>
      </Link>

      {/* Equipment Header Banner */}
      <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-xs space-y-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-100 pb-6">
          <div>
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              <span className="text-[10px] font-bold tracking-wider uppercase text-blue-600 bg-blue-50 px-2.5 py-0.5 rounded-md">
                {resource.category}
              </span>
              <span className="text-[10px] font-bold tracking-wider uppercase text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md">
                Risk: {resource.riskLevel || 'LOW'}
              </span>
              <StatusBadge status={resource.status} />
              <DemoTag />
            </div>

            <h1 className="text-2xl sm:text-4xl font-black text-slate-900 tracking-tight">
              {resource.name}
            </h1>

            <p className="text-xs text-slate-500 mt-1 flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-slate-400" />
              <span>
                {resource.facility_name || 'Central Laboratory'} • {resource.institution_name || 'Institutional Network'} ({resource.facility_city || 'Cambridge'})
              </span>
            </p>
          </div>

          <div className="flex flex-col sm:items-end gap-1.5 bg-slate-50 border border-slate-200 rounded-2xl p-4 shrink-0">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Fair-Use Accounting
            </span>
            <div className="flex items-center gap-1.5 text-base font-black text-slate-900">
              <Coins className="w-4 h-4 text-amber-500" />
              <span>{tokenCost === 0 ? 'Free Access' : `${tokenCost} Tokens / Hour`}</span>
            </div>
            <span className="text-[11px] text-slate-500">
              Standard cancellation: 12h notice
            </span>
          </div>
        </div>

        {/* Access Mode Selector (Spec §5.3) */}
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2.5">
            Select Intended Access Mode:
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
            {modeOptions.map((mode) => {
              const isOffered = supportedModes.includes(mode.id);
              const isSelected = activeMode === mode.id;

              return (
                <button
                  key={mode.id}
                  type="button"
                  disabled={!isOffered}
                  onClick={() => setActiveMode(mode.id)}
                  className={`p-3.5 rounded-2xl border text-left transition-all flex flex-col justify-between ${
                    !isOffered
                      ? 'bg-slate-50 border-slate-200 opacity-40 cursor-not-allowed'
                      : isSelected
                      ? 'bg-blue-50/80 border-blue-600 ring-2 ring-blue-600/20 text-blue-900 shadow-xs'
                      : 'bg-white border-slate-200 hover:border-slate-300 text-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-bold">{mode.title}</span>
                    {isSelected && <CheckCircle2 className="w-3.5 h-3.5 text-blue-600" />}
                  </div>
                  <span className="text-[11px] text-slate-500 leading-tight">
                    {isOffered ? mode.desc : 'Not offered on this machine'}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="flex items-center gap-1.5 border-b border-slate-200 overflow-x-auto text-xs font-semibold">
        {[
          { id: 'overview', label: 'Overview & Eligibility' },
          { id: 'specs', label: 'Technical Specifications' },
          { id: 'policy', label: 'Rules & Policy' },
          { id: 'availability', label: 'Schedule & Operating Hours' },
          { id: 'confidential', label: 'Physical Credentials' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`px-4 py-3 border-b-2 font-bold transition-colors whitespace-nowrap ${
              activeTab === tab.id
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content Display */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Description */}
          <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 space-y-4 shadow-xs">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Description & Research Envelope
            </h3>
            <p className="text-sm text-slate-700 leading-relaxed">
              {resource.description}
            </p>

            <div className="pt-2">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400 block mb-2">
                Certified Capabilities & Processing
              </span>
              <div className="flex flex-wrap gap-1.5">
                {(resource.capabilities || []).map((cap, i) => (
                  <span
                    key={i}
                    className="text-xs bg-slate-100 text-slate-700 border border-slate-200 px-3 py-1 rounded-xl font-medium"
                  >
                    {cap}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Live Deterministic Eligibility Checklist Component */}
          <EligibilityChecklist
            checks={eligibility?.checks || []}
            eligible={eligibility?.eligible}
            canRequest={eligibility?.canRequest}
            isLoading={isCheckingEligibility}
          />
        </div>
      )}

      {activeTab === 'specs' && (
        <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 space-y-6 shadow-xs">
          <div>
            <h3 className="text-base font-black text-slate-900 tracking-tight">
              Machine Dimensions & Technical Specifications
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              Verify your physical sample dimensions and material compatibility
            </p>
          </div>

          {resource.specs && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {Object.entries(resource.specs).map(([key, val]) => (
                <div
                  key={key}
                  className="bg-slate-50 border border-slate-200 rounded-2xl p-4 flex flex-col justify-between"
                >
                  <span className="text-[10px] font-bold uppercase text-slate-400 mb-1">
                    {key.replace(/([A-Z])/g, ' $1')}
                  </span>
                  <span className="text-xs font-black text-slate-900 font-mono">
                    {String(val)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'policy' && (
        <PolicySummaryCard policy={resource.policy_data} />
      )}

      {activeTab === 'availability' && (
        <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 space-y-6 shadow-xs">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
            <div>
              <h3 className="text-base font-black text-slate-900 tracking-tight">
                Operating Hours & Reservation Schedule
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Operating in facility local timezone: <strong>UTC (Eastern Standard Time)</strong>
              </p>
            </div>

            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-xs font-bold text-slate-700">Open for Reservations</span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                FACILITY SCHEDULE
              </span>
              <span className="font-bold text-slate-900 block mb-0.5">
                Monday – Friday: 08:00 – 22:00
              </span>
              <span className="text-[11px] text-slate-500">
                Saturday: 10:00 – 18:00 (Staff-supervised only)
              </span>
            </div>

            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                EARLIEST AVAILABLE OPENING
              </span>
              <span className="font-bold text-emerald-700 block mb-0.5">
                Tomorrow at 09:00 UTC
              </span>
              <span className="text-[11px] text-slate-500">
                4 consecutive hours slot open
              </span>
            </div>

            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                CLEANUP BUFFER
              </span>
              <span className="font-bold text-slate-900 block mb-0.5">
                30 Minutes Maintenance
              </span>
              <span className="text-[11px] text-slate-500">
                Automatic cooldown window between users
              </span>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'confidential' && (
        <ConfidentialInstructionsCard
          hasApprovedBooking={false}
          confidentialData={resource.confidentialDetails}
        />
      )}

      {/* Sticky Bottom Action Bar (Spec §5.3) */}
      <div className="fixed bottom-12 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200 py-3 shadow-lg">
        <div className="max-w-5xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="hidden sm:block">
              <span className="text-xs font-bold text-slate-900 block truncate max-w-xs">
                {resource.name}
              </span>
              <span className="text-[11px] text-slate-500">
                Mode: <strong className="text-blue-600">{activeMode}</strong> • {tokenCost} Tokens/hr
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2.5 w-full sm:w-auto">
            <button
              type="button"
              onClick={() => setActiveTab('policy')}
              className="hidden sm:inline-flex px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors"
            >
              Policy Rules
            </button>

            <button
              type="button"
              onClick={() => {
                navigate(`/resources/${id}/request?mode=${activeMode}`);
              }}
              className="flex-1 sm:flex-initial px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-colors shadow-xs flex items-center justify-center gap-2"
            >
              <Calendar className="w-4 h-4" />
              <span>
                {activeMode === 'STAFF_SERVICE' ? 'Request Staff Service' : 'Request Working Slot'}
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
