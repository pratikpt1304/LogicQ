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
import { UPLOAD_CONFIG } from '../config/upload.config.js';
import {
  Play,
  Send,
  CheckCircle2,
  Cpu,
  Layers,
  Check,
  ChevronUp,
  ChevronDown,
  Sparkles,
  Lock,
  Calendar,
  Upload,
  Camera,
  FileText,
  Trash2,
  WifiOff,
  AlertCircle,
} from 'lucide-react';

interface StagedUploadFile {
  id: string;
  name: string;
  mimeType: string;
  sizeBytes: number;
  dataBase64: string;
  previewUrl?: string;
}

export const ChallengePage: React.FC = () => {
  const { slug } = useParams<{ slug?: string }>();
  const { user, refreshUser } = useAuth();
  const queryClient = useQueryClient();

  const [activeMobileTab, setActiveMobileTab] = useState<'statement' | 'editor' | 'results'>('statement');
  const [code, setCode] = useState<string>('');
  const [customInput, setCustomInput] = useState<string>('');
  const [runResult, setRunResult] = useState<any | null>(null);
  const [submissionResult, setSubmissionResult] = useState<any | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(true);
  // Bottom tabs strictly: 'custom' (Custom Stdin), 'output' (Verdict & Output), 'upload' (Upload Files)
  const [activeBottomTab, setActiveBottomTab] = useState<'custom' | 'output' | 'upload'>('custom');
  const [isOffline, setIsOffline] = useState<boolean>(
    typeof navigator !== 'undefined' ? !navigator.onLine : false
  );

  // Upload Files state
  const [stagedFiles, setStagedFiles] = useState<StagedUploadFile[]>([]);
  const [studentNote, setStudentNote] = useState<string>('');
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const cameraInputRef = useRef<HTMLInputElement | null>(null);

  const initializedProblemIdRef = useRef<string | null>(null);
  const pollTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Track online/offline state for mobile PWA resilience
  useEffect(() => {
    const onOnline = () => setIsOffline(false);
    const onOffline = () => setIsOffline(true);
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    return () => {
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
    };
  }, []);

  // Fetch problem details (disable refetchOnWindowFocus so switching browser tabs never resets workspace)
  const endpoint = slug ? `/problems/${slug}` : '/problems/daily';
  const { data: problemData, isLoading } = useQuery({
    queryKey: ['problem', slug || 'daily'],
    queryFn: () => api.get(endpoint),
    refetchOnWindowFocus: false,
  });

  const { data: currentWeekData } = useQuery({
    queryKey: ['current-week-strip'],
    queryFn: () => api.get('/problems/current-week'),
    refetchOnWindowFocus: false,
  });

  const problem = problemData?.data?.problem;
  const seasonComplete = problemData?.data?.seasonComplete === true;
  const userStatus = problemData?.data?.userStatus;
  const currentWeekDays: any[] =
    problemData?.data?.currentWeek || currentWeekData?.data?.days || [];

  // Fetch current student's uploaded solutions for this problem
  const { data: myUploadsData, refetch: refetchMyUploads } = useQuery({
    queryKey: ['my-uploads', problem?.id],
    queryFn: () => api.get(`/uploads/my?problemId=${problem.id}`),
    enabled: Boolean(problem?.id && user),
    refetchOnWindowFocus: false,
  });

  const myProblemUploads: any[] = myUploadsData?.data || [];
  const latestUpload = myProblemUploads[0] || null;

  // Initialize starter or draft code ONLY once per problem ID
  useEffect(() => {
    if (problem && initializedProblemIdRef.current !== problem.id) {
      initializedProblemIdRef.current = problem.id;
      const draftKey = `logicq_draft_${problem.slug}`;
      let localDraft: string | null = null;
      try {
        localDraft = localStorage.getItem(draftKey);
      } catch {
        // Ignore storage errors
      }

      if (localDraft) {
        setCode(localDraft);
      } else if (userStatus?.savedCode) {
        setCode(userStatus.savedCode);
      } else {
        setCode(problem.starterCode);
      }

      if (problem.testCases && problem.testCases.length > 0) {
        setCustomInput(problem.testCases[0].input);
      }
    }
  }, [problem, userStatus]);

  // Persist draft to localStorage whenever code changes
  const handleCodeChange = (nextCode: string) => {
    setCode(nextCode);
    if (problem?.slug) {
      try {
        localStorage.setItem(`logicq_draft_${problem.slug}`, nextCode);
      } catch {
        // Ignore quota exceeded
      }
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
        queryClient.invalidateQueries({ queryKey: ['current-week-strip'] });
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
              queryClient.invalidateQueries({ queryKey: ['current-week-strip'] });
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
      toast.error(err.message || 'Submission failed');
    },
  });

  // Upload Files handlers
  const handleSelectFiles = async (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return;
    setUploadError(null);

    const incoming = Array.from(fileList);
    if (stagedFiles.length + incoming.length > UPLOAD_CONFIG.MAX_FILES_PER_SUBMISSION) {
      setUploadError(
        `Maximum ${UPLOAD_CONFIG.MAX_FILES_PER_SUBMISSION} files allowed per submission.`
      );
      return;
    }

    const nextStaged: StagedUploadFile[] = [...stagedFiles];

    for (const file of incoming) {
      if (!(UPLOAD_CONFIG.ALLOWED_MIME_TYPES as readonly string[]).includes(file.type)) {
        setUploadError(
          `Unsupported file type (${file.name}). Only JPG, PNG, WebP, and PDF files are allowed.`
        );
        return;
      }
      if (file.size === 0) {
        setUploadError(`File "${file.name}" is empty (0 bytes).`);
        return;
      }
      if (file.size > UPLOAD_CONFIG.MAX_FILE_SIZE_BYTES) {
        setUploadError(`File "${file.name}" exceeds the 5 MB limit.`);
        return;
      }

      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result || ''));
        reader.onerror = () => reject(new Error('Failed to read file'));
        reader.readAsDataURL(file);
      });

      const base64 = dataUrl.replace(/^data:[^;]+;base64,/, '');
      nextStaged.push({
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        name: file.name,
        mimeType: file.type,
        sizeBytes: file.size,
        dataBase64: base64,
        previewUrl: file.type.startsWith('image/') ? dataUrl : undefined,
      });
    }

    setStagedFiles(nextStaged);
  };

  const handleRemoveStagedFile = (id: string) => {
    setStagedFiles((prev) => prev.filter((f) => f.id !== id));
    setUploadError(null);
  };

  const uploadMutation = useMutation({
    mutationFn: () => {
      const payload = {
        problemId: problem.id,
        studentNote: studentNote.trim(),
        files: stagedFiles.map((f) => ({
          mimeType: f.mimeType,
          dataBase64: f.dataBase64,
        })),
      };

      if (
        latestUpload &&
        (latestUpload.status === 'PENDING_REVIEW' || latestUpload.status === 'NEEDS_CHANGES')
      ) {
        return api.put(`/uploads/${latestUpload.id}`, payload);
      }
      return api.post('/uploads', payload);
    },
    onSuccess: (res) => {
      toast.success(
        res.message || 'Uploaded for review. Points will be awarded after instructor approval.'
      );
      setStagedFiles([]);
      setStudentNote('');
      setUploadError(null);
      refetchMyUploads();
      queryClient.invalidateQueries({ queryKey: ['my-submissions'] });
    },
    onError: (err: any) => {
      setUploadError(err.message || 'Failed to upload solution.');
      toast.error(err.message || 'Failed to upload solution.');
    },
  });

  const cancelUploadMutation = useMutation({
    mutationFn: (uploadId: string) => api.delete(`/uploads/${uploadId}`),
    onSuccess: () => {
      toast.info('Pending upload cancelled.');
      refetchMyUploads();
    },
    onError: (err: any) => {
      toast.error(err.message || 'Could not cancel upload.');
    },
  });

  const handleResetCode = () => {
    if (problem) {
      setCode(problem.starterCode);
      try {
        localStorage.removeItem(`logicq_draft_${problem.slug}`);
      } catch {
        // Ignore storage error
      }
      toast.info('Code restored to starter boilerplate');
    }
  };

  if (isLoading) {
    return (
      <div className="h-[80vh] flex items-center justify-center font-mono text-cyan-400 text-sm">
        <Cpu className="w-6 h-6 animate-spin mr-2" />
        Initializing LogicQ C Workspace...
      </div>
    );
  }

  if (seasonComplete) {
    return (
      <div className="max-w-3xl mx-auto py-20 px-4 text-center space-y-4">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[var(--bg-panel)] border border-[var(--color-success)] text-[var(--color-success)] text-xs font-mono font-bold">
          <CheckCircle2 className="w-4 h-4" />
          <span>Season Complete</span>
        </div>
        <h1 className="text-2xl font-heading font-extrabold text-[var(--text-main)]">
          All syllabus challenges for this season are complete!
        </h1>
        <p className="text-sm text-[var(--text-muted)]">
          Check the Weekly Leaderboard to see your final standing while the next chapter pool is prepared.
        </p>
        <Link
          to="/leaderboard"
          className="inline-flex items-center justify-center min-h-[44px] px-5 py-2.5 rounded-xl bg-[var(--color-accent)] text-[#0C0F1F] text-sm font-bold"
        >
          View Weekly Leaderboard
        </Link>
      </div>
    );
  }

  if (!problem) {
    return (
      <div className="max-w-4xl mx-auto py-20 px-4 text-center font-mono space-y-4">
        <h2 className="text-xl font-bold text-[var(--text-main)]">
          Challenge not found or not unlocked in the current week
        </h2>
        <p className="text-xs text-[var(--text-muted)]">
          Only unlocked challenges from the current 7-day week can be opened. Future challenges unlock at 17:00 IST.
        </p>
        <Link
          to="/challenge"
          className="inline-block text-[var(--color-accent)] underline text-xs font-semibold"
        >
          &larr; Return to Today&apos;s Daily Challenge
        </Link>
      </div>
    );
  }

  const sampleCases = problem.testCases || [];

  return (
    <div
      style={{ height: 'calc(100dvh - var(--navbar-height, 4rem))' }}
      className="flex flex-col w-full bg-[var(--bg-main)] text-[var(--text-main)] overflow-hidden"
    >
      {/* Current Week's 7 Challenges Strip (Weekly Catch-Up) */}
      {currentWeekDays.length > 0 && (
        <div
          data-testid="current-week-strip"
          aria-label="Current Week Challenges"
          className="flex items-center justify-between gap-2 px-3 sm:px-5 py-2 border-b border-[var(--border-line)] bg-[var(--bg-panel)] shrink-0 overflow-x-auto"
        >
          <div className="flex items-center gap-1.5 text-xs font-mono font-semibold text-[var(--text-muted)] shrink-0 mr-1">
            <Calendar className="w-3.5 h-3.5 text-[var(--color-accent)] shrink-0" />
            <span className="hidden sm:inline">This Week&apos;s 7 Challenges:</span>
            <span className="sm:hidden">Week:</span>
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto py-0.5">
            {currentWeekDays.map((day: any) => {
              const isLocked = day.status === 'LOCKED' || !day.problem;
              const isActive = Boolean(day.problem && problem.slug === day.problem.slug);

              if (isLocked) {
                return (
                  <button
                    key={day.dayNumber}
                    type="button"
                    disabled
                    aria-disabled="true"
                    data-testid={`week-day-${day.dayNumber}`}
                    data-status="LOCKED"
                    title={day.unlockLabel || `Unlocks ${day.scheduledDate} at 17:00 IST`}
                    className="flex items-center gap-1.5 min-h-[36px] px-2.5 py-1 rounded-lg text-xs font-mono bg-[var(--bg-main)] border border-[var(--border-line)] text-[var(--text-muted)] cursor-not-allowed shrink-0"
                  >
                    <Lock className="w-3 h-3 text-[var(--text-muted)] shrink-0" />
                    <span>Day {day.dayNumber}</span>
                    <span className="hidden md:inline text-[11px]">• 17:00 IST</span>
                  </button>
                );
              }

              return (
                <Link
                  key={day.dayNumber}
                  to={`/challenge/${day.problem.slug}`}
                  data-testid={`week-day-${day.dayNumber}`}
                  data-status="UNLOCKED"
                  data-solved={day.isSolved ? 'true' : 'false'}
                  title={`Day ${day.dayNumber}: ${day.problem.title} (${day.problem.difficulty})`}
                  className={`flex items-center gap-1.5 min-h-[36px] px-2.5 py-1 rounded-lg text-xs font-mono border transition-colors shrink-0 ${
                    isActive
                      ? 'bg-[var(--bg-surface)] border-[var(--color-accent)] text-[var(--color-accent)] font-bold'
                      : day.isSolved
                      ? 'bg-[var(--bg-surface)] border-[var(--border-line)] text-[var(--color-success)] hover:border-[var(--color-accent)]'
                      : 'bg-[var(--bg-main)] border-[var(--border-line)] text-[var(--text-main)] hover:border-[var(--color-accent)]'
                  }`}
                >
                  {day.isSolved ? (
                    <CheckCircle2 className="w-3.5 h-3.5 text-[var(--color-success)] shrink-0" />
                  ) : null}
                  <span>Day {day.dayNumber}</span>
                  {day.isToday && (
                    <span className="px-1.5 py-0.2 rounded bg-[var(--color-accent)]/15 text-[var(--color-accent)] text-[10px] font-bold">
                      TODAY
                    </span>
                  )}
                </Link>
              );
            })}
          </div>
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
          Output & Upload
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
          <div className="prose max-w-none text-[var(--text-main)] leading-relaxed font-sans">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {(problem.description || '')
                .replace(/\\le\b/g, '≤')
                .replace(/\\ge\b/g, '≥')
                .replace(/\\neq\b/g, '≠')
                .replace(/\\times\b/g, '×')
                .replace(/\$([^$\n]+)\$/g, '`$1`')}
            </ReactMarkdown>
          </div>

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
          {/* Top Bar for Code Actions */}
          <div className="flex items-center justify-between px-4 py-2.5 bg-[var(--bg-panel)] border-b border-[var(--border-line)] shrink-0 gap-2">
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono text-[var(--text-muted)] flex items-center gap-1.5">
                <span
                  className={`w-2 h-2 rounded-full ${
                    isOffline ? 'bg-[var(--color-error)]' : 'bg-[var(--color-success)]'
                  }`}
                ></span>
                <span>{isOffline ? 'Offline — code saved on device' : 'C11 Compiler'}</span>
              </span>
              {isOffline && <WifiOff className="w-3.5 h-3.5 text-[var(--color-error)]" />}
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => runMutation.mutate()}
                disabled={runMutation.isPending || isOffline}
                title={isOffline ? 'Reconnect to run code' : 'Run code with custom stdin'}
                className="flex items-center gap-1.5 min-h-[38px] px-3 py-1.5 rounded-lg text-xs font-mono font-semibold text-[var(--text-main)] bg-[var(--bg-surface)] hover:bg-[var(--bg-surface-hover)] border border-[var(--border-line)] disabled:opacity-50 transition-colors"
              >
                <Play className="w-3.5 h-3.5 text-[var(--color-accent)]" />
                <span>{runMutation.isPending ? 'Running...' : 'Run Code'}</span>
              </button>

              <button
                type="button"
                onClick={() => submitMutation.mutate()}
                disabled={submitMutation.isPending || isOffline}
                title={isOffline ? 'Reconnect to submit solution' : 'Submit solution to judge'}
                className="flex items-center gap-1.5 min-h-[38px] px-4 py-1.5 rounded-lg text-xs font-mono font-bold text-[#0C0F1F] bg-gradient-to-r from-cyan-400 to-emerald-400 shadow-md disabled:opacity-50 transition-all"
              >
                <Send className="w-3.5 h-3.5" />
                <span>{submitMutation.isPending ? 'Evaluating...' : 'Submit Solution'}</span>
              </button>
            </div>
          </div>

          {/* Editor Container */}
          <div className="flex-1 min-h-0 overflow-hidden p-2">
            <CodeEditor
              code={code}
              onChange={handleCodeChange}
              onRun={() => !isOffline && runMutation.mutate()}
              onSubmit={() => !isOffline && submitMutation.mutate()}
              onReset={handleResetCode}
              isSubmitting={submitMutation.isPending}
              isRunning={runMutation.isPending}
            />
          </div>

          {/* Bottom Execution Panel Drawer (Tabs: Custom Stdin, Verdict & Output, Upload Files) */}
          <div
            className={`border-t border-[var(--border-line)] bg-[var(--bg-panel)] transition-all duration-200 flex flex-col shrink-0 ${
              isDrawerOpen ? 'h-64 max-h-[44%]' : 'h-11'
            }`}
          >
            {/* Drawer Header */}
            <div className="flex items-center justify-between px-4 py-1.5 bg-[var(--bg-surface)] border-b border-[var(--border-line)] shrink-0">
              <div className="flex items-center gap-1.5 overflow-x-auto">
                <button
                  type="button"
                  data-testid="tab-custom-stdin"
                  onClick={() => {
                    setActiveBottomTab('custom');
                    setIsDrawerOpen(true);
                  }}
                  className={`px-3 py-1.5 text-xs font-mono rounded-md transition-colors whitespace-nowrap ${
                    activeBottomTab === 'custom'
                      ? 'text-[var(--color-accent)] bg-[var(--bg-panel)] border border-[var(--color-accent)] font-bold'
                      : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'
                  }`}
                >
                  Custom Stdin
                </button>

                <button
                  type="button"
                  data-testid="tab-verdict-output"
                  onClick={() => {
                    setActiveBottomTab('output');
                    setIsDrawerOpen(true);
                  }}
                  className={`px-3 py-1.5 text-xs font-mono rounded-md transition-colors whitespace-nowrap ${
                    activeBottomTab === 'output'
                      ? 'text-[var(--color-accent)] bg-[var(--bg-panel)] border border-[var(--color-accent)] font-bold'
                      : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'
                  }`}
                >
                  Verdict & Output
                  {submissionResult && (
                    <span className="ml-1.5 inline-block w-2 h-2 rounded-full bg-[var(--color-accent)]" />
                  )}
                </button>

                <button
                  type="button"
                  data-testid="tab-upload-files"
                  onClick={() => {
                    setActiveBottomTab('upload');
                    setIsDrawerOpen(true);
                  }}
                  className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-mono rounded-md transition-colors whitespace-nowrap ${
                    activeBottomTab === 'upload'
                      ? 'text-[var(--color-accent)] bg-[var(--bg-panel)] border border-[var(--color-accent)] font-bold'
                      : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'
                  }`}
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>Upload Files</span>
                  {latestUpload && (
                    <span className="ml-1 px-1.5 py-0.2 rounded bg-[var(--color-accent)]/15 text-[var(--color-accent)] text-[10px]">
                      {latestUpload.status === 'PENDING_REVIEW'
                        ? 'Pending'
                        : latestUpload.status === 'APPROVED'
                        ? 'Approved'
                        : latestUpload.status === 'NEEDS_CHANGES'
                        ? 'Changes'
                        : 'Rejected'}
                    </span>
                  )}
                </button>
              </div>

              <button
                type="button"
                aria-label={isDrawerOpen ? 'Collapse execution drawer' : 'Expand execution drawer'}
                onClick={() => setIsDrawerOpen(!isDrawerOpen)}
                className="p-1.5 rounded text-[var(--text-muted)] hover:text-[var(--text-main)] transition-colors"
              >
                {isDrawerOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
              </button>
            </div>

            {/* Drawer Body */}
            {isDrawerOpen && (
              <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain p-4 font-mono text-xs">
                {/* Tab 1: Custom Stdin */}
                {activeBottomTab === 'custom' && (
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
                      onChange={(e) => setCustomInput(e.target.value)}
                      rows={4}
                      className="w-full flex-1 p-2.5 rounded-lg bg-[var(--bg-main)] border border-[var(--border-line)] text-xs font-mono text-[var(--text-main)] resize-none"
                      placeholder="Enter raw input here..."
                    />
                  </div>
                )}

                {/* Tab 2: Verdict & Output */}
                {activeBottomTab === 'output' && (
                  <div className="space-y-4">
                    {/* Submission Verdict Banner */}
                    {submissionResult && (
                      <div className="p-3.5 rounded-xl border border-[var(--border-line)] bg-[var(--bg-surface)] flex items-center justify-between">
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
                          <span className="text-[var(--color-success)] font-bold">
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
                          Compiler Diagnostics (GCC):
                        </span>
                        <pre className="p-3 rounded-lg bg-[var(--bg-main)] border border-[var(--color-error)] text-[var(--color-error)] overflow-x-auto whitespace-pre-wrap">
                          {submissionResult.compileOutput}
                        </pre>
                      </div>
                    )}

                    {/* Ephemeral Run Result Output */}
                    {runResult && !submissionResult && (
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-[var(--text-muted)] text-xs">Custom Run Output:</span>
                          <span className="text-[var(--color-accent)] font-semibold">
                            {runResult.runtimeMs ?? runResult.executionTimeMs ?? 0}ms
                          </span>
                        </div>
                        {runResult.compileOutput ? (
                          <div>
                            <span className="text-[var(--color-error)] font-semibold block mb-1">
                              Compiler Diagnostics:
                            </span>
                            <pre className="p-3 rounded-lg bg-[var(--bg-main)] border border-[var(--color-error)] text-[var(--color-error)] overflow-x-auto whitespace-pre-wrap">
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
                        Click &apos;Run Code&apos; or &apos;Submit Solution&apos; to view compiler and test diagnostics.
                      </div>
                    )}
                  </div>
                )}

                {/* Tab 3: Upload Files */}
                {activeBottomTab === 'upload' && (
                  <div className="space-y-4 font-sans">
                    <div className="p-3 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-line)] flex items-start justify-between gap-3 flex-wrap">
                      <div className="space-y-0.5">
                        <p className="text-xs font-semibold text-[var(--text-main)]">
                          Uploaded solutions are reviewed by an instructor. Points are awarded after approval.
                        </p>
                        <p className="text-[11px] text-[var(--text-muted)] font-mono">
                          Allowed: JPG, PNG, WebP, PDF • Max {UPLOAD_CONFIG.MAX_FILES_PER_SUBMISSION} files • Max 5 MB per file • Max {UPLOAD_CONFIG.MAX_UPLOADS_PER_STUDENT_PER_DAY} uploads/day
                        </p>
                      </div>
                    </div>

                    {/* Existing upload status banner */}
                    {latestUpload && (
                      <div className="p-3.5 rounded-xl bg-[var(--bg-main)] border border-[var(--border-line)] flex items-center justify-between gap-3 flex-wrap">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-[var(--text-main)]">
                              Latest Uploaded Solution:
                            </span>
                            <span
                              className={`px-2 py-0.5 rounded text-[11px] font-mono font-bold ${
                                latestUpload.status === 'APPROVED'
                                  ? 'bg-[var(--color-success)]/15 text-[var(--color-success)]'
                                  : latestUpload.status === 'REJECTED'
                                  ? 'bg-[var(--color-error)]/15 text-[var(--color-error)]'
                                  : 'bg-[var(--color-accent)]/15 text-[var(--color-accent)]'
                              }`}
                            >
                              {latestUpload.status}
                            </span>
                            {latestUpload.pointsAwarded > 0 && (
                              <span className="text-xs font-mono font-bold text-[var(--color-success)]">
                                +{latestUpload.pointsAwarded} PTS
                              </span>
                            )}
                          </div>
                          {latestUpload.reviewerComment && (
                            <p className="text-xs text-[var(--text-muted)]">
                              Reviewer feedback: &ldquo;{latestUpload.reviewerComment}&rdquo;
                            </p>
                          )}
                        </div>

                        {latestUpload.status === 'PENDING_REVIEW' && (
                          <button
                            type="button"
                            onClick={() => cancelUploadMutation.mutate(latestUpload.id)}
                            disabled={cancelUploadMutation.isPending}
                            className="px-3 py-1.5 rounded-lg border border-[var(--color-error)] text-[var(--color-error)] text-xs font-semibold hover:bg-[var(--color-error)]/10 transition-colors"
                          >
                            Cancel Pending Upload
                          </button>
                        )}
                      </div>
                    )}

                    {userStatus?.isSolved ? (
                      <div className="p-4 rounded-xl bg-[var(--bg-main)] border border-[var(--color-success)] text-xs text-[var(--color-success)] flex items-center gap-2 font-semibold">
                        <CheckCircle2 className="w-4 h-4 shrink-0" />
                        <span>
                          You already have an Accepted solution for this problem. No further file upload is needed.
                        </span>
                      </div>
                    ) : (
                      <>
                        {/* Drop Zone & File / Camera Triggers */}
                        <div
                          onDragOver={(e) => e.preventDefault()}
                          onDrop={(e) => {
                            e.preventDefault();
                            handleSelectFiles(e.dataTransfer.files);
                          }}
                          className="rounded-xl border-2 border-dashed border-[var(--border-line)] hover:border-[var(--color-accent)] bg-[var(--bg-main)] p-4 text-center space-y-3 transition-colors"
                        >
                          <p className="text-xs text-[var(--text-muted)]">
                            Drag &amp; drop handwritten flowcharts, dry-run notes, or output screenshots here
                          </p>
                          <div className="flex items-center justify-center gap-2.5 flex-wrap">
                            <input
                              ref={fileInputRef}
                              type="file"
                              multiple
                              accept=".jpg,.jpeg,.png,.webp,.pdf,image/jpeg,image/png,image/webp,application/pdf"
                              onChange={(e) => handleSelectFiles(e.target.files)}
                              className="hidden"
                            />
                            <input
                              ref={cameraInputRef}
                              type="file"
                              accept="image/*"
                              capture="environment"
                              onChange={(e) => handleSelectFiles(e.target.files)}
                              className="hidden"
                            />
                            <button
                              type="button"
                              onClick={() => fileInputRef.current?.click()}
                              className="inline-flex items-center gap-1.5 min-h-[40px] px-3.5 py-1.5 rounded-lg bg-[var(--bg-surface)] border border-[var(--border-line)] hover:border-[var(--color-accent)] text-xs font-semibold text-[var(--text-main)]"
                            >
                              <Upload className="w-3.5 h-3.5 text-[var(--color-accent)]" />
                              <span>Choose files</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => cameraInputRef.current?.click()}
                              className="inline-flex items-center gap-1.5 min-h-[40px] px-3.5 py-1.5 rounded-lg bg-[var(--bg-surface)] border border-[var(--border-line)] hover:border-[var(--color-accent)] text-xs font-semibold text-[var(--text-main)]"
                            >
                              <Camera className="w-3.5 h-3.5 text-[var(--color-success)]" />
                              <span>Take photo</span>
                            </button>
                          </div>
                        </div>

                        {uploadError && (
                          <div className="p-2.5 rounded-lg bg-[var(--color-error)]/10 border border-[var(--color-error)] text-[var(--color-error)] text-xs flex items-center gap-2">
                            <AlertCircle className="w-4 h-4 shrink-0" />
                            <span>{uploadError}</span>
                          </div>
                        )}

                        {/* File Previews with Remove Buttons */}
                        {stagedFiles.length > 0 && (
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                            {stagedFiles.map((file) => (
                              <div
                                key={file.id}
                                className="p-2.5 rounded-xl bg-[var(--bg-main)] border border-[var(--border-line)] flex items-center justify-between gap-2"
                              >
                                <div className="flex items-center gap-2 min-w-0">
                                  {file.previewUrl ? (
                                    <img
                                      src={file.previewUrl}
                                      alt="Selected upload preview"
                                      className="w-10 h-10 rounded object-cover border border-[var(--border-line)] shrink-0"
                                    />
                                  ) : (
                                    <div className="w-10 h-10 rounded bg-[var(--bg-surface)] border border-[var(--border-line)] flex items-center justify-center shrink-0">
                                      <FileText className="w-5 h-5 text-[var(--color-accent)]" />
                                    </div>
                                  )}
                                  <div className="min-w-0">
                                    <p className="text-xs font-semibold text-[var(--text-main)] truncate">
                                      {file.name}
                                    </p>
                                    <p className="text-[10px] font-mono text-[var(--text-muted)]">
                                      {(file.sizeBytes / 1024).toFixed(1)} KB
                                    </p>
                                  </div>
                                </div>
                                <button
                                  type="button"
                                  aria-label={`Remove ${file.name}`}
                                  onClick={() => handleRemoveStagedFile(file.id)}
                                  className="p-1.5 rounded-lg text-[var(--color-error)] hover:bg-[var(--bg-surface)] shrink-0"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            ))}
                          </div>
                        )}

                        {/* Optional Approach Note + Submit for Review Button */}
                        <div className="space-y-2">
                          <div className="flex items-center justify-between text-xs">
                            <label htmlFor="upload-approach-note" className="text-[var(--text-muted)] font-medium">
                              Explain your approach (optional):
                            </label>
                            <span className="font-mono text-[11px] text-[var(--text-muted)]">
                              {studentNote.length}/{UPLOAD_CONFIG.MAX_NOTE_LENGTH}
                            </span>
                          </div>
                          <textarea
                            id="upload-approach-note"
                            value={studentNote}
                            onChange={(e) =>
                              setStudentNote(e.target.value.slice(0, UPLOAD_CONFIG.MAX_NOTE_LENGTH))
                            }
                            rows={2}
                            placeholder="Briefly explain your algorithm, time/space complexity, or dry-run steps..."
                            className="w-full p-2.5 rounded-lg bg-[var(--bg-main)] border border-[var(--border-line)] text-xs text-[var(--text-main)] resize-none"
                          />
                        </div>

                        <div className="flex justify-end">
                          <button
                            type="button"
                            data-testid="submit-upload-button"
                            disabled={
                              stagedFiles.length === 0 || uploadMutation.isPending || isOffline
                            }
                            onClick={() => uploadMutation.mutate()}
                            className="inline-flex items-center gap-2 min-h-[40px] px-4 py-2 rounded-xl bg-[var(--color-accent)] text-[#0C0F1F] text-xs font-bold disabled:opacity-50 hover:opacity-95 transition-opacity"
                          >
                            <Upload className="w-3.5 h-3.5" />
                            <span>
                              {uploadMutation.isPending
                                ? 'Uploading...'
                                : latestUpload &&
                                  (latestUpload.status === 'PENDING_REVIEW' ||
                                    latestUpload.status === 'NEEDS_CHANGES')
                                ? 'Replace Upload for Review'
                                : 'Submit for review'}
                            </span>
                          </button>
                        </div>
                      </>
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
