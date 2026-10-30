import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.js';
import { Logo } from '../components/common/Logo.js';
import confetti from 'canvas-confetti';
import { toast } from 'sonner';
import {
  Mail,
  ArrowRight,
  AlertCircle,
  CheckCircle2,
  Clock,
  RefreshCw,
  Check,
  Sparkles,
} from 'lucide-react';

export const LoginPage: React.FC = () => {
  const { sendLoginOtp, loginWithOtp } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Step 1: 'identifier' (Email) -> Step 2: 'otp' (6-digit Code)
  const [step, setStep] = useState<'identifier' | 'otp'>('identifier');
  const [identifier, setIdentifier] = useState('');
  const [otpDigits, setOtpDigits] = useState<string[]>(['', '', '', '', '', '']);
  const [targetDisplay, setTargetDisplay] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState<number>(0);
  const [isVerifiedSuccess, setIsVerifiedSuccess] = useState(false);

  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  const fromLocation = (location.state as any)?.from;
  const from = fromLocation
    ? `${fromLocation.pathname || '/'}${fromLocation.search || ''}${fromLocation.hash || ''}`
    : '/dashboard';

  // Resend cooldown timer
  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setInterval(() => {
      setCooldown((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [cooldown]);

  // Step 1: Dispatch OTP
  const handleSendOtp = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const cleanId = identifier.trim();
    if (!cleanId) {
      setError('Please enter your registered institutional email address.');
      return;
    }

    setError(null);
    setInfoMessage(null);
    setLoading(true);

    try {
      const res = await sendLoginOtp(cleanId);
      if (res?.success) {
        setTargetDisplay(res.target || cleanId);
        setOtpDigits(['', '', '', '', '', '']);
        setStep('otp');
        setIsVerifiedSuccess(false);
        setCooldown(res.cooldownRemaining || 60);
        setInfoMessage(res.message || `A 6-digit OTP has been sent to ${res.target || cleanId}.`);

        toast.success('OTP sent successfully', {
          description: `Check your inbox at ${res.target || cleanId}`,
        });

        // Auto focus first input after transition
        setTimeout(() => {
          inputRefs.current[0]?.focus();
        }, 150);
      } else {
        setError(res?.message || 'Failed to dispatch verification code.');
      }
    } catch (err: any) {
      setError(
        err?.message ||
          'Email not found in course roster. Please contact your instructor or verify your email spelling.'
      );
    } finally {
      setLoading(false);
    }
  };

  // Step 2: Verify OTP
  const verifyCode = async (codeToVerify: string) => {
    if (!codeToVerify || codeToVerify.length < 6) return;
    setError(null);
    setLoading(true);

    try {
      await loginWithOtp(identifier.trim(), codeToVerify);
      setIsVerifiedSuccess(true);
      try {
        confetti({
          particleCount: 50,
          spread: 60,
          origin: { y: 0.6 },
          colors: ['#10b981', '#06b6d4', '#6366f1'],
        });
      } catch {}
      toast.success("You're verified! Welcome to LogicQ.");
      setTimeout(() => {
        navigate(from, { replace: true });
      }, 1500);
    } catch (err: any) {
      setError(err?.message || 'Invalid or expired OTP code. Please request a new one.');
    } finally {
      setLoading(false);
    }
  };

  const handleDigitChange = (index: number, val: string) => {
    const digit = val.replace(/[^0-9]/g, '').slice(-1);
    const next = [...otpDigits];
    next[index] = digit;
    setOtpDigits(next);

    // Auto-advance focus to next empty input
    if (digit && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }

    // Auto-trigger verify when all 6 digits are typed
    const full = next.join('');
    if (full.length === 6 && next.every((d) => d !== '')) {
      verifyCode(full);
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !otpDigits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/[^0-9]/g, '').slice(0, 6);
    if (!pasted) return;

    const next = ['', '', '', '', '', ''];
    for (let i = 0; i < pasted.length; i++) {
      next[i] = pasted[i];
    }
    setOtpDigits(next);

    if (pasted.length === 6) {
      verifyCode(pasted);
    } else {
      inputRefs.current[Math.min(pasted.length, 5)]?.focus();
    }
  };

  const fullOtpCode = otpDigits.join('');

  return (
    <div className="min-h-[85vh] flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-md">
        {/* Brand Header */}
        <div className="text-center mb-6">
          <div className="inline-block mb-3">
            <Logo size="lg" />
          </div>
          <h2 className="text-2xl font-extrabold text-[var(--text-main)] tracking-tight">
            Sign In to LogicQ
          </h2>
          <p className="text-xs text-[var(--text-muted)] mt-1.5 font-medium">
            {step === 'identifier'
              ? 'Enter your registered email to receive a 6-digit OTP'
              : `Enter the 6-digit code sent to ${targetDisplay}`}
          </p>
        </div>

        {/* Main Card */}
        <div className="glass-card p-6 sm:p-8 rounded-3xl border border-[var(--border-line)] bg-[var(--bg-panel)] shadow-2xl relative overflow-hidden">
          {/* Ambient Card Glow */}
          <div className="absolute -top-20 -right-20 w-44 h-44 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none" />

          {/* Success / Verified Screen State (Matches Code.xr V15 Reel) */}
          {isVerifiedSuccess ? (
            <div className="py-4 text-center space-y-5 animate-in zoom-in-95 fade-in duration-300">
              {/* Green Verified Circle Badge */}
              <div className="relative inline-flex items-center justify-center">
                <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-emerald-500/20 flex items-center justify-center border-2 border-emerald-500/40 shadow-lg shadow-emerald-500/25 animate-pulse">
                  <div className="w-11 h-11 sm:w-13 sm:h-13 rounded-full bg-emerald-500 text-white flex items-center justify-center shadow-md">
                    <Check className="w-6 h-6 stroke-[3.5]" />
                  </div>
                </div>
              </div>

              <div className="space-y-1">
                <h3 className="text-xl sm:text-2xl font-extrabold text-[var(--text-main)] tracking-tight">
                  You're verified
                </h3>
                <p className="text-xs text-[var(--text-muted)] font-medium">
                  Your account has been successfully verified.
                </p>
              </div>

              {/* 6 Solid Green Digit Boxes */}
              <div className="flex items-center justify-center gap-2 sm:gap-2.5 my-4">
                {otpDigits.map((digit, idx) => (
                  <div
                    key={idx}
                    className="w-10 h-12 sm:w-12 sm:h-14 rounded-2xl bg-emerald-500 text-white font-mono font-black text-xl flex items-center justify-center shadow-md shadow-emerald-500/25 transform hover:scale-105 transition-all"
                  >
                    {digit || '•'}
                  </div>
                ))}
              </div>

              {/* Continue CTA Button */}
              <button
                type="button"
                onClick={() => navigate(from, { replace: true })}
                className="w-full py-3.5 px-6 rounded-2xl font-mono text-xs sm:text-sm font-bold text-white bg-gradient-to-r from-emerald-600 via-emerald-500 to-teal-500 hover:from-emerald-500 hover:to-teal-400 shadow-xl shadow-emerald-500/25 flex items-center justify-center gap-2 transition-all transform hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
              >
                <span>Continue</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <>
              {/* Error Alert */}
              {error && (
                <div className="mb-4 flex items-start gap-2.5 p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-xs text-red-600 dark:text-red-300 font-medium animate-fadeIn">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-500" />
                  <div className="leading-relaxed">{error}</div>
                </div>
              )}

              {/* Success / Info Message */}
              {infoMessage && (
                <div className="mb-4 flex items-start gap-2.5 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-xs text-emerald-600 dark:text-emerald-300 font-medium animate-fadeIn">
                  <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-emerald-500" />
                  <div className="leading-relaxed">{infoMessage}</div>
                </div>
              )}

              {/* STEP 1: Email OTP Form */}
              {step === 'identifier' && (
                <form onSubmit={handleSendOtp} className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-[var(--text-main)] mb-1.5">
                      Institutional Email Address
                    </label>
                    <div className="relative">
                      <input
                        type="email"
                        required
                        autoFocus
                        value={identifier}
                        onChange={(e) => setIdentifier(e.target.value)}
                        placeholder="e.g. pratik.thorat@sanjivani.edu.in"
                        className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-line)] text-sm text-[var(--text-main)] placeholder-[var(--text-muted)] focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-colors"
                      />
                      <Mail className="w-4 h-4 text-[var(--text-muted)] absolute left-3 top-3" />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={loading || !identifier.trim()}
                    className="w-full py-2.5 px-4 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 shadow-md shadow-emerald-600/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
                  >
                    <span>{loading ? 'Sending Verification Code...' : 'Send OTP Code'}</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </form>
              )}

              {/* STEP 2: Smooth 6-Digit OTP Box Grid (V15 Animation) */}
              {step === 'otp' && (
                <form onSubmit={(e) => { e.preventDefault(); verifyCode(fullOtpCode); }} className="space-y-5 animate-in fade-in duration-200">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <label className="block text-xs font-semibold text-[var(--text-main)]">
                        Enter 6-Digit OTP Code
                      </label>
                      <button
                        type="button"
                        onClick={() => {
                          setStep('identifier');
                          setOtpDigits(['', '', '', '', '', '']);
                          setError(null);
                          setInfoMessage(null);
                        }}
                        className="text-xs text-indigo-500 hover:underline font-medium cursor-pointer"
                      >
                        Change Email
                      </button>
                    </div>

                    {/* 6 Individual Digit Inputs with Smooth Focus and Rounded Styling */}
                    <div className="flex items-center justify-between gap-1.5 sm:gap-2.5" onPaste={handlePaste}>
                      {otpDigits.map((digit, idx) => (
                        <input
                          key={idx}
                          ref={(el) => { inputRefs.current[idx] = el; }}
                          type="text"
                          inputMode="numeric"
                          pattern="[0-9]*"
                          maxLength={1}
                          value={digit}
                          onChange={(e) => handleDigitChange(idx, e.target.value)}
                          onKeyDown={(e) => handleKeyDown(idx, e)}
                          className={`w-11 h-13 sm:w-13 sm:h-15 text-center text-xl sm:text-2xl font-mono font-black rounded-2xl border transition-all outline-none ${
                            digit
                              ? 'bg-emerald-500/10 border-emerald-500 text-emerald-600 dark:text-emerald-400 shadow-sm shadow-emerald-500/10 ring-1 ring-emerald-500/30'
                              : 'bg-[var(--bg-surface)] border-[var(--border-line)] text-[var(--text-main)] focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20'
                          }`}
                        />
                      ))}
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={loading || fullOtpCode.length !== 6}
                    className="w-full py-3 px-4 rounded-xl text-sm font-bold text-white bg-gradient-to-r from-emerald-600 via-emerald-500 to-teal-500 hover:from-emerald-500 hover:to-teal-400 shadow-md shadow-emerald-600/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
                  >
                    <span>{loading ? 'Verifying OTP...' : 'Verify OTP & Continue'}</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>

                  {/* Resend Action */}
                  <div className="flex items-center justify-between pt-3 border-t border-[var(--border-line)] text-xs text-[var(--text-muted)]">
                    {cooldown > 0 ? (
                      <div className="flex items-center gap-1.5 font-mono">
                        <Clock className="w-3.5 h-3.5" />
                        <span>Resend code in {cooldown}s</span>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleSendOtp()}
                        disabled={loading}
                        className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 hover:underline font-semibold cursor-pointer"
                      >
                        <RefreshCw className="w-3.5 h-3.5" />
                        <span>Resend OTP</span>
                      </button>
                    )}
                    <span>Expires in 10 mins</span>
                  </div>
                </form>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
