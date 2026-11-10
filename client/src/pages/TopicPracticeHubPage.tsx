import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Link, useSearchParams } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import confetti from 'canvas-confetti';
import { toast } from 'sonner';
import {
  Code2,
  BookOpen,
  Home,
  Sparkles,
  CheckCircle2,
  ChevronRight,
  Lightbulb,
  Terminal,
  Play,
  Flag,
  RotateCcw,
  Layers,
  Cpu,
  Loader2,
  ArrowRight,
  ArrowLeft,
  ShieldCheck,
  Info,
  X,
  FileCode,
  Flame,
  Award,
  Trophy,
  Search,
  Clock,
  Check,
  ChevronDown,
  ChevronUp,
  ChevronLeft,
  Maximize2,
  Minimize2,
  Copy,
  ExternalLink,
  Zap,
  User,
  LayoutGrid,
  AlertTriangle,
  Infinity,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { TOPIC_PRACTICE_DATA, TopicPracticeItem } from '../data/topic-practice.data.js';
import { PRACTICE_MODULE_1_PROBLEMS } from '../data/practice-module1.data.js';
import { PRACTICE_MODULE_2_PROBLEMS } from '../data/practice-module2.data.js';
import { PRACTICE_MODULE_3_PROBLEMS } from '../data/practice-module3.data.js';
import { PRACTICE_MODULE_4_PROBLEMS } from '../data/practice-module4.data.js';
import { Lock } from 'lucide-react';
import { CodeEditor } from '../components/editor/CodeEditor.js';
import { RaiseIssueModal } from '../components/common/RaiseIssueModal.js';
import { StatementMarkdown } from '../components/common/StatementMarkdown.js';
import { GccFriendlyHintCard } from '../components/common/GccFriendlyHintCard.js';
import { TerminalConsole } from '../components/common/TerminalConsole.js';
import { useAuth } from '../context/AuthContext.js';
import { auth, db } from '../config/firebase.js';
import { doc, getDoc } from 'firebase/firestore';
import { FirestoreDataService } from '../services/firestoreData.service.js';
import { RealtimeSyncService } from '../services/realtimeSync.service.js';
import { DraftSyncService, DraftData, getDeviceLabel } from '../services/draftSync.service.js';
import { api } from '../api/client.js';
import { handleFallbackRequest } from '../api/fallbackEngine.js';
import { formatPracticeTime } from '../components/practice/PracticeTimer.js';
import { getPracticeModuleUnlockInfo } from '../utils/progression.js';

const STORAGE_KEY = 'logicq_solved_practice_topics';

export function getSolvedPracticeTopicIds(userId?: string): string[] {
  try {
    const results = new Set<string>();

    // 1. Check global storage key
    const rawGlobal = localStorage.getItem(STORAGE_KEY);
    if (rawGlobal) {
      try {
        const arr = JSON.parse(rawGlobal);
        if (Array.isArray(arr)) arr.forEach((x) => x && results.add(String(x)));
      } catch {}
    }

    // 2. Check user-scoped key
    if (userId && userId !== 'anon') {
      const userKey = `${STORAGE_KEY}_${userId}`;
      const rawUser = localStorage.getItem(userKey);
      if (rawUser) {
        try {
          const arr = JSON.parse(rawUser);
          if (Array.isArray(arr)) arr.forEach((x) => x && results.add(String(x)));
        } catch {}
      }
    }

    // 3. Check fallback practice progress map
    try {
      const rawProg = localStorage.getItem('logicq_fallback_practice_progress_v1');
      if (rawProg) {
        const progMap = JSON.parse(rawProg);
        Object.keys(progMap).forEach((k) => {
          if (progMap[k]?.isSolved) {
            const clean = k.includes(':') ? k.split(':')[1] : k;
            if (clean) results.add(clean);
          }
        });
      }
    } catch {}

    // 4. Scan all logicq_practice_progress_* and logicq_stats_backup_* keys
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && (key.startsWith('logicq_practice_progress_') || key.startsWith('logicq_stats_backup_'))) {
          const raw = localStorage.getItem(key);
          if (raw) {
            try {
              const parsed = JSON.parse(raw);
              const list = Array.isArray(parsed) ? parsed : parsed?.completedProblems;
              if (Array.isArray(list)) list.forEach((x) => x && results.add(String(x)));
            } catch {}
          }
        }
      }
    } catch {}

    return Array.from(results);
  } catch {
    return [];
  }
}

export function markPracticeTopicSolved(topicId: string, userId?: string): string[] {
  try {
    const list = getSolvedPracticeTopicIds(userId);
    if (!list.includes(topicId)) {
      list.push(topicId);
    }
    // Write to both global and user-specific keys so student progress is NEVER lost
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
      if (userId && userId !== 'anon') {
        localStorage.setItem(`${STORAGE_KEY}_${userId}`, JSON.stringify(list));
        localStorage.setItem(`logicq_practice_progress_${userId}`, JSON.stringify(list));
      }
    } catch {}

    // Also persist in fallback progress map
    try {
      const rawProg = localStorage.getItem('logicq_fallback_practice_progress_v1');
      const progMap = rawProg ? JSON.parse(rawProg) : {};
      progMap[topicId] = { isSolved: true, lastVerdict: 'ACCEPTED' };
      if (userId && userId !== 'anon') {
        progMap[`${userId}:${topicId}`] = { isSolved: true, lastVerdict: 'ACCEPTED' };
      }
      localStorage.setItem('logicq_fallback_practice_progress_v1', JSON.stringify(progMap));
    } catch {}

    // Also record today's date in activity dates for streak tracking
    try {
      const todayStr = new Date().toISOString().split('T')[0];
      const rawDates = localStorage.getItem('logicq_user_activity_dates');
      const dates = rawDates ? JSON.parse(rawDates) : [];
      if (!dates.includes(todayStr)) {
        dates.push(todayStr);
        localStorage.setItem('logicq_user_activity_dates', JSON.stringify(dates));
      }
    } catch {}

    return list;
  } catch {
    return [topicId];
  }
}

function getHiddenCaseHint(topic: TopicPracticeItem | null, result?: any, userCode?: string): string {
  if (!topic) return 'Check edge case inputs like boundary numbers, negative values, and exact output formatting.';

  const id = topic.id || '';
  const titleLower = (topic.topicTitle || '').toLowerCase();
  const descLower = (topic.problem?.description || '').toLowerCase();
  const actualOut = String(result?.actualHiddenOut || result?.actualOutput || '').trim();

  // Specific high-impact topic hints:
  if (id === 'm1-t1-basic-io' || titleLower.includes('temperature') || titleLower.includes('format specifier')) {
    if (userCode && (/\/\/\s*scanf/i.test(userCode) || !/\bscanf\s*\(/i.test(userCode))) {
      return '⚠️ Input not being read: Notice that scanf() is commented out (//scanf("%f",&c);) or missing in your code! The automated test feeds "37.5" via standard input (stdin), but without scanf("%f", &c), variable c remains uninitialized (0.0) and always prints 32.00 instead of 99.50. Please uncomment scanf("%f", &c); so the program reads input!';
    }
    if (actualOut === '32.00' || actualOut === '32') {
      return 'Notice your output is 32.00: in C, integer division (9 / 5) evaluates to integer 1, causing (C * 9 / 5) to truncate decimals or evaluate to 0 if C is small! Always use (9.0 / 5.0) or (c * 9.0 / 5.0) + 32.0, and print with "%.2f\\n".';
    }
    return 'Hidden test uses fractional float inputs (e.g., 37.5°C). In C, (9 / 5) evaluates to integer 1, which truncates all decimals! Always use (9.0 / 5.0) or (c * 9.0 / 5.0) + 32.0, and print with "%.2f\\n".';
  }

  if (id === 'm1-t2-if-else' || titleLower.includes('triangle') || descLower.includes('equilateral') || descLower.includes('scalene')) {
    return 'Hidden test checks scalene and invalid side lengths (e.g., 3 4 5). Verify triangle inequality: (a + b > c && a + c > b && b + c > a), and check conditions in strict priority order.';
  }

  if (id === 'm1-t3-switch-case' || titleLower.includes('calculator') || titleLower.includes('switch')) {
    return 'Hidden test checks division by zero (e.g., "10 / 0"). Make sure to test if the denominator is 0 before dividing and print "ERROR" without performing the division.';
  }

  if (id === 'm1-t4-for-loops' || titleLower.includes('for loops') || descLower.includes('multiples of 3')) {
    return 'Hidden test checks larger limits (e.g., N = 100) and numbers divisible by both 3 and 5 (avoid duplicate addition). Use: if (i % 3 == 0 || i % 5 == 0).';
  }

  if (id === 'm1-t5-while-loops' || titleLower.includes('reverse') || titleLower.includes('digits')) {
    return 'Hidden test checks numbers with trailing zeros (e.g., 908 or 100). Extract digits using while(n > 0) { rem = n % 10; ... n /= 10; } and handle 0 correctly.';
  }

  if (id === 'm1-t6-nested-loops' || titleLower.includes('pattern') || descLower.includes('inverted')) {
    return 'Hidden test tests height N = 4. Ensure your outer loop runs from i = N down to 1, and no extraneous spaces precede the newline character.';
  }

  if (titleLower.includes('prime') || descLower.includes('prime')) {
    return 'Hidden test checks large numbers (e.g. 101, 103) and edge values 1 and 2. Remember: 1 is NOT prime; 2 is the smallest prime.';
  }

  if (titleLower.includes('pointer') || descLower.includes('pointer') || descLower.includes('swap')) {
    return 'Hidden test checks pointer swapping with negative integers and identical values. Ensure you are dereferencing (*a, *b) and not modifying the addresses themselves.';
  }

  if (titleLower.includes('array') || descLower.includes('second largest') || descLower.includes('rotate')) {
    return 'Hidden test checks arrays with negative numbers or all duplicate elements. If no distinct second largest exists, output -1 as specified.';
  }

  if (titleLower.includes('string') || descLower.includes('palindrome') || descLower.includes('vowel')) {
    return 'Hidden test checks mixed-case inputs ("Programming") and strings with spaces. Ensure you strip trailing "\\n" when using fgets and compare characters case-insensitively.';
  }

  if (titleLower.includes('struct') || descLower.includes('structure')) {
    return 'Hidden test checks records with spaces or tied maximum values. Make sure scanf format strings consume whitespace correctly.';
  }

  return `Hint for "${topic.topicTitle}": ${topic.summary || 'Make sure your solution handles non-sample edge inputs (such as zero, negative values, and large numbers) with exact whitespace matching.'}`;
}

export const TopicPracticeHubPage: React.FC = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();


  const [searchParams, setSearchParams] = useSearchParams();
  const [selectedModuleFilter, setSelectedModuleFilter] = useState<number>(() => {
    const p = new URLSearchParams(window.location.search).get('module');
    if (p) {
      const n = parseInt(p, 10);
      if (!isNaN(n) && n >= 1 && n <= 4) return n;
    }
    const t = new URLSearchParams(window.location.search).get('topic');
    if (t) {
      const found = TOPIC_PRACTICE_DATA.find((x) => x.id === t);
      if (found) return found.moduleIndex;
    }
    return 1;
  });

  useEffect(() => {
    const mod = searchParams.get('module');
    if (mod) {
      const parsed = parseInt(mod, 10);
      if (!isNaN(parsed) && parsed >= 1 && parsed <= 4) {
        setSelectedModuleFilter(parsed);
      }
    }
  }, [searchParams]);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'UNSOLVED' | 'SOLVED'>('ALL');
  const [difficultyFilter, setDifficultyFilter] = useState<'ALL' | 'EASY' | 'MEDIUM' | 'HARD'>('ALL');
  const [activeTopic, setActiveTopic] = useState<TopicPracticeItem | null>(null);
  const [solvedTopics, setSolvedTopics] = useState<string[]>(() => {
    const list = getSolvedPracticeTopicIds(user?.id);
    if (user?.prn) {
      getSolvedPracticeTopicIds(user.prn).forEach((x) => !list.includes(x) && list.push(x));
      try {
        const raw = localStorage.getItem(`logicq_completed_problems_${user.prn.toUpperCase()}`) || localStorage.getItem(`logicq_solved_${user.prn.toUpperCase()}`);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed)) parsed.forEach((x) => !list.includes(x) && list.push(x));
        }
      } catch {}
    }
    if (Array.isArray((user as any)?.completedProblems)) {
      (user as any).completedProblems.forEach((x: string) => !list.includes(x) && list.push(x));
    }
    return list;
  });

  // Sync and restore solved practice topics from Firestore on user load
  useEffect(() => {
    if (!user?.id && !user?.prn) return;
    (async () => {
      try {
        const identifier = user?.prn || user?.id || '';
        const prnClean = (user?.prn || '').toUpperCase().trim();
        let cohortProblems: string[] = [];
        if (prnClean) {
          try {
            const cohortSnap = await getDoc(doc(db, 'cohort_progress', prnClean)).catch(() => null);
            if (cohortSnap && cohortSnap.exists()) {
              const cData = cohortSnap.data();
              if (Array.isArray(cData?.completedProblems)) {
                cohortProblems = cData.completedProblems;
              }
            }
          } catch {}
        }

        const stats = await FirestoreDataService.getStatsBackup(identifier);
        const prog = await FirestoreDataService.getPracticeProgress(identifier);
        const cloudSolved = Array.from(
          new Set([
            ...cohortProblems,
            ...(stats?.completedProblems || []),
            ...(prog?.completedProblems || []),
            ...getSolvedPracticeTopicIds(user?.id),
            ...(user?.prn ? getSolvedPracticeTopicIds(user.prn) : []),
          ])
        );
        if (cloudSolved.length > 0) {
          cloudSolved.forEach((id) => {
            markPracticeTopicSolved(id, user?.id);
            if (user?.prn) markPracticeTopicSolved(id, user.prn);
          });
          setSolvedTopics(cloudSolved);
        }
      } catch (err) {
        console.warn('Practice progress restore failed:', err);
      }
    })();
  }, [user?.id, user?.prn]);

  // Workspace state
  const [code, setCode] = useState<string>('');
  const [elapsedSeconds, setElapsedSeconds] = useState<number>(0);

  // Active Practice Question Timer
  useEffect(() => {
    if (!activeTopic) return;
    const interval = setInterval(() => {
      setElapsedSeconds((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [activeTopic]);
  const [customInput, setCustomInput] = useState<string>('');
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [runResult, setRunResult] = useState<any>(null);
  const [submitResult, setSubmitResult] = useState<any>(null);
  const [showHiddenHint, setShowHiddenHint] = useState<boolean>(false);
  const [showVisibleHint, setShowVisibleHint] = useState<boolean>(false);
  const [isDrawerOpen, setIsDrawerOpen] = useState<boolean>(true);
  const [activeBottomTab, setActiveBottomTab] = useState<'cases' | 'output'>('cases');
  const [activeTipTab, setActiveTipTab] = useState<'syntax' | 'example'>('syntax');
  const [isTipDrawerOpen, setIsTipDrawerOpen] = useState<boolean>(false);
  const [copiedTip, setCopiedTip] = useState<boolean>(false);
  const [showCelebrationModal, setShowCelebrationModal] = useState<boolean>(false);

  // JEE Palette state (default collapsed so student gets spacious 50-50 editor & problem layout)
  const [isDesktopPaletteOpen, setIsDesktopPaletteOpen] = useState<boolean>(false);
  const [isMobilePaletteOpen, setIsMobilePaletteOpen] = useState<boolean>(false);

  const handleCopyTip = (text: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedTip(true);
    toast.success('Syntax copied to clipboard!');
    setTimeout(() => setCopiedTip(false), 2000);
  };
  const [activeMobileTab, setActiveMobileTab] = useState<'statement' | 'editor' | 'results'>('statement');
  const [isIssueModalOpen, setIsIssueModalOpen] = useState<boolean>(false);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(Boolean(document.fullscreenElement));
  const [draftSyncStatus, setDraftSyncStatus] = useState<'saved' | 'saving' | 'offline'>('saved');
  const remoteDraftTimeoutRef = useRef<any>(null);
  const activeTopicRef = useRef<TopicPracticeItem | null>(null);
  activeTopicRef.current = activeTopic;
  const customInputRef = useRef<string>(customInput);
  useEffect(() => { customInputRef.current = customInput; }, [customInput]);
  const hasEnteredFullscreenRef = useRef<boolean>(false);
  const isExitingRef = useRef<boolean>(false);

  // Clear timeout on unmount
  useEffect(() => {
    return () => {
      if (remoteDraftTimeoutRef.current) {
        clearTimeout(remoteDraftTimeoutRef.current);
      }
    };
  }, []);

  // Sync solved topics
  useEffect(() => {
    setSolvedTopics(getSolvedPracticeTopicIds(user?.id));
    const unsub = RealtimeSyncService.on('SUBMISSIONS', () => {
      setSolvedTopics(getSolvedPracticeTopicIds(user?.id));
    });
    return () => unsub();
  }, [user?.id]);

  // Resilient draft auto-save on tab close / window unload / visibilitychange
  useEffect(() => {
    const flushDraft = () => {
      if (!activeTopicRef.current || !codeRef.current) return;
      const draftKey = `topic_${activeTopicRef.current.id}`;
      const draft: DraftData = {
        problemSlug: draftKey,
        code: codeRef.current,
        customInput: customInputRef.current,
        updatedAt: Date.now(),
        deviceLabel: getDeviceLabel(),
      };
      DraftSyncService.saveLocalDraft(draft, true);
      try {
        localStorage.setItem('logicq_last_topic_id', activeTopicRef.current.id);
        localStorage.setItem(`logicq_practice_draft_${draftKey}`, codeRef.current);
      } catch {}

      if (user?.id) {
        DraftSyncService.saveRemoteDraft(user.id, draft, true).catch(() => {});
      }
    };

    window.addEventListener('beforeunload', flushDraft);
    window.addEventListener('pagehide', flushDraft);
    return () => {
      window.removeEventListener('beforeunload', flushDraft);
      window.removeEventListener('pagehide', flushDraft);
    };
  }, [user?.id]);

  // Auto-restore topic from URL query param (?topic=...) on mount
  const hasAttemptedRestoreRef = useRef(false);
  useEffect(() => {
    if (hasAttemptedRestoreRef.current || activeTopic) return;
    const topicParam = searchParams.get('topic');
    if (topicParam) {
      const target = TOPIC_PRACTICE_DATA.find((t) => t.id === topicParam);
      if (target) {
        hasAttemptedRestoreRef.current = true;
        if (isTopicLocked(target)) {
          // If requested topic is locked, redirect to highest unlocked topic in module
          const moduleTopics = TOPIC_PRACTICE_DATA.filter((t) => t.moduleIndex === target.moduleIndex);
          const solved = solvedTopics || getSolvedPracticeTopicIds(user?.id);
          const firstUnlocked = moduleTopics.find((t) => !solved.includes(t.id)) || moduleTopics[0];
          handleOpenTopic(firstUnlocked);
        } else {
          handleOpenTopic(target);
        }
      }
    }
  }, [searchParams, activeTopic, solvedTopics]);

  // Fullscreen change tracking & telemetry recording
  useEffect(() => {
    const handleFullscreenChange = () => {
      const elem = document as any;
      const isNowFullscreen = Boolean(document.fullscreenElement || elem.webkitFullscreenElement);
      setIsFullscreen(isNowFullscreen);

      if (isNowFullscreen) {
        hasEnteredFullscreenRef.current = true;
      } else if (activeTopicRef.current && hasEnteredFullscreenRef.current && !isExitingRef.current) {
        fullscreenExitsRef.current += 1;
        const count = fullscreenExitsRef.current;
        const uid = (user as any)?.uid || (user as any)?.id || auth.currentUser?.uid || 'current';
        FirestoreDataService.recordProctoringIncident(uid, {
          type: 'FULLSCREEN_EXIT',
          problemSlug: activeTopicRef.current.id,
          problemTitle: activeTopicRef.current.problem.title,
          reason: `Fullscreen exited (Exit #${count})`,
        }).catch(() => {});
        toast.error(`⚠️ Fullscreen exited! (Exit #${count}) Fullscreen is required during practice.`);
      }
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
    };
  }, [user]);

  // Lock body scroll whenever workspace is open so background never bleeds/scrolls
  useEffect(() => {
    if (activeTopic) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [activeTopic]);

  // Proctoring telemetry refs
  const codeRef = useRef(code);
  useEffect(() => { codeRef.current = code; }, [code]);
  const elapsedSecondsRef = useRef(elapsedSeconds);
  useEffect(() => { elapsedSecondsRef.current = elapsedSeconds; }, [elapsedSeconds]);
  const charsTypedRef = useRef(0);
  const keystrokesRef = useRef(0);
  const fullscreenExitsRef = useRef(0);
  const handleCloseTopicRef = useRef<() => void>(() => {});
  const currentTopicAttemptRef = useRef<number>(1);
  const [currentTopicAttempt, setCurrentTopicAttempt] = useState<number>(1);

  const getTypingVelocityCPM = () => {
    const minutes = Math.max(10, elapsedSecondsRef.current) / 60;
    return Math.round(charsTypedRef.current / minutes);
  };

  const handlePasteBlocked = useCallback(() => {
    if (!activeTopicRef.current) return;
    const targetPrn = (user?.prn || '').toUpperCase().trim();
    const uid = targetPrn || (user as any)?.uid || (user as any)?.id || auth.currentUser?.uid || 'current';
    FirestoreDataService.recordProctoringIncident(uid, {
      type: 'COPY_PASTE',
      problemSlug: activeTopicRef.current.id,
      problemTitle: activeTopicRef.current.problem.title,
      moduleTitle: activeTopicRef.current.moduleTitle,
      category: 'PRACTICE',
      reason: 'Clipboard paste attempt blocked by proctoring guard',
      codeSnippet: codeRef.current,
    }).catch(() => {});
    toast.error('🚫 Pasting is strictly blocked! Manual typing is required.');
  }, [user]);

  // Anti-Cheat: Tab Switch & Clipboard Guard while topic workspace is active
  useEffect(() => {
    if (!activeTopic) return;

    let lastTabLog = 0;
    const handleVisibility = () => {
      if (document.hidden && activeTopicRef.current) {
        const now = Date.now();
        if (now - lastTabLog < 1500) return;
        lastTabLog = now;
        const targetPrn = (user?.prn || '').toUpperCase().trim();
        const uid = targetPrn || (user as any)?.uid || (user as any)?.id || auth.currentUser?.uid || 'current';
        FirestoreDataService.recordProctoringIncident(uid, {
          type: 'TAB_SWITCH',
          problemSlug: activeTopicRef.current.id,
          problemTitle: activeTopicRef.current.problem.title,
          moduleTitle: activeTopicRef.current.moduleTitle,
          category: 'PRACTICE',
          reason: 'Tab switch or window unfocus detected during practice session',
        }).catch(() => {});
        toast.warning('⚠️ Tab Switch Detected! Focus loss is logged for faculty audit.');
      }
    };

    const handleWindowBlur = () => {
      const now = Date.now();
      if (now - lastTabLog < 1500) return;
      lastTabLog = now;
      if (activeTopicRef.current) {
        const targetPrn = (user?.prn || '').toUpperCase().trim();
        const uid = targetPrn || (user as any)?.uid || (user as any)?.id || auth.currentUser?.uid || 'current';
        FirestoreDataService.recordProctoringIncident(uid, {
          type: 'TAB_SWITCH',
          problemSlug: activeTopicRef.current.id,
          problemTitle: activeTopicRef.current.problem.title,
          moduleTitle: activeTopicRef.current.moduleTitle,
          category: 'PRACTICE',
          reason: 'Window focus lost during practice session',
        }).catch(() => {});
        toast.warning('⚠️ Window Focus Lost! Proctored telemetry records all focus shifts.');
      }
    };

    const handlePaste = (e: ClipboardEvent) => {
      e.preventDefault();
      handlePasteBlocked();
    };

    document.addEventListener('visibilitychange', handleVisibility);
    window.addEventListener('blur', handleWindowBlur);
    document.addEventListener('paste', handlePaste, true);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener('blur', handleWindowBlur);
      document.removeEventListener('paste', handlePaste, true);
    };
  }, [activeTopic, user, handlePasteBlocked]);

  // Progressive Unlock Chain:
  // Module 1 Practice (25/25) -> Unlocks Lab Internal 1
  // Lab Internal 1 Complete -> Unlocks Module 2 Practice
  // Module 2 Practice (25/25) -> Unlocks Lab Internal 2
  // Lab Internal 2 Complete -> Unlocks Module 3 Practice
  // Module 3 Practice (25/25) -> Unlocks Lab Internal 3
  // Lab Internal 3 Complete -> Unlocks Module 4 Practice
  // Module 4 Practice (25/25) -> Unlocks Lab Internal 4

  const m1PracticeSolved = TOPIC_PRACTICE_DATA.filter((t) => t.moduleIndex === 1 && solvedTopics.includes(t.id)).length;
  const isM1PracticeComplete = m1PracticeSolved >= 25;

  const m2PracticeSolved = TOPIC_PRACTICE_DATA.filter((t) => t.moduleIndex === 2 && solvedTopics.includes(t.id)).length;
  const isM2PracticeComplete = m2PracticeSolved >= 25;

  const m3PracticeSolved = TOPIC_PRACTICE_DATA.filter((t) => t.moduleIndex === 3 && solvedTopics.includes(t.id)).length;
  const isM3PracticeComplete = m3PracticeSolved >= 25;

  const m4PracticeSolved = TOPIC_PRACTICE_DATA.filter((t) => t.moduleIndex === 4 && solvedTopics.includes(t.id)).length;
  const isM4PracticeComplete = m4PracticeSolved >= 25;

  // Lab Internal Problem Checks
  const m1LabSlugs = PRACTICE_MODULE_1_PROBLEMS.map((p) => p.slug);
  const m1LabSolved = m1LabSlugs.filter((s) => solvedTopics.includes(s)).length;
  const isLab1Complete = Boolean(
    m1LabSolved >= 20 ||
    m1LabSolved >= m1LabSlugs.length ||
    (typeof localStorage !== 'undefined' && localStorage.getItem('logicq_practice_report_control-structures'))
  );

  const m2LabSlugs = PRACTICE_MODULE_2_PROBLEMS.map((p) => p.slug);
  const m2LabSolved = m2LabSlugs.filter((s) => solvedTopics.includes(s)).length;
  const isLab2Complete = Boolean(
    m2LabSolved >= 20 ||
    m2LabSolved >= m2LabSlugs.length ||
    (typeof localStorage !== 'undefined' && localStorage.getItem('logicq_practice_report_pointers-and-functions'))
  );

  const m3LabSlugs = PRACTICE_MODULE_3_PROBLEMS.map((p) => p.slug);
  const m3LabSolved = m3LabSlugs.filter((s) => solvedTopics.includes(s)).length;
  const isLab3Complete = Boolean(
    m3LabSolved >= 20 ||
    m3LabSolved >= m3LabSlugs.length ||
    (typeof localStorage !== 'undefined' && localStorage.getItem('logicq_practice_report_arrays-and-strings'))
  );

  const m4LabSlugs = PRACTICE_MODULE_4_PROBLEMS.map((p) => p.slug);
  const m4LabSolved = m4LabSlugs.filter((s) => solvedTopics.includes(s)).length;
  const isLab4Complete = Boolean(
    m4LabSolved >= 20 ||
    m4LabSolved >= m4LabSlugs.length ||
    (typeof localStorage !== 'undefined' && localStorage.getItem('logicq_practice_report_recursion-and-bit-manipulation'))
  );

  const getModuleUnlockInfo = (moduleIndex: number): { isUnlocked: boolean; lockReason: string } => {
    return getPracticeModuleUnlockInfo(
      moduleIndex,
      solvedTopics,
      Boolean(user?.role === 'ADMIN' || user?.role === 'FACULTY')
    );
  };

  // Sequential progression: Each question is locked until previous question is solved
  const isTopicLocked = (topic: TopicPracticeItem): boolean => {
    // Only Admin or Faculty can preview without restriction
    if (user?.role === 'ADMIN' || user?.role === 'FACULTY') return false;

    // If module itself is locked, all topics inside are locked
    const moduleInfo = getModuleUnlockInfo(topic.moduleIndex);
    if (!moduleInfo.isUnlocked) return true;

    // Already solved topics are always unlocked for review
    const solved = solvedTopics || getSolvedPracticeTopicIds(user?.id);
    if (solved.includes(topic.id)) return false;

    // Find all topics belonging to the same module
    const moduleTopics = TOPIC_PRACTICE_DATA.filter((t) => t.moduleIndex === topic.moduleIndex);
    const topicIdx = moduleTopics.findIndex((t) => t.id === topic.id);

    // Question 1 in any unlocked module is always unlocked
    if (topicIdx <= 0) return false;

    // Any subsequent question requires the immediately preceding question to be solved
    const prevTopicInMod = moduleTopics[topicIdx - 1];
    return !solved.includes(prevTopicInMod.id);
  };

  // Next unsolved question in current module for Apple-style 1-click launch
  const nextUnsolvedInModule = useMemo(() => {
    const modTopics = TOPIC_PRACTICE_DATA.filter((t) => t.moduleIndex === selectedModuleFilter);
    return modTopics.find((t) => !solvedTopics.includes(t.id)) || modTopics[0];
  }, [selectedModuleFilter, solvedTopics]);

  // Module-aware topic navigation (Each module has 25 topics)
  const currentModuleTopics = TOPIC_PRACTICE_DATA.filter(
    (t) => t.moduleIndex === (activeTopic ? activeTopic.moduleIndex : selectedModuleFilter)
  );
  const currentTopicIndex = activeTopic
    ? currentModuleTopics.findIndex((t) => t.id === activeTopic.id)
    : -1;
  const prevTopic = currentTopicIndex > 0 ? currentModuleTopics[currentTopicIndex - 1] : null;
  const nextTopic =
    currentTopicIndex >= 0 && currentTopicIndex < currentModuleTopics.length - 1
      ? currentModuleTopics[currentTopicIndex + 1]
      : null;
  const moduleSolvedCount = currentModuleTopics.filter((t) => solvedTopics.includes(t.id)).length;

  // Detected in-progress draft for prominent resume banner
  const lastActiveTopicItem = useMemo(() => {
    try {
      const lastId = localStorage.getItem('logicq_last_topic_id');
      if (!lastId) return null;
      const topic = TOPIC_PRACTICE_DATA.find((t) => t.id === lastId);
      if (!topic) return null;
      const draftKey = `topic_${topic.id}`;
      const draft = DraftSyncService.getLocalDraft(draftKey, true);
      const directCode = typeof localStorage !== 'undefined' ? localStorage.getItem(`logicq_practice_draft_${draftKey}`) : null;
      const effectiveCode = (draft?.code && draft.code.trim()) ? draft.code : directCode;
      const isSolved = solvedTopics.includes(topic.id);
      if (
        effectiveCode &&
        effectiveCode.trim() &&
        effectiveCode.trim() !== topic.problem.starterCode.trim() &&
        !isSolved &&
        !isTopicLocked(topic)
      ) {
        return { topic, code: effectiveCode };
      }
      return null;
    } catch {
      return null;
    }
  }, [solvedTopics, activeTopic]);

  const handleOpenTopic = async (topic: TopicPracticeItem) => {
    const unlockInfo = getModuleUnlockInfo(topic.moduleIndex);
    if (!unlockInfo.isUnlocked) {
      toast.error(unlockInfo.lockReason || '🔒 This module is locked!');
      return;
    }

    if (isTopicLocked(topic)) {
      const moduleTopics = TOPIC_PRACTICE_DATA.filter((t) => t.moduleIndex === topic.moduleIndex);
      const topicIdx = moduleTopics.findIndex((t) => t.id === topic.id);
      const prevTopicInMod = topicIdx > 0 ? moduleTopics[topicIdx - 1] : null;
      toast.error(`🔒 Question ${topicIdx + 1} is locked! Solve Q${topicIdx} (${prevTopicInMod?.topicTitle || 'previous question'}) first to unlock.`);
      return;
    }

    // 1. Automatically launch full screen on Practice click if user gesture permits
    const elem = document.documentElement as any;
    if (!document.fullscreenElement && !elem.webkitFullscreenElement) {
      try {
        if (elem.requestFullscreen) {
          await elem.requestFullscreen();
          hasEnteredFullscreenRef.current = true;
          setIsFullscreen(true);
        } else if (elem.webkitRequestFullscreen) {
          await elem.webkitRequestFullscreen();
          hasEnteredFullscreenRef.current = true;
          setIsFullscreen(true);
        }
      } catch (fsErr) {
        // Fullscreen launch deferred on automatic restore (browsers require direct user gesture)
      }
    } else {
      hasEnteredFullscreenRef.current = true;
    }

    setActiveTopic(topic);
    setElapsedSeconds(0);
    try {
      localStorage.setItem('logicq_last_topic_id', topic.id);
    } catch {}

    // Synchronize URL search params (?topic=xxx) so reloading or bookmarking preserves state
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.set('topic', topic.id);
      return next;
    }, { replace: true });

    // 1. Check local draft first (prevents reset when switching or returning)
    const draftKey = `topic_${topic.id}`;
    const localDraft = DraftSyncService.getLocalDraft(draftKey, true);
    const directStorageCode = typeof localStorage !== 'undefined'
      ? localStorage.getItem(`logicq_practice_draft_${draftKey}`)
      : null;
    const effectiveDraftCode = (localDraft?.code && localDraft.code.trim())
      ? localDraft.code
      : (directStorageCode && directStorageCode.trim())
        ? directStorageCode
        : null;

    const initialCode = (effectiveDraftCode && effectiveDraftCode.trim())
      ? effectiveDraftCode
      : topic.problem.starterCode;

    // Reset per-question proctoring counters
    charsTypedRef.current = 0;
    keystrokesRef.current = 0;
    fullscreenExitsRef.current = 0;

    // Track topic open: increments attemptsCount every time question is opened
    const studentIdent = user?.prn || user?.id || 'guest';
    const initialAttempt = FirestoreDataService.getLocalTopicAttempt(studentIdent, topic.id);
    currentTopicAttemptRef.current = initialAttempt || 1;
    setCurrentTopicAttempt(initialAttempt || 1);

    FirestoreDataService.recordTopicAttemptOpen(studentIdent, topic.id)
      .then((num) => {
        currentTopicAttemptRef.current = num;
        setCurrentTopicAttempt(num);
      })
      .catch(() => {});
    api.post('/practice/topics/track-open', {
      topicId: topic.id,
      moduleIndex: topic.moduleIndex,
      moduleSlug: topic.moduleSlug,
      topicTitle: topic.topicTitle,
      difficulty: topic.problem.difficulty,
      code: initialCode,
    }).catch(() => {});
    codeRef.current = initialCode;
    setCode(initialCode);
    setCustomInput(localDraft?.customInput || '');
    setRunResult(null);
    setSubmitResult(null);
    setShowHiddenHint(false);
    setShowVisibleHint(false);
    setShowCelebrationModal(false);
    setIsTipDrawerOpen(false);
    setIsDrawerOpen(true);
    setActiveBottomTab('cases');
    setActiveMobileTab('statement');

    // 2. Authoritative cloud draft sync (restores saved solution across devices/cleared browser)
    if (user?.id) {
      DraftSyncService.fetchRemoteDraft(user.id, draftKey, true)
        .then((remoteDraft: DraftData | null) => {
          if (
            remoteDraft?.code &&
            remoteDraft.code.trim() &&
            remoteDraft.code.trim() !== topic.problem.starterCode.trim()
          ) {
            const isLocalStarter = !effectiveDraftCode || effectiveDraftCode.trim() === topic.problem.starterCode.trim();
            const isRemoteStrictlyNewer = remoteDraft.updatedAt > ((localDraft?.updatedAt || 0) + 2000);
            if (isLocalStarter || isRemoteStrictlyNewer) {
              setCode(remoteDraft.code);
              if (remoteDraft.customInput) setCustomInput(remoteDraft.customInput);
              DraftSyncService.saveLocalDraft(remoteDraft, true);
              try {
                localStorage.setItem(`logicq_practice_draft_${draftKey}`, remoteDraft.code);
              } catch {}
            }
          }
        })
        .catch(() => {});
    }
  };

  const handleCodeChange = (newCode: string) => {
    const delta = Math.abs(newCode.length - (codeRef.current?.length || 0));
    charsTypedRef.current += delta;
    keystrokesRef.current += 1;
    codeRef.current = newCode;
    setCode(newCode);
    if (!activeTopic) return;
    setDraftSyncStatus('saving');
    const draftKey = `topic_${activeTopic.id}`;
    const draft: DraftData = {
      problemSlug: draftKey,
      code: newCode,
      customInput: customInputRef.current,
      updatedAt: Date.now(),
      deviceLabel: getDeviceLabel(),
    };
    // 0ms instant local storage persistence
    DraftSyncService.saveLocalDraft(draft, true);
    try {
      localStorage.setItem(`logicq_practice_draft_${draftKey}`, newCode);
      localStorage.setItem('logicq_last_topic_id', activeTopic.id);
    } catch {}

    if (user?.id) {
      if (remoteDraftTimeoutRef.current) {
        clearTimeout(remoteDraftTimeoutRef.current);
      }
      remoteDraftTimeoutRef.current = setTimeout(async () => {
        try {
          await DraftSyncService.saveRemoteDraft(user.id, draft, true);
          setDraftSyncStatus('saved');
        } catch {
          setDraftSyncStatus('offline');
        }
      }, 1500);
    } else {
      setTimeout(() => setDraftSyncStatus('saved'), 300);
    }
  };

  const handleResetCode = () => {
    if (!activeTopic) return;
    const starter = activeTopic.problem.starterCode;
    if (code.trim() !== starter.trim()) {
      const confirmed = window.confirm('Reset code to starter template? Your current edits will be replaced.');
      if (!confirmed) return;
    }
    setCode(starter);
    setRunResult(null);
    setSubmitResult(null);
    setShowHiddenHint(false);
    setShowVisibleHint(false);
    const draftKey = `topic_${activeTopic.id}`;
    const draft: DraftData = {
      problemSlug: draftKey,
      code: starter,
      customInput: customInputRef.current,
      updatedAt: Date.now(),
      deviceLabel: getDeviceLabel(),
    };
    DraftSyncService.saveLocalDraft(draft, true);
    try {
      localStorage.setItem(`logicq_practice_draft_${draftKey}`, starter);
    } catch {}
    if (user?.id) {
      DraftSyncService.saveRemoteDraft(user.id, draft, true).catch(() => {});
    }
    toast.info('Code reset to default starter template');
  };

  const handleCloseTopic = async () => {
    isExitingRef.current = true;
    setShowCelebrationModal(false);
    setIsTipDrawerOpen(false);
    setIsMobilePaletteOpen(false);

    // Save current in-progress code before exiting
    if (activeTopicRef.current && codeRef.current) {
      const draftKey = `topic_${activeTopicRef.current.id}`;
      const draft: DraftData = {
        problemSlug: draftKey,
        code: codeRef.current,
        customInput: customInputRef.current,
        updatedAt: Date.now(),
        deviceLabel: getDeviceLabel(),
      };
      DraftSyncService.saveLocalDraft(draft, true);
      try {
        localStorage.setItem(`logicq_practice_draft_${draftKey}`, codeRef.current);
        localStorage.setItem('logicq_last_topic_id', activeTopicRef.current.id);
      } catch {}
      if (user?.id) {
        DraftSyncService.saveRemoteDraft(user.id, draft, true).catch(() => {});
      }
    }

    setActiveTopic(null);
    hasEnteredFullscreenRef.current = false;
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.delete('topic');
      return next;
    }, { replace: true });

    const elem = document as any;
    if (document.fullscreenElement || elem.webkitFullscreenElement) {
      try {
        if (document.exitFullscreen) {
          await document.exitFullscreen();
        } else if (elem.webkitExitFullscreen) {
          await elem.webkitExitFullscreen();
        }
      } catch {}
    }

    setTimeout(() => {
      isExitingRef.current = false;
    }, 400);
  };
  handleCloseTopicRef.current = handleCloseTopic;

  // Run test case & verify solution (Compile & Run) directly with Use Cases
  const handleRunOpenTest = async () => {
    if (!activeTopic) return;
    setIsRunning(true);
    setRunResult(null);
    setSubmitResult(null);
    setIsDrawerOpen(true);
    setActiveBottomTab('output');
    setActiveMobileTab('results');

    try {
      const currentCode = codeRef.current || code;

      // Standard automated mode: evaluate BOTH open and hidden use cases automatically without manual typing
      const isUuid = (id?: string) => Boolean(id && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(id)));
      const [resOpen, resHidden] = await Promise.all([
        api.post('/submissions/run', {
          code: currentCode,
          ...(isUuid(activeTopic.id) ? { problemId: activeTopic.id } : {}),
          stdin: (activeTopic.problem.openTestCase.input || '').trim() + '\n',
          timeLimitMs: 2000,
        }).catch((err) =>
          handleFallbackRequest('/submissions/run', {
            method: 'POST',
            body: JSON.stringify({
              code: currentCode,
              problemId: activeTopic.id,
              stdin: (activeTopic.problem.openTestCase.input || '').trim() + '\n',
            }),
          }).catch(() => ({
            error: err?.message || 'Execution failed',
            compileOutput: err?.message || 'Execution failed',
            stdout: '',
            verdict: 'COMPILATION_ERROR',
          }))
        ),
        api.post('/submissions/run', {
          code: currentCode,
          ...(isUuid(activeTopic.id) ? { problemId: activeTopic.id } : {}),
          stdin: (activeTopic.problem.hiddenTestCase.input || '').trim() + '\n',
          timeLimitMs: 2000,
        }).catch((err) =>
          handleFallbackRequest('/submissions/run', {
            method: 'POST',
            body: JSON.stringify({
              code: currentCode,
              problemId: activeTopic.id,
              stdin: (activeTopic.problem.hiddenTestCase.input || '').trim() + '\n',
            }),
          }).catch(() => ({
            error: err?.message || 'Execution failed',
            compileOutput: err?.message || 'Execution failed',
            stdout: '',
            verdict: 'COMPILATION_ERROR',
          }))
        ),
      ]);

      const resolvePayload = (res: any) => {
        if (!res) return {};
        if (res.data?.data) return res.data.data;
        if (res.data) return res.data;
        return res;
      };

      const openData = resolvePayload(resOpen);
      const hiddenData = resolvePayload(resHidden);

      const norm = (s: any) => (typeof s === 'string' ? s : '').replace(/\r\n/g, '\n').trim();
      const actualOpenOut = norm(openData?.stdout || openData?.output || '');
      const expectedOpenOut = norm(activeTopic.problem.openTestCase.expectedOutput || '');
      const actualHiddenOut = norm(hiddenData?.stdout || hiddenData?.output || '');
      const expectedHiddenOut = norm(activeTopic.problem.hiddenTestCase.expectedOutput || '');

      const hasActualCompileError = Boolean(
        openData?.verdict === 'COMPILE_ERROR' ||
        hiddenData?.verdict === 'COMPILE_ERROR' ||
        (openData?.compileOutput && /error:/i.test(openData.compileOutput)) ||
        (hiddenData?.compileOutput && /error:/i.test(hiddenData.compileOutput))
      );

      const openPassed = actualOpenOut === expectedOpenOut && !hasActualCompileError;
      const hiddenPassed = actualHiddenOut === expectedHiddenOut && !hasActualCompileError;

      const compileErr = hasActualCompileError
        ? (openData?.compileOutput || hiddenData?.compileOutput || openData?.stderr || '')
        : '';
      const allPassed = !hasActualCompileError && openPassed && hiddenPassed;

      setRunResult({
        success: openPassed,
        actualOutput: actualOpenOut,
        expectedOutput: expectedOpenOut,
        compileError: compileErr,
        stderr: openData?.stderr || '',
        exitCode: compileErr ? 1 : openPassed ? 0 : 0,
        executionTimeMs: openData?.runtimeMs || 14,
      });

      setSubmitResult({
        openPassed,
        hiddenPassed,
        allPassed,
        compileError: compileErr,
        actualOpenOut,
        actualHiddenOut,
      });

      if (allPassed) {
        const updated = markPracticeTopicSolved(activeTopic.id, user?.id);
        setSolvedTopics(updated);

        try {
          const timesMap = JSON.parse(localStorage.getItem('logicq_topic_solved_times') || '{}');
          if (!timesMap[activeTopic.id]) {
            timesMap[activeTopic.id] = new Date().toISOString();
            localStorage.setItem('logicq_topic_solved_times', JSON.stringify(timesMap));
          }
          const durMap = JSON.parse(localStorage.getItem('logicq_topic_solved_durations') || '{}');
          durMap[activeTopic.id] = elapsedSeconds;
          localStorage.setItem('logicq_topic_solved_durations', JSON.stringify(durMap));
        } catch {}

        // Save verified code as authoritative draft so returning student never sees reset code
        const draftKey = `topic_${activeTopic.id}`;
        const draft: DraftData = {
          problemSlug: draftKey,
          code: currentCode,
          updatedAt: Date.now(),
          deviceLabel: getDeviceLabel(),
        };
        DraftSyncService.saveLocalDraft(draft, true);
        if (user?.id) {
          DraftSyncService.saveRemoteDraft(user.id, draft, true).catch(() => {});
        }

        // 1. Persist to Firestore immediately
        if (user?.id) {
          FirestoreDataService.saveStatsBackup(user.id, {
            totalSolved: updated.length,
            completedProblems: updated,
            lastSolvedDate: new Date().toISOString(),
          }).catch(() => {});

          FirestoreDataService.savePracticeProgress(user.id, updated).catch(() => {});
          if (user?.prn) {
            FirestoreDataService.savePracticeProgress(user.prn, updated).catch(() => {});
          }

          // Fetch current proctoring telemetry
          const currentTelem = await FirestoreDataService.getProctoringTelemetry(user?.prn || user?.id).catch(() => null);
          const currentTabSwitches = currentTelem?.tabSwitchCount || 0;
          const currentCopyPastes = currentTelem?.copyPasteAttempts || 0;
          const currentExits = currentTelem?.fullscreenExits || 0;

          const currentAttemptNum = currentTopicAttemptRef.current || FirestoreDataService.getLocalTopicAttempt(user?.prn || user?.id || 'guest', activeTopic.id);

          // Mirror solved submission to primary Firestore submissions collection so Admin overview & feeds update immediately
          FirestoreDataService.recordDailySubmission(user.id, {
            problemId: activeTopic.id,
            problemTitle: activeTopic.topicTitle,
            problemSlug: activeTopic.id,
            difficulty: activeTopic.problem.difficulty || 'EASY',
            code: currentCode,
            verdict: 'ACCEPTED',
            attemptNumber: currentAttemptNum,
            timeTakenSeconds: elapsedSeconds,
            tabSwitchCount: currentTabSwitches,
            copyPasteAttempts: currentCopyPastes,
            fullscreenExits: currentExits,
            submissionType: 'PRACTICE',
            prn: user?.prn || '',
            studentPrn: user?.prn || '',
            email: user?.email || '',
            studentEmail: user?.email || '',
            studentName: user?.fullName || user?.displayName || '',
          }).catch(() => {});
        }

        // 2. Sync to backend practice API with full details, code, solve time, and typing velocity
        const velocity = getTypingVelocityCPM();
        api.post('/practice/topics/solve', {
          topicId: activeTopic.id,
          moduleSlug: activeTopic.moduleSlug,
          moduleIndex: activeTopic.moduleIndex,
          topicTitle: activeTopic.topicTitle,
          difficulty: activeTopic.problem.difficulty,
          code: currentCode,
          timeTakenSeconds: elapsedSeconds,
          typingVelocityCPM: velocity,
        }).catch(() => {});

        // 3. Invalidate query cache so /lab-internal, Dashboard, and Admin reflect solved count instantly
        queryClient.invalidateQueries({ queryKey: ['practice-modules'] });
        queryClient.invalidateQueries({ queryKey: ['student-practice-modules'] });
        queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
        queryClient.invalidateQueries({ queryKey: ['student-my-submissions'] });
        queryClient.invalidateQueries({ queryKey: ['faculty-dashboard-recent-submissions'] });
        queryClient.invalidateQueries({ queryKey: ['dashboard-admin-lab-submissions'] });
        RealtimeSyncService.emit('SUBMISSIONS');
        RealtimeSyncService.emit('DASHBOARD');

        confetti({ particleCount: 80, spread: 60, origin: { y: 0.7 } });

        if (nextTopic) {
          toast.success('🎉 All use cases passed! Advancing to next question...');
          setTimeout(() => {
            handleOpenTopic(nextTopic);
          }, 1200);
        } else {
          setShowCelebrationModal(true);
          toast.success(`🎉 Module Complete! Mastered "${activeTopic.topicTitle}"!`);
        }
      } else {
        // Log attempt telemetry to backend so Admin sees every attempt & code written
        api.post('/practice/topics/telemetry', {
          topicId: activeTopic.id,
          currentCode,
          elapsedSec: elapsedSecondsRef.current,
          typingVelocityCPM: getTypingVelocityCPM(),
          eventLog: {
            event: compileErr ? 'COMPILE_ERROR' : !openPassed ? 'SAMPLE_FAILED' : 'HIDDEN_FAILED',
            detail: compileErr ? 'Compilation error during test run' : !openPassed ? 'Sample use case output mismatch' : 'Hidden use case failed',
            elapsedSec: elapsedSecondsRef.current,
          },
        }).catch(() => {});

        // Increment attempt count on every failed run attempt
        FirestoreDataService.recordTopicAttemptOpen(user?.prn || user?.id || 'guest', activeTopic.id)
          .then((num) => {
            currentTopicAttemptRef.current = num;
            setCurrentTopicAttempt(num);
          })
          .catch(() => {});

        if (compileErr) {
          toast.error('Compilation error! Review GCC hints in the terminal.');
        } else if (!openPassed) {
          toast.error('Sample use case failed. Output mismatch.');
        } else if (!hiddenPassed) {
          toast.error('Sample passed, but hidden use case failed. Check edge cases!');
        }
      }
    } catch (err: any) {
      setRunResult({
        success: false,
        actualOutput: '',
        expectedOutput: activeTopic.problem.openTestCase.expectedOutput,
        compileError: err?.message || 'Execution error in GCC sandbox',
        stderr: err?.message || '',
        exitCode: 1,
      });
      setSubmitResult({
        allPassed: false,
        openPassed: false,
        hiddenPassed: false,
        compileError: err?.message || 'Submission execution failed.',
      });
      toast.error('Execution error in sandbox.');
    } finally {
      setIsRunning(false);
    }
  };

  // Filter topics for the hub view
  const filteredTopics = TOPIC_PRACTICE_DATA.filter((topic) => {
    if (selectedModuleFilter !== 0 && topic.moduleIndex !== selectedModuleFilter) {
      return false;
    }
    const isSolved = solvedTopics.includes(topic.id);
    if (statusFilter === 'SOLVED' && !isSolved) return false;
    if (statusFilter === 'UNSOLVED' && isSolved) return false;
    if (difficultyFilter !== 'ALL' && topic.problem.difficulty !== difficultyFilter) {
      return false;
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      const matchTitle = topic.topicTitle.toLowerCase().includes(q);
      const matchProblem = topic.problem.title.toLowerCase().includes(q);
      const matchSummary = topic.summary.toLowerCase().includes(q);
      const matchModule = topic.moduleTitle.toLowerCase().includes(q);
      if (!matchTitle && !matchProblem && !matchSummary && !matchModule) return false;
    }
    return true;
  });

  const totalTopics = TOPIC_PRACTICE_DATA.length;
  const solvedCount = solvedTopics.length;
  const progressPct = Math.round((solvedCount / totalTopics) * 100);

  // Render the JEE Question Palette Content (Used for both Desktop & Mobile)
  const renderPaletteContent = (isMobile?: boolean) => {
    const activeModuleNum = activeTopic ? activeTopic.moduleIndex : selectedModuleFilter;
    const topicsForModule = TOPIC_PRACTICE_DATA.filter((t) => t.moduleIndex === activeModuleNum);
    const solvedInMod = topicsForModule.filter((t) => solvedTopics.includes(t.id)).length;
    const modPct = topicsForModule.length > 0 ? Math.round((solvedInMod / topicsForModule.length) * 100) : 0;
    const studentName = user?.fullName || user?.displayName || user?.username || 'Student';
    const studentInitial = studentName.charAt(0).toUpperCase();

    return (
      <div className="flex flex-col h-full bg-[var(--bg-panel)] font-mono text-xs select-none">
        {/* Student Profile Card */}
        <div className="p-3.5 border-b border-[var(--border-line)] bg-[var(--bg-surface)]/80 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 flex items-center justify-center font-bold text-sm shadow-xs">
              {studentInitial}
            </div>
            <div className="min-w-0">
              <div className="font-bold text-[var(--text-main)] truncate max-w-[150px] font-sans text-xs">
                {studentName}
              </div>
              <div className="text-[10px] text-[var(--text-muted)] font-mono truncate">
                {user?.prn || user?.username || 'LOGICQ-STUDENT'}
              </div>
            </div>
          </div>
          <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 shrink-0">
            {solvedInMod}/25 Solved
          </span>
        </div>

        {/* Legend */}
        <div className="p-3 border-b border-[var(--border-line)]/70 bg-[var(--bg-main)]/50 space-y-2 shrink-0">
          <div className="flex items-center justify-between text-[11px] font-bold text-[var(--text-muted)] uppercase tracking-wider">
            <span>Palette Legend</span>
            <span className="text-emerald-400">{solvedInMod}/25</span>
          </div>
          <div className="grid grid-cols-4 gap-1 text-[10px]">
            <div className="flex items-center gap-1 p-1 rounded bg-[var(--bg-panel)] border border-[var(--border-line)]">
              <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
              <span className="text-[var(--text-muted)] truncate">Solved ({solvedInMod})</span>
            </div>
            <div className="flex items-center gap-1 p-1 rounded bg-[var(--bg-panel)] border border-cyan-500/40">
              <span className="w-2 h-2 rounded-full bg-cyan-400 shrink-0 animate-pulse" />
              <span className="text-cyan-400 font-semibold truncate">Current</span>
            </div>
            <div className="flex items-center gap-1 p-1 rounded bg-[var(--bg-panel)] border border-[var(--border-line)]">
              <span className="w-2 h-2 rounded-full bg-[var(--text-muted)] opacity-50 shrink-0" />
              <span className="text-[var(--text-muted)] truncate">Open</span>
            </div>
            <div className="flex items-center gap-1 p-1 rounded bg-[var(--bg-panel)] border border-slate-800 text-slate-500">
              <Lock className="w-2.5 h-2.5 text-slate-500 shrink-0" />
              <span className="truncate">Locked</span>
            </div>
          </div>
        </div>

        {/* Question Numbers Grid (5 columns, 25 items) */}
        <div className="flex-1 overflow-y-auto p-3.5 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-[var(--text-main)] uppercase tracking-wider">
              Questions (Module {activeModuleNum})
            </span>
            <span className="text-[10px] text-[var(--text-muted)]">Click number to switch</span>
          </div>

          <div className="grid grid-cols-5 gap-2">
            {topicsForModule.map((t, idx) => {
              const qNum = idx + 1;
              const isCurrent = activeTopic?.id === t.id;
              const isSolved = solvedTopics.includes(t.id);
              const isLocked = isTopicLocked(t);

              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => {
                    if (isLocked) {
                      toast.error(`🔒 Question ${qNum} is locked! Solve Q${qNum - 1} first to unlock.`);
                      return;
                    }
                    handleOpenTopic(t);
                    setIsDesktopPaletteOpen(false);
                    if (isMobile) setIsMobilePaletteOpen(false);
                  }}
                  className={`h-10 rounded-xl font-mono text-xs font-bold transition-all flex items-center justify-center relative ${
                    isCurrent
                      ? 'border-2 border-cyan-400 bg-cyan-500/25 text-cyan-300 shadow-md shadow-cyan-500/25 scale-105 z-10 cursor-pointer'
                      : isSolved
                      ? 'bg-emerald-600 hover:bg-emerald-500 text-white border border-emerald-500 shadow-xs cursor-pointer'
                      : isLocked
                      ? 'bg-slate-900/60 text-slate-500 border border-slate-800/80 opacity-60 cursor-not-allowed hover:border-slate-700'
                      : 'bg-[var(--bg-surface)] hover:bg-[var(--bg-surface-hover)] text-[var(--text-muted)] hover:text-[var(--text-main)] border border-[var(--border-line)] cursor-pointer'
                  }`}
                  title={
                    isLocked
                      ? `Q${qNum}: ${t.topicTitle} (Locked • Solve Q${qNum - 1} to unlock)`
                      : `Q${qNum}: ${t.topicTitle} (${isSolved ? 'Solved' : 'Open'})`
                  }
                >
                  {isLocked ? (
                    <Lock className="w-3.5 h-3.5 text-slate-500" />
                  ) : (
                    <span>{qNum}</span>
                  )}
                  {isSolved && !isCurrent && (
                    <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-emerald-400 border border-[var(--bg-panel)]" />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Palette Footer Progress & Lab Unlock Banner */}
        <div className="p-3.5 border-t border-[var(--border-line)] bg-[var(--bg-surface)]/60 shrink-0 space-y-2.5">
          <div className="space-y-1">
            <div className="flex items-center justify-between text-[11px] font-bold">
              <span className="text-[var(--text-muted)]">Module {activeModuleNum} Progress</span>
              <span className="text-emerald-400">{modPct}%</span>
            </div>
            <div className="w-full bg-[var(--bg-main)] h-2 rounded-full overflow-hidden border border-[var(--border-line)]">
              <div
                className="bg-gradient-to-r from-emerald-500 to-cyan-400 h-full rounded-full transition-all duration-300"
                style={{ width: `${modPct}%` }}
              />
            </div>
          </div>

          {solvedInMod === topicsForModule.length && topicsForModule.length > 0 ? (
            <div className="p-2.5 rounded-xl bg-emerald-500/15 border border-emerald-500/40 text-center space-y-1.5 animate-in zoom-in-95">
              <div className="text-xs font-bold text-emerald-400 font-sans">
                🎉 All 25 Questions Solved!
              </div>
              <div className="text-[10px] text-[var(--text-muted)] font-mono">
                Lab Internal Test is unlocked for Module {activeModuleNum}.
              </div>
              <Link
                to="/lab-internal"
                className="inline-flex items-center justify-center gap-1.5 w-full py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition shadow-xs"
              >
                <span>Take Lab Internal Test</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          ) : (
            <div className="text-[10px] text-[var(--text-muted)] text-center font-mono">
              Complete all 25 practice questions to unlock the Module {activeModuleNum} Lab Internal Test.
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6 font-sans animate-fadeIn">
      {/* 0. APPLE NAVIGATION BAR CRUMB */}
      <div className="flex items-center justify-between">
        <Link
          to="/dashboard"
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white bg-slate-100/80 dark:bg-slate-800/60 hover:bg-slate-200/80 dark:hover:bg-slate-800 border border-slate-200/80 dark:border-slate-700/60 transition-all active:scale-95 group"
        >
          <ArrowLeft className="w-3.5 h-3.5 group-hover:-translate-x-0.5 transition-transform" />
          <span>Exit to Dashboard</span>
        </Link>
      </div>

      {/* 1. APPLE FROSTED HEADER */}
      <div className="relative overflow-hidden rounded-3xl border border-slate-200/80 dark:border-slate-800/80 bg-white/70 dark:bg-slate-900/60 backdrop-blur-2xl p-6 sm:p-8 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-1.5">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-600 dark:text-indigo-400 text-xs font-semibold">
              <Sparkles className="w-3.5 h-3.5" />
              <span>{((user as any)?.sectionName || (user as any)?.section || user?.department || 'Integrated Mtech')} Curriculum</span>
              <span className="w-1 h-1 rounded-full bg-indigo-400" />
              <span>C11 GCC 14</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
              {((user as any)?.sectionName || (user as any)?.section || user?.department || 'Integrated Mtech')} — C Programming Practice
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 max-w-xl leading-relaxed">
              Targeted logic exercises for {((user as any)?.sectionName || (user as any)?.section || user?.department || 'Integrated Mtech')} with instant compiler feedback and syntax tip boxes. No timers, unlimited attempts.
            </p>
          </div>

          {/* Quick Mastery, Dashboard Exit & Lab Link */}
          <div className="flex items-center gap-3 shrink-0 bg-slate-50/80 dark:bg-slate-800/40 p-3 sm:p-4 rounded-2xl border border-slate-200/80 dark:border-slate-700/60">
            <div className="space-y-1.5 min-w-[175px]">
              <div className="flex items-center justify-between gap-3 text-xs font-mono">
                <span className="text-slate-500 dark:text-slate-400">Total Solved</span>
                <span className="font-bold text-emerald-600 dark:text-emerald-400 font-mono">
                  {solvedCount}/{totalTopics} ({progressPct}%)
                </span>
              </div>
              <div className="w-full bg-slate-200 dark:bg-slate-700 h-2 rounded-full overflow-hidden">
                <div
                  className="bg-emerald-500 h-full rounded-full transition-all duration-500"
                  style={{ width: `${progressPct}%` }}
                />
              </div>
            </div>

            <Link
              to="/dashboard"
              className="px-3.5 py-2.5 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200/80 dark:border-slate-700 shadow-xs transition-all flex items-center gap-1.5 whitespace-nowrap active:scale-95"
            >
              <Home className="w-3.5 h-3.5 text-indigo-500" />
              <span>Dashboard</span>
            </Link>

            <Link
              to="/lab-internal"
              className="px-3.5 py-2.5 rounded-xl text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 shadow-xs transition-all flex items-center gap-1.5 whitespace-nowrap active:scale-95"
            >
              <BookOpen className="w-3.5 h-3.5" />
              <span>Lab Internal →</span>
            </Link>
          </div>
        </div>
      </div>

      {/* 2. APPLE SEGMENTED MODULE SWITCHER */}
      <div className="p-1.5 rounded-2xl bg-slate-200/60 dark:bg-slate-900/60 backdrop-blur-xl border border-slate-200/80 dark:border-slate-800/80 grid grid-cols-2 lg:grid-cols-4 gap-1.5">
        {[
          { id: 1, title: 'Control Flow', desc: 'Decisions & Loops' },
          { id: 2, title: 'Pointers & Functions', desc: 'Addresses & Recursion' },
          { id: 3, title: 'Array & Applications', desc: 'Matrices & Sorting' },
          { id: 4, title: 'Dynamic Memory', desc: 'Structs & Heap' },
        ].map((m) => {
          const uInfo = getModuleUnlockInfo(m.id);
          const isCur = selectedModuleFilter === m.id;
          const mTopics = TOPIC_PRACTICE_DATA.filter((t) => t.moduleIndex === m.id);
          const mSolved = mTopics.filter((t) => solvedTopics.includes(t.id)).length;
          const isLocked = !uInfo.isUnlocked;

          return (
            <button
              key={m.id}
              type="button"
              onClick={() => {
                if (isLocked) {
                  toast.warning(`🔒 ${uInfo.lockReason}`);
                  return;
                }
                setSelectedModuleFilter(m.id);
                setSearchParams({ module: String(m.id) });
              }}
              className={`py-3 px-4 rounded-xl text-left transition-all flex flex-col justify-between gap-1 group active:scale-98 cursor-pointer ${
                isCur
                  ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm ring-1 ring-black/5 dark:ring-white/10'
                  : isLocked
                  ? 'text-slate-400 dark:text-slate-600 opacity-60 hover:opacity-80'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-white/40 dark:hover:bg-slate-800/40'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono uppercase tracking-wider font-bold text-slate-400">
                  Module 0{m.id}
                </span>
                {isLocked ? (
                  <span className="text-[10px] font-mono text-amber-500 flex items-center gap-1 font-semibold">
                    <Lock className="w-3 h-3 text-amber-500" />
                    <span>Locked</span>
                  </span>
                ) : (
                  <span className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded ${
                    isCur
                      ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                      : 'text-slate-500'
                  }`}>
                    {mSolved}/25
                  </span>
                )}
              </div>
              <div className="font-bold text-sm truncate">
                {m.title}
              </div>
              <div className="text-[11px] text-slate-400 truncate hidden sm:block">
                {m.desc}
              </div>
            </button>
          );
        })}
      </div>

      {/* 3. HERO: 1-CLICK NEXT QUESTION ACTION */}
      {nextUnsolvedInModule && getModuleUnlockInfo(selectedModuleFilter).isUnlocked && (
        <div className="p-5 sm:p-6 rounded-3xl bg-gradient-to-br from-indigo-50/80 via-white/80 to-purple-50/50 dark:from-indigo-950/20 dark:via-slate-900/40 dark:to-slate-900/60 backdrop-blur-xl border border-indigo-100 dark:border-indigo-900/40 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-5">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold tracking-widest uppercase px-2.5 py-0.5 rounded-full bg-indigo-600 text-white shadow-xs">
                Next Up
              </span>
              <span className="text-xs font-mono text-slate-500 dark:text-slate-400">
                Module {selectedModuleFilter} · {nextUnsolvedInModule.problem.difficulty} 
              </span>
            </div>
            <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
              {nextUnsolvedInModule.topicTitle}
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-1 max-w-xl">
              {nextUnsolvedInModule.summary || nextUnsolvedInModule.problem.description}
            </p>
          </div>

          <button
            type="button"
            onClick={() => handleOpenTopic(nextUnsolvedInModule)}
            className="w-full sm:w-auto px-6 py-3 rounded-full bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-sm transition-all shadow-md shadow-indigo-600/25 hover:shadow-indigo-600/35 flex items-center justify-center gap-2 group active:scale-95 shrink-0 cursor-pointer"
          >
            <Play className="w-4 h-4 fill-current group-hover:scale-110 transition-transform" />
            <span>Continue Solving</span>
            <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
          </button>
        </div>
      )}

      {/* 4. MODULE CONTENT OR LOCK CARD */}
      {!getModuleUnlockInfo(selectedModuleFilter).isUnlocked ? (
        <div className="p-8 sm:p-12 rounded-3xl bg-white/70 dark:bg-slate-900/60 backdrop-blur-2xl border border-amber-500/20 text-center space-y-4 shadow-xs">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-500 flex items-center justify-center">
            <Lock className="w-7 h-7 text-amber-500" />
          </div>
          <div className="space-y-1">
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              Module {selectedModuleFilter} Practice is Locked
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto leading-relaxed">
              {getModuleUnlockInfo(selectedModuleFilter).lockReason}
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              const prevMod = Math.max(1, selectedModuleFilter - 1);
              setSelectedModuleFilter(prevMod);
              setSearchParams({ module: String(prevMod) });
            }}
            className="px-5 py-2.5 rounded-full text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white shadow-sm transition active:scale-95 inline-flex items-center gap-2 cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Go to Module {Math.max(1, selectedModuleFilter - 1)}</span>
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Header of selected module + quick search */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 sm:p-5 rounded-2xl bg-white/70 dark:bg-slate-900/60 backdrop-blur-xl border border-slate-200/80 dark:border-slate-800/80 shadow-xs">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-500/10 px-2.5 py-0.5 rounded border border-indigo-500/20">
                  Module {selectedModuleFilter} Topics
                </span>
                <span className="text-xs text-slate-500 dark:text-slate-400 font-mono">
                  ({filteredTopics.length} questions available)
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Click any topic item below to open Monaco Editor workspace directly.
              </p>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <div className="relative flex-1 sm:w-60">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search questions..."
                  className="w-full pl-8 pr-7 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/60 text-slate-900 dark:text-white placeholder-slate-400 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs"
                  >
                    ✕
                  </button>
                )}
              </div>

              {/* Status Filter */}
              <div className="flex items-center bg-slate-200/60 dark:bg-slate-800/60 p-1 rounded-xl border border-slate-200/80 dark:border-slate-700/60 text-xs font-mono">
                <button
                  onClick={() => setStatusFilter('ALL')}
                  className={`px-3 py-1 rounded-lg font-semibold transition ${
                    statusFilter === 'ALL'
                      ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                      : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  All
                </button>
                <button
                  onClick={() => setStatusFilter('UNSOLVED')}
                  className={`px-3 py-1 rounded-lg font-semibold transition ${
                    statusFilter === 'UNSOLVED'
                      ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                      : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  To Do
                </button>
                <button
                  onClick={() => setStatusFilter('SOLVED')}
                  className={`px-3 py-1 rounded-lg font-semibold transition ${
                    statusFilter === 'SOLVED'
                      ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                      : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  Solved
                </button>
              </div>
            </div>
          </div>

          {/* Resume In-Progress Draft Banner */}
          {lastActiveTopicItem && !statusFilter.includes('SOLVED') && (
            <div className="p-4 rounded-2xl border border-amber-500/30 bg-amber-500/10 dark:bg-amber-500/5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-9 h-9 rounded-xl bg-amber-500/20 text-amber-500 flex items-center justify-center shrink-0">
                  <RotateCcw className="w-4 h-4 text-amber-500" />
                </div>
                <div className="min-w-0">
                  <div className="text-[10px] uppercase tracking-wider text-amber-600 dark:text-amber-400 font-bold flex items-center gap-1.5 font-mono">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    <span>In-Progress Draft Saved</span>
                  </div>
                  <div className="text-xs font-semibold text-slate-900 dark:text-white truncate">
                    {lastActiveTopicItem.topic.topicTitle} ({lastActiveTopicItem.code.length} chars)
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => handleOpenTopic(lastActiveTopicItem.topic)}
                className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-semibold text-xs flex items-center justify-center gap-1.5 shadow-xs transition active:scale-95 shrink-0 cursor-pointer"
              >
                <span>Resume Coding</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* Clean Numbered Question List */}
          {filteredTopics.length === 0 ? (
            <div className="text-center py-12 bg-white/60 dark:bg-slate-900/40 rounded-3xl border border-slate-200 dark:border-slate-800 space-y-2">
              <Code2 className="w-8 h-8 text-slate-400 mx-auto opacity-50" />
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">No Questions Match Filter</h3>
              <p className="text-xs text-slate-400">Try clearing search or changing the filter.</p>
              <button
                onClick={() => { setSearchQuery(''); setStatusFilter('ALL'); }}
                className="px-4 py-2 text-xs font-semibold rounded-full bg-indigo-600 text-white cursor-pointer"
              >
                Reset Filter
              </button>
            </div>
          ) : (
            <div className="space-y-2.5">
              {filteredTopics.map((topic, idx) => {
                const isSolved = solvedTopics.includes(topic.id);
                const isLocked = isTopicLocked(topic);
                const isHard = topic.problem.difficulty === 'HARD';
                const isMedium = topic.problem.difficulty === 'MEDIUM';

                const draftKey = `topic_${topic.id}`;
                const localDraft = DraftSyncService.getLocalDraft(draftKey, true);
                const directCode = typeof localStorage !== 'undefined' ? localStorage.getItem(`logicq_practice_draft_${draftKey}`) : null;
                const effectiveCode = (localDraft?.code && localDraft.code.trim()) ? localDraft.code : directCode;
                const hasDraft = Boolean(
                  effectiveCode &&
                  effectiveCode.trim() &&
                  effectiveCode.trim() !== topic.problem.starterCode.trim()
                );

                return (
                  <div
                    key={topic.id}
                    onClick={() => {
                      if (isLocked) {
                        const moduleTopics = TOPIC_PRACTICE_DATA.filter((t) => t.moduleIndex === topic.moduleIndex);
                        const topicIdx = moduleTopics.findIndex((t) => t.id === topic.id);
                        const prevTopicInMod = topicIdx > 0 ? moduleTopics[topicIdx - 1] : null;
                        toast.error(`🔒 Question ${topicIdx + 1} is locked! Complete Q${topicIdx} (${prevTopicInMod?.topicTitle || 'previous question'}) first to unlock.`);
                        return;
                      }
                      handleOpenTopic(topic);
                    }}
                    className={`p-4 rounded-2xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 group active:scale-[0.99] ${
                      isLocked
                        ? 'border-slate-200/60 dark:border-slate-800/60 bg-slate-100/40 dark:bg-slate-900/20 opacity-60 cursor-not-allowed'
                        : isSolved
                        ? 'border-emerald-500/20 bg-emerald-500/5 hover:border-emerald-500/40 hover:bg-emerald-500/10 cursor-pointer shadow-xs'
                        : hasDraft
                        ? 'border-amber-500/25 bg-amber-500/5 hover:border-amber-500/40 hover:bg-amber-500/10 cursor-pointer shadow-xs'
                        : 'border-slate-200/80 dark:border-slate-800/80 bg-white/80 dark:bg-slate-900/70 hover:border-indigo-500/40 hover:bg-white dark:hover:bg-slate-800/80 cursor-pointer shadow-xs hover:shadow-sm'
                    }`}
                  >
                    {/* Left: Indicator + Title + Meta */}
                    <div className="flex items-start sm:items-center gap-3.5 min-w-0">
                      <span className={`w-8 h-8 rounded-xl font-mono text-xs font-bold flex items-center justify-center shrink-0 border transition-all ${
                        isLocked
                          ? 'bg-slate-100 dark:bg-slate-800 text-slate-400 border-slate-200 dark:border-slate-700'
                          : isSolved
                          ? 'bg-emerald-500 text-white border-emerald-500 shadow-xs'
                          : hasDraft
                          ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30'
                          : 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20 group-hover:scale-105'
                      }`}>
                        {isSolved ? (
                          <Check className="w-4 h-4 stroke-[3]" />
                        ) : isLocked ? (
                          <Lock className="w-3.5 h-3.5" />
                        ) : (
                          idx + 1
                        )}
                      </span>

                      <div className="min-w-0 space-y-0.5">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className={`font-bold text-sm transition-colors ${
                            isLocked
                              ? 'text-slate-400 dark:text-slate-500'
                              : 'text-slate-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400'
                          }`}>
                            {topic.topicTitle}
                          </h4>

                          <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full border ${
                            isHard
                              ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20'
                              : isMedium
                              ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20'
                              : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
                          }`}>
                            {topic.problem.difficulty}
                          </span>

                          {FirestoreDataService.getLocalTopicAttempt(user?.prn || user?.id || 'guest', topic.id) > 0 && !isLocked && (
                            <span className="px-2 py-0.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-600 dark:text-indigo-400 text-[10px] font-mono font-bold flex items-center gap-1">
                              <RotateCcw className="w-2.5 h-2.5 text-indigo-500" />
                              <span>Attempt #{FirestoreDataService.getLocalTopicAttempt(user?.prn || user?.id || 'guest', topic.id)}</span>
                            </span>
                          )}

                          {hasDraft && !isSolved && !isLocked && (
                            <span className="px-2 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 text-[10px] font-mono font-bold flex items-center gap-1">
                              <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                              <span>Draft</span>
                            </span>
                          )}

                          {isLocked && (
                            <span className="px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-400 text-[10px] font-mono flex items-center gap-1">
                              <Lock className="w-2.5 h-2.5" />
                              <span>Locked</span>
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 truncate">
                          <span className="font-medium text-slate-700 dark:text-slate-300 truncate">
                            {topic.problem.title}
                          </span>
                          <span>•</span>
                          <span className="truncate">{topic.summary}</span>
                        </div>
                      </div>
                    </div>

                    {/* Right: Solved / Solve Action */}
                    <div className="flex items-center gap-2.5 shrink-0 self-end sm:self-center">
                      <span className="text-[11px] font-mono text-amber-600 dark:text-amber-400/90 hidden md:flex items-center gap-1">
                        <Lightbulb className="w-3.5 h-3.5" />
                        <span>Syntax Tip</span>
                      </span>

                      {isLocked ? (
                        <span className="px-3.5 py-1.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-400 text-xs font-mono flex items-center gap-1.5">
                          <Lock className="w-3 h-3" />
                          <span>Locked</span>
                        </span>
                      ) : isSolved ? (
                        <span className="px-3.5 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs font-semibold flex items-center gap-1.5">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Solved</span>
                        </span>
                      ) : hasDraft ? (
                        <button
                          type="button"
                          className="px-4 py-2 rounded-full bg-amber-500 hover:bg-amber-600 text-slate-950 text-xs font-semibold transition flex items-center gap-1 shadow-xs group-hover:scale-105 cursor-pointer"
                        >
                          <span>Resume</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </button>
                      ) : (
                        <button
                          type="button"
                          className="px-4 py-2 rounded-full bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold transition flex items-center gap-1 shadow-xs group-hover:scale-105 cursor-pointer"
                        >
                          <span>Solve</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* 4. FULL-SCREEN DEDICATED JEE PRACTICE WORKSPACE (PORTAL TO <body> TO ELIMINATE PARENT OFFSET OR BLEED) */}
      {activeTopic && typeof document !== 'undefined' && createPortal(
        <div className="fixed inset-0 w-screen h-[100dvh] max-h-[100dvh] z-[999999] bg-[var(--bg-main)] flex flex-col overflow-hidden select-none">
          
          {/* Topbar: Authentic Clean JEE CBT Header */}
          <div className="h-14 px-3 sm:px-4 border-b border-[var(--border-line)] bg-[var(--bg-panel)] flex items-center justify-between shrink-0 select-none gap-2">
            
            {/* Left: Exit + Problem Identity */}
            <div className="flex items-center gap-2 sm:gap-3 min-w-0">
              <button
                onClick={handleCloseTopic}
                className="px-2.5 sm:px-3 py-1.5 rounded-lg border border-[var(--border-line)] bg-[var(--bg-surface)] hover:bg-[var(--bg-surface-hover)] text-[var(--text-main)] text-xs font-mono font-medium transition flex items-center gap-1.5 shrink-0"
                title="Return to Practice Arena"
              >
                <ArrowLeft className="w-3.5 h-3.5 text-[var(--text-muted)]" />
                <span className="hidden sm:inline font-bold">Exit Practice</span>
              </button>

              <div className="h-4 w-[1px] bg-[var(--border-line)] hidden sm:block shrink-0" />

              <div className="flex items-center gap-2 min-w-0">
                <span className="text-xs sm:text-sm font-bold text-[var(--text-main)] truncate max-w-xs sm:max-w-md md:max-w-lg lg:max-w-xl">
                  Q{currentTopicIndex + 1}. {activeTopic.topicTitle}
                </span>

                <span
                  className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full border shrink-0 hidden sm:inline-block ${
                    activeTopic.problem.difficulty === 'HARD'
                      ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20'
                      : activeTopic.problem.difficulty === 'MEDIUM'
                      ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20'
                      : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
                  }`}
                >
                  {activeTopic.problem.difficulty}
                </span>

                {/* Live Student Attempt Counter Pill */}
                <span
                  className="inline-flex items-center gap-1 text-[10px] sm:text-[11px] font-mono font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-500/10 px-2 sm:px-2.5 py-0.5 rounded-full border border-indigo-500/25 shrink-0 shadow-2xs"
                  title={`Your current attempt on this question: Attempt #${currentTopicAttempt}`}
                >
                  <RotateCcw className="w-3 h-3 text-indigo-500 shrink-0" />
                  <span>Attempt #{currentTopicAttempt}</span>
                </span>

                {solvedTopics.includes(activeTopic.id) && (
                  <span className="inline-flex items-center gap-1 text-[10px] font-mono font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20 shrink-0">
                    <CheckCircle2 className="w-3 h-3" />
                    <span className="hidden sm:inline">Solved</span>
                  </span>
                )}
              </div>
            </div>



            {/* Center: Practice Mode - Sleek Timer */}
            <div className="flex items-center gap-2">
              <div
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-[var(--border-line)] bg-[var(--bg-surface)] font-mono text-xs text-[var(--text-main)] shadow-xs shrink-0"
                title="Practice Mode (Unlimited Time)"
              >
                <Clock className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                <span className="font-semibold text-xs">{formatPracticeTime(elapsedSeconds)}</span>
              </div>
            </div>

            {/* Right: Palette Toggle + Actions */}
            <div className="flex items-center gap-1.5 sm:gap-2 shrink-0 pr-4 sm:pr-8">
              <button
                type="button"
                onClick={() => {
                  setIsMobilePaletteOpen(true);
                  setIsDesktopPaletteOpen(!isDesktopPaletteOpen);
                }}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-mono font-semibold transition border border-cyan-500/30 bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 cursor-pointer shadow-xs"
                title="Toggle JEE 25-Question Palette"
              >
                <LayoutGrid className="w-3.5 h-3.5" />
                <span>Palette ({moduleSolvedCount}/{currentModuleTopics.length})</span>
              </button>

              <button
                onClick={() => setIsIssueModalOpen(true)}
                className="p-2 rounded-lg text-[var(--text-muted)] hover:text-rose-500 hover:bg-rose-500/10 transition cursor-pointer"
                title="Report issue"
              >
                <Flag className="w-4 h-4" />
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
            </button>
          </div>

          {/* Main Three-Pane JEE Workspace (Statement | Editor | Authentic JEE Palette) */}
          <div className="flex-1 flex flex-col lg:flex-row overflow-hidden min-h-0 relative">
            
            {/* PANE: Problem Description Statement (Left side on desktop - 50% split) */}
            <div
              className={`w-full lg:w-1/2 min-w-0 flex flex-col border-b lg:border-b-0 lg:border-r border-[var(--border-line)] overflow-y-auto no-scrollbar p-4 sm:p-6 space-y-4 bg-[var(--bg-panel)] min-h-0 h-full shrink-0 select-none lg:order-1 ${
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
              {/* Header Info Banner (Daily Challenge style) */}
              <div className="space-y-3 pb-3 border-b border-[var(--border-line)]">
                <div className="p-3 rounded-2xl bg-gradient-to-r from-cyan-500/10 via-indigo-500/10 to-transparent border border-cyan-500/25 flex items-center justify-between gap-3 font-mono shadow-xs">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 rounded-xl bg-cyan-500/20 text-cyan-400">
                      <Clock className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 uppercase tracking-wider block font-semibold">
                        Module {activeTopic.moduleIndex} • {activeTopic.moduleTitle.replace(/^MODULE\s+\d+:\s*/i, '')}
                      </span>
                      <div className="flex items-center gap-1.5 text-xs font-bold text-cyan-300">
                        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                        <span>Topic {currentTopicIndex + 1} of {currentModuleTopics.length}</span>
                      </div>
                    </div>
                  </div>

                  {solvedTopics.includes(activeTopic.id) ? (
                    <span className="px-2.5 py-1 rounded-lg bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs font-bold flex items-center gap-1 font-mono">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                      Mastered
                    </span>
                  ) : (
                    <span className="px-2.5 py-1 rounded-lg bg-amber-500/20 border border-amber-500/40 text-amber-300 text-xs font-bold flex items-center gap-1 font-mono">
                      <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                      
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  <span className={`px-2 py-0.5 rounded-md text-[11px] font-mono font-bold border ${
                    activeTopic.problem.difficulty === 'HARD'
                      ? 'bg-rose-500/15 text-rose-500 dark:text-rose-400 border-rose-500/30'
                      : activeTopic.problem.difficulty === 'MEDIUM'
                      ? 'bg-amber-500/15 text-amber-500 dark:text-amber-400 border-amber-500/30'
                      : 'bg-emerald-500/15 text-emerald-500 dark:text-emerald-400 border-emerald-500/30'
                  }`}>
                    {activeTopic.problem.difficulty || 'EASY'}
                  </span>
                  <span className="px-2 py-0.5 rounded-md text-[11px] font-mono font-semibold bg-cyan-500/15 text-cyan-500 dark:text-cyan-400 border border-cyan-500/30">
                    Topic Practice
                  </span>
                  <span className="px-2 py-0.5 rounded-md text-[11px] font-mono font-bold bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 border border-indigo-500/30 flex items-center gap-1.5 shadow-2xs">
                    <RotateCcw className="w-3 h-3 text-indigo-500" />
                    <span>Attempt #{currentTopicAttempt}</span>
                  </span>
                  <span className="px-2 py-0.5 rounded-md text-[11px] font-mono font-semibold bg-slate-500/15 text-slate-600 dark:text-slate-300 border border-slate-500/30">
                    GCC C11
                  </span>
                </div>

                <h1 className="text-xl sm:text-2xl font-bold text-[var(--text-main)]">
                  {activeTopic.problem.title}
                </h1>

                <div className="flex items-center justify-between gap-2 flex-wrap text-xs font-mono text-[var(--text-muted)] pt-1">
                  <div className="flex items-center gap-3">
                    
                    <span>•</span>
                    <span>Time: <strong className="text-[var(--text-main)]">1000ms</strong></span>
                    <span>•</span>
                    <span>Memory: <strong className="text-[var(--text-main)]">64MB</strong></span>
                  </div>

                  {/* Compact Reference Trigger Pill */}
                  <button
                    type="button"
                    onClick={() => setIsTipDrawerOpen(true)}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-amber-500/30 bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 text-xs font-mono font-medium transition cursor-pointer shadow-xs"
                    title="View syntax cheat sheet and reference"
                  >
                    <Lightbulb className="w-3.5 h-3.5" />
                    <span>Syntax Reference</span>
                  </button>
                </div>
              </div>

              {/* Problem Statement Content */}
              <div className="pt-2">
                <StatementMarkdown content={activeTopic.problem.description} />
              </div>

              {/* Quick Concept Pro-Tip & Constraints Section */}
              <div className="mt-4 pt-3.5 border-t border-[var(--border-line)] space-y-3 font-sans">
                {/* Pro-Tip Box */}
                {(activeTopic.tipBox?.application || activeTopic.summary) && (
                  <div className="p-3.5 rounded-2xl bg-amber-500/5 dark:bg-amber-500/10 border border-amber-500/20 text-xs text-[var(--text-main)] space-y-1.5 shadow-xs">
                    <div className="flex items-center gap-2 font-bold text-amber-500 dark:text-amber-400 font-mono text-[11px] uppercase tracking-wider">
                      <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                      <span>💡 Important Logic Clue</span>
                    </div>
                    <p className="leading-relaxed text-slate-700 dark:text-slate-300">
                      {activeTopic.tipBox?.application || activeTopic.summary}
                    </p>
                  </div>
                )}

                {/* Constraints & Environment */}
                <div className="p-3 rounded-xl bg-slate-500/5 border border-[var(--border-line)] text-xs font-mono space-y-1.5">
                  <span className="text-[10px] font-semibold text-[var(--text-muted)] uppercase tracking-wider block">
                    Execution Constraints
                  </span>
                  <div className="grid grid-cols-2 gap-2 text-[11px] text-[var(--text-muted)]">
                    <div>• Time Limit: <span className="text-[var(--text-main)] font-semibold">1.0s</span></div>
                    <div>• Memory: <span className="text-[var(--text-main)] font-semibold">64 MB</span></div>
                    <div>• Standard: <span className="text-[var(--text-main)] font-semibold">GCC C11</span></div>
                    <div>• Strict I/O: <span className="text-[var(--text-main)] font-semibold">Auto-stdin</span></div>
                  </div>
                </div>
              </div>
            </div>

            {/* PANE: Code Editor + Terminal & Verdict Drawer (Right side on desktop - Expanded) */}
            <div
              className={`flex-1 min-w-0 flex flex-col min-h-0 h-full bg-[var(--bg-main)] lg:border-r-0 border-[var(--border-line)] lg:order-2 ${
                activeMobileTab === 'statement' ? 'hidden lg:flex' : 'flex-1 flex'
              }`}
            >
              {/* Editor Container */}
              <div className="flex-1 min-h-0 relative overflow-hidden bg-[#0c1017] terminal-window">
                <CodeEditor
                  code={code}
                  onChange={handleCodeChange}
                  onReset={handleResetCode}
                  onSubmit={handleRunOpenTest}
                  onRun={handleRunOpenTest}
                  readOnly={false}
                  disableCopyPaste={true}
                  onBlockedAction={(action) => {
                    if (action === 'paste') {
                      handlePasteBlocked();
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
                <div className="flex items-center justify-between px-2 sm:px-4 py-1.5 bg-slate-50 dark:bg-[#111622] border-b border-slate-200 dark:border-slate-800 shrink-0 font-mono text-xs gap-1.5 select-none overflow-x-auto no-scrollbar">
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
                      <span className="hidden sm:inline">(1)</span>
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
                      {(runResult || submitResult) && (
                        <span className={`ml-1 inline-block w-2 h-2 rounded-full ${submitResult?.allPassed || runResult?.success ? 'bg-emerald-400 animate-pulse' : 'bg-rose-400 animate-ping'}`} />
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
                      <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-300 ${isDrawerOpen ? 'rotate-0' : 'rotate-180'}`} />
                    </button>
                  </div>
                </div>

                {/* Dock Body */}
                {isDrawerOpen && (
                  <div className="flex-1 min-h-0 overflow-y-auto no-scrollbar overscroll-contain p-3.5 font-mono text-xs bg-white dark:bg-[#0c1017]">
                    {activeBottomTab === 'cases' && (
                      <div className="space-y-3">
                        <div className="flex items-center justify-between pb-1 flex-wrap gap-2">
                          <div className="flex items-center gap-2">
                            <span className="px-3 py-1 rounded-lg text-xs font-mono font-bold bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-xs">
                              Use Case 1
                            </span>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                          <div>
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-[11px] font-semibold text-[var(--text-muted)] tracking-wide">
                                Input
                              </span>
                            </div>
                            <pre className="p-3 rounded-xl bg-[#050811] border border-slate-800 text-cyan-300 overflow-x-auto min-h-[50px] shadow-inner font-mono">
                              {activeTopic.problem.openTestCase.input || '(No input required)'}
                            </pre>
                          </div>
                          <div>
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-[11px] font-semibold text-emerald-500 tracking-wide">
                                Expected Output
                              </span>
                            </div>
                            <pre className="p-3 rounded-xl bg-[#050811] border border-slate-800 text-emerald-400 font-bold overflow-x-auto min-h-[50px] shadow-inner font-mono">
                              {activeTopic.problem.openTestCase.expectedOutput}
                            </pre>
                          </div>
                        </div>

                        {activeTopic.problem.openTestCase.explanation && (
                          <div className="p-2.5 rounded-lg bg-[var(--bg-surface)] border border-[var(--border-line)] text-xs text-[var(--text-muted)]">
                            <strong className="text-[var(--text-main)]">Explanation: </strong>
                            {activeTopic.problem.openTestCase.explanation}
                          </div>
                        )}
                      </div>
                    )}

                    {activeBottomTab === 'output' && (
                      <div className="space-y-4 font-mono">
                        {/* Prominent Real-time GCC Terminal */}
                        <TerminalConsole
                          status={
                            isRunning
                              ? 'COMPILING'
                              : runResult?.compileError
                              ? 'COMPILATION_ERROR'
                              : submitResult?.allPassed
                              ? 'ACCEPTED'
                              : runResult && !runResult.success
                              ? 'WRONG_ANSWER'
                              : runResult
                              ? 'ACCEPTED'
                              : 'IDLE'
                          }
                          compileOutput={runResult?.compileError}
                          stdout={runResult?.actualOutput}
                          stderr={runResult?.stderr}
                          exitCode={runResult?.exitCode}
                          useCaseInput={activeTopic.problem.openTestCase.input}
                          expectedOutput={activeTopic.problem.openTestCase.expectedOutput}
                          useCaseIndex={0}
                          totalUseCases={2}
                          runtimeMs={runResult?.executionTimeMs || 14}
                          isLoading={isRunning}
                          onRetry={handleRunOpenTest}
                          onClear={() => {
                            setRunResult(null);
                            setSubmitResult(null);
                          }}
                        />

                        {submitResult && (
                          <motion.div
                            initial={{ opacity: 0, scale: 0.98 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="space-y-2.5 pt-1"
                          >
                            <div className="flex items-center justify-between">
                              <span className={`px-2.5 py-1 rounded-lg text-[11px] font-bold inline-flex items-center gap-1.5 shadow-xs ${
                                submitResult.allPassed
                                  ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                                  : 'bg-rose-500/15 text-rose-400 border border-rose-500/30'
                              }`}>
                                {submitResult.allPassed ? <Sparkles className="w-3.5 h-3.5 text-emerald-400" /> : <X className="w-3.5 h-3.5 text-rose-400" />}
                                <span>{submitResult.allPassed ? 'ALL 2/2 USE CASES PASSED — TOPIC MASTERED!' : 'USE CASE VERIFICATION FAILED'}</span>
                              </span>
                              {submitResult.allPassed && (
                                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                                  
                                </span>
                              )}
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs font-mono">
                              <button
                                type="button"
                                onClick={() => {
                                  if (!submitResult.openPassed) {
                                    setShowVisibleHint((prev) => !prev);
                                  }
                                }}
                                className={`p-2.5 rounded-xl border flex items-center justify-between transition-all text-left ${
                                  submitResult.openPassed
                                    ? 'bg-emerald-500/5 border-emerald-500/20 text-emerald-400 cursor-default'
                                    : 'bg-rose-500/10 hover:bg-rose-500/20 border-rose-500/30 text-rose-300 cursor-pointer shadow-xs active:scale-98'
                                }`}
                                title={!submitResult.openPassed ? 'Click to inspect visible case details' : undefined}
                              >
                                <span>Use Case #1 (Visible)</span>
                                <strong>{submitResult.openPassed ? 'Passed ✓' : 'Failed ✗'}</strong>
                              </button>

                              <button
                                type="button"
                                onClick={() => {
                                  if (!submitResult.hiddenPassed) {
                                    setShowHiddenHint((prev) => !prev);
                                  }
                                }}
                                className={`p-2.5 rounded-xl border flex items-center justify-between transition-all text-left ${
                                  submitResult.hiddenPassed
                                    ? 'bg-emerald-500/5 border-emerald-500/20 text-emerald-400 cursor-default'
                                    : 'bg-rose-500/10 hover:bg-rose-500/20 border-rose-500/40 text-rose-200 cursor-pointer shadow-sm active:scale-98 ring-1 ring-amber-500/40 hover:ring-amber-400/60'
                                }`}
                                title={!submitResult.hiddenPassed ? 'Click to reveal hidden test case diagnostic hint' : undefined}
                              >
                                <span className="flex items-center gap-1.5 flex-wrap">
                                  <span>Use Case #2 (Hidden)</span>
                                  {!submitResult.hiddenPassed && (
                                    <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-amber-500/20 text-amber-300 border border-amber-500/40 font-bold flex items-center gap-1 animate-pulse">
                                      <span>💡 Click for Hint</span>
                                    </span>
                                  )}
                                </span>
                                <strong className="flex items-center gap-1 shrink-0 ml-2">
                                  {submitResult.hiddenPassed ? (
                                    'Passed ✓'
                                  ) : (
                                    <>
                                      <span className="text-rose-400">Failed ✗</span>
                                      <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${showHiddenHint ? 'rotate-180 text-amber-400' : 'text-amber-400/80'}`} />
                                    </>
                                  )}
                                </strong>
                              </button>
                            </div>

                            {/* Hidden Test Case Diagnostic Hint Card */}
                            {showHiddenHint && !submitResult.hiddenPassed && (
                              <motion.div
                                initial={{ opacity: 0, y: -6, height: 0 }}
                                animate={{ opacity: 1, y: 0, height: 'auto' }}
                                exit={{ opacity: 0, height: 0 }}
                                className="p-3.5 rounded-xl bg-gradient-to-br from-amber-500/15 via-amber-950/25 to-black/50 border border-amber-500/40 text-amber-200 text-xs font-mono space-y-2.5 shadow-lg backdrop-blur-md"
                              >
                                <div className="flex items-center justify-between font-bold text-amber-300 border-b border-amber-500/20 pb-1.5">
                                  <span className="flex items-center gap-2">
                                    <span className="w-5 h-5 rounded-full bg-amber-500/20 flex items-center justify-center text-amber-300 text-xs">
                                      💡
                                    </span>
                                    <span>Hidden Test Case Diagnostic Guidance</span>
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() => setShowHiddenHint(false)}
                                    className="p-1 text-amber-400/80 hover:text-amber-200 rounded-md hover:bg-amber-500/20 cursor-pointer transition-colors"
                                    title="Close hint"
                                  >
                                    <X className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                                <div className="p-3 rounded-lg bg-black/60 border border-amber-500/30 text-[12px] leading-relaxed text-amber-100 font-sans">
                                  {getHiddenCaseHint(activeTopic, submitResult, codeRef.current || code)}
                                </div>
                                {activeTopic.tipBox?.syntax && (
                                  <div className="flex items-center justify-between text-[11px] text-amber-300/90 pt-1 border-t border-amber-500/20">
                                    <span>Syntax Tip: <code className="px-2 py-0.5 rounded bg-black/60 text-cyan-300 font-mono border border-cyan-500/20">{activeTopic.tipBox.syntax}</code></span>
                                  </div>
                                )}
                              </motion.div>
                            )}

                            {/* Visible Case Diff Hint */}
                            {showVisibleHint && !submitResult.openPassed && (
                              <motion.div
                                initial={{ opacity: 0, y: -6, height: 0 }}
                                animate={{ opacity: 1, y: 0, height: 'auto' }}
                                exit={{ opacity: 0, height: 0 }}
                                className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-200 text-xs font-mono space-y-2 shadow-md backdrop-blur-sm"
                              >
                                <div className="flex items-center justify-between font-bold text-rose-300">
                                  <span>Use Case #1 Diagnostic Info</span>
                                  <button
                                    type="button"
                                    onClick={() => setShowVisibleHint(false)}
                                    className="p-1 text-rose-400/80 hover:text-rose-200 rounded-md hover:bg-rose-500/10 cursor-pointer transition-colors"
                                  >
                                    <X className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                                <div className="text-[11px] leading-relaxed text-rose-100 space-y-1">
                                  {activeTopic.problem.openTestCase.explanation && (
                                    <p>{activeTopic.problem.openTestCase.explanation}</p>
                                  )}
                                  <div className="font-mono text-[10px] p-2 rounded bg-black/40 text-slate-300">
                                    <div>Expected: <span className="text-emerald-400">{activeTopic.problem.openTestCase.expectedOutput}</span></div>
                                  </div>
                                </div>
                              </motion.div>
                            )}
                          </motion.div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

          </div>

          {/* Unified Apple Slide-Over Question Palette Drawer */}
          {(isDesktopPaletteOpen || isMobilePaletteOpen) && (
            <div className="fixed inset-0 z-[9999999] flex justify-end bg-black/40 backdrop-blur-xs animate-in fade-in duration-150">
              <div
                className="fixed inset-0"
                onClick={() => {
                  setIsDesktopPaletteOpen(false);
                  setIsMobilePaletteOpen(false);
                }}
              />
              <div className="relative w-80 max-w-[85vw] h-full shadow-2xl bg-[var(--bg-panel)] flex flex-col z-10 animate-in slide-in-from-right duration-200 border-l border-[var(--border-line)]">
                <div className="p-3.5 border-b border-[var(--border-line)] flex items-center justify-between bg-[var(--bg-surface)]">
                  <span className="font-mono text-xs font-bold text-[var(--text-main)] flex items-center gap-1.5">
                    <LayoutGrid className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Module {activeTopic.moduleIndex} Questions</span>
                  </span>
                  <button
                    onClick={() => {
                      setIsDesktopPaletteOpen(false);
                      setIsMobilePaletteOpen(false);
                    }}
                    className="p-1 rounded text-[var(--text-muted)] hover:text-[var(--text-main)] cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <div className="flex-1 overflow-y-auto">
                  {renderPaletteContent(true)}
                </div>
              </div>
            </div>
          )}

          {/* Raise Issue Modal */}
          {isIssueModalOpen && (
            <RaiseIssueModal
              isOpen={isIssueModalOpen}
              onClose={() => setIsIssueModalOpen(false)}
              questionTitle={activeTopic.problem.title}
              questionId={activeTopic.id}
              contextType="PRACTICE"
            />
          )}

          {/* Watermelon Slide-Over Reference Drawer */}
          <AnimatePresence>
            {isTipDrawerOpen && activeTopic && (
              <div className="fixed inset-0 z-[99999999] flex justify-end">
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  onClick={() => setIsTipDrawerOpen(false)}
                  className="fixed inset-0 bg-black/60 backdrop-blur-xs"
                />

                <motion.div
                  initial={{ x: '100%' }}
                  animate={{ x: 0 }}
                  exit={{ x: '100%' }}
                  transition={{ type: 'spring', damping: 28, stiffness: 300 }}
                  className="relative w-full max-w-lg bg-[var(--bg-panel)] border-l border-[var(--border-line)] shadow-2xl h-full flex flex-col z-10 font-mono text-xs overflow-hidden"
                >
                  <div className="p-4 border-b border-[var(--border-line)] flex items-center justify-between bg-[var(--bg-surface)]/60">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center border border-amber-500/30">
                        <Lightbulb className="w-4 h-4" />
                      </div>
                      <div>
                        <h4 className="font-bold text-sm text-[var(--text-main)] font-sans">
                          {activeTopic.topicTitle}
                        </h4>
                        <span className="text-[10px] text-[var(--text-muted)]">
                          {activeTopic.moduleTitle}
                        </span>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setIsTipDrawerOpen(false)}
                      className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[var(--bg-surface)] transition cursor-pointer"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="flex-1 overflow-y-auto p-4 space-y-5">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-amber-500 text-xs uppercase tracking-wider">
                          Core C11 Syntax
                        </span>
                        <button
                          type="button"
                          onClick={() => handleCopyTip(activeTopic.tipBox.syntax)}
                          className="flex items-center gap-1 text-[11px] text-[var(--text-muted)] hover:text-[var(--text-main)] transition cursor-pointer"
                        >
                          <Copy className="w-3 h-3" />
                          <span>Copy</span>
                        </button>
                      </div>
                      <pre className="p-3 rounded-xl bg-[var(--bg-main)] text-amber-700 dark:text-amber-300 overflow-x-auto text-xs whitespace-pre-wrap border border-[var(--border-line)]">
                        {activeTopic.tipBox.syntax}
                      </pre>
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-emerald-400 text-xs uppercase tracking-wider">
                          Full Verified Example
                        </span>
                        <button
                          type="button"
                          onClick={() => handleCopyTip(activeTopic.tipBox.example)}
                          className="flex items-center gap-1 text-[11px] text-[var(--text-muted)] hover:text-[var(--text-main)] transition cursor-pointer"
                        >
                          <Copy className="w-3 h-3" />
                          <span>Copy</span>
                        </button>
                      </div>
                      <pre className="p-3 rounded-xl bg-[var(--bg-main)] text-emerald-700 dark:text-emerald-400 overflow-x-auto text-xs whitespace-pre-wrap border border-[var(--border-line)]">
                        {activeTopic.tipBox.example}
                      </pre>
                    </div>
                  </div>

                  <div className="p-4 border-t border-[var(--border-line)] bg-[var(--bg-surface)]/60 flex items-center justify-between">
                    <span className="text-[10px] text-[var(--text-muted)]">
                      Standard C11 / GCC Reference
                    </span>
                    <button
                      type="button"
                      onClick={() => setIsTipDrawerOpen(false)}
                      className="px-4 py-1.5 rounded-lg bg-[var(--bg-panel)] border border-[var(--border-line)] text-xs font-semibold text-[var(--text-main)] hover:bg-[var(--bg-surface)] transition cursor-pointer"
                    >
                      Close Reference
                    </button>
                  </div>
                </motion.div>
              </div>
            )}
          </AnimatePresence>

          {/* Success Celebration Modal */}
          <AnimatePresence>
            {showCelebrationModal && activeTopic && (
              <div className="fixed inset-0 z-[99999999] flex items-center justify-center p-4">
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  onClick={() => setShowCelebrationModal(false)}
                  className="fixed inset-0 bg-black/60 backdrop-blur-sm"
                />

                <motion.div
                  initial={{ opacity: 0, scale: 0.9, y: 20 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.9, y: 20 }}
                  transition={{ type: 'spring', damping: 22, stiffness: 350 }}
                  className="relative w-full max-w-sm bg-[var(--bg-panel)] border-2 border-emerald-500/50 shadow-2xl rounded-3xl p-6 text-center space-y-5 z-10 overflow-hidden"
                >
                  <div className="absolute -top-16 -right-16 w-32 h-32 bg-emerald-500/20 rounded-full blur-2xl pointer-events-none" />
                  <div className="absolute -bottom-16 -left-16 w-32 h-32 bg-teal-500/20 rounded-full blur-2xl pointer-events-none" />

                  <motion.div
                    animate={{ rotate: [0, -10, 10, -5, 5, 0], scale: [1, 1.1, 1] }}
                    transition={{ duration: 1.2, ease: 'easeOut' }}
                    className="w-16 h-16 mx-auto rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-400 text-white flex items-center justify-center shadow-lg shadow-emerald-500/30"
                  >
                    <Trophy className="w-8 h-8" />
                  </motion.div>

                  <div className="space-y-1">
                    <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-emerald-400">
                      Topic Mastered! ()
                    </span>
                    <h3 className="text-lg font-bold text-[var(--text-main)]">
                      {activeTopic.topicTitle}
                    </h3>
                    <p className="text-xs text-[var(--text-muted)] font-mono">
                      All test cases and hidden edge cases passed with zero memory leaks.
                    </p>
                  </div>

                  <div className="flex items-center justify-center gap-2 text-xs font-mono">
                    <span className="px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 flex items-center gap-1 font-semibold">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Open Test
                    </span>
                    <span className="px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 flex items-center gap-1 font-semibold">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Hidden Test
                    </span>
                  </div>

                  <div className="space-y-2 pt-2">
                    {nextTopic ? (
                      <button
                        type="button"
                        onClick={() => {
                          setShowCelebrationModal(false);
                          handleOpenTopic(nextTopic);
                        }}
                        className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white font-mono text-xs font-bold transition flex items-center justify-center gap-2 shadow-md shadow-emerald-500/25 group cursor-pointer"
                      >
                        <span>Next Question: Q{currentTopicIndex + 2}</span>
                        <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => {
                          setShowCelebrationModal(false);
                          handleCloseTopic();
                        }}
                        className="w-full py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-mono text-xs font-bold transition cursor-pointer"
                      >
                        Return to Practice Hub
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => setShowCelebrationModal(false)}
                      className="w-full py-2 text-xs font-mono text-[var(--text-muted)] hover:text-[var(--text-main)] transition cursor-pointer"
                    >
                      Stay on current code
                    </button>
                  </div>
                </motion.div>
              </div>
            )}
          </AnimatePresence>

        </div>,
        document.body
      )}
    </div>
  );
};

export default TopicPracticeHubPage;
