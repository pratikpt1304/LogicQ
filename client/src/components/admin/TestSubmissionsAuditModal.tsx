import React, { useState, useEffect, useMemo } from 'react';
import {
  X,
  Search,
  Filter,
  ShieldCheck,
  ShieldAlert,
  AlertTriangle,
  Clock,
  Code2,
  Copy,
  Check,
  Download,
  Users,
  Award,
  ChevronRight,
  ArrowLeft,
  FileCode,
  Terminal,
  Activity,
  Maximize2,
  Minimize2,
  AlertOctagon,
  CheckCircle2,
  XCircle,
  RefreshCw,
  ExternalLink,
  Unlock,
  LayoutGrid,
  Calendar,
  RotateCcw,
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { toast } from 'sonner';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '../../config/firebase.js';
import { supabase, isSupabaseConfigured } from '../../config/supabase.js';
import { FirestoreDataService } from '../../services/firestoreData.service.js';
import { AttendanceSyncService } from '../../services/attendanceSync.service.js';
import { RealtimeSyncService } from '../../services/realtimeSync.service.js';
import { exportAssessmentMarkListExcel } from '../../utils/excelReportGenerator.js';
import { AdminTestDefinition } from './AdminTestOrchestratorTab.js';
import { getStudentLabExamPair } from '../../data/lab-assessment-questions.data.js';
import { getStudentPersonalizedQuestions } from '../../utils/testQuestionDistributor.js';
import { ASSESSMENT_4_TEST } from '../../data/assessment4-questions.data.js';
import { C_PROGRAMMING_COHORT_STUDENTS } from '../../data/c-programming-cohort.data.js';

interface TestSubmissionsAuditModalProps {
  test: AdminTestDefinition | null;
  isOpen: boolean;
  onClose: () => void;
  initialSelectedStudentId?: string | null;
}

const getInitialCohortSubmissions = (testObj: any): any[] => {
  const isA4 = testObj?.id === 'test-assessment-4' || testObj?.id === 'assessment-4' || (testObj?.questions && testObj.questions.length >= 120);
  const questionsPool = (Array.isArray(testObj?.questions) && testObj.questions.length >= 120) ? testObj.questions : ASSESSMENT_4_TEST.questions;
  const getPair = (studentPrn: string): [any, any] => {
    if (isA4 || questionsPool.length >= 120) {
      const pair = getStudentPersonalizedQuestions(questionsPool, 2, studentPrn);
      if (pair && pair.length >= 2) return [pair[0], pair[1]];
    }
    return getStudentLabExamPair(studentPrn);
  };

  return C_PROGRAMMING_COHORT_STUDENTS.map((st) => {
    const prn = (st.prn || '').toUpperCase().trim();
    const [assignedQ1, assignedQ2] = getPair(prn);
    return {
      id: prn,
      studentName: st.fullName || 'Student',
      studentPrn: prn,
      studentEmail: st.email || '',
      q1: null,
      q2: null,
      rawSubmissions: [],
      tabSwitchCount: 0,
      fullscreenExits: 0,
      copyPasteAttempts: 0,
      totalKeystrokes: 0,
      largestBurstChars: 0,
      timeTakenSeconds: 0,
      incidents: [],
      submittedAt: null,
      isLocked: false,
      lockReason: '',
      assignedQ1,
      assignedQ2,
      totalScore: 0,
      academicScore: null,
      status: 'NOT_STARTED',
    };
  });
};

export const TestSubmissionsAuditModal: React.FC<TestSubmissionsAuditModalProps> = ({
  test,
  isOpen,
  onClose,
  initialSelectedStudentId,
}) => {
  const [submissions, setSubmissions] = useState<any[]>(() => {
    try {
      return getInitialCohortSubmissions(test);
    } catch {
      return [];
    }
  });
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [filterSeverity, setFilterSeverity] = useState<'ALL' | 'SUBMITTED' | 'FLAGGED' | 'SUSPICIOUS' | 'CLEAN'>('ALL');
  const [selectedStudentSub, setSelectedStudentSub] = useState<any | null>(null);
  const [selectedQuestionTab, setSelectedQuestionTab] = useState<'q1' | 'q2'>('q1');
  const [copiedCode, setCopiedCode] = useState<boolean>(false);
  const [liveCodeCache, setLiveCodeCache] = useState<Record<string, string>>({});
  const [isFetchingLiveCode, setIsFetchingLiveCode] = useState<boolean>(false);
  const [isUnlocking, setIsUnlocking] = useState<boolean>(false);
  const [isMaximized, setIsMaximized] = useState<boolean>(true);
  const isScheduled = test?.status === 'SCHEDULED' || test?.status === 'UPCOMING';
  const isAssessment4 = Boolean(
    test?.id === 'test-assessment-4' ||
    test?.id === 'assessment-4' ||
    test?.id === 'test-continuous-arrays-search-sort' ||
    test?.title?.toLowerCase().includes('assessment 4') ||
    test?.title?.toLowerCase().includes('arrays & searching') ||
    (test?.questions && test.questions.length >= 100) ||
    test?.questionCount === 2
  );
  const maxTestMarks = isAssessment4 ? 10 : (test?.totalMarks || 10);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen?.().catch(() => {});
      setIsMaximized(true);
    } else {
      document.exitFullscreen?.().catch(() => {});
      setIsMaximized(false);
    }
  };

  useEffect(() => {
    const handleFsChange = () => {
      setIsMaximized(Boolean(document.fullscreenElement));
    };
    document.addEventListener('fullscreenchange', handleFsChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFsChange);
    };
  }, []);

  const handleClose = () => {
    if (document.fullscreenElement) {
      document.exitFullscreen?.().catch(() => {});
    }
    onClose();
  };

  const handleUnlockStudent = async (targetPrn?: string) => {
    if (!test) return;
    const prn = targetPrn || (selectedStudentSub && (selectedStudentSub.studentPrn || selectedStudentSub.prn));
    if (!prn) return;
    setIsUnlocking(true);
    try {
      await AttendanceSyncService.unlockStudentProctorLockout(prn, test.id);
      await AttendanceSyncService.markAttendance(test.id, prn, true);
      await FirestoreDataService.unlockStudentTest(test.id, prn);

      if (isSupabaseConfigured) {
        try {
          await supabase
            .from('student_locks')
            .update({ is_locked: false, updated_at: new Date().toISOString() })
            .eq('student_prn', prn);
        } catch {}
      }

      toast.success(`🎉 Test successfully unlocked for student ${prn}! The student's screen will auto-resume within 3 seconds.`);
      if (selectedStudentSub) {
        setSelectedStudentSub((prev: any) =>
          prev ? { ...prev, isLocked: false, isLockedByProctor: false, status: 'UNLOCKED_BY_FACULTY' } : null
        );
      }
      loadSubmissions();
    } catch {
      toast.error('Failed to unlock student test.');
    } finally {
      setIsUnlocking(false);
    }
  };

  const handleResetIndividualStudent = async (targetPrn?: string, studentName?: string) => {
    if (!test) return;
    const prn = String(targetPrn || (selectedStudentSub && (selectedStudentSub.studentPrn || selectedStudentSub.prn)) || '').toUpperCase().trim();
    if (!prn) return;

    const displayName = studentName || prn;
    if (!window.confirm(`Are you sure you want to completely RESET test records for ${displayName} (${prn})?\n\nThis will:\n• Wipe all proctoring violations & locks\n• Clear submitted code and scores for Q1 & Q2\n• Enable student to restart the test 100% fresh from the beginning.`)) {
      return;
    }

    const toastId = toast.loading(`Resetting test records for ${prn}...`);
    try {
      await AttendanceSyncService.resetIndividualStudentTest(prn, test.id);

      // Update local state in modal immediately
      setSubmissions((prev) =>
        prev.map((sub) => {
          const subPrn = String(sub.studentPrn || sub.prn || '').toUpperCase().trim();
          if (subPrn === prn) {
            return {
              ...sub,
              q1: null,
              q2: null,
              academicScore: null,
              totalScore: 0,
              tabSwitchCount: 0,
              fullscreenExits: 0,
              copyPasteAttempts: 0,
              largestBurstChars: 0,
              isLocked: false,
              isLockedByProctor: false,
              isPlagiarized: false,
              status: 'NOT_STARTED',
            };
          }
          return sub;
        })
      );

      if (selectedStudentSub) {
        setSelectedStudentSub((prev: any) =>
          prev ? {
            ...prev,
            q1: null,
            q2: null,
            academicScore: null,
            totalScore: 0,
            tabSwitchCount: 0,
            fullscreenExits: 0,
            copyPasteAttempts: 0,
            largestBurstChars: 0,
            isLocked: false,
            isLockedByProctor: false,
            status: 'NOT_STARTED',
          } : null
        );
      }

      await loadSubmissions();
      toast.success(`🎉 ${displayName} (${prn}) has been completely reset! Student can now restart test fresh.`, { id: toastId });
    } catch (err: any) {
      toast.error('Failed to reset student: ' + (err?.message || 'Unknown error'), { id: toastId });
    }
  };

  // Helper to aggregate raw submissions into per-student records with both Q1 and Q2 details
  const processSubmissions = (authentic: any[] = [], locksMap: Map<string, any> = new Map()): any[] => {
    const studentMap = new Map<string, any>();
    const isA4 = test?.id === 'test-assessment-4' || test?.id === 'assessment-4' || (test?.questions && test.questions.length >= 120);
    const questionsPool = (Array.isArray(test?.questions) && test.questions.length >= 120) ? test.questions : ASSESSMENT_4_TEST.questions;
    const getPair = (studentPrn: string): [any, any] => {
      if (isA4 || questionsPool.length >= 120) {
        const pair = getStudentPersonalizedQuestions(questionsPool, 2, studentPrn);
        if (pair && pair.length >= 2) return [pair[0], pair[1]];
      }
      return getStudentLabExamPair(studentPrn);
    };

    // 1. Prepopulate entire enrolled cohort so all students are tracked
    C_PROGRAMMING_COHORT_STUDENTS.forEach((st) => {
      const prn = (st.prn || '').toUpperCase().trim();
      if (!prn) return;
      const [assignedQ1, assignedQ2] = getPair(prn);
      const isLockedInMap = locksMap.has(prn) || AttendanceSyncService.isStudentLockedByProctor(prn, test?.id);
      const lockObj = locksMap.get(prn);
      studentMap.set(prn, {
        id: prn,
        studentName: st.fullName || 'Student',
        studentPrn: prn,
        studentEmail: st.email || '',
        q1: null,
        q2: null,
        rawSubmissions: [],
        tabSwitchCount: isLockedInMap ? 2 : 0,
        fullscreenExits: isLockedInMap ? 2 : 0,
        copyPasteAttempts: 0,
        totalKeystrokes: 0,
        largestBurstChars: 0,
        timeTakenSeconds: 0,
        incidents: isLockedInMap ? [{
          type: 'CRITICAL_LOCKOUT',
          details: lockObj?.reason || 'Critical Cheating Violation: 2 Proctored Perimeter Breaches. Test locked.',
          severity: 'CRITICAL',
          timestamp: lockObj?.locked_at ? new Date(lockObj.locked_at).toLocaleTimeString() : 'Locked'
        }] : [],
        submittedAt: null,
        isLocked: isLockedInMap,
        lockReason: lockObj?.reason || '',
        assignedQ1,
        assignedQ2,
      });
    });

    const targetTestId = String(test?.id || '').toLowerCase().trim();
    const targetTestTitle = String(test?.title || '').toLowerCase().trim();

    authentic.forEach((s) => {
      const prn = (s.studentPrn || s.prn || s.student_prn || s.id || '').toUpperCase().trim();
      if (!prn) return;

      const sTestId = String(s.testId || s.test_id || s.assignmentId || '').toLowerCase().trim();
      const sTitle = String(s.testTitle || s.test_title || '').toLowerCase().trim();

      // Strict isolation for Assessment 4 vs other tests:
      if (isA4) {
        const isA4Sub =
          sTestId === 'test-assessment-4' ||
          sTestId === 'assessment-4' ||
          sTestId === 'test-continuous-arrays-search-sort' ||
          sTestId.includes('assessment-4') ||
          sTitle.includes('assessment 4') ||
          sTitle.includes('arrays & searching') ||
          String(s.problemId || '').startsWith('a4-arr-') ||
          String(s.problemId || '').startsWith('a4-ss-') ||
          String(s.problemSlug || '').startsWith('a4-arr-') ||
          String(s.problemSlug || '').startsWith('a4-ss-');
        if (!isA4Sub) return;
      } else {
        const matchesId = !targetTestId || (
          sTestId && (
            sTestId === targetTestId ||
            sTestId.replace(/^assign-/, '') === targetTestId.replace(/^assign-/, '') ||
            (targetTestId.includes('continuous') && (sTestId.includes('continuous') || sTestId.startsWith('practice-c') || sTestId.includes('arrays')))
          )
        ) || (targetTestTitle && sTitle && (sTitle === targetTestTitle || sTitle.includes(targetTestTitle) || targetTestTitle.includes(sTitle)));

        if (!matchesId && sTestId && targetTestId) return;
      }

      const [assignedQ1, assignedQ2] = getPair(prn);
      const isQ1 = (assignedQ1 && (s.problemId === assignedQ1.id || s.problemSlug === assignedQ1.slug || s.problemTitle === assignedQ1.title)) || s.questionIndex === 0 || s.questionNumber === 1 || s.qIndex === 1 || (s.q1 != null) || s.qKey === 'Q1' || String(s.id || '').includes('_Q1') || String(s.problemId || '').includes('arr');
      const isQ2 = (assignedQ2 && (s.problemId === assignedQ2.id || s.problemSlug === assignedQ2.slug || s.problemTitle === assignedQ2.title)) || s.questionIndex === 1 || s.questionNumber === 2 || s.qIndex === 2 || (s.q2 != null) || s.qKey === 'Q2' || String(s.id || '').includes('_Q2') || String(s.problemId || '').includes('ss');

      if (!studentMap.has(prn)) {
        const isLockedInMap = locksMap.has(prn) || Boolean(s.isLocked || s.isLockedByProctor);
        studentMap.set(prn, {
          id: s.id || prn,
          studentName: s.studentName || s.student_name || 'Student',
          studentPrn: prn,
          studentEmail: s.studentEmail || s.student_email || s.email || '',
          q1: null,
          q2: null,
          rawSubmissions: [],
          tabSwitchCount: isLockedInMap ? 2 : 0,
          fullscreenExits: isLockedInMap ? 2 : 0,
          copyPasteAttempts: 0,
          totalKeystrokes: 0,
          largestBurstChars: 0,
          timeTakenSeconds: 0,
          incidents: [],
          submittedAt: s.submittedAt || s.submitted_at,
          isLocked: isLockedInMap,
          assignedQ1,
          assignedQ2,
        });
      }

      const studentRec = studentMap.get(prn);
      studentRec.rawSubmissions.push(s);

      // Merge proctoring telemetry
      studentRec.tabSwitchCount = Math.max(studentRec.tabSwitchCount, Number(s.tabSwitchCount || s.tab_switch_count) || 0);
      studentRec.fullscreenExits = Math.max(studentRec.fullscreenExits, Number(s.fullscreenExits || s.fullScreenExitCount || s.fullscreen_exits) || 0);
      studentRec.copyPasteAttempts = Math.max(studentRec.copyPasteAttempts, Number(s.copyPasteAttempts || s.copy_paste_attempts) || 0);
      studentRec.totalKeystrokes += Number(s.totalKeystrokes || s.total_keystrokes) || 0;
      studentRec.largestBurstChars = Math.max(studentRec.largestBurstChars, Number(s.largestBurstChars) || 0);
      studentRec.timeTakenSeconds += Number(s.timeTakenSeconds) || 0;
      if (
        s.isLocked ||
        s.isLockedByProctor ||
        s.is_locked ||
        s.status === 'PROCTOR_LOCKED' ||
        s.verdict === 'PROCTOR_LOCKED' ||
        s.q1?.status === 'PROCTOR_LOCKED' ||
        s.q2?.status === 'PROCTOR_LOCKED' ||
        s.q2?.isLocked ||
        Number(s.fullscreen_exits || s.fullscreenExits) >= 2 ||
        Number(s.tab_switch_count || s.tabSwitchCount) >= 2 ||
        (Number(s.fullscreen_exits || s.fullscreenExits) + Number(s.tab_switch_count || s.tabSwitchCount) >= 2)
      ) {
        studentRec.isLocked = true;
      }

      if (Array.isArray(s.incidents)) {
        studentRec.incidents.push(...s.incidents);
      }

      // Slot into Q1 or Q2
      const subScore = Number(s.academicScore ?? s.academic_score ?? s.score ?? 0);
      const isBreachSub = s.status === 'CRITICAL_BREACH' || s.verdict === 'LOCKED_BY_PROCTOR' || s.isCheatAttempt;
      const normalizedSub = {
        ...s,
        academicScore: isBreachSub ? 0 : subScore,
        score: isBreachSub ? 0 : subScore,
        code: s.code || s.submittedCode || s.submitted_code || '',
        submittedAt: s.submittedAt || s.submitted_at || new Date().toISOString(),
        status: isBreachSub ? 'PROCTOR_LOCKED' : (s.status || (subScore > 0 ? 'ACCEPTED' : 'PENDING')),
        verdict: isBreachSub ? 'PROCTOR_LOCKED' : (s.verdict || s.status || (subScore > 0 ? 'ACCEPTED' : 'PENDING')),
        isTimeOver: Boolean(s.isTimeOver),
        timeOverReason: s.timeOverReason || '',
        testOutcomes: s.testOutcomes || s.test_outcomes || s.testResults || [],
        passedCount: s.passedCount ?? s.passed_count,
        totalTestCases: s.totalTestCases ?? s.total_test_cases,
      };

      if (s.q1 && typeof s.q1 === 'object') {
        const q1ScoreRaw = Number(s.q1.score ?? s.q1.academicScore ?? 0);
        const q1Breach = s.q1.status === 'PROCTOR_LOCKED' || s.q1.verdict === 'PROCTOR_LOCKED' || s.q1.isLocked;
        const existingCode = studentRec.q1?.code;
        studentRec.q1 = {
          ...s.q1,
          problemTitle: s.q1.problemTitle || assignedQ1?.title || 'Question 1: Arrays',
          code: s.q1.code || s.q1.submittedCode || existingCode || '',
          score: q1Breach ? 0 : q1ScoreRaw,
          academicScore: q1Breach ? 0 : q1ScoreRaw,
          status: q1Breach ? 'PROCTOR_LOCKED' : (s.q1.status || (q1ScoreRaw > 0 ? 'ACCEPTED' : 'PENDING')),
          testOutcomes: s.q1.testOutcomes || s.q1.test_outcomes || s.q1.testResults || studentRec.q1?.testOutcomes || [],
        };
      }
      if (s.q2 && typeof s.q2 === 'object') {
        const q2ScoreRaw = Number(s.q2.score ?? s.q2.academicScore ?? 0);
        const q2Breach = s.q2.status === 'PROCTOR_LOCKED' || s.q2.verdict === 'PROCTOR_LOCKED' || s.q2.isLocked;
        const existingCode = studentRec.q2?.code;
        studentRec.q2 = {
          ...s.q2,
          problemTitle: s.q2.problemTitle || assignedQ2?.title || 'Question 2: Searching & Sorting',
          code: s.q2.code || s.q2.submittedCode || existingCode || '',
          score: q2Breach ? 0 : q2ScoreRaw,
          academicScore: q2Breach ? 0 : q2ScoreRaw,
          status: q2Breach ? 'PROCTOR_LOCKED' : (s.q2.status || (q2ScoreRaw > 0 ? 'ACCEPTED' : 'PENDING')),
          testOutcomes: s.q2.testOutcomes || s.q2.test_outcomes || s.q2.testResults || studentRec.q2?.testOutcomes || [],
        };
      }

      // If this submission is an individual question record (not containing pre-packaged q1/q2):
      if (!s.q1 && !s.q2) {
        if (isQ1) {
          const existingCode = studentRec.q1?.code;
          const existingOutcomes = studentRec.q1?.testOutcomes;
          // Strictly assign to Q1 only — NEVER fall through to Q2!
          if (!studentRec.q1 || (normalizedSub.code && !studentRec.q1.code) || new Date(normalizedSub.submittedAt || 0).getTime() >= new Date(studentRec.q1.submittedAt || 0).getTime()) {
            studentRec.q1 = {
              ...normalizedSub,
              problemTitle: normalizedSub.problemTitle || assignedQ1?.title || 'Question 1: Arrays',
              code: normalizedSub.code || existingCode || '',
              testOutcomes: (normalizedSub.testOutcomes && normalizedSub.testOutcomes.length > 0) ? normalizedSub.testOutcomes : (existingOutcomes || []),
            };
          } else if (existingCode && !studentRec.q1.code) {
            studentRec.q1.code = existingCode;
          }
        } else if (isQ2) {
          const existingCode = studentRec.q2?.code;
          const existingOutcomes = studentRec.q2?.testOutcomes;
          // Strictly assign to Q2 only — NEVER touch Q1!
          if (!studentRec.q2 || (normalizedSub.code && !studentRec.q2.code) || new Date(normalizedSub.submittedAt || 0).getTime() >= new Date(studentRec.q2.submittedAt || 0).getTime()) {
            studentRec.q2 = {
              ...normalizedSub,
              problemTitle: normalizedSub.problemTitle || assignedQ2?.title || 'Question 2: Searching & Sorting',
              code: normalizedSub.code || existingCode || '',
              testOutcomes: (normalizedSub.testOutcomes && normalizedSub.testOutcomes.length > 0) ? normalizedSub.testOutcomes : (existingOutcomes || []),
            };
          } else if (existingCode && !studentRec.q2.code) {
            studentRec.q2.code = existingCode;
          }
        }
      }
    });

    // Final pass: calculate combined scores, lock states, and latest timestamps
    studentMap.forEach((rec) => {
      // Ensure code is populated from raw submissions if available
      if ((!rec.q1?.code || rec.q1.code.length < 10) && rec.rawSubmissions.length > 0) {
        const match = rec.rawSubmissions.find((r: any) => {
          const c = r.code || r.submittedCode || r.submitted_code || r.sourceCode;
          return c && typeof c === 'string' && c.length > 10 && (r.qKey === 'Q1' || r.questionIndex === 0 || (rec.q1?.problemTitle && r.problemTitle === rec.q1.problemTitle));
        });
        if (match) {
          if (!rec.q1) rec.q1 = { ...match };
          rec.q1.code = match.code || match.submittedCode || match.submitted_code || match.sourceCode;
        }
      }
      if ((!rec.q2?.code || rec.q2.code.length < 10) && rec.rawSubmissions.length > 0) {
        const match = rec.rawSubmissions.find((r: any) => {
          const c = r.code || r.submittedCode || r.submitted_code || r.sourceCode;
          return c && typeof c === 'string' && c.length > 10 && (r.qKey === 'Q2' || r.questionIndex === 1 || (rec.q2?.problemTitle && r.problemTitle === rec.q2.problemTitle));
        });
        if (match) {
          if (!rec.q2) rec.q2 = { ...match };
          rec.q2.code = match.code || match.submittedCode || match.submitted_code || match.sourceCode;
        }
      }

      const isBreached = Boolean(
        rec.isLocked ||
        rec.tabSwitchCount >= 2 ||
        rec.fullscreenExits >= 2 ||
        (rec.tabSwitchCount + rec.fullscreenExits >= 2) ||
        rec.q1?.status === 'PROCTOR_LOCKED' ||
        rec.q1?.isLocked ||
        rec.q2?.status === 'PROCTOR_LOCKED' ||
        rec.q2?.isLocked
      );
      if (isBreached) {
        rec.isLocked = true;
      }

      const isQ1GenuinelyPassed = Boolean(
        rec.q1 &&
        rec.q1.code &&
        rec.q1.code.length > 25 &&
        !rec.q1.code.includes('Editor empty') &&
        !rec.q1.code.includes('PROCTOR LOCKOUT') &&
        rec.q1.status !== 'PROCTOR_LOCKED' &&
        rec.q1.verdict !== 'PROCTOR_LOCKED' &&
        Number(rec.q1.academicScore ?? rec.q1.score ?? 0) > 0
      );

      // If student is locked, ensure correct locked state for unpassed questions
      if (rec.isLocked) {
        if (!isQ1GenuinelyPassed) {
          // Breach happened during Q1 or before solving Q1. Both Q1 and Q2 locked with 0 M!
          rec.q1 = {
            ...(rec.q1 || {}),
            problemTitle: rec.q1?.problemTitle || rec.assignedQ1?.title || 'Scenario Based Arrays',
            academicScore: 0,
            score: 0,
            status: 'PROCTOR_LOCKED',
            verdict: 'PROCTOR_LOCKED',
            code: rec.q1?.code && !rec.q1.code.includes('Editor empty') ? rec.q1.code : '// [EXAM PROCTOR LOCKOUT] Test locked due to proctoring breaches (2 exits / tab switches).',
            submittedAt: rec.q1?.submittedAt || rec.submittedAt || new Date().toISOString(),
            isLocked: true,
          };
          rec.q2 = {
            ...(rec.q2 || {}),
            problemTitle: rec.q2?.problemTitle || rec.assignedQ2?.title || 'Scenario Based Searching & Sorting',
            academicScore: 0,
            score: 0,
            status: 'PROCTOR_LOCKED',
            verdict: 'PROCTOR_LOCKED',
            code: '// [EXAM PROCTOR LOCKOUT] Test locked due to proctoring breaches (2 exits / tab switches).',
            submittedAt: rec.q2?.submittedAt || rec.submittedAt || new Date().toISOString(),
            isLocked: true,
          };
        } else {
          // Student legitimately solved Q1, but cheated / breached on Q2!
          rec.q2 = {
            ...(rec.q2 || {}),
            problemTitle: rec.q2?.problemTitle || rec.assignedQ2?.title || 'Scenario Based Searching & Sorting',
            academicScore: 0,
            score: 0,
            status: 'PROCTOR_LOCKED',
            verdict: 'PROCTOR_LOCKED',
            code: rec.q2?.code && !rec.q2.code.includes('Editor empty') ? rec.q2.code : '// [EXAM PROCTOR LOCKOUT] Test locked due to 2 perimeter breaches / cheating violations.',
            submittedAt: rec.q2?.submittedAt || rec.submittedAt || new Date().toISOString(),
            isLocked: true,
          };
        }
      }

      const q1Score = rec.q1 ? Number(rec.q1.academicScore != null ? rec.q1.academicScore : (rec.q1.score ?? 0)) : 0;
      const q2Score = rec.q2 ? Number(rec.q2.academicScore != null ? rec.q2.academicScore : (rec.q2.score ?? 0)) : 0;
      rec.academicScore = q1Score + q2Score;

      // Propagate TIME_OVER flag to the student record for admin badge display
      rec.isTimeOver = Boolean(rec.q1?.isTimeOver || rec.q2?.isTimeOver);
      rec.timeOverReason = rec.q2?.timeOverReason || rec.q1?.timeOverReason || '';

      const times = [rec.q1?.submittedAt, rec.q2?.submittedAt, rec.submittedAt].filter(Boolean);
      if (times.length > 0) {
        rec.submittedAt = times.sort().reverse()[0];
      }

      // Reconstruct and enrich full chronological incident audit logs
      const tabs = Math.max(0, Number(rec.tabSwitchCount || 0));
      const exits = Math.max(0, Number(rec.fullscreenExits || rec.fullScreenExitCount || 0));
      const paste = Math.max(0, Number(rec.copyPasteAttempts || 0));

      const subTime = rec.submittedAt ? new Date(rec.submittedAt) : new Date();
      const baseMs = !isNaN(subTime.getTime()) ? subTime.getTime() : Date.now();

      const existingIncidents = Array.isArray(rec.incidents) ? [...rec.incidents] : [];
      const reconstructed: any[] = [];

      // 1. Session Start event
      const hasStart = existingIncidents.some((i: any) => i.type === 'EXAM_STARTED' || String(i.details).toLowerCase().includes('initiated'));
      if (!hasStart) {
        const timeTaken = Math.max(120, Number(rec.timeTakenSeconds || 180));
        const startTime = new Date(baseMs - timeTaken * 1000);
        reconstructed.push({
          timestamp: startTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true }),
          type: 'EXAM_STARTED',
          details: 'Proctored assessment session initiated in secure full-screen perimeter.',
          severity: 'INFO',
          rawMs: startTime.getTime(),
        });
      }

      // 2. Fullscreen Exits breakdown
      const existingExits = existingIncidents.filter((i: any) => i.type === 'FULLSCREEN_EXIT').length;
      if (exits > existingExits) {
        const needed = exits - existingExits;
        for (let k = 1; k <= needed; k++) {
          const exitNum = existingExits + k;
          const offsetSec = (needed - k + 1) * 35;
          const exitTime = new Date(baseMs - offsetSec * 1000);
          reconstructed.push({
            timestamp: exitTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true }),
            type: 'FULLSCREEN_EXIT',
            details: exitNum === 1 && exits > 1
              ? 'Proctoring Warning (1/2): Student exited fullscreen perimeter / minimized window.'
              : `Proctoring Violation (${exitNum}/${exits}): Fullscreen perimeter exited or window minimized.`,
            severity: exitNum >= 2 || rec.isLocked ? 'CRITICAL' : 'WARNING',
            rawMs: exitTime.getTime(),
          });
        }
      }

      // 3. Tab Switches breakdown
      const existingTabs = existingIncidents.filter((i: any) => i.type === 'TAB_SWITCH').length;
      if (tabs > existingTabs) {
        const needed = tabs - existingTabs;
        for (let k = 1; k <= needed; k++) {
          const tabNum = existingTabs + k;
          const offsetSec = (needed - k + 1) * 25 + 10;
          const tabTime = new Date(baseMs - offsetSec * 1000);
          reconstructed.push({
            timestamp: tabTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true }),
            type: 'TAB_SWITCH',
            details: tabNum === 1 && tabs > 1
              ? 'Proctoring Warning (1/2): Student switched browser tabs / exam window lost focus.'
              : `Proctoring Violation (${tabNum}/${tabs}): Student navigated away from active assessment tab.`,
            severity: tabNum >= 2 || rec.isLocked ? 'CRITICAL' : 'WARNING',
            rawMs: tabTime.getTime(),
          });
        }
      }

      // 4. Paste Interceptions breakdown
      const existingPaste = existingIncidents.filter((i: any) => i.type === 'CLIPBOARD_BLOCKED' || i.type === 'COPY_PASTE').length;
      if (paste > existingPaste) {
        const needed = paste - existingPaste;
        for (let k = 1; k <= needed; k++) {
          const pasteTime = new Date(baseMs - (k * 20 + 5) * 1000);
          reconstructed.push({
            timestamp: pasteTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true }),
            type: 'CLIPBOARD_BLOCKED',
            details: `Institutional proctoring intercepted unauthorized clipboard PASTE attempt (${k}/${paste}).`,
            severity: 'WARNING',
            rawMs: pasteTime.getTime(),
          });
        }
      }

      // 5. Lockout incident if student is locked
      const hasLockout = existingIncidents.some((i: any) => i.type === 'CRITICAL_LOCKOUT' || i.severity === 'CRITICAL');
      if (rec.isLocked && !hasLockout) {
        reconstructed.push({
          timestamp: new Date(baseMs).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true }),
          type: 'CRITICAL_LOCKOUT',
          details: `Permissible violation limit reached (2/2). Assessment permanently locked awaiting faculty review. (Tabs: ${tabs}, Exits: ${exits})`,
          severity: 'CRITICAL',
          rawMs: baseMs,
        });
      }

      // Normalize existing incidents with timestamps for chronological ordering
      const normalizedExisting = existingIncidents.map((inc: any, idx: number) => {
        let ms = baseMs;
        if (inc.timestamp) {
          const parsed = Date.parse(`1970-01-01 ${inc.timestamp}`);
          if (!isNaN(parsed)) ms = parsed;
        }
        return {
          ...inc,
          rawMs: inc.rawMs || ms + idx,
        };
      });

      const combined = [...normalizedExisting, ...reconstructed];

      // Deduplicate identical incidents
      const seen = new Set<string>();
      const deduped: any[] = [];
      for (const item of combined) {
        const key = `${item.type}_${item.timestamp}_${String(item.details || '').substring(0, 30)}`;
        if (!seen.has(key)) {
          seen.add(key);
          deduped.push(item);
        }
      }

      // Sort chronologically ascending (earliest to latest)
      deduped.sort((a, b) => {
        if (a.rawMs && b.rawMs && a.rawMs !== b.rawMs) return a.rawMs - b.rawMs;
        return String(a.timestamp || '').localeCompare(String(b.timestamp || ''));
      });

      rec.incidents = deduped;
    });

    // Helper to compute C code token & structure similarity
    const computeCodeSimilarity = (codeA?: string, codeB?: string): number => {
      if (!codeA || !codeB) return 0;
      const cleanA = codeA.replace(/\/\*[\s\S]*?\*\/|\/\/.*/g, '').replace(/\s+/g, ' ').trim().toLowerCase();
      const cleanB = codeB.replace(/\/\*[\s\S]*?\*\/|\/\/.*/g, '').replace(/\s+/g, ' ').trim().toLowerCase();
      if (cleanA.length < 35 || cleanB.length < 35) return 0;
      if (cleanA === cleanB) return 1.0;

      const tokensA = cleanA.split(/[^\w]+/).filter((t) => t.length > 1);
      const tokensB = cleanB.split(/[^\w]+/).filter((t) => t.length > 1);
      if (tokensA.length < 8 || tokensB.length < 8) return 0;

      const setA = new Set(tokensA);
      const setB = new Set(tokensB);
      let common = 0;
      setA.forEach((t) => { if (setB.has(t)) common++; });
      const union = new Set([...tokensA, ...tokensB]).size;
      const tokenSim = union > 0 ? common / union : 0;

      const chunkLen = 12;
      const chunksA = new Set<string>();
      for (let i = 0; i <= cleanA.length - chunkLen; i += 6) {
        chunksA.add(cleanA.substring(i, i + chunkLen));
      }
      let matched = 0;
      let totalChunks = 0;
      for (let i = 0; i <= cleanB.length - chunkLen; i += 6) {
        totalChunks++;
        if (chunksA.has(cleanB.substring(i, i + chunkLen))) matched++;
      }
      const chunkSim = totalChunks > 0 ? matched / totalChunks : 0;

      return Math.max(tokenSim, chunkSim);
    };

    const studentList = Array.from(studentMap.values());

    // Pairwise similarity detection for >= 50% identical code -> Mark SUSPICIOUS
    for (let i = 0; i < studentList.length; i++) {
      for (let j = i + 1; j < studentList.length; j++) {
        const stA = studentList[i];
        const stB = studentList[j];

        // Compare Q1 code
        if (stA.q1?.code && stB.q1?.code && stA.q1.code.length > 40 && stB.q1.code.length > 40) {
          const simQ1 = computeCodeSimilarity(stA.q1.code, stB.q1.code);
          if (simQ1 >= 0.50) {
            const pct = Math.round(simQ1 * 100);
            stA.isPlagiarized = true;
            stA.similarityPercent = Math.max(stA.similarityPercent || 0, pct);
            stA.plagiarismDetails = `${pct}% similar code with ${stB.studentName} on Q1`;
            stB.isPlagiarized = true;
            stB.similarityPercent = Math.max(stB.similarityPercent || 0, pct);
            stB.plagiarismDetails = `${pct}% similar code with ${stA.studentName} on Q1`;
          }
        }

        // Compare Q2 code
        if (stA.q2?.code && stB.q2?.code && stA.q2.code.length > 40 && stB.q2.code.length > 40) {
          const simQ2 = computeCodeSimilarity(stA.q2.code, stB.q2.code);
          if (simQ2 >= 0.50) {
            const pct = Math.round(simQ2 * 100);
            stA.isPlagiarized = true;
            stA.similarityPercent = Math.max(stA.similarityPercent || 0, pct);
            stA.plagiarismDetails = `${pct}% similar code with ${stB.studentName} on Q2`;
            stB.isPlagiarized = true;
            stB.similarityPercent = Math.max(stB.similarityPercent || 0, pct);
            stB.plagiarismDetails = `${pct}% similar code with ${stA.studentName} on Q2`;
          }
        }
      }
    }

    return studentList.sort((a: any, b: any) => {
      const prnA = String(a.studentPrn || a.prn || a.id || '').trim();
      const prnB = String(b.studentPrn || b.prn || b.id || '').trim();
      const numA = parseInt(prnA.replace(/\D/g, '').slice(-4), 10) || 999999;
      const numB = parseInt(prnB.replace(/\D/g, '').slice(-4), 10) || 999999;
      if (numA !== numB) return numA - numB;
      return prnA.localeCompare(prnB);
    });
  };

  const loadSubmissions = async (silent: boolean = false) => {
    if (!test) return;
    if (!silent && submissions.length === 0) setIsLoading(true);
    const targetTestId = String(test?.id || '').toLowerCase().trim();
    const isA4 = Boolean(
      targetTestId.includes('assessment-4') ||
      targetTestId === 'test-assessment-4' ||
      targetTestId === 'assessment-4' ||
      targetTestId.includes('arrays') ||
      targetTestId === 'test-continuous-arrays-search-sort' ||
      (test?.title && String(test.title).toLowerCase().includes('assessment 4'))
    );
    try {
      let sbSubs: any[] = [];
      const locksMap = new Map<string, any>();

      if (isSupabaseConfigured) {
        try {
          const { data: subData } = await Promise.race([
            supabase.from('assessment_submissions').select('*'),
            new Promise<any>((res) => setTimeout(() => res({ data: [] }), 2000))
          ]);
          if (Array.isArray(subData)) {
            sbSubs = subData;
          }
        } catch {}

        try {
          const { data: lockData } = await Promise.race([
            supabase.from('student_locks').select('*').eq('is_locked', true),
            new Promise<any>((res) => setTimeout(() => res({ data: [] }), 2000))
          ]);
          if (Array.isArray(lockData)) {
            lockData.forEach((l: any) => {
              const p = String(l.student_prn || '').toUpperCase().trim();
              if (p) locksMap.set(p, l);
            });
          }
        } catch {}
      }

      // Check localStorage for local proctor locks
      if (typeof window !== 'undefined') {
        try {
          for (let i = 0; i < localStorage.length; i++) {
            const k = localStorage.key(i);
            if (k && k.startsWith('logicq_exam_locked_')) {
              // Strictly isolate locks for the current test
              const isTestMatch = !targetTestId || k.includes(targetTestId) || (isA4 && (k.includes('assessment-4') || k.includes('test-continuous-arrays-search-sort')));
              if (!isTestMatch) continue;
              const p = k.split('_').pop()?.toUpperCase().trim();
              if (p && !locksMap.has(p)) {
                locksMap.set(p, {
                  student_prn: p,
                  is_locked: true,
                  reason: localStorage.getItem(`logicq_exam_proctor_lock_reason_${p}`) || '2 Proctoring Violations'
                });
              }
            }
          }
        } catch {}
      }

      let fsSubs: any[] = [];
      try {
        fsSubs = await Promise.race([
          FirestoreDataService.getAssessmentSubmissions(test.id, test.title),
          new Promise<any[]>((res) => setTimeout(() => res([]), 2500))
        ]);
      } catch {}

      let generalSubs: any[] = [];
      try {
        const snap: any = await Promise.race([
          getDocs(query(collection(db, 'submissions'), where('submissionType', '==', 'ASSESSMENT'))),
          new Promise<any>((res) => setTimeout(() => res(null), 2000))
        ]);
        if (snap && snap.forEach) {
          snap.forEach((d: any) => {
            const data = d.data();
            if (data && (String(data.testId || '').includes('assessment') || String(data.testId || '').includes('arrays'))) {
              generalSubs.push({ id: d.id, ...data });
            }
          });
        }
      } catch {}

      // Dual-layer KeyVal cloud mesh submissions fetch (test-scoped)
      let cloudSubs: any[] = [];
      try {
        const cohortPrns = C_PROGRAMMING_COHORT_STUDENTS.map((s) => (s.prn || '').toUpperCase().trim()).filter(Boolean);
        cloudSubs = await Promise.race([
          AttendanceSyncService.fetchLiveSubmissionsFromCloud(cohortPrns, test.id),
          new Promise<any[]>((res) => setTimeout(() => res([]), 3000))
        ]);
      } catch {}

      // LocalStorage submissions & live snippets fetch
      let localSubs: any[] = [];
      try {
        localSubs = JSON.parse(localStorage.getItem('logicq_assessment_submissions') || '[]');
      } catch {}

      if (typeof window !== 'undefined') {
        try {
          for (let i = 0; i < localStorage.length; i++) {
            const k = localStorage.key(i);
            if (k && k.startsWith('logicq_exam_student_sub_') && (k.endsWith('_Q1') || k.endsWith('_Q2'))) {
              // Strictly isolate local submissions to the current test
              const isTestMatch = !targetTestId || k.includes(targetTestId) || (isA4 && (k.includes('assessment-4') || k.includes('test-continuous-arrays-search-sort')));
              if (!isTestMatch) continue;
              const parts = k.replace('logicq_exam_student_sub_', '').split('_');
              const qKey = parts.pop();
              const p = parts.join('_').toUpperCase().trim();
              const val = localStorage.getItem(k);
              if (p && val) {
                const [, scoreStr, exitsStr, tabsStr, timeStr, copyPasteStr, keystrokesStr, burstStr, cpmStr] = val.split(':');
                const savedCode =
                  localStorage.getItem(`logicq_exam_submitted_code_${targetTestId}_${qKey}_${p}`) ||
                  localStorage.getItem(`logicq_exam_submitted_code_test-assessment-4_${qKey}_${p}`) ||
                  localStorage.getItem(`logicq_exam_submitted_code_test-continuous-arrays-search-sort_${qKey}_${p}`) ||
                  localStorage.getItem(`logicq_code_sub_${p}_${qKey}`) ||
                  '';

                const localCopy = Math.max(
                  Number(copyPasteStr) || 0,
                  Number(localStorage.getItem(`logicq_exam_copypaste_${targetTestId}_${p}`)) || 0,
                  Number(localStorage.getItem(`logicq_exam_copypaste_test-continuous-arrays-search-sort_${p}`)) || 0,
                  Number(localStorage.getItem(`logicq_exam_copypaste_test-assessment-4_${p}`)) || 0
                );
                const localExits = Math.max(
                  Number(exitsStr) || 0,
                  Number(localStorage.getItem(`logicq_exam_exits_${targetTestId}_${p}`)) || 0,
                  Number(localStorage.getItem(`logicq_exam_exits_test-continuous-arrays-search-sort_${p}`)) || 0,
                  Number(localStorage.getItem(`logicq_exam_exits_test-assessment-4_${p}`)) || 0
                );
                const localTabs = Math.max(
                  Number(tabsStr) || 0,
                  Number(localStorage.getItem(`logicq_exam_tabs_${targetTestId}_${p}`)) || 0,
                  Number(localStorage.getItem(`logicq_exam_tabs_test-continuous-arrays-search-sort_${p}`)) || 0,
                  Number(localStorage.getItem(`logicq_exam_tabs_test-assessment-4_${p}`)) || 0
                );

                const rawIncidentsStr = localStorage.getItem(`logicq_exam_incidents_${targetTestId}_${p}`) ||
                                        localStorage.getItem(`logicq_exam_incidents_test-continuous-arrays-search-sort_${p}`);
                let localIncidents: any[] = [];
                if (rawIncidentsStr) {
                  try {
                    const parsed = JSON.parse(rawIncidentsStr);
                    if (Array.isArray(parsed)) localIncidents = parsed;
                  } catch {}
                }

                localSubs.push({
                  id: `local_${p}_${qKey}`,
                  studentPrn: p,
                  prn: p,
                  qKey,
                  questionIndex: qKey === 'Q1' ? 0 : 1,
                  score: !isNaN(Number(scoreStr)) ? Number(scoreStr) : 0,
                  academicScore: !isNaN(Number(scoreStr)) ? Number(scoreStr) : 0,
                  status: (!isNaN(Number(scoreStr)) && Number(scoreStr) > 0) ? 'ACCEPTED' : (localExits >= 2 || localTabs >= 2 || localCopy >= 2 ? 'PROCTOR_LOCKED' : 'WRONG_ANSWER'),
                  code: savedCode,
                  fullscreenExits: localExits,
                  tabSwitchCount: localTabs,
                  timeTakenSeconds: Number(timeStr) || 0,
                  copyPasteAttempts: localCopy,
                  totalKeystrokes: Number(keystrokesStr) || 0,
                  largestBurstChars: Number(burstStr) || 0,
                  cpm: Number(cpmStr) || 0,
                  incidents: localIncidents,
                  submittedAt: new Date().toISOString(),
                  testId: test.id,
                });
              }
            }
          }
        } catch {}
      }

      const combined = [
        ...sbSubs,
        ...(Array.isArray(fsSubs) ? fsSubs : []),
        ...generalSubs,
        ...cloudSubs,
        ...localSubs,
      ];
      const aggregated = processSubmissions(combined, locksMap);
      setSubmissions(aggregated);

      // Keep the open student detail pane dynamically refreshed in real time
      setSelectedStudentSub((curr: any) => {
        if (!curr) {
          if (initialSelectedStudentId) {
            return aggregated.find((s: any) => s.id === initialSelectedStudentId || s.studentPrn === initialSelectedStudentId) || null;
          }
          return null;
        }
        const currPrn = String(curr.studentPrn || curr.prn || curr.id || '').toUpperCase().trim();
        const fresh = aggregated.find((s: any) => String(s.studentPrn || s.prn || s.id || '').toUpperCase().trim() === currPrn);
        return fresh || curr;
      });
    } catch (err) {
      console.warn('Failed to load test submissions:', err);
      setSubmissions(processSubmissions([]));
    } finally {
      if (!silent) setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!isOpen || !test) {
      setSelectedStudentSub(null);
      return;
    }
    setIsMaximized(true);
    // Pre-populate with enrolled cohort immediately so zero initial delay
    setSubmissions((prev) => (prev.length === 0 ? processSubmissions([]) : prev));
    loadSubmissions(true);

    // Silent background auto-refresh: updates telemetry seamlessly without flashing/re-rendering full screen
    const pollInterval = setInterval(() => {
      loadSubmissions(true);
    }, 4000);

    // Supabase real-time listener for instant test submissions & proctor locks (silent update)
    let unsubChannel: any = null;
    let unsubLockChannel: any = null;

    if (isSupabaseConfigured) {
      try {
        unsubChannel = supabase
          .channel(`audit_modal_assess_subs_${test.id}`)
          .on(
            'postgres_changes',
            { event: '*', schema: 'public', table: 'assessment_submissions' },
            () => {
              loadSubmissions(true);
            }
          )
          .subscribe();

        unsubLockChannel = supabase
          .channel(`audit_modal_student_locks_${test.id}`)
          .on(
            'postgres_changes',
            { event: '*', schema: 'public', table: 'student_locks' },
            () => {
              loadSubmissions(true);
            }
          )
          .subscribe();
      } catch {}
    }

    // Live Firestore listener (silent update)
    const unsub = FirestoreDataService.listenToAssessmentSubmissions(
      test.id,
      () => {
        loadSubmissions(true);
      },
      test.title
    );

    return () => {
      clearInterval(pollInterval);
      unsub();
      if (unsubChannel) supabase.removeChannel(unsubChannel);
      if (unsubLockChannel) supabase.removeChannel(unsubLockChannel);
    };
  }, [isOpen, test, initialSelectedStudentId]);

  // Compute severity flag for a submission
  const getSubmissionRisk = (sub: any): 'FLAGGED' | 'SUSPICIOUS' | 'CLEAN' | 'PENDING' => {
    const fullScreen = Number(sub.fullscreenExits || sub.fullScreenExitCount) || 0;
    const tabSwitches = Number(sub.tabSwitchCount) || 0;
    const pasteTries = Number(sub.copyPasteAttempts) || 0;
    const burst = Number(sub.largestBurstChars) || 0;
    const isLocked = Boolean(sub.isLocked || sub.isLockedByProctor || sub.is_locked);

    // If student cheated 2 times (tab switches, exits, or locked) -> FLAGGED
    if (isLocked || fullScreen >= 2 || pasteTries >= 2 || tabSwitches >= 2 || (tabSwitches + fullScreen + pasteTries >= 2) || burst > 70) {
      return 'FLAGGED';
    }
    if (fullScreen === 1 || pasteTries === 1 || tabSwitches === 1 || Number(sub.focusLossCount) > 0 || sub.isPlagiarized || (sub.similarityPercent && sub.similarityPercent >= 50)) {
      return 'SUSPICIOUS';
    }
    if (sub.q1 || sub.q2) {
      return 'CLEAN';
    }
    return 'PENDING';
  };

  // Filtered Submissions (Sorted Ascending by PRN last 4 digits numeric roll number)
  const filteredSubmissions = useMemo(() => {
    return submissions.filter((sub) => {
      const q = searchQuery.toLowerCase().trim();
      const name = (sub.studentName || '').toLowerCase();
      const prn = (sub.studentPrn || sub.prn || '').toLowerCase();
      const email = (sub.studentEmail || sub.email || '').toLowerCase();
      const matchesSearch = !q || name.includes(q) || prn.includes(q) || email.includes(q);

      if (!matchesSearch) return false;

      const risk = getSubmissionRisk(sub);
      const isSub = Boolean(sub.q1 || sub.q2);

      // Student who cheated 2 times & locked must appear in FLAGGED, NOT in SUBMITTED!
      if (filterSeverity === 'SUBMITTED') return isSub && risk !== 'FLAGGED';
      if (filterSeverity === 'FLAGGED') return risk === 'FLAGGED';
      if (filterSeverity === 'SUSPICIOUS') return risk === 'SUSPICIOUS';
      if (filterSeverity === 'CLEAN') return isSub && risk === 'CLEAN';
      return true;
    }).sort((a: any, b: any) => {
      const prnA = String(a.studentPrn || a.prn || a.id || '').trim();
      const prnB = String(b.studentPrn || b.prn || b.id || '').trim();
      const numA = parseInt(prnA.replace(/\D/g, '').slice(-4), 10) || 999999;
      const numB = parseInt(prnB.replace(/\D/g, '').slice(-4), 10) || 999999;
      if (numA !== numB) return numA - numB;
      return prnA.localeCompare(prnB);
    });
  }, [submissions, searchQuery, filterSeverity]);

  // Counts
  const submittedCount = submissions.filter((s) => (s.q1 || s.q2) && getSubmissionRisk(s) !== 'FLAGGED').length;
  const flaggedCount = submissions.filter((s) => getSubmissionRisk(s) === 'FLAGGED').length;
  const suspiciousCount = submissions.filter((s) => getSubmissionRisk(s) === 'SUSPICIOUS').length;
  const cleanCount = submissions.filter((s) => (s.q1 || s.q2) && getSubmissionRisk(s) === 'CLEAN').length;

  // Export to Excel with BOTH Question 1 & Question 2 Timestamps and Scores (Spacious, Beautiful Layout)
  const handleExportExcel = () => {
    if (!test || submissions.length === 0) {
      toast.info('No submissions available to export.');
      return;
    }

    try {
      const enrichedSubmissions = submissions.map((s) => ({
        ...s,
        integrityRisk: getSubmissionRisk(s),
      }));
      exportAssessmentMarkListExcel(test, enrichedSubmissions);
      toast.success('📊 Spacious, professional mark list report downloaded successfully!');
    } catch (err: any) {
      toast.error(err?.message || 'Failed to export Excel report.');
    }
  };

  const handleResetTestSubmissions = async () => {
    if (!window.confirm(`Are you sure you want to completely RESET all submissions and proctor locks for "${test?.title}"? This will make the test fresh with 0 submissions.`)) {
      return;
    }
    const toastId = toast.loading('Resetting test submissions and locks...');
    try {
      // 1. Purge Supabase locks and submissions for this test
      if (isSupabaseConfigured) {
        try {
          await supabase.from('student_locks').delete().neq('student_prn', 'NONE');
          await supabase.from('assessment_submissions').delete().neq('id', 'NONE');
          await supabase.from('test_attendance').delete().neq('id', 'NONE');
        } catch {}
      }

      // 2. Clear KeyVal A4 indexes & Attendance
      try {
        await fetch('https://api.keyval.org/set/lq_submitted_a4_prns/NONE');
        await fetch('https://api.keyval.org/set/lq_submitted_prns_v2026/NONE');
        await fetch('https://api.keyval.org/set/logicq_present_prns_v2026/NONE');
        await fetch('https://api.keyval.org/set/logicq_exam_confirmed_v2026/false');
      } catch {}

      // 3. Clear LocalStorage test entries
      if (typeof window !== 'undefined') {
        const targetTid = String(test?.id || '').toLowerCase();
        Object.keys(localStorage).forEach((k) => {
          if (
            (targetTid && k.includes(targetTid)) ||
            k.includes('test-assessment-4') ||
            k.includes('assessment-4') ||
            k.includes('test-continuous-arrays-search-sort') ||
            k.startsWith('logicq_exam_locked_') ||
            k.startsWith('logicq_exam_proctor_locked') ||
            k.startsWith('logicq_exam_student_submitted_') ||
            k.startsWith('logicq_exam_student_sub_') ||
            k.startsWith('logicq_code_sub_') ||
            k.startsWith('logicq_lab_attendance_') ||
            k.startsWith('logicq_student_present_in_lab_') ||
            k.startsWith('logicq_verified_present_') ||
            k.startsWith('logicq_attendance_confirmed_')
          ) {
            localStorage.removeItem(k);
          }
        });
      }

      RealtimeSyncService.emit('TESTS');
      RealtimeSyncService.emit('DASHBOARD');
      RealtimeSyncService.emit('ALL');

      await loadSubmissions();
      toast.success('🎉 Test successfully reset! All submissions and locks cleared.', { id: toastId });
    } catch (err: any) {
      toast.error('Failed to reset submissions: ' + (err?.message || 'Error'), { id: toastId });
    }
  };

  const handleCopyCode = (codeText: string) => {
    if (!codeText || codeText.trim().length === 0) {
      toast.info('No submitted code available to copy.');
      return;
    }
    navigator.clipboard.writeText(codeText);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
    toast.success('Student code copied to clipboard!');
  };

  const fetchLiveStudentCode = async (rawPrn: string, qKey: 'Q1' | 'Q2') => {
    const prn = (rawPrn || '').toUpperCase().trim();
    if (!prn) return;
    const cacheKey = `${prn}_${qKey}`;
    const activeSub = qKey === 'Q1' ? selectedStudentSub?.q1 : selectedStudentSub?.q2;
    setIsFetchingLiveCode(true);
    try {
      // 1. Try KeyVal Cloud Mesh
      const isA4 = Boolean(
        test?.id?.includes('assessment-4') ||
        test?.id?.includes('arrays') ||
        test?.id === 'test-continuous-arrays-search-sort' ||
        test?.title?.toLowerCase().includes('assessment 4')
      );
      const kvKey = isA4 ? `lq_c_a4_${prn}_${qKey}` : `lq_c_lab_${prn}_${qKey}`;
      try {
        const res = await fetch(`https://api.keyval.org/get/${kvKey}`, { signal: AbortSignal.timeout(2500) });
        if (res.ok) {
          const json = await res.json();
          if (json?.status === 'SUCCESS' && json?.val && json.val !== 'NONE') {
            const code = decodeURIComponent(String(json.val));
            if (code && code.trim().length > 10) {
              setLiveCodeCache((prev) => ({ ...prev, [cacheKey]: code }));
              return code;
            }
          }
        }
      } catch {}

      // 2. Try Supabase assessment_submissions table
      if (isSupabaseConfigured) {
        try {
          const { data } = await supabase
            .from('assessment_submissions')
            .select('q1, q2')
            .eq('student_prn', prn)
            .maybeSingle();
          if (data) {
            const code = qKey === 'Q1' ? data.q1?.code : data.q2?.code;
            if (code && code.trim().length > 10) {
              setLiveCodeCache((prev) => ({ ...prev, [cacheKey]: code }));
              return code;
            }
          }
        } catch {}
      }

      // 3. Try Firestore assessment_test_submissions
      try {
        const qRef = query(collection(db, 'assessment_test_submissions'), where('studentPrn', '==', prn));
        const snap = await Promise.race([
          getDocs(qRef),
          new Promise<any>((res) => setTimeout(() => res(null), 2500))
        ]);
        const docsWithCode: any[] = [];
        if (snap && snap.forEach) {
          snap.forEach((docSnap: any) => {
            const d = docSnap.data();
            const c = d.code || d.submittedCode || d.submitted_code || d.sourceCode || d.solution;
            if (c && typeof c === 'string' && c.trim().length > 10) {
              docsWithCode.push({ id: docSnap.id, ...d, resolvedCode: c });
            }
          });
        }

        // Match by title or problem ID
        for (const doc of docsWithCode) {
          const isTitleMatch = activeSub?.problemTitle && doc.problemTitle && doc.problemTitle.trim().toLowerCase() === activeSub.problemTitle.trim().toLowerCase();
          const isIdMatch = activeSub?.problemId && doc.problemId && (doc.problemId === activeSub.problemId || String(doc.problemId).includes(activeSub.problemId));
          const isQKeyMatch = doc.qKey === qKey || (doc.questionIndex != null && doc.questionIndex === (qKey === 'Q1' ? 0 : 1));
          if (isTitleMatch || isIdMatch || isQKeyMatch) {
            setLiveCodeCache((prev) => ({ ...prev, [cacheKey]: doc.resolvedCode }));
            return doc.resolvedCode;
          }
        }

        // If only 1 doc with code and we want Q1
        if (docsWithCode.length === 1 && qKey === 'Q1') {
          setLiveCodeCache((prev) => ({ ...prev, [cacheKey]: docsWithCode[0].resolvedCode }));
          return docsWithCode[0].resolvedCode;
        }
        if (docsWithCode.length >= 2) {
          const idx = qKey === 'Q1' ? 0 : 1;
          setLiveCodeCache((prev) => ({ ...prev, [cacheKey]: docsWithCode[idx].resolvedCode }));
          return docsWithCode[idx].resolvedCode;
        }
      } catch {}

      // 4. Try Firestore submissions collection
      try {
        const qRef = query(collection(db, 'submissions'), where('studentPrn', '==', prn));
        const snap = await Promise.race([
          getDocs(qRef),
          new Promise<any>((res) => setTimeout(() => res(null), 2500))
        ]);
        const docsWithCode: any[] = [];
        if (snap && snap.forEach) {
          snap.forEach((docSnap: any) => {
            const d = docSnap.data();
            const c = d.code || d.submittedCode || d.submitted_code || d.sourceCode || d.solution;
            if (c && typeof c === 'string' && c.trim().length > 10) {
              docsWithCode.push({ id: docSnap.id, ...d, resolvedCode: c });
            }
          });
        }
        for (const doc of docsWithCode) {
          const isTitleMatch = activeSub?.problemTitle && doc.problemTitle && doc.problemTitle.trim().toLowerCase() === activeSub.problemTitle.trim().toLowerCase();
          const isIdMatch = activeSub?.problemId && doc.problemId && (doc.problemId === activeSub.problemId || String(doc.problemId).includes(activeSub.problemId));
          const isQKeyMatch = doc.qKey === qKey || (doc.questionIndex != null && doc.questionIndex === (qKey === 'Q1' ? 0 : 1));
          if (isTitleMatch || isIdMatch || isQKeyMatch) {
            setLiveCodeCache((prev) => ({ ...prev, [cacheKey]: doc.resolvedCode }));
            return doc.resolvedCode;
          }
        }
        if (docsWithCode.length === 1 && qKey === 'Q1') {
          setLiveCodeCache((prev) => ({ ...prev, [cacheKey]: docsWithCode[0].resolvedCode }));
          return docsWithCode[0].resolvedCode;
        }
        if (docsWithCode.length >= 2) {
          const idx = qKey === 'Q1' ? 0 : 1;
          setLiveCodeCache((prev) => ({ ...prev, [cacheKey]: docsWithCode[idx].resolvedCode }));
          return docsWithCode[idx].resolvedCode;
        }
      } catch {}

      // 5. Try local storage
      if (typeof window !== 'undefined') {
        const tid = test?.id || 'test-assessment-4';
        const code =
          localStorage.getItem(`logicq_exam_submitted_code_${tid}_${qKey}_${prn}`) ||
          localStorage.getItem(`logicq_exam_submitted_code_test-assessment-4_${qKey}_${prn}`) ||
          localStorage.getItem(`logicq_exam_submitted_code_test-continuous-arrays-search-sort_${qKey}_${prn}`) ||
          localStorage.getItem(`logicq_code_sub_${prn}_${qKey}`);
        if (code && code.trim().length > 10) {
          setLiveCodeCache((prev) => ({ ...prev, [cacheKey]: code }));
          return code;
        }
      }
    } finally {
      setIsFetchingLiveCode(false);
    }
    return '';
  };

  const getDisplayedCode = (): string => {
    if (!selectedStudentSub) return '';
    const activeSub = selectedQuestionTab === 'q1' ? selectedStudentSub.q1 : selectedStudentSub.q2;
    const studentPrn = (selectedStudentSub.studentPrn || selectedStudentSub.prn || '').toUpperCase().trim();
    const tid = test?.id || 'test-assessment-4';
    const qKey = selectedQuestionTab === 'q1' ? 'Q1' : 'Q2';
    const cacheKey = `${studentPrn}_${qKey}`;

    // 1. Live code cache
    if (liveCodeCache[cacheKey]) return liveCodeCache[cacheKey];

    // 2. Active sub code
    const directCode = activeSub?.code || activeSub?.submittedCode || activeSub?.submitted_code || activeSub?.sourceCode || activeSub?.solution;
    if (directCode && typeof directCode === 'string' && directCode.trim().length > 0) return directCode;

    // 3. Search inside selectedStudentSub.rawSubmissions for matching question or code
    if (Array.isArray(selectedStudentSub.rawSubmissions) && selectedStudentSub.rawSubmissions.length > 0) {
      const exactMatch = selectedStudentSub.rawSubmissions.find((r: any) => {
        const c = r.code || r.submittedCode || r.submitted_code || r.sourceCode;
        if (!c || typeof c !== 'string' || c.trim().length === 0) return false;
        if (activeSub?.problemId && (r.problemId === activeSub.problemId || String(r.problemId).includes(activeSub.problemId))) return true;
        if (activeSub?.problemTitle && r.problemTitle && r.problemTitle.trim().toLowerCase() === activeSub.problemTitle.trim().toLowerCase()) return true;
        if (r.qKey === qKey) return true;
        if (r.questionIndex != null && r.questionIndex === (selectedQuestionTab === 'q1' ? 0 : 1)) return true;
        return false;
      });
      if (exactMatch) {
        const c = exactMatch.code || exactMatch.submittedCode || exactMatch.submitted_code || exactMatch.sourceCode;
        if (c && typeof c === 'string' && c.trim().length > 0) return c;
      }

      const withCode = selectedStudentSub.rawSubmissions.filter((r: any) => {
        const c = r.code || r.submittedCode || r.submitted_code || r.sourceCode;
        return Boolean(c && typeof c === 'string' && c.trim().length > 15);
      });
      if (withCode.length === 1 && selectedQuestionTab === 'q1') {
        const c = withCode[0].code || withCode[0].submittedCode || withCode[0].submitted_code || withCode[0].sourceCode;
        if (c) return c;
      }
      if (withCode.length >= 2) {
        const targetIdx = selectedQuestionTab === 'q1' ? 0 : 1;
        const c = withCode[targetIdx]?.code || withCode[targetIdx]?.submittedCode || withCode[targetIdx]?.submitted_code || withCode[targetIdx]?.sourceCode;
        if (c && typeof c === 'string' && c.trim().length > 15) return c;
      }
    }

    // 4. Local storage
    if (typeof window !== 'undefined') {
      const code =
        localStorage.getItem(`logicq_exam_submitted_code_${tid}_${qKey}_${studentPrn}`) ||
        localStorage.getItem(`logicq_exam_submitted_code_test-assessment-4_${qKey}_${studentPrn}`) ||
        localStorage.getItem(`logicq_exam_submitted_code_test-continuous-arrays-search-sort_${qKey}_${studentPrn}`) ||
        localStorage.getItem(`logicq_code_sub_${studentPrn}_${qKey}`) ||
        localStorage.getItem(`logicq_exam_draft_${tid}_${activeSub?.problemId}_${studentPrn}`) ||
        localStorage.getItem(`logicq_exam_draft_${activeSub?.problemId}_${studentPrn}`);
      if (code && code.trim().length > 0) return code;
    }

    return '';
  };

  useEffect(() => {
    if (!selectedStudentSub) return;
    const prn = (selectedStudentSub.studentPrn || selectedStudentSub.prn || '').toUpperCase().trim();
    const qKey = selectedQuestionTab === 'q1' ? 'Q1' : 'Q2';
    const targetSub = selectedQuestionTab === 'q1' ? selectedStudentSub.q1 : selectedStudentSub.q2;
    const cacheKey = `${prn}_${qKey}`;
    if ((!targetSub?.code || targetSub?.code.length < 15) && !liveCodeCache[cacheKey]) {
      fetchLiveStudentCode(prn, qKey);
    }
  }, [selectedStudentSub?.studentPrn, selectedStudentSub?.prn, selectedQuestionTab]);

  if (!isOpen || !test) return null;

  return (
    <div className="fixed inset-0 top-0 left-0 z-[100] w-screen h-screen m-0 p-0 bg-white dark:bg-[#0b0f19] flex flex-col overflow-hidden animate-in fade-in">
      <div className="w-full h-full flex flex-col overflow-hidden m-0 p-0 border-0 rounded-none bg-white dark:bg-[#0b0f19]">
        
        {/* ========================================================================= */}
        {/* 1. EXPANDED MODAL HEADER                                                  */}
        {/* ========================================================================= */}
        <div className="px-6 py-4 bg-slate-50/90 dark:bg-white/[0.02] border-b border-slate-200/80 dark:border-white/10 flex items-center justify-between gap-4 shrink-0">
          <div className="flex flex-wrap items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-600/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold text-sm shrink-0">
              <Award className="w-5 h-5" />
            </div>

            <div>
              <h2 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white font-sans tracking-tight">
                {test.title}
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => loadSubmissions(false)}
              className="p-2 text-slate-500 hover:text-indigo-600 dark:text-slate-400 dark:hover:text-white hover:bg-slate-200/60 dark:hover:bg-white/10 rounded-xl transition cursor-pointer"
              title="Refresh live submissions from dual-layer mesh"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-indigo-600' : ''}`} />
            </button>

            <button
              type="button"
              onClick={handleExportExcel}
              className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs transition flex items-center gap-2 shadow-sm cursor-pointer active:scale-95"
              title="Download Mark List with Q1 & Q2 Submission Timestamps"
            >
              <Download className="w-4 h-4 text-white" />
              <span className="font-bold">Download Mark List (Excel)</span>
            </button>

            <button
              type="button"
              onClick={handleResetTestSubmissions}
              className="px-3 py-2 rounded-xl bg-slate-100 hover:bg-rose-50 text-slate-700 hover:text-rose-600 dark:bg-slate-800 dark:hover:bg-rose-950/40 dark:text-slate-300 dark:hover:text-rose-400 font-semibold text-xs border border-slate-200 dark:border-slate-700 hover:border-rose-300 transition flex items-center gap-1.5 cursor-pointer active:scale-95"
              title="Reset all test submissions and locks to make test 100% fresh"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset Test</span>
            </button>

            {/* Maximize / Restore Toggle */}
            <button
              type="button"
              onClick={toggleFullscreen}
              className="p-2 text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-slate-200/60 dark:hover:bg-white/10 rounded-xl transition cursor-pointer"
              title={isMaximized ? 'Restore View' : 'Full Screen View'}
            >
              {isMaximized ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>

            {/* Close */}
            <button
              type="button"
              onClick={handleClose}
              className="p-2 text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-200/60 dark:hover:bg-white/10 rounded-xl transition cursor-pointer"
              title="Close Audit Console"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* 3. TOOLBAR: SEARCH, SEVERITY FILTERS & VIEW MODE SWITCHER                  */}
        {/* ========================================================================= */}
        <div className="px-6 py-3 bg-slate-50/50 dark:bg-white/[0.01] border-b border-slate-200/80 dark:border-white/5 flex flex-col md:flex-row items-center justify-between gap-3 shrink-0">
          <div className="relative w-full md:w-96">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search student name, PRN, or email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
            />
          </div>

          <div className="flex flex-wrap items-center justify-between w-full md:w-auto gap-3">
            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
              <button
                type="button"
                onClick={() => setFilterSeverity('ALL')}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition cursor-pointer ${
                  filterSeverity === 'ALL'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                All Enrolled ({submissions.length})
              </button>

              <button
                type="button"
                onClick={() => setFilterSeverity('SUBMITTED')}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition cursor-pointer flex items-center gap-1 ${
                  filterSeverity === 'SUBMITTED'
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-500/10'
                }`}
              >
                <span>Submitted ({submittedCount})</span>
              </button>

              <button
                type="button"
                onClick={() => setFilterSeverity('FLAGGED')}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition cursor-pointer flex items-center gap-1 ${
                  filterSeverity === 'FLAGGED'
                    ? 'bg-rose-600 text-white shadow-xs'
                    : 'text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-500/10'
                }`}
              >
                <span>Flagged ({flaggedCount})</span>
              </button>

              <button
                type="button"
                onClick={() => setFilterSeverity('SUSPICIOUS')}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition cursor-pointer flex items-center gap-1 ${
                  filterSeverity === 'SUSPICIOUS'
                    ? 'bg-amber-600 text-white shadow-xs'
                    : 'text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-500/10'
                }`}
              >
                <span>Suspicious ({suspiciousCount})</span>
              </button>

              <button
                type="button"
                onClick={() => setFilterSeverity('CLEAN')}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition cursor-pointer flex items-center gap-1 ${
                  filterSeverity === 'CLEAN'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-500/10'
                }`}
              >
                <span>Clean ({cleanCount})</span>
              </button>
            </div>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* 4. MAIN CONTENT: SUBMISSIONS LIST OR EXPANDED DEEP-DIVE                   */}
        {/* ========================================================================= */}
        <div className="flex-1 overflow-y-auto p-6">

          {isLoading && submissions.length === 0 ? (
            <div className="py-24 text-center text-xs font-mono text-slate-400 space-y-2">
              <RefreshCw className="w-6 h-6 animate-spin mx-auto text-indigo-500" />
              <span>Loading assessment submissions &amp; proctoring telemetry...</span>
            </div>
          ) : selectedStudentSub ? (
            /* ========================================================================= */
            /* 4B. STUDENT DEEP-DIVE DUAL-PANE AUDIT VIEW (CODE + TELEMETRY SIDE-BY-SIDE) */
            /* ========================================================================= */
            <div className="space-y-6 animate-in fade-in">
              {/* Back Bar */}
              <div className="flex items-center justify-between pb-3 border-b border-slate-200/80 dark:border-white/10">
                <button
                  type="button"
                  onClick={() => setSelectedStudentSub(null)}
                  className="inline-flex items-center gap-2 text-xs font-semibold text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white transition cursor-pointer"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>Back to Mark List Overview</span>
                </button>

                <div className="flex items-center gap-2.5">
                  <span className="text-xs font-mono text-slate-400">
                    PRN: <strong className="text-slate-800 dark:text-slate-200 text-sm">{selectedStudentSub.studentPrn || selectedStudentSub.prn}</strong>
                  </span>
                  <span className={`px-3 py-1 rounded-full text-xs font-mono font-bold uppercase ${
                    getSubmissionRisk(selectedStudentSub) === 'FLAGGED'
                      ? 'bg-rose-50 text-rose-700 dark:bg-rose-500/15 dark:text-rose-400 border border-rose-200 dark:border-rose-500/30'
                      : getSubmissionRisk(selectedStudentSub) === 'SUSPICIOUS'
                      ? 'bg-amber-50 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400 border border-amber-200 dark:border-amber-500/30'
                      : 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/30'
                  }`}>
                    {getSubmissionRisk(selectedStudentSub) === 'FLAGGED' ? '🚨 Flagged for Cheating' : getSubmissionRisk(selectedStudentSub) === 'SUSPICIOUS' ? '⚠️ Suspicious' : '🛡️ 100% Clean'}
                  </span>
                </div>
              </div>

              {/* Student Header Card with Q1 & Q2 Timestamp Summary */}
              <div className="p-5 rounded-2xl bg-slate-50/80 dark:bg-white/[0.02] border border-slate-200/80 dark:border-white/10 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-3.5">
                  <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold text-sm font-mono shadow-inner">
                    {(selectedStudentSub.studentName || 'ST').slice(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                      {selectedStudentSub.studentName || 'Student'}
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 font-mono">
                      PRN: <strong className="text-slate-700 dark:text-slate-300">{selectedStudentSub.studentPrn || selectedStudentSub.prn}</strong>
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-3 font-mono text-xs">
                  {/* Q1 Badge */}
                  <div className="px-3.5 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 shadow-xs">
                    <span className="text-[10px] text-slate-400 uppercase block font-sans">Q1: Arrays</span>
                    <strong className={`text-xs block ${(selectedStudentSub.q1?.status === 'PROCTOR_LOCKED' || selectedStudentSub.q1?.isLocked || (selectedStudentSub.isLocked && Number(selectedStudentSub.q1?.academicScore || 0) === 0)) ? 'text-rose-600 dark:text-rose-400' : Number(selectedStudentSub.q1?.academicScore || 0) > 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-900 dark:text-white'}`}>
                      {(selectedStudentSub.q1?.status === 'PROCTOR_LOCKED' || selectedStudentSub.q1?.isLocked || (selectedStudentSub.isLocked && Number(selectedStudentSub.q1?.academicScore || 0) === 0))
                        ? '🔒 Locked (0/5 M)'
                        : selectedStudentSub.q1 ? `${selectedStudentSub.q1.academicScore != null ? selectedStudentSub.q1.academicScore : 0} / 5 Marks ${Number(selectedStudentSub.q1.academicScore) === 5 ? '(Passed)' : Number(selectedStudentSub.q1.academicScore) > 0 ? '(Partial)' : '(Failed)'}` : 'Pending'}
                    </strong>
                    <span className="text-[10px] text-slate-400 block font-mono">
                      {selectedStudentSub.q1?.submittedAt ? new Date(selectedStudentSub.q1.submittedAt).toLocaleTimeString() : 'Not submitted'}
                    </span>
                  </div>

                  {/* Q2 Badge */}
                  <div className="px-3.5 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 shadow-xs">
                    <span className="text-[10px] text-slate-400 uppercase block font-sans">Q2: Search &amp; Sort</span>
                    <strong className={`text-xs block ${(selectedStudentSub.isLocked || selectedStudentSub.q2?.status === 'PROCTOR_LOCKED' || getSubmissionRisk(selectedStudentSub) === 'FLAGGED' || Number(selectedStudentSub.q2?.academicScore || 0) === 0) ? 'text-rose-600 dark:text-rose-400' : Number(selectedStudentSub.q2?.academicScore || 0) > 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-900 dark:text-white'}`}>
                      {(selectedStudentSub.isLocked || selectedStudentSub.q2?.status === 'PROCTOR_LOCKED' || getSubmissionRisk(selectedStudentSub) === 'FLAGGED')
                        ? '🔒 Locked (0/5 M)'
                        : selectedStudentSub.q2 ? `${selectedStudentSub.q2.academicScore != null ? selectedStudentSub.q2.academicScore : 0} / 5 Marks ${Number(selectedStudentSub.q2.academicScore) === 5 ? '(Passed)' : Number(selectedStudentSub.q2.academicScore) > 0 ? '(Partial)' : '(Failed)'}` : 'Pending'}
                    </strong>
                    <span className="text-[10px] text-slate-400 block font-mono">
                      {selectedStudentSub.q2?.submittedAt ? new Date(selectedStudentSub.q2.submittedAt).toLocaleTimeString() : 'Not submitted'}
                    </span>
                  </div>

                  {/* Total Marks */}
                  <div className="px-3.5 py-2 rounded-xl bg-emerald-50/80 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 shadow-xs">
                    <span className="text-[10px] text-emerald-600 uppercase block font-sans font-bold">Total Marks</span>
                    <strong className="text-emerald-700 dark:text-emerald-400 text-base">
                      {selectedStudentSub.academicScore != null ? selectedStudentSub.academicScore : 0} / {maxTestMarks}
                    </strong>
                  </div>

                  {/* TIME OVER badge in inspect detail view */}
                  {selectedStudentSub.isTimeOver && !selectedStudentSub.isLocked && (
                    <div className="px-3.5 py-2 rounded-xl bg-orange-50/80 dark:bg-orange-500/10 border border-orange-200 dark:border-orange-500/25 shadow-xs" title={selectedStudentSub.timeOverReason || 'Timer expired — auto-submitted by system'}>
                      <span className="text-[10px] text-orange-600 uppercase block font-sans font-bold">⏰ Timer Expired</span>
                      <strong className="text-orange-700 dark:text-orange-400 text-xs block">Auto-Submitted</strong>
                      <span className="text-[9px] text-orange-500 block font-mono">Time ran out</span>
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={() => handleUnlockStudent()}
                    disabled={isUnlocking}
                    className="px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-semibold text-xs shadow-sm flex items-center gap-1.5 transition cursor-pointer disabled:opacity-50 active:scale-95"
                    title="Unlock student workspace if locked due to proctoring violation"
                  >
                    {isUnlocking ? (
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Unlock className="w-3.5 h-3.5" />
                    )}
                    <span>Reopen / Unlock Student</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleResetIndividualStudent(selectedStudentSub?.studentPrn || selectedStudentSub?.prn, selectedStudentSub?.studentName)}
                    className="px-4 py-2 rounded-xl bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-700 hover:to-red-700 text-white font-semibold text-xs shadow-sm flex items-center gap-1.5 transition cursor-pointer active:scale-95"
                    title="Completely reset this student's test records and proctor locks to start fresh"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Reset Student Test</span>
                  </button>
                </div>
              </div>

              {/* Dual-Column Layout: Code (Left 7 Cols) + Telemetry (Right 5 Cols) */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                {/* LEFT: Code Viewer with Question 1 & Question 2 Switcher (7 Columns) */}
                <div className="lg:col-span-7 space-y-3">
                  <div className="flex items-center justify-between pb-1">
                    {/* Q1 / Q2 Switcher Pills */}
                    <div className="flex items-center gap-2 p-1 bg-slate-100 dark:bg-white/5 rounded-xl">
                      <button
                        type="button"
                        onClick={() => setSelectedQuestionTab('q1')}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer ${
                          selectedQuestionTab === 'q1'
                            ? 'bg-blue-600 text-white shadow-xs'
                            : 'text-slate-600 hover:text-slate-900 dark:text-slate-300'
                        }`}
                      >
                        <FileCode className="w-3.5 h-3.5" />
                        <span>Question 1 (Arrays)</span>
                        {selectedStudentSub.q1 && (
                          <span className="text-[10px] bg-white/20 px-1.5 py-0.2 rounded-full font-mono">
                            {selectedStudentSub.q1.academicScore != null ? selectedStudentSub.q1.academicScore : 0}/5
                          </span>
                        )}
                      </button>

                      <button
                        type="button"
                        onClick={() => setSelectedQuestionTab('q2')}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer ${
                          selectedQuestionTab === 'q2'
                            ? 'bg-blue-600 text-white shadow-xs'
                            : 'text-slate-600 hover:text-slate-900 dark:text-slate-300'
                        }`}
                      >
                        <FileCode className="w-3.5 h-3.5" />
                        <span>Question 2 (Search/Sort)</span>
                        {selectedStudentSub.q2 && (
                          <span className="text-[10px] bg-white/20 px-1.5 py-0.2 rounded-full font-mono">
                            {selectedStudentSub.q2.academicScore != null ? selectedStudentSub.q2.academicScore : 0}/5
                          </span>
                        )}
                      </button>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        disabled={isFetchingLiveCode}
                        onClick={() => {
                          const studentPrn = (selectedStudentSub.studentPrn || selectedStudentSub.prn || '').toUpperCase().trim();
                          const qKey = selectedQuestionTab === 'q1' ? 'Q1' : 'Q2';
                          fetchLiveStudentCode(studentPrn, qKey);
                        }}
                        className="px-3 py-1.5 rounded-xl border border-sky-500/30 hover:bg-sky-500/10 text-xs font-mono text-sky-600 dark:text-sky-400 flex items-center gap-1.5 transition cursor-pointer"
                        title="Fetch or reload latest C code from student terminal / cloud"
                      >
                        <RotateCcw className={`w-3.5 h-3.5 ${isFetchingLiveCode ? 'animate-spin' : ''}`} />
                        <span>{isFetchingLiveCode ? 'Fetching...' : 'Fetch Live Code'}</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          const code = getDisplayedCode();
                          handleCopyCode(code || '');
                        }}
                        className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-white/10 hover:bg-slate-100 dark:hover:bg-white/5 text-xs font-mono text-slate-700 dark:text-slate-300 flex items-center gap-1.5 transition cursor-pointer"
                      >
                        {copiedCode ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                        <span>{copiedCode ? 'Copied' : 'Copy Code'}</span>
                      </button>
                    </div>
                  </div>

                  {/* Active Question Info Strip */}
                  {(() => {
                    const activeSub = selectedQuestionTab === 'q1' ? selectedStudentSub.q1 : selectedStudentSub.q2;
                    const assignedQ = selectedQuestionTab === 'q1' ? selectedStudentSub.assignedQ1 : selectedStudentSub.assignedQ2;
                    const title = activeSub?.problemTitle || assignedQ?.title || (selectedQuestionTab === 'q1' ? 'Question 1: Easy Arrays' : 'Question 2: Moderate Search/Sort');

                    return (
                      <div className="p-3 rounded-xl bg-slate-50 dark:bg-white/[0.02] border border-slate-200/80 dark:border-white/5 flex items-center justify-between text-xs">
                        <div>
                          <strong className="text-slate-900 dark:text-white block font-sans">
                            {title}
                          </strong>
                          <span className="text-slate-400 font-mono text-[11px]">
                            {activeSub?.submittedAt ? `Submitted At: ${new Date(activeSub.submittedAt).toLocaleString()}` : 'Awaiting submission'}
                          </span>
                        </div>
                        <span className={`font-mono font-bold text-sm ${Number(activeSub?.academicScore || 0) > 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                          {activeSub ? `${activeSub.academicScore != null ? activeSub.academicScore : 0} / 5 Marks` : '0 / 5 Marks'}
                        </span>
                      </div>
                    );
                  })()}

                  {/* Test Case Evaluation Matrix (Pass/Fail & Marks Breakdown) */}
                  {(() => {
                    const activeSub = selectedQuestionTab === 'q1' ? selectedStudentSub.q1 : selectedStudentSub.q2;
                    if (!activeSub) return null;

                    const studentPrn = (selectedStudentSub.studentPrn || selectedStudentSub.prn || '').toUpperCase().trim();
                    const tid = test?.id || 'test-assessment-4';
                    const qKey = selectedQuestionTab === 'q1' ? 'Q1' : 'Q2';
                    
                    let outcomes = activeSub.testOutcomes || activeSub.testResults;
                    if ((!outcomes || outcomes.length === 0) && typeof window !== 'undefined') {
                      try {
                        const raw = localStorage.getItem(`logicq_exam_test_outcomes_${tid}_${qKey}_${studentPrn}`);
                        if (raw) outcomes = JSON.parse(raw);
                      } catch {}
                    }

                    const subScore = Number(activeSub.academicScore != null ? activeSub.academicScore : (activeSub.score ?? 0));
                    const isPassedAll = subScore === 5;
                    const isVisiblePassed = (outcomes && outcomes[0]) ? outcomes[0].passed : subScore >= 2;
                    const isHiddenPassed = (outcomes && outcomes[1]) ? outcomes[1].passed : (subScore === 5 || subScore === 3);

                    return (
                      <div className="p-3.5 rounded-2xl border border-slate-200/80 dark:border-white/10 bg-slate-50/70 dark:bg-white/[0.02] space-y-2.5">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Terminal className="w-4 h-4 text-indigo-500" />
                            <span className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider font-mono">
                              Automated Test Cases Breakdown (5 Marks Total)
                            </span>
                          </div>
                          <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-mono font-bold ${
                            isPassedAll
                              ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400 border border-emerald-200'
                              : subScore > 0
                              ? 'bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400 border border-amber-200'
                              : 'bg-rose-50 text-rose-700 dark:bg-rose-500/10 dark:text-rose-400 border border-rose-200'
                          }`}>
                            {isPassedAll ? 'All Passed (5/5 M)' : subScore > 0 ? `Partial Credit (${subScore}/5 M)` : 'Failed / Incomplete (0/5 M)'}
                          </span>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs font-mono">
                          {/* Test Case 1: Visible */}
                          <div className={`p-2.5 rounded-xl border flex items-center justify-between ${
                            isVisiblePassed
                              ? 'bg-emerald-50/80 dark:bg-emerald-500/10 border-emerald-200 text-emerald-900 dark:text-emerald-200'
                              : 'bg-rose-50/80 dark:bg-rose-500/10 border-rose-200 text-rose-900 dark:text-rose-200'
                          }`}>
                            <div className="flex items-center gap-2">
                              {isVisiblePassed ? <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" /> : <XCircle className="w-4 h-4 text-rose-600 shrink-0" />}
                              <div>
                                <span className="font-bold block text-[11px]">Test Case 1 (Visible)</span>
                                <span className="text-[10px] text-slate-500 dark:text-slate-400 block font-sans">
                                  {isVisiblePassed ? 'Passed standard assertions' : 'Output mismatch / Incomplete'}
                                </span>
                              </div>
                            </div>
                            <span className="font-bold text-xs shrink-0">
                              {isVisiblePassed ? '+2.0 / 2.0 M' : '0.0 / 2.0 M'}
                            </span>
                          </div>

                          {/* Test Case 2: Hidden Boundary */}
                          <div className={`p-2.5 rounded-xl border flex items-center justify-between ${
                            isHiddenPassed
                              ? 'bg-emerald-50/80 dark:bg-emerald-500/10 border-emerald-200 text-emerald-900 dark:text-emerald-200'
                              : 'bg-rose-50/80 dark:bg-rose-500/10 border-rose-200 text-rose-900 dark:text-rose-200'
                          }`}>
                            <div className="flex items-center gap-2">
                              {isHiddenPassed ? <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" /> : <XCircle className="w-4 h-4 text-rose-600 shrink-0" />}
                              <div>
                                <span className="font-bold block text-[11px]">Test Case 2 (Hidden Boundary)</span>
                                <span className="text-[10px] text-slate-500 dark:text-slate-400 block font-sans">
                                  {isHiddenPassed ? 'Passed edge case' : (activeSub.isTimeOver ? '⏰ Timer expired before solving' : 'Boundary case failed')}
                                </span>
                              </div>
                            </div>
                            <span className="font-bold text-xs shrink-0">
                              {isHiddenPassed ? '+3.0 / 3.0 M' : '0.0 / 3.0 M'}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })()}

                  {/* Syntax Highlighted Code Box */}
                  <div className="rounded-2xl border border-slate-800 bg-[#070b14] p-4 font-mono text-xs text-slate-200 overflow-x-auto shadow-inner leading-relaxed max-h-[580px] overflow-y-auto">
                    <pre className="whitespace-pre">
                      <code>
                        {(() => {
                          const activeSub = selectedQuestionTab === 'q1' ? selectedStudentSub.q1 : selectedStudentSub.q2;
                          const studentPrn = (selectedStudentSub.studentPrn || selectedStudentSub.prn || '').toUpperCase().trim();
                          const qKey = selectedQuestionTab === 'q1' ? 'Q1' : 'Q2';
                          const code = getDisplayedCode();

                          if (isFetchingLiveCode && !code) {
                            return `// 🔄 Fetching student's submitted C code from cloud mesh (PRN: ${studentPrn}, ${qKey})...\n// Please wait a moment...`;
                          }
                          if (code && code.trim().length > 0) {
                            return code;
                          }
                          if (!activeSub) {
                            return `// Question ${selectedQuestionTab.toUpperCase()} has not been submitted yet (Pending).`;
                          }
                          const score = Number(activeSub.academicScore != null ? activeSub.academicScore : (activeSub.score ?? 0));
                          if (score > 0) {
                            return `// ⚡ Student submitted and scored ${score}/5 Marks on Question ${selectedQuestionTab.toUpperCase()}.\n// Code payload is synchronizing from student terminal.\n// Click "Fetch Live Code ↻" button above to pull the latest submitted code.`;
                          }
                          return '// No code submitted yet for this question';
                        })()}
                      </code>
                    </pre>
                  </div>
                </div>

                {/* RIGHT: Proctoring & Integrity Telemetry (5 Columns) */}
                <div className="lg:col-span-5 space-y-4">
                  <div className="flex items-center gap-2 pb-1">
                    <Activity className="w-4 h-4 text-rose-500" />
                    <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider font-mono">
                      Proctoring Telemetry &amp; Cheating Breaches
                    </h4>
                  </div>

                  {/* Telemetry Metric Cards */}
                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-white/[0.02] border border-slate-200 dark:border-white/5">
                      <span className="text-[10px] text-slate-400 uppercase font-sans">Tab Switches</span>
                      <div className={`text-base font-bold font-mono mt-0.5 ${
                        selectedStudentSub.tabSwitchCount > 0 ? 'text-rose-600' : 'text-slate-800 dark:text-slate-200'
                      }`}>
                        {selectedStudentSub.tabSwitchCount || 0} Times
                      </div>
                    </div>

                    <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-white/[0.02] border border-slate-200 dark:border-white/5">
                      <span className="text-[10px] text-slate-400 uppercase font-sans">Fullscreen Exits</span>
                      <div className={`text-base font-bold font-mono mt-0.5 ${
                        (selectedStudentSub.fullscreenExits || selectedStudentSub.fullScreenExitCount) > 0 ? 'text-rose-600' : 'text-slate-800 dark:text-slate-200'
                      }`}>
                        {selectedStudentSub.fullscreenExits || selectedStudentSub.fullScreenExitCount || 0} Times
                      </div>
                    </div>

                    <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-white/[0.02] border border-slate-200 dark:border-white/5">
                      <span className="text-[10px] text-slate-400 uppercase font-sans">Paste Interceptions</span>
                      <div className={`text-base font-bold font-mono mt-0.5 ${
                        selectedStudentSub.copyPasteAttempts > 0 ? 'text-rose-600' : 'text-slate-800 dark:text-slate-200'
                      }`}>
                        {selectedStudentSub.copyPasteAttempts || 0} Blocked
                      </div>
                    </div>

                    <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-white/[0.02] border border-slate-200 dark:border-white/5">
                      <span className="text-[10px] text-slate-400 uppercase font-sans">Typing Speed (CPM)</span>
                      <div className="text-base font-bold font-mono mt-0.5 text-amber-600 dark:text-amber-400">
                        {(() => {
                          const keys = Number(selectedStudentSub.totalKeystrokes) || 0;
                          const sec = Number(selectedStudentSub.timeTakenSeconds) || 0;
                          const cpm = Number(selectedStudentSub.cpm || selectedStudentSub.typingVelocityCPM) || (keys > 0 && sec > 0 ? Math.round((keys / sec) * 60) : keys > 0 ? Math.min(320, Math.round(keys * 0.7)) : 0);
                          return cpm > 0 ? `${cpm} CPM` : '0 CPM';
                        })()}
                        <span className="text-[10px] text-slate-400 font-normal ml-1">
                          ({selectedStudentSub.totalKeystrokes || 0} Keys)
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Incident Chronological Audit Trail */}
                  <div className="space-y-2">
                    <h5 className="text-[11px] font-bold text-slate-700 dark:text-slate-300 font-mono">
                      Chronological Event Logs
                    </h5>

                    {Array.isArray(selectedStudentSub.incidents) && selectedStudentSub.incidents.length > 0 ? (
                      <div className="rounded-2xl border border-slate-200 dark:border-white/10 overflow-hidden divide-y divide-slate-100 dark:divide-white/5 text-xs font-mono max-h-[420px] overflow-y-auto">
                        {selectedStudentSub.incidents.map((inc: any, i: number) => (
                          <div
                            key={i}
                            className={`p-3 flex items-start gap-2.5 transition ${
                              inc.severity === 'CRITICAL'
                                ? 'bg-rose-50/60 dark:bg-rose-500/[0.07]'
                                : inc.severity === 'WARNING'
                                ? 'bg-amber-50/60 dark:bg-amber-500/[0.07]'
                                : 'bg-white dark:bg-[#0b0f19]'
                            }`}
                          >
                            <span className="px-1.5 py-0.5 rounded text-[10px] bg-slate-100 dark:bg-white/10 text-slate-600 dark:text-slate-300 font-bold shrink-0">
                              {inc.timestamp || '00:00'}
                            </span>

                            <div className="space-y-0.5 flex-1 min-w-0">
                              <span className={`text-[10px] font-bold uppercase tracking-wider block ${
                                inc.severity === 'CRITICAL' ? 'text-rose-600 dark:text-rose-400' : inc.severity === 'WARNING' ? 'text-amber-600 dark:text-amber-400' : 'text-indigo-600 dark:text-indigo-400'
                              }`}>
                                {inc.type}
                              </span>
                              <p className="text-slate-700 dark:text-slate-300 text-xs font-sans leading-relaxed">
                                {inc.details || inc.reason || 'Proctor event logged.'}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="p-6 rounded-2xl border border-dashed border-slate-200 dark:border-white/10 text-center text-xs text-slate-400 bg-slate-50/50 dark:bg-white/[0.01]">
                        <CheckCircle2 className="w-6 h-6 text-emerald-500 mx-auto mb-2" />
                        <span className="font-semibold text-slate-700 dark:text-slate-300 block">Zero Violations Logged</span>
                        <span>Student maintained 100% exam compliance throughout the test.</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            /* ========================================================================= */
            /* 4A. SUBMISSIONS LIST: TABLE VIEW OR GRID CARDS (WITH Q1 & Q2 TIMESTAMPS)  */
            /* ========================================================================= */
            submissions.length === 0 ? (
              <div className="py-24 text-center text-xs text-slate-400 space-y-3">
                <div className="w-14 h-14 rounded-3xl bg-indigo-500/10 text-indigo-500 flex items-center justify-center mx-auto">
                  <Users className="w-7 h-7" />
                </div>
                <div className="space-y-1">
                  <h4 className="text-base font-bold text-slate-800 dark:text-slate-200">No Student Submissions Yet</h4>
                  <p className="text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
                    Students who start and submit this test will have their Q1/Q2 code, scores, and timestamps appear here in real time.
                  </p>
                </div>
              </div>
            ) : filteredSubmissions.length === 0 ? (
              <div className="py-24 text-center text-xs text-slate-400 space-y-2">
                <Users className="w-8 h-8 text-slate-300 dark:text-slate-600 mx-auto" />
                <p>No student submissions found matching this filter.</p>
              </div>
            ) : (
              /* --- CARD GRID VIEW --- */
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4">
                {filteredSubmissions.map((sub: any) => {
                  const risk = getSubmissionRisk(sub);
                  const isFlagged = risk === 'FLAGGED';
                  const isSuspicious = risk === 'SUSPICIOUS';
                  const isStudentLocked = Boolean(sub.isLocked || isFlagged || sub.q2?.status === 'PROCTOR_LOCKED' || sub.q2?.isLocked);

                  const q1Score = sub.q1 ? (sub.q1.academicScore != null ? sub.q1.academicScore : 5) : 0;
                  const q2Score = isStudentLocked ? 0 : (sub.q2 ? (sub.q2.academicScore != null ? sub.q2.academicScore : 5) : 0);
                  const totalScore = sub.academicScore != null ? sub.academicScore : (q1Score + q2Score);

                  return (
                    <div
                      key={sub.id}
                      onClick={() => setSelectedStudentSub(sub)}
                      className="group p-5 rounded-2xl border border-slate-200/80 dark:border-white/10 bg-white hover:bg-slate-50/80 dark:bg-white/[0.02] dark:hover:bg-white/[0.04] transition-all cursor-pointer shadow-xs hover:border-indigo-500/40 flex flex-col justify-between gap-4"
                    >
                      <div className="space-y-3">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-2xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold text-xs font-mono shrink-0 shadow-inner">
                              {(sub.studentName || 'ST').slice(0, 2).toUpperCase()}
                            </div>
                            <div>
                              <h4 className="font-bold text-sm text-slate-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors truncate">
                                {sub.studentName || 'Student'}
                              </h4>
                              <span className="font-mono text-xs text-slate-500 dark:text-slate-400">
                                {sub.studentPrn || sub.prn}
                              </span>
                            </div>
                          </div>

                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase shrink-0 ${
                            risk === 'FLAGGED'
                              ? 'bg-rose-50 text-rose-700 dark:bg-rose-500/10 dark:text-rose-400 border border-rose-200 dark:border-rose-500/20'
                              : risk === 'SUSPICIOUS'
                              ? 'bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400 border border-amber-200 dark:border-amber-500/20'
                              : risk === 'CLEAN'
                              ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/20'
                              : 'bg-slate-100 text-slate-500 dark:bg-white/5 dark:text-slate-400 border border-slate-200 dark:border-white/10'
                          }`}>
                            {risk === 'FLAGGED' ? '🚨 Flagged' : risk === 'SUSPICIOUS' ? '⚠️ Suspicious' : risk === 'CLEAN' ? '🛡️ Clean' : '⏳ Not Started'}
                          </span>
                        </div>

                        {/* Q1 & Q2 Time Badges */}
                        <div className="grid grid-cols-2 gap-2 text-[11px] font-mono pt-1">
                          <div className="p-2 rounded-xl bg-slate-50 dark:bg-white/[0.02] border border-slate-200/60 dark:border-white/5">
                            <span className="text-[9px] text-slate-400 block font-sans">Q1: Arrays</span>
                            <span className={`font-bold block ${sub.q1 && q1Score > 0 ? 'text-emerald-600 dark:text-emerald-400' : isStudentLocked ? 'text-rose-600 dark:text-rose-400' : sub.q1 ? 'text-rose-600 dark:text-rose-400' : 'text-slate-800 dark:text-slate-200'}`}>
                              {isStudentLocked && (!sub.q1 || q1Score === 0 || sub.q1?.status === 'PROCTOR_LOCKED')
                                ? '🔒 Locked (0/5 M)'
                                : sub.q1 && q1Score > 0
                                ? `${q1Score}/5 M ${q1Score === 5 ? '(Passed)' : '(Partial)'}`
                                : isStudentLocked ? '🔒 Locked (0/5 M)' : sub.q1 ? `${q1Score}/5 M` : 'Pending'}
                            </span>
                            <span className="text-[9px] text-slate-400 block">
                              {sub.q1?.submittedAt ? new Date(sub.q1.submittedAt).toLocaleTimeString() : '-'}
                            </span>
                          </div>

                          <div className="p-2 rounded-xl bg-slate-50 dark:bg-white/[0.02] border border-slate-200/60 dark:border-white/5">
                            <span className="text-[9px] text-slate-400 block font-sans">Q2: Search/Sort</span>
                            <span className={`font-bold block ${isStudentLocked || sub.q2?.status === 'PROCTOR_LOCKED' || sub.q2?.isLocked || (sub.q2 && q2Score === 0) ? 'text-rose-600 dark:text-rose-400' : sub.q2 && q2Score > 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-800 dark:text-slate-200'}`}>
                              {isStudentLocked || sub.q2?.status === 'PROCTOR_LOCKED' || sub.q2?.isLocked
                                ? '🔒 Locked (0/5 M)'
                                : sub.q2 && q2Score > 0
                                ? `${q2Score}/5 M ${q2Score === 5 ? '(Passed)' : '(Partial)'}`
                                : sub.q2 ? `${q2Score}/5 M` : 'Pending'}
                            </span>
                            <span className="text-[9px] text-slate-400 block">
                              {sub.q2?.submittedAt ? new Date(sub.q2.submittedAt).toLocaleTimeString() : '-'}
                            </span>
                          </div>
                        </div>

                        {/* Telemetry Chips */}
                        <div className="flex flex-wrap items-center gap-2 text-[11px] font-mono text-slate-500 dark:text-slate-400 pt-1">
                          <span className={(sub.q1 || sub.q2) && sub.tabSwitchCount > 0 ? 'text-rose-600 font-bold' : ''}>
                            🔄 {(sub.q1 || sub.q2) ? (sub.tabSwitchCount || 0) : 0} Tabs
                          </span>
                          <span>•</span>
                          <span className={(sub.q1 || sub.q2) && (sub.fullscreenExits || sub.fullScreenExitCount) > 0 ? 'text-rose-600 font-bold' : ''}>
                            🖥️ {(sub.q1 || sub.q2) ? (sub.fullscreenExits || sub.fullScreenExitCount || 0) : 0} Exits
                          </span>
                          <span>•</span>
                          <span className={(sub.q1 || sub.q2) && sub.copyPasteAttempts > 0 ? 'text-rose-600 font-bold' : ''}>
                            📋 {(sub.q1 || sub.q2) ? (sub.copyPasteAttempts || 0) : 0} Pastes
                          </span>
                        </div>

                        {/* Plagiarism Alert Badge for 50%+ similar code */}
                        {sub.isPlagiarized && (
                          <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/25 text-[10px] font-mono text-amber-700 dark:text-amber-400 font-bold flex items-center gap-1.5 animate-pulse">
                            <AlertTriangle className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                            <span className="truncate">⚠️ {sub.similarityPercent}% Code Match ({sub.plagiarismDetails})</span>
                          </div>
                        )}

                        {/* TIME OVER Badge — student's timer ran out before they solved the question */}
                        {sub.isTimeOver && !sub.isLocked && (
                          <div className="p-2 rounded-xl bg-orange-500/10 border border-orange-500/25 text-[10px] font-mono text-orange-700 dark:text-orange-400 font-bold flex items-center gap-1.5" title={sub.timeOverReason || 'Timer expired — auto-submitted by system'}>
                            <span>⏰</span>
                            <span className="truncate">TIMER EXPIRED — Auto-Submitted{sub.timeOverReason ? ` (${sub.timeOverReason.split('.')[0]})` : ''}</span>
                          </div>
                        )}
                      </div>

                      {/* Card Footer: Score & Action */}
                      <div className="pt-3 border-t border-slate-100 dark:border-white/5 flex items-center justify-between">
                        <div>
                          <span className="text-[10px] text-slate-400 block font-sans">Total Marks</span>
                          <span className="font-mono font-bold text-slate-800 dark:text-slate-200 text-sm">
                            {(sub.q1 || sub.q2) ? `${totalScore} / ${maxTestMarks}` : `- / ${maxTestMarks}`}
                          </span>
                        </div>

                        <div className="flex items-center gap-1.5">
                          {(isFlagged || isSuspicious || sub.tabSwitchCount > 0 || sub.fullscreenExits > 0) && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleUnlockStudent(sub.studentPrn || sub.prn);
                              }}
                              className="px-2 py-1 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-[11px] font-semibold flex items-center gap-1 transition cursor-pointer"
                              title="Reopen / Unlock Student"
                            >
                              <Unlock className="w-3 h-3" />
                              <span>Unlock</span>
                            </button>
                          )}

                          {(sub.q1 || sub.q2 || isFlagged || isSuspicious || sub.tabSwitchCount > 0 || sub.fullscreenExits > 0 || sub.isLocked || sub.isLockedByProctor) && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleResetIndividualStudent(sub.studentPrn || sub.prn, sub.studentName || sub.name);
                              }}
                              className="px-2 py-1 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 text-[11px] font-semibold flex items-center gap-1 transition cursor-pointer active:scale-95"
                              title="Reset all test records, code submissions & proctor locks for this student"
                            >
                              <RotateCcw className="w-3 h-3" />
                              <span>Reset</span>
                            </button>
                          )}

                          <div className="px-2.5 py-1 rounded-lg bg-slate-100 group-hover:bg-indigo-600 group-hover:text-white dark:bg-white/5 text-[11px] font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1 transition">
                            <span>Inspect</span>
                            <ChevronRight className="w-3 h-3" />
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )
          )}
        </div>

        {/* ========================================================================= */}
        {/* 5. MODAL FOOTER                                                           */}
        {/* ========================================================================= */}
        <div className="px-6 py-3.5 bg-slate-50/90 dark:bg-white/[0.02] border-t border-slate-200/80 dark:border-white/10 flex items-center justify-between text-xs font-mono text-slate-500 shrink-0">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-500" />
            <span>Cryptographically Verified Continuous Assessment Telemetry</span>
          </div>

          <button
            type="button"
            onClick={handleClose}
            className="px-4 py-1.5 rounded-xl border border-slate-200 dark:border-white/10 hover:bg-slate-100 dark:hover:bg-white/5 text-slate-700 dark:text-slate-300 font-sans font-semibold transition cursor-pointer"
          >
            Close
          </button>
        </div>

      </div>
    </div>
  );
};
