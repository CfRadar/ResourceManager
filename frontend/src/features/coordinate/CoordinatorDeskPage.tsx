import { useState, useEffect, useCallback } from 'react';
import {
  Inbox,
  Send,
  Building2,
  Sparkles,
  Search,
  CheckCircle2,
  XCircle,
  Clock,
  Lock,
  UserCheck,
  ShieldCheck,
  AlertCircle,
  FileQuestion,
  RefreshCw,
} from 'lucide-react';
import { coordinationApi } from '../../api/coordination.api';
import type { NeedRequest, NeedCandidate, Referral } from '../../api/coordination.api';
import { CandidateMatchCard } from '../../components/coordination/CandidateMatchCard';
import { ReferralComposerModal } from '../../components/coordination/ReferralComposerModal';
import { DemoTag } from '../../components/feedback/DemoTag';

export function CoordinatorDeskPage() {
  const [activeTab, setActiveTab] = useState<'NEEDS' | 'INBOX'>('NEEDS');

  // Need Requests State
  const [needRequests, setNeedRequests] = useState<NeedRequest[]>([]);
  const [selectedNeed, setSelectedNeed] = useState<NeedRequest | null>(null);
  const [candidates, setCandidates] = useState<NeedCandidate[]>([]);
  const [isLoadingCandidates, setIsLoadingCandidates] = useState(false);
  const [selectedCandidateForReferral, setSelectedCandidateForReferral] = useState<NeedCandidate | null>(null);
  const [sentReferralMap, setSentReferralMap] = useState<Record<string, boolean>>({});

  // Referrals Inbox State
  const [inboxReferrals, setInboxReferrals] = useState<Referral[]>([]);
  const [selectedReferral, setSelectedReferral] = useState<Referral | null>(null);
  const [responseAction, setResponseAction] = useState<'ACCEPT' | 'DECLINE' | null>(null);
  const [responseMessage, setResponseMessage] = useState('');
  const [nextSteps, setNextSteps] = useState('');

  // General Loading & Filters
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchFilter, setSearchFilter] = useState('');

  const loadData = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Load both need requests and referrals inbox concurrently
      const [needsRes, inboxRes] = await Promise.allSettled([
        coordinationApi.fetchCoordinatorNeedRequests(),
        coordinationApi.fetchReferralsInbox(),
      ]);

      if (needsRes.status === 'fulfilled' && needsRes.value.ok) {
        setNeedRequests(needsRes.value.data || []);
        if (needsRes.value.data && needsRes.value.data.length > 0 && !selectedNeed) {
          setSelectedNeed(needsRes.value.data[0]);
        }
      } else {
        // Fallback demo data
        const demoNeeds: NeedRequest[] = [
          {
            id: 'need-01-cryotem',
            requesterId: 'usr-sarah-lin',
            requesterName: 'Dr. Sarah Lin',
            institutionName: 'Apex Institute of Science',
            capabilityNeeded: '300kV Cryo-TEM with Direct Electron Detector',
            category: 'ELECTRON_MICROSCOPY',
            description: 'Single-particle analysis for 70S ribosome complexes requiring < 3.2 Angstrom spatial resolution in vitreous ice.',
            technicalRequirements: ['300kV', 'K3 Detector', 'Energy Filter', 'Cryo-Transfer'],
            requiredCapabilities: ['High-Resolution Cryo-EM', 'EER movie acquisition'],
            travelRadiusKm: 120,
            accessModePreference: 'STAFF_SERVICE',
            consentShareContact: true,
            status: 'TRIAGED',
            createdAt: '2026-10-28T14:30:00Z',
          },
          {
            id: 'need-02-nmr800',
            requesterId: 'usr-ananya-roy',
            requesterName: 'Prof. Ananya Roy',
            institutionName: 'Metropolitan Tech University',
            capabilityNeeded: '800 MHz Biomolecular NMR Spectrometer',
            category: 'SPECTROSCOPY',
            description: 'Triple-resonance 3D protein structure determination for disordered intrinsically unfoldable neuro-peptides.',
            technicalRequirements: ['800MHz', 'CryoProbe', '13C/15N Triple Resonance'],
            requiredCapabilities: ['Liquid State NMR'],
            travelRadiusKm: 60,
            accessModePreference: 'SUPERVISED',
            consentShareContact: false, // Explicit privacy opt-out
            status: 'SUBMITTED',
            createdAt: '2026-10-29T10:15:00Z',
          },
        ];
        setNeedRequests(demoNeeds);
        if (!selectedNeed) setSelectedNeed(demoNeeds[0]);
      }

      if (inboxRes.status === 'fulfilled' && inboxRes.value.ok) {
        setInboxReferrals(inboxRes.value.data || []);
      } else {
        // Fallback demo referrals inbox
        const demoInbox: Referral[] = [
          {
            id: 'ref-inbox-01',
            needRequestId: 'need-01-cryotem',
            fromInstitutionId: 'inst-apex-01',
            fromInstitutionName: 'Apex Institute of Science',
            toInstitutionId: 'inst-metropolitan-02',
            toInstitutionName: 'Metropolitan Tech University',
            resourceId: 'res-titan-krios',
            resourceName: 'FEI Titan Krios 300kV Cryo-TEM',
            status: 'PROPOSED',
            messageToReceiver: 'Apex researcher requires 14 hours high-resolution acquisition. Reciprocal billing via central token clearing agreement.',
            shareRequesterContact: true,
            contactReleased: false,
            requesterContact: {
              name: 'Dr. Sarah Lin',
              email: 'sarah.lin@apex.ac.in',
              phone: '+91 98765 43210',
              department: 'Department of Bioengineering',
            },
            createdAt: '2026-10-29T16:00:00Z',
          },
          {
            id: 'ref-inbox-02',
            needRequestId: 'need-02-nmr800',
            fromInstitutionId: 'inst-metropolitan-02',
            fromInstitutionName: 'Metropolitan Tech University',
            toInstitutionId: 'inst-apex-01',
            toInstitutionName: 'Apex Institute of Science',
            resourceId: 'res-bruker-800',
            resourceName: 'Bruker Avance III HD 800MHz NMR',
            status: 'ACCEPTED',
            messageToReceiver: 'Supervised acquisition for disordered peptides. Approved with next steps.',
            shareRequesterContact: false,
            contactReleased: false,
            responseMessage: 'Accepted by core facility director. Workstation reserved for Nov 12.',
            nextSteps: 'Please submit safety declaration form MS-2 via portal before courier arrives.',
            createdAt: '2026-10-27T08:00:00Z',
          },
        ];
        setInboxReferrals(demoInbox);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error fetching coordination records');
    } finally {
      setIsLoading(false);
    }
  }, [selectedNeed]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Load AI candidates whenever selected need changes
  const loadCandidatesForNeed = useCallback(async (needId: string) => {
    try {
      setIsLoadingCandidates(true);
      const res = await coordinationApi.fetchNeedCandidates(needId);
      if (res.ok && res.data) {
        setCandidates(res.data);
      } else {
        // Fallback candidate list
        setCandidates([
          {
            resourceId: 'res-cand-01',
            resourceName: 'FEI Titan Krios 300kV Cryo-TEM',
            institutionId: 'inst-cand-inst-1',
            institutionName: 'Southern Regional Nanotechnology Hub',
            facilityName: 'Advanced Cryo-Microscopy Pavilion',
            matchScore: 0.96,
            matchReasons: [
              'Exact match: 300kV accelerating voltage with Falcon 4 direct detector',
              'Energy filter (BioContinuum) equipped',
              'Available capacity within requested 120km radius (48 km away)',
            ],
            accessModes: ['STAFF_SERVICE', 'SUPERVISED'],
            estimatedDistanceKm: 48,
            availableSlotCount: 6,
            pricingRate: 350,
            currency: 'Tokens',
          },
          {
            resourceId: 'res-cand-02',
            resourceName: 'JEOL CRYO ARM 300 II Electron Microscope',
            institutionId: 'inst-cand-inst-2',
            institutionName: 'State Central Institute of Technology',
            facilityName: 'Structural Biology Resource Core',
            matchScore: 0.88,
            matchReasons: [
              'High-voltage 300kV cold-FEG source',
              'Automated sample exchange system (holds 12 grids)',
              'Located 82 km away within travel limit',
            ],
            accessModes: ['STAFF_SERVICE'],
            estimatedDistanceKm: 82,
            availableSlotCount: 3,
            pricingRate: 400,
            currency: 'Tokens',
          },
        ]);
      }
    } catch {
      setCandidates([]);
    } finally {
      setIsLoadingCandidates(false);
    }
  }, []);

  useEffect(() => {
    if (selectedNeed) {
      loadCandidatesForNeed(selectedNeed.id);
    }
  }, [selectedNeed, loadCandidatesForNeed]);

  // Referral Submission
  const handleSendReferral = async (data: {
    toInstitutionId: string;
    toFacilityId?: string;
    resourceId?: string;
    messageToReceiver: string;
    shareRequesterContact: boolean;
  }) => {
    if (!selectedNeed) return;
    await coordinationApi.createReferral(selectedNeed.id, data);
    if (selectedCandidateForReferral) {
      setSentReferralMap((prev) => ({
        ...prev,
        [selectedCandidateForReferral.resourceId]: true,
      }));
    }
    await loadData();
  };

  // Referral Response (Accept / Decline)
  const handleRespondReferral = async () => {
    if (!selectedReferral || !responseAction) return;
    try {
      await coordinationApi.respondToReferral(selectedReferral.id, {
        response: responseAction,
        responseMessage: responseMessage.trim() || `${responseAction} by receiving coordinator desk.`,
        nextSteps: responseAction === 'ACCEPT' ? nextSteps.trim() : undefined,
      });
      setResponseAction(null);
      setResponseMessage('');
      setNextSteps('');
      await loadData();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Error responding to referral');
    }
  };

  // Release Contact Info
  const handleReleaseContact = async (referralId: string) => {
    try {
      await coordinationApi.releaseReferralContact(referralId, 'Manually released after verified intake authorization.');
      await loadData();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Error releasing contact details');
    }
  };

  const filteredNeeds = needRequests.filter(
    (n) =>
      n.capabilityNeeded?.toLowerCase().includes(searchFilter.toLowerCase()) ||
      n.description?.toLowerCase().includes(searchFilter.toLowerCase()) ||
      n.institutionName?.toLowerCase().includes(searchFilter.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Top Banner & Governance Overview */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-slate-200 shadow-xs">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h1 className="text-xl font-black text-slate-900">Institutional Coordinator Desk</h1>
            <DemoTag label="SPEC §7 & §4.14" />
          </div>
          <p className="text-xs text-slate-500">
            Route unmet capability demands across institutional partner boundaries, manage reciprocal referral inboxes, and enforce contact privacy protocols.
          </p>
        </div>

        <button
          type="button"
          onClick={loadData}
          className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-colors flex items-center gap-1.5"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          Refresh Queue
        </button>
      </div>

      {error && (
        <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-2xl flex items-center gap-2 text-xs text-rose-700 font-medium">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* KPI Tiles */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        {[
          { label: 'OPEN NEED REQUESTS', value: needRequests.length.toString(), sub: 'Awaiting candidate routing', icon: FileQuestion, color: 'text-indigo-600' },
          { label: 'INCOMING REFERRALS', value: inboxReferrals.filter((r) => r.status === 'PROPOSED').length.toString(), sub: 'Pending local review', icon: Inbox, color: 'text-amber-600' },
          { label: 'ACTIVE EXCHANGES', value: inboxReferrals.filter((r) => r.status === 'ACCEPTED').length.toString(), sub: 'Reciprocal tokens clear', icon: Send, color: 'text-emerald-600' },
          { label: 'PARTNER HUBS', value: '6 Institutions', sub: 'Federated MOU active', icon: Building2, color: 'text-purple-600' },
        ].map((kpi, idx) => {
          const Icon = kpi.icon;
          return (
            <div key={idx} className="bg-white border border-slate-200 rounded-2xl p-5 shadow-2xs">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-bold tracking-wider text-slate-400">{kpi.label}</span>
                <Icon className={`w-4 h-4 ${kpi.color}`} />
              </div>
              <p className="text-2xl font-black text-slate-900">{kpi.value}</p>
              <p className="text-[11px] text-slate-500 mt-1">{kpi.sub}</p>
            </div>
          );
        })}
      </div>

      {/* Tab Switcher */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
        <button
          type="button"
          onClick={() => setActiveTab('NEEDS')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-black transition-all ${
            activeTab === 'NEEDS'
              ? 'bg-indigo-600 text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Sparkles className="w-4 h-4" />
          Need Requests & Candidate Matching ({needRequests.length})
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('INBOX')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-black transition-all ${
            activeTab === 'INBOX'
              ? 'bg-indigo-600 text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Inbox className="w-4 h-4" />
          Incoming Referrals Inbox ({inboxReferrals.length})
        </button>
      </div>

      {/* TAB 1: NEED REQUESTS & CANDIDATE DISCOVERY */}
      {activeTab === 'NEEDS' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column (5 cols): FIFO List of Needs */}
          <div className="lg:col-span-5 space-y-4">
            <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs space-y-3">
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  type="text"
                  placeholder="Filter requests by capability, instrument, keyword..."
                  value={searchFilter}
                  onChange={(e) => setSearchFilter(e.target.value)}
                  className="w-full text-xs pl-9 pr-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="space-y-2">
                {filteredNeeds.map((need) => {
                  const isSelected = selectedNeed?.id === need.id;
                  return (
                    <div
                      key={need.id}
                      onClick={() => setSelectedNeed(need)}
                      className={`p-4 rounded-xl border text-left cursor-pointer transition-all ${
                        isSelected
                          ? 'bg-indigo-50/70 border-indigo-400 shadow-xs'
                          : 'bg-white border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <h4 className="text-xs font-black text-slate-900 line-clamp-1">{need.capabilityNeeded}</h4>
                        <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                          {need.status}
                        </span>
                      </div>

                      <p className="text-[11px] text-slate-600 line-clamp-2 mb-2 font-medium">
                        {need.description}
                      </p>

                      <div className="flex items-center justify-between text-[10px] text-slate-400 pt-2 border-t border-slate-100">
                        <span className="flex items-center gap-1 font-semibold text-slate-700">
                          <Building2 className="w-3 h-3 text-slate-400" />
                          {need.institutionName || 'Host Campus'}
                        </span>
                        <span>{new Date(need.createdAt).toLocaleDateString()}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Right Column (7 cols): Selected Need Details & AI Candidates */}
          <div className="lg:col-span-7 space-y-6">
            {selectedNeed ? (
              <>
                {/* Need Overview Card */}
                <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xs space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-4">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-[10px] font-black uppercase tracking-wider text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200">
                          Need #{selectedNeed.id.slice(0, 8)}
                        </span>
                        <span className="text-xs text-slate-400">• Radius: {selectedNeed.travelRadiusKm || 100} km</span>
                      </div>
                      <h3 className="text-base font-black text-slate-900">{selectedNeed.capabilityNeeded}</h3>
                    </div>

                    {/* Privacy Opt-in Indicator */}
                    <div>
                      {selectedNeed.consentShareContact ? (
                        <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                          <UserCheck className="w-3.5 h-3.5" />
                          Contact Sharing Permitted
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-700 border border-slate-300">
                          <Lock className="w-3.5 h-3.5" />
                          Contact Redacted
                        </span>
                      )}
                    </div>
                  </div>

                  <p className="text-xs text-slate-700 leading-relaxed font-medium">
                    {selectedNeed.description}
                  </p>

                  {/* Technical Tags */}
                  {selectedNeed.technicalRequirements && selectedNeed.technicalRequirements.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {selectedNeed.technicalRequirements.map((tag) => (
                        <span
                          key={tag}
                          className="px-2.5 py-0.5 rounded-lg text-[11px] font-medium bg-slate-100 text-slate-700"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* Candidate Discovery Header */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-indigo-600" />
                      <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider">
                        Ranked Candidate Facilities
                      </h3>
                    </div>
                    <span className="text-xs font-bold text-slate-500">
                      {isLoadingCandidates ? 'Matching...' : `${candidates.length} AI Candidates`}
                    </span>
                  </div>

                  {isLoadingCandidates ? (
                    <div className="p-8 text-center bg-white rounded-2xl border border-slate-200">
                      <Sparkles className="w-6 h-6 text-indigo-600 animate-spin mx-auto mb-2" />
                      <p className="text-xs text-slate-500">Running vector & BM25 compatibility indexing across partner nodes...</p>
                    </div>
                  ) : candidates.length === 0 ? (
                    <div className="p-8 text-center bg-white rounded-2xl border border-slate-200">
                      <p className="text-xs text-slate-500">No compatible equipment found within requested travel radius.</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {candidates.map((cand) => (
                        <CandidateMatchCard
                          key={cand.resourceId}
                          candidate={cand}
                          isReferred={!!sentReferralMap[cand.resourceId]}
                          onProposeReferral={(c) => setSelectedCandidateForReferral(c)}
                        />
                      ))}
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className="p-12 text-center bg-white rounded-3xl border border-slate-200 text-slate-400">
                <FileQuestion className="w-12 h-12 mx-auto mb-3 text-slate-300" />
                <p className="text-xs font-bold">Select a need request from the queue to inspect matching candidates.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: INCOMING REFERRALS INBOX */}
      {activeTab === 'INBOX' && (
        <div className="space-y-6">
          {/* Institutional Integrity Banner (Spec §7.2) */}
          <div className="p-4 bg-indigo-50/70 border border-indigo-200 rounded-2xl flex items-start gap-3">
            <ShieldCheck className="w-5 h-5 text-indigo-600 shrink-0 mt-0.5" />
            <div className="text-xs text-indigo-900 space-y-1">
              <span className="font-bold block">Autonomous Guard Rule: The system never marks a referral accepted on its own.</span>
              <p className="text-indigo-800 leading-relaxed font-normal">
                Every institutional referral requires explicit evaluation by facility coordinators to verify capacity, consumable availability, and safety clearances before accepting.
              </p>
            </div>
          </div>

          {/* Referrals List */}
          <div className="space-y-4">
            {inboxReferrals.length === 0 ? (
              <div className="p-12 text-center bg-white rounded-3xl border border-slate-200 text-slate-400">
                <Inbox className="w-12 h-12 mx-auto mb-3 text-slate-300" />
                <p className="text-xs font-bold">Your institutional inbox is clear. No incoming referrals awaiting review.</p>
              </div>
            ) : (
              inboxReferrals.map((referral) => {
                const isAccepted = referral.status === 'ACCEPTED';
                const isDeclined = referral.status === 'DECLINED';
                const isPending = referral.status === 'PROPOSED';

                return (
                  <div
                    key={referral.id}
                    className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xs hover:border-slate-300 transition-all space-y-4"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-[10px] font-mono font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                            REF #{referral.id.slice(0, 8)}
                          </span>
                          <span className="text-xs font-semibold text-slate-400">
                            From: <strong className="text-slate-800">{referral.fromInstitutionName}</strong>
                          </span>
                        </div>
                        <h4 className="text-base font-black text-slate-900">
                          Target Equipment: {referral.resourceName || 'Specialized Core Resource'}
                        </h4>
                      </div>

                      <div>
                        {isAccepted && (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                            Accepted by Campus
                          </span>
                        )}
                        {isDeclined && (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-rose-50 text-rose-800 border border-rose-200">
                            <XCircle className="w-3.5 h-3.5 text-rose-600" />
                            Declined
                          </span>
                        )}
                        {isPending && (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-800 border border-amber-200">
                            <Clock className="w-3.5 h-3.5 text-amber-600" />
                            Action Required
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Routing Message */}
                    <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-100 text-xs text-slate-700">
                      <span className="font-bold text-slate-900 block mb-1">Coordinator Routing Note:</span>
                      <p className="leading-relaxed font-medium">{referral.messageToReceiver}</p>
                    </div>

                    {/* Researcher Contact Status (Privacy Handling) */}
                    <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 text-xs">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-bold text-slate-700 flex items-center gap-1.5">
                          {referral.contactReleased ? (
                            <UserCheck className="w-3.5 h-3.5 text-emerald-600" />
                          ) : (
                            <Lock className="w-3.5 h-3.5 text-slate-500" />
                          )}
                          Applicant Researcher Contact:
                        </span>

                        {isAccepted && !referral.contactReleased && referral.shareRequesterContact && (
                          <button
                            type="button"
                            onClick={() => handleReleaseContact(referral.id)}
                            className="text-[11px] font-bold text-indigo-600 hover:text-indigo-800 underline"
                          >
                            Release Researcher Contact
                          </button>
                        )}
                      </div>

                      {referral.contactReleased && referral.requesterContact ? (
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1 font-mono text-[11px] text-slate-700">
                          <div>Name: <strong>{referral.requesterContact.name}</strong></div>
                          <div>Email: <strong>{referral.requesterContact.email}</strong></div>
                          <div>Dept: <strong>{referral.requesterContact.department || 'N/A'}</strong></div>
                        </div>
                      ) : (
                        <p className="text-[11px] text-slate-500 italic">
                          {referral.shareRequesterContact
                            ? 'Researcher agreed to share contact upon referral acceptance.'
                            : 'Anonymized referral. Researcher did not authorize contact disclosure.'}
                        </p>
                      )}
                    </div>

                    {/* Response details if already answered */}
                    {referral.responseMessage && (
                      <div className="p-3 bg-indigo-50/50 rounded-2xl border border-indigo-100 text-xs text-slate-700">
                        <span className="font-bold text-indigo-900 block mb-0.5">Response Log:</span>
                        <p>{referral.responseMessage}</p>
                        {referral.nextSteps && (
                          <p className="mt-1 font-semibold text-indigo-800">Next Steps: {referral.nextSteps}</p>
                        )}
                      </div>
                    )}

                    {/* Actions for Pending Referrals */}
                    {isPending && (
                      <div className="flex items-center justify-end gap-3 pt-2">
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedReferral(referral);
                            setResponseAction('DECLINE');
                            setResponseMessage('');
                          }}
                          className="px-4 py-2 text-xs font-bold text-rose-700 hover:bg-rose-50 border border-rose-200 rounded-xl transition-colors"
                        >
                          Decline with Reason
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            setSelectedReferral(referral);
                            setResponseAction('ACCEPT');
                            setResponseMessage('Accepted by receiving institution core facility.');
                            setNextSteps('Please upload institutional insurance certificate and specimen safety sheet.');
                          }}
                          className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-xs hover:shadow transition-all flex items-center gap-1.5"
                        >
                          <CheckCircle2 className="w-4 h-4" />
                          Accept with Next Steps
                        </button>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* Referral Composer Modal (Used in Tab 1) */}
      {selectedNeed && selectedCandidateForReferral && (
        <ReferralComposerModal
          needRequest={selectedNeed}
          candidate={selectedCandidateForReferral}
          isOpen={!!selectedCandidateForReferral}
          onClose={() => setSelectedCandidateForReferral(null)}
          onSubmit={handleSendReferral}
        />
      )}

      {/* Respond Referral Dialog Modal (Used in Tab 2) */}
      {selectedReferral && responseAction && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <h3 className="text-base font-black text-slate-900">
              {responseAction === 'ACCEPT' ? 'Accept Incoming Referral' : 'Decline Referral'}
            </h3>
            <p className="text-xs text-slate-600">
              {responseAction === 'ACCEPT'
                ? 'Accepting formally reserves preliminary facility allocation for the sending institution.'
                : 'Declining will inform the sending coordinator so they can route to an alternate partner.'}
            </p>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Response Message *
                </label>
                <textarea
                  rows={3}
                  value={responseMessage}
                  onChange={(e) => setResponseMessage(e.target.value)}
                  placeholder="Enter notes for sending coordinator..."
                  className="w-full text-xs p-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-normal"
                />
              </div>

              {responseAction === 'ACCEPT' && (
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Next Steps / Required Documentation
                  </label>
                  <input
                    type="text"
                    value={nextSteps}
                    onChange={(e) => setNextSteps(e.target.value)}
                    placeholder="e.g. Courier sample with dry ice; complete safety induction"
                    className="w-full text-xs p-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-normal"
                  />
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => {
                  setSelectedReferral(null);
                  setResponseAction(null);
                }}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleRespondReferral}
                className={`px-5 py-2.5 rounded-xl text-white text-xs font-bold shadow-xs hover:shadow transition-all ${
                  responseAction === 'ACCEPT'
                    ? 'bg-emerald-600 hover:bg-emerald-700'
                    : 'bg-rose-600 hover:bg-rose-700'
                }`}
              >
                {responseAction === 'ACCEPT' ? 'Confirm Acceptance' : 'Confirm Decline'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
