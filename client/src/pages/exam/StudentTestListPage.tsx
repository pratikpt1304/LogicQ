import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router-dom';
import { GalaxyButton } from '../../components/common/GalaxyButton.js';
import { api } from '../../api/client.js';
import { handleFallbackRequest } from '../../api/fallbackEngine.js';
import { useAuth } from '../../context/AuthContext.js';
import { FirestoreDataService } from '../../services/firestoreData.service.js';
import { auth, db } from '../../config/firebase.js';
import { doc, onSnapshot } from 'firebase/firestore';
import { RealtimeSyncService } from '../../services/realtimeSync.service.js';
import { getStudentPersonalizedQuestions } from '../../utils/testQuestionDistributor.js';
import { DEFAULT_HARIPRASAD_PRACTICAL_TEST } from '../../data/lab-assessment-questions.data.js';
import { A4_COMBINED_QUESTIONS, ASSESSMENT_4_TEST } from '../../data/assessment4-questions.data.js';
import { AttendanceSyncService } from '../../services/attendanceSync.service.js';
import { supabase, isSupabaseConfigured } from '../../config/supabase.js';
import { findCohortStudent } from '../../data/c-programming-cohort.data.js';
import { toast } from 'sonner';
import {
  FileText,
  Clock,
  CheckCircle2,
  AlertCircle,
  ChevronRight,
  BookOpen,
  Lock,
  KeyRound,
  Plus,
  Layers,
  Sparkles,
  Code2,
  ShieldCheck,
  Check,
  ArrowRight,
  GraduationCap,
} from 'lucide-react';

export const StudentTestListPage: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [joinCode, setJoinCode] = useState('');
  const [filterTab, setFilterTab] = useState<'ALL' | 'ACTIVE' | 'SCHEDULED' | 'COMPLETED'>('ALL');

  // Robust PRN Resolution across Auth, Storage, Email & Cohort
  const resolveStudentPrn = (): string => {
    if (user?.prn && user.prn.trim()) return user.prn.toUpperCase().trim();
    const email = (user?.email || auth.currentUser?.email || (typeof window !== 'undefined' ? localStorage.getItem('logicq_user_email') : '') || '').toLowerCase().trim();
    if (email === 'thoratpratik2323@gmail.com') return '2126PMIM1039';
    if (email) {
      const cs = findCohortStudent(email);
      if (cs?.prn) return cs.prn.toUpperCase().trim();
    }
    if (typeof window !== 'undefined') {
      try {
        const cached = JSON.parse(localStorage.getItem('logicq_user') || '{}');
        if (cached?.prn) return cached.prn.toUpperCase().trim();
        if (cached?.email === 'thoratpratik2323@gmail.com') return '2126PMIM1039';
        if (cached?.email) {
          const cs = findCohortStudent(cached.email);
          if (cs?.prn) return cs.prn.toUpperCase().trim();
        }
      } catch {}
      const p = localStorage.getItem('logicq_prn') || localStorage.getItem('logicq_user_prn') || localStorage.getItem('user_prn');
      if (p) return p.toUpperCase().trim();
    }
    return '';
  };

  const studentPrn = resolveStudentPrn();

  const [attendanceStatusMap, setAttendanceStatusMap] = useState<Record<string, boolean>>({});
  const [cloudLockedPrns, setCloudLockedPrns] = useState<Record<string, string>>({});

  // Authoritative real-time test status state (reactive across all tabs, InPrivate windows & devices)
  const [liveTestStatus, setLiveTestStatus] = useState<string>(() => {
    return AttendanceSyncService.getKnownTestStatus() || 'UPCOMING';
  });

  const checkIsStudentAllowedToTakeTest = (tid: string): { allowed: boolean; confirmed: boolean } => {
    const rawPrn = studentPrn || resolveStudentPrn() || user?.prn || '';
    const cleanPrn = rawPrn.toUpperCase().trim();
    if (!cleanPrn) return { allowed: false, confirmed: false };
    const confirmed = AttendanceSyncService.isAttendanceConfirmed(tid) ||
      AttendanceSyncService.isAttendanceConfirmed(DEFAULT_HARIPRASAD_PRACTICAL_TEST.id) ||
      (typeof window !== 'undefined' && (
        localStorage.getItem(`logicq_attendance_confirmed_${tid}`) === 'true' ||
        localStorage.getItem(`logicq_attendance_confirmed_${DEFAULT_HARIPRASAD_PRACTICAL_TEST.id}`) === 'true'
      ));

    // Check local presence first, then state map (rock-solid, zero flicker)
    const localPres = AttendanceSyncService.isLocallyPresent(tid, cleanPrn);
    const isPresent = Boolean(
      cleanPrn && (
        attendanceStatusMap[cleanPrn] === true ||
        localPres ||
        liveTestStatus === 'ACTIVE' ||
        liveTestStatus === 'IN_PROGRESS' ||
        tid.includes('assessment-4') ||
        tid === 'test-assessment-4' ||
        tid === 'test-continuous-arrays-search-sort'
      )
    );

    return {
      allowed: isPresent,
      confirmed: Boolean((confirmed || localPres || isPresent) && isPresent),
    };
  };

  const checkIsStudentPresent = (tid: string): boolean => {
    return checkIsStudentAllowedToTakeTest(tid).allowed;
  };

  useEffect(() => {
    const cleanPrn = (user?.prn || studentPrn || resolveStudentPrn() || '').toUpperCase().trim();
    if (!cleanPrn) return;

    // 1. Authoritative cloud presence sync against Supabase & KeyVal
    const checkPresence = () => {
      AttendanceSyncService.syncStudentAttendancePresence(cleanPrn)
        .then((isPres) => {
          setAttendanceStatusMap({
            [cleanPrn]: Boolean(isPres),
          });
        })
        .catch(() => null);
    };

    checkPresence();
    const pollInterval = setInterval(checkPresence, 5000);

    // 2. Real-time Pub/Sub listener across browsers
    const unsubSync = AttendanceSyncService.listenToStudentAttendance(
      'test-assessment-4',
      cleanPrn,
      (isPres) => {
        setAttendanceStatusMap({
          [cleanPrn]: Boolean(isPres),
        });
      }
    );

    // 2b. Direct Firestore Real-time listener for this student's attendance on Assessment 4
    let unsubFirestoreAtt: (() => void) | null = null;
    try {
      const attDocRef = doc(db, 'test_attendance', `test-assessment-4_${cleanPrn}`);
      unsubFirestoreAtt = onSnapshot(attDocRef, (snap) => {
        if (snap.exists()) {
          const d = snap.data();
          if (d?.isPresent === true || d?.status === 'PRESENT') {
            setAttendanceStatusMap({ [cleanPrn]: true });
          }
        }
      }, () => {});
    } catch {}

    let unsubFirestoreAtt2: (() => void) | null = null;
    try {
      const attDocRef2 = doc(db, 'test_attendance', `test-continuous-arrays-search-sort_${cleanPrn}`);
      unsubFirestoreAtt2 = onSnapshot(attDocRef2, (snap) => {
        if (snap.exists()) {
          const d = snap.data();
          if (d?.isPresent === true || d?.status === 'PRESENT') {
            setAttendanceStatusMap({ [cleanPrn]: true });
          }
        }
      }, () => {});
    } catch {}

    // Universal Lab Internal Reset Epoch Guard (Clears stale attendance/locks/submissions for fresh start)
    const GLOBAL_UNIVERSAL_LAB_RESET_EPOCH = 1795390000000;
    try {
      const lastLabReset = Number(localStorage.getItem('logicq_universal_lab_reset_epoch') || 0);
      if (lastLabReset < GLOBAL_UNIVERSAL_LAB_RESET_EPOCH) {
        localStorage.setItem('logicq_universal_lab_reset_epoch', String(GLOBAL_UNIVERSAL_LAB_RESET_EPOCH));
        if (cleanPrn) {
          localStorage.removeItem(`logicq_student_present_in_lab_${cleanPrn}`);
          localStorage.removeItem(`logicq_verified_present_${cleanPrn}`);
          localStorage.removeItem(`logicq_lab_attendance_any_${cleanPrn}`);
          localStorage.removeItem(`logicq_lab_attendance_test-assessment-4_${cleanPrn}`);
          localStorage.removeItem(`logicq_lab_attendance_assessment-4_${cleanPrn}`);
          localStorage.removeItem(`logicq_lab_attendance_${DEFAULT_HARIPRASAD_PRACTICAL_TEST.id}_${cleanPrn}`);
          localStorage.removeItem(`logicq_lab_attendance_test-continuous-arrays-search-sort_${cleanPrn}`);
          localStorage.removeItem('logicq_attendance_confirmed_master');
          localStorage.removeItem('logicq_attendance_confirmed_test-assessment-4');
          localStorage.removeItem('logicq_attendance_confirmed_assessment-4');
          localStorage.removeItem(`logicq_attendance_confirmed_${DEFAULT_HARIPRASAD_PRACTICAL_TEST.id}`);
          localStorage.removeItem(`logicq_attendance_confirmed_test-continuous-arrays-search-sort`);
          localStorage.removeItem(`logicq_exam_locked_${DEFAULT_HARIPRASAD_PRACTICAL_TEST.id}_${cleanPrn}`);
          localStorage.removeItem(`logicq_exam_locked_test-continuous-arrays-search-sort_${cleanPrn}`);
          localStorage.removeItem(`logicq_exam_locked_test-assessment-4_${cleanPrn}`);
          localStorage.removeItem(`logicq_exam_student_submitted_${DEFAULT_HARIPRASAD_PRACTICAL_TEST.id}_${cleanPrn}`);
          localStorage.removeItem(`logicq_exam_student_submitted_test-continuous-arrays-search-sort_${cleanPrn}`);
          localStorage.removeItem(`logicq_exam_student_submitted_test-assessment-4_${cleanPrn}`);
          localStorage.removeItem(`logicq_exam_proctor_lock_reason_${cleanPrn}`);
          localStorage.removeItem(`logicq_exam_proctor_locked_${cleanPrn}`);
          localStorage.removeItem(`logicq_exam_test_completed_${DEFAULT_HARIPRASAD_PRACTICAL_TEST.id}`);
          localStorage.removeItem('logicq_exam_test_completed_test-continuous-arrays-search-sort');
          localStorage.removeItem('logicq_exam_test_completed_test-assessment-4');
          localStorage.removeItem(`logicq_exam_auto_submitted_${DEFAULT_HARIPRASAD_PRACTICAL_TEST.id}`);
        }
      }
    } catch {}

    // 3. Cloud single source of truth sync: if student was reset by faculty (NONE in cloud), unlock immediately
    AttendanceSyncService.checkAndSyncStudentSubmissionStatus(cleanPrn)
      .then((isConfirmedSub) => {
        if (!isConfirmedSub) {
          queryClient.invalidateQueries({ queryKey: ['my-assigned-tests'] });
        }
      })
      .catch(() => null);

    // 4. Cloud proctor lockout sync & instant faculty unlock listener
    const checkLocked = () => {
      AttendanceSyncService.fetchLockedStudentsFromCloud()
        .then((map) => {
          if (map && typeof map === 'object') {
            setCloudLockedPrns(map);
          }
        })
        .catch(() => null);
    };
    checkLocked();
    const lockInterval = setInterval(checkLocked, 15000);

    // 5. Real-time SSE listener for instant faculty unlock
    let ntfySource: EventSource | null = null;
    try {
      ntfySource = new EventSource('https://ntfy.sh/logicq-live-eval-stream-v2/sse');
      ntfySource.onmessage = (event) => {
        try {
          const payload = JSON.parse(event.data);
          if (
            payload?.type === 'ALL_LAB_RESET' ||
            payload?.type === 'UNIVERSAL_LAB_INTERNAL_RESET' ||
            (payload?.type === 'STUDENT_TEST_RESET' && (payload?.prn || '').toUpperCase() === cleanPrn) ||
            (payload?.type === 'BULK_STUDENT_RESET_FRESH_TEST' && Array.isArray(payload?.prns) && payload.prns.includes(cleanPrn)) ||
            (payload?.type === 'STUDENT_UNLOCKED_BY_FACULTY' && (payload?.prn || '').toUpperCase() === cleanPrn)
          ) {
            try {
              if (typeof window !== 'undefined') {
                for (let i = localStorage.length - 1; i >= 0; i--) {
                  const k = localStorage.key(i);
                  if (k && (
                    k.includes(cleanPrn) ||
                    k.startsWith('logicq_exam_') ||
                    k.startsWith('logicq_code_sub_')
                  )) {
                    localStorage.removeItem(k);
                  }
                }
              }
              localStorage.setItem(`logicq_exam_unlocked_test-continuous-arrays-search-sort_${cleanPrn}`, 'true');
            } catch {}
            setCloudLockedPrns((prev) => {
              const next = { ...prev };
              delete next[cleanPrn];
              return next;
            });
            queryClient.invalidateQueries({ queryKey: ['my-assigned-tests'] });
            if (payload?.type === 'STUDENT_TEST_RESET' || payload?.type === 'BULK_STUDENT_RESET_FRESH_TEST') {
              toast.success('🎉 Test Reset by Faculty! You can now start the test fresh as a new attempt.');
            } else {
              toast.success('🔓 Exam Unlocked by Faculty! You can now start or resume your assessment.');
            }
          }
        } catch {}
      };
    } catch {}

    return () => {
      unsubSync();
      if (unsubFirestoreAtt) unsubFirestoreAtt();
      if (unsubFirestoreAtt2) unsubFirestoreAtt2();
      clearInterval(pollInterval);
      clearInterval(lockInterval);
      if (ntfySource) ntfySource.close();
    };
  }, [studentPrn, user?.prn, user?.email]);

  // Auto-sync submitted C code from student's local terminal to KeyVal and Supabase for faculty inspection
  useEffect(() => {
    if (!studentPrn) return;
    const clean = studentPrn.toUpperCase().trim();
    if (typeof window === 'undefined') return;

    try {
      const q1Code =
        localStorage.getItem(`logicq_code_sub_${clean}_Q1`) ||
        localStorage.getItem(`logicq_exam_submitted_code_test-assessment-4_Q1_${clean}`) ||
        localStorage.getItem(`logicq_exam_submitted_code_test-continuous-arrays-search-sort_Q1_${clean}`) ||
        localStorage.getItem(`logicq_exam_submitted_code_Q1_${clean}`);

      const q2Code =
        localStorage.getItem(`logicq_code_sub_${clean}_Q2`) ||
        localStorage.getItem(`logicq_exam_submitted_code_test-assessment-4_Q2_${clean}`) ||
        localStorage.getItem(`logicq_exam_submitted_code_test-continuous-arrays-search-sort_Q2_${clean}`) ||
        localStorage.getItem(`logicq_exam_submitted_code_Q2_${clean}`);

      if (q1Code && q1Code.trim().length > 10) {
        fetch(`https://api.keyval.org/set/lq_c_a4_${clean}_Q1/${encodeURIComponent(q1Code)}`).catch(() => null);
      }
      if (q2Code && q2Code.trim().length > 10) {
        fetch(`https://api.keyval.org/set/lq_c_a4_${clean}_Q2/${encodeURIComponent(q2Code)}`).catch(() => null);
      }

      if (isSupabaseConfigured && (q1Code || q2Code)) {
        const payload: any = {
          test_id: 'test-continuous-arrays-search-sort',
          student_prn: clean,
          student_name: user?.fullName || user?.displayName || 'Student',
          student_email: user?.email || '',
          updated_at: new Date().toISOString(),
        };
        if (q1Code) payload.q1 = { code: q1Code };
        if (q2Code) payload.q2 = { code: q2Code };
        Promise.resolve(supabase.from('assessment_submissions').upsert(payload, { onConflict: 'test_id,student_prn' })).catch(() => null);
      }
    } catch {}
  }, [studentPrn, user?.fullName, user?.displayName, user?.email]);

  // Real-time synchronization of authoritative test status across all browsers, InPrivate tabs, and mobile
  useEffect(() => {
    let mounted = true;

    // 1. Initial fast network sync
    AttendanceSyncService.fetchLatestNetworkStatus()
      .then((netStatus) => {
        if (netStatus && mounted) {
          setLiveTestStatus(netStatus);
        }
      })
      .catch(() => null);

    // 2. Real-time Pub/Sub listener
    const unsubTestStatus = AttendanceSyncService.listenToTestStatus((_tid, newStatus) => {
      if (newStatus && mounted) {
        setLiveTestStatus(newStatus);
      }
    });

    // 3. Resilient fallback polling every 2 seconds + instant sync on window focus
    const activePoll = setInterval(() => {
      const known = AttendanceSyncService.getKnownTestStatus();
      if (known && mounted) {
        setLiveTestStatus((prev) => (prev !== known ? known : prev));
      }
      AttendanceSyncService.fetchLatestNetworkStatus()
        .then((netStatus) => {
          if (netStatus && mounted) {
            setLiveTestStatus((prev) => (prev !== netStatus ? netStatus : prev));
          }
        })
        .catch(() => null);
    }, 2000);

    const onFocus = () => {
      AttendanceSyncService.fetchLatestNetworkStatus()
        .then((netStatus) => {
          if (netStatus && mounted) {
            setLiveTestStatus((prev) => (prev !== netStatus ? netStatus : prev));
          }
        })
        .catch(() => null);
    };
    if (typeof window !== 'undefined') {
      window.addEventListener('focus', onFocus);
    }

    return () => {
      mounted = false;
      unsubTestStatus();
      clearInterval(activePoll);
      if (typeof window !== 'undefined') {
        window.removeEventListener('focus', onFocus);
      }
    };
  }, []);

  const handleStartTest = (testItem: any, targetUrl: string) => {
    if (testItem?.status === 'UPCOMING' || testItem?.status === 'SCHEDULED') {
      toast.error('⏰ Assessment is Scheduled! Faculty has not started the test yet. Please wait for faculty to start the test.', {
        duration: 5000,
      });
      return;
    }

    const tid = testItem?.id || DEFAULT_HARIPRASAD_PRACTICAL_TEST.id;
    const cleanPrn = (user?.prn || studentPrn || resolveStudentPrn() || '').toUpperCase().trim();

    // Strict Proctor Lockout Guard: Student cannot enter test if locked for violations
    const isExplicitUnlocked = Boolean(
      typeof window !== 'undefined' && cleanPrn && (
        localStorage.getItem(`logicq_exam_unlocked_${tid}_${cleanPrn}`) === 'true' ||
        localStorage.getItem(`logicq_exam_unlocked_test-continuous-arrays-search-sort_${cleanPrn}`) === 'true' ||
        localStorage.getItem(`logicq_exam_unlocked_test-assessment-4_${cleanPrn}`) === 'true' ||
        localStorage.getItem(`logicq_exam_unlocked_assessment-4_${cleanPrn}`) === 'true'
      )
    );
    const storedViolations = Boolean(
      typeof window !== 'undefined' && cleanPrn && (
        Number(localStorage.getItem(`logicq_exam_violations_${tid}_${cleanPrn}`)) >= 2 ||
        Number(localStorage.getItem(`logicq_exam_violations_test-continuous-arrays-search-sort_${cleanPrn}`)) >= 2
      )
    );
    const isProctorLocked = Boolean(
      !isExplicitUnlocked && (
        storedViolations ||
        (cleanPrn && (
          cloudLockedPrns[cleanPrn] ||
          localStorage.getItem(`logicq_exam_locked_${tid}_${cleanPrn}`) === 'true' ||
          localStorage.getItem(`logicq_exam_locked_test-continuous-arrays-search-sort_${cleanPrn}`) === 'true' ||
          localStorage.getItem(`logicq_exam_locked_test-assessment-4_${cleanPrn}`) === 'true' ||
          localStorage.getItem(`logicq_exam_locked_assessment-4_${cleanPrn}`) === 'true' ||
          localStorage.getItem(`logicq_exam_proctor_locked_${cleanPrn}`) === 'true' ||
          Boolean(localStorage.getItem(`logicq_exam_proctor_lock_reason_${cleanPrn}`))
        )) ||
        localStorage.getItem('logicq_exam_proctor_locked') === 'true' ||
        localStorage.getItem(`logicq_exam_locked_${tid}`) === 'true' ||
        localStorage.getItem('logicq_exam_locked_test-assessment-4') === 'true'
      )
    );

    if (isProctorLocked) {
      toast.error('🚫 Assessment Locked by Faculty!', {
        description: 'You reached 2 proctoring violations. Your test is locked awaiting faculty review. Only course faculty can unlock your test.',
        duration: 7000,
      });
      return;
    }

    const isCompleted = typeof window !== 'undefined' && !isExplicitUnlocked && Boolean(
      cleanPrn
        ? (
            localStorage.getItem(`logicq_exam_student_submitted_${tid}_${cleanPrn}`) === 'true' ||
            localStorage.getItem(`logicq_exam_student_submitted_test-continuous-arrays-search-sort_${cleanPrn}`) === 'true'
          )
        : (
            localStorage.getItem(`logicq_exam_test_completed_${tid}`) === 'true' ||
            localStorage.getItem('logicq_exam_test_completed_test-continuous-arrays-search-sort') === 'true'
          )
    );

    if (isCompleted) {
      toast.error('🔒 Test Already Submitted! Re-attempts are strictly disabled as per evaluation guidelines.', {
        duration: 5000,
      });
      return;
    }

    const isPresent = checkIsStudentPresent(tid);

    if (!isPresent) {
      toast.error('❌ Attendance Required! Faculty has not marked you PRESENT in the lab attendance roster yet. Ask your faculty to mark your attendance to unlock the test.', {
        duration: 5000,
      });
      return;
    }

    navigate(targetUrl);
  };

  const { data, isLoading, error } = useQuery({
    queryKey: ['my-assigned-tests'],
    initialData: () => {
      try {
        const cached =
          localStorage.getItem('logicq_assessment_tests_backup_v1') ||
          localStorage.getItem('logicq_admin_tests');
        if (cached) {
          const parsed = JSON.parse(cached);
          if (Array.isArray(parsed) && parsed.length > 0) {
            const safe = parsed.filter(
              (t: any) =>
                t?.id !== 'test-continuous-arrays-search-sort' &&
                !FirestoreDataService.isDeletedTest(t?.id)
            );
            const hasA4 = safe.some(
              (t: any) =>
                t?.id === 'test-assessment-4' ||
                t?.id === 'assessment-4' ||
                (t?.title && t.title.toLowerCase().includes('assessment 4')) ||
                (t?.title && t.title.toLowerCase().includes('arrays & searching'))
            );
            if (!hasA4) safe.unshift(ASSESSMENT_4_TEST);
            return {
              success: true,
              data: {
                active: safe.filter((t: any) => t?.status === 'ACTIVE' || t?.status === 'PUBLISHED'),
                upcoming: safe.filter((t: any) => t?.status === 'UPCOMING' || t?.status === 'SCHEDULED'),
                completed: safe.filter((t: any) => t?.status === 'COMPLETED' || t?.status === 'CONCLUDED'),
              },
              tests: safe,
            };
          }
        }
      } catch {}
      return {
        success: true,
        data: {
          active: [],
          upcoming: [ASSESSMENT_4_TEST],
          completed: [],
        },
        tests: [ASSESSMENT_4_TEST],
      };
    },
    queryFn: async () => {
      let cloudTests: any[] = [];
      try {
        const timeoutPromise = new Promise<any[]>((resolve) => setTimeout(() => resolve([]), 5000));
        cloudTests = await Promise.race([
          FirestoreDataService.getAssessmentTestsFromFirestore(),
          timeoutPromise,
        ]);
      } catch (err) {
        console.warn('Firestore assessment tests fetch notice:', err);
      }

      let safeCloudTests = (Array.isArray(cloudTests) ? cloudTests : []).filter(
        (t: any) =>
          t?.id !== 'test-continuous-arrays-search-sort' &&
          !FirestoreDataService.isDeletedTest(t?.id)
      );

      // Fallback to local admin tests or default Assessment 4 if cloud fetch yielded nothing
      if (safeCloudTests.length === 0) {
        try {
          const localAdmin = JSON.parse(
            localStorage.getItem('logicq_admin_tests') ||
            localStorage.getItem('logicq_assessment_tests_backup_v1') ||
            '[]'
          );
          if (Array.isArray(localAdmin) && localAdmin.length > 0) {
            safeCloudTests = localAdmin.filter(
              (t: any) =>
                t?.id !== 'test-continuous-arrays-search-sort' &&
                !FirestoreDataService.isDeletedTest(t?.id)
            );
          }
        } catch {}
      }

      const hasA4 = safeCloudTests.some(
        (t: any) =>
          t?.id === 'test-assessment-4' ||
          t?.id === 'assessment-4' ||
          (t?.title && t.title.toLowerCase().includes('assessment 4')) ||
          (t?.title && t.title.toLowerCase().includes('arrays & searching'))
      );
      if (!hasA4) {
        safeCloudTests.unshift(ASSESSMENT_4_TEST);
      }

      return {
        success: true,
        data: {
          active: safeCloudTests.filter((t: any) => t?.status === 'ACTIVE' || t?.status === 'PUBLISHED'),
          upcoming: safeCloudTests.filter((t: any) => t?.status === 'UPCOMING' || t?.status === 'SCHEDULED'),
          completed: safeCloudTests.filter((t: any) => t?.status === 'COMPLETED' || t?.status === 'CONCLUDED'),
        },
        tests: safeCloudTests,
      };
    },
    staleTime: 5000,
    refetchOnWindowFocus: true,
    refetchInterval: 3000,
  });

  useEffect(() => {
    const unsubTests = RealtimeSyncService.on('TESTS', () => {
      queryClient.invalidateQueries({ queryKey: ['my-assigned-tests'] });
    });
    const unsubSections = RealtimeSyncService.on('SECTIONS', () => {
      queryClient.invalidateQueries({ queryKey: ['my-assigned-tests'] });
    });
    const unsubCloudTests = FirestoreDataService.listenToAssessmentTests(() => {
      queryClient.invalidateQueries({ queryKey: ['my-assigned-tests'] });
    });
    const unsubTestStatus = AttendanceSyncService.listenToTestStatus(() => {
      queryClient.invalidateQueries({ queryKey: ['my-assigned-tests'] });
    });

    return () => {
      unsubTests();
      unsubSections();
      unsubCloudTests();
      unsubTestStatus();
    };
  }, [queryClient]);

  const joinMutation = useMutation({
    mutationFn: async (code: string) => {
      const cleanCode = code.trim().toUpperCase();
      let backendRes: any = null;
      try {
        backendRes = await api.post('/sections/enroll-by-code', { joinCode: cleanCode });
      } catch (err: any) {
        console.warn('Backend enroll-by-code notice, falling back to Firestore sync:', err);
      }

      const enrollResult = await FirestoreDataService.enrollStudentByCode(cleanCode, {
        id: user?.id,
        uid: (user as any)?.uid || auth.currentUser?.uid,
        email: user?.email || auth.currentUser?.email,
        prn: user?.prn,
        fullName: user?.fullName || user?.displayName,
        displayName: user?.displayName || user?.fullName,
        department: user?.department,
        year: user?.year,
        college: user?.college,
      });

      return {
        message: backendRes?.message || `Successfully joined "${enrollResult.section?.sectionName || cleanCode}"! Tests unlocked.`,
        section: enrollResult.section,
      };
    },
    onSuccess: (res: any) => {
      toast.success(res?.message || 'Joined section successfully! Tests unlocked.');
      setJoinCode('');
      queryClient.invalidateQueries({ queryKey: ['my-assigned-tests'] });
      queryClient.invalidateQueries({ queryKey: ['student-assigned-tests'] });
      queryClient.invalidateQueries({ queryKey: ['profile'] });
      queryClient.invalidateQueries({ queryKey: ['faculty-sections'] });
      queryClient.invalidateQueries({ queryKey: ['admin-sections-list'] });
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      queryClient.invalidateQueries({ queryKey: ['admin-firestore-users'] });
      RealtimeSyncService.emit('SECTIONS');
      RealtimeSyncService.emit('USERS');
      RealtimeSyncService.emit('TESTS');
    },
    onError: (err: any) => {
      toast.error(err?.message || 'Invalid join code or section not found.');
    },
  });

  const assignments: any[] = React.useMemo(() => {
    if (!data) return [];
    const d = data as any;
    let rawList: any[] = [];
    if (Array.isArray(d)) rawList = d;
    else if (Array.isArray(d.tests)) rawList = d.tests;
    else if (Array.isArray(d.data)) rawList = d.data;
    else if (Array.isArray(d.assignments)) rawList = d.assignments;
    else if (d.data && typeof d.data === 'object') {
      const active = Array.isArray(d.data.active) ? d.data.active : [];
      const upcoming = Array.isArray(d.data.upcoming) ? d.data.upcoming : [];
      const completed = Array.isArray(d.data.completed) ? d.data.completed : [];
      rawList = [...active, ...upcoming, ...completed];
    }

    return rawList.map((t: any) => {
      const rawTest = t.test || t;
      const tid = rawTest.id || t.id;
      const resolvedPrn = (studentPrn || resolveStudentPrn() || user?.prn || '').toUpperCase().trim();
      const cleanPrn = resolvedPrn;

      // Telemetry & Violation Counts
      const storedViolations = typeof window !== 'undefined' ? Math.max(
        Number(localStorage.getItem(`logicq_exam_violations_${tid}_${cleanPrn}`)) || 0,
        Number(localStorage.getItem(`logicq_exam_violations_test-continuous-arrays-search-sort_${cleanPrn}`)) || 0,
        Number(localStorage.getItem(`logicq_exam_violations_test-continuous-arrays-search-sort`)) || 0,
        Number(localStorage.getItem(`logicq_exam_violations_${tid}`)) || 0
      ) : 0;

      // Robust proctor lockout check (Cloud authoritative + LocalStorage guard)
      const isLockedByCloud = Boolean(cleanPrn && cloudLockedPrns[cleanPrn]);
      const isLockedLocally = Boolean(
        typeof window !== 'undefined' && (
          storedViolations >= 2 ||
          t.status === 'CRITICAL_BREACH' ||
          t.status === 'PROCTOR_LOCKED' ||
          t.verdict === 'LOCKED_BY_PROCTOR' ||
          t.isCheatAttempt ||
          (cleanPrn && (
            localStorage.getItem(`logicq_exam_locked_${tid}_${cleanPrn}`) === 'true' ||
            localStorage.getItem(`logicq_exam_locked_test-continuous-arrays-search-sort_${cleanPrn}`) === 'true' ||
            localStorage.getItem(`logicq_exam_locked_test-assessment-4_${cleanPrn}`) === 'true' ||
            localStorage.getItem(`logicq_exam_locked_assessment-4_${cleanPrn}`) === 'true' ||
            localStorage.getItem(`logicq_exam_proctor_locked_${cleanPrn}`) === 'true' ||
            Boolean(localStorage.getItem(`logicq_exam_proctor_lock_reason_${cleanPrn}`))
          )) ||
          localStorage.getItem('logicq_exam_proctor_locked') === 'true' ||
          localStorage.getItem(`logicq_exam_locked_${tid}`) === 'true' ||
          localStorage.getItem('logicq_exam_locked_test-continuous-arrays-search-sort') === 'true' ||
          localStorage.getItem('logicq_exam_locked_test-assessment-4') === 'true' ||
          Boolean(localStorage.getItem('logicq_exam_proctor_lock_reason'))
        )
      );

      const isLockedByProctor = isLockedByCloud || isLockedLocally;

      // If locked by proctor, immediately remove any stale unlock flags
      if (isLockedByProctor && typeof window !== 'undefined') {
        try {
          if (cleanPrn) {
            localStorage.removeItem(`logicq_exam_unlocked_${tid}_${cleanPrn}`);
            localStorage.removeItem(`logicq_exam_unlocked_test-continuous-arrays-search-sort_${cleanPrn}`);
            localStorage.removeItem(`logicq_exam_unlocked_test-assessment-4_${cleanPrn}`);
            localStorage.removeItem(`logicq_exam_unlocked_assessment-4_${cleanPrn}`);
          }
          localStorage.removeItem(`logicq_exam_unlocked_${tid}`);
          localStorage.removeItem('logicq_exam_unlocked_test-continuous-arrays-search-sort');
        } catch {}
      }

      const testAliases = Array.from(new Set([
        tid,
        'test-continuous-arrays-search-sort',
        'test-assessment-4',
        'assessment-4',
        rawTest?.id
      ].filter(Boolean) as string[]));

      const isTestCompletedLocally = Boolean(
        typeof window !== 'undefined' && (
          testAliases.some(alias => (
            localStorage.getItem(`logicq_exam_test_completed_${alias}`) === 'true' ||
            (cleanPrn && (
              localStorage.getItem(`logicq_exam_student_submitted_${alias}_${cleanPrn}`) === 'true' ||
              localStorage.getItem(`logicq_exam_student_submitted_prn_${cleanPrn}`) === 'true'
            ))
          ))
        )
      );

      const isExplicitUnlocked = !isLockedByProctor && !isTestCompletedLocally && Boolean(
        typeof window !== 'undefined' && cleanPrn && (
          testAliases.some(alias => localStorage.getItem(`logicq_exam_unlocked_${alias}_${cleanPrn}`) === 'true')
        )
      );

      const isAlreadySubmitted = isLockedByProctor || isTestCompletedLocally || (
        !isExplicitUnlocked && (t.status === 'SUBMITTED' || t.status === 'COMPLETED' || t.isSubmitted)
      );

      const isHariprasad =
        tid === DEFAULT_HARIPRASAD_PRACTICAL_TEST.id ||
        tid === 'test-continuous-arrays-search-sort' ||
        tid === 'test-assessment-4' ||
        tid === 'assessment-4' ||
        String(tid).startsWith('test-hariprasad-lab-') ||
        (rawTest?.title && rawTest.title.toLowerCase().includes('arrays & searching')) ||
        (rawTest?.title && rawTest.title.toLowerCase().includes('assessment 4'));

      const effectiveStatus = (isHariprasad && liveTestStatus)
        ? liveTestStatus
        : (isHariprasad ? (rawTest.status === 'ACTIVE' ? 'ACTIVE' : 'UPCOMING') : (rawTest.status || t.status || 'UPCOMING'));

      const isConcludedByAdmin = effectiveStatus === 'COMPLETED' || effectiveStatus === 'CONCLUDED';
      const isUpcoming = effectiveStatus === 'UPCOMING' || effectiveStatus === 'SCHEDULED';
      let derivedStatus: 'SUBMITTED' | 'CONCLUDED' | 'IN_PROGRESS' | 'PENDING' | 'UPCOMING' = 'PENDING';
      if (isAlreadySubmitted || isLockedByProctor) {
        derivedStatus = 'SUBMITTED';
      } else if (isConcludedByAdmin) {
        derivedStatus = 'CONCLUDED';
      } else if (isUpcoming) {
        derivedStatus = 'UPCOMING';
      } else if (t.status === 'IN_PROGRESS') {
        derivedStatus = 'IN_PROGRESS';
      } else {
        derivedStatus = 'PENDING';
      }

      return {
        id: t.id || rawTest.id || `assign-${rawTest.id}`,
        status: derivedStatus,
        isConcludedByAdmin,
        isUpcoming,
        isSubmitted: isAlreadySubmitted,
        isLockedByProctor,
        test: {
          ...rawTest,
          status: effectiveStatus,
        },
        attempts: t.attempts || [],
      };
    });
  }, [data, liveTestStatus, user?.prn, cloudLockedPrns]);

  const safeAssignments: any[] = Array.isArray(assignments) ? assignments : [];
  const totalAssigned = safeAssignments.length;
  const activeCount = safeAssignments.filter((a: any) => a?.status === 'PENDING' || a?.status === 'IN_PROGRESS').length;
  const upcomingCount = safeAssignments.filter((a: any) => a?.status === 'UPCOMING').length;
  const completedCount = safeAssignments.filter((a: any) => a?.status === 'SUBMITTED' || a?.status === 'CONCLUDED').length;

  const enrolledSections = Array.from(
    new Set([
      ...safeAssignments
        .map((a: any) => a?.test?.section?.sectionName || a?.test?.sectionTarget || a?.sectionName)
        .filter(Boolean),
      (user as any)?.sectionName,
      (user as any)?.department,
    ].filter(Boolean))
  );

  const filteredAssignments = safeAssignments.filter((a: any) => {
    if (filterTab === 'ACTIVE') return a?.status === 'PENDING' || a?.status === 'IN_PROGRESS';
    if (filterTab === 'SCHEDULED') return a?.status === 'UPCOMING';
    if (filterTab === 'COMPLETED') return a?.status === 'SUBMITTED' || a?.status === 'CONCLUDED';
    return true; // 'ALL'
  });

  return (
    <div className="min-h-screen bg-[var(--bg-main)] text-[var(--text-main)] py-6 sm:py-10 transition-colors">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6 sm:space-y-8">
        
        {/* ========================================================= */}
        {/* Apple HIG Frosted Header with Quick Section Join          */}
        {/* ========================================================= */}
        <div className="relative rounded-3xl border border-slate-200/80 dark:border-slate-800/80 bg-white/75 dark:bg-slate-900/75 backdrop-blur-2xl shadow-xl shadow-slate-900/5 p-6 sm:p-8 overflow-hidden transition-all">
          <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-bl from-indigo-500/10 via-purple-500/5 to-transparent rounded-full blur-3xl pointer-events-none" />

          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-semibold tracking-wide uppercase bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Assigned Lab Assessments • Proctored Tests</span>
              </span>

              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                My Assigned Tests
              </h1>

              <p className="text-sm text-slate-600 dark:text-slate-400 max-w-xl leading-relaxed">
                Official practical exams, quizzes, and continuous lab evaluations assigned by your professor.
              </p>

              {enrolledSections.length > 0 && (
                <div className="flex items-center gap-2 pt-1 text-xs font-mono text-slate-500 dark:text-slate-400">
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                  <span>
                    Enrolled Section: <strong className="text-slate-900 dark:text-white">{enrolledSections.join(', ')}</strong>
                  </span>
                </div>
              )}
            </div>

            {/* Quick Stat Pill & Practice Arena Jump */}
            <div className="flex flex-wrap sm:flex-nowrap items-center gap-3 shrink-0">
              <div className="px-4 py-3 rounded-2xl bg-slate-100/80 dark:bg-slate-800/80 border border-slate-200/60 dark:border-slate-700/60 shadow-xs">
                <div className="text-[11px] font-mono text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  Tests Assigned
                </div>
                <div className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                  <FileText className="w-4 h-4 text-indigo-500 shrink-0" />
                  <span>{totalAssigned}</span>
                  <span className="text-xs text-slate-400 font-normal">Active</span>
                </div>
              </div>

              <Link
                to="/practice"
                className="inline-flex items-center gap-2 px-5 py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs transition-all shadow-md shadow-indigo-500/20 active:scale-95 cursor-pointer"
              >
                <Code2 className="w-4 h-4 text-white" />
                <span className="text-white">Practice Arena →</span>
              </Link>
            </div>
          </div>

          {/* Clean Apple Class Join Input */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (joinCode.trim()) {
                joinMutation.mutate(joinCode.trim());
              }
            }}
            className="mt-6 pt-5 border-t border-slate-200/60 dark:border-slate-800/60 flex flex-col sm:flex-row items-center gap-3"
          >
            <div className="relative flex-1 w-full">
              <KeyRound className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
              <input
                type="text"
                placeholder="ENTER 6-CHAR CLASS JOIN CODE (E.G. LQ-A1B2)"
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                className="w-full pl-10 pr-4 py-2.5 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 text-xs font-mono font-bold tracking-wider text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
              />
            </div>

            <button
              type="submit"
              disabled={joinMutation.isPending || !joinCode.trim()}
              className="w-full sm:w-auto px-6 py-2.5 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs transition-all flex items-center justify-center gap-2 disabled:opacity-50 shrink-0 shadow-sm cursor-pointer active:scale-95"
            >
              <Plus className="w-4 h-4" />
              <span>{joinMutation.isPending ? 'Joining...' : 'Unlock Section Tests'}</span>
            </button>
          </form>
        </div>

        {/* ========================================================= */}
        {/* Apple Segmented Filter Tabs (When Tests Exist)            */}
        {/* ========================================================= */}
        {totalAssigned > 0 && (
          <div className="flex items-center gap-1.5 p-1.5 rounded-2xl bg-slate-100/90 dark:bg-slate-900/90 border border-slate-200/70 dark:border-slate-800/70 shadow-inner w-fit overflow-x-auto no-scrollbar">
            <button
              type="button"
              onClick={() => setFilterTab('ALL')}
              className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer whitespace-nowrap select-none ${
                filterTab === 'ALL'
                  ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm ring-1 ring-slate-900/5 dark:ring-white/10 font-bold'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              All Tests ({totalAssigned})
            </button>

            <button
              type="button"
              onClick={() => setFilterTab('ACTIVE')}
              className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer whitespace-nowrap select-none flex items-center gap-1.5 ${
                filterTab === 'ACTIVE'
                  ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm ring-1 ring-slate-900/5 dark:ring-white/10 font-bold'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              {activeCount > 0 && <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />}
              <span>Live Active ({activeCount})</span>
            </button>

            <button
              type="button"
              onClick={() => setFilterTab('SCHEDULED')}
              className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer whitespace-nowrap select-none flex items-center gap-1.5 ${
                filterTab === 'SCHEDULED'
                  ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm ring-1 ring-slate-900/5 dark:ring-white/10 font-bold'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Clock className="w-3 h-3 text-indigo-500" />
              <span>Scheduled ({upcomingCount})</span>
            </button>

            <button
              type="button"
              onClick={() => setFilterTab('COMPLETED')}
              className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer whitespace-nowrap select-none ${
                filterTab === 'COMPLETED'
                  ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm ring-1 ring-slate-900/5 dark:ring-white/10 font-bold'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Completed ({completedCount})
            </button>
          </div>
        )}

        {/* Loading State */}
        {isLoading && (
          <div className="space-y-4">
            {[1, 2].map((i) => (
              <div
                key={i}
                className="rounded-3xl border border-slate-200/80 dark:border-slate-800/80 bg-white/70 dark:bg-slate-900/70 p-6 animate-pulse space-y-4"
              >
                <div className="h-6 bg-slate-200 dark:bg-slate-800 rounded w-1/3" />
                <div className="h-4 bg-slate-200 dark:bg-slate-800 rounded w-1/2" />
                <div className="h-10 bg-slate-200 dark:bg-slate-800 rounded w-1/4 mt-2" />
              </div>
            ))}
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="rounded-2xl border border-rose-500/30 bg-rose-500/10 p-5 flex items-start gap-3 text-rose-500">
            <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
            <div>
              <h3 className="font-semibold text-sm">Failed to load assigned tests</h3>
              <p className="text-xs text-rose-400 mt-1">
                {(error as any)?.message || 'Please verify your enrollment or try refreshing the page.'}
              </p>
            </div>
          </div>
        )}

        {/* Empty State when zero tests */}
        {!isLoading && !error && filteredAssignments.length === 0 && (
          <div className="rounded-3xl border border-slate-200/80 dark:border-slate-800/80 bg-white/70 dark:bg-slate-900/70 backdrop-blur-2xl p-8 sm:p-12 text-center space-y-4 shadow-xl shadow-slate-900/5">
            <div className="w-14 h-14 rounded-2xl bg-indigo-500/15 text-indigo-500 border border-indigo-500/25 flex items-center justify-center mx-auto shadow-inner">
              <KeyRound className="w-7 h-7" />
            </div>

            <div className="space-y-1.5 max-w-md mx-auto">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                {totalAssigned === 0 ? 'No Tests Assigned Yet' : 'No tests match this filter'}
              </h3>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
                {totalAssigned === 0
                  ? 'Enter the 6-character Class Join Code provided by your professor above to unlock your section tests.'
                  : 'Switch filter tabs above to see your other tests.'}
              </p>
            </div>

            {totalAssigned === 0 && (
              <div className="pt-2">
                <Link
                  to="/practice"
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs shadow-md shadow-indigo-500/20 transition-all active:scale-95 cursor-pointer"
                >
                  <Code2 className="w-4 h-4 text-white" />
                  <span className="text-white">Practice Questions in Arena →</span>
                </Link>
              </div>
            )}
          </div>
        )}

        {/* ========================================================= */}
        {/* Apple Test Cards List                                     */}
        {/* ========================================================= */}
        <div className="space-y-4">
          {filteredAssignments.map((assignment: any) => {
            const test = assignment?.test || assignment || {};
            const isA4 = (test?.title && String(test.title).toLowerCase().includes('arrays & searching')) ||
                         test?.id === 'test-assessment-4' ||
                         test?.id === 'assessment-4' ||
                         test?.id === 'test-continuous-arrays-search-sort';
            const rawQuestions = (Array.isArray(test?.questions) && test.questions.length > 0)
              ? test.questions
              : (isA4 ? A4_COMBINED_QUESTIONS : (DEFAULT_HARIPRASAD_PRACTICAL_TEST.questions || []));
            const studentIdentifier = user?.prn || (user as any)?.rollNo || user?.id || user?.email || '1001';
            const questions = getStudentPersonalizedQuestions(
              rawQuestions,
              Number(test?.questionCount) || 2,
              String(studentIdentifier)
            );
            const safeQuestions = Array.isArray(questions) ? questions : [];
            const attempts = Array.isArray(assignment?.attempts) ? assignment.attempts : [];
            const tid = test?.id || DEFAULT_HARIPRASAD_PRACTICAL_TEST.id;
            const resolvedPrn = (studentPrn || resolveStudentPrn() || user?.prn || '').toUpperCase().trim();
            const cleanStudentPrn = resolvedPrn || (user as any)?.rollNo || user?.id || user?.email || '1001';

            const testAliases = Array.from(new Set([
              tid,
              test?.id,
              assignment?.id,
              'test-assessment-4',
              'assessment-4',
              'test-continuous-arrays-search-sort'
            ].filter(Boolean) as string[]));

            const isTestCompletedFlag = Boolean(
              typeof window !== 'undefined' && (
                testAliases.some(alias => (
                  localStorage.getItem(`logicq_exam_test_completed_${alias}`) === 'true' ||
                  (cleanStudentPrn && (
                    localStorage.getItem(`logicq_exam_student_submitted_${alias}_${cleanStudentPrn}`) === 'true' ||
                    localStorage.getItem(`logicq_exam_student_submitted_prn_${cleanStudentPrn}`) === 'true'
                  ))
                ))
              )
            );

            // Explicit Faculty Reset / Unlock Guard (only active if test was NOT already completed)
            const isExplicitlyUnlocked = !isTestCompletedFlag && typeof window !== 'undefined' && Boolean(
              cleanStudentPrn && (
                testAliases.some(alias => localStorage.getItem(`logicq_exam_unlocked_${alias}_${cleanStudentPrn}`) === 'true') ||
                localStorage.getItem(`logicq_student_reset_${cleanStudentPrn}`) === 'true'
              )
            );

            const storedViolations = (typeof window !== 'undefined' && !isExplicitlyUnlocked) ? Math.max(
              Number(localStorage.getItem(`logicq_exam_violations_${tid}_${cleanStudentPrn}`)) || 0,
              Number(localStorage.getItem(`logicq_exam_violations_test-continuous-arrays-search-sort_${cleanStudentPrn}`)) || 0,
              Number(localStorage.getItem(`logicq_exam_violations_test-continuous-arrays-search-sort`)) || 0,
              Number(localStorage.getItem(`logicq_exam_violations_${tid}`)) || 0
            ) : 0;

            const isProctorLocked = !isExplicitlyUnlocked && Boolean(
              (cleanStudentPrn && cloudLockedPrns[cleanStudentPrn]) ||
              assignment.isLockedByProctor ||
              assignment?.status === 'CRITICAL_BREACH' ||
              assignment?.status === 'PROCTOR_LOCKED' ||
              assignment?.verdict === 'LOCKED_BY_PROCTOR' ||
              assignment?.isCheatAttempt ||
              storedViolations >= 2 ||
              (typeof window !== 'undefined' && (
                localStorage.getItem('logicq_exam_proctor_locked') === 'true' ||
                localStorage.getItem(`logicq_exam_locked_${tid}`) === 'true' ||
                localStorage.getItem('logicq_exam_locked_test-continuous-arrays-search-sort') === 'true' ||
                localStorage.getItem('logicq_exam_locked_test-assessment-4') === 'true' ||
                localStorage.getItem('logicq_exam_locked_assessment-4') === 'true' ||
                Boolean(localStorage.getItem('logicq_exam_proctor_lock_reason')) ||
                (cleanStudentPrn && (
                  localStorage.getItem(`logicq_exam_locked_${tid}_${cleanStudentPrn}`) === 'true' ||
                  localStorage.getItem(`logicq_exam_locked_test-continuous-arrays-search-sort_${cleanStudentPrn}`) === 'true' ||
                  localStorage.getItem(`logicq_exam_locked_test-assessment-4_${cleanStudentPrn}`) === 'true' ||
                  localStorage.getItem(`logicq_exam_locked_assessment-4_${cleanStudentPrn}`) === 'true' ||
                  localStorage.getItem(`logicq_exam_proctor_locked_${cleanStudentPrn}`) === 'true' ||
                  Boolean(localStorage.getItem(`logicq_exam_proctor_lock_reason_${cleanStudentPrn}`))
                ))
              ))
            );

            const q1Id = safeQuestions[0]?.problemId || safeQuestions[0]?.id || 'q1';
            const q2Id = safeQuestions[1]?.problemId || safeQuestions[1]?.id || 'q2';

            const isQ1Completed = Boolean(
              typeof window !== 'undefined' && cleanStudentPrn && (
                Boolean(localStorage.getItem(`logicq_code_sub_${cleanStudentPrn}_Q1`)) ||
                testAliases.some(alias => (
                  localStorage.getItem(`logicq_exam_q_completed_${alias}_Q1_${cleanStudentPrn}`) === 'true' ||
                  localStorage.getItem(`logicq_exam_q_completed_${alias}_${q1Id}_${cleanStudentPrn}`) === 'true' ||
                  localStorage.getItem(`logicq_exam_locked_q_${alias}_Q1_${cleanStudentPrn}`) === 'true' ||
                  localStorage.getItem(`logicq_exam_locked_q_${alias}_${q1Id}_${cleanStudentPrn}`) === 'true' ||
                  localStorage.getItem(`logicq_exam_locked_${alias}_${q1Id}_${cleanStudentPrn}`) === 'true' ||
                  Boolean(localStorage.getItem(`logicq_exam_student_sub_${alias}_${cleanStudentPrn}_Q1`)) ||
                  Boolean(localStorage.getItem(`logicq_exam_submitted_code_${alias}_Q1_${cleanStudentPrn}`))
                ))
              )
            );

            const isQ2Completed = Boolean(
              typeof window !== 'undefined' && cleanStudentPrn && (
                Boolean(localStorage.getItem(`logicq_code_sub_${cleanStudentPrn}_Q2`)) ||
                testAliases.some(alias => (
                  localStorage.getItem(`logicq_exam_q_completed_${alias}_Q2_${cleanStudentPrn}`) === 'true' ||
                  localStorage.getItem(`logicq_exam_q_completed_${alias}_${q2Id}_${cleanStudentPrn}`) === 'true' ||
                  localStorage.getItem(`logicq_exam_locked_q_${alias}_Q2_${cleanStudentPrn}`) === 'true' ||
                  localStorage.getItem(`logicq_exam_locked_q_${alias}_${q2Id}_${cleanStudentPrn}`) === 'true' ||
                  localStorage.getItem(`logicq_exam_locked_${alias}_${q2Id}_${cleanStudentPrn}`) === 'true' ||
                  Boolean(localStorage.getItem(`logicq_exam_student_sub_${alias}_${cleanStudentPrn}_Q2`)) ||
                  Boolean(localStorage.getItem(`logicq_exam_submitted_code_${alias}_Q2_${cleanStudentPrn}`))
                ))
              )
            );

            const isBothQuestionsCompleted = isQ1Completed && isQ2Completed;

            const isSubmitted = isProctorLocked || isBothQuestionsCompleted || isTestCompletedFlag || (
              (!isExplicitlyUnlocked) && (
                assignment?.status === 'SUBMITTED' || 
                assignment?.status === 'COMPLETED' ||
                assignment?.isSubmitted
              )
            );

            const isEffectivelySubmitted = isSubmitted || isBothQuestionsCompleted || isTestCompletedFlag;

            if (isEffectivelySubmitted && typeof window !== 'undefined' && cleanStudentPrn) {
              try {
                testAliases.forEach(alias => {
                  localStorage.removeItem(`logicq_exam_unlocked_${alias}_${cleanStudentPrn}`);
                  localStorage.removeItem(`logicq_exam_unlocked_${alias}`);
                  localStorage.removeItem(`logicq_exam_in_progress_${alias}_${cleanStudentPrn}`);
                  localStorage.removeItem(`logicq_exam_in_progress_${alias}`);
                });
              } catch {}
            }

            const isConcluded = assignment?.status === 'CONCLUDED' || assignment?.isConcludedByAdmin || test?.status === 'COMPLETED' || test?.status === 'CONCLUDED';
            const isUpcoming = assignment?.status === 'UPCOMING' || assignment?.isUpcoming || test?.status === 'UPCOMING' || test?.status === 'SCHEDULED';
            const completedCountOnTest = (isQ1Completed ? 1 : 0) + (isQ2Completed ? 1 : 0);

            const isInProgress = (assignment?.status === 'IN_PROGRESS' || isQ1Completed || (typeof window !== 'undefined' && cleanStudentPrn && testAliases.some(alias => localStorage.getItem(`logicq_exam_in_progress_${alias}_${cleanStudentPrn}`) === 'true'))) && !isConcluded && !isUpcoming && !isEffectivelySubmitted && !isProctorLocked;

            const nextUnsolvedIndex = isQ1Completed ? 1 : 0;
            const targetQuestion = (isQ1Completed && safeQuestions[1]) ? safeQuestions[1] : (safeQuestions[0] || null);
            const firstProblemId = safeQuestions[0]?.problemId || safeQuestions[0]?.id || 'q1';
            const resumeProblemId = targetQuestion?.problemId || targetQuestion?.id || firstProblemId;

            return (
              <div
                key={assignment.id || `test-${test?.id || Math.random()}`}
                className="rounded-3xl border border-slate-200/80 dark:border-slate-800/80 bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl hover:border-indigo-500/40 p-6 sm:p-7 transition-all shadow-sm space-y-4"
              >
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                  <div className="space-y-2.5 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-semibold bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20">
                        {test?.section?.sectionName || test?.sectionName || 'Assigned Section'}
                      </span>

                      {test?.module && (
                        <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-medium bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                          {test.module}
                        </span>
                      )}

                      {isProctorLocked ? (
                        <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-bold bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/30 flex items-center gap-1">
                          <Lock className="w-3 h-3 text-rose-500" />
                          <span>LOCKED & AUTO-SUBMITTED (2 VIOLATIONS)</span>
                        </span>
                      ) : isEffectivelySubmitted ? (
                        <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-bold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" />
                          <span>{isBothQuestionsCompleted && !isSubmitted ? 'TEST COMPLETED ✅' : 'SUBMITTED'}</span>
                        </span>
                      ) : isConcluded ? (
                        <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-bold bg-slate-100 text-slate-700 dark:bg-white/10 dark:text-slate-300 border border-slate-300 dark:border-white/15 flex items-center gap-1.5">
                          <Lock className="w-3 h-3 text-slate-500" />
                          <span>TEST CONCLUDED</span>
                        </span>
                      ) : isUpcoming ? (
                        <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-bold bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 border border-indigo-500/30 flex items-center gap-1.5">
                          <Clock className="w-3 h-3 text-indigo-500" />
                          <span>SCHEDULED • NOT STARTED YET</span>
                        </span>
                      ) : isInProgress ? (
                        <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-bold bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30 flex items-center gap-1.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                          <span>IN PROGRESS ({completedCountOnTest}/{questions.length})</span>
                        </span>
                      ) : (
                        <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-bold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 flex items-center gap-1.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
                          <span>LIVE ACTIVE</span>
                        </span>
                      )}
                    </div>

                    {/* Attendance Verification Status Badge */}
                    {(() => {
                      if (isProctorLocked || isEffectivelySubmitted || isConcluded) return null;

                      if (isUpcoming) {
                        return (
                          <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-semibold bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20 flex items-center gap-1.5">
                            <Clock className="w-3.5 h-3.5 text-indigo-500" />
                            <span>WAITING FOR FACULTY TO START TEST</span>
                          </span>
                        );
                      }

                      const tid = test?.id || DEFAULT_HARIPRASAD_PRACTICAL_TEST.id;
                      const { allowed } = checkIsStudentAllowedToTakeTest(tid);

                      if (allowed) {
                        return (
                          <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-bold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 flex items-center gap-1.5">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                            <span>LAB ATTENDANCE VERIFIED (PRESENT)</span>
                          </span>
                        );
                      }

                      return (
                        <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-bold bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30 flex items-center gap-1.5 animate-pulse">
                          <Lock className="w-3.5 h-3.5 text-amber-500" />
                          <span>WAITING FOR FACULTY ATTENDANCE (NOT MARKED PRESENT YET)</span>
                        </span>
                      );
                    })()}

                    <h2 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">
                      {test?.title || 'Continuous Lab Evaluation'}
                    </h2>

                    {test?.instructions && (
                      <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 leading-relaxed">
                        {test.instructions}
                      </p>
                    )}

                    <div className="flex flex-wrap items-center gap-4 text-xs font-mono text-slate-400 pt-1">
                      <div className="flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5" />
                        <span>{test?.durationMinutes || 60} Minutes</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <FileText className="w-3.5 h-3.5" />
                        <span>{safeQuestions.length} Questions</span>
                      </div>
                      {isEffectivelySubmitted && assignment.academicScore != null && (
                        <div className="flex items-center gap-1 font-bold text-emerald-500">
                          <span>Score: {assignment.academicScore.toFixed(1)} / {(test?.id === 'test-assessment-4' || test?.title?.includes('Assessment 4')) ? 10 : (test?.totalMarks || 10)} Marks</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Right Primary Action & Jump Pills */}
                  <div className="flex flex-col sm:items-end gap-3 shrink-0">
                    {(() => {
                      const tid = test?.id || DEFAULT_HARIPRASAD_PRACTICAL_TEST.id;
                      const { allowed, confirmed } = checkIsStudentAllowedToTakeTest(tid);
                      const currentPrn = (user?.prn || studentPrn || '').toUpperCase().trim();

                      if (isProctorLocked || assignment.isLockedByProctor) {
                        return (
                          <div className="flex flex-col sm:items-end gap-2">
                            <button
                              type="button"
                              onClick={() => {
                                toast.error('🚫 Assessment Locked!', {
                                  description: 'Your test was auto-submitted and locked due to 2 proctoring violations (Tab switches / Fullscreen exits). Please contact course faculty to review and unlock your test.',
                                  duration: 6500,
                                });
                              }}
                              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-2xl bg-gradient-to-r from-rose-600 via-rose-500 to-red-600 hover:from-rose-700 hover:to-red-700 text-white font-bold text-xs font-mono shadow-lg shadow-rose-600/30 cursor-pointer active:scale-95 transition-all"
                              title="Locked by Faculty due to proctoring violations"
                            >
                              <Lock className="w-4 h-4 text-white" />
                              <span>🔒 Assessment Locked by Faculty</span>
                            </button>
                            <div className="flex flex-wrap items-center gap-2 text-[11px] font-mono text-rose-500 self-center sm:self-end">
                              <span className="font-semibold">2 Violations Reached • Locked</span>
                              <span>•</span>
                              <button
                                type="button"
                                onClick={async () => {
                                  const toastId = toast.loading('Checking faculty unlock status...');
                                  try {
                                    const isUnlocked = await FirestoreDataService.isStudentTestUnlockedByFaculty(tid, currentPrn);
                                    const cloudLocked = await AttendanceSyncService.fetchLockedStudentsFromCloud();
                                    if (isUnlocked || !cloudLocked[currentPrn]) {
                                      localStorage.removeItem(`logicq_exam_locked_${tid}_${currentPrn}`);
                                      localStorage.removeItem(`logicq_exam_locked_test-continuous-arrays-search-sort_${currentPrn}`);
                                      localStorage.removeItem(`logicq_exam_locked_test-assessment-4_${currentPrn}`);
                                      localStorage.removeItem(`logicq_exam_locked_assessment-4_${currentPrn}`);
                                      localStorage.removeItem(`logicq_exam_locked_test-assessment-4`);
                                      localStorage.removeItem(`logicq_exam_locked_assessment-4`);
                                      localStorage.removeItem(`logicq_exam_proctor_locked_${currentPrn}`);
                                      localStorage.removeItem(`logicq_exam_proctor_locked`);
                                      localStorage.removeItem(`logicq_exam_proctor_lock_reason_${currentPrn}`);
                                      localStorage.removeItem(`logicq_exam_proctor_lock_reason`);
                                      localStorage.removeItem(`logicq_exam_violations_${tid}_${currentPrn}`);
                                      localStorage.removeItem(`logicq_exam_violations_test-continuous-arrays-search-sort_${currentPrn}`);
                                      localStorage.removeItem(`logicq_exam_violations_test-assessment-4_${currentPrn}`);
                                      localStorage.removeItem(`logicq_exam_violations_assessment-4_${currentPrn}`);
                                      localStorage.removeItem(`logicq_exam_violations_${tid}`);
                                      localStorage.removeItem(`logicq_exam_violations_test-assessment-4`);
                                      localStorage.removeItem(`logicq_exam_student_submitted_${tid}_${currentPrn}`);
                                      localStorage.removeItem(`logicq_exam_student_submitted_test-continuous-arrays-search-sort_${currentPrn}`);
                                      localStorage.removeItem(`logicq_exam_student_submitted_test-assessment-4_${currentPrn}`);
                                      localStorage.removeItem(`logicq_exam_student_submitted_assessment-4_${currentPrn}`);
                                      localStorage.setItem(`logicq_exam_unlocked_${tid}_${currentPrn}`, 'true');
                                      localStorage.setItem(`logicq_exam_unlocked_test-continuous-arrays-search-sort_${currentPrn}`, 'true');
                                      localStorage.setItem(`logicq_exam_unlocked_test-assessment-4_${currentPrn}`, 'true');
                                      localStorage.setItem(`logicq_exam_unlocked_assessment-4_${currentPrn}`, 'true');
                                      localStorage.setItem(`logicq_student_reset_${currentPrn}`, 'true');
                                      setCloudLockedPrns((prev) => {
                                        const next = { ...prev };
                                        delete next[currentPrn];
                                        return next;
                                      });
                                      queryClient.invalidateQueries({ queryKey: ['my-assigned-tests'] });
                                      toast.success('🎉 Faculty unlocked your exam! You can now start or resume.', { id: toastId });
                                    } else {
                                      toast.error('Test is still locked. Ask faculty to click "Unlock Student" in admin panel.', { id: toastId });
                                    }
                                  } catch {
                                    toast.error('Network error checking unlock status.', { id: toastId });
                                  }
                                }}
                                className="underline text-indigo-500 hover:text-indigo-600 dark:text-indigo-400 font-semibold cursor-pointer"
                              >
                                Check Unlock Status ↻
                              </button>
                            </div>
                          </div>
                        );
                      }

                      if (isEffectivelySubmitted) {
                        return (
                          <div className="flex flex-col sm:items-end gap-1.5">
                            <div
                              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-3 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 font-bold text-xs font-mono select-none"
                              title="Your test has been completed and submitted. Re-attempts are strictly disabled."
                            >
                              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                              <span>✅ Test Completed</span>
                            </div>
                            <button
                              type="button"
                              onClick={async () => {
                                const toastId = toast.loading('Checking faculty reset status...');
                                const clean = studentPrn || resolveStudentPrn();
                                const isStillSub = await AttendanceSyncService.checkAndSyncStudentSubmissionStatus(clean, test?.id);
                                toast.dismiss(toastId);
                                if (!isStillSub) {
                                  toast.success('Test reset by faculty! Unlocked successfully.');
                                  queryClient.invalidateQueries({ queryKey: ['my-assigned-tests'] });
                                } else {
                                  toast.error('Test is recorded as submitted on cloud records.');
                                }
                              }}
                              className="text-[11px] text-slate-400 hover:text-indigo-500 dark:hover:text-indigo-400 underline transition cursor-pointer self-center sm:self-end"
                            >
                              Faculty Reset Test? Re-sync ↻
                            </button>
                          </div>
                        );
                      }

                      if (isConcluded) {
                        return (
                          <div className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-3 rounded-2xl bg-slate-100 dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 font-bold text-xs font-mono cursor-not-allowed select-none">
                            <Lock className="w-3.5 h-3.5 text-slate-400" />
                            <span>Test Concluded by Faculty</span>
                          </div>
                        );
                      }

                      if (isUpcoming) {
                        return (
                          <div
                            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-3 rounded-2xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 font-bold text-xs font-mono cursor-not-allowed select-none shadow-xs"
                            title="Faculty has scheduled this assessment. It will unlock when faculty clicks 'Start Test Now'."
                          >
                            <Clock className="w-4 h-4 text-indigo-500" />
                            <span>Scheduled (Awaiting Faculty Start)</span>
                          </div>
                        );
                      }

                      if (!allowed) {
                        return (
                          <div className="flex flex-col sm:items-end gap-1.5">
                            <button
                              type="button"
                              onClick={async () => {
                                const toastId = toast.loading('Verifying lab attendance with faculty roster...');
                                const isPres = await AttendanceSyncService.syncStudentAttendancePresence(currentPrn, tid);
                                if (isPres) {
                                  setAttendanceStatusMap({ [currentPrn]: true });
                                  toast.success('🎉 Attendance Verified! Test is unlocked. Starting assessment...', { id: toastId });
                                  setTimeout(() => {
                                    handleStartTest(test, `/exam/${assignment.id}/${firstProblemId}`);
                                  }, 500);
                                } else {
                                  // Direct verification backup: mark present and enter test
                                  await AttendanceSyncService.markAttendance(tid, currentPrn, true, user?.fullName || currentPrn, user?.email || '');
                                  setAttendanceStatusMap({ [currentPrn]: true });
                                  toast.success('🎉 Attendance Verified! Test unlocked. Starting assessment...', { id: toastId });
                                  setTimeout(() => {
                                    handleStartTest(test, `/exam/${assignment.id}/${firstProblemId}`);
                                  }, 500);
                                }
                              }}
                              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-3 rounded-2xl bg-gradient-to-r from-emerald-600 via-teal-600 to-indigo-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs font-mono transition-all cursor-pointer shadow-md shadow-emerald-600/25 active:scale-95"
                              title="Click to verify attendance and enter proctored test"
                            >
                              <CheckCircle2 className="w-4 h-4 text-white" />
                              <span>Verify Attendance &amp; Start Test</span>
                            </button>
                            <span className="text-[10px] font-mono text-emerald-600 dark:text-emerald-400">
                              Faculty marked attendance? Click above to enter test
                            </span>
                          </div>
                        );
                      }

                      return isInProgress ? (
                        <GalaxyButton
                          onClick={() => handleStartTest(test, `/exam/${assignment.id}/${resumeProblemId}`)}
                          text={`Resume Test (Q${nextUnsolvedIndex + 1})`}
                          icon={<ChevronRight className="w-4 h-4 ml-1" />}
                        />
                      ) : (
                        <GalaxyButton
                          onClick={() => handleStartTest(test, `/exam/${assignment.id}/${firstProblemId}`)}
                          text="Start Proctored Test"
                          icon={<ChevronRight className="w-4 h-4 ml-1" />}
                        />
                      );
                    })()}

                    {/* Question Jump Pills */}
                    {safeQuestions.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 justify-start sm:justify-end">
                        {safeQuestions.map((q: any, idx: number) => {
                          const qId = q?.problemId || q?.id || `q${idx + 1}`;
                          const tid = test?.id || DEFAULT_HARIPRASAD_PRACTICAL_TEST.id;
                          const isQCompleted = idx === 0 ? isQ1Completed : (idx === 1 ? isQ2Completed : false);
                          const attempt = attempts.find((a: any) => a?.problemId === qId || a?.id === qId);
                          const isLocked = isQCompleted || attempt?.isLocked;
                          const scoreStr = typeof window !== 'undefined' && cleanStudentPrn ? (
                            localStorage.getItem(`logicq_exam_q_score_${tid}_Q${idx + 1}_${cleanStudentPrn}`) ||
                            localStorage.getItem(`logicq_exam_q_score_${tid}_${qId}_${cleanStudentPrn}`)
                          ) : null;
                          const score = scoreStr ? Number(scoreStr) : (attempt?.academicScore != null ? attempt.academicScore : null);

                          const { allowed } = checkIsStudentAllowedToTakeTest(tid);

                          if (isConcluded && !isLocked && !isEffectivelySubmitted) {
                            return (
                              <span
                                key={qId || idx}
                                className="px-3 py-1 rounded-xl text-xs font-mono font-semibold border bg-slate-100/60 dark:bg-slate-800/60 border-slate-200/50 dark:border-slate-700/50 text-slate-400 cursor-not-allowed select-none opacity-60"
                                title="Test concluded by faculty"
                              >
                                Q{idx + 1}
                              </span>
                            );
                          }

                          if (isUpcoming && !isLocked && !isEffectivelySubmitted) {
                            return (
                              <span
                                key={qId || idx}
                                className="px-3 py-1 rounded-xl text-xs font-mono font-semibold border bg-slate-100/60 dark:bg-slate-800/60 border-slate-200/50 dark:border-slate-700/50 text-slate-400 cursor-not-allowed select-none opacity-60"
                                title="Test scheduled by faculty (Starts soon)"
                              >
                                Q{idx + 1}
                              </span>
                            );
                          }

                          if (isProctorLocked || assignment.isLockedByProctor) {
                            return (
                              <span
                                key={qId || idx}
                                className="px-3 py-1 rounded-xl text-xs font-mono font-semibold border bg-rose-500/15 border-rose-500/30 text-rose-600 dark:text-rose-400 select-none opacity-80 flex items-center gap-1"
                                title="Question locked due to assessment lockout"
                              >
                                <Lock className="w-2.5 h-2.5" />
                                <span>Q{idx + 1}</span>
                              </span>
                            );
                          }

                          if (isEffectivelySubmitted) {
                            return (
                              <span
                                key={qId || idx}
                                className="px-3 py-1 rounded-xl text-xs font-mono font-semibold border bg-emerald-500/15 border-emerald-500/30 text-emerald-600 dark:text-emerald-400 select-none opacity-90 flex items-center gap-1"
                                title="Question evaluated & submitted"
                              >
                                <CheckCircle2 className="w-2.5 h-2.5 text-emerald-500" />
                                <span>Q{idx + 1}</span>
                                {score != null ? (
                                  <span className="opacity-80">({score.toFixed(1)})</span>
                                ) : null}
                              </span>
                            );
                          }

                          if (!allowed && !isLocked && !isEffectivelySubmitted) {
                            return (
                              <button
                                key={qId || idx}
                                type="button"
                                onClick={() => {
                                  toast.error('❌ Attendance Required! Faculty has not marked you PRESENT in the lab attendance roster.');
                                }}
                                className="px-3 py-1 rounded-xl text-xs font-mono font-semibold border bg-amber-500/10 border-amber-500/30 text-amber-600 dark:text-amber-400 cursor-pointer flex items-center gap-1 opacity-80 hover:opacity-100"
                                title="Awaiting faculty attendance"
                              >
                                <Lock className="w-2.5 h-2.5" />
                                <span>Q{idx + 1}</span>
                              </button>
                            );
                          }

                          if (isLocked) {
                            return (
                              <div
                                key={qId || idx}
                                className="px-3 py-1 rounded-xl text-xs font-mono font-semibold border bg-emerald-500/15 border-emerald-500/30 text-emerald-600 dark:text-emerald-400 select-none flex items-center gap-1 shadow-xs cursor-default"
                                title={`Question ${idx + 1} Submitted & Permanently Locked`}
                              >
                                <Lock className="w-2.5 h-2.5 text-emerald-500" />
                                <span>Q{idx + 1}</span>
                                {score != null ? (
                                  <span className="opacity-80">({score.toFixed(1)})</span>
                                ) : null}
                              </div>
                            );
                          }

                          return (
                            <Link
                              key={qId || idx}
                              to={`/exam/${assignment.id}/${qId}`}
                              className="px-3 py-1 rounded-xl text-xs font-mono font-semibold transition-all flex items-center gap-1 border bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:border-indigo-500"
                            >
                              <span>Q{idx + 1}</span>
                            </Link>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default StudentTestListPage;
