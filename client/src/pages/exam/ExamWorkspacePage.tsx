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
  const [activeBottomTab, setActiveBottomTab] = useState<'tests' | 'telemetry'>('tests');
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
      setActiveBottomTab('tests');
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
      setActiveBottomTab('tests');
      if (res.verdict === 'ACCEPTED') {
        setIsLocked(true);
        const draftKey = `logicq_exam_draft_${attemptId || (assignmentId + '_' + problemId)}`;
        try { localStorage.removeItem(draftKey); } catch {}
        setAcademicScore(res.academicScore);
        confetti({ particleCount: 80, spread: 70, origin: { y: 0.6 } });
        toast.success(`ACCEPTED! Score: ${res.academicScore} Mark. Question is now permanently locked.`);

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

  return (
    <div className="fixed inset-0 z-40 w-full h-[100dvh] max-h-[100dvh] bg-[var(--bg-base)] text-[var(--text-main)] flex flex-col overflow-hidden">
      {/* Top Proctoring & Institutional Header Bar */}
      <header className="bg-[var(--bg-panel)] border-b border-[var(--border-line)] px-4 py-2.5 flex items-center justify-between text-xs font-mono">
        <div className="flex items-center gap-3">
          <Link
            to="/student/tests"
            className="flex items-center gap-1.5 text-[var(--text-muted)] hover:text-[var(--text-main)] transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">My Tests</span>
          </Link>
          <span className="text-[var(--text-muted)] opacity-50">|</span>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="font-semibold text-[var(--text-main)] truncate max-w-[200px] sm:max-w-xs">
              {problemData?.title || 'Loading Question...'}
            </span>
          </div>
          {variantId && (
            <span className="hidden md:inline-flex px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border border-cyan-500/30 text-[11px]">
              Variant: {variantId}
            </span>
          )}
        </div>

        {/* Live Proctoring & Time Indicator */}
        <div className="flex items-center gap-4">
          {/* Time Badge (Section 5) */}
          <div
            className={`flex items-center gap-1.5 px-3 py-1 rounded-full border ${
              isWithinPrescribedTime
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400'
                : 'bg-amber-500/10 border-amber-500/30 text-amber-600 dark:text-amber-400'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span className="font-bold">{formatTime(elapsedSec)}</span>
            <span className="hidden lg:inline text-[10px] text-[var(--text-muted)]">
              / max {problemData?.expectedTimeMax ?? 8}m ({isWithinPrescribedTime ? '1.0 Mark' : '0.5 Mark'})
            </span>
          </div>

          {/* Raise Issue Button */}
          <button
            onClick={() => setIsIssueModalOpen(true)}
            className="flex items-center gap-1 px-2.5 py-1 rounded bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 text-rose-400 transition-colors"
            title="Flag question issue to faculty"
          >
            <Flag className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Raise Issue</span>
          </button>

          {/* Fullscreen Button */}
          <button
            onClick={toggleFullscreen}
            className="flex items-center gap-1 px-2.5 py-1 rounded bg-[var(--bg-surface)] hover:bg-[var(--bg-surface-hover)] border border-[var(--border-line)] text-[var(--text-main)] transition-colors"
            title="Toggle Proctoring Fullscreen Mode"
          >
            {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
            <span className="hidden sm:inline">{isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}</span>
          </button>
        </div>
      </header>

      {/* Permanent Locked Banner (Section 7) */}
      {isLocked && (
        <div className="bg-emerald-500/10 border-b border-emerald-500/30 px-4 py-3 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2.5 text-emerald-700 dark:text-emerald-300 font-mono">
            <Lock className="w-4 h-4 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
            <span>
              <strong>QUESTION PERMANENTLY LOCKED:</strong> Your solution was accepted ({academicScore ?? 1.0} mark awarded). Under institutional examination policy, no reattempts, edits, or resets are permitted.
            </span>
          </div>
          <Link
            to="/student/tests"
            className="px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold font-mono text-xs transition-colors whitespace-nowrap shadow-sm"
          >
            Next Question in Test →
          </Link>
        </div>
      )}

      {/* Mobile Segmented Switcher (Statement | Editor & Results) */}
      <div className="lg:hidden flex items-center bg-[var(--bg-surface)] border-b border-[var(--border-line)] px-2 py-1.5 gap-1.5 shrink-0">
        <button
          type="button"
          onClick={() => setActiveMobileTab('statement')}
          className={`flex-1 py-1.5 text-xs font-mono rounded-lg transition-colors flex items-center justify-center gap-1.5 ${
            activeMobileTab === 'statement'
              ? 'bg-[var(--bg-panel)] text-cyan-400 font-bold border border-[var(--border-line)] shadow-sm'
              : 'text-[var(--text-muted)]'
          }`}
        >
          <span>Statement</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveMobileTab('editor')}
          className={`flex-1 py-1.5 text-xs font-mono rounded-lg transition-colors flex items-center justify-center gap-1.5 ${
            activeMobileTab === 'editor'
              ? 'bg-[var(--bg-panel)] text-cyan-400 font-bold border border-[var(--border-line)] shadow-sm'
              : 'text-[var(--text-muted)]'
          }`}
        >
          <span>Editor &amp; Results</span>
        </button>
      </div>

      {/* Main Two-Pane Split Layout */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden min-h-0">
        {/* Left Pane: Question Statement & Visible Test Cases (Section 6) */}
        <div className={`w-full lg:w-1/2 p-4 sm:p-6 overflow-y-auto border-r border-[var(--border-line)] bg-[var(--bg-panel)] space-y-6 ${
          activeMobileTab === 'statement' ? 'flex-1' : 'hidden lg:block'
        }`}>
          <div>
            <div className="flex items-center gap-2 text-xs font-mono text-[var(--text-muted)] mb-2">
              <span>{problemData?.module}</span>
              <span>•</span>
              <span>{problemData?.difficulty} (Expected: {problemData?.expectedTimeMin}-{problemData?.expectedTimeMax} mins)</span>
            </div>
            <h1 className="text-2xl font-bold text-[var(--text-main)] tracking-tight">
              {problemData?.title}
            </h1>
          </div>

          {problemData?.scenario && (
            <div className="bg-[var(--bg-surface)] border border-[var(--border-line)] rounded-xl p-4 text-sm text-[var(--text-main)] leading-relaxed">
              <div className="text-xs font-mono text-cyan-600 dark:text-cyan-400 font-semibold mb-1 uppercase tracking-wider">
                Engineering Scenario
              </div>
              {problemData.scenario}
            </div>
          )}

          {problemData?.description && (
            <div className="prose dark:prose-invert max-w-none text-sm text-[var(--text-main)]">
              <StatementMarkdown content={problemData.description} />
            </div>
          )}

          {/* Visible Test Cases (Section 6: Exactly 2 visible sample tests) */}
          <div className="space-y-4 pt-4 border-t border-[var(--border-line)]">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-[var(--text-main)] uppercase tracking-wider font-mono">
                Visible Test Cases (2 Sample Tests)
              </h3>
              <span className="text-[11px] font-mono text-[var(--text-muted)]">
                Hidden Test 3 executed server-side
              </span>
            </div>

            {problemData?.visibleTestCases?.map((tc: any, idx: number) => (
              <div
                key={tc.id || idx}
                className="bg-[var(--bg-surface)] border border-[var(--border-line)] rounded-xl p-4 font-mono text-xs space-y-2"
              >
                <div className="flex items-center justify-between text-[var(--text-muted)]">
                  <span className="font-semibold text-[var(--text-main)]">Sample Test Case #{idx + 1}</span>
                  <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold">Visible</span>
                </div>
                <div>
                  <div className="text-[var(--text-muted)] text-[11px]">Input:</div>
                  <pre className="bg-[var(--bg-base)] border border-[var(--border-line)] p-2 rounded text-[var(--text-main)] mt-0.5 overflow-x-auto">
                    {tc.input}
                  </pre>
                </div>
                <div>
                  <div className="text-[var(--text-muted)] text-[11px]">Expected Output:</div>
                  <pre className="bg-[var(--bg-base)] border border-[var(--border-line)] p-2 rounded text-[var(--text-main)] mt-0.5 overflow-x-auto">
                    {tc.expectedOutput}
                  </pre>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right Pane: Code Editor & Execution Panel */}
        <div className={`w-full lg:w-1/2 flex flex-col border-t lg:border-t-0 border-[var(--border-line)] bg-[var(--bg-base)] ${
          activeMobileTab === 'editor' ? 'flex-1' : 'hidden lg:flex'
        }`}>
          {/* Editor Header Bar */}
          <div className="bg-[var(--bg-panel)] border-b border-[var(--border-line)] px-3 sm:px-4 py-2 flex items-center justify-between text-xs font-mono">
            <span className="hidden sm:inline text-[var(--text-muted)] font-semibold">C11 Editor (GCC Sandbox)</span>
            <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
              <button
                disabled={isLocked || runMutation.isPending || submitMutation.isPending}
                onClick={() => {
                  setActiveMobileTab('editor');
                  runMutation.mutate();
                }}
                className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg bg-[var(--bg-surface)] hover:bg-[var(--bg-surface-hover)] border border-[var(--border-line)] disabled:opacity-50 text-[var(--text-main)] font-medium transition-colors text-xs cursor-pointer"
              >
                <Play className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400 fill-cyan-600 dark:fill-cyan-400" />
                <span className="hidden sm:inline">{runMutation.isPending ? 'Running...' : 'Run Visible Tests'}</span>
                <span className="sm:hidden">{runMutation.isPending ? 'Running...' : 'Run Tests'}</span>
              </button>

              <button
                disabled={isLocked || runMutation.isPending || submitMutation.isPending}
                onClick={() => {
                  setActiveMobileTab('editor');
                  submitMutation.mutate();
                }}
                className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-medium transition-colors shadow-md shadow-emerald-900/20 text-xs cursor-pointer"
              >
                <Send className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">{submitMutation.isPending ? 'Evaluating...' : 'Submit Solution'}</span>
                <span className="sm:hidden">{submitMutation.isPending ? 'Evaluating...' : 'Submit'}</span>
              </button>
            </div>
          </div>

          {/* Monaco Editor Container with Clipboard Interceptors (Section 20) */}
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
            />
          </div>

          {/* Bottom Execution & Telemetry Results Drawer */}
          <div className="h-56 border-t border-[var(--border-line)] bg-[var(--bg-panel)] flex flex-col font-mono text-xs">
            {/* Tabs */}
            <div className="flex items-center justify-between border-b border-[var(--border-line)] px-3 bg-[var(--bg-surface)]">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setActiveBottomTab('tests')}
                  className={`px-3 py-2 border-b-2 font-medium transition-colors flex items-center gap-1.5 ${
                    activeBottomTab === 'tests'
                      ? 'border-cyan-500 text-[var(--text-main)]'
                      : 'border-transparent text-[var(--text-muted)] hover:text-[var(--text-main)]'
                  }`}
                >
                  <Terminal className="w-3.5 h-3.5" />
                  <span>Execution Results</span>
                </button>
                <button
                  onClick={() => setActiveBottomTab('telemetry')}
                  className={`px-3 py-2 border-b-2 font-medium transition-colors flex items-center gap-1.5 ${
                    activeBottomTab === 'telemetry'
                      ? 'border-cyan-500 text-[var(--text-main)]'
                      : 'border-transparent text-[var(--text-muted)] hover:text-[var(--text-main)]'
                  }`}
                >
                  <Activity className="w-3.5 h-3.5" />
                  <span>Proctoring Telemetry</span>
                </button>
              </div>

              {testResults.length > 0 && (
                <div className="text-[11px] text-[var(--text-muted)]">
                  Passed: {testResults.filter((t) => t.passed).length} / {testResults.length}
                </div>
              )}
            </div>

            {/* Results Content */}
            <div className="flex-1 p-3 overflow-y-auto">
              {activeBottomTab === 'tests' ? (
                testResults.length === 0 ? (
                  <div className="h-full flex items-center justify-center text-[var(--text-muted)] text-xs">
                    Press "Run Visible Tests" to evaluate against sample test cases 1 & 2.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {testResults.map((tr: any, idx: number) => (
                      <div
                        key={idx}
                        className={`p-3 rounded-lg border text-xs space-y-1.5 ${
                          tr.passed
                            ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-200'
                            : 'bg-red-500/10 border-red-500/30 text-red-700 dark:text-red-200'
                        }`}
                      >
                        <div className="flex items-center justify-between font-bold">
                          <span className="flex items-center gap-1.5">
                            {tr.passed ? (
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                            ) : (
                              <XCircle className="w-3.5 h-3.5 text-red-500" />
                            )}
                            Test Case #{tr.testIndex} {tr.isHidden ? '(Hidden Server-Side Test)' : '(Visible)'}
                          </span>
                          <span className="text-[11px]">{tr.verdict} ({tr.runtimeMs ?? 0}ms)</span>
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-[11px] pt-1">
                          <div>
                            <span className="text-[var(--text-muted)]">Expected:</span>
                            <pre className="bg-[var(--bg-base)] border border-[var(--border-line)] text-[var(--text-main)] p-1 rounded mt-0.5">{tr.expectedOutput}</pre>
                          </div>
                          <div>
                            <span className="text-[var(--text-muted)]">Actual:</span>
                            <pre className="bg-[var(--bg-base)] border border-[var(--border-line)] text-[var(--text-main)] p-1 rounded mt-0.5">{tr.actualOutput}</pre>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )
              ) : (
                /* Telemetry Panel (Sections 20 - 28) */
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                  <div className="bg-[var(--bg-surface)] p-2.5 rounded border border-[var(--border-line)]">
                    <div className="text-[var(--text-muted)] text-[10px]">Tab Switches</div>
                    <div className="text-sm font-bold text-[var(--text-main)] mt-1">{tabSwitchCount}</div>
                  </div>
                  <div className="bg-[var(--bg-surface)] p-2.5 rounded border border-[var(--border-line)]">
                    <div className="text-[var(--text-muted)] text-[10px]">Fullscreen Exits</div>
                    <div className="text-sm font-bold text-[var(--text-main)] mt-1">{fullScreenExitCount}</div>
                  </div>
                  <div className="bg-[var(--bg-surface)] p-2.5 rounded border border-[var(--border-line)]">
                    <div className="text-[var(--text-muted)] text-[10px]">Clipboard Blocked</div>
                    <div className="text-sm font-bold text-[var(--text-main)] mt-1">{copyPasteAttempts + cutAttempts}</div>
                  </div>
                  <div className="bg-[var(--bg-surface)] p-2.5 rounded border border-[var(--border-line)]">
                    <div className="text-[var(--text-muted)] text-[10px]">Largest Burst</div>
                    <div className="text-sm font-bold text-[var(--text-main)] mt-1">{largestBurstChars} chars</div>
                  </div>
                  <div className="bg-[var(--bg-surface)] p-2.5 rounded border border-[var(--border-line)]">
                    <div className="text-[var(--text-muted)] text-[10px]">Total Keystrokes</div>
                    <div className="text-sm font-bold text-[var(--text-main)] mt-1">{totalKeystrokes}</div>
                  </div>
                  <div className="bg-[var(--bg-surface)] p-2.5 rounded border border-[var(--border-line)]">
                    <div className="text-[var(--text-muted)] text-[10px]">Active Work Time</div>
                    <div className="text-sm font-bold text-[var(--text-main)] mt-1">{activeSec}s</div>
                  </div>
                  <div className="bg-[var(--bg-surface)] p-2.5 rounded border border-[var(--border-line)]">
                    <div className="text-[var(--text-muted)] text-[10px]">Focus Loss Duration</div>
                    <div className="text-sm font-bold text-[var(--text-main)] mt-1">{(totalFocusLossMsRef.current / 1000).toFixed(1)}s</div>
                  </div>
                  <div className="bg-gray-950 p-2.5 rounded border border-gray-800">
                    <div className="text-gray-500 text-[10px]">Proctoring Mode</div>
                    <div className="text-sm font-bold text-emerald-400 mt-1">Active</div>
                  </div>
                </div>
              )}
            </div>
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
