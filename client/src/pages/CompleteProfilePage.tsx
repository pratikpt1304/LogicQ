import React, { useState } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.js';
import { Logo } from '../components/common/Logo.js';
import {
  ALLOWED_COLLEGES,
  ALLOWED_DEPARTMENTS,
  ALLOWED_YEARS,
  PRN_REGEX,
  DIVISION_REGEX,
} from '../config/academic.config.js';
import {
  Hash,
  Building2,
  GraduationCap,
  Calendar,
  Layers,
  ArrowRight,
  AlertCircle,
  ShieldCheck,
} from 'lucide-react';

interface CompleteErrors {
  prn?: string;
  college?: string;
  department?: string;
  year?: string;
  division?: string;
}

export const CompleteProfilePage: React.FC = () => {
  const { user, completeProfile } = useAuth();
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    prn: user?.prn || '',
    college: user?.college || ALLOWED_COLLEGES[0] || 'Sanjivani University',
    department: user?.department || '',
    year: user?.year || '',
    division: user?.division || '',
  });
  const [fieldErrors, setFieldErrors] = useState<CompleteErrors>({});
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (user.profileComplete && user.prn && user.college && user.department && user.year) {
    return <Navigate to="/dashboard" replace />;
  }

  const trimmedPrn = formData.prn.trim();
  const prnLength = trimmedPrn.length;

  const validateClientSide = (): boolean => {
    const nextErrors: CompleteErrors = {};

    if (!trimmedPrn || !PRN_REGEX.test(trimmedPrn)) {
      nextErrors.prn = 'PRN must be exactly 12 digits.';
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

    setFieldErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!validateClientSide()) {
      return;
    }

    setLoading(true);
    try {
      await completeProfile({
        prn: trimmedPrn,
        college: formData.college,
        department: formData.department,
        year: formData.year,
        division: formData.division.trim().toUpperCase() || undefined,
      });
      navigate('/dashboard', { replace: true });
    } catch (err: any) {
      const msg = err.message || 'Failed to complete profile';
      setError(msg);
      if (msg.toLowerCase().includes('prn')) {
        setFieldErrors((prev) => ({ ...prev, prn: msg }));
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
          <h1 className="text-2xl font-extrabold text-[#E8EAF6]">Complete Your Profile</h1>
          <p className="text-sm text-[#9AA1C4] mt-1 font-mono">
            Signed in as <strong className="text-[#8B9BFF]">{user.email}</strong>. Complete your academic record to unlock the dashboard.
          </p>
        </div>

        <div className="glass-card p-5 sm:p-8 rounded-2xl border border-[#252C4F] bg-[#141932] shadow-2xl">
          <div className="mb-5 flex items-start gap-2.5 p-3 rounded-lg bg-[#8B9BFF]/10 border border-[#8B9BFF]/30 text-[#E8EAF6] text-xs font-mono">
            <ShieldCheck className="w-4 h-4 shrink-0 text-[#8B9BFF] mt-0.5" />
            <span>
              Your PRN and College are locked after this step. Your existing points and submissions remain intact.
            </span>
          </div>

          {error && (
            <div
              role="alert"
              className="mb-5 flex items-center gap-2 p-3 rounded-lg bg-[#FF7A8A]/10 border border-[#FF7A8A]/40 text-[#FF7A8A] text-sm"
            >
              <AlertCircle className="w-4 h-4 shrink-0 text-[#FF7A8A]" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} noValidate className="space-y-4">
            {/* 1. PRN */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label
                  htmlFor="complete-prn-input"
                  className="block text-sm font-mono text-[#E8EAF6] font-medium"
                >
                  1. PRN <span className="text-[#FF7A8A]">*</span>
                </label>
                <span
                  data-testid="complete-prn-counter"
                  className={`text-xs font-mono font-semibold ${
                    prnLength === 12 ? 'text-[#46D9A0]' : 'text-[#9AA1C4]'
                  }`}
                >
                  {prnLength}/12
                </span>
              </div>
              <div className="relative">
                <input
                  id="complete-prn-input"
                  name="prn"
                  type="text"
                  inputMode="numeric"
                  required
                  aria-invalid={Boolean(fieldErrors.prn)}
                  aria-describedby={fieldErrors.prn ? 'complete-prn-error' : undefined}
                  value={formData.prn}
                  onChange={(e) => {
                    setFormData({ ...formData, prn: e.target.value });
                    if (fieldErrors.prn) setFieldErrors({ ...fieldErrors, prn: undefined });
                  }}
                  placeholder="Enter your 12-digit University PRN"
                  className="w-full pl-9 pr-3 py-2.5 rounded-lg bg-[#0C0F1F] border border-[#252C4F] text-sm text-[#E8EAF6] placeholder-[#9AA1C4] focus:outline-none focus:border-[#8B9BFF] font-mono"
                />
                <Hash className="w-4 h-4 text-[#9AA1C4] absolute left-3 top-3" />
              </div>
              {fieldErrors.prn && (
                <p id="complete-prn-error" role="alert" className="text-xs text-[#FF7A8A] mt-1 font-mono">
                  {fieldErrors.prn}
                </p>
              )}
            </div>

            {/* 2. College */}
            <div>
              <label
                htmlFor="complete-college-select"
                className="block text-sm font-mono text-[#E8EAF6] mb-1.5 font-medium"
              >
                2. COLLEGE <span className="text-[#FF7A8A]">*</span>
              </label>
              <div className="relative">
                <select
                  id="complete-college-select"
                  name="college"
                  required
                  aria-invalid={Boolean(fieldErrors.college)}
                  value={formData.college}
                  onChange={(e) => setFormData({ ...formData, college: e.target.value })}
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
            </div>

            {/* 3. Department & 4. Year */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label
                  htmlFor="complete-department-select"
                  className="block text-sm font-mono text-[#E8EAF6] mb-1.5 font-medium"
                >
                  3. DEPARTMENT <span className="text-[#FF7A8A]">*</span>
                </label>
                <div className="relative">
                  <select
                    id="complete-department-select"
                    name="department"
                    required
                    aria-invalid={Boolean(fieldErrors.department)}
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
                  <p role="alert" className="text-xs text-[#FF7A8A] mt-1 font-mono">
                    {fieldErrors.department}
                  </p>
                )}
              </div>

              <div>
                <label
                  htmlFor="complete-year-select"
                  className="block text-sm font-mono text-[#E8EAF6] mb-1.5 font-medium"
                >
                  4. YEAR <span className="text-[#FF7A8A]">*</span>
                </label>
                <div className="relative">
                  <select
                    id="complete-year-select"
                    name="year"
                    required
                    aria-invalid={Boolean(fieldErrors.year)}
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
                  <p role="alert" className="text-xs text-[#FF7A8A] mt-1 font-mono">
                    {fieldErrors.year}
                  </p>
                )}
              </div>
            </div>

            {/* 5. Division */}
            <div>
              <label
                htmlFor="complete-division-input"
                className="block text-sm font-mono text-[#E8EAF6] mb-1.5 font-medium"
              >
                5. DIVISION <span className="text-[#9AA1C4] text-xs font-normal">(OPTIONAL)</span>
              </label>
              <div className="relative">
                <input
                  id="complete-division-input"
                  name="division"
                  type="text"
                  maxLength={3}
                  aria-invalid={Boolean(fieldErrors.division)}
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
                <p role="alert" className="text-xs text-[#FF7A8A] mt-1 font-mono">
                  {fieldErrors.division}
                </p>
              )}
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 px-4 rounded-lg font-mono text-sm font-bold text-[#0C0F1F] bg-[#8B9BFF] hover:bg-[#9FAOFF] shadow-lg transition-all flex items-center justify-center gap-2 disabled:opacity-50 mt-4"
            >
              <span>{loading ? 'Saving Profile...' : 'Save & Continue to Dashboard'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
