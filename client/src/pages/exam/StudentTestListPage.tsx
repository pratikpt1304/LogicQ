import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { api } from '../../api/client.js';
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
} from 'lucide-react';

export const StudentTestListPage: React.FC = () => {
  const { data, isLoading, error } = useQuery({
    queryKey: ['my-assigned-tests'],
    queryFn: () => api.get('/exam/my-tests'),
    refetchOnWindowFocus: false,
  });

  const assignments = data?.assignments || [];

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-8 animate-fadeIn">
      {/* Page Header */}
      <div className="bg-gradient-to-r from-gray-900 to-gray-800 border border-gray-700/60 rounded-2xl p-6 sm:p-8 shadow-xl">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 text-xs font-mono font-medium mb-3">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Smart Exam & Assessment Engine (Proctored)</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
              My Assessment Tests
            </h1>
            <p className="text-sm text-gray-400 mt-1 max-w-2xl">
              Official institutional lab assessments and quizzes assigned to your section. Each question includes proctored behavioral integrity telemetry and strict no-reattempt policy upon successful completion.
            </p>
          </div>
          <div className="flex items-center gap-2 bg-gray-800/80 border border-gray-700 px-4 py-2 rounded-xl text-xs font-mono text-gray-300">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
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
              className="bg-gray-900/60 border border-gray-800 rounded-2xl p-6 animate-pulse flex flex-col gap-4"
            >
              <div className="h-6 bg-gray-800 rounded w-1/3" />
              <div className="h-4 bg-gray-800 rounded w-1/2" />
              <div className="h-10 bg-gray-800 rounded w-1/4 mt-2" />
            </div>
          ))}
        </div>
      )}

      {error && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-2xl p-6 flex items-start gap-3 text-red-300">
          <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5 text-red-400" />
          <div>
            <h3 className="font-semibold text-sm">Failed to load assigned tests</h3>
            <p className="text-xs text-red-400 mt-1">
              {(error as any)?.message || 'Please verify your institutional enrollment or try refreshing.'}
            </p>
          </div>
        </div>
      )}

      {/* Empty State */}
      {!isLoading && !error && assignments.length === 0 && (
        <div className="bg-gray-900/40 border border-gray-800 rounded-2xl p-12 text-center flex flex-col items-center justify-center">
          <BookOpen className="w-12 h-12 text-gray-600 mb-4" />
          <h3 className="text-lg font-semibold text-white">No Tests Assigned Yet</h3>
          <p className="text-sm text-gray-400 max-w-md mt-1 mb-6">
            Your course faculty has not scheduled any assessment tests for your section yet. Once assigned, they will appear here automatically.
          </p>
          <Link
            to="/practice"
            className="px-5 py-2.5 rounded-xl bg-gray-800 hover:bg-gray-700 text-white font-medium text-sm transition-all"
          >
            Continue Practice Track
          </Link>
        </div>
      )}

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
              className="bg-gray-900 border border-gray-800 hover:border-gray-700 rounded-2xl p-6 transition-all shadow-lg"
            >
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                <div className="space-y-3 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-medium bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                      {test.section?.sectionName || 'Assigned Section'}
                    </span>
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-medium bg-gray-800 text-gray-300">
                      {test.module}
                    </span>
                    {isSubmitted ? (
                      <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" />
                        SUBMITTED
                      </span>
                    ) : isInProgress ? (
                      <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-medium bg-amber-500/10 text-amber-400 border border-amber-500/20 flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                        IN PROGRESS ({completedCount}/{questions.length})
                      </span>
                    ) : (
                      <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-medium bg-blue-500/10 text-blue-400 border border-blue-500/20">
                        ASSIGNED
                      </span>
                    )}
                  </div>

                  <h2 className="text-xl font-bold text-white tracking-tight">
                    {test.title}
                  </h2>
                  {test.instructions && (
                    <p className="text-xs text-gray-400 line-clamp-2 max-w-2xl">
                      {test.instructions}
                    </p>
                  )}

                  <div className="flex flex-wrap items-center gap-5 text-xs text-gray-400 pt-1">
                    <div className="flex items-center gap-1.5 font-mono">
                      <Clock className="w-3.5 h-3.5 text-gray-500" />
                      <span>{test.durationMinutes} Minutes</span>
                    </div>
                    <div className="flex items-center gap-1.5 font-mono">
                      <FileText className="w-3.5 h-3.5 text-gray-500" />
                      <span>{questions.length} Questions (1 Mark Each)</span>
                    </div>
                    {assignment.academicScore > 0 && (
                      <div className="flex items-center gap-1.5 font-mono text-emerald-400 font-semibold">
                        <span>Score: {assignment.academicScore.toFixed(1)} / {questions.length}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Question List / Action Buttons */}
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                  {questions.length > 0 && (
                    <div className="flex flex-col gap-2">
                      <div className="text-xs font-mono text-gray-400 text-right hidden sm:block">
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
                                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/20'
                                  : 'bg-gray-800 border-gray-700 text-gray-200 hover:bg-gray-700 hover:border-gray-600'
                              }`}
                              title={q.problem?.title || `Question ${idx + 1}`}
                            >
                              {isLocked ? (
                                <Lock className="w-3 h-3 text-emerald-400" />
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
