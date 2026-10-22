import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { api } from '../api/client.js';
import { toast } from 'sonner';
import confetti from 'canvas-confetti';
import {
  GraduationCap,
  ShieldCheck,
  Mail,
  Phone,
  User,
  Hash,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  Clock,
  Sparkles,
  BookOpen,
} from 'lucide-react';

interface PublicSectionInfo {
  id: string;
  institution: string;
  course: string;
  subject: string;
  academicYear: string;
  semester: string;
  sectionName: string;
  description: string | null;
  joinCode: string;
  joinToken: string;
  faculty?: {
    fullName: string;
    displayName: string;
  };
}

export const InstantJoinPage: React.FC = () => {
  const { joinToken } = useParams<{ joinToken: string }>();
  const navigate = useNavigate();

  const [section, setSection] = useState<PublicSectionInfo | null>(null);
  const [loadingSection, setLoadingSection] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Form Fields
  const [name, setName] = useState('');
  const [prn, setPrn] = useState('');
  const [email, setEmail] = useState('');
  const [mobile, setMobile] = useState('');

  // Email OTP state
  const [emailOtp, setEmailOtp] = useState('');
  const [emailOtpSent, setEmailOtpSent] = useState(false);
  const [emailOtpVerified, setEmailOtpVerified] = useState(false);
  const [emailCooldown, setEmailCooldown] = useState(0);
  const [isSendingEmailOtp, setIsSendingEmailOtp] = useState(false);
  const [isVerifyingEmailOtp, setIsVerifyingEmailOtp] = useState(false);

  // Mobile OTP state
  const [mobileOtp, setMobileOtp] = useState('');
  const [mobileOtpSent, setMobileOtpSent] = useState(false);
  const [mobileOtpVerified, setMobileOtpVerified] = useState(false);
  const [mobileCooldown, setMobileCooldown] = useState(0);
  const [isSendingMobileOtp, setIsSendingMobileOtp] = useState(false);
  const [isVerifyingMobileOtp, setIsVerifyingMobileOtp] = useState(false);

  // Final submit state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [joinedSuccess, setJoinedSuccess] = useState(false);

  // Fetch public section info on mount
  useEffect(() => {
    if (!joinToken) return;
    setLoadingSection(true);
    api
      .get(`/sections/join-info/${joinToken}`)
      .then((res) => {
        const data = res.section || res.data;
        if (data) {
          setSection(data);
        } else {
          setErrorMsg('Section not found or enrollment link is inactive.');
        }
      })
      .catch((err) => {
        setErrorMsg(err.message || 'Invalid or expired section join link.');
      })
      .finally(() => {
        setLoadingSection(false);
      });
  }, [joinToken]);

  // Cooldown countdown timers
  useEffect(() => {
    if (emailCooldown <= 0) return;
    const timer = setInterval(() => setEmailCooldown((prev) => prev - 1), 1000);
    return () => clearInterval(timer);
  }, [emailCooldown]);

  useEffect(() => {
    if (mobileCooldown <= 0) return;
    const timer = setInterval(() => setMobileCooldown((prev) => prev - 1), 1000);
    return () => clearInterval(timer);
  }, [mobileCooldown]);

  // Send Email OTP
  const handleSendEmailOtp = async () => {
    if (!email || !email.includes('@')) {
      toast.error('Please enter a valid academic email address.');
      return;
    }
    setIsSendingEmailOtp(true);
    try {
      const res = await api.post('/otp/send-email', { email, prn });
      setEmailOtpSent(true);
      setEmailCooldown(60);
      toast.success(res.message || '6-digit verification code sent to your email.');
    } catch (err: any) {
      toast.error(err.message || 'Failed to dispatch email verification code.');
    } finally {
      setIsSendingEmailOtp(false);
    }
  };

  // Verify Email OTP
  const handleVerifyEmailOtp = async () => {
    if (!emailOtp || emailOtp.length < 6) {
      toast.error('Please enter the 6-digit code received via email.');
      return;
    }
    setIsVerifyingEmailOtp(true);
    try {
      const res = await api.post('/otp/verify-email', { email, code: emailOtp, prn });
      if (res.success || res.verified) {
        setEmailOtpVerified(true);
        toast.success('Email verified successfully!');
      } else {
        toast.error(res.message || 'Invalid email verification code.');
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to verify email code.');
    } finally {
      setIsVerifyingEmailOtp(false);
    }
  };

  // Send Mobile OTP
  const handleSendMobileOtp = async () => {
    const cleanMobile = mobile.replace(/[^0-9]/g, '');
    if (cleanMobile.length < 10) {
      toast.error('Please enter a valid 10-digit mobile number.');
      return;
    }
    setIsSendingMobileOtp(true);
    try {
      const res = await api.post('/otp/send-mobile', { mobile: cleanMobile, prn });
      setMobileOtpSent(true);
      setMobileCooldown(60);
      toast.success(res.message || '6-digit OTP sent to your mobile phone.');
    } catch (err: any) {
      toast.error(err.message || 'Failed to dispatch mobile OTP.');
    } finally {
      setIsSendingMobileOtp(false);
    }
  };

  // Verify Mobile OTP
  const handleVerifyMobileOtp = async () => {
    if (!mobileOtp || mobileOtp.length < 6) {
      toast.error('Please enter the 6-digit mobile OTP.');
      return;
    }
    setIsVerifyingMobileOtp(true);
    try {
      const cleanMobile = mobile.replace(/[^0-9]/g, '');
      const res = await api.post('/otp/verify-mobile', { mobile: cleanMobile, code: mobileOtp, prn });
      if (res.success || res.verified) {
        setMobileOtpVerified(true);
        toast.success('Mobile number verified successfully!');
      } else {
        toast.error(res.message || 'Invalid mobile OTP.');
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to verify mobile OTP.');
    } finally {
      setIsVerifyingMobileOtp(false);
    }
  };

  // Final Instant Join Submit
  const handleInstantJoin = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      toast.error('Please enter your full name.');
      return;
    }
    if (!prn.trim()) {
      toast.error('Please enter your PRN or Roll No.');
      return;
    }
    if (!emailOtpVerified) {
      toast.error('Please complete Email OTP verification first.');
      return;
    }
    if (!mobileOtpVerified) {
      toast.error('Please complete Mobile OTP verification first.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await api.post('/sections/instant-join', {
        joinToken,
        name: name.trim(),
        prn: prn.trim().toUpperCase(),
        email: email.trim().toLowerCase(),
        mobile: mobile.replace(/[^0-9]/g, ''),
      });

      if (res.success) {
        setJoinedSuccess(true);
        confetti({
          particleCount: 100,
          spread: 70,
          origin: { y: 0.6 },
        });
        toast.success('Identity bound & Section joined successfully!');
      } else {
        toast.error(res.message || 'Failed to complete section join.');
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to join section.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loadingSection) {
    return (
      <div className="min-h-[80vh] flex flex-col items-center justify-center p-4">
        <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-sm font-mono text-[var(--muted-foreground)]">Loading section details...</p>
      </div>
    );
  }

  if (errorMsg || !section) {
    return (
      <div className="min-h-[80vh] flex flex-col items-center justify-center p-4">
        <div className="max-w-md w-full bg-[var(--card)] border border-[var(--border)] rounded-2xl p-8 text-center space-y-4 shadow-xl">
          <div className="w-12 h-12 rounded-full bg-rose-500/10 text-rose-400 mx-auto flex items-center justify-center">
            <AlertCircle className="w-6 h-6" />
          </div>
          <h2 className="text-xl font-bold text-[var(--foreground)]">Section Unavailable</h2>
          <p className="text-sm text-[var(--muted-foreground)]">
            {errorMsg || 'The join link you followed is invalid, inactive, or expired.'}
          </p>
          <Link
            to="/login"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold"
          >
            Go to LogicQ Login
          </Link>
        </div>
      </div>
    );
  }

  if (joinedSuccess) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center p-4">
        <div className="max-w-lg w-full bg-[var(--card)] border border-emerald-500/30 rounded-3xl p-8 text-center space-y-6 shadow-2xl animate-in zoom-in-95">
          <div className="w-16 h-16 rounded-full bg-emerald-500/10 text-emerald-400 mx-auto flex items-center justify-center border border-emerald-500/20">
            <CheckCircle2 className="w-8 h-8" />
          </div>

          <div>
            <h2 className="text-2xl font-bold text-[var(--foreground)]">
              Enrollment Complete!
            </h2>
            <p className="text-sm text-[var(--muted-foreground)] mt-1">
              Your identity has been cryptographically validated and bound to your academic record.
            </p>
          </div>

          <div className="bg-[var(--background)] rounded-2xl p-5 border border-[var(--border)] text-left space-y-3">
            <div className="flex items-center justify-between border-b border-[var(--border)] pb-2 text-xs">
              <span className="text-[var(--muted-foreground)]">Section</span>
              <span className="font-bold text-[var(--foreground)]">{section.sectionName}</span>
            </div>
            <div className="flex items-center justify-between border-b border-[var(--border)] pb-2 text-xs">
              <span className="text-[var(--muted-foreground)]">Course & Subject</span>
              <span className="font-semibold text-[var(--foreground)] text-right">
                {section.subject} ({section.course})
              </span>
            </div>
            <div className="flex items-center justify-between border-b border-[var(--border)] pb-2 text-xs">
              <span className="text-[var(--muted-foreground)]">Student PRN</span>
              <span className="font-mono font-bold text-indigo-400">{prn.toUpperCase()}</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-[var(--muted-foreground)]">Identity State</span>
              <span className="text-emerald-400 font-semibold flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5" />
                ACTIVE & IDENTITY BOUND
              </span>
            </div>
          </div>

          <div className="space-y-3">
            <Link
              to="/dashboard"
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-sm shadow-lg shadow-indigo-600/20 transition"
            >
              Continue to Student Dashboard
              <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              to="/login"
              className="w-full block py-2.5 rounded-xl border border-[var(--border)] hover:bg-[var(--accent)]/10 text-[var(--muted-foreground)] hover:text-[var(--foreground)] text-xs font-medium transition"
            >
              Return to Login
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen py-12 px-4 flex items-center justify-center">
      <div className="max-w-xl w-full space-y-6">
        {/* Section Header Card */}
        <div className="bg-[var(--card)] border border-[var(--border)] rounded-3xl p-6 sm:p-8 space-y-4 shadow-xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/5 rounded-full blur-2xl -mr-10 -mt-10 pointer-events-none" />

          <div className="flex items-start justify-between gap-4">
            <div>
              <span className="text-xs font-mono font-bold uppercase tracking-wider text-indigo-400 bg-indigo-500/10 px-3 py-1 rounded-full border border-indigo-500/20">
                Join Code: {section.joinCode}
              </span>
              <h1 className="text-2xl font-bold text-[var(--foreground)] mt-3">
                {section.subject}
              </h1>
              <p className="text-sm text-[var(--muted-foreground)]">{section.course}</p>
            </div>
            <div className="p-3 rounded-2xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              <GraduationCap className="w-8 h-8" />
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-2 border-t border-[var(--border)] text-xs">
            <div>
              <span className="text-[var(--muted-foreground)] block">Institution</span>
              <span className="font-medium text-[var(--foreground)]">{section.institution}</span>
            </div>
            <div>
              <span className="text-[var(--muted-foreground)] block">Academic Term</span>
              <span className="font-medium text-[var(--foreground)]">
                {section.academicYear} • {section.semester}
              </span>
            </div>
            <div>
              <span className="text-[var(--muted-foreground)] block">Section</span>
              <span className="font-semibold text-indigo-400">{section.sectionName}</span>
            </div>
          </div>
        </div>

        {/* Dual OTP Instant Join Form */}
        <div className="bg-[var(--card)] border border-[var(--border)] rounded-3xl p-6 sm:p-8 space-y-6 shadow-xl">
          <div className="space-y-1">
            <h2 className="text-lg font-bold text-[var(--foreground)] flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-indigo-400" />
              Student Identity & Dual OTP Validation
            </h2>
            <p className="text-xs text-[var(--muted-foreground)]">
              Per Institutional AI-Resistant Guidelines: 1 PRN binds strictly to 1 Mobile & 1 Email address.
            </p>
          </div>

          <form onSubmit={handleInstantJoin} className="space-y-5">
            {/* 1. Student Name */}
            <div>
              <label className="block text-xs font-medium text-[var(--muted-foreground)] mb-1.5">
                Full Name (as per University Records)
              </label>
              <div className="relative">
                <User className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted-foreground)]" />
                <input
                  type="text"
                  required
                  placeholder="e.g. Aarav Sharma"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-sm rounded-xl border border-[var(--border)] bg-[var(--background)] text-[var(--foreground)] focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>

            {/* 2. PRN / Roll No */}
            <div>
              <label className="block text-xs font-medium text-[var(--muted-foreground)] mb-1.5">
                PRN / Roll Number (Unique Identifier)
              </label>
              <div className="relative">
                <Hash className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted-foreground)]" />
                <input
                  type="text"
                  required
                  placeholder="e.g. 2199TESM1039"
                  value={prn}
                  onChange={(e) => setPrn(e.target.value.toUpperCase())}
                  className="w-full pl-9 pr-3 py-2 text-sm font-mono uppercase tracking-wider rounded-xl border border-[var(--border)] bg-[var(--background)] text-[var(--foreground)] focus:outline-none focus:border-indigo-500 font-bold"
                />
              </div>
            </div>

            {/* 3. Email Address & Email OTP */}
            <div className="space-y-2 p-4 rounded-2xl bg-[var(--background)]/60 border border-[var(--border)]">
              <label className="block text-xs font-medium text-[var(--foreground)] flex items-center justify-between">
                <span>Academic Email Address</span>
                {emailOtpVerified && (
                  <span className="text-emerald-400 text-xs font-bold flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Verified
                  </span>
                )}
              </label>

              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Mail className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted-foreground)]" />
                  <input
                    type="email"
                    required
                    disabled={emailOtpVerified}
                    placeholder="student@sanjivani.edu.in"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 text-sm rounded-xl border border-[var(--border)] bg-[var(--background)] text-[var(--foreground)] focus:outline-none focus:border-indigo-500 disabled:opacity-60"
                  />
                </div>
                {!emailOtpVerified && (
                  <button
                    type="button"
                    disabled={isSendingEmailOtp || emailCooldown > 0}
                    onClick={handleSendEmailOtp}
                    className="px-3 py-2 text-xs font-semibold rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white disabled:opacity-50 whitespace-nowrap"
                  >
                    {isSendingEmailOtp
                      ? 'Sending...'
                      : emailCooldown > 0
                      ? `${emailCooldown}s`
                      : emailOtpSent
                      ? 'Resend'
                      : 'Send OTP'}
                  </button>
                )}
              </div>

              {emailOtpSent && !emailOtpVerified && (
                <div className="flex gap-2 pt-2 animate-in fade-in">
                  <input
                    type="text"
                    maxLength={6}
                    placeholder="6-digit Email Code"
                    value={emailOtp}
                    onChange={(e) => setEmailOtp(e.target.value)}
                    className="flex-1 px-3 py-2 text-sm font-mono tracking-widest text-center rounded-xl border border-indigo-500/40 bg-[var(--background)] text-[var(--foreground)]"
                  />
                  <button
                    type="button"
                    disabled={isVerifyingEmailOtp || emailOtp.length < 6}
                    onClick={handleVerifyEmailOtp}
                    className="px-4 py-2 text-xs font-bold rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white disabled:opacity-50"
                  >
                    {isVerifyingEmailOtp ? 'Verifying...' : 'Verify'}
                  </button>
                </div>
              )}
            </div>

            {/* 4. Mobile Number & Mobile OTP */}
            <div className="space-y-2 p-4 rounded-2xl bg-[var(--background)]/60 border border-[var(--border)]">
              <label className="block text-xs font-medium text-[var(--foreground)] flex items-center justify-between">
                <span>Personal Mobile Number</span>
                {mobileOtpVerified && (
                  <span className="text-emerald-400 text-xs font-bold flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Verified
                  </span>
                )}
              </label>

              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Phone className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted-foreground)]" />
                  <input
                    type="tel"
                    required
                    disabled={mobileOtpVerified}
                    placeholder="9876543210"
                    value={mobile}
                    onChange={(e) => setMobile(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 text-sm rounded-xl border border-[var(--border)] bg-[var(--background)] text-[var(--foreground)] focus:outline-none focus:border-indigo-500 disabled:opacity-60"
                  />
                </div>
                {!mobileOtpVerified && (
                  <button
                    type="button"
                    disabled={isSendingMobileOtp || mobileCooldown > 0}
                    onClick={handleSendMobileOtp}
                    className="px-3 py-2 text-xs font-semibold rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white disabled:opacity-50 whitespace-nowrap"
                  >
                    {isSendingMobileOtp
                      ? 'Sending...'
                      : mobileCooldown > 0
                      ? `${mobileCooldown}s`
                      : mobileOtpSent
                      ? 'Resend'
                      : 'Send OTP'}
                  </button>
                )}
              </div>

              {mobileOtpSent && !mobileOtpVerified && (
                <div className="flex gap-2 pt-2 animate-in fade-in">
                  <input
                    type="text"
                    maxLength={6}
                    placeholder="6-digit Mobile OTP"
                    value={mobileOtp}
                    onChange={(e) => setMobileOtp(e.target.value)}
                    className="flex-1 px-3 py-2 text-sm font-mono tracking-widest text-center rounded-xl border border-indigo-500/40 bg-[var(--background)] text-[var(--foreground)]"
                  />
                  <button
                    type="button"
                    disabled={isVerifyingMobileOtp || mobileOtp.length < 6}
                    onClick={handleVerifyMobileOtp}
                    className="px-4 py-2 text-xs font-bold rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white disabled:opacity-50"
                  >
                    {isVerifyingMobileOtp ? 'Verifying...' : 'Verify'}
                  </button>
                </div>
              )}
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isSubmitting || !emailOtpVerified || !mobileOtpVerified}
              className="w-full py-3 text-sm font-bold rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white disabled:opacity-50 shadow-lg shadow-indigo-600/20 transition flex items-center justify-center gap-2"
            >
              {isSubmitting ? (
                'Binding Identity & Enrolling...'
              ) : !emailOtpVerified || !mobileOtpVerified ? (
                'Verify Both Email & Mobile OTPs to Continue'
              ) : (
                <>
                  <ShieldCheck className="w-4 h-4" />
                  Bind Identity & Join Section
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
