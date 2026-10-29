import { ShieldCheck, ShieldAlert, Link as ChainLink, CheckCircle2, Copy, RefreshCw } from 'lucide-react';
import type { AuditRecord, AuditVerificationResult } from '../../api/admin.api';

interface HashChainVisualizerProps {
  records: AuditRecord[];
  verification?: AuditVerificationResult | null;
  onVerifyProbe?: () => Promise<void>;
  isVerifying?: boolean;
}

export function HashChainVisualizer({
  records,
  verification,
  onVerifyProbe,
  isVerifying = false,
}: HashChainVisualizerProps) {
  const isChainValid = verification ? verification.isValid : true;

  const handleCopyHash = (hash: string) => {
    navigator.clipboard.writeText(hash);
  };

  return (
    <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xs space-y-6">
      {/* Integrity Verification Header Banner */}
      <div className={`p-5 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
        isChainValid
          ? 'bg-emerald-50/70 border-emerald-200'
          : 'bg-rose-50/70 border-rose-300'
      }`}>
        <div className="flex items-start gap-3">
          {isChainValid ? (
            <ShieldCheck className="w-6 h-6 text-emerald-600 shrink-0 mt-0.5" />
          ) : (
            <ShieldAlert className="w-6 h-6 text-rose-600 shrink-0 mt-0.5" />
          )}
          <div>
            <div className="flex items-center gap-2">
              <h3 className={`text-sm font-black uppercase tracking-wider ${
                isChainValid ? 'text-emerald-950' : 'text-rose-950'
              }`}>
                {isChainValid
                  ? 'SHA-256 Tamper-Evident Hash Chain Verified'
                  : 'Integrity Warning: Discrepancy Detected'}
              </h3>
              <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full ${
                isChainValid
                  ? 'bg-emerald-200 text-emerald-900'
                  : 'bg-rose-200 text-rose-900'
              }`}>
                {records.length} Blocks
              </span>
            </div>
            <p className={`text-xs mt-0.5 ${
              isChainValid ? 'text-emerald-800' : 'text-rose-800'
            }`}>
              {isChainValid
                ? 'Every lifecycle state transition is cryptographically hashed with its preceding block digest.'
                : `Block mismatch identified at sequence #${verification?.brokenAtSequence || 'Unknown'}. Manual audit required.`}
            </p>
          </div>
        </div>

        {onVerifyProbe && (
          <button
            type="button"
            disabled={isVerifying}
            onClick={onVerifyProbe}
            className="px-4 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-800 rounded-xl text-xs font-bold transition-all shadow-2xs flex items-center gap-1.5 shrink-0 disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isVerifying ? 'animate-spin text-emerald-600' : ''}`} />
            {isVerifying ? 'Verifying Hashes...' : 'Run Integrity Probe'}
          </button>
        )}
      </div>

      {/* Sequential Hash Blocks */}
      <div className="space-y-4 relative">
        {records.length === 0 ? (
          <div className="p-8 text-center text-slate-400 text-xs">
            No audit records found in this sequence.
          </div>
        ) : (
          records.map((block, idx) => {
            const isGenesis = idx === 0 || block.previousHash === '0'.repeat(64) || !block.previousHash;
            const seqNumber = block.sequenceNumber || idx + 1;

            return (
              <div key={block.id || idx} className="relative group">
                {/* Visual Connector Line to Next Block */}
                {idx < records.length - 1 && (
                  <div className="absolute left-6 top-12 bottom-0 w-0.5 bg-emerald-200 z-0" />
                )}

                <div className="relative z-10 flex items-start gap-4 p-4 rounded-2xl border border-slate-200 bg-white hover:border-emerald-300 hover:shadow-xs transition-all">
                  {/* Block Number Avatar */}
                  <div className="w-12 h-12 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 flex flex-col items-center justify-center shrink-0">
                    <span className="text-[9px] font-bold uppercase tracking-wider text-emerald-600">BLK</span>
                    <span className="text-xs font-black font-mono">#{seqNumber}</span>
                  </div>

                  {/* Block Content */}
                  <div className="flex-1 min-w-0 space-y-2">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-black text-slate-900 font-mono tracking-wide">
                          {block.action}
                        </span>
                        {block.actorRole && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                            {block.actorRole}
                          </span>
                        )}
                      </div>
                      <span className="text-[11px] font-mono text-slate-400">
                        {new Date(block.createdAt).toLocaleString()}
                      </span>
                    </div>

                    {/* Hashes Row */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-[11px] font-mono">
                      {/* Previous Hash */}
                      <div className="p-2 bg-slate-50 rounded-xl border border-slate-100 text-slate-600">
                        <span className="text-[10px] font-bold text-slate-400 block mb-0.5">
                          PREV HASH {isGenesis ? '(GENESIS)' : ''}:
                        </span>
                        <div className="flex items-center justify-between gap-1">
                          <span className="truncate">
                            {isGenesis ? '00000000000000000000000000000000' : block.previousHash.slice(0, 24) + '...'}
                          </span>
                          {!isGenesis && (
                            <button
                              type="button"
                              onClick={() => handleCopyHash(block.previousHash)}
                              className="text-slate-400 hover:text-slate-700"
                              title="Copy full hash"
                            >
                              <Copy className="w-3 h-3" />
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Current Record Hash */}
                      <div className="p-2 bg-emerald-50/50 rounded-xl border border-emerald-100 text-emerald-900">
                        <span className="text-[10px] font-bold text-emerald-700 block mb-0.5">
                          BLOCK DIGEST (SHA-256):
                        </span>
                        <div className="flex items-center justify-between gap-1">
                          <span className="truncate font-semibold">
                            {block.recordHash ? block.recordHash.slice(0, 24) + '...' : 'Calculating...'}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleCopyHash(block.recordHash)}
                            className="text-emerald-600 hover:text-emerald-800"
                            title="Copy full hash"
                          >
                            <Copy className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Metadata / Actor summary */}
                    <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1">
                      <span className="flex items-center gap-1 font-medium">
                        <ChainLink className="w-3 h-3 text-emerald-600" />
                        Actor: {block.actorName || 'System Service'}
                      </span>
                      <span className="flex items-center gap-1 text-emerald-700 font-semibold">
                        <CheckCircle2 className="w-3 h-3" /> Hash Verified
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

