import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { api } from '../../api/client.js';
import { handleFallbackRequest } from '../../api/fallbackEngine.js';
import { useAuth } from '../../context/AuthContext.js';
import { FirestoreDataService } from '../../services/firestoreData.service.js';
import { auth } from '../../config/firebase.js';
import { RealtimeSyncService } from '../../services/realtimeSync.service.js';
import { getStudentPersonalizedQuestions } from '../../utils/testQuestionDistributor.js';
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
  Code2,
  ShieldCheck,
  Check,
  ArrowRight,
  GraduationCap,
} from 'lucide-react';

export const StudentTestListPage: React.FC = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [joinCode, setJoinCode] = useState('');
  const [filterTab, setFilterTab] = useState<'ALL' | 'PENDING' | 'COMPLETED'>('ALL');

  const { data, isLoading, error } = useQuery({
    queryKey: ['my-assigned-tests'],
    queryFn: async () => {
      let cloudTests: any[] = [];
      try {
        cloudTests = await FirestoreDataService.getAssessmentTestsFromFirestore();
      } catch {}

      try {
        const res = await api.get('/exam/my-tests');
        if (res && (res.data || res.assignments || res.tests)) {
          const hasTests = Array.isArray(res.tests) ? res.tests.length > 0
            : (res.data && typeof res.data === 'object' && (res.data.active?.length || res.data.upcoming?.length))
            || (Array.isArray(res.data) && res.data.length > 0);
          if (hasTests) return res;
        }
      } catch (err: any) {
        console.warn('Backend /exam/my-tests notice, falling back gracefully:', err);
      }
      try {
        const fallback = await handleFallbackRequest('/exam/my-tests', { method: 'GET' } as any);
        if (fallback) {
          const hasFallbackTests = Array.isArray(fallback.tests) ? fallback.tests.length > 0
            : (fallback.data && typeof fallback.data === 'object' && (fallback.data.active?.length || fallback.data.upcoming?.length));
          if (hasFallbackTests) return fallback;
        }
      } catch {}

      const safeCloudTests = Array.isArray(cloudTests) ? cloudTests : [];
      if (safeCloudTests.length > 0) {
        return {
          success: true,
          data: {
            active: safeCloudTests.filter((t: any) => t?.status === 'ACTIVE' || t?.status === 'PUBLISHED'),
            upcoming: safeCloudTests.filter((t: any) => t?.status === 'UPCOMING'),
            completed: safeCloudTests.filter((t: any) => t?.status === 'COMPLETED'),
          },
          tests: safeCloudTests,
        };
      }
      return {
        success: true,
        data: { active: [], upcoming: [], completed: [] },
        tests: [],
      };
    },
    staleTime: 10000,
    refetchOnWindowFocus: false,
    refetchInterval: 10000,
  });

  useEffect(() => {
    const unsubTests = RealtimeSyncService.on('TESTS', () => {
      queryClient.invalidateQueries({ queryKey: ['my-assigned-tests'] });
    });
    const unsubSections = RealtimeSyncService.on('SECTIONS', () => {
      queryClient.invalidateQueries({ queryKey: ['my-assigned-tests'] });
    });
    const unsubCloudTests = FirestoreDataService.listenToAssessmentTests(() => {
      queryClient.invalidateQueries({ queryKey: ['my-assigned-tests'] });
    });
    return () => {
      unsubTests();
      unsubSections();
      unsubCloudTests();
    };
  }, [queryClient]);

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

  const assignments: any[] = React.useMemo(() => {
    if (!data) return [];
    if (Array.isArray(data)) return data;
    if (Array.isArray(data.data)) return data.data;
    if (Array.isArray(data.tests)) {
      return data.tests.map((t: any) => ({
        id: t.id || `assign-${t.id}`,
        status: t.status === 'SUBMITTED' ? 'SUBMITTED' : (t.status === 'IN_PROGRESS' ? 'IN_PROGRESS' : 'PENDING'),
        test: t.test || t,
        attempts: t.attempts || [],
      }));
    }
    if (Array.isArray(data.assignments)) return data.assignments;
    const targetObj = (data.data && typeof data.data === 'object' && !Array.isArray(data.data))
      ? data.data
      : (typeof data === 'object' ? data : null);
    if (targetObj) {
      const active = Array.isArray(targetObj.active) ? targetObj.active : [];
      const upcoming = Array.isArray(targetObj.upcoming) ? targetObj.upcoming : [];
      const completed = Array.isArray(targetObj.completed) ? targetObj.completed : [];
      const all = [...active, ...upcoming, ...completed];
      if (all.length > 0) {
        return all.map((t: any) => ({
          id: t.id || `assign-${t.id}`,
          status: t.status === 'SUBMITTED' ? 'SUBMITTED' : (t.status === 'IN_PROGRESS' ? 'IN_PROGRESS' : 'PENDING'),
          test: t.test || t,
          attempts: t.attempts || [],
        }));
      }
    }
    return [];
  }, [data]);

  const safeAssignments: any[] = Array.isArray(assignments) ? assignments : [];
  const totalAssigned = safeAssignments.length;
  const pendingCount = safeAssignments.filter((a: any) => a?.status !== 'SUBMITTED').length;
  const completedCount = safeAssignments.filter((a: any) => a?.status === 'SUBMITTED').length;

  const enrolledSections = Array.from(
    new Set(
      safeAssignments
        .map((a: any) => a?.test?.section?.sectionName || a?.sectionName)
        .filter(Boolean)
    )
  );

  const filteredAssignments = safeAssignments.filter((a: any) => {
    if (filterTab === 'PENDING') return a?.status !== 'SUBMITTED';
    if (filterTab === 'COMPLETED') return a?.status === 'SUBMITTED';
    return true;
  });

  return (
    <div className="min-h-screen bg-[var(--bg-main)] text-[var(--text-main)] py-6 sm:py-10 transition-colors">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6 sm:space-y-8">
        
        {/* ========================================================= */}
        {/* Apple HIG Frosted Header with Quick Section Join          */}
        {/* ========================================================= */}
        <div className="relative rounded-3xl border border-slate-200/80 dark:border-slate-800/80 bg-white/75 dark:bg-slate-900/75 backdrop-blur-2xl shadow-xl shadow-slate-900/5 p-6 sm:p-8 overflow-hidden transition-all">
          <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-bl from-indigo-500/10 via-purple-500/5 to-transparent rounded-full blur-3xl pointer-events-none" />

          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-semibold tracking-wide uppercase bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Assigned Lab Assessments • Proctored Tests</span>
              </span>

              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                My Assigned Tests
              </h1>

              <p className="text-sm text-slate-600 dark:text-slate-400 max-w-xl leading-relaxed">
                Official practical exams, quizzes, and continuous lab evaluations assigned by your professor.
              </p>

              {enrolledSections.length > 0 && (
                <div className="flex items-center gap-2 pt-1 text-xs font-mono text-slate-500 dark:text-slate-400">
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                  <span>
                    Enrolled Section: <strong className="text-slate-900 dark:text-white">{enrolledSections.join(', ')}</strong>
                  </span>
                </div>
              )}
            </div>

            {/* Quick Stat Pill & Practice Arena Jump */}
            <div className="flex flex-wrap sm:flex-nowrap items-center gap-3 shrink-0">
              <div className="px-4 py-3 rounded-2xl bg-slate-100/80 dark:bg-slate-800/80 border border-slate-200/60 dark:border-slate-700/60 shadow-xs">
                <div className="text-[11px] font-mono text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  Tests Assigned
                </div>
                <div className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                  <FileText className="w-4 h-4 text-indigo-500 shrink-0" />
                  <span>{totalAssigned}</span>
                  <span className="text-xs text-slate-400 font-normal">Active</span>
                </div>
              </div>

              <Link
                to="/practice"
                className="inline-flex items-center gap-2 px-5 py-3 rounded-2xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 hover:bg-slate-800 dark:hover:bg-slate-100 font-semibold text-xs transition-all shadow-md active:scale-95 cursor-pointer"
              >
                <Code2 className="w-4 h-4" />
                <span>Practice Arena →</span>
              </Link>
            </div>
          </div>

          {/* Clean Apple Class Join Input */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (joinCode.trim()) {
                joinMutation.mutate(joinCode.trim());
              }
            }}
            className="mt-6 pt-5 border-t border-slate-200/60 dark:border-slate-800/60 flex flex-col sm:flex-row items-center gap-3"
          >
            <div className="relative flex-1 w-full">
              <KeyRound className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
              <input
                type="text"
                placeholder="ENTER 6-CHAR CLASS JOIN CODE (E.G. LQ-A1B2)"
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                className="w-full pl-10 pr-4 py-2.5 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 text-xs font-mono font-bold tracking-wider text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
              />
            </div>

            <button
              type="submit"
              disabled={joinMutation.isPending || !joinCode.trim()}
              className="w-full sm:w-auto px-6 py-2.5 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs transition-all flex items-center justify-center gap-2 disabled:opacity-50 shrink-0 shadow-sm cursor-pointer active:scale-95"
            >
              <Plus className="w-4 h-4" />
              <span>{joinMutation.isPending ? 'Joining...' : 'Unlock Section Tests'}</span>
            </button>
          </form>
        </div>

        {/* ========================================================= */}
        {/* Apple Segmented Filter Tabs (When Tests Exist)            */}
        {/* ========================================================= */}
        {totalAssigned > 0 && (
          <div className="flex items-center gap-1.5 p-1.5 rounded-2xl bg-slate-100/90 dark:bg-slate-900/90 border border-slate-200/70 dark:border-slate-800/70 shadow-inner w-fit overflow-x-auto no-scrollbar">
            <button
              type="button"
              onClick={() => setFilterTab('ALL')}
              className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer whitespace-nowrap select-none ${
                filterTab === 'ALL'
                  ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm ring-1 ring-slate-900/5 dark:ring-white/10 font-bold'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              All Tests ({totalAssigned})
            </button>

            <button
              type="button"
              onClick={() => setFilterTab('PENDING')}
              className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer whitespace-nowrap select-none ${
                filterTab === 'PENDING'
                  ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm ring-1 ring-slate-900/5 dark:ring-white/10 font-bold'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Pending ({pendingCount})
            </button>

            <button
              type="button"
              onClick={() => setFilterTab('COMPLETED')}
              className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer whitespace-nowrap select-none ${
                filterTab === 'COMPLETED'
                  ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm ring-1 ring-slate-900/5 dark:ring-white/10 font-bold'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Completed ({completedCount})
            </button>
          </div>
        )}

        {/* Loading State */}
        {isLoading && (
          <div className="space-y-4">
            {[1, 2].map((i) => (
              <div
                key={i}
                className="rounded-3xl border border-slate-200/80 dark:border-slate-800/80 bg-white/70 dark:bg-slate-900/70 p-6 animate-pulse space-y-4"
              >
                <div className="h-6 bg-slate-200 dark:bg-slate-800 rounded w-1/3" />
                <div className="h-4 bg-slate-200 dark:bg-slate-800 rounded w-1/2" />
                <div className="h-10 bg-slate-200 dark:bg-slate-800 rounded w-1/4 mt-2" />
              </div>
            ))}
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="rounded-2xl border border-rose-500/30 bg-rose-500/10 p-5 flex items-start gap-3 text-rose-500">
            <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
            <div>
              <h3 className="font-semibold text-sm">Failed to load assigned tests</h3>
              <p className="text-xs text-rose-400 mt-1">
                {(error as any)?.message || 'Please verify your enrollment or try refreshing the page.'}
              </p>
            </div>
          </div>
        )}

        {/* Empty State when zero tests */}
        {!isLoading && !error && filteredAssignments.length === 0 && (
          <div className="rounded-3xl border border-slate-200/80 dark:border-slate-800/80 bg-white/70 dark:bg-slate-900/70 backdrop-blur-2xl p-8 sm:p-12 text-center space-y-4 shadow-xl shadow-slate-900/5">
            <div className="w-14 h-14 rounded-2xl bg-indigo-500/15 text-indigo-500 border border-indigo-500/25 flex items-center justify-center mx-auto shadow-inner">
              <KeyRound className="w-7 h-7" />
            </div>

            <div className="space-y-1.5 max-w-md mx-auto">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                {totalAssigned === 0 ? 'No Tests Assigned Yet' : 'No tests match this filter'}
              </h3>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
                {totalAssigned === 0
                  ? 'Enter the 6-character Class Join Code provided by your professor above to unlock your section tests.'
                  : 'Switch filter tabs above to see your other tests.'}
              </p>
            </div>

            {totalAssigned === 0 && (
              <div className="pt-2">
                <Link
                  to="/practice"
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-semibold text-xs shadow-md transition-all active:scale-95"
                >
                  <Code2 className="w-4 h-4" />
                  <span>Practice Questions in Arena →</span>
                </Link>
              </div>
            )}
          </div>
        )}

        {/* ========================================================= */}
        {/* Apple Test Cards List                                     */}
        {/* ========================================================= */}
        <div className="space-y-4">
          {filteredAssignments.map((assignment: any) => {
            const test = assignment?.test || assignment || {};
            const rawQuestions = Array.isArray(test?.questions) ? test.questions : [];
            const studentIdentifier = user?.prn || (user as any)?.rollNo || user?.id || user?.email || '1001';
            const questions = getStudentPersonalizedQuestions(
              rawQuestions,
              test?.questionCount || 2,
              studentIdentifier
            );
            const safeQuestions = Array.isArray(questions) ? questions : [];
            const attempts = Array.isArray(assignment?.attempts) ? assignment.attempts : [];
            const isSubmitted = assignment?.status === 'SUBMITTED';
            const isInProgress = assignment?.status === 'IN_PROGRESS';

            const completedCountOnTest = attempts.filter((a: any) => a?.isLocked).length;

            const nextUnsolvedIndex = safeQuestions.findIndex((q: any) => {
              const qId = q?.problemId || q?.id;
              return !attempts.some((a: any) => (a?.problemId === qId || a?.id === qId) && a?.isLocked);
            });
            const targetQuestion = nextUnsolvedIndex !== -1 ? safeQuestions[nextUnsolvedIndex] : (safeQuestions[0] || null);
            const firstProblemId = safeQuestions[0]?.problemId || safeQuestions[0]?.id || targetQuestion?.problemId || targetQuestion?.id || 'q1';
            const resumeProblemId = targetQuestion?.problemId || targetQuestion?.id || firstProblemId;

            return (
              <div
                key={assignment.id || `test-${test?.id || Math.random()}`}
                className="rounded-3xl border border-slate-200/80 dark:border-slate-800/80 bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl hover:border-indigo-500/40 p-6 sm:p-7 transition-all shadow-sm space-y-4"
              >
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                  <div className="space-y-2.5 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-semibold bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20">
                        {test?.section?.sectionName || test?.sectionName || 'Assigned Section'}
                      </span>

                      {test?.module && (
                        <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-medium bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                          {test.module}
                        </span>
                      )}

                      {isSubmitted ? (
                        <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-bold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" />
                          <span>SUBMITTED</span>
                        </span>
                      ) : isInProgress ? (
                        <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-bold bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30 flex items-center gap-1.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                          <span>IN PROGRESS ({completedCountOnTest}/{questions.length})</span>
                        </span>
                      ) : (
                        <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-bold bg-blue-500/15 text-blue-600 dark:text-blue-400 border border-blue-500/30">
                          ASSIGNED
                        </span>
                      )}
                    </div>

                    <h2 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">
                      {test?.title || 'Continuous Lab Evaluation'}
                    </h2>

                    {test?.instructions && (
                      <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 leading-relaxed">
                        {test.instructions}
                      </p>
                    )}

                    <div className="flex flex-wrap items-center gap-4 text-xs font-mono text-slate-400 pt-1">
                      <div className="flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5" />
                        <span>{test?.durationMinutes || 60} Minutes</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <FileText className="w-3.5 h-3.5" />
                        <span>{safeQuestions.length} Questions</span>
                      </div>
                      {isSubmitted && assignment.academicScore != null && (
                        <div className="flex items-center gap-1 font-bold text-emerald-500">
                          <span>Score: {assignment.academicScore.toFixed(1)} / {safeQuestions.length} Marks</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Right Primary Action & Jump Pills */}
                  <div className="flex flex-col sm:items-end gap-3 shrink-0">
                    {isSubmitted ? (
                      <Link
                        to={`/exam/${assignment.id}/${firstProblemId}`}
                        className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-3 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/25 font-bold text-xs font-mono transition-all"
                      >
                        <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                        <span>Review Answers</span>
                      </Link>
                    ) : isInProgress ? (
                      <Link
                        to={`/exam/${assignment.id}/${resumeProblemId}`}
                        className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-3 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-500 text-white font-bold text-xs font-mono transition-all shadow-md shadow-amber-500/20 active:scale-95"
                      >
                        <span>Resume Test (Q{nextUnsolvedIndex + 1})</span>
                        <ChevronRight className="w-4 h-4" />
                      </Link>
                    ) : (
                      <Link
                        to={`/exam/${assignment.id}/${firstProblemId}`}
                        className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-2xl bg-gradient-to-r from-indigo-600 to-blue-600 text-white font-bold text-xs font-mono transition-all shadow-md shadow-indigo-600/20 active:scale-95"
                      >
                        <span>Start Proctored Test</span>
                        <ChevronRight className="w-4 h-4" />
                      </Link>
                    )}

                    {/* Question Jump Pills */}
                    {safeQuestions.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 justify-start sm:justify-end">
                        {safeQuestions.map((q: any, idx: number) => {
                          const qId = q?.problemId || q?.id || `q${idx + 1}`;
                          const attempt = attempts.find((a: any) => a?.problemId === qId || a?.id === qId);
                          const isLocked = attempt?.isLocked;
                          const score = attempt?.academicScore;

                          return (
                            <Link
                              key={qId || idx}
                              to={`/exam/${assignment.id}/${qId}`}
                              className={`px-3 py-1 rounded-xl text-xs font-mono font-semibold transition-all flex items-center gap-1 border ${
                                isLocked
                                  ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-600 dark:text-emerald-400'
                                  : 'bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                              }`}
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
    </div>
  );
};

export default StudentTestListPage;
