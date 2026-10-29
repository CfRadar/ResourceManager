import { Lock, KeyRound, ShieldAlert, CheckCircle2, DoorOpen } from 'lucide-react';

interface ConfidentialInstructionsCardProps {
  hasApprovedBooking?: boolean;
  confidentialData?: {
    doorCode?: string;
    lockboxPin?: string;
    specialInstructions?: string;
  };
}

export function ConfidentialInstructionsCard({
  hasApprovedBooking = false,
  confidentialData,
}: ConfidentialInstructionsCardProps) {
  if (hasApprovedBooking && confidentialData) {
    return (
      <div className="bg-emerald-50/70 border border-emerald-200 rounded-3xl p-6 sm:p-8 space-y-4">
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
            <DoorOpen className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-800 bg-emerald-100 px-2.5 py-0.5 rounded-full">
              ACTIVE ACCESS PASS
            </span>
            <h3 className="font-bold text-slate-900 text-base mt-1">
              Physical Access Credentials & Instructions
            </h3>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
          <div className="bg-white border border-emerald-200 rounded-2xl p-4">
            <span className="text-[10px] font-bold uppercase text-slate-400 block mb-1">
              LAB ENTRY DOOR CODE
            </span>
            <span className="font-mono text-xl font-black text-slate-900 tracking-wider">
              {confidentialData.doorCode || '4829#'}
            </span>
            <p className="text-[11px] text-slate-500 mt-1">
              Valid on the main lab electronic keypad during your scheduled slot.
            </p>
          </div>

          <div className="bg-white border border-emerald-200 rounded-2xl p-4">
            <span className="text-[10px] font-bold uppercase text-slate-400 block mb-1">
              EQUIPMENT LOCKBOX PIN
            </span>
            <span className="font-mono text-xl font-black text-slate-900 tracking-wider">
              {confidentialData.lockboxPin || '9173'}
            </span>
            <p className="text-[11px] text-slate-500 mt-1">
              Cabinet #3 contains certified safety glasses and tool kit.
            </p>
          </div>
        </div>

        {confidentialData.specialInstructions && (
          <div className="bg-white border border-emerald-200 rounded-2xl p-4 text-xs text-slate-700">
            <span className="font-bold text-slate-900 block mb-1 flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              Special Operating Procedure:
            </span>
            <p className="leading-relaxed">{confidentialData.specialInstructions}</p>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="bg-slate-900 text-white rounded-3xl p-8 sm:p-10 shadow-xs relative overflow-hidden">
      <div className="absolute right-0 top-0 translate-x-8 -translate-y-8 w-48 h-48 bg-blue-500/10 rounded-full blur-2xl pointer-events-none" />

      <div className="max-w-xl space-y-4">
        <div className="w-12 h-12 rounded-2xl bg-slate-800 border border-slate-700 flex items-center justify-center text-amber-400">
          <Lock className="w-6 h-6" />
        </div>

        <div>
          <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400 bg-amber-400/10 border border-amber-400/20 px-2.5 py-0.5 rounded-full">
            REDACTED PHYSICAL ENVELOPE
          </span>
          <h3 className="text-xl sm:text-2xl font-black mt-2">
            Confidential Credentials Locked
          </h3>
          <p className="text-xs text-slate-400 leading-relaxed mt-2">
            Facility door keycodes, equipment lockbox PINs, power start sequences, and cleanroom gowning chamber passwords are protected under institutional compliance boundaries.
          </p>
        </div>

        <div className="bg-slate-800/80 border border-slate-700/80 rounded-2xl p-4 space-y-2 text-xs">
          <div className="flex items-center gap-2 text-slate-300">
            <KeyRound className="w-4 h-4 text-blue-400 shrink-0" />
            <span className="font-semibold">Unlocks automatically upon:</span>
          </div>
          <ul className="space-y-1.5 text-slate-400 text-[11px] pl-6 list-disc">
            <li>Approved booking reservation request confirmed by facility managers</li>
            <li>On-site geofence arrival and dual-camera condition check-in QR scan</li>
          </ul>
        </div>

        <div className="flex items-center gap-2 text-[11px] text-slate-500 pt-1">
          <ShieldAlert className="w-3.5 h-3.5 text-slate-400" />
          <span>Spec §4.5 Confidential Redaction Policy verified</span>
        </div>
      </div>
    </div>
  );
}

