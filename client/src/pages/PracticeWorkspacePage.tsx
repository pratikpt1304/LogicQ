import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useParams, Link, useNavigate, useLocation } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import confetti from 'canvas-confetti';
import { toast } from 'sonner';
import { api, LogicQApiError } from '../api/client.js';
import { useAuth } from '../context/AuthContext.js';
import { auth } from '../config/firebase.js';
import { FirestoreDataService } from '../services/firestoreData.service.js';
import { RealtimeSyncService } from '../services/realtimeSync.service.js';
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
  Cpu,
  WifiOff,
  Clock,
  Trophy,
  Maximize2,
  Minimize2,
  X,
  ShieldCheck,
  ShieldAlert,
  Lock,
  Bookmark,
  FileText,
  Loader2,
  Check,
  CloudOff,
} from 'lucide-react';
import {
  DraftSyncService,
  DraftData,
  ConflictInfo,
  getDeviceLabel,
} from '../services/draftSync.service.js';
import { DraftConflictModal } from '../components/editor/DraftConflictModal.js';
import { PracticeTimer, PracticeTimerHandle } from '../components/practice/PracticeTimer.js';
import { JeeQuestionPalette } from '../components/practice/JeeQuestionPalette.js';
import { JeeSubmitModal } from '../components/practice/JeeSubmitModal.js';
import { JeeQuestionPaperModal } from '../components/practice/JeeQuestionPaperModal.js';
import { JeeInstructionsModal } from '../components/practice/JeeInstructionsModal.js';
import { GccFriendlyHintCard } from '../components/common/GccFriendlyHintCard.js';
import { TerminalConsole } from '../components/common/TerminalConsole.js';
import { MemoryVisualizerModal } from '../components/practice/MemoryVisualizerModal.js';
import { RaiseIssueModal } from '../components/common/RaiseIssueModal.js';
import { Flag } from 'lucide-react';
import { PRACTICE_CONFIG } from '../config/practice.config.js';
import { getSolvedPracticeTopicIds, markPracticeTopicSolved } from './TopicPracticeHubPage.js';
import { TOPIC_PRACTICE_DATA } from '../data/topic-practice.data.js';

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
  const location = useLocation();
  const { user } = useAuth();
  const queryClient = useQueryClient();


  const [activeMobileTab, setActiveMobileTab] = useState<'statement' | 'editor' | 'results'>('statement');
  const [isPaletteDrawerOpen, setIsPaletteDrawerOpen] = useState(false);
  const [isSubmitModalOpen, setIsSubmitModalOpen] = useState(false);
  const [isQuestionPaperOpen, setIsQuestionPaperOpen] = useState(false);
  const [isInstructionsOpen, setIsInstructionsOpen] = useState(false);
  const [isIssueModalOpen, setIsIssueModalOpen] = useState(false);
  const [isExitConfirmOpen, setIsExitConfirmOpen] = useState(false);
  const [isMemoryModalOpen, setIsMemoryModalOpen] = useState(false);
  const [hasAgreedRules, setHasAgreedRules] = useState<boolean>(() => {
    try {
      return sessionStorage.getItem(`logicq_declared_${moduleSlug}`) === 'true';
    } catch {
      return false;
    }
  });

  const [isOffline, setIsOffline] = useState<boolean>(() =>
    typeof navigator !== 'undefined' ? !navigator.onLine : false
  );

  useEffect(() => {
    const handleOnline = () => {
      setIsOffline(false);
      toast.success('Internet reconnected. GCC compilation available.');
    };
    const handleOffline = () => {
      setIsOffline(true);
      toast.warning('Offline Mode: GCC judging requires active internet connection. Local draft auto-saved.', {
        duration: 5000,
      });
    };
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const showDeclarationModal = !hasAgreedRules;

  const handleAgreeAndStart = async () => {
    try {
      sessionStorage.setItem(`logicq_declared_${moduleSlug}`, 'true');
    } catch {}
    setHasAgreedRules(true);
    setIsInstructionsOpen(false);
    try {
      await requestFullscreen();
    } catch {}
    toast.success('Instructions acknowledged. Test session started!');
  };

  // JEE Module Tracking State
  const [markedForReview, setMarkedForReview] = useState<Set<string>>(() => {
    try {
      const raw = localStorage.getItem(`logicq_marked_${moduleSlug}`);
      return raw ? new Set(JSON.parse(raw)) : new Set();
    } catch {
      return new Set();
    }
  });

  const [visitedProblems, setVisitedProblems] = useState<Set<string>>(() => {
    try {
      const raw = localStorage.getItem(`logicq_visited_${moduleSlug}`);
      return raw ? new Set(JSON.parse(raw)) : new Set();
    } catch {
      return new Set();
    }
  });

  const [solvedSlugs, setSolvedSlugs] = useState<Set<string>>(new Set());

  // Quarantined / Auto-locked questions due to proctoring infractions (3 tab switches)
  const [quarantinedSlugs, setQuarantinedSlugs] = useState<Set<string>>(() => {
    try {
      const uid = (user as any)?.uid || (user as any)?.id || 'current';
      const raw = localStorage.getItem(`logicq_quarantined_${moduleSlug}_${uid}`) || localStorage.getItem(`logicq_quarantined_${moduleSlug}`);
      return raw ? new Set(JSON.parse(raw)) : new Set();
    } catch {
      return new Set();
    }
  });

  // Second Chance Mercy Mode: Activated when user accepts the 1 chance to attempt locked questions
  const [secondChanceSlugs, setSecondChanceSlugs] = useState<Set<string>>(() => {
    try {
      const uid = (user as any)?.uid || (user as any)?.id || 'current';
      const raw = localStorage.getItem(`logicq_second_chance_${moduleSlug}_${uid}`);
      return raw ? new Set(JSON.parse(raw)) : new Set();
    } catch {
      return new Set();
    }
  });

  // Mercy Modal: Prompt shown when student finishes questions or submits with locked problems
  const [showMercyModal, setShowMercyModal] = useState(false);
  const sessionCodeMapRef = useRef<Record<string, string>>({});
  const [code, setCode] = useState<string>('');
  const [customInput, setCustomInput] = useState<string>('');
  const [runResult, setRunResult] = useState<any | null>(null);
  const [submissionResult, setSubmissionResult] = useState<any | null>(null);
  const [executionError, setExecutionError] = useState<ExecutionErrorState | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [activeBottomTab, setActiveBottomTab] = useState<'cases' | 'output'>('cases');
  const [selectedCaseIndex, setSelectedCaseIndex] = useState(0);
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
  const [sessionTabSwitches, setSessionTabSwitches] = useState(0);
  const lastTabSwitchRecordedRef = useRef<number>(0);
  const blurStartTimeRef = useRef<number>(0);
  const [copyPasteAttempts, setCopyPasteAttempts] = useState(0);
  const [questionTabSwitchCount, setQuestionTabSwitchCount] = useState(0);
  const [questionPasteCount, setQuestionPasteCount] = useState(0);
  const [isCheatingAutoSubmitTriggered, setIsCheatingAutoSubmitTriggered] = useState(false);
  const [showHiddenPracticeHint, setShowHiddenPracticeHint] = useState<boolean>(false);
  const triggerAntiCheatAutoSubmitRef = useRef<(reason: 'TAB_SWITCH_LIMIT' | 'COPY_PASTE_LIMIT', count: number) => void>(() => {});
  const handlePasteAttemptRef = useRef<() => void>(() => {});
  const lastTabSwitchToastRef = useRef<number>(0);

  // Inactivity / Heartbeat Tracking (Step 3: Bot / Extension Bypass Protection)
  const lastUserInteractionTimeRef = useRef<number>(Date.now());
  const [showInactivityWarning, setShowInactivityWarning] = useState<boolean>(false);
  const inactivityPromptTimeoutRef = useRef<any>(null);

  // Keystroke Cadence & Velocity Detection (Step 5: Phone/ChatGPT Manual Transcription Detector)
  const keyStrokeTimesRef = useRef<number[]>([]);
  const backspaceCountRef = useRef<number>(0);
  const totalKeystrokesRef = useRef<number>(0);

  // Real-time Proctoring Alert HUD & Web Audio Warning
  const [proctorWarningBanner, setProctorWarningBanner] = useState<{
    message: string;
    type: 'tab' | 'fullscreen' | 'paste' | 'cadence';
  } | null>(null);
  const warningBannerTimerRef = useRef<any>(null);
  const prevCodeLengthRef = useRef<number>(0);
  const lastCodeChangeTimeRef = useRef<number>(Date.now());

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
    } catch {
      // Audio autoplay policy catch
    }
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

  // Reset per-question violation counters on problem change
  useEffect(() => {
    setQuestionTabSwitchCount(0);
    setQuestionPasteCount(0);
    setIsCheatingAutoSubmitTriggered(false);
  }, [problemSlug]);

  // Load existing persistent proctoring counters on mount
  useEffect(() => {
    const uid = (user as any)?.uid || user?.id || auth.currentUser?.uid || 'current';
    FirestoreDataService.getProctoringTelemetry(uid).then((telem) => {
      if (telem) {
        setTabSwitchCount((prev) => Math.max(prev, telem.tabSwitchCount || 0));
        setCopyPasteAttempts((prev) => Math.max(prev, telem.copyPasteAttempts || 0));
        setFullscreenExits((prev) => Math.max(prev, telem.fullscreenExits || 0));
      }
    }).catch(() => {});
  }, [user?.id]);

  const syncTelemetryToCloud = useCallback((updates: { tabSwitchCount?: number; copyPasteAttempts?: number; fullscreenExits?: number }) => {
    const uid = (user as any)?.uid || user?.id || auth.currentUser?.uid || 'current';
    FirestoreDataService.saveProctoringTelemetry(uid, {
      tabSwitchCount: updates.tabSwitchCount ?? tabSwitchCount,
      copyPasteAttempts: updates.copyPasteAttempts ?? copyPasteAttempts,
      fullscreenExits: updates.fullscreenExits ?? fullscreenExits,
      lastIncidentAt: new Date().toISOString(),
    }).catch(() => {});
  }, [user?.id, tabSwitchCount, copyPasteAttempts, fullscreenExits]);

  const moduleConfig = useMemo(() => {
    return PRACTICE_CONFIG.MODULES.find((m) => m.slug === moduleSlug) || {
      title: 'Control Structures',
      order: 1,
      slug: moduleSlug || 'control-structures',
      totalQuestions: 20,
    };
  }, [moduleSlug]);

  const isLabRoute = location.pathname.startsWith('/lab-internal');
  const hasEnteredFullscreenRef = useRef<boolean>(Boolean(typeof document !== 'undefined' && document.fullscreenElement));
  const isExitingRef = useRef<boolean>(false);

  const returnToHub = useCallback(() => {
    isExitingRef.current = true;
    if (document.fullscreenElement) {
      document.exitFullscreen().catch(() => {});
    }
    if (isLabRoute) {
      navigate(`/lab-internal?module=${moduleConfig.order}`);
    } else {
      navigate(`/practice?module=${moduleConfig.order}`);
    }
  }, [isLabRoute, moduleConfig.order, navigate]);

  const requestFullscreen = async () => {
    try {
      const elem = document.documentElement as any;
      if (!document.fullscreenElement && !elem.webkitFullscreenElement) {
        if (elem.requestFullscreen) {
          await elem.requestFullscreen();
        } else if (elem.webkitRequestFullscreen) {
          await elem.webkitRequestFullscreen();
        }
      }
      hasEnteredFullscreenRef.current = true;
      setIsFullscreen(true);
      setShowFullscreenModal(false);
    } catch {
      toast.error('Unable to enter fullscreen mode. Please grant browser permissions.');
    }
  };

  const toggleFullscreen = async () => {
    try {
      if (!document.fullscreenElement) {
        await requestFullscreen();
      } else {
        await document.exitFullscreen();
      }
    } catch {
      toast.error('Unable to toggle fullscreen on this browser.');
    }
  };

  // Auto-launch fullscreen on problem mount (Desktop/Laptop only)
  useEffect(() => {
    const isMobile = typeof window !== 'undefined' && (window.innerWidth < 1024 || /Android|iPhone|iPad|iPod/i.test(navigator.userAgent));
    if (isMobile) return;

    const elem = document.documentElement as any;
    if (!document.fullscreenElement && !elem.webkitFullscreenElement) {
      const tryFs = elem.requestFullscreen?.() || elem.webkitRequestFullscreen?.();
      if (tryFs && typeof tryFs.then === 'function') {
        tryFs
          .then(() => {
            hasEnteredFullscreenRef.current = true;
            setIsFullscreen(true);
            setShowFullscreenModal(false);
          })
          .catch(() => {
            // Direct URL entry without gesture: show proctored entry modal to enter fullscreen with 1 click
            setShowFullscreenModal(true);
          });
      } else {
        setShowFullscreenModal(true);
      }
    } else {
      hasEnteredFullscreenRef.current = true;
      setIsFullscreen(true);
      setShowFullscreenModal(false);
    }
  }, [problemSlug]);

  // Fullscreen Exit Detection (Desktop only) -> Immediate exit to module for exam security
  useEffect(() => {
    const handleFullscreenChange = () => {
      const elem = document as any;
      const active = Boolean(document.fullscreenElement || elem.webkitFullscreenElement);
      setIsFullscreen(active);

      if (active) {
        hasEnteredFullscreenRef.current = true;
        setShowFullscreenModal(false);
        return;
      }

      const isMobile = typeof window !== 'undefined' && (window.innerWidth < 1024 || /Android|iPhone|iPad|iPod/i.test(navigator.userAgent));
      if (!active && !isMobile && hasEnteredFullscreenRef.current && !isExitingRef.current) {
        isExitingRef.current = true;
        setFullscreenExits((prev) => {
          const next = prev + 1;
          syncTelemetryToCloud({ fullscreenExits: next });
          return next;
        });
        toast.error('🚫 Fullscreen Exited: Test session ended and returned to module for exam security. Your progress is auto-saved.');
        returnToHub();
      }
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
    };
  }, [syncTelemetryToCloud, returnToHub]);

  // Step 2 & 4: Anti-Cheat Tab Switch, Window Focus, 1.5s Grace Period & 1-Strike Mercy Mode
  const isCurrentProblemMercy = Boolean(problemSlug && secondChanceSlugs.has(problemSlug));

  useEffect(() => {
    const recordTabViolation = (isProlonged: boolean) => {
      const now = Date.now();
      if (now - lastTabSwitchRecordedRef.current < 2000) return;
      lastTabSwitchRecordedRef.current = now;

      // Check if current question is under Mercy (Second Chance) Mode
      const isMercyAttempt = Boolean(problemSlug && secondChanceSlugs.has(problemSlug));
      const maxAllowedSwitches = isMercyAttempt ? 1 : 3;

      setSessionTabSwitches((prev) => {
        const nextSession = prev + 1;
        triggerProctorWarning(
          isMercyAttempt
            ? `🚨 MERCY MODE BREACH: 1-Strike policy active! Tab switch detected.`
            : `Tab switch #${nextSession} detected! Focus loss is logged for faculty audit.`,
          'tab'
        );
        return nextSession;
      });

      setQuestionTabSwitchCount((prevQ) => {
        const nextQ = prevQ + 1;
        setTabSwitchCount((prevTotal) => {
          const nextTotal = prevTotal + 1;
          syncTelemetryToCloud({ tabSwitchCount: nextTotal });
          return nextTotal;
        });

        // Record question-specific tab switch incident with exact timestamp
        const uid = (user as any)?.uid || (user as any)?.id || auth.currentUser?.uid || 'current';
        FirestoreDataService.recordProctoringIncident(uid, {
          type: nextQ >= maxAllowedSwitches ? 'EXCEEDED_TAB_SWITCHES' : 'TAB_SWITCH',
          problemSlug: problem?.slug || problemSlug || '',
          problemTitle: problem?.title || `Question #${problem?.moduleOrder || 1}`,
          reason: `Tab switch #${nextQ} detected on question`,
          codeSnippet: code,
        }).catch(() => {});

        if (nextQ >= maxAllowedSwitches) {
          triggerAntiCheatAutoSubmitRef.current('TAB_SWITCH_LIMIT', nextQ);
        }
        return nextQ;
      });
    };

    const handleVisibilityChange = () => {
      if (document.hidden) {
        blurStartTimeRef.current = Date.now();
      } else {
        const awayDuration = Date.now() - blurStartTimeRef.current;
        // Step 4: Grace Period (If away for < 1500ms, treat as accidental OS/antivirus flicker)
        if (blurStartTimeRef.current > 0 && awayDuration < 1500) {
          toast.info('Brief focus loss restored (< 1.5s grace period). Stay in full workspace!', {
            duration: 2500,
          });
          blurStartTimeRef.current = 0;
          return;
        }

        blurStartTimeRef.current = 0;
        recordTabViolation(true);

        const now = Date.now();
        if (now - lastTabSwitchToastRef.current > 1500) {
          lastTabSwitchToastRef.current = now;
          const isMercy = Boolean(problemSlug && secondChanceSlugs.has(problemSlug));
          toast.error(
            isMercy
              ? '🚨 Mercy Mode Violation! Even 1 tab switch permanently auto-locks question!'
              : '⚠️ Tab Switch Detected! All tab switches are recorded. 3 tab switches on a question auto-locks & advances!',
            { duration: 5000 }
          );
        }
      }
    };

    const handleWindowBlur = () => {
      blurStartTimeRef.current = Date.now();
      setTimeout(() => {
        // If window still blurred or document hidden after 1.5s, log violation
        if (document.hidden || !document.hasFocus()) {
          recordTabViolation(true);
        }
      }, 1600);
    };

    const handlePageHide = () => {
      blurStartTimeRef.current = Date.now();
      recordTabViolation(true);
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('blur', handleWindowBlur);
    window.addEventListener('pagehide', handlePageHide);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('blur', handleWindowBlur);
      window.removeEventListener('pagehide', handlePageHide);
    };
  }, [syncTelemetryToCloud, triggerProctorWarning, problemSlug, secondChanceSlugs]);

  // Step 3: Inactivity / Heartbeat Tracker (45s Extension / Secondary Screen Bypass Protection)
  useEffect(() => {
    const handleUserActivity = () => {
      lastUserInteractionTimeRef.current = Date.now();
      if (showInactivityWarning) {
        setShowInactivityWarning(false);
      }
    };

    window.addEventListener('mousemove', handleUserActivity);
    window.addEventListener('keydown', handleUserActivity);
    window.addEventListener('scroll', handleUserActivity);
    window.addEventListener('click', handleUserActivity);

    const interval = setInterval(() => {
      const inactiveDuration = Date.now() - lastUserInteractionTimeRef.current;
      // If student hasn't touched the keyboard/mouse for 45s while question is active
      if (inactiveDuration >= 45000 && !showInactivityWarning && !showMercyModal) {
        setShowInactivityWarning(true);
        triggerProctorWarning('⚠️ Heartbeat Check: 45s inactivity detected. Keep active focus on editor!', 'cadence');
      }
    }, 5000);

    return () => {
      window.removeEventListener('mousemove', handleUserActivity);
      window.removeEventListener('keydown', handleUserActivity);
      window.removeEventListener('scroll', handleUserActivity);
      window.removeEventListener('click', handleUserActivity);
      clearInterval(interval);
    };
  }, [showInactivityWarning, showMercyModal, triggerProctorWarning]);

  // Step 1: Split-Screen & Dual Monitor Detection
  useEffect(() => {
    const checkSplitScreen = () => {
      if (typeof window === 'undefined' || typeof screen === 'undefined') return;
      const isSplit = window.outerWidth < (screen.availWidth * 0.82) || window.outerHeight < (screen.availHeight * 0.75);
      if (isSplit && !document.fullscreenElement) {
        triggerProctorWarning('⚠️ Split-screen layout detected! Maximize your workspace window to avoid penalty.', 'fullscreen');
      }
    };

    window.addEventListener('resize', checkSplitScreen);
    return () => {
      window.removeEventListener('resize', checkSplitScreen);
    };
  }, [triggerProctorWarning]);

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
    const handlePasteAttempt = () => {
      setQuestionPasteCount((prevQ) => {
        const nextQ = prevQ + 1;
        setCopyPasteAttempts((prevTotal) => {
          const nextTotal = prevTotal + 1;
          syncTelemetryToCloud({ copyPasteAttempts: nextTotal });
          return nextTotal;
        });

        // Record question-specific paste attempt incident with exact timestamp
        const uid = (user as any)?.uid || (user as any)?.id || auth.currentUser?.uid || 'current';
        FirestoreDataService.recordProctoringIncident(uid, {
          type: nextQ >= 5 ? 'EXCEEDED_COPY_PASTE' : 'COPY_PASTE',
          problemSlug: problem?.slug || problemSlug || '',
          problemTitle: problem?.title || `Question #${problem?.moduleOrder || 1}`,
          reason: `Clipboard paste attempt #${nextQ} blocked on question`,
          codeSnippet: code,
        }).catch(() => {});

        triggerProctorWarning(`🚫 Pasting is strictly blocked! Attempt ${nextQ}/5 on this question.`, 'paste');
        if (nextQ >= 5) {
          triggerAntiCheatAutoSubmitRef.current('COPY_PASTE_LIMIT', nextQ);
        } else {
          toast.error(`🚫 Pasting is strictly blocked! Attempt ${nextQ}/5 on this question. 5 attempts will auto-submit & penalize!`);
        }
        return nextQ;
      });
    };
    handlePasteAttemptRef.current = handlePasteAttempt;

    const blockPaste = (e: ClipboardEvent) => {
      e.preventDefault();
      handlePasteAttempt();
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
  }, [syncTelemetryToCloud]);

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

  const problem = responseData?.data?.problem;
  const userProgress = responseData?.data?.userProgress;
  const previousAttempts = (userProgress?.attemptsCount || userProgress?.attempts || 0);
  const currentAttempt = previousAttempts + 1;

  const moduleProblems: any[] = moduleProblemsResponse?.data?.problems || [];
  const currentProblemIndex = moduleProblems.findIndex((p: any) => p.slug === problemSlug);

  const sampleCases = useMemo(() => {
    if (problem?.sampleTests && problem.sampleTests.length > 0) {
      return problem.sampleTests;
    }
    if (problem?.testCases && problem.testCases.length > 0) {
      const visible = problem.testCases.filter((tc: any) => !tc.isHidden);
      return visible.length > 0 ? visible : problem.testCases.slice(0, 1);
    }
    return [];
  }, [problem]);

  const handleCompileAndRun = () => {
    if (runMutation.isPending || submitMutation.isPending) return;
    setActiveBottomTab('output');
    setIsDrawerOpen(true);
    setActiveMobileTab('results');
    submitMutation.mutate();
  };

  // Practice completion guard: Student must complete practice questions for this module before attempting the Lab Internal Test
  useEffect(() => {
    if (user?.role === 'ADMIN' || !moduleSlug) return;
    const currentModuleTopics = TOPIC_PRACTICE_DATA.filter(
      (t) => t.moduleSlug === moduleSlug || t.moduleIndex === moduleConfig.order
    );
    const modPracticeTotal = currentModuleTopics.length;
    if (modPracticeTotal === 0) return;

    const effectiveUid = (user as any)?.uid || user?.id || auth.currentUser?.uid || 'anon';
    const solved = getSolvedPracticeTopicIds(effectiveUid);
    const modPracticeSolved = currentModuleTopics.filter((t) => solved.includes(t.id)).length;

    if (modPracticeSolved < modPracticeTotal) {
      toast.error(
        `🔒 Lab Internal Locked: Complete all ${modPracticeTotal} practice questions in Module ${moduleConfig.order} (${moduleConfig.title}) first (${modPracticeSolved}/${modPracticeTotal} solved).`,
        { duration: 6000 }
      );
      navigate('/lab-internal', { replace: true });
    }
  }, [moduleSlug, user, moduleConfig.order, moduleConfig.title, navigate]);

  // Sanitize visited problems so locked questions can never be falsely marked visited/unsolved
  const sanitizedVisitedProblems = React.useMemo(() => {
    const unlockedSlugs = new Set<string>();
    for (let i = 0; i < moduleProblems.length; i++) {
      const prevP = i > 0 ? moduleProblems[i - 1] : null;
      const isPrevPassed = i === 0 || solvedSlugs.has(prevP?.slug) || quarantinedSlugs.has(prevP?.slug);
      if (isPrevPassed) {
        unlockedSlugs.add(moduleProblems[i]?.slug);
      } else {
        break;
      }
    }
    const clean = new Set<string>();
    visitedProblems.forEach((slug) => {
      if (unlockedSlugs.has(slug)) clean.add(slug);
    });
    if (problemSlug && unlockedSlugs.has(problemSlug)) {
      clean.add(problemSlug);
    }
    return clean;
  }, [moduleProblems, solvedSlugs, quarantinedSlugs, visitedProblems, problemSlug]);

  // Anti-Cheat Auto-Lock & Advance: Triggers when 3 tab switches or 5 paste attempts occur on current question
  const triggerAntiCheatAutoSubmit = useCallback(async (reason: 'TAB_SWITCH_LIMIT' | 'COPY_PASTE_LIMIT', count: number) => {
    if (isCheatingAutoSubmitTriggered) return;
    setIsCheatingAutoSubmitTriggered(true);

    const isTab = reason === 'TAB_SWITCH_LIMIT';
    const isMercyAttempt = Boolean(problemSlug && secondChanceSlugs.has(problemSlug));
    const violationReason = isTab
      ? isMercyAttempt
        ? `Breached 1-strike mercy policy on question (${count} tab switch detected)`
        : `Exceeded 3 tab switches on question (${count} detected)`
      : `Exceeded 5 copy-paste attempts on question (${count} detected)`;

    toast.error(
      isMercyAttempt
        ? `🚨 Mercy Strike Policy: 1 Tab switch detected during final mercy chance! Question permanently locked with 0 marks.`
        : `🚨 Violation Limit Exceeded: ${isTab ? `${count} Tab Switches` : `${count} Paste Attempts`} detected! Current question auto-locked & quarantined. Advancing to next question...`,
      { duration: 8000 }
    );

    const uid = (user as any)?.uid || (user as any)?.id || auth.currentUser?.uid || 'current';
    FirestoreDataService.recordProctoringIncident(uid, {
      type: isTab ? 'EXCEEDED_TAB_SWITCHES' : 'EXCEEDED_COPY_PASTE',
      problemSlug: problem?.slug || problemSlug || '',
      problemTitle: problem?.title || `Question #${problem?.moduleOrder || 1}`,
      reason: violationReason,
      codeSnippet: code,
      isCheatAttempt: true,
      tag: 'TRY_TO_CHEAT',
    }).catch(() => {});

    // Mark current question as QUARANTINED in state & local storage
    if (problemSlug) {
      setQuarantinedSlugs((prev) => {
        const next = new Set(prev);
        next.add(problemSlug);
        try {
          localStorage.setItem(`logicq_quarantined_${moduleSlug}_${uid}`, JSON.stringify([...next]));
          localStorage.setItem(`logicq_quarantined_${moduleSlug}`, JSON.stringify([...next]));
        } catch {}
        return next;
      });
      setVisitedProblems((prev) => new Set(prev).add(problemSlug));
    }

    // Auto-submit current code state as penalised attempt (Server backend + Firestore sync)
    try {
      if (problem?.id) {
        api.post('/submissions/submit', {
          problemId: problem.id,
          code,
          isCheatAutoSubmit: true,
          idempotencyKey: idempotencyKeyRef.current,
        }).catch(() => {});
      }
      FirestoreDataService.recordCheatSubmission(uid, {
        problemId: problem?.id || problemSlug || 'unknown',
        problemTitle: problem?.title || `Question #${problem?.moduleOrder || 1}`,
        problemSlug: problem?.slug || problemSlug || '',
        code: code || '// Quarantined attempt',
        violationReason,
        difficulty: (problem as any)?.difficulty || 'EASY',
      }).catch(() => {});
      RealtimeSyncService.emit('SUBMISSIONS');
      RealtimeSyncService.emit('DASHBOARD');
    } catch {}

    // Auto-advance to next problem
    setTimeout(() => {
      const currIdx = moduleProblems.findIndex((p: any) => p.slug === problemSlug);
      const nextProb = currIdx >= 0 && currIdx < moduleProblems.length - 1 ? moduleProblems[currIdx + 1] : null;
      if (nextProb) {
        navigate(`/practice/${moduleSlug}/${nextProb.slug}`);
      } else {
        toast.info('Reached the end of this module questions.');
        setShowMercyModal(true);
      }
      setIsCheatingAutoSubmitTriggered(false);
    }, 1200);
  }, [isCheatingAutoSubmitTriggered, user, problem, problemSlug, code, moduleProblems, moduleSlug, navigate]);

  useEffect(() => {
    triggerAntiCheatAutoSubmitRef.current = triggerAntiCheatAutoSubmit;
  }, [triggerAntiCheatAutoSubmit]);
  
  // Track visited questions and persist last active question so returning students can resume where they left off
  useEffect(() => {
    if (problemSlug) {
      setVisitedProblems((prev) => {
        if (prev.has(problemSlug)) return prev;
        const next = new Set(prev);
        next.add(problemSlug);
        try {
          localStorage.setItem(`logicq_visited_${moduleSlug}`, JSON.stringify([...next]));
        } catch {}
        return next;
      });
      if (moduleSlug) {
        try {
          localStorage.setItem(`logicq_last_active_question_${moduleSlug}`, problemSlug);
          localStorage.setItem('logicq_last_active_module', moduleSlug);
        } catch {}
      }
    }
  }, [problemSlug, moduleSlug]);

  // Sync solved problems from memory, local storage fallback, and Firestore cloud backup
  useEffect(() => {
    let isCancelled = false;
    const effectiveUid = (user as any)?.uid || user?.id || auth.currentUser?.uid || 'anon';
    const localSolved = getSolvedPracticeTopicIds(effectiveUid);
    const fallbackSolvedSlugs: string[] = [];
    try {
      const rawProg = localStorage.getItem('logicq_fallback_practice_progress_v1');
      if (rawProg) {
        const progMap = JSON.parse(rawProg);
        Object.keys(progMap).forEach((k) => {
          if (progMap[k]?.isSolved) {
            const cleanSlug = k.includes(':') ? k.split(':')[1] : k;
            fallbackSolvedSlugs.push(cleanSlug);
          }
        });
      }
    } catch {}

    setSolvedSlugs((prev) => {
      const next = new Set(prev);
      localSolved.forEach((s) => next.add(s));
      fallbackSolvedSlugs.forEach((s) => next.add(s));
      if (moduleProblems && moduleProblems.length > 0) {
        moduleProblems.forEach((p: any) => {
          if (p.isSolved) next.add(p.slug);
        });
      }
      if (userProgress?.isSolved && problemSlug) {
        next.add(problemSlug);
      }
      return next;
    });

    // Authoritative cloud restore from Firestore
    (async () => {
      try {
        const [stats, prog] = await Promise.all([
          FirestoreDataService.getStatsBackup(effectiveUid),
          FirestoreDataService.getPracticeProgress(effectiveUid),
        ]);
        if (isCancelled) return;
        const cloudSolved = Array.from(
          new Set([
            ...(stats?.completedProblems || []),
            ...(prog?.completedProblems || []),
          ])
        );
        if (cloudSolved.length > 0) {
          cloudSolved.forEach((id) => markPracticeTopicSolved(id, effectiveUid));
          setSolvedSlugs((prev) => {
            const next = new Set(prev);
            cloudSolved.forEach((s) => next.add(s));
            return next;
          });
        }
      } catch (err) {
        console.warn('PracticeWorkspace cloud restore warning:', err);
      }
    })();

    return () => {
      isCancelled = true;
    };
  }, [moduleProblems, userProgress, problemSlug, user]);

  // Progressive sequential unlocking helper: Question N requires Question N-1 to be solved OR quarantined
  const isProblemUnlocked = (idx: number): boolean => {
    if (user?.role === 'ADMIN') return true;
    if (idx <= 0) return true;
    for (let i = 0; i < idx; i++) {
      const p = moduleProblems[i];
      const isSolved = p?.isSolved || solvedSlugs.has(p?.slug);
      const isQuar = quarantinedSlugs.has(p?.slug);
      if (!isSolved && !isQuar) return false;
    }
    return true;
  };

  // Fast switching handler that preserves current code in memory & storage
  const handleSelectProblem = (targetSlug: string) => {
    const targetIdx = moduleProblems.findIndex((p: any) => p.slug === targetSlug);
    if (targetIdx > 0 && !isProblemUnlocked(targetIdx)) {
      toast.error(`🔒 Question #${targetIdx + 1} is locked! Solve previous questions first.`);
      return;
    }
    if (quarantinedSlugs.has(targetSlug) && !secondChanceSlugs.has(targetSlug) && user?.role !== 'ADMIN') {
      toast.error(`🔒 Question #${targetIdx + 1} is quarantined! Finish other questions to unlock your 1 final chance.`);
      return;
    }
    if (problem?.slug) {
      sessionCodeMapRef.current[problem.slug] = code;
    }
    navigate(`/practice/${moduleSlug}/${targetSlug}`);
  };

  // Open Mercy Modal or standard Submit Modal
  const handleOpenSubmitOrMercy = () => {
    const unresolvedQuarantined = moduleProblems.filter(
      (p: any) => quarantinedSlugs.has(p.slug) && !p.isSolved && !solvedSlugs.has(p.slug) && !secondChanceSlugs.has(p.slug)
    );
    if (unresolvedQuarantined.length > 0) {
      setShowMercyModal(true);
      return;
    }
    setIsSubmitModalOpen(true);
  };

  const handleAcceptMercyChance = () => {
    const unresolvedQuarantined = moduleProblems.filter(
      (p: any) => quarantinedSlugs.has(p.slug) && !p.isSolved && !solvedSlugs.has(p.slug)
    );
    if (unresolvedQuarantined.length > 0) {
      const nextSecond = new Set(secondChanceSlugs);
      unresolvedQuarantined.forEach((p: any) => nextSecond.add(p.slug));
      setSecondChanceSlugs(nextSecond);
      const uid = (user as any)?.uid || (user as any)?.id || 'current';
      try {
        localStorage.setItem(`logicq_second_chance_${moduleSlug}_${uid}`, JSON.stringify([...nextSecond]));
      } catch {}
      setShowMercyModal(false);
      toast.success('1 Final Chance unlocked! Solve the question and submit.');
      const firstTarget = unresolvedQuarantined[0];
      if (problem?.slug) {
        sessionCodeMapRef.current[problem.slug] = code;
      }
      navigate(`/practice/${moduleSlug}/${firstTarget.slug}`);
    } else {
      setShowMercyModal(false);
      setIsSubmitModalOpen(true);
    }
  };

  const handleDeclineMercyChance = () => {
    setShowMercyModal(false);
    setIsSubmitModalOpen(true);
  };

  const handleMarkForReviewAndNext = () => {
    if (!problemSlug) return;
    setMarkedForReview((prev) => {
      const next = new Set(prev);
      if (next.has(problemSlug)) {
        next.delete(problemSlug);
        toast.info(`Removed review bookmark from Q#${problem?.moduleOrder || ''}`);
      } else {
        next.add(problemSlug);
        toast.success(`Q#${problem?.moduleOrder || ''} marked for review 🔖`);
      }
      try {
        localStorage.setItem(`logicq_marked_${moduleSlug}`, JSON.stringify([...next]));
      } catch {}
      return next;
    });

    if (nextProblem) {
      handleSelectProblem(nextProblem.slug);
    } else {
      toast.info('You are at the final question. Review your palette or submit.');
    }
  };

  const handleClearResponse = () => {
    if (problem?.starterCode) {
      const clean = cleanDraftCode(problem.starterCode);
      setCode(clean);
      handleCodeChange(clean);
      setRunResult(null);
      setSubmissionResult(null);
      setExecutionError(null);
      toast.info('Editor cleared. Reverted to starter code.');
    }
  };

  const handleSaveAndNext = async () => {
    const isCurrentSolved = userProgress?.isSolved || solvedSlugs.has(problemSlug || '');

    if (code.trim() && !isCurrentSolved) {
      try {
        const res: any = await submitMutation.mutateAsync();
        const sub = res?.data?.submission;
        if (sub?.verdict === 'ACCEPTED') {
          const nextSolved = new Set(solvedSlugs).add(problemSlug || '');
          setSolvedSlugs(nextSolved);
          toast.success(`🎉 Question #${problem.moduleOrder} Accepted! Unlocking Question #${problem.moduleOrder + 1}`);
          if (nextProblem) {
            handleSelectProblem(nextProblem.slug);
          } else {
            handleOpenSubmitOrMercy();
          }
          return;
        } else {
          toast.error(`Question #${problem.moduleOrder} test cases failed. Please solve this question to unlock the next one.`);
          return;
        }
      } catch {
        return;
      }
    }

    if (isCurrentSolved) {
      if (nextProblem) {
        handleSelectProblem(nextProblem.slug);
      } else {
        handleOpenSubmitOrMercy();
      }
    } else {
      toast.error(`🔒 Please solve and pass Question #${problem?.moduleOrder} first to unlock Question #${(problem?.moduleOrder || 0) + 1}.`);
    }
  };

  const handleConfirmFinalSubmit = async () => {
    try {
      await api.post('/practice/complete-module', { moduleSlug });
    } catch {}
    queryClient.invalidateQueries({ queryKey: ['practice-modules'] });
    queryClient.invalidateQueries({ queryKey: ['practice-module-problems', moduleSlug] });
  };

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

  // Reset results and collapse drawer when navigating between problems to maximize code editor space
  useEffect(() => {
    setRunResult(null);
    setSubmissionResult(null);
    setExecutionError(null);
    setActiveBottomTab('cases');
    setSelectedCaseIndex(0);
    setIsDrawerOpen(false);
  }, [problemSlug]);

  // Restore local draft or starter code, then sync cloud draft
  useEffect(() => {
    if (problem && problem.id !== initializedProblemIdRef.current) {
      initializedProblemIdRef.current = problem.id;

      // 1. Instant local cache restore
      const localDraft = DraftSyncService.getLocalDraft(problem.slug, true);
      const directCode = typeof localStorage !== 'undefined'
        ? localStorage.getItem(`logicq_practice_draft_${problem.slug}`)
        : null;
      let initialCode = cleanDraftCode(problem.starterCode);

      if (sessionCodeMapRef.current[problem.slug]) {
        initialCode = sessionCodeMapRef.current[problem.slug];
        setCode(initialCode);
      } else if (localDraft?.code && cleanDraftCode(localDraft.code).trim()) {
        initialCode = cleanDraftCode(localDraft.code);
        setCode(initialCode);
      } else if (directCode && cleanDraftCode(directCode).trim()) {
        initialCode = cleanDraftCode(directCode);
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
            } else if (
              remoteDraft.code &&
              cleanDraftCode(remoteDraft.code).trim() &&
              cleanDraftCode(remoteDraft.code).trim() !== cleanDraftCode(problem.starterCode).trim() &&
              (!localDraft?.code || cleanDraftCode(localDraft.code).trim() === cleanDraftCode(problem.starterCode).trim() || remoteDraft.updatedAt > ((localDraft.updatedAt || 0) + 2000))
            ) {
              const cleanedRemote = cleanDraftCode(remoteDraft.code);
              setCode(cleanedRemote);
              DraftSyncService.saveLocalDraft({ ...remoteDraft, code: cleanedRemote }, true);
              try {
                localStorage.setItem(`logicq_practice_draft_${problem.slug}`, cleanedRemote);
              } catch {}
            }
          })
          .catch(() => {});
      }
    }
  }, [problem, user?.id]);

  const handleCodeChange = (nextCode: string) => {
    setCode(nextCode);

    // Step 5: Keystroke Velocity & Transcription Anomaly Detector
    const prevLen = prevCodeLengthRef.current;
    const diff = nextCode.length - prevLen;
    const now = Date.now();
    const timeDiff = now - lastCodeChangeTimeRef.current;

    totalKeystrokesRef.current += 1;
    keyStrokeTimesRef.current.push(now);
    if (keyStrokeTimesRef.current.length > 50) {
      keyStrokeTimesRef.current.shift();
    }

    // Flag 1: Large block drops (AI copy or paste injection)
    if (diff > 120 && timeDiff < 300) {
      triggerProctorWarning('Rapid code block insertion detected (>120 characters). Keystroke telemetry audited.', 'cadence');
      const uid = (user as any)?.uid || (user as any)?.id || auth.currentUser?.uid || 'current';
      FirestoreDataService.recordProctoringIncident(uid, {
        type: 'COPY_PASTE',
        problemSlug: problem?.slug || problemSlug || '',
        problemTitle: problem?.title || 'Practice Question',
        reason: `Rapid code insertion anomaly (${diff} chars in ${timeDiff}ms)`,
      }).catch(() => {});
    }

    // Flag 2: Robotic Cadence (Phone transcription / steady typing without human syntax pauses)
    if (keyStrokeTimesRef.current.length >= 25) {
      const intervals: number[] = [];
      for (let i = 1; i < keyStrokeTimesRef.current.length; i++) {
        intervals.push(keyStrokeTimesRef.current[i] - keyStrokeTimesRef.current[i - 1]);
      }
      const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;
      const variance = intervals.reduce((sum, int) => sum + Math.pow(int - avgInterval, 2), 0) / intervals.length;
      // Ultra-low variance (< 400ms^2) with rapid typing indicates robotic transcription
      if (variance < 400 && avgInterval < 120 && diff > 0) {
        triggerProctorWarning('High-velocity robotic keystroke cadence detected. Code transcription monitored.', 'cadence');
      }
    }

    prevCodeLengthRef.current = nextCode.length;
    lastCodeChangeTimeRef.current = now;

    if (problem?.slug) {
      sessionCodeMapRef.current[problem.slug] = nextCode;
      const draftObj: DraftData = {
        problemId: problem.id,
        problemSlug: problem.slug,
        code: nextCode,
        customInput,
        updatedAt: Date.now(),
        deviceLabel: getDeviceLabel(),
      };

      DraftSyncService.saveLocalDraft(draftObj, true);
      try {
        localStorage.setItem(`logicq_practice_draft_${problem.slug}`, nextCode);
        localStorage.setItem('logicq_last_workspace_problem', problem.slug);
      } catch {}

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

  // Continuous auto-save flush on window unload or page hide
  useEffect(() => {
    const flushWorkspaceDraft = () => {
      if (!problem?.slug || !code) return;
      const draftObj: DraftData = {
        problemId: problem.id,
        problemSlug: problem.slug,
        code,
        customInput,
        updatedAt: Date.now(),
        deviceLabel: getDeviceLabel(),
      };
      DraftSyncService.saveLocalDraft(draftObj, true);
      try {
        localStorage.setItem(`logicq_practice_draft_${problem.slug}`, code);
        localStorage.setItem('logicq_last_workspace_problem', problem.slug);
      } catch {}
      if (user?.id && navigator.onLine) {
        DraftSyncService.saveRemoteDraft(user.id, draftObj, true).catch(() => {});
      }
    };

    window.addEventListener('beforeunload', flushWorkspaceDraft);
    window.addEventListener('pagehide', flushWorkspaceDraft);
    return () => {
      window.removeEventListener('beforeunload', flushWorkspaceDraft);
      window.removeEventListener('pagehide', flushWorkspaceDraft);
    };
  }, [problem?.slug, problem?.id, code, customInput, user?.id]);

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
      if (typeof navigator !== 'undefined' && !navigator.onLine) {
        const err: any = new Error(
          'Offline Mode: Active internet connection is required to compile and judge C code on the backend GCC engine. Your code draft has been saved locally.'
        );
        err.code = 'OFFLINE_MODE';
        err.canRetry = false;
        throw err;
      }
      setExecutionError(null);
      if (problem?.id) {
        api.post('/practice/track-run', { problemId: problem.id }).catch(() => {});
      }
      const currentCase = sampleCases[selectedCaseIndex] || sampleCases[0];
      const stdinInput = currentCase?.input ?? customInput ?? '';
      return api.post('/submissions/run', {
        problemId: problem?.id || problem?.slug || problemSlug,
        code,
        stdin: stdinInput,
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
    const effectiveUid = (user as any)?.uid || user?.id || auth.currentUser?.uid || 'anon';
    if (problemSlug) {
      setSolvedSlugs((prev) => new Set(prev).add(problemSlug));
      markPracticeTopicSolved(problemSlug, effectiveUid);

      try {
        const rawProg = localStorage.getItem('logicq_fallback_practice_progress_v1');
        const progMap = rawProg ? JSON.parse(rawProg) : {};
        const entry = {
          isSolved: true,
          attemptsCount: (userProgress?.attemptsCount || 0) + 1,
          bestRuntimeMs: 14,
          lastVerdict: 'ACCEPTED',
        };
        progMap[`${user?.id || effectiveUid}:${problemSlug}`] = entry;
        progMap[problemSlug] = entry;
        localStorage.setItem('logicq_fallback_practice_progress_v1', JSON.stringify(progMap));
      } catch {}

      // Save verified code as authoritative draft so returning student never sees reset code
      const draftObj: DraftData = {
        problemId: problem?.id,
        problemSlug,
        code,
        customInput,
        updatedAt: Date.now(),
        deviceLabel: getDeviceLabel(),
      };
      DraftSyncService.saveLocalDraft(draftObj, true);
      if (effectiveUid) {
        DraftSyncService.saveRemoteDraft(effectiveUid, draftObj, true).catch(() => {});
      }

      // Persist to Firestore immediately
      const currentList = getSolvedPracticeTopicIds(effectiveUid);
      const updatedList = Array.from(new Set([...currentList, problemSlug]));
      FirestoreDataService.savePracticeProgress(effectiveUid, updatedList).catch(() => {});
      if (user?.prn) {
        FirestoreDataService.savePracticeProgress(user.prn, updatedList).catch(() => {});
      }
      FirestoreDataService.saveStatsBackup(effectiveUid, {
        totalSolved: updatedList.length,
        completedProblems: updatedList,
        lastSolvedDate: new Date().toISOString(),
      }).catch(() => {});

      // Mirror solved submission to primary Firestore submissions collection with full student metadata
      const isLab = location.pathname.startsWith('/lab-internal');
      FirestoreDataService.recordDailySubmission(effectiveUid, {
        problemId: problem?.id || problemSlug,
        problemTitle: problem?.title || problemSlug,
        problemSlug,
        difficulty: (problem as any)?.difficulty || 'MEDIUM',
        code,
        verdict: 'ACCEPTED',
        timeTakenSeconds: practiceTimerRef.current?.getActiveSeconds() || 60,
        submissionType: isLab ? 'LAB_INTERNAL' : 'PRACTICE',
        prn: user?.prn || '',
        studentPrn: user?.prn || '',
        email: user?.email || '',
        studentEmail: user?.email || '',
        studentName: user?.fullName || user?.displayName || '',
      }).catch(() => {});

      // Invalidate query caches so Dashboard, History, and Admin reflect progress in real-time
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
      queryClient.invalidateQueries({ queryKey: ['student-my-submissions'] });
      queryClient.invalidateQueries({ queryKey: ['faculty-dashboard-recent-submissions'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-admin-lab-submissions'] });
      queryClient.invalidateQueries({ queryKey: ['practice-modules'] });
      queryClient.invalidateQueries({ queryKey: ['student-practice-modules'] });
      RealtimeSyncService.emit('SUBMISSIONS');
      RealtimeSyncService.emit('DASHBOARD');

      if (nextProb?.slug && moduleSlug) {
        try {
          localStorage.setItem(`logicq_last_active_question_${moduleSlug}`, nextProb.slug);
        } catch {}
      }

      // Notify backend if available
      if (problem?.id) {
        api.post('/practice/topics/solve', {
          topicId: problem.id,
          moduleSlug,
          title: problem.title,
        }).catch(() => {});
      }
    }

    const sec = userProgress?.timeToSolveSeconds || practiceTimerRef.current?.getActiveSeconds() || userProgress?.activeSeconds || 0;
    const timeFormatted = sec >= 60 ? `${Math.floor(sec / 60)}m ${sec % 60}s` : sec > 0 ? `${sec}s` : '< 1m';
    const attemptStr = `Attempt #${(userProgress?.attemptsCount || 0) || 1}`;

    if (nextProb) {
      toast.success(`🎉 All test cases passed! Advancing to Question #${nextProb.moduleOrder}...`, {
        description: `${nextProb.title}`,
        duration: 3500,
      });
      setTimeout(() => {
        handleSelectProblem(nextProb.slug);
      }, 1200);
    } else {
      toast.success(`🏆 All 20 Questions Completed in ${timeFormatted}!`, {
        description: 'You have solved all questions in this module! Ready for final submission.',
        duration: 8000,
      });
      setTimeout(() => {
        handleOpenSubmitOrMercy();
      }, 1500);
    }
  };

  // Submit Solution Mutation (Practice submission)
  const submitMutation = useMutation({
    mutationFn: async () => {
      if (typeof navigator !== 'undefined' && !navigator.onLine) {
        const err: any = new Error(
          'Offline Mode: Active internet connection is required to evaluate test cases on the backend GCC engine. Your code draft has been saved locally.'
        );
        err.code = 'OFFLINE_MODE';
        err.canRetry = false;
        throw err;
      }
      setExecutionError(null);
      if (practiceTimerRef.current) {
        await practiceTimerRef.current.syncNow('submit');
      }
      const isCheatAttempt = Boolean(problemSlug && quarantinedSlugs.has(problemSlug));
      return api.post('/submissions/submit', {
        problemId: problem?.id || problem?.slug || problemSlug,
        code,
        idempotencyKey: idempotencyKeyRef.current,
        isCheatAttempt,
        quarantinedAttempt: isCheatAttempt,
        tag: isCheatAttempt ? 'TRY_TO_CHEAT' : undefined,
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

      const isCheatAttempt = Boolean(problemSlug && quarantinedSlugs.has(problemSlug));
      if (isCheatAttempt) {
        const uid = (user as any)?.uid || (user as any)?.id || auth.currentUser?.uid || 'current';
        FirestoreDataService.recordProctoringIncident(uid, {
          type: 'SECOND_CHANCE_SUBMISSION',
          problemSlug: problem.slug,
          problemTitle: problem.title,
          reason: 'Student submitted a previously tab-switch quarantined question during 1-chance mercy mode',
          codeSnippet: code,
          isCheatAttempt: true,
          tag: 'TRY_TO_CHEAT',
        } as any).catch(() => {});
        toast.warning('⚠️ Quarantined Question Submitted: Flagged for faculty audit as "Try to Cheat".');
      }

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
        RealtimeSyncService.emit('SUBMISSIONS');
        RealtimeSyncService.emit('DASHBOARD');
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
              RealtimeSyncService.emit('SUBMISSIONS');
              RealtimeSyncService.emit('DASHBOARD');
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

  // Barrier 1: If current question was quarantined due to 3 tab switches
  const isCurrentQuarantined = Boolean(
    problemSlug &&
    quarantinedSlugs.has(problemSlug) &&
    !secondChanceSlugs.has(problemSlug) &&
    user?.role !== 'ADMIN'
  );

  if (isCurrentQuarantined) {
    const nextPlayable = moduleProblems.find(
      (p: any, idx: number) =>
        isProblemUnlocked(idx) &&
        !p.isSolved &&
        !solvedSlugs.has(p.slug) &&
        !quarantinedSlugs.has(p.slug)
    ) || moduleProblems[moduleProblems.length - 1];

    return (
      <div className="min-h-[80vh] flex flex-col items-center justify-center p-6 text-center space-y-5 max-w-lg mx-auto">
        <div className="w-16 h-16 rounded-2xl bg-amber-500/15 border border-amber-500/40 flex items-center justify-center text-amber-400 mx-auto shadow-lg shadow-amber-500/10">
          <AlertTriangle className="w-8 h-8 animate-pulse" />
        </div>
        <div className="space-y-2">
          <span className="px-2.5 py-1 rounded-full text-[11px] font-bold font-mono bg-amber-500/20 text-amber-400 border border-amber-500/40">
            PROCTORING QUARANTINE
          </span>
          <h2 className="text-xl font-bold font-mono text-[var(--text-main)]">
            Question #{problem.moduleOrder} is Quarantined 🔒
          </h2>
          <p className="text-xs font-mono text-[var(--text-muted)] leading-relaxed">
            This question was locked after 3 tab switches. Please complete all remaining questions in this module first. You will be given <strong>1 final chance</strong> to attempt this question before submitting the module!
          </p>
        </div>
        {nextPlayable && nextPlayable.slug !== problemSlug && (
          <button
            type="button"
            onClick={() => handleSelectProblem(nextPlayable.slug)}
            className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-indigo-600 hover:opacity-95 text-white font-mono text-xs font-bold shadow-md shadow-cyan-500/20 transition cursor-pointer"
          >
            ← Continue to Active Question (#{nextPlayable.moduleOrder}: {nextPlayable.title})
          </button>
        )}
      </div>
    );
  }

  // Barrier 2: Sequential lock check
  if (moduleProblems.length > 0 && currentProblemIndex > 0 && !isProblemUnlocked(currentProblemIndex)) {
    const firstUnsolved = moduleProblems.find((p: any, idx: number) => isProblemUnlocked(idx) && !p.isSolved && !solvedSlugs.has(p.slug)) || moduleProblems[0];
    return (
      <div className="min-h-[80vh] flex flex-col items-center justify-center p-6 text-center space-y-5 max-w-lg mx-auto">
        <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 mx-auto shadow-lg shadow-amber-500/10">
          <Lock className="w-8 h-8" />
        </div>
        <div className="space-y-2">
          <h2 className="text-xl font-bold font-mono text-[var(--text-main)]">
            Question #{problem.moduleOrder} is Locked 🔒
          </h2>
          <p className="text-xs font-mono text-[var(--text-muted)] leading-relaxed">
            In this module, questions must be completed in order. You must complete or clear previous questions before unlocking Question #{problem.moduleOrder}.
          </p>
        </div>
        {firstUnsolved && (
          <button
            type="button"
            onClick={() => handleSelectProblem(firstUnsolved.slug)}
            className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-indigo-600 hover:opacity-95 text-white font-mono text-xs font-bold shadow-md shadow-cyan-500/20 transition cursor-pointer"
          >
            ← Solve Current Unlocked Question (#{firstUnsolved.moduleOrder}: {firstUnsolved.title})
          </button>
        )}
      </div>
    );
  }

  return (
    <div
      className={`fixed inset-0 z-40 w-full h-[100dvh] max-h-[100dvh] flex flex-col overflow-hidden bg-[var(--bg-main)] text-[var(--text-main)] ${
        isFullscreen ? 'z-50' : ''
      }`}
    >
      {/* 1 Final Chance Mercy Mode Active Banner */}
      {problemSlug && secondChanceSlugs.has(problemSlug) && (
        <div className="bg-rose-500/15 border-b border-rose-500/30 px-3 sm:px-4 py-2 flex items-center justify-between text-xs font-mono text-rose-300 shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 animate-pulse" />
            <span className="truncate">
              <strong>1 Final Chance Mode:</strong> This question was previously quarantined for tab-switching. Submissions will be flagged as <strong>🚨 Try to Cheat / Quarantined Solution</strong> for faculty audit.
            </span>
          </div>
          <span className="px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 border border-rose-500/40 text-[10px] font-bold shrink-0">
            FLAGGED ATTEMPT
          </span>
        </div>
      )}

      {/* Top JEE CBT Exam Header */}
      <div className="h-14 border-b border-[var(--border-line)] bg-[var(--bg-panel)] px-3 sm:px-4 flex items-center justify-between shrink-0 z-20">
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          <button
            type="button"
            onClick={() => setIsExitConfirmOpen(true)}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-[var(--border-line)] bg-[var(--bg-surface)] hover:bg-[var(--bg-surface-hover)] text-xs font-mono text-[var(--text-muted)] hover:text-rose-400 transition shrink-0"
            title="Exit test session and return to modules"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Exit Test</span>
          </button>

          <div className="h-4 w-[1px] bg-[var(--border-line)] shrink-0" />

          {/* Module & Question Identity */}
          <div className="min-w-0 flex items-center gap-2">
            <span className="hidden md:inline px-2 py-0.5 rounded bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 text-[11px] font-mono font-bold shrink-0">
              MOD {moduleConfig.order}
            </span>
            <span className="font-mono text-xs font-bold text-[var(--text-main)] truncate max-w-[130px] sm:max-w-[200px]">
              {moduleConfig.title}
            </span>
            <span className="text-xs font-mono text-indigo-400 font-bold px-2 py-0.5 rounded bg-indigo-500/10 border border-indigo-500/25 shrink-0">
              Q{problem.moduleOrder} of {moduleProblems.length || 20}
            </span>
          </div>

          <div className="hidden lg:flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={() => setIsIssueModalOpen(true)}
              className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 text-xs font-mono text-rose-400 transition"
              title="Report an issue to faculty"
            >
              <Flag className="w-3.5 h-3.5" />
              <span>Raise Issue</span>
            </button>
            <button
              type="button"
              onClick={() => setIsInstructionsOpen(true)}
              className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[var(--bg-surface)] hover:bg-[var(--bg-surface-hover)] border border-[var(--border-line)] text-xs font-mono text-[var(--text-muted)] hover:text-[var(--text-main)] transition"
              title="Test rules & palette guide"
            >
              <BookOpen className="w-3.5 h-3.5 text-amber-400" />
              <span>Instructions</span>
            </button>
          </div>
        </div>

        {/* Right Utility: Timer, Proctoring, and Mobile Palette Toggle */}
        <div className="flex items-center gap-2 shrink-0 pr-4 sm:pr-8">
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

          {/* Tab Switch Counter Badge */}
          {sessionTabSwitches > 0 && (
            <span
              className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-mono font-bold bg-rose-500/15 text-rose-400 border border-rose-500/40 animate-pulse"
              title={`${tabSwitchCount} tab switch(es) detected`}
            >
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>{sessionTabSwitches}</span>
            </span>
          )}

          {/* Question Palette Drawer Toggle */}
          <button
            type="button"
            onClick={() => setIsPaletteDrawerOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-[var(--border-line)] bg-[var(--bg-surface)] hover:bg-[var(--bg-surface-hover)] text-xs font-mono text-[var(--text-main)] transition cursor-pointer"
            title="Open Question Palette"
          >
            <Layers className="w-3.5 h-3.5 text-cyan-400" />
            <span>Palette ({solvedSlugs.size}/{moduleProblems.length || 20})</span>
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
        {/* Left Pane on desktop: Problem Description Statement */}
        <div
          className={`w-full lg:w-1/2 min-w-0 lg:min-w-[340px] shrink-0 flex flex-col border-b lg:border-b-0 border-r border-[var(--border-line)] overflow-y-auto p-4 sm:p-6 space-y-6 select-none lg:order-1 ${
            activeMobileTab === 'statement' ? 'flex-1' : 'hidden lg:flex'
          }`}
          onCopy={(e) => {
            e.preventDefault();
            toast.warning('⚠️ Copying question text is restricted for academic integrity.');
          }}
          onCut={(e) => e.preventDefault()}
          onContextMenu={(e) => e.preventDefault()}
          style={{ userSelect: 'none', WebkitUserSelect: 'none' }}
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

        {/* Right Pane on desktop: Code Editor & Terminal Drawer */}
        <div
          className={`flex-1 min-w-0 lg:min-w-[360px] flex flex-col min-h-0 bg-[var(--bg-main)] lg:border-r-0 border-[var(--border-line)] lg:order-2 ${
            activeMobileTab !== 'statement' ? 'flex-1' : 'hidden lg:flex'
          }`}
        >
          {/* Editor Container (visible when active tab is editor on mobile, or always on desktop) */}
          <div
            className={`flex-1 min-h-[300px] relative overflow-hidden ${
              activeMobileTab === 'results' ? 'hidden sm:block' : 'block'
            }`}
          >
            {/* Real-time Proctoring Alert HUD */}
            {proctorWarningBanner && (
              <div className="absolute top-2 left-3 right-3 z-30 p-2.5 rounded-xl border border-rose-500/40 bg-[#160c18]/95 dark:bg-[#160c18]/95 text-rose-300 flex items-center justify-between gap-3 shadow-xl backdrop-blur-md animate-in fade-in slide-in-from-top-2 duration-200">
                <div className="flex items-center gap-2 text-xs font-mono">
                  <ShieldAlert className="w-4 h-4 text-rose-400 shrink-0 animate-bounce" />
                  <span className="font-semibold">{proctorWarningBanner.message}</span>
                </div>
                <button
                  type="button"
                  onClick={() => setProctorWarningBanner(null)}
                  className="p-1 rounded-lg hover:bg-rose-500/20 text-rose-400 cursor-pointer"
                  title="Acknowledge warning"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
            <CodeEditor
              code={code}
              onChange={handleCodeChange}
              onReset={handleResetStarterCode}
              onRun={handleCompileAndRun}
              isRunning={submitMutation.isPending || runMutation.isPending}
              isSubmitting={submitMutation.isPending}
              readOnly={false}
              disableCopyPaste={true}
              onBlockedAction={(action) => {
                if (action === 'paste') {
                  handlePasteAttemptRef.current?.();
                }
              }}
              forceTheme="dark"
            />
          </div>

          {/* Bottom Execution Dock (Apple-style Segmented Dock identical to Daily Challenge) */}
          <div
            className={`border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0c1017] shadow-xl transition-[height] duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] flex flex-col shrink-0 overflow-hidden ${
              isDrawerOpen ? 'h-60 sm:h-72 max-h-[45%]' : 'h-12'
            }`}
          >
            {/* Dock Header Bar */}
            <div className="flex items-center justify-between px-2 sm:px-4 py-1.5 bg-slate-50 dark:bg-[#111622] border-b border-slate-200 dark:border-slate-800 shrink-0 font-mono text-xs gap-1.5 select-none overflow-x-auto">
              <div className="inline-flex items-center gap-1 p-0.5 sm:p-1 rounded-xl bg-slate-200/80 dark:bg-[#080c14] border border-slate-300/80 dark:border-slate-800 shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    setActiveBottomTab('cases');
                    setIsDrawerOpen(true);
                  }}
                  className={`px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap shrink-0 ${
                    activeBottomTab === 'cases' && isDrawerOpen
                      ? 'bg-white dark:bg-slate-800 text-cyan-700 dark:text-cyan-400 border border-slate-300 dark:border-cyan-500/40 shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-white/60 dark:hover:bg-slate-800/50'
                  }`}
                >
                  <Layers className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400 shrink-0" />
                  <span>Test Cases</span>
                  <span className="hidden sm:inline">({sampleCases.length || 1})</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setActiveBottomTab('output');
                    setIsDrawerOpen(true);
                  }}
                  className={`px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap shrink-0 ${
                    activeBottomTab === 'output' && isDrawerOpen
                      ? 'bg-white dark:bg-slate-800 text-cyan-700 dark:text-cyan-400 border border-slate-300 dark:border-cyan-500/40 shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-white/60 dark:hover:bg-slate-800/50'
                  }`}
                >
                  <Cpu className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400 shrink-0" />
                  <span>Verdict</span>
                  <span className="hidden sm:inline">&amp; Output</span>
                  {(runResult || submissionResult || executionError) && (
                    <span
                      className={`ml-1 inline-block w-2 h-2 rounded-full ${
                        runResult?.verdict === 'ACCEPTED' || submissionResult?.verdict === 'ACCEPTED'
                          ? 'bg-emerald-400 animate-pulse'
                          : 'bg-rose-400 animate-ping'
                      }`}
                    />
                  )}
                </button>
              </div>

              <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
                <button
                  type="button"
                  aria-label={isDrawerOpen ? 'Collapse execution drawer' : 'Expand execution drawer'}
                  onClick={() => setIsDrawerOpen(!isDrawerOpen)}
                  className="px-2.5 py-1.5 rounded-lg text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/80 dark:hover:bg-slate-800 border border-slate-300 dark:border-slate-700 transition-all flex items-center gap-1 font-mono text-xs cursor-pointer whitespace-nowrap shrink-0"
                >
                  <span className="font-semibold">{isDrawerOpen ? 'Collapse' : 'Expand'}</span>
                  <ChevronDown
                    className={`w-3.5 h-3.5 transition-transform duration-300 ${
                      isDrawerOpen ? 'rotate-0' : 'rotate-180'
                    }`}
                  />
                </button>
              </div>
            </div>

            {/* Drawer Body */}
            {isDrawerOpen && (
              <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain p-4 font-mono text-xs bg-white dark:bg-[#0c1017]">
                {/* Tab 1: Interactive Use Cases (Automated Input) */}
                {activeBottomTab === 'cases' && (
                  <div className="h-full flex flex-col space-y-3 font-mono">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <div className="flex items-center gap-1.5 overflow-x-auto">
                        {sampleCases.length === 0 ? (
                          <span className="text-slate-500 dark:text-slate-400 text-xs">
                            No use cases provided for this problem.
                          </span>
                        ) : (
                          sampleCases.map((tc: any, idx: number) => (
                            <button
                              key={tc.id || idx}
                              type="button"
                              onClick={() => {
                                setSelectedCaseIndex(idx);
                                setCustomInput(tc.input || '');
                              }}
                              className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap shrink-0 ${
                                selectedCaseIndex === idx
                                  ? 'bg-gradient-to-r from-cyan-500 to-teal-500 text-white shadow-sm shadow-cyan-500/25 border border-cyan-400'
                                  : 'bg-slate-100 dark:bg-[#131b2c] text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700/70'
                              }`}
                            >
                              <span>Use Case {idx + 1}{idx === 0 ? ' (Sample)' : ''}</span>
                            </button>
                          ))
                        )}
                      </div>
                    </div>

                    {sampleCases[selectedCaseIndex] && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 flex-1 min-h-0 text-xs">
                        <div className="flex flex-col min-h-0">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-[11px] font-mono font-bold text-[var(--text-muted)] tracking-wide">
                              Input
                            </span>
                          </div>
                          <pre className="flex-1 p-2.5 rounded-lg bg-slate-50 dark:bg-[#050811] text-slate-900 dark:text-cyan-300 border border-slate-200 dark:border-slate-800/80 overflow-auto whitespace-pre font-mono font-medium shadow-xs">
                            {sampleCases[selectedCaseIndex].input || '(No input required for this case)'}
                          </pre>
                        </div>
                        <div className="flex flex-col min-h-0">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-[11px] font-mono font-bold text-emerald-500 tracking-wide">
                              Expected Output
                            </span>
                          </div>
                          <pre className="flex-1 p-2.5 rounded-lg bg-slate-50 dark:bg-[#050811] text-emerald-800 dark:text-emerald-300 border border-slate-200 dark:border-slate-800/80 overflow-auto whitespace-pre font-mono font-medium shadow-xs font-bold">
                            {sampleCases[selectedCaseIndex].expectedOutput}
                          </pre>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Tab 2: Integrated Interactive GCC Terminal & Verdict Output */}
                {activeBottomTab === 'output' && (
                  <div className="space-y-4 font-mono">
                    {/* Execution Error Card with Non-destructive Retry Button */}
                    {executionError && (
                      <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 space-y-2 font-mono">
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
                            className="text-[var(--text-muted)] hover:text-[var(--text-main)] text-xs cursor-pointer"
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
                              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[var(--accent)] hover:opacity-90 text-[#0C0F1F] font-bold text-xs transition-opacity cursor-pointer"
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

                    {/* Prominent Real-time GCC Terminal */}
                    <TerminalConsole
                      status={
                        runMutation.isPending || submitMutation.isPending
                          ? 'COMPILING'
                          : submissionResult?.verdict || runResult?.verdict || (executionError ? 'ERROR' : 'IDLE')
                      }
                      compileOutput={runResult?.compileOutput || submissionResult?.compileOutput}
                      stdout={runResult?.stdout}
                      stderr={runResult?.stderr}
                      exitCode={
                        runResult?.exitCode ??
                        (submissionResult?.verdict === 'COMPILE_ERROR'
                          ? 1
                          : submissionResult?.verdict === 'ACCEPTED'
                          ? 0
                          : null)
                      }
                      runtimeMs={runResult?.runtimeMs || submissionResult?.runtimeMs}
                      useCaseInput={sampleCases[selectedCaseIndex]?.input}
                      expectedOutput={sampleCases[selectedCaseIndex]?.expectedOutput}
                      useCaseIndex={selectedCaseIndex}
                      totalUseCases={sampleCases.length}
                      testCases={submissionResult?.testCaseResults}
                      isLoading={runMutation.isPending || submitMutation.isPending}
                      onRetry={() => {
                        if (submissionResult) submitMutation.mutate();
                        else runMutation.mutate();
                      }}
                      onClear={() => {
                        setRunResult(null);
                        setSubmissionResult(null);
                        setExecutionError(null);
                      }}
                    />

                    {/* Detailed Test Case Results Breakdown for Submitted Solutions */}
                    {submissionResult?.testCaseResults && submissionResult.testCaseResults.length > 0 && (() => {
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
                            Official Use Case Results:
                          </span>

                          {/* Sample Use Cases */}
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
                                      Use Case {idx + 1}:
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

                          {/* Hidden Use Cases */}
                          {hiddenTotal > 0 && (
                            <div className="space-y-2">
                              <button
                                type="button"
                                onClick={() => {
                                  if (!isAllHiddenPassed) {
                                    setShowHiddenPracticeHint((prev) => !prev);
                                  }
                                }}
                                className={`w-full px-3 py-2.5 rounded-xl border flex items-center justify-between text-xs transition-colors text-left ${
                                  isAllHiddenPassed
                                    ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/25 cursor-default'
                                    : 'bg-rose-500/10 text-rose-300 border-rose-500/30 hover:bg-rose-500/20 cursor-pointer shadow-xs active:scale-98 ring-1 ring-amber-500/40 hover:ring-amber-400/60'
                                }`}
                                title={!isAllHiddenPassed ? 'Click to reveal hidden test case diagnostic hint' : undefined}
                              >
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="font-semibold text-[var(--text-main)]">
                                    Hidden Use Cases:
                                  </span>
                                  <span className="font-bold">
                                    Passed {hiddenPassed}/{hiddenTotal} {isAllHiddenPassed ? '✅' : '❌'}
                                  </span>
                                  {!isAllHiddenPassed && (
                                    <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-amber-500/20 text-amber-300 font-bold border border-amber-500/40 animate-pulse flex items-center gap-1">
                                      <span>💡 Click for Hint</span>
                                    </span>
                                  )}
                                  {isAllHiddenPassed && (
                                    <span className="text-emerald-400 font-bold ml-1">
                                      (Solved)
                                    </span>
                                  )}
                                </div>
                                <span className="text-[11px] text-[var(--text-muted)] flex items-center gap-1 shrink-0 ml-2">
                                  {isAllHiddenPassed
                                    ? 'All hidden checks passed'
                                    : `${hiddenTotal - hiddenPassed} hidden check(s) failed`}
                                </span>
                              </button>

                              {showHiddenPracticeHint && !isAllHiddenPassed && (
                                <div className="p-3.5 rounded-xl bg-gradient-to-br from-amber-500/15 via-amber-950/25 to-black/40 border border-amber-500/40 text-amber-200 text-xs font-mono space-y-2 shadow-lg backdrop-blur-md">
                                  <div className="flex items-center justify-between font-bold text-amber-300 border-b border-amber-500/20 pb-1.5">
                                    <span className="flex items-center gap-2">
                                      <span className="w-5 h-5 rounded-full bg-amber-500/20 flex items-center justify-center text-amber-300 text-xs">
                                        💡
                                      </span>
                                      <span>Hidden Test Case Diagnostic Guidance</span>
                                    </span>
                                    <button
                                      type="button"
                                      onClick={() => setShowHiddenPracticeHint(false)}
                                      className="p-1 text-amber-400/80 hover:text-amber-200 rounded-md hover:bg-amber-500/20 cursor-pointer transition-colors"
                                    >
                                      <X className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                  <div className="p-2.5 rounded-lg bg-black/60 border border-amber-500/30 text-[11px] leading-relaxed text-amber-100 font-sans">
                                    Check edge case inputs like boundary numbers, negative values, 0 or large limits, and verify integer division in C (e.g. use float division 9.0/5.0 instead of 9/5). Make sure there are no extra leading/trailing whitespace or unexpected characters printed.
                                  </div>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })()}

                    {/* Accepted Celebration Banner */}
                    {submissionResult?.verdict === 'ACCEPTED' && (
                      <div className="mt-3 p-3.5 rounded-xl bg-gradient-to-r from-emerald-500/15 via-teal-500/10 to-emerald-500/15 border border-emerald-500/30 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-sm">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-lg bg-emerald-500/20 flex items-center justify-center text-emerald-400 shrink-0">
                            <Trophy className="w-4 h-4" />
                          </div>
                          <div>
                            <div className="text-xs font-bold text-emerald-400">
                              Challenge Solved! All use cases passed.
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
                            className="w-full sm:w-auto px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-[#0C0F1F] font-bold text-xs flex items-center justify-center gap-1.5 transition-colors shadow-sm shrink-0 cursor-pointer"
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
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Apple Slide-Over Question Palette Drawer (Full Screen Overlay with Backdrop) */}
      {isPaletteDrawerOpen && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/40 backdrop-blur-xs animate-in fade-in duration-150">
          <div
            className="fixed inset-0"
            onClick={() => setIsPaletteDrawerOpen(false)}
          />
          <div className="relative w-80 max-w-[85vw] h-full shadow-2xl z-10 animate-in slide-in-from-right duration-200 bg-[var(--bg-panel)] border-l border-[var(--border-line)]">
            <JeeQuestionPalette
              moduleTitle={moduleConfig.title}
              moduleOrder={moduleConfig.order}
              problems={moduleProblems}
              currentProblemSlug={problemSlug || ''}
              visitedProblems={sanitizedVisitedProblems}
              markedForReview={markedForReview}
              solvedSlugs={solvedSlugs}
              quarantinedSlugs={quarantinedSlugs}
              onSelectProblem={(slug) => {
                handleSelectProblem(slug);
                setIsPaletteDrawerOpen(false);
              }}
              onSubmitTest={() => {
                setIsPaletteDrawerOpen(false);
                handleOpenSubmitOrMercy();
              }}
              user={user}
              onOpenQuestionPaper={() => {
                setIsPaletteDrawerOpen(false);
                setIsQuestionPaperOpen(true);
              }}
              onOpenInstructions={() => {
                setIsPaletteDrawerOpen(false);
                setIsInstructionsOpen(true);
              }}
              isMobileDrawer={true}
              onCloseMobileDrawer={() => setIsPaletteDrawerOpen(false)}
            />
          </div>
        </div>
      )}

      {/* 1 Final Chance Mercy Modal for Locked Questions */}
      {showMercyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="w-full max-w-md bg-[var(--bg-panel)] border border-amber-500/40 rounded-2xl shadow-2xl p-6 space-y-5 animate-in zoom-in-95 duration-200">
            <div className="w-14 h-14 rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400 mx-auto">
              <AlertTriangle className="w-7 h-7" />
            </div>

            <div className="text-center space-y-2">
              <h3 className="text-lg font-bold font-mono text-[var(--text-main)]">
                Locked Questions Detected 🔒
              </h3>
              <p className="text-xs font-mono text-[var(--text-muted)] leading-relaxed">
                You have <strong>{moduleProblems.filter((p: any) => quarantinedSlugs.has(p.slug) && !p.isSolved && !solvedSlugs.has(p.slug)).length} question(s)</strong> that were locked due to 3 tab switch violations.
              </p>
              <div className="text-xs font-mono text-amber-300 font-medium bg-amber-500/10 p-3 rounded-xl border border-amber-500/20 text-left space-y-1">
                <span className="font-bold block uppercase text-[10px] tracking-wider text-amber-400">1 Final Chance Policy:</span>
                <p>You have 1 chance to solve locked question(s). Did you want to solve them now before final submission?</p>
              </div>
            </div>

            <div className="flex flex-col gap-2.5 pt-1">
              <button
                type="button"
                onClick={handleAcceptMercyChance}
                className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-black font-mono font-bold text-xs shadow-lg shadow-amber-500/20 transition cursor-pointer"
              >
                Yes, Solve Locked Question(s) (1 Final Chance) →
              </button>
              <button
                type="button"
                onClick={handleDeclineMercyChance}
                className="w-full py-2.5 px-4 rounded-xl bg-[var(--bg-surface)] hover:bg-[var(--bg-surface-hover)] border border-[var(--border-line)] text-xs font-mono font-bold text-[var(--text-muted)] hover:text-[var(--text-main)] transition cursor-pointer"
              >
                No, Final Submit (Keep Pending)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* JEE Assessment Modals */}
      <JeeSubmitModal
        isOpen={isSubmitModalOpen}
        onClose={() => setIsSubmitModalOpen(false)}
        moduleTitle={moduleConfig.title}
        moduleOrder={moduleConfig.order}
        problems={moduleProblems}
        solvedSlugs={solvedSlugs}
        markedForReview={markedForReview}
        visitedProblems={sanitizedVisitedProblems}
        quarantinedSlugs={quarantinedSlugs}
        onAttemptQuarantined={handleAcceptMercyChance}
        user={user}
        onConfirmSubmit={handleConfirmFinalSubmit}
        onGoToNextModule={() => {
          const nextMod = PRACTICE_CONFIG.MODULES.find((m) => m.order === moduleConfig.order + 1);
          if (nextMod) {
            navigate(isLabRoute ? `/lab-internal?module=${nextMod.order}` : `/practice?module=${nextMod.order}`);
          } else {
            returnToHub();
          }
        }}
        onBackToModules={returnToHub}
      />

      <MemoryVisualizerModal
        isOpen={isMemoryModalOpen}
        onClose={() => setIsMemoryModalOpen(false)}
      />

      <JeeQuestionPaperModal
        isOpen={isQuestionPaperOpen}
        onClose={() => setIsQuestionPaperOpen(false)}
        moduleTitle={moduleConfig.title}
        moduleOrder={moduleConfig.order}
        problems={moduleProblems}
        currentProblemSlug={problemSlug || ''}
        solvedSlugs={solvedSlugs}
        markedForReview={markedForReview}
        visitedProblems={sanitizedVisitedProblems}
        quarantinedSlugs={quarantinedSlugs}
        onSelectProblem={handleSelectProblem}
      />

      <JeeInstructionsModal
        isOpen={showDeclarationModal || isInstructionsOpen}
        onClose={() => {
          if (!hasAgreedRules) {
            returnToHub();
          } else {
            setIsInstructionsOpen(false);
          }
        }}
        moduleTitle={moduleConfig.title}
        moduleOrder={moduleConfig.order}
        totalQuestions={moduleProblems.length || 20}
        user={user}
        isDeclarationMode={showDeclarationModal}
        onAgreeAndStart={handleAgreeAndStart}
        onBackToModules={returnToHub}
      />

      {/* Exit Test Confirmation Modal */}
      {isExitConfirmOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="w-full max-w-md glass-card rounded-2xl border border-[var(--border-line)] bg-[var(--bg-panel)] shadow-2xl p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-[var(--text-main)] font-mono">
                Exit Test Session?
              </h3>
            </div>
            <p className="text-xs text-[var(--text-muted)] font-mono leading-relaxed">
              Your code and verified solutions are automatically preserved in the cloud. You can return and continue this test session anytime.
            </p>
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setIsExitConfirmOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-mono font-bold text-[var(--text-muted)] hover:text-[var(--text-main)] bg-[var(--bg-surface)] hover:bg-[var(--bg-surface-hover)] border border-[var(--border-line)] transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsExitConfirmOpen(false);
                  returnToHub();
                }}
                className="px-4 py-2 rounded-xl bg-rose-500/20 text-rose-300 border border-rose-500/40 hover:bg-rose-500/30 text-xs font-mono font-bold transition cursor-pointer"
              >
                Yes, Exit Test
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Mandatory Proctored Fullscreen Modal */}
      {showFullscreenModal && !isFullscreen && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-md rounded-2xl border border-[var(--border-line)] bg-[var(--bg-panel)] shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-150">
            {/* Header with Icon */}
            <div className="p-5 border-b border-[var(--border-line)] bg-[var(--bg-surface)] flex items-center gap-3.5">
              <div className="w-11 h-11 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 shrink-0">
                <Maximize2 className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-cyan-500/15 text-cyan-400 border border-cyan-500/30 uppercase tracking-wider">
                  Module {moduleConfig.order} • Q{currentProblemIndex >= 0 ? currentProblemIndex + 1 : 1}
                </span>
                <h3 className="text-base font-bold text-[var(--text-main)] font-mono mt-0.5">
                  {fullscreenExits > 0 ? 'Resume Fullscreen Mode' : 'Proctored Fullscreen Required'}
                </h3>
              </div>
            </div>

            {/* Problem & Test Snapshot Card */}
            <div className="p-5 space-y-4">
              <div className="p-3.5 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-line)] space-y-2">
                <div className="flex items-center justify-between gap-2 text-xs font-mono">
                  <span className="text-[var(--text-muted)]">Active Problem:</span>
                  <span className="px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 font-bold text-[10px]">
                    Attempt #{currentAttempt}
                  </span>
                </div>
                <h4 className="font-bold text-sm text-[var(--text-main)] font-mono truncate">
                  {problem?.title || 'Practice Coding Problem'}
                </h4>
              </div>

              {/* Quick Anti-Cheat Chips (No long boring essays) */}
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

              <p className="text-[11px] font-mono text-center text-[var(--text-muted)] leading-relaxed">
                To maintain evaluation fairness and prevent cheating, problem solving is restricted to proctored fullscreen mode.
              </p>
            </div>

            {/* Action Buttons */}
            <div className="p-4 border-t border-[var(--border-line)] bg-[var(--bg-surface)] flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={returnToHub}
                className="px-4 py-2.5 rounded-xl text-xs font-mono font-bold text-[var(--text-muted)] hover:text-[var(--text-main)] bg-[var(--bg-panel)] hover:bg-[var(--bg-panel)]/80 border border-[var(--border-line)] transition flex items-center gap-1.5 cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Modules</span>
              </button>

              <button
                type="button"
                onClick={requestFullscreen}
                className="flex-1 py-2.5 rounded-xl font-mono text-xs font-bold tracking-wide transition flex items-center justify-center gap-2 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white shadow-lg shadow-emerald-500/20 cursor-pointer transform hover:scale-[1.01] active:scale-[0.99]"
              >
                <Maximize2 className="w-3.5 h-3.5" />
                <span>{fullscreenExits > 0 ? 'Resume Fullscreen' : 'Enter Fullscreen & Begin'}</span>
              </button>
            </div>
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

      {/* Raise Issue Modal */}
      {isIssueModalOpen && (
        <RaiseIssueModal
          isOpen={isIssueModalOpen}
          onClose={() => setIsIssueModalOpen(false)}
          questionTitle={problem?.title || 'Coding Problem'}
          questionId={problem?.id || problemSlug || ''}
          contextType={location.pathname.startsWith('/lab-internal') ? 'LAB_INTERNAL' : 'PRACTICE'}
        />
      )}
    </div>
  );
};
