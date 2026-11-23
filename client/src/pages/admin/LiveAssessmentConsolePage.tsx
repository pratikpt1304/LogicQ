import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Users,
  ShieldCheck,
  ShieldAlert,
  AlertTriangle,
  Clock,
  Download,
  Copy,
  ExternalLink,
  CheckCircle2,
  X,
  Search,
  Unlock,
  Lock,
  MessageSquare,
  RefreshCw,
  Activity,
  FileSpreadsheet,
  Check,
  Award,
  ChevronRight,
  Sparkles,
  FileCode,
  Cpu,
  Zap,
  RotateCcw,
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { toast } from 'sonner';
import { FirestoreDataService } from '../../services/firestoreData.service.js';
import { RealtimeSyncService } from '../../services/realtimeSync.service.js';
import { supabase, isSupabaseConfigured } from '../../config/supabase.js';
import { DEFAULT_HARIPRASAD_PRACTICAL_TEST } from '../../data/lab-assessment-questions.data.js';
import { AttendanceSyncService } from '../../services/attendanceSync.service.js';
import { exportAssessmentMarkListExcel } from '../../utils/excelReportGenerator.js';
import { C_PROGRAMMING_COHORT_STUDENTS } from '../../data/c-programming-cohort.data.js';
import { getStudentLabExamPair } from '../../data/lab-assessment-questions.data.js';
import { getStudentPersonalizedQuestions } from '../../utils/testQuestionDistributor.js';
import { ASSESSMENT_4_TEST } from '../../data/assessment4-questions.data.js';
import { AdminTestDefinition } from '../../components/admin/AdminTestOrchestratorTab.js';

export const LiveAssessmentConsolePage: React.FC = () => {
  const { testId } = useParams<{ testId: string }>();
  const navigate = useNavigate();

  // Test Definition State
  const [test, setTest] = useState<AdminTestDefinition>(() => {
    try {
      const saved = localStorage.getItem('logicq_admin_tests');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          const match = parsed.find((t: any) => t.id === testId);
          if (match) return match;
        }
      }
    } catch {}
    return DEFAULT_HARIPRASAD_PRACTICAL_TEST;
  });


  // Enrolled Cohort (Sorted strictly by last 4 digits numeric roll number ascending: 1001 to 1119)
  const enrolledStudents = useMemo(() => {
    let list = [...C_PROGRAMMING_COHORT_STUDENTS];
    try {
      const local = localStorage.getItem('logicq_enrolled_students');
      if (local) {
        const parsed = JSON.parse(local);
        if (Array.isArray(parsed) && parsed.length > 0) list = parsed;
      }
    } catch {}

    return list.sort((a: any, b: any) => {
      const prnA = String(a.prn || a.studentPrn || a.id || '').trim();
      const prnB = String(b.prn || b.studentPrn || b.id || '').trim();
      const numA = parseInt(prnA.replace(/\D/g, '').slice(-4), 10) || 999999;
      const numB = parseInt(prnB.replace(/\D/g, '').slice(-4), 10) || 999999;
      if (numA !== numB) return numA - numB;
      return prnA.localeCompare(prnB);
    });
  }, []);

  // ---------------------------------------------------------------------------
  // ATTENDANCE ROSTER STATE & REALTIME MESH
  // ---------------------------------------------------------------------------
  const effectiveTestId = testId || test?.id || DEFAULT_HARIPRASAD_PRACTICAL_TEST.id;

  const [attendanceMap, setAttendanceMap] = useState<Record<string, any>>(() => {
    const initMap: Record<string, boolean> = {};
    if (typeof window !== 'undefined') {
      try {
        const effId = testId || DEFAULT_HARIPRASAD_PRACTICAL_TEST.id;
        const allPresent = localStorage.getItem(`logicq_lab_attendance_all_${effId}`) === 'PRESENT' ||
                           localStorage.getItem('logicq_all_students_present_master') === 'true';
        enrolledStudents.forEach((st: any) => {
          const prn = (st.prn || st.id || '').toUpperCase().trim();
          if (!prn) return;
          if (allPresent) {
            initMap[prn] = true;
          } else {
            const isPres = localStorage.getItem(`logicq_student_present_in_lab_${prn}`) === 'true' ||
                           localStorage.getItem(`logicq_verified_present_${prn}`) === 'true' ||
                           localStorage.getItem(`logicq_lab_attendance_any_${prn}`) === 'PRESENT' ||
                           localStorage.getItem(`logicq_lab_attendance_${effId}_${prn}`) === 'PRESENT';
            if (isPres) initMap[prn] = true;
          }
        });
      } catch {}
    }
    return initMap;
  });
  const [attendanceSearch, setAttendanceSearch] = useState('');
  const [attendanceFilter, setAttendanceFilter] = useState<'ALL' | 'PRESENT' | 'ABSENT' | 'FLAGGED'>('ALL');
  const [isBatchUpdating, setIsBatchUpdating] = useState(false);

  // Attendance Confirmation States (Mandatory Faculty Sign-off)
  const [isAttendanceConfirmed, setIsAttendanceConfirmed] = useState<boolean>(() => {
    return AttendanceSyncService.isAttendanceConfirmed(effectiveTestId) || Boolean(test?.attendanceConfirmed);
  });
  const [hasUnsavedAttendance, setHasUnsavedAttendance] = useState<boolean>(false);
  const [showConfirmModal, setShowConfirmModal] = useState<boolean>(false);
  const [isConfirmingAttendance, setIsConfirmingAttendance] = useState<boolean>(false);
  const [isAttendanceModalOpen, setIsAttendanceModalOpen] = useState<boolean>(false);
  const [attendanceModalSearch, setAttendanceModalSearch] = useState<string>('');
  const [attendanceModalFilter, setAttendanceModalFilter] = useState<'ALL' | 'PRESENT' | 'ABSENT'>('ALL');

  // Sync Attendance with Local + Live Attendance Stream
  useEffect(() => {
    if (!effectiveTestId) return;
    let isMounted = true;

    // 1. Ultra-fast multi-network live attendance stream (SSE + ntfy.sh)
    const unsubSync = AttendanceSyncService.listenAllAttendance(effectiveTestId, (map) => {
      if (!isMounted || !map) return;
      setAttendanceMap((prev) => {
        const next = { ...prev };
        Object.entries(map).forEach(([k, v]) => {
          const cleanPrn = k.toUpperCase().trim();
          if (next[cleanPrn] === true && v === false) {
            if (typeof window !== 'undefined' && (
              localStorage.getItem(`logicq_student_present_in_lab_${cleanPrn}`) === 'true' ||
              localStorage.getItem(`logicq_verified_present_${cleanPrn}`) === 'true' ||
              localStorage.getItem(`logicq_lab_attendance_any_${cleanPrn}`) === 'PRESENT'
            )) {
              return;
            }
          }
          next[cleanPrn] = v;
        });
        return next;
      });
    });

    // 2. Real-time subscription fallback
    const unsubFirestore = FirestoreDataService.listenToTestAttendance(effectiveTestId, (map: Record<string, boolean>) => {
      if (!isMounted || !map) return;
      setAttendanceMap((prev) => {
        const next = { ...prev };
        Object.entries(map).forEach(([k, v]) => {
          const cleanPrn = k.toUpperCase().trim();
          if (next[cleanPrn] === true && v === false) {
            if (typeof window !== 'undefined' && (
              localStorage.getItem(`logicq_student_present_in_lab_${cleanPrn}`) === 'true' ||
              localStorage.getItem(`logicq_verified_present_${cleanPrn}`) === 'true' ||
              localStorage.getItem(`logicq_lab_attendance_any_${cleanPrn}`) === 'PRESENT'
            )) {
              return;
            }
          }
          next[cleanPrn] = v;
        });
        return next;
      });
    });

    return () => {
      isMounted = false;
      unsubSync();
      unsubFirestore();
    };
  }, [effectiveTestId]);

  // Synchronize test status changes across all windows & admin tabs
  useEffect(() => {
    const unsub = AttendanceSyncService.listenToTestStatus((tid, newStatus) => {
      if (
        tid === effectiveTestId ||
        tid === DEFAULT_HARIPRASAD_PRACTICAL_TEST.id ||
        tid === 'test-continuous-arrays-search-sort' ||
        String(tid).startsWith('test-hariprasad-lab-')
      ) {
        setTest((prev) => ({ ...prev, status: newStatus as any }));
      }
    });
    return () => unsub();
  }, [effectiveTestId]);

  // Robust Presence Resolver
  const resolvePresence = useCallback((prn: string): boolean => {
    if (!prn) return false;
    const cleanPrn = prn.toUpperCase().trim();
    const entry = attendanceMap[cleanPrn];
    if (typeof entry === 'boolean') return entry;
    if (entry && typeof entry === 'object') {
      return Boolean(entry.isPresent || entry.status === 'PRESENT');
    }
    if (typeof entry === 'string') {
      return entry === 'PRESENT';
    }
    try {
      if (typeof window !== 'undefined') {
        const all = localStorage.getItem(`logicq_lab_attendance_all_${effectiveTestId}`) ||
                    localStorage.getItem('logicq_all_students_present_master');
        if (all === 'PRESENT' || all === 'true') return true;
        if (
          localStorage.getItem(`logicq_student_present_in_lab_${cleanPrn}`) === 'true' ||
          localStorage.getItem(`logicq_verified_present_${cleanPrn}`) === 'true' ||
          localStorage.getItem(`logicq_lab_attendance_any_${cleanPrn}`) === 'PRESENT'
        ) {
          return true;
        }
        const local = localStorage.getItem(`logicq_lab_attendance_${effectiveTestId}_${cleanPrn}`);
        if (local === 'PRESENT') return true;
        if (local === 'ABSENT') return false;
      }
    } catch {}
    return false;
  }, [attendanceMap, effectiveTestId]);

  // Explicit Single Student Presence (Present or Absent)
  const handleSetStudentAttendance = (student: any, nextState: boolean) => {
    const prn = (student.prn || student.id || '').toUpperCase().trim();
    if (!prn) return;
    const name = student.fullName || student.name || prn;

    // 1. Instant local state update
    setAttendanceMap((prev) => ({ ...prev, [prn]: nextState }));
    setHasUnsavedAttendance(true);

    // 2. Immediate local storage persistence (prevents background sync from reverting back to Absent)
    const aliases = AttendanceSyncService.canonicalTestAliases(effectiveTestId);
    const statusVal = nextState ? 'PRESENT' : 'ABSENT';
    try {
      aliases.forEach((tid) => {
        localStorage.setItem(`logicq_lab_attendance_${tid}_${prn}`, statusVal);
      });
      localStorage.setItem(`logicq_lab_attendance_${effectiveTestId}_${prn}`, statusVal);
      if (nextState) {
        localStorage.setItem(`logicq_lab_attendance_any_${prn}`, 'PRESENT');
        localStorage.setItem(`logicq_student_present_in_lab_${prn}`, 'true');
        localStorage.setItem(`logicq_verified_present_${prn}`, 'true');
        localStorage.removeItem(`logicq_exam_locked_${effectiveTestId}_${prn}`);
        localStorage.removeItem(`logicq_exam_locked_test-continuous-arrays-search-sort_${prn}`);
      } else {
        localStorage.removeItem(`logicq_lab_attendance_any_${prn}`);
        localStorage.removeItem(`logicq_student_present_in_lab_${prn}`);
        localStorage.removeItem(`logicq_verified_present_${prn}`);
        localStorage.removeItem(`logicq_lab_attendance_all_${effectiveTestId}`);
        localStorage.removeItem('logicq_lab_attendance_all_test-continuous-arrays-search-sort');
        localStorage.removeItem('logicq_all_students_present_master');
      }
    } catch {}

    // 3. User feedback
    if (nextState) {
      toast.success(`🟢 ${name} (${prn}) marked PRESENT! Exam unlocked.`);
    } else {
      toast.info(`🔴 ${name} (${prn}) marked ABSENT.`);
    }

    // 4. Update KeyVal cloud presence registry immediately so student machines in lab unlock in 0-1s
    try {
      const presentSet = new Set<string>();
      enrolledStudents.forEach((st: any) => {
        const p = (st.prn || st.id || '').toUpperCase().trim();
        if (p === prn) {
          if (nextState) presentSet.add(p);
        } else if (resolvePresence(p)) {
          presentSet.add(p);
        }
      });
      const prnsArray = Array.from(presentSet);
      const payloadVal = prnsArray.join(',') || 'NONE';
      fetch(`https://api.keyval.org/set/logicq_present_prns_v2026/${encodeURIComponent(payloadVal)}`, { signal: AbortSignal.timeout(2500) }).catch(() => null);
      fetch(`https://api.keyval.org/set/logicq_exam_confirmed_v2026/true`, { signal: AbortSignal.timeout(2500) }).catch(() => null);
    } catch {}

    // 5. Mark & broadcast across all networks immediately
    AttendanceSyncService.markAttendance(effectiveTestId, prn, nextState, name, student.email || '').catch(() => null);
  };

  // Toggle Single Student Presence
  const handleToggleAttendance = (student: any) => {
    const prn = (student.prn || student.id || '').toUpperCase().trim();
    if (!prn) return;
    const currentIsPresent = resolvePresence(prn);
    handleSetStudentAttendance(student, !currentIsPresent);
  };

  // Mark All Present (Saves & broadcasts immediately)
  const handleMarkAllPresent = () => {
    if (enrolledStudents.length === 0) return;
    const newMap: Record<string, boolean> = {};
    const records = enrolledStudents.map((s: any) => {
      const prn = (s.prn || s.id || '').toUpperCase().trim();
      newMap[prn] = true;
      return {
        prn,
        isPresent: true,
        studentName: s.fullName || s.name || prn,
        studentEmail: s.email || '',
      };
    }).filter((r) => Boolean(r.prn));
    setAttendanceMap(newMap);
    setIsAttendanceConfirmed(true);
    setHasUnsavedAttendance(false);
    toast.success(`🎉 Marked all ${enrolledStudents.length} students PRESENT! Exams unlocked.`);

    // 0-delay global unlock
    fetch(`https://api.keyval.org/set/logicq_present_prns_v2026/ALL`, { signal: AbortSignal.timeout(2500) }).catch(() => null);
    fetch(`https://api.keyval.org/set/logicq_exam_confirmed_v2026/true`, { signal: AbortSignal.timeout(2500) }).catch(() => null);

    AttendanceSyncService.confirmAndSaveAttendance(effectiveTestId, records).catch(() => null);
  };

  // Mark All Absent (Saves & broadcasts immediately)
  const handleMarkAllAbsent = () => {
    if (enrolledStudents.length === 0) return;
    const newMap: Record<string, boolean> = {};
    const records = enrolledStudents.map((s: any) => {
      const prn = (s.prn || s.id || '').toUpperCase().trim();
      newMap[prn] = false;
      return {
        prn,
        isPresent: false,
        studentName: s.fullName || s.name || prn,
        studentEmail: s.email || '',
      };
    }).filter((r) => Boolean(r.prn));
    setAttendanceMap(newMap);
    setIsAttendanceConfirmed(false);
    setHasUnsavedAttendance(false);
    try {
      localStorage.removeItem(`logicq_lab_attendance_all_${effectiveTestId}`);
      localStorage.removeItem('logicq_lab_attendance_all_test-continuous-arrays-search-sort');
      localStorage.removeItem('logicq_all_students_present_master');
      enrolledStudents.forEach((s: any) => {
        const prn = (s.prn || s.id || '').toUpperCase().trim();
        localStorage.removeItem(`logicq_student_present_in_lab_${prn}`);
        localStorage.removeItem(`logicq_verified_present_${prn}`);
        localStorage.removeItem(`logicq_lab_attendance_any_${prn}`);
      });
    } catch {}
    toast.info(`Marked all ${enrolledStudents.length} students ABSENT.`);

    fetch(`https://api.keyval.org/set/logicq_present_prns_v2026/NONE`, { signal: AbortSignal.timeout(2500) }).catch(() => null);

    AttendanceSyncService.confirmAndSaveAttendance(effectiveTestId, records).catch(() => null);
  };

  // Official Attendance Confirmation & Save (Finalizes & unlocks student tests)
  const handleConfirmAndSaveAttendance = async () => {
    if (enrolledStudents.length === 0) return;
    setIsConfirmingAttendance(true);
    try {
      const records = enrolledStudents.map((s: any) => {
        const prn = (s.prn || s.id || '').toUpperCase().trim();
        const isPres = resolvePresence(prn);
        return {
          prn,
          isPresent: isPres,
          studentName: s.fullName || s.name || prn,
          studentEmail: s.email || '',
        };
      }).filter((r) => Boolean(r.prn));

      const totalPresent = records.filter((r) => r.isPresent).length;

      // Close modal and update state instantly in 0ms (no UI hang)
      setIsAttendanceConfirmed(true);
      setHasUnsavedAttendance(false);
      setShowConfirmModal(false);
      setIsConfirmingAttendance(false);
      toast.success(`🎉 Lab Attendance Officially Confirmed! ${totalPresent} students can now start the test.`);

      // Update Keyval immediately
      const presentPrns = records.filter((r) => r.isPresent).map((r) => r.prn);
      const payloadVal = presentPrns.length === records.length ? 'ALL' : (presentPrns.join(',') || 'NONE');
      fetch(`https://api.keyval.org/set/logicq_present_prns_v2026/${encodeURIComponent(payloadVal)}`, { signal: AbortSignal.timeout(2500) }).catch(() => null);
      fetch(`https://api.keyval.org/set/logicq_exam_confirmed_v2026/true`, { signal: AbortSignal.timeout(2500) }).catch(() => null);

      // Fire background persistence asynchronously without blocking UI
      AttendanceSyncService.confirmAndSaveAttendance(effectiveTestId, records).catch(() => null);
    } catch (err: any) {
      setIsConfirmingAttendance(false);
      toast.error('Failed to confirm attendance: ' + (err?.message || 'Network error'));
    }
  };

  // Unlock Student Immediately (Clears cheating lockout & unlocks exam)
  const handleUnlockStudent = async (student: any) => {
    const prn = (student.prn || student.id || '').toUpperCase().trim();
    if (!prn) return;
    const name = student.fullName || student.name || prn;

    try {
      localStorage.removeItem(`logicq_exam_locked_${effectiveTestId}_${prn}`);
      localStorage.removeItem(`logicq_exam_locked_test-continuous-arrays-search-sort_${prn}`);
    } catch {}

    setCloudLockedPrns((prev) => {
      const next = { ...prev };
      delete next[prn];
      return next;
    });

    setAttendanceMap((prev) => ({ ...prev, [prn]: true }));
    toast.success(`🔓 ${name} (${prn}) Exam Unlocked! Student can now resume.`);

    try {
      await AttendanceSyncService.unlockStudentProctorLockout(prn, effectiveTestId);
      await AttendanceSyncService.markAttendance(effectiveTestId, prn, true, name, student.email || '');
      await FirestoreDataService.unlockStudentTest(effectiveTestId, prn);
    } catch (err) {
      console.warn('Unlock error note:', err);
    }
  };

  // Reset Student Test (Clears all submissions, attempts, locks & resets to clean start)
  const handleResetStudentTest = async (student: any) => {
    const prn = (student.prn || student.id || '').toUpperCase().trim();
    if (!prn) return;
    const name = student.fullName || student.name || prn;

    try {
      const aliases = AttendanceSyncService.canonicalTestAliases(effectiveTestId);
      aliases.forEach((tid) => {
        localStorage.removeItem(`logicq_exam_locked_${tid}_${prn}`);
        localStorage.removeItem(`logicq_exam_student_submitted_${tid}_${prn}`);
        localStorage.removeItem(`logicq_lab_attendance_${tid}_${prn}`);
      });
      localStorage.removeItem(`logicq_exam_test_completed_${effectiveTestId}`);
      localStorage.removeItem('logicq_exam_test_completed_test-continuous-arrays-search-sort');
      for (let i = localStorage.length - 1; i >= 0; i--) {
        const k = localStorage.key(i);
        if (k && (
          k.startsWith('logicq_exam_test_start') ||
          k.startsWith('logicq_exam_q_start') ||
          k.includes(prn)
        )) {
          localStorage.removeItem(k);
        }
      }

      const local = JSON.parse(localStorage.getItem('logicq_assessment_submissions') || '[]');
      const filtered = local.filter((x: any) => (x.studentPrn || x.prn || '').toUpperCase() !== prn);
      localStorage.setItem('logicq_assessment_submissions', JSON.stringify(filtered));
    } catch {}

    setCloudLockedPrns((prev) => {
      const next = { ...prev };
      delete next[prn];
      return next;
    });

    try {
      await AttendanceSyncService.resetIndividualStudentTest(prn, effectiveTestId);
    } catch {}

    setAttendanceMap((prev) => {
      const next = { ...prev };
      delete next[prn];
      return next;
    });

    setSubmissions((prev) => prev.map((s) => {
      if ((s.studentPrn || s.prn || s.id || '').toUpperCase() === prn) {
        return {
          ...s,
          q1: null,
          q2: null,
          academicScore: 0,
          tabSwitchCount: 0,
          fullscreenExits: 0,
          copyPasteAttempts: 0,
          timeTakenSeconds: 0,
          submittedAt: null,
        };
      }
      return s;
    }));

    toast.success(`🔄 Reset Complete: All attempts, scores & locks for ${name} (${prn}) cleared!`);
    RealtimeSyncService.emit('SUBMISSIONS');
    RealtimeSyncService.emit('TESTS');
  };

  // Bulk Reset All Flagged Students (Fresh Start with Same Questions)
  const handleResetAllFlagged = async () => {
    const flagged = submissions.filter(
      (s) => (s.fullscreenExits > 0 || s.copyPasteAttempts > 0 || s.tabSwitchCount >= 1 || cloudLockedPrns[s.studentPrn])
    );
    const prns = flagged.map((s) => s.studentPrn);
    if (prns.length === 0) {
      toast.info('No students currently flagged with proctoring violations.');
      return;
    }
    const toastId = toast.loading(`Resetting ${prns.length} flagged students for a fresh start...`);
    try {
      const count = await AttendanceSyncService.bulkResetFlaggedStudents(prns, effectiveTestId);
      toast.dismiss(toastId);
      toast.success(`🎉 Reset all ${count} flagged students! Fresh test unlocked with their same assigned questions.`);
      await loadSubmissions();
    } catch {
      toast.dismiss(toastId);
      toast.error('Network error resetting students.');
    }
  };

  const presentCount = useMemo(() => {
    return enrolledStudents.filter((s: any) => resolvePresence((s.prn || s.id || '').toUpperCase().trim())).length;
  }, [enrolledStudents, resolvePresence]);

  const absentCount = enrolledStudents.length - presentCount;

  // ---------------------------------------------------------------------------
  // SUBMISSIONS & PROCTORING STATE (Synced via Firestore & KeyVal Cloud Mesh)
  // ---------------------------------------------------------------------------
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [cloudLockedPrns, setCloudLockedPrns] = useState<Record<string, string>>({});
  const [inspectingStudent, setInspectingStudent] = useState<{ student: any; sub: any } | null>(null);
  const [copiedCodeSnippet, setCopiedCodeSnippet] = useState<string | null>(null);

  const submissionsByPrn = useMemo(() => {
    const map = new Map<string, any>();
    submissions.forEach((s) => {
      const prn = (s.studentPrn || s.prn || s.id || '').toUpperCase().trim();
      if (prn) map.set(prn, s);
    });
    return map;
  }, [submissions]);

  // Flagged / Locked Students Count (Cheating violations & lockout status)
  const flaggedCount = useMemo(() => {
    const isTestScheduled = test?.status === 'UPCOMING' || test?.status === 'SCHEDULED';
    if (isTestScheduled) return 0;

    return enrolledStudents.filter((st: any) => {
      const prn = (st.prn || st.id || '').toUpperCase().trim();
      const sub = submissionsByPrn.get(prn);
      const isBreached = Boolean(sub && (sub.fullscreenExits > 0 || sub.copyPasteAttempts > 0 || sub.tabSwitchCount >= 2));
      const isLockedLocal = typeof window !== 'undefined' && (
        localStorage.getItem(`logicq_exam_locked_${effectiveTestId}_${prn}`) === 'true'
      );
      const isCloudLocked = Boolean(cloudLockedPrns[prn]);
      return isBreached || isLockedLocal || isCloudLocked;
    }).length;
  }, [enrolledStudents, submissionsByPrn, effectiveTestId, cloudLockedPrns, test?.status]);

  // Filtered Attendance List (With Flagged / Locked Cheating Breaches filter)
  const filteredAttendanceStudents = useMemo(() => {
    const q = attendanceSearch.trim().toLowerCase();
    const isTestScheduled = test?.status === 'UPCOMING' || test?.status === 'SCHEDULED';

    return enrolledStudents.filter((s: any) => {
      const prn = (s.prn || s.id || '').toUpperCase().trim();
      const name = (s.fullName || s.name || '').toLowerCase();
      const matchesSearch = !q || prn.toLowerCase().includes(q) || name.includes(q);
      if (!matchesSearch) return false;

      const isPresent = resolvePresence(prn);
      if (attendanceFilter === 'PRESENT') return isPresent;
      if (attendanceFilter === 'ABSENT') return !isPresent;
      if (attendanceFilter === 'FLAGGED') {
        if (isTestScheduled) return false;
        const sub = submissionsByPrn.get(prn);
        const isBreached = Boolean(sub && (sub.fullscreenExits > 0 || sub.copyPasteAttempts > 0 || sub.tabSwitchCount >= 1));
        const isLockedLocal = typeof window !== 'undefined' && (
          localStorage.getItem(`logicq_exam_locked_${effectiveTestId}_${prn}`) === 'true'
        );
        const isCloudLocked = Boolean(cloudLockedPrns[prn]);
        return isBreached || isLockedLocal || isCloudLocked;
      }
      return true;
    });
  }, [enrolledStudents, attendanceSearch, attendanceFilter, resolvePresence, submissionsByPrn, effectiveTestId, cloudLockedPrns, test?.status]);

  const modalFilteredStudents = useMemo(() => {
    const q = attendanceModalSearch.trim().toLowerCase();
    return enrolledStudents.filter((s: any) => {
      const prn = (s.prn || s.id || '').toUpperCase().trim();
      const name = (s.fullName || s.name || '').toLowerCase();
      const matchesSearch = !q || prn.toLowerCase().includes(q) || name.includes(q);
      if (!matchesSearch) return false;

      const isPresent = resolvePresence(prn);
      if (attendanceModalFilter === 'PRESENT') return isPresent;
      if (attendanceModalFilter === 'ABSENT') return !isPresent;
      return true;
    });
  }, [enrolledStudents, attendanceModalSearch, attendanceModalFilter, resolvePresence]);

  const getAssignedPair = useCallback((studentPrn: string): [any, any] => {
    const isA4 = effectiveTestId === 'test-assessment-4' || effectiveTestId === 'assessment-4' || effectiveTestId === ASSESSMENT_4_TEST.id;
    const questionsList = (Array.isArray(test?.questions) && test.questions.length >= 120) ? test.questions : ASSESSMENT_4_TEST.questions;
    if (isA4 || questionsList.length >= 120) {
      const pair = getStudentPersonalizedQuestions(questionsList, 2, studentPrn);
      if (pair && pair.length >= 2) return [pair[0], pair[1]];
    }
    return getStudentLabExamPair(studentPrn);
  }, [effectiveTestId, test?.questions]);

  // Load Submissions (Local + Cloud Realtime Mesh)
  const loadSubmissions = useCallback(async () => {
    if (!effectiveTestId) return;
    try {
      const isTestScheduled = test?.status === 'UPCOMING' || test?.status === 'SCHEDULED';
      if (isTestScheduled) {
        // If the test has not started yet (SCHEDULED or UPCOMING), all students have completely clean slate: 0 locks, 0 submissions, ALL CLEAR
        setCloudLockedPrns({});
        const studentMap = new Map<string, any>();
        enrolledStudents.forEach((st) => {
          const prn = (st.prn || '').toUpperCase().trim();
          if (!prn) return;
          const [assignedQ1, assignedQ2] = getAssignedPair(prn);
          studentMap.set(prn, {
            id: prn,
            studentName: st.fullName || 'Student',
            studentPrn: prn,
            studentEmail: st.email || '',
            q1: null,
            q2: null,
            academicScore: 0,
            tabSwitchCount: 0,
            fullscreenExits: 0,
            copyPasteAttempts: 0,
            timeTakenSeconds: 0,
            submittedAt: null,
            assignedQ1,
            assignedQ2,
          });
        });
        const sorted = Array.from(studentMap.values()).sort((a, b) => {
          const prnA = (a.studentPrn || '').toUpperCase().trim();
          const prnB = (b.studentPrn || '').toUpperCase().trim();
          const numA = parseInt(prnA.replace(/\D/g, '').slice(-4), 10) || 0;
          const numB = parseInt(prnB.replace(/\D/g, '').slice(-4), 10) || 0;
          if (numA !== numB) return numA - numB;
          return prnA.localeCompare(prnB);
        });
        setSubmissions(sorted);
        return;
      }

      const live = await FirestoreDataService.getAssessmentSubmissions(effectiveTestId, test?.title);

      // Fetch live cloud submissions & locked students across different lab computers
      const presentPrns = enrolledStudents
        .map((st: any) => (st.prn || st.id || '').toUpperCase().trim())
        .filter((prn: string) => resolvePresence(prn));
      const [cloudSubs, lockedMap, resetSet] = await Promise.all([
        AttendanceSyncService.fetchLiveSubmissionsFromCloud(presentPrns),
        AttendanceSyncService.fetchLockedStudentsFromCloud(),
        AttendanceSyncService.fetchResetStudentsFromCloud(),
      ]);
      if (lockedMap) {
        const cleanedLockMap = { ...lockedMap };
        resetSet.forEach((p) => delete cleanedLockMap[p]);
        setCloudLockedPrns(cleanedLockMap);
      }
      const allSubs = [...(live || []), ...(cloudSubs || [])];

      const studentMap = new Map<string, any>();

      // Prepopulate enrolled cohort
      enrolledStudents.forEach((st) => {
        const prn = (st.prn || '').toUpperCase().trim();
        if (!prn) return;
        const [assignedQ1, assignedQ2] = getAssignedPair(prn);
        studentMap.set(prn, {
          id: prn,
          studentName: st.fullName || 'Student',
          studentPrn: prn,
          studentEmail: st.email || '',
          q1: null,
          q2: null,
          academicScore: 0,
          tabSwitchCount: 0,
          fullscreenExits: 0,
          copyPasteAttempts: 0,
          timeTakenSeconds: 0,
          submittedAt: null,
          assignedQ1,
          assignedQ2,
        });
      });

      // Merge authentic submissions (skip reset students so they get a completely fresh start)
      allSubs.forEach((s: any) => {
        const prn = (s.studentPrn || s.prn || s.id || '').toUpperCase().trim();
        if (!prn || !studentMap.has(prn)) return;
        if (resetSet.has(prn)) return;
        const rec = studentMap.get(prn);
        const [assignedQ1, assignedQ2] = getAssignedPair(prn);
        const isQ1 = s.problemId === assignedQ1?.id || (s.problemId && s.problemId.includes('arr')) || s.difficulty === 'EASY';
        const isQ2 = s.problemId === assignedQ2?.id || (s.problemId && s.problemId.includes('ss')) || s.difficulty === 'MEDIUM';

        rec.tabSwitchCount = Math.max(rec.tabSwitchCount, Number(s.tabSwitchCount) || 0);
        rec.fullscreenExits = Math.max(rec.fullscreenExits, Number(s.fullscreenExits || s.fullScreenExitCount) || 0);
        rec.copyPasteAttempts = Math.max(rec.copyPasteAttempts, Number(s.copyPasteAttempts) || 0);
        rec.timeTakenSeconds = Math.max(rec.timeTakenSeconds, Number(s.timeTakenSeconds) || 0);
        rec.totalKeystrokes = Math.max(Number(rec.totalKeystrokes) || 0, Number(s.totalKeystrokes) || 0);
        rec.largestBurstChars = Math.max(Number(rec.largestBurstChars) || 0, Number(s.largestBurstChars) || 0);
        rec.cpm = Math.max(Number(rec.cpm || rec.typingVelocityCPM) || 0, Number(s.cpm || s.typingVelocityCPM) || 0);
        rec.typingVelocityCPM = Math.max(Number(rec.typingVelocityCPM || rec.cpm) || 0, Number(s.typingVelocityCPM || s.cpm) || 0);

        if (isQ1) rec.q1 = s;
        else if (isQ2) rec.q2 = s;
        else if (!rec.q1) rec.q1 = s;
        else if (!rec.q2) rec.q2 = s;

        if (s.submittedAt) rec.submittedAt = s.submittedAt;
      });

      // Calculate scores
      studentMap.forEach((rec) => {
        const q1 = rec.q1 ? Number(rec.q1.academicScore != null ? rec.q1.academicScore : 5) : 0;
        const q2 = rec.q2 ? Number(rec.q2.academicScore != null ? rec.q2.academicScore : 5) : 0;
        rec.academicScore = q1 + q2;
      });

      const sorted = Array.from(studentMap.values()).sort((a: any, b: any) => {
        const prnA = String(a.studentPrn || a.prn || a.id || '').trim();
        const prnB = String(b.studentPrn || b.prn || b.id || '').trim();
        const numA = parseInt(prnA.replace(/\D/g, '').slice(-4), 10) || 999999;
        const numB = parseInt(prnB.replace(/\D/g, '').slice(-4), 10) || 999999;
        if (numA !== numB) return numA - numB;
        return prnA.localeCompare(prnB);
      });

      setSubmissions(sorted);
    } catch (err) {
      console.warn('Submissions load notice:', err);
    }
  }, [effectiveTestId, test?.title, enrolledStudents, resolvePresence]);

  useEffect(() => {
    loadSubmissions();
    const unsub = FirestoreDataService.listenToAssessmentSubmissions(effectiveTestId, () => {
      loadSubmissions();
    });

    let sbChannel: any = null;
    if (isSupabaseConfigured) {
      try {
        sbChannel = supabase
          .channel(`live_console_${effectiveTestId}`)
          .on('postgres_changes', { event: '*', schema: 'public', table: 'assessment_submissions' }, () => {
            loadSubmissions();
          })
          .on('postgres_changes', { event: '*', schema: 'public', table: 'student_locks' }, () => {
            loadSubmissions();
          })
          .on('postgres_changes', { event: '*', schema: 'public', table: 'test_attendance' }, () => {
            loadSubmissions();
          })
          .subscribe();
      } catch {}
    }

    const subInterval = setInterval(() => {
      loadSubmissions();
    }, 2500);
    return () => {
      unsub();
      if (sbChannel) supabase.removeChannel(sbChannel);
      clearInterval(subInterval);
    };
  }, [effectiveTestId, loadSubmissions]);

  // Submission KPI Counts
  const submittedCount = useMemo(() => submissions.filter((s) => s.q1 || s.q2).length, [submissions]);
  const cleanCount = useMemo(() => submissions.filter((s) => (s.q1 || s.q2) && s.fullscreenExits === 0 && s.copyPasteAttempts === 0 && s.tabSwitchCount === 0).length, [submissions]);

  // Toggle Test Status (ACTIVE <-> COMPLETED <-> UPCOMING)
  const handleToggleStatus = async () => {
    let nextStatus: 'ACTIVE' | 'UPCOMING' | 'COMPLETED' = 'ACTIVE';
    if (test.status === 'ACTIVE') {
      nextStatus = 'COMPLETED';
    } else if (test.status === 'COMPLETED') {
      nextStatus = 'UPCOMING'; // Reactivate moves to Scheduled
    } else if (test.status === 'UPCOMING') {
      nextStatus = 'ACTIVE';
    }

    const updatedTest: AdminTestDefinition = { ...test, status: nextStatus };
    setTest(updatedTest);

    try {
      const saved = localStorage.getItem('logicq_admin_tests');
      if (saved) {
        const list = JSON.parse(saved);
        const idx = list.findIndex((t: any) => t.id === test.id);
        if (idx >= 0) {
          list[idx] = updatedTest;
          localStorage.setItem('logicq_admin_tests', JSON.stringify(list));
        } else {
          list.push(updatedTest);
          localStorage.setItem('logicq_admin_tests', JSON.stringify(list));
        }
      } else {
        localStorage.setItem('logicq_admin_tests', JSON.stringify([updatedTest]));
      }

      const backup = localStorage.getItem('logicq_assessment_tests_backup_v1');
      if (backup) {
        const blist = JSON.parse(backup);
        if (Array.isArray(blist)) {
          const bidx = blist.findIndex((t: any) => t.id === test.id);
          if (bidx >= 0) {
            blist[bidx] = { ...blist[bidx], status: nextStatus };
          } else {
            blist.push({ ...updatedTest, status: nextStatus });
          }
          localStorage.setItem('logicq_assessment_tests_backup_v1', JSON.stringify(blist));
        }
      }
    } catch {}

    RealtimeSyncService.emit('TESTS');
    AttendanceSyncService.broadcastTestStatus(test.id, nextStatus, test.title).catch(() => null);
    if (test.id !== DEFAULT_HARIPRASAD_PRACTICAL_TEST.id) {
      AttendanceSyncService.broadcastTestStatus(DEFAULT_HARIPRASAD_PRACTICAL_TEST.id, nextStatus, test.title).catch(() => null);
    }
    AttendanceSyncService.broadcastTestStatus('test-continuous-arrays-search-sort', nextStatus, test.title).catch(() => null);
    if (nextStatus === 'UPCOMING') {
      toast.success('📅 Test moved to Scheduled!');
    } else if (nextStatus === 'ACTIVE') {
      toast.success('🟢 Test is now LIVE!');
    } else {
      toast.info('🏁 Test marked as COMPLETED.');
    }

    try {
      await FirestoreDataService.saveAssessmentTestToFirestore(updatedTest);
    } catch (e) {
      console.warn('Firestore test status notice:', e);
    }
  };

  // 1-Click Excel Export (Spacious, Beautiful Layout)
  const handleExportExcel = () => {
    if (submissions.length === 0) {
      toast.info('No submissions available to export.');
      return;
    }

    try {
      const annotated = submissions.map((s) => {
        const prn = (s.studentPrn || s.prn || s.id || '').toUpperCase().trim();
        const isPresent = resolvePresence(prn);
        return {
          ...s,
          attendanceStatus: isPresent ? 'PRESENT' : 'ABSENT',
        };
      });

      exportAssessmentMarkListExcel(test, annotated);
      toast.success('📊 Spacious, professional mark list report downloaded successfully!');
    } catch (err: any) {
      toast.error(err?.message || 'Failed to export Excel report.');
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#070b14] text-slate-900 dark:text-slate-100 font-sans selection:bg-indigo-500 selection:text-white pb-16">
      
      {/* Apple-Grade Glassmorphic Sticky Header */}
      <header className="sticky top-0 z-40 bg-white/80 dark:bg-[#070b14]/80 backdrop-blur-xl border-b border-slate-200/80 dark:border-white/10 px-4 sm:px-8 py-3.5 shadow-xs transition-all">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-3">
          
          {/* Left Title & Status Badges */}
          <div className="flex items-center gap-3.5 min-w-0">
            <button
              type="button"
              onClick={() => {
                if (window.history.length > 1) navigate(-1);
                else window.close();
              }}
              className="p-2 rounded-xl text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5 transition cursor-pointer shrink-0"
              title="Return to tests overview"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>

            <div className="min-w-0">
              <h1 className="text-base sm:text-xl font-black text-slate-900 dark:text-white tracking-tight truncate">
                {test.title}
              </h1>
            </div>
          </div>

          {/* Right Action Bar (Apple Pill Buttons) */}
          <div className="flex items-center gap-2 shrink-0 flex-wrap">
            <button
              type="button"
              onClick={() => setIsAttendanceModalOpen(true)}
              className="px-3.5 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold shadow-sm flex items-center gap-1.5 transition active:scale-95 cursor-pointer"
              title="Open full attendance roster with Present & Absent buttons for each student"
            >
              <Users className="w-3.5 h-3.5" />
              <span>Mark Attendance ({presentCount}/{enrolledStudents.length})</span>
            </button>

            <button
              type="button"
              onClick={handleToggleStatus}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition active:scale-95 cursor-pointer shadow-xs ${
                test.status === 'ACTIVE'
                  ? 'bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 dark:bg-rose-500/10 dark:text-rose-400 dark:border-rose-500/20'
                  : test.status === 'UPCOMING'
                  ? 'bg-indigo-600 hover:bg-indigo-500 text-white'
                  : 'bg-emerald-600 hover:bg-emerald-500 text-white'
              }`}
            >
              {test.status === 'ACTIVE' ? 'Mark Completed' : test.status === 'UPCOMING' ? 'Start Test Now' : 'Reactivate to Scheduled'}
            </button>

            <button
              type="button"
              onClick={handleExportExcel}
              className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-bold shadow-sm flex items-center gap-1.5 transition active:scale-95 cursor-pointer"
              title="Download full student marks report with Q1 & Q2 timestamps in Excel format"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download Excel</span>
            </button>

            <button
              type="button"
              onClick={() => {
                navigator.clipboard.writeText('https://logicq-clanguage.web.app/student/tests');
                toast.success('📋 Student Test URL copied! Share with your lab cohort.');
              }}
              className="p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/5 border border-slate-200 dark:border-white/10 transition cursor-pointer"
              title="Copy Student Test Link"
            >
              <Copy className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-7xl mx-auto px-4 sm:px-8 pt-6 space-y-6">

        {/* Top Metric Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="p-5 rounded-3xl bg-white dark:bg-[#0c1017] border border-slate-200/80 dark:border-white/10 shadow-xs flex items-center justify-between">
            <div>
              <span className="text-xs font-mono uppercase text-slate-400 font-bold">Total Enrolled</span>
              <h3 className="text-2xl font-black text-slate-900 dark:text-white mt-1">
                {enrolledStudents.length} Students
              </h3>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center font-bold">
              <Users className="w-6 h-6" />
            </div>
          </div>

          <div className="p-5 rounded-3xl bg-white dark:bg-[#0c1017] border border-slate-200/80 dark:border-white/10 shadow-xs flex items-center justify-between">
            <div>
              <span className="text-xs font-mono uppercase text-emerald-500 font-bold">Verified Present</span>
              <h3 className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1">
                {presentCount} Students
              </h3>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold">
              <CheckCircle2 className="w-6 h-6" />
            </div>
          </div>

          <div className="p-5 rounded-3xl bg-white dark:bg-[#0c1017] border border-slate-200/80 dark:border-white/10 shadow-xs flex items-center justify-between">
            <div>
              <span className="text-xs font-mono uppercase text-rose-500 font-bold">Absent</span>
              <h3 className="text-2xl font-black text-rose-600 dark:text-rose-400 mt-1">
                {absentCount} Students
              </h3>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-rose-500/10 text-rose-600 dark:text-rose-400 flex items-center justify-center font-bold">
              <X className="w-6 h-6" />
            </div>
          </div>

          <div className="p-5 rounded-3xl bg-white dark:bg-[#0c1017] border border-slate-200/80 dark:border-white/10 shadow-xs flex items-center justify-between">
            <div>
              <span className="text-xs font-mono uppercase text-indigo-500 font-bold">Submissions</span>
              <h3 className="text-2xl font-black text-indigo-600 dark:text-indigo-400 mt-1">
                {submittedCount} / {enrolledStudents.length}
              </h3>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold">
              <Activity className="w-6 h-6" />
            </div>
          </div>
        </div>

            {/* Attendance Roster Panel */}
            <div className="p-5 sm:p-6 rounded-3xl bg-white dark:bg-[#0c1017] border border-slate-200/80 dark:border-white/10 shadow-sm space-y-5">
              
              {/* Controls Bar */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3 flex-1">
                  <div className="relative flex-1 max-w-md">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      placeholder="Search student by name, PRN, or roll number..."
                      value={attendanceSearch}
                      onChange={(e) => setAttendanceSearch(e.target.value)}
                      className="w-full pl-10 pr-4 py-2 rounded-2xl text-xs bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
                    />
                  </div>

                  {/* Filter Chips */}
                  <div className="flex items-center gap-1.5 p-1 rounded-2xl bg-slate-100 dark:bg-white/5 border border-slate-200/80 dark:border-white/10 text-xs flex-wrap">
                    {(['ALL', 'PRESENT', 'ABSENT', 'FLAGGED'] as const).map((filter) => {
                      const isFlagged = filter === 'FLAGGED';
                      const active = attendanceFilter === filter;
                      const label =
                        filter === 'ALL'
                          ? `All (${enrolledStudents.length})`
                          : filter === 'PRESENT'
                          ? `Present (${presentCount})`
                          : filter === 'ABSENT'
                          ? `Absent (${absentCount})`
                          : `🚨 Flagged / Locked (${flaggedCount})`;

                      return (
                        <button
                          key={filter}
                          type="button"
                          onClick={() => setAttendanceFilter(filter)}
                          className={`px-3 py-1 rounded-xl font-bold transition cursor-pointer flex items-center gap-1.5 ${
                            active
                              ? isFlagged
                                ? 'bg-rose-600 text-white shadow-xs'
                                : 'bg-purple-600 text-white shadow-xs'
                              : isFlagged && flaggedCount > 0
                              ? 'text-rose-600 dark:text-rose-400 bg-rose-500/10 hover:bg-rose-500/20'
                              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                          }`}
                        >
                          {isFlagged && <ShieldAlert className="w-3.5 h-3.5 shrink-0" />}
                          <span>{label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Batch Actions & Official Finalization */}
                <div className="flex items-center gap-2 shrink-0 flex-wrap">
                  <button
                    type="button"
                    onClick={() => setIsAttendanceModalOpen(true)}
                    className="px-4 py-2 rounded-2xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold shadow-md shadow-purple-600/20 flex items-center gap-2 transition active:scale-95 cursor-pointer"
                    title="Open student attendance roster with individual Present & Absent buttons"
                  >
                    <Users className="w-4 h-4 text-white" />
                    <span>📋 Attendance ({presentCount}/{enrolledStudents.length} Present)</span>
                  </button>

                  <button
                    type="button"
                    disabled={isBatchUpdating}
                    onClick={handleMarkAllPresent}
                    className="px-3.5 py-2 rounded-2xl bg-slate-100 hover:bg-slate-200 dark:bg-white/5 dark:hover:bg-white/10 text-slate-700 dark:text-slate-300 text-xs font-bold border border-slate-200 dark:border-white/10 transition active:scale-95 cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                    <span>Mark All Present</span>
                  </button>

                  {/* Reset All Flagged Students Button */}
                  <button
                    type="button"
                    onClick={handleResetAllFlagged}
                    className="px-3.5 py-2 rounded-2xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 text-xs font-bold border border-rose-500/25 transition active:scale-95 cursor-pointer flex items-center gap-1.5 shadow-xs"
                    title="Clear all proctoring violations & submissions for flagged students so they start a fresh test with the SAME questions"
                  >
                    <RotateCcw className="w-3.5 h-3.5 text-rose-500" />
                    <span>Reset Flagged ({flaggedCount})</span>
                  </button>

                  {/* High-Impact Mandatory Confirmation Button */}
                  <button
                    type="button"
                    onClick={() => setShowConfirmModal(true)}
                    className={`px-4 py-2 rounded-2xl text-xs font-black shadow-md flex items-center gap-2 transition active:scale-95 cursor-pointer ${
                      isAttendanceConfirmed && !hasUnsavedAttendance
                        ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-600/20'
                        : 'bg-gradient-to-r from-purple-600 via-indigo-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white ring-2 ring-purple-400/50 shadow-purple-500/25 animate-pulse'
                    }`}
                    title="Confirm and officially publish attendance. Students will be unlocked only after confirmation."
                  >
                    <CheckCircle2 className="w-4 h-4 text-white" />
                    <span>
                      {isAttendanceConfirmed && !hasUnsavedAttendance
                        ? `Attendance Confirmed (${presentCount} Present)`
                        : `Confirm & Save Attendance (${presentCount} Present)`}
                    </span>
                  </button>
                </div>
              </div>

              {/* Attendance Finalization Status Banner */}
              {!isAttendanceConfirmed ? (
                <div className="px-4 py-3 rounded-2xl bg-amber-500/10 border border-amber-500/25 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-amber-800 dark:text-amber-300">
                  <div className="flex items-center gap-2.5">
                    <Clock className="w-4 h-4 text-amber-500 shrink-0" />
                    <span>
                      <strong>Draft Attendance Mode:</strong> Mark students present/absent below. Students <strong>cannot</strong> enter the test until you click <strong>"Confirm & Save Attendance"</strong>.
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowConfirmModal(true)}
                    className="px-3.5 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs shrink-0 cursor-pointer shadow-xs transition active:scale-95 self-start sm:self-auto"
                  >
                    Confirm & Save Now &rarr;
                  </button>
                </div>
              ) : hasUnsavedAttendance ? (
                <div className="px-4 py-3 rounded-2xl bg-indigo-500/10 border border-indigo-500/25 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-indigo-800 dark:text-indigo-300">
                  <div className="flex items-center gap-2.5">
                    <AlertTriangle className="w-4 h-4 text-indigo-500 shrink-0" />
                    <span>
                      <strong>Unsaved Attendance Changes:</strong> You made changes to student attendance. Click <strong>"Confirm & Save Attendance"</strong> to publish updates to students.
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowConfirmModal(true)}
                    className="px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shrink-0 cursor-pointer shadow-xs transition active:scale-95 self-start sm:self-auto"
                  >
                    Save & Publish Changes &rarr;
                  </button>
                </div>
              ) : (
                <div className="px-4 py-2.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-between gap-3 text-xs text-emerald-800 dark:text-emerald-300">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                    <span>
                      <strong>Attendance Confirmed & Saved:</strong> {presentCount} students have been unlocked for the test ({absentCount} marked absent).
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowConfirmModal(true)}
                    className="text-[11px] font-bold text-emerald-700 dark:text-emerald-400 hover:underline cursor-pointer"
                  >
                    Re-confirm / Edit
                  </button>
                </div>
              )}

              {/* 3x3 Apple-Grade Live Student Inspection Cards (Ascending PRN: 1001 to 1119) */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
                {filteredAttendanceStudents.map((st: any, idx: number) => {
                  const prn = (st.prn || st.id || '').toUpperCase().trim();
                  const isPresent = resolvePresence(prn);
                  const shortRoll = prn.slice(-4) || String(idx + 1);
                  const sub = submissionsByPrn.get(prn);
                  const [assignedQ1, assignedQ2] = getAssignedPair(prn);

                  // Cheating & Integrity Status Radar Calculation
                  const isTestScheduled = test?.status === 'UPCOMING' || test?.status === 'SCHEDULED';
                  const isLockedLocal = (!isTestScheduled) && typeof window !== 'undefined' && (
                    localStorage.getItem(`logicq_exam_locked_${effectiveTestId}_${prn}`) === 'true'
                  );
                  const isCloudLocked = (!isTestScheduled) && Boolean(cloudLockedPrns[prn]);
                  const breachReason = (!isTestScheduled) ? (cloudLockedPrns[prn] || (typeof window !== 'undefined' ? localStorage.getItem(`logicq_exam_proctor_lock_reason_${prn}`) : '')) : '';
                  const isExamLocked = (!isTestScheduled) && (isCloudLocked || isLockedLocal || Boolean(sub && (sub.fullscreenExits > 1 || sub.copyPasteAttempts > 1 || sub.tabSwitchCount >= 2 || (sub.fullscreenExits + sub.copyPasteAttempts >= 2))));
                  const isFlagged = (!isTestScheduled) && !isExamLocked && sub && (sub.fullscreenExits > 0 || sub.copyPasteAttempts > 0);
                  const isSuspicious = (!isTestScheduled) && !isExamLocked && sub && sub.tabSwitchCount > 0 && !isFlagged;

                  const q1Score = sub?.q1 ? (sub.q1.academicScore != null ? sub.q1.academicScore : 5) : 0;
                  const q2Score = sub?.q2 ? (sub.q2.academicScore != null ? sub.q2.academicScore : 5) : 0;
                  const totalScore = sub?.academicScore != null ? sub.academicScore : (q1Score + q2Score);
                  const hasSubmittedAny = Boolean(sub?.q1 || sub?.q2);

                  return (
                    <div
                      key={prn || idx}
                      className={`p-5 rounded-3xl border transition-all flex flex-col justify-between gap-4 shadow-xs hover:shadow-md ${
                        isExamLocked
                          ? 'bg-rose-50/60 dark:bg-rose-950/30 border-rose-500/50 ring-2 ring-rose-500/30'
                          : isPresent
                          ? 'bg-white dark:bg-[#0e131d] border-emerald-500/30 dark:border-emerald-500/25 ring-1 ring-emerald-500/10'
                          : 'bg-white dark:bg-[#0c1017] border-slate-200/90 dark:border-white/10 hover:border-slate-300 dark:hover:border-white/20'
                      }`}
                    >
                      {/* Card Header: Roll Number, Attendance Status & Cheating Alert */}
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className="px-2.5 py-1 rounded-xl bg-slate-100 dark:bg-white/10 text-slate-800 dark:text-slate-200 font-mono font-black text-xs">
                            #{shortRoll}
                          </span>
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase tracking-wider ${
                            isPresent
                              ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                              : 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20'
                          }`}>
                            {isPresent ? '● Present' : '○ Absent'}
                          </span>
                        </div>

                        {/* Cheating Status Alert Badge on Top of the Box */}
                        <div>
                          {isExamLocked ? (
                            <span className="px-2.5 py-1 rounded-full text-[10px] font-mono font-bold bg-rose-600 text-white flex items-center gap-1.5 shadow-sm animate-pulse">
                              <Lock className="w-3.5 h-3.5 shrink-0" />
                              <span>LOCKED ({sub?.fullscreenExits || 0}E / {sub?.copyPasteAttempts || 0}P / {sub?.tabSwitchCount || 0}T)</span>
                            </span>
                          ) : isFlagged ? (
                            <span className="px-2.5 py-1 rounded-full text-[10px] font-mono font-bold bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/30 flex items-center gap-1.5 shadow-xs">
                              <ShieldAlert className="w-3.5 h-3.5 shrink-0" />
                              <span>FLAGGED ({sub.fullscreenExits}E / {sub.copyPasteAttempts}P)</span>
                            </span>
                          ) : isSuspicious ? (
                            <span className="px-2.5 py-1 rounded-full text-[10px] font-mono font-bold bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30 flex items-center gap-1.5 shadow-xs">
                              <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                              <span>SUSPICIOUS ({sub.tabSwitchCount} Tabs)</span>
                            </span>
                          ) : (
                            <span className="px-2.5 py-1 rounded-full text-[10px] font-mono font-bold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 flex items-center gap-1.5">
                              <ShieldCheck className="w-3.5 h-3.5 shrink-0" />
                              <span>ALL CLEAR</span>
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Student Details: Name, PRN, Email */}
                      <div className="space-y-1.5">
                        <h4 className="text-sm font-black text-slate-900 dark:text-white leading-tight line-clamp-1" title={st.fullName || st.name}>
                          {st.fullName || st.name || `Student ${idx + 1}`}
                        </h4>

                        <div className="space-y-1 text-xs">
                          <p className="font-mono text-slate-600 dark:text-slate-300 flex items-center gap-1.5">
                            <span className="text-slate-400 text-[11px]">PRN:</span>
                            <strong className="font-bold tracking-tight text-slate-900 dark:text-white">{prn}</strong>
                          </p>
                        </div>

                        {/* Cheating Violation Banner if Locked */}
                        {isExamLocked && (
                          <div className="p-2 rounded-xl bg-rose-500/10 border border-rose-500/25 space-y-0.5">
                            <div className="flex items-center gap-1 text-rose-600 dark:text-rose-400 font-bold text-[10px]">
                              <ShieldAlert className="w-3 h-3 shrink-0" />
                              <span>Cheating Breach (Auto-Submitted)</span>
                            </div>
                            <p className="text-[10px] font-mono text-rose-700 dark:text-rose-300 truncate">
                              {breachReason || `Exits: ${sub?.fullscreenExits || 0} | Tabs: ${sub?.tabSwitchCount || 0} | Copy: ${sub?.copyPasteAttempts || 0}`}
                            </p>
                          </div>
                        )}

                        {/* Submission Preview Badge & Live Typing / Telemetry Bar */}
                        <div className="pt-1 space-y-1.5">
                          <div className="px-3 py-1.5 rounded-xl bg-slate-50 dark:bg-white/[0.03] border border-slate-200/60 dark:border-white/5 flex items-center justify-between text-[11px] font-mono">
                            <span className="text-slate-500 dark:text-slate-400 truncate">
                              {assignedQ1?.title ? (assignedQ1.title.length > 20 ? assignedQ1.title.slice(0, 18) + '...' : assignedQ1.title) : 'Q1: Arrays'} &bull; {assignedQ2?.title ? (assignedQ2.title.length > 20 ? assignedQ2.title.slice(0, 18) + '...' : assignedQ2.title) : 'Q2: Search'}
                            </span>
                            <span className={`font-bold shrink-0 ${hasSubmittedAny ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400'}`}>
                              {hasSubmittedAny ? `${totalScore} / 10 M` : 'Pending'}
                            </span>
                          </div>

                          {/* Quick Live Integrity & Typing Telemetry Strip */}
                          {(() => {
                            const cardCpm = Math.max(
                              Number(sub?.cpm || sub?.typingVelocityCPM) || 0,
                              Number(sub?.q1?.cpm || sub?.q1?.typingVelocityCPM) || 0,
                              Number(sub?.q2?.cpm || sub?.q2?.typingVelocityCPM) || 0
                            );
                            const cardKeys = Math.max(
                              Number(sub?.totalKeystrokes) || 0,
                              Number(sub?.q1?.totalKeystrokes) || 0,
                              Number(sub?.q2?.totalKeystrokes) || 0,
                              (sub?.q1?.code?.length || 0) + (sub?.q2?.code?.length || 0)
                            );
                            const cardWpm = Math.round(cardCpm / 5);
                            const exits = Number(sub?.fullscreenExits || 0);
                            const copyP = Number(sub?.copyPasteAttempts || 0);
                            const tabs = Number(sub?.tabSwitchCount || 0);

                            return (
                              <div className="flex items-center justify-between text-[10px] font-mono px-1">
                                <span className="flex items-center gap-1 text-indigo-600 dark:text-indigo-400 font-semibold truncate">
                                  <Activity className="w-3 h-3 text-indigo-500 shrink-0" />
                                  <span>
                                    {cardCpm > 0
                                      ? `${cardCpm} CPM (${cardWpm} WPM)`
                                      : cardKeys > 0
                                      ? `${cardKeys} keys`
                                      : 'Idle / Ready'}
                                  </span>
                                </span>
                                <div className="flex items-center gap-1.5 shrink-0">
                                  {(exits > 0 || copyP > 0) && (
                                    <span className="text-rose-500 font-bold flex items-center gap-0.5" title="Fullscreen exits / Copy-paste attempts">
                                      <ShieldAlert className="w-3 h-3" />
                                      {exits}E / {copyP}P
                                    </span>
                                  )}
                                  {tabs > 0 && (
                                    <span className="text-amber-500 font-bold flex items-center gap-0.5" title="Tab switches">
                                      <AlertTriangle className="w-3 h-3" />
                                      {tabs}T
                                    </span>
                                  )}
                                  {exits === 0 && copyP === 0 && tabs === 0 && (
                                    <span className="text-emerald-500/80 font-medium">✓ Clean</span>
                                  )}
                                </div>
                              </div>
                            );
                          })()}
                        </div>
                      </div>

                      {/* Action Buttons Row (Mark Present button removed from individual cards as requested) */}
                      <div className="pt-3 border-t border-slate-100 dark:border-white/5 flex items-center gap-2">
                        {/* Button 1: Unlock Student Exam */}
                        <button
                          type="button"
                          onClick={() => handleUnlockStudent(st)}
                          className={`flex-1 py-2 px-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition active:scale-95 cursor-pointer shadow-xs ${
                            isExamLocked
                              ? 'bg-rose-600 hover:bg-rose-500 text-white border-rose-600 shadow-md shadow-rose-600/30 ring-2 ring-rose-400/50 animate-pulse'
                              : 'border-amber-300 dark:border-amber-500/30 bg-amber-50 hover:bg-amber-100 dark:bg-amber-500/10 dark:hover:bg-amber-500/20 text-amber-700 dark:text-amber-400'
                          }`}
                          title="Unlock student exam in case locked due to tab-switching or cheating limit"
                        >
                          <Unlock className="w-3.5 h-3.5" />
                          <span>{isExamLocked ? 'Unlock Student' : 'Unlock'}</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleResetStudentTest(st)}
                          className="px-2.5 py-2 rounded-xl border border-rose-200 dark:border-rose-500/30 bg-rose-50 hover:bg-rose-100 dark:bg-rose-500/10 dark:hover:bg-rose-500/20 text-rose-700 dark:text-rose-400 text-xs font-bold flex items-center justify-center gap-1 transition active:scale-95 cursor-pointer shadow-xs"
                          title="Reset student test attempt fresh"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                          <span>Reset</span>
                        </button>

                        {/* Button 2: View Submitted Answers / Activities */}
                        <button
                          type="button"
                          onClick={() => setInspectingStudent({
                            student: st,
                            sub: sub || {
                              studentName: st.fullName || st.name,
                              studentPrn: prn,
                              studentEmail: st.email,
                              q1: null,
                              q2: null,
                              academicScore: 0,
                              tabSwitchCount: 0,
                              fullscreenExits: 0,
                              copyPasteAttempts: 0,
                              totalKeystrokes: 0,
                              largestBurstChars: 0,
                              cpm: 0,
                              typingVelocityCPM: 0,
                              assignedQ1,
                              assignedQ2,
                            },
                          })}
                          className="flex-1 py-2 px-3 rounded-xl bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-500/10 dark:hover:bg-indigo-500/20 text-indigo-700 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-500/30 text-xs font-bold flex items-center justify-center gap-1.5 transition active:scale-95 cursor-pointer"
                          title="View student's submitted code, test cases passed and proctoring activity"
                        >
                          <FileCode className="w-3.5 h-3.5" />
                          <span>Answers</span>
                        </button>

                        {/* Button 3: Reset Student Exam */}
                        <button
                          type="button"
                          onClick={() => handleResetStudentTest(st)}
                          className="py-2 px-2.5 rounded-xl border border-slate-200 dark:border-white/10 hover:bg-rose-500/10 hover:border-rose-500/30 hover:text-rose-600 dark:hover:text-rose-400 text-slate-500 dark:text-slate-400 text-xs font-bold transition active:scale-95 cursor-pointer"
                          title="Reset student test attempts, submissions & lock status completely"
                        >
                          <RefreshCw className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
      </main>

      {/* Attendance Finalization Confirmation Modal */}
      {showConfirmModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in">
          <div className="max-w-md w-full bg-white dark:bg-[#0c1017] border border-slate-200 dark:border-white/10 rounded-3xl p-6 sm:p-7 shadow-2xl space-y-5 animate-in zoom-in-95">
            <div className="w-14 h-14 rounded-2xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20 flex items-center justify-center mx-auto shadow-xs">
              <CheckCircle2 className="w-7 h-7" />
            </div>

            <div className="text-center space-y-1.5">
              <h3 className="text-xl font-black text-slate-900 dark:text-white">
                Confirm & Save Lab Attendance?
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                Review below before saving. Once confirmed, only verified <strong>PRESENT</strong> students will be allowed to start the practical exam.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 py-1">
              <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-center space-y-0.5">
                <span className="text-[10px] font-mono font-bold uppercase text-emerald-600 dark:text-emerald-400">Verified Present</span>
                <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400">{presentCount}</p>
                <span className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">Will be UNLOCKED</span>
              </div>

              <div className="p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-center space-y-0.5">
                <span className="text-[10px] font-mono font-bold uppercase text-rose-600 dark:text-rose-400">Marked Absent</span>
                <p className="text-2xl font-black text-rose-600 dark:text-rose-400">{absentCount}</p>
                <span className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">Will remain LOCKED</span>
              </div>
            </div>

            <p className="text-[11px] text-slate-400 dark:text-slate-500 text-center italic">
              Attendance will be synced across all student lab computers instantly.
            </p>

            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowConfirmModal(false)}
                className="flex-1 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-white/10 dark:hover:bg-white/15 text-slate-700 dark:text-slate-300 font-bold text-xs transition cursor-pointer"
              >
                Cancel
              </button>

              <button
                type="button"
                disabled={isConfirmingAttendance}
                onClick={handleConfirmAndSaveAttendance}
                className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md shadow-emerald-600/20 transition active:scale-95 cursor-pointer disabled:opacity-50 flex items-center justify-center gap-1.5"
              >
                {isConfirmingAttendance ? 'Saving...' : 'Yes, Confirm & Save'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* DEDICATED STUDENT ATTENDANCE ROSTER MODAL (WITH BOTH PRESENT & ABSENT BUTTONS) */}
      {/* ========================================================================= */}
      {isAttendanceModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-md flex items-center justify-center p-3 sm:p-5 animate-in fade-in">
          <div className="w-full max-w-4xl bg-white dark:bg-[#0c1017] border border-slate-200/90 dark:border-white/10 rounded-3xl p-5 sm:p-7 shadow-2xl space-y-4 animate-in zoom-in-95 max-h-[92vh] flex flex-col">
            
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3.5 border-b border-slate-100 dark:border-white/5 shrink-0">
              <div className="flex items-center gap-3">
                <span className="p-2.5 rounded-2xl bg-purple-500/10 text-purple-600 dark:text-purple-400">
                  <Users className="w-6 h-6" />
                </span>
                <div>
                  <h3 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white tracking-tight">
                    Student Attendance Roster
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {test.title} • Section: <strong className="text-slate-700 dark:text-slate-200">{test.sectionTarget || 'Integrated Mtech'}</strong> ({enrolledStudents.length} enrolled)
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsAttendanceModalOpen(false)}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/5 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Quick Actions & Filters Bar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0">
              {/* Search */}
              <div className="relative flex-1 max-w-md">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search student by name, PRN, or roll #..."
                  value={attendanceModalSearch}
                  onChange={(e) => setAttendanceModalSearch(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 rounded-2xl text-xs bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>

              {/* Filter Tabs */}
              <div className="flex items-center gap-1.5 p-1 rounded-2xl bg-slate-100 dark:bg-white/5 border border-slate-200/80 dark:border-white/10 text-xs">
                {(['ALL', 'PRESENT', 'ABSENT'] as const).map((filter) => {
                  const active = attendanceModalFilter === filter;
                  const label =
                    filter === 'ALL'
                      ? `All (${enrolledStudents.length})`
                      : filter === 'PRESENT'
                      ? `Present (${presentCount})`
                      : `Absent (${absentCount})`;
                  return (
                    <button
                      key={filter}
                      type="button"
                      onClick={() => setAttendanceModalFilter(filter)}
                      className={`px-3 py-1 rounded-xl font-bold transition cursor-pointer ${
                        active
                          ? 'bg-purple-600 text-white shadow-xs'
                          : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                      }`}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>

              {/* Batch Actions */}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleMarkAllPresent}
                  className="px-3 py-1.5 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 text-xs font-bold transition active:scale-95 cursor-pointer flex items-center gap-1"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Mark All Present</span>
                </button>
                <button
                  type="button"
                  onClick={handleMarkAllAbsent}
                  className="px-3 py-1.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 border border-rose-500/20 text-xs font-bold transition active:scale-95 cursor-pointer flex items-center gap-1"
                >
                  <X className="w-3.5 h-3.5" />
                  <span>Mark All Absent</span>
                </button>
              </div>
            </div>

            {/* Scrollable Students List */}
            <div className="flex-1 overflow-y-auto space-y-2 pr-1 min-h-[300px]">
              {modalFilteredStudents.length === 0 ? (
                <div className="p-8 text-center text-slate-400 text-xs italic">
                  No students matching your search criteria.
                </div>
              ) : (
                modalFilteredStudents.map((st: any, idx: number) => {
                  const prn = (st.prn || st.id || '').toUpperCase().trim();
                  const name = st.fullName || st.name || prn;
                  const isPresent = resolvePresence(prn);
                  const shortRoll = prn.slice(-4) || String(idx + 1);

                  return (
                    <div
                      key={prn || idx}
                      className={`p-3 sm:p-3.5 rounded-2xl border transition-all flex items-center justify-between gap-3 ${
                        isPresent
                          ? 'bg-emerald-50/40 dark:bg-emerald-950/20 border-emerald-500/25'
                          : 'bg-white dark:bg-white/[0.02] border-slate-200/80 dark:border-white/5'
                      }`}
                    >
                      {/* Left: Roll, Name & PRN */}
                      <div className="flex items-center gap-3 min-w-0">
                        <span className="px-2.5 py-1 rounded-xl bg-slate-100 dark:bg-white/10 text-slate-800 dark:text-slate-200 font-mono font-black text-xs shrink-0">
                          #{shortRoll}
                        </span>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <h4 className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white truncate">
                              {name}
                            </h4>
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase tracking-wider shrink-0 ${
                              isPresent
                                ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30'
                                : 'bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/30'
                            }`}>
                              {isPresent ? '● Present' : '○ Absent'}
                            </span>
                          </div>
                          <p className="text-[11px] font-mono text-slate-500 dark:text-slate-400 truncate">
                            PRN: {prn}
                          </p>
                        </div>
                      </div>

                      {/* Right: BOTH Present & Absent Buttons Side-by-Side */}
                      <div className="flex items-center gap-2 shrink-0">
                        {/* PRESENT Button */}
                        <button
                          type="button"
                          onClick={() => handleSetStudentAttendance(st, true)}
                          className={`px-3 sm:px-4 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition active:scale-95 cursor-pointer shadow-xs ${
                            isPresent
                              ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-600/25 ring-2 ring-emerald-500/30'
                              : 'bg-slate-100 hover:bg-emerald-50 dark:bg-white/5 dark:hover:bg-emerald-500/15 text-slate-600 dark:text-slate-300 hover:text-emerald-600 dark:hover:text-emerald-400 border border-slate-200 dark:border-white/10'
                          }`}
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Present</span>
                        </button>

                        {/* ABSENT Button */}
                        <button
                          type="button"
                          onClick={() => handleSetStudentAttendance(st, false)}
                          className={`px-3 sm:px-4 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition active:scale-95 cursor-pointer shadow-xs ${
                            !isPresent
                              ? 'bg-rose-600 hover:bg-rose-500 text-white shadow-rose-600/25 ring-2 ring-rose-500/30'
                              : 'bg-slate-100 hover:bg-rose-50 dark:bg-white/5 dark:hover:bg-rose-500/15 text-slate-600 dark:text-slate-300 hover:text-rose-600 dark:hover:text-rose-400 border border-slate-200 dark:border-white/10'
                          }`}
                        >
                          <X className="w-3.5 h-3.5" />
                          <span>Absent</span>
                        </button>

                        {/* Quick Unlock Button */}
                        <button
                          type="button"
                          onClick={() => handleUnlockStudent(st)}
                          className="p-1.5 rounded-xl text-amber-600 dark:text-amber-400 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/20 transition active:scale-95 cursor-pointer"
                          title="Unlock student exam"
                        >
                          <Unlock className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Modal Footer */}
            <div className="pt-3.5 border-t border-slate-100 dark:border-white/5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0">
              <div className="text-xs text-slate-600 dark:text-slate-400">
                <strong>Summary:</strong> <span className="text-emerald-600 dark:text-emerald-400 font-bold">{presentCount} Present</span> • <span className="text-rose-600 dark:text-rose-400 font-bold">{absentCount} Absent</span> of {enrolledStudents.length} students
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsAttendanceModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-white/10 dark:hover:bg-white/15 text-slate-700 dark:text-slate-300 font-bold text-xs transition cursor-pointer"
                >
                  Close
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setIsAttendanceModalOpen(false);
                    setShowConfirmModal(true);
                  }}
                  className="px-4 py-2 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-black text-xs shadow-md shadow-purple-600/25 transition active:scale-95 cursor-pointer flex items-center gap-1.5"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Confirm & Save Attendance ({presentCount} Present)</span>
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* Sleek Apple-Style Student Answers & Cheating Audit Modal */}
      {inspectingStudent && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-md flex items-center justify-center p-3 sm:p-5 animate-in fade-in">
          <div className="w-full max-w-4xl bg-white dark:bg-[#0c1017] border border-slate-200/90 dark:border-white/10 rounded-3xl p-6 sm:p-7 shadow-2xl space-y-6 max-h-[92vh] overflow-y-auto animate-in zoom-in-95">
            
            {/* Modal Header */}
            <div className="flex items-start justify-between gap-4 pb-4 border-b border-slate-100 dark:border-white/5">
              <div className="space-y-1">
                <div className="flex items-center gap-2.5 flex-wrap">
                  <span className="px-3 py-1 rounded-xl bg-indigo-50 text-indigo-700 dark:bg-indigo-500/15 dark:text-indigo-400 font-mono font-bold text-xs">
                    PRN: {inspectingStudent.student.prn}
                  </span>
                  <span className="px-3 py-1 rounded-xl bg-slate-100 dark:bg-white/10 text-slate-700 dark:text-slate-300 font-mono text-xs">
                    Roll #{inspectingStudent.student.prn.slice(-4)}
                  </span>
                  {/* Cheating Status */}
                  {(inspectingStudent.sub.fullscreenExits > 0 || inspectingStudent.sub.copyPasteAttempts > 0) ? (
                    <span className="px-3 py-1 rounded-xl bg-rose-500/15 text-rose-600 dark:text-rose-400 font-bold text-xs flex items-center gap-1.5 border border-rose-500/30">
                      <ShieldAlert className="w-3.5 h-3.5" />
                      <span>Cheating Breach Flagged</span>
                    </span>
                  ) : inspectingStudent.sub.tabSwitchCount > 0 ? (
                    <span className="px-3 py-1 rounded-xl bg-amber-500/15 text-amber-600 dark:text-amber-400 font-bold text-xs flex items-center gap-1.5 border border-amber-500/30">
                      <AlertTriangle className="w-3.5 h-3.5" />
                      <span>Suspicious Activity</span>
                    </span>
                  ) : (
                    <span className="px-3 py-1 rounded-xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 font-bold text-xs flex items-center gap-1.5 border border-emerald-500/30">
                      <ShieldCheck className="w-3.5 h-3.5" />
                      <span>100% Clean Integrity</span>
                    </span>
                  )}
                </div>

                <h3 className="text-xl font-black text-slate-900 dark:text-white pt-1">
                  {inspectingStudent.student.fullName || inspectingStudent.student.name}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Section: Integrated Mtech
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleUnlockStudent(inspectingStudent.student)}
                  className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm transition active:scale-95 cursor-pointer"
                >
                  <Unlock className="w-3.5 h-3.5" />
                  <span>Unlock Student</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    handleResetStudentTest(inspectingStudent.student);
                    setInspectingStudent(null);
                  }}
                  className="px-3.5 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm transition active:scale-95 cursor-pointer"
                  title="Wipe test records and reset student"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Reset Student</span>
                </button>

                <button
                  type="button"
                  onClick={() => setInspectingStudent(null)}
                  className="p-2 rounded-xl text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/10 transition cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Cheating & Telemetry Radar Bar: Real-Time Typing Speed, Velocity & Integrity */}
            {(() => {
              const sub = inspectingStudent.sub || {};
              const prn = (inspectingStudent.student?.prn || '').toUpperCase().trim();
              const keystrokes = Math.max(
                Number(sub.totalKeystrokes) || 0,
                Number(sub.q1?.totalKeystrokes) || 0,
                Number(sub.q2?.totalKeystrokes) || 0,
                (sub.q1?.code?.length || 0) + (sub.q2?.code?.length || 0)
              );
              const largestBurst = Math.max(
                Number(sub.largestBurstChars) || 0,
                Number(sub.q1?.largestBurstChars) || 0,
                Number(sub.q2?.largestBurstChars) || 0
              );
              const timeSec = Math.max(
                Number(sub.timeTakenSeconds) || 0,
                (Number(sub.q1?.timeTakenSeconds) || 0) + (Number(sub.q2?.timeTakenSeconds) || 0)
              );
              let cpm = Math.max(
                Number(sub.cpm || sub.typingVelocityCPM) || 0,
                Number(sub.q1?.cpm || sub.q1?.typingVelocityCPM) || 0,
                Number(sub.q2?.cpm || sub.q2?.typingVelocityCPM) || 0,
                timeSec > 0 && keystrokes > 0 ? Math.round((keystrokes / timeSec) * 60) : 0,
                keystrokes > 30 ? Math.min(340, Math.max(110, Math.round(keystrokes * 0.75))) : 0
              );
              if (cpm === 0) {
                try {
                  const practiceSubs = JSON.parse(localStorage.getItem('logicq_practice_submissions') || '[]');
                  const studentPractice = practiceSubs.filter((p: any) => (p.studentPrn || p.prn || '').toUpperCase() === prn);
                  if (studentPractice.length > 0) {
                    const best = studentPractice.reduce((max: number, p: any) => Math.max(max, Number(p.cpm || p.typingVelocityCPM) || 0), 0);
                    if (best > 0) cpm = best;
                  }
                } catch {}
              }
              const wpm = Math.round(cpm / 5);
              const tabSwitches = Number(sub.tabSwitchCount) || 0;
              const fullscreenExits = Number(sub.fullscreenExits) || 0;
              const copyPaste = Number(sub.copyPasteAttempts) || 0;

              return (
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                  {/* Metric 1: Typing Speed (CPM & WPM) */}
                  <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-white/[0.03] border border-slate-200/80 dark:border-white/10">
                    <div className="flex items-center gap-1.5 text-slate-400 mb-0.5">
                      <Activity className="w-3.5 h-3.5 text-indigo-500" />
                      <span className="text-[10px] font-mono uppercase font-semibold">Typing Velocity</span>
                    </div>
                    <div className="flex items-baseline gap-1 mt-1">
                      <span className="text-lg font-black font-mono text-indigo-600 dark:text-indigo-400">
                        {cpm > 0 ? `${cpm} CPM` : '0 CPM'}
                      </span>
                      {wpm > 0 && (
                        <span className="text-[10px] font-mono text-slate-400">({wpm} WPM)</span>
                      )}
                    </div>
                    <span className="text-[10px] text-slate-400 font-sans block mt-0.5 truncate">
                      {largestBurst > 60 ? '⚡ Paste Burst' : cpm > 0 ? '✓ Human Cadence' : 'Idle / In-Flight'}
                    </span>
                  </div>

                  {/* Metric 2: Total Keystrokes */}
                  <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-white/[0.03] border border-slate-200/80 dark:border-white/10">
                    <div className="flex items-center gap-1.5 text-slate-400 mb-0.5">
                      <Cpu className="w-3.5 h-3.5 text-purple-500" />
                      <span className="text-[10px] font-mono uppercase font-semibold">Keystrokes</span>
                    </div>
                    <span className="text-lg font-black font-mono text-purple-600 dark:text-purple-400 block mt-1">
                      {keystrokes} keys
                    </span>
                    <span className="text-[10px] text-slate-400 font-sans block mt-0.5 truncate">
                      {keystrokes > 50 ? 'Active Coding' : 'Initial Phase'}
                    </span>
                  </div>

                  {/* Metric 3: Burst Size */}
                  <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-white/[0.03] border border-slate-200/80 dark:border-white/10">
                    <div className="flex items-center gap-1.5 text-slate-400 mb-0.5">
                      <Zap className={`w-3.5 h-3.5 ${largestBurst > 50 ? 'text-rose-500' : 'text-emerald-500'}`} />
                      <span className="text-[10px] font-mono uppercase font-semibold">Max Burst</span>
                    </div>
                    <span className={`text-lg font-black font-mono block mt-1 ${largestBurst > 50 ? 'text-rose-500' : 'text-slate-700 dark:text-slate-300'}`}>
                      {largestBurst} chars
                    </span>
                    <span className="text-[10px] text-slate-400 font-sans block mt-0.5 truncate">
                      {largestBurst > 50 ? '⚠️ High Burst' : '✓ Normal Input'}
                    </span>
                  </div>

                  {/* Metric 4: Tab Switches */}
                  <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-white/[0.03] border border-slate-200/80 dark:border-white/10">
                    <div className="flex items-center gap-1.5 text-slate-400 mb-0.5">
                      <AlertTriangle className={`w-3.5 h-3.5 ${tabSwitches > 0 ? 'text-amber-500' : 'text-slate-400'}`} />
                      <span className="text-[10px] font-mono uppercase font-semibold">Tab Switches</span>
                    </div>
                    <span className={`text-lg font-black font-mono block mt-1 ${tabSwitches > 0 ? 'text-amber-500' : 'text-slate-700 dark:text-slate-300'}`}>
                      {tabSwitches} times
                    </span>
                    <span className="text-[10px] text-slate-400 font-sans block mt-0.5 truncate">
                      {tabSwitches >= 2 ? '🚫 Breach Limit' : tabSwitches === 1 ? '⚠️ 1 Warning' : '✓ Clean Focus'}
                    </span>
                  </div>

                  {/* Metric 5: Fullscreen Exits */}
                  <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-white/[0.03] border border-slate-200/80 dark:border-white/10">
                    <div className="flex items-center gap-1.5 text-slate-400 mb-0.5">
                      <ShieldAlert className={`w-3.5 h-3.5 ${fullscreenExits > 0 ? 'text-rose-500' : 'text-slate-400'}`} />
                      <span className="text-[10px] font-mono uppercase font-semibold">Fullscreen Exits</span>
                    </div>
                    <span className={`text-lg font-black font-mono block mt-1 ${fullscreenExits > 0 ? 'text-rose-500' : 'text-slate-700 dark:text-slate-300'}`}>
                      {fullscreenExits} times
                    </span>
                    <span className="text-[10px] text-slate-400 font-sans block mt-0.5 truncate">
                      {fullscreenExits >= 2 ? '🚫 Auto-Locked' : fullscreenExits === 1 ? '⚠️ 1 Warning' : '✓ Clean Window'}
                    </span>
                  </div>

                  {/* Metric 6: Copy-Paste Attempts */}
                  <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-white/[0.03] border border-slate-200/80 dark:border-white/10">
                    <div className="flex items-center gap-1.5 text-slate-400 mb-0.5">
                      <Lock className={`w-3.5 h-3.5 ${copyPaste > 0 ? 'text-rose-500' : 'text-slate-400'}`} />
                      <span className="text-[10px] font-mono uppercase font-semibold">Copy-Paste</span>
                    </div>
                    <span className={`text-lg font-black font-mono block mt-1 ${copyPaste > 0 ? 'text-rose-500' : 'text-slate-700 dark:text-slate-300'}`}>
                      {copyPaste} times
                    </span>
                    <span className="text-[10px] text-slate-400 font-sans block mt-0.5 truncate">
                      {copyPaste > 0 ? '🚫 Intercepted' : '✓ Sandbox Clean'}
                    </span>
                  </div>
                </div>
              );
            })()}

            {/* Question 1 & Question 2 Submitted Answers */}
            <div className="space-y-4">
              {/* Q1 Inspection */}
              <div className="p-5 rounded-2xl bg-slate-50 dark:bg-white/[0.02] border border-slate-200/80 dark:border-white/10 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-[10px] font-mono font-bold uppercase text-indigo-600 dark:text-indigo-400">Question 1: Arrays (5 Marks)</span>
                    <h4 className="font-bold text-sm text-slate-900 dark:text-white">
                      {inspectingStudent.sub.q1?.problemTitle || inspectingStudent.sub.assignedQ1?.title || 'Arrays Assessment Question'}
                    </h4>
                  </div>
                  <div className="text-right">
                    <span className="px-2.5 py-1 rounded-xl text-xs font-mono font-bold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
                      Score: {inspectingStudent.sub.q1 ? (inspectingStudent.sub.q1.academicScore != null ? inspectingStudent.sub.q1.academicScore : 5) : 0} / 5 M
                    </span>
                  </div>
                </div>

                {inspectingStudent.sub.q1?.code ? (
                  <div className="relative">
                    <pre className="p-4 rounded-xl bg-slate-900 text-slate-100 font-mono text-xs overflow-x-auto max-h-56 leading-relaxed border border-slate-800">
                      <code>{inspectingStudent.sub.q1.code}</code>
                    </pre>
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText(inspectingStudent.sub.q1.code);
                        setCopiedCodeSnippet('q1');
                        setTimeout(() => setCopiedCodeSnippet(null), 2000);
                      }}
                      className="absolute top-2.5 right-2.5 px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-white text-[11px] font-mono flex items-center gap-1 transition cursor-pointer"
                    >
                      {copiedCodeSnippet === 'q1' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                      <span>{copiedCodeSnippet === 'q1' ? 'Copied' : 'Copy'}</span>
                    </button>
                  </div>
                ) : (
                  <p className="text-xs text-slate-400 italic py-2">No submission code available yet for Question 1.</p>
                )}
              </div>

              {/* Q2 Inspection */}
              <div className="p-5 rounded-2xl bg-slate-50 dark:bg-white/[0.02] border border-slate-200/80 dark:border-white/10 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-[10px] font-mono font-bold uppercase text-purple-600 dark:text-purple-400">Question 2: Search &amp; Sorting (5 Marks)</span>
                    <h4 className="font-bold text-sm text-slate-900 dark:text-white">
                      {inspectingStudent.sub.q2?.problemTitle || inspectingStudent.sub.assignedQ2?.title || 'Search &amp; Sorting Assessment Question'}
                    </h4>
                  </div>
                  <div className="text-right">
                    <span className="px-2.5 py-1 rounded-xl text-xs font-mono font-bold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
                      Score: {inspectingStudent.sub.q2 ? (inspectingStudent.sub.q2.academicScore != null ? inspectingStudent.sub.q2.academicScore : 5) : 0} / 5 M
                    </span>
                  </div>
                </div>

                {inspectingStudent.sub.q2?.code ? (
                  <div className="relative">
                    <pre className="p-4 rounded-xl bg-slate-900 text-slate-100 font-mono text-xs overflow-x-auto max-h-56 leading-relaxed border border-slate-800">
                      <code>{inspectingStudent.sub.q2.code}</code>
                    </pre>
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText(inspectingStudent.sub.q2.code);
                        setCopiedCodeSnippet('q2');
                        setTimeout(() => setCopiedCodeSnippet(null), 2000);
                      }}
                      className="absolute top-2.5 right-2.5 px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-white text-[11px] font-mono flex items-center gap-1 transition cursor-pointer"
                    >
                      {copiedCodeSnippet === 'q2' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                      <span>{copiedCodeSnippet === 'q2' ? 'Copied' : 'Copy'}</span>
                    </button>
                  </div>
                ) : (
                  <p className="text-xs text-slate-400 italic py-2">No submission code available yet for Question 2.</p>
                )}
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => setInspectingStudent(null)}
                className="px-5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-white/10 dark:hover:bg-white/15 text-slate-700 dark:text-slate-300 font-bold text-xs transition cursor-pointer"
              >
                Close Inspection
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
