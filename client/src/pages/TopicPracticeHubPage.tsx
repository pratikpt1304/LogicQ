import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
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
  Send,
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
  Search,
  Clock,
  Check,
  ChevronDown,
  ChevronUp,
  ChevronLeft,
} from 'lucide-react';
import { TOPIC_PRACTICE_DATA, TopicPracticeItem } from '../data/topic-practice.data.js';
import { CodeEditor } from '../components/editor/CodeEditor.js';
import { RaiseIssueModal } from '../components/common/RaiseIssueModal.js';
import { StatementMarkdown } from '../components/common/StatementMarkdown.js';
import { api } from '../api/client.js';

const STORAGE_KEY = 'logicq_solved_practice_topics';

export function getSolvedPracticeTopicIds(): string[] {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
  } catch {
    return [];
  }
}

export function markPracticeTopicSolved(topicId: string): void {
  try {
    const list = getSolvedPracticeTopicIds();
    if (!list.includes(topicId)) {
      list.push(topicId);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
    }
  } catch {}
}

export const TopicPracticeHubPage: React.FC = () => {
  const [selectedModuleFilter, setSelectedModuleFilter] = useState<number>(0); // 0 = all
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'UNSOLVED' | 'SOLVED'>('ALL');
  const [difficultyFilter, setDifficultyFilter] = useState<'ALL' | 'EASY' | 'MEDIUM' | 'HARD'>('ALL');
  const [activeTopic, setActiveTopic] = useState<TopicPracticeItem | null>(null);
  const [solvedTopics, setSolvedTopics] = useState<string[]>(getSolvedPracticeTopicIds());

  // Workspace modal state
  const [code, setCode] = useState<string>('');
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [runResult, setRunResult] = useState<any>(null);
  const [submitResult, setSubmitResult] = useState<any>(null);
  const [leftPanelTab, setLeftPanelTab] = useState<'problem' | 'tips'>('problem');
  const [activeTipTab, setActiveTipTab] = useState<'syntax' | 'app' | 'example'>('syntax');
  const [isTipOpen, setIsTipOpen] = useState<boolean>(false);
  const [isIssueModalOpen, setIsIssueModalOpen] = useState<boolean>(false);

  // Computed navigation between topics
  const currentTopicIndex = activeTopic
    ? TOPIC_PRACTICE_DATA.findIndex((t) => t.id === activeTopic.id)
    : -1;
  const prevTopic = currentTopicIndex > 0 ? TOPIC_PRACTICE_DATA[currentTopicIndex - 1] : null;
  const nextTopic =
    currentTopicIndex >= 0 && currentTopicIndex < TOPIC_PRACTICE_DATA.length - 1
      ? TOPIC_PRACTICE_DATA[currentTopicIndex + 1]
      : null;

  // Sync solved topics
  useEffect(() => {
    setSolvedTopics(getSolvedPracticeTopicIds());
  }, []);

  const handleOpenTopic = (topic: TopicPracticeItem) => {
    setActiveTopic(topic);
    setCode(topic.problem.starterCode);
    setRunResult(null);
    setSubmitResult(null);
    setIsTipOpen(false);
    setLeftPanelTab('problem');
  };

  const handleCloseTopic = () => {
    setActiveTopic(null);
  };

  // Run visible test case
  const handleRunOpenTest = async () => {
    if (!activeTopic) return;
    setIsRunning(true);
    setRunResult(null);
    setSubmitResult(null);

    try {
      const res = await api.post('/problems/run', {
        code,
        input: activeTopic.problem.openTestCase.input,
      });

      const actualOut = (res.output || res.stdout || '').trim();
      const expectedOut = activeTopic.problem.openTestCase.expectedOutput.trim();
      const isPassed = actualOut === expectedOut;

      setRunResult({
        success: isPassed,
        actualOutput: actualOut,
        expectedOutput: expectedOut,
        compileError: res.compileError || res.error,
        executionTimeMs: res.executionTimeMs || 12,
      });

      if (isPassed) {
        toast.success('Open Test Case Passed! Click Submit to test hidden case.');
      } else {
        toast.error('Open Test Case Mismatch. Check your logic and try again.');
      }
    } catch (err: any) {
      setRunResult({
        success: false,
        compileError: err?.message || 'Execution error in GCC sandbox',
      });
      toast.error('Compilation or execution error.');
    } finally {
      setIsRunning(false);
    }
  };

  // Submit code (Runs BOTH Open & Hidden Test Cases)
  const handleSubmitCode = async () => {
    if (!activeTopic) return;
    setIsSubmitting(true);
    setSubmitResult(null);

    try {
      // 1. Run open test
      const resOpen = await api.post('/problems/run', {
        code,
        input: activeTopic.problem.openTestCase.input,
      });
      const openPassed = (resOpen.output || resOpen.stdout || '').trim() === activeTopic.problem.openTestCase.expectedOutput.trim();

      // 2. Run hidden test
      const resHidden = await api.post('/problems/run', {
        code,
        input: activeTopic.problem.hiddenTestCase.input,
      });
      const hiddenPassed = (resHidden.output || resHidden.stdout || '').trim() === activeTopic.problem.hiddenTestCase.expectedOutput.trim();

      const allPassed = openPassed && hiddenPassed;

      setSubmitResult({
        openPassed,
        hiddenPassed,
        allPassed,
        compileError: resOpen.compileError || resHidden.compileError || resOpen.error || resHidden.error,
      });

      if (allPassed) {
        markPracticeTopicSolved(activeTopic.id);
        setSolvedTopics(getSolvedPracticeTopicIds());
        confetti({ particleCount: 80, spread: 60, origin: { y: 0.7 } });
        toast.success(`🎉 Topic Mastered: "${activeTopic.topicTitle}"!`);
      } else {
        toast.error('Failed hidden test case. Review edge cases and try again!');
      }
    } catch (err: any) {
      setSubmitResult({
        allPassed: false,
        compileError: err?.message || 'Submission execution failed.',
      });
      toast.error('Submission failed.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Filter topics
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

  // Module Counts
  const moduleCounts = [
    { idx: 0, label: 'All Topics', count: totalTopics },
    { idx: 1, label: 'Control Flow', count: TOPIC_PRACTICE_DATA.filter((t) => t.moduleIndex === 1).length },
    { idx: 2, label: 'Pointers & Functions', count: TOPIC_PRACTICE_DATA.filter((t) => t.moduleIndex === 2).length },
    { idx: 3, label: 'Arrays & Strings', count: TOPIC_PRACTICE_DATA.filter((t) => t.moduleIndex === 3).length },
    { idx: 4, label: 'Structs & Memory', count: TOPIC_PRACTICE_DATA.filter((t) => t.moduleIndex === 4).length },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6 font-sans animate-fadeIn">
      {/* 1. Header Banner (Clean, Focused, Not Scary) */}
      <div className="glass-card p-6 sm:p-7 rounded-2xl border border-[var(--border-line)] bg-[var(--bg-panel)] shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-1.5">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-mono font-bold">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Self-Paced Practice Arena</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-[var(--text-main)] tracking-tight">
              Topic Practice
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

      {/* 2. Search & Filter Bar (Kam Ki Cheezein) */}
      <div className="space-y-3">
        <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
          {/* Search Box */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-[var(--text-muted)] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search topics or problems (e.g. pointers, loops, arrays, recursion)..."
              className="w-full pl-10 pr-9 py-2.5 rounded-xl border border-[var(--border-line)] bg-[var(--bg-panel)] text-[var(--text-main)] placeholder-[var(--text-muted)] text-xs font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500/30 transition"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--text-main)] p-1 text-xs"
              >
                ✕
              </button>
            )}
          </div>

          {/* Right Controls: Status & Difficulty Filters */}
          <div className="flex flex-wrap items-center gap-2 shrink-0 self-start sm:self-auto">
            {/* Status Segmented Filter */}
            <div className="inline-flex items-center gap-1 bg-[var(--bg-panel)] p-1 rounded-xl border border-[var(--border-line)]">
              <button
                onClick={() => setStatusFilter('ALL')}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-mono font-semibold transition ${
                  statusFilter === 'ALL'
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'
                }`}
              >
                All ({totalTopics})
              </button>
              <button
                onClick={() => setStatusFilter('UNSOLVED')}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-mono font-semibold transition ${
                  statusFilter === 'UNSOLVED'
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'
                }`}
              >
                To Do ({totalTopics - solvedCount})
              </button>
              <button
                onClick={() => setStatusFilter('SOLVED')}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-mono font-semibold transition ${
                  statusFilter === 'SOLVED'
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'
                }`}
              >
                Solved ({solvedCount})
              </button>
            </div>

            {/* Difficulty Filter */}
            <div className="inline-flex items-center gap-1 bg-[var(--bg-panel)] p-1 rounded-xl border border-[var(--border-line)]">
              <button
                onClick={() => setDifficultyFilter('ALL')}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-mono font-semibold transition ${
                  difficultyFilter === 'ALL'
                    ? 'bg-slate-700 text-white shadow-sm'
                    : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'
                }`}
              >
                All Diff
              </button>
              <button
                onClick={() => setDifficultyFilter('EASY')}
                className={`px-2 py-1.5 rounded-lg text-xs font-mono font-semibold transition ${
                  difficultyFilter === 'EASY'
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'text-emerald-400 hover:text-emerald-300'
                }`}
              >
                Easy
              </button>
              <button
                onClick={() => setDifficultyFilter('MEDIUM')}
                className={`px-2 py-1.5 rounded-lg text-xs font-mono font-semibold transition ${
                  difficultyFilter === 'MEDIUM'
                    ? 'bg-amber-600 text-white shadow-sm'
                    : 'text-amber-400 hover:text-amber-300'
                }`}
              >
                Med
              </button>
              <button
                onClick={() => setDifficultyFilter('HARD')}
                className={`px-2 py-1.5 rounded-lg text-xs font-mono font-semibold transition flex items-center gap-1 ${
                  difficultyFilter === 'HARD'
                    ? 'bg-rose-600 text-white shadow-sm'
                    : 'text-rose-400 hover:text-rose-300'
                }`}
              >
                <Flame className="w-3 h-3 text-rose-400" />
                <span>Hard</span>
              </button>
            </div>
          </div>
        </div>

        {/* Module Category Pills */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
          {moduleCounts.map((m) => {
            const active = selectedModuleFilter === m.idx;
            return (
              <button
                key={m.idx}
                onClick={() => setSelectedModuleFilter(m.idx)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-mono transition whitespace-nowrap flex items-center gap-1.5 ${
                  active
                    ? 'bg-indigo-600 text-white font-bold shadow-sm'
                    : 'border border-[var(--border-line)] bg-[var(--bg-panel)] text-[var(--text-muted)] hover:text-[var(--text-main)] font-medium'
                }`}
              >
                <span>{m.label}</span>
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${active ? 'bg-white/20 text-white' : 'bg-[var(--bg-surface)] text-[var(--text-muted)]'}`}>
                  {m.count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 3. Topics Grid (Clean, Card Hierarchy) */}
      {filteredTopics.length === 0 ? (
        <div className="text-center py-16 bg-[var(--bg-panel)] rounded-2xl border border-[var(--border-line)] space-y-3">
          <Code2 className="w-10 h-10 text-[var(--text-muted)] mx-auto opacity-50" />
          <h3 className="text-base font-bold text-[var(--text-main)]">No Practice Topics Found</h3>
          <p className="text-xs text-[var(--text-muted)] max-w-sm mx-auto">
            No topics matched your search or filter. Try clearing the search or changing the filter.
          </p>
          <button
            onClick={() => {
              setSearchQuery('');
              setSelectedModuleFilter(0);
              setStatusFilter('ALL');
              setDifficultyFilter('ALL');
            }}
            className="px-4 py-2 text-xs font-mono font-bold rounded-xl bg-emerald-600 text-white hover:bg-emerald-500 transition"
          >
            Reset Filters
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredTopics.map((topic) => {
            const isSolved = solvedTopics.includes(topic.id);
            const isHard = topic.problem.difficulty === 'HARD';
            const isMedium = topic.problem.difficulty === 'MEDIUM';

            return (
              <div
                key={topic.id}
                onClick={() => handleOpenTopic(topic)}
                className={`p-5 rounded-2xl border transition flex flex-col justify-between cursor-pointer group hover:shadow-lg ${
                  isSolved
                    ? 'border-emerald-500/30 bg-emerald-500/5 hover:border-emerald-500/60'
                    : isHard
                    ? 'border-rose-500/30 bg-rose-500/5 hover:border-rose-500/60'
                    : 'border-[var(--border-line)] bg-[var(--bg-panel)] hover:border-indigo-500/50'
                }`}
              >
                <div className="space-y-3">
                  {/* Top Row: Module Badge + Difficulty / Time */}
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-[var(--bg-surface)] text-indigo-400 border border-[var(--border-line)]">
                      {topic.moduleTitle.split(':')[0]}
                    </span>

                    <span
                      className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full border flex items-center gap-1 ${
                        isHard
                          ? 'bg-rose-500/15 text-rose-400 border-rose-500/30'
                          : isMedium
                          ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                          : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                      }`}
                    >
                      {isHard ? <Flame className="w-3 h-3 text-rose-400" /> : <Clock className="w-3 h-3" />}
                      {topic.problem.difficulty} • {isHard ? '~20m' : isMedium ? '~10m' : '~5m'}
                    </span>
                  </div>

                  {/* Main Titles */}
                  <div>
                    <h3 className="font-bold text-sm text-[var(--text-main)] group-hover:text-indigo-400 transition leading-snug">
                      {topic.topicTitle}
                    </h3>

                    {/* Direct Problem Name */}
                    <div className="mt-2 flex items-center gap-1.5 text-xs font-mono font-medium text-emerald-400/90 truncate">
                      <Code2 className="w-3.5 h-3.5 shrink-0" />
                      <span className="truncate">{topic.problem.title}</span>
                    </div>

                    {/* Clean plain description */}
                    <p className="text-xs text-[var(--text-muted)] line-clamp-2 mt-1.5 leading-relaxed">
                      {topic.summary}
                    </p>
                  </div>
                </div>

                {/* Bottom Row: Tip Box indicator + Action Status */}
                <div className="pt-4 mt-4 border-t border-[var(--border-line)] flex items-center justify-between text-xs font-mono">
                  <span className="text-amber-400/90 text-[11px] font-medium flex items-center gap-1">
                    <Lightbulb className="w-3.5 h-3.5 text-amber-400" />
                    <span>Syntax Tip</span>
                  </span>

                  {isSolved ? (
                    <span className="inline-flex items-center gap-1 text-[11px] font-mono font-bold text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-lg border border-emerald-500/20">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Solved
                    </span>
                  ) : (
                    <span className="font-bold text-indigo-400 group-hover:text-indigo-300 group-hover:translate-x-1 transition flex items-center gap-1">
                      <span>Practice</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 4. FULL-SCREEN DEDICATED CODING WORKSPACE */}
      {activeTopic && (
        <div className="fixed top-0 left-0 right-0 bottom-0 w-screen h-screen z-[100] bg-[var(--bg-main)] flex flex-col overflow-hidden animate-fadeIn select-none">
          
          {/* Topbar: Minimalist & Clean */}
          <div className="h-14 px-4 border-b border-[var(--border-line)] bg-[var(--bg-panel)] flex items-center justify-between shrink-0 select-none">
            
            {/* Left: Back to Hub + Problem Identity */}
            <div className="flex items-center gap-3">
              <button
                onClick={handleCloseTopic}
                className="px-3 py-1.5 rounded-lg border border-[var(--border-line)] bg-[var(--bg-surface)] hover:bg-[var(--bg-surface-hover)] text-[var(--text-main)] text-xs font-mono font-medium transition flex items-center gap-1.5"
                title="Return to Practice Arena"
              >
                <ArrowLeft className="w-3.5 h-3.5 text-[var(--text-muted)]" />
                <span className="hidden sm:inline font-bold">Practice Hub</span>
              </button>

              <div className="h-4 w-[1px] bg-[var(--border-line)] hidden sm:block" />

              <div className="flex items-center gap-2">
                <span className="text-xs sm:text-sm font-bold text-[var(--text-main)] max-w-[200px] sm:max-w-md truncate">
                  {activeTopic.topicTitle}
                </span>

                <span
                  className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full border ${
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
                  <span className="hidden md:inline-flex items-center gap-1 text-[10px] font-mono font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                    <CheckCircle2 className="w-3 h-3" />
                    Solved
                  </span>
                )}
              </div>
            </div>

            {/* Center: Prev / Next Problem Navigator */}
            <div className="flex items-center gap-1 bg-[var(--bg-surface)] p-1 rounded-xl border border-[var(--border-line)]">
              <button
                onClick={() => prevTopic && handleOpenTopic(prevTopic)}
                disabled={!prevTopic}
                title={prevTopic ? `Previous: ${prevTopic.topicTitle}` : 'No previous topic'}
                className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-main)] disabled:opacity-30 transition"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="text-xs font-mono px-2 text-[var(--text-main)] font-semibold whitespace-nowrap">
                {currentTopicIndex + 1} / {TOPIC_PRACTICE_DATA.length}
              </span>
              <button
                onClick={() => nextTopic && handleOpenTopic(nextTopic)}
                disabled={!nextTopic}
                title={nextTopic ? `Next: ${nextTopic.topicTitle}` : 'No next topic'}
                className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-main)] disabled:opacity-30 transition"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            {/* Right: Actions */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsIssueModalOpen(true)}
                className="p-2 rounded-lg text-[var(--text-muted)] hover:text-rose-500 hover:bg-rose-500/10 transition"
                title="Report issue with problem or test cases"
              >
                <Flag className="w-4 h-4" />
              </button>

              <button
                onClick={handleCloseTopic}
                className="p-2 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[var(--bg-surface-hover)] transition"
                title="Exit workspace"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

          </div>

          {/* Workspace Body: 2 Split Panels */}
          <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 overflow-hidden select-text">
            
            {/* LEFT COLUMN: Problem Specification & Tabs (5 cols) */}
            <div className="lg:col-span-5 flex flex-col h-full bg-[var(--bg-panel)] border-r border-[var(--border-line)] overflow-hidden">
              
              {/* Tab Selector */}
              <div className="px-5 border-b border-[var(--border-line)] bg-[var(--bg-panel)] flex items-center gap-4 shrink-0">
                <button
                  onClick={() => setLeftPanelTab('problem')}
                  className={`py-3 text-xs font-mono font-bold border-b-2 transition flex items-center gap-1.5 ${
                    leftPanelTab === 'problem'
                      ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
                      : 'border-transparent text-[var(--text-muted)] hover:text-[var(--text-main)]'
                  }`}
                >
                  <BookOpen className="w-3.5 h-3.5" />
                  <span>Problem Statement</span>
                </button>

                <button
                  onClick={() => setLeftPanelTab('tips')}
                  className={`py-3 text-xs font-mono font-bold border-b-2 transition flex items-center gap-1.5 ${
                    leftPanelTab === 'tips'
                      ? 'border-amber-500 text-amber-600 dark:text-amber-400'
                      : 'border-transparent text-[var(--text-muted)] hover:text-[var(--text-main)]'
                  }`}
                >
                  <Lightbulb className="w-3.5 h-3.5" />
                  <span>Syntax Cheat Sheet</span>
                </button>
              </div>

              {/* Tab Content: Problem */}
              {leftPanelTab === 'problem' && (
                <div className="flex-1 overflow-y-auto p-6 space-y-6">
                  <div>
                    <h1 className="text-xl font-bold text-[var(--text-main)] tracking-tight">
                      {activeTopic.problem.title}
                    </h1>
                    <p className="text-xs text-[var(--text-muted)] font-mono mt-1">
                      {activeTopic.summary}
                    </p>
                  </div>

                  {/* Clean Markdown rendering adhering to theme text colors */}
                  <div className="text-[var(--text-main)] text-sm leading-relaxed">
                    <StatementMarkdown content={activeTopic.problem.description} />
                  </div>

                  {/* Standard LeetCode-style Example Card */}
                  <div className="space-y-2 pt-3 border-t border-[var(--border-line)]">
                    <div className="text-xs font-mono font-bold uppercase tracking-wider text-[var(--text-muted)]">
                      Sample Testcase (Visible):
                    </div>
                    <div className="p-4 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-line)] font-mono text-xs space-y-2.5">
                      <div>
                        <span className="text-[var(--text-muted)] font-bold block text-[11px] uppercase tracking-wider">Input:</span>
                        <pre className="text-[var(--text-main)] mt-1 p-2.5 rounded-lg bg-[var(--bg-panel)] border border-[var(--border-line)] whitespace-pre-wrap font-mono">
                          {activeTopic.problem.openTestCase.input}
                        </pre>
                      </div>
                      <div>
                        <span className="text-emerald-600 dark:text-emerald-400 font-bold block text-[11px] uppercase tracking-wider">Expected Output:</span>
                        <pre className="text-emerald-600 dark:text-emerald-400 mt-1 p-2.5 rounded-lg bg-[var(--bg-panel)] border border-[var(--border-line)] font-bold whitespace-pre-wrap font-mono">
                          {activeTopic.problem.openTestCase.expectedOutput}
                        </pre>
                      </div>
                      {activeTopic.problem.openTestCase.explanation && (
                        <div className="text-[var(--text-muted)] font-sans text-xs pt-2 border-t border-[var(--border-line)]">
                          <span className="text-[var(--text-main)] font-semibold">Explanation: </span>
                          {activeTopic.problem.openTestCase.explanation}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Subtle Hidden Case Info */}
                  <div className="p-3 rounded-xl bg-[var(--bg-surface)] border border-dashed border-[var(--border-line)] flex items-center gap-2 text-xs font-mono text-[var(--text-muted)]">
                    <ShieldCheck className="w-4 h-4 text-cyan-600 dark:text-cyan-400 shrink-0" />
                    <span>Additional hidden edge cases are evaluated upon clicking <strong>Submit Solution</strong>.</span>
                  </div>
                </div>
              )}

              {/* Tab Content: Tips */}
              {leftPanelTab === 'tips' && (
                <div className="flex-1 overflow-y-auto p-6 space-y-5">
                  <div className="flex items-center gap-1 bg-[var(--bg-surface)] p-1 rounded-lg border border-[var(--border-line)] w-fit">
                    <button
                      onClick={() => setActiveTipTab('syntax')}
                      className={`px-3 py-1 rounded text-xs font-mono font-bold transition ${
                        activeTipTab === 'syntax' ? 'bg-amber-500 text-black' : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'
                      }`}
                    >
                      Syntax
                    </button>
                    <button
                      onClick={() => setActiveTipTab('app')}
                      className={`px-3 py-1 rounded text-xs font-mono font-bold transition ${
                        activeTipTab === 'app' ? 'bg-amber-500 text-black' : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'
                      }`}
                    >
                      Real-world Use
                    </button>
                    <button
                      onClick={() => setActiveTipTab('example')}
                      className={`px-3 py-1 rounded text-xs font-mono font-bold transition ${
                        activeTipTab === 'example' ? 'bg-amber-500 text-black' : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'
                      }`}
                    >
                      Full Example
                    </button>
                  </div>

                  <div className="text-xs text-[var(--text-main)] font-mono leading-relaxed">
                    {activeTipTab === 'syntax' && (
                      <div className="space-y-2">
                        <div className="text-[11px] font-bold text-amber-600 dark:text-amber-400 uppercase font-mono">C Syntax Blueprint:</div>
                        <pre className="p-4 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-line)] text-amber-700 dark:text-amber-300 overflow-x-auto text-xs">
                          {activeTopic.tipBox.syntax}
                        </pre>
                      </div>
                    )}
                    {activeTipTab === 'app' && (
                      <div className="space-y-2">
                        <div className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400 uppercase font-mono">Industry Application:</div>
                        <div className="p-4 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-line)] text-[var(--text-muted)] font-sans text-xs leading-relaxed">
                          {activeTopic.tipBox.application}
                        </div>
                      </div>
                    )}
                    {activeTipTab === 'example' && (
                      <div className="space-y-2">
                        <div className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 uppercase font-mono">Working Implementation:</div>
                        <pre className="p-4 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-line)] text-emerald-700 dark:text-emerald-300 overflow-x-auto text-xs">
                          {activeTopic.tipBox.example}
                        </pre>
                      </div>
                    )}
                  </div>
                </div>
              )}

            </div>

            {/* RIGHT COLUMN: Full-Height Code Editor & Console (7 cols) */}
            <div className="lg:col-span-7 flex flex-col h-full bg-[var(--bg-panel)] overflow-hidden">
              
              {/* Editor Top Bar */}
              <div className="px-4 py-2 border-b border-[var(--border-line)] bg-[var(--bg-surface)] flex items-center justify-between text-xs font-mono shrink-0">
                <div className="flex items-center gap-2">
                  <FileCode className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
                  <span className="text-[var(--text-main)] font-bold">solution.c</span>
                  <span className="text-[10px] text-[var(--text-muted)] bg-[var(--bg-panel)] px-1.5 py-0.5 rounded border border-[var(--border-line)]">
                    C11 (GCC 14)
                  </span>
                </div>

                <button
                  onClick={() => setCode(activeTopic.problem.starterCode)}
                  className="flex items-center gap-1 text-[var(--text-muted)] hover:text-[var(--text-main)] transition text-xs font-mono"
                  title="Reset code to original starter boilerplate"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>Reset Code</span>
                </button>
              </div>

              {/* Full-Height Monaco Code Editor Area */}
              <div className="flex-1 min-h-[260px] relative overflow-hidden bg-[var(--bg-panel)]">
                <CodeEditor
                  code={code}
                  onChange={(val) => setCode(val || '')}
                  onRun={handleRunOpenTest}
                  onSubmit={handleSubmitCode}
                  onReset={() => setCode(activeTopic.problem.starterCode)}
                  isRunning={isRunning}
                  isSubmitting={isSubmitting}
                  disableCopyPaste={false}
                />
              </div>

              {/* Output Console / Test Verdict Panel */}
              <div className="max-h-56 overflow-y-auto shrink-0 border-t border-[var(--border-line)] bg-[var(--bg-surface)] p-4 font-mono text-xs space-y-2">
                <div className="flex items-center justify-between text-[11px] text-[var(--text-muted)] pb-1 border-b border-[var(--border-line)]">
                  <span className="flex items-center gap-1.5">
                    <Terminal className="w-3.5 h-3.5 text-emerald-500" />
                    <span className="font-bold text-[var(--text-main)]">Execution Output &amp; Verdicts</span>
                  </span>
                  <span className="text-[10px] text-[var(--text-muted)]">Shortcut: <kbd className="px-1 py-0.5 bg-[var(--bg-panel)] border border-[var(--border-line)] rounded text-[var(--text-main)]">Ctrl + Enter</kbd> to run</span>
                </div>

                {runResult && (
                  <div className="space-y-2 pt-1">
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                        runResult.success ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30' : 'bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/30'
                      }`}>
                        {runResult.success ? '✓ VISIBLE TEST PASSED' : '✗ TEST MISMATCH'}
                      </span>
                      <span className="text-[10px] text-[var(--text-muted)]">{runResult.executionTimeMs}ms</span>
                    </div>
                    {runResult.actualOutput !== undefined && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                        <div className="p-2.5 rounded-lg bg-[var(--bg-panel)] border border-[var(--border-line)]">
                          <div className="text-[10px] text-[var(--text-muted)] font-bold uppercase mb-1">Your Output:</div>
                          <pre className={`text-xs whitespace-pre-wrap font-mono ${runResult.success ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400 font-bold'}`}>
                            {runResult.actualOutput || '(No output)'}
                          </pre>
                        </div>
                        <div className="p-2.5 rounded-lg bg-[var(--bg-panel)] border border-[var(--border-line)]">
                          <div className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold uppercase mb-1">Expected Output:</div>
                          <pre className="text-xs text-emerald-600 dark:text-emerald-400 whitespace-pre-wrap font-mono font-bold">
                            {runResult.expectedOutput}
                          </pre>
                        </div>
                      </div>
                    )}
                    {runResult.compileError && (
                      <pre className="text-rose-600 dark:text-rose-400 text-[11px] bg-rose-500/10 p-2.5 rounded-lg border border-rose-500/20 whitespace-pre-wrap">
                        {runResult.compileError}
                      </pre>
                    )}
                  </div>
                )}

                {submitResult && (
                  <div className="space-y-2 pt-1">
                    <div className="flex items-center justify-between">
                      <span className={`px-2.5 py-1 rounded text-[11px] font-bold ${
                        submitResult.allPassed
                          ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30'
                          : 'bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/30'
                      }`}>
                        {submitResult.allPassed ? '✓ ALL 2/2 TESTS PASSED — TOPIC MASTERED!' : '✗ SUBMISSION FAILED'}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div className={`p-2.5 rounded-lg border ${submitResult.openPassed ? 'bg-emerald-500/5 border-emerald-500/20 text-emerald-600 dark:text-emerald-400' : 'bg-rose-500/5 border-rose-500/20 text-rose-600 dark:text-rose-400'}`}>
                        Open Test: <strong>{submitResult.openPassed ? 'Passed ✓' : 'Failed ✗'}</strong>
                      </div>
                      <div className={`p-2.5 rounded-lg border ${submitResult.hiddenPassed ? 'bg-emerald-500/5 border-emerald-500/20 text-emerald-600 dark:text-emerald-400' : 'bg-rose-500/5 border-rose-500/20 text-rose-600 dark:text-rose-400'}`}>
                        Hidden Test: <strong>{submitResult.hiddenPassed ? 'Passed ✓' : 'Failed ✗'}</strong>
                      </div>
                    </div>
                    {submitResult.compileError && (
                      <pre className="text-rose-600 dark:text-rose-400 text-[11px] bg-rose-500/10 p-2.5 rounded-lg border border-rose-500/20 whitespace-pre-wrap">
                        {submitResult.compileError}
                      </pre>
                    )}
                  </div>
                )}

                {!runResult && !submitResult && (
                  <div className="text-[var(--text-muted)] text-xs py-2 text-center">
                    Write your C code above and click <strong>Run Test</strong> (or press <kbd className="px-1 py-0.5 bg-[var(--bg-panel)] border border-[var(--border-line)] rounded text-[var(--text-main)]">Ctrl+Enter</kbd>) to evaluate.
                  </div>
                )}
              </div>

              {/* Pinned Bottom Action Bar */}
              <div className="h-14 px-4 bg-[var(--bg-panel)] border-t border-[var(--border-line)] flex items-center justify-between shrink-0">
                <div>
                  {submitResult?.allPassed && nextTopic ? (
                    <button
                      onClick={() => handleOpenTopic(nextTopic)}
                      className="px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-mono font-bold transition flex items-center gap-2 shadow-lg shadow-emerald-500/20 animate-pulse"
                    >
                      <span>Next Problem: {nextTopic.topicTitle}</span>
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  ) : (
                    <span className="text-xs font-mono text-[var(--text-muted)] hidden sm:inline">
                      Unlimited attempts • Standard C11 GCC Environment
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2.5">
                  <button
                    onClick={handleRunOpenTest}
                    disabled={isRunning || isSubmitting}
                    className="px-4 py-2 rounded-xl border border-[var(--border-line)] bg-[var(--bg-surface)] hover:bg-[var(--bg-surface-hover)] text-[var(--text-main)] text-xs font-mono font-bold transition flex items-center gap-2 disabled:opacity-50"
                    title="Run Visible Sample Test (Ctrl+Enter)"
                  >
                    <Play className="w-3.5 h-3.5 text-emerald-500" />
                    <span>{isRunning ? 'Running...' : 'Run Test'}</span>
                  </button>

                  <button
                    onClick={handleSubmitCode}
                    disabled={isRunning || isSubmitting}
                    className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-mono font-bold transition flex items-center gap-2 disabled:opacity-50 shadow-md shadow-emerald-600/20"
                    title="Submit & Evaluate on all tests"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>{isSubmitting ? 'Evaluating...' : 'Submit Solution'}</span>
                  </button>
                </div>
              </div>

            </div>

          </div>

        </div>
      )}

      {/* Raise Issue Modal */}
      {activeTopic && (
        <RaiseIssueModal
          isOpen={isIssueModalOpen}
          onClose={() => setIsIssueModalOpen(false)}
          questionTitle={activeTopic.problem.title}
          questionId={activeTopic.id}
          contextType="PRACTICE"
        />
      )}
    </div>
  );
};

export default TopicPracticeHubPage;
