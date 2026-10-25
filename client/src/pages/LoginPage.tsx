import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.js';
import { Logo } from '../components/common/Logo.js';
import { toast } from 'sonner';
import {
  Mail,
  ArrowRight,
  AlertCircle,
  CheckCircle2,
  Clock,
  KeyRound,
  RefreshCw,
} from 'lucide-react';

export const LoginPage: React.FC = () => {
  const { sendLoginOtp, loginWithOtp, loginWithGoogle } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Step 1: 'identifier' (Email) -> Step 2: 'otp' (6-digit Code)
  const [step, setStep] = useState<'identifier' | 'otp'>('identifier');
  const [identifier, setIdentifier] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [targetDisplay, setTargetDisplay] = useState('');

  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState<number>(0);

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

  // Google 1-Click Login
  const handleGoogleLogin = async () => {
    setError(null);
    setGoogleLoading(true);
    try {
      await loginWithGoogle();
      toast.success('Signed in successfully!');
      navigate(from, { replace: true });
    } catch (err: any) {
      setError(err?.message || 'Google sign-in was cancelled or failed. You can sign in with Email OTP below.');
    } finally {
      setGoogleLoading(false);
    }
  };

  // Step 1: Dispatch OTP
  const handleSendOtp = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const cleanId = identifier.trim();
    if (!cleanId) {
      setError('Please enter your email address.');
      return;
    }

    setError(null);
    setInfoMessage(null);
    setLoading(true);

    try {
      const res = await sendLoginOtp(cleanId);
      if (res?.success) {
        setTargetDisplay(res.target || cleanId);
        setOtpCode('');
        setStep('otp');
        setCooldown(res.cooldownRemaining || 60);
        setInfoMessage(res.message || `A 6-digit OTP has been sent to ${res.target || cleanId}.`);

        toast.success('OTP sent successfully', {
          description: `Check your inbox at ${res.target || cleanId}`,
        });
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
      toast.success('Signed in successfully! Welcome to LogicQ.');
      navigate(from, { replace: true });
    } catch (err: any) {
      setError(err?.message || 'Invalid or expired OTP code. Please request a new one.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = (e: React.FormEvent) => {
    e.preventDefault();
    verifyCode(otpCode.trim());
  };

  const handleOtpInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace(/[^0-9]/g, '').slice(0, 6);
    setOtpCode(val);
    if (val.length === 6) {
      verifyCode(val);
    }
  };

  return (
    <div className="min-h-[85vh] flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-md">
        {/* Clean Brand Header */}
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
              : `Enter the code sent to ${targetDisplay}`}
          </p>
        </div>

        {/* Main Clean Card */}
        <div className="glass-card p-6 sm:p-7 rounded-2xl border border-[var(--border-line)] bg-[var(--bg-panel)] shadow-xl relative">
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

          {/* STEP 1: Email Form + Google 1-Click */}
          {step === 'identifier' && (
            <div className="space-y-4">
              {/* 1-Click Google Sign In */}
              <button
                type="button"
                onClick={handleGoogleLogin}
                disabled={googleLoading || loading}
                className="w-full py-2.5 px-4 rounded-xl border border-[var(--border-line)] bg-[var(--bg-surface)] hover:bg-[var(--bg-panel)] text-[var(--text-main)] text-sm font-semibold transition-all flex items-center justify-center gap-2.5 shadow-sm hover:border-indigo-500/40 cursor-pointer disabled:opacity-60"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                  />
                </svg>
                <span>{googleLoading ? 'Signing in with Google...' : 'Continue with Google'}</span>
              </button>

              {/* Minimal Divider */}
              <div className="relative my-4">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-[var(--border-line)]" />
                </div>
                <div className="relative flex justify-center text-[11px]">
                  <span className="px-2.5 bg-[var(--bg-panel)] text-[var(--text-muted)] font-mono uppercase tracking-wider">
                    or with email OTP
                  </span>
                </div>
              </div>

              {/* Email Form */}
              <form onSubmit={handleSendOtp} className="space-y-3.5">
                <div>
                  <label className="block text-xs font-semibold text-[var(--text-main)] mb-1.5">
                    Email Address
                  </label>
                  <div className="relative">
                    <input
                      type="email"
                      required
                      autoFocus
                      value={identifier}
                      onChange={(e) => setIdentifier(e.target.value)}
                      placeholder="e.g. name@sanjivani.edu.in or your.email@gmail.com"
                      className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-line)] text-sm text-[var(--text-main)] placeholder-[var(--text-muted)] focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors"
                    />
                    <Mail className="w-4 h-4 text-[var(--text-muted)] absolute left-3 top-3" />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading || !identifier.trim()}
                  className="w-full py-2.5 px-4 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 shadow-md shadow-indigo-600/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
                >
                  <span>{loading ? 'Sending Verification Code...' : 'Send OTP Code'}</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </form>
            </div>
          )}

          {/* STEP 2: Enter 6-digit OTP */}
          {step === 'otp' && (
            <form onSubmit={handleVerifyOtp} className="space-y-4 animate-fadeIn">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-xs font-semibold text-[var(--text-main)]">
                    Enter 6-Digit OTP Code
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      setStep('identifier');
                      setOtpCode('');
                      setError(null);
                      setInfoMessage(null);
                    }}
                    className="text-xs text-indigo-500 hover:underline font-medium"
                  >
                    Change Email
                  </button>
                </div>

                <div className="relative">
                  <input
                    type="text"
                    required
                    autoFocus
                    maxLength={6}
                    value={otpCode}
                    onChange={handleOtpInput}
                    placeholder="••••••"
                    className="w-full pl-9 pr-3 py-3 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-line)] text-2xl text-[var(--text-main)] placeholder-[var(--text-muted)] focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 font-mono text-center tracking-[0.5em] font-bold transition-colors"
                  />
                  <KeyRound className="w-4 h-4 text-[var(--text-muted)] absolute left-3 top-4" />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading || otpCode.trim().length !== 6}
                className="w-full py-2.5 px-4 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 shadow-md shadow-indigo-600/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
              >
                <span>{loading ? 'Verifying OTP...' : 'Verify OTP & Enter'}</span>
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
                    className="flex items-center gap-1.5 text-indigo-500 hover:underline font-semibold cursor-pointer"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>Resend OTP</span>
                  </button>
                )}
                <span>Expires in 10 mins</span>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
