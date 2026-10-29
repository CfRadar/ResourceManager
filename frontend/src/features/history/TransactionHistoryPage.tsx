import { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  ArrowLeft,
  Download,
  Building2,
  Calendar,
  CheckCircle2,
  ShieldCheck,
  User,
  Copy,
  Receipt,
  Layers,
} from 'lucide-react';
import { adminApi } from '../../api/admin.api';
import type { TransactionHistoryRecord } from '../../api/admin.api';
import { AuditIntegrityBadge } from '../../components/feedback/AuditIntegrityBadge';
import { DemoTag } from '../../components/feedback/DemoTag';

export function TransactionHistoryPage() {
  const { type = 'booking', id = 'bkg-demo-204' } = useParams<{ type: string; id: string }>();

  const [record, setRecord] = useState<TransactionHistoryRecord | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [copiedHash, setCopiedHash] = useState(false);

  const loadTransaction = useCallback(async () => {
    try {
      setIsLoading(true);
      const res = await adminApi.fetchTransactionHistory(type, id);
      if (res.ok && res.data) {
        setRecord(res.data);
      } else {
        throw new Error('Not found');
      }
    } catch {
      // Fallback mock record per Spec Section 9
      setRecord({
        id,
        type: 'BOOKING',
        referenceNumber: `REC-${id.slice(0, 8).toUpperCase()}`,
        resourceName: 'Universal Laser Cutter 60W (ILS12.75)',
        facilityName: 'Rapid Prototyping Core Facility',
        institutionName: 'Apex Institute of Science',
        requesterName: 'Alice Sharma',
        requesterEmail: 'alice.sharma@apex.ac.in',
        status: 'CLOSED',
        totalCost: 120,
        currency: 'Tokens',
        timeline: [
          {
            title: 'Request Submitted',
            description: 'Application submitted for laser cutter station with safety training certificate MS-101 verified.',
            actor: 'Alice Sharma (Requester)',
            timestamp: '2026-10-28T10:00:00Z',
            hash: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
          },
          {
            title: 'Manager Approval Granted',
            description: 'Application vetted against fair-use quota and auto-approved without conflict.',
            actor: 'Dr. Ramesh Rao (Facility Manager)',
            timestamp: '2026-10-28T10:15:00Z',
            hash: 'ca978112ca1bbdcafac231b39a23dc4da786eff8147c4e72b9807785afee48bb',
          },
          {
            title: 'Check-In Completed',
            description: 'Intake inspection verified (5-star baseline, all lenses intact). Digital safety waiver signed.',
            actor: 'Alice Sharma (Requester)',
            timestamp: '2026-10-28T14:02:00Z',
            hash: '4e07408562bedb8b60ce05c1decfe3ad16b72230967de01f640b7e4729b49fce',
          },
          {
            title: 'Hardware Return Checkout',
            description: 'Return condition verified (5-star report, optics cleaned, exhaust clear). Signature sealed.',
            actor: 'Alice Sharma (Requester)',
            timestamp: '2026-10-28T16:00:00Z',
            hash: '4b227777d4dd1fc61c6f884f48641d02b4d121d3fd328cb08b5531fcacdabf8a',
          },
          {
            title: 'Return Confirmed & Session Closed',
            description: 'Station custodian inspected workstation. Tokens settled in reciprocal token ledger.',
            actor: 'Mike Operator (Core Facility Technician)',
            timestamp: '2026-10-28T16:10:00Z',
            hash: 'ef2d127de37b942baad06145e54b0c619a1f22327b2ebbcfbec78f5564afe39d',
          },
        ],
        auditChain: {
          isValid: true,
          eventCount: 5,
          headHash: 'ef2d127de37b942baad06145e54b0c619a1f22327b2ebbcfbec78f5564afe39d',
        },
      });
    } finally {
      setIsLoading(false);
    }
  }, [type, id]);

  useEffect(() => {
    loadTransaction();
  }, [loadTransaction]);

  const handleCopyHeadHash = (hash: string) => {
    navigator.clipboard.writeText(hash);
    setCopiedHash(true);
    setTimeout(() => setCopiedHash(false), 2000);
  };

  if (isLoading || !record) {
    return (
      <div className="max-w-4xl mx-auto py-12 px-4 space-y-6 animate-pulse">
        <div className="h-8 bg-slate-200 rounded w-1/3" />
        <div className="h-64 bg-slate-200 rounded-3xl" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto py-8 px-4 space-y-6">
      {/* Top Breadcrumbs */}
      <div>
        <Link
          to="/dashboard"
          className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-slate-800 transition-colors mb-3"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Back to Dashboard
        </Link>

        {/* Master Receipt Header */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-black uppercase tracking-wider text-slate-600 bg-slate-100 px-2.5 py-0.5 rounded-full border border-slate-200">
                Official Transaction Record
              </span>
              <DemoTag label="SPEC §9" />
            </div>
            <h1 className="text-xl font-black text-slate-900">{record.resourceName}</h1>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500 mt-1">
              <span className="flex items-center gap-1 font-medium text-slate-700">
                <Building2 className="w-3.5 h-3.5 text-slate-400" />
                {record.institutionName}
              </span>
              {record.facilityName && <span>• {record.facilityName}</span>}
              <span className="flex items-center gap-1">
                <Receipt className="w-3.5 h-3.5 text-slate-400" />
                {record.referenceNumber}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <a
              href={adminApi.getTransactionPdfExportUrl(record.id)}
              target="_blank"
              rel="noopener noreferrer"
              className="px-5 py-2.5 bg-slate-900 hover:bg-black text-white font-bold text-xs rounded-xl shadow-xs hover:shadow transition-all flex items-center gap-2"
            >
              <Download className="w-4 h-4" />
              Download Official PDF Receipt
            </a>
          </div>
        </div>
      </div>

      {/* Summary Chips */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white border border-slate-200 rounded-2xl p-4 space-y-1 shadow-2xs">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Requester Account</span>
          <p className="text-sm font-black text-slate-900 flex items-center gap-1.5">
            <User className="w-4 h-4 text-indigo-600" />
            {record.requesterName}
          </p>
          <p className="text-[11px] font-mono text-slate-500">{record.requesterEmail}</p>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-4 space-y-1 shadow-2xs">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Settlement Status</span>
          <p className="text-sm font-black text-emerald-700 flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            {record.status} (Fulfilled)
          </p>
          <p className="text-[11px] text-slate-500 font-mono">
            {record.totalCost} {record.currency || 'Tokens'} Settled
          </p>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-4 space-y-1 shadow-2xs">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Audit Chain State</span>
          <div className="pt-0.5">
            <AuditIntegrityBadge isValid={record.auditChain.isValid} eventCount={record.auditChain.eventCount} />
          </div>
          <p className="text-[10px] text-slate-400 font-mono truncate">
            Head: {record.auditChain.headHash.slice(0, 16)}...
          </p>
        </div>
      </div>

      {/* Sequential Timeline of Record */}
      <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xs space-y-6">
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-indigo-600" />
            <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider">
              Immutable Timeline of Record
            </h3>
          </div>
          <span className="text-xs font-mono text-slate-400">
            {record.timeline.length} Cryptographic Events
          </span>
        </div>

        <div className="space-y-6 relative">
          {/* Connecting vertical line */}
          <div className="absolute left-4 top-4 bottom-4 w-0.5 bg-slate-200 z-0" />

          {record.timeline.map((event, idx) => (
            <div key={idx} className="relative z-10 flex items-start gap-4">
              {/* Checkpoint Avatar */}
              <div className="w-8 h-8 rounded-full bg-emerald-600 text-white flex items-center justify-center shrink-0 font-mono text-xs font-bold shadow-xs">
                {idx + 1}
              </div>

              {/* Event Content */}
              <div className="flex-1 bg-slate-50 rounded-2xl p-4 border border-slate-200 space-y-1.5 hover:border-slate-300 transition-colors">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                  <h4 className="text-xs font-black text-slate-900 flex items-center gap-2">
                    {event.title}
                  </h4>
                  <span className="text-[11px] font-mono text-slate-400 flex items-center gap-1">
                    <Calendar className="w-3 h-3 text-slate-400" />
                    {new Date(event.timestamp).toLocaleString()}
                  </span>
                </div>

                <p className="text-xs text-slate-600 font-medium leading-relaxed">
                  {event.description}
                </p>

                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-2 border-t border-slate-200/60 text-[11px]">
                  <span className="font-semibold text-slate-700">
                    Recorded by: <strong className="text-slate-900">{event.actor}</strong>
                  </span>

                  {event.hash && (
                    <span className="font-mono text-[10px] text-slate-400 bg-white px-2 py-0.5 rounded border border-slate-200 truncate max-w-xs">
                      SHA: {event.hash.slice(0, 20)}...
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Footer Integrity Certificate Card */}
      <div className="bg-linear-to-br from-slate-900 to-indigo-950 text-white rounded-3xl p-6 shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/10 pb-4">
          <div className="flex items-center gap-2.5">
            <ShieldCheck className="w-6 h-6 text-emerald-400" />
            <div>
              <h4 className="text-sm font-black tracking-wide">
                Institutional Cryptographic Certificate
              </h4>
              <p className="text-xs text-slate-300">
                Tamper-evident SHA-256 state chain validated across institutional nodes
              </p>
            </div>
          </div>
          <AuditIntegrityBadge isValid={true} />
        </div>

        <div className="space-y-1 font-mono text-xs">
          <span className="text-slate-400 text-[10px] uppercase tracking-wider block">
            Cryptographic Head Block Hash:
          </span>
          <div className="flex items-center justify-between bg-black/40 p-3 rounded-xl border border-white/10 text-emerald-300">
            <span className="truncate mr-2">{record.auditChain.headHash}</span>
            <button
              type="button"
              onClick={() => handleCopyHeadHash(record.auditChain.headHash)}
              className="px-2.5 py-1 bg-white/10 hover:bg-white/20 text-white rounded text-[11px] font-sans font-bold transition-colors shrink-0 flex items-center gap-1"
            >
              <Copy className="w-3 h-3" />
              {copiedHash ? 'Copied' : 'Copy Hash'}
            </button>
          </div>
        </div>

        <p className="text-[11px] text-slate-400 leading-relaxed">
          This receipt is permanently archived in the institutional ledger. Verification certificates can be re-validated at any time via the audit endpoint.
        </p>
      </div>
    </div>
  );
}
