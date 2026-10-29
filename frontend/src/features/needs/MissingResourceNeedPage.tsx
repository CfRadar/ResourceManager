import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  Sparkles,
  ArrowLeft,
  MapPin,
  Calendar,
  Layers,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Plus,
  X,
  FileQuestion,
} from 'lucide-react';
import { coordinationApi } from '../../api/coordination.api';
import type { AccessMode } from '../../api/coordination.api';
import { DemoTag } from '../../components/feedback/DemoTag';

export function MissingResourceNeedPage() {
  const navigate = useNavigate();

  // Plain English AI prompt input
  const [naturalQuery, setNaturalQuery] = useState('');
  const [isAiParsing, setIsAiParsing] = useState(false);
  const [aiSuccessMessage, setAiSuccessMessage] = useState<string | null>(null);

  // Form Fields
  const [capabilityNeeded, setCapabilityNeeded] = useState('');
  const [description, setDescription] = useState('');
  const [techTags, setTechTags] = useState<string[]>([]);
  const [currentTag, setCurrentTag] = useState('');
  const [travelRadius, setTravelRadius] = useState<number>(75);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [isStaffServiceOk, setIsStaffServiceOk] = useState(true);
  const [consentShareContact, setConsentShareContact] = useState(false);

  // Submission State
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submissionError, setSubmissionError] = useState<string | null>(null);
  const [createdRequestId, setCreatedRequestId] = useState<string | null>(null);

  // AI Auto-Fill Handler
  const handleAiAutoFill = async () => {
    if (!naturalQuery.trim()) {
      setSubmissionError('Please type a brief plain-English description first for the AI parser.');
      return;
    }

    try {
      setIsAiParsing(true);
      setSubmissionError(null);
      setAiSuccessMessage(null);

      const res = await coordinationApi.parseNeedWithAi(naturalQuery);
      if (res.ok && res.data) {
        const parsed = res.data;
        if (parsed.capabilityNeeded) setCapabilityNeeded(parsed.capabilityNeeded);
        if (parsed.description) setDescription(parsed.description);
        if (parsed.technicalRequirements && parsed.technicalRequirements.length > 0) {
          setTechTags(parsed.technicalRequirements);
        }
        if (parsed.accessModePreference) {
          setIsStaffServiceOk(
            parsed.accessModePreference === 'STAFF_SERVICE' ||
            parsed.accessModePreference === 'SUPERVISED'
          );
        }
        setAiSuccessMessage(
          '✨ AI successfully parsed your requirements into structured capability envelopes!'
        );
      } else {
        // Fallback local heuristic parsing if AI service returned empty
        fallbackLocalParse(naturalQuery);
      }
    } catch {
      // Offline fallback
      fallbackLocalParse(naturalQuery);
    } finally {
      setIsAiParsing(false);
    }
  };

  const fallbackLocalParse = (query: string) => {
    const qLower = query.toLowerCase();
    setCapabilityNeeded(query.slice(0, 60));
    setDescription(query);
    const tags: string[] = [];
    if (qLower.includes('cryo') || qLower.includes('tem') || qLower.includes('microscop')) {
      tags.push('High-Resolution Cryo-EM', '300kV Beam', 'Vitreous Sample Support');
    } else if (qLower.includes('nmr') || qLower.includes('spectroscop')) {
      tags.push('600MHz+ Magnetic Field', 'Cryoprobe', '1H/13C/15N Triple Resonance');
    } else if (qLower.includes('flow') || qLower.includes('cytometr')) {
      tags.push('Multi-Laser Flow Cytometer', 'Cell Sorting', 'High-Throughput Autosampler');
    } else {
      tags.push('Specialized Scientific Instrument', 'Precision Analysis');
    }
    setTechTags(tags);
    setAiSuccessMessage('✨ Populated requirements from natural language description.');
  };

  // Tag management
  const handleAddTag = () => {
    const trimmed = currentTag.trim();
    if (trimmed && !techTags.includes(trimmed)) {
      setTechTags([...techTags, trimmed]);
      setCurrentTag('');
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setTechTags(techTags.filter((t) => t !== tagToRemove));
  };

  // Form Submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!description.trim() || description.length < 10) {
      setSubmissionError('Please provide a descriptive explanation of at least 10 characters.');
      return;
    }

    try {
      setIsSubmitting(true);
      setSubmissionError(null);

      const accessMode: AccessMode = isStaffServiceOk ? 'STAFF_SERVICE' : 'INDEPENDENT';

      const payload = {
        capabilityNeeded: capabilityNeeded.trim() || 'Unspecified Research Equipment',
        description: description.trim(),
        technicalRequirements: techTags,
        travelRadiusKm: travelRadius,
        preferredDates: { start: startDate || undefined, end: endDate || undefined },
        accessModePreference: accessMode,
        consentShareContact,
      };

      const res = await coordinationApi.createNeedRequest(payload);
      if (res.ok && res.data) {
        setCreatedRequestId(res.data.id);
      } else {
        throw new Error('Could not submit request');
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error submitting missing-resource request';
      setSubmissionError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto py-8 px-4 space-y-6">
      {/* Header */}
      <div>
        <Link
          to="/discover"
          className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-slate-800 transition-colors mb-3"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Back to Catalog
        </Link>

        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-black uppercase tracking-wider text-indigo-600 bg-indigo-50 px-2.5 py-0.5 rounded-full border border-indigo-100">
                Institutional Need Intake
              </span>
              <DemoTag label="SPEC §5.6" />
            </div>
            <h1 className="text-2xl font-black text-slate-900">Missing-Resource Request</h1>
            <p className="text-xs text-slate-500 mt-1 max-w-2xl">
              Can't find the equipment or scientific capability you need on campus? Submit a structured need request. The Network Coordination Engine will match partner institutions within your travel radius.
            </p>
          </div>
          <FileQuestion className="w-12 h-12 text-indigo-400 shrink-0 hidden md:block" />
        </div>
      </div>

      {/* Success Notification if Created */}
      {createdRequestId ? (
        <div className="bg-emerald-50 border border-emerald-200 rounded-3xl p-8 text-center space-y-4 animate-in fade-in">
          <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-7 h-7" />
          </div>
          <div>
            <h3 className="text-lg font-black text-emerald-950">Need Request Submitted Successfully</h3>
            <p className="text-xs text-emerald-800 mt-1 max-w-lg mx-auto">
              Your need request <span className="font-mono font-bold">#{createdRequestId.slice(0, 8)}</span> has been queued for institutional coordinator review and AI candidate discovery.
            </p>
          </div>
          <div className="pt-2 flex justify-center gap-3">
            <Link
              to="/dashboard"
              className="px-5 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold transition-all shadow-sm"
            >
              Go to Requester Dashboard
            </Link>
            <button
              type="button"
              onClick={() => {
                setCreatedRequestId(null);
                setNaturalQuery('');
                setCapabilityNeeded('');
                setDescription('');
                setTechTags([]);
              }}
              className="px-5 py-2.5 bg-white border border-emerald-300 text-emerald-800 rounded-xl text-xs font-bold hover:bg-emerald-50 transition-colors"
            >
              Submit Another Need
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Section 1: Tell Us What You Need (AI Auto-Fill) */}
          <div className="bg-linear-to-br from-indigo-50/70 to-purple-50/50 border border-indigo-200/80 rounded-3xl p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-indigo-600" />
                <h3 className="text-sm font-black text-indigo-950 uppercase tracking-wider">
                  "Tell Us What You Need"
                </h3>
              </div>
              <span className="text-[11px] font-semibold text-indigo-700 bg-white/80 px-2.5 py-0.5 rounded-full border border-indigo-200">
                Natural Language AI Parser
              </span>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Describe the scientific instrument, experiment outcome, or specialized facility you require in plain English. Our AI will automatically parse specifications, tolerances, and matching criteria into the form below.
            </p>

            <div className="space-y-2">
              <textarea
                rows={3}
                value={naturalQuery}
                onChange={(e) => setNaturalQuery(e.target.value)}
                placeholder="e.g. We require access to an ultra-high vacuum scanning tunneling microscope (UHV-STM) operating at 4 Kelvin to measure atomic surface reconstructions. Desired within 100km radius before mid-December."
                className="w-full text-xs p-3.5 rounded-2xl bg-white border border-indigo-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-normal leading-relaxed placeholder:text-slate-400"
              />

              <div className="flex flex-col sm:flex-row items-center justify-between gap-2 pt-1">
                <span className="text-[11px] text-indigo-600 font-medium">
                  💡 Tip: Include parameters like temperature, field strength, wavelength, or sample type.
                </span>

                <button
                  type="button"
                  disabled={isAiParsing || !naturalQuery.trim()}
                  onClick={handleAiAutoFill}
                  className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-xs hover:shadow transition-all disabled:opacity-50 flex items-center justify-center gap-2 shrink-0"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  {isAiParsing ? 'Analyzing Specs with AI...' : 'Auto-fill with AI'}
                </button>
              </div>
            </div>

            {aiSuccessMessage && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 font-medium flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{aiSuccessMessage}</span>
              </div>
            )}
          </div>

          {/* Section 2: Detailed Structured Form */}
          <form onSubmit={handleSubmit} className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs space-y-6">
            <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
              <Layers className="w-4 h-4 text-slate-500" />
              <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider">
                Structured Technical Specifications
              </h3>
            </div>

            {submissionError && (
              <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{submissionError}</span>
              </div>
            )}

            {/* Capability / Equipment Title */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Capability or Result Needed *
              </label>
              <input
                type="text"
                value={capabilityNeeded}
                onChange={(e) => setCapabilityNeeded(e.target.value)}
                placeholder="e.g. 300kV Cryo-Transmission Electron Microscope or High-Throughput FACS Cell Sorter"
                className="w-full text-xs p-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                required
              />
            </div>

            {/* Detailed Description */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Scientific Context & Requirements * (Min 10 characters)
              </label>
              <textarea
                rows={4}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Elaborate on research objectives, protocol constraints, sample volumes, and precision requirements..."
                className="w-full text-xs p-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-normal leading-relaxed"
                required
              />
            </div>

            {/* Technical Specs Tags */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Technical Specifications & Search Tags
              </label>
              <div className="flex flex-wrap gap-2 mb-2">
                {techTags.map((tag) => (
                  <span
                    key={tag}
                    className="inline-flex items-center gap-1 px-3 py-1 bg-indigo-50 text-indigo-700 rounded-lg text-xs font-medium border border-indigo-100"
                  >
                    {tag}
                    <button
                      type="button"
                      onClick={() => handleRemoveTag(tag)}
                      className="text-indigo-400 hover:text-indigo-600"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </span>
                ))}
              </div>

              <div className="flex gap-2">
                <input
                  type="text"
                  value={currentTag}
                  onChange={(e) => setCurrentTag(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddTag();
                    }
                  }}
                  placeholder="Type a spec tag (e.g. 4 Kelvin, Ultra-High Vacuum) and press Add"
                  className="flex-1 text-xs p-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                <button
                  type="button"
                  onClick={handleAddTag}
                  className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors flex items-center gap-1"
                >
                  <Plus className="w-3.5 h-3.5" /> Add Tag
                </button>
              </div>
            </div>

            {/* Travel Radius Preference Slider */}
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-1.5 text-xs font-bold text-slate-700">
                  <MapPin className="w-3.5 h-3.5 text-indigo-600" />
                  Travel Radius Preference
                </label>
                <span className="text-xs font-black text-indigo-600 bg-indigo-50 px-2.5 py-0.5 rounded-full border border-indigo-100">
                  {travelRadius} km
                </span>
              </div>
              <input
                type="range"
                min={10}
                max={250}
                step={5}
                value={travelRadius}
                onChange={(e) => setTravelRadius(Number(e.target.value))}
                className="w-full accent-indigo-600 cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-slate-400 font-mono">
                <span>10 km (Local Cluster)</span>
                <span>125 km (Regional Hub)</span>
                <span>250 km (Inter-State)</span>
              </div>
            </div>

            {/* Timeframe / Deadlines */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Earliest Needed Date
                </label>
                <div className="relative">
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full text-xs p-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                  <Calendar className="w-4 h-4 text-slate-400 absolute right-3 top-3.5 pointer-events-none" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Latest Acceptable Deadline
                </label>
                <div className="relative">
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full text-xs p-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                  <Calendar className="w-4 h-4 text-slate-400 absolute right-3 top-3.5 pointer-events-none" />
                </div>
              </div>
            </div>

            {/* Options & Privacy Consent Checkboxes (Spec §5.6) */}
            <div className="space-y-3 pt-2 border-t border-slate-100">
              <label className="flex items-start gap-3 p-3.5 rounded-2xl border border-slate-200 bg-slate-50/50 hover:bg-slate-50 cursor-pointer transition-colors">
                <input
                  type="checkbox"
                  checked={isStaffServiceOk}
                  onChange={(e) => setIsStaffServiceOk(e.target.checked)}
                  className="mt-0.5 rounded text-indigo-600 focus:ring-indigo-500 h-4 w-4"
                />
                <div>
                  <span className="text-xs font-bold text-slate-900 block">
                    Staff-operated service is acceptable
                  </span>
                  <span className="text-[11px] text-slate-500">
                    If approved, certified lab technicians at the host institution can run the protocol on your behalf and deliver result data.
                  </span>
                </div>
              </label>

              <label className="flex items-start gap-3 p-3.5 rounded-2xl border border-slate-200 bg-slate-50/50 hover:bg-slate-50 cursor-pointer transition-colors">
                <input
                  type="checkbox"
                  checked={consentShareContact}
                  onChange={(e) => setConsentShareContact(e.target.checked)}
                  className="mt-0.5 rounded text-indigo-600 focus:ring-indigo-500 h-4 w-4"
                />
                <div>
                  <span className="text-xs font-bold text-slate-900 block flex items-center gap-1.5">
                    <ShieldCheck className="w-3.5 h-3.5 text-indigo-600" />
                    Allow my contact details to be shared with receiving institution *only if they accept the referral*
                  </span>
                  <span className="text-[11px] text-slate-500">
                    Your institutional email and phone remain completely redacted during discovery. They are only disclosed after formal partner acceptance.
                  </span>
                </div>
              </label>
            </div>

            {/* Form Submit Button */}
            <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
              <button
                type="button"
                onClick={() => navigate('/discover')}
                className="px-5 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-sm hover:shadow transition-all disabled:opacity-50 flex items-center gap-2"
              >
                {isSubmitting ? 'Routing to Network Engine...' : 'Submit Need Request'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

