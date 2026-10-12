import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.js';
import { Logo } from '../components/common/Logo.js';
import {
  ALLOWED_COLLEGES,
  ALLOWED_DEPARTMENTS,
  ALLOWED_YEARS,
  PRN_REGEX,
  PRN_ERROR_MESSAGE,
  isValidPrn,
  normalizePrn,
  DIVISION_REGEX,
} from '../config/academic.config.js';
import {
  Hash,
  Mail,
  KeyRound,
  Building2,
  GraduationCap,
  Calendar,
  Layers,
  ArrowRight,
  AlertCircle,
  User,
} from 'lucide-react';

interface FieldErrors {
  fullName?: string;
  prn?: string;
  college?: string;
  department?: string;
  year?: string;
  division?: string;
  email?: string;
  password?: string;
  confirmPassword?: string;
}

export const RegisterPage: React.FC = () => {
  const { register, loginWithGoogle } = useAuth();
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    fullName: '',
    prn: '',
    college: (ALLOWED_COLLEGES[0] || 'Sanjivani University') as string,
    department: '',
    year: '',
    division: '',
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  const trimmedPrn = normalizePrn(formData.prn);
  const prnLength = trimmedPrn.length;

  const validateClientSide = (): boolean => {
    const nextErrors: FieldErrors = {};

    const trimmedFullName = formData.fullName.trim();
    if (!trimmedFullName || trimmedFullName.length < 2) {
      nextErrors.fullName = 'Please enter your full name (at least 2 characters).';
    } else if (trimmedFullName.length > 50) {
      nextErrors.fullName = 'Full name cannot exceed 50 characters.';
    }

    if (!trimmedPrn || !isValidPrn(trimmedPrn)) {
      nextErrors.prn = PRN_ERROR_MESSAGE;
    }
    if (!formData.college || !ALLOWED_COLLEGES.includes(formData.college as any)) {
      nextErrors.college = 'Please select your college.';
    }
    if (!formData.department || !ALLOWED_DEPARTMENTS.includes(formData.department as any)) {
      nextErrors.department = 'Please select your department.';
    }
    if (!formData.year || !ALLOWED_YEARS.includes(formData.year as any)) {
      nextErrors.year = 'Please select your academic year.';
    }
    const trimmedDiv = formData.division.trim().toUpperCase();
    if (trimmedDiv && !DIVISION_REGEX.test(trimmedDiv)) {
      nextErrors.division = 'Division must be up to 3 letters or digits (e.g., A, B, C1).';
    }
    const trimmedEmail = formData.email.trim();
    if (!trimmedEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      nextErrors.email = 'Please enter a valid college email address.';
    }
    if (!formData.password || formData.password.length < 8) {
      nextErrors.password = 'Password must be at least 8 characters long.';
    }
    if (formData.password !== formData.confirmPassword) {
      nextErrors.confirmPassword = 'Passwords do not match.';
    }

    setFieldErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleGoogleSignIn = async () => {
    setError(null);
    setGoogleLoading(true);
    try {
      const signedInUser = await loginWithGoogle();
      if (!signedInUser.profileComplete) {
        navigate('/complete-profile');
      } else {
        navigate('/dashboard');
      }
    } catch (err: any) {
      setError(err.message || 'Google sign-up was cancelled or failed');
    } finally {
      setGoogleLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!validateClientSide()) {
      return;
    }

    setLoading(true);
    try {
      const trimmedFullName = formData.fullName.trim();
      await register({
        fullName: trimmedFullName,
        displayName: trimmedFullName,
        prn: trimmedPrn,
        college: formData.college,
        department: formData.department,
        year: formData.year,
        division: formData.division.trim().toUpperCase() || undefined,
        email: formData.email.trim().toLowerCase(),
        password: formData.password,
        confirmPassword: formData.confirmPassword,
      });
      navigate('/dashboard');
    } catch (err: any) {
      const msg = err.message || 'Registration failed';
      setError(msg);
      if (msg.toLowerCase().includes('prn')) {
        setFieldErrors((prev) => ({ ...prev, prn: msg }));
      } else if (msg.toLowerCase().includes('email')) {
        setFieldErrors((prev) => ({ ...prev, email: msg }));
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[85vh] flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-lg">
        <div className="text-center mb-6">
          <div className="inline-block mb-3">
            <Logo size="lg" />
          </div>
          <h1 className="text-2xl font-extrabold text-[#E8EAF6]">Join LogicQ</h1>
          <p className="text-sm text-[#9AA1C4] mt-1 font-mono">
            Register with your Sanjivani University PRN to start your C streak
          </p>
        </div>

        <div className="glass-card p-5 sm:p-8 rounded-2xl border border-[#252C4F] bg-[#141932] shadow-2xl">
          {error && (
            <div
              role="alert"
              className="mb-5 flex items-center gap-2 p-3 rounded-lg bg-[#FF7A8A]/10 border border-[#FF7A8A]/40 text-[#FF7A8A] text-sm"
            >
              <AlertCircle className="w-4 h-4 shrink-0 text-[#FF7A8A]" />
              <span>{error}</span>
            </div>
          )}

          {/* Primary Google Sign-In */}
          <button
            type="button"
            onClick={handleGoogleSignIn}
            disabled={googleLoading || loading}
            className="w-full py-2.5 px-4 rounded-xl border border-[var(--border-line)] bg-[var(--bg-surface)] hover:bg-[var(--bg-surface-hover)] text-[var(--text-main)] font-semibold text-sm font-mono flex items-center justify-center gap-3 shadow-sm transition-colors mb-5"
          >
            <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" aria-hidden="true">
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
            <span className="text-[var(--text-main)]">
              {googleLoading ? 'Connecting Google Account...' : 'Sign up with Google'}
            </span>
          </button>

          <div className="relative my-4">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-[#252C4F]"></div>
            </div>
            <div className="relative flex justify-center text-xs uppercase font-mono">
              <span className="bg-[#141932] px-3 text-[#9AA1C4]">Or register with college PRN</span>
            </div>
          </div>

          <form onSubmit={handleSubmit} noValidate className="space-y-4">
            {/* 1. PRN (required) */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label
                  htmlFor="prn-input"
                  className="block text-sm font-mono text-[#E8EAF6] font-medium"
                >
                  1. PRN <span className="text-[#FF7A8A]">*</span>
                </label>
                <span
                  data-testid="prn-counter"
                  className={`text-xs font-mono font-semibold ${
                    prnLength === 12 ? 'text-[#46D9A0]' : 'text-[#9AA1C4]'
                  }`}
                >
                  {prnLength}/12
                </span>
              </div>
              <div className="relative">
                <input
                  id="prn-input"
                  name="prn"
                  type="text"
                  autoCapitalize="characters"
                  autoCorrect="off"
                  spellCheck={false}
                  maxLength={12}
                  required
                  aria-invalid={Boolean(fieldErrors.prn)}
                  aria-describedby={fieldErrors.prn ? 'prn-error' : 'prn-hint'}
                  value={formData.prn}
                  onChange={(e) => {
                    const val = e.target.value.replace(/[^a-zA-Z0-9]/g, '').toUpperCase().slice(0, 12);
                    setFormData({ ...formData, prn: val });
                    if (fieldErrors.prn) setFieldErrors({ ...fieldErrors, prn: undefined });
                  }}
                  onPaste={(e) => {
                    e.preventDefault();
                    const pasted = e.clipboardData.getData('text');
                    const val = pasted.trim().replace(/[^a-zA-Z0-9]/g, '').toUpperCase().slice(0, 12);
                    setFormData({ ...formData, prn: val });
                    if (fieldErrors.prn) setFieldErrors({ ...fieldErrors, prn: undefined });
                  }}
                  onBlur={() => setFormData((prev) => ({ ...prev, prn: normalizePrn(prev.prn) }))}
                  placeholder="2199TESM0001"
                  className="w-full pl-9 pr-3 py-2.5 rounded-lg bg-[#0C0F1F] border border-[#252C4F] text-sm text-[#E8EAF6] placeholder-[#9AA1C4] focus:outline-none focus:border-[#8B9BFF] font-mono tracking-wider"
                />
                <Hash className="w-4 h-4 text-[#9AA1C4] absolute left-3 top-3" />
              </div>
              {fieldErrors.prn ? (
                <p id="prn-error" role="alert" className="text-xs text-[#FF7A8A] mt-1 font-mono">
                  {fieldErrors.prn}
                </p>
              ) : (
                <p id="prn-hint" className="text-xs text-[#9AA1C4] mt-1">
                  12 characters (4 digits, 3 letters, M or F, 4 digits). Kept private and never shown to other students.
                </p>
              )}
            </div>

            {/* 2. Full Name (required) */}
            <div>
              <label
                htmlFor="fullname-input"
                className="block text-sm font-mono text-[#E8EAF6] mb-1.5 font-medium"
              >
                2. STUDENT FULL NAME <span className="text-[#FF7A8A]">*</span>
              </label>
              <div className="relative">
                <input
                  id="fullname-input"
                  name="fullName"
                  type="text"
                  autoComplete="name"
                  required
                  aria-invalid={Boolean(fieldErrors.fullName)}
                  aria-describedby={fieldErrors.fullName ? 'fullname-error' : undefined}
                  value={formData.fullName}
                  onChange={(e) => {
                    setFormData({ ...formData, fullName: e.target.value });
                    if (fieldErrors.fullName) setFieldErrors({ ...fieldErrors, fullName: undefined });
                  }}
                  placeholder="e.g. Rohan Sharma"
                  className="w-full pl-9 pr-3 py-2.5 rounded-lg bg-[#0C0F1F] border border-[#252C4F] text-sm text-[#E8EAF6] placeholder-[#9AA1C4] focus:outline-none focus:border-[#8B9BFF]"
                />
                <User className="w-4 h-4 text-[#9AA1C4] absolute left-3 top-3 pointer-events-none" />
              </div>
              {fieldErrors.fullName && (
                <p id="fullname-error" role="alert" className="text-xs text-[#FF7A8A] mt-1 font-mono">
                  {fieldErrors.fullName}
                </p>
              )}
            </div>

            {/* 3. College (required) */}
            <div>
              <label
                htmlFor="college-select"
                className="block text-sm font-mono text-[#E8EAF6] mb-1.5 font-medium"
              >
                3. COLLEGE <span className="text-[#FF7A8A]">*</span>
              </label>
              <div className="relative">
                <select
                  id="college-select"
                  name="college"
                  required
                  aria-invalid={Boolean(fieldErrors.college)}
                  aria-describedby={fieldErrors.college ? 'college-error' : undefined}
                  value={formData.college}
                  onChange={(e) => {
                    setFormData({ ...formData, college: e.target.value });
                    if (fieldErrors.college) setFieldErrors({ ...fieldErrors, college: undefined });
                  }}
                  className="w-full pl-9 pr-3 py-2.5 rounded-lg bg-[#0C0F1F] border border-[#252C4F] text-sm text-[#E8EAF6] focus:outline-none focus:border-[#8B9BFF]"
                >
                  {ALLOWED_COLLEGES.map((col) => (
                    <option key={col} value={col} className="bg-[#141932] text-[#E8EAF6]">
                      {col}
                    </option>
                  ))}
                </select>
                <Building2 className="w-4 h-4 text-[#9AA1C4] absolute left-3 top-3 pointer-events-none" />
              </div>
              {fieldErrors.college && (
                <p id="college-error" role="alert" className="text-xs text-[#FF7A8A] mt-1 font-mono">
                  {fieldErrors.college}
                </p>
              )}
            </div>

            {/* 4. Department (required) & 5. Year (required) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label
                  htmlFor="department-select"
                  className="block text-sm font-mono text-[#E8EAF6] mb-1.5 font-medium"
                >
                  4. DEPARTMENT <span className="text-[#FF7A8A]">*</span>
                </label>
                <div className="relative">
                  <select
                    id="department-select"
                    name="department"
                    required
                    aria-invalid={Boolean(fieldErrors.department)}
                    aria-describedby={fieldErrors.department ? 'department-error' : undefined}
                    value={formData.department}
                    onChange={(e) => {
                      setFormData({ ...formData, department: e.target.value });
                      if (fieldErrors.department)
                        setFieldErrors({ ...fieldErrors, department: undefined });
                    }}
                    className="w-full pl-9 pr-3 py-2.5 rounded-lg bg-[#0C0F1F] border border-[#252C4F] text-sm text-[#E8EAF6] focus:outline-none focus:border-[#8B9BFF]"
                  >
                    <option value="" className="bg-[#141932] text-[#9AA1C4]">
                      Select Department
                    </option>
                    {ALLOWED_DEPARTMENTS.map((dept) => (
                      <option key={dept} value={dept} className="bg-[#141932] text-[#E8EAF6]">
                        {dept}
                      </option>
                    ))}
                  </select>
                  <GraduationCap className="w-4 h-4 text-[#9AA1C4] absolute left-3 top-3 pointer-events-none" />
                </div>
                {fieldErrors.department && (
                  <p
                    id="department-error"
                    role="alert"
                    className="text-xs text-[#FF7A8A] mt-1 font-mono"
                  >
                    {fieldErrors.department}
                  </p>
                )}
              </div>

              <div>
                <label
                  htmlFor="year-select"
                  className="block text-sm font-mono text-[#E8EAF6] mb-1.5 font-medium"
                >
                  5. YEAR <span className="text-[#FF7A8A]">*</span>
                </label>
                <div className="relative">
                  <select
                    id="year-select"
                    name="year"
                    required
                    aria-invalid={Boolean(fieldErrors.year)}
                    aria-describedby={fieldErrors.year ? 'year-error' : undefined}
                    value={formData.year}
                    onChange={(e) => {
                      setFormData({ ...formData, year: e.target.value });
                      if (fieldErrors.year) setFieldErrors({ ...fieldErrors, year: undefined });
                    }}
                    className="w-full pl-9 pr-3 py-2.5 rounded-lg bg-[#0C0F1F] border border-[#252C4F] text-sm text-[#E8EAF6] focus:outline-none focus:border-[#8B9BFF]"
                  >
                    <option value="" className="bg-[#141932] text-[#9AA1C4]">
                      Select Year
                    </option>
                    {ALLOWED_YEARS.map((yr) => (
                      <option key={yr} value={yr} className="bg-[#141932] text-[#E8EAF6]">
                        {yr}
                      </option>
                    ))}
                  </select>
                  <Calendar className="w-4 h-4 text-[#9AA1C4] absolute left-3 top-3 pointer-events-none" />
                </div>
                {fieldErrors.year && (
                  <p id="year-error" role="alert" className="text-xs text-[#FF7A8A] mt-1 font-mono">
                    {fieldErrors.year}
                  </p>
                )}
              </div>
            </div>

            {/* 6. Division (optional) */}
            <div>
              <label
                htmlFor="division-input"
                className="block text-sm font-mono text-[#E8EAF6] mb-1.5 font-medium"
              >
                6. DIVISION <span className="text-[#9AA1C4] text-xs font-normal">(OPTIONAL)</span>
              </label>
              <div className="relative">
                <input
                  id="division-input"
                  name="division"
                  type="text"
                  maxLength={3}
                  aria-invalid={Boolean(fieldErrors.division)}
                  aria-describedby={fieldErrors.division ? 'division-error' : undefined}
                  value={formData.division}
                  onChange={(e) => {
                    setFormData({ ...formData, division: e.target.value.toUpperCase() });
                    if (fieldErrors.division) setFieldErrors({ ...fieldErrors, division: undefined });
                  }}
                  placeholder="e.g. A, B, C1 (optional)"
                  className="w-full pl-9 pr-3 py-2.5 rounded-lg bg-[#0C0F1F] border border-[#252C4F] text-sm text-[#E8EAF6] placeholder-[#9AA1C4] focus:outline-none focus:border-[#8B9BFF] font-mono uppercase"
                />
                <Layers className="w-4 h-4 text-[#9AA1C4] absolute left-3 top-3" />
              </div>
              {fieldErrors.division && (
                <p id="division-error" role="alert" className="text-xs text-[#FF7A8A] mt-1 font-mono">
                  {fieldErrors.division}
                </p>
              )}
            </div>

            {/* 7. College email, password, confirm password */}
            <div>
              <label
                htmlFor="email-input"
                className="block text-sm font-mono text-[#E8EAF6] mb-1.5 font-medium"
              >
                7. COLLEGE EMAIL <span className="text-[#FF7A8A]">*</span>
              </label>
              <div className="relative">
                <input
                  id="email-input"
                  name="email"
                  type="email"
                  required
                  aria-invalid={Boolean(fieldErrors.email)}
                  aria-describedby={fieldErrors.email ? 'email-error' : undefined}
                  value={formData.email}
                  onChange={(e) => {
                    setFormData({ ...formData, email: e.target.value });
                    if (fieldErrors.email) setFieldErrors({ ...fieldErrors, email: undefined });
                  }}
                  placeholder="student@sanjivani.org.in"
                  className="w-full pl-9 pr-3 py-2.5 rounded-lg bg-[#0C0F1F] border border-[#252C4F] text-sm text-[#E8EAF6] placeholder-[#9AA1C4] focus:outline-none focus:border-[#8B9BFF]"
                />
                <Mail className="w-4 h-4 text-[#9AA1C4] absolute left-3 top-3" />
              </div>
              {fieldErrors.email && (
                <p id="email-error" role="alert" className="text-xs text-[#FF7A8A] mt-1 font-mono">
                  {fieldErrors.email}
                </p>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label
                  htmlFor="password-input"
                  className="block text-sm font-mono text-[#E8EAF6] mb-1.5 font-medium"
                >
                  8. PASSWORD <span className="text-[#FF7A8A]">*</span>
                </label>
                <div className="relative">
                  <input
                    id="password-input"
                    name="password"
                    type="password"
                    required
                    minLength={8}
                    aria-invalid={Boolean(fieldErrors.password)}
                    aria-describedby={fieldErrors.password ? 'password-error' : undefined}
                    value={formData.password}
                    onChange={(e) => {
                      setFormData({ ...formData, password: e.target.value });
                      if (fieldErrors.password)
                        setFieldErrors({ ...fieldErrors, password: undefined });
                    }}
                    placeholder="Min 8 characters"
                    className="w-full pl-9 pr-3 py-2.5 rounded-lg bg-[#0C0F1F] border border-[#252C4F] text-sm text-[#E8EAF6] placeholder-[#9AA1C4] focus:outline-none focus:border-[#8B9BFF]"
                  />
                  <KeyRound className="w-4 h-4 text-[#9AA1C4] absolute left-3 top-3" />
                </div>
                {fieldErrors.password && (
                  <p
                    id="password-error"
                    role="alert"
                    className="text-xs text-[#FF7A8A] mt-1 font-mono"
                  >
                    {fieldErrors.password}
                  </p>
                )}
              </div>

              <div>
                <label
                  htmlFor="confirm-password-input"
                  className="block text-sm font-mono text-[#E8EAF6] mb-1.5 font-medium"
                >
                  9. CONFIRM PASSWORD <span className="text-[#FF7A8A]">*</span>
                </label>
                <div className="relative">
                  <input
                    id="confirm-password-input"
                    name="confirmPassword"
                    type="password"
                    required
                    minLength={8}
                    aria-invalid={Boolean(fieldErrors.confirmPassword)}
                    aria-describedby={
                      fieldErrors.confirmPassword ? 'confirm-password-error' : undefined
                    }
                    value={formData.confirmPassword}
                    onChange={(e) => {
                      setFormData({ ...formData, confirmPassword: e.target.value });
                      if (fieldErrors.confirmPassword)
                        setFieldErrors({ ...fieldErrors, confirmPassword: undefined });
                    }}
                    placeholder="Re-enter password"
                    className="w-full pl-9 pr-3 py-2.5 rounded-lg bg-[#0C0F1F] border border-[#252C4F] text-sm text-[#E8EAF6] placeholder-[#9AA1C4] focus:outline-none focus:border-[#8B9BFF]"
                  />
                  <KeyRound className="w-4 h-4 text-[#9AA1C4] absolute left-3 top-3" />
                </div>
                {fieldErrors.confirmPassword && (
                  <p
                    id="confirm-password-error"
                    role="alert"
                    className="text-xs text-[#FF7A8A] mt-1 font-mono"
                  >
                    {fieldErrors.confirmPassword}
                  </p>
                )}
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 px-4 rounded-lg font-mono text-sm font-bold text-[#0C0F1F] bg-[#8B9BFF] hover:bg-[#9FAOFF] shadow-lg transition-all flex items-center justify-center gap-2 disabled:opacity-50 mt-4"
            >
              <span>{loading ? 'Creating Account...' : 'Create Challenger Profile'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          <p className="text-xs text-[#9AA1C4] mt-4 text-center">
            By registering, you agree to our{' '}
            <Link to="/privacy" className="text-[#8B9BFF] underline">
              Privacy Notice & PRN Protection Policy
            </Link>
            .
          </p>
        </div>

        <p className="text-center text-sm text-[#9AA1C4] mt-6">
          Already registered?{' '}
          <Link to="/login" className="text-[#8B9BFF] hover:underline font-semibold font-mono">
            Sign In here
          </Link>
        </p>
      </div>
    </div>
  );
};
