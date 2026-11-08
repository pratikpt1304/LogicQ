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
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [tabSwitchCount, setTabSwitchCount] = useState<number>(0);
  const [focusLossCount, setFocusLossCount] = useState<number>(0);
  const [fullScreenExitCount, setFullScreenExitCount] = useState<number>(0);
  const [copyPasteAttempts, setCopyPasteAttempts] = useState<number>(0);
  const [cutAttempts, setCutAttempts] = useState<number>(0);
  const [contextMenuAttempts, setContextMenuAttempts] = useState<number>(0);
  const [totalKeystrokes, setTotalKeystrokes] = useState<number>(0);
  const [largestBurstChars, setLargestBurstChars] = useState<number>(0);
  const [activeSec, setActiveSec] = useState<number>(0);

  const lastActivityRef = useRef<number>(Date.now());
  const focusLossStartRef = useRef<number | null>(null);
  const totalFocusLossMsRef = useRef<number>(0);
  const previousCodeLenRef = useRef<number>(0);

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

  // 4. Fullscreen & Focus Proctoring Event Listeners (Section 21)
  useEffect(() => {
    const handleFullscreenChange = () => {
      const active = Boolean(document.fullscreenElement);
      setIsFullscreen(active);
      if (!active && !isLocked) {
        setFullScreenExitCount((c) => {
          const next = c + 1;
          sendTelemetryPing({ fullScreenExitCount: next });
          return next;
        });
        toast.warning('Proctoring Notice: Exiting full-screen mode is recorded on your institutional integrity audit.', {
          duration: 4000,
        });
      }
    };

    const handleVisibilityChange = () => {
      if (document.hidden && !isLocked) {
        setTabSwitchCount((c) => {
          const next = c + 1;
          sendTelemetryPing({ tabSwitchCount: next });
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
  }, [isLocked, sendTelemetryPing]);

  const toggleFullscreen = async () => {
    try {
      if (!document.fullscreenElement) {
        await document.documentElement.requestFullscreen();
      } else {
        await document.exitFullscreen();
      }
    } catch {
      toast.error('Unable to toggle fullscreen in this browser.');
    }
  };

  // 4. Anti-Copying Clipboard Guards (Section 20)
  const handleEditorBlockedAction = (actionName: string) => {
    if (isLocked) return;
    if (actionName === 'copy' || actionName === 'paste') {
      setCopyPasteAttempts((c) => c + 1);
    } else if (actionName === 'cut') {
      setCutAttempts((c) => c + 1);
    } else if (actionName === 'contextmenu') {
      setContextMenuAttempts((c) => c + 1);
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
      });
    },
    onSuccess: (res) => {
      setTestResults(res.testResults || []);
      setActiveBottomTab('output');
      setIsDrawerOpen(true);
      const allPassed = res.testResults?.every((t: any) => t.passed);
      if (allPassed) {
        toast.success('Both visible test cases passed! Proceed to Final Submit when ready.');
      } else {
        toast.info('Visible test cases evaluated. Check output panel for mismatches.');
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
        toast.success(`ACCEPTED! Score: ${res.academicScore} Mark. Question is now permanently locked.`);

        // Record submission in Firestore and broadcast to all faculty & admin dashboards
        const uid = (user as any)?.uid || (user as any)?.id || auth.currentUser?.uid || 'current';
        FirestoreDataService.recordDailySubmission(uid, {
          problemId: problemId || assignmentId || 'exam-q1',
          problemTitle: problemData?.title || 'Continuous Internal Evaluation Question',
          problemSlug: problemId || assignmentId || 'exam-q1',
          difficulty: problemData?.difficulty || 'MEDIUM',
          code,
          verdict: res.verdict,
          timeTakenSeconds: elapsedSec,
          submissionType: 'ASSESSMENT',
          prn: user?.prn || '',
          studentPrn: user?.prn || '',
          email: user?.email || '',
          studentEmail: user?.email || '',
          studentName: user?.fullName || user?.displayName || '',
        }).catch(() => {});
        RealtimeSyncService.emit('SUBMISSIONS');
        RealtimeSyncService.emit('DASHBOARD');
        RealtimeSyncService.emit('TESTS');

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

  // Timing metrics calculation
  const expectedMaxSec = (problemData?.expectedTimeMax ?? 8) * 60;
  const isWithinPrescribedTime = elapsedSec <= expectedMaxSec;
  const formatTime = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
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
    <div className="fixed inset-0 z-40 w-full h-[100dvh] max-h-[100dvh] bg-[#090d16] text-slate-100 flex flex-col overflow-hidden select-none font-sans">
      {/* 0. Fullscreen Proctored Requirement Callout (When not fullscreen) */}
      {!isFullscreen && !isLocked && (
        <div className="bg-gradient-to-r from-indigo-950 via-slate-900 to-indigo-950 border-b border-indigo-500/30 px-4 py-2.5 flex flex-col sm:flex-row items-center justify-between gap-2.5 text-xs font-mono shadow-md shrink-0">
          <div className="flex items-center gap-2.5 text-indigo-200">
            <span className="p-1 rounded-md bg-amber-500/20 text-amber-400 shrink-0">
              <ShieldAlert className="w-4 h-4 animate-pulse" />
            </span>
            <span>
              <strong>PROCTORED EXAM ENVIRONMENT:</strong> Fullscreen mode is required to maintain institutional proctoring compliance and prevent distraction.
            </span>
          </div>
          <button
            type="button"
            onClick={toggleFullscreen}
            className="px-4 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold flex items-center gap-2 shadow-sm transition active:scale-95 cursor-pointer whitespace-nowrap text-xs"
          >
            <Maximize2 className="w-3.5 h-3.5" />
            <span>Enter Fullscreen Exam</span>
          </button>
        </div>
      )}

      {/* Top Proctoring & Institutional Header Bar */}
      <header className="bg-[#0c101a] border-b border-slate-800 px-4 py-2.5 flex items-center justify-between text-xs font-mono shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          <Link
            to="/student/tests"
            className="flex items-center gap-1.5 text-slate-400 hover:text-white transition-colors shrink-0"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">All Tests</span>
          </Link>
          <span className="text-slate-700">|</span>
          <div className="flex items-center gap-2 min-w-0">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shrink-0" />
            <span className="font-bold text-white truncate max-w-[200px] sm:max-w-md">
              {problemData?.title || 'Continuous Practical Assessment'}
            </span>
          </div>
          <span className="hidden md:inline-flex px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 text-[10px] font-bold">
            {problemData?.difficulty || 'HARD'}
          </span>
        </div>

        {/* Live Proctoring & Time Indicator */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          {/* Time Badge */}
          <div
            className={`flex items-center gap-1.5 px-3 py-1 rounded-full border text-xs font-mono font-bold ${
              isWithinPrescribedTime
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                : 'bg-amber-500/10 border-amber-500/30 text-amber-400'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>{formatTime(elapsedSec)}</span>
            <span className="hidden lg:inline text-[10px] text-slate-400 font-normal">
              / max {problemData?.expectedTimeMax ?? 8}m
            </span>
          </div>

          {/* Integrity Badge */}
          <div className="hidden sm:flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-mono">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>100% Integrity</span>
          </div>

          {/* Raise Issue Button */}
          <button
            onClick={() => setIsIssueModalOpen(true)}
            className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 text-rose-400 transition-colors text-xs"
            title="Flag question issue to faculty"
          >
            <Flag className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Raise Issue</span>
          </button>

          {/* Fullscreen Button */}
          <button
            onClick={toggleFullscreen}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer ${
              isFullscreen
                ? 'bg-slate-800 text-slate-300 border border-slate-700 hover:bg-slate-700'
                : 'bg-indigo-600 text-white hover:bg-indigo-500'
            }`}
            title="Toggle Fullscreen Mode"
          >
            {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
            <span className="hidden sm:inline">{isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}</span>
          </button>
        </div>
      </header>

      {/* Permanent Locked Banner */}
      {isLocked && (
        <div className="bg-emerald-500/10 border-b border-emerald-500/30 px-4 py-3 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs shrink-0">
          <div className="flex items-center gap-2.5 text-emerald-300 font-mono">
            <Lock className="w-4 h-4 text-emerald-400 flex-shrink-0" />
            <span>
              <strong>QUESTION PERMANENTLY LOCKED:</strong> Your solution was accepted ({academicScore ?? 1.0} mark awarded). Under examination policy, edits and resets are locked.
            </span>
          </div>
          <Link
            to="/student/tests"
            className="px-4 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold font-mono text-xs transition-colors whitespace-nowrap shadow-sm"
          >
            Return to Tests Overview →
          </Link>
        </div>
      )}

      {/* Mobile Segmented Switcher (Statement | Editor & Results) */}
      <div className="lg:hidden flex items-center bg-[#0c101a] border-b border-slate-800 px-2 py-1.5 gap-1.5 shrink-0">
        <button
          type="button"
          onClick={() => setActiveMobileTab('statement')}
          className={`flex-1 py-1.5 text-xs font-mono rounded-lg transition-colors flex items-center justify-center gap-1.5 ${
            activeMobileTab === 'statement'
              ? 'bg-slate-800 text-cyan-400 font-bold border border-slate-700 shadow-sm'
              : 'text-slate-400'
          }`}
        >
          <span>Problem Statement</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveMobileTab('editor')}
          className={`flex-1 py-1.5 text-xs font-mono rounded-lg transition-colors flex items-center justify-center gap-1.5 ${
            activeMobileTab === 'editor'
              ? 'bg-slate-800 text-cyan-400 font-bold border border-slate-700 shadow-sm'
              : 'text-slate-400'
          }`}
        >
          <span>Editor &amp; Output</span>
        </button>
      </div>

      {/* Main Two-Pane Split Layout (LeetCode / HackerRank layout: Left Statement, Right Editor) */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden min-h-0">
        {/* Left Pane on desktop: Question Statement & Visible Test Cases */}
        <div className={`w-full lg:w-[48%] flex flex-col border-b lg:border-b-0 lg:border-r border-slate-800 bg-[#0e131f] text-slate-200 overflow-y-auto lg:order-1 ${
          activeMobileTab === 'statement' ? 'flex-1' : 'hidden lg:flex'
        }`}>
          <div className="p-5 sm:p-7 space-y-6">
            {/* Title & Metadata */}
            <div className="space-y-3 pb-5 border-b border-slate-800">
              <div className="flex flex-wrap items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-mono font-bold uppercase tracking-wider bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                  {problemData?.difficulty || 'HARD'}
                </span>
                <span className="text-xs text-slate-400 font-mono">
                  ⏱️ Max Time: {problemData?.expectedTimeMin || 15}-{problemData?.expectedTimeMax || 25} Mins
                </span>
                <span className="text-xs text-slate-600">•</span>
                <span className="text-xs text-emerald-400 font-mono font-bold">
                  20.0 Marks
                </span>
              </div>

              <h1 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight">
                {problemData?.title || 'Continuous Practical Assessment'}
              </h1>
            </div>

            {problemData?.scenario && (
              <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 text-xs font-mono text-slate-300 leading-relaxed">
                <div className="text-[10px] text-cyan-400 font-bold mb-1 uppercase tracking-wider">
                  Engineering Context &amp; Objective
                </div>
                {problemData.scenario}
              </div>
            )}

            {/* Description */}
            <div className="space-y-2">
              <div className="text-[11px] font-mono font-bold uppercase tracking-wider text-slate-400">
                Problem Description
              </div>
              <div className="text-sm text-slate-300 leading-relaxed font-sans bg-slate-900/50 p-4 rounded-2xl border border-slate-800/80">
                <StatementMarkdown content={problemData?.description || 'Implement the required algorithm conforming to the specifications.'} />
              </div>
            </div>

            {/* Visible Sample Test Cases */}
            <div className="space-y-4 pt-2">
              <div className="flex items-center justify-between">
                <div className="text-[11px] font-mono font-bold uppercase tracking-wider text-slate-400">
                  Visible Test Cases (2 Sample Tests)
                </div>
                <span className="text-[10px] font-mono text-slate-500">
                  Hidden test executed server-side
                </span>
              </div>

              <div className="space-y-3">
                {visibleCasesList.map((tc: any, idx: number) => (
                  <div
                    key={tc.id || idx}
                    className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 font-mono text-xs space-y-3"
                  >
                    <div className="flex items-center justify-between text-slate-400">
                      <span className="font-bold text-white">Sample Case #{idx + 1}</span>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-bold">
                        VISIBLE
                      </span>
                    </div>

                    <div className="space-y-1">
                      <div className="text-[10px] uppercase font-bold text-slate-500">Input:</div>
                      <pre className="p-3 rounded-xl bg-[#060810] border border-slate-800 text-cyan-300 font-mono overflow-x-auto">
                        {tc.input}
                      </pre>
                    </div>

                    <div className="space-y-1">
                      <div className="text-[10px] uppercase font-bold text-emerald-500">Expected Output:</div>
                      <pre className="p-3 rounded-xl bg-[#060810] border border-slate-800 text-emerald-400 font-mono font-bold overflow-x-auto">
                        {tc.expectedOutput}
                      </pre>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Institutional Rules */}
            <div className="p-4 rounded-2xl bg-indigo-500/5 border border-indigo-500/15 text-xs font-mono text-slate-400 space-y-1.5">
              <div className="text-indigo-400 font-bold flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4" />
                <span>Compiler &amp; Environment Rules:</span>
              </div>
              <ul className="list-disc list-inside space-y-1 text-slate-400 text-[11px]">
                <li>Compiled using GCC 14 with standard C11 flag (`-std=c11 -O2`).</li>
                <li>Standard input/output via stdin and stdout.</li>
                <li>Code is auto-saved continuously; locking takes place automatically upon final submission.</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Right Pane on desktop: Code Editor & Execution Panel */}
        <div className={`w-full lg:w-[52%] flex flex-col bg-[#0a0d14] lg:order-2 ${
          activeMobileTab === 'editor' ? 'flex-1' : 'hidden lg:flex'
        }`}>
          {/* Single Clean Editor Header Bar */}
          <div className="bg-[#0c101a] border-b border-slate-800 px-4 py-2 flex items-center justify-between text-xs font-mono shrink-0">
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full bg-rose-500/90" />
                <div className="w-2.5 h-2.5 rounded-full bg-amber-500/90" />
                <div className="w-2.5 h-2.5 rounded-full bg-emerald-500/90" />
              </div>
              <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-[#161c2b] border border-slate-700/60 text-slate-200 font-mono text-[11px] font-semibold">
                <span>solution.c</span>
                <span className="text-[9px] px-1 rounded bg-cyan-500/20 text-cyan-400 font-bold">C11</span>
              </div>
              <span className="hidden sm:inline-flex items-center gap-1 text-[11px] text-slate-400">
                • GCC 14 (-std=c11)
              </span>
            </div>

            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] font-mono">
                <ShieldCheck className="w-3 h-3" />
                <span>Proctored</span>
              </span>
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

          {/* Bottom Execution Dock (Apple-style Segmented Dock identical to Daily Challenge) */}
          <div
            className={`border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0c1017] shadow-xl transition-[height] duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] flex flex-col shrink-0 overflow-hidden ${
              isDrawerOpen ? 'h-64 sm:h-72 max-h-[48%]' : 'h-12'
            }`}
          >
            {/* Dock Header Bar */}
            <div className="flex items-center justify-between px-3 sm:px-4 py-1.5 bg-slate-50 dark:bg-[#111622] border-b border-slate-200 dark:border-slate-800 shrink-0 font-mono text-xs">
              <div className="inline-flex items-center gap-1 p-1 rounded-xl bg-slate-200/80 dark:bg-[#080c14] border border-slate-300/80 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => {
                    setActiveBottomTab('cases');
                    setIsDrawerOpen(true);
                  }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                    activeBottomTab === 'cases' && isDrawerOpen
                      ? 'bg-white dark:bg-slate-800 text-cyan-700 dark:text-cyan-400 border border-slate-300 dark:border-cyan-500/40 shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-white/60 dark:hover:bg-slate-800/50'
                  }`}
                >
                  <Layers className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" />
                  <span>Test Cases ({visibleCasesList.length})</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setActiveBottomTab('output');
                    setIsDrawerOpen(true);
                  }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                    activeBottomTab === 'output' && isDrawerOpen
                      ? 'bg-white dark:bg-slate-800 text-cyan-700 dark:text-cyan-400 border border-slate-300 dark:border-cyan-500/40 shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-white/60 dark:hover:bg-slate-800/50'
                  }`}
                >
                  <Cpu className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" />
                  <span>Verdict &amp; Output</span>
                  {testResults.length > 0 && (
                    <span className="text-[10px] font-mono px-1.5 py-0.2 rounded-full bg-cyan-500/20 text-cyan-400 border border-cyan-500/30">
                      {testResults.filter((t: any) => t.passed).length}/{testResults.length}
                    </span>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setActiveBottomTab('telemetry');
                    setIsDrawerOpen(true);
                  }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                    activeBottomTab === 'telemetry' && isDrawerOpen
                      ? 'bg-white dark:bg-slate-800 text-cyan-700 dark:text-cyan-400 border border-slate-300 dark:border-cyan-500/40 shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-white/60 dark:hover:bg-slate-800/50'
                  }`}
                >
                  <Activity className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" />
                  <span className="hidden sm:inline">Telemetry</span>
                </button>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={isLocked || runMutation.isPending || submitMutation.isPending}
                  onClick={() => {
                    setActiveMobileTab('editor');
                    runMutation.mutate();
                  }}
                  className="flex items-center gap-1.5 px-3 py-1 text-xs font-mono font-bold text-white bg-gradient-to-r from-teal-600 to-cyan-600 hover:from-teal-500 hover:to-cyan-500 rounded-lg shadow-sm transition-all cursor-pointer disabled:opacity-50 transform hover:scale-[1.02] active:scale-[0.98]"
                  title="Run Visible Tests (Ctrl + Enter)"
                >
                  {runMutation.isPending ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Running...</span>
                    </>
                  ) : (
                    <>
                      <Play className="w-3.5 h-3.5 fill-current" />
                      <span>Run Visible Tests</span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  disabled={isLocked || runMutation.isPending || submitMutation.isPending}
                  onClick={() => {
                    setActiveMobileTab('editor');
                    submitMutation.mutate();
                  }}
                  className="flex items-center gap-1.5 px-3.5 py-1 text-xs font-mono font-bold text-white bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 rounded-lg shadow-sm transition-all cursor-pointer disabled:opacity-50 transform hover:scale-[1.02] active:scale-[0.98]"
                  title="Final Submit Solution"
                >
                  {submitMutation.isPending ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Evaluating...</span>
                    </>
                  ) : (
                    <>
                      <Send className="w-3.5 h-3.5" />
                      <span>Submit</span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  aria-label={isDrawerOpen ? 'Collapse execution drawer' : 'Expand execution drawer'}
                  onClick={() => setIsDrawerOpen(!isDrawerOpen)}
                  className="px-2.5 py-1 rounded-lg text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/80 dark:hover:bg-slate-800 border border-slate-300 dark:border-slate-700 transition-all flex items-center gap-1 font-mono text-xs cursor-pointer"
                >
                  <span className="font-semibold">{isDrawerOpen ? 'Collapse' : 'Expand'}</span>
                  <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-300 ${isDrawerOpen ? 'rotate-0' : 'rotate-180'}`} />
                </button>
              </div>
            </div>

            {/* Dock Body */}
            {isDrawerOpen && (
              <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain p-3.5 font-mono text-xs bg-white dark:bg-[#0c1017]">
                {activeBottomTab === 'cases' && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between pb-1">
                      <div className="flex items-center gap-1.5">
                        {visibleCasesList.map((_: any, idx: number) => (
                          <button
                            key={idx}
                            type="button"
                            onClick={() => setSelectedCaseIdx(idx)}
                            className={`px-3 py-1 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer ${
                              selectedCaseIdx === idx
                                ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-xs'
                                : 'bg-[#111622] text-slate-400 hover:text-white border border-slate-800'
                            }`}
                          >
                            Case {idx + 1}
                          </button>
                        ))}
                      </div>
                      <span className="text-[11px] font-mono text-slate-400">
                        Sample test cases for verification
                      </span>
                    </div>

                    {visibleCasesList[selectedCaseIdx] ? (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                        <div>
                          <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider mb-1">
                            INPUT:
                          </div>
                          <pre className="p-3 rounded-xl bg-[#050811] border border-slate-800 text-cyan-300 overflow-x-auto min-h-[50px] shadow-inner font-mono">
                            {visibleCasesList[selectedCaseIdx].input}
                          </pre>
                        </div>
                        <div>
                          <div className="text-[10px] uppercase font-bold text-emerald-500 tracking-wider mb-1">
                            EXPECTED OUTPUT:
                          </div>
                          <pre className="p-3 rounded-xl bg-[#050811] border border-slate-800 text-emerald-400 font-bold overflow-x-auto min-h-[50px] shadow-inner font-mono">
                            {visibleCasesList[selectedCaseIdx].expectedOutput}
                          </pre>
                        </div>
                      </div>
                    ) : (
                      <div className="text-center py-6 text-slate-400">Select a case above to inspect</div>
                    )}
                  </div>
                )}

                {activeBottomTab === 'output' && (
                  testResults.length === 0 ? (
                    <div className="h-full py-8 flex flex-col items-center justify-center text-[var(--text-muted)] text-xs space-y-1">
                      <Terminal className="w-6 h-6 text-slate-500 mb-1" />
                      <div>Click <strong>Run Visible Tests</strong> above to evaluate against sample test cases.</div>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {testResults.map((tr: any, idx: number) => (
                        <div
                          key={idx}
                          className={`p-3 rounded-xl border text-xs space-y-2 bg-[#050811] ${
                            tr.passed
                              ? 'border-emerald-500/30'
                              : 'border-rose-500/30'
                          }`}
                        >
                          <div className="flex items-center justify-between font-bold">
                            <span className="flex items-center gap-1.5">
                              {tr.passed ? (
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                              ) : (
                                <XCircle className="w-3.5 h-3.5 text-rose-400" />
                              )}
                              <span className={tr.passed ? 'text-emerald-400' : 'text-rose-400'}>
                                Test Case #{tr.testIndex} {tr.isHidden ? '(Hidden Server-Side Test)' : '(Visible)'}
                              </span>
                            </span>
                            <span className="text-[11px] font-mono text-slate-400">{tr.verdict} ({tr.runtimeMs ?? 0}ms)</span>
                          </div>
                          <div className="grid grid-cols-2 gap-2 text-[11px] pt-1">
                            <div>
                              <span className="text-[var(--text-muted)] uppercase text-[10px] font-bold">Expected:</span>
                              <pre className="bg-[#0c1017] border border-slate-800 text-emerald-400 p-2 rounded-lg mt-0.5 overflow-x-auto font-mono font-bold">{tr.expectedOutput}</pre>
                            </div>
                            <div>
                              <span className="text-[var(--text-muted)] uppercase text-[10px] font-bold">Actual:</span>
                              <pre className={`bg-[#0c1017] border border-slate-800 p-2 rounded-lg mt-0.5 overflow-x-auto font-mono ${tr.passed ? 'text-emerald-400' : 'text-rose-400 font-bold'}`}>{tr.actualOutput || '(No output)'}</pre>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )
                )}

                {activeBottomTab === 'telemetry' && (
                  /* Telemetry Panel (Sections 20 - 28) */
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                    <div className="bg-[#050811] p-2.5 rounded-xl border border-slate-800">
                      <div className="text-[var(--text-muted)] text-[10px]">Tab Switches</div>
                      <div className="text-sm font-bold text-[var(--text-main)] mt-1">{tabSwitchCount}</div>
                    </div>
                    <div className="bg-[#050811] p-2.5 rounded-xl border border-slate-800">
                      <div className="text-[var(--text-muted)] text-[10px]">Fullscreen Exits</div>
                      <div className="text-sm font-bold text-[var(--text-main)] mt-1">{fullScreenExitCount}</div>
                    </div>
                    <div className="bg-[#050811] p-2.5 rounded-xl border border-slate-800">
                      <div className="text-[var(--text-muted)] text-[10px]">Clipboard Blocked</div>
                      <div className="text-sm font-bold text-[var(--text-main)] mt-1">{copyPasteAttempts + cutAttempts}</div>
                    </div>
                    <div className="bg-[#050811] p-2.5 rounded-xl border border-slate-800">
                      <div className="text-[var(--text-muted)] text-[10px]">Largest Burst</div>
                      <div className="text-sm font-bold text-[var(--text-main)] mt-1">{largestBurstChars} chars</div>
                    </div>
                    <div className="bg-[#050811] p-2.5 rounded-xl border border-slate-800">
                      <div className="text-[var(--text-muted)] text-[10px]">Total Keystrokes</div>
                      <div className="text-sm font-bold text-[var(--text-main)] mt-1">{totalKeystrokes}</div>
                    </div>
                    <div className="bg-[#050811] p-2.5 rounded-xl border border-slate-800">
                      <div className="text-[var(--text-muted)] text-[10px]">Active Work Time</div>
                      <div className="text-sm font-bold text-[var(--text-main)] mt-1">{activeSec}s</div>
                    </div>
                    <div className="bg-[#050811] p-2.5 rounded-xl border border-slate-800">
                      <div className="text-[var(--text-muted)] text-[10px]">Focus Loss Duration</div>
                      <div className="text-sm font-bold text-[var(--text-main)] mt-1">{(totalFocusLossMsRef.current / 1000).toFixed(1)}s</div>
                    </div>
                    <div className="bg-[#050811] p-2.5 rounded-xl border border-emerald-500/40">
                      <div className="text-slate-400 text-[10px]">Proctoring Mode</div>
                      <div className="text-sm font-bold text-emerald-400 mt-1">Active</div>
                    </div>
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
    </div>
  );
};
export default ExamWorkspacePage;
