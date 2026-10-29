import { ShieldCheck, ShieldAlert } from 'lucide-react';

interface AuditIntegrityBadgeProps {
  isValid?: boolean;
  eventCount?: number;
  lastCheckedAt?: string;
}

export function AuditIntegrityBadge({
  isValid = true,
  eventCount,
  lastCheckedAt,
}: AuditIntegrityBadgeProps) {
  if (isValid) {
    return (
      <span
        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-50 text-emerald-800 border border-emerald-200"
        title={
          lastCheckedAt
            ? `Cryptographic SHA-256 hash chain verified at ${lastCheckedAt}`
            : 'Cryptographic SHA-256 hash chain verified'
        }
      >
        <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
        <span>Audit Chain Intact</span>
        {eventCount !== undefined && (
          <span className="text-emerald-600 text-[11px] font-normal">({eventCount} events)</span>
        )}
      </span>
    );
  }

  return (
    <span
      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-rose-50 text-rose-800 border border-rose-300 animate-pulse"
      title="Hash chain discrepancy detected. Administrator review required."
    >
      <ShieldAlert className="w-3.5 h-3.5 text-rose-600 shrink-0" />
      <span>Integrity Warning</span>
    </span>
  );
}
