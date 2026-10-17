import React, { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import confetti from 'canvas-confetti';
import { toast } from 'sonner';
import { api, LogicQApiError } from '../api/client.js';
import { useAuth } from '../context/AuthContext.js';
import { CodeEditor } from '../components/editor/CodeEditor.js';
import { DifficultyBadge, VerdictBadge } from '../components/common/Badge.js';
import { StatementMarkdown } from '../components/common/StatementMarkdown.js';
import {
  Play,
  Send,
  CheckCircle2,
  ChevronUp,
  ChevronDown,
  ArrowLeft,
  Terminal,
  BookOpen,
  Cloud,
  AlertTriangle,
  RotateCcw,
  Layers,
  WifiOff,
  Clock,
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

  const initializedProblemIdRef = useRef<string | null>(null);
  const pollTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const practiceTimerRef = useRef<PracticeTimerHandle | null>(null);
  const [draftSyncStatus, setDraftSyncStatus] = useState<'saved' | 'saving' | 'offline'>('saved');
  const [conflictInfo, setConflictInfo] = useState<ConflictInfo | null>(null);
  const autosaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const idempotencyKeyRef = useRef<string>(`prac-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`);

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

  const problem = responseData?.data?.problem;
  const userProgress = responseData?.data?.userProgress;

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
      className="flex flex-col w-full bg-[var(--bg-main)] text-[var(--text-main)] overflow-hidden"
    >
      {/* Top Workspace Header */}
      <div className="h-14 border-b border-[var(--border-line)] bg-[var(--bg-surface)]/60 backdrop-blur-md px-3 sm:px-4 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          <Link
            to={`/practice/${moduleSlug}`}
            className="p-1.5 rounded-lg hover:bg-[var(--bg-surface)] text-[var(--text-muted)] hover:text-[var(--text-main)] transition-colors shrink-0"
            title="Back to module problems"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>

          <div className="h-4 w-[1px] bg-[var(--border-line)] shrink-0" />

          <div className="flex items-center gap-2 min-w-0">
            <span className="text-xs font-mono px-2 py-0.5 rounded bg-[var(--bg-surface)] border border-[var(--border-line)] text-[var(--accent)] shrink-0">
              #{problem.moduleOrder}
            </span>
            <h1 className="text-xs sm:text-sm font-semibold text-[var(--text-main)] truncate max-w-[120px] sm:max-w-xs md:max-w-md">
              {problem.title}
            </h1>
            <DifficultyBadge difficulty={problem.difficulty as any} />
            {userProgress?.isSolved && (
              <span className="hidden md:flex items-center gap-1 text-[11px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20 shrink-0">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Solved</span>
              </span>
            )}
          </div>
        </div>

        {/* Action Buttons & Timer */}
        <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
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
                        {submissionResult.testCaseResults && submissionResult.testCaseResults.length > 0 && (
                          <div className="space-y-1 pt-2">
                            <span className="text-[10px] uppercase text-[var(--text-muted)] block">
                              Test Cases Evaluation:
                            </span>
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                              {submissionResult.testCaseResults.map((tc: any, i: number) => (
                                <div
                                  key={i}
                                  className={`p-1.5 rounded text-[11px] border flex items-center justify-between ${
                                    tc.passed
                                      ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                                      : 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                                  }`}
                                >
                                  <span>Test #{i + 1}</span>
                                  <span>{tc.passed ? 'PASS' : 'FAIL'}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    ) : runResult ? (
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-[var(--text-muted)]">Run Result:</span>
                          <VerdictBadge verdict={runResult.verdict} />
                        </div>
                        <div>
                          <span className="text-[10px] text-[var(--text-muted)] uppercase block">
                            Standard Output:
                          </span>
                          <pre className="p-2 rounded bg-[var(--bg-main)] text-emerald-400 whitespace-pre-wrap max-h-24 overflow-y-auto">
                            {runResult.stdout || '(no standard output)'}
                          </pre>
                        </div>
                        {runResult.stderr && (
                          <div>
                            <span className="text-[10px] text-[var(--text-muted)] uppercase block">
                              Standard Error:
                            </span>
                            <pre className="p-2 rounded bg-[var(--bg-main)] text-rose-400 whitespace-pre-wrap max-h-20 overflow-y-auto">
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
