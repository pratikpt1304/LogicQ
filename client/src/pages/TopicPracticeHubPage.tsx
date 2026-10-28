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
  const [activeTopic, setActiveTopic] = useState<TopicPracticeItem | null>(null);
  const [solvedTopics, setSolvedTopics] = useState<string[]>(getSolvedPracticeTopicIds());

  // Workspace modal state
  const [code, setCode] = useState<string>('');
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [runResult, setRunResult] = useState<any>(null);
  const [submitResult, setSubmitResult] = useState<any>(null);
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

          {/* Status Segmented Filter */}
          <div className="inline-flex items-center gap-1 bg-[var(--bg-panel)] p-1 rounded-xl border border-[var(--border-line)] shrink-0 self-start sm:self-auto">
            <button
              onClick={() => setStatusFilter('ALL')}
              className={`px-3 py-1.5 rounded-lg text-xs font-mono font-semibold transition ${
                statusFilter === 'ALL'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'
              }`}
            >
              All ({totalTopics})
            </button>
            <button
              onClick={() => setStatusFilter('UNSOLVED')}
              className={`px-3 py-1.5 rounded-lg text-xs font-mono font-semibold transition ${
                statusFilter === 'UNSOLVED'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'
              }`}
            >
              To Do ({totalTopics - solvedCount})
            </button>
            <button
              onClick={() => setStatusFilter('SOLVED')}
              className={`px-3 py-1.5 rounded-lg text-xs font-mono font-semibold transition ${
                statusFilter === 'SOLVED'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'
              }`}
            >
              Solved ({solvedCount})
            </button>
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
            const isMedium = topic.problem.difficulty === 'MEDIUM';

            return (
              <div
                key={topic.id}
                onClick={() => handleOpenTopic(topic)}
                className={`p-5 rounded-2xl border transition flex flex-col justify-between cursor-pointer group hover:shadow-lg ${
                  isSolved
                    ? 'border-emerald-500/30 bg-emerald-500/5 hover:border-emerald-500/60'
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
                        isMedium
                          ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                          : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                      }`}
                    >
                      <Clock className="w-3 h-3" />
                      {topic.problem.difficulty} • {isMedium ? '~10m' : '~5m'}
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

      {/* 4. INTERACTIVE PRACTICE WORKSPACE MODAL */}
      {activeTopic && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-2 sm:p-3 animate-fadeIn">
          <div className="bg-[var(--bg-panel)] border border-[var(--border-line)] rounded-2xl w-full max-w-7xl h-[94vh] flex flex-col shadow-2xl overflow-hidden">
            
            {/* Modal Topbar */}
            <div className="px-4 py-3 border-b border-[var(--border-line)] bg-[var(--bg-surface)] flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold">
                  <Code2 className="w-4 h-4" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                      TOPIC {currentTopicIndex >= 0 ? currentTopicIndex + 1 : ''} OF {TOPIC_PRACTICE_DATA.length}
                    </span>
                    <h2 className="text-sm sm:text-base font-bold text-[var(--text-main)] truncate max-w-xs sm:max-w-md">
                      {activeTopic.topicTitle}
                    </h2>
                    {solvedTopics.includes(activeTopic.id) && (
                      <span className="hidden sm:inline-flex items-center gap-1 text-[10px] font-mono font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                        <CheckCircle2 className="w-3 h-3" />
                        Solved
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-[var(--text-muted)] font-mono">
                    {activeTopic.problem.title} • <span className={activeTopic.problem.difficulty === 'EASY' ? 'text-emerald-400 font-bold' : 'text-amber-400 font-bold'}>{activeTopic.problem.difficulty}</span>
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {/* Prev / Next Quick Nav */}
                <div className="hidden md:flex items-center gap-1 bg-[var(--bg-panel)] p-1 rounded-xl border border-[var(--border-line)]">
                  <button
                    onClick={() => prevTopic && handleOpenTopic(prevTopic)}
                    disabled={!prevTopic}
                    title={prevTopic ? `Previous: ${prevTopic.topicTitle}` : 'No previous topic'}
                    className="p-1 rounded-lg text-[var(--text-muted)] hover:text-white disabled:opacity-30 disabled:hover:text-[var(--text-muted)] transition"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <span className="text-[11px] font-mono px-1 text-[var(--text-muted)]">
                    {currentTopicIndex + 1}/{TOPIC_PRACTICE_DATA.length}
                  </span>
                  <button
                    onClick={() => nextTopic && handleOpenTopic(nextTopic)}
                    disabled={!nextTopic}
                    title={nextTopic ? `Next: ${nextTopic.topicTitle}` : 'No next topic'}
                    className="p-1 rounded-lg text-[var(--text-muted)] hover:text-white disabled:opacity-30 disabled:hover:text-[var(--text-muted)] transition"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>

                {/* Raise Issue Button */}
                <button
                  onClick={() => setIsIssueModalOpen(true)}
                  className="px-2.5 py-1.5 rounded-xl border border-rose-500/20 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 text-xs font-mono font-bold transition flex items-center gap-1.5"
                  title="Report question error or bad test case"
                >
                  <Flag className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Report</span>
                </button>

                {/* Close Button */}
                <button
                  onClick={handleCloseTopic}
                  className="p-1.5 rounded-xl text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[var(--bg-surface)] transition"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Modal Body: Two Columns */}
            <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 overflow-hidden">
              
              {/* LEFT COLUMN: Problem Spec & Tip Drawer (5 cols) */}
              <div className="lg:col-span-5 p-4 sm:p-5 overflow-y-auto space-y-4 border-b lg:border-b-0 lg:border-r border-[var(--border-line)] bg-[var(--bg-panel)]">
                
                {/* COLLAPSIBLE TIP DRAWER (Syntax, Application, Example) */}
                <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 overflow-hidden transition-all">
                  <button
                    onClick={() => setIsTipOpen(!isTipOpen)}
                    className="w-full px-3.5 py-2.5 flex items-center justify-between hover:bg-amber-500/10 transition text-left"
                  >
                    <div className="flex items-center gap-2 text-amber-400 font-bold text-xs font-mono">
                      <Lightbulb className="w-4 h-4 shrink-0" />
                      <span>Topic Cheat Sheet &amp; Syntax</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-[11px] text-amber-300 font-mono">
                      <span>{isTipOpen ? 'Hide' : 'Quick Reference'}</span>
                      {isTipOpen ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                    </div>
                  </button>

                  {isTipOpen && (
                    <div className="p-3.5 border-t border-amber-500/20 space-y-2.5 bg-black/40">
                      {/* Tip Tab Selector */}
                      <div className="flex items-center gap-1 bg-[var(--bg-panel)] p-0.5 rounded-lg border border-[var(--border-line)] w-fit">
                        <button
                          onClick={() => setActiveTipTab('syntax')}
                          className={`px-2.5 py-0.5 rounded text-[10px] font-mono font-bold transition ${
                            activeTipTab === 'syntax' ? 'bg-amber-500 text-black' : 'text-[var(--text-muted)] hover:text-white'
                          }`}
                        >
                          Syntax
                        </button>
                        <button
                          onClick={() => setActiveTipTab('app')}
                          className={`px-2.5 py-0.5 rounded text-[10px] font-mono font-bold transition ${
                            activeTipTab === 'app' ? 'bg-amber-500 text-black' : 'text-[var(--text-muted)] hover:text-white'
                          }`}
                        >
                          Application
                        </button>
                        <button
                          onClick={() => setActiveTipTab('example')}
                          className={`px-2.5 py-0.5 rounded text-[10px] font-mono font-bold transition ${
                            activeTipTab === 'example' ? 'bg-amber-500 text-black' : 'text-[var(--text-muted)] hover:text-white'
                          }`}
                        >
                          Example
                        </button>
                      </div>

                      {/* Active Tip Content */}
                      <div className="text-xs text-[var(--text-main)] font-mono leading-relaxed">
                        {activeTipTab === 'syntax' && (
                          <pre className="p-3 rounded-xl bg-black/60 border border-[var(--border-line)] overflow-x-auto text-[11px] text-amber-200">
                            {activeTopic.tipBox.syntax}
                          </pre>
                        )}
                        {activeTipTab === 'app' && (
                          <div className="p-3 rounded-xl bg-black/60 border border-[var(--border-line)] text-slate-300 font-sans text-xs leading-relaxed">
                            {activeTopic.tipBox.application}
                          </div>
                        )}
                        {activeTipTab === 'example' && (
                          <pre className="p-3 rounded-xl bg-black/60 border border-[var(--border-line)] overflow-x-auto text-[11px] text-emerald-300">
                            {activeTopic.tipBox.example}
                          </pre>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* Problem Description - Formatted cleanly via StatementMarkdown */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <BookOpen className="w-4 h-4 text-indigo-400" />
                    <h3 className="text-xs font-bold text-[var(--text-main)] font-mono uppercase tracking-wider">
                      Problem Statement
                    </h3>
                  </div>
                  <div className="rounded-xl border border-[var(--border-line)] bg-[var(--bg-surface)] p-3.5">
                    <StatementMarkdown content={activeTopic.problem.description} />
                  </div>
                </div>

                {/* Open Test Case (Visible) */}
                <div className="space-y-2 pt-1 border-t border-[var(--border-line)]">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-mono font-bold text-emerald-400 flex items-center gap-1.5">
                      <Terminal className="w-3.5 h-3.5" />
                      <span>Sample Test Case (Open)</span>
                    </span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                      VISIBLE
                    </span>
                  </div>
                  <div className="p-3 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-line)] text-xs font-mono space-y-2">
                    <div>
                      <span className="text-[10px] text-[var(--text-muted)] font-bold block uppercase">Input:</span>
                      <pre className="text-white mt-1 p-2 rounded bg-black/50 border border-[var(--border-line)] overflow-x-auto">
                        {activeTopic.problem.openTestCase.input}
                      </pre>
                    </div>
                    <div>
                      <span className="text-[10px] text-[var(--text-muted)] font-bold block uppercase">Expected Output:</span>
                      <pre className="text-emerald-400 mt-1 p-2 rounded bg-black/50 border border-[var(--border-line)] overflow-x-auto font-bold">
                        {activeTopic.problem.openTestCase.expectedOutput}
                      </pre>
                    </div>
                    {activeTopic.problem.openTestCase.explanation && (
                      <div className="text-[11px] text-[var(--text-muted)] font-sans border-t border-[var(--border-line)] pt-2 mt-2">
                        <span className="font-semibold text-slate-300">Explanation: </span>
                        {activeTopic.problem.openTestCase.explanation}
                      </div>
                    )}
                  </div>
                </div>

                {/* Hidden Test Case Indicator */}
                <div className="p-2.5 rounded-xl bg-[var(--bg-surface)] border border-dashed border-[var(--border-line)] flex items-center justify-between text-xs font-mono">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="w-3.5 h-3.5 text-cyan-400" />
                    <span className="text-[var(--text-muted)] text-[11px]">Hidden Edge Case Test</span>
                  </div>
                  <span className="text-[10px] text-cyan-400 font-bold bg-cyan-500/10 px-2 py-0.5 rounded border border-cyan-500/20">
                    TESTED ON SUBMIT
                  </span>
                </div>
              </div>

              {/* RIGHT COLUMN: Code Editor & Execution Terminal (7 cols) */}
              <div className="lg:col-span-7 flex flex-col h-full bg-[#0C0F1F] overflow-hidden">
                
                {/* Editor Area with native Monaco toolbar */}
                <div className="flex-1 min-h-[200px] overflow-hidden relative">
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

                {/* Execution Output Panel (Adaptive height) */}
                <div className="max-h-48 overflow-y-auto shrink-0 border-t border-[var(--border-line)] bg-black/80 p-3 font-mono text-xs space-y-2">
                  <div className="flex items-center justify-between text-[11px] text-[var(--text-muted)] pb-1 border-b border-gray-800">
                    <span className="flex items-center gap-1.5">
                      <Terminal className="w-3.5 h-3.5 text-emerald-400" />
                      <span className="font-bold text-slate-300">Console &amp; Test Verdicts</span>
                    </span>
                    <span className="text-[10px] text-gray-500">Shortcut: Ctrl + Enter to run</span>
                  </div>

                  {runResult && (
                    <div className="space-y-2 pt-1">
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          runResult.success ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                        }`}>
                          {runResult.success ? 'TEST 1: PASSED ✓' : 'TEST 1: FAILED ✗'}
                        </span>
                        <span className="text-[10px] text-gray-500">{runResult.executionTimeMs}ms</span>
                      </div>
                      {runResult.actualOutput !== undefined && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                          <div className="p-2 rounded bg-black/60 border border-[var(--border-line)]">
                            <div className="text-[10px] text-gray-400 font-bold uppercase mb-0.5">Your Output:</div>
                            <pre className={`text-xs whitespace-pre-wrap font-mono ${runResult.success ? 'text-emerald-400' : 'text-rose-400'}`}>
                              {runResult.actualOutput || '(No output)'}
                            </pre>
                          </div>
                          <div className="p-2 rounded bg-black/60 border border-[var(--border-line)]">
                            <div className="text-[10px] text-emerald-400 font-bold uppercase mb-0.5">Expected Output:</div>
                            <pre className="text-xs text-emerald-400 whitespace-pre-wrap font-mono">
                              {runResult.expectedOutput}
                            </pre>
                          </div>
                        </div>
                      )}
                      {runResult.compileError && (
                        <pre className="text-rose-400 text-[10px] bg-rose-500/10 p-2 rounded-lg border border-rose-500/20 whitespace-pre-wrap">
                          {runResult.compileError}
                        </pre>
                      )}
                    </div>
                  )}

                  {submitResult && (
                    <div className="space-y-2 pt-1">
                      <div className="flex items-center justify-between">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          submitResult.allPassed
                            ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                            : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                        }`}>
                          {submitResult.allPassed ? '✓ ALL TESTS PASSED (TOPIC MASTERED)' : '✗ SUBMISSION FAILED'}
                        </span>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-[11px]">
                        <div className={`p-2 rounded border ${submitResult.openPassed ? 'bg-emerald-500/5 border-emerald-500/20 text-emerald-400' : 'bg-rose-500/5 border-rose-500/20 text-rose-400'}`}>
                          Open Test: <strong>{submitResult.openPassed ? 'Passed ✓' : 'Failed ✗'}</strong>
                        </div>
                        <div className={`p-2 rounded border ${submitResult.hiddenPassed ? 'bg-emerald-500/5 border-emerald-500/20 text-emerald-400' : 'bg-rose-500/5 border-rose-500/20 text-rose-400'}`}>
                          Hidden Test: <strong>{submitResult.hiddenPassed ? 'Passed ✓' : 'Failed ✗'}</strong>
                        </div>
                      </div>
                      {submitResult.compileError && (
                        <pre className="text-rose-400 text-[10px] bg-rose-500/10 p-2 rounded-lg border border-rose-500/20 whitespace-pre-wrap">
                          {submitResult.compileError}
                        </pre>
                      )}
                    </div>
                  )}

                  {!runResult && !submitResult && (
                    <div className="text-gray-500 text-xs py-2 text-center">
                      Click <strong>Run Visible Test</strong> (or press <kbd className="px-1 py-0.5 bg-gray-800 rounded text-[10px] text-gray-300">Ctrl+Enter</kbd>) to evaluate your solution.
                    </div>
                  )}
                </div>

                {/* Workspace Footer Action Bar (Strictly Pinned at bottom) */}
                <div className="p-3 border-t border-[var(--border-line)] bg-[var(--bg-surface)] flex items-center justify-between shrink-0">
                  <div className="flex items-center gap-2">
                    {submitResult?.allPassed && nextTopic ? (
                      <button
                        onClick={() => handleOpenTopic(nextTopic)}
                        className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-mono font-bold transition flex items-center gap-1.5 shadow-lg shadow-emerald-500/20 animate-pulse"
                      >
                        <span>Next Topic: {nextTopic.topicTitle.slice(0, 18)}...</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    ) : (
                      <span className="text-[11px] font-mono text-[var(--text-muted)] hidden sm:inline">
                        Unlimited attempts • No time pressure
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleRunOpenTest}
                      disabled={isRunning || isSubmitting}
                      className="px-3.5 py-2 rounded-xl border border-[var(--border-line)] hover:border-emerald-500/50 hover:bg-emerald-500/5 text-[var(--text-main)] text-xs font-mono font-bold transition flex items-center gap-1.5 disabled:opacity-50"
                      title="Run Visible Sample Test (Ctrl+Enter)"
                    >
                      <Play className="w-3.5 h-3.5 text-emerald-400" />
                      <span>{isRunning ? 'Running...' : 'Run Test'}</span>
                    </button>

                    <button
                      onClick={handleSubmitCode}
                      disabled={isRunning || isSubmitting}
                      className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-mono font-bold transition flex items-center gap-2 disabled:opacity-50 shadow-md shadow-emerald-600/20"
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
