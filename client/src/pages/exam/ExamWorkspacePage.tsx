import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import confetti from 'canvas-confetti';
import { toast } from 'sonner';
import { api } from '../../api/client.js';
import { CodeEditor } from '../../components/editor/CodeEditor.js';
import { StatementMarkdown } from '../../components/common/StatementMarkdown.js';
import { AiVivaModal } from '../../components/exam/AiVivaModal.js';
import { RaiseIssueModal } from '../../components/common/RaiseIssueModal.js';
import { useAuth } from '../../context/AuthContext.js';
import { DraftSyncService, getDeviceLabel } from '../../services/draftSync.service.js';
import { FirestoreDataService } from '../../services/firestoreData.service.js';
import { RealtimeSyncService } from '../../services/realtimeSync.service.js';
import { getStudentPersonalizedQuestions } from '../../utils/testQuestionDistributor.js';
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
} from 'lucide-react';

export const ExamWorkspacePage: React.FC = () => {
  const { assignmentId, problemId } = useParams<{ assignmentId: string; problemId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

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
  const [tabSwitchCount, setTabSwitchCount] = useState<number>(0);
  const [focusLossCount, setFocusLossCount] = useState<number>(0);
  const [fullScreenExitCount, setFullScreenExitCount] = useState<number>(0);
  const [copyPasteAttempts, setCopyPasteAttempts] = useState<number>(0);
  const [cutAttempts, setCutAttempts] = useState<number>(0);
  const [contextMenuAttempts, setContextMenuAttempts] = useState<number>(0);
  const [totalKeystrokes, setTotalKeystrokes] = useState<number>(0);
  const [largestBurstChars, setLargestBurstChars] = useState<number>(0);
  const [activeSec, setActiveSec] = useState<number>(0);

  const [proctorIncidentsLog, setProctorIncidentsLog] = useState<Array<{ timestamp: string; type: string; details: string; severity: 'INFO' | 'WARNING' | 'CRITICAL' }>>([]);

  const addProctorIncident = useCallback((type: string, details: string, severity: 'INFO' | 'WARNING' | 'CRITICAL' = 'WARNING') => {
    const item = {
      timestamp: new Date().toLocaleTimeString(),
      type,
      details,
      severity,
    };
    setProctorIncidentsLog((prev) => [item, ...prev].slice(0, 50));
  }, []);

  const lastActivityRef = useRef<number>(Date.now());
  const focusLossStartRef = useRef<number | null>(null);
  const totalFocusLossMsRef = useRef<number>(0);
  const previousCodeLenRef = useRef<number>(0);
  const isExitingRef = useRef<boolean>(false);

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

  // Fetch test details to get full question sequence for auto-advancing
  const { data: assignmentData } = useQuery({
    queryKey: ['exam-assignment-questions', assignmentId],
    queryFn: async () => {
      try {
        const cloudTests = await FirestoreDataService.getAssessmentTestsFromFirestore();
        const current = cloudTests.find((t: any) => t.id === assignmentId || t.testId === assignmentId);
        if (current) return current;
      } catch {}
      try {
        return await api.get(`/exam/assignment/${assignmentId}`);
      } catch {
        return null;
      }
    },
    enabled: Boolean(assignmentId),
    staleTime: 5000,
    refetchInterval: 5000,
  });

  // Live listener to check if test was completed/concluded by admin in real-time
  const [isTestConcludedByAdmin, setIsTestConcludedByAdmin] = useState<boolean>(false);

  useEffect(() => {
    if (!assignmentId) return;
    const unsub = FirestoreDataService.listenToAssessmentTests((cloudTests) => {
      const current = cloudTests.find((t: any) => t.id === assignmentId || t.testId === assignmentId);
      if (current && (current.status === 'COMPLETED' || current.status === 'CONCLUDED')) {
        setIsTestConcludedByAdmin(true);
      }
    });
    return () => unsub();
  }, [assignmentId]);

  const isExamConcluded = isTestConcludedByAdmin || assignmentData?.status === 'COMPLETED' || assignmentData?.status === 'CONCLUDED';

  useEffect(() => {
    if (isExamConcluded) {
      setIsLocked(true);
      if (typeof document !== 'undefined' && document.fullscreenElement) {
        document.exitFullscreen().catch(() => {});
      }
    }
  }, [isExamConcluded]);

  // Total Assessment Duration & Shared Unified Countdown Timer
  const totalTestMinutes = Number(assignmentData?.durationMinutes) || 60;
  const totalTestDurationSec = totalTestMinutes * 60;
  const [remainingTestSec, setRemainingTestSec] = useState<number>(totalTestDurationSec);
  const testStartTimeRef = useRef<number>(Date.now());
  const isTimeExpiredRef = useRef<boolean>(false);

  const questionSequence: string[] = React.useMemo(() => {
    if (assignmentData?.questions && Array.isArray(assignmentData.questions) && assignmentData.questions.length > 0) {
      const studentIdentifier = user?.prn || (user as any)?.rollNo || user?.id || user?.email || '1001';
      const count = assignmentData.questionCount || assignmentData.questions.length;
      const personalized = getStudentPersonalizedQuestions(assignmentData.questions, count, studentIdentifier);
      const safePersonalized = Array.isArray(personalized) && personalized.length > 0 ? personalized : assignmentData.questions;
      return safePersonalized.map((q: any) => {
        if (typeof q === 'string') return q;
        return q.problemId || q.id || q.problem?.id || q.problem?.slug || '';
      }).filter(Boolean);
    }
    // Fallback sequence from bank
    return ['q-s1-01', 'q-s2-01', 'q-s3-01', 'q-s4-01'];
  }, [assignmentData, user]);

  const currentQuestionIndex = questionSequence.findIndex((qid) => qid === problemId);
  const nextProblemId = (currentQuestionIndex !== -1 && currentQuestionIndex + 1 < questionSequence.length)
    ? questionSequence[currentQuestionIndex + 1]
    : null;

  // Clean state reset when moving between questions
  useEffect(() => {
    setCode('');
    setTestResults([]);
    setIsLocked(false);
    setAcademicScore(null);
    setElapsedSec(0);
    setStartedAt(null);
  }, [assignmentId, problemId]);

  // 1. Start or resume question attempt (Single authoritative query with zero race condition)
  const { data: startData, isLoading, error, refetch } = useQuery({
    queryKey: ['start-exam-question', assignmentId, problemId],
    queryFn: async () => {
      return await api.post('/exam/start-question', {
        assignmentId,
        problemId,
      });
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
    setIsLocked(res.isLocked || false);
    // Draft resilience: restore in-progress exam code if student refreshed or browser crashed
    const draftKey = `logicq_exam_draft_${res.attemptId || (assignmentId + '_' + problemId)}`;
    const savedDraft = typeof window !== 'undefined' ? localStorage.getItem(draftKey) : null;
    if (savedDraft && !code) {
      setCode(savedDraft);
      previousCodeLenRef.current = savedDraft.length;
    } else if (res.problem?.starterCode && !code) {
      setCode(res.problem.starterCode);
      previousCodeLenRef.current = res.problem.starterCode.length;
    }
    if (res.startedAt) {
      setStartedAt(new Date(res.startedAt));
    }
  }, [startData, code]);

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
    const testStartKey = `logicq_exam_test_start_${assignmentId}`;
    let saved = typeof window !== 'undefined' ? localStorage.getItem(testStartKey) : null;
    let startMs = saved ? Number(saved) : 0;
    if (!startMs || isNaN(startMs)) {
      startMs = Date.now();
      try { localStorage.setItem(testStartKey, String(startMs)); } catch {}
    }
    testStartTimeRef.current = startMs;
  }, [assignmentId]);

  useEffect(() => {
    const checkCountdown = () => {
      const elapsed = Math.max(0, Math.floor((Date.now() - testStartTimeRef.current) / 1000));
      const remaining = Math.max(0, totalTestDurationSec - elapsed);
      setRemainingTestSec(remaining);

      // Auto-submit entire test when timer hits 0
      if (remaining <= 0 && !isTimeExpiredRef.current && !isLocked) {
        isTimeExpiredRef.current = true;
        setIsLocked(true);
        toast.error("Time's up! Total examination time limit has ended. Submitting assessment now...", {
          duration: 6000,
        });

        // If user has written code in editor, submit current question
        const cleanCode = (code || '').trim();
        const cleanStarter = (problemData?.starterCode || '').trim();
        if (cleanCode && cleanCode !== cleanStarter && attemptId) {
          api.post('/exam/submit-question', {
            attemptId,
            code,
            problemId,
            assignmentId,
            clientMetrics: {
              tabSwitchCount,
              focusLossCount,
              fullScreenExitCount,
              totalKeystrokes,
              largestBurstChars,
              activeInteractionTimeSec: activeSec,
            },
          }).catch(() => {});
        }

        try {
          localStorage.setItem(`logicq_exam_test_completed_${assignmentId}`, 'true');
        } catch {}
        RealtimeSyncService.emit('SUBMISSIONS');
        RealtimeSyncService.emit('TESTS');
        RealtimeSyncService.emit('DASHBOARD');

        setTimeout(() => {
          exitExamTo('/student/tests');
        }, 2000);
      }
    };

    checkCountdown();
    const interval = setInterval(checkCountdown, 1000);
    return () => clearInterval(interval);
  }, [totalTestDurationSec, isLocked, code, problemData, attemptId, problemId, assignmentId, exitExamTo, activeSec, focusLossCount, fullScreenExitCount, largestBurstChars, tabSwitchCount, totalKeystrokes]);

  // 3. Silent Non-blocking Telemetry Heartbeat (Phase 3 Deliverable)
  const sendTelemetryPing = useCallback((overrideMetrics?: Record<string, any>) => {
    if (!attemptId || isLocked) return;
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
        activeInteractionTimeSec: activeSec,
        ...overrideMetrics,
      },
    }).catch(() => {
      // Asynchronous non-blocking: silently ignore network errors so student is never interrupted
    });
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
  ]);

  // Periodic Telemetry Sync every 30 seconds
  useEffect(() => {
    if (!attemptId || isLocked) return;
    const interval = setInterval(() => {
      sendTelemetryPing();
    }, 30000);
    return () => clearInterval(interval);
  }, [attemptId, isLocked, sendTelemetryPing]);

  // Auto fullscreen attempt on mount
  useEffect(() => {
    if (!isLocked && typeof document !== 'undefined' && !document.fullscreenElement) {
      document.documentElement.requestFullscreen().then(() => {
        setIsFullscreen(true);
        hasEnteredFullscreenRef.current = true;
      }).catch(() => {
        // Browser requires explicit user gesture; modal will handle it
      });
    }
  }, [isLocked]);

  // 4. Fullscreen & Focus Proctoring Event Listeners (Section 21)
  useEffect(() => {
    const handleFullscreenChange = () => {
      const active = Boolean(document.fullscreenElement);
      setIsFullscreen(active);

      if (active) {
        hasEnteredFullscreenRef.current = true;
      } else if (!active && hasEnteredFullscreenRef.current && !isLocked && !isExitingRef.current) {
        // Proctoring violation: Student exited full-screen! Immediately kick them out
        setFullScreenExitCount((c) => {
          const next = c + 1;
          sendTelemetryPing({ fullScreenExitCount: next });
          return next;
        });
        addProctorIncident('FULLSCREEN_EXIT', 'Fullscreen perimeter violated: Student minimized or exited full-screen examination.', 'CRITICAL');

        const targetUser = (user as any)?.uid || (user as any)?.id || auth.currentUser?.uid || user?.prn || 'current';
        FirestoreDataService.recordProctoringIncident(targetUser, {
          type: 'FULLSCREEN_EXIT',
          reason: 'Student exited proctored full-screen mode. Examination session terminated.',
          problemSlug: problemId || assignmentId,
          problemTitle: problemData?.title || 'Continuous Practical Assessment',
          isCheatAttempt: true,
        }).catch(() => {});

        toast.error('Proctoring Violation: Full-screen exit detected! You have been removed from the exam session.', {
          duration: 6000,
        });

        isExitingRef.current = true;
        if (typeof document !== 'undefined' && document.fullscreenElement) {
          document.exitFullscreen().catch(() => {});
        }
        navigate('/student/tests');
      }
    };

    const handleVisibilityChange = () => {
      if (document.hidden && !isLocked) {
        setTabSwitchCount((c) => {
          const next = c + 1;
          sendTelemetryPing({ tabSwitchCount: next });
          addProctorIncident('TAB_SWITCH', `Tab switch #${next} detected: Exam window was hidden.`, 'WARNING');
          return next;
        });
        focusLossStartRef.current = Date.now();
        toast.error('Proctoring Warning: Tab / Window switch detected! Tab navigation is strictly monitored.', {
          duration: 5000,
        });
      } else if (!document.hidden && focusLossStartRef.current) {
        const duration = Date.now() - focusLossStartRef.current;
        totalFocusLossMsRef.current += duration;
        focusLossStartRef.current = null;
        sendTelemetryPing({ totalFocusLossDurationMs: totalFocusLossMsRef.current });
      }
    };

    const handleWindowBlur = () => {
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

    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('blur', handleWindowBlur);
    };
  }, [isLocked, sendTelemetryPing, navigate, user, problemId, assignmentId, problemData]);

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
    if (isLocked) return;
    if (actionName === 'copy' || actionName === 'paste') {
      setCopyPasteAttempts((c) => c + 1);
      addProctorIncident('CLIPBOARD_BLOCKED', `Proctoring guard blocked ${actionName.toUpperCase()} attempt in code editor.`, 'WARNING');
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
    const draftKey = `logicq_exam_draft_${attemptId || (assignmentId + '_' + problemId)}`;
    try {
      localStorage.setItem(draftKey, newCode);
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
      return api.post('/exam/run-code', {
        attemptId,
        code,
        problemId,
        assignmentId,
      });
    },
    onSuccess: (res) => {
      setTestResults(res.testResults || []);
      setActiveBottomTab('output');
      setIsDrawerOpen(true);
      const allPassed = res.testResults?.length > 0 && res.testResults.every((t: any) => t.passed);
      if (allPassed) {
        toast.success('All visible test cases passed! Auto-submitting solution...');
        submitMutation.mutate();
      } else {
        toast.error('Test cases failed. Please review the output below and fix your code.');
      }
    },
    onError: (err: any) => {
      toast.error(err.message || 'Run execution failed.');
    },
  });

  // 7. Final Submission & Reattempt Lock (Sections 5 & 7)
  const submitMutation = useMutation({
    mutationFn: async () => {
      if (!attemptId) throw new Error('Attempt not initialized');
      return api.post('/exam/submit-question', {
        attemptId,
        code,
        problemId,
        assignmentId,
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
          activeInteractionTimeSec: activeSec,
        },
      });
    },
    onSuccess: (res) => {
      setTestResults(res.testOutcomes || []);
      setActiveBottomTab('output');
      setIsDrawerOpen(true);
      if (res.verdict === 'ACCEPTED') {
        setIsLocked(true);
        const draftKey = `logicq_exam_draft_${attemptId || (assignmentId + '_' + problemId)}`;
        try { localStorage.removeItem(draftKey); } catch {}
        setAcademicScore(res.academicScore);
        confetti({ particleCount: 80, spread: 70, origin: { y: 0.6 } });

        // Record submission in Firestore and broadcast to all faculty & admin dashboards
        const uid = (user as any)?.uid || (user as any)?.id || auth.currentUser?.uid || 'current';
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
          verdict: res.verdict,
          academicScore: res.academicScore ?? 1.0,
          timeTakenSeconds: elapsedSec,
          submissionType: 'ASSESSMENT',
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
          incidents: proctorIncidentsLog,
        };

        FirestoreDataService.recordAssessmentSubmission(subPayload).catch(() => {});
        FirestoreDataService.recordDailySubmission(uid, subPayload).catch(() => {});
        RealtimeSyncService.emit('SUBMISSIONS');
        RealtimeSyncService.emit('DASHBOARD');
        RealtimeSyncService.emit('TESTS');

        // Automatic Next Question Navigation
        if (nextProblemId) {
          toast.success(`Accepted! Score: ${res.academicScore ?? 1.0} Mark awarded. Advancing to next question...`, {
            duration: 3500,
          });
          setTimeout(() => {
            navigate(`/exam/${assignmentId}/${nextProblemId}`);
          }, 1500);
        } else {
          toast.success('Final Question Accepted! Assessment Complete!', {
            duration: 4000,
          });
          isExitingRef.current = true;
          if (typeof document !== 'undefined' && document.fullscreenElement) {
            document.exitFullscreen().catch(() => {});
          }
          setTimeout(() => {
            navigate('/student/tests');
          }, 1500);
        }

        // Section 29: Trigger AI Viva Verification if returned by engine
        if (res.vivaTriggered && res.vivaId) {
          setActiveViva({
            vivaId: res.vivaId,
            questionText: res.vivaQuestionText,
            remainingSec: 60,
          });
        }
      } else {
        toast.error(`Evaluation failed (${res.verdict}). Academic Score: 0.0 marks.`);
      }
    },
    onError: (err: any) => {
      toast.error(err.message || 'Submission failed.');
    },
  });

  // Safe execution handler with validation guard
  const handleExecuteTests = useCallback(() => {
    if (isExamConcluded) {
      toast.error('This examination has been marked completed by the administrator.');
      return;
    }
    if (isLocked || runMutation.isPending || submitMutation.isPending) return;
    const cleanCode = (code || '').trim();
    const cleanStarter = (problemData?.starterCode || '').trim();
    if (!cleanCode || cleanCode === cleanStarter) {
      toast.error('Please write your solution code before running tests!');
      return;
    }
    if (!cleanCode.includes('main(') && !cleanCode.includes('main (')) {
      toast.error("Compilation Error: Missing 'int main()' entrypoint in C program.");
      return;
    }
    setActiveMobileTab('editor');
    runMutation.mutate();
  }, [isExamConcluded, isLocked, runMutation, submitMutation, code, problemData]);

  // Apple-grade Keyboard Shortcut: Ctrl + Enter or Cmd + Enter to Run Tests
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        if (!isLocked && !runMutation.isPending && !submitMutation.isPending) {
          e.preventDefault();
          handleExecuteTests();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isLocked, runMutation, submitMutation, handleExecuteTests]);

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
      }));
    }
    const cases: any[] = [];
    if (problemData.visibleTestCase1) {
      cases.push({
        id: 'tc1',
        input: problemData.visibleTestCase1.input || '',
        expectedOutput: problemData.visibleTestCase1.output || problemData.visibleTestCase1.expectedOutput || '',
      });
    }
    if (problemData.visibleTestCase2) {
      cases.push({
        id: 'tc2',
        input: problemData.visibleTestCase2.input || '',
        expectedOutput: problemData.visibleTestCase2.output || problemData.visibleTestCase2.expectedOutput || '',
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
        }));
      }
    }
    return [
      { id: 'tc1', input: 'PKT 101 25.4', expectedOutput: 'CRC: 0x4A12' },
      { id: 'tc2', input: 'PKT 102 0.0', expectedOutput: 'CRC: 0x1120' },
    ];
  }, [problemData]);

  return (
    <div className="fixed inset-0 z-40 w-full h-[100dvh] max-h-[100dvh] bg-slate-100 text-slate-900 flex flex-col overflow-hidden select-none font-sans">
      {/* 0. Fullscreen Proctored Requirement Modal (Blocks interaction until student enters fullscreen) */}
      {!isFullscreen && !isLocked && (
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
          <div className="flex items-center gap-2 min-w-0">
            <span className="font-bold text-slate-900 truncate max-w-[200px] sm:max-w-md font-sans text-sm">
              {assignmentData?.title || 'Continuous Practical Assessment'}
            </span>
            <span className="px-2.5 py-0.5 rounded-full bg-indigo-50 border border-indigo-200/80 text-indigo-700 text-[11px] font-bold shrink-0">
              Question {currentQuestionIndex >= 0 ? currentQuestionIndex + 1 : 1} of {questionSequence.length || 1}
            </span>
          </div>
        </div>

        {/* Live Proctoring & Total Test Countdown Timer */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          {/* Total Test Countdown Timer (Shared across all questions) */}
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
            <Clock className={`w-3.5 h-3.5 ${remainingTestSec <= 300 ? 'text-rose-600' : 'text-indigo-600'}`} />
            <span>{formatCountdown(remainingTestSec)}</span>
            <span className="hidden sm:inline text-[10px] text-slate-400 font-sans font-normal">
              left
            </span>
          </div>

          {/* Proctored Live Pill */}
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200/80 text-xs font-sans font-medium">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span>Proctored</span>
          </div>

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
        <div className="bg-emerald-50 border-b border-emerald-200 px-4 py-3 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs shrink-0">
          <div className="flex items-center gap-2.5 text-emerald-800 font-mono">
            <Lock className="w-4 h-4 text-emerald-600 flex-shrink-0" />
            <span>
              <strong>QUESTION PERMANENTLY LOCKED:</strong> Your solution was accepted ({academicScore ?? 1.0} mark awarded). Under examination policy, edits and resets are locked.
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
                  {problemData?.difficulty || 'HARD'}
                </span>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                  20.0 Marks
                </span>
                <span className="text-xs text-slate-500 font-mono font-medium flex items-center gap-1">
                  <Clock className="w-3 h-3 text-slate-400" />
                  <span>Total Exam: {totalTestMinutes}m</span>
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

            {/* Visible Sample Test Cases */}
            <div className="space-y-3 pt-1">
              <div className="flex items-center justify-between">
                <h2 className="text-xs font-bold text-slate-900 font-sans uppercase tracking-wider">
                  Sample Test Cases
                </h2>
                <span className="text-[11px] font-mono text-slate-400">
                  2 visible sample tests
                </span>
              </div>

              <div className="space-y-3">
                {visibleCasesList.map((tc: any, idx: number) => (
                  <div
                    key={tc.id || idx}
                    className="p-4 rounded-2xl bg-slate-50/80 border border-slate-200/80 font-mono text-xs space-y-2.5 shadow-xs"
                  >
                    <div className="flex items-center justify-between text-slate-600">
                      <span className="font-bold text-slate-900">Sample Case #{idx + 1}</span>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 font-bold">
                        VISIBLE
                      </span>
                    </div>

                    <div className="space-y-1">
                      <div className="text-[10px] uppercase font-bold text-slate-400">Input:</div>
                      <pre className="p-2.5 rounded-xl bg-white border border-slate-200 text-slate-900 font-mono shadow-inner font-semibold overflow-x-auto">
                        {tc.input}
                      </pre>
                    </div>

                    <div className="space-y-1">
                      <div className="text-[10px] uppercase font-bold text-emerald-600">Expected Output:</div>
                      <pre className="p-2.5 rounded-xl bg-emerald-50/60 border border-emerald-200 text-emerald-900 font-mono font-bold shadow-inner overflow-x-auto">
                        {tc.expectedOutput}
                      </pre>
                    </div>
                  </div>
                ))}
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
            onCopy={(e) => { e.preventDefault(); handleEditorBlockedAction('copy'); }}
            onPaste={(e) => { e.preventDefault(); handleEditorBlockedAction('paste'); }}
            onCut={(e) => { e.preventDefault(); handleEditorBlockedAction('cut'); }}
            onContextMenu={(e) => { e.preventDefault(); handleEditorBlockedAction('contextmenu'); }}
            onDragStart={(e) => { e.preventDefault(); }}
            onDrop={(e) => { e.preventDefault(); }}
          >
            <CodeEditor
              code={code}
              onChange={handleCodeChange}
              readOnly={isLocked}
              hideHeader={true}
              forceTheme="dark"
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
                {submitMutation.isPending ? (
                  <div className="flex items-center gap-2 text-emerald-700 font-bold">
                    <Sparkles className="w-4 h-4 text-emerald-600 animate-pulse" />
                    <span>All Tests Passed! Submitting &amp; Advancing...</span>
                  </div>
                ) : runMutation.isPending ? (
                  <div className="flex items-center gap-2 text-indigo-700 font-semibold">
                    <Loader2 className="w-4 h-4 animate-spin text-indigo-600" />
                    <span>Compiling &amp; running visible test cases...</span>
                  </div>
                ) : testResults.length > 0 ? (
                  testResults.every((t: any) => t.passed) ? (
                    <div className="flex items-center gap-2 text-emerald-700 font-bold">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      <span>All {testResults.length} Visible Tests Passed</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 text-rose-700 font-bold">
                      <XCircle className="w-4 h-4 text-rose-600" />
                      <span>{testResults.filter((t: any) => t.passed).length}/{testResults.length} Tests Passed</span>
                      <span className="text-[11px] text-slate-400 font-normal hidden sm:inline">• Check output below</span>
                    </div>
                  )
                ) : (
                  <div className="flex items-center gap-2 text-slate-500 font-medium">
                    <Terminal className="w-3.5 h-3.5 text-slate-400" />
                    <span>Evaluation Console</span>
                  </div>
                )}
              </div>

              {/* Right Action Buttons */}
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  disabled={isLocked || runMutation.isPending || submitMutation.isPending}
                  onClick={handleExecuteTests}
                  className="flex items-center gap-2 px-4 py-1.5 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-xl shadow-xs transition-all cursor-pointer disabled:opacity-50 active:scale-95"
                  title="Run Visible Tests & Auto-Submit on Pass (Ctrl + Enter)"
                >
                  {submitMutation.isPending ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Submitting...</span>
                    </>
                  ) : runMutation.isPending ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Running...</span>
                    </>
                  ) : (
                    <>
                      <Play className="w-3.5 h-3.5 fill-current" />
                      <span>Run Visible Tests</span>
                      <span className="text-[10px] text-slate-400 font-mono hidden sm:inline">Ctrl+↵</span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  aria-label={isDrawerOpen ? 'Collapse execution drawer' : 'Expand execution drawer'}
                  onClick={() => setIsDrawerOpen(!isDrawerOpen)}
                  className="p-1.5 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-200/60 transition-colors cursor-pointer"
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
                      Write your solution in the editor and click <strong className="text-slate-600 font-mono">Run Visible Tests</strong> (or press <kbd className="px-1.5 py-0.5 rounded bg-slate-100 border border-slate-200 text-slate-600 font-mono text-[10px]">Ctrl+Enter</kbd>).
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {testResults.map((tr: any, idx: number) => (
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
                              Sample Case #{tr.testIndex || (idx + 1)}: {tr.passed ? 'PASSED' : 'FAILED'}
                            </span>
                          </span>
                          <span className="text-[11px] font-mono text-slate-400">{tr.runtimeMs ?? 0}ms</span>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-[11px]">
                          <div>
                            <span className="text-slate-400 uppercase text-[10px] font-bold font-mono">Expected:</span>
                            <pre className="bg-white border border-slate-200 text-emerald-800 p-2.5 rounded-xl mt-1 overflow-x-auto font-mono font-bold shadow-inner">
                              {tr.expectedOutput}
                            </pre>
                          </div>
                          <div>
                            <span className="text-slate-400 uppercase text-[10px] font-bold font-mono">Your Output:</span>
                            <pre className={`bg-white border border-slate-200 p-2.5 rounded-xl mt-1 overflow-x-auto font-mono shadow-inner ${tr.passed ? 'text-emerald-800 font-bold' : 'text-rose-700 font-bold'}`}>
                              {tr.actualOutput || '(No output produced)'}
                            </pre>
                          </div>
                        </div>
                      </div>
                    ))}
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

      {/* AI Viva Verification Modal (Sections 29 - 33) */}
      {activeViva && (
        <AiVivaModal
          vivaId={activeViva.vivaId}
          questionText={activeViva.questionText}
          initialRemainingSec={activeViva.remainingSec ?? 60}
          onCompleted={(outcome) => {
            setActiveViva(null);
            if (outcome?.submittedBeforeTimeout) {
              toast.success('AI Viva explanation recorded successfully.');
            }
          }}
        />
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
              className="w-full py-2.5 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-semibold text-xs transition active:scale-95 cursor-pointer shadow-md"
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
