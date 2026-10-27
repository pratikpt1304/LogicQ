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
} from 'lucide-react';
import { TOPIC_PRACTICE_DATA, TopicPracticeItem } from '../data/topic-practice.data.js';
import { CodeEditor } from '../components/editor/CodeEditor.js';
import { RaiseIssueModal } from '../components/common/RaiseIssueModal.js';
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
  const [activeTopic, setActiveTopic] = useState<TopicPracticeItem | null>(null);
  const [solvedTopics, setSolvedTopics] = useState<string[]>(getSolvedPracticeTopicIds());

  // Workspace modal state
  const [code, setCode] = useState<string>('');
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [runResult, setRunResult] = useState<any>(null);
  const [submitResult, setSubmitResult] = useState<any>(null);
  const [activeTipTab, setActiveTipTab] = useState<'syntax' | 'app' | 'example'>('syntax');
  const [isIssueModalOpen, setIsIssueModalOpen] = useState<boolean>(false);

  // Sync solved topics
  useEffect(() => {
    setSolvedTopics(getSolvedPracticeTopicIds());
  }, []);

  const handleOpenTopic = (topic: TopicPracticeItem) => {
    setActiveTopic(topic);
    setCode(topic.problem.starterCode);
    setRunResult(null);
    setSubmitResult(null);
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
        toast.success(`🎉 Topic Mastered: "${activeTopic.topicTitle}"! Lab Internal progress updated.`);
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

  const filteredTopics = selectedModuleFilter === 0
    ? TOPIC_PRACTICE_DATA
    : TOPIC_PRACTICE_DATA.filter((t) => t.moduleIndex === selectedModuleFilter);

  const totalTopics = TOPIC_PRACTICE_DATA.length;
  const solvedCount = solvedTopics.length;
  const progressPct = Math.round((solvedCount / totalTopics) * 100);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 font-sans animate-fadeIn">
      {/* 1. Header Banner */}
      <div className="glass-card p-6 sm:p-8 rounded-2xl border border-[var(--border-line)] bg-[var(--bg-panel)] shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-mono font-bold">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Zero-Restriction Practice Arena</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-[var(--text-main)] tracking-tight">
              Topic-by-Topic Practice Hub
            </h1>
            <p className="text-xs sm:text-sm text-[var(--text-muted)] max-w-2xl leading-relaxed">
              Master one targeted problem per C programming topic with <strong>no timer limits</strong> and <strong>unlimited attempts</strong>.
              Every question includes a comprehensive <strong>Tip Box (Syntax, Application &amp; Example)</strong>.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 shrink-0">
            <Link
              to="/lab-internal"
              className="px-4 py-2.5 rounded-xl text-xs font-mono font-bold bg-indigo-600 hover:bg-indigo-500 text-white shadow-md shadow-indigo-600/20 transition flex items-center justify-center gap-2"
            >
              <BookOpen className="w-4 h-4" />
              <span>Go to Lab Internal Modules &rarr;</span>
            </Link>
          </div>
        </div>

        {/* Unlock progress alert */}
        <div className="pt-4 border-t border-[var(--border-line)] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-xs text-[var(--text-muted)] font-mono">
            <Info className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>
              <strong>Learning Path Rule:</strong> Complete the practice topics for each module to unlock the respective <strong>Lab Internal</strong> coursework module.
            </span>
          </div>

          {/* Progress metric */}
          <div className="flex items-center gap-3 shrink-0">
            <div className="w-36 bg-[var(--bg-surface)] h-2 rounded-full overflow-hidden border border-[var(--border-line)]">
              <div
                className="bg-gradient-to-r from-emerald-500 to-cyan-400 h-full rounded-full transition-all duration-500"
                style={{ width: `${progressPct}%` }}
              />
            </div>
            <span className="text-xs font-mono font-bold text-emerald-400 whitespace-nowrap">
              {solvedCount} / {totalTopics} Mastered ({progressPct}%)
            </span>
          </div>
        </div>
      </div>

      {/* 2. Module Filter Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
        <button
          onClick={() => setSelectedModuleFilter(0)}
          className={`px-4 py-2 rounded-xl text-xs font-mono font-bold transition whitespace-nowrap ${
            selectedModuleFilter === 0
              ? 'bg-emerald-600 text-white shadow-sm'
              : 'border border-[var(--border-line)] bg-[var(--bg-surface)] text-[var(--text-muted)] hover:text-[var(--text-main)]'
          }`}
        >
          All Topics ({totalTopics})
        </button>
        <button
          onClick={() => setSelectedModuleFilter(1)}
          className={`px-4 py-2 rounded-xl text-xs font-mono font-bold transition whitespace-nowrap ${
            selectedModuleFilter === 1
              ? 'bg-emerald-600 text-white shadow-sm'
              : 'border border-[var(--border-line)] bg-[var(--bg-surface)] text-[var(--text-muted)] hover:text-[var(--text-main)]'
          }`}
        >
          Module 1: Control Flow (6)
        </button>
        <button
          onClick={() => setSelectedModuleFilter(2)}
          className={`px-4 py-2 rounded-xl text-xs font-mono font-bold transition whitespace-nowrap ${
            selectedModuleFilter === 2
              ? 'bg-emerald-600 text-white shadow-sm'
              : 'border border-[var(--border-line)] bg-[var(--bg-surface)] text-[var(--text-muted)] hover:text-[var(--text-main)]'
          }`}
        >
          Module 2: Pointers &amp; Functions (6)
        </button>
        <button
          onClick={() => setSelectedModuleFilter(3)}
          className={`px-4 py-2 rounded-xl text-xs font-mono font-bold transition whitespace-nowrap ${
            selectedModuleFilter === 3
              ? 'bg-emerald-600 text-white shadow-sm'
              : 'border border-[var(--border-line)] bg-[var(--bg-surface)] text-[var(--text-muted)] hover:text-[var(--text-main)]'
          }`}
        >
          Module 3: Arrays &amp; Strings (6)
        </button>
        <button
          onClick={() => setSelectedModuleFilter(4)}
          className={`px-4 py-2 rounded-xl text-xs font-mono font-bold transition whitespace-nowrap ${
            selectedModuleFilter === 4
              ? 'bg-emerald-600 text-white shadow-sm'
              : 'border border-[var(--border-line)] bg-[var(--bg-surface)] text-[var(--text-muted)] hover:text-[var(--text-main)]'
          }`}
        >
          Module 4: Structs &amp; Dynamic Memory (6)
        </button>
      </div>

      {/* 3. Topics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredTopics.map((topic) => {
          const isSolved = solvedTopics.includes(topic.id);
          return (
            <div
              key={topic.id}
              onClick={() => handleOpenTopic(topic)}
              className={`p-5 rounded-2xl border transition flex flex-col justify-between cursor-pointer group ${
                isSolved
                  ? 'border-emerald-500/30 bg-emerald-500/5 hover:border-emerald-500/50'
                  : 'border-[var(--border-line)] bg-[var(--bg-panel)] hover:border-emerald-500/40 hover:shadow-md'
              }`}
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-[var(--bg-surface)] text-indigo-400 border border-[var(--border-line)]">
                    {topic.moduleTitle.split(':')[0]}
                  </span>
                  {isSolved ? (
                    <span className="inline-flex items-center gap-1 text-[11px] font-mono font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                      <CheckCircle2 className="w-3 h-3" />
                      Mastered
                    </span>
                  ) : (
                    <span className="text-[10px] font-mono text-[var(--text-muted)]">
                      1 Question • 2 Tests
                    </span>
                  )}
                </div>

                <div>
                  <h3 className="font-bold text-sm text-[var(--text-main)] group-hover:text-emerald-400 transition">
                    {topic.topicTitle}
                  </h3>
                  <p className="text-xs text-[var(--text-muted)] line-clamp-2 mt-1 leading-relaxed">
                    {topic.summary}
                  </p>
                </div>

                <div className="pt-2 text-xs font-mono text-slate-300 bg-[var(--bg-surface)] p-2.5 rounded-xl border border-[var(--border-line)]">
                  <div className="text-[10px] uppercase font-bold text-[var(--text-muted)] mb-0.5">Problem:</div>
                  <div className="truncate font-medium text-[var(--text-main)]">{topic.problem.title}</div>
                </div>
              </div>

              <div className="pt-4 mt-4 border-t border-[var(--border-line)] flex items-center justify-between text-xs font-mono">
                <span className="text-emerald-400 text-[11px] font-semibold flex items-center gap-1">
                  <Lightbulb className="w-3.5 h-3.5" />
                  <span>Includes Tip Box</span>
                </span>
                <span className="font-bold text-indigo-400 group-hover:translate-x-1 transition flex items-center gap-1">
                  <span>{isSolved ? 'Review' : 'Practice'}</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* 4. INTERACTIVE PRACTICE WORKSPACE MODAL */}
      {activeTopic && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 animate-fadeIn">
          <div className="bg-[var(--bg-panel)] border border-[var(--border-line)] rounded-2xl w-full max-w-6xl h-[95vh] flex flex-col shadow-2xl overflow-hidden">
            
            {/* Modal Topbar */}
            <div className="px-5 py-3.5 border-b border-[var(--border-line)] bg-[var(--bg-surface)] flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold">
                  <Code2 className="w-4 h-4" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                      PRACTICE
                    </span>
                    <h2 className="text-sm sm:text-base font-bold text-[var(--text-main)]">
                      {activeTopic.topicTitle}
                    </h2>
                  </div>
                  <p className="text-[11px] text-[var(--text-muted)] font-mono">
                    Problem: {activeTopic.problem.title} ({activeTopic.problem.difficulty})
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {/* Raise Issue Button */}
                <button
                  onClick={() => setIsIssueModalOpen(true)}
                  className="px-3 py-1.5 rounded-xl border border-rose-500/20 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 text-xs font-mono font-bold transition flex items-center gap-1.5"
                >
                  <Flag className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Raise an Issue</span>
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
              
              {/* LEFT COLUMN: Tip Box & Problem Spec (5 cols) */}
              <div className="lg:col-span-5 p-5 overflow-y-auto space-y-5 border-b lg:border-b-0 lg:border-r border-[var(--border-line)] bg-[var(--bg-panel)]">
                
                {/* TIP BOX (Syntax, Application, Example) */}
                <div className="rounded-2xl border border-amber-500/30 bg-amber-500/5 p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-amber-400 font-bold text-xs uppercase tracking-wider font-mono">
                      <Lightbulb className="w-4 h-4" />
                      <span>Topic Tip Box</span>
                    </div>

                    {/* Tip Tab Selector */}
                    <div className="flex items-center gap-1 bg-[var(--bg-panel)] p-0.5 rounded-lg border border-[var(--border-line)]">
                      <button
                        onClick={() => setActiveTipTab('syntax')}
                        className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold transition ${
                          activeTipTab === 'syntax' ? 'bg-amber-500 text-black' : 'text-[var(--text-muted)] hover:text-white'
                        }`}
                      >
                        Syntax
                      </button>
                      <button
                        onClick={() => setActiveTipTab('app')}
                        className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold transition ${
                          activeTipTab === 'app' ? 'bg-amber-500 text-black' : 'text-[var(--text-muted)] hover:text-white'
                        }`}
                      >
                        Application
                      </button>
                      <button
                        onClick={() => setActiveTipTab('example')}
                        className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold transition ${
                          activeTipTab === 'example' ? 'bg-amber-500 text-black' : 'text-[var(--text-muted)] hover:text-white'
                        }`}
                      >
                        Example
                      </button>
                    </div>
                  </div>

                  {/* Active Tip Content */}
                  <div className="text-xs text-[var(--text-main)] font-mono leading-relaxed pt-1">
                    {activeTipTab === 'syntax' && (
                      <pre className="p-3 rounded-xl bg-black/50 border border-[var(--border-line)] overflow-x-auto text-[11px] text-amber-200">
                        {activeTopic.tipBox.syntax}
                      </pre>
                    )}
                    {activeTipTab === 'app' && (
                      <div className="p-3 rounded-xl bg-black/50 border border-[var(--border-line)] text-slate-300 font-sans text-xs leading-relaxed">
                        {activeTopic.tipBox.application}
                      </div>
                    )}
                    {activeTipTab === 'example' && (
                      <pre className="p-3 rounded-xl bg-black/50 border border-[var(--border-line)] overflow-x-auto text-[11px] text-emerald-300">
                        {activeTopic.tipBox.example}
                      </pre>
                    )}
                  </div>
                </div>

                {/* Problem Description */}
                <div className="space-y-3">
                  <h3 className="text-sm font-bold text-[var(--text-main)] font-mono uppercase tracking-wider">
                    Problem Statement
                  </h3>
                  <div className="prose prose-invert prose-xs text-xs text-slate-300 leading-relaxed font-sans">
                    <pre className="whitespace-pre-wrap font-sans bg-transparent p-0 border-0">
                      {activeTopic.problem.description}
                    </pre>
                  </div>
                </div>

                {/* Open Test Case (Visible) */}
                <div className="space-y-2 pt-2 border-t border-[var(--border-line)]">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-mono font-bold text-emerald-400">
                      Test Case 1 (Open / Visible)
                    </span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                      VISIBLE
                    </span>
                  </div>
                  <div className="p-3 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-line)] text-xs font-mono space-y-2">
                    <div>
                      <span className="text-[10px] text-[var(--text-muted)] block">Input:</span>
                      <pre className="text-white mt-0.5">{activeTopic.problem.openTestCase.input}</pre>
                    </div>
                    <div>
                      <span className="text-[10px] text-[var(--text-muted)] block">Expected Output:</span>
                      <pre className="text-emerald-400 mt-0.5">{activeTopic.problem.openTestCase.expectedOutput}</pre>
                    </div>
                    {activeTopic.problem.openTestCase.explanation && (
                      <div className="text-[11px] text-[var(--text-muted)] font-sans border-t border-[var(--border-line)] pt-1.5">
                        {activeTopic.problem.openTestCase.explanation}
                      </div>
                    )}
                  </div>
                </div>

                {/* Hidden Test Case Indicator */}
                <div className="p-3 rounded-xl bg-[var(--bg-surface)] border border-dashed border-[var(--border-line)] flex items-center justify-between text-xs font-mono">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-cyan-400" />
                    <span className="text-[var(--text-muted)]">Test Case 2: Hidden Edge Case</span>
                  </div>
                  <span className="text-[10px] text-cyan-400 font-bold bg-cyan-500/10 px-2 py-0.5 rounded border border-cyan-500/20">
                    EVALUATED ON SUBMIT
                  </span>
                </div>
              </div>

              {/* RIGHT COLUMN: Code Editor & Execution Terminal (7 cols) */}
              <div className="lg:col-span-7 flex flex-col h-full bg-[#0C0F1F]">
                
                {/* Editor Header */}
                <div className="px-4 py-2 border-b border-[var(--border-line)] bg-[var(--bg-surface)] flex items-center justify-between text-xs font-mono">
                  <div className="flex items-center gap-2">
                    <FileCode className="w-3.5 h-3.5 text-cyan-400" />
                    <span className="text-[var(--text-main)] font-bold">solution.c (GCC 14 C11)</span>
                  </div>
                  <button
                    onClick={() => setCode(activeTopic.problem.starterCode)}
                    className="flex items-center gap-1 text-[var(--text-muted)] hover:text-white transition"
                    title="Reset to starter boilerplate"
                  >
                    <RotateCcw className="w-3 h-3" />
                    <span>Reset</span>
                  </button>
                </div>

                {/* Editor Area */}
                <div className="flex-1 min-h-[280px]">
                  <CodeEditor
                    code={code}
                    onChange={(val) => setCode(val || '')}
                  />
                </div>

                {/* Execution Output Panel */}
                <div className="h-44 border-t border-[var(--border-line)] bg-black/60 p-4 font-mono text-xs overflow-y-auto space-y-2">
                  <div className="flex items-center justify-between text-[11px] text-[var(--text-muted)] pb-1 border-b border-gray-800">
                    <span className="flex items-center gap-1.5">
                      <Terminal className="w-3 h-3 text-emerald-400" />
                      <span>Console &amp; Test Verdicts</span>
                    </span>
                    <span>Unlimited Retries Permitted</span>
                  </div>

                  {runResult && (
                    <div className="space-y-1.5 pt-1">
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          runResult.success ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'
                        }`}>
                          {runResult.success ? 'TEST 1: PASSED ✓' : 'TEST 1: FAILED ✗'}
                        </span>
                        <span className="text-[10px] text-gray-500">{runResult.executionTimeMs}ms</span>
                      </div>
                      {runResult.actualOutput && (
                        <div className="text-gray-300 text-[11px]">
                          <div>Your Output: <span className="text-white">{runResult.actualOutput}</span></div>
                          <div>Expected: <span className="text-emerald-400">{runResult.expectedOutput}</span></div>
                        </div>
                      )}
                      {runResult.compileError && (
                        <pre className="text-rose-400 text-[10px] whitespace-pre-wrap">{runResult.compileError}</pre>
                      )}
                    </div>
                  )}

                  {submitResult && (
                    <div className="space-y-1.5 pt-1">
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          submitResult.allPassed ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'
                        }`}>
                          {submitResult.allPassed ? 'ALL TESTS CLEARED ✓ (Topic Mastered)' : 'SUBMISSION FAILED ✗'}
                        </span>
                      </div>
                      <div className="text-[11px] text-gray-300">
                        <div>Open Test: {submitResult.openPassed ? 'Passed ✓' : 'Failed ✗'}</div>
                        <div>Hidden Test: {submitResult.hiddenPassed ? 'Passed ✓' : 'Failed ✗'}</div>
                      </div>
                      {submitResult.compileError && (
                        <pre className="text-rose-400 text-[10px] whitespace-pre-wrap">{submitResult.compileError}</pre>
                      )}
                    </div>
                  )}

                  {!runResult && !submitResult && (
                    <div className="text-gray-500 text-xs py-4 text-center">
                      Click <strong>Run Visible Test</strong> or <strong>Submit Solution</strong> to evaluate your code.
                    </div>
                  )}
                </div>

                {/* Workspace Footer Action Bar */}
                <div className="p-3.5 border-t border-[var(--border-line)] bg-[var(--bg-surface)] flex items-center justify-between shrink-0">
                  <span className="text-[11px] font-mono text-[var(--text-muted)]">
                    No time limit enforced.
                  </span>

                  <div className="flex items-center gap-2.5">
                    <button
                      onClick={handleRunOpenTest}
                      disabled={isRunning || isSubmitting}
                      className="px-4 py-2 rounded-xl border border-[var(--border-line)] hover:border-emerald-500/50 text-[var(--text-main)] text-xs font-mono font-bold transition flex items-center gap-1.5 disabled:opacity-50"
                    >
                      <Play className="w-3.5 h-3.5 text-emerald-400" />
                      <span>{isRunning ? 'Running...' : 'Run Visible Test'}</span>
                    </button>

                    <button
                      onClick={handleSubmitCode}
                      disabled={isRunning || isSubmitting}
                      className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-mono font-bold transition flex items-center gap-2 disabled:opacity-50 shadow-md shadow-emerald-600/20"
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
