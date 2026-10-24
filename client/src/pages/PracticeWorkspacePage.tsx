import React, { useState, useEffect, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import confetti from 'canvas-confetti';
import { toast } from 'sonner';
import { api, LogicQApiError } from '../api/client.js';
import { useAuth } from '../context/AuthContext.js';
import { auth } from '../config/firebase.js';
import { FirestoreDataService } from '../services/firestoreData.service.js';
import { CodeEditor } from '../components/editor/CodeEditor.js';
import { DifficultyBadge, VerdictBadge } from '../components/common/Badge.js';
import { StatementMarkdown } from '../components/common/StatementMarkdown.js';
import {
  Play,
  Send,
  CheckCircle2,
  ChevronUp,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ArrowLeft,
  ArrowRight,
  Terminal,
  BookOpen,
  Cloud,
  AlertTriangle,
  RotateCcw,
  Layers,
  WifiOff,
  Clock,
  Trophy,
  Maximize2,
  Minimize2,
  X,
  ShieldCheck,
  ShieldAlert,
  Lock,
} from 'lucide-react';
import {
  DraftSyncService,
  DraftData,
  ConflictInfo,
  getDeviceLabel,
} from '../services/draftSync.service.js';
import { DraftConflictModal } from '../components/editor/DraftConflictModal.js';
import { PracticeTimer, PracticeTimerHandle } from '../components/practice/PracticeTimer.js';

interface ExecutionErrorState {
  message: string;
  code?: string;
  canRetry?: boolean;
  type: 'run' | 'submit';
}

function cleanDraftCode(raw: string): string {
  if (!raw) return '';
  return raw
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .replace(/^\uFEFF/, '')
    .trimEnd() + '\n';
}

export const PracticeWorkspacePage: React.FC = () => {
  const { moduleSlug, problemSlug } = useParams<{ moduleSlug: string; problemSlug: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const [activeMobileTab, setActiveMobileTab] = useState<'statement' | 'editor' | 'results'>('statement');
  const [code, setCode] = useState<string>('');
  const [customInput, setCustomInput] = useState<string>('');
  const [runResult, setRunResult] = useState<any | null>(null);
  const [submissionResult, setSubmissionResult] = useState<any | null>(null);
  const [executionError, setExecutionError] = useState<ExecutionErrorState | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(true);
  const [activeBottomTab, setActiveBottomTab] = useState<'custom' | 'output'>('custom');
  const [isProblemPickerOpen, setIsProblemPickerOpen] = useState(false);
  const pickerRef = useRef<HTMLDivElement>(null);

  const initializedProblemIdRef = useRef<string | null>(null);
  const pollTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const practiceTimerRef = useRef<PracticeTimerHandle | null>(null);
  const [draftSyncStatus, setDraftSyncStatus] = useState<'saved' | 'saving' | 'offline'>('saved');
  const [conflictInfo, setConflictInfo] = useState<ConflictInfo | null>(null);
  const autosaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const idempotencyKeyRef = useRef<string>(`prac-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`);

  // Proctored Anti-Cheat & Fullscreen State
  const [isFullscreen, setIsFullscreen] = useState(Boolean(document.fullscreenElement));
  const [fullscreenExits, setFullscreenExits] = useState(0);
  const [showFullscreenModal, setShowFullscreenModal] = useState(false);
  const [tabSwitchCount, setTabSwitchCount] = useState(0);
  const lastTabSwitchToastRef = useRef<number>(0);

  const requestFullscreen = async () => {
    try {
      if (!document.fullscreenElement) {
        await document.documentElement.requestFullscreen();
      }
      setIsFullscreen(true);
      setShowFullscreenModal(false);
    } catch {
      toast.error('Unable to enter fullscreen mode. Please grant browser permissions.');
    }
  };

  const toggleFullscreen = async () => {
    try {
      if (!document.fullscreenElement) {
        await document.documentElement.requestFullscreen();
      } else {
        await document.exitFullscreen();
      }
    } catch {
      toast.error('Unable to toggle fullscreen on this browser.');
    }
  };

  // Auto Fullscreen Enforcement on Question Open
  useEffect(() => {
    const timer = setTimeout(() => {
      if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen()
          .then(() => {
            setIsFullscreen(true);
            setShowFullscreenModal(false);
          })
          .catch(() => {
            // Browser policy blocked automatic fullscreen without user interaction -> show modal prompt
            setShowFullscreenModal(true);
          });
      } else {
        setIsFullscreen(true);
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [problemSlug]);

  // Fullscreen Exit Detection
  useEffect(() => {
    const handleFullscreenChange = () => {
      const active = Boolean(document.fullscreenElement);
      setIsFullscreen(active);
      if (!active) {
        setFullscreenExits((prev) => {
          const next = prev + 1;
          toast.error(`⚠️ Fullscreen exited! (Exit #${next}) Fullscreen is required in proctored mode.`, {
            duration: 6000,
          });
          setShowFullscreenModal(true);
          return next;
        });
      }
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, []);

  // Anti-Cheat: Tab Switch & Window Focus Loss Detection
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        setTabSwitchCount((prev) => prev + 1);
      } else {
        const now = Date.now();
        if (now - lastTabSwitchToastRef.current > 1500) {
          lastTabSwitchToastRef.current = now;
          toast.error('⚠️ Tab Switch Detected! All tab switches and window unfocus events are recorded.', {
            duration: 6000,
          });
        }
      }
    };

    const handleWindowBlur = () => {
      setTabSwitchCount((prev) => prev + 1);
      const now = Date.now();
      if (now - lastTabSwitchToastRef.current > 2000) {
        lastTabSwitchToastRef.current = now;
        toast.warning('⚠️ Window focus lost! Focus away from workspace is monitored.', {
          duration: 5000,
        });
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('blur', handleWindowBlur);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('blur', handleWindowBlur);
    };
  }, []);

  // Anti-Cheat: Strict Copy-Paste & Right-Click Prevention (Document-wide)
  useEffect(() => {
    const blockCopy = (e: ClipboardEvent) => {
      e.preventDefault();
      toast.error('🚫 Copying is strictly disabled in proctored mode! Type code manually.');
    };
    const blockCut = (e: ClipboardEvent) => {
      e.preventDefault();
      toast.error('🚫 Cutting text is disabled in proctored mode.');
    };
    const blockPaste = (e: ClipboardEvent) => {
      e.preventDefault();
      toast.error('🚫 Pasting is strictly blocked! Manual typing is required.');
    };
    const blockContextMenu = (e: MouseEvent) => {
      e.preventDefault();
    };

    document.addEventListener('copy', blockCopy);
    document.addEventListener('cut', blockCut);
    document.addEventListener('paste', blockPaste);
    document.addEventListener('contextmenu', blockContextMenu);

    return () => {
      document.removeEventListener('copy', blockCopy);
      document.removeEventListener('cut', blockCut);
      document.removeEventListener('paste', blockPaste);
      document.removeEventListener('contextmenu', blockContextMenu);
    };
  }, []);

  // Fetch problem details
  const {
    data: responseData,
    isLoading,
    error: problemError,
  } = useQuery({
    queryKey: ['practice-problem', problemSlug],
    queryFn: () => api.get(`/practice/problems/${problemSlug}`),
    refetchOnWindowFocus: false,
    retry: false,
  });

  // Fetch module problems list to enable Prev / Next navigation and dropdown picker
  const { data: moduleProblemsResponse } = useQuery({
    queryKey: ['practice-module-problems', moduleSlug],
    queryFn: () => api.get(`/practice/modules/${moduleSlug}/problems`),
    enabled: Boolean(moduleSlug),
    refetchOnWindowFocus: false,
  });

  const moduleProblems: any[] = moduleProblemsResponse?.data?.problems || [];
  const currentProblemIndex = moduleProblems.findIndex((p: any) => p.slug === problemSlug);
  const prevProblem = currentProblemIndex > 0 ? moduleProblems[currentProblemIndex - 1] : null;
  const nextProblem =
    currentProblemIndex >= 0 && currentProblemIndex < moduleProblems.length - 1
      ? moduleProblems[currentProblemIndex + 1]
      : null;

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (pickerRef.current && !pickerRef.current.contains(event.target as Node)) {
        setIsProblemPickerOpen(false);
      }
    }
    if (isProblemPickerOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isProblemPickerOpen]);

  // Reset results when navigating between problems
  useEffect(() => {
    setRunResult(null);
    setSubmissionResult(null);
    setExecutionError(null);
    setActiveBottomTab('custom');
  }, [problemSlug]);

  const problem = responseData?.data?.problem;
  const userProgress = responseData?.data?.userProgress;
  const previousAttempts = (userProgress?.attemptsCount || userProgress?.attempts || 0);
  const currentAttempt = previousAttempts + 1;

  // Restore local draft or starter code, then sync cloud draft
  useEffect(() => {
    if (problem && problem.id !== initializedProblemIdRef.current) {
      initializedProblemIdRef.current = problem.id;

      // 1. Instant local cache restore
      const localDraft = DraftSyncService.getLocalDraft(problem.slug, true);
      let initialCode = cleanDraftCode(problem.starterCode);

      if (localDraft?.code) {
        initialCode = cleanDraftCode(localDraft.code);
        setCode(initialCode);
      } else {
        setCode(initialCode);
      }

      if (problem.sampleTests && problem.sampleTests.length > 0) {
        setCustomInput(problem.sampleTests[0].input);
      }

      // 2. Authoritative cloud draft sync
      if (user?.id) {
        DraftSyncService.fetchRemoteDraft(user.id, problem.slug, true)
          .then((remoteDraft) => {
            if (!remoteDraft) return;

            const conflict = DraftSyncService.detectConflict(localDraft, remoteDraft);
            if (conflict) {
              setConflictInfo(conflict);
            } else if (remoteDraft.code && remoteDraft.code !== initialCode) {
              const cleanedRemote = cleanDraftCode(remoteDraft.code);
              setCode(cleanedRemote);
              DraftSyncService.saveLocalDraft({ ...remoteDraft, code: cleanedRemote }, true);
            }
          })
          .catch(() => {});
      }
    }
  }, [problem, user?.id]);

  const handleCodeChange = (nextCode: string) => {
    setCode(nextCode);
    if (problem?.slug) {
      const draftObj: DraftData = {
        problemId: problem.id,
        problemSlug: problem.slug,
        code: nextCode,
        customInput,
        updatedAt: Date.now(),
        deviceLabel: getDeviceLabel(),
      };

      DraftSyncService.saveLocalDraft(draftObj, true);

      if (user?.id && navigator.onLine) {
        setDraftSyncStatus('saving');
        if (autosaveTimerRef.current) {
          clearTimeout(autosaveTimerRef.current);
        }
        autosaveTimerRef.current = setTimeout(async () => {
          const success = await DraftSyncService.saveRemoteDraft(user.id, draftObj, true);
          setDraftSyncStatus(success ? 'saved' : 'offline');
        }, 1500);
      } else {
        setDraftSyncStatus('offline');
      }
    }
  };

  const handleKeepRemoteDraft = () => {
    if (conflictInfo) {
      const cleaned = cleanDraftCode(conflictInfo.remoteDraft.code);
      setCode(cleaned);
      DraftSyncService.saveLocalDraft({ ...conflictInfo.remoteDraft, code: cleaned }, true);
      setConflictInfo(null);
      toast.success('Restored newer draft from cloud');
    }
  };

  const handleKeepLocalDraft = () => {
    if (conflictInfo && user?.id) {
      const updatedLocal: DraftData = {
        ...conflictInfo.localDraft,
        code: cleanDraftCode(conflictInfo.localDraft.code),
        updatedAt: Date.now(),
        deviceLabel: getDeviceLabel(),
      };
      DraftSyncService.saveLocalDraft(updatedLocal, true);
      DraftSyncService.saveRemoteDraft(user.id, updatedLocal, true);
      setConflictInfo(null);
      toast.success('Kept local code and updated cloud');
    }
  };

  const handleResetStarterCode = () => {
    if (problem?.starterCode) {
      const cleanStarter = cleanDraftCode(problem.starterCode);
      setCode(cleanStarter);
      handleCodeChange(cleanStarter);
      setExecutionError(null);
      toast.success('Reset code to clean starter template');
    }
  };

  useEffect(() => {
    return () => {
      if (pollTimerRef.current) {
        clearInterval(pollTimerRef.current);
      }
    };
  }, []);

  // Run Code Mutation
  const runMutation = useMutation({
    mutationFn: () => {
      setExecutionError(null);
      if (problem?.id) {
        api.post('/practice/track-run', { problemId: problem.id }).catch(() => {});
      }
      return api.post('/submissions/run', {
        problemId: problem?.id,
        code,
        stdin: customInput,
        timeLimitMs: problem?.timeLimitMs || 1000,
      });
    },
    onSuccess: (res) => {
      setExecutionError(null);
      setSubmissionResult(null);
      setRunResult(res.data);
      setActiveBottomTab('output');
      setIsDrawerOpen(true);
      setActiveMobileTab('results');
    },
    onError: (err: any) => {
      const apiErr = err as LogicQApiError;
      setExecutionError({
        message: apiErr.message || 'Execution service did not respond.',
        code: apiErr.code,
        canRetry: apiErr.canRetry !== false,
        type: 'run',
      });
      setActiveBottomTab('output');
      setIsDrawerOpen(true);
      setActiveMobileTab('results');
      toast.error(apiErr.message || 'Execution failed');
    },
  });

  const triggerAcceptedCelebration = (nextProb?: any) => {
    confetti({
      particleCount: 90,
      spread: 70,
      origin: { y: 0.6 },
      colors: ['#8B9BFF', '#46D9A0', '#FCD34D'],
    });

    queryClient.invalidateQueries({ queryKey: ['practice-problem', problemSlug] });
    queryClient.invalidateQueries({ queryKey: ['practice-module-problems', moduleSlug] });
    queryClient.invalidateQueries({ queryKey: ['practice-modules'] });

    const sec = userProgress?.timeToSolveSeconds || practiceTimerRef.current?.getActiveSeconds() || userProgress?.activeSeconds || 0;
    const timeFormatted = sec >= 60 ? `${Math.floor(sec / 60)}m ${sec % 60}s` : sec > 0 ? `${sec}s` : '< 1m';
    const attemptStr = `Attempt #${(userProgress?.attemptsCount || 0) || 1}`;

    if (nextProb) {
      toast.success(`Accepted in ${timeFormatted} (${attemptStr}) 🎉`, {
        description: `Next up: #${nextProb.moduleOrder} ${nextProb.title}`,
        action: {
          label: 'Next Question →',
          onClick: () => navigate(`/practice/${moduleSlug}/${nextProb.slug}`),
        },
        duration: 12000,
      });
    } else {
      toast.success(`Accepted in ${timeFormatted} (${attemptStr}) 🏆`, {
        description: 'You have solved all 20 problems in this module!',
        action: {
          label: 'Back to Modules',
          onClick: () => navigate('/practice'),
        },
        duration: 12000,
      });
    }
  };

  // Submit Solution Mutation (Practice submission)
  const submitMutation = useMutation({
    mutationFn: async () => {
      setExecutionError(null);
      if (practiceTimerRef.current) {
        await practiceTimerRef.current.syncNow('submit');
      }
      return api.post('/submissions/submit', {
        problemId: problem.id,
        code,
        idempotencyKey: idempotencyKeyRef.current,
      });
    },
    onSuccess: (res) => {
      setExecutionError(null);
      setRunResult(null);
      setIsDrawerOpen(true);
      setActiveBottomTab('output');
      setActiveMobileTab('results');
      // Rotate idempotency key after successful submission dispatch
      idempotencyKeyRef.current = `prac-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

      const immediateSub = res?.data?.submission;
      if (
        immediateSub &&
        immediateSub.verdict &&
        immediateSub.verdict !== 'PENDING' &&
        immediateSub.verdict !== 'JUDGING'
      ) {
        setSubmissionResult({
          submissionId: immediateSub.id,
          verdict: immediateSub.verdict,
          runtimeMs: immediateSub.runtimeMs ?? 14,
          compileOutput: immediateSub.compileOutput,
          testCaseResults: immediateSub.testCaseResults,
        });
        if (immediateSub.verdict === 'ACCEPTED') {
          triggerAcceptedCelebration(nextProblem);
        } else {
          toast.error(`Verdict: ${immediateSub.verdict.replace(/_/g, ' ')}`);
        }
        return;
      }

      // If async queued, poll submission status
      const submissionId = res?.data?.submissionId;
      if (submissionId) {
        setSubmissionResult({
          submissionId,
          verdict: 'PENDING',
          runtimeMs: 0,
        });

        let pollAttempts = 0;
        if (pollTimerRef.current) clearInterval(pollTimerRef.current);

        pollTimerRef.current = setInterval(async () => {
          pollAttempts++;
          try {
            const pollRes = await api.get(`/submissions/${submissionId}`);
            const currentSub = pollRes?.data?.submission || pollRes?.data;
            if (currentSub && currentSub.verdict !== 'PENDING' && currentSub.verdict !== 'JUDGING') {
              if (pollTimerRef.current) clearInterval(pollTimerRef.current);
              setSubmissionResult({
                submissionId: currentSub.id,
                verdict: currentSub.verdict,
                runtimeMs: currentSub.runtimeMs || 15,
                compileOutput: currentSub.compileOutput,
                testCaseResults: currentSub.testCaseResults,
              });
              if (currentSub.verdict === 'ACCEPTED') {
                triggerAcceptedCelebration(nextProblem);
              } else {
                toast.error(`Verdict: ${currentSub.verdict.replace(/_/g, ' ')}`);
              }
            }
          } catch {
            // keep polling until max attempts
          }

          if (pollAttempts >= 30) {
            if (pollTimerRef.current) clearInterval(pollTimerRef.current);
          }
        }, 1000);
      }
    },
    onError: (err: any) => {
      const apiErr = err as LogicQApiError;
      setExecutionError({
        message: apiErr.message || 'Submission service did not respond.',
        code: apiErr.code,
        canRetry: apiErr.canRetry !== false,
        type: 'submit',
      });
      setActiveBottomTab('output');
      setIsDrawerOpen(true);
      setActiveMobileTab('results');
      toast.error(apiErr.message || 'Submission failed');
    },
  });

  if (isLoading) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center">
        <div className="flex items-center gap-2 text-xs font-mono text-[var(--accent)]">
          <span className="w-2 h-2 rounded-full bg-[var(--accent)] animate-ping" />
          <span>Loading practice problem workspace...</span>
        </div>
      </div>
    );
  }

  if (problemError || !problem) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16 text-center space-y-4">
        <h2 className="text-xl font-bold text-[var(--text-main)]">Problem Unavailable</h2>
        <p className="text-sm text-[var(--text-muted)]">
          Could not load the practice problem. Ensure this module is unlocked.
        </p>
        <Link
          to={`/practice/${moduleSlug}`}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-line)] text-xs font-mono text-[var(--accent)]"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Module Problems</span>
        </Link>
      </div>
    );
  }

  return (
    <div
      style={{ minHeight: 'calc(100dvh - var(--navbar-height, 4rem))' }}
      className={`flex flex-col w-full bg-[var(--bg-main)] text-[var(--text-main)] overflow-hidden ${
        isFullscreen ? 'fixed inset-0 z-50 h-screen' : ''
      }`}
    >
      {/* Inactive Fullscreen Warning Banner */}
      {!isFullscreen && (
        <div className="bg-amber-500/15 border-b border-amber-500/30 px-3 sm:px-4 py-2 flex items-center justify-between text-xs font-mono text-amber-300 shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 animate-pulse" />
            <span className="truncate">
              Fullscreen is inactive{fullscreenExits > 0 ? ` (Exits: ${fullscreenExits})` : ''}. Please enter fullscreen for proctored mode.
            </span>
          </div>
          <button
            type="button"
            onClick={requestFullscreen}
            className="px-2.5 py-1 rounded-lg bg-amber-500 text-black font-bold text-[11px] hover:bg-amber-400 transition-colors shrink-0 ml-3"
          >
            Go Fullscreen 🔒
          </button>
        </div>
      )}
      {/* Top Workspace Header */}
      <div className="h-14 border-b border-[var(--border-line)] bg-[var(--bg-surface)]/60 backdrop-blur-md px-3 sm:px-4 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-1.5 sm:gap-2.5 min-w-0">
          <Link
            to={`/practice/${moduleSlug}`}
            className="p-1.5 rounded-lg hover:bg-[var(--bg-surface)] text-[var(--text-muted)] hover:text-[var(--text-main)] transition-colors shrink-0"
            title="Back to module problems"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>

          <div className="h-4 w-[1px] bg-[var(--border-line)] shrink-0" />

          {/* Prev / Next Chevrons */}
          <div className="flex items-center gap-0.5 shrink-0">
            <button
              type="button"
              disabled={!prevProblem}
              onClick={() => prevProblem && navigate(`/practice/${moduleSlug}/${prevProblem.slug}`)}
              className="p-1.5 rounded-lg hover:bg-[var(--bg-surface-hover)] text-[var(--text-muted)] hover:text-[var(--text-main)] transition-colors disabled:opacity-30 disabled:pointer-events-none"
              title={prevProblem ? `Previous: #${prevProblem.moduleOrder} ${prevProblem.title}` : 'First problem'}
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              type="button"
              disabled={!nextProblem}
              onClick={() => nextProblem && navigate(`/practice/${moduleSlug}/${nextProblem.slug}`)}
              className="p-1.5 rounded-lg hover:bg-[var(--bg-surface-hover)] text-[var(--text-muted)] hover:text-[var(--text-main)] transition-colors disabled:opacity-30 disabled:pointer-events-none"
              title={nextProblem ? `Next: #${nextProblem.moduleOrder} ${nextProblem.title}` : 'Last problem'}
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <div className="h-4 w-[1px] bg-[var(--border-line)] shrink-0" />

          {/* Problem Selector Dropdown */}
          <div className="relative" ref={pickerRef}>
            <button
              type="button"
              onClick={() => setIsProblemPickerOpen((prev) => !prev)}
              className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-[var(--bg-surface)] hover:bg-[var(--bg-surface-hover)] border border-[var(--border-line)] text-xs font-mono text-[var(--text-main)] transition-colors"
              title="Select Question from Module"
            >
              <span className="text-[var(--accent)] font-bold">#{problem.moduleOrder}</span>
              <span className="hidden sm:inline font-sans font-medium truncate max-w-[120px] md:max-w-[200px]">
                {problem.title}
              </span>
              <ChevronDown className="w-3.5 h-3.5 text-[var(--text-muted)]" />
            </button>

            {isProblemPickerOpen && (
              <div className="absolute left-0 top-full mt-1 w-72 sm:w-80 max-h-96 overflow-y-auto rounded-xl bg-[var(--bg-surface)] border border-[var(--border-line)] shadow-2xl z-50 p-1.5 space-y-1">
                <div className="px-2 py-1 text-[11px] font-mono uppercase tracking-wider text-[var(--text-muted)] border-b border-[var(--border-line)] flex items-center justify-between">
                  <span>Module Questions ({moduleProblems.length})</span>
                  <span>Select to switch</span>
                </div>
                {moduleProblems.map((p: any) => {
                  const isCurrent = p.slug === problemSlug;
                  return (
                    <button
                      key={p.id || p.slug}
                      type="button"
                      onClick={() => {
                        setIsProblemPickerOpen(false);
                        if (!isCurrent) {
                          navigate(`/practice/${moduleSlug}/${p.slug}`);
                        }
                      }}
                      className={`w-full flex items-center justify-between gap-2 px-2.5 py-2 rounded-lg text-left text-xs transition-colors ${
                        isCurrent
                          ? 'bg-[var(--accent)]/15 text-[var(--accent)] font-semibold border border-[var(--accent)]/30'
                          : 'hover:bg-[var(--bg-panel)] text-[var(--text-main)]'
                      }`}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="font-mono text-[11px] text-[var(--text-muted)] w-5 shrink-0">
                          #{p.moduleOrder}
                        </span>
                        <span className="truncate">{p.title}</span>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        {p.isSolved && (
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                        )}
                        <DifficultyBadge difficulty={p.difficulty as any} />
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Active Attempt Badge */}
          <span
            className="flex items-center gap-1 text-[11px] font-mono px-2 py-0.5 rounded border shrink-0 bg-indigo-500/10 text-indigo-400 border-indigo-500/30 font-bold"
            title={`Active Attempt: Attempt #${currentAttempt} (${previousAttempts} prior submission${previousAttempts === 1 ? '' : 's'})`}
          >
            <span>Attempt #{currentAttempt}</span>
            {previousAttempts > 0 && (
              <span className="text-[10px] text-[var(--text-muted)] font-normal hidden sm:inline">
                ({previousAttempts} prior)
              </span>
            )}
          </span>

          <div className="hidden lg:flex items-center gap-1.5 min-w-0">
            <DifficultyBadge difficulty={problem.difficulty as any} />
            {(userProgress?.isSolved || submissionResult?.verdict === 'ACCEPTED') && (
              <>
                <span className="flex items-center gap-1 text-[11px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20 shrink-0">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Solved</span>
                </span>
                <span className="flex items-center gap-1 text-[11px] font-mono text-cyan-400 bg-cyan-500/10 px-2 py-0.5 rounded border border-cyan-500/20 shrink-0" title="Total attempts on this problem">
                  <span>
                    {(userProgress?.attemptsCount || userProgress?.attempts || 1)}{' '}
                    {(userProgress?.attemptsCount || userProgress?.attempts || 1) === 1 ? 'Attempt' : 'Attempts'}
                  </span>
                </span>
                <span className="flex items-center gap-1 text-[11px] font-mono text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20 shrink-0" title="Time taken to solve">
                  <Clock className="w-3 h-3" />
                  <span>
                    {(() => {
                      const s = userProgress?.timeToSolveSeconds || practiceTimerRef.current?.getActiveSeconds() || userProgress?.activeSeconds || 0;
                      if (s >= 60) return `${Math.floor(s / 60)}m ${s % 60}s`;
                      if (s > 0) return `${s}s`;
                      return '< 1m';
                    })()}
                  </span>
                </span>
              </>
            )}
          </div>
        </div>

        {/* Action Buttons & Timer */}
        <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
          {nextProblem && (userProgress?.isSolved || submissionResult?.verdict === 'ACCEPTED') && (
            <button
              onClick={() => navigate(`/practice/${moduleSlug}/${nextProblem.slug}`)}
              className="flex items-center gap-1 sm:gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-xs font-bold text-[#0C0F1F] shadow-sm shadow-emerald-500/20 transition-all animate-pulse hover:animate-none"
              title={`Next Question: #${nextProblem.moduleOrder} ${nextProblem.title}`}
            >
              <span className="hidden sm:inline">Next Question</span>
              <span className="sm:hidden">Next</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          )}

          {problem && (
            <PracticeTimer
              ref={practiceTimerRef}
              problemId={problem.id}
              initialActiveSeconds={userProgress?.activeSeconds || 0}
              isSolved={Boolean(userProgress?.isSolved || submissionResult?.verdict === 'ACCEPTED')}
              timeToSolveSeconds={userProgress?.timeToSolveSeconds}
              hideTimerPreference={Boolean(user?.hidePracticeTimer)}
            />
          )}
          {user?.id && (
            <span className="hidden lg:flex items-center gap-1 text-[11px] font-mono text-[var(--text-muted)] pr-2 border-r border-[var(--border-line)]">
              <Cloud
                className={`w-3.5 h-3.5 ${
                  draftSyncStatus === 'saving'
                    ? 'text-amber-400 animate-pulse'
                    : 'text-emerald-400'
                }`}
              />
              <span>{draftSyncStatus === 'saving' ? 'Saving...' : 'Synced'}</span>
            </span>
          )}
          {/* Proctoring Badge & Fullscreen Toggle */}
          <button
            type="button"
            onClick={toggleFullscreen}
            className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl text-xs font-mono font-semibold transition-all border ${
              isFullscreen
                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                : 'bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border-amber-500/40 animate-pulse hover:animate-none'
            }`}
            title={isFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen Mode (Required in Proctored Mode)'}
          >
            {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
            <span className="hidden sm:inline">{isFullscreen ? 'Fullscreen On' : 'Go Fullscreen'}</span>
          </button>

          {/* Tab Switch Counter Badge */}
          {tabSwitchCount > 0 ? (
            <span
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-mono font-bold bg-rose-500/15 text-rose-400 border border-rose-500/40 shadow-sm shadow-rose-500/20 animate-pulse"
              title={`${tabSwitchCount} tab switch / window focus loss event(s) detected! Logged for anti-cheat audit.`}
            >
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>Switches: {tabSwitchCount}</span>
            </span>
          ) : (
            <span
              className="hidden md:flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-mono bg-emerald-500/10 text-emerald-400 border border-emerald-500/25"
              title="Tab Guard active - zero tab switches detected"
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              <span className="hidden lg:inline">Tab Guard: 0</span>
            </span>
          )}

          <button
            onClick={() => runMutation.mutate()}
            disabled={runMutation.isPending || submitMutation.isPending}
            className="flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3.5 py-1.5 rounded-xl bg-[var(--bg-surface)] hover:bg-[var(--bg-surface-hover)] border border-[var(--border-line)] text-xs font-semibold text-[var(--text-main)] transition-colors disabled:opacity-50"
            title="Run solution against custom stdin"
          >
            <Play className="w-3.5 h-3.5 text-cyan-400 fill-cyan-400" />
            <span className="hidden sm:inline">{runMutation.isPending ? 'Running...' : 'Run Code'}</span>
            <span className="sm:hidden">{runMutation.isPending ? '...' : 'Run'}</span>
          </button>

          <button
            onClick={() => submitMutation.mutate()}
            disabled={submitMutation.isPending || runMutation.isPending}
            className="flex items-center gap-1 sm:gap-1.5 px-3 sm:px-4 py-1.5 rounded-xl bg-gradient-to-r from-[var(--accent)] to-indigo-600 hover:opacity-95 text-xs font-bold text-white shadow-sm shadow-[var(--accent)]/20 transition-all disabled:opacity-50"
            title="Submit solution for judging against test cases"
          >
            <Send className="w-3.5 h-3.5" />
            <span>{submitMutation.isPending ? 'Submitting...' : 'Submit'}</span>
          </button>
        </div>
      </div>

      {/* Mobile Segmented Switcher (Statement | Editor | Verdict) */}
      <div className="lg:hidden flex items-center bg-[var(--bg-surface)] border-b border-[var(--border-line)] px-2 py-1.5 gap-1.5 shrink-0">
        <button
          type="button"
          onClick={() => setActiveMobileTab('statement')}
          className={`flex-1 py-1.5 text-xs font-mono rounded-lg transition-colors flex items-center justify-center gap-1.5 ${
            activeMobileTab === 'statement'
              ? 'bg-[var(--bg-panel)] text-[var(--accent)] font-bold border border-[var(--border-line)] shadow-sm'
              : 'text-[var(--text-muted)]'
          }`}
        >
          <BookOpen className="w-3.5 h-3.5" />
          <span>Statement</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveMobileTab('editor')}
          className={`flex-1 py-1.5 text-xs font-mono rounded-lg transition-colors flex items-center justify-center gap-1.5 ${
            activeMobileTab === 'editor'
              ? 'bg-[var(--bg-panel)] text-[var(--accent)] font-bold border border-[var(--border-line)] shadow-sm'
              : 'text-[var(--text-muted)]'
          }`}
        >
          <Terminal className="w-3.5 h-3.5" />
          <span>Editor</span>
        </button>
        <button
          type="button"
          onClick={() => {
            setActiveMobileTab('results');
            setActiveBottomTab('output');
            setIsDrawerOpen(true);
          }}
          className={`flex-1 py-1.5 text-xs font-mono rounded-lg transition-colors flex items-center justify-center gap-1.5 ${
            activeMobileTab === 'results'
              ? 'bg-[var(--bg-panel)] text-[var(--accent)] font-bold border border-[var(--border-line)] shadow-sm'
              : 'text-[var(--text-muted)]'
          }`}
        >
          <Layers className="w-3.5 h-3.5" />
          <span>Verdict</span>
          {executionError && <span className="w-2 h-2 rounded-full bg-amber-400" />}
        </button>
      </div>

      {/* Main Two-Pane Split View */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden min-h-0">
        {/* Left Pane: Problem Description Statement */}
        <div
          className={`lg:w-1/2 flex flex-col border-b lg:border-b-0 lg:border-r border-[var(--border-line)] overflow-y-auto p-4 sm:p-6 space-y-6 ${
            activeMobileTab === 'statement' ? 'flex-1' : 'hidden lg:flex'
          }`}
        >
          <div className="space-y-2">
            <h2 className="text-lg sm:text-xl font-bold text-[var(--text-main)]">{problem.title}</h2>
            <div className="flex flex-wrap items-center gap-2 text-xs font-mono text-[var(--text-muted)]">
              <span>{problem.category}</span>
              <span>•</span>
              <span>Time Limit: {problem.timeLimitMs}ms</span>
              <span>•</span>
              <span>Memory Limit: {problem.memoryLimitMb}MB</span>
              <span>•</span>
              <span className="text-indigo-400 font-bold bg-indigo-500/10 px-2 py-0.5 rounded border border-indigo-500/25">
                Current: Attempt #{currentAttempt}
              </span>
              {previousAttempts > 0 && (
                <>
                  <span>•</span>
                  <span className="text-cyan-400 font-semibold">
                    {previousAttempts} Prior {previousAttempts === 1 ? 'Attempt' : 'Attempts'}
                  </span>
                </>
              )}
              {Boolean(userProgress?.timeToSolveSeconds) && (
                <>
                  <span>•</span>
                  <span className="text-amber-400 font-semibold inline-flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    Solved in:{' '}
                    {userProgress.timeToSolveSeconds >= 60
                      ? `${Math.floor(userProgress.timeToSolveSeconds / 60)}m ${userProgress.timeToSolveSeconds % 60}s`
                      : `${userProgress.timeToSolveSeconds}s`}
                  </span>
                </>
              )}
            </div>
            {/* Anti-cheat proctoring indicator bar */}
            <div className="flex flex-wrap items-center gap-2 py-1.5 px-3 rounded-lg bg-[var(--bg-surface)] border border-[var(--border-line)] text-[11px] font-mono text-[var(--text-muted)]">
              <span className="flex items-center gap-1 text-emerald-400 font-bold">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Proctored:</span>
              </span>
              <span className="text-rose-400 font-medium">Copy-Paste Disabled 🚫</span>
              <span>•</span>
              <span className="text-amber-400 font-medium">Fullscreen Enforced 🔒</span>
              <span>•</span>
              <span className="text-cyan-400 font-medium">Tab Switches Audited 👁️</span>
            </div>
          </div>

          {/* Safe Markdown Renderer with clean Unicode math and zero unrendered LaTeX */}
          <StatementMarkdown content={problem.description} />

          {/* Sample Test Cases */}
          {problem.sampleTests && problem.sampleTests.length > 0 && (
            <div className="space-y-4 pt-4 border-t border-[var(--border-line)]">
              <h3 className="text-xs font-mono font-bold tracking-wider text-[var(--text-main)] uppercase">
                Sample Test Cases
              </h3>
              {problem.sampleTests.map((st: any, idx: number) => (
                <div
                  key={idx}
                  className="glass-card rounded-xl p-3.5 border border-[var(--border-line)] space-y-2 text-xs font-mono"
                >
                  <div className="text-[11px] text-[var(--accent)] font-semibold">
                    Sample #{idx + 1}
                  </div>
                  <div>
                    <span className="text-[var(--text-muted)] block text-[10px] uppercase">
                      Input
                    </span>
                    <pre className="p-2 rounded bg-[var(--bg-main)] text-[var(--text-main)] overflow-x-auto mt-0.5">
                      {st.input}
                    </pre>
                  </div>
                  <div>
                    <span className="text-[var(--text-muted)] block text-[10px] uppercase">
                      Expected Output
                    </span>
                    <pre className="p-2 rounded bg-[var(--bg-main)] text-emerald-400 overflow-x-auto mt-0.5">
                      {st.expectedOutput}
                    </pre>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right Pane: Code Editor + Custom Stdin & Verdict Drawer */}
        <div
          className={`lg:w-1/2 flex flex-col min-h-0 bg-[var(--bg-main)] ${
            activeMobileTab !== 'statement' ? 'flex-1' : 'hidden lg:flex'
          }`}
        >
          {/* Editor Container (visible when active tab is editor on mobile, or always on desktop) */}
          <div
            className={`flex-1 min-h-[300px] relative overflow-hidden ${
              activeMobileTab === 'results' ? 'hidden sm:block' : 'block'
            }`}
          >
            <CodeEditor
              code={code}
              onChange={handleCodeChange}
              onReset={handleResetStarterCode}
              readOnly={false}
              disableCopyPaste={true}
            />
          </div>

          {/* Bottom Tabs Drawer: Strictly Custom Stdin and Verdict & Output */}
          <div className="border-t border-[var(--border-line)] bg-[var(--bg-surface)]/80 flex flex-col shrink-0">
            <div className="h-10 px-4 flex items-center justify-between border-b border-[var(--border-line)]/60">
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => {
                    setActiveBottomTab('custom');
                    setIsDrawerOpen(true);
                  }}
                  className={`px-3 py-1 text-xs font-mono rounded-md transition-colors ${
                    activeBottomTab === 'custom' && isDrawerOpen
                      ? 'bg-[var(--bg-surface)] text-[var(--accent)] font-semibold border border-[var(--border-line)]'
                      : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'
                  }`}
                >
                  Custom Stdin
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setActiveBottomTab('output');
                    setIsDrawerOpen(true);
                  }}
                  className={`px-3 py-1 text-xs font-mono rounded-md transition-colors flex items-center gap-1.5 ${
                    activeBottomTab === 'output' && isDrawerOpen
                      ? 'bg-[var(--bg-surface)] text-[var(--accent)] font-semibold border border-[var(--border-line)]'
                      : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'
                  }`}
                >
                  <span>Verdict &amp; Output</span>
                  {executionError && (
                    <span className="w-2 h-2 rounded-full bg-amber-400" />
                  )}
                </button>
              </div>

              <button
                type="button"
                onClick={() => setIsDrawerOpen(!isDrawerOpen)}
                className="p-1 rounded text-[var(--text-muted)] hover:text-[var(--text-main)]"
                title={isDrawerOpen ? 'Collapse drawer' : 'Expand drawer'}
              >
                {isDrawerOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
              </button>
            </div>

            {isDrawerOpen && (
              <div className="h-60 p-3 overflow-y-auto font-mono text-xs">
                {activeBottomTab === 'custom' ? (
                  <div className="h-full flex flex-col space-y-1.5">
                    <label className="text-[10px] uppercase text-[var(--text-muted)]">
                      Standard Input (passed to stdin for Run Code):
                    </label>
                    <textarea
                      value={customInput}
                      onChange={(e) => setCustomInput(e.target.value)}
                      placeholder="Enter test input data (e.g. 10 20 30)..."
                      className="w-full flex-1 p-2.5 rounded-lg bg-[var(--bg-main)] text-[var(--text-main)] border border-[var(--border-line)] focus:outline-none focus:border-[var(--accent)] resize-none"
                    />
                  </div>
                ) : (
                  <div className="space-y-3">
                    {/* Execution Error Card with Non-destructive Retry Button */}
                    {executionError && (
                      <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2 text-amber-400 font-bold text-xs">
                            {executionError.code === 'OFFLINE' ? (
                              <WifiOff className="w-4 h-4 shrink-0" />
                            ) : executionError.code === 'TIMEOUT' ? (
                              <Clock className="w-4 h-4 shrink-0" />
                            ) : (
                              <AlertTriangle className="w-4 h-4 shrink-0" />
                            )}
                            <span>
                              {executionError.code === 'OFFLINE'
                                ? 'Browser Offline'
                                : executionError.code === 'JUDGE_UNREACHABLE'
                                ? 'Judge Service Unreachable'
                                : executionError.code === 'JUDGE_BUSY'
                                ? 'Judge Service Busy'
                                : executionError.code === 'TIMEOUT'
                                ? 'Execution Timed Out'
                                : 'Judge Connection Unavailable'}
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={() => setExecutionError(null)}
                            className="text-[var(--text-muted)] hover:text-[var(--text-main)] text-xs"
                          >
                            Dismiss
                          </button>
                        </div>
                        <p className="text-xs text-[var(--text-main)] leading-relaxed">
                          {executionError.message}
                        </p>
                        {executionError.canRetry && (
                          <div className="pt-1 flex items-center gap-2 flex-wrap">
                            <button
                              type="button"
                              onClick={() => {
                                setExecutionError(null);
                                if (executionError.type === 'run') {
                                  runMutation.mutate();
                                } else {
                                  submitMutation.mutate();
                                }
                              }}
                              disabled={runMutation.isPending || submitMutation.isPending}
                              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[var(--accent)] hover:opacity-90 text-[#0C0F1F] font-bold text-xs transition-opacity"
                            >
                              <RotateCcw className="w-3.5 h-3.5" />
                              <span>
                                Retry {executionError.type === 'run' ? 'Run Code' : 'Submit'}
                              </span>
                            </button>
                            <span className="text-[11px] text-[var(--text-muted)] font-mono">
                              Your code in the editor is safely preserved.
                            </span>
                          </div>
                        )}
                      </div>
                    )}

                    {submitMutation.isPending || runMutation.isPending ? (
                      <div className="flex items-center gap-2 text-cyan-400 py-6 justify-center">
                        <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
                        <span>Compiling and executing C11 code on isolated judge...</span>
                      </div>
                    ) : submissionResult ? (
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-[var(--text-muted)]">
                            Submission Verdict:
                          </span>
                          <VerdictBadge verdict={submissionResult.verdict} />
                        </div>
                        {submissionResult.runtimeMs > 0 && (
                          <div className="text-[11px] text-[var(--text-muted)]">
                            Execution time: {submissionResult.runtimeMs}ms
                          </div>
                        )}
                        {submissionResult.compileOutput && (
                          <pre className="p-2.5 rounded bg-rose-500/10 text-rose-300 border border-rose-500/20 whitespace-pre-wrap">
                            {submissionResult.compileOutput}
                          </pre>
                        )}
                        {submissionResult.testCaseResults && submissionResult.testCaseResults.length > 0 && (() => {
                          const testCases = submissionResult.testCaseResults;
                          const sampleCount = problem?.testCases?.length || Math.min(2, testCases.length);
                          const sampleResults = testCases.slice(0, sampleCount);
                          const hiddenResults = testCases.slice(sampleCount);
                          const hiddenTotal = hiddenResults.length;
                          const hiddenPassed = hiddenResults.filter((tc: any) => tc.passed ?? (tc.verdict === 'ACCEPTED')).length;
                          const isAllHiddenPassed = hiddenTotal > 0 && hiddenPassed === hiddenTotal;

                          return (
                            <div className="space-y-2 pt-1 font-mono">
                              <span className="text-[10px] uppercase text-[var(--text-muted)] block font-semibold tracking-wider font-sans">
                                Test Case Results:
                              </span>

                              {/* Sample Test Cases */}
                              <div className="space-y-1.5">
                                {sampleResults.map((tc: any, idx: number) => {
                                  const isPassed = tc.passed ?? (tc.verdict === 'ACCEPTED');
                                  const runtimeSec = tc.runtimeMs != null
                                    ? (tc.runtimeMs / 1000).toFixed(2)
                                    : '0.01';

                                  return (
                                    <div
                                      key={idx}
                                      className={`px-3 py-2.5 rounded-xl border flex items-center justify-between text-xs transition-colors ${
                                        isPassed
                                          ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/25'
                                          : 'bg-rose-500/10 text-rose-400 border-rose-500/25'
                                      }`}
                                    >
                                      <div className="flex items-center gap-2">
                                        <span className="font-semibold text-[var(--text-main)]">
                                          Sample {idx + 1}:
                                        </span>
                                        <span className="font-bold">
                                          {isPassed ? 'PASS ✅' : 'FAIL ❌'}
                                        </span>
                                        {!isPassed && tc.verdict && tc.verdict !== 'WRONG_ANSWER' && (
                                          <span className="text-[11px] opacity-80">
                                            ({tc.verdict})
                                          </span>
                                        )}
                                      </div>
                                      <span className="text-[11px] text-[var(--text-muted)]">
                                        ({runtimeSec}s)
                                      </span>
                                    </div>
                                  );
                                })}
                              </div>

                              {/* Hidden Test Cases */}
                              {hiddenTotal > 0 && (
                                <div
                                  className={`px-3 py-2.5 rounded-xl border flex items-center justify-between text-xs transition-colors ${
                                    isAllHiddenPassed
                                      ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/25'
                                      : 'bg-rose-500/10 text-rose-400 border-rose-500/25'
                                  }`}
                                >
                                  <div className="flex items-center gap-2">
                                    <span className="font-semibold text-[var(--text-main)]">
                                      Hidden Test Cases:
                                    </span>
                                    <span className="font-bold">
                                      Passed {hiddenPassed}/{hiddenTotal} {isAllHiddenPassed ? '✅' : '❌'}
                                    </span>
                                    {isAllHiddenPassed && (
                                      <span className="text-emerald-400 font-bold ml-1">
                                        (+{problem?.points || 20} PTS)
                                      </span>
                                    )}
                                  </div>
                                  <span className="text-[11px] text-[var(--text-muted)]">
                                    {isAllHiddenPassed
                                      ? 'All hidden checks passed'
                                      : `${hiddenTotal - hiddenPassed} hidden check(s) failed`}
                                  </span>
                                </div>
                              )}

                              {/* Diagnostic guidance if any sample failed */}
                              {sampleResults.some((tc: any) => !(tc.passed ?? (tc.verdict === 'ACCEPTED')) && tc.stderr) && (
                                <div className="p-2.5 rounded-lg bg-amber-500/10 text-amber-300 border border-amber-500/20 text-xs mt-2 space-y-1">
                                  <span className="font-semibold block text-[11px] uppercase tracking-wider text-amber-400 font-sans">
                                    Diagnostic Guidance:
                                  </span>
                                  {sampleResults
                                    .filter((tc: any) => !(tc.passed ?? (tc.verdict === 'ACCEPTED')) && tc.stderr)
                                    .map((tc: any, idx: number) => (
                                      <div key={idx} className="text-[11px] leading-relaxed">
                                        • Sample #{tc.orderIndex != null ? tc.orderIndex + 1 : idx + 1}: {tc.stderr}
                                      </div>
                                    ))}
                                </div>
                              )}
                            </div>
                          );
                        })()}

                        {submissionResult.verdict === 'ACCEPTED' && (
                          <div className="mt-3 p-3.5 rounded-xl bg-gradient-to-r from-emerald-500/15 via-teal-500/10 to-emerald-500/15 border border-emerald-500/30 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-sm">
                            <div className="flex items-center gap-2.5">
                              <div className="w-8 h-8 rounded-lg bg-emerald-500/20 flex items-center justify-center text-emerald-400 shrink-0">
                                <Trophy className="w-4 h-4" />
                              </div>
                              <div>
                                <div className="text-xs font-bold text-emerald-400">
                                  Challenge Solved! All test cases passed.
                                </div>
                                <div className="flex items-center gap-2.5 text-[11px] font-mono my-1">
                                  <span className="px-1.5 py-0.5 rounded bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 font-semibold">
                                    Attempt #{(userProgress?.attemptsCount || 0) || 1}
                                  </span>
                                  <span className="px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-semibold flex items-center gap-1">
                                    <Clock className="w-3 h-3" />
                                    Time Taken:{' '}
                                    {(() => {
                                      const s = userProgress?.timeToSolveSeconds || practiceTimerRef.current?.getActiveSeconds() || userProgress?.activeSeconds || 0;
                                      if (s >= 60) return `${Math.floor(s / 60)}m ${s % 60}s`;
                                      if (s > 0) return `${s}s`;
                                      return '< 1m';
                                    })()}
                                  </span>
                                </div>
                                <div className="text-[11px] text-[var(--text-muted)]">
                                  {nextProblem
                                    ? `Next challenge: #${nextProblem.moduleOrder} ${nextProblem.title}`
                                    : 'Outstanding! You have completed all problems in this module.'}
                                </div>
                              </div>
                            </div>
                            {nextProblem ? (
                              <button
                                type="button"
                                onClick={() => navigate(`/practice/${moduleSlug}/${nextProblem.slug}`)}
                                className="w-full sm:w-auto px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-[#0C0F1F] font-bold text-xs flex items-center justify-center gap-1.5 transition-colors shadow-sm shrink-0"
                              >
                                <span>Next Question</span>
                                <ArrowRight className="w-3.5 h-3.5" />
                              </button>
                            ) : (
                              <Link
                                to={`/practice/${moduleSlug}`}
                                className="w-full sm:w-auto px-4 py-2 rounded-xl bg-[var(--accent)] hover:opacity-90 text-[#0C0F1F] font-bold text-xs flex items-center justify-center gap-1.5 transition-colors shadow-sm shrink-0"
                              >
                                <span>Back to Modules</span>
                                <ArrowRight className="w-3.5 h-3.5" />
                              </Link>
                            )}
                          </div>
                        )}
                      </div>
                    ) : runResult ? (
                      <div className="space-y-2.5 font-mono">
                        <div className="p-3 rounded-xl border flex items-center justify-between text-xs bg-[var(--bg-main)] border-[var(--border-line)]">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-[var(--text-muted)] font-sans">
                              Run Result:
                            </span>
                            <span
                              className={`font-bold ${
                                runResult.verdict === 'ACCEPTED' ? 'text-emerald-400' : 'text-amber-400'
                              }`}
                            >
                              {runResult.verdict === 'ACCEPTED' ? 'PASS ✅' : `${runResult.verdict} ⚠️`}
                            </span>
                          </div>
                          {runResult.runtimeMs != null && (
                            <span className="text-[11px] text-[var(--text-muted)]">
                              ({((runResult.runtimeMs || 0) / 1000).toFixed(2)}s)
                            </span>
                          )}
                        </div>
                        {runResult.compileOutput && (
                          <div>
                            <span className="text-[10px] text-[var(--text-muted)] uppercase block font-sans font-semibold mb-1">
                              Compilation Output:
                            </span>
                            <pre className="p-2.5 rounded-lg bg-rose-500/10 text-rose-300 border border-rose-500/20 whitespace-pre-wrap max-h-24 overflow-y-auto text-xs">
                              {runResult.compileOutput}
                            </pre>
                          </div>
                        )}
                        <div>
                          <span className="text-[10px] text-[var(--text-muted)] uppercase block font-sans font-semibold mb-1">
                            Standard Output:
                          </span>
                          <pre className="p-2.5 rounded-lg bg-[var(--bg-main)] text-emerald-400 whitespace-pre-wrap max-h-36 overflow-y-auto border border-[var(--border-line)] text-xs">
                            {runResult.stdout || '(no standard output)'}
                          </pre>
                        </div>
                        {runResult.stderr && (
                          <div>
                            <span className="text-[10px] text-[var(--text-muted)] uppercase block font-sans font-semibold mb-1">
                              Standard Error:
                            </span>
                            <pre className="p-2.5 rounded-lg bg-[var(--bg-main)] text-rose-400 whitespace-pre-wrap max-h-24 overflow-y-auto border border-[var(--border-line)] text-xs">
                              {runResult.stderr}
                            </pre>
                          </div>
                        )}
                      </div>
                    ) : !executionError ? (
                      <div className="text-center py-6 text-[var(--text-muted)]">
                        Press &ldquo;Run Code&rdquo; or &ldquo;Submit&rdquo; to execute your solution.
                      </div>
                    ) : null}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Mandatory Proctored Fullscreen Modal */}
      {showFullscreenModal && !isFullscreen && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="glass-card max-w-md w-full p-6 sm:p-7 rounded-2xl border border-[var(--border-line)] shadow-2xl space-y-5 text-center animate-in fade-in zoom-in-95 duration-200">
            <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center mx-auto text-amber-400 shadow-lg shadow-amber-500/10">
              <Lock className="w-7 h-7" />
            </div>

            <div className="space-y-2">
              <h3 className="text-xl font-bold text-[var(--text-main)]">
                Proctored Fullscreen Mode
              </h3>
              <p className="text-xs text-[var(--text-muted)] leading-relaxed">
                To maintain evaluation fairness and prevent cheating, practice coding requires full screen. All tab switches and window unfocus events are monitored and recorded.
              </p>
            </div>

            <div className="p-3.5 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-line)] text-left space-y-2 text-xs font-mono text-[var(--text-muted)]">
              <div className="flex items-center gap-2 text-amber-400 font-semibold">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>Security Guidelines:</span>
              </div>
              <ul className="list-disc list-inside space-y-1 pl-1 text-[11px]">
                <li>Copy, paste & right-click are strictly disabled.</li>
                <li>Tab switching & minimizing will be flagged.</li>
                <li>Current progress: <span className="text-indigo-400 font-bold">Attempt #{currentAttempt}</span></li>
                <li>Exiting fullscreen flags an integrity event.</li>
              </ul>
            </div>

            <button
              type="button"
              onClick={requestFullscreen}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-[var(--accent)] to-indigo-600 hover:opacity-95 text-white font-bold text-sm shadow-lg shadow-[var(--accent)]/25 flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
            >
              <Maximize2 className="w-4 h-4" />
              <span>Enter Fullscreen & Begin Solving</span>
            </button>
          </div>
        </div>
      )}

      {/* Draft Conflict Resolution Modal */}
      {conflictInfo && (
        <DraftConflictModal
          localDraft={conflictInfo.localDraft}
          remoteDraft={conflictInfo.remoteDraft}
          onKeepLocal={handleKeepLocalDraft}
          onKeepRemote={handleKeepRemoteDraft}
        />
      )}
    </div>
  );
};
