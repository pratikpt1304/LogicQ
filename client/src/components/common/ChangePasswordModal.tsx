import React, { useState, useEffect, useRef } from 'react';
import { Lock, CheckCircle2, ShieldCheck, X, ArrowRight, Loader2, RefreshCw, KeyRound, Eye, EyeOff, AlertTriangle, Mail } from 'lucide-react';
import confetti from 'canvas-confetti';
import { toast } from 'sonner';
import { useAuth } from '../../context/AuthContext.js';
import { api } from '../../api/client.js';
import { FirestoreDataService } from '../../services/firestoreData.service.js';

interface ChangePasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenBindEmail?: () => void;
}

export const ChangePasswordModal: React.FC<ChangePasswordModalProps> = ({
  isOpen,
  onClose,
  onOpenBindEmail,
}) => {
  const { user } = useAuth();

  const [step, setStep] = useState<'password' | 'otp'>('password');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [otpDigits, setOtpDigits] = useState<string[]>(['', '', '', '', '', '']);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState(0);
  const [targetEmailDisplay, setTargetEmailDisplay] = useState('');
  const [isSuccess, setIsSuccess] = useState(false);

  const otpInputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Cooldown countdown timer
  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setInterval(() => {
      setCooldown((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [cooldown]);

  if (!isOpen || !user) return null;

  // Mask email helper
  const maskEmail = (emailStr?: string | null) => {
    if (!emailStr || !emailStr.includes('@')) return emailStr || 'your email';
    const [local, domain] = emailStr.split('@');
    const visible = local.length > 2 ? local.slice(0, 2) : local.slice(0, 1);
    return `${visible}***@${domain}`;
  };

  const isEmailBound = Boolean(
    user.isEmailBound ||
    user.emailVerified ||
    (user.email && !user.email.endsWith('@sanjivani.edu.in') && !user.email.includes('placeholder'))
  );

  const handleSendOtp = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const cleanPwd = newPassword.trim();
    const cleanConfirm = confirmPassword.trim();

    if (!cleanPwd || cleanPwd.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }

    if (cleanPwd !== cleanConfirm) {
      setError('Passwords do not match. Please re-enter.');
      return;
    }

    if (!isEmailBound) {
      setError('You must bind a verified email address before changing your password.');
      return;
    }

    setError(null);
    setLoading(true);

    try {
      const res = await api.post('/auth/send-change-password-otp', {
        prn: user.prn || undefined,
        email: user.email,
      });

      if (res?.success) {
        setStep('otp');
        setTargetEmailDisplay(res.target || maskEmail(user.email));
        setOtpDigits(['', '', '', '', '', '']);
        setCooldown(res.cooldownRemaining || 60);
        toast.success('Security OTP sent!', {
          description: `Check your inbox at ${res.target || maskEmail(user.email)}`,
        });
        setTimeout(() => {
          otpInputRefs.current[0]?.focus();
        }, 150);
      } else {
        setError(res?.message || 'Failed to dispatch verification code.');
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to send OTP to registered email.');
    } finally {
      setLoading(false);
    }
  };

  const handleOtpChange = (index: number, value: string) => {
    const clean = value.replace(/[^0-9]/g, '');
    const updated = [...otpDigits];

    if (clean.length > 1) {
      const pasted = clean.slice(0, 6).split('');
      for (let i = 0; i < 6; i++) {
        updated[i] = pasted[i] || '';
      }
      setOtpDigits(updated);
      const nextIdx = Math.min(pasted.length, 5);
      otpInputRefs.current[nextIdx]?.focus();
      if (updated.every((d) => d !== '')) {
        handleVerifyAndChangePassword(updated.join(''));
      }
      return;
    }

    updated[index] = clean;
    setOtpDigits(updated);

    if (clean && index < 5) {
      otpInputRefs.current[index + 1]?.focus();
    }

    if (updated.every((d) => d !== '')) {
      handleVerifyAndChangePassword(updated.join(''));
    }
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !otpDigits[index] && index > 0) {
      otpInputRefs.current[index - 1]?.focus();
    }
  };

  const handleVerifyAndChangePassword = async (codeToVerify?: string) => {
    const fullCode = codeToVerify || otpDigits.join('');
    if (fullCode.length < 6) {
      setError('Please enter the 6-digit verification code sent to your email.');
      return;
    }

    setError(null);
    setLoading(true);

    try {
      const res = await api.post('/auth/change-password', {
        newPassword: newPassword.trim(),
        code: fullCode,
        prn: user.prn || undefined,
      });

      if (res?.success) {
        setIsSuccess(true);
        try {
          confetti({
            particleCount: 60,
            spread: 60,
            origin: { y: 0.6 },
            colors: ['#10b981', '#06b6d4', '#6366f1'],
          });
        } catch {}

        if (user.id) {
          (FirestoreDataService as any).updateUserProfile?.(user.id, {
            password: newPassword.trim(),
            passwordChangedAt: new Date().toISOString(),
          }).catch(() => {});
        }

        toast.success('🎉 Password updated successfully! Use your new password on next login.');

        setTimeout(() => {
          onClose();
        }, 1500);
      } else {
        setError(res?.message || 'Password update failed.');
      }
    } catch (err: any) {
      setError(err?.message || 'Invalid or expired verification code.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[999999] flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-md bg-[var(--bg-panel)] border border-[var(--border-line)] rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="p-6 bg-gradient-to-br from-indigo-500/10 via-purple-500/5 to-transparent border-b border-[var(--border-line)] relative">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-indigo-500 to-purple-600 text-white flex items-center justify-center shadow-md shadow-indigo-500/20 shrink-0">
                <Lock className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base sm:text-lg font-bold text-[var(--text-main)] font-sans">
                  Change Password
                </h3>
                <p className="text-xs text-[var(--text-muted)] font-mono mt-0.5">
                  PRN: <span className="text-[var(--text-main)] font-bold">{user.prn || 'Student'}</span>
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[var(--bg-surface)] transition cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <p className="text-xs text-[var(--text-muted)] font-sans mt-3 leading-relaxed">
            Rule: Changing your password requires entering a <strong>6-digit OTP</strong> sent to your bound email address to prevent unauthorized changes.
          </p>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-4">
          {error && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-500 text-xs font-mono flex items-start gap-2">
              <span className="shrink-0 mt-0.5 font-bold">⚠️</span>
              <span>{error}</span>
            </div>
          )}

          {!isEmailBound ? (
            /* Unbound Email Warning */
            <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 space-y-3">
              <div className="flex items-center gap-2 text-amber-500 font-bold text-xs font-mono">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>Email Address Not Bound</span>
              </div>
              <p className="text-xs text-[var(--text-main)] font-sans leading-relaxed">
                You must bind your active email address first so we can verify password changes via Email OTP.
              </p>
              <button
                type="button"
                onClick={() => {
                  onClose();
                  if (onOpenBindEmail) onOpenBindEmail();
                }}
                className="w-full py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 text-dark-950 font-mono text-xs font-bold transition flex items-center justify-center gap-2 shadow-sm cursor-pointer"
              >
                <Mail className="w-4 h-4" />
                <span>Bind Email Address Now &rarr;</span>
              </button>
            </div>
          ) : isSuccess ? (
            <div className="py-6 text-center space-y-3">
              <div className="w-14 h-14 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center mx-auto shadow-lg shadow-emerald-500/20">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <div className="space-y-1">
                <h4 className="text-base font-bold text-[var(--text-main)]">Password Updated Successfully!</h4>
                <p className="text-xs text-[var(--text-muted)] font-mono">
                  Your new password is now active for PRN {user.prn}.
                </p>
              </div>
            </div>
          ) : step === 'password' ? (
            <form onSubmit={handleSendOtp} className="space-y-4">
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-mono font-bold text-[var(--text-main)] flex items-center justify-between">
                    <span>New Password</span>
                    <span className="text-[10px] text-[var(--text-muted)] font-normal">Min 6 characters</span>
                  </label>
                  <div className="relative">
                    <KeyRound className="w-4 h-4 text-[var(--text-muted)] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      minLength={6}
                      value={newPassword}
                      onChange={(e) => {
                        setNewPassword(e.target.value);
                        setError(null);
                      }}
                      placeholder="Enter new password"
                      className="w-full pl-10 pr-10 py-2.5 rounded-xl border border-[var(--border-line)] bg-[var(--bg-surface)] text-[var(--text-main)] text-xs font-mono focus:outline-none focus:border-indigo-500 transition"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--text-main)] cursor-pointer"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-mono font-bold text-[var(--text-main)]">
                    Confirm New Password
                  </label>
                  <div className="relative">
                    <KeyRound className="w-4 h-4 text-[var(--text-muted)] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      minLength={6}
                      value={confirmPassword}
                      onChange={(e) => {
                        setConfirmPassword(e.target.value);
                        setError(null);
                      }}
                      placeholder="Re-enter new password"
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-[var(--border-line)] bg-[var(--bg-surface)] text-[var(--text-main)] text-xs font-mono focus:outline-none focus:border-indigo-500 transition"
                    />
                  </div>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-line)] text-[11px] font-mono text-[var(--text-muted)] space-y-1">
                <div className="flex items-center gap-1.5 text-indigo-400 font-bold">
                  <Mail className="w-3.5 h-3.5" />
                  <span>OTP Authorization:</span>
                </div>
                <p className="leading-relaxed">
                  A verification code will be dispatched to your registered email <strong>{maskEmail(user.email)}</strong>.
                </p>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="w-1/3 py-2.5 rounded-xl border border-[var(--border-line)] bg-[var(--bg-surface)] text-xs font-mono font-semibold text-[var(--text-muted)] hover:text-[var(--text-main)] transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white text-xs font-mono font-bold transition flex items-center justify-center gap-2 shadow-md shadow-indigo-500/20 disabled:opacity-50 cursor-pointer"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Sending OTP...</span>
                    </>
                  ) : (
                    <>
                      <span>Send OTP to Email</span>
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
                    Enter Email OTP
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setStep('password');
                      setError(null);
                    }}
                    className="text-[11px] font-mono text-indigo-400 hover:underline cursor-pointer"
                  >
                    Edit Password
                  </button>
                </div>
                <p className="text-xs text-[var(--text-muted)] font-mono">
                  Enter the 6-digit code sent to <strong className="text-[var(--text-main)]">{targetEmailDisplay || maskEmail(user.email)}</strong>
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
                  onClick={() => setStep('password')}
                  className="w-1/3 py-2.5 rounded-xl border border-[var(--border-line)] bg-[var(--bg-surface)] text-xs font-mono font-semibold text-[var(--text-muted)] hover:text-[var(--text-main)] transition cursor-pointer"
                >
                  Back
                </button>
                <button
                  type="button"
                  onClick={() => handleVerifyAndChangePassword()}
                  disabled={loading || otpDigits.some((d) => !d)}
                  className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-mono font-bold transition flex items-center justify-center gap-2 shadow-md shadow-emerald-500/20 disabled:opacity-50 cursor-pointer"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Updating...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Verify &amp; Update Password</span>
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
