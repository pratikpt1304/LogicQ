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
  ArrowLeft,
  Terminal,
  BookOpen,
  Upload,
  Camera,
  FileText,
  Trash2,
  Lock,
  Cloud,
} from 'lucide-react';
import {
  DraftSyncService,
  DraftData,
  ConflictInfo,
  getDeviceLabel,
} from '../services/draftSync.service.js';
import { DraftConflictModal } from '../components/editor/DraftConflictModal.js';
import { PracticeTimer, PracticeTimerHandle } from '../components/practice/PracticeTimer.js';

interface StagedUploadFile {
  id: string;
  name: string;
  mimeType: string;
  sizeBytes: number;
  dataBase64: string;
  previewUrl?: string;
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
  const [isDrawerOpen, setIsDrawerOpen] = useState(true);
  const [activeBottomTab, setActiveBottomTab] = useState<'custom' | 'output' | 'upload'>('custom');

  const [stagedFiles, setStagedFiles] = useState<StagedUploadFile[]>([]);
  const [studentNote, setStudentNote] = useState<string>('');
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const cameraInputRef = useRef<HTMLInputElement | null>(null);

  const initializedProblemIdRef = useRef<string | null>(null);
  const pollTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const practiceTimerRef = useRef<PracticeTimerHandle | null>(null);
  const [draftSyncStatus, setDraftSyncStatus] = useState<'saved' | 'saving' | 'offline'>('saved');
  const [conflictInfo, setConflictInfo] = useState<ConflictInfo | null>(null);
  const autosaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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

  // Restore local draft or starter code, then sync cloud draft
  useEffect(() => {
    if (problem && problem.id !== initializedProblemIdRef.current) {
      initializedProblemIdRef.current = problem.id;

      // 1. Instant local cache restore
      const localDraft = DraftSyncService.getLocalDraft(problem.slug, true);
      let initialCode = problem.starterCode;

      if (localDraft?.code) {
        initialCode = localDraft.code;
        setCode(localDraft.code);
      } else {
        setCode(problem.starterCode);
      }

      if (problem.sampleTests && problem.sampleTests.length > 0) {
        setCustomInput(problem.sampleTests[0].input);
      }

      // 2. Authoritative cloud draft sync
      if (user?.id) {
        DraftSyncService.fetchRemoteDraft(user.id, problem.slug, true).then((remoteDraft) => {
          if (!remoteDraft) return;

          const conflict = DraftSyncService.detectConflict(localDraft, remoteDraft);
          if (conflict) {
            setConflictInfo(conflict);
          } else if (remoteDraft.code && remoteDraft.code !== initialCode) {
            setCode(remoteDraft.code);
            DraftSyncService.saveLocalDraft(remoteDraft, true);
          }
        }).catch(() => {});
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
      setCode(conflictInfo.remoteDraft.code);
      DraftSyncService.saveLocalDraft(conflictInfo.remoteDraft, true);
      setConflictInfo(null);
      toast.success('Restored newer draft from cloud');
    }
  };

  const handleKeepLocalDraft = () => {
    if (conflictInfo && user?.id) {
      const updatedLocal: DraftData = {
        ...conflictInfo.localDraft,
        updatedAt: Date.now(),
        deviceLabel: getDeviceLabel(),
      };
      DraftSyncService.saveLocalDraft(updatedLocal, true);
      DraftSyncService.saveRemoteDraft(user.id, updatedLocal, true);
      setConflictInfo(null);
      toast.success('Kept local code and updated cloud');
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
    mutationFn: async () => {
      if (practiceTimerRef.current) {
        await practiceTimerRef.current.syncNow('submit');
      }
      return api.post('/submissions/submit', {
        problemId: problem.id,
        code,
      });
    },
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

  // Query for student's uploaded solution files for this practice problem
  const { data: myUploadsData, refetch: refetchMyUploads } = useQuery({
    queryKey: ['my-uploads', problem?.id || problemSlug],
    queryFn: () => api.get(`/uploads/my?problemId=${problem?.id || problemSlug}`),
    enabled: Boolean((problem?.id || problemSlug) && user),
    refetchOnWindowFocus: false,
  });

  const myProblemUploads: any[] = myUploadsData?.data || [];
  const latestUpload = myProblemUploads[0] || null;

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
        problemId: problem?.id || problemSlug,
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
    onSuccess: (res: any) => {
      toast.success(
        res.message || 'Uploaded for review. Solution saved successfully.'
      );
      setStagedFiles([]);
      setStudentNote('');
      setUploadError(null);
      refetchMyUploads();
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

        {/* Action Buttons & Timer: Timer, Run & Submit */}
        <div className="flex items-center gap-2.5 shrink-0">
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
            <span className="hidden sm:flex items-center gap-1 text-[11px] font-mono text-[var(--text-muted)] pr-2 border-r border-[var(--border-line)]">
              <Cloud className={`w-3.5 h-3.5 ${draftSyncStatus === 'saving' ? 'text-amber-400 animate-pulse' : 'text-emerald-400'}`} />
              <span>{draftSyncStatus === 'saving' ? 'Saving...' : 'Synced'}</span>
            </span>
          )}
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
                <button
                  onClick={() => {
                    setActiveBottomTab('upload');
                    setIsDrawerOpen(true);
                  }}
                  className={`flex items-center gap-1.5 px-3 py-1 text-xs font-mono rounded-md transition-colors ${
                    activeBottomTab === 'upload' && isDrawerOpen
                      ? 'bg-[var(--bg-surface)] text-[var(--accent)] font-semibold border border-[var(--border-line)]'
                      : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'
                  }`}
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>Upload Files</span>
                  {latestUpload && (
                    <span className="ml-1 px-1.5 py-0.2 rounded bg-[var(--accent)]/15 text-[var(--accent)] text-[10px]">
                      {latestUpload.status === 'PENDING_REVIEW'
                        ? 'Pending'
                        : latestUpload.status === 'APPROVED'
                        ? 'Approved'
                        : latestUpload.status === 'NEEDS_CHANGES'
                        ? 'Changes'
                        : 'Uploaded'}
                    </span>
                  )}
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
              <div className="h-56 p-3 overflow-y-auto font-mono text-xs">
                {activeBottomTab === 'custom' ? (
                  <div className="h-full flex flex-col">
                    <textarea
                      value={customInput}
                      onChange={(e) => setCustomInput(e.target.value)}
                      placeholder="Enter standard input (stdin) for Run Code..."
                      className="w-full flex-1 p-2.5 rounded-lg bg-[var(--bg-main)] text-[var(--text-main)] border border-[var(--border-line)] focus:outline-none focus:border-[var(--accent)] resize-none"
                    />
                  </div>
                ) : activeBottomTab === 'output' ? (
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
                ) : (
                  /* Tab 3: Upload Files */
                  <div className="space-y-4 font-sans">
                    <div className="p-3 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-line)] flex items-start justify-between gap-3 flex-wrap">
                      <div className="space-y-0.5">
                        <p className="text-xs font-semibold text-[var(--text-main)]">
                          Upload handwritten solutions, flowcharts, or code files for practice review.
                        </p>
                        <p className="text-[11px] text-[var(--text-muted)] font-mono">
                          Allowed: JPG, PNG, WebP, PDF • Max {UPLOAD_CONFIG.MAX_FILES_PER_SUBMISSION} files • Max 5 MB per file
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
                                  : 'bg-[var(--accent)]/15 text-[var(--accent)]'
                              }`}
                            >
                              {latestUpload.status}
                            </span>
                            {latestUpload.pointsAwarded > 0 && (
                              <span className="text-xs font-mono font-bold text-emerald-400">
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
                            className="px-3 py-1.5 rounded-lg border border-rose-500/30 text-rose-400 text-xs font-semibold hover:bg-rose-500/10 transition-colors"
                          >
                            Cancel Pending Upload
                          </button>
                        )}
                      </div>
                    )}

                    {/* Upload Controls */}
                    <div className="space-y-3">
                      <div className="flex items-center gap-2 flex-wrap">
                        <input
                          ref={fileInputRef}
                          type="file"
                          multiple
                          accept={UPLOAD_CONFIG.ALLOWED_EXTENSIONS.join(',')}
                          className="hidden"
                          onChange={(e) => handleSelectFiles(e.target.files)}
                        />
                        <button
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-[var(--bg-surface)] hover:bg-[var(--bg-surface-hover)] border border-[var(--border-line)] text-xs font-semibold text-[var(--text-main)] transition-colors"
                        >
                          <Upload className="w-3.5 h-3.5 text-[var(--accent)]" />
                          <span>Choose Files</span>
                        </button>

                        <input
                          ref={cameraInputRef}
                          type="file"
                          accept="image/*"
                          capture="environment"
                          className="hidden"
                          onChange={(e) => handleSelectFiles(e.target.files)}
                        />
                        <button
                          type="button"
                          onClick={() => cameraInputRef.current?.click()}
                          className="sm:hidden flex items-center gap-1.5 px-3 py-2 rounded-lg bg-[var(--bg-surface)] hover:bg-[var(--bg-surface-hover)] border border-[var(--border-line)] text-xs font-semibold text-[var(--text-main)] transition-colors"
                        >
                          <Camera className="w-3.5 h-3.5 text-[var(--accent)]" />
                          <span>Capture Photo</span>
                        </button>

                        <span className="text-xs text-[var(--text-muted)]">
                          {stagedFiles.length}/{UPLOAD_CONFIG.MAX_FILES_PER_SUBMISSION} files selected
                        </span>
                      </div>

                      {uploadError && (
                        <div className="p-2.5 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs">
                          {uploadError}
                        </div>
                      )}

                      {/* Staged Files Preview Grid */}
                      {stagedFiles.length > 0 && (
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1">
                          {stagedFiles.map((sf) => (
                            <div
                              key={sf.id}
                              className="relative rounded-lg border border-[var(--border-line)] bg-[var(--bg-surface)] p-2 flex items-center gap-2"
                            >
                              {sf.previewUrl ? (
                                <img
                                  src={sf.previewUrl}
                                  alt={sf.name}
                                  className="w-10 h-10 object-cover rounded"
                                />
                              ) : (
                                <FileText className="w-10 h-10 text-[var(--text-muted)] p-2" />
                              )}
                              <div className="flex-1 min-w-0 text-xs">
                                <p className="font-semibold text-[var(--text-main)] truncate">
                                  {sf.name}
                                </p>
                                <p className="text-[10px] text-[var(--text-muted)] font-mono">
                                  {(sf.sizeBytes / 1024).toFixed(1)} KB
                                </p>
                              </div>
                              <button
                                type="button"
                                onClick={() => handleRemoveStagedFile(sf.id)}
                                className="p-1 rounded text-rose-400 hover:bg-rose-500/10"
                                title="Remove file"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Student Approach Note */}
                      <div className="space-y-1">
                        <label className="text-xs text-[var(--text-muted)] block">
                          Approach / Solution Note (optional):
                        </label>
                        <textarea
                          value={studentNote}
                          onChange={(e) => setStudentNote(e.target.value.slice(0, UPLOAD_CONFIG.MAX_NOTE_LENGTH))}
                          rows={2}
                          placeholder="Briefly explain your approach or key steps..."
                          className="w-full p-2 rounded-lg bg-[var(--bg-main)] text-[var(--text-main)] border border-[var(--border-line)] text-xs resize-none focus:outline-none focus:border-[var(--accent)]"
                        />
                      </div>

                      {/* Submit Upload Button */}
                      <div>
                        <button
                          type="button"
                          onClick={() => uploadMutation.mutate()}
                          disabled={stagedFiles.length === 0 || uploadMutation.isPending}
                          className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-[var(--accent)] to-indigo-600 hover:opacity-95 text-xs font-bold text-white shadow-sm disabled:opacity-50 transition-all"
                        >
                          <Upload className="w-3.5 h-3.5" />
                          <span>
                            {uploadMutation.isPending
                              ? 'Uploading...'
                              : latestUpload && (latestUpload.status === 'PENDING_REVIEW' || latestUpload.status === 'NEEDS_CHANGES')
                              ? 'Replace Upload for Review'
                              : 'Upload Files for Review'}
                          </span>
                        </button>
                      </div>
                    </div>
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
