import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import confetti from 'canvas-confetti';
import { toast } from 'sonner';
import { api } from '../api/client.js';
import { useAuth } from '../context/AuthContext.js';
import { useSocket } from '../context/SocketContext.js';
import { CodeEditor } from '../components/editor/CodeEditor.js';
import { DifficultyBadge, VerdictBadge } from '../components/common/Badge.js';
import {
  Play,
  Send,
  Terminal,
  CheckCircle2,
  XCircle,
  Clock,
  Cpu,
  Layers,
  Copy,
  Check,
  ChevronUp,
  ChevronDown,
  Sparkles,
} from 'lucide-react';

export const ChallengePage: React.FC = () => {
  const { slug } = useParams<{ slug?: string }>();
  const { user } = useAuth();
  const { socket } = useSocket();
  const queryClient = useQueryClient();

  const [activeMobileTab, setActiveMobileTab] = useState<'statement' | 'editor' | 'results'>('statement');
  const [code, setCode] = useState<string>('');
  const [customInput, setCustomInput] = useState<string>('');
  const [runResult, setRunResult] = useState<any | null>(null);
  const [submissionResult, setSubmissionResult] = useState<any | null>(null);
  const [selectedCaseTab, setSelectedCaseTab] = useState<number>(0);
  const [isDrawerOpen, setIsDrawerOpen] = useState(true);
  const [activeBottomTab, setActiveBottomTab] = useState<'testcases' | 'custom' | 'output'>('testcases');

  // Fetch problem details
  const endpoint = slug ? `/problems/${slug}` : '/problems/daily';
  const { data: problemData, isLoading } = useQuery({
    queryKey: ['problem', slug || 'daily'],
    queryFn: () => api.get(endpoint),
  });

  const problem = slug ? problemData?.data?.problem : problemData?.data?.problem;
  const userStatus = problemData?.data?.userStatus;

  // Initialize starter code
  useEffect(() => {
    if (problem) {
      if (userStatus?.savedCode) {
        setCode(userStatus.savedCode);
      } else {
        setCode(problem.starterCode);
      }

      // Pre-fill custom input with sample 1 input
      if (problem.testCases && problem.testCases.length > 0) {
        setCustomInput(problem.testCases[0].input);
      }
    }
  }, [problem, userStatus]);

  // Real-time socket listener for submission verdict
  useEffect(() => {
    if (!socket || !user) return;

    const handleVerdict = (data: any) => {
      setSubmissionResult(data);
      setActiveBottomTab('output');
      setIsDrawerOpen(true);
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
      queryClient.invalidateQueries({ queryKey: ['problem'] });

      if (data.verdict === 'ACCEPTED') {
        confetti({
          particleCount: 100,
          spread: 70,
          origin: { y: 0.6 },
          colors: ['#00F2FE', '#10B981', '#38BDF8'],
        });
        toast.success(`ACCEPTED! You earned +${data.pointsAwarded} points!`, {
          icon: <Sparkles className="w-5 h-5 text-emerald-400" />,
        });
      } else if (data.verdict === 'WRONG_ANSWER') {
        toast.error('Wrong Answer on test cases. Keep debugging!');
      } else if (data.verdict === 'COMPILE_ERROR') {
        toast.error('Compilation Error. Review compiler diagnostics.');
      } else if (data.verdict === 'TIME_LIMIT_EXCEEDED') {
        toast.error('Time Limit Exceeded (>1000ms). Check for infinite loops.');
      }
    };

    socket.on('submission_verdict', handleVerdict);

    return () => {
      socket.off('submission_verdict', handleVerdict);
    };
  }, [socket, user, queryClient]);

  // Run Code mutation (Ephemeral dry run)
  const runMutation = useMutation({
    mutationFn: () =>
      api.post('/submissions/run', {
        code,
        stdin: customInput,
        timeLimitMs: problem?.timeLimitMs || 1000,
      }),
    onSuccess: (res) => {
      setRunResult(res.data);
      setActiveBottomTab('output');
      setIsDrawerOpen(true);
      setActiveMobileTab('results');
    },
    onError: (err: any) => {
      toast.error(err.message || 'Execution failed');
    },
  });

  // Submit Solution mutation (Official evaluation against all hidden & visible test cases)
  const submitMutation = useMutation({
    mutationFn: () =>
      api.post('/submissions/submit', {
        problemId: problem.id,
        code,
      }),
    onSuccess: () => {
      toast.info('Submitted! Evaluating in GCC sandbox...');
      setIsDrawerOpen(true);
      setActiveBottomTab('output');
      setActiveMobileTab('results');
    },
    onError: (err: any) => {
      toast.error(err.message || 'Submission failed');
    },
  });

  const handleResetCode = () => {
    if (problem) {
      setCode(problem.starterCode);
      toast.info('Code restored to starter boilerplate');
    }
  };

  if (isLoading) {
    return (
      <div className="h-[80vh] flex items-center justify-center font-mono text-cyan-400 text-sm">
        <Cpu className="w-6 h-6 animate-spin mr-2" />
        Initializing LogicQ C11 Workspace...
      </div>
    );
  }

  if (!problem) {
    return (
      <div className="max-w-4xl mx-auto py-20 text-center font-mono space-y-4">
        <h2 className="text-xl font-bold text-white">Problem not found</h2>
        <Link to="/archive" className="text-cyan-400 underline">
          &larr; Return to problem catalog
        </Link>
      </div>
    );
  }

  const sampleCases = problem.testCases || [];

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] overflow-hidden">
      {/* Mobile Workspace Tabs Header */}
      <div className="lg:hidden flex items-center justify-around border-b border-white/[0.08] bg-dark-900 text-xs font-mono">
        <button
          onClick={() => setActiveMobileTab('statement')}
          className={`py-3 flex-1 text-center font-semibold border-b-2 transition-colors ${
            activeMobileTab === 'statement'
              ? 'text-cyan-400 border-cyan-400 bg-cyan-500/5'
              : 'text-slate-400 border-transparent'
          }`}
        >
          Statement
        </button>
        <button
          onClick={() => setActiveMobileTab('editor')}
          className={`py-3 flex-1 text-center font-semibold border-b-2 transition-colors ${
            activeMobileTab === 'editor'
              ? 'text-cyan-400 border-cyan-400 bg-cyan-500/5'
              : 'text-slate-400 border-transparent'
          }`}
        >
          C Editor
        </button>
        <button
          onClick={() => setActiveMobileTab('results')}
          className={`py-3 flex-1 text-center font-semibold border-b-2 transition-colors ${
            activeMobileTab === 'results'
              ? 'text-cyan-400 border-cyan-400 bg-cyan-500/5'
              : 'text-slate-400 border-transparent'
          }`}
        >
          Test Output
        </button>
      </div>

      {/* Main Split Grid */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 overflow-hidden">
        {/* Left Pane: Problem Statement (Columns 1-5 on desktop) */}
        <div
          className={`lg:col-span-5 h-full overflow-y-auto border-r border-white/[0.08] bg-dark-950 p-6 space-y-6 ${
            activeMobileTab !== 'statement' ? 'hidden lg:block' : ''
          }`}
        >
          {/* Header */}
          <div className="space-y-3 pb-4 border-b border-white/[0.06]">
            <div className="flex items-center gap-2">
              <DifficultyBadge difficulty={problem.difficulty} size="sm" />
              {problem.isDaily && (
                <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-400 border border-cyan-500/30">
                  Daily Challenge
                </span>
              )}
              {userStatus?.isSolved && (
                <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                  <Check className="w-3 h-3" /> Solved
                </span>
              )}
            </div>

            <h1 className="text-xl sm:text-2xl font-bold text-white">{problem.title}</h1>

            <div className="flex flex-wrap items-center gap-3 text-xs font-mono text-slate-400">
              <span>Points: <strong className="text-cyan-400">{problem.basePoints} PTS</strong></span>
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
                      className="px-2 py-0.5 rounded text-[11px] font-mono bg-dark-850 text-slate-400 border border-white/[0.06]"
                    >
                      #{tag}
                    </span>
                  ))}
                </div>
              );
            })()}
          </div>

          {/* Markdown Content */}
          <div className="prose prose-invert prose-sm max-w-none text-slate-300 leading-relaxed font-sans">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{problem.description}</ReactMarkdown>
          </div>

          {/* Visible Sample Test Cases */}
          {sampleCases.length > 0 && (
            <div className="space-y-4 pt-4 border-t border-white/[0.06]">
              <h3 className="text-xs font-mono font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-cyan-400" />
                Sample Test Cases
              </h3>

              {sampleCases.map((tc: any, index: number) => (
                <div
                  key={tc.id || index}
                  className="rounded-xl border border-white/[0.06] bg-dark-900 p-3.5 space-y-2 text-xs font-mono"
                >
                  <span className="text-slate-400 font-semibold block">Case {index + 1}:</span>
                  <div>
                    <span className="text-slate-500 block text-[10px]">INPUT</span>
                    <pre className="p-2 rounded bg-dark-950 text-cyan-300 overflow-x-auto">
                      {tc.input}
                    </pre>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[10px]">EXPECTED OUTPUT</span>
                    <pre className="p-2 rounded bg-dark-950 text-emerald-300 overflow-x-auto">
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
          className={`lg:col-span-7 flex flex-col h-full bg-dark-950 overflow-hidden ${
            activeMobileTab === 'statement' ? 'hidden lg:flex' : ''
          }`}
        >
          {/* Top Bar for Code Actions */}
          <div className="flex items-center justify-between px-4 py-2.5 bg-dark-900 border-b border-white/[0.06]">
            <span className="text-xs font-mono text-slate-400 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              GCC 16.2.0 C11 Sandbox
            </span>

            <div className="flex items-center gap-2">
              <button
                onClick={() => runMutation.mutate()}
                disabled={runMutation.isPending}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono font-semibold text-slate-200 bg-dark-800 hover:bg-dark-700 border border-slate-700/80 transition-colors disabled:opacity-50"
              >
                <Play className="w-3.5 h-3.5 text-cyan-400 fill-cyan-400" />
                <span>{runMutation.isPending ? 'Running...' : 'Run Code'}</span>
              </button>

              <button
                onClick={() => submitMutation.mutate()}
                disabled={submitMutation.isPending}
                className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-mono font-bold text-dark-950 bg-gradient-to-r from-cyan-400 to-emerald-400 hover:from-cyan-300 hover:to-emerald-300 shadow-md shadow-cyan-500/20 transition-all disabled:opacity-50"
              >
                <Send className="w-3.5 h-3.5 fill-dark-950" />
                <span>{submitMutation.isPending ? 'Evaluating...' : 'Submit Solution'}</span>
              </button>
            </div>
          </div>

          {/* Editor Container */}
          <div className="flex-1 overflow-hidden p-2">
            <CodeEditor
              code={code}
              onChange={setCode}
              onRun={() => runMutation.mutate()}
              onSubmit={() => submitMutation.mutate()}
              onReset={handleResetCode}
              isSubmitting={submitMutation.isPending}
              isRunning={runMutation.isPending}
            />
          </div>

          {/* Bottom Execution Panel Drawer */}
          <div
            className={`border-t border-white/[0.08] bg-dark-900 transition-all duration-300 flex flex-col ${
              isDrawerOpen ? 'h-64' : 'h-10'
            }`}
          >
            {/* Drawer Header */}
            <div className="flex items-center justify-between px-4 py-2 bg-dark-850 border-b border-white/[0.04]">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    setActiveBottomTab('testcases');
                    setIsDrawerOpen(true);
                  }}
                  className={`px-3 py-1 text-xs font-mono rounded-md transition-colors ${
                    activeBottomTab === 'testcases'
                      ? 'text-cyan-300 bg-cyan-500/15 border border-cyan-500/30 font-bold'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Test Cases
                </button>

                <button
                  onClick={() => {
                    setActiveBottomTab('custom');
                    setIsDrawerOpen(true);
                  }}
                  className={`px-3 py-1 text-xs font-mono rounded-md transition-colors ${
                    activeBottomTab === 'custom'
                      ? 'text-cyan-300 bg-cyan-500/15 border border-cyan-500/30 font-bold'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Custom Stdin
                </button>

                <button
                  onClick={() => {
                    setActiveBottomTab('output');
                    setIsDrawerOpen(true);
                  }}
                  className={`px-3 py-1 text-xs font-mono rounded-md transition-colors ${
                    activeBottomTab === 'output'
                      ? 'text-cyan-300 bg-cyan-500/15 border border-cyan-500/30 font-bold'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Verdict & Output
                  {submissionResult && (
                    <span className="ml-1.5 inline-block w-2 h-2 rounded-full bg-cyan-400" />
                  )}
                </button>
              </div>

              <button
                onClick={() => setIsDrawerOpen(!isDrawerOpen)}
                className="p-1 rounded text-slate-400 hover:text-white transition-colors"
              >
                {isDrawerOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
              </button>
            </div>

            {/* Drawer Body */}
            {isDrawerOpen && (
              <div className="flex-1 overflow-y-auto p-4 font-mono text-xs">
                {/* Tab: Test Cases */}
                {activeBottomTab === 'testcases' && (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 border-b border-white/[0.06] pb-2">
                      {sampleCases.map((_: any, i: number) => (
                        <button
                          key={i}
                          onClick={() => setSelectedCaseTab(i)}
                          className={`px-2.5 py-1 rounded text-xs transition-colors ${
                            selectedCaseTab === i
                              ? 'bg-cyan-500/20 text-cyan-300 font-bold border border-cyan-500/40'
                              : 'text-slate-400 hover:text-slate-200'
                          }`}
                        >
                          Case {i + 1}
                        </button>
                      ))}
                    </div>

                    {sampleCases[selectedCaseTab] && (
                      <div className="space-y-2">
                        <div>
                          <span className="text-[10px] text-slate-500 uppercase">Input</span>
                          <pre className="p-2 rounded bg-dark-950 text-cyan-300">
                            {sampleCases[selectedCaseTab].input}
                          </pre>
                        </div>
                        <div>
                          <span className="text-[10px] text-slate-500 uppercase">Expected Output</span>
                          <pre className="p-2 rounded bg-dark-950 text-emerald-300">
                            {sampleCases[selectedCaseTab].expectedOutput}
                          </pre>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Tab: Custom Input */}
                {activeBottomTab === 'custom' && (
                  <div className="h-full flex flex-col">
                    <span className="text-slate-400 text-[11px] mb-1">
                      Standard Input (passed to program's stdin):
                    </span>
                    <textarea
                      value={customInput}
                      onChange={(e) => setCustomInput(e.target.value)}
                      rows={5}
                      className="w-full flex-1 p-2.5 rounded-lg bg-dark-950 border border-slate-700 text-xs font-mono text-slate-200 focus:outline-none focus:border-cyan-400 resize-none"
                      placeholder="Enter raw input here..."
                    />
                  </div>
                )}

                {/* Tab: Output & Verdict */}
                {activeBottomTab === 'output' && (
                  <div className="space-y-4">
                    {/* Submission Verdict Banner */}
                    {submissionResult && (
                      <div className="p-3.5 rounded-xl border border-white/[0.08] bg-dark-850 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <VerdictBadge verdict={submissionResult.verdict} size="md" />
                          <span className="text-slate-300">
                            Runtime: <strong className="text-white">{submissionResult.runtimeMs}ms</strong>
                          </span>
                        </div>
                        {submissionResult.pointsAwarded > 0 && (
                          <span className="text-emerald-400 font-bold">
                            +{submissionResult.pointsAwarded} PTS Awarded!
                          </span>
                        )}
                      </div>
                    )}

                    {/* Per-Test Case Results list */}
                    {submissionResult?.testCaseResults && (
                      <div className="space-y-2">
                        <span className="text-[11px] text-slate-400 font-semibold block uppercase">
                          Evaluation Results:
                        </span>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                          {submissionResult.testCaseResults.map((tc: any, idx: number) => (
                            <div
                              key={tc.id || idx}
                              className="p-2.5 rounded-lg bg-dark-950 border border-white/[0.06] flex items-center justify-between"
                            >
                              <span className="text-slate-400">Test {idx + 1}</span>
                              <VerdictBadge verdict={tc.verdict} size="sm" />
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Compile Error Output */}
                    {submissionResult?.compileOutput && (
                      <div>
                        <span className="text-rose-400 font-semibold block mb-1">
                          Compiler Diagnostics (GCC 16):
                        </span>
                        <pre className="p-3 rounded-lg bg-dark-950 border border-rose-500/30 text-rose-300 overflow-x-auto whitespace-pre-wrap">
                          {submissionResult.compileOutput}
                        </pre>
                      </div>
                    )}

                    {/* Ephemeral Run Result Output */}
                    {runResult && !submissionResult && (
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-slate-400 text-xs">Custom Run Output:</span>
                          <span className="text-cyan-400">{runResult.runtimeMs}ms</span>
                        </div>
                        <pre className="p-3 rounded-lg bg-dark-950 text-cyan-200 overflow-x-auto whitespace-pre-wrap">
                          {runResult.stdout || '(No output produced)'}
                        </pre>
                        {runResult.stderr && (
                          <div>
                            <span className="text-rose-400 text-xs font-semibold">Stderr:</span>
                            <pre className="p-2.5 rounded-lg bg-dark-950 text-rose-300">
                              {runResult.stderr}
                            </pre>
                          </div>
                        )}
                      </div>
                    )}

                    {!runResult && !submissionResult && (
                      <div className="py-6 text-center text-slate-500">
                        Click 'Run Code' or 'Submit Solution' to view compiler and test diagnostics.
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
