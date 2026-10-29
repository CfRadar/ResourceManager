import { useState } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import {
  AlertTriangle,
  ArrowLeft,
  Shield,
  FileQuestion,
  CheckCircle2,
  Clock,
  Wrench,
  Flame,
  Users2,
  Plus,
  Trash2,
} from 'lucide-react';
import { incidentsApi } from '../../api/incidents.api';
import type { IncidentType, IncidentSeverity, IncidentAttachment } from '../../api/incidents.api';
import { DemoTag } from '../../components/feedback/DemoTag';

const INCIDENT_TYPES: Array<{
  type: IncidentType;
  label: string;
  description: string;
  icon: typeof AlertTriangle;
}> = [
  { type: 'DAMAGE', label: 'Physical Damage', description: 'Equipment defect, scratch, crack, or hardware failure', icon: Wrench },
  { type: 'DELAY', label: 'Overdue / Schedule Delay', description: 'Session overrun blocking next scheduled researcher', icon: Clock },
  { type: 'SAFETY', label: 'Safety Hazard', description: 'Chemical spill, electrical fault, or PPE non-compliance', icon: Flame },
  { type: 'CONFLICT', label: 'Access Conflict', description: 'Station collision, credential lock, or operator dispute', icon: Users2 },
  { type: 'MISSING_ITEM', label: 'Missing Accessory', description: 'Cables, adapters, pin tools, or lens caps not returned', icon: FileQuestion },
  { type: 'OTHER', label: 'Other Exception', description: 'General facility or environmental issue', icon: AlertTriangle },
];

export function IncidentReportPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const initialBookingId = searchParams.get('bookingId') || '';
  const initialServiceId = searchParams.get('serviceRequestId') || '';

  const [bookingId, setBookingId] = useState(initialBookingId);
  const [serviceRequestId, setServiceRequestId] = useState(initialServiceId);
  const [selectedType, setSelectedType] = useState<IncidentType>('DAMAGE');
  const [severity, setSeverity] = useState<IncidentSeverity>('MEDIUM');
  const [description, setDescription] = useState('');
  const [occurredAt, setOccurredAt] = useState(new Date().toISOString().slice(0, 16));

  // Attachments
  const [attachments, setAttachments] = useState<IncidentAttachment[]>([]);
  const [attachmentUrl, setAttachmentUrl] = useState('');
  const [attachmentName, setAttachmentName] = useState('');

  // Submission state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filedIncidentId, setFiledIncidentId] = useState<string | null>(null);

  const handleAddAttachment = () => {
    if (attachmentUrl.trim()) {
      setAttachments([
        ...attachments,
        {
          url: attachmentUrl.trim(),
          name: attachmentName.trim() || 'Photo Evidence',
          type: 'IMAGE',
        },
      ]);
      setAttachmentUrl('');
      setAttachmentName('');
    }
  };

  const handleRemoveAttachment = (idx: number) => {
    setAttachments(attachments.filter((_, i) => i !== idx));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!description.trim() || description.length < 10) {
      setError('Please provide a description of at least 10 characters.');
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);

      const res = await incidentsApi.fileIncident({
        bookingId: bookingId.trim() || undefined,
        serviceRequestId: serviceRequestId.trim() || undefined,
        type: selectedType,
        severityByReporter: severity,
        description: description.trim(),
        occurredAt: occurredAt ? new Date(occurredAt).toISOString() : undefined,
        attachments: attachments.length > 0 ? attachments : undefined,
      });

      if (res.ok && res.data) {
        setFiledIncidentId(res.data.id);
      } else {
        throw new Error('Failed to file incident report');
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error filing incident report');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto py-8 px-4 space-y-6">
      {/* Top Breadcrumb & Header */}
      <div>
        <Link
          to="/dashboard"
          className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-slate-800 transition-colors mb-3"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Back to Dashboard
        </Link>

        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-black uppercase tracking-wider text-rose-700 bg-rose-50 px-2.5 py-0.5 rounded-full border border-rose-200">
                Operational Exception Filing
              </span>
              <DemoTag label="SPEC §5.13" />
            </div>
            <h1 className="text-2xl font-black text-slate-900">Report an Incident or Discrepancy</h1>
            <p className="text-xs text-slate-500 mt-1">
              Submit observations regarding hardware damage, missing accessories, or safety conditions.
            </p>
          </div>
          <AlertTriangle className="w-12 h-12 text-rose-400 shrink-0 hidden md:block" />
        </div>
      </div>

      {/* Mandatory Neutral Review Banner (Spec §5.13) */}
      <div className="p-4 bg-indigo-50/80 border border-indigo-200 rounded-2xl flex items-start gap-3 shadow-2xs">
        <Shield className="w-5 h-5 text-indigo-600 shrink-0 mt-0.5" />
        <div className="text-xs text-indigo-900 space-y-1">
          <span className="font-black block uppercase tracking-wider">
            Impartial Operational Protection Protocol
          </span>
          <p className="font-normal text-indigo-800 leading-relaxed">
            This report will be reviewed by facility managers. No penalty is automatically applied. All parties are granted a right-of-reply and evidence submission window prior to resolution.
          </p>
        </div>
      </div>

      {filedIncidentId ? (
        <div className="bg-emerald-50 border border-emerald-200 rounded-3xl p-8 text-center space-y-4 animate-in fade-in">
          <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-7 h-7" />
          </div>
          <div>
            <h3 className="text-lg font-black text-emerald-950">Incident Report Logged</h3>
            <p className="text-xs text-emerald-800 mt-1 max-w-lg mx-auto">
              Reference dossier <span className="font-mono font-bold">#{filedIncidentId.slice(0, 8)}</span> has been queued. Facility supervisors and designated operators have been alerted.
            </p>
          </div>
          <div className="pt-2 flex justify-center gap-3">
            <Link
              to={`/manage/incidents/${filedIncidentId}`}
              className="px-5 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold transition-all shadow-sm"
            >
              View Incident Dossier
            </Link>
            <button
              type="button"
              onClick={() => navigate('/dashboard')}
              className="px-5 py-2.5 bg-white border border-emerald-300 text-emerald-800 rounded-xl text-xs font-bold hover:bg-emerald-50 transition-colors"
            >
              Return to Dashboard
            </button>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs space-y-6">
          {error && (
            <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Reference IDs */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Related Booking ID (Optional)
              </label>
              <input
                type="text"
                value={bookingId}
                onChange={(e) => setBookingId(e.target.value)}
                placeholder="e.g. bkg-98a2-11..."
                className="w-full text-xs p-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Related Service Request ID (Optional)
              </label>
              <input
                type="text"
                value={serviceRequestId}
                onChange={(e) => setServiceRequestId(e.target.value)}
                placeholder="e.g. srv-42f1-99..."
                className="w-full text-xs p-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
              />
            </div>
          </div>

          {/* Incident Type Grid */}
          <div className="space-y-2">
            <label className="block text-xs font-bold text-slate-700">
              Select Incident Category *
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {INCIDENT_TYPES.map((cat) => {
                const Icon = cat.icon;
                const isSelected = selectedType === cat.type;
                return (
                  <button
                    key={cat.type}
                    type="button"
                    onClick={() => setSelectedType(cat.type)}
                    className={`p-3.5 rounded-2xl border text-left transition-all ${
                      isSelected
                        ? 'border-indigo-600 bg-indigo-50/70 ring-2 ring-indigo-100'
                        : 'border-slate-200 hover:border-slate-300 bg-white'
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <Icon className={`w-4 h-4 ${isSelected ? 'text-indigo-600' : 'text-slate-400'}`} />
                      <span className="text-xs font-black text-slate-900">{cat.label}</span>
                    </div>
                    <p className="text-[11px] text-slate-500 leading-tight">{cat.description}</p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Severity & Timestamp */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Reporter Assessed Severity
              </label>
              <select
                value={severity}
                onChange={(e) => setSeverity(e.target.value as IncidentSeverity)}
                className="w-full text-xs p-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
              >
                <option value="LOW">Low (Cosmetic, minor scheduling variance)</option>
                <option value="MEDIUM">Medium (Functional impairment, missing accessory)</option>
                <option value="HIGH">High (Major instrument downtime, sample damage)</option>
                <option value="CRITICAL">Critical (Immediate safety hazard, laser breach)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Approximate Time of Occurrence
              </label>
              <input
                type="datetime-local"
                value={occurredAt}
                onChange={(e) => setOccurredAt(e.target.value)}
                className="w-full text-xs p-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          {/* Incident Description */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Detailed Description of Events * (Min 10 characters)
            </label>
            <textarea
              rows={4}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="State what occurred, instrument readings, error codes on display, and immediate mitigation taken..."
              className="w-full text-xs p-3.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-normal leading-relaxed"
              required
            />
          </div>

          {/* Photographic Evidence Attachment */}
          <div className="space-y-3 p-4 bg-slate-50 rounded-2xl border border-slate-200">
            <label className="block text-xs font-bold text-slate-700">
              Photographic / Telemetry Attachments
            </label>

            {attachments.length > 0 && (
              <div className="space-y-2">
                {attachments.map((att, idx) => (
                  <div key={idx} className="flex items-center justify-between p-2.5 bg-white rounded-xl border border-slate-200 text-xs">
                    <span className="font-semibold text-slate-800 truncate mr-2">{att.name} ({att.url})</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveAttachment(idx)}
                      className="text-rose-600 hover:text-rose-800 p-1"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-12 gap-2">
              <input
                type="text"
                placeholder="Evidence Title (e.g. Scratched Bezel Photo)"
                value={attachmentName}
                onChange={(e) => setAttachmentName(e.target.value)}
                className="sm:col-span-4 text-xs p-2.5 rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              <input
                type="url"
                placeholder="https://images.unsplash.com/... or storage link"
                value={attachmentUrl}
                onChange={(e) => setAttachmentUrl(e.target.value)}
                className="sm:col-span-6 text-xs p-2.5 rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono text-[11px]"
              />
              <button
                type="button"
                onClick={handleAddAttachment}
                className="sm:col-span-2 px-3 py-2.5 bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold text-xs rounded-xl transition-colors flex items-center justify-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" /> Add
              </button>
            </div>
          </div>

          {/* Submit Action */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-6 py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl shadow-xs hover:shadow transition-all disabled:opacity-50 flex items-center gap-2"
            >
              <AlertTriangle className="w-4 h-4" />
              {isSubmitting ? 'Filing Report...' : 'Submit Incident Report'}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}

