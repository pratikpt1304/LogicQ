import React, { useState } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.js';
import { FirestoreDataService } from '../services/firestoreData.service.js';
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
  Building2,
  GraduationCap,
  Calendar,
  Layers,
  ArrowRight,
  AlertCircle,
  ShieldCheck,
  User,
} from 'lucide-react';
import { PrnFormatGuide } from '../components/common/PrnFormatGuide.js';

interface CompleteErrors {
  prn?: string;
  fullName?: string;
  college?: string;
  department?: string;
  year?: string;
  division?: string;
}

export const CompleteProfilePage: React.FC = () => {
  const { user, authState, completeProfile } = useAuth();
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    prn: user?.prn || '',
    fullName: user?.fullName || user?.displayName || '',
    college: user?.college || ALLOWED_COLLEGES[0] || 'Sanjivani University',
    department: user?.department || '',
    year: user?.year || '',
    division: user?.division || '',
  });
  const [fieldErrors, setFieldErrors] = useState<CompleteErrors>({});
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  if (authState === 'loading') {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center p-6 text-center">
        <div className="mb-4 animate-pulse">
          <Logo size="lg" />
        </div>
        <div className="flex items-center gap-2 text-xs font-mono text-[#8B9BFF] tracking-wider">
          <span className="w-2 h-2 rounded-full bg-[#8B9BFF] animate-ping" />
          <span>Restoring LogicQ session...</span>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (user.profileComplete && user.prn && user.college && user.department && user.year) {
    return <Navigate to="/dashboard" replace />;
  }

  const trimmedPrn = normalizePrn(formData.prn);
  const prnLength = trimmedPrn.length;

  const validateClientSide = (): boolean => {
    const nextErrors: CompleteErrors = {};

    if (!trimmedPrn || !isValidPrn(trimmedPrn)) {
      nextErrors.prn = PRN_ERROR_MESSAGE;
    }
    const trimmedFullName = formData.fullName.trim();
    if (!trimmedFullName) {
      nextErrors.fullName = 'Please enter your full name.';
    } else if (trimmedFullName.length < 2) {
      nextErrors.fullName = 'Full name must be at least 2 characters.';
    } else if (trimmedFullName.length > 50) {
      nextErrors.fullName = 'Full name cannot exceed 50 characters.';
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
      const trimmedFullName = formData.fullName.trim();
      await completeProfile({
        prn: trimmedPrn,
        fullName: trimmedFullName,
        displayName: trimmedFullName,
        college: formData.college,
        department: formData.department,
        year: formData.year,
        division: formData.division.trim().toUpperCase() || undefined,
      });

      // Synchronize in real-time across Firestore users, enrolled_students, sections, and admin/faculty portals
      FirestoreDataService.syncStudentProfileUpdate({
        userId: user?.id,
        email: user?.email,
        newPrn: trimmedPrn,
        displayName: trimmedFullName,
        fullName: trimmedFullName,
        department: formData.department,
        year: formData.year,
        division: formData.division.trim().toUpperCase() || undefined,
      }).catch(() => {});

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
                  inputMode="text"
                  autoCapitalize="characters"
                  autoComplete="off"
                  autoCorrect="off"
                  spellCheck={false}
                  maxLength={12}
                  enterKeyHint="next"
                  required
                  aria-invalid={Boolean(fieldErrors.prn)}
                  aria-describedby={fieldErrors.prn ? 'complete-prn-error' : 'complete-prn-hint'}
                  value={formData.prn}
                  onChange={(e) => {
                    const val = e.target.value.toUpperCase().slice(0, 12);
                    setFormData({ ...formData, prn: val });
                    if (fieldErrors.prn) setFieldErrors({ ...fieldErrors, prn: undefined });
                  }}
                  onPaste={(e) => {
                    e.preventDefault();
                    const pasted = e.clipboardData.getData('text');
                    const val = pasted.trim().replace(/\s+/g, '').toUpperCase().slice(0, 12);
                    setFormData((prev) => ({ ...prev, prn: val }));
                    if (fieldErrors.prn) setFieldErrors((prev) => ({ ...prev, prn: undefined }));
                  }}
                  onBlur={() => {
                    setFormData((prev) => ({
                      ...prev,
                      prn: prev.prn.trim().replace(/\s+/g, '').toUpperCase(),
                    }));
                  }}
                  placeholder="2199TESM0001"
                  className="w-full pl-9 pr-3 py-2.5 rounded-lg bg-[#0C0F1F] border border-[#252C4F] text-sm text-[#E8EAF6] placeholder-[#9AA1C4] focus:outline-none focus:border-[#8B9BFF] font-mono tracking-wider"
                />
                <Hash className="w-4 h-4 text-[#9AA1C4] absolute left-3 top-3" />
              </div>
              <PrnFormatGuide value={formData.prn} />
              {fieldErrors.prn && (
                <p id="complete-prn-error" role="alert" className="text-xs text-[#FF7A8A] mt-1 font-mono">
                  {fieldErrors.prn}
                </p>
              )}
            </div>

            {/* 2. Full Name (required) */}
            <div>
              <label
                htmlFor="complete-fullname-input"
                className="block text-sm font-mono text-[#E8EAF6] mb-1.5 font-medium"
              >
                2. STUDENT FULL NAME <span className="text-[#FF7A8A]">*</span>
              </label>
              <div className="relative">
                <input
                  id="complete-fullname-input"
                  name="fullName"
                  type="text"
                  autoComplete="name"
                  required
                  aria-invalid={Boolean(fieldErrors.fullName)}
                  aria-describedby={fieldErrors.fullName ? 'complete-fullname-error' : undefined}
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
                <p id="complete-fullname-error" role="alert" className="text-xs text-[#FF7A8A] mt-1 font-mono">
                  {fieldErrors.fullName}
                </p>
              )}
            </div>

            {/* 3. College */}
            <div>
              <label
                htmlFor="complete-college-select"
                className="block text-sm font-mono text-[#E8EAF6] mb-1.5 font-medium"
              >
                3. COLLEGE <span className="text-[#FF7A8A]">*</span>
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

            {/* 4. Department & 5. Year */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label
                  htmlFor="complete-department-select"
                  className="block text-sm font-mono text-[#E8EAF6] mb-1.5 font-medium"
                >
                  4. DEPARTMENT <span className="text-[#FF7A8A]">*</span>
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
                  5. YEAR <span className="text-[#FF7A8A]">*</span>
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
