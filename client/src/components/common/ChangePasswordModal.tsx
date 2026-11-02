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

export function getWeeklyPasswordChangeStatus(userId: string) {
  const key = `logicq_pw_change_${userId || 'u'}`;
  try {
    const raw = localStorage.getItem(key);
    const data = raw ? JSON.parse(raw) : { count: 0, weekStart: Date.now() };
    const oneWeekMs = 7 * 24 * 60 * 60 * 1000;
    const now = Date.now();
    if (now - data.weekStart > oneWeekMs) {
      data.count = 0;
      data.weekStart = now;
      localStorage.setItem(key, JSON.stringify(data));
    }
    const daysRemaining = Math.max(1, Math.ceil((data.weekStart + oneWeekMs - now) / (24 * 60 * 60 * 1000)));
    return {
      count: data.count || 0,
      remaining: Math.max(0, 2 - (data.count || 0)),
      isLimitReached: (data.count || 0) >= 2,
      daysRemaining,
    };
  } catch {
    return { count: 0, remaining: 2, isLimitReached: false, daysRemaining: 7 };
  }
}

export function recordPasswordChangeSuccess(userId: string) {
  const key = `logicq_pw_change_${userId || 'u'}`;
  try {
    const raw = localStorage.getItem(key);
    const data = raw ? JSON.parse(raw) : { count: 0, weekStart: Date.now() };
    const oneWeekMs = 7 * 24 * 60 * 60 * 1000;
    const now = Date.now();
    if (now - data.weekStart > oneWeekMs) {
      data.count = 0;
      data.weekStart = now;
    }
    data.count = (data.count || 0) + 1;
    localStorage.setItem(key, JSON.stringify(data));
  } catch {}
}

export const ChangePasswordModal: React.FC<ChangePasswordModalProps> = ({
  isOpen,
  onClose,
  onOpenBindEmail,
}) => {
  const { user } = useAuth();

  const [authMethod, setAuthMethod] = useState<'current_pwd' | 'email_otp'>('current_pwd');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [otpDigits, setOtpDigits] = useState<string[]>(['', '', '', '', '', '']);
  const [otpSent, setOtpSent] = useState(false);
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

  const weeklyStatus = getWeeklyPasswordChangeStatus(user.id || 'u');

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
    (user.email && !user.email.includes('placeholder'))
  );

  const handleSendOtp = async () => {
    if (!isEmailBound) {
      setError('No bound email address found. Please use Current Password or bind an email.');
      return;
    }

    setError(null);
    setLoading(true);

    try {
      const res: any = await api.post('/auth/send-change-password-otp', {
        prn: user.prn || undefined,
        email: user.email,
      });

      if (res?.success) {
        setOtpSent(true);
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
      return;
    }

    updated[index] = clean;
    setOtpDigits(updated);

    if (clean && index < 5) {
      otpInputRefs.current[index + 1]?.focus();
    }
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !otpDigits[index] && index > 0) {
      otpInputRefs.current[index - 1]?.focus();
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (weeklyStatus.isLimitReached) {
      setError(`Weekly limit reached: You can only change password 2 times per week. Try again in ${weeklyStatus.daysRemaining} day(s).`);
      return;
    }

    const cleanNew = newPassword.trim();
    const cleanConfirm = confirmPassword.trim();

    if (!cleanNew || cleanNew.length < 6) {
      setError('New password must be at least 6 characters long.');
      return;
    }

    if (cleanNew !== cleanConfirm) {
      setError('Passwords do not match. Please re-enter.');
      return;
    }

    setError(null);
    setLoading(true);

    try {
      const payload: any = {
        newPassword: cleanNew,
        prn: user.prn || undefined,
      };

      if (authMethod === 'current_pwd') {
        if (!currentPassword) {
          setError('Please enter your current password.');
          setLoading(false);
          return;
        }
        payload.currentPassword = currentPassword;
      } else {
        const fullCode = otpDigits.join('');
        if (fullCode.length < 6) {
          setError('Please enter the 6-digit verification code sent to your email.');
          setLoading(false);
          return;
        }
        payload.code = fullCode;
      }

      const res: any = await api.post('/auth/change-password', payload);

      if (res?.success) {
        recordPasswordChangeSuccess(user.id || 'u');
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
            password: cleanNew,
            passwordChangedAt: new Date().toISOString(),
          }).catch(() => {});
        }

        toast.success('🎉 Password updated successfully!');

        setTimeout(() => {
          onClose();
          setIsSuccess(false);
          setCurrentPassword('');
          setNewPassword('');
          setConfirmPassword('');
          setOtpDigits(['', '', '', '', '', '']);
          setOtpSent(false);
        }, 1500);
      } else {
        setError(res?.message || 'Password update failed.');
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to update password. Please check your credentials.');
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

          {/* Weekly Limit Pill */}
          <div className="mt-3 flex items-center justify-between text-xs font-mono p-2.5 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-line)]">
            <span className="text-[var(--text-muted)] flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-indigo-400" />
              <span>Weekly Rate Limit:</span>
            </span>
            <span className={`px-2 py-0.5 rounded-full font-bold text-[11px] ${
              weeklyStatus.isLimitReached
                ? 'bg-rose-500/15 text-rose-400 border border-rose-500/30'
                : 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
            }`}>
              {weeklyStatus.count}/2 used this week ({weeklyStatus.remaining} left)
            </span>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-4">
          {error && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-500 text-xs font-mono flex items-start gap-2">
              <span className="shrink-0 mt-0.5 font-bold">⚠️</span>
              <span>{error}</span>
            </div>
          )}

          {weeklyStatus.isLimitReached ? (
            <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 space-y-2 text-center">
              <div className="flex items-center justify-center gap-2 text-amber-500 font-bold text-xs font-mono">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>Weekly Password Limit Reached</span>
              </div>
              <p className="text-xs text-[var(--text-muted)] font-mono leading-relaxed">
                Security Policy: Students can change passwords at most <strong>2 times per week</strong>. Your next password change window opens in <strong>{weeklyStatus.daysRemaining} day(s)</strong>.
              </p>
              <button
                type="button"
                onClick={onClose}
                className="mt-3 w-full py-2.5 rounded-xl bg-[var(--bg-surface)] hover:bg-[var(--bg-surface-hover)] border border-[var(--border-line)] text-xs font-mono font-bold text-[var(--text-main)] transition"
              >
                Close
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
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Method Switcher */}
              <div className="grid grid-cols-2 gap-2 p-1 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-line)]">
                <button
                  type="button"
                  onClick={() => {
                    setAuthMethod('current_pwd');
                    setError(null);
                  }}
                  className={`py-2 px-3 rounded-lg text-xs font-mono font-bold transition cursor-pointer ${
                    authMethod === 'current_pwd'
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'
                  }`}
                >
                  Current Password
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setAuthMethod('email_otp');
                    setError(null);
                  }}
                  className={`py-2 px-3 rounded-lg text-xs font-mono font-bold transition cursor-pointer ${
                    authMethod === 'email_otp'
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'
                  }`}
                >
                  Email OTP
                </button>
              </div>

              {/* Current Password Field */}
              {authMethod === 'current_pwd' ? (
                <div className="space-y-1.5">
                  <label className="text-xs font-mono font-bold text-[var(--text-main)]">
                    Current Password
                  </label>
                  <div className="relative">
                    <KeyRound className="w-4 h-4 text-[var(--text-muted)] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      type={showCurrentPassword ? 'text' : 'password'}
                      required
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      placeholder="Enter current password"
                      className="w-full pl-10 pr-10 py-2.5 rounded-xl border border-[var(--border-line)] bg-[var(--bg-surface)] text-[var(--text-main)] text-xs font-mono focus:outline-none focus:border-indigo-500 transition"
                    />
                    <button
                      type="button"
                      onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--text-main)] cursor-pointer"
                    >
                      {showCurrentPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              ) : (
                /* Email OTP Verification Section */
                <div className="space-y-3 p-3.5 rounded-xl bg-indigo-500/5 border border-indigo-500/20">
                  <div className="flex items-center justify-between">
                    <div className="text-xs font-mono text-[var(--text-main)]">
                      <span>Target Email: </span>
                      <strong className="text-indigo-400">{maskEmail(user.email)}</strong>
                    </div>
                    <button
                      type="button"
                      disabled={loading || cooldown > 0}
                      onClick={handleSendOtp}
                      className="px-2.5 py-1 rounded-lg text-[11px] font-mono font-bold bg-indigo-600 hover:bg-indigo-500 text-white disabled:opacity-50 transition cursor-pointer"
                    >
                      {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : cooldown > 0 ? `${cooldown}s` : otpSent ? 'Resend' : 'Send OTP'}
                    </button>
                  </div>

                  {otpSent && (
                    <div className="space-y-1.5">
                      <label className="text-xs font-mono font-bold text-[var(--text-main)]">
                        Enter 6-Digit Code
                      </label>
                      <div className="flex justify-between gap-1.5">
                        {otpDigits.map((digit, idx) => (
                          <input
                            key={idx}
                            ref={(el) => { otpInputRefs.current[idx] = el; }}
                            type="text"
                            maxLength={1}
                            inputMode="numeric"
                            value={digit}
                            onChange={(e) => handleOtpChange(idx, e.target.value)}
                            onKeyDown={(e) => handleOtpKeyDown(idx, e)}
                            className="w-10 h-10 text-center rounded-lg border border-[var(--border-line)] bg-[var(--bg-surface)] text-[var(--text-main)] text-sm font-mono font-bold focus:outline-none focus:border-indigo-500"
                          />
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* New Password */}
              <div className="space-y-1.5">
                <label className="text-xs font-mono font-bold text-[var(--text-main)] flex items-center justify-between">
                  <span>New Password</span>
                  <span className="text-[10px] text-[var(--text-muted)] font-normal">Min 6 characters</span>
                </label>
                <div className="relative">
                  <KeyRound className="w-4 h-4 text-[var(--text-muted)] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type={showNewPassword ? 'text' : 'password'}
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
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--text-main)] cursor-pointer"
                  >
                    {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Confirm New Password */}
              <div className="space-y-1.5">
                <label className="text-xs font-mono font-bold text-[var(--text-main)]">
                  Confirm New Password
                </label>
                <div className="relative">
                  <KeyRound className="w-4 h-4 text-[var(--text-muted)] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type={showNewPassword ? 'text' : 'password'}
                    required
                    minLength={6}
                    value={confirmPassword}
                    onChange={(e) => {
                      setConfirmPassword(e.target.value);
                      setError(null);
                    }}
                    placeholder="Re-enter new password"
                    className="w-full pl-10 pr-10 py-2.5 rounded-xl border border-[var(--border-line)] bg-[var(--bg-surface)] text-[var(--text-main)] text-xs font-mono focus:outline-none focus:border-indigo-500 transition"
                  />
                </div>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-indigo-600 via-indigo-500 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-mono text-xs font-bold transition flex items-center justify-center gap-2 shadow-lg shadow-indigo-500/25 cursor-pointer disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Updating Password...</span>
                  </>
                ) : (
                  <>
                    <KeyRound className="w-4 h-4" />
                    <span>Update Password</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
