import React, { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import confetti from 'canvas-confetti';
import { toast } from 'sonner';
import { api } from '../api/client.js';
import { useAuth } from '../context/AuthContext.js';
import { CodeEditor } from '../components/editor/CodeEditor.js';
import { DifficultyBadge, VerdictBadge } from '../components/common/Badge.js';
import {
  Play,
  Send,
  CheckCircle2,
  Cpu,
  Layers,
  Check,
  ChevronUp,
  ChevronDown,
  ArrowLeft,
  Terminal,
  BookOpen,
} from 'lucide-react';

export const PracticeWorkspacePage: React.FC = () => {
  const { moduleSlug, problemSlug } = useParams<{ moduleSlug: string; problemSlug: string }>();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const [activeMobileTab, setActiveMobileTab] = useState<'statement' | 'editor' | 'results'>('statement');
  const [code, setCode] = useState<string>('');
  const [customInput, setCustomInput] = useState<string>('');
  const [runResult, setRunResult] = useState<any | null>(null);
  const [submissionResult, setSubmissionResult] = useState<any | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(true);
  const [activeBottomTab, setActiveBottomTab] = useState<'custom' | 'output'>('custom');

  const initializedProblemIdRef = useRef<string | null>(null);
  const pollTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Fetch problem details
  const {
    data: responseData,
    isLoading,
    error: problemError,
    refetch: refetchProblem,
  } = useQuery({
    queryKey: ['practice-problem', problemSlug],
    queryFn: () => api.get(`/practice/problems/${problemSlug}`),
    refetchOnWindowFocus: false,
    retry: false,
  });

  const problem = responseData?.data?.problem;
  const userProgress = responseData?.data?.userProgress;

  // Restore local draft or starter code
  useEffect(() => {
    if (problem && problem.id !== initializedProblemIdRef.current) {
      initializedProblemIdRef.current = problem.id;
      let localDraft = '';
      try {
        localDraft = localStorage.getItem(`logicq_practice_draft_${problem.slug}`) || '';
      } catch {
        // Ignore storage errors
      }

      if (localDraft) {
        setCode(localDraft);
      } else {
        setCode(problem.starterCode);
      }

      if (problem.sampleTests && problem.sampleTests.length > 0) {
        setCustomInput(problem.sampleTests[0].input);
      }
    }
  }, [problem]);

  const handleCodeChange = (nextCode: string) => {
    setCode(nextCode);
    if (problem?.slug) {
      try {
        localStorage.setItem(`logicq_practice_draft_${problem.slug}`, nextCode);
      } catch {
        // Ignore quota exceeded
      }
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
      toast.error(err.message || 'Execution failed');
    },
  });

  // Submit Solution Mutation (Practice submission)
  const submitMutation = useMutation({
    mutationFn: () =>
      api.post('/submissions/submit', {
        problemId: problem.id,
        code,
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
        setSubmissionResult({
          submissionId: immediateSub.id,
          verdict: immediateSub.verdict,
          runtimeMs: immediateSub.runtimeMs ?? 14,
          compileOutput: immediateSub.compileOutput,
          testCaseResults: immediateSub.testCaseResults,
        });
        if (immediateSub.verdict === 'ACCEPTED') {
          confetti({
            particleCount: 80,
            spread: 60,
            origin: { y: 0.6 },
            colors: ['#8B9BFF', '#46D9A0'],
          });
          toast.success('Accepted! Problem solved.');
          queryClient.invalidateQueries({ queryKey: ['practice-problem', problemSlug] });
          queryClient.invalidateQueries({ queryKey: ['practice-module-problems', moduleSlug] });
          queryClient.invalidateQueries({ queryKey: ['practice-modules'] });
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
                confetti({
                  particleCount: 80,
                  spread: 60,
                  origin: { y: 0.6 },
                });
                toast.success('Accepted! Problem solved.');
                queryClient.invalidateQueries({ queryKey: ['practice-problem', problemSlug] });
                queryClient.invalidateQueries({ queryKey: ['practice-module-problems', moduleSlug] });
                queryClient.invalidateQueries({ queryKey: ['practice-modules'] });
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
      toast.error(err.message || 'Submission failed');
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
    <div className="min-h-[calc(100vh-4rem)] flex flex-col bg-[var(--bg-main)]">
      {/* Top Workspace Header */}
      <div className="h-14 border-b border-[var(--border-line)] bg-[var(--bg-surface)]/60 backdrop-blur-md px-4 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          <Link
            to={`/practice/${moduleSlug}`}
            className="p-1.5 rounded-lg hover:bg-[var(--bg-surface)] text-[var(--text-muted)] hover:text-[var(--text-main)] transition-colors shrink-0"
            title="Back to module problems"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>

          <div className="h-4 w-[1px] bg-[var(--border-line)] shrink-0" />

          <div className="flex items-center gap-2.5 min-w-0">
            <span className="text-xs font-mono px-2 py-0.5 rounded bg-[var(--bg-surface)] border border-[var(--border-line)] text-[var(--accent)] shrink-0">
              #{problem.moduleOrder}
            </span>
            <h1 className="text-sm font-semibold text-[var(--text-main)] truncate">
              {problem.title}
            </h1>
            <DifficultyBadge difficulty={problem.difficulty as any} />
            {userProgress?.isSolved && (
              <span className="flex items-center gap-1 text-[11px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20 shrink-0">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Solved</span>
              </span>
            )}
          </div>
        </div>

        {/* Action Buttons: Run & Submit */}
        <div className="flex items-center gap-2.5 shrink-0">
          <button
            onClick={() => runMutation.mutate()}
            disabled={runMutation.isPending || submitMutation.isPending}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-[var(--bg-surface)] hover:bg-[var(--bg-surface-hover)] border border-[var(--border-line)] text-xs font-semibold text-[var(--text-main)] transition-colors disabled:opacity-50"
          >
            <Play className="w-3.5 h-3.5 text-cyan-400 fill-cyan-400" />
            <span>{runMutation.isPending ? 'Running...' : 'Run Code'}</span>
          </button>

          <button
            onClick={() => submitMutation.mutate()}
            disabled={submitMutation.isPending || runMutation.isPending}
            className="flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-gradient-to-r from-[var(--accent)] to-indigo-600 hover:opacity-95 text-xs font-bold text-white shadow-sm shadow-[var(--accent)]/20 transition-all disabled:opacity-50"
          >
            <Send className="w-3.5 h-3.5" />
            <span>{submitMutation.isPending ? 'Submitting...' : 'Submit'}</span>
          </button>
        </div>
      </div>

      {/* Main Two-Pane Split View */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden min-h-0">
        {/* Left Pane: Problem Description Statement */}
        <div className="lg:w-1/2 flex flex-col border-b lg:border-b-0 lg:border-r border-[var(--border-line)] overflow-y-auto p-6 space-y-6">
          <div className="space-y-2">
            <h2 className="text-xl font-bold text-[var(--text-main)]">{problem.title}</h2>
            <div className="flex flex-wrap items-center gap-2 text-xs font-mono text-[var(--text-muted)]">
              <span>{problem.category}</span>
              <span>•</span>
              <span>Time Limit: {problem.timeLimitMs}ms</span>
              <span>•</span>
              <span>Memory Limit: {problem.memoryLimitMb}MB</span>
            </div>
          </div>

          <div className="prose prose-invert max-w-none text-sm text-[var(--text-muted)] leading-relaxed">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {problem.description}
            </ReactMarkdown>
          </div>

          {/* Sample Test Cases */}
          {problem.sampleTests && problem.sampleTests.length > 0 && (
            <div className="space-y-4 pt-4 border-t border-[var(--border-line)]">
              <h3 className="text-xs font-mono font-bold tracking-wider text-[var(--text-main)] uppercase">
                Sample Test Cases
              </h3>
              {problem.sampleTests.map((st: any, idx: number) => (
                <div key={idx} className="glass-card rounded-xl p-3.5 border border-[var(--border-line)] space-y-2 text-xs font-mono">
                  <div className="text-[11px] text-[var(--accent)] font-semibold">Sample #{idx + 1}</div>
                  <div>
                    <span className="text-[var(--text-muted)] block text-[10px] uppercase">Input</span>
                    <pre className="p-2 rounded bg-[var(--bg-main)] text-[var(--text-main)] overflow-x-auto mt-0.5">
                      {st.input}
                    </pre>
                  </div>
                  <div>
                    <span className="text-[var(--text-muted)] block text-[10px] uppercase">Expected Output</span>
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
        <div className="lg:w-1/2 flex flex-col min-h-0 bg-[var(--bg-main)]">
          {/* Editor Container */}
          <div className="flex-1 min-h-[350px] relative overflow-hidden">
            <CodeEditor
              code={code}
              onChange={handleCodeChange}
            />
          </div>

          {/* Bottom Tabs Drawer (Strictly: Custom Stdin, Verdict & Output) */}
          <div className="border-t border-[var(--border-line)] bg-[var(--bg-surface)]/80 flex flex-col shrink-0">
            <div className="h-10 px-4 flex items-center justify-between border-b border-[var(--border-line)]/60">
              <div className="flex items-center gap-1">
                <button
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
                  onClick={() => {
                    setActiveBottomTab('output');
                    setIsDrawerOpen(true);
                  }}
                  className={`px-3 py-1 text-xs font-mono rounded-md transition-colors ${
                    activeBottomTab === 'output' && isDrawerOpen
                      ? 'bg-[var(--bg-surface)] text-[var(--accent)] font-semibold border border-[var(--border-line)]'
                      : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'
                  }`}
                >
                  Verdict &amp; Output
                </button>
              </div>

              <button
                onClick={() => setIsDrawerOpen(!isDrawerOpen)}
                className="p-1 rounded text-[var(--text-muted)] hover:text-[var(--text-main)]"
                title={isDrawerOpen ? 'Collapse drawer' : 'Expand drawer'}
              >
                {isDrawerOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
              </button>
            </div>

            {isDrawerOpen && (
              <div className="h-44 p-3 overflow-y-auto font-mono text-xs">
                {activeBottomTab === 'custom' ? (
                  <div className="h-full flex flex-col">
                    <textarea
                      value={customInput}
                      onChange={(e) => setCustomInput(e.target.value)}
                      placeholder="Enter standard input (stdin) for Run Code..."
                      className="w-full flex-1 p-2.5 rounded-lg bg-[var(--bg-main)] text-[var(--text-main)] border border-[var(--border-line)] focus:outline-none focus:border-[var(--accent)] resize-none"
                    />
                  </div>
                ) : (
                  <div className="space-y-2">
                    {submitMutation.isPending || runMutation.isPending ? (
                      <div className="flex items-center gap-2 text-cyan-400 py-4 justify-center">
                        <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
                        <span>Compiling and evaluating C source on judge...</span>
                      </div>
                    ) : submissionResult ? (
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-[var(--text-muted)]">Submission Verdict:</span>
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
                      </div>
                    ) : runResult ? (
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-[var(--text-muted)]">Run Result:</span>
                          <VerdictBadge verdict={runResult.verdict} />
                        </div>
                        <div>
                          <span className="text-[10px] text-[var(--text-muted)] uppercase block">Standard Output:</span>
                          <pre className="p-2 rounded bg-[var(--bg-main)] text-emerald-400 whitespace-pre-wrap max-h-24 overflow-y-auto">
                            {runResult.stdout || '(no standard output)'}
                          </pre>
                        </div>
                        {runResult.stderr && (
                          <div>
                            <span className="text-[10px] text-[var(--text-muted)] uppercase block">Standard Error:</span>
                            <pre className="p-2 rounded bg-[var(--bg-main)] text-rose-400 whitespace-pre-wrap max-h-20 overflow-y-auto">
                              {runResult.stderr}
                            </pre>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="text-center py-6 text-[var(--text-muted)]">
                        Press &ldquo;Run Code&rdquo; or &ldquo;Submit&rdquo; to execute your solution.
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
