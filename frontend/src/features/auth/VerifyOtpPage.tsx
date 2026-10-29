import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { KeyRound, Sparkles, ArrowRight, ShieldCheck, Mail } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { DemoTag } from '../../components/feedback/DemoTag';

export function VerifyOtpPage() {
  const [searchParams] = useSearchParams();
  const email = searchParams.get('email') || 'sarah.chen@mit.edu';
  const demoOtpParam = searchParams.get('demoOtp') || '123456';
  const next = searchParams.get('next') || '/dashboard';

  const [digits, setDigits] = useState<string[]>(['', '', '', '', '', '']);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const { verifyOtp } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    // Focus first input box on load
    inputRefs.current[0]?.focus();
  }, []);

  const handleDigitChange = (index: number, value: string) => {
    // Only accept numeric digit
    const cleaned = value.replace(/\D/g, '').slice(-1);
    const newDigits = [...digits];
    newDigits[index] = cleaned;
    setDigits(newDigits);

    // Auto-advance to next input if digit entered
    if (cleaned && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !digits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (!pasted) return;
    const newDigits = [...digits];
    for (let i = 0; i < 6; i++) {
      newDigits[i] = pasted[i] || '';
    }
    setDigits(newDigits);
    const nextFocusIndex = Math.min(pasted.length, 5);
    inputRefs.current[nextFocusIndex]?.focus();
  };

  const handleAutoFillDemo = () => {
    const code = (demoOtpParam || '123456').slice(0, 6);
    const newDigits = code.split('');
    setDigits(newDigits);
    inputRefs.current[5]?.focus();
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const fullOtp = digits.join('');
    if (fullOtp.length < 6) return;

    setIsSubmitting(true);
    try {
      await verifyOtp(email, fullOtp);
      navigate(next);
    } catch {
      // Toast displayed by AuthContext
    } finally {
      setIsSubmitting(false);
    }
  };

  const isComplete = digits.every((d) => d.length === 1);

  return (
    <div className="max-w-md mx-auto py-10 px-4">
      <div className="bg-white border border-slate-200 rounded-3xl p-8 shadow-sm">
        <div className="text-center mb-6">
          <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-3 border border-blue-100">
            <KeyRound className="w-6 h-6" />
          </div>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight">Verify Your Account</h2>
          <p className="text-xs text-slate-500 mt-1 flex items-center justify-center gap-1">
            <Mail className="w-3.5 h-3.5 text-slate-400" />
            <span>Code sent to <span className="font-semibold text-slate-700">{email}</span></span>
          </p>
        </div>

        {/* Demo Mode Transparency Banner */}
        <div className="mb-6 bg-amber-50/80 border border-amber-200/80 rounded-2xl p-4 text-left">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-amber-900 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-amber-600" />
              Demo Evaluation Mode
            </span>
            <DemoTag label="AUTO-OTP" />
          </div>
          <p className="text-[11px] text-amber-800 leading-relaxed mb-3">
            In demonstration mode, your verification code is simulated and automatically retrieved below:
          </p>
          <div className="flex items-center justify-between bg-white border border-amber-200 rounded-xl px-3.5 py-2">
            <span className="font-mono font-bold text-base tracking-widest text-slate-900">
              {demoOtpParam}
            </span>
            <button
              type="button"
              onClick={handleAutoFillDemo}
              className="text-xs px-2.5 py-1 bg-amber-100 hover:bg-amber-200 text-amber-900 font-semibold rounded-lg transition-colors flex items-center gap-1"
            >
              <span>Auto-Fill Code</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          </div>
        </div>

        {/* 6-Digit OTP Input Boxes */}
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-2.5 text-center">
              Enter 6-Digit Verification Code
            </label>
            <div className="flex items-center justify-center gap-2 sm:gap-3" onPaste={handlePaste}>
              {digits.map((digit, i) => (
                <input
                  key={i}
                  ref={(el) => {
                    inputRefs.current[i] = el;
                  }}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  value={digit}
                  onChange={(e) => handleDigitChange(i, e.target.value)}
                  onKeyDown={(e) => handleKeyDown(i, e)}
                  className="w-11 h-13 sm:w-12 sm:h-14 text-center text-xl font-bold font-mono border-2 border-slate-200 rounded-xl focus:border-blue-600 focus:ring-2 focus:ring-blue-100 focus:outline-none transition-all"
                />
              ))}
            </div>
          </div>

          <button
            type="submit"
            disabled={isSubmitting || !isComplete}
            className="w-full py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl font-bold text-sm transition-colors shadow-xs flex items-center justify-center gap-2"
          >
            <ShieldCheck className="w-4 h-4" />
            <span>{isSubmitting ? 'Verifying...' : 'Verify Code & Access Network'}</span>
          </button>
        </form>

        <div className="mt-6 pt-5 border-t border-slate-100 text-center text-xs text-slate-500">
          <span>Need to use a different address? </span>
          <Link to="/register" className="text-blue-600 font-semibold hover:underline">
            Back to registration
          </Link>
        </div>
      </div>
    </div>
  );
}

