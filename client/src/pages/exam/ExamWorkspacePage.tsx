import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import confetti from 'canvas-confetti';
import { toast } from 'sonner';
import { api } from '../../api/client.js';
import { handleFallbackRequest } from '../../api/fallbackEngine.js';
import { CodeEditor } from '../../components/editor/CodeEditor.js';
import { StatementMarkdown } from '../../components/common/StatementMarkdown.js';
import { AiVivaModal } from '../../components/exam/AiVivaModal.js';
import { RaiseIssueModal } from '../../components/common/RaiseIssueModal.js';
import { ProctoringRadarDot } from '../../components/common/ProctoringRadarDot.js';
import { useAuth } from '../../context/AuthContext.js';
import { DraftSyncService, getDeviceLabel } from '../../services/draftSync.service.js';
import { FirestoreDataService } from '../../services/firestoreData.service.js';
import { RealtimeSyncService } from '../../services/realtimeSync.service.js';
import { getStudentPersonalizedQuestions } from '../../utils/testQuestionDistributor.js';
import { DEFAULT_HARIPRASAD_PRACTICAL_TEST } from '../../data/lab-assessment-questions.data.js';
import { ASSESSMENT_4_TEST, A4_COMBINED_QUESTIONS, getStudentAssessment4Pair } from '../../data/assessment4-questions.data.js';
import { AttendanceSyncService } from '../../services/attendanceSync.service.js';
import { findCohortStudent } from '../../data/c-programming-cohort.data.js';
import { auth } from '../../config/firebase.js';
import { Flag } from 'lucide-react';
import {
  Play,
  Send,
  Lock,
  ShieldAlert,
  ShieldCheck,
  Maximize2,
  Minimize2,
  Clock,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  ArrowLeft,
  ChevronRight,
  Terminal,
  Activity,
  Award,
  Layers,
  Cpu,
  Sparkles,
  ChevronDown,
  ChevronUp,
  Loader2,
  Cloud,
  RotateCcw,
} from 'lucide-react';
import { useAntiScreenshot } from '../../hooks/useAntiScreenshot.js';
import { ScreenSecurityShield } from '../../components/common/ScreenSecurityShield.js';

export const ExamWorkspacePage: React.FC = () => {
  const { assignmentId, problemId } = useParams<{ assignmentId: string; problemId: string }>();
  const navigate = useNavigate();
  const { user, isAdmin, isFaculty } = useAuth();

  // Staff bypass: ADMIN / FACULTY / INSTITUTIONAL_ADMIN are exempt from all proctor restrictions
  const isStaffUser = isAdmin || isFaculty ||
    user?.role === 'ADMIN' || user?.role === 'FACULTY' || user?.role === 'INSTITUTIONAL_ADMIN';

  // Attempt & Problem Data
  const [attemptId, setAttemptId] = useState<string | null>(null);
  const [variantId, setVariantId] = useState<string>('');
  const [problemData, setProblemData] = useState<any | null>(null);
  const [code, setCode] = useState<string>('');
  const [isLocked, setIsLocked] = useState<boolean>(false);
  const [academicScore, setAcademicScore] = useState<number | null>(null);
  const [elapsedSec, setElapsedSec] = useState<number>(0);
  const [startedAt, setStartedAt] = useState<Date | null>(null);
  const [activeViva, setActiveViva] = useState<{ vivaId: string; questionText: string; remainingSec?: number } | null>(null);
  const pendingNextActionRef = useRef<{ nextProblemId: string | null; isFinal: boolean } | null>(null);

  // Test Results
  const [testResults, setTestResults] = useState<any[]>([]);
  const [activeBottomTab, setActiveBottomTab] = useState<'cases' | 'output' | 'telemetry'>('cases');
  const [selectedCaseIdx, setSelectedCaseIdx] = useState<number>(0);
  const [isDrawerOpen, setIsDrawerOpen] = useState<boolean>(true);
  const [activeMobileTab, setActiveMobileTab] = useState<'statement' | 'editor'>('statement');
  const [isIssueModalOpen, setIsIssueModalOpen] = useState<boolean>(false);

  // Behavioral Integrity Tracking (Sections 20 - 28)
  const [isFullscreen, setIsFullscreen] = useState<boolean>(() => Boolean(typeof document !== 'undefined' && document.fullscreenElement));
  const hasEnteredFullscreenRef = useRef<boolean>(Boolean(typeof document !== 'undefined' && document.fullscreenElement));
  const cleanPrnForIntegrity = (user?.prn || '').toUpperCase().trim();
  const [tabSwitchCount, setTabSwitchCount] = useState<number>(() => {
    if (typeof window === 'undefined' || !cleanPrnForIntegrity) return 0;
    return Number(localStorage.getItem(`logicq_exam_tabs_${assignmentId}_${cleanPrnForIntegrity}`)) || 0;
  });
  const [focusLossCount, setFocusLossCount] = useState<number>(0);
  const [fullScreenExitCount, setFullScreenExitCount] = useState<number>(() => {
    if (typeof window === 'undefined' || !cleanPrnForIntegrity) return 0;
    return Number(localStorage.getItem(`logicq_exam_exits_${assignmentId}_${cleanPrnForIntegrity}`)) || 0;
  });
  const [copyPasteAttempts, setCopyPasteAttempts] = useState<number>(() => {
    if (typeof window === 'undefined' || !cleanPrnForIntegrity) return 0;
    return Number(localStorage.getItem(`logicq_exam_copypaste_${assignmentId}_${cleanPrnForIntegrity}`)) || 0;
  });
  const [cutAttempts, setCutAttempts] = useState<number>(0);
  const [contextMenuAttempts, setContextMenuAttempts] = useState<number>(0);
  const [totalKeystrokes, setTotalKeystrokes] = useState<number>(0);
  const [largestBurstChars, setLargestBurstChars] = useState<number>(0);
  const [activeSec, setActiveSec] = useState<number>(0);

  // Fetch test details to get full question sequence for auto-advancing
  const { data: assignmentData } = useQuery({
    queryKey: ['exam-assignment-questions', assignmentId],
    queryFn: async () => {
      const isA4 =
        assignmentId === 'test-assessment-4' ||
        assignmentId === 'assessment-4' ||
        assignmentId === ASSESSMENT_4_TEST.id;
      const isHariprasad =
        assignmentId === DEFAULT_HARIPRASAD_PRACTICAL_TEST.id ||
        assignmentId === 'test-continuous-arrays-search-sort';

      try {
        const cloudTests = await FirestoreDataService.getAssessmentTestsFromFirestore();
        const current = cloudTests.find((t: any) => t.id === assignmentId || t.testId === assignmentId);
        if (current && Array.isArray(current.questions) && current.questions.length > 0) {
          return {
            ...current,
            questionCount: isA4 || isHariprasad ? 2 : (Number(current.questionCount) || 2),
          };
        }
      } catch {}

      if (isA4) {
        return {
          ...ASSESSMENT_4_TEST,
          questions: A4_COMBINED_QUESTIONS,
          questionCount: 2,
        };
      }
      if (isHariprasad) {
        return {
          ...DEFAULT_HARIPRASAD_PRACTICAL_TEST,
          questionCount: 2,
        };
      }
      try {
        return await api.get(`/exam/assignment/${assignmentId}`);
      } catch {
        return null;
      }
    },
    enabled: Boolean(assignmentId),
    staleTime: 60000,
    refetchInterval: false,
  });

  const resolveExamStudentPrn = useCallback((): string => {
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
  }, [user]);

  const currentPrnClean = resolveExamStudentPrn();
  const incidentsLogRef = useRef<Array<{ timestamp: string; type: string; details: string; severity: 'INFO' | 'WARNING' | 'CRITICAL' }>>((() => {
    if (typeof window === 'undefined') return [];
    try {
      const stored = localStorage.getItem(`logicq_exam_incidents_${assignmentId}_${currentPrnClean}`) ||
                     localStorage.getItem(`logicq_exam_incidents_test-continuous-arrays-search-sort_${currentPrnClean}`);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {}
    return [];
  })());

  const [proctorIncidentsLog, setProctorIncidentsLog] = useState<Array<{ timestamp: string; type: string; details: string; severity: 'INFO' | 'WARNING' | 'CRITICAL' }>>(
    () => incidentsLogRef.current
  );

  const addProctorIncident = useCallback((type: string, details: string, severity: 'INFO' | 'WARNING' | 'CRITICAL' = 'WARNING') => {
    const item = {
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true }),
      type,
      details,
      severity,
    };
    const last = incidentsLogRef.current[0];
    if (last && last.type === type && last.details === details) {
      return;
    }
    incidentsLogRef.current = [item, ...incidentsLogRef.current].slice(0, 50);
    setProctorIncidentsLog([...incidentsLogRef.current]);
    try {
      if (currentPrnClean) {
        localStorage.setItem(`logicq_exam_incidents_${assignmentId}_${currentPrnClean}`, JSON.stringify(incidentsLogRef.current));
        localStorage.setItem(`logicq_exam_incidents_test-continuous-arrays-search-sort_${currentPrnClean}`, JSON.stringify(incidentsLogRef.current));
      }
    } catch {}
  }, [assignmentId, currentPrnClean]);

  // Log initial session start if not already recorded
  useEffect(() => {
    if (incidentsLogRef.current.length === 0) {
      const startItem = {
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true }),
        type: 'EXAM_STARTED',
        details: 'Proctored assessment session initiated in secure full-screen perimeter.',
        severity: 'INFO' as const,
      };
      incidentsLogRef.current = [startItem];
      setProctorIncidentsLog([startItem]);
      try {
        if (currentPrnClean) {
          localStorage.setItem(`logicq_exam_incidents_${assignmentId}_${currentPrnClean}`, JSON.stringify([startItem]));
        }
      } catch {}
    }
  }, [assignmentId, currentPrnClean]);

  const lastActivityRef = useRef<number>(Date.now());
  const focusLossStartRef = useRef<number | null>(null);
  const totalFocusLossMsRef = useRef<number>(0);
  const previousCodeLenRef = useRef<number>(0);
  const isExitingRef = useRef<boolean>(false);
  const currentExamAttemptRef = useRef<number>(1);
  const [currentExamAttempt, setCurrentExamAttempt] = useState<number>(1);

  // Strict 2-Violation Proctor Lock State (Hariprasad Sir Specification)
  const [isLockedByProctor, setIsLockedByProctor] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    const prn = currentPrnClean;
    const storedLock = (prn && (
      localStorage.getItem(`logicq_exam_locked_${assignmentId}_${prn}`) === 'true' ||
      localStorage.getItem(`logicq_exam_locked_test-continuous-arrays-search-sort_${prn}`) === 'true' ||
      localStorage.getItem(`logicq_exam_proctor_locked_${prn}`) === 'true'
    )) ||
      localStorage.getItem('logicq_exam_proctor_locked') === 'true' ||
      localStorage.getItem(`logicq_exam_locked_${assignmentId}`) === 'true' ||
      localStorage.getItem('logicq_exam_locked_test-continuous-arrays-search-sort') === 'true';
    const storedVio = Math.max(
      Number(localStorage.getItem(`logicq_exam_violations_${assignmentId}_${prn}`)) || 0,
      Number(localStorage.getItem(`logicq_exam_violations_test-continuous-arrays-search-sort_${prn}`)) || 0,
      Number(localStorage.getItem(`logicq_exam_violations_${assignmentId}`)) || 0,
      Number(localStorage.getItem('logicq_exam_violations_test-continuous-arrays-search-sort')) || 0
    );
    return storedLock || storedVio >= 2;
  });
  const [proctorLockReason, setProctorLockReason] = useState<string>(() => {
    if (typeof window === 'undefined') return 'Exceeded permissible proctoring limit (2 violations).';
    const prn = currentPrnClean;
    return (prn && localStorage.getItem(`logicq_exam_proctor_lock_reason_${prn}`)) ||
           localStorage.getItem('logicq_exam_proctor_lock_reason') ||
           'Exceeded permissible proctoring limit (2 violations).';
  });
  const totalViolationsRef = useRef<number>((() => {
    if (typeof window === 'undefined') return 0;
    const prn = currentPrnClean;
    const v = Math.max(
      Number(localStorage.getItem(`logicq_exam_violations_${assignmentId}_${prn}`)) || 0,
      Number(localStorage.getItem(`logicq_exam_violations_test-continuous-arrays-search-sort_${prn}`)) || 0,
      Number(localStorage.getItem(`logicq_exam_violations_${assignmentId}`)) || 0,
      Number(localStorage.getItem('logicq_exam_violations_test-continuous-arrays-search-sort')) || 0
    );
    if (!isNaN(v) && v > 0) return v;
    const t = Number(localStorage.getItem(`logicq_exam_tabs_${assignmentId}_${prn}`)) || 0;
    const e = Number(localStorage.getItem(`logicq_exam_exits_${assignmentId}_${prn}`)) || 0;
    return t + e;
  })());

  // Strict Unified Proctoring Breach & Auto-Submit Handler (Hariprasad Sir Specification)
  // Max 1 warning permissible; on 2nd violation test is immediately locked and auto-submitted with actual written code evaluated
  const triggerProctorBreach = useCallback(async (
    breachType: 'TAB_SWITCH' | 'FULLSCREEN_EXIT' | 'COPY_PASTE',
    breachMessage: string
  ) => {
    if (isStaffUser || isLocked || isLockedByProctor || isExitingRef.current) return;

    const prn = currentPrnClean || '2126PMIM1039';
    totalViolationsRef.current += 1;
    const currentTotal = totalViolationsRef.current;
    const allPrnVariants = Array.from(new Set([prn, currentPrnClean, (user?.prn || '').toUpperCase().trim(), '2126PMIM1039', '1039'].filter(Boolean)));
    try {
      for (const p of allPrnVariants) {
        localStorage.setItem(`logicq_exam_violations_${assignmentId}_${p}`, String(currentTotal));
        localStorage.setItem(`logicq_exam_violations_test-continuous-arrays-search-sort_${p}`, String(currentTotal));
      }
      localStorage.setItem(`logicq_exam_violations_${assignmentId}`, String(currentTotal));
      localStorage.setItem('logicq_exam_violations_test-continuous-arrays-search-sort', String(currentTotal));
      if (breachType === 'TAB_SWITCH') {
        localStorage.setItem(`logicq_exam_tabs_${assignmentId}_${prn}`, String(tabSwitchCount + 1));
      } else if (breachType === 'FULLSCREEN_EXIT') {
        localStorage.setItem(`logicq_exam_exits_${assignmentId}_${prn}`, String(fullScreenExitCount + 1));
      } else if (breachType === 'COPY_PASTE') {
        localStorage.setItem(`logicq_exam_copypaste_${assignmentId}_${prn}`, String(copyPasteAttempts + 1));
      }
    } catch {}
    addProctorIncident(breachType, breachMessage, currentTotal >= 2 ? 'CRITICAL' : 'WARNING');

    // VIOLATION #1: ONLY PERMISSIBLE WARNING
    if (currentTotal === 1) {
      toast.error('⚠️ Proctoring Warning (1/2): Violation Detected!', {
        description: `${breachMessage} You have only 1 permissible warning. A 2nd violation (tab switch, fullscreen exit, or copy-paste) will IMMEDIATELY lock and auto-submit your assessment!`,
        duration: 9000,
      });
      return;
    }

    // VIOLATION #2: STRICT AUTO-LOCK & AUTO-SUBMIT (Faculty review required to reopen)
    if (currentTotal >= 2) {
      setIsLocked(true);
      setIsLockedByProctor(true);
      setProctorLockReason(`Permissible violation limit reached (2/2). Triggered by: ${breachMessage}`);

      const targetUser = (user as any)?.uid || (user as any)?.id || auth.currentUser?.uid || prn || 'current';
      const breachDetails = `${breachType}: ${breachMessage} (Tabs: ${tabSwitchCount + (breachType === 'TAB_SWITCH' ? 1 : 0)}, Exits: ${fullScreenExitCount + (breachType === 'FULLSCREEN_EXIT' ? 1 : 0)}, Copy: ${copyPasteAttempts + (breachType === 'COPY_PASTE' ? 1 : 0)})`;

      try {
        for (const p of allPrnVariants) {
          localStorage.removeItem(`logicq_exam_unlocked_${assignmentId}_${p}`);
          localStorage.removeItem(`logicq_exam_unlocked_test-continuous-arrays-search-sort_${p}`);
          localStorage.removeItem(`logicq_exam_unlocked_test-assessment-4_${p}`);
          localStorage.removeItem(`logicq_exam_unlocked_assessment-4_${p}`);
          localStorage.removeItem(`logicq_exam_unlocked_${p}`);
          localStorage.setItem(`logicq_exam_locked_${assignmentId}_${p}`, 'true');
          localStorage.setItem(`logicq_exam_locked_test-continuous-arrays-search-sort_${p}`, 'true');
          localStorage.setItem(`logicq_exam_locked_test-assessment-4_${p}`, 'true');
          localStorage.setItem(`logicq_exam_locked_assessment-4_${p}`, 'true');
          localStorage.setItem(`logicq_exam_proctor_locked_${p}`, 'true');
          localStorage.setItem(`logicq_exam_proctor_lock_reason_${p}`, breachDetails);
          localStorage.setItem(`logicq_exam_student_submitted_${assignmentId}_${p}`, 'true');
          localStorage.setItem(`logicq_exam_student_submitted_test-continuous-arrays-search-sort_${p}`, 'true');
        }
        localStorage.removeItem('logicq_exam_unlocked_test-continuous-arrays-search-sort');
        localStorage.setItem(`logicq_exam_locked_${assignmentId}`, 'true');
        localStorage.setItem('logicq_exam_locked_test-continuous-arrays-search-sort', 'true');
        localStorage.setItem('logicq_exam_locked_test-assessment-4', 'true');
        localStorage.setItem('logicq_exam_proctor_locked', 'true');
        localStorage.setItem('logicq_exam_proctor_lock_reason', breachDetails);
        localStorage.setItem(`logicq_exam_test_completed_${assignmentId}`, 'true');
        localStorage.setItem('logicq_exam_test_completed_test-continuous-arrays-search-sort', 'true');
      } catch {}

      // Authoritative Cloud Mesh Broadcast of Student Proctor Lockout
      for (const p of allPrnVariants) {
        AttendanceSyncService.recordStudentProctorLockout(p, breachDetails, assignmentId).catch(() => {});
        FirestoreDataService.recordStudentProctorLockout(p, breachDetails, assignmentId).catch(() => {});
      }

      // Evaluate the student's current code against test cases (pass hone pe marks, fail hone pe 0 marks)
      const cleanCode = (code || '').trim();
      const cleanStarter = (problemData?.starterCode || '').trim();
      const normCode = cleanCode.replace(/\s+/g, ' ');
      const normStarter = cleanStarter.replace(/\s+/g, ' ');
      const hasValidCode = Boolean(
        cleanCode &&
        (!normStarter || normCode !== normStarter) &&
        cleanCode.length >= 25 &&
        (cleanCode.includes('main(') || cleanCode.includes('main ('))
      );

      const maxMarks = Number(problemData?.maxMarks ?? problemData?.marks ?? 5.0);
      let earnedScore = 0;
      let verdict = 'LOCKED_BY_PROCTOR';
      let evaluatedOutcomes: any[] = [];

      if (hasValidCode) {
        try {
          let res: any = null;
          try {
            res = await api.post('/exam/submit-question', {
              attemptId,
              code: cleanCode,
              problemId,
              assignmentId,
              attemptNumber: 1,
              isLate: false,
            });
          } catch {
            res = await handleFallbackRequest('/exam/submit-question', {
              method: 'POST',
              body: JSON.stringify({ attemptId, code: cleanCode, problemId, assignmentId }),
            } as any);
          }
          if (res?.verdict === 'ACCEPTED') {
            earnedScore = Number(res?.academicScore ?? maxMarks);
            verdict = 'ACCEPTED_WITH_BREACH';
          } else {
            verdict = res?.verdict || 'WRONG_ANSWER';
            earnedScore = 0;
          }
          evaluatedOutcomes = res?.testOutcomes || res?.data?.testOutcomes || [];
        } catch {
          earnedScore = 0;
          verdict = 'COMPILATION_ERROR';
        }
      } else {
        earnedScore = 0;
        verdict = cleanCode ? 'COMPILATION_ERROR' : 'NOT_SUBMITTED';
      }

      setAcademicScore(earnedScore);
      if (evaluatedOutcomes.length > 0) {
        setTestResults(evaluatedOutcomes);
        setActiveBottomTab('output');
        setIsDrawerOpen(true);
      }

      // Auto-submit current code as locked submission in Firestore & broadcast to Admin Console
      const subPayload = {
        testId: assignmentData?.id || assignmentId || 'UNIT',
        assignmentId: assignmentId || 'UNIT',
        testTitle: assignmentData?.title || 'Continuous Practical Assessment',
        userId: targetUser,
        studentName: user?.fullName || user?.displayName || 'Student',
        studentPrn: prn,
        studentEmail: user?.email || '',
        problemId: problemId || 'exam-q1',
        problemTitle: problemData?.title || 'Assessment Question',
        problemSlug: problemId || 'exam-q1',
        difficulty: problemData?.difficulty || 'EASY',
        timeTakenSeconds: elapsedSec || 60,
        code: cleanCode || '// Editor empty at proctoring lockout',
        verdict,
        academicScore: earnedScore,
        score: earnedScore,
        marksAwarded: earnedScore,
        maxMarks,
        status: 'CRITICAL_BREACH',
        isCheatAttempt: true,
        tabSwitchCount: tabSwitchCount + (breachType === 'TAB_SWITCH' ? 1 : 0),
        copyPasteAttempts: copyPasteAttempts + (breachType === 'COPY_PASTE' ? 1 : 0),
        fullscreenExits: fullScreenExitCount + (breachType === 'FULLSCREEN_EXIT' ? 1 : 0),
        totalKeystrokes,
        largestBurstChars,
        cpm: Math.min(450, Math.max(0, Math.round(((totalKeystrokes || cleanCode.length) / Math.max(5, elapsedSec || activeSec || 60)) * 60))),
        typingVelocityCPM: Math.min(450, Math.max(0, Math.round(((totalKeystrokes || cleanCode.length) / Math.max(5, elapsedSec || activeSec || 60)) * 60))),
        incidents: [
          ...incidentsLogRef.current,
          {
            type: breachType,
            details: `CRITICAL 2ND BREACH: ${breachMessage}. Test auto-submitted & locked. Code evaluated: ${earnedScore}/${maxMarks} M.`,
            severity: 'CRITICAL',
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true }),
          }
        ],
      };

      FirestoreDataService.recordAssessmentSubmission(subPayload).catch(() => {});
      FirestoreDataService.recordDailySubmission(targetUser, subPayload).catch(() => {});
      AttendanceSyncService.broadcastStudentSubmission(subPayload).catch(() => {});
      RealtimeSyncService.emit('SUBMISSIONS');
      RealtimeSyncService.emit('TESTS');
      RealtimeSyncService.emit('DASHBOARD');

      if (typeof document !== 'undefined' && document.fullscreenElement) {
        document.exitFullscreen().catch(() => {});
      }

      toast.error('🚫 Assessment Locked!', {
        description: `You reached 2 proctoring violations. Your code has been auto-submitted and evaluated (${earnedScore}/${maxMarks} Marks). Locked awaiting faculty review.`,
        duration: 8000,
      });

      // Immediate safe auto-exit from exam workspace to student tests list
      setTimeout(() => {
        isExitingRef.current = true;
        navigate('/student/tests');
      }, 1500);
    }
  }, [isStaffUser, isLocked, isLockedByProctor, assignmentId, user, problemId, problemData, assignmentData, code, attemptId, tabSwitchCount, copyPasteAttempts, fullScreenExitCount, totalKeystrokes, largestBurstChars, proctorIncidentsLog, addProctorIncident]);
  useEffect(() => {
    if (!assignmentId || !user?.prn) return;
    const cleanPrn = user.prn.toUpperCase().trim();
    const checkUnlockStatus = async () => {
      const isUnlocked = await FirestoreDataService.isStudentTestUnlockedByFaculty(assignmentId, cleanPrn);
      if (isUnlocked && isLockedByProctor) {
        setIsLocked(false);
        setIsLockedByProctor(false);
        totalViolationsRef.current = 0;
        setTabSwitchCount(0);
        setFullScreenExitCount(0);
        setCopyPasteAttempts(0);
        try {
          localStorage.removeItem(`logicq_exam_locked_${assignmentId}_${cleanPrn}`);
        } catch {}
        toast.success('🎉 Test Unlocked by Faculty! You may resume coding.', { duration: 6000 });
      }
    };
    checkUnlockStatus();
    const interval = setInterval(checkUnlockStatus, 3500);
    return () => clearInterval(interval);
  }, [assignmentId, user?.prn, isLockedByProctor]);

  // In-Lab Attendance Verification State
  const canonicalTestId = (assignmentId || DEFAULT_HARIPRASAD_PRACTICAL_TEST.id).replace(/^assign-/, '');
  const currentStudentPrn = currentPrnClean;

  const [isAttendanceVerified, setIsAttendanceVerified] = useState<boolean>(true); // Default unlocked so legitimate students are never locked out

  useEffect(() => {
    if (isStaffUser) return;
    const cleanPrn = currentStudentPrn || resolveExamStudentPrn();
    if (!cleanPrn) return;

    const checkAttendance = () => {
      // Authoritative cloud check via KeyVal registry
      AttendanceSyncService.syncStudentAttendancePresence(cleanPrn)
        .then((isPres) => {
          if (assignmentData?.requireAttendance) {
            setIsAttendanceVerified(isPres !== false);
          } else {
            setIsAttendanceVerified(true);
          }
        })
        .catch(() => setIsAttendanceVerified(true));
    };

    checkAttendance();

    const unsubAttendance = AttendanceSyncService.listenToStudentAttendance(
      canonicalTestId,
      cleanPrn,
      (isPres) => {
        if (assignmentData?.requireAttendance) {
          setIsAttendanceVerified(isPres !== false);
        } else {
          setIsAttendanceVerified(true);
        }
      }
    );

    const pollInterval = setInterval(checkAttendance, 15000);

    return () => {
      unsubAttendance();
      clearInterval(pollInterval);
    };
  }, [canonicalTestId, currentStudentPrn, user?.prn, user?.email, isStaffUser, assignmentData?.requireAttendance]);

  // Anti-Screenshot & Screen Capture Shield (Exam Proctoring Layer — disabled for staff)
  const isMobileDevice = typeof window !== 'undefined' && (window.innerWidth < 1024 || 'ontouchstart' in window);
  const { isBlurred, setIsBlurred } = useAntiScreenshot({
    enabled: !isLocked && !isStaffUser,
    blackoutOnBlur: !isStaffUser && !isMobileDevice,
    wipeClipboard: !isStaffUser,
    blockPrint: !isStaffUser,
    onScreenshotAttempt: (reason) => {
      if (!isStaffUser) {
        addProctorIncident('SCREENSHOT_ATTEMPT', `Screenshot attempt intercepted: ${reason}`, 'CRITICAL');
      }
    },
  });

  // Helper to safely exit proctored exam and immediately restore normal browser screen
  const exitExamTo = useCallback((targetPath: string = '/student/tests') => {
    isExitingRef.current = true;
    if (typeof document !== 'undefined' && document.fullscreenElement) {
      document.exitFullscreen().catch(() => {});
    }
    navigate(targetPath);
  }, [navigate]);

  // Guaranteed unmount cleanup: Automatically exit fullscreen whenever leaving exam workspace
  useEffect(() => {
    return () => {
      isExitingRef.current = true;
      if (typeof document !== 'undefined' && document.fullscreenElement) {
        document.exitFullscreen().catch(() => {});
      }
    };
  }, []);

  // Live listener to check if test was completed/concluded by admin in real-time
  const [isTestConcludedByAdmin, setIsTestConcludedByAdmin] = useState<boolean>(false);
  const [isTestUpcoming, setIsTestUpcoming] = useState<boolean>(false);

  const cleanPrnForLock = (currentStudentPrn || resolveExamStudentPrn() || user?.prn || '').toUpperCase().trim();
  const [isExamSubmissionUnlocked, setIsExamSubmissionUnlocked] = useState(false);
  const testAliasesForCompletion = Array.from(new Set([
    assignmentId,
    canonicalTestId,
    'test-assessment-4',
    'assessment-4',
    'test-continuous-arrays-search-sort'
  ].filter(Boolean) as string[]));

  const isTestAlreadyCompleted = !isStaffUser && !isExamSubmissionUnlocked && typeof window !== 'undefined' && Boolean(
    testAliasesForCompletion.some(alias => (
      localStorage.getItem(`logicq_exam_test_completed_${alias}`) === 'true' ||
      (cleanPrnForLock && (
        localStorage.getItem(`logicq_exam_student_submitted_${alias}_${cleanPrnForLock}`) === 'true' ||
        localStorage.getItem(`logicq_exam_student_submitted_prn_${cleanPrnForLock}`) === 'true'
      ))
    ))
  );

  useEffect(() => {
    if (cleanPrnForLock) {
      // Check if student submission status was explicitly reset by faculty (without wiping proctor locks of an ongoing exam)
      AttendanceSyncService.checkAndSyncStudentSubmissionStatus(cleanPrnForLock, canonicalTestId)
        .then((isStillSub) => {
          if (!isStillSub) {
            setIsExamSubmissionUnlocked(true);
            setIsLockedByProctor(false);
            setIsLocked(false);
            try {
              if (typeof window !== 'undefined') {
                for (let i = localStorage.length - 1; i >= 0; i--) {
                  const k = localStorage.key(i);
                  if (k && (
                    k.includes(cleanPrnForLock) && (
                      k.startsWith('logicq_exam_locked_') ||
                      k.startsWith('logicq_exam_q_completed_') ||
                      k.startsWith('logicq_code_sub_') ||
                      k.startsWith('logicq_exam_draft_')
                    )
                  )) {
                    localStorage.removeItem(k);
                  }
                }
              }
            } catch {}
          }
        })
        .catch(() => null);

      // Real-time SSE listener for instant faculty unlock
      let ntfySource: EventSource | null = null;
      try {
        ntfySource = new EventSource('https://ntfy.sh/logicq-live-eval-stream-v2/sse');
        ntfySource.onmessage = (event) => {
          try {
            const payload = JSON.parse(event.data);
            if ((payload?.type === 'STUDENT_TEST_RESET' || payload?.type === 'BULK_STUDENT_RESET_FRESH_TEST') && (
              (payload?.prn || '').toUpperCase() === cleanPrnForLock ||
              (Array.isArray(payload?.prns) && payload.prns.includes(cleanPrnForLock))
            )) {
              setIsExamSubmissionUnlocked(true);
              setIsLockedByProctor(false);
              setIsLocked(false);
              totalViolationsRef.current = 0;
              try {
                for (let i = localStorage.length - 1; i >= 0; i--) {
                  const k = localStorage.key(i);
                  if (k && (k.includes(cleanPrnForLock) || k.includes('logicq_exam_'))) {
                    if (k.includes(cleanPrnForLock) || (assignmentId && k.includes(assignmentId))) {
                      localStorage.removeItem(k);
                    }
                  }
                }
              } catch {}
              toast.success('🔄 Test reset by faculty! Restarting fresh...', { duration: 3000 });
              setTimeout(() => {
                window.location.reload();
              }, 1200);
              return;
            }

            if (payload?.type === 'STUDENT_UNLOCKED_BY_FACULTY' && (payload?.prn || '').toUpperCase() === cleanPrnForLock) {
              setIsExamSubmissionUnlocked(true);
              setIsLockedByProctor(false);
              setIsLocked(false);
              totalViolationsRef.current = 0;
              try {
                localStorage.removeItem(`logicq_exam_locked_${assignmentId}_${cleanPrnForLock}`);
                localStorage.removeItem(`logicq_exam_locked_test-continuous-arrays-search-sort_${cleanPrnForLock}`);
                localStorage.removeItem(`logicq_exam_student_submitted_${assignmentId}_${cleanPrnForLock}`);
                localStorage.removeItem(`logicq_exam_student_submitted_test-continuous-arrays-search-sort_${cleanPrnForLock}`);
                localStorage.removeItem(`logicq_exam_proctor_lock_reason_${cleanPrnForLock}`);
                localStorage.setItem(`logicq_exam_unlocked_test-continuous-arrays-search-sort_${cleanPrnForLock}`, 'true');
              } catch {}
              toast.success('🔓 Exam Unlocked by Faculty! You may continue your assessment.');
            }
          } catch {}
        };
      } catch {}

      return () => {
        if (ntfySource) ntfySource.close();
      };
    }
  }, [cleanPrnForLock, canonicalTestId, assignmentId]);

  useEffect(() => {
    if (!assignmentId) return;
    const unsub = FirestoreDataService.listenToAssessmentTests((cloudTests) => {
      const current = cloudTests.find((t: any) => t.id === assignmentId || t.testId === assignmentId);
      if (current) {
        if (current.status === 'COMPLETED' || current.status === 'CONCLUDED') {
          setIsTestConcludedByAdmin(true);
        } else if (current.status === 'UPCOMING' || current.status === 'SCHEDULED') {
          setIsTestUpcoming(true);
        } else {
          setIsTestUpcoming(false);
          setIsTestConcludedByAdmin(false);
        }
      }
    });

    // Authoritative real-time Pub/Sub listener across all tabs and network
    const checkInitial = async () => {
      const known = AttendanceSyncService.getKnownTestStatus(canonicalTestId);
      if (known === 'COMPLETED' || known === 'CONCLUDED') {
        setIsTestConcludedByAdmin(true);
      } else if (known === 'UPCOMING' || known === 'SCHEDULED') {
        setIsTestUpcoming(true);
      } else if (known === 'ACTIVE' || known === 'LIVE') {
        setIsTestUpcoming(false);
        setIsTestConcludedByAdmin(false);
      }
      const net = await AttendanceSyncService.fetchLatestNetworkStatus().catch(() => null);
      if (net === 'COMPLETED' || net === 'CONCLUDED') {
        setIsTestConcludedByAdmin(true);
      } else if (net === 'UPCOMING' || net === 'SCHEDULED') {
        setIsTestUpcoming(true);
      } else if (net === 'ACTIVE' || net === 'LIVE') {
        setIsTestUpcoming(false);
        setIsTestConcludedByAdmin(false);
      }
    };
    checkInitial();

    const unsubRealtime = AttendanceSyncService.listenToTestStatus((tid, status) => {
      const isTarget =
        tid === canonicalTestId ||
        tid === DEFAULT_HARIPRASAD_PRACTICAL_TEST.id ||
        tid === 'test-continuous-arrays-search-sort' ||
        String(tid).startsWith('test-hariprasad-lab-');
      if (isTarget) {
        if (status === 'COMPLETED' || status === 'CONCLUDED') {
          setIsTestConcludedByAdmin(true);
          setIsTestUpcoming(false);
          toast.error('🛑 Assessment Concluded by Faculty! Re-attempts are disabled.', { duration: 6000 });
        } else if (status === 'UPCOMING' || status === 'SCHEDULED') {
          setIsTestUpcoming(true);
          setIsTestConcludedByAdmin(false);
        } else if (status === 'ACTIVE' || status === 'LIVE') {
          setIsTestUpcoming(false);
          setIsTestConcludedByAdmin(false);
        }
      }
    });

    const pollInterval = setInterval(() => {
      AttendanceSyncService.fetchLatestNetworkStatus()
        .then((netStatus) => {
          if (netStatus === 'COMPLETED' || netStatus === 'CONCLUDED') {
            setIsTestConcludedByAdmin(true);
            setIsTestUpcoming(false);
          } else if (netStatus === 'UPCOMING' || netStatus === 'SCHEDULED') {
            setIsTestUpcoming(true);
            setIsTestConcludedByAdmin(false);
          } else if (netStatus === 'ACTIVE' || netStatus === 'LIVE') {
            setIsTestUpcoming(false);
            setIsTestConcludedByAdmin(false);
          }
        })
        .catch(() => null);
    }, 3000);

    return () => {
      unsub();
      unsubRealtime();
      clearInterval(pollInterval);
    };
  }, [assignmentId, canonicalTestId]);

  const isExamConcluded = isTestConcludedByAdmin || assignmentData?.status === 'COMPLETED' || assignmentData?.status === 'CONCLUDED';

  useEffect(() => {
    if (isExamConcluded || isTestUpcoming) {
      setIsLocked(true);
      if (typeof document !== 'undefined' && document.fullscreenElement) {
        document.exitFullscreen().catch(() => {});
      }
    }
  }, [isExamConcluded, isTestUpcoming]);

  // Total Assessment Duration & Shared Unified Countdown Timer
  const totalTestMinutes = Number(assignmentData?.durationMinutes) || 60;
  const totalTestDurationSec = totalTestMinutes * 60;
  const [remainingTestSec, setRemainingTestSec] = useState<number>(totalTestDurationSec);
  const testStartTimeRef = useRef<number>(Date.now());
  const isTimeExpiredRef = useRef<boolean>(false);

  const questionSequence: string[] = React.useMemo(() => {
    const isA4 =
      assignmentId === 'test-assessment-4' ||
      assignmentId === 'assessment-4' ||
      assignmentId === ASSESSMENT_4_TEST.id ||
      (assignmentData?.title && assignmentData.title.toLowerCase().includes('assessment 4')) ||
      (assignmentData?.title && assignmentData.title.toLowerCase().includes('arrays & searching'));

    const isHariprasad =
      assignmentId === DEFAULT_HARIPRASAD_PRACTICAL_TEST.id ||
      assignmentId === 'test-continuous-arrays-search-sort';

    const studentIdentifier = user?.prn || (user as any)?.rollNo || user?.id || user?.email || '1001';

    // 1. Direct deterministic pair for Assessment 4
    if (isA4 || (problemId && String(problemId).startsWith('a4-'))) {
      const pair = getStudentPersonalizedQuestions(
        A4_COMBINED_QUESTIONS,
        2,
        String(studentIdentifier)
      );
      if (pair && pair.length === 2) {
        const ids = pair.map((q: any) => q.id || q.problemId || q.slug).filter(Boolean);
        if (problemId && !ids.includes(problemId)) {
          return [problemId, ids[1] || ids[0]];
        }
        return ids;
      }
      const [q1, q2] = getStudentAssessment4Pair(String(studentIdentifier));
      const fallbackIds = [q1.id, q2.id];
      if (problemId && !fallbackIds.includes(problemId)) {
        return [problemId, fallbackIds[1] || fallbackIds[0]];
      }
      return fallbackIds;
    }

    // 2. Direct deterministic pair for Hariprasad Lab
    if (isHariprasad || (problemId && String(problemId).startsWith('lab-'))) {
      const pair = getStudentPersonalizedQuestions(
        DEFAULT_HARIPRASAD_PRACTICAL_TEST.questions,
        2,
        String(studentIdentifier)
      );
      if (pair && pair.length === 2) {
        const ids = pair.map((q: any) => q.id || q.problemId || q.slug).filter(Boolean);
        if (problemId && !ids.includes(problemId)) {
          return [problemId, ids[1] || ids[0]];
        }
        return ids;
      }
    }

    // 3. Pool from assignmentData
    if (assignmentData?.questions && Array.isArray(assignmentData.questions) && assignmentData.questions.length > 0) {
      const count = Number(assignmentData.questionCount) || 2;
      const personalized = getStudentPersonalizedQuestions(assignmentData.questions, count, String(studentIdentifier));
      const safePersonalized = Array.isArray(personalized) && personalized.length > 0 ? personalized : assignmentData.questions.slice(0, count);
      const mapped = safePersonalized.map((q: any) => {
        if (typeof q === 'string') return q;
        return q.problemId || q.id || q.problem?.id || q.problem?.slug || '';
      }).filter(Boolean);
      if (problemId && !mapped.includes(problemId)) {
        return [problemId, ...mapped.filter((id: string) => id !== problemId)].slice(0, 2);
      }
      return mapped;
    }

    // 4. Default 2 questions (never 4)
    return ['q-s1-01', 'q-s2-01'];
  }, [assignmentData, user, assignmentId, problemId]);

  const currentQuestionIndex = questionSequence.findIndex((qid) => qid === problemId);
  const nextProblemId = (currentQuestionIndex !== -1 && currentQuestionIndex + 1 < questionSequence.length)
    ? questionSequence[currentQuestionIndex + 1]
    : null;

  // Question-specific time limit (20 mins for Question 1, 40 mins for Question 2)
  const currentQuestionDurationMinutes =
    Number(problemData?.timeLimitMinutes) || (currentQuestionIndex === 0 ? 20 : 40);
  const currentQuestionDurationSec = currentQuestionDurationMinutes * 60;
  const [remainingQuestionSec, setRemainingQuestionSec] = useState<number>(currentQuestionDurationSec);
  const qStartTimeRef = useRef<number>(Date.now());
  const isQExpiredRef = useRef<boolean>(false);

  // Initialize and track active question start time & lock status
  useEffect(() => {
    if (!assignmentId || !problemId) return;
    const cleanPrn = (user?.prn || currentStudentPrn || resolveExamStudentPrn() || '').toUpperCase().trim();
    const qKey = cleanPrn
      ? `logicq_exam_q_start_ms_${assignmentId}_${problemId}_${cleanPrn}`
      : `logicq_exam_q_start_ms_${assignmentId}_${problemId}`;
    let saved = typeof window !== 'undefined' ? localStorage.getItem(qKey) : null;
    let startMs = saved ? Number(saved) : 0;
    if (!startMs || isNaN(startMs)) {
      startMs = Date.now();
      try { localStorage.setItem(qKey, String(startMs)); } catch {}
    }
    qStartTimeRef.current = startMs;
    isQExpiredRef.current = false;

    // Real wall-clock elapsed time
    const elapsedSecSoFar = Math.max(0, Math.floor((Date.now() - startMs) / 1000));
    const remaining = Math.max(0, currentQuestionDurationSec - elapsedSecSoFar);
    setRemainingQuestionSec(remaining);

    // Check if student was explicitly reset/unlocked by faculty
    const isExplicitlyUnlocked = typeof window !== 'undefined' && Boolean(
      cleanPrn && (
        localStorage.getItem(`logicq_exam_unlocked_${assignmentId}_${cleanPrn}`) === 'true' ||
        localStorage.getItem(`logicq_exam_unlocked_test-continuous-arrays-search-sort_${cleanPrn}`) === 'true' ||
        localStorage.getItem(`logicq_exam_unlocked_test-assessment-4_${cleanPrn}`) === 'true' ||
        localStorage.getItem(`logicq_exam_unlocked_assessment-4_${cleanPrn}`) === 'true'
      )
    );

    // Check if this specific question was already locked or completed
    const qLabel = currentQuestionIndex === 0 ? 'Q1' : 'Q2';
    const isThisQLocked = !isExplicitlyUnlocked && !isExamSubmissionUnlocked && typeof window !== 'undefined' && Boolean(
      cleanPrn
        ? (
            localStorage.getItem(`logicq_exam_q_completed_${assignmentId}_${qLabel}_${cleanPrn}`) === 'true' ||
            localStorage.getItem(`logicq_exam_q_completed_${assignmentId}_${problemId}_${cleanPrn}`) === 'true' ||
            localStorage.getItem(`logicq_exam_locked_q_${assignmentId}_${qLabel}_${cleanPrn}`) === 'true' ||
            localStorage.getItem(`logicq_exam_locked_q_${assignmentId}_${problemId}_${cleanPrn}`) === 'true' ||
            localStorage.getItem(`logicq_exam_locked_${assignmentId}_${problemId}_${cleanPrn}`) === 'true' ||
            localStorage.getItem(`logicq_exam_locked_test-continuous-arrays-search-sort_${problemId}_${cleanPrn}`) === 'true'
          )
        : (
            localStorage.getItem(`logicq_exam_locked_${assignmentId}_${problemId}`) === 'true' ||
            localStorage.getItem(`logicq_exam_locked_test-continuous-arrays-search-sort_${problemId}`) === 'true'
          )
    );

    if (isThisQLocked) {
      setIsLocked(true);
      // If student is on Question 1, and Question 1 is already finished/locked, auto-advance to Question 2!
      if (currentQuestionIndex === 0 && nextProblemId && !isLockedByProctor) {
        toast.info('Question 1 was already completed/locked. Advancing to Question 2...', { duration: 3000 });
        setTimeout(() => {
          navigate(`/exam/${assignmentId}/${nextProblemId}`, { replace: true });
        }, 300);
      }
    } else if (isExplicitlyUnlocked || isExamSubmissionUnlocked) {
      setIsLocked(false);
      setIsLockedByProctor(false);
    }
  }, [assignmentId, problemId, currentQuestionIndex, currentQuestionDurationSec, user?.prn, currentStudentPrn, nextProblemId, isLockedByProctor]);

  // Clean state reset when moving between questions (preserving locked state if question is completed/locked)
  useEffect(() => {
    setCode('');
    setTestResults([]);
    const cleanPrn = (user?.prn || currentStudentPrn || resolveExamStudentPrn() || '').toUpperCase().trim();
    const qLabel = currentQuestionIndex === 0 ? 'Q1' : 'Q2';
    const isExplicitlyUnlocked = typeof window !== 'undefined' && Boolean(
      cleanPrn && (
        localStorage.getItem(`logicq_exam_unlocked_${assignmentId}_${cleanPrn}`) === 'true' ||
        localStorage.getItem(`logicq_exam_unlocked_test-continuous-arrays-search-sort_${cleanPrn}`) === 'true' ||
        localStorage.getItem(`logicq_exam_unlocked_test-assessment-4_${cleanPrn}`) === 'true' ||
        localStorage.getItem(`logicq_exam_unlocked_assessment-4_${cleanPrn}`) === 'true'
      )
    );
    const isThisQLocked = !isExplicitlyUnlocked && !isExamSubmissionUnlocked && typeof window !== 'undefined' && Boolean(
      cleanPrn && (
        localStorage.getItem(`logicq_exam_q_completed_${assignmentId}_${qLabel}_${cleanPrn}`) === 'true' ||
        localStorage.getItem(`logicq_exam_q_completed_${assignmentId}_${problemId}_${cleanPrn}`) === 'true' ||
        localStorage.getItem(`logicq_exam_locked_q_${assignmentId}_${qLabel}_${cleanPrn}`) === 'true' ||
        localStorage.getItem(`logicq_exam_locked_q_${assignmentId}_${problemId}_${cleanPrn}`) === 'true' ||
        localStorage.getItem(`logicq_exam_locked_${assignmentId}_${problemId}_${cleanPrn}`) === 'true'
      )
    );
    setIsLocked((isThisQLocked || isLockedByProctor) && !isExplicitlyUnlocked && !isExamSubmissionUnlocked);
    setAcademicScore(null);
    setElapsedSec(0);
    setStartedAt(null);
  }, [assignmentId, problemId, currentQuestionIndex, isLockedByProctor]);

  // 1. Start or resume question attempt (Single authoritative query with zero race condition)
  const { data: startData, isLoading, error, refetch } = useQuery({
    queryKey: ['start-exam-question', assignmentId, problemId],
    initialData: () => {
      try {
        const local = handleFallbackRequest('/exam/start-question', {
          method: 'POST',
          body: JSON.stringify({ assignmentId, problemId }),
        } as any);
        return local;
      } catch {
        return undefined;
      }
    },
    queryFn: async () => {
      try {
        return await Promise.race([
          api.post('/exam/start-question', {
            assignmentId,
            problemId,
          }),
          new Promise<any>((_, reject) => setTimeout(() => reject(new Error('TIMEOUT')), 1500))
        ]);
      } catch (postErr: any) {
        const prnToCheck = (user?.prn || '').toUpperCase().trim();
        const isExplicitlyUnlocked = typeof window !== 'undefined' && Boolean(
          prnToCheck && (
            localStorage.getItem(`logicq_exam_unlocked_${assignmentId}_${prnToCheck}`) === 'true' ||
            localStorage.getItem(`logicq_exam_unlocked_test-continuous-arrays-search-sort_${prnToCheck}`) === 'true' ||
            localStorage.getItem(`logicq_exam_unlocked_test-assessment-4_${prnToCheck}`) === 'true' ||
            localStorage.getItem(`logicq_exam_unlocked_assessment-4_${prnToCheck}`) === 'true'
          )
        );
        if (postErr?.message?.includes('QUESTION_LOCKED') && !isExplicitlyUnlocked) {
          throw postErr;
        }
        return await handleFallbackRequest('/exam/start-question', {
          method: 'POST',
          body: JSON.stringify({ assignmentId, problemId }),
        } as any);
      }
    },
    enabled: Boolean(assignmentId && problemId),
    retry: false,
    refetchOnWindowFocus: false,
  });

  // Populate data when attempt query resolves
  useEffect(() => {
    if (!startData) return;
    const res: any = startData;
    setAttemptId(res.attemptId);
    setVariantId(res.questionVariantId);
    setProblemData(res.problem);

    // Draft resilience: restore in-progress exam code if student refreshed or browser crashed (skip if student was reset by faculty)
    const cleanStudentPrn = (user?.prn || currentStudentPrn || resolveExamStudentPrn() || '').toUpperCase().trim();
    const isStudentReset = typeof window !== 'undefined' && Boolean(
      localStorage.getItem(`logicq_exam_unlocked_test-continuous-arrays-search-sort_${cleanStudentPrn}`) === 'true' ||
      localStorage.getItem(`logicq_exam_unlocked_test-assessment-4_${cleanStudentPrn}`) === 'true' ||
      localStorage.getItem(`logicq_exam_unlocked_assessment-4_${cleanStudentPrn}`) === 'true' ||
      localStorage.getItem(`logicq_exam_unlocked_${assignmentId}_${cleanStudentPrn}`) === 'true'
    );
    setIsLocked(isStudentReset ? false : (res.isLocked || false));
    const qLabel = currentQuestionIndex === 0 ? 'Q1' : 'Q2';
    const draftKey = `logicq_exam_draft_${res.attemptId || (assignmentId + '_' + problemId)}`;
    const studentDraftKey = cleanStudentPrn ? `logicq_exam_draft_${assignmentId}_${problemId}_${cleanStudentPrn}` : null;
    const submittedCodeKey = cleanStudentPrn ? `logicq_exam_submitted_code_${assignmentId}_${qLabel}_${cleanStudentPrn}` : null;

    let savedDraft: string | null = null;
    if (typeof window !== 'undefined' && !isStudentReset) {
      savedDraft = (submittedCodeKey && localStorage.getItem(submittedCodeKey)) ||
        (studentDraftKey && localStorage.getItem(studentDraftKey)) ||
        localStorage.getItem(draftKey);
    }
    if (savedDraft) {
      setCode(savedDraft);
      previousCodeLenRef.current = savedDraft.length;
    } else if (res.problem?.starterCode && !code) {
      setCode(res.problem.starterCode);
      previousCodeLenRef.current = res.problem.starterCode.length;
    }
    if (res.startedAt) {
      setStartedAt(new Date(res.startedAt));
    }

    // Track attempt opening for Lab Internal test question: increments attempt on every open / reopen
    const studentId = user?.prn || (user as any)?.uid || (user as any)?.id || 'student';
    const examAttemptKey = `${assignmentId || 'UNIT'}_${problemId || 'q1'}`;
    const initialAttempt = FirestoreDataService.getLocalTopicAttempt(studentId, examAttemptKey);
    currentExamAttemptRef.current = initialAttempt || 1;
    setCurrentExamAttempt(initialAttempt || 1);

    FirestoreDataService.recordTopicAttemptOpen(studentId, examAttemptKey)
      .then((num) => {
        currentExamAttemptRef.current = num;
        setCurrentExamAttempt(num);
      })
      .catch(() => {});
  }, [startData, code, assignmentId, problemId, user]);

  useEffect(() => {
    if (error) {
      const err = error as any;
      if (err.message?.includes('QUESTION_LOCKED')) {
        setIsLocked(true);
        toast.info('This question was already completed and is locked under institutional policy.');
      } else {
        toast.error(err.message || 'Failed to initialize exam question.');
      }
    }
  }, [error]);

  // 2. Question Elapsed Timer (Section 5)
  useEffect(() => {
    if (isLocked) return;
    const interval = setInterval(() => {
      if (startedAt) {
        const secs = Math.max(0, Math.floor((Date.now() - startedAt.getTime()) / 1000));
        setElapsedSec(secs);
      }
      // Active interaction timer (counts if user touched editor in last 10s)
      if (Date.now() - lastActivityRef.current < 10000) {
        setActiveSec((prev) => prev + 1);
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [startedAt, isLocked]);

  // 2b. Total Assessment Test Countdown & Auto-Submit on Expiration
  useEffect(() => {
    if (!assignmentId) return;
    const cleanPrn = (user?.prn || currentStudentPrn || resolveExamStudentPrn() || '').toUpperCase().trim();
    const testStartKey = cleanPrn
      ? `logicq_exam_test_start_${assignmentId}_${cleanPrn}`
      : `logicq_exam_test_start_${assignmentId}`;
    let saved = typeof window !== 'undefined' ? localStorage.getItem(testStartKey) : null;
    let startMs = saved ? Number(saved) : 0;
    // Guard against ancient timestamps from earlier testing sessions: if older than duration, start fresh
    if (!startMs || isNaN(startMs) || (Date.now() - startMs > totalTestDurationSec * 1000)) {
      startMs = Date.now();
      try { localStorage.setItem(testStartKey, String(startMs)); } catch {}
    }
    testStartTimeRef.current = startMs;
  }, [assignmentId, totalTestDurationSec, user?.prn, currentStudentPrn]);

  // 2b. Auto-Submit & Test Evaluation Handler on Question or Assessment Timeout
  const autoSubmitAndEvaluateQuestion = useCallback(async (isQ1: boolean) => {
    setIsLocked(true);
    const cleanCode = (code || '').trim();
    const cleanStarter = (problemData?.starterCode || '').trim();
    const normCode = cleanCode.replace(/\s+/g, ' ');
    const normStarter = cleanStarter.replace(/\s+/g, ' ');
    const hasValidCode = Boolean(
      cleanCode &&
      (!normStarter || normCode !== normStarter) &&
      cleanCode.length >= 25 &&
      (cleanCode.includes('main(') || cleanCode.includes('main ('))
    );

    const maxMarks = Number(problemData?.maxMarks ?? problemData?.marks ?? 5.0);
    const uid = (user as any)?.uid || (user as any)?.id || auth.currentUser?.uid || 'current';
    const studentId = user?.prn || (user as any)?.uid || (user as any)?.id || 'student';
    const cleanPrn = user?.prn || (user as any)?.rollNo || studentId;
    const examAttemptKey = `${assignmentId || 'UNIT'}_${problemId || 'q1'}`;
    const currentAttemptNum = currentExamAttemptRef.current || FirestoreDataService.getLocalTopicAttempt(studentId, examAttemptKey);

    let earnedScore = 0;
    let verdict = 'TIME_LIMIT_EXCEEDED';
    let evaluatedOutcomes: any[] = [];

    // Permanent lock on this problem in local storage
    try {
      localStorage.setItem(`logicq_exam_locked_${assignmentId}_${problemId}`, 'true');
      localStorage.setItem(`logicq_exam_locked_test-continuous-arrays-search-sort_${problemId}`, 'true');
      localStorage.removeItem(`logicq_exam_draft_${attemptId || (assignmentId + '_' + problemId)}`);
    } catch {}

    if (hasValidCode && attemptId) {
      try {
        let res: any = null;
        try {
          res = await api.post('/exam/submit-question', {
            attemptId,
            code: cleanCode,
            problemId,
            assignmentId,
            attemptNumber: currentAttemptNum,
            isLate: false,
          });
        } catch {
          res = await handleFallbackRequest('/exam/submit-question', {
            method: 'POST',
            body: JSON.stringify({ attemptId, code: cleanCode, problemId, assignmentId }),
          } as any);
        }

        const subScore = Number(res?.academicScore ?? res?.data?.academicScore ?? 0);
        if (res?.verdict === 'ACCEPTED') {
          earnedScore = Number(res?.academicScore ?? maxMarks);
          verdict = 'ACCEPTED';
        } else if (subScore > 0 || res?.verdict === 'PARTIAL') {
          earnedScore = subScore;
          verdict = 'PARTIAL';
        } else {
          verdict = res?.verdict || 'WRONG_ANSWER';
          earnedScore = 0;
        }
        evaluatedOutcomes = res?.testOutcomes || res?.data?.testOutcomes || [];
      } catch (evalErr) {
        console.warn('Auto evaluation error on timeout:', evalErr);
        earnedScore = 0;
        verdict = 'COMPILATION_ERROR';
      }
    } else {
      earnedScore = 0;
      verdict = cleanCode ? 'COMPILATION_ERROR' : 'NOT_SUBMITTED';
    }

    setAcademicScore(earnedScore);
    if (evaluatedOutcomes.length > 0) {
      setTestResults(evaluatedOutcomes);
      setActiveBottomTab('output');
      setIsDrawerOpen(true);
    }

    const qMinutes = isQ1 ? 20 : 40;
    const subPayload = {
      testId: assignmentId || 'UNIT',
      assignmentId: assignmentId || 'UNIT',
      testTitle: assignmentData?.title || 'Continuous Practical Assessment',
      userId: uid,
      problemId: problemId || (isQ1 ? 'q1' : 'q2'),
      problemTitle: problemData?.title || (isQ1 ? 'Question 1: Arrays' : 'Question 2: Searching & Sorting'),
      problemSlug: problemId || (isQ1 ? 'q1' : 'q2'),
      difficulty: problemData?.difficulty || (isQ1 ? 'EASY' : 'MEDIUM'),
      code: cleanCode,
      questionIndex: isQ1 ? 0 : 1,
      qKey: isQ1 ? 'Q1' : 'Q2',
      verdict,
      academicScore: earnedScore,
      score: earnedScore,
      marksAwarded: earnedScore,
      maxMarks,
      testOutcomes: evaluatedOutcomes,
      passedCount: evaluatedOutcomes.filter((t: any) => t.passed).length,
      totalTestCases: evaluatedOutcomes.length,
      isLate: false,
      lateStatus: 'ON_TIME',
      // TIME_OVER flag — admin portal shows ⏰ badge on this student
      isTimeOver: true,
      timeOverReason: isQ1
        ? `Q1 (Arrays) timer expired after ${qMinutes} minutes. Code evaluated: ${earnedScore}/${maxMarks} Marks awarded.`
        : `Q2 (Search & Sort) timer expired after ${qMinutes} minutes. Code evaluated: ${earnedScore}/${maxMarks} Marks awarded. EXAM COMPLETE.`,
      allocatedDurationMinutes: qMinutes,
      timeLimitSeconds: qMinutes * 60,
      timeTakenSeconds: qMinutes * 60,
      submissionType: 'ASSESSMENT',
      prn: cleanPrn,
      studentPrn: cleanPrn,
      email: user?.email || '',
      studentEmail: user?.email || '',
      studentName: user?.fullName || user?.displayName || 'Student',
      tabSwitchCount,
      copyPasteAttempts,
      cutAttempts,
      contextMenuAttempts,
      fullscreenExits: fullScreenExitCount,
      totalKeystrokes,
      largestBurstChars,
      cpm: Math.min(450, Math.max(0, Math.round(((totalKeystrokes || (code?.length || 0)) / Math.max(5, activeSec || 1)) * 60))),
      typingVelocityCPM: Math.min(450, Math.max(0, Math.round(((totalKeystrokes || (code?.length || 0)) / Math.max(5, activeSec || 1)) * 60))),
      incidents: incidentsLogRef.current,
    };

    FirestoreDataService.recordAssessmentSubmission(subPayload).catch(() => {});
    FirestoreDataService.recordDailySubmission(uid, subPayload).catch(() => {});
    AttendanceSyncService.broadcastStudentSubmission(subPayload).catch(() => {});
    RealtimeSyncService.emit('SUBMISSIONS');
    RealtimeSyncService.emit('TESTS');
    RealtimeSyncService.emit('DASHBOARD');

    const targetPrn = (cleanPrn || user?.prn || '').toUpperCase().trim();
    if (isQ1) {
      if (targetPrn) {
        try {
          localStorage.setItem(`logicq_exam_q_completed_${assignmentId}_Q1_${targetPrn}`, 'true');
          localStorage.setItem(`logicq_exam_q_completed_${assignmentId}_${problemId}_${targetPrn}`, 'true');
          localStorage.setItem(`logicq_exam_locked_q_${assignmentId}_Q1_${targetPrn}`, 'true');
          localStorage.setItem(`logicq_exam_locked_q_${assignmentId}_${problemId}_${targetPrn}`, 'true');
          localStorage.setItem(`logicq_exam_locked_${assignmentId}_${problemId}_${targetPrn}`, 'true');
          localStorage.setItem(`logicq_exam_submitted_code_${assignmentId}_Q1_${targetPrn}`, cleanCode);
          localStorage.setItem(`logicq_code_sub_${targetPrn}_Q1`, cleanCode);
          localStorage.setItem(`logicq_exam_q_score_${assignmentId}_Q1_${targetPrn}`, String(earnedScore));
          localStorage.setItem(`logicq_exam_in_progress_${assignmentId}_${targetPrn}`, 'true');
          localStorage.setItem(`logicq_exam_student_sub_${assignmentId}_${targetPrn}_Q1`, `${targetPrn}:${earnedScore}:${fullScreenExitCount}:${tabSwitchCount}:${20 * 60}:${copyPasteAttempts}:${totalKeystrokes}:${largestBurstChars}:0`);
        } catch {}
      }

      if (earnedScore > 0) {
        toast.success(`🎉 Question 1 Time Up (20 Mins)! Test cases passed: ${earnedScore}/${maxMarks} Marks awarded. Moving to Question 2 (40 Mins)...`, { duration: 5000 });
      } else {
        toast.error(`⏰ Question 1 Time Up (20 Mins)! Incomplete / Failed test cases: 0/${maxMarks} Marks. Moving to Question 2 (40 Mins)...`, { duration: 5000 });
      }

      if (nextProblemId) {
        setTimeout(() => {
          navigate(`/exam/${assignmentId}/${nextProblemId}`);
        }, 2200);
      }
    } else {
      // Question 2 (or Final Question) Timeout
      if (earnedScore > 0) {
        toast.success(`🎉 Question 2 Time Up (40 Mins)! Test cases passed: ${earnedScore}/${maxMarks} Marks awarded. Examination Complete!`, { duration: 5000 });
      } else {
        toast.error(`⏰ Question 2 Time Up (40 Mins)! 0/${maxMarks} Marks awarded. Examination Complete!`, { duration: 5000 });
      }

      // Mark the entire test completed permanently & locked from re-attempts
      try {
        const testAliases = Array.from(new Set([
          assignmentId,
          'test-assessment-4',
          'assessment-4',
          'test-continuous-arrays-search-sort'
        ].filter(Boolean) as string[]));

        testAliases.forEach(alias => {
          localStorage.setItem(`logicq_exam_test_completed_${alias}`, 'true');
          if (cleanPrn) {
            localStorage.setItem(`logicq_exam_student_submitted_${alias}_${cleanPrn}`, 'true');
            localStorage.setItem(`logicq_exam_student_submitted_prn_${cleanPrn}`, 'true');
            localStorage.removeItem(`logicq_exam_unlocked_${alias}_${cleanPrn}`);
            localStorage.removeItem(`logicq_exam_in_progress_${alias}_${cleanPrn}`);
          }
          localStorage.removeItem(`logicq_exam_unlocked_${alias}`);
          localStorage.removeItem(`logicq_exam_in_progress_${alias}`);
        });

        if (cleanPrn) {
          localStorage.setItem(`logicq_exam_q_completed_${assignmentId}_Q2_${cleanPrn}`, 'true');
          localStorage.setItem(`logicq_exam_q_completed_${assignmentId}_${problemId}_${cleanPrn}`, 'true');
          localStorage.setItem(`logicq_exam_locked_q_${assignmentId}_Q2_${cleanPrn}`, 'true');
          localStorage.setItem(`logicq_exam_locked_q_${assignmentId}_${problemId}_${cleanPrn}`, 'true');
          localStorage.setItem(`logicq_exam_locked_${assignmentId}_${problemId}_${cleanPrn}`, 'true');
          localStorage.setItem(`logicq_exam_submitted_code_${assignmentId}_Q2_${cleanPrn}`, cleanCode);
          localStorage.setItem(`logicq_code_sub_${cleanPrn}_Q2`, cleanCode);
          localStorage.setItem(`logicq_exam_q_score_${assignmentId}_Q2_${cleanPrn}`, String(earnedScore));
          localStorage.setItem(`logicq_exam_student_sub_${assignmentId}_${cleanPrn}_Q2`, `${cleanPrn}:${earnedScore}:${fullScreenExitCount}:${tabSwitchCount}:${40 * 60}:${copyPasteAttempts}:${totalKeystrokes}:${largestBurstChars}:0`);
        }
      } catch {}

      RealtimeSyncService.emit('TESTS');
      RealtimeSyncService.emit('DASHBOARD');

      isExitingRef.current = true;
      if (typeof document !== 'undefined' && document.fullscreenElement) {
        document.exitFullscreen().catch(() => {});
      }

      setTimeout(() => {
        navigate('/student/tests');
      }, 2500);
    }
  }, [code, problemData, attemptId, problemId, assignmentId, user, nextProblemId, tabSwitchCount, copyPasteAttempts, cutAttempts, contextMenuAttempts, fullScreenExitCount, totalKeystrokes, largestBurstChars, proctorIncidentsLog, navigate]);

  // Unified Countdown Timer Loop (Active Question 20m/40m + Overall Assessment 60m)
  useEffect(() => {
    const checkCountdown = () => {
      // 1. Total Assessment Remaining
      const totalElapsed = Math.max(0, Math.floor((Date.now() - testStartTimeRef.current) / 1000));
      const remainingTotal = Math.max(0, totalTestDurationSec - totalElapsed);
      setRemainingTestSec(remainingTotal);

      // 2. Active Question Remaining
      const qElapsed = Math.max(0, Math.floor((Date.now() - qStartTimeRef.current) / 1000));
      const remainingQ = Math.max(0, currentQuestionDurationSec - qElapsed);
      setRemainingQuestionSec(remainingQ);

      // Auto-submit condition for active question or total test expiration
      const isTotalExpired = remainingTotal <= 0;
      const isQuestionExpired = remainingQ <= 0 || isTotalExpired;
      if (isQuestionExpired && !isQExpiredRef.current && !isLocked) {
        isQExpiredRef.current = true;
        // If total test duration expired (remainingTotal <= 0), it must conclude the whole exam!
        const isOnlyQ1Expired = !isTotalExpired && currentQuestionIndex === 0;
        autoSubmitAndEvaluateQuestion(isOnlyQ1Expired);
      }
    };

    checkCountdown();
    const interval = setInterval(checkCountdown, 1000);
    return () => clearInterval(interval);
  }, [totalTestDurationSec, currentQuestionDurationSec, isLocked, autoSubmitAndEvaluateQuestion, currentQuestionIndex]);

  // 3. Silent Non-blocking Telemetry Heartbeat (Phase 3 Deliverable)
  const sendTelemetryPing = useCallback((overrideMetrics?: Record<string, any>) => {
    if (!attemptId || isLocked) return;

    // If attemptId is generated from client fallback engine, do not ping Postgres backend (it only exists locally/in Firestore)
    if (!String(attemptId).startsWith('att_') && !String(attemptId).startsWith('fallback-')) {
      api.post('/exam/telemetry', {
        attemptId,
        clientMetrics: {
          copyPasteAttempts,
          cutAttempts,
          contextMenuAttempts,
          tabSwitchCount,
          focusLossCount,
          totalFocusLossDurationMs: totalFocusLossMsRef.current,
          fullScreenExitCount,
          totalKeystrokes,
          largestBurstChars,
          cpm: Math.min(450, Math.max(0, Math.round(((totalKeystrokes || (code?.length || 0)) / Math.max(5, activeSec || elapsedSec || 60)) * 60))),
          typingVelocityCPM: Math.min(450, Math.max(0, Math.round(((totalKeystrokes || (code?.length || 0)) / Math.max(5, activeSec || elapsedSec || 60)) * 60))),
          activeInteractionTimeSec: activeSec,
          ...overrideMetrics,
        },
      }).catch(() => {
        // Asynchronous non-blocking: silently ignore network errors so student is never interrupted
      });
    }

    // Cloud Firestore Live Telemetry Stream for Admin Integrity Tab
    const targetId = (user as any)?.uid || (user as any)?.id || auth.currentUser?.uid || user?.prn || 'current';
    FirestoreDataService.recordStudentLiveTelemetry(targetId, {
      prn: user?.prn,
      studentName: user?.fullName || user?.displayName || 'Student',
      studentEmail: user?.email,
      testId: assignmentId,
      testTitle: assignmentData?.title || 'Continuous Practical Assessment',
      problemId,
      problemTitle: problemData?.title || 'Assessment Question',
      tabSwitchCount: overrideMetrics?.tabSwitchCount ?? tabSwitchCount,
      copyPasteAttempts: overrideMetrics?.copyPasteAttempts ?? copyPasteAttempts,
      fullScreenExitCount: overrideMetrics?.fullScreenExitCount ?? fullScreenExitCount,
      totalKeystrokes,
      largestBurstChars,
      cpm: Math.min(450, Math.max(0, Math.round(((totalKeystrokes || (code?.length || 0)) / Math.max(5, activeSec || 1)) * 60))),
      typingVelocityCPM: Math.min(450, Math.max(0, Math.round(((totalKeystrokes || (code?.length || 0)) / Math.max(5, activeSec || 1)) * 60))),
      activeSec,
      status: (overrideMetrics?.copyPasteAttempts ?? copyPasteAttempts) > 3 || (overrideMetrics?.tabSwitchCount ?? tabSwitchCount) > 3 ? 'CRITICAL_BREACH' : ((overrideMetrics?.tabSwitchCount ?? tabSwitchCount) > 0 || (overrideMetrics?.copyPasteAttempts ?? copyPasteAttempts) > 0 ? 'NEEDS_REVIEW' : 'CLEAN'),
    }).catch(() => {});
  }, [
    attemptId,
    isLocked,
    copyPasteAttempts,
    cutAttempts,
    contextMenuAttempts,
    tabSwitchCount,
    focusLossCount,
    fullScreenExitCount,
    totalKeystrokes,
    largestBurstChars,
    activeSec,
    user,
    assignmentId,
    assignmentData,
    problemId,
    problemData,
  ]);

  // Periodic Telemetry Sync every 15 seconds for instantaneous admin visibility
  useEffect(() => {
    if (!attemptId || isLocked) return;
    sendTelemetryPing();
    const interval = setInterval(() => {
      sendTelemetryPing();
    }, 15000);
    return () => clearInterval(interval);
  }, [attemptId, isLocked, sendTelemetryPing]);

  // Auto fullscreen attempt on mount (skipped for staff users)
  useEffect(() => {
    if (isStaffUser) return; // Staff don't need fullscreen enforcement
    if (!isLocked && typeof document !== 'undefined' && !document.fullscreenElement) {
      document.documentElement.requestFullscreen().then(() => {
        setIsFullscreen(true);
        hasEnteredFullscreenRef.current = true;
      }).catch(() => {
        // Browser requires explicit user gesture; modal will handle it
      });
    }
  }, [isLocked]);

  // 4. Fullscreen & Focus Proctoring Event Listeners (Hariprasad Sir 2-Violation Rule)
  useEffect(() => {
    const handleFullscreenChange = () => {
      const active = Boolean(document.fullscreenElement);
      setIsFullscreen(active);

      if (active) {
        hasEnteredFullscreenRef.current = true;
      } else if (!active && hasEnteredFullscreenRef.current && !isLocked && !isExitingRef.current && !isStaffUser) {
        setFullScreenExitCount((c) => c + 1);
        sendTelemetryPing({ fullScreenExitCount: fullScreenExitCount + 1 });
        triggerProctorBreach('FULLSCREEN_EXIT', 'Fullscreen perimeter exited or minimized.');
      }
    };

    const handleVisibilityChange = () => {
      if (isStaffUser) return; // Staff exempt from tab-switch tracking
      if (document.hidden && !isLocked) {
        setTabSwitchCount((c) => c + 1);
        sendTelemetryPing({ tabSwitchCount: tabSwitchCount + 1 });
        triggerProctorBreach('TAB_SWITCH', 'Exam window was hidden / student switched tabs.');
        focusLossStartRef.current = Date.now();
      } else if (!document.hidden && focusLossStartRef.current) {
        const duration = Date.now() - focusLossStartRef.current;
        totalFocusLossMsRef.current += duration;
        focusLossStartRef.current = null;
        sendTelemetryPing({ totalFocusLossDurationMs: totalFocusLossMsRef.current });
      }
    };

    const handleWindowBlur = () => {
      const activeEl = typeof document !== 'undefined' ? document.activeElement : null;
      const isInputActive = Boolean(
        activeEl && (
          activeEl.tagName === 'INPUT' ||
          activeEl.tagName === 'TEXTAREA' ||
          activeEl.classList?.contains('inputarea') ||
          activeEl.closest?.('.monaco-editor') ||
          activeEl.closest?.('.monaco-mouse-cursor-text')
        )
      );
      if (isInputActive) return;

      const isMobile = typeof window !== 'undefined' && (window.innerWidth < 1024 || 'ontouchstart' in window);
      if (isMobile && typeof document !== 'undefined' && !document.hidden) return;

      if (!isLocked) {
        setFocusLossCount((c) => {
          const next = c + 1;
          sendTelemetryPing({ focusLossCount: next });
          return next;
        });
      }
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('blur', handleWindowBlur);

    // Global Capture-phase clipboard & keyboard guards (intercepts Ctrl+V, Right-Click Paste, Browser Edit->Paste everywhere)
    const handleGlobalPaste = (e: ClipboardEvent) => {
      if (isStaffUser || isLocked) return;
      e.preventDefault();
      e.stopPropagation();
      handleEditorBlockedAction('paste');
    };

    const handleGlobalCopy = (e: ClipboardEvent) => {
      if (isStaffUser || isLocked) return;
      e.preventDefault();
      e.stopPropagation();
      handleEditorBlockedAction('copy');
    };

    const handleGlobalCut = (e: ClipboardEvent) => {
      if (isStaffUser || isLocked) return;
      e.preventDefault();
      e.stopPropagation();
      handleEditorBlockedAction('cut');
    };

    const handleGlobalContextMenu = (e: MouseEvent) => {
      if (isStaffUser || isLocked) return;
      e.preventDefault();
      handleEditorBlockedAction('contextmenu');
    };

    window.addEventListener('paste', handleGlobalPaste, true);
    window.addEventListener('copy', handleGlobalCopy, true);
    window.addEventListener('cut', handleGlobalCut, true);
    window.addEventListener('contextmenu', handleGlobalContextMenu, true);
    document.addEventListener('paste', handleGlobalPaste, true);
    document.addEventListener('copy', handleGlobalCopy, true);
    document.addEventListener('cut', handleGlobalCut, true);

    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('blur', handleWindowBlur);
      window.removeEventListener('paste', handleGlobalPaste, true);
      window.removeEventListener('copy', handleGlobalCopy, true);
      window.removeEventListener('cut', handleGlobalCut, true);
      window.removeEventListener('contextmenu', handleGlobalContextMenu, true);
      document.removeEventListener('paste', handleGlobalPaste, true);
      document.removeEventListener('copy', handleGlobalCopy, true);
      document.removeEventListener('cut', handleGlobalCut, true);
    };
  }, [isLocked, sendTelemetryPing, isStaffUser, fullScreenExitCount, tabSwitchCount, triggerProctorBreach]);

  const toggleFullscreen = async () => {
    try {
      if (!document.fullscreenElement) {
        await document.documentElement.requestFullscreen();
        setIsFullscreen(true);
        hasEnteredFullscreenRef.current = true;
      } else {
        await document.exitFullscreen();
      }
    } catch {
      toast.error('Unable to activate fullscreen. Please click the button to allow fullscreen.');
    }
  };

  // 4. Anti-Copying Clipboard Guards (Section 20)
  const handleEditorBlockedAction = (actionName: string) => {
    if (isLocked || isStaffUser) return;
    const targetUser = (user as any)?.uid || (user as any)?.id || auth.currentUser?.uid || user?.prn || 'current';
    if (actionName === 'copy' || actionName === 'paste') {
      setCopyPasteAttempts((c) => {
        const next = c + 1;
        FirestoreDataService.recordStudentLiveTelemetry(targetUser, {
          prn: user?.prn,
          studentName: user?.fullName || user?.displayName || 'Student',
          studentEmail: user?.email,
          testId: assignmentId,
          testTitle: assignmentData?.title || 'Continuous Practical Assessment',
          problemId,
          problemTitle: problemData?.title || 'Assessment Question',
          tabSwitchCount,
          copyPasteAttempts: next,
          fullScreenExitCount,
          totalKeystrokes,
          largestBurstChars,
          cpm: Math.min(450, Math.max(0, Math.round(((totalKeystrokes || (code?.length || 0)) / Math.max(5, activeSec || elapsedSec || 60)) * 60))),
          typingVelocityCPM: Math.min(450, Math.max(0, Math.round(((totalKeystrokes || (code?.length || 0)) / Math.max(5, activeSec || elapsedSec || 60)) * 60))),
          activeSec,
          status: 'NEEDS_REVIEW',
          incident: {
            type: 'COPY_PASTE',
            details: `Proctoring guard blocked ${actionName.toUpperCase()} attempt in code editor.`,
            severity: 'WARNING',
          },
        }).catch(() => {});
        return next;
      });
      addProctorIncident('CLIPBOARD_BLOCKED', `Proctoring guard blocked ${actionName.toUpperCase()} attempt in code editor.`, 'WARNING');
      triggerProctorBreach('COPY_PASTE', `Unauthorized ${actionName.toUpperCase()} attempt intercepted in editor.`);
    } else if (actionName === 'cut') {
      setCutAttempts((c) => c + 1);
      addProctorIncident('CLIPBOARD_BLOCKED', 'Proctoring guard blocked CUT attempt in code editor.', 'WARNING');
    } else if (actionName === 'contextmenu') {
      setContextMenuAttempts((c) => c + 1);
      addProctorIncident('CONTEXT_MENU', 'Right-click context menu blocked in code editor.', 'INFO');
    }
    toast.error(`Institutional Proctoring: ${actionName.toUpperCase()} is disabled during the assessment.`, {
      duration: 3000,
    });
  };

  // 5. Code Burst & Keystroke Telemetry (Sections 22 - 26)
  const handleCodeChange = (newCode: string) => {
    if (isLocked) return;
    lastActivityRef.current = Date.now();
    setTotalKeystrokes((k) => k + 1);

    const prevLen = previousCodeLenRef.current;
    const currentLen = newCode.length;
    const diff = currentLen - prevLen;

    if (diff > 0 && diff > largestBurstChars) {
      setLargestBurstChars(diff);
    }
    previousCodeLenRef.current = currentLen;
    setCode(newCode);

    // Save exam draft immediately to localStorage & IndexedDB/Firestore
    const cleanStudentPrn = (user?.prn || currentStudentPrn || resolveExamStudentPrn() || '').toUpperCase().trim();
    const draftKey = `logicq_exam_draft_${attemptId || (assignmentId + '_' + problemId)}`;
    const studentDraftKey = cleanStudentPrn ? `logicq_exam_draft_${assignmentId}_${problemId}_${cleanStudentPrn}` : null;
    try {
      localStorage.setItem(draftKey, newCode);
      if (studentDraftKey) localStorage.setItem(studentDraftKey, newCode);
    } catch {}
    if (user?.id && attemptId) {
      DraftSyncService.saveRemoteDraft(user.id, {
        problemSlug: `exam_${attemptId}`,
        code: newCode,
        updatedAt: Date.now(),
        deviceLabel: getDeviceLabel(),
      }, true).catch(() => {});
    }
  };

  // 6. Interactive Run Visible Tests (Section 6)
  const runMutation = useMutation({
    mutationFn: async () => {
      if (!attemptId) throw new Error('Attempt not initialized');
      
      const currentCode = (code || '').trim();
      const starterCode = (problemData?.starterCode || '').trim();
      const normCurrent = currentCode.replace(/\s+/g, ' ');
      const normStarter = starterCode.replace(/\s+/g, ' ');

      if (!currentCode || (normStarter && normCurrent === normStarter) || currentCode.length < 25) {
        throw new Error('Please write your C code logic in the editor before running test cases.');
      }

      try {
        return await api.post('/exam/run-code', {
          attemptId,
          code,
          problemId,
          assignmentId,
        });
      } catch {
        return await handleFallbackRequest('/exam/run-code', {
          method: 'POST',
          body: JSON.stringify({
            attemptId,
            code,
            problemId,
            assignmentId,
          }),
        } as any);
      }
    },
    onSuccess: (res) => {
      setTestResults(res.testResults || []);
      setActiveBottomTab('output');
      setIsDrawerOpen(true);
      const allPassed = res.testResults?.length > 0 && res.testResults.every((t: any) => t.passed);
      if (allPassed) {
        toast.success('All visible test cases passed! Review your code and click "Submit Solution" when ready.');
      } else {
        // Increment attempt counter on failed test execution
        const studentId = user?.prn || (user as any)?.uid || (user as any)?.id || 'student';
        const examAttemptKey = `${assignmentId || 'UNIT'}_${problemId || 'q1'}`;
        FirestoreDataService.recordTopicAttemptOpen(studentId, examAttemptKey)
          .then((num) => {
            currentExamAttemptRef.current = num;
            setCurrentExamAttempt(num);
          })
          .catch(() => {});
        toast.error('Test cases failed. Please review the output below and fix your code.');
      }
    },
    onError: (err: any) => {
      const studentId = user?.prn || (user as any)?.uid || (user as any)?.id || 'student';
      const examAttemptKey = `${assignmentId || 'UNIT'}_${problemId || 'q1'}`;
      FirestoreDataService.recordTopicAttemptOpen(studentId, examAttemptKey)
        .then((num) => {
          currentExamAttemptRef.current = num;
          setCurrentExamAttempt(num);
        })
        .catch(() => {});
      toast.error(err.message || 'Run execution failed.');
    },
  });

  // 7. Final Submission & Reattempt Lock (Sections 5 & 7)
  const submitMutation = useMutation({
    mutationFn: async () => {
      if (!attemptId) throw new Error('Attempt not initialized');

      const currentCode = (code || '').trim();
      const starterCode = (problemData?.starterCode || '').trim();
      const normCurrent = currentCode.replace(/\s+/g, ' ');
      const normStarter = starterCode.replace(/\s+/g, ' ');

      if (!currentCode || (normStarter && normCurrent === normStarter) || currentCode.length < 25) {
        throw new Error('Cannot submit empty solution. Please write your C solution code.');
      }

      const studentId = user?.prn || (user as any)?.uid || (user as any)?.id || 'student';
      const examAttemptKey = `${assignmentId || 'UNIT'}_${problemId || 'q1'}`;
      const currentAttemptNum = currentExamAttemptRef.current || FirestoreDataService.getLocalTopicAttempt(studentId, examAttemptKey);

      try {
        return await api.post('/exam/submit-question', {
          attemptId,
          code,
          problemId,
          assignmentId,
          attemptNumber: currentAttemptNum,
          clientMetrics: {
            copyPasteAttempts,
            cutAttempts,
            contextMenuAttempts,
            tabSwitchCount,
            focusLossCount,
            totalFocusLossDurationMs: totalFocusLossMsRef.current,
            fullScreenExitCount,
            totalKeystrokes,
            largestBurstChars,
            cpm: Math.min(450, Math.max(0, Math.round(((totalKeystrokes || (code?.length || 0)) / Math.max(5, activeSec || elapsedSec || 60)) * 60))),
            typingVelocityCPM: Math.min(450, Math.max(0, Math.round(((totalKeystrokes || (code?.length || 0)) / Math.max(5, activeSec || elapsedSec || 60)) * 60))),
            activeInteractionTimeSec: activeSec,
          },
        });
      } catch {
        return await handleFallbackRequest('/exam/submit-question', {
          method: 'POST',
          body: JSON.stringify({
            attemptId,
            code,
            problemId,
            assignmentId,
            attemptNumber: currentAttemptNum,
            clientMetrics: {
              copyPasteAttempts,
              cutAttempts,
              contextMenuAttempts,
              tabSwitchCount,
              focusLossCount,
              totalFocusLossDurationMs: totalFocusLossMsRef.current,
              fullScreenExitCount,
              totalKeystrokes,
              largestBurstChars,
              cpm: Math.min(450, Math.max(0, Math.round(((totalKeystrokes || (code?.length || 0)) / Math.max(5, activeSec || elapsedSec || 60)) * 60))),
              typingVelocityCPM: Math.min(450, Math.max(0, Math.round(((totalKeystrokes || (code?.length || 0)) / Math.max(5, activeSec || elapsedSec || 60)) * 60))),
            },
          }),
        } as any);
      }
    },
    onSuccess: (res) => {
      setTestResults(res.testOutcomes || []);
      setActiveBottomTab('output');
      setIsDrawerOpen(true);
      if (res.verdict === 'ACCEPTED' || res.verdict === 'PARTIAL') {
        setIsLocked(true);
        const draftKey = `logicq_exam_draft_${attemptId || (assignmentId + '_' + problemId)}`;
        try { localStorage.removeItem(draftKey); } catch {}

        // Compute overtime / late status based on Section 4 & 5 Time-Based Scoring
        // EASY = 10 min, MEDIUM = 20 min, HARD = 30 min
        const diffStr = String(problemData?.difficulty || 'EASY').toUpperCase();
        const expectedMinMinutes = diffStr === 'HARD' ? 15 : diffStr === 'MEDIUM' ? 8 : 2;
        const expectedMaxMinutes = diffStr === 'HARD' ? 30 : diffStr === 'MEDIUM' ? 20 : 10;
        const questionTimeLimitMinutes = Number(problemData?.timeLimitMinutes || expectedMaxMinutes);
        const questionTimeLimitSec = questionTimeLimitMinutes * 60;
        const elapsedTotalSec = Math.max(0, Math.floor((Date.now() - testStartTimeRef.current) / 1000));
        const isQuestionOvertime = questionTimeLimitSec > 0 && elapsedSec > questionTimeLimitSec;
        const isTotalTestOvertime = remainingTestSec <= 0 || (totalTestDurationSec > 0 && elapsedTotalSec > totalTestDurationSec);
        const isLate = isQuestionOvertime || isTotalTestOvertime || isTimeExpiredRef.current;

        // Section 5: Actual vs Expected Time Deviation
        const expectedRefTimeSec = Math.round(((expectedMinMinutes + expectedMaxMinutes) / 2) * 60);
        const timeDeviationSec = elapsedSec - expectedRefTimeSec;
        const deviationPercent = Number((((elapsedSec - expectedRefTimeSec) / Math.max(1, expectedRefTimeSec)) * 100).toFixed(1));

        const maxMarks = Number(problemData?.maxMarks ?? problemData?.marks ?? 5.0);
        const rawScore = Number(res.academicScore != null ? res.academicScore : maxMarks);
        const earnedScore = isLate ? Math.round((rawScore / 2) * 10) / 10 : rawScore;
        setAcademicScore(earnedScore);
        confetti({ particleCount: 80, spread: 70, origin: { y: 0.6 } });

        // Record submission in Firestore and broadcast to all faculty & admin dashboards
        const uid = (user as any)?.uid || (user as any)?.id || auth.currentUser?.uid || 'current';
        const studentId = user?.prn || (user as any)?.uid || (user as any)?.id || 'student';
        const examAttemptKey = `${assignmentId || 'UNIT'}_${problemId || 'q1'}`;
        const currentAttemptNum = currentExamAttemptRef.current || FirestoreDataService.getLocalTopicAttempt(studentId, examAttemptKey);

        const subPayload = {
          testId: assignmentId || 'UNIT',
          assignmentId: assignmentId || 'UNIT',
          testTitle: assignmentData?.title || 'UNIT',
          userId: uid,
          problemId: problemId || assignmentId || 'exam-q1',
          problemTitle: problemData?.title || 'Continuous Internal Evaluation Question',
          problemSlug: problemId || assignmentId || 'exam-q1',
          difficulty: problemData?.difficulty || 'MEDIUM',
          code,
          verdict: isLate ? 'LATE_ACCEPTED' : res.verdict,
          academicScore: earnedScore,
          score: earnedScore,
          marksAwarded: earnedScore,
          maxMarks,
          testOutcomes: res.testOutcomes || [],
          passedCount: (res.testOutcomes || []).filter((t: any) => t.passed).length,
          totalTestCases: (res.testOutcomes || []).length,
          isLate,
          lateStatus: isLate ? 'LATE' : 'ON_TIME',
          manualGradingRequired: isLate,
          allocatedDurationMinutes: questionTimeLimitMinutes || totalTestMinutes,
          timeLimitSeconds: questionTimeLimitSec || totalTestDurationSec,
          attemptNumber: currentAttemptNum,
          timeTakenSeconds: elapsedSec,
          expectedMinMinutes,
          expectedMaxMinutes,
          expectedRefTimeSeconds: expectedRefTimeSec,
          timeDeviationSeconds: timeDeviationSec,
          deviationPercent,
          submissionType: 'ASSESSMENT',
          questionIndex: currentQuestionIndex,
          qKey: currentQuestionIndex === 0 ? 'Q1' : 'Q2',
          prn: user?.prn || '',
          studentPrn: user?.prn || '',
          email: user?.email || '',
          studentEmail: user?.email || '',
          studentName: user?.fullName || user?.displayName || 'Student',
          tabSwitchCount,
          copyPasteAttempts,
          cutAttempts,
          contextMenuAttempts,
          fullscreenExits: fullScreenExitCount,
          totalKeystrokes,
          largestBurstChars,
          cpm: Math.min(450, Math.max(0, Math.round(((totalKeystrokes || (code?.length || 0)) / Math.max(5, activeSec || elapsedSec || 60)) * 60))),
          typingVelocityCPM: Math.min(450, Math.max(0, Math.round(((totalKeystrokes || (code?.length || 0)) / Math.max(5, activeSec || elapsedSec || 60)) * 60))),
          incidents: incidentsLogRef.current,
        };

        FirestoreDataService.recordAssessmentSubmission(subPayload).catch(() => {});
        FirestoreDataService.recordDailySubmission(uid, subPayload).catch(() => {});
        AttendanceSyncService.broadcastStudentSubmission(subPayload).catch(() => {});
        RealtimeSyncService.emit('SUBMISSIONS');
        RealtimeSyncService.emit('DASHBOARD');
        RealtimeSyncService.emit('TESTS');

        if (res.verdict === 'PARTIAL') {
          toast.success(`🎉 Solution Submitted with Partial Credit: ${earnedScore} / ${maxMarks} Marks awarded.`, { duration: 4000 });
        } else if (isLate) {
          toast.warning(`Submitted Outside Prescribed Time! Academic Score: ${earnedScore} / ${maxMarks} Mark awarded (Time Deviation: ${timeDeviationSec > 0 ? '+' : ''}${timeDeviationSec}s).`, {
            duration: 6000,
          });
        } else {
          toast.success(`🎉 Accepted! Correct & On-Time: ${earnedScore} / ${maxMarks} Marks awarded.`, {
            duration: 3500,
          });
        }

        // In Assessments / Tests: AI Viva is disabled (AI Viva is strictly for Lab Internal coursework)
        const isFinalQuestion = !nextProblemId;
        const hasViva = false;

        // Record completion flags if final question accepted
        if (isFinalQuestion) {
          const targetPrn = (user?.prn || currentStudentPrn || resolveExamStudentPrn() || '').toUpperCase().trim();
          const qLabel = currentQuestionIndex === 0 ? 'Q1' : 'Q2';
          try {
            const testAliases = Array.from(new Set([
              assignmentId,
              'test-assessment-4',
              'assessment-4',
              'test-continuous-arrays-search-sort'
            ].filter(Boolean) as string[]));

            testAliases.forEach(alias => {
              localStorage.setItem(`logicq_exam_test_completed_${alias}`, 'true');
              if (targetPrn) {
                localStorage.setItem(`logicq_exam_student_submitted_${alias}_${targetPrn}`, 'true');
                localStorage.setItem(`logicq_exam_student_submitted_prn_${targetPrn}`, 'true');
                localStorage.removeItem(`logicq_exam_unlocked_${alias}_${targetPrn}`);
                localStorage.removeItem(`logicq_exam_in_progress_${alias}_${targetPrn}`);
              }
              localStorage.removeItem(`logicq_exam_unlocked_${alias}`);
              localStorage.removeItem(`logicq_exam_in_progress_${alias}`);
            });

            if (targetPrn) {
              localStorage.setItem(`logicq_exam_q_completed_${assignmentId}_${qLabel}_${targetPrn}`, 'true');
              localStorage.setItem(`logicq_exam_q_completed_${assignmentId}_${problemId}_${targetPrn}`, 'true');
              localStorage.setItem(`logicq_exam_locked_q_${assignmentId}_${qLabel}_${targetPrn}`, 'true');
              localStorage.setItem(`logicq_exam_locked_q_${assignmentId}_${problemId}_${targetPrn}`, 'true');
              localStorage.setItem(`logicq_exam_locked_${assignmentId}_${problemId}_${targetPrn}`, 'true');
              localStorage.setItem(`logicq_exam_submitted_code_${assignmentId}_${qLabel}_${targetPrn}`, code);
              localStorage.setItem(`logicq_code_sub_${targetPrn}_${qLabel}`, code);
              localStorage.setItem(`logicq_exam_q_score_${assignmentId}_${qLabel}_${targetPrn}`, String(earnedScore));
              localStorage.setItem(`logicq_exam_student_sub_${assignmentId}_${targetPrn}_${qLabel}`, `${targetPrn}:${earnedScore}:${fullScreenExitCount}:${tabSwitchCount}:${elapsedSec}:${copyPasteAttempts}:${totalKeystrokes}:${largestBurstChars}:0`);
            }
          } catch {}

          RealtimeSyncService.emit('TESTS');
          RealtimeSyncService.emit('DASHBOARD');

          isExitingRef.current = true;
          if (typeof document !== 'undefined' && document.fullscreenElement) {
            document.exitFullscreen().catch(() => {});
          }
          toast.success('🎉 Assessment Completed! All questions evaluated and recorded.', { duration: 4000 });
          setTimeout(() => {
            navigate('/student/tests');
          }, 1500);
        } else {
          // Automatic Next Question Navigation (Question 1 -> Question 2) without AI Viva
          const targetPrn = (user?.prn || currentStudentPrn || resolveExamStudentPrn() || '').toUpperCase().trim();
          const qLabel = currentQuestionIndex === 0 ? 'Q1' : 'Q2';
          if (targetPrn) {
            try {
              localStorage.setItem(`logicq_exam_q_completed_${assignmentId}_${qLabel}_${targetPrn}`, 'true');
              localStorage.setItem(`logicq_exam_q_completed_${assignmentId}_${problemId}_${targetPrn}`, 'true');
              localStorage.setItem(`logicq_exam_locked_q_${assignmentId}_${qLabel}_${targetPrn}`, 'true');
              localStorage.setItem(`logicq_exam_locked_q_${assignmentId}_${problemId}_${targetPrn}`, 'true');
              localStorage.setItem(`logicq_exam_locked_${assignmentId}_${problemId}_${targetPrn}`, 'true');
              localStorage.setItem(`logicq_exam_submitted_code_${assignmentId}_${qLabel}_${targetPrn}`, code);
              localStorage.setItem(`logicq_code_sub_${targetPrn}_${qLabel}`, code);
              localStorage.setItem(`logicq_exam_q_score_${assignmentId}_${qLabel}_${targetPrn}`, String(earnedScore));
              localStorage.setItem(`logicq_exam_student_sub_${assignmentId}_${targetPrn}_${qLabel}`, `${targetPrn}:${earnedScore}:${fullScreenExitCount}:${tabSwitchCount}:${elapsedSec}:${copyPasteAttempts}:${totalKeystrokes}:${largestBurstChars}:0`);
              localStorage.setItem(`logicq_exam_in_progress_${assignmentId}_${targetPrn}`, 'true');
            } catch {}
          }
          toast.success('🎉 Question 1 Accepted! Advancing to Question 2...', { duration: 3000 });
          setTimeout(() => {
            navigate(`/exam/${assignmentId}/${nextProblemId}`);
          }, 1200);
        }
      } else {
        const studentId = user?.prn || (user as any)?.uid || (user as any)?.id || 'student';
        const examAttemptKey = `${assignmentId || 'UNIT'}_${problemId || 'q1'}`;
        FirestoreDataService.recordTopicAttemptOpen(studentId, examAttemptKey)
          .then((num) => {
            currentExamAttemptRef.current = num;
            setCurrentExamAttempt(num);
          })
          .catch(() => {});

        const outcomes = res.testOutcomes || res.testResults || [];
        const failedCases = outcomes.filter((t: any) => !t.passed);
        if (res.verdict === 'COMPILATION_ERROR') {
          toast.error('Compilation Error in your C code! Please inspect the compiler output below.', {
            duration: 5000,
          });
        } else {
          toast.error(
            `Evaluation Failed: ${failedCases.length > 0 ? failedCases.length : 'Some'} test case(s) failed. Fix your code and run again.`,
            { duration: 5000 }
          );
        }
      }
    },
    onError: (err: any) => {
      setIsDrawerOpen(true);
      const studentId = user?.prn || (user as any)?.uid || (user as any)?.id || 'student';
      const examAttemptKey = `${assignmentId || 'UNIT'}_${problemId || 'q1'}`;
      FirestoreDataService.recordTopicAttemptOpen(studentId, examAttemptKey)
        .then((num) => {
          currentExamAttemptRef.current = num;
          setCurrentExamAttempt(num);
        })
        .catch(() => {});
      toast.error(err.message || 'Compilation or evaluation failed. Please fix your code and try again.');
    },
  });

  // Unified Compile & Run handler: Compiles code and verifies test cases.
  // If all pass -> Submits solution, awards marks, and auto-navigates to next question.
  // If tests fail / error -> Keeps student on current question and displays compiler/test error in drawer.
  const handleCompileAndRun = useCallback(() => {
    if (isExamConcluded) {
      toast.error('This examination has been marked completed by the administrator.');
      return;
    }
    if (isLocked || submitMutation.isPending || runMutation.isPending) return;

    const cleanCode = (code || '').trim();
    const cleanStarter = (problemData?.starterCode || '').trim();
    const normCode = cleanCode.replace(/\s+/g, ' ');
    const normStarter = cleanStarter.replace(/\s+/g, ' ');

    if (!cleanCode || (normStarter && normCode === normStarter) || cleanCode.length < 25) {
      toast.error('Please write your C solution logic before compiling!');
      return;
    }

    if (!cleanCode.includes('main(') && !cleanCode.includes('main (')) {
      toast.error("Compilation Error: Missing 'int main()' entrypoint in C code.");
      return;
    }

    setActiveMobileTab('editor');
    submitMutation.mutate();
  }, [isExamConcluded, isLocked, submitMutation, runMutation, code, problemData]);

  const handleExecuteTests = handleCompileAndRun;

  // Apple-grade Keyboard Shortcut: Ctrl + Enter or Cmd + Enter to Compile & Run
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        if (!isLocked && !submitMutation.isPending && !runMutation.isPending) {
          e.preventDefault();
          handleCompileAndRun();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isLocked, submitMutation, runMutation, handleCompileAndRun]);

  // Unified Total Countdown Timer formatting
  const formatCountdown = (totalSec: number) => {
    const h = Math.floor(totalSec / 3600);
    const m = Math.floor((totalSec % 3600) / 60);
    const s = totalSec % 60;
    const pad = (n: number) => (n < 10 ? `0${n}` : `${n}`);
    if (h > 0) {
      return `${h}:${pad(m)}:${pad(s)}`;
    }
    return `${pad(m)}:${pad(s)}`;
  };

  const visibleCasesList: any[] = React.useMemo(() => {
    if (!problemData) return [];
    if (Array.isArray(problemData.visibleTestCases) && problemData.visibleTestCases.length > 0) {
      return problemData.visibleTestCases.map((tc: any, i: number) => ({
        id: tc.id || `tc-${i + 1}`,
        input: tc.input || '',
        expectedOutput: tc.expectedOutput || tc.output || '',
        explanation: tc.explanation || '',
      }));
    }
    const cases: any[] = [];
    if (problemData.visibleTestCase1) {
      cases.push({
        id: 'tc1',
        input: problemData.visibleTestCase1.input || '',
        expectedOutput: problemData.visibleTestCase1.output || problemData.visibleTestCase1.expectedOutput || '',
        explanation: problemData.visibleTestCase1.explanation || '',
      });
    }
    if (problemData.visibleTestCase2 && (problemData.visibleTestCase2.input || problemData.visibleTestCase2.output)) {
      cases.push({
        id: 'tc2',
        input: problemData.visibleTestCase2.input || '',
        expectedOutput: problemData.visibleTestCase2.output || problemData.visibleTestCase2.expectedOutput || '',
        explanation: problemData.visibleTestCase2.explanation || '',
      });
    }
    if (cases.length > 0) return cases;
    if (Array.isArray(problemData.testCases)) {
      const filtered = problemData.testCases.filter((tc: any) => !tc.isHidden);
      if (filtered.length > 0) {
        return filtered.map((tc: any, i: number) => ({
          id: tc.id || `tc-${i + 1}`,
          input: tc.input || '',
          expectedOutput: tc.expectedOutput || tc.output || '',
          explanation: tc.explanation || '',
        }));
      }
    }
    return [
      { id: 'tc1', input: 'PKT 101 25.4', expectedOutput: 'CRC: 0x4A12', explanation: '' },
    ];
  }, [problemData]);

  const hasHiddenCase: boolean = React.useMemo(() => {
    if (!problemData) return true;
    if (problemData.hiddenTestCase) return true;
    if (Array.isArray(problemData.testCases)) {
      return problemData.testCases.some((tc: any) => tc.isHidden);
    }
    return true;
  }, [problemData]);

  return (
    <div className="fixed inset-0 z-40 w-full h-[100dvh] max-h-[100dvh] bg-slate-100 text-slate-900 flex flex-col overflow-hidden select-none font-sans">
      {/* Screen Security Blackout Shield - activates when window loses focus (Snipping Tool / screen recorder detected) */}
      <ScreenSecurityShield
        isVisible={isBlurred && !isLocked && !isStaffUser}
        onRestore={() => setIsBlurred(false)}
      />
      {/* 0. Fullscreen Proctored Requirement Modal (Blocks interaction until student enters fullscreen) */}
      {!isFullscreen && !isLocked && !isStaffUser && (
        <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-md w-full p-6 text-center space-y-5 animate-in fade-in zoom-in-95 duration-200">
            <div className="w-16 h-16 rounded-2xl bg-indigo-50 border border-indigo-100 text-indigo-600 flex items-center justify-center mx-auto shadow-sm">
              <Maximize2 className="w-8 h-8 animate-pulse" />
            </div>
            <div className="space-y-2">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-50 border border-indigo-200 text-indigo-700 text-xs font-mono font-bold">
                <ShieldAlert className="w-3.5 h-3.5" />
                <span>PROCTORED ASSESSMENT</span>
              </div>
              <h2 className="text-xl font-black text-slate-900">Full-Screen Mode Required</h2>
              <p className="text-xs text-slate-600 leading-relaxed">
                Institutional examination policy mandates full-screen mode. Any exit from full-screen or tab switch will be logged and will <strong>terminate your exam session immediately</strong>.
              </p>
            </div>
            <button
              type="button"
              onClick={toggleFullscreen}
              className="w-full py-3.5 px-6 rounded-2xl bg-gradient-to-r from-indigo-600 via-blue-600 to-indigo-700 hover:from-indigo-500 hover:to-blue-500 text-white font-bold font-mono text-sm shadow-lg shadow-indigo-600/25 transition-all transform active:scale-95 cursor-pointer flex items-center justify-center gap-2"
            >
              <Maximize2 className="w-4 h-4" />
              <span>Launch Fullscreen Exam →</span>
            </button>
            <div className="text-[11px] text-slate-400 font-mono">
              GCC 14 (C11) • Auto-Save Active • Real-Time Integrity
            </div>
          </div>
        </div>
      )}

      {/* Top Proctoring & Institutional Header Bar (Apple Minimal Clean Style) */}
      <header className="bg-white border-b border-slate-200 px-4 py-2.5 flex items-center justify-between text-xs font-mono text-slate-800 shadow-xs shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          {/* Exit Test button is ONLY enabled and visible after exam is completed, locked, or submitted */}
          {(isExamConcluded || isLocked || isLockedByProctor) && (
            <>
              <button
                type="button"
                onClick={() => exitExamTo('/student/tests')}
                className="flex items-center gap-1.5 text-slate-600 hover:text-slate-900 transition-colors shrink-0 font-medium cursor-pointer"
                title="Exit proctored test environment"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Exit Test</span>
              </button>
              <span className="text-slate-300">|</span>
            </>
          )}
          <div className="flex items-center gap-2 min-w-0">
            <span className="font-bold text-slate-900 truncate max-w-[200px] sm:max-w-md font-sans text-sm">
              {assignmentData?.title || 'Continuous Practical Assessment'}
            </span>
            <span className="px-2.5 py-0.5 rounded-full bg-indigo-50 border border-indigo-200/80 text-indigo-700 text-[11px] font-bold shrink-0">
              Question {currentQuestionIndex >= 0 ? currentQuestionIndex + 1 : 1} of {questionSequence.length || 1}
            </span>
          </div>
        </div>

        {/* Live Proctoring & Dual Countdown Timers (Active Question + Overall Test) */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          {/* Active Question-Specific Countdown Timer (Q1: 20m, Q2: 40m) */}
          <div
            className={`flex items-center gap-1.5 px-3 py-1 rounded-full border text-xs font-mono font-bold transition-all ${
              remainingQuestionSec <= 120
                ? 'bg-rose-50 border-rose-300 text-rose-700 animate-pulse shadow-sm shadow-rose-500/20'
                : remainingQuestionSec <= 300
                ? 'bg-amber-50 border-amber-300 text-amber-800'
                : 'bg-indigo-50 border-indigo-200 text-indigo-700'
            }`}
            title={`Active Question ${currentQuestionIndex + 1} Limit: ${currentQuestionDurationMinutes} mins. Auto-submits and evaluates when timer reaches 00:00.`}
          >
            <Clock className={`w-3.5 h-3.5 ${remainingQuestionSec <= 120 ? 'text-rose-600' : 'text-indigo-600'}`} />
            <span className="font-sans font-bold text-[11px] uppercase tracking-wider text-indigo-600">
              Q{currentQuestionIndex + 1}:
            </span>
            <span>{formatCountdown(remainingQuestionSec)}</span>
            <span className="hidden sm:inline text-[10px] text-slate-400 font-sans font-normal">
              / {currentQuestionDurationMinutes}m
            </span>
          </div>

          {/* Total Test Countdown Timer (Overall Assessment Window: 60m) */}
          <div
            className={`flex items-center gap-1.5 px-3 py-1 rounded-full border text-xs font-mono font-bold transition-all ${
              remainingTestSec <= 300
                ? 'bg-rose-50 border-rose-300 text-rose-700 animate-pulse shadow-sm shadow-rose-500/20'
                : remainingTestSec <= 600
                ? 'bg-amber-50 border-amber-300 text-amber-800'
                : 'bg-slate-50 border-slate-200 text-slate-700'
            }`}
            title={`Total Test Duration: ${totalTestMinutes} Minutes. Test will auto-submit when time expires.`}
          >
            <span className="hidden sm:inline font-sans text-[11px] text-slate-500 font-normal">Total:</span>
            <span>{formatCountdown(remainingTestSec)}</span>
          </div>

          {/* Proctored Live Radar Indicator */}
          <ProctoringRadarDot
            label="Proctored"
            status={proctorIncidentsLog.length > 0 ? 'warning' : 'active'}
          />

          {/* Subtle Issue Flag */}
          <button
            onClick={() => setIsIssueModalOpen(true)}
            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
            title="Flag question issue to mentor"
          >
            <Flag className="w-3.5 h-3.5" />
          </button>
        </div>
      </header>

      {/* Permanent Locked Banner */}
      {isLocked && (
        <div className={`border-b px-4 py-3 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs shrink-0 ${
          academicScore === 0
            ? 'bg-amber-50 border-amber-200 text-amber-900'
            : 'bg-emerald-50 border-emerald-200 text-emerald-800'
        }`}>
          <div className="flex items-center gap-2.5 font-mono">
            <Lock className={`w-4 h-4 flex-shrink-0 ${academicScore === 0 ? 'text-amber-600' : 'text-emerald-600'}`} />
            <span>
              <strong>QUESTION PERMANENTLY LOCKED:</strong> {academicScore === 0 ? 'Incomplete / 0 marks awarded.' : academicScore != null && academicScore < 5 ? `Partial marks awarded (${academicScore} / 5.0 Marks). Under examination policy, edits and resets are locked.` : `Your solution was accepted (${academicScore ?? 5.0} / 5.0 Marks awarded). Under examination policy, edits and resets are locked.`}
            </span>
          </div>
          <div className="flex items-center gap-2">
            {nextProblemId && (
              <Link
                to={`/exam/${assignmentId}/${nextProblemId}`}
                className="px-4 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold font-mono text-xs transition-colors whitespace-nowrap shadow-sm flex items-center gap-1.5"
              >
                <span>Next Question →</span>
              </Link>
            )}
            <button
              type="button"
              onClick={() => exitExamTo('/student/tests')}
              className="px-4 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold font-mono text-xs transition-colors whitespace-nowrap shadow-sm cursor-pointer"
            >
              Return to Tests Overview →
            </button>
          </div>
        </div>
      )}

      {/* Mobile Segmented Switcher (Statement | Editor & Results) */}
      <div className="lg:hidden flex items-center bg-white border-b border-slate-200 px-2 py-1.5 gap-1.5 shrink-0">
        <button
          type="button"
          onClick={() => setActiveMobileTab('statement')}
          className={`flex-1 py-1.5 text-xs font-mono rounded-lg transition-colors flex items-center justify-center gap-1.5 ${
            activeMobileTab === 'statement'
              ? 'bg-slate-100 text-indigo-600 font-bold border border-slate-200 shadow-sm'
              : 'text-slate-500'
          }`}
        >
          <span>Problem Statement</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveMobileTab('editor')}
          className={`flex-1 py-1.5 text-xs font-mono rounded-lg transition-colors flex items-center justify-center gap-1.5 ${
            activeMobileTab === 'editor'
              ? 'bg-slate-900 text-cyan-400 font-bold shadow-sm'
              : 'text-slate-500'
          }`}
        >
          <span>Editor &amp; Output</span>
        </button>
      </div>

      {/* Main Two-Pane Split Layout (LeetCode / HackerRank layout: Left Statement, Right Editor) */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden min-h-0">
        {/* Left Pane on desktop: Question Statement & Visible Test Cases (Clean Crisp White Theme) */}
        <div className={`w-full lg:w-[48%] flex flex-col border-b lg:border-b-0 lg:border-r border-slate-200 bg-white text-slate-800 overflow-y-auto lg:order-1 ${
          activeMobileTab === 'statement' ? 'flex-1' : 'hidden lg:flex'
        }`}>
          <div className="p-5 sm:p-7 space-y-6">
            {/* Title & Metadata (Apple Clean Style) */}
            <div className="space-y-2.5 pb-4 border-b border-slate-100">
              <div className="flex flex-wrap items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase tracking-wider bg-indigo-50 text-indigo-700 border border-indigo-200">
                  {problemData?.difficulty || 'EASY'}
                </span>
              </div>

              <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight font-sans">
                {problemData?.title || 'Continuous Practical Assessment'}
              </h1>
            </div>

            {problemData?.scenario && (
              <div className="bg-blue-50/70 border border-blue-200/80 rounded-2xl p-4 text-xs font-sans text-blue-950 leading-relaxed shadow-xs">
                <div className="text-[10px] text-blue-700 font-bold mb-1 uppercase tracking-wider font-mono">
                  Context &amp; Objective
                </div>
                {problemData.scenario}
              </div>
            )}

            {/* Problem Statement */}
            <div className="text-sm text-slate-800 leading-relaxed font-sans bg-slate-50/70 p-5 rounded-2xl border border-slate-200/80 shadow-xs">
              <StatementMarkdown
                content={problemData?.description || 'Implement the required algorithm conforming to the specifications.'}
                className="!text-slate-800 [&_*]:!text-slate-800 [&_code]:!text-indigo-700 [&_code]:!bg-white [&_code]:!border-slate-300 [&_pre]:!bg-slate-900 [&_pre]:!text-slate-100 [&_pre_*]:!text-slate-100"
              />
            </div>

            {/* Verified Test Cases Suite (1 Open + 1 Hidden) */}
            <div className="space-y-3 pt-1">
              <div className="flex items-center justify-between font-sans">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-900 uppercase tracking-wider">Test Cases</span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-slate-100 text-slate-700 border border-slate-200">
                    {visibleCasesList.length + (hasHiddenCase ? 1 : 0)} Cases
                  </span>
                </div>
                <span className="text-[11px] font-mono text-slate-400">
                  {visibleCasesList.length} Visible {hasHiddenCase ? '• 1 Hidden' : ''}
                </span>
              </div>

              <div className="space-y-3">
                {visibleCasesList.map((tc: any, idx: number) => (
                  <div
                    key={tc.id || idx}
                    className="p-4 rounded-2xl bg-slate-50/80 border border-slate-200/80 font-mono text-xs space-y-2.5 shadow-xs"
                  >
                    <div className="flex items-center justify-between text-slate-600">
                      <span className="font-bold text-slate-900 flex items-center gap-1.5 font-sans">
                        <span>Test Case #{idx + 1}</span>
                        <span className="text-[10px] text-slate-400 font-normal font-sans">(Sample Application)</span>
                      </span>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 font-bold font-mono">
                        OPEN
                      </span>
                    </div>

                    <div className="space-y-1">
                      <div className="text-[10px] uppercase font-bold text-slate-400 font-mono">Input:</div>
                      <pre className="p-2.5 rounded-xl bg-white border border-slate-200 text-slate-900 font-mono shadow-inner font-semibold overflow-x-auto">
                        {tc.input}
                      </pre>
                    </div>

                    <div className="space-y-1">
                      <div className="text-[10px] uppercase font-bold text-emerald-600 font-mono">Expected Output:</div>
                      <pre className="p-2.5 rounded-xl bg-emerald-50/60 border border-emerald-200 text-emerald-900 font-mono font-bold shadow-inner overflow-x-auto">
                        {tc.expectedOutput}
                      </pre>
                    </div>

                    {tc.explanation && (
                      <div className="text-[11px] text-slate-600 font-sans italic pt-1 border-t border-slate-200/60">
                        💡 <strong>Explanation:</strong> {tc.explanation}
                      </div>
                    )}
                  </div>
                ))}

                {/* Hidden Test Case Card (Lab Internal Style) */}
                {hasHiddenCase && (
                  <div className="p-4 rounded-2xl bg-amber-50/40 border border-amber-200/80 font-mono text-xs space-y-2 shadow-xs">
                    <div className="flex items-center justify-between text-amber-900">
                      <span className="font-bold flex items-center gap-1.5 font-sans">
                        <Lock className="w-3.5 h-3.5 text-amber-600" />
                        <span>Test Case #{visibleCasesList.length + 1}</span>
                        <span className="text-[10px] text-amber-700 font-normal font-sans">(Hidden Evaluation)</span>
                      </span>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-100/90 text-amber-800 border border-amber-300 font-bold flex items-center gap-1 font-mono">
                        <Lock className="w-2.5 h-2.5 text-amber-700" />
                        <span>HIDDEN</span>
                      </span>
                    </div>

                    <p className="text-[11px] font-sans text-amber-900/80 leading-relaxed pt-0.5">
                      Input and expected output are tested automatically upon clicking <strong>"Compile &amp; Run"</strong> to verify boundary cases and algorithmic logic.
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Subtle Minimal Footer Note */}
            <div className="pt-3 pb-1 text-[11px] text-slate-400 font-mono text-center border-t border-slate-100 flex items-center justify-center gap-2">
              <span>GCC 14 (C11)</span>
              <span>•</span>
              <span>Standard I/O (stdin/stdout)</span>
              <span>•</span>
              <span>Continuous Auto-Save</span>
            </div>
          </div>
        </div>

        {/* Right Pane on desktop: Code Editor & Execution Panel (Navy Blue Compiler) */}
        <div className={`w-full lg:w-[52%] flex flex-col bg-[#0a0f1d] lg:order-2 border-l border-slate-800 ${
          activeMobileTab === 'editor' ? 'flex-1' : 'hidden lg:flex'
        }`}>
          {/* Apple Mac-style Editor Titlebar */}
          <div className="bg-[#0f172a] border-b border-slate-800 px-4 py-2 flex items-center justify-between text-xs font-mono shrink-0">
            <div className="flex items-center gap-2.5">
              <div className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full bg-rose-500/90" />
                <div className="w-2.5 h-2.5 rounded-full bg-amber-500/90" />
                <div className="w-2.5 h-2.5 rounded-full bg-emerald-500/90" />
              </div>
              <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-[#1e293b] border border-blue-500/30 text-blue-200 font-mono text-[11px] font-bold">
                <span>solution.c</span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-slate-800/80 border border-slate-700/60 text-slate-300 text-[10px] font-mono">
                <Cloud className="w-3 h-3 text-cyan-400" />
                <span>Auto-Saved</span>
              </span>
            </div>
          </div>

          {/* Monaco Editor Container with hideHeader={true} */}
          <div
            className="flex-1 min-h-[350px] relative"
            onCopy={(e) => { if (!isStaffUser) { e.preventDefault(); handleEditorBlockedAction('copy'); } }}
            onPaste={(e) => { if (!isStaffUser) { e.preventDefault(); handleEditorBlockedAction('paste'); } }}
            onCut={(e) => { if (!isStaffUser) { e.preventDefault(); handleEditorBlockedAction('cut'); } }}
            onContextMenu={(e) => { if (!isStaffUser) { e.preventDefault(); handleEditorBlockedAction('contextmenu'); } }}
            onDragStart={(e) => { if (!isStaffUser) e.preventDefault(); }}
            onDrop={(e) => { if (!isStaffUser) e.preventDefault(); }}
          >
            <CodeEditor
              code={code}
              onChange={handleCodeChange}
              readOnly={isLocked}
              hideHeader={true}
              forceTheme="dark"
              disableCopyPaste={!isStaffUser}
              onBlockedAction={(act) => {
                if (!isStaffUser) {
                  handleEditorBlockedAction(act);
                }
              }}
            />
          </div>

          {/* Bottom Execution Dock (Apple Clean Minimal Style - Zero Duplicate Clutter) */}
          <div
            className={`border-t border-slate-200 bg-white text-slate-800 shadow-xl transition-[height] duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] flex flex-col shrink-0 overflow-hidden ${
              isDrawerOpen ? 'h-64 sm:h-72 max-h-[48%]' : 'h-12'
            }`}
          >
            {/* Dock Header Bar */}
            <div className="flex items-center justify-between px-3 sm:px-4 py-2 bg-slate-50/80 border-b border-slate-200 shrink-0 font-sans text-xs">
              {/* Left Status Indicator */}
              <div className="flex items-center gap-2 min-w-0">
                {submitMutation.isPending || runMutation.isPending ? (
                  <div className="flex items-center gap-2 text-indigo-700 font-bold animate-pulse">
                    <Loader2 className="w-4 h-4 animate-spin text-indigo-600" />
                    <span>Compiling code &amp; running test cases...</span>
                  </div>
                ) : isLocked ? (
                  <div className={`flex items-center gap-2 font-bold ${Number(academicScore) > 0 ? 'text-emerald-700' : 'text-amber-700'}`}>
                    <CheckCircle2 className={`w-4 h-4 ${Number(academicScore) > 0 ? 'text-emerald-600' : 'text-amber-600'}`} />
                    <span>{Number(academicScore) > 0 ? `Solution Saved (${academicScore} / 5 Marks)` : 'Question Locked (0 Marks)'}</span>
                  </div>
                ) : testResults.length > 0 ? (
                  testResults.every((t: any) => t.passed) ? (
                    <div className="flex items-center gap-2 text-emerald-700 font-bold">
                      <Sparkles className="w-4 h-4 text-emerald-600 animate-bounce" />
                      <span>All Test Cases Passed! Advancing to Next Question...</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 text-rose-700 font-bold">
                      <XCircle className="w-4 h-4 text-rose-600" />
                      <span>{testResults.filter((t: any) => t.passed).length}/{testResults.length} Tests Passed</span>
                      <span className="text-[11px] text-slate-400 font-normal hidden sm:inline">• Fix errors below &amp; retry</span>
                    </div>
                  )
                ) : (
                  <div className="flex items-center gap-2 text-slate-500 font-medium">
                    <Terminal className="w-3.5 h-3.5 text-slate-400" />
                    <span>Evaluation Console</span>
                  </div>
                )}
              </div>

              {/* Single Unified Action Button: Compile & Run */}
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  disabled={isLocked || submitMutation.isPending || runMutation.isPending}
                  onClick={handleCompileAndRun}
                  className="flex items-center gap-2 px-4 sm:px-5 py-2 text-xs font-bold text-white bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 rounded-xl shadow-md shadow-emerald-600/20 active:scale-95 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                  title="Compile & Run Code (Ctrl + Enter)"
                >
                  {submitMutation.isPending || runMutation.isPending ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Compiling &amp; Evaluating...</span>
                    </>
                  ) : (
                    <>
                      <Play className="w-3.5 h-3.5 fill-current" />
                      <span>Compile &amp; Run</span>
                      <span className="text-[10px] text-emerald-200 font-mono hidden sm:inline bg-emerald-700/60 px-1.5 py-0.5 rounded">Ctrl+↵</span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  aria-label={isDrawerOpen ? 'Collapse execution drawer' : 'Expand execution drawer'}
                  onClick={() => setIsDrawerOpen(!isDrawerOpen)}
                  className="p-2 rounded-xl text-slate-500 hover:text-slate-800 hover:bg-slate-200/60 transition-colors cursor-pointer"
                  title={isDrawerOpen ? 'Collapse drawer' : 'Expand drawer'}
                >
                  <ChevronDown className={`w-4 h-4 transition-transform duration-300 ${isDrawerOpen ? 'rotate-0' : 'rotate-180'}`} />
                </button>
              </div>
            </div>

            {/* Dock Body */}
            {isDrawerOpen && (
              <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain p-4 font-mono text-xs bg-white text-slate-800">
                {testResults.length === 0 ? (
                  <div className="h-full py-6 flex flex-col items-center justify-center text-center space-y-2 text-slate-400 font-sans">
                    <div className="w-10 h-10 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-500 shadow-inner">
                      <Terminal className="w-5 h-5" />
                    </div>
                    <div className="text-xs font-bold text-slate-700">Ready to Evaluate</div>
                    <div className="text-[11px] text-slate-400 max-w-sm leading-relaxed">
                      Write your C solution in the editor and click <strong className="text-slate-600 font-mono">Compile &amp; Run</strong> (or press <kbd className="px-1.5 py-0.5 rounded bg-slate-100 border border-slate-200 text-slate-600 font-mono text-[10px]">Ctrl+Enter</kbd>). All test cases will be validated automatically.
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {testResults.map((tr: any, idx: number) => {
                      const tcInput = tr.input || (idx === 0 ? problemData?.visibleTestCase1?.input : problemData?.visibleTestCase2?.input) || problemData?.visibleTestCases?.[idx]?.input || '';
                      const tcExpected = tr.expectedOutput || (idx === 0 ? (problemData?.visibleTestCase1?.output || problemData?.visibleTestCase1?.expectedOutput) : (problemData?.visibleTestCase2?.output || problemData?.visibleTestCase2?.expectedOutput)) || problemData?.visibleTestCases?.[idx]?.output || problemData?.visibleTestCases?.[idx]?.expectedOutput || '(Expected output not specified)';
                      const tcActual = tr.actualOutput || (tr.passed ? 'PASSED' : '(No output produced or compiler error)');

                      return (
                        <div
                          key={idx}
                          className={`p-3.5 rounded-2xl border text-xs space-y-2.5 transition-all ${
                            tr.passed
                              ? 'border-emerald-200 bg-emerald-50/40'
                              : 'border-rose-200 bg-rose-50/40'
                          }`}
                        >
                          <div className="flex items-center justify-between font-sans">
                            <span className="flex items-center gap-1.5 font-bold">
                              {tr.passed ? (
                                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                              ) : (
                                <XCircle className="w-4 h-4 text-rose-600" />
                              )}
                              <span className={tr.passed ? 'text-emerald-900' : 'text-rose-900'}>
                                {tr.isHidden ? 'Hidden Boundary Case' : `Test Case #${tr.testIndex || (idx + 1)}`}: {tr.passed ? 'PASSED' : tr.verdict || 'FAILED'}
                              </span>
                            </span>
                            <span className="text-[11px] font-mono text-slate-400">{tr.runtimeMs ?? 0}ms</span>
                          </div>

                          {tr.stderr && !tr.passed && (
                            <div className="p-3 rounded-xl bg-slate-900 text-rose-300 font-mono text-[11px] overflow-x-auto border border-rose-500/40 shadow-sm">
                              <div className="text-[10px] uppercase font-bold text-rose-400 mb-1 flex items-center gap-1.5">
                                <span>⚠️</span>
                                <span>Compiler Diagnostics / Error:</span>
                              </div>
                              <pre className="whitespace-pre-wrap break-all leading-relaxed">{tr.stderr}</pre>
                            </div>
                          )}

                          {!tr.isHidden && (
                            <div className={`grid grid-cols-1 ${tcInput ? 'sm:grid-cols-3' : 'sm:grid-cols-2'} gap-2.5 text-[11px] pt-0.5`}>
                              {tcInput && (
                                <div className="space-y-1">
                                  <span className="text-sky-700 dark:text-sky-400 uppercase text-[10px] font-extrabold font-mono tracking-wider block">
                                    Input (stdin):
                                  </span>
                                  <pre className="bg-slate-100 dark:bg-slate-800/80 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-cyan-200 p-2.5 rounded-xl font-mono font-semibold text-xs min-h-[46px] whitespace-pre-wrap break-all shadow-inner">
                                    {tcInput}
                                  </pre>
                                </div>
                              )}
                              <div className="space-y-1">
                                <span className="text-emerald-700 dark:text-emerald-400 uppercase text-[10px] font-extrabold font-mono tracking-wider block">
                                  Expected Output:
                                </span>
                                <pre className="bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800 text-emerald-950 dark:text-emerald-300 p-2.5 rounded-xl font-mono font-bold text-xs min-h-[46px] whitespace-pre-wrap break-all shadow-inner">
                                  {tcExpected}
                                </pre>
                              </div>
                              <div className="space-y-1">
                                <span className={`uppercase text-[10px] font-extrabold font-mono tracking-wider block ${tr.passed ? 'text-emerald-700 dark:text-emerald-400' : 'text-rose-700 dark:text-rose-400'}`}>
                                  Your Code Output:
                                </span>
                                <pre className={`p-2.5 rounded-xl font-mono font-bold text-xs min-h-[46px] whitespace-pre-wrap break-all shadow-inner border ${tr.passed ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-800 text-emerald-950 dark:text-emerald-300' : 'bg-rose-50 dark:bg-rose-950/40 border-rose-300 dark:border-rose-800 text-rose-900 dark:text-rose-300'}`}>
                                  {tcActual}
                                </pre>
                              </div>
                            </div>
                          )}

                          {tr.isHidden && !tr.passed && (
                            <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-300 dark:border-amber-700 text-amber-900 dark:text-amber-200 text-xs font-mono space-y-1">
                              <div className="font-bold flex items-center gap-1.5 text-amber-800 dark:text-amber-300">
                                <span>💡</span>
                                <span>Hidden Boundary Case Diagnostic:</span>
                              </div>
                              <p className="font-sans text-[11px] text-amber-900 dark:text-amber-200 leading-relaxed">
                                Hidden boundary test case failed. Check edge cases such as single element, negative numbers, zero, or boundary constraints.
                              </p>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Raise Issue Modal */}
      <RaiseIssueModal
        isOpen={isIssueModalOpen}
        onClose={() => setIsIssueModalOpen(false)}
        questionTitle={problemData?.title || 'Exam Question'}
        questionId={problemId}
        contextType="EXAM"
      />

      {/* In Assessments / Tests: AI Viva is completely disabled (strictly reserved for Lab Internal) */}

      {/* Mandatory In-Lab Attendance Verification Overlay (Only when faculty explicitly enforces attendance) */}
      {assignmentData?.requireAttendance && !isAttendanceVerified && !isStaffUser && (
        <div className="fixed inset-0 z-50 bg-black/95 backdrop-blur-lg flex items-center justify-center p-4 animate-in fade-in">
          <div className="max-w-md w-full p-6 sm:p-8 rounded-3xl bg-slate-900 border border-amber-500/40 shadow-2xl text-center space-y-4">
            <div className="w-16 h-16 rounded-2xl bg-amber-500/15 text-amber-500 border border-amber-500/30 flex items-center justify-center mx-auto shadow-inner">
              <Lock className="w-8 h-8" />
            </div>
            <div className="space-y-1">
              <h2 className="text-xl font-bold text-white tracking-tight">
                Lab Attendance Mandatory
              </h2>
              <span className="inline-block px-3 py-0.5 rounded-full text-[11px] font-mono font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40">
                {!AttendanceSyncService.isAttendanceConfirmed(canonicalTestId)
                  ? 'Awaiting Faculty Attendance Confirmation'
                  : 'Marked Absent by Faculty'}
              </span>
              <p className="text-xs text-slate-300 pt-2 leading-relaxed">
                {!AttendanceSyncService.isAttendanceConfirmed(canonicalTestId)
                  ? 'Faculty is taking lab attendance. Once faculty clicks "Confirm & Save Attendance", your test will unlock automatically.'
                  : 'You have been marked Absent by faculty. Only verified present students can take this test.'}
              </p>
            </div>
            <div className="p-3 bg-slate-800/80 rounded-2xl border border-slate-700/80 text-[11px] text-slate-300 font-mono text-left space-y-1">
              <div><strong className="text-slate-400">Student:</strong> {user?.fullName || user?.prn}</div>
              <div><strong className="text-slate-400">PRN:</strong> {user?.prn || 'N/A'}</div>
              <div>
                <strong className="text-slate-400">Attendance:</strong>{' '}
                {!AttendanceSyncService.isAttendanceConfirmed(canonicalTestId) ? (
                  <span className="text-amber-400 font-bold">AWAITING FACULTY CONFIRMATION</span>
                ) : (
                  <span className="text-rose-400 font-bold">MARKED ABSENT</span>
                )}
              </div>
              <div className="text-[10px] text-slate-400 pt-1">
                ⚡ Once your faculty confirms attendance and marks you PRESENT, this screen will auto-unlock instantly.
              </div>
            </div>
            <button
              type="button"
              onClick={() => exitExamTo('/student/tests')}
              className="w-full py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-semibold text-slate-300 hover:text-white transition cursor-pointer"
            >
              Exit to Tests
            </button>
          </div>
        </div>
      )}

      {/* Strict 2-Violation Proctor Lock Overlay (Hariprasad Sir Specification) */}
      {isLockedByProctor && !isStaffUser && (
        <div className="fixed inset-0 z-50 bg-slate-950/90 backdrop-blur-xl flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="max-w-md w-full p-6 sm:p-8 rounded-3xl bg-[#0c1017] border border-rose-500/30 shadow-[0_20px_70px_rgba(244,63,94,0.25)] text-center space-y-4 relative overflow-hidden">
            {/* Ambient Red Glow */}
            <div className="absolute -top-16 left-1/2 -translate-x-1/2 w-48 h-32 bg-rose-500/15 blur-3xl rounded-full pointer-events-none" />

            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-rose-500/20 to-rose-600/10 text-rose-400 border border-rose-500/30 flex items-center justify-center mx-auto shadow-inner shadow-rose-950/40 relative">
              <Lock className="w-8 h-8" />
              <span className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-rose-500 ring-4 ring-[#0c1017] animate-ping" />
              <span className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-rose-500" />
            </div>

            <div className="space-y-1.5 relative">
              <h2
                style={{ color: '#ffffff', fontFamily: 'inherit' }}
                className="text-2xl font-bold tracking-tight text-white !text-white"
              >
                Assessment Locked
              </h2>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-mono font-bold bg-rose-500/15 text-rose-300 border border-rose-500/30">
                <span className="w-1.5 h-1.5 rounded-full bg-rose-400 animate-pulse" />
                <span>2 / 2 Proctoring Violations Reached</span>
              </div>
              <p style={{ color: '#cbd5e1' }} className="text-xs text-slate-300 pt-1 leading-relaxed">
                You reached the permissible limit of violations. Your solution has been auto-saved and submitted to your course faculty.
              </p>
            </div>

            <div className="p-3.5 bg-slate-900/90 rounded-2xl border border-slate-800 text-xs text-slate-300 font-mono text-left space-y-1.5 shadow-inner">
              <div className="flex items-center justify-between gap-2 border-b border-slate-800/80 pb-1.5">
                <span className="text-slate-400 text-[11px]">Student</span>
                <span className="text-slate-100 font-semibold text-[11px] truncate">{user?.fullName || user?.prn}</span>
              </div>
              <div className="border-b border-slate-800/80 pb-1.5">
                <div className="text-slate-400 text-[11px]">Trigger</div>
                <div className="text-rose-300 text-[11px] leading-snug mt-0.5">{proctorLockReason}</div>
              </div>
              <div className="flex items-center justify-between gap-2 pt-0.5">
                <span className="text-slate-400 text-[11px]">Status</span>
                <span className="text-amber-400 font-semibold text-[11px] flex items-center gap-1">
                  <ShieldAlert className="w-3 h-3" />
                  Locked · Awaiting Faculty
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => exitExamTo('/student/tests')}
              className="w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-rose-600 to-rose-500 hover:from-rose-500 hover:to-rose-400 text-white font-bold text-xs tracking-wide transition-all shadow-lg shadow-rose-600/25 active:scale-[0.98] cursor-pointer flex items-center justify-center gap-2"
            >
              <span>Exit to Student Tests</span>
            </button>

            <button
              type="button"
              onClick={async () => {
                const toastId = toast.loading('Checking faculty unlock status...');
                try {
                  const cloudLocked = await AttendanceSyncService.fetchLockedStudentsFromCloud();
                  if (!cloudLocked[cleanPrnForLock]) {
                    setIsExamSubmissionUnlocked(true);
                    setIsLockedByProctor(false);
                    setIsLocked(false);
                    totalViolationsRef.current = 0;
                    try {
                      localStorage.removeItem(`logicq_exam_locked_${assignmentId}_${cleanPrnForLock}`);
                      localStorage.removeItem(`logicq_exam_locked_test-continuous-arrays-search-sort_${cleanPrnForLock}`);
                      localStorage.removeItem(`logicq_exam_locked_test-assessment-4_${cleanPrnForLock}`);
                      localStorage.removeItem(`logicq_exam_locked_assessment-4_${cleanPrnForLock}`);
                      localStorage.removeItem(`logicq_exam_locked_test-assessment-4`);
                      localStorage.removeItem(`logicq_exam_locked_assessment-4`);
                      localStorage.removeItem(`logicq_exam_proctor_locked_${cleanPrnForLock}`);
                      localStorage.removeItem(`logicq_exam_proctor_locked`);
                      localStorage.removeItem(`logicq_exam_proctor_lock_reason_${cleanPrnForLock}`);
                      localStorage.removeItem(`logicq_exam_proctor_lock_reason`);
                      localStorage.removeItem(`logicq_exam_violations_${assignmentId}_${cleanPrnForLock}`);
                      localStorage.removeItem(`logicq_exam_violations_test-continuous-arrays-search-sort_${cleanPrnForLock}`);
                      localStorage.removeItem(`logicq_exam_violations_test-assessment-4_${cleanPrnForLock}`);
                      localStorage.removeItem(`logicq_exam_violations_assessment-4_${cleanPrnForLock}`);
                      localStorage.removeItem(`logicq_exam_violations_${assignmentId}`);
                      localStorage.removeItem(`logicq_exam_violations_test-assessment-4`);
                      localStorage.removeItem(`logicq_exam_student_submitted_${assignmentId}_${cleanPrnForLock}`);
                      localStorage.removeItem(`logicq_exam_student_submitted_test-continuous-arrays-search-sort_${cleanPrnForLock}`);
                      localStorage.removeItem(`logicq_exam_student_submitted_test-assessment-4_${cleanPrnForLock}`);
                      localStorage.removeItem(`logicq_exam_student_submitted_assessment-4_${cleanPrnForLock}`);
                      localStorage.setItem(`logicq_exam_unlocked_${assignmentId}_${cleanPrnForLock}`, 'true');
                      localStorage.setItem(`logicq_exam_unlocked_test-continuous-arrays-search-sort_${cleanPrnForLock}`, 'true');
                      localStorage.setItem(`logicq_exam_unlocked_test-assessment-4_${cleanPrnForLock}`, 'true');
                      localStorage.setItem(`logicq_exam_unlocked_assessment-4_${cleanPrnForLock}`, 'true');
                      localStorage.setItem(`logicq_student_reset_${cleanPrnForLock}`, 'true');
                    } catch {}
                    toast.success('🎉 Faculty unlocked your exam! You can now continue.', { id: toastId });
                  } else {
                    toast.error('Still locked in faculty console. Ask faculty to click "Unlock Student".', { id: toastId });
                  }
                } catch {
                  toast.error('Network check error.', { id: toastId });
                }
              }}
              className="w-full py-2.5 px-4 rounded-2xl bg-slate-900/80 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 text-slate-300 hover:text-white font-medium text-xs transition-all active:scale-[0.98] cursor-pointer flex items-center justify-center gap-1.5"
            >
              <RotateCcw className="w-3.5 h-3.5 text-slate-400" />
              <span>Faculty Unlocked? Check & Resume Test</span>
            </button>
          </div>
        </div>
      )}

      {/* Assessment Already Completed / Re-attempt Locked Modal Overlay */}
      {isTestAlreadyCompleted && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="max-w-md w-full p-6 sm:p-8 rounded-3xl bg-white dark:bg-[#121620] border border-slate-200 dark:border-white/10 shadow-2xl text-center space-y-4 animate-in zoom-in-95">
            <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-7 h-7" />
            </div>
            <div className="space-y-1">
              <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                Test Already Submitted
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                You have already completed and submitted your practical examination. Re-attempts are strictly disabled as per evaluation guidelines.
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                isExitingRef.current = true;
                if (typeof document !== 'undefined' && document.fullscreenElement) {
                  document.exitFullscreen().catch(() => {});
                }
                navigate('/student/tests');
              }}
              className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs transition active:scale-95 cursor-pointer shadow-md shadow-emerald-500/20"
            >
              Return to Tests Dashboard
            </button>
          </div>
        </div>
      )}

      {/* Assessment Scheduled / Not Started Modal Overlay */}
      {isTestUpcoming && !isExamConcluded && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="max-w-md w-full p-6 sm:p-8 rounded-3xl bg-white dark:bg-[#121620] border border-slate-200 dark:border-white/10 shadow-2xl text-center space-y-4 animate-in zoom-in-95">
            <div className="w-14 h-14 rounded-2xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20 flex items-center justify-center mx-auto">
              <Clock className="w-7 h-7" />
            </div>
            <div className="space-y-1">
              <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                Assessment Scheduled
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                Your faculty has scheduled this practical evaluation and has not clicked "Start Test Now" yet. Please wait for your faculty to start the test session.
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                isExitingRef.current = true;
                if (typeof document !== 'undefined' && document.fullscreenElement) {
                  document.exitFullscreen().catch(() => {});
                }
                navigate('/student/tests');
              }}
              className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs transition active:scale-95 cursor-pointer shadow-md shadow-indigo-500/20"
            >
              Back to Assigned Tests
            </button>
          </div>
        </div>
      )}

      {/* Assessment Concluded Modal Overlay */}
      {isExamConcluded && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="max-w-md w-full p-6 sm:p-8 rounded-3xl bg-white dark:bg-[#121620] border border-slate-200 dark:border-white/10 shadow-2xl text-center space-y-4 animate-in zoom-in-95">
            <div className="w-14 h-14 rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 flex items-center justify-center mx-auto">
              <Lock className="w-7 h-7" />
            </div>
            <div className="space-y-1">
              <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                Assessment Concluded
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                The administrator has marked this test completed. The exam session is now closed and no further submissions can be accepted.
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                isExitingRef.current = true;
                if (typeof document !== 'undefined' && document.fullscreenElement) {
                  document.exitFullscreen().catch(() => {});
                }
                navigate('/student/tests');
              }}
              className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs transition active:scale-95 cursor-pointer shadow-md shadow-indigo-500/20"
            >
              Back to Assigned Tests
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
export default ExamWorkspacePage;
