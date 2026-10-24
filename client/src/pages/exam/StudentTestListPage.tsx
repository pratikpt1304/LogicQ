import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { api } from '../../api/client.js';
import { toast } from 'sonner';
import {
  FileText,
  Clock,
  CheckCircle2,
  AlertCircle,
  ShieldCheck,
  ChevronRight,
  BookOpen,
  Calendar,
  Lock,
  Award,
  Layers,
  KeyRound,
  Plus,
} from 'lucide-react';

export const StudentTestListPage: React.FC = () => {
  const queryClient = useQueryClient();
  const [joinCode, setJoinCode] = useState('');

  const { data, isLoading, error } = useQuery({
    queryKey: ['my-assigned-tests'],
    queryFn: () => api.get('/exam/my-tests'),
    refetchOnWindowFocus: false,
  });

  const joinMutation = useMutation({
    mutationFn: async (code: string) => {
      return await api.post('/sections/enroll-by-code', { joinCode: code });
    },
    onSuccess: (res: any) => {
      toast.success(res?.message || 'Joined section successfully! Tests unlocked.');
      setJoinCode('');
      queryClient.invalidateQueries({ queryKey: ['my-assigned-tests'] });
    },
    onError: (err: any) => {
      toast.error(err?.message || 'Invalid join code or section not found.');
    },
  });

  const assignments = data?.data || data?.assignments || [];

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-8 animate-fadeIn">
      {/* Page Header */}
      <div className="glass-card border border-[var(--border-line)] bg-[var(--bg-panel)] rounded-2xl p-6 sm:p-8 shadow-sm">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-600 dark:text-cyan-400 text-xs font-mono font-medium mb-3">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Smart Exam & Assessment Engine (Proctored)</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-[var(--text-main)] tracking-tight">
              My Assessment Tests
            </h1>
            <p className="text-sm text-[var(--text-muted)] mt-1 max-w-2xl">
              Official institutional lab assessments and quizzes assigned to your section. Each question includes proctored behavioral integrity telemetry and strict no-reattempt policy upon successful completion.
            </p>
          </div>
          <div className="flex items-center gap-2 bg-[var(--bg-surface)] border border-[var(--border-line)] px-4 py-2 rounded-xl text-xs font-mono text-[var(--text-muted)]">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>Active Section Roster</span>
          </div>
        </div>
      </div>

      {/* Loading & Error States */}
      {isLoading && (
        <div className="space-y-4">
          {[1, 2].map((i) => (
            <div
              key={i}
              className="glass-card border border-[var(--border-line)] bg-[var(--bg-panel)] rounded-2xl p-6 animate-pulse flex flex-col gap-4 shadow-sm"
            >
              <div className="h-6 bg-[var(--bg-surface)] rounded w-1/3" />
              <div className="h-4 bg-[var(--bg-surface)] rounded w-1/2" />
              <div className="h-10 bg-[var(--bg-surface)] rounded w-1/4 mt-2" />
            </div>
          ))}
        </div>
      )}

      {error && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-2xl p-6 flex items-start gap-3 text-red-600 dark:text-red-300">
          <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5 text-red-500" />
          <div>
            <h3 className="font-semibold text-sm">Failed to load assigned tests</h3>
            <p className="text-xs text-red-600 dark:text-red-400 mt-1">
              {(error as any)?.message || 'Please verify your institutional enrollment or try refreshing.'}
            </p>
          </div>
        </div>
      )}

      {/* Empty State with Direct Join Code Input */}
      {!isLoading && !error && assignments.length === 0 && (
        <div className="glass-card p-8 sm:p-12 text-center rounded-2xl border border-[var(--border-line)] bg-[var(--bg-panel)] flex flex-col items-center justify-center space-y-4 shadow-sm">
          <div className="p-3 rounded-2xl bg-indigo-500/10 text-indigo-500 border border-indigo-500/20">
            <KeyRound className="w-8 h-8" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-[var(--text-main)]">Enroll in Your Section to View Tests</h3>
            <p className="text-xs sm:text-sm text-[var(--text-muted)] max-w-lg mt-1 font-normal leading-relaxed">
              Assessment tests are assigned to academic class sections. Enter the 6-character Join Code provided by your professor (e.g. <b>LQ-DC85</b>) to enroll and immediately unlock your tests:
            </p>
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (joinCode.trim()) {
                joinMutation.mutate(joinCode.trim());
              }
            }}
            className="w-full max-w-md flex flex-col sm:flex-row items-center gap-2 pt-2"
          >
            <input
              type="text"
              placeholder="e.g. LQ-DC85"
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
              className="w-full sm:flex-1 px-4 py-2.5 rounded-xl border border-[var(--border-line)] bg-[var(--bg-surface)] text-[var(--text-main)] font-mono text-center sm:text-left text-sm font-bold tracking-widest placeholder:tracking-normal placeholder:font-normal focus:outline-none focus:border-indigo-500"
            />
            <button
              type="submit"
              disabled={joinMutation.isPending || !joinCode.trim()}
              className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs font-mono transition-all shadow-md shadow-indigo-600/20 flex items-center justify-center gap-2 whitespace-nowrap disabled:opacity-50"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>{joinMutation.isPending ? 'Enrolling...' : 'Join Section & Load Tests'}</span>
            </button>
          </form>

          <div className="pt-2">
            <Link
              to="/practice"
              className="text-xs font-mono text-[var(--text-muted)] hover:text-[var(--text-main)] underline transition-colors"
            >
              Or continue with self-paced Practice Track →
            </Link>
          </div>
        </div>
      )}

            {/* Integrated Capstone Mini-Project (Section 35 - 39) */}
      <div className="glass-card border-2 border-purple-500/30 hover:border-purple-500/50 bg-[var(--bg-panel)] rounded-2xl p-6 sm:p-7 shadow-sm transition-all">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-3 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-medium bg-purple-500/15 text-purple-600 dark:text-purple-300 border border-purple-500/30 flex items-center gap-1.5">
                <Award className="w-3.5 h-3.5" />
                Capstone Mini-Project (20 Marks)
              </span>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-medium bg-[var(--bg-surface)] text-[var(--text-muted)] border border-[var(--border-line)]">
                Phase 5 • Institutional Framework
              </span>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-medium bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" />
                Active Capstone
              </span>
            </div>

            <h2 className="text-xl sm:text-2xl font-bold text-[var(--text-main)] tracking-tight">
              Hospital Patient Triage & Vitals Monitoring System
            </h2>
            <p className="text-xs sm:text-sm text-[var(--text-muted)] max-w-2xl leading-relaxed">
              Real-world embedded C11 console applying syntax branching, patient structured records, pointer-driven vitals mutators, and dynamic system integration.
            </p>

            <div className="flex flex-wrap items-center gap-4 text-xs font-mono text-[var(--text-muted)] pt-1">
              <div className="flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-[var(--text-muted)]" />
                <span>45–120 Minutes</span>
              </div>
              <div className="flex items-center gap-1.5 text-purple-600 dark:text-purple-400 font-semibold">
                <Layers className="w-3.5 h-3.5" />
                <span>4 Competencies × 5 Marks</span>
              </div>
              <div className="flex items-center gap-1.5 text-amber-600 dark:text-amber-400 font-semibold">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Behavioral Telemetry Proctoring</span>
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row lg:flex-col items-stretch lg:items-end gap-3 flex-shrink-0">
            <Link
              to="/mini-project/capstone-mini-project-c11"
              className="px-6 py-3 rounded-xl font-bold text-xs bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white flex items-center justify-center gap-2 shadow-md shadow-purple-500/20 transition-all"
            >
              <span>Launch Mini-Project Workspace</span>
              <ChevronRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </div>

      {/* Test List Cards */}
      <div className="space-y-6">
        {assignments.map((assignment: any) => {
          const test = assignment.test;
          const questions = test.questions || [];
          const attempts = assignment.attempts || [];
          const isSubmitted = assignment.status === 'SUBMITTED';
          const isInProgress = assignment.status === 'IN_PROGRESS';

          // Count completed questions
          const completedCount = attempts.filter((a: any) => a.isLocked).length;

          return (
            <div
              key={assignment.id}
              className="glass-card border border-[var(--border-line)] hover:border-[var(--color-accent)]/40 bg-[var(--bg-panel)] rounded-2xl p-6 transition-all shadow-sm"
            >
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                <div className="space-y-3 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-medium bg-cyan-500/15 text-cyan-600 dark:text-cyan-400 border border-cyan-500/30">
                      {test.section?.sectionName || 'Assigned Section'}
                    </span>
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-medium bg-[var(--bg-surface)] text-[var(--text-muted)] border border-[var(--border-line)]">
                      {test.module}
                    </span>
                    {isSubmitted ? (
                      <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-medium bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" />
                        SUBMITTED
                      </span>
                    ) : isInProgress ? (
                      <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-medium bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30 flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                        IN PROGRESS ({completedCount}/{questions.length})
                      </span>
                    ) : (
                      <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-medium bg-blue-500/15 text-blue-600 dark:text-blue-400 border border-blue-500/30">
                        ASSIGNED
                      </span>
                    )}
                  </div>

                  <h2 className="text-xl font-bold text-[var(--text-main)] tracking-tight">
                    {test.title}
                  </h2>
                  {test.instructions && (
                    <p className="text-xs text-[var(--text-muted)] line-clamp-2 max-w-2xl">
                      {test.instructions}
                    </p>
                  )}

                  <div className="flex flex-wrap items-center gap-5 text-xs text-[var(--text-muted)] pt-1">
                    <div className="flex items-center gap-1.5 font-mono">
                      <Clock className="w-3.5 h-3.5 text-[var(--text-muted)]" />
                      <span>{test.durationMinutes} Minutes</span>
                    </div>
                    <div className="flex items-center gap-1.5 font-mono">
                      <FileText className="w-3.5 h-3.5 text-[var(--text-muted)]" />
                      <span>{questions.length} Questions (1 Mark Each)</span>
                    </div>
                    {assignment.academicScore > 0 && (
                      <div className="flex items-center gap-1.5 font-mono text-emerald-600 dark:text-emerald-400 font-semibold">
                        <span>Score: {assignment.academicScore.toFixed(1)} / {questions.length}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Question List / Action Buttons */}
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                  {questions.length > 0 && (
                    <div className="flex flex-col gap-2">
                      <div className="text-xs font-mono text-[var(--text-muted)] text-right hidden sm:block">
                        Progress: {completedCount} / {questions.length} Solved
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {questions.map((q: any, idx: number) => {
                          const attempt = attempts.find((a: any) => a.problemId === q.problemId);
                          const isLocked = attempt?.isLocked;
                          const score = attempt?.academicScore;

                          return (
                            <Link
                              key={q.id}
                              to={`/exam/${assignment.id}/${q.problemId}`}
                              className={`px-3 py-2 rounded-xl text-xs font-mono font-medium transition-all flex items-center gap-1.5 border ${
                                isLocked
                                  ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-500/25'
                                  : 'bg-[var(--bg-surface)] border-[var(--border-line)] text-[var(--text-main)] hover:bg-[var(--color-accent)]/10 hover:border-[var(--color-accent)]/40 shadow-sm'
                              }`}
                              title={q.problem?.title || `Question ${idx + 1}`}
                            >
                              {isLocked ? (
                                <Lock className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                              ) : (
                                <span>Q{idx + 1}</span>
                              )}
                              {isLocked ? (
                                <span>Q{idx + 1} ({score === 1 ? '1.0' : score === 0.5 ? '0.5' : '0.0'})</span>
                              ) : null}
                            </Link>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
export default StudentTestListPage;
