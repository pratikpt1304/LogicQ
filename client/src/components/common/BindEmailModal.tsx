import React, { useState, useEffect, useRef } from 'react';
import { Mail, CheckCircle2, ShieldCheck, X, ArrowRight, Loader2, Sparkles, RefreshCw, KeyRound } from 'lucide-react';
import confetti from 'canvas-confetti';
import { toast } from 'sonner';
import { useAuth } from '../../context/AuthContext.js';
import { api } from '../../api/client.js';
import { FirestoreDataService } from '../../services/firestoreData.service.js';

interface BindEmailModalProps {
  isOpen: boolean;
  onClose: () => void;
  forcePrompt?: boolean;
}

export const BindEmailModal: React.FC<BindEmailModalProps> = ({
  isOpen,
  onClose,
  forcePrompt = false,
}) => {
  const { user, updateUser } = useAuth();

  const [step, setStep] = useState<'email' | 'otp'>('email');
  const [email, setEmail] = useState('');
  const [otpDigits, setOtpDigits] = useState<string[]>(['', '', '', '', '', '']);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState(0);
  const [isSuccess, setIsSuccess] = useState(false);

  const otpInputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Pre-fill email if student already has a placeholder email
  useEffect(() => {
    if (user?.email && !user.email.endsWith('@sanjivani.edu.in') && !user.email.includes('placeholder')) {
      setEmail(user.email);
    }
  }, [user?.email]);

  // Cooldown countdown timer
  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setInterval(() => {
      setCooldown((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [cooldown]);

  if (!isOpen || !user) return null;

  const handleSendOtp = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const cleanEmail = email.trim().toLowerCase();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!cleanEmail || !emailRegex.test(cleanEmail)) {
      setError('Please enter a valid personal or institutional email address.');
      return;
    }

    setError(null);
    setLoading(true);

    try {
      const res = await api.post('/auth/send-bind-email-otp', {
        email: cleanEmail,
        prn: user.prn || undefined,
      });

      if (res?.success) {
        setStep('otp');
        setOtpDigits(['', '', '', '', '', '']);
        setCooldown(res.cooldownRemaining || 60);
        toast.success('Verification code dispatched!', {
          description: `Check your inbox at ${cleanEmail}`,
        });
        setTimeout(() => {
          otpInputRefs.current[0]?.focus();
        }, 150);
      } else {
        setError(res?.message || 'Failed to dispatch verification code.');
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to send verification code. Please check your email spelling.');
    } finally {
      setLoading(false);
    }
  };

  const handleOtpChange = (index: number, value: string) => {
    const clean = value.replace(/[^0-9]/g, '');
    const updated = [...otpDigits];

    if (clean.length > 1) {
      // Pasted full code
      const pasted = clean.slice(0, 6).split('');
      for (let i = 0; i < 6; i++) {
        updated[i] = pasted[i] || '';
      }
      setOtpDigits(updated);
      const nextIdx = Math.min(pasted.length, 5);
      otpInputRefs.current[nextIdx]?.focus();
      if (updated.every((d) => d !== '')) {
        handleVerifyOtp(updated.join(''));
      }
      return;
    }

    updated[index] = clean;
    setOtpDigits(updated);

    if (clean && index < 5) {
      otpInputRefs.current[index + 1]?.focus();
    }

    if (updated.every((d) => d !== '')) {
      handleVerifyOtp(updated.join(''));
    }
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !otpDigits[index] && index > 0) {
      otpInputRefs.current[index - 1]?.focus();
    }
  };

  const handleVerifyOtp = async (codeToVerify?: string) => {
    const fullCode = codeToVerify || otpDigits.join('');
    if (fullCode.length < 6) {
      setError('Please enter the full 6-digit verification code.');
      return;
    }

    setError(null);
    setLoading(true);

    try {
      const cleanEmail = email.trim().toLowerCase();
      const res = await api.post('/auth/bind-email', {
        email: cleanEmail,
        code: fullCode,
        prn: user.prn || undefined,
      });

      if (res?.success) {
        setIsSuccess(true);
        try {
          confetti({
            particleCount: 70,
            spread: 60,
            origin: { y: 0.6 },
            colors: ['#10b981', '#06b6d4', '#6366f1'],
          });
        } catch {}

        // Update local state and Firestore
        updateUser({
          email: cleanEmail,
          isEmailBound: true,
          emailVerified: true,
        });

        if (user.id) {
          (FirestoreDataService as any).updateUserProfile?.(user.id, {
            email: cleanEmail,
            isEmailBound: true,
            emailVerified: true,
          }).catch(() => {});
        }

        toast.success(`🎉 Email ${cleanEmail} successfully bound to PRN ${user.prn || ''}!`);

        setTimeout(() => {
          onClose();
        }, 1500);
      } else {
        setError(res?.message || 'Verification failed. Please check the code.');
      }
    } catch (err: any) {
      setError(err?.message || 'Invalid or expired verification code.');
    } finally {
      setLoading(false);
    }
  };

  const handleDismiss = () => {
    if (user?.id) {
      sessionStorage.setItem(`logicq_bind_email_dismissed_${user.id}`, 'true');
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[999999] flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-md bg-[var(--bg-panel)] border border-[var(--border-line)] rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
        
        {/* Top Decorative Header */}
        <div className="p-6 bg-gradient-to-br from-indigo-500/10 via-cyan-500/5 to-transparent border-b border-[var(--border-line)] relative">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-indigo-500 to-cyan-500 text-white flex items-center justify-center shadow-md shadow-indigo-500/20 shrink-0">
                <Mail className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base sm:text-lg font-bold text-[var(--text-main)] font-sans">
                    Bind Your Email Address
                  </h3>
                  <span className="px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-400 text-[10px] font-mono font-bold border border-cyan-500/30">
                    Required
                  </span>
                </div>
                <p className="text-xs text-[var(--text-muted)] font-mono mt-0.5">
                  PRN: <span className="text-[var(--text-main)] font-bold">{user.prn || 'Registered Student'}</span>
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={handleDismiss}
              className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[var(--bg-surface)] transition cursor-pointer"
              title="Close for now"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <p className="text-xs text-[var(--text-muted)] font-sans mt-3 leading-relaxed">
            Link your active personal or college email to your PRN. This allows you to <strong>log in via Email OTP</strong>, reset your password, and receive exam scores.
          </p>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-4">
          {error && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-500 text-xs font-mono flex items-start gap-2">
              <span className="text-rose-500 shrink-0 mt-0.5 font-bold">⚠️</span>
              <span>{error}</span>
            </div>
          )}

          {isSuccess ? (
            <div className="py-6 text-center space-y-3">
              <div className="w-14 h-14 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center mx-auto shadow-lg shadow-emerald-500/20">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <div className="space-y-1">
                <h4 className="text-base font-bold text-[var(--text-main)]">Email Successfully Bound!</h4>
                <p className="text-xs text-[var(--text-muted)] font-mono">
                  {email} is now securely linked to PRN {user.prn}.
                </p>
              </div>
            </div>
          ) : step === 'email' ? (
            <form onSubmit={handleSendOtp} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-mono font-bold text-[var(--text-main)] flex items-center justify-between">
                  <span>Your Active Email Address</span>
                  <span className="text-[10px] text-[var(--text-muted)] font-normal">Gmail, Outlook, College Mail</span>
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-[var(--text-muted)] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      setError(null);
                    }}
                    placeholder="student@gmail.com"
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-[var(--border-line)] bg-[var(--bg-surface)] text-[var(--text-main)] text-xs font-mono placeholder-[var(--text-muted)] focus:outline-none focus:border-indigo-500 transition"
                  />
                </div>
              </div>

              <div className="p-3 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-line)] text-[11px] font-mono text-[var(--text-muted)] space-y-1">
                <div className="flex items-center gap-1.5 text-indigo-400 font-bold">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>Why bind your email?</span>
                </div>
                <p className="leading-relaxed">
                  You can log in without typing passwords by entering your email and receiving an instant OTP.
                </p>
              </div>

              <div className="flex items-center gap-2 pt-2">
                {!forcePrompt && (
                  <button
                    type="button"
                    onClick={handleDismiss}
                    className="w-1/3 py-2.5 rounded-xl border border-[var(--border-line)] bg-[var(--bg-surface)] text-xs font-mono font-semibold text-[var(--text-muted)] hover:text-[var(--text-main)] transition cursor-pointer"
                  >
                    Skip for Now
                  </button>
                )}
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-cyan-600 hover:from-indigo-500 hover:to-cyan-500 text-white text-xs font-mono font-bold transition flex items-center justify-center gap-2 shadow-md shadow-indigo-500/20 disabled:opacity-50 cursor-pointer"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Sending OTP...</span>
                    </>
                  ) : (
                    <>
                      <span>Send 6-Digit OTP</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </div>
            </form>
          ) : (
            <div className="space-y-4">
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono font-bold text-[var(--text-main)]">
                    Enter Verification Code
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setStep('email');
                      setError(null);
                    }}
                    className="text-[11px] font-mono text-indigo-400 hover:underline cursor-pointer"
                  >
                    Change Email
                  </button>
                </div>
                <p className="text-xs text-[var(--text-muted)] font-mono">
                  We sent a 6-digit code to <strong className="text-[var(--text-main)]">{email}</strong>
                </p>
              </div>

              {/* 6-Digit OTP Input */}
              <div className="flex items-center justify-between gap-1.5 sm:gap-2">
                {otpDigits.map((digit, idx) => (
                  <input
                    key={idx}
                    ref={(el) => (otpInputRefs.current[idx] = el)}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={digit}
                    onChange={(e) => handleOtpChange(idx, e.target.value)}
                    onKeyDown={(e) => handleOtpKeyDown(idx, e)}
                    className="w-11 h-12 text-center text-lg font-mono font-bold rounded-xl border border-[var(--border-line)] bg-[var(--bg-surface)] text-[var(--text-main)] focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition shadow-inner"
                  />
                ))}
              </div>

              {/* Resend Cooldown */}
              <div className="flex items-center justify-between text-xs font-mono pt-1">
                <span className="text-[var(--text-muted)]">Didn't receive code?</span>
                {cooldown > 0 ? (
                  <span className="text-[var(--text-muted)]">Resend in {cooldown}s</span>
                ) : (
                  <button
                    type="button"
                    onClick={() => handleSendOtp()}
                    className="text-indigo-400 font-bold hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <RefreshCw className="w-3 h-3" />
                    <span>Resend Code</span>
                  </button>
                )}
              </div>

              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setStep('email')}
                  className="w-1/3 py-2.5 rounded-xl border border-[var(--border-line)] bg-[var(--bg-surface)] text-xs font-mono font-semibold text-[var(--text-muted)] hover:text-[var(--text-main)] transition cursor-pointer"
                >
                  Back
                </button>
                <button
                  type="button"
                  onClick={() => handleVerifyOtp()}
                  disabled={loading || otpDigits.some((d) => !d)}
                  className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-mono font-bold transition flex items-center justify-center gap-2 shadow-md shadow-emerald-500/20 disabled:opacity-50 cursor-pointer"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Verifying...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Verify &amp; Bind Email</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>

      </div>
    </div>
  );
};
