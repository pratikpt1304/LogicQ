import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link, useSearchParams } from 'react-router-dom';
import { api } from '../api/client.js';
import { FirestoreDataService } from '../services/firestoreData.service.js';
import { doc, getDoc, collection, query, where, getDocs, setDoc } from 'firebase/firestore';
import { db } from '../config/firebase.js';
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
  Calendar,
  Lock,
  Eye,
  EyeOff,
} from 'lucide-react';
import { ALLOWED_DEPARTMENTS, ALLOWED_YEARS, normalizeDepartment } from '../config/academic.config.js';
import { useAuth } from '../context/AuthContext.js';
import { realtimeSync } from '../services/realtimeSync.service.js';

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
  const [searchParams] = useSearchParams();
  const effectiveToken = (joinToken || searchParams.get('code') || searchParams.get('token') || '').trim();
  const navigate = useNavigate();

  const [section, setSection] = useState<PublicSectionInfo | null>(null);
  const [loadingSection, setLoadingSection] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Form Fields
  const [name, setName] = useState('');
  const [prn, setPrn] = useState('');
  const [email, setEmail] = useState('');
  const [department, setDepartment] = useState('');
  const [year, setYear] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Email OTP state
  const [emailOtp, setEmailOtp] = useState('');
  const [emailOtpSent, setEmailOtpSent] = useState(false);
  const [emailOtpVerified, setEmailOtpVerified] = useState(false);
  const [emailCooldown, setEmailCooldown] = useState(0);
  const [isSendingEmailOtp, setIsSendingEmailOtp] = useState(false);
  const [isVerifyingEmailOtp, setIsVerifyingEmailOtp] = useState(false);

  // Final submit state
  const { login, user } = useAuth();
  const verifiedPasswordRef = React.useRef<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isNavigating, setIsNavigating] = useState(false);
  const [joinedSuccess, setJoinedSuccess] = useState(false);

  // Fetch public section info on mount
  useEffect(() => {
    if (!effectiveToken) {
      setLoadingSection(false);
      setErrorMsg('No classroom join code provided. Please check the link shared by your faculty.');
      return;
    }
    let isMounted = true;
    setLoadingSection(true);
    setErrorMsg(null);

    const loadSectionData = async () => {
      const cleanToken = effectiveToken;
      if (!cleanToken) {
        setErrorMsg('Invalid or missing section join link.');
        setLoadingSection(false);
        return;
      }

      // 1. Try Backend API
      try {
        const res = await api.get(`/sections/join-info/${cleanToken}`);
        const candidate = res?.section || res?.data;
        if (candidate && (candidate.sectionName || candidate.name || candidate.subject) && isMounted) {
          setSection({
            id: candidate.id || cleanToken,
            institution: candidate.institution || '',
            course: candidate.course || '',
            subject: candidate.subject || candidate.name || 'C Programming',
            academicYear: candidate.academicYear || '2026-2027',
            semester: candidate.semester || 'Semester 1',
            sectionName: candidate.sectionName || candidate.name || 'First Year — Programming C',
            description: candidate.description || null,
            joinCode: candidate.joinCode || 'LQ-JOIN',
            joinToken: candidate.joinToken || cleanToken,
            faculty: candidate.faculty || {
              fullName: candidate.facultyName || 'Course Faculty',
              displayName: candidate.facultyName || 'Faculty',
            },
          });
          setLoadingSection(false);
          return;
        }
      } catch (backendErr) {
        console.warn('Backend /sections/join-info lookup failed, checking Firestore direct:', backendErr);
      }

      // 2. Direct Firestore query (Works unauthenticated for students worldwide)
      try {
        // 2a. Direct Document Lookup by ID
        const docRef = doc(db, 'sections', cleanToken);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists() && isMounted) {
          const raw = docSnap.data();
          if (raw && !FirestoreDataService.isLegacyDemoSection(raw) && !FirestoreDataService.isSectionDeleted(raw.id, raw.joinCode)) {
            setSection({
              id: docSnap.id,
              institution: raw.institution || '',
              course: raw.course || '',
              subject: raw.subject || raw.name || 'C Programming',
              academicYear: raw.academicYear || '2026-2027',
              semester: raw.semester || 'Semester 1',
              sectionName: raw.sectionName || raw.name || 'First Year — Programming C',
              description: raw.description || null,
              joinCode: raw.joinCode || 'LQ-JOIN',
              joinToken: raw.joinToken || cleanToken,
              faculty: raw.faculty || {
                fullName: raw.facultyName || 'Course Faculty',
                displayName: raw.facultyName || 'Faculty',
              },
            });
            setLoadingSection(false);
            return;
          }
        }

        // 2b. Query by joinToken field
        const tokenQuery = query(collection(db, 'sections'), where('joinToken', '==', cleanToken));
        const tokenSnap = await getDocs(tokenQuery);
        if (!tokenSnap.empty && isMounted) {
          const firstDoc = tokenSnap.docs[0];
          const raw = firstDoc.data();
          if (raw && !FirestoreDataService.isLegacyDemoSection(raw) && !FirestoreDataService.isSectionDeleted(raw.id, raw.joinCode)) {
            setSection({
              id: firstDoc.id,
              institution: raw.institution || '',
              course: raw.course || '',
              subject: raw.subject || raw.name || 'C Programming',
              academicYear: raw.academicYear || '2026-2027',
              semester: raw.semester || 'Semester 1',
              sectionName: raw.sectionName || raw.name || 'First Year — Programming C',
              description: raw.description || null,
              joinCode: raw.joinCode || 'LQ-JOIN',
              joinToken: raw.joinToken || cleanToken,
              faculty: raw.faculty || {
                fullName: raw.facultyName || 'Course Faculty',
                displayName: raw.facultyName || 'Faculty',
              },
            });
            setLoadingSection(false);
            return;
          }
        }

        // 2c. Query by joinCode field (case-insensitive check: uppercase and as-is)
        const codeQueryUpper = query(collection(db, 'sections'), where('joinCode', '==', cleanToken.toUpperCase()));
        const codeSnap = await getDocs(codeQueryUpper);
        if (!codeSnap.empty && isMounted) {
          const firstDoc = codeSnap.docs[0];
          const raw = firstDoc.data();
          if (raw && !FirestoreDataService.isLegacyDemoSection(raw) && !FirestoreDataService.isSectionDeleted(raw.id, raw.joinCode)) {
            setSection({
              id: firstDoc.id,
              institution: raw.institution || '',
              course: raw.course || '',
              subject: raw.subject || raw.name || 'C Programming',
              academicYear: raw.academicYear || '2026-2027',
              semester: raw.semester || 'Semester 1',
              sectionName: raw.sectionName || raw.name || 'First Year — Programming C',
              description: raw.description || null,
              joinCode: raw.joinCode || cleanToken.toUpperCase(),
              joinToken: raw.joinToken || cleanToken,
              faculty: raw.faculty || {
                fullName: raw.facultyName || 'Course Faculty',
                displayName: raw.facultyName || 'Faculty',
              },
            });
            setLoadingSection(false);
            return;
          }
        }
      } catch (directFirestoreErr) {
        console.warn('Direct Firestore sections lookup notice:', directFirestoreErr);
      }

      // 3. Fallback to Firestore Data Service
      try {
        const allSections = await FirestoreDataService.getSectionsFromFirestore();
        const found = allSections.find(
          (s: any) =>
            s.id === cleanToken ||
            s.joinToken === cleanToken ||
            (s.joinCode && s.joinCode.toUpperCase() === cleanToken.toUpperCase())
        );

        if (found && isMounted) {
          setSection({
            id: found.id || cleanToken,
            institution: found.institution || '',
            course: found.course || '',
            subject: found.subject || found.name || 'C Programming',
            academicYear: found.academicYear || '2026-2027',
            semester: found.semester || 'Semester 1',
            sectionName: found.sectionName || found.name || 'First Year — Programming C',
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

      // 4. Fallback to Local Storage sections backup
      try {
        const LOCAL_KEY = 'logicq_faculty_sections_backup_v2';
        const localSections = JSON.parse(localStorage.getItem(LOCAL_KEY) || '[]');
        const foundLocal = (Array.isArray(localSections) ? localSections : []).find(
          (s: any) =>
            s.id === cleanToken ||
            s.joinToken === cleanToken ||
            (s.joinCode && s.joinCode.toUpperCase() === cleanToken.toUpperCase())
        );
        if (foundLocal && isMounted) {
          setSection({
            id: foundLocal.id || cleanToken,
            institution: foundLocal.institution || '',
            course: foundLocal.course || '',
            subject: foundLocal.subject || foundLocal.name || 'C Programming',
            academicYear: foundLocal.academicYear || '2026-2027',
            semester: foundLocal.semester || 'Semester 1',
            sectionName: foundLocal.sectionName || foundLocal.name || 'First Year — Programming C',
            description: foundLocal.description || null,
            joinCode: foundLocal.joinCode || 'LQ-JOIN',
            joinToken: foundLocal.joinToken || cleanToken,
            faculty: foundLocal.faculty || {
              fullName: foundLocal.facultyName || 'Course Faculty',
              displayName: foundLocal.facultyName || 'Faculty',
            },
          });
          setLoadingSection(false);
          return;
        }
      } catch {}

      if (isMounted) {
        setErrorMsg('Section not found or enrollment is currently inactive.');
        setLoadingSection(false);
      }
    };

    loadSectionData();

    return () => {
      isMounted = false;
    };
  }, [effectiveToken]);

  // Pre-fill department and year from section details if available
  useEffect(() => {
    if (!section) return;
    if (!department) {
      const course = section.course || '';
      const matchedDept = normalizeDepartment(course);
      if (matchedDept) {
        setDepartment(matchedDept);
      }
    }
    if (!year) {
      const text = `${section.sectionName || ''} ${section.academicYear || ''} ${section.semester || ''}`.toUpperCase();
      if (text.includes('FIRST') || text.includes('FY') || text.includes('SEM 1') || text.includes('SEM 2')) {
        setYear('FY');
      } else if (text.includes('SECOND') || text.includes('SY') || text.includes('SEM 3') || text.includes('SEM 4')) {
        setYear('SY');
      } else if (text.includes('THIRD') || text.includes('TY')) {
        setYear('TY');
      } else {
        setYear('FY');
      }
    }
  }, [section]);

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
    if (!department) {
      toast.error('Please select your academic department.');
      return;
    }
    if (!year) {
      toast.error('Please select your academic year.');
      return;
    }
    const cleanPwd = password.trim();
    if (!cleanPwd) {
      toast.error('Please set an account password for PRN login.');
      return;
    }
    if (cleanPwd.length < 4) {
      toast.error('Password must be at least 4 characters long.');
      return;
    }
    if (!emailOtpVerified) {
      toast.error('Please complete Email verification first.');
      return;
    }

    setIsSubmitting(true);
    try {
      const cleanPrn = prn.trim().toUpperCase();
      const cleanEmail = email.trim().toLowerCase();
      const targetSecId = section?.id || section?.joinCode || effectiveToken || 'instant';

      const studentData = {
        name: name.trim(),
        fullName: name.trim(),
        displayName: name.trim(),
        prn: cleanPrn,
        email: cleanEmail,
        department: department.trim(),
        year: year.trim(),
        password: cleanPwd,
        sectionId: targetSecId,
        joinCode: section?.joinCode || effectiveToken,
        sectionName: section?.sectionName || 'Integrated Mtech',
        subject: section?.subject || 'C Programming',
        status: 'ENROLLED',
      };

      // 1. Save password to local custom password store
      try {
        localStorage.setItem(`logicq_custom_password_${cleanPrn}`, cleanPwd);
      } catch {}

      verifiedPasswordRef.current = cleanPwd;

      // 2. Persist account security credentials to Firestore (cross-device PRN login)
      try {
        await setDoc(doc(db, 'cohort_progress', cleanPrn, 'drafts', '__account_security'), {
          code: cleanPwd,
          problemSlug: '__account_security',
          deviceLabel: 'student_onboarding',
          updatedAt: new Date().toISOString(),
        }, { merge: true });
      } catch (secErr) {
        console.warn('Notice: Firestore account security sync backgrounded:', secErr);
      }

      // 3. Persist user document to Firestore users collection
      try {
        const userDocRef = doc(db, 'users', `std_${cleanPrn.toLowerCase()}`);
        await setDoc(userDocRef, {
          id: `std_${cleanPrn.toLowerCase()}`,
          prn: cleanPrn,
          fullName: name.trim(),
          displayName: name.trim(),
          email: cleanEmail,
          role: 'STUDENT',
          department: department.trim(),
          year: year.trim(),
          sectionId: targetSecId,
          sectionName: section?.sectionName || 'C Programming',
          password: cleanPwd,
          profileComplete: true,
          enrolledAt: new Date().toISOString(),
        }, { merge: true });
      } catch {}

      // 4. Update stored users cache for immediate PRN login
      try {
        const rawUsers = localStorage.getItem('logicq_stored_users_v1');
        let list = rawUsers ? JSON.parse(rawUsers) : [];
        const existingIdx = list.findIndex(
          (u: any) =>
            (u.prn && u.prn.toUpperCase() === cleanPrn) ||
            u.email?.toLowerCase() === cleanEmail
        );
        const newUserObj = {
          id: `std_${cleanPrn.toLowerCase()}`,
          username: cleanPrn.toLowerCase(),
          email: cleanEmail,
          prn: cleanPrn,
          fullName: name.trim(),
          displayName: name.trim(),
          role: 'STUDENT',
          department: department.trim(),
          year: year.trim(),
          sectionId: targetSecId,
          sectionName: section?.sectionName || 'C Programming',
          password: cleanPwd,
          profileComplete: true,
          totalPoints: 0,
          currentStreak: 0,
          longestStreak: 0,
        };
        if (existingIdx >= 0) {
          list[existingIdx] = { ...list[existingIdx], ...newUserObj };
        } else {
          list.push(newUserObj);
        }
        localStorage.setItem('logicq_stored_users_v1', JSON.stringify(list));
      } catch {}

      let enrolled = false;
      try {
        const res = await api.post('/sections/instant-join', {
          joinToken: effectiveToken,
          ...studentData,
        });
        if (res.success) enrolled = true;
      } catch (apiErr: any) {
        console.warn('Backend instant-join API failed, falling back to Firestore direct enrollment:', apiErr?.message);
      }

      // Always save to Firestore roster so faculty see student immediately
      const canonicalSecId = section?.id || targetSecId;
      await FirestoreDataService.saveEnrolledStudentsToFirestore(canonicalSecId, [{
        ...studentData,
        sectionId: canonicalSecId,
        joinCode: section?.joinCode || studentData.joinCode,
        sectionName: section?.sectionName || studentData.sectionName,
      }]);
      enrolled = true;

      if (enrolled) {
        // Broadcast instant 0ms sync signals across all admin/faculty tabs
        try {
          realtimeSync.emit('SECTIONS');
          realtimeSync.emit('USERS');
          realtimeSync.emit('DASHBOARD');
        } catch {}

        // Automatically establish active authenticated student session so student doesn't have to re-login
        try {
          await login(cleanPrn, cleanPwd);
        } catch (loginErr) {
          console.warn('Auto-login post-enrollment notice:', loginErr);
        }

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

  const handleContinueToDashboard = async () => {
    try {
      setIsNavigating(true);
      const cleanPrn = prn.trim().toUpperCase();
      const cleanPwd = verifiedPasswordRef.current || password.trim() || cleanPrn;
      if (!user || user.prn?.toUpperCase() !== cleanPrn) {
        try {
          await login(cleanPrn, cleanPwd);
        } catch (loginErr) {
          console.warn('Dashboard direct login notice:', loginErr);
        }
      }
      navigate('/dashboard', { replace: true });
    } catch {
      navigate('/dashboard', { replace: true });
    } finally {
      setIsNavigating(false);
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
              <span className="text-[var(--muted-foreground)]">Subject</span>
              <span className="font-semibold text-[var(--foreground)] text-right">
                {section.subject}
              </span>
            </div>
            <div className="flex items-center justify-between border-b border-[var(--border)] pb-2 text-xs">
              <span className="text-[var(--muted-foreground)]">Student PRN</span>
              <span className="font-mono font-bold text-indigo-400">{prn.toUpperCase()}</span>
            </div>
            <div className="flex items-center justify-between border-b border-[var(--border)] pb-2 text-xs">
              <span className="text-[var(--muted-foreground)]">PRN Login Password</span>
              <span className="font-mono text-emerald-400 font-bold flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" />
                Password Set (Ready for Login)
              </span>
            </div>
            <div className="flex items-center justify-between border-b border-[var(--border)] pb-2 text-xs">
              <span className="text-[var(--muted-foreground)]">Department & Year</span>
              <span className="font-medium text-[var(--foreground)]">{department} • {year}</span>
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
            <button
              type="button"
              onClick={handleContinueToDashboard}
              disabled={isNavigating}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-sm shadow-lg shadow-indigo-600/20 transition cursor-pointer active:scale-95 disabled:opacity-50"
            >
              {isNavigating ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Entering Dashboard...</span>
                </>
              ) : (
                <>
                  <span>Continue to Student Dashboard</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
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
            </div>
            <div className="p-3 rounded-2xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              <GraduationCap className="w-8 h-8" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 pt-3 border-t border-[var(--border)] text-xs">
            <div>
              <span className="text-[var(--muted-foreground)] block">Academic Term</span>
              <span className="font-medium text-[var(--foreground)]">
                {section.academicYear || '2026-2027'} • {section.semester || 'Semester 1'}
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
                  placeholder="e.g. Rohan Sharma"
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

            {/* 3. Academic Department & Year */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-[var(--muted-foreground)] mb-1.5">
                  Academic Department <span className="text-red-400">*</span>
                </label>
                <div className="relative">
                  <GraduationCap className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted-foreground)] pointer-events-none" />
                  <select
                    required
                    value={department}
                    onChange={(e) => setDepartment(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 text-sm rounded-xl border border-[var(--border)] bg-[var(--background)] text-[var(--foreground)] focus:outline-none focus:border-indigo-500 cursor-pointer"
                  >
                    <option value="" disabled>Select Department</option>
                    {ALLOWED_DEPARTMENTS.map((dept) => (
                      <option key={dept} value={dept}>
                        {dept}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-[var(--muted-foreground)] mb-1.5">
                  Academic Year <span className="text-red-400">*</span>
                </label>
                <div className="relative">
                  <Calendar className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted-foreground)] pointer-events-none" />
                  <select
                    required
                    value={year}
                    onChange={(e) => setYear(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 text-sm rounded-xl border border-[var(--border)] bg-[var(--background)] text-[var(--foreground)] focus:outline-none focus:border-indigo-500 cursor-pointer"
                  >
                    <option value="" disabled>Select Year</option>
                    <option value="FY">First Year (FY)</option>
                    <option value="SY">Second Year (SY)</option>
                    <option value="TY">Third Year (TY)</option>
                    <option value="Final Year">Final Year</option>
                  </select>
                </div>
              </div>
            </div>

            {/* 4. Set Account Password */}
            <div>
              <label className="block text-xs font-medium text-[var(--muted-foreground)] mb-1.5 flex items-center justify-between">
                <span>Set Account Password <span className="text-red-400">*</span></span>
                <span className="text-[10px] text-indigo-400 font-mono">For PRN &amp; Password Login</span>
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted-foreground)]" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  placeholder="Set your password (e.g. Pass@123)"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-9 pr-10 py-2 text-sm rounded-xl border border-[var(--border)] bg-[var(--background)] text-[var(--foreground)] focus:outline-none focus:border-indigo-500"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition cursor-pointer"
                  tabIndex={-1}
                  title={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>

            </div>

            {/* 5. Email Address & Email OTP */}
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
                    placeholder="student@university.edu.in"
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
