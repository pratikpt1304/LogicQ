import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Link, useSearchParams } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import confetti from 'canvas-confetti';
import { toast } from 'sonner';
import {
  Code2,
  BookOpen,
  Sparkles,
  CheckCircle2,
  ChevronRight,
  Lightbulb,
  Terminal,
  Play,
  Flag,
  RotateCcw,
  Layers,
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
import { useAuth } from '../context/AuthContext.js';
import { FirestoreDataService } from '../services/firestoreData.service.js';
import { RealtimeSyncService } from '../services/realtimeSync.service.js';
import { DraftSyncService, DraftData, getDeviceLabel } from '../services/draftSync.service.js';
import { api } from '../api/client.js';
import { formatPracticeTime } from '../components/practice/PracticeTimer.js';

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

    return list;
  } catch {
    return [topicId];
  }
}

export const TopicPracticeHubPage: React.FC = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const [searchParams, setSearchParams] = useSearchParams();
  const [selectedModuleFilter, setSelectedModuleFilter] = useState<number | null>(() => {
    const p = new URLSearchParams(window.location.search).get('module');
    if (p) {
      const n = parseInt(p, 10);
      if (!isNaN(n) && n >= 1 && n <= 5) return n;
    }
    return null;
  });

  useEffect(() => {
    const mod = searchParams.get('module');
    if (mod) {
      const parsed = parseInt(mod, 10);
      if (!isNaN(parsed) && parsed >= 1 && parsed <= 5) {
        setSelectedModuleFilter(parsed);
      }
    } else {
      setSelectedModuleFilter(null);
    }
  }, [searchParams]);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'UNSOLVED' | 'SOLVED'>('ALL');
  const [difficultyFilter, setDifficultyFilter] = useState<'ALL' | 'EASY' | 'MEDIUM' | 'HARD'>('ALL');
  const [activeTopic, setActiveTopic] = useState<TopicPracticeItem | null>(null);
  const [solvedTopics, setSolvedTopics] = useState<string[]>(() => getSolvedPracticeTopicIds(user?.id));

  // Sync and restore solved practice topics from Firestore on user load
  useEffect(() => {
    if (!user?.id) return;
    (async () => {
      try {
        const stats = await FirestoreDataService.getStatsBackup(user.id);
        const prog = await FirestoreDataService.getPracticeProgress(user.id);
        const cloudSolved = Array.from(
          new Set([
            ...(stats?.completedProblems || []),
            ...(prog?.completedProblems || []),
            ...getSolvedPracticeTopicIds(user.id),
          ])
        );
        if (cloudSolved.length > 0) {
          cloudSolved.forEach((id) => markPracticeTopicSolved(id, user.id));
          setSolvedTopics(getSolvedPracticeTopicIds(user.id));
        }
      } catch (err) {
        console.warn('Practice progress restore failed:', err);
      }
    })();
  }, [user?.id]);

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
  const [isDrawerOpen, setIsDrawerOpen] = useState<boolean>(false);
  const [activeBottomTab, setActiveBottomTab] = useState<'custom' | 'output'>('output');
  const [activeTipTab, setActiveTipTab] = useState<'syntax' | 'example'>('syntax');
  const [isTipDrawerOpen, setIsTipDrawerOpen] = useState<boolean>(false);
  const [copiedTip, setCopiedTip] = useState<boolean>(false);
  const [showCelebrationModal, setShowCelebrationModal] = useState<boolean>(false);

  // JEE Palette state
  const [isDesktopPaletteOpen, setIsDesktopPaletteOpen] = useState<boolean>(true);
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
  const remoteDraftTimeoutRef = useRef<any>(null);
  const activeTopicRef = useRef<TopicPracticeItem | null>(null);
  activeTopicRef.current = activeTopic;
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
  }, [user?.id]);

  // Fullscreen change tracking & strict auto-exit enforcement
  useEffect(() => {
    const handleFullscreenChange = () => {
      const elem = document as any;
      const isNowFullscreen = Boolean(document.fullscreenElement || elem.webkitFullscreenElement);
      setIsFullscreen(isNowFullscreen);

      if (isNowFullscreen) {
        hasEnteredFullscreenRef.current = true;
      } else if (hasEnteredFullscreenRef.current && activeTopicRef.current && !isExitingRef.current) {
        // Strict Fullscreen Rule: Exiting fullscreen automatically closes the question
        hasEnteredFullscreenRef.current = false;
        handleCloseTopic();
        toast.warning('⚠️ Fullscreen exited! Practice question has been closed.');
      }
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
    };
  }, []);

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

  const getTypingVelocityCPM = () => {
    const minutes = Math.max(10, elapsedSecondsRef.current) / 60;
    return Math.round(charsTypedRef.current / minutes);
  };

  // Anti-Cheat: Tab Switch, Clipboard Guard & Fullscreen Monitor while topic workspace is active
  useEffect(() => {
    if (!activeTopic || !user?.id) return;

    const handleVisibility = () => {
      if (document.hidden) {
        FirestoreDataService.saveProctoringTelemetry(user.id, {
          tabSwitchCount: 1,
          lastIncidentAt: new Date().toISOString(),
        }).catch(() => {});
        api.post('/practice/topics/telemetry', {
          topicId: activeTopic.id,
          tabSwitchDelta: 1,
          currentCode: codeRef.current,
          elapsedSec: elapsedSecondsRef.current,
          typingVelocityCPM: getTypingVelocityCPM(),
          eventLog: {
            event: 'TAB_SWITCH',
            detail: 'Student switched tab or window unfocused',
            elapsedSec: elapsedSecondsRef.current,
          },
        }).catch(() => {});
        toast.warning('⚠️ Tab Switch Detected! Proctored telemetry records all window unfocus events.');
      }
    };

    const handlePaste = (e: ClipboardEvent) => {
      e.preventDefault();
      FirestoreDataService.saveProctoringTelemetry(user.id, {
        copyPasteAttempts: 1,
        lastIncidentAt: new Date().toISOString(),
      }).catch(() => {});
      api.post('/practice/topics/telemetry', {
        topicId: activeTopic.id,
        copyPasteDelta: 1,
        currentCode: codeRef.current,
        elapsedSec: elapsedSecondsRef.current,
        typingVelocityCPM: getTypingVelocityCPM(),
        eventLog: {
          event: 'PASTE_BLOCKED',
          detail: 'External copy-paste attempt blocked by proctoring guard',
          elapsedSec: elapsedSecondsRef.current,
        },
      }).catch(() => {});
      toast.error('🚫 Pasting is strictly blocked! Manual typing is required.');
    };

    const handleFullscreenChange = () => {
      if (!document.fullscreenElement && activeTopic) {
        fullscreenExitsRef.current += 1;
        FirestoreDataService.saveProctoringTelemetry(user.id, {
          fullscreenExits: 1,
          lastIncidentAt: new Date().toISOString(),
        }).catch(() => {});
        api.post('/practice/topics/telemetry', {
          topicId: activeTopic.id,
          fullscreenExitDelta: 1,
          currentCode: codeRef.current,
          elapsedSec: elapsedSecondsRef.current,
          typingVelocityCPM: getTypingVelocityCPM(),
          eventLog: {
            event: 'FULLSCREEN_EXIT',
            detail: 'Student exited full screen examination mode',
            elapsedSec: elapsedSecondsRef.current,
          },
        }).catch(() => {});
        toast.warning('⚠️ Fullscreen Exit Detected! Please remain in full screen examination mode.');
      }
    };

    document.addEventListener('visibilitychange', handleVisibility);
    document.addEventListener('paste', handlePaste);
    document.addEventListener('fullscreenchange', handleFullscreenChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibility);
      document.removeEventListener('paste', handlePaste);
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, [activeTopic, user?.id]);

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

  const getModuleUnlockInfo = (moduleIndex: number): { isUnlocked: boolean; lockReason: string } => {
    if (user?.role === 'ADMIN') return { isUnlocked: true, lockReason: '' };
    if (moduleIndex === 1) return { isUnlocked: true, lockReason: '' };

    if (moduleIndex === 2) {
      if (!isM1PracticeComplete) {
        return {
          isUnlocked: false,
          lockReason: `Complete all 25 practice questions in Module 1 (${m1PracticeSolved}/25 solved) to unlock Lab Internal 1 first.`,
        };
      }
      if (!isLab1Complete) {
        return {
          isUnlocked: false,
          lockReason: `Complete Lab Internal 1 Continuous Evaluation to unlock Module 2 Practice.`,
        };
      }
      return { isUnlocked: true, lockReason: '' };
    }

    if (moduleIndex === 3) {
      if (!getModuleUnlockInfo(2).isUnlocked || !isM2PracticeComplete) {
        return {
          isUnlocked: false,
          lockReason: `Complete all 25 practice questions in Module 2 (${m2PracticeSolved}/25 solved) and Lab Internal 2 first.`,
        };
      }
      if (!isLab2Complete) {
        return {
          isUnlocked: false,
          lockReason: `Complete Lab Internal 2 Continuous Evaluation to unlock Module 3 Practice.`,
        };
      }
      return { isUnlocked: true, lockReason: '' };
    }

    if (moduleIndex === 4) {
      if (!getModuleUnlockInfo(3).isUnlocked || !isM3PracticeComplete) {
        return {
          isUnlocked: false,
          lockReason: `Complete all 25 practice questions in Module 3 (${m3PracticeSolved}/25 solved) and Lab Internal 3 first.`,
        };
      }
      if (!isLab3Complete) {
        return {
          isUnlocked: false,
          lockReason: `Complete Lab Internal 3 Continuous Evaluation to unlock Module 4 Practice.`,
        };
      }
      return { isUnlocked: true, lockReason: '' };
    }

    return { isUnlocked: true, lockReason: '' };
  };

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

  const handleOpenTopic = async (topic: TopicPracticeItem) => {
    const unlockInfo = getModuleUnlockInfo(topic.moduleIndex);
    if (!unlockInfo.isUnlocked) {
      toast.error(unlockInfo.lockReason || '🔒 This module is locked!');
      return;
    }

    // 1. Automatically launch full screen on Practice click
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
        console.warn('Fullscreen automatic launch deferred:', fsErr);
      }
    } else {
      hasEnteredFullscreenRef.current = true;
    }

    setActiveTopic(topic);
    setElapsedSeconds(0);
    try {
      localStorage.setItem('logicq_last_topic_id', topic.id);
    } catch {}

    // 1. Check local draft first (prevents reset when switching or returning)
    const draftKey = `topic_${topic.id}`;
    const localDraft = DraftSyncService.getLocalDraft(draftKey, true);
    const initialCode = (localDraft?.code && localDraft.code.trim()) ? localDraft.code : topic.problem.starterCode;

    // Reset per-question proctoring counters
    charsTypedRef.current = 0;
    keystrokesRef.current = 0;
    fullscreenExitsRef.current = 0;

    // Track topic open: increments attemptsCount every time question is opened
    api.post('/practice/topics/track-open', {
      topicId: topic.id,
      moduleIndex: topic.moduleIndex,
      moduleSlug: topic.moduleSlug,
      topicTitle: topic.topicTitle,
      difficulty: topic.problem.difficulty,
      code: initialCode,
    }).catch(() => {});
    setCode(initialCode);
    setCustomInput(localDraft?.customInput || '');
    setRunResult(null);
    setSubmitResult(null);
    setShowCelebrationModal(false);
    setIsTipDrawerOpen(false);
    setIsDrawerOpen(false);
    setActiveBottomTab('output');
    setActiveMobileTab('statement');

    // 2. Authoritative cloud draft sync (restores saved solution across devices/cleared browser)
    if (user?.id) {
      DraftSyncService.fetchRemoteDraft(user.id, draftKey, true)
        .then((remoteDraft: DraftData | null) => {
          if (remoteDraft?.code && remoteDraft.code.trim()) {
            if (!localDraft || remoteDraft.updatedAt > (localDraft.updatedAt || 0)) {
              setCode(remoteDraft.code);
              if (remoteDraft.customInput) setCustomInput(remoteDraft.customInput);
              DraftSyncService.saveLocalDraft(remoteDraft, true);
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
    const draftKey = `topic_${activeTopic.id}`;
    const draft: DraftData = {
      problemSlug: draftKey,
      code: newCode,
      customInput,
      updatedAt: Date.now(),
      deviceLabel: getDeviceLabel(),
    };
    DraftSyncService.saveLocalDraft(draft, true);

    if (user?.id) {
      if (remoteDraftTimeoutRef.current) {
        clearTimeout(remoteDraftTimeoutRef.current);
      }
      remoteDraftTimeoutRef.current = setTimeout(() => {
        DraftSyncService.saveRemoteDraft(user.id, draft, true).catch(() => {});
      }, 1500);
    }
  };

  const handleResetCode = () => {
    if (!activeTopic) return;
    const starter = activeTopic.problem.starterCode;
    setCode(starter);
    const draftKey = `topic_${activeTopic.id}`;
    const draft: DraftData = {
      problemSlug: draftKey,
      code: starter,
      customInput,
      updatedAt: Date.now(),
      deviceLabel: getDeviceLabel(),
    };
    DraftSyncService.saveLocalDraft(draft, true);
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
    setActiveTopic(null);
    hasEnteredFullscreenRef.current = false;

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

  // Run test case & verify solution (Compile & Run)
  const handleRunOpenTest = async () => {
    if (!activeTopic) return;
    setIsRunning(true);
    setRunResult(null);
    setSubmitResult(null);
    setIsDrawerOpen(true);
    setActiveBottomTab('output');
    setActiveMobileTab('results');

    try {
      if (customInput.trim()) {
        // User provided custom Stdin
        const res = await api.post('/problems/run', {
          code,
          input: customInput,
        });

        const actualOut = (res.output || res.stdout || '').trim();
        const compileErr = res.compileError || res.error;

        setRunResult({
          success: !compileErr,
          actualOutput: actualOut,
          expectedOutput: '(Custom Stdin Ran)',
          compileError: compileErr,
          executionTimeMs: res.executionTimeMs || 14,
        });

        if (compileErr) {
          toast.error('Compilation error in GCC sandbox.');
        } else {
          toast.success('Custom input execution finished.');
        }
        return;
      }

      // Standard mode: Run BOTH open and hidden test cases
      const [resOpen, resHidden] = await Promise.all([
        api.post('/problems/run', {
          code,
          input: activeTopic.problem.openTestCase.input,
        }),
        api.post('/problems/run', {
          code,
          input: activeTopic.problem.hiddenTestCase.input,
        }),
      ]);

      const actualOpenOut = (resOpen.output || resOpen.stdout || '').trim();
      const expectedOpenOut = activeTopic.problem.openTestCase.expectedOutput.trim();
      const openPassed = actualOpenOut === expectedOpenOut;

      const actualHiddenOut = (resHidden.output || resHidden.stdout || '').trim();
      const expectedHiddenOut = activeTopic.problem.hiddenTestCase.expectedOutput.trim();
      const hiddenPassed = actualHiddenOut === expectedHiddenOut;

      const compileErr = resOpen.compileError || resHidden.compileError || resOpen.error || resHidden.error;
      const allPassed = !compileErr && openPassed && hiddenPassed;

      setRunResult({
        success: openPassed,
        actualOutput: actualOpenOut,
        expectedOutput: expectedOpenOut,
        compileError: compileErr,
        executionTimeMs: resOpen.executionTimeMs || 14,
      });

      setSubmitResult({
        openPassed,
        hiddenPassed,
        allPassed,
        compileError: compileErr,
      });

      if (allPassed) {
        const updated = markPracticeTopicSolved(activeTopic.id, user?.id);
        setSolvedTopics(updated);

        // Save verified code as authoritative draft so returning student never sees reset code
        const draftKey = `topic_${activeTopic.id}`;
        const draft: DraftData = {
          problemSlug: draftKey,
          code,
          customInput,
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
        }

        // 2. Sync to backend practice API with full details, code, solve time, and typing velocity
        const velocity = getTypingVelocityCPM();
        api.post('/practice/topics/solve', {
          topicId: activeTopic.id,
          moduleSlug: activeTopic.moduleSlug,
          moduleIndex: activeTopic.moduleIndex,
          topicTitle: activeTopic.topicTitle,
          difficulty: activeTopic.problem.difficulty,
          code,
          timeTakenSeconds: elapsedSeconds,
          typingVelocityCPM: velocity,
        }).catch(() => {});

        // 3. Invalidate query cache so /lab-internal and Dashboard reflect solved count instantly
        queryClient.invalidateQueries({ queryKey: ['practice-modules'] });
        queryClient.invalidateQueries({ queryKey: ['student-practice-modules'] });
        queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
        RealtimeSyncService.emit('SUBMISSIONS');
        RealtimeSyncService.emit('DASHBOARD');

        confetti({ particleCount: 80, spread: 60, origin: { y: 0.7 } });

        if (nextTopic) {
          toast.success('🎉 All test cases passed! Advancing to next question...');
          setTimeout(() => {
            handleOpenTopic(nextTopic);
          }, 1200);
        } else {
          setShowCelebrationModal(true);
          toast.success(`🎉 Module Complete! Mastered "${activeTopic.topicTitle}"!`);
        }
      } else {
        if (compileErr) {
          toast.error('Compilation error! Review GCC hints below.');
        } else if (!openPassed) {
          toast.error('Sample test case failed. Output mismatch.');
        } else if (!hiddenPassed) {
          toast.error('Sample passed, but hidden test case failed. Check edge cases!');
        }
      }
    } catch (err: any) {
      setRunResult({
        success: false,
        compileError: err?.message || 'Execution error in GCC sandbox',
      });
      setSubmitResult({
        allPassed: false,
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
          <div className="grid grid-cols-3 gap-1.5 text-[10px]">
            <div className="flex items-center gap-1.5 p-1 rounded bg-[var(--bg-panel)] border border-[var(--border-line)]">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shrink-0" />
              <span className="text-[var(--text-muted)] truncate">Solved ({solvedInMod})</span>
            </div>
            <div className="flex items-center gap-1.5 p-1 rounded bg-[var(--bg-panel)] border border-cyan-500/40">
              <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 shrink-0 animate-pulse" />
              <span className="text-cyan-400 font-semibold truncate">Current</span>
            </div>
            <div className="flex items-center gap-1.5 p-1 rounded bg-[var(--bg-panel)] border border-[var(--border-line)]">
              <span className="w-2.5 h-2.5 rounded-full bg-[var(--text-muted)] opacity-50 shrink-0" />
              <span className="text-[var(--text-muted)] truncate">Unsolved</span>
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

              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => {
                    handleOpenTopic(t);
                    if (isMobile) setIsMobilePaletteOpen(false);
                  }}
                  className={`h-10 rounded-xl font-mono text-xs font-bold transition-all flex items-center justify-center relative cursor-pointer ${
                    isCurrent
                      ? 'border-2 border-cyan-400 bg-cyan-500/25 text-cyan-300 shadow-md shadow-cyan-500/25 scale-105 z-10'
                      : isSolved
                      ? 'bg-emerald-600 hover:bg-emerald-500 text-white border border-emerald-500 shadow-xs'
                      : 'bg-[var(--bg-surface)] hover:bg-[var(--bg-surface-hover)] text-[var(--text-muted)] hover:text-[var(--text-main)] border border-[var(--border-line)]'
                  }`}
                  title={`Q${qNum}: ${t.topicTitle} (${isSolved ? 'Solved' : 'Unsolved'})`}
                >
                  <span>{qNum}</span>
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
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6 font-sans animate-fadeIn">
      {/* 1. Header Banner */}
      <div className="glass-card p-6 sm:p-7 rounded-2xl border border-[var(--border-line)] bg-[var(--bg-panel)] shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-1.5">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-mono font-bold">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Daily Practice Arena</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-[var(--text-main)] tracking-tight">
              Daily C Practice
            </h1>
            <p className="text-xs sm:text-sm text-[var(--text-muted)] max-w-2xl leading-relaxed">
              Targeted C programming exercises with instant compiler feedback and syntax tip boxes. No timers, unlimited attempts.
            </p>
          </div>

          {/* Progress & Quick Link */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 shrink-0 bg-[var(--bg-surface)] p-3.5 sm:p-4 rounded-xl border border-[var(--border-line)]">
            <div className="space-y-1.5 min-w-[160px]">
              <div className="flex items-center justify-between text-xs font-mono">
                <span className="text-[var(--text-muted)]">Progress</span>
                <span className="font-bold text-emerald-400">{solvedCount}/{totalTopics} ({progressPct}%)</span>
              </div>
              <div className="w-full bg-[var(--bg-panel)] h-2 rounded-full overflow-hidden border border-[var(--border-line)]">
                <div
                  className="bg-gradient-to-r from-emerald-500 to-cyan-400 h-full rounded-full transition-all duration-500"
                  style={{ width: `${progressPct}%` }}
                />
              </div>
            </div>

            <Link
              to="/lab-internal"
              className="px-3.5 py-2 rounded-xl text-xs font-mono font-semibold text-indigo-400 hover:text-white bg-indigo-500/10 hover:bg-indigo-600 border border-indigo-500/20 transition flex items-center gap-1.5 whitespace-nowrap self-stretch sm:self-auto justify-center"
            >
              <BookOpen className="w-3.5 h-3.5" />
              <span>Lab Internal &rarr;</span>
            </Link>
          </div>
        </div>
      </div>

      {/* VIEW CONDITIONAL: ALL MODULES OVERVIEW OR DEDICATED MODULE TOPICS */}
      {selectedModuleFilter === null ? (
        /* ========================================================
           VIEW A: ALL 5 PRACTICE MODULE CARDS OVERVIEW
           ======================================================== */
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-mono uppercase font-bold tracking-wider text-[var(--text-muted)]">
              Select Practice Track:
            </h2>
            <span className="text-xs font-mono text-emerald-400 font-semibold">
              5 Sequential Topic Modules • {totalTopics} Questions
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {[
              {
                id: 1,
                name: '1. Control Flow',
                title: 'Control Flow',
                subtitle: 'Decisions, Branching & Loops',
                total: TOPIC_PRACTICE_DATA.filter((t) => t.moduleIndex === 1).length,
                solved: TOPIC_PRACTICE_DATA.filter((t) => t.moduleIndex === 1 && solvedTopics.includes(t.id)).length,
              },
              {
                id: 2,
                name: '2. Pointers & Functions',
                title: 'Pointers & Functions',
                subtitle: 'Memory Addresses & Modular Logic',
                total: TOPIC_PRACTICE_DATA.filter((t) => t.moduleIndex === 2).length,
                solved: TOPIC_PRACTICE_DATA.filter((t) => t.moduleIndex === 2 && solvedTopics.includes(t.id)).length,
              },
              {
                id: 3,
                name: '3. Arrays & Strings',
                title: 'Arrays & Strings',
                subtitle: 'Contiguous Buffers & 2D Arrays',
                total: TOPIC_PRACTICE_DATA.filter((t) => t.moduleIndex === 3).length,
                solved: TOPIC_PRACTICE_DATA.filter((t) => t.moduleIndex === 3 && solvedTopics.includes(t.id)).length,
              },
              {
                id: 4,
                name: '4. Structs & Memory',
                title: 'Structs & Memory',
                subtitle: 'User Schemas & Dynamic Heap',
                total: TOPIC_PRACTICE_DATA.filter((t) => t.moduleIndex === 4).length,
                solved: TOPIC_PRACTICE_DATA.filter((t) => t.moduleIndex === 4 && solvedTopics.includes(t.id)).length,
              },
              {
                id: 5,
                name: '5. Capstone Arena',
                title: 'Capstone Arena',
                subtitle: 'Competitive Mastery & Capstone Arena',
                total: TOPIC_PRACTICE_DATA.filter((t) => t.moduleIndex === 5).length,
                solved: TOPIC_PRACTICE_DATA.filter((t) => t.moduleIndex === 5 && solvedTopics.includes(t.id)).length,
              },
            ].map((block) => {
              const pct = block.total > 0 ? Math.round((block.solved / block.total) * 100) : 0;
              const unlockInfo = getModuleUnlockInfo(block.id);
              const isLocked = !unlockInfo.isUnlocked;

              return (
                <div
                  key={block.id}
                  onClick={() => {
                    if (isLocked) {
                      toast.warning(`🔒 ${unlockInfo.lockReason}`);
                      return;
                    }
                    setSelectedModuleFilter(block.id);
                    setSearchParams({ module: String(block.id) });
                  }}
                  className={`glass-card p-6 rounded-2xl border transition-all relative overflow-hidden flex flex-col justify-between group shadow-sm hover:shadow-lg ${
                    isLocked
                      ? 'border-[var(--border-line)] bg-[var(--bg-surface)]/50 opacity-60 cursor-not-allowed'
                      : 'border-[var(--border-line)] bg-[var(--bg-panel)] hover:border-emerald-500/50 hover:bg-[var(--bg-surface)] cursor-pointer'
                  }`}
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-mono font-bold px-2.5 py-0.5 rounded-md bg-[var(--bg-surface)] border border-[var(--border-line)] text-emerald-400">
                        MODULE {block.id}
                      </span>
                      {isLocked ? (
                        <span className="text-[11px] font-mono font-bold px-2.5 py-0.5 rounded-full border bg-amber-500/15 text-amber-400 border-amber-500/30 inline-flex items-center gap-1">
                          <Lock className="w-3 h-3 text-amber-400" />
                          <span>Locked</span>
                        </span>
                      ) : (
                        <span className="text-xs font-mono font-semibold text-emerald-400">
                          {block.solved}/{block.total} solved ({pct}%)
                        </span>
                      )}
                    </div>

                    <h3 className="text-xl font-bold text-[var(--text-main)] group-hover:text-emerald-400 transition-colors">
                      {block.title}
                    </h3>
                    <p className="text-xs text-[var(--text-muted)] line-clamp-2 leading-relaxed">
                      {isLocked ? unlockInfo.lockReason : block.subtitle}
                    </p>
                  </div>

                  <div className="mt-6 pt-4 border-t border-[var(--border-line)] space-y-3">
                    <div className="w-full bg-[var(--bg-surface)] h-2 rounded-full overflow-hidden border border-[var(--border-line)]">
                      <div
                        className={`h-full rounded-full transition-all duration-300 ${
                          isLocked ? 'bg-slate-600' : 'bg-gradient-to-r from-emerald-500 to-teal-400'
                        }`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <div className="flex items-center justify-between text-xs font-mono">
                      {isLocked ? (
                        <span className="text-amber-400/90 text-xs flex items-center gap-1">
                          <Lock className="w-3.5 h-3.5 text-amber-400" />
                          <span>Requires Lab Internal {block.id - 1}</span>
                        </span>
                      ) : (
                        <span className="text-emerald-400 font-bold group-hover:underline flex items-center gap-1">
                          <span>Practice Module Questions</span>
                          <ChevronRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        /* ========================================================
           VIEW B: DEDICATED MODULE PRACTICE VIEW (TOPIC LIST)
           ======================================================== */
        <div id="practice-topic-list-section" className="space-y-4">
          {/* Back Button & Module Tabs Switcher */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <button
              type="button"
              onClick={() => {
                setSelectedModuleFilter(null);
                setSearchParams({});
              }}
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-mono font-bold text-[var(--accent)] hover:text-white bg-[var(--bg-panel)] hover:bg-[var(--accent)] border border-[var(--border-line)] transition-all cursor-pointer shadow-xs w-fit"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>← All Practice Modules</span>
            </button>

            {/* Quick Switch Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto text-xs font-mono">
              {[1, 2, 3, 4, 5].map((mId) => {
                const isCur = selectedModuleFilter === mId;
                const uInfo = getModuleUnlockInfo(mId);
                return (
                  <button
                    key={mId}
                    type="button"
                    onClick={() => {
                      if (!uInfo.isUnlocked) {
                        toast.warning(`🔒 ${uInfo.lockReason}`);
                        return;
                      }
                      setSelectedModuleFilter(mId);
                      setSearchParams({ module: String(mId) });
                    }}
                    className={`px-3 py-1.5 rounded-lg border text-xs font-mono font-bold transition-all cursor-pointer ${
                      isCur
                        ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white border-emerald-500 shadow-sm'
                        : !uInfo.isUnlocked
                        ? 'opacity-40 bg-[var(--bg-surface)] text-[var(--text-muted)] border-[var(--border-line)] cursor-not-allowed'
                        : 'bg-[var(--bg-surface)] text-[var(--text-muted)] border-[var(--border-line)] hover:text-[var(--text-main)] hover:bg-[var(--bg-surface-hover)]'
                    }`}
                  >
                    Module {mId}
                  </button>
                );
              })}
            </div>
          </div>

          {!getModuleUnlockInfo(selectedModuleFilter).isUnlocked ? (
            <div className="p-8 sm:p-12 rounded-2xl bg-[var(--bg-panel)] border border-amber-500/20 bg-amber-500/5 text-center space-y-4">
              <div className="w-14 h-14 mx-auto rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-400 flex items-center justify-center">
                <Lock className="w-7 h-7 text-amber-400" />
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-bold text-[var(--text-main)] font-mono uppercase tracking-wider">
                  Module {selectedModuleFilter} Practice is Locked
                </h3>
                <p className="text-xs text-[var(--text-muted)] font-mono max-w-lg mx-auto">
                  {getModuleUnlockInfo(selectedModuleFilter).lockReason}
                </p>
              </div>
              <div className="pt-2 flex items-center justify-center gap-3 flex-wrap">
                <Link
                  to="/lab-internal"
                  className="px-4 py-2 rounded-xl text-xs font-mono font-bold bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white shadow-md shadow-emerald-600/20 flex items-center gap-2"
                >
                  <BookOpen className="w-4 h-4" />
                  <span>Go to Lab Internal Continuous Evaluation &rarr;</span>
                </Link>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedModuleFilter(null);
                    setSearchParams({});
                  }}
                  className="px-4 py-2 rounded-xl text-xs font-mono font-medium border border-[var(--border-line)] bg-[var(--bg-surface)] hover:bg-[var(--bg-surface-hover)] text-[var(--text-main)]"
                >
                  Back to All Modules
                </button>
              </div>
            </div>
          ) : (
            <>
              {/* Header of selected module + quick search */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 sm:p-5 rounded-2xl bg-[var(--bg-panel)] border border-[var(--border-line)]">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono font-bold text-emerald-400 bg-emerald-500/10 px-2.5 py-0.5 rounded border border-emerald-500/30">
                      Module {selectedModuleFilter} Practice Topics
                    </span>
                    <span className="text-xs text-[var(--text-muted)] font-mono">
                      ({filteredTopics.length} topics available)
                    </span>
                  </div>
                  <p className="text-xs text-[var(--text-muted)] mt-1 font-sans">
                    Click any topic item in the list below to open the practice workspace.
                  </p>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  <div className="relative flex-1 sm:w-64">
                    <Search className="w-3.5 h-3.5 text-[var(--text-muted)] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Filter topics..."
                      className="w-full pl-8 pr-7 py-1.5 rounded-xl border border-[var(--border-line)] bg-[var(--bg-surface)] text-[var(--text-main)] placeholder-[var(--text-muted)] text-xs font-medium focus:outline-none focus:border-emerald-500 transition"
                    />
                    {searchQuery && (
                      <button
                        onClick={() => setSearchQuery('')}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--text-main)] text-xs"
                      >
                        ✕
                      </button>
                    )}
                  </div>

                  {/* Status Filter */}
                  <div className="flex items-center bg-[var(--bg-surface)] p-0.5 rounded-xl border border-[var(--border-line)]">
                    <button
                      onClick={() => setStatusFilter('ALL')}
                      className={`px-2.5 py-1 rounded-lg text-xs font-mono font-semibold transition ${
                        statusFilter === 'ALL'
                          ? 'bg-emerald-600 text-white shadow-xs'
                          : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'
                      }`}
                    >
                      All
                    </button>
                    <button
                      onClick={() => setStatusFilter('UNSOLVED')}
                      className={`px-2.5 py-1 rounded-lg text-xs font-mono font-semibold transition ${
                        statusFilter === 'UNSOLVED'
                          ? 'bg-emerald-600 text-white shadow-xs'
                          : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'
                      }`}
                    >
                      To Do
                    </button>
                    <button
                      onClick={() => setStatusFilter('SOLVED')}
                      className={`px-2.5 py-1 rounded-lg text-xs font-mono font-semibold transition ${
                        statusFilter === 'SOLVED'
                          ? 'bg-emerald-600 text-white shadow-xs'
                          : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'
                      }`}
                    >
                      Solved
                    </button>
                  </div>
                </div>
              </div>

              {/* Clean Numbered Topic List */}
              {filteredTopics.length === 0 ? (
                <div className="text-center py-12 bg-[var(--bg-panel)] rounded-2xl border border-[var(--border-line)] space-y-2">
                  <Code2 className="w-8 h-8 text-[var(--text-muted)] mx-auto opacity-50" />
                  <h3 className="text-sm font-bold text-[var(--text-main)]">No Topics Found</h3>
                  <p className="text-xs text-[var(--text-muted)]">Try resetting the search filter.</p>
                  <button
                    onClick={() => { setSearchQuery(''); setStatusFilter('ALL'); }}
                    className="px-3.5 py-1.5 text-xs font-mono font-bold rounded-lg bg-emerald-600 text-white"
                  >
                    Reset Filter
                  </button>
                </div>
              ) : (
                <div className="space-y-2">
                  {filteredTopics.map((topic, idx) => {
                    const isSolved = solvedTopics.includes(topic.id);
                    const isHard = topic.problem.difficulty === 'HARD';
                    const isMedium = topic.problem.difficulty === 'MEDIUM';

                    return (
                      <div
                        key={topic.id}
                        onClick={() => handleOpenTopic(topic)}
                        className={`p-3.5 sm:p-4 rounded-xl border transition-all cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-3 group ${
                          isSolved
                            ? 'border-emerald-500/25 bg-emerald-500/5 hover:border-emerald-500/50 hover:bg-emerald-500/10'
                            : 'border-[var(--border-line)] bg-[var(--bg-panel)] hover:border-emerald-500/40 hover:bg-[var(--bg-surface)]'
                        }`}
                      >
                        {/* Left: Number + Title + Problem Info */}
                        <div className="flex items-start sm:items-center gap-3 min-w-0">
                          <span className={`w-7 h-7 rounded-lg font-mono text-xs font-bold flex items-center justify-center shrink-0 border ${
                            isSolved
                              ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                              : 'bg-[var(--bg-surface)] text-[var(--text-muted)] border-[var(--border-line)]'
                          }`}>
                            {idx + 1}
                          </span>

                          <div className="min-w-0 space-y-0.5">
                            <div className="flex items-center gap-2 flex-wrap">
                              <h4 className="font-bold text-sm text-[var(--text-main)] group-hover:text-emerald-400 transition-colors">
                                {topic.topicTitle}
                              </h4>
                              <span className={`text-[10px] font-mono font-bold px-2 py-0.2 rounded-full border ${
                                isHard
                                  ? 'bg-rose-500/15 text-rose-400 border-rose-500/30'
                                  : isMedium
                                  ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                                  : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                              }`}>
                                {topic.problem.difficulty}
                              </span>
                            </div>

                            <div className="flex items-center gap-2 text-xs font-mono text-[var(--text-muted)]">
                              <span className="text-emerald-400 font-semibold truncate flex items-center gap-1">
                                <Code2 className="w-3.5 h-3.5 shrink-0" />
                                {topic.problem.title}
                              </span>
                              <span>•</span>
                              <span className="truncate">{topic.summary}</span>
                            </div>
                          </div>
                        </div>

                        {/* Right: Solved / Practice Action */}
                        <div className="flex items-center gap-2.5 shrink-0 self-end sm:self-center">
                          <span className="text-[11px] font-mono text-amber-400/90 hidden md:flex items-center gap-1">
                            <Lightbulb className="w-3 h-3 text-amber-400" />
                            <span>Syntax Tip</span>
                          </span>

                          {isSolved ? (
                            <span className="px-3 py-1.5 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-xs font-mono font-bold flex items-center gap-1.5">
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              <span>Solved</span>
                            </span>
                          ) : (
                            <button
                              type="button"
                              className="px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-mono font-bold transition flex items-center gap-1 shadow-sm group-hover:scale-102 cursor-pointer"
                            >
                              <span>Practice</span>
                              <ChevronRight className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </>
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
                <span className="text-xs sm:text-sm font-bold text-[var(--text-main)] truncate max-w-[160px] sm:max-w-xs md:max-w-md">
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

                {solvedTopics.includes(activeTopic.id) && (
                  <span className="inline-flex items-center gap-1 text-[10px] font-mono font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20 shrink-0">
                    <CheckCircle2 className="w-3 h-3" />
                    <span className="hidden sm:inline">Solved</span>
                  </span>
                )}
              </div>
            </div>



            {/* Center: Live CBT Countdown Timer */}
            {(() => {
              const totalAllocatedSeconds = activeTopic.problem.difficulty === 'HARD' ? 2400 : activeTopic.problem.difficulty === 'MEDIUM' ? 1800 : 1200;
              const remainingSeconds = Math.max(0, totalAllocatedSeconds - elapsedSeconds);
              const isUrgent = remainingSeconds < 180;

              return (
                <div
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border font-mono shadow-xs shrink-0 transition-colors ${
                    isUrgent
                      ? 'bg-rose-500/15 border-rose-500/30 text-rose-400'
                      : 'bg-dark-900/90 border-white/10 text-slate-300'
                  }`}
                  title={`Time elapsed: ${formatPracticeTime(elapsedSeconds)} | Total allocated: ${formatPracticeTime(totalAllocatedSeconds)}`}
                >
                  <Clock className={`w-3.5 h-3.5 ${isUrgent ? 'text-rose-400 animate-pulse' : 'text-cyan-400'}`} />
                  <div className="flex items-center gap-1 text-xs">
                    <span className="text-slate-400 text-[10px] uppercase tracking-wider hidden sm:inline">
                      Time Left:
                    </span>
                    <span className={`font-bold tabular-nums ${isUrgent ? 'text-rose-400 font-extrabold' : 'text-white'}`}>
                      {formatPracticeTime(remainingSeconds)}
                    </span>
                  </div>
                  <span className="text-slate-500 text-[10px] hidden md:inline">
                    ({formatPracticeTime(elapsedSeconds)})
                  </span>
                </div>
              );
            })()}

            {/* Right: Palette Toggle + Fullscreen + Actions */}
            <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
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

              <button
                onClick={handleCloseTopic}
                className="p-2 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[var(--bg-surface-hover)] transition cursor-pointer"
                title="Exit workspace"
              >
                <X className="w-4 h-4" />
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
          <div className="flex-1 flex flex-col lg:flex-row overflow-hidden min-h-0 select-text relative">
            
            {/* PANE 1: Problem Description Statement (Left - Compact width to maximize compiler area) */}
            <div
              className={`w-full lg:w-[30%] xl:w-[26%] 2xl:w-[24%] flex flex-col border-b lg:border-b-0 lg:border-r border-[var(--border-line)] overflow-y-auto p-3.5 sm:p-4 space-y-3.5 bg-[var(--bg-panel)] min-h-0 h-full shrink-0 ${
                activeMobileTab === 'statement' ? 'flex-1' : 'hidden lg:flex'
              }`}
            >
              {/* Problem Title & Category Meta */}
              <div className="space-y-1.5">
                <div className="flex items-center gap-2 text-xs font-mono text-[var(--text-muted)]">
                  <span className="font-bold text-emerald-400">Topic {currentTopicIndex + 1} of {currentModuleTopics.length}</span>
                  <span>•</span>
                  <span>{activeTopic.moduleTitle}</span>
                </div>
                <h2 className="text-lg sm:text-xl font-extrabold text-[var(--text-main)]">
                  {activeTopic.problem.title}
                </h2>
              </div>

              {/* Topic Reference (Syntax & Example Box) */}
              <div className="glass-card rounded-2xl p-4 border border-amber-500/30 bg-gradient-to-br from-amber-500/5 via-amber-950/10 to-transparent space-y-3 text-xs font-mono shadow-sm">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-amber-500 font-bold">
                    <Lightbulb className="w-4 h-4 shrink-0 text-amber-500 animate-pulse" />
                    <span>Topic Reference</span>
                  </div>
                  
                  <div className="flex items-center gap-1.5">
                    {/* Copy Code Button */}
                    <button
                      type="button"
                      onClick={() => handleCopyTip(activeTipTab === 'syntax' ? activeTopic.tipBox.syntax : activeTopic.tipBox.example)}
                      className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-mono font-semibold border border-[var(--border-line)] bg-[var(--bg-panel)] text-[var(--text-muted)] hover:text-[var(--text-main)] hover:border-amber-500/50 transition cursor-pointer"
                      title="Copy to clipboard"
                    >
                      {copiedTip ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                      <span>{copiedTip ? 'Copied!' : 'Copy'}</span>
                    </button>

                    {/* Expand to Slide-over Drawer */}
                    <button
                      type="button"
                      onClick={() => setIsTipDrawerOpen(true)}
                      className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-mono font-semibold border border-amber-500/30 bg-amber-500/10 text-amber-500 dark:text-amber-400 hover:bg-amber-500/20 transition cursor-pointer"
                      title="Open full reference drawer"
                    >
                      <ExternalLink className="w-3 h-3" />
                      <span className="hidden sm:inline">Drawer</span>
                    </button>

                    {/* Segmented Switcher */}
                    <div className="flex items-center bg-[var(--bg-main)] p-0.5 rounded-lg border border-[var(--border-line)]">
                      <button
                        type="button"
                        onClick={() => setActiveTipTab('syntax')}
                        className={`px-2.5 py-0.5 rounded text-[10px] font-mono font-bold transition cursor-pointer ${
                          activeTipTab === 'syntax' ? 'bg-amber-500 text-black shadow-xs' : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'
                        }`}
                      >
                        Syntax
                      </button>
                      <button
                        type="button"
                        onClick={() => setActiveTipTab('example')}
                        className={`px-2.5 py-0.5 rounded text-[10px] font-mono font-bold transition cursor-pointer ${
                          activeTipTab === 'example' ? 'bg-amber-500 text-black shadow-xs' : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'
                        }`}
                      >
                        Example
                      </button>
                    </div>
                  </div>
                </div>

                {activeTipTab === 'syntax' && (
                  <pre className="p-3 rounded-xl bg-[var(--bg-main)] text-amber-700 dark:text-amber-300 overflow-x-auto text-xs whitespace-pre-wrap font-mono border border-[var(--border-line)] shadow-inner">
                    {activeTopic.tipBox.syntax}
                  </pre>
                )}
                {activeTipTab === 'example' && (
                  <pre className="p-3 rounded-xl bg-[var(--bg-main)] text-emerald-700 dark:text-emerald-400 overflow-x-auto text-xs whitespace-pre-wrap font-mono border border-[var(--border-line)] shadow-inner">
                    {activeTopic.tipBox.example}
                  </pre>
                )}
              </div>

              {/* Problem Statement Content */}
              <StatementMarkdown content={activeTopic.problem.description} />

              {/* Sample Test Cases */}
              <div className="space-y-4 pt-4 border-t border-[var(--border-line)]">
                <h3 className="text-xs font-mono font-bold tracking-wider text-[var(--text-main)] uppercase">
                  Sample Test Cases
                </h3>
                <div className="glass-card rounded-xl p-3.5 border border-[var(--border-line)] space-y-2 text-xs font-mono">
                  <div className="text-[11px] text-cyan-400 font-semibold">
                    Sample #1 (Visible Test)
                  </div>
                  <div>
                    <span className="text-[var(--text-muted)] block text-[10px] uppercase font-bold">
                      Input
                    </span>
                    <pre className="p-2 rounded bg-[var(--bg-main)] text-[var(--text-main)] overflow-x-auto mt-0.5 border border-[var(--border-line)]">
                      {activeTopic.problem.openTestCase.input}
                    </pre>
                  </div>
                  <div>
                    <span className="text-[var(--text-muted)] block text-[10px] uppercase font-bold">
                      Expected Output
                    </span>
                    <pre className="p-2 rounded bg-[var(--bg-main)] text-emerald-600 dark:text-emerald-400 overflow-x-auto mt-0.5 font-bold border border-[var(--border-line)]">
                      {activeTopic.problem.openTestCase.expectedOutput}
                    </pre>
                  </div>
                  {activeTopic.problem.openTestCase.explanation && (
                    <div className="text-[var(--text-muted)] font-sans text-xs pt-1 border-t border-[var(--border-line)]">
                      <span className="font-semibold text-[var(--text-main)]">Explanation: </span>
                      {activeTopic.problem.openTestCase.explanation}
                    </div>
                  )}
                </div>

                <div className="p-3 rounded-xl bg-[var(--bg-surface)] border border-dashed border-[var(--border-line)] flex items-center gap-2 text-xs font-mono text-[var(--text-muted)]">
                  <ShieldCheck className="w-4 h-4 text-cyan-600 dark:text-cyan-400 shrink-0" />
                  <span>Hidden edge cases are evaluated automatically when you submit.</span>
                </div>
              </div>
            </div>

            {/* PANE 2: Code Editor + Custom Stdin & Verdict Drawer (Center - Expanded) */}
            <div
              className={`flex-1 min-w-0 flex flex-col min-h-0 h-full bg-[var(--bg-main)] ${
                activeMobileTab === 'statement' ? 'hidden lg:flex' : 'flex-1 flex'
              }`}
            >
              {/* Editor Container */}
              <div className="flex-1 min-h-0 relative overflow-hidden bg-[var(--bg-panel)]">
                <CodeEditor
                  code={code}
                  onChange={handleCodeChange}
                  readOnly={false}
                  disableCopyPaste={true}
                />
              </div>

              {/* Bottom Drawer: Custom Stdin & Verdict Terminal */}
              <div className="border-t border-[var(--border-line)] bg-[var(--bg-surface)] flex flex-col shrink-0">
                <div className="h-10 px-4 flex items-center justify-between border-b border-[var(--border-line)]/60">
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => {
                        setActiveBottomTab('custom');
                        setIsDrawerOpen(true);
                      }}
                      className={`px-3 py-1 text-xs font-mono rounded-md transition-colors cursor-pointer ${
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
                      className={`px-3 py-1 text-xs font-mono rounded-md transition-colors flex items-center gap-1.5 cursor-pointer ${
                        activeBottomTab === 'output' && isDrawerOpen
                          ? 'bg-[var(--bg-surface)] text-[var(--accent)] font-semibold border border-[var(--border-line)]'
                          : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'
                      }`}
                    >
                      <span>Verdict &amp; Output</span>
                      {runResult && (
                        <span className={`w-2 h-2 rounded-full ${runResult.success ? 'bg-emerald-400' : 'bg-rose-400'}`} />
                      )}
                      {submitResult && (
                        <span className={`w-2 h-2 rounded-full ${submitResult.allPassed ? 'bg-emerald-400' : 'bg-rose-400'}`} />
                      )}
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={() => setIsDrawerOpen(!isDrawerOpen)}
                    className="p-1 rounded text-[var(--text-muted)] hover:text-[var(--text-main)] cursor-pointer"
                    title={isDrawerOpen ? 'Collapse drawer' : 'Expand drawer'}
                  >
                    {isDrawerOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
                  </button>
                </div>

                {isDrawerOpen && (
                  <div className="h-48 sm:h-56 p-3 overflow-y-auto font-mono text-xs">
                    {activeBottomTab === 'custom' ? (
                      <div className="h-full flex flex-col space-y-1.5">
                        <label className="text-[10px] uppercase text-[var(--text-muted)] font-bold">
                          Standard Input (passed to stdin for Compile &amp; Run):
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
                        {runResult && (
                          <motion.div
                            initial={{ opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="space-y-2.5"
                          >
                            <div className="flex items-center justify-between">
                              <span className={`px-2.5 py-1 rounded-lg text-[11px] font-bold flex items-center gap-1.5 shadow-xs ${
                                runResult.success
                                  ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30'
                                  : 'bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/30'
                              }`}>
                                {runResult.success ? <CheckCircle2 className="w-3.5 h-3.5" /> : <X className="w-3.5 h-3.5" />}
                                <span>{runResult.success ? 'SAMPLE TEST: PASSED' : 'SAMPLE TEST: FAILED'}</span>
                              </span>
                              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[var(--bg-main)] border border-[var(--border-line)] text-[var(--text-muted)]">
                                ⚡ {runResult.executionTimeMs || '< 10'}ms
                              </span>
                            </div>

                            {runResult.actualOutput !== undefined && (
                              <div className="grid grid-cols-2 gap-2 text-xs">
                                <div className="p-2.5 rounded-xl bg-[var(--bg-main)] border border-[var(--border-line)]">
                                  <div className="text-[10px] text-[var(--text-muted)] font-bold uppercase mb-0.5">Your Output:</div>
                                  <pre className={`text-xs whitespace-pre-wrap font-mono ${runResult.success ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400 font-bold'}`}>
                                    {runResult.actualOutput || '(No output)'}
                                  </pre>
                                </div>
                                <div className="p-2.5 rounded-xl bg-[var(--bg-main)] border border-[var(--border-line)]">
                                  <div className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold uppercase mb-0.5">Expected Output:</div>
                                  <pre className="text-xs text-emerald-600 dark:text-emerald-400 whitespace-pre-wrap font-bold font-mono">
                                    {runResult.expectedOutput}
                                  </pre>
                                </div>
                              </div>
                            )}

                            {runResult.compileError && (
                              <div className="space-y-2">
                                <pre className="text-rose-600 dark:text-rose-400 text-xs bg-rose-500/10 p-2.5 rounded-lg border border-rose-500/20 whitespace-pre-wrap">
                                  {runResult.compileError}
                                </pre>
                                <GccFriendlyHintCard compileOutput={runResult.compileError} />
                              </div>
                            )}
                          </motion.div>
                        )}

                        {submitResult && (
                          <motion.div
                            initial={{ opacity: 0, scale: 0.98 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="space-y-2.5"
                          >
                            <div className="flex items-center justify-between">
                              <span className={`px-2.5 py-1 rounded-lg text-[11px] font-bold inline-flex items-center gap-1.5 shadow-xs ${
                                submitResult.allPassed
                                  ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30'
                                  : 'bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/30'
                              }`}>
                                {submitResult.allPassed ? <Sparkles className="w-3.5 h-3.5 text-emerald-500" /> : <X className="w-3.5 h-3.5 text-rose-500" />}
                                <span>{submitResult.allPassed ? 'ALL 2/2 TESTS PASSED — TOPIC MASTERED!' : 'SUBMISSION FAILED'}</span>
                              </span>
                              {submitResult.allPassed && (
                                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-500 border border-emerald-500/30">
                                  +50 XP
                                </span>
                              )}
                            </div>
                            <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                              <div className={`p-2.5 rounded-xl border flex items-center justify-between ${submitResult.openPassed ? 'bg-emerald-500/5 border-emerald-500/20 text-emerald-600 dark:text-emerald-400' : 'bg-rose-500/5 border-rose-500/20 text-rose-600 dark:text-rose-400'}`}>
                                <span>Open Test #1</span>
                                <strong>{submitResult.openPassed ? 'Passed ✓' : 'Failed ✗'}</strong>
                              </div>
                              <div className={`p-2.5 rounded-xl border flex items-center justify-between ${submitResult.hiddenPassed ? 'bg-emerald-500/5 border-emerald-500/20 text-emerald-600 dark:text-emerald-400' : 'bg-rose-500/5 border-rose-500/20 text-rose-600 dark:text-rose-400'}`}>
                                <span>Hidden Test #2</span>
                                <strong>{submitResult.hiddenPassed ? 'Passed ✓' : 'Failed ✗'}</strong>
                              </div>
                            </div>
                            {submitResult.compileError && (
                              <div className="space-y-2">
                                <pre className="text-rose-600 dark:text-rose-400 text-xs bg-rose-500/10 p-2.5 rounded-lg border border-rose-500/20 whitespace-pre-wrap">
                                  {submitResult.compileError}
                                </pre>
                                <GccFriendlyHintCard compileOutput={submitResult.compileError} />
                              </div>
                            )}
                          </motion.div>
                        )}

                        {!runResult && !submitResult && (
                          <div className="text-[var(--text-muted)] text-xs py-8 text-center space-y-1">
                            <div>Click <strong>Compile &amp; Run</strong> to test and verify your solution.</div>
                            <div className="text-[11px] text-[var(--text-muted)]">When all test cases pass, you will automatically advance to the next question!</div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* PANE 3: Authentic JEE Question Palette (Right) */}
            {isDesktopPaletteOpen && (
              <div className="hidden xl:flex w-72 2xl:w-80 shrink-0 border-l border-[var(--border-line)] bg-[var(--bg-panel)] flex-col h-full overflow-hidden">
                {renderPaletteContent(false)}
              </div>
            )}

            {/* Floating edge tab to reopen Question Palette when collapsed on desktop */}
            {!isDesktopPaletteOpen && (
              <button
                type="button"
                onClick={() => setIsDesktopPaletteOpen(true)}
                className="hidden xl:flex fixed right-0 top-1/2 -translate-y-1/2 z-30 bg-[var(--bg-panel)] border border-r-0 border-[var(--border-line)] py-3 px-1.5 rounded-l-xl text-xs font-mono font-bold text-cyan-400 hover:text-white hover:bg-[var(--bg-surface-hover)] shadow-xl transition-all cursor-pointer flex-col items-center gap-1.5"
                title="Open 25-Question Palette"
              >
                <ChevronLeft className="w-4 h-4 text-cyan-400" />
                <span className="[writing-mode:vertical-lr] text-[11px] tracking-wider uppercase">
                  Palette ({moduleSolvedCount}/{currentModuleTopics.length})
                </span>
              </button>
            )}

          </div>

          {/* Bottom JEE Action Bar */}
          <div className="h-14 border-t border-[var(--border-line)] bg-[var(--bg-panel)] px-4 sm:px-6 flex items-center justify-end shrink-0 z-20 gap-2 select-none">
            {/* Primary Action: Compile & Run */}
            <button
              type="button"
              onClick={handleRunOpenTest}
              disabled={isRunning}
              className="px-6 sm:px-8 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-mono font-bold transition flex items-center gap-2 disabled:opacity-50 shadow-md shadow-emerald-600/20 cursor-pointer"
            >
              <Play className="w-3.5 h-3.5 fill-white text-white" />
              <span>{isRunning ? 'Compiling & Running...' : 'Compile & Run'}</span>
            </button>
          </div>

          {/* Mobile Question Palette Slide-Over Drawer */}
          {isMobilePaletteOpen && (
            <div className="fixed inset-0 z-[9999999] flex justify-end bg-black/70 backdrop-blur-xs xl:hidden animate-in fade-in duration-150">
              <div className="w-80 max-w-[85vw] h-full shadow-2xl bg-[var(--bg-panel)] flex flex-col animate-in slide-in-from-right duration-200">
                <div className="p-3 border-b border-[var(--border-line)] flex items-center justify-between bg-[var(--bg-surface)]">
                  <span className="font-mono text-xs font-bold text-[var(--text-main)] flex items-center gap-1.5">
                    <LayoutGrid className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Module {activeTopic.moduleIndex} Palette</span>
                  </span>
                  <button
                    onClick={() => setIsMobilePaletteOpen(false)}
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
                      Topic Mastered! (+50 XP)
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
