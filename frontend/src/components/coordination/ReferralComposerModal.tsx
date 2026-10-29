import { useState } from 'react';
import { X, Send, Lock, AlertCircle, Building2, UserCheck, ShieldAlert } from 'lucide-react';
import type { NeedCandidate, NeedRequest } from '../../api/coordination.api';

interface ReferralComposerModalProps {
  needRequest: NeedRequest;
  candidate: NeedCandidate;
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: {
    toInstitutionId: string;
    toFacilityId?: string;
    resourceId?: string;
    messageToReceiver: string;
    shareRequesterContact: boolean;
  }) => Promise<void>;
}

export function ReferralComposerModal({
  needRequest,
  candidate,
  isOpen,
  onClose,
  onSubmit,
}: ReferralComposerModalProps) {
  const [message, setMessage] = useState(
    `We have an urgent institutional capability requirement for ${needRequest.capabilityNeeded || 'research equipment'}. Based on network indexing, ${candidate.resourceName} appears to meet all technical specifications.`
  );
  // Privacy rule: locked to false if requester didn't consent
  const [shareContact, setShareContact] = useState(needRequest.consentShareContact);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim() || message.length < 5) {
      setError('Please provide a message of at least 5 characters for the receiving coordinator.');
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);
      await onSubmit({
        toInstitutionId: candidate.institutionId,
        resourceId: candidate.resourceId,
        messageToReceiver: message.trim(),
        shareRequesterContact: needRequest.consentShareContact ? shareContact : false,
      });
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to send referral';
      setError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-xl w-full p-6 shadow-2xl border border-slate-200 space-y-6 my-8 animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <h3 className="text-base font-black text-slate-900">Compose Cross-Institutional Referral</h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Route this unmet research need to a verified partner facility
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-center gap-2 text-xs text-rose-700">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Target Institution Banner */}
          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
            <div className="flex items-center justify-between text-xs font-bold text-slate-500 uppercase tracking-wider">
              <span>Target Partner Facility</span>
              <span className="text-indigo-600 font-mono">ID: {candidate.resourceId.slice(0, 8)}</span>
            </div>
            <div className="flex items-center gap-2">
              <Building2 className="w-4 h-4 text-slate-500" />
              <span className="text-sm font-black text-slate-900">{candidate.institutionName}</span>
              {candidate.facilityName && (
                <span className="text-xs text-slate-500">({candidate.facilityName})</span>
              )}
            </div>
            <p className="text-xs text-slate-600 font-medium">
              Resource: <span className="font-bold text-slate-900">{candidate.resourceName}</span>
            </p>
          </div>

          {/* Need Reference Summary */}
          <div className="p-3.5 bg-indigo-50/50 rounded-2xl border border-indigo-100 text-xs space-y-1">
            <div className="flex items-center justify-between font-bold text-indigo-900">
              <span>Capability Requested:</span>
              <span className="font-mono text-[11px] text-indigo-600">Need #{needRequest.id.slice(0, 8)}</span>
            </div>
            <p className="text-slate-700 font-medium line-clamp-2">{needRequest.description}</p>
          </div>

          {/* Message to Receiving Coordinator */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              Official Routing Message & Instructions *
            </label>
            <textarea
              rows={4}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="State the technical context, sample volume, and any grant billing reciprocal terms..."
              className="w-full text-xs p-3.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-normal leading-relaxed"
              required
            />
          </div>

          {/* Contact Sharing Toggle & Strict Privacy Lock Guard */}
          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
            <div className="flex items-start justify-between gap-3">
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-800">Direct Contact Disclosure</span>
                  {!needRequest.consentShareContact ? (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-black uppercase bg-slate-200 text-slate-700">
                      <Lock className="w-2.5 h-2.5" /> Locked by Privacy Rule
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">
                      <UserCheck className="w-2.5 h-2.5" /> Requester Consented
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-slate-500">
                  {!needRequest.consentShareContact
                    ? 'The researcher did not opt into contact sharing. Contact information will be cryptographically redacted until referral acceptance and manual release.'
                    : 'The researcher granted consent to share their email/name if the partner accepts this referral.'}
                </p>
              </div>

              {/* The Toggle Switch */}
              <label className={`relative inline-flex items-center ${!needRequest.consentShareContact ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}`}>
                <input
                  type="checkbox"
                  disabled={!needRequest.consentShareContact}
                  checked={shareContact}
                  onChange={(e) => setShareContact(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-10 h-6 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
              </label>
            </div>

            {!needRequest.consentShareContact && (
              <div className="flex items-center gap-2 pt-1 text-[11px] text-amber-700 font-medium">
                <ShieldAlert className="w-3.5 h-3.5 shrink-0" />
                <span>Strict Spec §4.14: Contact sharing cannot be overridden without researcher consent.</span>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-sm hover:shadow transition-all flex items-center gap-1.5 disabled:opacity-50"
            >
              <Send className="w-4 h-4" />
              {isSubmitting ? 'Transmitting Referral...' : 'Send Referral to Partner Inbox'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

