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
  Lock,
  Eye,
  EyeOff,
  GraduationCap,
  ShieldCheck,
  KeyRound,
} from 'lucide-react';

export const LoginPage: React.FC = () => {
  const { login, sendLoginOtp, loginWithOtp } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Mode: 'prn' (Direct Student PRN Login) | 'otp' (Institutional Email OTP)
  const [authMode, setAuthMode] = useState<'prn' | 'otp'>('prn');

  // Student PRN Credentials
  const [prn, setPrn] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [prnFocused, setPrnFocused] = useState(false);
  const [passwordFocused, setPasswordFocused] = useState(false);
  const [hasPasswordInteracted, setHasPasswordInteracted] = useState(false);
  const passwordInputRef = useRef<HTMLInputElement>(null);
  // Nonce changes on every load to defeat aggressive browser password managers (Firefox Lockwise & Chrome)
  const [fieldNonce] = useState(() => Math.random().toString(36).substring(2, 9));

  // Email OTP Credentials
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

  // Prevent browser autofill or automatic typing in password when PRN changes
  useEffect(() => {
    if (!hasPasswordInteracted) {
      setPassword('');
      if (passwordInputRef.current) {
        passwordInputRef.current.value = '';
      }
      const timer = setTimeout(() => {
        if (!hasPasswordInteracted) {
          setPassword('');
          if (passwordInputRef.current) {
            passwordInputRef.current.value = '';
          }
        }
      }, 60);
      return () => clearTimeout(timer);
    }
  }, [prn, hasPasswordInteracted]);

  // Student Direct PRN Login Handler
  const handlePrnLogin = async (e?: React.FormEvent | React.KeyboardEvent) => {
    if (e && 'preventDefault' in e) e.preventDefault();
    const rawPrn = prn.trim();
    const cleanPrn = rawPrn.toLowerCase() === 'dummy' ? 'dummy' : rawPrn.toUpperCase();
    const cleanPwd = password.trim();

    if (!cleanPrn) {
      setError('Please enter your Institutional PRN.');
      return;
    }

    if (!cleanPwd) {
      setError('Please enter your password.');
      return;
    }

    setError(null);
    setInfoMessage(null);
    setLoading(true);

    try {
      const user = await login(cleanPrn, cleanPwd);
      setIsVerifiedSuccess(true);
      try {
        confetti({
          particleCount: 50,
          spread: 60,
          origin: { y: 0.6 },
          colors: ['#10b981', '#06b6d4', '#6366f1'],
        });
      } catch {}
      toast.success(`Welcome back, ${user.displayName || user.fullName || 'Student'}!`);
      setTimeout(() => {
        navigate(from, { replace: true });
      }, 1000);
    } catch (err: any) {
      setError(
        err?.message ||
          'Failed to sign in. Please verify your PRN and password.'
      );
    } finally {
      setLoading(false);
    }
  };

  // Step 1: Dispatch OTP
  const handleSendOtp = async (eOrEmail?: React.FormEvent | string) => {
    let cleanId = identifier.trim();
    if (typeof eOrEmail === 'string') {
      cleanId = eOrEmail.trim();
      setIdentifier(cleanId);
    } else if (eOrEmail && typeof eOrEmail === 'object' && 'preventDefault' in eOrEmail) {
      eOrEmail.preventDefault();
    }
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
          <div className="inline-flex items-center justify-center mb-3">
            <div className="relative flex items-center justify-center rounded-2xl bg-[var(--bg-surface)] border border-[var(--border-line)] p-2.5 shadow-sm transition-colors duration-200">
              <svg viewBox="0 0 100 100" className="w-10 h-10" fill="none" aria-hidden="true">
                <defs>
                  <linearGradient id="loginLogoGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#8B9BFF" />
                    <stop offset="100%" stopColor="#46D9A0" />
                  </linearGradient>
                </defs>
                <circle
                  cx="48"
                  cy="44"
                  r="28"
                  stroke="url(#loginLogoGrad)"
                  strokeWidth="9"
                  strokeLinecap="round"
                />
                <path
                  d="M 38 38 L 47 44 L 38 50"
                  stroke="#8B9BFF"
                  strokeWidth="4.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <line
                  x1="51"
                  y1="50"
                  x2="59"
                  y2="50"
                  stroke="#46D9A0"
                  strokeWidth="4.5"
                  strokeLinecap="round"
                />
                <path
                  d="M 64 60 L 80 76 M 73 76 L 80 76 L 80 69"
                  stroke="url(#loginLogoGrad)"
                  strokeWidth="8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
          </div>
          <h2 className="text-2xl font-extrabold text-[var(--text-main)] tracking-tight">
            Sign In to LogicQ
          </h2>
          <p className="text-xs text-[var(--text-muted)] mt-1.5 font-medium">
            {authMode === 'prn'
              ? 'Integrated M.Tech (FY) • Section LQ-C31A'
              : step === 'identifier'
              ? 'Enter your institutional email to receive a 6-digit OTP'
              : `Enter the 6-digit code sent to ${targetDisplay}`}
          </p>
        </div>

        {/* Main Card */}
        <div className="glass-card p-6 sm:p-8 rounded-3xl border border-[var(--border-line)] bg-[var(--bg-panel)] shadow-2xl relative overflow-hidden">
          {/* Ambient Card Glow */}
          <div className="absolute -top-20 -right-20 w-44 h-44 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none" />

          {/* Success / Verified Screen State */}
          {isVerifiedSuccess ? (
            <div className="py-4 text-center space-y-5 animate-in zoom-in-95 fade-in duration-300">
              <div className="relative inline-flex items-center justify-center">
                <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-emerald-500/20 flex items-center justify-center border-2 border-emerald-500/40 shadow-lg shadow-emerald-500/25 animate-pulse">
                  <div className="w-11 h-11 sm:w-13 sm:h-13 rounded-full bg-emerald-500 text-white flex items-center justify-center shadow-md">
                    <Check className="w-6 h-6 stroke-[3.5]" />
                  </div>
                </div>
              </div>

              <div className="space-y-1">
                <h3 className="text-xl sm:text-2xl font-extrabold text-[var(--text-main)] tracking-tight">
                  Welcome to LogicQ
                </h3>
                <p className="text-xs text-[var(--text-muted)] font-medium">
                  Authentication successful. Preparing your workspace...
                </p>
              </div>

              <button
                type="button"
                onClick={() => navigate(from, { replace: true })}
                className="w-full py-3.5 px-6 rounded-2xl font-mono text-xs sm:text-sm font-bold text-white bg-gradient-to-r from-emerald-600 via-emerald-500 to-teal-500 hover:from-emerald-500 hover:to-teal-400 shadow-xl shadow-emerald-500/25 flex items-center justify-center gap-2 transition-all transform hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
              >
                <span>Continue to Dashboard</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <>
              {/* Login Mode Tab Switcher */}
              <div className="flex p-1 mb-5 rounded-2xl bg-[var(--bg-surface)] border border-[var(--border-line)]">
                <button
                  type="button"
                  onClick={() => {
                    setAuthMode('prn');
                    setError(null);
                    setInfoMessage(null);
                  }}
                  className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                    authMode === 'prn'
                      ? 'bg-[var(--bg-panel)] text-emerald-600 dark:text-emerald-400 shadow-sm border border-[var(--border-line)]'
                      : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'
                  }`}
                >
                  <GraduationCap className="w-3.5 h-3.5" />
                  <span>Student (PRN)</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setAuthMode('otp');
                    setError(null);
                    setInfoMessage(null);
                  }}
                  className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                    authMode === 'otp'
                      ? 'bg-[var(--bg-panel)] text-emerald-600 dark:text-emerald-400 shadow-sm border border-[var(--border-line)]'
                      : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'
                  }`}
                >
                  <Mail className="w-3.5 h-3.5" />
                  <span>Faculty / OTP</span>
                </button>
              </div>

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

              {/* TAB 1: Student PRN Sign In */}
              {authMode === 'prn' && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-[var(--text-main)] mb-1.5">
                      Institutional PRN
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        name={`st_prn_${fieldNonce}`}
                        id={`st_prn_${fieldNonce}`}
                        autoComplete="off"
                        data-lpignore="true"
                        data-form-type="other"
                        spellCheck={false}
                        required
                        readOnly={!prnFocused}
                        onFocus={() => setPrnFocused(true)}
                        onBlur={() => {
                          if (!prn) setPrnFocused(false);
                        }}
                        value={prn}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handlePrnLogin(e);
                        }}
                        onChange={(e) => {
                          setPrn(e.target.value);
                          setHasPasswordInteracted(false);
                          setPasswordFocused(false);
                          setPassword('');
                          if (passwordInputRef.current) {
                            passwordInputRef.current.value = '';
                          }
                        }}
                        placeholder="e.g. 2126PMIF1057"
                        className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-line)] font-mono text-sm text-[var(--text-main)] placeholder-[var(--text-muted)] focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-colors"
                      />
                      <KeyRound className="w-4 h-4 text-[var(--text-muted)] absolute left-3 top-3" />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-[var(--text-main)] mb-1.5">
                      Password
                    </label>
                    <div className="relative">
                      <input
                        ref={passwordInputRef}
                        type={showPassword ? 'text' : passwordFocused ? 'password' : 'text'}
                        name={`st_pwd_${fieldNonce}`}
                        id={`st_pwd_${fieldNonce}`}
                        autoComplete="off"
                        data-lpignore="true"
                        data-form-type="other"
                        spellCheck={false}
                        required
                        readOnly={!passwordFocused}
                        value={password}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handlePrnLogin(e);
                        }}
                        onFocus={() => {
                          setPasswordFocused(true);
                          setHasPasswordInteracted(true);
                        }}
                        onBlur={() => {
                          if (!password) setPasswordFocused(false);
                        }}
                        onChange={(e) => {
                          setHasPasswordInteracted(true);
                          setPassword(e.target.value);
                        }}
                        style={
                          !showPassword
                            ? ({
                                WebkitTextSecurity: 'disc',
                              } as React.CSSProperties)
                            : undefined
                        }
                        placeholder="Enter your password"
                        className="w-full pl-9 pr-10 py-2.5 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-line)] text-sm text-[var(--text-main)] placeholder-[var(--text-muted)] focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-colors"
                      />
                      <Lock className="w-4 h-4 text-[var(--text-muted)] absolute left-3 top-3" />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-2.5 text-[var(--text-muted)] hover:text-[var(--text-main)] transition-colors cursor-pointer"
                        tabIndex={-1}
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  {/* Security Policy Badge */}
                  <div className="p-2.5 rounded-xl bg-blue-500/10 border border-blue-500/20 text-[11px] text-blue-600 dark:text-blue-300 flex items-start gap-2">
                    <ShieldCheck className="w-4 h-4 shrink-0 mt-0.5 text-blue-500" />
                    <span className="leading-tight">
                      <strong>Single-Instance Active Lock:</strong> Only 1 active login session permitted at any time. Limit max 2 authorized devices per student.
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() => handlePrnLogin()}
                    disabled={loading || !prn.trim()}
                    className="w-full py-2.5 px-4 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 shadow-md shadow-emerald-600/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
                  >
                    <span>{loading ? 'Authenticating...' : 'Sign In as Student'}</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              )}

              {/* TAB 2: Email OTP Form */}
              {authMode === 'otp' && (
                <>
                  {step === 'identifier' && (
                    <form onSubmit={handleSendOtp} className="space-y-4">
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
                            placeholder="e.g. rohitsharma@gmail.com"
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

                  {/* Step 2: 6-Digit OTP */}
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

                        {/* 6 Individual Digit Inputs */}
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
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
