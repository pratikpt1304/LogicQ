import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { api } from '../../api/client.js';
import { useAuth } from '../../context/AuthContext.js';
import { FirestoreDataService } from '../../services/firestoreData.service.js';
import { auth } from '../../config/firebase.js';
import { RealtimeSyncService } from '../../services/realtimeSync.service.js';
import { toast } from 'sonner';
import {
  FileText,
  Clock,
  CheckCircle2,
  AlertCircle,
  ChevronRight,
  BookOpen,
  Lock,
  KeyRound,
  Plus,
  Layers,
  Sparkles,
  MessageSquare,
} from 'lucide-react';

export const StudentTestListPage: React.FC = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [joinCode, setJoinCode] = useState('');
  const [showJoinInput, setShowJoinInput] = useState(false);
  const [filterTab, setFilterTab] = useState<'ALL' | 'PENDING' | 'COMPLETED'>('ALL');

  const { data, isLoading, error } = useQuery({
    queryKey: ['my-assigned-tests'],
    queryFn: () => api.get('/exam/my-tests'),
    staleTime: 30000,
    refetchOnWindowFocus: false,
    refetchInterval: 30000,
  });

  const joinMutation = useMutation({
    mutationFn: async (code: string) => {
      const cleanCode = code.trim().toUpperCase();
      let backendRes: any = null;
      try {
        backendRes = await api.post('/sections/enroll-by-code', { joinCode: cleanCode });
      } catch (err: any) {
        console.warn('Backend enroll-by-code notice, falling back to Firestore sync:', err);
      }

      const enrollResult = await FirestoreDataService.enrollStudentByCode(cleanCode, {
        id: user?.id,
        uid: (user as any)?.uid || auth.currentUser?.uid,
        email: user?.email || auth.currentUser?.email,
        prn: user?.prn,
        fullName: user?.fullName || user?.displayName,
        displayName: user?.displayName || user?.fullName,
        department: user?.department,
        year: user?.year,
        college: user?.college,
      });

      return {
        message: backendRes?.message || `Successfully joined "${enrollResult.section?.sectionName || cleanCode}"! Tests unlocked.`,
        section: enrollResult.section,
      };
    },
    onSuccess: (res: any) => {
      toast.success(res?.message || 'Joined section successfully! Tests unlocked.');
      setJoinCode('');
      setShowJoinInput(false);
      queryClient.invalidateQueries({ queryKey: ['my-assigned-tests'] });
      queryClient.invalidateQueries({ queryKey: ['student-assigned-tests'] });
      queryClient.invalidateQueries({ queryKey: ['profile'] });
      queryClient.invalidateQueries({ queryKey: ['faculty-sections'] });
      queryClient.invalidateQueries({ queryKey: ['admin-sections-list'] });
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      queryClient.invalidateQueries({ queryKey: ['admin-firestore-users'] });
      RealtimeSyncService.emit('SECTIONS');
      RealtimeSyncService.emit('USERS');
      RealtimeSyncService.emit('TESTS');
    },
    onError: (err: any) => {
      toast.error(err?.message || 'Invalid join code or section not found.');
    },
  });

  const assignments: any[] = data?.data || data?.assignments || [];

  const totalAssigned = assignments.length;
  const pendingCount = assignments.filter((a: any) => a.status !== 'SUBMITTED').length;
  const completedCount = assignments.filter((a: any) => a.status === 'SUBMITTED').length;

  const enrolledSections = Array.from(
    new Set(
      assignments
        .map((a: any) => a.test?.section?.sectionName)
        .filter(Boolean)
    )
  );

  const filteredAssignments = assignments.filter((a: any) => {
    if (filterTab === 'PENDING') return a.status !== 'SUBMITTED';
    if (filterTab === 'COMPLETED') return a.status === 'SUBMITTED';
    return true;
  });

  const getStudentWhatsAppReminderUrl = (test: any) => {
    const title = test?.title || 'C Programming Lab Test';
    const duration = test?.durationMinutes || 60;
    const qCount = test?.questions?.length || 20;
    const url = 'https://logicq-clanguage.web.app/student/tests';
    const text = `⚡ *LogicQ Lab Test Reminder*\n\n📝 *Assessment:* ${title}\n⏱️ *Duration:* ${duration} Mins (${qCount} Questions)\n👉 *Direct Link:* ${url}\n\nDon't forget to submit before the deadline! 🚀`;
    return `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`;
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-6 animate-fadeIn">
      {/* Page Header */}
      <div className="glass-card border border-[var(--border-line)] bg-[var(--bg-panel)] rounded-2xl p-6 sm:p-7 shadow-sm">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/25 text-indigo-400 text-xs font-mono font-medium mb-2.5">
              <BookOpen className="w-3.5 h-3.5" />
              <span>Assigned Lab Assessments</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-[var(--text-main)] tracking-tight">
              My Assigned Tests
            </h1>
            <p className="text-xs sm:text-sm text-[var(--text-muted)] mt-1 max-w-xl">
              Official practical tests, quizzes, and assessments assigned by your faculty.
            </p>
            {enrolledSections.length > 0 && (
              <div className="flex items-center gap-2 mt-3 text-xs font-mono text-[var(--text-muted)]">
                <span className="w-2 h-2 rounded-full bg-emerald-400" />
                <span>Enrolled Section: <strong className="text-[var(--text-main)]">{enrolledSections.join(', ')}</strong></span>
              </div>
            )}
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full sm:w-auto">
            <button
              type="button"
              onClick={() => setShowJoinInput(!showJoinInput)}
              className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold font-mono transition-all shadow-sm shadow-indigo-600/20"
            >
              <KeyRound className="w-3.5 h-3.5" />
              <span>{showJoinInput ? 'Hide Code Box' : '+ Enter Class Code'}</span>
            </button>
            <Link
              to="/practice"
              className="flex items-center justify-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-[var(--bg-surface)] hover:bg-[var(--bg-surface-hover)] border border-[var(--border-line)] text-xs font-mono text-[var(--text-muted)] hover:text-[var(--text-main)] transition-colors"
            >
              <span>Practice Hub</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>

        {/* Expandable Class Join Form */}
        {(showJoinInput || totalAssigned === 0) && (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (joinCode.trim()) {
                joinMutation.mutate(joinCode.trim());
              }
            }}
            className="mt-5 p-4 rounded-xl border border-indigo-500/30 bg-indigo-500/5 flex flex-col sm:flex-row items-center gap-2.5"
          >
            <div className="flex items-center gap-2 flex-1 w-full">
              <KeyRound className="w-4 h-4 text-indigo-400 shrink-0" />
              <input
                type="text"
                placeholder="Enter 6-char Class Join Code (e.g. LQ-A1B2)"
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                className="w-full px-3.5 py-2 rounded-lg border border-[var(--border-line)] bg-[var(--bg-surface)] text-[var(--text-main)] font-mono text-xs font-bold uppercase tracking-wider focus:outline-none focus:border-indigo-500"
              />
            </div>
            <button
              type="submit"
              disabled={joinMutation.isPending || !joinCode.trim()}
              className="w-full sm:w-auto px-5 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs font-mono transition-all flex items-center justify-center gap-1.5 disabled:opacity-50 shrink-0"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>{joinMutation.isPending ? 'Enrolling...' : 'Unlock Tests'}</span>
            </button>
          </form>
        )}
      </div>

      {/* Summary Metrics */}
      {totalAssigned > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="glass-card p-4 rounded-xl border border-[var(--border-line)] bg-[var(--bg-panel)] flex items-center justify-between">
            <div>
              <span className="text-[11px] font-mono text-[var(--text-muted)] uppercase block">Total Assigned</span>
              <span className="text-xl font-bold font-mono text-[var(--text-main)]">{totalAssigned}</span>
            </div>
            <div className="w-8 h-8 rounded-lg bg-blue-500/10 text-blue-400 flex items-center justify-center">
              <Layers className="w-4 h-4" />
            </div>
          </div>

          <div className="glass-card p-4 rounded-xl border border-amber-500/25 bg-amber-500/5 flex items-center justify-between">
            <div>
              <span className="text-[11px] font-mono text-amber-400 uppercase block">Pending / Active</span>
              <span className="text-xl font-bold font-mono text-amber-400">{pendingCount}</span>
            </div>
            <div className="w-8 h-8 rounded-lg bg-amber-500/15 text-amber-400 flex items-center justify-center">
              <Clock className="w-4 h-4" />
            </div>
          </div>

          <div className="glass-card p-4 rounded-xl border border-emerald-500/25 bg-emerald-500/5 flex items-center justify-between">
            <div>
              <span className="text-[11px] font-mono text-emerald-400 uppercase block">Completed</span>
              <span className="text-xl font-bold font-mono text-emerald-400">{completedCount}</span>
            </div>
            <div className="w-8 h-8 rounded-lg bg-emerald-500/15 text-emerald-400 flex items-center justify-center">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
        </div>
      )}

      {/* Filter Tabs */}
      {totalAssigned > 0 && (
        <div className="flex items-center gap-1.5 p-1 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-line)] w-fit text-xs font-mono">
          <button
            onClick={() => setFilterTab('ALL')}
            className={`px-3.5 py-1.5 rounded-lg transition-colors font-medium ${
              filterTab === 'ALL'
                ? 'bg-indigo-600 text-white font-bold'
                : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'
            }`}
          >
            All Tests ({totalAssigned})
          </button>
          <button
            onClick={() => setFilterTab('PENDING')}
            className={`px-3.5 py-1.5 rounded-lg transition-colors font-medium ${
              filterTab === 'PENDING'
                ? 'bg-amber-500 text-white font-bold'
                : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'
            }`}
          >
            Pending ({pendingCount})
          </button>
          <button
            onClick={() => setFilterTab('COMPLETED')}
            className={`px-3.5 py-1.5 rounded-lg transition-colors font-medium ${
              filterTab === 'COMPLETED'
                ? 'bg-emerald-600 text-white font-bold'
                : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'
            }`}
          >
            Completed ({completedCount})
          </button>
        </div>
      )}

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
        <div className="bg-rose-500/10 border border-rose-500/30 rounded-2xl p-6 flex items-start gap-3 text-rose-400">
          <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="font-semibold text-sm">Failed to load assigned tests</h3>
            <p className="text-xs text-rose-300 mt-1">
              {(error as any)?.message || 'Please verify your enrollment or try refreshing the page.'}
            </p>
          </div>
        </div>
      )}

      {/* Empty State when zero tests */}
      {!isLoading && !error && filteredAssignments.length === 0 && (
        <div className="glass-card p-8 sm:p-12 text-center rounded-2xl border border-[var(--border-line)] bg-[var(--bg-panel)] flex flex-col items-center justify-center space-y-3 shadow-sm">
          <div className="p-3.5 rounded-2xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
            <KeyRound className="w-7 h-7" />
          </div>
          <h3 className="text-lg font-bold text-[var(--text-main)]">
            {totalAssigned === 0 ? 'No Tests Assigned Yet' : 'No tests match this filter'}
          </h3>
          <p className="text-xs text-[var(--text-muted)] max-w-md font-normal leading-relaxed">
            {totalAssigned === 0
              ? 'Enter the 6-character Class Code provided by your professor to unlock your section tests.'
              : 'Switch filter tabs above to see your other tests.'}
          </p>
        </div>
      )}

      {/* Test List Cards */}
      <div className="space-y-4">
        {filteredAssignments.map((assignment: any) => {
          const test = assignment.test;
          const questions = test?.questions || [];
          const attempts = assignment.attempts || [];
          const isSubmitted = assignment.status === 'SUBMITTED';
          const isInProgress = assignment.status === 'IN_PROGRESS';

          const completedCountOnTest = attempts.filter((a: any) => a.isLocked).length;

          // Find first unsolved question to jump to
          const nextUnsolvedIndex = questions.findIndex(
            (q: any) => !attempts.some((a: any) => a.problemId === q.problemId && a.isLocked)
          );
          const targetQuestion = nextUnsolvedIndex !== -1 ? questions[nextUnsolvedIndex] : questions[0];

          return (
            <div
              key={assignment.id}
              className="glass-card border border-[var(--border-line)] hover:border-indigo-500/40 bg-[var(--bg-panel)] rounded-2xl p-5 sm:p-6 transition-all shadow-sm"
            >
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5">
                <div className="space-y-2.5 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-medium bg-cyan-500/10 text-cyan-400 border border-cyan-500/25">
                      {test.section?.sectionName || 'Assigned Section'}
                    </span>
                    {test.module && (
                      <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-medium bg-[var(--bg-surface)] text-[var(--text-muted)] border border-[var(--border-line)]">
                        {test.module}
                      </span>
                    )}
                    {isSubmitted ? (
                      <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-medium bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" />
                        SUBMITTED
                      </span>
                    ) : isInProgress ? (
                      <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-medium bg-amber-500/15 text-amber-400 border border-amber-500/30 flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                        IN PROGRESS ({completedCountOnTest}/{questions.length})
                      </span>
                    ) : (
                      <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-medium bg-blue-500/15 text-blue-400 border border-blue-500/30">
                        ASSIGNED
                      </span>
                    )}
                  </div>

                  <h2 className="text-lg sm:text-xl font-bold text-[var(--text-main)] tracking-tight">
                    {test.title}
                  </h2>

                  {test.instructions && (
                    <p className="text-xs text-[var(--text-muted)] line-clamp-2 max-w-2xl leading-relaxed">
                      {test.instructions}
                    </p>
                  )}

                  <div className="flex flex-wrap items-center gap-4 text-xs font-mono text-[var(--text-muted)] pt-1">
                    <div className="flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-[var(--text-muted)]" />
                      <span>{test.durationMinutes} Minutes</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <FileText className="w-3.5 h-3.5 text-[var(--text-muted)]" />
                      <span>{questions.length} Questions</span>
                    </div>
                    {isSubmitted && assignment.academicScore != null && (
                      <div className="flex items-center gap-1 font-bold text-emerald-400">
                        <span>Score: {assignment.academicScore.toFixed(1)} / {questions.length} Marks</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Clear Primary CTA and Question Jump Pills */}
                <div className="flex flex-col sm:items-end gap-3 flex-shrink-0">
                  <div className="flex items-center gap-2">
                    <a
                      href={getStudentWhatsAppReminderUrl(test)}
                      target="_blank"
                      rel="noopener noreferrer"
                      title="Send test link and reminder to WhatsApp"
                      className="px-3 py-2 rounded-xl text-xs font-mono font-semibold bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/25 transition flex items-center gap-1.5"
                    >
                      <MessageSquare className="w-3.5 h-3.5" />
                      <span>WhatsApp Ping</span>
                    </a>

                    {isSubmitted ? (
                      <Link
                        to={`/exam/${assignment.id}/${questions[0]?.problemId}`}
                        className="px-5 py-2.5 rounded-xl font-bold text-xs bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/25 flex items-center justify-center gap-2 transition-all font-mono"
                      >
                        <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                        <span>Review Answers</span>
                      </Link>
                    ) : isInProgress ? (
                      <Link
                        to={`/exam/${assignment.id}/${targetQuestion?.problemId}`}
                        className="px-5 py-2.5 rounded-xl font-bold text-xs bg-gradient-to-r from-amber-500 to-orange-500 hover:opacity-95 text-white flex items-center justify-center gap-2 transition-all shadow-sm shadow-amber-500/20 font-mono"
                      >
                        <span>Resume Test (Q{nextUnsolvedIndex + 1})</span>
                        <ChevronRight className="w-4 h-4" />
                      </Link>
                    ) : (
                      <Link
                        to={`/exam/${assignment.id}/${questions[0]?.problemId}`}
                        className="px-5 py-2.5 rounded-xl font-bold text-xs bg-gradient-to-r from-blue-600 to-indigo-600 hover:opacity-95 text-white flex items-center justify-center gap-2 transition-all shadow-sm shadow-indigo-600/20 font-mono"
                      >
                        <span>Start Test</span>
                        <ChevronRight className="w-4 h-4" />
                      </Link>
                    )}
                  </div>

                  {/* Individual Question Badges */}
                  {questions.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 justify-start sm:justify-end">
                      {questions.map((q: any, idx: number) => {
                        const attempt = attempts.find((a: any) => a.problemId === q.problemId);
                        const isLocked = attempt?.isLocked;
                        const score = attempt?.academicScore;

                        return (
                          <Link
                            key={q.id}
                            to={`/exam/${assignment.id}/${q.problemId}`}
                            className={`px-2.5 py-1 rounded-lg text-[11px] font-mono font-medium transition-all flex items-center gap-1 border ${
                              isLocked
                                ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400'
                                : 'bg-[var(--bg-surface)] border-[var(--border-line)] text-[var(--text-muted)] hover:text-[var(--text-main)] hover:border-indigo-500/40'
                            }`}
                            title={q.problem?.title || `Question ${idx + 1}`}
                          >
                            {isLocked ? <Lock className="w-2.5 h-2.5" /> : null}
                            <span>Q{idx + 1}</span>
                            {isLocked && score != null ? (
                              <span className="opacity-80">({score.toFixed(1)})</span>
                            ) : null}
                          </Link>
                        );
                      })}
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
