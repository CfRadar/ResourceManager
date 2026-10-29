import {
  CheckCircle2,
  Clock,
  XCircle,
  AlertTriangle,
  PlayCircle,
  Archive,
  AlertCircle,
  CheckCheck,
  FileText,
  RotateCcw,
} from 'lucide-react';

export type EntityStatus =
  | 'DRAFT'
  | 'SUBMITTED'
  | 'UNDER_REVIEW'
  | 'APPROVED'
  | 'SCHEDULED'
  | 'CHECKED_IN'
  | 'IN_USE'
  | 'RETURNED'
  | 'CLOSED'
  | 'REJECTED'
  | 'WAITLISTED'
  | 'OFFERED'
  | 'MORE_INFO_REQUIRED'
  | 'OVERDUE'
  | 'RESOLVED'
  | 'DISMISSED'
  | 'ACTIVE'
  | 'INACTIVE';

interface StatusConfig {
  label: string;
  bg: string;
  text: string;
  border: string;
  icon: typeof CheckCircle2;
}

const statusConfig: Record<string, StatusConfig> = {
  APPROVED: {
    label: 'Approved',
    bg: 'bg-emerald-50',
    text: 'text-emerald-700',
    border: 'border-emerald-200',
    icon: CheckCircle2,
  },
  SCHEDULED: {
    label: 'Scheduled',
    bg: 'bg-emerald-50',
    text: 'text-emerald-700',
    border: 'border-emerald-200',
    icon: Clock,
  },
  SUBMITTED: {
    label: 'Submitted',
    bg: 'bg-blue-50',
    text: 'text-blue-700',
    border: 'border-blue-200',
    icon: Clock,
  },
  UNDER_REVIEW: {
    label: 'Under Review',
    bg: 'bg-amber-50',
    text: 'text-amber-700',
    border: 'border-amber-200',
    icon: Clock,
  },
  IN_USE: {
    label: 'In Use',
    bg: 'bg-sky-50',
    text: 'text-sky-700',
    border: 'border-sky-200',
    icon: PlayCircle,
  },
  CHECKED_IN: {
    label: 'Checked In',
    bg: 'bg-sky-50',
    text: 'text-sky-700',
    border: 'border-sky-200',
    icon: PlayCircle,
  },
  RETURNED: {
    label: 'Returned',
    bg: 'bg-indigo-50',
    text: 'text-indigo-700',
    border: 'border-indigo-200',
    icon: RotateCcw,
  },
  REJECTED: {
    label: 'Rejected',
    bg: 'bg-red-50',
    text: 'text-red-700',
    border: 'border-red-200',
    icon: XCircle,
  },
  WAITLISTED: {
    label: 'Waitlisted',
    bg: 'bg-purple-50',
    text: 'text-purple-700',
    border: 'border-purple-200',
    icon: AlertTriangle,
  },
  OFFERED: {
    label: 'Offered',
    bg: 'bg-indigo-50',
    text: 'text-indigo-700',
    border: 'border-indigo-200',
    icon: Clock,
  },
  MORE_INFO_REQUIRED: {
    label: 'Info Requested',
    bg: 'bg-amber-50',
    text: 'text-amber-700',
    border: 'border-amber-200',
    icon: AlertCircle,
  },
  OVERDUE: {
    label: 'Overdue',
    bg: 'bg-rose-50',
    text: 'text-rose-700',
    border: 'border-rose-200',
    icon: AlertCircle,
  },
  RESOLVED: {
    label: 'Resolved',
    bg: 'bg-emerald-50',
    text: 'text-emerald-700',
    border: 'border-emerald-200',
    icon: CheckCheck,
  },
  DISMISSED: {
    label: 'Dismissed',
    bg: 'bg-slate-100',
    text: 'text-slate-600',
    border: 'border-slate-200',
    icon: Archive,
  },
  CLOSED: {
    label: 'Closed',
    bg: 'bg-slate-100',
    text: 'text-slate-600',
    border: 'border-slate-200',
    icon: Archive,
  },
  DRAFT: {
    label: 'Draft',
    bg: 'bg-slate-100',
    text: 'text-slate-600',
    border: 'border-slate-200',
    icon: FileText,
  },
  ACTIVE: {
    label: 'Active',
    bg: 'bg-emerald-50',
    text: 'text-emerald-700',
    border: 'border-emerald-200',
    icon: CheckCircle2,
  },
  INACTIVE: {
    label: 'Inactive',
    bg: 'bg-slate-100',
    text: 'text-slate-500',
    border: 'border-slate-200',
    icon: Archive,
  },
};

export function StatusBadge({
  status,
  size = 'md',
}: {
  status: EntityStatus | string;
  size?: 'sm' | 'md';
}) {
  const normalizedKey = status.toUpperCase().replace(/\s+/g, '_');
  const config = statusConfig[normalizedKey] || {
    label: status,
    bg: 'bg-slate-100',
    text: 'text-slate-700',
    border: 'border-slate-200',
    icon: Clock,
  };

  const Icon = config.icon;
  const sizeClasses =
    size === 'sm' ? 'px-2 py-0.5 text-[11px] gap-1' : 'px-2.5 py-1 text-xs gap-1.5';
  const iconSize = size === 'sm' ? 'w-3 h-3' : 'w-3.5 h-3.5';

  return (
    <span
      className={`inline-flex items-center rounded-full font-medium border ${config.bg} ${config.text} ${config.border} ${sizeClasses}`}
      role="status"
      aria-label={`Status: ${config.label}`}
    >
      <Icon className={`${iconSize} shrink-0`} aria-hidden="true" />
      {config.label}
    </span>
  );
}
