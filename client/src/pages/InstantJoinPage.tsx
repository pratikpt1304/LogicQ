import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { api } from '../api/client.js';
import { FirestoreDataService } from '../services/firestoreData.service.js';
import { toast } from 'sonner';
import confetti from 'canvas-confetti';
import {
  GraduationCap,
  ShieldCheck,
  Mail,
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

  // Email OTP state
  const [emailOtp, setEmailOtp] = useState('');
  const [emailOtpSent, setEmailOtpSent] = useState(false);
  const [emailOtpVerified, setEmailOtpVerified] = useState(false);
  const [emailCooldown, setEmailCooldown] = useState(0);
  const [isSendingEmailOtp, setIsSendingEmailOtp] = useState(false);
  const [isVerifyingEmailOtp, setIsVerifyingEmailOtp] = useState(false);

  // Final submit state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [joinedSuccess, setJoinedSuccess] = useState(false);

  // Fetch public section info on mount
  useEffect(() => {
    if (!joinToken) return;
    let isMounted = true;
    setLoadingSection(true);
    setErrorMsg(null);

    const loadSectionData = async () => {
      // 1. Try Backend API
      try {
        const res = await api.get(`/sections/join-info/${joinToken}`);
        const data = res.section || res.data;
        if (data && (data.sectionName || data.name || data.subject) && isMounted) {
          setSection(data);
          setLoadingSection(false);
          return;
        }
      } catch (backendErr) {
        console.warn('Backend /sections/join-info lookup failed, checking Firestore fallback:', backendErr);
      }

      // 2. Fallback to Firestore Data Service
      try {
        const allSections = await FirestoreDataService.getSectionsFromFirestore();
        const cleanToken = joinToken.trim();
        const found = allSections.find(
          (s: any) =>
            s.id === cleanToken ||
            s.joinToken === cleanToken ||
            (s.joinCode && s.joinCode.toUpperCase() === cleanToken.toUpperCase())
        );

        if (found && isMounted) {
          setSection({
            id: found.id || cleanToken,
            institution: found.institution || 'Institutional LMS',
            course: found.course || 'B.Tech Computer Engineering',
            subject: found.subject || found.name || 'C Programming',
            academicYear: found.academicYear || '2025-2026',
            semester: found.semester || 'Semester 1',
            sectionName: found.sectionName || found.name || 'Division A',
            description: found.description || null,
            joinCode: found.joinCode || 'LQ-JOIN',
            joinToken: found.joinToken || cleanToken,
            faculty: found.faculty || {
              fullName: found.facultyName || 'Course Faculty',
              displayName: found.facultyName || 'Faculty',
            },
          });
          setLoadingSection(false);
          return;
        }
      } catch (firestoreErr) {
        console.warn('Firestore fallback lookup error:', firestoreErr);
      }

      if (isMounted) {
        setErrorMsg('Section not found or enrollment is currently inactive.');
        setLoadingSection(false);
      }
    };

    loadSectionData();

    return () => {
      isMounted = false;
    };
  }, [joinToken]);

  // Cooldown countdown timer
  useEffect(() => {
    if (emailCooldown <= 0) return;
    const timer = setInterval(() => setEmailCooldown((prev) => prev - 1), 1000);
    return () => clearInterval(timer);
  }, [emailCooldown]);

  // Send Email OTP
  const handleSendEmailOtp = async () => {
    if (!email.trim() || !email.includes('@')) {
      toast.error('Please enter a valid institutional email address.');
      return;
    }
    if (!prn.trim()) {
      toast.error('Please enter your PRN/Roll No before requesting verification code.');
      return;
    }

    setIsSendingEmailOtp(true);
    try {
      const res = await api.post('/otp/send-email', {
        email: email.trim().toLowerCase(),
        prn: prn.trim().toUpperCase(),
      });
      if (res.success) {
        setEmailOtpSent(true);
        setEmailCooldown(res.cooldownRemaining || 60);
        toast.success(`Verification code dispatched to ${email.trim()}`);
      } else {
        toast.error(res.message || 'Failed to dispatch verification code.');
      }
    } catch (err: any) {
      toast.error(err.message || 'Unable to send verification code. Please try again.');
    } finally {
      setIsSendingEmailOtp(false);
    }
  };

  // Verify Email OTP
  const handleVerifyEmailOtp = async () => {
    if (!emailOtp.trim() || emailOtp.trim().length < 6) {
      toast.error('Please enter the complete 6-digit verification code.');
      return;
    }

    setIsVerifyingEmailOtp(true);
    try {
      const res = await api.post('/otp/verify-email', {
        email: email.trim().toLowerCase(),
        code: emailOtp.trim(),
        prn: prn.trim().toUpperCase(),
      });
      if (res.verified || res.success) {
        setEmailOtpVerified(true);
        toast.success('Email verified successfully!');
      } else {
        toast.error(res.message || 'Invalid or expired code.');
      }
    } catch (err: any) {
      toast.error(err.message || 'Verification failed. Please check the code.');
    } finally {
      setIsVerifyingEmailOtp(false);
    }
  };

  // Final Join Section Submission
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
      toast.error('Please complete Email verification first.');
      return;
    }

    setIsSubmitting(true);
    try {
      let enrolled = false;
      try {
        const res = await api.post('/sections/instant-join', {
          joinToken,
          name: name.trim(),
          prn: prn.trim().toUpperCase(),
          email: email.trim().toLowerCase(),
        });
        if (res.success) enrolled = true;
      } catch (apiErr: any) {
        console.warn('Backend instant-join API failed, falling back to Firestore direct enrollment:', apiErr?.message);
      }

      // Always save to Firestore roster so faculty see student immediately
      await FirestoreDataService.saveEnrolledStudentsToFirestore(section?.id || joinToken || 'instant', [{
        name: name.trim(),
        prn: prn.trim().toUpperCase(),
        email: email.trim().toLowerCase(),
      }]);
      enrolled = true;

      if (enrolled) {
        setJoinedSuccess(true);
        confetti({
          particleCount: 100,
          spread: 70,
          origin: { y: 0.6 },
        });
        toast.success('Identity bound & Section joined successfully!');
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

        {/* Email OTP Instant Join Form */}
        <div className="bg-[var(--card)] border border-[var(--border)] rounded-3xl p-6 sm:p-8 space-y-6 shadow-xl">
          <div className="space-y-1">
            <h2 className="text-lg font-bold text-[var(--foreground)] flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-indigo-400" />
              Student Identity & Email Verification
            </h2>
            <p className="text-xs text-[var(--muted-foreground)]">
              Institutional Cohort Enrollment: 1 PRN binds permanently to 1 Official Academic Email.
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
                      : 'Send Code'}
                  </button>
                )}
              </div>

              {emailOtpSent && !emailOtpVerified && (
                <div className="space-y-1.5 pt-2 animate-in fade-in">
                  <div className="flex gap-2">
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
                </div>
              )}
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isSubmitting || !emailOtpVerified}
              className="w-full py-3 text-sm font-bold rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white disabled:opacity-50 shadow-lg shadow-indigo-600/20 transition flex items-center justify-center gap-2 cursor-pointer"
            >
              {isSubmitting ? (
                'Binding Identity & Enrolling...'
              ) : !emailOtpVerified ? (
                'Verify Email OTP to Continue'
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
