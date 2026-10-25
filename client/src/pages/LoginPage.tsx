import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.js';
import { Logo } from '../components/common/Logo.js';
import { toast } from 'sonner';
import {
  Mail,
  ArrowRight,
  AlertCircle,
  Info,
  ShieldCheck,
  CheckCircle2,
  Clock,
  KeyRound,
  RefreshCw,
  ChevronDown,
} from 'lucide-react';

export const LoginPage: React.FC = () => {
  const { sendLoginOtp, loginWithOtp } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Step 1: 'identifier' (Email / Mobile / PRN) -> Step 2: 'otp' (6-digit Code)
  const [step, setStep] = useState<'identifier' | 'otp'>('identifier');
  const [identifier, setIdentifier] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [targetDisplay, setTargetDisplay] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState<number>(0);

  const [logoutNotice] = useState<{ reason: string; message: string } | null>(() => {
    try {
      const raw = sessionStorage.getItem('logicq_logout_notice');
      if (raw) {
        sessionStorage.removeItem('logicq_logout_notice');
        return JSON.parse(raw);
      }
    } catch {
      // ignore
    }
    return null;
  });

  const fromLocation = (location.state as any)?.from;
  const from = fromLocation
    ? `${fromLocation.pathname || '/'}${fromLocation.search || ''}${fromLocation.hash || ''}`
    : '/dashboard';

  // Cooldown timer
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
    if (!identifier.trim()) {
      setError('Please enter your enrolled institutional email address.');
      return;
    }

    setError(null);
    setInfoMessage(null);
    setLoading(true);

    try {
      const res = await sendLoginOtp(identifier.trim());
      if (res?.success) {
        setTargetDisplay(res.target || identifier.trim());
        setOtpCode('');
        setStep('otp');
        setCooldown(res.cooldownRemaining || 60);
        setInfoMessage(res.message || 'A 6-digit verification code has been sent to your email.');

        toast.success('Verification code dispatched', {
          description: `Please check ${res.target || identifier.trim()} for your 6-digit OTP.`,
        });
      } else {
        setError(res?.message || 'Failed to dispatch verification code.');
      }
    } catch (err: any) {
      setError(err?.message || 'You are not registered yet on LogicQ. Contact your course instructor or administrator for credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickLogin = async (demoEmail: string) => {
    setIdentifier(demoEmail);
    setError(null);
    setLoading(true);
    try {
      // Direct login with master OTP 123456
      await loginWithOtp(demoEmail, '123456');
      toast.success(`Identity verified! Logged in as ${demoEmail}`);
      navigate(from, { replace: true });
    } catch (err: any) {
      try {
        const res = await sendLoginOtp(demoEmail);
        setTargetDisplay(res?.target || demoEmail);
        setOtpCode('123456');
        setStep('otp');
        setInfoMessage(`Verification code sent to ${demoEmail}. Click "Verify OTP & Enter Arena" to proceed.`);
      } catch (e: any) {
        setError(e?.message || 'Failed to authenticate account');
      }
    } finally {
      setLoading(false);
    }
  };

  // Step 2: Verify OTP & Sign In
  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otpCode.trim() || otpCode.trim().length < 6) {
      setError('Please enter the complete 6-digit OTP code.');
      return;
    }

    setError(null);
    setLoading(true);

    try {
      await loginWithOtp(identifier.trim(), otpCode.trim());
      toast.success('Identity verified! Welcome to LogicQ.');
      navigate(from, { replace: true });
    } catch (err: any) {
      setError(err?.message || 'Invalid or expired OTP code. Please request a new code.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        {/* Brand Header */}
        <div className="text-center mb-8">
          <div className="inline-block mb-3">
            <Logo size="lg" />
          </div>
          <h2 className="text-2xl font-extrabold text-[var(--text-main)]">
            Institutional Sign In
          </h2>
          <p className="text-xs text-[var(--text-muted)] mt-1 font-mono">
            {step === 'identifier'
              ? 'Passwordless Email OTP verification for enrolled students & faculty'
              : `Enter the 6-digit code sent to ${targetDisplay}`}
          </p>
        </div>

        {/* Card */}
        <div className="glass-card p-6 sm:p-8 rounded-2xl border border-[var(--border-line)] bg-[var(--bg-panel)] shadow-xl relative overflow-hidden">
          {/* Top Institutional Badge */}
          <div className="mb-5 flex items-center justify-between pb-3 border-b border-[var(--border-line)] text-xs font-mono">
            <div className="flex items-center gap-1.5 text-cyan-600 dark:text-cyan-400 font-semibold">
              <ShieldCheck className="w-4 h-4" />
              <span>Institutional Email OTP Verification</span>
            </div>
            <span className="text-[10px] px-2 py-0.5 rounded bg-[var(--bg-surface)] text-[var(--text-muted)] border border-[var(--border-line)]">
              Authorized Roster Only
            </span>
          </div>

          {/* Session Logout Notice */}
          {logoutNotice && (
            <div className="mb-5 flex items-start gap-2.5 p-3.5 rounded-xl bg-amber-500/15 border border-amber-500/40 text-xs shadow-sm">
              <Info className="w-4 h-4 shrink-0 text-amber-500 mt-0.5" />
              <div>
                <p className="font-bold text-amber-600 dark:text-amber-300 font-mono tracking-wide">Session Notice</p>
                <p className="text-[var(--text-main)] mt-1 font-sans font-medium leading-relaxed">{logoutNotice.message}</p>
              </div>
            </div>
          )}

          {/* Error Banner */}
          {error && (
            <div className="mb-5 flex items-start gap-2.5 p-3.5 rounded-xl bg-red-500/10 border border-red-500/30 text-xs text-red-600 dark:text-red-300 font-medium shadow-sm animate-shake">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-500" />
              <div className="leading-relaxed">{error}</div>
            </div>
          )}

          {/* Info Banner */}
          {infoMessage && (
            <div className="mb-5 flex items-start gap-2.5 p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-xs text-emerald-600 dark:text-emerald-300 font-medium shadow-sm">
              <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-emerald-500" />
              <div className="leading-relaxed">{infoMessage}</div>
            </div>
          )}

          {/* STEP 1: Enter Identifier */}
          {step === 'identifier' && (
            <form onSubmit={handleSendOtp} className="space-y-4">
              <div>
                <label className="block text-xs font-mono text-[var(--text-main)] mb-1.5 font-bold tracking-wider">
                  REGISTERED INSTITUTIONAL EMAIL
                </label>
                <div className="relative">
                  <input
                    type="text"
                    required
                    autoFocus
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                    placeholder="student@sanjivani.org.in or your.email@gmail.com"
                    className="w-full pl-9 pr-3 py-3 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-line)] text-sm text-[var(--text-main)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[var(--color-accent)] focus:ring-1 focus:ring-[var(--color-accent)] font-mono transition-colors"
                  />
                  <Mail className="w-4 h-4 text-[var(--text-muted)] absolute left-3 top-3.5" />
                </div>
                <p className="text-[11px] text-[var(--text-muted)] mt-1.5 leading-relaxed font-mono">
                  Enter the registered email address enrolled in your official course section.
                </p>
              </div>

              <button
                type="submit"
                disabled={loading || !identifier.trim()}
                className="w-full py-3 px-4 rounded-xl font-mono text-xs font-bold text-[#0C0F1F] bg-gradient-to-r from-cyan-400 to-emerald-400 hover:from-cyan-300 hover:to-emerald-300 shadow-md shadow-cyan-500/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50 mt-2 cursor-pointer"
              >
                <span>{loading ? 'Verifying Roster Enrollment...' : 'Send 6-Digit OTP'}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>
          )}

          {/* STEP 2: Enter OTP */}
          {step === 'otp' && (
            <form onSubmit={handleVerifyOtp} className="space-y-5 animate-fadeIn">


              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-mono text-[var(--text-main)] font-bold tracking-wider">
                    ENTER 6-DIGIT VERIFICATION CODE
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      setStep('identifier');
                      setOtpCode('');
                      setError(null);
                    }}
                    className="text-[11px] font-mono text-cyan-600 dark:text-cyan-400 hover:underline"
                  >
                    Change Contact
                  </button>
                </div>

                <div className="relative">
                  <input
                    type="text"
                    required
                    autoFocus
                    maxLength={6}
                    value={otpCode}
                    onChange={(e) => setOtpCode(e.target.value.replace(/[^0-9]/g, ''))}
                    placeholder="••••••"
                    className="w-full pl-9 pr-3 py-3 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-line)] text-xl text-[var(--text-main)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[var(--color-accent)] focus:ring-1 focus:ring-[var(--color-accent)] font-mono text-center tracking-[0.5em] font-bold transition-colors"
                  />
                  <KeyRound className="w-4 h-4 text-[var(--text-muted)] absolute left-3 top-3.5" />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading || otpCode.trim().length !== 6}
                className="w-full py-3 px-4 rounded-xl font-mono text-xs font-bold text-[#0C0F1F] bg-gradient-to-r from-cyan-400 to-emerald-400 hover:from-cyan-300 hover:to-emerald-300 shadow-md shadow-cyan-500/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
              >
                <span>{loading ? 'Authenticating Session...' : 'Verify OTP & Enter Arena'}</span>
                <ArrowRight className="w-4 h-4" />
              </button>

              {/* Resend Timer */}
              <div className="flex items-center justify-between pt-2 border-t border-[var(--border-line)] text-xs font-mono">
                {cooldown > 0 ? (
                  <div className="flex items-center gap-1.5 text-[var(--text-muted)]">
                    <Clock className="w-3.5 h-3.5" />
                    <span>Resend available in {cooldown}s</span>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => handleSendOtp()}
                    disabled={loading}
                    className="flex items-center gap-1.5 text-cyan-600 dark:text-cyan-400 hover:underline font-bold"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>Resend 6-Digit OTP</span>
                  </button>
                )}

                <span className="text-[11px] text-[var(--text-muted)]">
                  Code expires in 10 mins
                </span>
              </div>
            </form>
          )}

        </div>

        {/* Collapsible Walkthrough / Demo Testing Roles */}
        <details className="mt-4 text-center group">
          <summary className="inline-flex items-center gap-1.5 text-[11px] font-mono text-[var(--text-muted)] hover:text-[var(--text-main)] cursor-pointer select-none transition-colors py-1.5 px-3 rounded-lg hover:bg-[var(--bg-panel)] border border-transparent hover:border-[var(--border-line)]">
            <span>⚡ Demo & Testing Roles (Walkthrough Access)</span>
            <ChevronDown className="w-3.5 h-3.5 transition-transform group-open:rotate-180" />
          </summary>
          <div className="mt-3 p-4 rounded-xl border border-[var(--border-line)] bg-[var(--bg-panel)] text-left shadow-lg">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-mono font-bold text-[var(--text-main)]">
                Instant Test Sign In
              </span>
              <span className="text-[10px] font-mono text-cyan-500 font-semibold px-2 py-0.5 rounded bg-cyan-500/10 border border-cyan-500/20">
                OTP: 123456
              </span>
            </div>
            <p className="text-[11px] text-[var(--text-muted)] font-mono mb-3">
              One-click instant sign in to test each role without waiting for email dispatch:
            </p>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => handleQuickLogin('logicqarena@gmail.com')}
                disabled={loading}
                className="p-2.5 rounded-xl border border-purple-500/30 bg-purple-500/10 hover:bg-purple-500/20 text-left transition-all disabled:opacity-50 cursor-pointer"
              >
                <div className="text-xs font-bold text-purple-400 flex items-center gap-1">
                  👑 Admin
                </div>
                <div className="text-[10px] text-[var(--text-muted)] font-mono truncate mt-0.5">
                  logicqarena@gmail.com
                </div>
              </button>

              <button
                type="button"
                onClick={() => handleQuickLogin('faculty@logicq.io')}
                disabled={loading}
                className="p-2.5 rounded-xl border border-cyan-500/30 bg-cyan-500/10 hover:bg-cyan-500/20 text-left transition-all disabled:opacity-50 cursor-pointer"
              >
                <div className="text-xs font-bold text-cyan-400 flex items-center gap-1">
                  👨‍🏫 Faculty
                </div>
                <div className="text-[10px] text-[var(--text-muted)] font-mono truncate mt-0.5">
                  faculty@logicq.io
                </div>
              </button>

              <button
                type="button"
                onClick={() => handleQuickLogin('student@logicq.io')}
                disabled={loading}
                className="p-2.5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 hover:bg-emerald-500/20 text-left transition-all disabled:opacity-50 cursor-pointer"
              >
                <div className="text-xs font-bold text-emerald-400 flex items-center gap-1">
                  🎓 Student
                </div>
                <div className="text-[10px] text-[var(--text-muted)] font-mono truncate mt-0.5">
                  student@logicq.io
                </div>
              </button>
            </div>
          </div>
        </details>

        {/* Closed Registration Advisory Note */}
        <div className="glass-card mt-6 p-4 rounded-xl border border-[var(--border-line)] bg-[var(--bg-panel)] text-center text-xs text-[var(--text-muted)] leading-relaxed font-mono">
          <p className="font-semibold text-[var(--text-main)] mb-1">
            🔒 Institutional Cohort Policy
          </p>
          <p>
            Public self-registration is closed. Student accounts are enrolled directly into academic sections by course faculty mentors.
          </p>
        </div>
      </div>
    </div>
  );
};
export default LoginPage;
