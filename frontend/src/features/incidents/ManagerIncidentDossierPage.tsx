import { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  AlertTriangle,
  ArrowLeft,
  Sparkles,
  Download,
  Send,
  MessageSquare,
  Lock,
  Globe,
  Gavel,
  ShieldAlert,
  FileCheck2,
} from 'lucide-react';
import { incidentsApi } from '../../api/incidents.api';
import type { Incident, AiIncidentSummary } from '../../api/incidents.api';
import { ConditionCompareView } from '../../components/incidents/ConditionCompareView';
import { AiSummaryModal } from '../../components/incidents/AiSummaryModal';
import { DemoTag } from '../../components/feedback/DemoTag';
import { adminApi } from '../../api/admin.api';

export function ManagerIncidentDossierPage() {
  const { id } = useParams<{ id: string }>();

  const [incident, setIncident] = useState<Incident | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // AI Draft Modal State
  const [isAiModalOpen, setIsAiModalOpen] = useState(false);
  const [aiSummary, setAiSummary] = useState<AiIncidentSummary | null>(null);
  const [isDraftingAi, setIsDraftingAi] = useState(false);

  // New Note / Reply State
  const [noteContent, setNoteContent] = useState('');
  const [noteVisibility, setNoteVisibility] = useState<'SHARED' | 'INTERNAL'>('SHARED');
  const [isPostingNote, setIsPostingNote] = useState(false);

  // Resolution Modal State
  const [showResolveModal, setShowResolveModal] = useState(false);
  const [resolutionOutcome, setResolutionOutcome] = useState<'RESOLVED' | 'DISMISSED'>('RESOLVED');
  const [findingsText, setFindingsText] = useState('');
  const [resolutionReason, setResolutionReason] = useState('');
  const [remedyTokens, setRemedyTokens] = useState<number>(0);
  const [isResolving, setIsResolving] = useState(false);

  const loadIncident = useCallback(async () => {
    if (!id) return;
    try {
      setIsLoading(true);
      const res = await incidentsApi.fetchIncidentById(id);
      if (res.ok && res.data) {
        setIncident(res.data);
      } else {
        throw new Error('Not found');
      }
    } catch {
      // Mock fallback data for demonstration
      setIncident({
        id: id || 'inc-demo-7712',
        reporterId: 'usr-lab-tech',
        reporterName: 'Mike Operator (Core Lab Technician)',
        bookingId: 'bkg-demo-204',
        resourceId: 'res-titan-krios',
        resourceName: 'FEI Titan Krios 300kV Cryo-TEM',
        type: 'DAMAGE',
        severityByReporter: 'HIGH',
        status: 'OPEN',
        description:
          'During post-session checkout inspection, a visible scratch was discovered on the secondary objective bezel mount. In addition, the specialized Cryo-Transfer Pin Tool (#CP-04) was missing from the accessory tray.',
        occurredAt: '2026-10-28T17:35:00Z',
        createdAt: '2026-10-28T17:45:00Z',
        conditionComparison: {
          before: {
            rating: 5,
            notes: 'All optics immaculate. Accessory checklist fully accounted for.',
            timestamp: '2026-10-28T09:00:00Z',
            photoUrls: ['https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&w=600&q=80'],
          },
          after: {
            rating: 2,
            notes: 'Secondary objective mount scratched. Pin tool #CP-04 missing from box.',
            timestamp: '2026-10-28T17:30:00Z',
            photoUrls: ['https://images.unsplash.com/photo-1579154204601-01588f351e67?auto=format&fit=crop&w=600&q=80'],
            accessoriesMissing: ['Cryo-Transfer Pin Tool (#CP-04)'],
          },
        },
        notes: [
          {
            id: 'note-01',
            authorId: 'usr-lab-tech',
            authorName: 'Mike Operator',
            authorRole: 'OPERATOR',
            content: 'Initial intake report recorded at 17:35 after researcher departed workstation.',
            visibility: 'SHARED',
            createdAt: '2026-10-28T17:45:00Z',
          },
          {
            id: 'note-02',
            authorId: 'usr-sarah-lin',
            authorName: 'Dr. Sarah Lin (Researcher)',
            authorRole: 'REQUESTER',
            content:
              'Right-of-Reply: We never touched the secondary objective bezel during our session as we only ran automated single-particle movie acquisition via SerialEM. We checked our lab bag and found the Pin Tool #CP-04 was accidentally packed into our sample dewar box. We have couriered it back this morning.',
            visibility: 'SHARED',
            createdAt: '2026-10-29T08:30:00Z',
          },
        ],
      });
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadIncident();
  }, [loadIncident]);

  // AI Summary Trigger
  const handleDraftWithAi = async () => {
    if (!id) return;
    try {
      setIsDraftingAi(true);
      setIsAiModalOpen(true);
      const res = await incidentsApi.draftAiSummary(id);
      if (res.ok && res.data) {
        setAiSummary(res.data);
      } else {
        // Fallback local synthesis
        setAiSummary({
          incidentId: id,
          recordedFacts: [
            'Check-in baseline rating was 5/5 at 09:00 UTC with all accessories verified.',
            'Checkout return rating dropped to 2/5 at 17:30 UTC with Pin Tool #CP-04 absent.',
            'Instrument logs show automated SerialEM beam alignment ran without manual tilt errors.',
          ],
          unverifiedClaims: [
            'Researcher asserts the bezel scratch was pre-existing or caused by environmental settling.',
            'Technician asserts the tool was omitted from the tray upon departure.',
          ],
          eventSources: [
            { event: 'CHECK_IN_INSPECTION', source: 'Check-in Ledger #BLK-089' },
            { event: 'CHECK_OUT_DIFF', source: 'Check-out Ledger #BLK-094' },
            { event: 'RIGHT_OF_REPLY_NOTE', source: 'Researcher Portal Note #02' },
          ],
          suggestedFindings:
            'Finding of split inadvertence: The missing accessory (Pin Tool #CP-04) was inadvertently removed and returned promptly without bad faith. Objective scratch is cosmetic and did not compromise electron optical vacuum seal.',
          recommendedRemedyType: 'TOKEN_ADJUSTMENT',
          recommendedTokensAdjustment: 50,
        });
      }
    } catch {
      // Fallback
      setAiSummary({
        incidentId: id,
        recordedFacts: ['Telemetry intact across session duration.'],
        unverifiedClaims: ['Party statements recorded in timeline.'],
        eventSources: [{ event: 'SESSION_AUDIT', source: 'Ledger SHA-256' }],
        suggestedFindings: 'Cosmetic discrepancy without systemic optical disruption.',
        recommendedRemedyType: 'TOKEN_ADJUSTMENT',
        recommendedTokensAdjustment: 50,
      });
    } finally {
      setIsDraftingAi(false);
    }
  };

  const handleApplyAiDraft = (findings: string, _remedyType?: string, tokenAdj?: number) => {
    setFindingsText(findings);
    setResolutionReason('AI assisted synthesize verified by facility manager.');
    if (tokenAdj !== undefined) setRemedyTokens(tokenAdj);
    setShowResolveModal(true);
  };

  // Add Note
  const handleAddNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id || !noteContent.trim()) return;
    try {
      setIsPostingNote(true);
      await incidentsApi.addNote(id, {
        content: noteContent.trim(),
        visibility: noteVisibility,
      });
      setNoteContent('');
      await loadIncident();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Error posting note');
    } finally {
      setIsPostingNote(false);
    }
  };

  // Resolve Incident
  const handleResolve = async () => {
    if (!id || !findingsText.trim() || !resolutionReason.trim()) {
      alert('Please provide both formal findings and a justification reason.');
      return;
    }
    try {
      setIsResolving(true);
      await incidentsApi.resolveIncident(id, {
        outcome: resolutionOutcome,
        findings: findingsText.trim(),
        reason: resolutionReason.trim(),
        remedy:
          remedyTokens > 0
            ? { type: 'TOKEN_ADJUSTMENT', tokens: remedyTokens }
            : undefined,
      });
      setShowResolveModal(false);
      await loadIncident();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Error resolving incident');
    } finally {
      setIsResolving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="max-w-6xl mx-auto py-12 px-4 space-y-6 animate-pulse">
        <div className="h-8 bg-slate-200 rounded w-1/3" />
        <div className="h-32 bg-slate-200 rounded-3xl" />
        <div className="h-64 bg-slate-200 rounded-3xl" />
      </div>
    );
  }

  if (!incident) {
    return (
      <div className="max-w-4xl mx-auto py-12 px-4 text-center">
        <AlertTriangle className="w-12 h-12 text-rose-500 mx-auto mb-4" />
        <h2 className="text-xl font-bold text-slate-900">Incident Dossier Not Found</h2>
        <Link
          to="/manage/dashboard"
          className="inline-flex items-center gap-2 mt-6 px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-bold"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Manager Desk
        </Link>
      </div>
    );
  }

  const isResolved = incident.status === 'RESOLVED' || incident.status === 'DISMISSED';

  return (
    <div className="max-w-6xl mx-auto py-8 px-4 space-y-6">
      {/* Top Header */}
      <div>
        <Link
          to="/manage/dashboard"
          className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-slate-800 transition-colors mb-3"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Back to Operations Dashboard
        </Link>

        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-black uppercase tracking-wider text-rose-700 bg-rose-50 px-2.5 py-0.5 rounded-full border border-rose-200">
                Incident Dossier #{incident.id.slice(0, 8)}
              </span>
              <DemoTag label="SPEC §6.8" />
            </div>
            <h1 className="text-xl font-black text-slate-900">
              {incident.type} Exception — {incident.resourceName}
            </h1>
            <p className="text-xs text-slate-500 mt-1">
              Reported by {incident.reporterName || 'Lab Staff'} on {new Date(incident.createdAt).toLocaleDateString()}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <a
              href={adminApi.getIncidentPdfExportUrl(incident.id)}
              target="_blank"
              rel="noopener noreferrer"
              className="px-4 py-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold text-xs transition-colors flex items-center gap-1.5"
            >
              <Download className="w-3.5 h-3.5" />
              Download Formal Dossier PDF
            </a>

            {!isResolved && (
              <button
                type="button"
                onClick={handleDraftWithAi}
                className="px-4 py-2 rounded-xl bg-purple-700 hover:bg-purple-800 text-white font-bold text-xs shadow-xs hover:shadow transition-all flex items-center gap-1.5"
              >
                <Sparkles className="w-3.5 h-3.5" />
                Draft Summary with AI
              </button>
            )}

            {!isResolved && (
              <button
                type="button"
                onClick={() => setShowResolveModal(true)}
                className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-xs hover:shadow transition-all flex items-center gap-1.5"
              >
                <Gavel className="w-3.5 h-3.5" />
                Resolve Incident
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Formal Signed Ruling Banner (if RESOLVED) */}
      {incident.resolution && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-3xl p-6 shadow-xs space-y-3">
          <div className="flex items-center justify-between border-b border-emerald-200/60 pb-3">
            <div className="flex items-center gap-2">
              <FileCheck2 className="w-5 h-5 text-emerald-600" />
              <h3 className="text-sm font-black text-emerald-950 uppercase tracking-wider">
                Official Manager Ruling & Resolution
              </h3>
            </div>
            <span className="text-xs font-mono font-bold text-emerald-700 bg-white px-3 py-1 rounded-full border border-emerald-300">
              {incident.resolution.outcome}
            </span>
          </div>

          <div className="space-y-1 text-xs text-emerald-950">
            <span className="font-bold text-emerald-900 block">Findings of Record:</span>
            <p className="leading-relaxed font-medium bg-white/70 p-3.5 rounded-xl border border-emerald-200">
              {incident.resolution.findings}
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-emerald-800 pt-1">
            <span>
              Resolved on {new Date(incident.resolution.resolvedAt).toLocaleString()} by Facility Authority
            </span>
            {incident.resolution.remedy?.tokens && (
              <span className="font-mono font-bold bg-emerald-100 px-2.5 py-0.5 rounded text-emerald-900">
                Remedy: {incident.resolution.remedy.tokens} Tokens non-monetary adjustment
              </span>
            )}
          </div>
        </div>
      )}

      {/* Side-by-Side Condition Inspection Comparison */}
      <ConditionCompareView comparison={incident.conditionComparison} />

      {/* Right-of-Reply Shared Timeline & Notes */}
      <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xs space-y-6">
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <div>
            <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider">
              Shared Investigation Timeline & Right-of-Reply
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Transparent, multi-party record ensuring researchers and technicians contribute evidence
            </p>
          </div>
          <span className="text-xs font-bold text-slate-500 bg-slate-100 px-3 py-1 rounded-full">
            {incident.notes?.length || 0} Entries
          </span>
        </div>

        {/* Existing Notes Feed */}
        <div className="space-y-4">
          {incident.notes?.map((note) => (
            <div
              key={note.id}
              className={`p-4 rounded-2xl border text-xs space-y-2 ${
                note.visibility === 'INTERNAL'
                  ? 'bg-amber-50/60 border-amber-200 text-amber-950'
                  : 'bg-slate-50/70 border-slate-200 text-slate-800'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="font-black text-slate-900">{note.authorName}</span>
                  {note.authorRole && (
                    <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-white border border-slate-200">
                      {note.authorRole}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {note.visibility === 'INTERNAL' ? (
                    <span className="flex items-center gap-1 text-[10px] font-black uppercase text-amber-700 bg-amber-100 px-2 py-0.5 rounded">
                      <Lock className="w-2.5 h-2.5" /> Staff Only
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 text-[10px] font-bold text-slate-500">
                      <Globe className="w-3 h-3" /> Shared
                    </span>
                  )}
                  <span className="text-slate-400 font-mono text-[11px]">
                    {new Date(note.createdAt).toLocaleString()}
                  </span>
                </div>
              </div>

              <p className="leading-relaxed font-medium">{note.content}</p>
            </div>
          ))}
        </div>

        {/* Add Note / Right-of-Reply Form */}
        {!isResolved && (
          <form onSubmit={handleAddNote} className="space-y-3 pt-4 border-t border-slate-100">
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-1.5 text-xs font-bold text-slate-800">
                <MessageSquare className="w-4 h-4 text-indigo-600" />
                Add Official Right-of-Reply or Manager Note
              </label>

              <div className="flex items-center gap-2 text-xs">
                <span className="text-slate-500 text-[11px]">Visibility:</span>
                <select
                  value={noteVisibility}
                  onChange={(e) => setNoteVisibility(e.target.value as 'SHARED' | 'INTERNAL')}
                  className="text-xs p-1.5 rounded-lg border border-slate-200 bg-white"
                >
                  <option value="SHARED">Shared (Visible to Researcher & Lab)</option>
                  <option value="INTERNAL">Internal (Facility Staff Only)</option>
                </select>
              </div>
            </div>

            <textarea
              rows={3}
              value={noteContent}
              onChange={(e) => setNoteContent(e.target.value)}
              placeholder="Record technical reply, serial number check, courier receipt, or clarification..."
              className="w-full text-xs p-3.5 rounded-2xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-normal leading-relaxed"
              required
            />

            <div className="flex justify-end">
              <button
                type="submit"
                disabled={isPostingNote || !noteContent.trim()}
                className="px-5 py-2.5 bg-slate-900 hover:bg-black text-white font-bold text-xs rounded-xl shadow-xs hover:shadow transition-all disabled:opacity-50 flex items-center gap-1.5"
              >
                <Send className="w-3.5 h-3.5" />
                {isPostingNote ? 'Logging Entry...' : 'Append Entry to Timeline'}
              </button>
            </div>
          </form>
        )}
      </div>

      {/* AI Summary Draft Modal */}
      <AiSummaryModal
        isOpen={isAiModalOpen}
        onClose={() => setIsAiModalOpen(false)}
        summary={aiSummary}
        isLoading={isDraftingAi}
        onApplyDraft={handleApplyAiDraft}
      />

      {/* Resolution Dialog Modal */}
      {showResolveModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-xl w-full p-6 shadow-2xl border border-slate-200 space-y-5 my-8">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Gavel className="w-5 h-5 text-indigo-600" />
                <h3 className="text-base font-black text-slate-900">Issue Impartial Ruling</h3>
              </div>
              <p className="text-xs text-slate-500">
                Formally conclude this incident record. Findings are permanently appended to the audit ledger.
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Ruling Outcome *</label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setResolutionOutcome('RESOLVED')}
                    className={`p-3 rounded-xl border text-xs font-bold transition-all ${
                      resolutionOutcome === 'RESOLVED'
                        ? 'border-indigo-600 bg-indigo-50 text-indigo-700'
                        : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    RESOLVED (Findings Upheld)
                  </button>
                  <button
                    type="button"
                    onClick={() => setResolutionOutcome('DISMISSED')}
                    className={`p-3 rounded-xl border text-xs font-bold transition-all ${
                      resolutionOutcome === 'DISMISSED'
                        ? 'border-indigo-600 bg-indigo-50 text-indigo-700'
                        : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    DISMISSED (No Fault / Withdrawn)
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Findings Rationale * (Min 5 chars)
                </label>
                <textarea
                  rows={4}
                  value={findingsText}
                  onChange={(e) => setFindingsText(e.target.value)}
                  placeholder="Record formal assessment of cause, responsibility, and instrument operational impact..."
                  className="w-full text-xs p-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-normal leading-relaxed"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Justification Reason * (Min 3 chars)
                </label>
                <input
                  type="text"
                  value={resolutionReason}
                  onChange={(e) => setResolutionReason(e.target.value)}
                  placeholder="e.g. Verified by lab supervisor and return courier receipt"
                  className="w-full text-xs p-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-normal"
                  required
                />
              </div>

              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
                <span className="text-xs font-bold text-slate-800 block">
                  Recorded Remedy (Token Ledger Adjustment)
                </span>
                <p className="text-[11px] text-slate-500">
                  Spec §6.8: Institutional token deduction if warranted. Monetary bank account debit is strictly prohibited.
                </p>
                <div className="flex items-center gap-2 pt-1">
                  <span className="text-xs font-semibold text-slate-600">Tokens:</span>
                  <input
                    type="number"
                    value={remedyTokens}
                    onChange={(e) => setRemedyTokens(Number(e.target.value))}
                    className="w-24 text-xs p-2 rounded-lg border border-slate-200 font-mono text-right font-bold"
                  />
                  <span className="text-xs text-slate-400 font-mono">Tokens (0 = No Penalty)</span>
                </div>
              </div>

              <div className="flex items-center gap-2 text-[11px] text-amber-800 bg-amber-50 p-2.5 rounded-xl border border-amber-200">
                <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0" />
                <span>The applicant retains a single-time appeal escalation right under Spec §4.16.</span>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowResolveModal(false)}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isResolving}
                onClick={handleResolve}
                className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-xs hover:shadow transition-all disabled:opacity-50"
              >
                {isResolving ? 'Sealing Ruling...' : 'Confirm Formal Ruling'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

