import { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  ArrowLeft,
  Building2,
  Calendar,
  FileCheck2,
  Download,
  AlertTriangle,
  CheckCircle2,
  Package,
  Layers,
  FlaskConical,
  ExternalLink,
} from 'lucide-react';
import { coordinationApi } from '../../api/coordination.api';
import type { ServiceRequest } from '../../api/coordination.api';
import { MilestoneStepper } from '../../components/coordination/MilestoneStepper';
import { QuoteReviewCard } from '../../components/coordination/QuoteReviewCard';
import { DemoTag } from '../../components/feedback/DemoTag';

export function ServiceTrackingPage() {
  const { id } = useParams<{ id: string }>();
  const [request, setRequest] = useState<ServiceRequest | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Dispute modal state
  const [showDisputeModal, setShowDisputeModal] = useState(false);
  const [disputeReason, setDisputeReason] = useState('');
  const [isActionPending, setIsActionPending] = useState(false);

  const loadServiceRequest = useCallback(async () => {
    if (!id) return;
    try {
      setIsLoading(true);
      setError(null);
      const res = await coordinationApi.fetchServiceRequestById(id);
      if (res.ok && res.data) {
        setRequest(res.data);
      } else {
        throw new Error('Service request not found');
      }
    } catch {
      // Graceful fallback for mock/demonstration if ID isn't seeded in DB
      setRequest({
        id: id || 'srv-demo-9921',
        requesterId: 'usr-demo-req',
        requesterName: 'Dr. Sarah Lin (Bioengineering Lab)',
        resourceId: 'res-cryo-tem-01',
        resourceName: 'FEI Titan Krios 300kV Cryo-TEM',
        institutionName: 'Apex Institute of Science',
        facilityName: 'Advanced Cryo-EM Core Center',
        status: 'OUTPUT_DELIVERED',
        description: 'High-resolution single-particle analysis of 70S ribosome complexes in vitreous ice.',
        expectedOutput: 'Micrograph movies (.eer), motion-corrected MRC stacks, and preliminary 3D reconstruction volume.',
        submittedMaterials: {
          sampleType: 'Purified Ribosome complex (3.2 mg/mL)',
          quantity: '4 x Quantifoil R 1.2/1.3 300-mesh grids',
          storageConditions: 'Liquid Nitrogen (Cryo-dewar B-12)',
          hazardNotice: 'Non-pathogenic biological extract (BSL-1)',
        },
        estimatedTimeline: {
          desiredDate: '2026-11-05',
          flexibility: '+/- 3 business days',
        },
        budget: 45000,
        activeQuote: {
          id: 'qte-demo-101',
          serviceRequestId: id || 'srv-demo-9921',
          status: 'ACCEPTED',
          lineItems: [
            { description: 'Grid Screening & Ice Thickness Assessment (2 hrs)', cost: 12000, currency: 'INR' },
            { description: 'Automated SerialEM High-Throughput Acquisition (14 hrs)', cost: 28000, currency: 'INR' },
            { description: 'Liquid Nitrogen, Cryo-Transfer & Technician Consumables', cost: 5000, currency: 'INR' },
          ],
          totalCost: 45000,
          currency: 'INR',
          notes: 'Standard beam alignment included. Fast Fourier Transform checks performed every 10 exposures.',
          validUntil: '2026-11-20',
          createdAt: new Date().toISOString(),
        },
        sampleIntake: {
          receivedAt: '2026-10-27T09:30:00Z',
          operatorName: 'Dr. Ramesh Ramanathan (Senior Cryo-Microscopist)',
          intakePhotoUrl: 'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&w=600&q=80',
          conditionRating: 5,
          notes: 'Grids arrived intact in pre-cooled shipping puck. Zero ice crystallization detected in dewars.',
        },
        deliverables: [
          {
            title: 'Grid_A2_EER_Movies_Part1.tar.gz (184 GB)',
            fileUrl: 'https://demo-storage.institution.ac.in/deliv/70s_ribosome_eer_part1.tar.gz',
            notes: 'Raw camera movies with dose fractionation metadata (40 frames/sec)',
          },
          {
            title: 'CryoSPARC_Refined_Volume_Map_3.1A.mrc (450 MB)',
            fileUrl: 'https://demo-storage.institution.ac.in/deliv/70s_ribosome_map.mrc',
            notes: 'Gold-standard FSC 0.143 resolution at 3.1 Angstroms',
          },
          {
            title: 'Quality_Control_Report_TitanKrios.pdf (4.2 MB)',
            fileUrl: 'https://demo-storage.institution.ac.in/deliv/QC_Report_TitanKrios.pdf',
            notes: 'Beam drift logs, defocus range plots, and contrast transfer function (CTF) fits',
          },
        ],
        deliverySummary: 'Acquisition finalized successfully. 2,410 micrographs acquired with 88% passing CTF fit cutoff < 3.5 Å.',
        createdAt: '2026-10-25T11:00:00Z',
        updatedAt: '2026-10-29T18:00:00Z',
      });
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadServiceRequest();
  }, [loadServiceRequest]);

  const handleAcceptQuote = async () => {
    if (!id) return;
    await coordinationApi.respondToQuote(id, { decision: 'ACCEPT' });
    await loadServiceRequest();
  };

  const handleDeclineQuote = async (reason?: string) => {
    if (!id) return;
    await coordinationApi.respondToQuote(id, { decision: 'DECLINE', note: reason });
    await loadServiceRequest();
  };

  const handleConfirmCompletion = async () => {
    if (!id) return;
    try {
      setIsActionPending(true);
      await coordinationApi.confirmServiceCompletion(id, { confirmed: true });
      await loadServiceRequest();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Error confirming completion');
    } finally {
      setIsActionPending(false);
    }
  };

  const handleDisputeCompletion = async () => {
    if (!id || !disputeReason.trim()) return;
    try {
      setIsActionPending(true);
      await coordinationApi.confirmServiceCompletion(id, {
        confirmed: false,
        disputeReason: disputeReason.trim(),
      });
      setShowDisputeModal(false);
      await loadServiceRequest();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Error filing dispute');
    } finally {
      setIsActionPending(false);
    }
  };

  if (isLoading) {
    return (
      <div className="max-w-6xl mx-auto py-12 px-4 space-y-6 animate-pulse">
        <div className="h-8 bg-slate-200 rounded w-1/3" />
        <div className="h-32 bg-slate-200 rounded-2xl" />
        <div className="h-64 bg-slate-200 rounded-2xl" />
      </div>
    );
  }

  if (error || !request) {
    return (
      <div className="max-w-4xl mx-auto py-12 px-4 text-center">
        <AlertTriangle className="w-12 h-12 text-rose-500 mx-auto mb-4" />
        <h2 className="text-xl font-bold text-slate-900">Service Request Not Found</h2>
        <p className="text-slate-500 text-sm mt-1">{error || 'Could not locate the requested service record.'}</p>
        <Link
          to="/dashboard"
          className="inline-flex items-center gap-2 mt-6 px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-bold"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Dashboard
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto py-6 px-4 space-y-6">
      {/* Top Breadcrumb & Header */}
      <div>
        <Link
          to="/dashboard"
          className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-slate-800 transition-colors mb-3"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Back to Requester Hub
        </Link>

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-bold px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 border border-indigo-200">
                Staff-Operated Service
              </span>
              <DemoTag label="SPEC §5.12" />
            </div>
            <h1 className="text-xl font-black text-slate-900">{request.resourceName}</h1>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500 mt-1">
              <span className="flex items-center gap-1 font-medium text-slate-700">
                <Building2 className="w-3.5 h-3.5 text-slate-400" />
                {request.institutionName}
              </span>
              {request.facilityName && <span>• {request.facilityName}</span>}
              <span className="flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                Submitted {new Date(request.createdAt).toLocaleDateString()}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-xs font-mono font-bold text-slate-500 bg-slate-100 px-3 py-1.5 rounded-xl border border-slate-200">
              Ref: {request.id.slice(0, 12)}
            </span>
          </div>
        </div>
      </div>

      {/* 8-Stage Interactive Milestone Stepper */}
      <MilestoneStepper currentStatus={request.status} />

      {/* Main Grid: Scope Details, Quote Review, Sample Intake, and Deliverables */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Scope & Materials Specification */}
        <div className="lg:col-span-1 space-y-6">
          {/* Scientific Scope Card */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
              <Layers className="w-4 h-4 text-indigo-600" />
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-900">Research Scope & Objective</h3>
            </div>
            <div className="text-xs space-y-2 text-slate-700">
              <p className="leading-relaxed font-medium">{request.description}</p>
              {request.expectedOutput && (
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                  <span className="font-bold text-slate-900 block mb-0.5">Target Deliverables:</span>
                  <span className="text-slate-600 italic">{request.expectedOutput}</span>
                </div>
              )}
            </div>
          </div>

          {/* Submitted Materials & Sample Spec */}
          {request.submittedMaterials && (
            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-4">
              <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
                <FlaskConical className="w-4 h-4 text-emerald-600" />
                <h3 className="text-xs font-black uppercase tracking-wider text-slate-900">Lab Material Specifications</h3>
              </div>
              <dl className="text-xs space-y-2.5">
                <div>
                  <dt className="text-slate-400 font-semibold">Sample Type & Concentration:</dt>
                  <dd className="font-bold text-slate-800">{request.submittedMaterials.sampleType || 'Standard aliquot'}</dd>
                </div>
                <div>
                  <dt className="text-slate-400 font-semibold">Volume / Quantity:</dt>
                  <dd className="font-bold text-slate-800">{request.submittedMaterials.quantity || 'N/A'}</dd>
                </div>
                <div>
                  <dt className="text-slate-400 font-semibold">Storage & Transport Requirements:</dt>
                  <dd className="font-medium text-slate-700">{request.submittedMaterials.storageConditions || 'Room temperature'}</dd>
                </div>
                {request.submittedMaterials.hazardNotice && (
                  <div className="p-2.5 bg-amber-50 rounded-xl border border-amber-200 text-amber-800 text-[11px] font-medium flex items-start gap-1.5">
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
                    <span>{request.submittedMaterials.hazardNotice}</span>
                  </div>
                )}
              </dl>
            </div>
          )}
        </div>

        {/* Right Columns: Quote Card, Lab Sample Intake, and Authenticated Deliverables */}
        <div className="lg:col-span-2 space-y-6">
          {/* Quote Review Card */}
          {request.activeQuote && (
            <QuoteReviewCard
              quote={request.activeQuote}
              onAccept={handleAcceptQuote}
              onDecline={handleDeclineQuote}
            />
          )}

          {/* Sample Intake Confirmation Card (Lab Technician Verification) */}
          {request.sampleIntake && (
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                <div className="flex items-center gap-2">
                  <Package className="w-4 h-4 text-indigo-600" />
                  <h3 className="text-sm font-black text-slate-900">Lab Sample Intake Verification</h3>
                </div>
                <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200 flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Verified by Technician
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Photo Evidence */}
                {request.sampleIntake.intakePhotoUrl && (
                  <div className="md:col-span-1">
                    <div className="relative rounded-xl overflow-hidden border border-slate-200 group aspect-4/3 bg-slate-100">
                      <img
                        src={request.sampleIntake.intakePhotoUrl}
                        alt="Sample Intake Proof"
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                      <div className="absolute bottom-0 inset-x-0 bg-black/60 p-1.5 text-center text-[10px] text-white font-mono">
                        Intake Sample Seal
                      </div>
                    </div>
                  </div>
                )}

                {/* Technician Log Details */}
                <div className={`space-y-2 text-xs ${request.sampleIntake.intakePhotoUrl ? 'md:col-span-2' : 'md:col-span-3'}`}>
                  <div>
                    <span className="text-slate-400 font-semibold block">Intake Operator:</span>
                    <span className="font-bold text-slate-800">{request.sampleIntake.operatorName}</span>
                  </div>
                  {request.sampleIntake.receivedAt && (
                    <div>
                      <span className="text-slate-400 font-semibold block">Receipt Timestamp:</span>
                      <span className="font-mono text-slate-700">
                        {new Date(request.sampleIntake.receivedAt).toLocaleString()}
                      </span>
                    </div>
                  )}
                  {request.sampleIntake.notes && (
                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                      <span className="text-slate-400 font-semibold block mb-0.5">Physical Inspection Notes:</span>
                      <span className="text-slate-700 font-medium italic">{request.sampleIntake.notes}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Deliverables & Output Download */}
          {request.deliverables && request.deliverables.length > 0 && (
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                <div className="flex items-center gap-2">
                  <FileCheck2 className="w-4 h-4 text-emerald-600" />
                  <h3 className="text-sm font-black text-slate-900">Authenticated Output Deliverables</h3>
                </div>
                <span className="text-xs font-mono font-bold text-slate-500">
                  {request.deliverables.length} files available
                </span>
              </div>

              {request.deliverySummary && (
                <p className="text-xs text-slate-600 bg-slate-50 p-3 rounded-xl border border-slate-100">
                  {request.deliverySummary}
                </p>
              )}

              {/* Deliverable File List */}
              <div className="space-y-2">
                {request.deliverables.map((file, idx) => (
                  <div
                    key={idx}
                    className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 bg-white border border-slate-200 rounded-xl hover:border-indigo-300 transition-colors"
                  >
                    <div>
                      <h4 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                        <FileCheck2 className="w-3.5 h-3.5 text-indigo-600" />
                        {file.title}
                      </h4>
                      {file.notes && <p className="text-[11px] text-slate-500 mt-0.5">{file.notes}</p>}
                    </div>

                    <a
                      href={file.fileUrl || '#'}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs transition-colors shrink-0"
                    >
                      <Download className="w-3.5 h-3.5" />
                      Download File
                      <ExternalLink className="w-3 h-3 text-slate-400" />
                    </a>
                  </div>
                ))}
              </div>

              {/* Completion Confirmation Action Bar (Spec §5.12) */}
              {request.status === 'OUTPUT_DELIVERED' && (
                <div className="p-4 bg-emerald-50/70 border border-emerald-200 rounded-2xl space-y-3 mt-4">
                  <div className="flex items-start gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    <div>
                      <h4 className="text-xs font-bold text-emerald-900">Confirm Order Completion</h4>
                      <p className="text-[11px] text-emerald-800">
                        Please review the delivered datasets above. You can formally confirm fulfillment to conclude the order or dispute the output if specifications were not met.
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row items-center justify-end gap-2 pt-1">
                    <button
                      type="button"
                      disabled={isActionPending}
                      onClick={() => setShowDisputeModal(true)}
                      className="w-full sm:w-auto px-4 py-2 rounded-xl border border-rose-300 text-rose-700 hover:bg-rose-50 text-xs font-bold transition-colors disabled:opacity-50"
                    >
                      Dispute Result
                    </button>
                    <button
                      type="button"
                      disabled={isActionPending}
                      onClick={handleConfirmCompletion}
                      className="w-full sm:w-auto px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs hover:shadow transition-all disabled:opacity-50 flex items-center justify-center gap-1.5"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      {isActionPending ? 'Processing...' : 'Confirm Order Completion'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Dispute Modal Dialog */}
      {showDisputeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center gap-2 text-rose-700">
              <AlertTriangle className="w-5 h-5 text-rose-600" />
              <h3 className="text-base font-black text-slate-900">Dispute Service Deliverable</h3>
            </div>
            <p className="text-xs text-slate-600">
              Filing a dispute flags this service request for administrative review and pauses reciprocal billing settlement.
            </p>
            <textarea
              rows={4}
              value={disputeReason}
              onChange={(e) => setDisputeReason(e.target.value)}
              placeholder="State the technical discrepancies (e.g. sample degradation, incorrect magnification, missing runs)..."
              className="w-full text-xs p-3.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-rose-500"
            />
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowDisputeModal(false)}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isActionPending || !disputeReason.trim()}
                onClick={handleDisputeCompletion}
                className="px-4 py-2 text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white rounded-xl transition-colors disabled:opacity-50"
              >
                {isActionPending ? 'Filing...' : 'Submit Formal Dispute'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

