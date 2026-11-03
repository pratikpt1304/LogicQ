import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import confetti from 'canvas-confetti';
import { toast } from 'sonner';
import { api } from '../api/client.js';
import { RealtimeSyncService } from '../services/realtimeSync.service.js';
import { useAuth } from '../context/AuthContext.js';
import { CodeEditor } from '../components/editor/CodeEditor.js';
import { DifficultyBadge, VerdictBadge } from '../components/common/Badge.js';
import { StatementMarkdown } from '../components/common/StatementMarkdown.js';
import {
  Play,
  Send,
  CheckCircle2,
  CheckCircle,
  Cpu,
  Layers,
  Check,
  ChevronUp,
  ChevronDown,
  Sparkles,
  Lock,
  Calendar,
  Clock,
  BookOpen,
  Zap,
  Terminal,
  FileText,
  WifiOff,
  AlertCircle,
  AlertTriangle,
  Cloud,
  Maximize2,
  Minimize2,
  ShieldAlert,
  ShieldCheck,
  ArrowLeft,
  X,
} from 'lucide-react';
import {
  DraftSyncService,
  DraftData,
  ConflictInfo,
  getDeviceLabel,
} from '../services/draftSync.service.js';
import { DraftConflictModal } from '../components/editor/DraftConflictModal.js';
import { FirestoreDataService } from '../services/firestoreData.service.js';
import { auth } from '../config/firebase.js';
export const ChallengePage: React.FC = () => {
  const { slug } = useParams<{ slug?: string }>();
  const { user, refreshUser } = useAuth();
  const queryClient = useQueryClient();

  const navigate = useNavigate();
  const [activeMobileTab, setActiveMobileTab] = useState<'statement' | 'editor' | 'results'>('statement');
  const [code, setCode] = useState<string>('');
  const [customInput, setCustomInput] = useState<string>('');
  const [runResult, setRunResult] = useState<any | null>(null);
  const [submissionResult, setSubmissionResult] = useState<any | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(true);
  const [activeBottomTab, setActiveBottomTab] = useState<'cases' | 'custom' | 'output'>('cases');
  const [selectedCaseIndex, setSelectedCaseIndex] = useState<number>(0);
  const [isOffline, setIsOffline] = useState<boolean>(
    typeof navigator !== 'undefined' ? !navigator.onLine : false
  );

  const initializedProblemIdRef = useRef<string | null>(null);
  const pollTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [remainingSeconds, setRemainingSeconds] = useState<number | null>(null);
  // Individual Student Challenge Solve Timer (Stopwatch)
  const [elapsedSeconds, setElapsedSeconds] = useState<number>(0);
  const [isWindowExpired, setIsWindowExpired] = useState<boolean>(false);
  const [draftSyncStatus, setDraftSyncStatus] = useState<'saved' | 'saving' | 'offline'>('saved');
  const [conflictInfo, setConflictInfo] = useState<ConflictInfo | null>(null);
  const autosaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const formatCountdown = (secs: number | null): string => {
    if (secs === null || secs <= 0) return '00h 00m 00s';
    const h = Math.floor(secs / 3600);
    const m = Math.floor((secs % 3600) / 60);
    const s = secs % 60;
    return `${String(h).padStart(2, '0')}h ${String(m).padStart(2, '0')}m ${String(s).padStart(2, '0')}s`;
  };

  // Anti-Cheat & Strict Proctoring State
  const [isFullscreen, setIsFullscreen] = useState(Boolean(document.fullscreenElement));
  const [fullscreenExits, setFullscreenExits] = useState(0);
  const [showFullscreenModal, setShowFullscreenModal] = useState(false);
  const [tabSwitchCount, setTabSwitchCount] = useState(0);
  const [copyPasteAttempts, setCopyPasteAttempts] = useState(0);
  const [isWorkspaceLocked, setIsWorkspaceLocked] = useState(false);
  const [isExitConfirmOpen, setIsExitConfirmOpen] = useState(false);
  const lastTabSwitchRecordedRef = useRef<number>(0);
  const lastTabSwitchToastRef = useRef<number>(0);
  const prevCodeLengthRef = useRef<number>(0);
  const lastCodeChangeTimeRef = useRef<number>(Date.now());
  const MAX_TAB_SWITCHES = 3;

  // Real-time Proctoring Alert HUD & Web Audio Warning
  const [proctorWarningBanner, setProctorWarningBanner] = useState<{
    message: string;
    type: 'tab' | 'fullscreen' | 'paste' | 'cadence';
  } | null>(null);
  const warningBannerTimerRef = useRef<any>(null);

  const playProctorAlertSound = useCallback(() => {
    try {
      if (typeof navigator !== 'undefined' && (navigator as any).userActivation && !(navigator as any).userActivation.hasBeenActive) {
        return;
      }
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      if (ctx.state === 'suspended') {
        ctx.close().catch(() => {});
        return;
      }
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(329.63, ctx.currentTime + 0.28);
      gain.gain.setValueAtTime(0.12, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.28);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.28);
    } catch {}
  }, []);

  const triggerProctorWarning = useCallback(
    (message: string, type: 'tab' | 'fullscreen' | 'paste' | 'cadence') => {
      playProctorAlertSound();
      setProctorWarningBanner({ message, type });
      if (warningBannerTimerRef.current) clearTimeout(warningBannerTimerRef.current);
      warningBannerTimerRef.current = setTimeout(() => {
        setProctorWarningBanner(null);
      }, 5000);
    },
    [playProctorAlertSound]
  );

  const syncTelemetryToCloud = useCallback((updates: { tabSwitchCount?: number; copyPasteAttempts?: number; fullscreenExits?: number }) => {
    const uid = (user as any)?.uid || (user as any)?.id || auth.currentUser?.uid || 'current';
    FirestoreDataService.saveProctoringTelemetry(uid, {
      tabSwitchCount: updates.tabSwitchCount ?? tabSwitchCount,
      copyPasteAttempts: updates.copyPasteAttempts ?? copyPasteAttempts,
      fullscreenExits: updates.fullscreenExits ?? fullscreenExits,
      lastIncidentAt: new Date().toISOString(),
    }).catch(() => {});
  }, [user, tabSwitchCount, copyPasteAttempts, fullscreenExits]);

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
      toast.error('Unable to toggle fullscreen.');
    }
  };

  // Prompt fullscreen on load via explicit user gesture modal
  useEffect(() => {
    const timer = setTimeout(() => {
      if (!document.fullscreenElement) {
        setShowFullscreenModal(true);
      } else {
        setIsFullscreen(true);
      }
    }, 400);

    return () => clearTimeout(timer);
  }, []);

  // Fullscreen Exit Detection & Enforcement
  useEffect(() => {
    const handleFullscreenChange = () => {
      const active = Boolean(document.fullscreenElement);
      setIsFullscreen(active);
      if (!active) {
        setFullscreenExits((prev) => {
          const next = prev + 1;
          syncTelemetryToCloud({ fullscreenExits: next });
          triggerProctorWarning(`Fullscreen exited (#${next})! Fullscreen is required in proctored mode.`, 'fullscreen');
          toast.error(`⚠️ Fullscreen exited! (Exit #${next}) Fullscreen is required during daily challenge.`, {
            duration: 6000,
          });
          const uid = (user as any)?.uid || (user as any)?.id || auth.currentUser?.uid || 'current';
          FirestoreDataService.recordProctoringIncident(uid, {
            type: 'FULLSCREEN_EXIT',
            problemSlug: slug || 'daily-challenge',
            problemTitle: 'Daily Challenge',
            reason: `Fullscreen exited (Exit #${next})`,
          }).catch(() => {});
          setShowFullscreenModal(true);
          return next;
        });
      }
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, [syncTelemetryToCloud, triggerProctorWarning, slug, user]);

  // Tab switch & Window focus loss detection
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        const now = Date.now();
        if (now - lastTabSwitchRecordedRef.current < 1500) return;
        lastTabSwitchRecordedRef.current = now;
        setTabSwitchCount((prev) => {
          const next = prev + 1;
          syncTelemetryToCloud({ tabSwitchCount: next });
          triggerProctorWarning(`Tab switch #${next} detected! Focus loss is logged for faculty audit.`, 'tab');
          if (next >= MAX_TAB_SWITCHES) {
            setIsWorkspaceLocked(true);
            const uid = (user as any)?.uid || (user as any)?.id || auth.currentUser?.uid || 'current';
            const violationReason = `Exceeded ${MAX_TAB_SWITCHES} tab switches on Daily Challenge`;
            FirestoreDataService.recordProctoringIncident(uid, {
              type: 'EXCEEDED_TAB_SWITCHES',
              problemSlug: problem?.slug || slug || 'daily-challenge',
              problemTitle: problem?.title || 'Daily Challenge',
              reason: violationReason,
              codeSnippet: code,
              isCheatAttempt: true,
              tag: 'TRY_TO_CHEAT',
            }).catch(() => {});

            try {
              const qKey = 'logicq_quarantined_problems';
              const existing = JSON.parse(localStorage.getItem(qKey) || '[]');
              existing.push(problem?.slug || slug || 'daily-challenge');
              existing.push(problem?.title || 'Daily Challenge');
              localStorage.setItem(qKey, JSON.stringify(Array.from(new Set(existing))));
              localStorage.setItem(`logicq_quarantined_daily_${uid}`, 'true');
            } catch {}

            if (problem?.id) {
              api.post('/submissions/submit', {
                problemId: problem.id,
                code: code || '// Quarantined attempt',
                isCheatAutoSubmit: true,
                violationReason,
              }).then((res) => {
                if (res?.data?.submission) {
                  setSubmissionResult(res.data.submission);
                }
              }).catch(() => {});
            }

            FirestoreDataService.recordCheatSubmission(uid, {
              problemId: problem?.id || 'daily-challenge',
              problemTitle: problem?.title || 'Daily Challenge',
              problemSlug: problem?.slug || slug || 'daily-challenge',
              code: code || '// Quarantined attempt',
              violationReason,
              difficulty: problem?.difficulty || 'EASY',
            }).catch(() => {});

            setIsDrawerOpen(true);
            setActiveBottomTab('output');
            toast.error('🚨 Exceeded tab switches! Daily Challenge auto-locked & submitted with 0 marks penalty.', { duration: 10000 });
          }
          return next;
        });
      } else {
        const now = Date.now();
        if (now - lastTabSwitchToastRef.current > 1500) {
          lastTabSwitchToastRef.current = now;
          toast.error('⚠️ Tab Switch Detected! Daily challenge is proctored.', {
            duration: 5000,
          });
        }
      }
    };

    const handleWindowBlur = () => {
      const now = Date.now();
      if (now - lastTabSwitchRecordedRef.current < 1500) return;
      lastTabSwitchRecordedRef.current = now;
      setTabSwitchCount((prev) => {
        const next = prev + 1;
        syncTelemetryToCloud({ tabSwitchCount: next });
        triggerProctorWarning(`Window focus lost! Focus away from challenge workspace is monitored.`, 'tab');
        return next;
      });
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('blur', handleWindowBlur);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('blur', handleWindowBlur);
    };
  }, [syncTelemetryToCloud, triggerProctorWarning, slug, user, code]);

  // Anti-Cheat: Strict Copy-Paste & Right-Click Prevention (Document-wide)
  useEffect(() => {
    const blockCopy = (e: ClipboardEvent) => {
      e.preventDefault();
      toast.error('🚫 Copying text is strictly disabled during Daily Challenge!');
    };
    const blockCut = (e: ClipboardEvent) => {
      e.preventDefault();
      toast.error('🚫 Cutting text is disabled during Daily Challenge.');
    };
    const blockPaste = (e: ClipboardEvent) => {
      e.preventDefault();
      setCopyPasteAttempts((prev) => {
        const next = prev + 1;
        syncTelemetryToCloud({ copyPasteAttempts: next });
        triggerProctorWarning(`🚫 Pasting is strictly blocked! Please type your code manually.`, 'paste');
        toast.error(`🚫 Pasting is disabled! Type code manually. Clipboard actions are recorded.`);
        const uid = (user as any)?.uid || (user as any)?.id || auth.currentUser?.uid || 'current';
        FirestoreDataService.recordProctoringIncident(uid, {
          type: 'COPY_PASTE',
          problemSlug: slug || 'daily-challenge',
          problemTitle: 'Daily Challenge',
          reason: `Clipboard paste attempted (#${next})`,
          codeSnippet: code,
        }).catch(() => {});
        return next;
      });
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
  }, [syncTelemetryToCloud, triggerProctorWarning, slug, user, code]);

  // Track online/offline state for mobile PWA resilience
  useEffect(() => {
    const onOnline = () => setIsOffline(false);
    const onOffline = () => setIsOffline(true);
    const onSimulateSwitch = () => {
      setRemainingSeconds(0);
      setIsWindowExpired(true);
    };
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    window.addEventListener('logicq:simulate-1700-switch', onSimulateSwitch);
    return () => {
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
      window.removeEventListener('logicq:simulate-1700-switch', onSimulateSwitch);
    };
  }, []);

  // Fetch problem details (disable refetchOnWindowFocus so switching browser tabs never resets workspace)
  const endpoint = slug ? `/problems/${slug}` : '/problems/daily';
  const {
    data: problemData,
    isLoading,
    error: problemError,
    refetch: refetchProblem,
  } = useQuery({
    queryKey: ['problem', slug || 'daily'],
    queryFn: () => api.get(endpoint),
    refetchOnWindowFocus: false,
    retry: false,
  });

  const problem = problemData?.data?.problem;
  const isDaily = !slug || Boolean(problem?.isDaily);
  const seasonComplete = problemData?.data?.seasonComplete === true;
  const userStatus = problemData?.data?.userStatus;
  const serverSecondsUntilReset = problemData?.data?.secondsUntilNextReset;

  // For Daily Challenge, prevent custom stdin tab
  useEffect(() => {
    if (isDaily && activeBottomTab === 'custom') {
      setActiveBottomTab('cases');
    }
  }, [isDaily, activeBottomTab]);

  // Initialize & tick down the 17:00 IST challenge window timer while the page is open
  useEffect(() => {
    if (typeof serverSecondsUntilReset === 'number' && serverSecondsUntilReset > 0) {
      setRemainingSeconds(serverSecondsUntilReset);
      setIsWindowExpired(false);
    }
  }, [problem?.id, serverSecondsUntilReset]);

  useEffect(() => {
    if (remainingSeconds === null || remainingSeconds <= 0) return;
    const interval = setInterval(() => {
      setRemainingSeconds((prev) => {
        if (prev === null) return null;
        if (prev <= 1) {
          setIsWindowExpired(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [remainingSeconds !== null && remainingSeconds > 0]);

  // Target time limit based on difficulty (Easy: 20m, Medium: 30m, Hard: 40m)
  const difficultyUpper = problem?.difficulty?.toUpperCase() || 'EASY';
  const targetLimitMinutes = difficultyUpper === 'HARD' ? 40 : difficultyUpper === 'MEDIUM' ? 30 : 20;
  const targetLimitSeconds = targetLimitMinutes * 60;

  // Initialize solve timer from localStorage
  useEffect(() => {
    if (!problem?.id) return;
    try {
      const saved = localStorage.getItem(`logicq_solve_timer_${problem.id}`);
      if (saved) {
        const parsed = parseInt(saved, 10);
        if (!isNaN(parsed) && parsed > 0) {
          setElapsedSeconds(parsed);
        }
      }
    } catch {}
  }, [problem?.id]);

  // Tick up solve timer while solving and not yet solved or locked
  useEffect(() => {
    if (isWindowExpired || isWorkspaceLocked || userStatus?.isSolved || submissionResult?.verdict === 'ACCEPTED') {
      return;
    }
    const interval = setInterval(() => {
      setElapsedSeconds((prev) => {
        const next = prev + 1;
        if (problem?.id && next % 5 === 0) {
          try {
            localStorage.setItem(`logicq_solve_timer_${problem.id}`, String(next));
          } catch {}
        }
        return next;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [problem?.id, isWindowExpired, isWorkspaceLocked, userStatus?.isSolved, submissionResult?.verdict]);

  const formatSolveTimer = (sec: number): string => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  // Initialize starter or draft code ONLY once per problem ID
  useEffect(() => {
    if (problem && initializedProblemIdRef.current !== problem.id) {
      initializedProblemIdRef.current = problem.id;

      // 1. Read local cache first for instantaneous rendering
      const localDraft = DraftSyncService.getLocalDraft(problem.slug, false);
      let initialCode = problem.starterCode;

      if (localDraft?.code) {
        initialCode = localDraft.code;
        setCode(localDraft.code);
      } else if (userStatus?.savedCode) {
        initialCode = userStatus.savedCode;
        setCode(userStatus.savedCode);
      } else {
        setCode(problem.starterCode);
      }

      if (problem.testCases && problem.testCases.length > 0) {
        setCustomInput(problem.testCases[0].input);
      }

      // 2. Fetch authoritative cloud draft from Firestore if authenticated
      if (user?.id) {
        DraftSyncService.fetchRemoteDraft(user.id, problem.slug, false).then((remoteDraft) => {
          if (!remoteDraft) return;

          const conflict = DraftSyncService.detectConflict(localDraft, remoteDraft);
          if (conflict) {
            setConflictInfo(conflict);
          } else if (remoteDraft.code && remoteDraft.code !== initialCode) {
            setCode(remoteDraft.code);
            DraftSyncService.saveLocalDraft(remoteDraft, false);
          }
        }).catch(() => {});
      }
    }
  }, [problem, userStatus, user?.id]);

  // Persist draft to local cache immediately and debounce Firestore cloud sync
  const handleCodeChange = (nextCode: string) => {
    if (isWindowExpired || isWorkspaceLocked) return;

    const now = Date.now();
    const timeDelta = now - lastCodeChangeTimeRef.current;
    const lengthDelta = nextCode.length - prevCodeLengthRef.current;
    prevCodeLengthRef.current = nextCode.length;
    lastCodeChangeTimeRef.current = now;

    // Keystroke cadence detector: sudden injection of >160 chars in <250ms indicates automated script/paste
    if (lengthDelta > 160 && timeDelta < 250) {
      triggerProctorWarning('Rapid code burst detected (>160 chars/s)! All inputs are cadence monitored.', 'cadence');
      toast.warning('⚠️ Unusually fast typing / code insertion detected. Keystroke cadence is logged.');
    }

    setCode(nextCode);

    if (problem?.slug) {
      const now = Date.now();
      const draftObj: DraftData = {
        problemId: problem.id,
        problemSlug: problem.slug,
        code: nextCode,
        customInput,
        updatedAt: now,
        deviceLabel: getDeviceLabel(),
      };

      // Fast local save
      DraftSyncService.saveLocalDraft(draftObj, false);

      // Debounced cloud save
      if (user?.id && !isOffline) {
        setDraftSyncStatus('saving');
        if (autosaveTimerRef.current) {
          clearTimeout(autosaveTimerRef.current);
        }
        autosaveTimerRef.current = setTimeout(async () => {
          const success = await DraftSyncService.saveRemoteDraft(user.id, draftObj, false);
          setDraftSyncStatus(success ? 'saved' : 'offline');
        }, 1500);
      } else {
        setDraftSyncStatus('offline');
      }
    }
  };

  // Conflict resolution actions
  const handleKeepRemoteDraft = () => {
    if (conflictInfo) {
      setCode(conflictInfo.remoteDraft.code);
      DraftSyncService.saveLocalDraft(conflictInfo.remoteDraft, false);
      setConflictInfo(null);
      toast.success('Restored newer draft from cloud');
    }
  };

  const handleKeepLocalDraft = () => {
    if (conflictInfo && user?.id) {
      const updatedLocal: DraftData = {
        ...conflictInfo.localDraft,
        updatedAt: Date.now(),
        deviceLabel: getDeviceLabel(),
      };
      DraftSyncService.saveLocalDraft(updatedLocal, false);
      DraftSyncService.saveRemoteDraft(user.id, updatedLocal, false);
      setConflictInfo(null);
      toast.success('Kept local code and updated cloud');
    }
  };

  // Cleanup any active verdict polling timer on unmount
  useEffect(() => {
    return () => {
      if (pollTimerRef.current) {
        clearInterval(pollTimerRef.current);
      }
    };
  }, []);

  // Run Code mutation (Ephemeral dry run against real C compiler)
  const runMutation = useMutation({
    mutationFn: () =>
      api.post('/submissions/run', {
        problemId: problem?.id,
        code,
        stdin: customInput,
        timeLimitMs: problem?.timeLimitMs || 1000,
      }),
    onSuccess: (res) => {
      setSubmissionResult(null);
      setRunResult(res.data);
      setActiveBottomTab('output');
      setIsDrawerOpen(true);
      setActiveMobileTab('results');
    },
    onError: (err: any) => {
      if (err?.status === 403 || err?.status === 410 || /ended/i.test(String(err?.message || ''))) {
        setIsWindowExpired(true);
      }
      toast.error(err.message || 'Execution failed');
    },
  });

  // Submit Solution mutation (Official evaluation against all hidden & visible test cases)
  const submitMutation = useMutation({
    mutationFn: () =>
      api.post('/submissions/submit', {
        problemId: problem.id,
        code,
        timeTakenSeconds: elapsedSeconds,
        timeSpentSeconds: elapsedSeconds,
      }),
    onSuccess: (res) => {
      setRunResult(null);
      setIsDrawerOpen(true);
      setActiveBottomTab('output');
      setActiveMobileTab('results');

      const immediateSub = res?.data?.submission;
      if (
        immediateSub &&
        immediateSub.verdict &&
        immediateSub.verdict !== 'PENDING' &&
        immediateSub.verdict !== 'JUDGING'
      ) {
        const uid = (user as any)?.uid || (user as any)?.id || auth.currentUser?.uid || 'current';
        if (problem?.id && immediateSub) {
          FirestoreDataService.recordDailySubmission(uid, {
            problemId: problem.id,
            problemTitle: problem.title,
            problemSlug: problem.slug,
            difficulty: problem.difficulty || 'EASY',
            code,
            verdict: immediateSub.verdict,
            timeTakenSeconds: elapsedSeconds,
            tabSwitchCount,
            copyPasteAttempts,
            fullscreenExits,
          }).catch(() => {});
        }
        setSubmissionResult({
          submissionId: immediateSub.id,
          verdict: immediateSub.verdict,
          runtimeMs: immediateSub.runtimeMs ?? immediateSub.executionTimeMs ?? 14,
          compileOutput: immediateSub.compileOutput,
          pointsAwarded: res?.data?.pointsAwarded ?? immediateSub.pointsAwarded ?? 0,
          testCaseResults: immediateSub.testCaseResults,
        });
        if (immediateSub.verdict === 'ACCEPTED') {
          confetti({
            particleCount: 90,
            spread: 65,
            origin: { y: 0.6 },
            colors: ['#8B9BFF', '#46D9A0'],
          });
          toast.success(
            (res?.data?.pointsAwarded ?? immediateSub.pointsAwarded) > 0
              ? `Accepted! +${res?.data?.pointsAwarded ?? immediateSub.pointsAwarded} points awarded!`
              : 'Accepted! All test cases passed.'
          );
          refreshUser();
        } else {
          toast.error(`Verdict: ${immediateSub.verdict.replace(/_/g, ' ')}`);
        }
        queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
        queryClient.invalidateQueries({ queryKey: ['problem'] });
        queryClient.invalidateQueries({ queryKey: ['daily-challenge'] });
        RealtimeSyncService.emit('SUBMISSIONS');
        RealtimeSyncService.emit('DASHBOARD');
        return;
      }

      toast.info('Submitted! Evaluating in C11 sandbox...');

      // Visibility-aware HTTP polling for submission verdict
      const subId = res?.data?.submissionId || immediateSub?.id;
      if (subId) {
        if (pollTimerRef.current) clearInterval(pollTimerRef.current);
        let attempts = 0;
        pollTimerRef.current = setInterval(async () => {
          if (typeof document !== 'undefined' && document.hidden) return;
          attempts++;
          try {
            const subRes = await api.get(`/submissions/${subId}`);
            const sub = subRes?.data?.submission;
            if (sub && sub.verdict !== 'PENDING' && sub.verdict !== 'JUDGING') {
              if (pollTimerRef.current) {
                clearInterval(pollTimerRef.current);
                pollTimerRef.current = null;
              }
              const uid = (user as any)?.uid || (user as any)?.id || auth.currentUser?.uid || 'current';
              if (problem?.id) {
                FirestoreDataService.recordDailySubmission(uid, {
                  problemId: problem.id,
                  problemTitle: problem.title,
                  problemSlug: problem.slug,
                  difficulty: problem.difficulty || 'EASY',
                  code,
                  verdict: sub.verdict,
                  timeTakenSeconds: elapsedSeconds,
                  tabSwitchCount,
                  copyPasteAttempts,
                  fullscreenExits,
                }).catch(() => {});
              }
              setSubmissionResult((prev: any) =>
                prev?.submissionId === subId
                  ? prev
                  : {
                      submissionId: sub.id,
                      verdict: sub.verdict,
                      runtimeMs: sub.runtimeMs ?? sub.executionTimeMs ?? 0,
                      compileOutput: sub.compileOutput,
                      pointsAwarded: sub.pointsAwarded,
                      testCaseResults: sub.testCaseResults,
                    }
              );
              if (sub.verdict === 'ACCEPTED') {
                confetti({
                  particleCount: 90,
                  spread: 65,
                  origin: { y: 0.6 },
                  colors: ['#8B9BFF', '#46D9A0'],
                });
                toast.success(
                  sub.pointsAwarded > 0
                    ? `Accepted! +${sub.pointsAwarded} points awarded!`
                    : 'Accepted! All test cases passed.',
                  { icon: <Sparkles className="w-5 h-5 text-emerald-400" /> }
                );
                refreshUser();
              } else {
                toast.error(`Verdict: ${sub.verdict.replace(/_/g, ' ')}`);
              }
              queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
              queryClient.invalidateQueries({ queryKey: ['problem'] });
              queryClient.invalidateQueries({ queryKey: ['daily-challenge'] });
              RealtimeSyncService.emit('SUBMISSIONS');
              RealtimeSyncService.emit('DASHBOARD');
            }
          } catch {
            // Ignore transient poll error
          }
          if (attempts >= 12 && pollTimerRef.current) {
            clearInterval(pollTimerRef.current);
            pollTimerRef.current = null;
          }
        }, 800);
      }
    },
    onError: (err: any) => {
      if (err?.status === 403 || err?.status === 410 || /ended/i.test(String(err?.message || ''))) {
        setIsWindowExpired(true);
      }
      toast.error(err.message || 'Submission failed');
    },
  });

  // Global Keyboard Shortcuts (Ctrl+Enter for Run, Ctrl+Shift+Enter for Submit)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'Enter') {
        e.preventDefault();
        if (!isOffline && !isWindowExpired && !submitMutation.isPending) {
          submitMutation.mutate();
        }
      } else if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        if (!isOffline && !isWindowExpired && !runMutation.isPending) {
          runMutation.mutate();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOffline, isWindowExpired, runMutation, submitMutation]);

  const handleResetCode = () => {
    if (problem && !isWindowExpired) {
      setCode(problem.starterCode);
      try {
        localStorage.removeItem(`logicq_draft_${problem.slug}`);
      } catch {
        // Ignore storage error
      }
      toast.info('Code restored to starter boilerplate');
    }
  };

  const isChallengeEnded =
    (problemError as any)?.status === 410 ||
    (problemError as any)?.code === 'CHALLENGE_ENDED' ||
    (problemError as any)?.ended === true;

  if (isLoading) {
    return (
      <div className="h-[80vh] flex items-center justify-center font-mono text-cyan-400 text-sm">
        <Cpu className="w-6 h-6 animate-spin mr-2" />
        Initializing LogicQ C Workspace...
      </div>
    );
  }

  // Offline state when today's active challenge has not been loaded or has expired past 17:00 IST
  if (isOffline && (!problem || isWindowExpired)) {
    return (
      <div
        data-testid="offline-challenge-state"
        className="max-w-2xl mx-auto py-20 px-4 text-center space-y-4 font-mono"
      >
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[var(--bg-panel)] border border-[var(--color-error)] text-[var(--color-error)] text-xs font-bold">
          <WifiOff className="w-4 h-4" />
          <span>You Are Offline</span>
        </div>
        <h1 className="text-xl sm:text-2xl font-heading font-extrabold text-[var(--text-main)]">
          Reconnect to load today&apos;s 17:00 IST challenge
        </h1>
        <p className="text-xs sm:text-sm text-[var(--text-muted)] font-sans">
          Past problem statements are never served from cache. Please connect to the internet so we can verify the server clock and load today&apos;s active challenge.
        </p>
      </div>
    );
  }

  const isDailyPaused =
    problemData?.data?.paused === true ||
    (!slug && !problem && !seasonComplete && !isChallengeEnded);

  if (isDailyPaused) {
    return (
      <div
        data-testid="challenge-paused-page"
        className="max-w-2xl mx-auto py-24 px-4 text-center space-y-5 font-mono"
      >
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[var(--bg-panel)] border border-[var(--border-line)] text-cyan-400 text-xs font-bold">
          <Sparkles className="w-3.5 h-3.5" />
          <span>Daily Challenge</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-heading font-extrabold text-[var(--text-main)]">
          Daily challenges are not live yet. We will announce the start.
        </h1>
        <p className="text-sm text-[var(--text-muted)] max-w-md mx-auto leading-relaxed">
          While the daily challenge pool is being prepared, you can solve curated C problems across modules in the Practice section.
        </p>
        <div className="pt-2">
          <Link
            to="/practice"
            className="inline-flex items-center justify-center min-h-[44px] px-6 py-2.5 rounded-xl bg-[var(--color-accent)] text-[#0C0F1F] text-xs font-mono font-bold shadow-md hover:opacity-95 transition-opacity"
          >
            Go to Practice &rarr;
          </Link>
        </div>
      </div>
    );
  }

  if (seasonComplete) {
    return (
      <div
        data-testid="season-complete-page"
        className="max-w-3xl mx-auto py-20 px-4 text-center space-y-4"
      >
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[var(--bg-panel)] border border-[var(--color-success)] text-[var(--color-success)] text-xs font-mono font-bold">
          <CheckCircle2 className="w-4 h-4" />
          <span>Season Complete</span>
        </div>
        <h1 className="text-2xl font-heading font-extrabold text-[var(--text-main)]">
          All syllabus challenges for this season are complete!
        </h1>
        <p className="text-sm text-[var(--text-muted)]">
          Check the Leaderboard to see your final standings while the next chapter pool is prepared.
        </p>
        <Link
          to="/leaderboard"
          className="inline-flex items-center justify-center min-h-[44px] px-5 py-2.5 rounded-xl bg-[var(--color-accent)] text-[#0C0F1F] text-sm font-bold"
        >
          View Daily Leaderboard
        </Link>
      </div>
    );
  }

  if (isChallengeEnded) {
    return (
      <div
        data-testid="challenge-ended-page"
        className="max-w-2xl mx-auto py-20 px-4 text-center space-y-5"
      >
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[var(--bg-panel)] border border-[var(--border-line)] text-[var(--text-muted)] text-xs font-mono font-semibold">
          <Calendar className="w-3.5 h-3.5 text-[var(--color-accent)]" />
          <span>17:00 IST Daily Window Closed</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-heading font-extrabold text-[var(--text-main)]">
          This challenge has ended
        </h1>
        <p className="text-sm text-[var(--text-muted)] max-w-md mx-auto leading-relaxed">
          Each LogicQ challenge is open for 24 hours from 17:00 IST to the next 17:00 IST. Past challenges are closed and their statements are no longer available.
        </p>
        <div className="pt-2">
          <Link
            to="/challenge"
            data-testid="back-to-todays-challenge-link"
            className="inline-flex items-center justify-center min-h-[44px] px-6 py-2.5 rounded-xl bg-[var(--color-accent)] text-[#0C0F1F] text-xs font-mono font-bold shadow-md hover:opacity-95 transition-opacity"
          >
            Go to Today&apos;s Challenge &rarr;
          </Link>
        </div>
      </div>
    );
  }

  if (!problem) {
    return (
      <div
        data-testid="challenge-not-available-page"
        className="max-w-2xl mx-auto py-20 px-4 text-center font-mono space-y-4"
      >
        <h2 className="text-xl font-bold text-[var(--text-main)]">
          Challenge not available
        </h2>
        <p className="text-xs text-[var(--text-muted)]">
          Students can view and solve only today&apos;s active 17:00 IST challenge.
        </p>
        <Link
          to="/challenge"
          className="inline-block text-[var(--color-accent)] underline text-xs font-semibold"
        >
          &larr; Go to Today&apos;s Challenge
        </Link>
      </div>
    );
  }

  const sampleCases = problem.testCases || [];

  return (
    <div
      /* Non-proctored fallback height: calc(100dvh - var(--navbar-height, 4rem)) */
      className={`fixed inset-0 z-40 w-full h-[100dvh] max-h-[100dvh] flex flex-col overflow-hidden bg-[var(--bg-main)] text-[var(--text-main)] ${
        isFullscreen ? 'z-50' : ''
      }`}
    >
      {/* Real-time Proctoring Alert HUD Banner */}
      {proctorWarningBanner && (
        <div className="bg-rose-500/20 border-b border-rose-500/40 px-3 sm:px-4 py-2 flex items-center justify-between text-xs font-mono text-rose-300 shrink-0 z-30 animate-in fade-in duration-150">
          <div className="flex items-center gap-2 min-w-0">
            <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 animate-bounce" />
            <span className="truncate font-semibold">{proctorWarningBanner.message}</span>
          </div>
          <span className="px-2 py-0.5 rounded bg-rose-500/30 text-rose-200 border border-rose-500/50 text-[10px] font-bold shrink-0">
            PROCTORING LOGGED
          </span>
        </div>
      )}

      {/* Inactive Fullscreen Warning Banner */}
      {!isFullscreen && (
        <div className="bg-amber-500/15 border-b border-amber-500/30 px-3 sm:px-4 py-2 flex items-center justify-between text-xs font-mono text-amber-300 shrink-0 z-30">
          <div className="flex items-center gap-2 min-w-0">
            <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 animate-pulse" />
            <span className="truncate">
              Fullscreen is inactive{fullscreenExits > 0 ? ` (Exits: ${fullscreenExits})` : ''}. Daily Challenge requires proctored fullscreen mode.
            </span>
          </div>
          <button
            type="button"
            onClick={requestFullscreen}
            className="px-2.5 py-1 rounded-lg bg-amber-500 text-black font-bold text-[11px] hover:bg-amber-400 transition-colors shrink-0 ml-3 cursor-pointer"
          >
            Go Fullscreen 🔒
          </button>
        </div>
      )}

      {/* Dedicated Proctored Header Bar */}
      <div className="h-14 border-b border-[var(--border-line)] bg-[var(--bg-panel)] px-3 sm:px-4 flex items-center justify-between shrink-0 z-20">
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          <button
            type="button"
            onClick={() => setIsExitConfirmOpen(true)}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-[var(--border-line)] bg-[var(--bg-surface)] hover:bg-[var(--bg-surface-hover)] text-xs font-mono text-[var(--text-muted)] hover:text-rose-400 transition shrink-0 cursor-pointer"
            title="Exit challenge and return to dashboard"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Dashboard</span>
          </button>

          <div className="h-4 w-[1px] bg-[var(--border-line)] shrink-0" />

          <div className="min-w-0 flex items-center gap-2">
            <span className="px-2 py-0.5 rounded bg-indigo-500/10 border border-indigo-500/30 text-indigo-400 text-[11px] font-mono font-bold shrink-0">
              DAILY CHALLENGE
            </span>
            <span className="font-mono text-xs font-bold text-[var(--text-main)] truncate max-w-[140px] sm:max-w-[280px]">
              {problem.title}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          {/* 17:00 IST Window Timer */}
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[var(--bg-surface)] border border-[var(--border-line)] font-mono text-xs">
            <Clock className="w-3.5 h-3.5 text-cyan-400 animate-pulse" />
            <span className="text-[var(--text-muted)] hidden md:inline">17:00 IST Window:</span>
            <span className="text-cyan-400 font-bold">{formatCountdown(remainingSeconds)}</span>
          </div>

          {/* Fullscreen Toggle */}
          <button
            type="button"
            onClick={toggleFullscreen}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-[var(--border-line)] bg-[var(--bg-surface)] hover:bg-[var(--bg-surface-hover)] text-xs font-mono text-[var(--text-muted)] hover:text-[var(--text-main)] transition cursor-pointer"
            title={isFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen'}
          >
            {isFullscreen ? (
              <>
                <Minimize2 className="w-3.5 h-3.5 text-emerald-400" />
                <span className="hidden sm:inline text-emerald-400 font-semibold">Proctored 🔒</span>
              </>
            ) : (
              <>
                <Maximize2 className="w-3.5 h-3.5 text-amber-400" />
                <span className="hidden sm:inline text-amber-400 font-semibold">Go Fullscreen</span>
              </>
            )}
          </button>
        </div>
      </div>
      {/* 17:00 IST Switch Banner when the page stays open across the daily cutoff */}
      {isWindowExpired && (
        <div
          data-testid="challenge-switch-banner"
          role="status"
          aria-live="polite"
          className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 px-4 py-2.5 bg-[var(--bg-surface)] border-b border-[var(--color-warning)] text-xs shrink-0"
        >
          <div className="flex items-center gap-2 text-[var(--text-main)]">
            <AlertCircle className="w-4 h-4 text-[var(--color-warning)] shrink-0" />
            <span>
              <strong className="font-bold">A new challenge is live. Refresh to see it.</strong>{' '}
              <span className="text-[var(--text-muted)]">
                This challenge ended at 17:00 IST. Your unsaved code is preserved in local drafts (
                <code className="font-mono">logicq_draft_{problem.slug}</code>) and the editor is now read-only.
              </span>
            </span>
          </div>
          <Link
            to="/challenge"
            data-testid="refresh-new-challenge-btn"
            onClick={() => {
              setIsWindowExpired(false);
              initializedProblemIdRef.current = null;
              queryClient.invalidateQueries({ queryKey: ['problem'] });
              queryClient.invalidateQueries({ queryKey: ['daily-challenge'] });
              if (!slug) {
                refetchProblem();
              }
            }}
            className="inline-flex items-center justify-center min-h-[36px] px-3.5 py-1.5 rounded-lg bg-[var(--color-accent)] text-[#0C0F1F] font-mono font-bold shrink-0"
          >
            Refresh to see today&apos;s challenge
          </Link>
        </div>
      )}

      {/* Mobile Workspace Tabs Header */}
      <div className="lg:hidden flex items-center justify-around border-b border-[var(--border-line)] bg-[var(--bg-panel)] text-xs font-mono shrink-0">
        <button
          type="button"
          onClick={() => setActiveMobileTab('statement')}
          className={`min-h-[44px] py-2.5 flex-1 text-center font-semibold border-b-2 transition-colors ${
            activeMobileTab === 'statement'
              ? 'text-[var(--color-accent)] border-[var(--color-accent)] bg-[var(--bg-surface)]'
              : 'text-[var(--text-muted)] border-transparent'
          }`}
        >
          Statement
        </button>
        <button
          type="button"
          onClick={() => setActiveMobileTab('editor')}
          className={`min-h-[44px] py-2.5 flex-1 text-center font-semibold border-b-2 transition-colors ${
            activeMobileTab === 'editor'
              ? 'text-[var(--color-accent)] border-[var(--color-accent)] bg-[var(--bg-surface)]'
              : 'text-[var(--text-muted)] border-transparent'
          }`}
        >
          C Editor
        </button>
        <button
          type="button"
          onClick={() => setActiveMobileTab('results')}
          className={`min-h-[44px] py-2.5 flex-1 text-center font-semibold border-b-2 transition-colors ${
            activeMobileTab === 'results'
              ? 'text-[var(--color-accent)] border-[var(--color-accent)] bg-[var(--bg-surface)]'
              : 'text-[var(--text-muted)] border-transparent'
          }`}
        >
          Test &amp; Console
        </button>
      </div>

      {/* Main Split Grid */}
      <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-12 lg:grid-rows-[minmax(0,1fr)] overflow-hidden">
        {/* Left Pane: Problem Statement (Columns 1-5 on desktop) */}
        <div
          className={`lg:col-span-5 h-full min-h-0 overflow-y-auto overscroll-contain scroll-pt-6 border-r border-[var(--border-line)] bg-[var(--bg-main)] p-6 space-y-6 ${
            activeMobileTab !== 'statement' ? 'hidden lg:block' : ''
          }`}
        >
          {/* Header */}
          <div className="space-y-3 pb-4 border-b border-[var(--border-line)]">
            {/* Live 17:00 IST Countdown Card */}
            <div className="p-3 rounded-xl bg-gradient-to-r from-cyan-500/10 via-indigo-500/10 to-transparent border border-cyan-500/25 flex items-center justify-between gap-3 font-mono">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-lg bg-cyan-500/20 text-cyan-400">
                  <Clock className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 uppercase tracking-wider block font-semibold">
                    17:00 IST Daily Window
                  </span>
                  <div className="flex items-center gap-1.5 text-xs font-bold text-cyan-300">
                    <span className={`w-2 h-2 rounded-full ${isWindowExpired ? 'bg-rose-400' : 'bg-emerald-400 animate-pulse'}`} />
                    <span>
                      {isWindowExpired ? 'Window Closed' : `${formatCountdown(remainingSeconds)} remaining`}
                    </span>
                  </div>
                </div>
              </div>

              {userStatus?.isSolved ? (
                <span className="px-2.5 py-1 rounded-lg bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs font-bold flex items-center gap-1">
                  <CheckCircle className="w-3.5 h-3.5" />
                  Solved (+{problem.basePoints} PTS)
                </span>
              ) : (
                <span className="px-2.5 py-1 rounded-lg bg-amber-500/20 border border-amber-500/40 text-amber-300 text-xs font-bold flex items-center gap-1">
                  <Zap className="w-3.5 h-3.5 text-amber-400" />
                  +{problem.basePoints} PTS
                </span>
              )}
            </div>

            {/* Academic Kanetkar Book Reference */}
            {problem.sourceRefJson && (() => {
              try {
                const ref = JSON.parse(problem.sourceRefJson);
                if (ref?.chapter || ref?.chapterTitle) {
                  return (
                    <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-amber-500/10 border border-amber-500/25 text-amber-300 text-xs font-mono">
                      <BookOpen className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                      <span>
                        Yashavant Kanetkar: <strong>Chapter {ref.chapter}: {ref.chapterTitle}</strong>
                        {ref.exerciseNumber && ` (Q ${ref.exerciseNumber})`}
                      </span>
                    </div>
                  );
                }
              } catch {}
              return null;
            })()}

            <div className="flex items-center gap-2 flex-wrap">
              <DifficultyBadge difficulty={problem.difficulty} size="sm" />
              {problem.isDaily && (
                <span className="text-xs font-mono px-2 py-0.5 rounded bg-[var(--bg-surface)] text-[var(--color-accent)] border border-[var(--border-line)] font-semibold">
                  Daily Challenge
                </span>
              )}
              {userStatus?.isSolved && (
                <span className="text-xs font-mono px-2 py-0.5 rounded bg-[var(--bg-surface)] text-[var(--color-success)] border border-[var(--border-line)] flex items-center gap-1 font-semibold">
                  <Check className="w-3.5 h-3.5" /> Solved
                </span>
              )}
              {typeof userStatus?.attempts === 'number' && userStatus.attempts > 0 && (
                <span className="text-xs font-mono px-2 py-0.5 rounded bg-[var(--bg-surface)] text-cyan-400 border border-[var(--border-line)] font-semibold">
                  {userStatus.attempts} {userStatus.attempts === 1 ? 'Attempt' : 'Attempts'}
                </span>
              )}
            </div>

            <h1 className="text-xl sm:text-2xl font-bold text-[var(--text-main)]">{problem.title}</h1>

            <div className="flex flex-wrap items-center gap-3 text-xs font-mono text-[var(--text-muted)]">
              <span>
                Points: <strong className="text-[var(--color-accent)]">{problem.basePoints} PTS</strong>
              </span>
              <span>•</span>
              <span>Time: {problem.timeLimitMs}ms</span>
              <span>•</span>
              <span>Memory: {problem.memoryLimitMb}MB</span>
            </div>

            {/* Tags */}
            {(() => {
              const tagsList = Array.isArray(problem.tags)
                ? problem.tags
                : typeof problem.tags === 'string'
                ? (() => {
                    try {
                      return JSON.parse(problem.tags);
                    } catch {
                      return [];
                    }
                  })()
                : [];
              if (!tagsList || tagsList.length === 0) return null;
              return (
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {tagsList.map((tag: string) => (
                    <span
                      key={tag}
                      className="px-2 py-0.5 rounded text-xs font-mono bg-[var(--bg-surface)] text-[var(--text-muted)] border border-[var(--border-line)]"
                    >
                      #{tag}
                    </span>
                  ))}
                </div>
              );
            })()}
          </div>

          {/* Markdown Content */}
          <StatementMarkdown content={problem.description || ''} />

          {/* Visible Sample Test Cases (kept inside problem statement left panel) */}
          {sampleCases.length > 0 && (
            <div className="space-y-4 pt-4 border-t border-[var(--border-line)]">
              <h3 className="text-xs font-mono font-bold text-[var(--text-main)] uppercase tracking-wider flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-[var(--color-accent)]" />
                <span>Sample Test Cases</span>
              </h3>

              {sampleCases.map((tc: any, index: number) => (
                <div
                  key={tc.id || index}
                  className="rounded-xl border border-[var(--border-line)] bg-[var(--bg-panel)] p-3.5 space-y-2 text-xs font-mono"
                >
                  <span className="text-[var(--text-muted)] font-semibold block">Case {index + 1}:</span>
                  <div>
                    <span className="text-[var(--text-muted)] block text-xs">INPUT</span>
                    <pre className="p-2 rounded bg-[var(--bg-main)] text-[var(--color-accent)] border border-[var(--border-line)] overflow-x-auto">
                      {tc.input}
                    </pre>
                  </div>
                  <div>
                    <span className="text-[var(--text-muted)] block text-xs">EXPECTED OUTPUT</span>
                    <pre className="p-2 rounded bg-[var(--bg-main)] text-[var(--color-success)] border border-[var(--border-line)] overflow-x-auto">
                      {tc.expectedOutput}
                    </pre>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right Pane: Code Editor & Execution Drawer (Columns 6-12 on desktop) */}
        <div
          className={`lg:col-span-7 flex flex-col h-full min-h-0 bg-[var(--bg-main)] overflow-hidden ${
            activeMobileTab === 'statement' ? 'hidden lg:flex' : ''
          }`}
        >
          {/* Editor Container */}
          <div className="flex-1 min-h-0 overflow-hidden">
            <CodeEditor
              code={code}
              onChange={handleCodeChange}
              onRun={() => !isOffline && !isWindowExpired && !isWorkspaceLocked && runMutation.mutate()}
              onSubmit={() => !isOffline && !isWindowExpired && !isWorkspaceLocked && submitMutation.mutate()}
              onReset={isDaily ? undefined : handleResetCode}
              headerExtra={
                <div
                  className={`flex items-center gap-1.5 px-2.5 py-1 text-xs font-mono rounded-md border transition-all ${
                    elapsedSeconds > targetLimitSeconds
                      ? 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                      : 'bg-cyan-500/10 text-cyan-400 border-cyan-500/25'
                  }`}
                  title={`Solve timer (Easy: 20m, Medium: 30m, Hard: 40m). Time spent: ${formatSolveTimer(elapsedSeconds)}`}
                >
                  <Clock className={`w-3.5 h-3.5 ${elapsedSeconds > targetLimitSeconds ? 'text-amber-400' : 'text-cyan-400'} animate-pulse`} />
                  <span className="font-bold">{formatSolveTimer(elapsedSeconds)}</span>
                  <span className="text-[10px] opacity-70">/ {targetLimitMinutes}m</span>
                </div>
              }
              isSubmitting={submitMutation.isPending}
              isRunning={runMutation.isPending}
              readOnly={isWindowExpired || isWorkspaceLocked}
              disableCopyPaste={true}
              onBlockedAction={(action) => {
                if (action === 'paste') {
                  setCopyPasteAttempts((prev) => {
                    const next = prev + 1;
                    syncTelemetryToCloud({ copyPasteAttempts: next });
                    triggerProctorWarning('🚫 Pasting is strictly blocked! Please type code manually.', 'paste');
                    const uid = (user as any)?.uid || (user as any)?.id || auth.currentUser?.uid || 'current';
                    FirestoreDataService.recordProctoringIncident(uid, {
                      type: 'COPY_PASTE',
                      problemSlug: problem?.slug || slug || 'daily-challenge',
                      problemTitle: problem?.title || 'Daily Challenge',
                      reason: `Editor paste blocked (Attempt #${next})`,
                      codeSnippet: code,
                    }).catch(() => {});
                    return next;
                  });
                } else if (action === 'copy' || action === 'cut') {
                  toast.error(`🚫 ${action === 'copy' ? 'Copying' : 'Cutting'} code is disabled during Daily Challenge.`);
                }
              }}
            />
          </div>

                    {/* Bottom Execution Panel Drawer (Apple-style Segmented Dock & Spring Inspector) */}
          <div
            className={`border-t border-[var(--border-line)] bg-[var(--bg-panel)] shadow-xl transition-[height] duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] flex flex-col shrink-0 overflow-hidden ${
              isDrawerOpen ? 'h-72 sm:h-84 max-h-[52%]' : 'h-12'
            }`}
          >
            {/* Drawer Header with Apple Segmented Control */}
            <div className="flex items-center justify-between px-4 py-1.5 bg-[var(--bg-surface)] border-b border-[var(--border-line)] shrink-0 font-mono text-xs">
              <div className="apple-segmented-group">
                <button
                  type="button"
                  data-testid="tab-sample-cases"
                  onClick={() => {
                    setActiveBottomTab('cases');
                    setIsDrawerOpen(true);
                  }}
                  className={`apple-segmented-item ${
                    activeBottomTab === 'cases' && isDrawerOpen
                      ? 'bg-[var(--bg-panel)] text-[var(--color-accent)] shadow-sm'
                      : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'
                  }`}
                >
                  <Layers className="w-3.5 h-3.5" />
                  <span>Test Cases ({sampleCases.length})</span>
                </button>

                {!isDaily && (
                  <button
                    type="button"
                    data-testid="tab-custom-stdin"
                    onClick={() => {
                      setActiveBottomTab('custom');
                      setIsDrawerOpen(true);
                    }}
                    className={`apple-segmented-item ${
                      activeBottomTab === 'custom' && isDrawerOpen
                        ? 'bg-[var(--bg-panel)] text-[var(--color-accent)] shadow-sm'
                        : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'
                    }`}
                  >
                    <Terminal className="w-3.5 h-3.5" />
                    <span>Custom Stdin</span>
                  </button>
                )}

                <button
                  type="button"
                  data-testid="tab-verdict-output"
                  onClick={() => {
                    setActiveBottomTab('output');
                    setIsDrawerOpen(true);
                  }}
                  className={`apple-segmented-item ${
                    activeBottomTab === 'output' && isDrawerOpen
                      ? 'bg-[var(--bg-panel)] text-[var(--color-accent)] shadow-sm'
                      : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'
                  }`}
                >
                  <Cpu className="w-3.5 h-3.5" />
                  <span>Verdict &amp; Output</span>
                  {submissionResult && (
                    <span className="ml-1 inline-block w-2 h-2 rounded-full bg-[var(--color-accent)] animate-ping" />
                  )}
                </button>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  data-testid="run-code-button"
                  onClick={() => runMutation.mutate()}
                  disabled={runMutation.isPending || isOffline || isWindowExpired}
                  title="Run code with active stdin (Ctrl + Enter)"
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-mono font-bold text-[var(--text-main)] bg-[var(--bg-panel)] hover:bg-[var(--bg-surface-hover)] border border-[var(--border-line)] disabled:opacity-50 transition-all cursor-pointer shadow-xs"
                >
                  <Play className="w-3 h-3 text-cyan-400 fill-current" />
                  <span>{runMutation.isPending ? 'Running...' : 'Run Code'}</span>
                </button>

                <button
                  type="button"
                  data-testid="submit-solution-button"
                  onClick={() => submitMutation.mutate()}
                  disabled={submitMutation.isPending || isOffline || isWindowExpired}
                  title="Submit solution to judge all test cases (Ctrl + Shift + Enter)"
                  className="flex items-center gap-1.5 px-4 py-1.5 rounded-xl text-xs font-mono font-bold text-white bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 shadow-sm disabled:opacity-50 transition-all cursor-pointer"
                >
                  <Send className="w-3 h-3" />
                  <span>{submitMutation.isPending ? 'Evaluating...' : 'Submit'}</span>
                </button>

                <button
                  type="button"
                  aria-label={isDrawerOpen ? 'Collapse execution drawer' : 'Expand execution drawer'}
                  onClick={() => setIsDrawerOpen(!isDrawerOpen)}
                  className="px-2 py-1 rounded-xl text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[var(--bg-panel)] border border-transparent hover:border-[var(--border-line)] transition-all flex items-center gap-1 font-mono text-xs cursor-pointer ml-1"
                >
                  <span className="hidden sm:inline font-semibold">{isDrawerOpen ? 'Collapse' : 'Expand'}</span>
                  <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-300 ${isDrawerOpen ? 'rotate-0' : 'rotate-180'}`} />
                </button>
              </div>
            </div>

            {/* Drawer Body */}
            {isDrawerOpen && (
              <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain p-4 font-mono text-xs">
                {/* Tab 1: Interactive Test Cases */}
                {activeBottomTab === 'cases' && (
                  <div className="h-full flex flex-col space-y-3 font-mono">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <div className="flex items-center gap-1.5 overflow-x-auto">
                        {sampleCases.length === 0 ? (
                          <span className="text-slate-400 text-xs">
                            {isDaily ? 'No sample cases provided.' : 'No sample cases. Use Custom Stdin.'}
                          </span>
                        ) : (
                          sampleCases.map((tc: any, idx: number) => (
                            <button
                              key={tc.id || idx}
                              type="button"
                              onClick={() => {
                                setSelectedCaseIndex(idx);
                                setCustomInput(tc.input);
                              }}
                              className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                                selectedCaseIndex === idx
                                  ? 'bg-gradient-to-r from-cyan-500 to-teal-500 text-white shadow-sm shadow-cyan-500/25 border border-cyan-400'
                                  : 'bg-[var(--bg-surface)] text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[var(--bg-surface-hover)] border border-[var(--border-line)]'
                              }`}
                            >
                              <span>Case {idx + 1}</span>
                            </button>
                          ))
                        )}
                      </div>

                      {sampleCases[selectedCaseIndex] && (
                        <button
                          type="button"
                          disabled={runMutation.isPending || isOffline || isWindowExpired}
                          onClick={() => {
                            setCustomInput(sampleCases[selectedCaseIndex].input);
                            runMutation.mutate();
                          }}
                          className="px-2.5 py-1 rounded-lg bg-cyan-500/15 hover:bg-cyan-500/25 text-cyan-600 dark:text-cyan-300 border border-cyan-500/30 text-[11px] font-bold transition flex items-center gap-1 cursor-pointer"
                        >
                          <Play className="w-3 h-3 fill-current" />
                          <span>Run Case {selectedCaseIndex + 1}</span>
                        </button>
                      )}
                    </div>

                    {sampleCases[selectedCaseIndex] && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 flex-1 min-h-0 text-xs">
                        <div className="flex flex-col min-h-0">
                          <span className="text-[var(--text-muted)] text-[11px] font-semibold mb-1 uppercase tracking-wider">
                            INPUT:
                          </span>
                          <pre className="flex-1 p-2.5 rounded-lg bg-[var(--bg-main)] text-cyan-700 dark:text-cyan-300 border border-[var(--border-line)] overflow-auto whitespace-pre font-mono">
                            {sampleCases[selectedCaseIndex].input}
                          </pre>
                        </div>
                        <div className="flex flex-col min-h-0">
                          <span className="text-[var(--text-muted)] text-[11px] font-semibold mb-1 uppercase tracking-wider">
                            EXPECTED OUTPUT:
                          </span>
                          <pre className="flex-1 p-2.5 rounded-lg bg-[var(--bg-main)] text-emerald-700 dark:text-emerald-300 border border-[var(--border-line)] overflow-auto whitespace-pre font-mono">
                            {sampleCases[selectedCaseIndex].expectedOutput}
                          </pre>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Tab 2: Custom Stdin (Disabled for Daily Challenge) */}
                {!isDaily && activeBottomTab === 'custom' && (
                  <div className="h-full flex flex-col">
                    <label
                      htmlFor="custom-stdin-input"
                      className="text-[var(--text-muted)] text-xs mb-1"
                    >
                      Standard Input (passed to program&apos;s stdin):
                    </label>
                    <textarea
                      id="custom-stdin-input"
                      value={customInput}
                      disabled={isWindowExpired}
                      onChange={(e) => setCustomInput(e.target.value)}
                      rows={4}
                      className="w-full flex-1 p-2.5 rounded-lg bg-[var(--bg-main)] border border-[var(--border-line)] text-xs font-mono text-[var(--text-main)] resize-none disabled:opacity-60"
                      placeholder="Enter raw input here..."
                    />
                  </div>
                )}

                {/* Tab 3: Verdict & Output */}
                {activeBottomTab === 'output' && (
                  <div className="space-y-4 font-mono">
                    {/* Submission Verdict Banner */}
                    {submissionResult && (
                      <div className="p-3.5 rounded-xl border border-[var(--border-line)] bg-[var(--bg-surface)] flex items-center justify-between flex-wrap gap-2">
                        <div className="flex items-center gap-3">
                          <VerdictBadge verdict={submissionResult.verdict} size="md" />
                          <span className="text-[var(--text-muted)]">
                            Runtime:{' '}
                            <strong className="text-[var(--text-main)]">
                              {submissionResult.runtimeMs}ms
                            </strong>
                          </span>
                        </div>
                        {submissionResult.pointsAwarded > 0 && (
                          <span className="text-[var(--color-success)] font-bold text-xs">
                            +{submissionResult.pointsAwarded} PTS Awarded!
                          </span>
                        )}
                      </div>
                    )}

                    {/* Per-Test Case Results list */}
                    {submissionResult?.testCaseResults && (
                      <div className="space-y-2">
                        <span className="text-xs text-[var(--text-muted)] font-semibold block uppercase">
                          Evaluation Results:
                        </span>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                          {submissionResult.testCaseResults.map((tc: any, idx: number) => (
                            <div
                              key={tc.id || idx}
                              className="p-2.5 rounded-lg bg-[var(--bg-main)] border border-[var(--border-line)] flex items-center justify-between"
                            >
                              <span className="text-[var(--text-muted)]">Test {idx + 1}</span>
                              <VerdictBadge verdict={tc.verdict} size="sm" />
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Compile Error Output */}
                    {submissionResult?.compileOutput && (
                      <div>
                        <span className="text-[var(--color-error)] font-semibold block mb-1">
                          Compiler Diagnostics:
                        </span>
                        <pre className="p-3 rounded-xl bg-[var(--bg-main)] border border-[var(--color-error)] text-[var(--color-error)] overflow-x-auto whitespace-pre-wrap font-mono text-xs leading-relaxed max-h-80 overflow-y-auto">
                          {submissionResult.compileOutput}
                        </pre>
                      </div>
                    )}

                    {/* Ephemeral Run Result Output */}
                    {runResult && !submissionResult && (
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-[var(--text-muted)] text-xs">Run Output:</span>
                          <span className="text-[var(--color-accent)] font-semibold">
                            {runResult.runtimeMs ?? runResult.executionTimeMs ?? 0}ms
                          </span>
                        </div>
                        {runResult.compileOutput ? (
                          <div>
                            <span className="text-[var(--color-error)] font-semibold block mb-1">
                              Compiler Diagnostics:
                            </span>
                            <pre className="p-3 rounded-xl bg-[var(--bg-main)] border border-[var(--color-error)] text-[var(--color-error)] overflow-x-auto whitespace-pre-wrap font-mono text-xs leading-relaxed max-h-80 overflow-y-auto">
                              {runResult.compileOutput}
                            </pre>
                          </div>
                        ) : (
                          <pre className="p-3 rounded-lg bg-[var(--bg-main)] text-[var(--color-accent)] border border-[var(--border-line)] overflow-x-auto whitespace-pre-wrap">
                            {runResult.stdout || '(No output produced)'}
                          </pre>
                        )}
                        {runResult.stderr && (
                          <div>
                            <span className="text-[var(--color-error)] text-xs font-semibold">
                              Stderr:
                            </span>
                            <pre className="p-2.5 rounded-lg bg-[var(--bg-main)] text-[var(--color-error)] border border-[var(--border-line)]">
                              {runResult.stderr}
                            </pre>
                          </div>
                        )}
                      </div>
                    )}

                    {!runResult && !submissionResult && (
                      <div className="py-6 text-center text-[var(--text-muted)]">
                        Click &apos;Run Code&apos; (Ctrl+↵) or &apos;Submit Solution&apos; (Ctrl+⇧+↵) to view diagnostics.
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Draft Conflict Resolution Modal */}
      {conflictInfo && (
        <DraftConflictModal
          localDraft={conflictInfo.localDraft}
          remoteDraft={conflictInfo.remoteDraft}
          onKeepLocal={handleKeepLocalDraft}
          onKeepRemote={handleKeepRemoteDraft}
        />
      )}

      {/* Proctored Fullscreen Required Modal */}
      {showFullscreenModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
          <div className="w-full max-w-md bg-[var(--bg-panel)] border border-[var(--border-line)] rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="p-6 text-center space-y-4">
              <div className="w-16 h-16 rounded-2xl bg-indigo-500/10 border border-indigo-500/25 flex items-center justify-center text-indigo-400 mx-auto shadow-lg shadow-indigo-500/10">
                <ShieldAlert className="w-8 h-8 animate-pulse text-indigo-400" />
              </div>

              <div className="space-y-1.5">
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold font-mono tracking-wider uppercase bg-rose-500/15 text-rose-400 border border-rose-500/30">
                  Strict Proctoring Active
                </span>
                <h3 className="text-lg font-bold font-mono text-[var(--text-main)]">
                  Proctored Daily Challenge Mode
                </h3>
                <p className="text-xs font-mono text-[var(--text-muted)] leading-relaxed">
                  Daily Challenge is university proctored. Fullscreen mode is mandatory to write and submit code.
                </p>
              </div>

              {/* Anti-cheat feature pills */}
              <div className="grid grid-cols-3 gap-2 text-[10px] font-mono text-center">
                <div className="p-2 rounded-lg bg-[var(--bg-surface)] border border-[var(--border-line)] flex flex-col items-center justify-center gap-1">
                  <span className="text-sm">🖥️</span>
                  <span className="text-[var(--text-muted)] font-semibold">Fullscreen</span>
                </div>
                <div className="p-2 rounded-lg bg-[var(--bg-surface)] border border-[var(--border-line)] flex flex-col items-center justify-center gap-1">
                  <span className="text-sm">🚫</span>
                  <span className="text-[var(--text-muted)] font-semibold">No Paste</span>
                </div>
                <div className="p-2 rounded-lg bg-[var(--bg-surface)] border border-[var(--border-line)] flex flex-col items-center justify-center gap-1">
                  <span className="text-sm">👁️</span>
                  <span className="text-[var(--text-muted)] font-semibold">Track Tabs</span>
                </div>
              </div>

              {fullscreenExits > 0 && (
                <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/25 text-rose-400 text-xs font-mono">
                  ⚠️ {fullscreenExits} Fullscreen Exit(s) recorded on your account!
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="p-4 border-t border-[var(--border-line)] bg-[var(--bg-surface)] flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => navigate('/dashboard')}
                className="px-4 py-2.5 rounded-xl text-xs font-mono font-bold text-[var(--text-muted)] hover:text-[var(--text-main)] bg-[var(--bg-panel)] hover:bg-[var(--bg-panel)]/80 border border-[var(--border-line)] transition flex items-center gap-1.5 cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Dashboard</span>
              </button>

              <button
                type="button"
                onClick={requestFullscreen}
                className="flex-1 py-2.5 rounded-xl font-mono text-xs font-bold tracking-wide transition flex items-center justify-center gap-2 bg-gradient-to-r from-cyan-500 to-indigo-600 hover:opacity-95 text-white shadow-lg shadow-cyan-500/20 cursor-pointer transform hover:scale-[1.01] active:scale-[0.99]"
              >
                <Maximize2 className="w-3.5 h-3.5" />
                <span>{fullscreenExits > 0 ? 'Resume Fullscreen ⛶' : 'Enter Fullscreen & Begin 🚀'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Exit Confirmation Dialog */}
      {isExitConfirmOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="w-full max-w-sm bg-[var(--bg-panel)] border border-[var(--border-line)] rounded-2xl shadow-2xl p-5 space-y-4 animate-in zoom-in-95 duration-200">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-bold text-sm text-[var(--text-main)] font-mono">
                  Leave Challenge?
                </h4>
                <p className="text-xs text-[var(--text-muted)] font-mono">
                  Your draft code is safely autosaved.
                </p>
              </div>
            </div>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsExitConfirmOpen(false)}
                className="px-3 py-2 rounded-xl text-xs font-mono text-[var(--text-muted)] hover:text-[var(--text-main)] bg-[var(--bg-surface)] hover:bg-[var(--bg-surface-hover)] border border-[var(--border-line)] transition cursor-pointer"
              >
                Stay
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsExitConfirmOpen(false);
                  if (document.fullscreenElement) {
                    document.exitFullscreen().catch(() => {});
                  }
                  navigate('/dashboard');
                }}
                className="px-4 py-2 rounded-xl text-xs font-mono font-bold text-white bg-rose-600 hover:bg-rose-500 transition cursor-pointer"
              >
                Exit to Dashboard
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
