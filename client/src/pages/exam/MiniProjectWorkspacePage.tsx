import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import confetti from 'canvas-confetti';
import { toast } from 'sonner';
import { api } from '../../api/client.js';
import { CodeEditor } from '../../components/editor/CodeEditor.js';
import {
  FileText,
  Lock,
  Play,
  Send,
  ShieldAlert,
  ShieldCheck,
  Clock,
  Layers,
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  Award,
} from 'lucide-react';

export const MiniProjectWorkspacePage: React.FC = () => {
  const { miniProjectId } = useParams<{ miniProjectId: string }>();
  const [code, setCode] = useState<string>('');
  const [rubricScores, setRubricScores] = useState<any | null>(null);
  const [score, setScore] = useState<number | null>(null);
  const [isSubmitted, setIsSubmitted] = useState<boolean>(false);

  const { data, isLoading, error } = useQuery({
    queryKey: ['student-mini-project', miniProjectId],
    queryFn: () => api.get(`/mini-project/${miniProjectId}`),
    enabled: Boolean(miniProjectId),
    retry: false,
  });

  useEffect(() => {
    if (data?.project?.starterCode && !code) {
      setCode(data.project.starterCode);
    }
    if (data?.access?.status === 'SUBMITTED' || data?.access?.status === 'EVALUATED') {
      setIsSubmitted(true);
      setScore(data.access.academicScore);
      try {
        if (data.access.rubricScoresJson) {
          setRubricScores(JSON.parse(data.access.rubricScoresJson));
        }
      } catch {}
    }
  }, [data]);

  const submitMutation = useMutation({
    mutationFn: async () => {
      return api.post('/mini-project/submit', {
        miniProjectId,
        code,
      });
    },
    onSuccess: (res) => {
      setIsSubmitted(true);
      setScore(res.academicScore);
      setRubricScores(res.rubricScores);
      confetti({ particleCount: 100, spread: 80, origin: { y: 0.6 } });
      toast.success(`Mini-Project Submitted! Score: ${res.academicScore} / 20 Marks.`);
    },
    onError: (err: any) => {
      toast.error(err.message || 'Submission failed.');
    },
  });

  if (isLoading) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center p-6 text-center font-mono">
        <div className="w-8 h-8 rounded-full border-2 border-cyan-400 border-t-transparent animate-spin mb-3" />
        <span className="text-xs text-gray-400">Loading Integrated Mini-Project Workspace...</span>
      </div>
    );
  }

  // Section 36 & 37: Mini-project is initially INACTIVE until individually activated by faculty
  if (error || (data && !data.success)) {
    const isInactive = (error as any)?.message?.includes('MINI_PROJECT_INACTIVE') || (error as any)?.code === 'MINI_PROJECT_INACTIVE';

    return (
      <div className="max-w-2xl mx-auto px-4 py-16 text-center font-mono space-y-6">
        <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-500 mx-auto">
          <Lock className="w-8 h-8" />
        </div>
        <div className="space-y-2">
          <span className="px-3 py-1 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 text-xs font-semibold border border-amber-500/20">
            Section 36 & 37 Protocol
          </span>
          <h1 className="text-2xl font-bold text-[var(--text-main)] tracking-tight">
            Mini-Project Inactive
          </h1>
          <p className="text-sm text-[var(--text-muted)] max-w-md mx-auto leading-relaxed">
            {isInactive
              ? 'Under institutional curriculum policy, the integrated mini-project is initially inactive and can only be activated individually by your course faculty mentor.'
              : ((error as any)?.message || 'Unable to access this mini-project.')}
          </p>
        </div>
        <div className="flex flex-wrap items-center justify-center gap-3">
          <button
            onClick={async () => {
              try {
                await api.post('/mini-project/activate-practice', { miniProjectId });
                toast.success('Practice access activated!');
                window.location.reload();
              } catch (e: any) {
                toast.error(e.message || 'Activation failed');
              }
            }}
            className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-bold text-xs shadow-md shadow-cyan-950/20 transition-all"
          >
            Activate Practice Mode (Self-Paced)
          </button>
          <Link
            to="/student/tests"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-line)] hover:bg-[var(--bg-surface-hover)] text-[var(--text-main)] font-medium text-xs transition-colors shadow-sm"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Return to My Tests</span>
          </Link>
        </div>
      </div>
    );
  }

  const project = data.project;
  let parsedRubric: any[] = [];
  try {
    parsedRubric = JSON.parse(project.rubricJson || '[]');
  } catch {
    parsedRubric = [];
  }

  return (
    <div className="min-h-screen bg-[var(--bg-base)] text-[var(--text-main)] flex flex-col font-mono text-xs">
      {/* Header */}
      <header className="bg-[var(--bg-panel)] border-b border-[var(--border-line)] px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link to="/student/tests" className="text-[var(--text-muted)] hover:text-[var(--text-main)] transition-colors">
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <span className="text-[var(--text-muted)] opacity-50">|</span>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="font-bold text-[var(--text-main)] text-sm">{project.title}</span>
          </div>
          <span className="px-2.5 py-0.5 rounded bg-cyan-500/10 border border-cyan-500/30 text-cyan-600 dark:text-cyan-400">
            20 Marks Total (Section 35)
          </span>
        </div>

        <div className="flex items-center gap-4">
          {isSubmitted && (
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 font-bold">
              <Award className="w-3.5 h-3.5" />
              <span>Score: {score} / 20 Marks</span>
            </div>
          )}
          <button
            disabled={isSubmitted || submitMutation.isPending}
            onClick={() => submitMutation.mutate()}
            className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-semibold transition-colors shadow-md shadow-emerald-900/20"
          >
            <Send className="w-3.5 h-3.5" />
            <span>{submitMutation.isPending ? 'Evaluating...' : isSubmitted ? 'Submitted' : 'Submit Mini-Project'}</span>
          </button>
        </div>
      </header>

      {/* Main Two-Pane Layout */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
        {/* Right on desktop: Project Scenario & 4-Competency Rubric (Section 35) */}
        <div className="w-full lg:w-1/2 p-6 overflow-y-auto border-l border-[var(--border-line)] bg-[var(--bg-panel)] space-y-6 lg:order-2">
          <div className="space-y-2">
            <div className="text-[var(--text-muted)]">Module: {project.moduleId}</div>
            <h1 className="text-xl font-bold text-[var(--text-main)] tracking-tight">{project.title}</h1>
          </div>

          <div className="bg-[var(--bg-surface)] border border-[var(--border-line)] rounded-xl p-4 space-y-2">
            <div className="text-cyan-600 dark:text-cyan-400 font-bold uppercase tracking-wider text-[11px]">
              Real-World Engineering Scenario
            </div>
            <p className="text-[var(--text-main)] leading-relaxed font-sans text-sm">
              {project.scenario}
            </p>
          </div>

          <div className="space-y-2">
            <div className="text-[var(--text-main)] font-bold uppercase tracking-wider text-[11px]">
              Technical Requirements
            </div>
            <div className="bg-[var(--bg-base)] border border-[var(--border-line)] rounded-xl p-4 text-[var(--text-main)] font-sans text-sm whitespace-pre-line leading-relaxed">
              {project.requirements}
            </div>
          </div>

          {/* Rubric Breakdown (Section 35: 4 competencies x 5 marks each = 20) */}
          <div className="space-y-3 pt-4 border-t border-[var(--border-line)]">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-[var(--text-main)] uppercase tracking-wider text-[11px]">
                Evaluation Rubric (4 Sections x 5 Marks = 20 Marks)
              </h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {parsedRubric.map((r: any, idx: number) => {
                const achieved = rubricScores ? Object.values(rubricScores)[idx] : null;
                return (
                  <div
                    key={idx}
                    className="bg-[var(--bg-surface)] border border-[var(--border-line)] rounded-xl p-3 flex flex-col justify-between"
                  >
                    <div className="text-[var(--text-muted)] text-[11px] font-sans">{r.competency}</div>
                    <div className="flex items-center justify-between pt-2 border-t border-[var(--border-line)] mt-2 font-mono font-bold">
                      <span className="text-[var(--text-muted)]">Max: {r.maxMarks}</span>
                      {achieved !== null && achieved !== undefined ? (
                        <span className="text-emerald-600 dark:text-emerald-400 font-bold">Awarded: {String(achieved)}</span>
                      ) : (
                        <span className="text-[var(--text-muted)] opacity-60">Pending</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Left on desktop: Code Editor */}
        <div className="w-full lg:w-1/2 flex flex-col bg-[var(--bg-base)] lg:border-r border-[var(--border-line)] lg:order-1">
          <div className="bg-[var(--bg-surface)] border-b border-[var(--border-line)] px-4 py-2 flex items-center justify-between text-[var(--text-muted)] font-semibold">
            <span>Modular C Architecture Editor</span>
            <span>C11 Standard</span>
          </div>

          <div className="flex-1 min-h-[450px]">
            <CodeEditor
              code={code}
              onChange={setCode}
              readOnly={isSubmitted}
            />
          </div>
        </div>
      </div>
    </div>
  );
};
export default MiniProjectWorkspacePage;
