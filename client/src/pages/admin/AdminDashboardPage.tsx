import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../api/client.js';
import { DifficultyBadge, VerdictBadge } from '../../components/common/Badge.js';
import { toast } from 'sonner';
import {
  ShieldCheck,
  Users,
  Code2,
  CheckCircle2,
  TrendingUp,
  Plus,
  RefreshCw,
  Ban,
  Trash2,
  Calendar,
  X,
  Eye,
  Sliders,
} from 'lucide-react';
import { Difficulty, Verdict } from '../../types/index.js';

export const AdminDashboardPage: React.FC = () => {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'problems' | 'submissions' | 'users' | 'analytics'>('analytics');

  // Modal States
  const [isCreateProblemOpen, setIsCreateProblemOpen] = useState(false);
  const [selectedSubmissionCode, setSelectedSubmissionCode] = useState<string | null>(null);

  // New Problem Form State
  const [problemForm, setProblemForm] = useState({
    title: '',
    slug: '',
    difficulty: 'MEDIUM' as Difficulty,
    category: 'Algorithms',
    tags: ['Pointers', 'Basics'],
    description: `### Problem Description\n\nExplain the logic and constraints here.\n\n### Input Format\nStandard input specifications.\n\n### Output Format\nExpected output specifications.`,
    starterCode: `#include <stdio.h>\n\nint main() {\n    // TODO: Write your logic here\n    return 0;\n}`,
    timeLimitMs: 1000,
    memoryLimitMb: 64,
    basePoints: 20,
    status: 'PUBLISHED',
    testCases: [
      { input: '10\n', expectedOutput: '20\n', isHidden: false },
      { input: '100\n', expectedOutput: '200\n', isHidden: true },
    ],
  });

  // Fetch Analytics
  const { data: analyticsData } = useQuery({
    queryKey: ['admin-analytics'],
    queryFn: () => api.get('/admin/analytics'),
  });

  // Fetch Problems
  const { data: problemsData } = useQuery({
    queryKey: ['admin-problems'],
    queryFn: () => api.get('/admin/problems'),
  });

  // Fetch Submissions
  const { data: submissionsData } = useQuery({
    queryKey: ['admin-submissions'],
    queryFn: () => api.get('/admin/submissions?limit=50'),
  });

  // Fetch Users
  const { data: usersData } = useQuery({
    queryKey: ['admin-users'],
    queryFn: () => api.get('/admin/users?limit=50'),
  });

  const overview = analyticsData?.data?.overview;
  const pilotAnalytics = analyticsData?.data?.pilotAnalytics;
  const problems = problemsData?.data?.problems || [];
  const submissions = submissionsData?.data?.submissions || [];
  const users = usersData?.data?.users || [];

  // Mutations
  const createProblemMutation = useMutation({
    mutationFn: (body: any) => api.post('/admin/problems', body),
    onSuccess: () => {
      toast.success('Problem created successfully!');
      setIsCreateProblemOpen(false);
      queryClient.invalidateQueries({ queryKey: ['admin-problems'] });
    },
    onError: (err: any) => toast.error(err.message || 'Failed to create problem'),
  });

  const deleteProblemMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/admin/problems/${id}`),
    onSuccess: () => {
      toast.success('Problem deleted');
      queryClient.invalidateQueries({ queryKey: ['admin-problems'] });
    },
  });

  const rejudgeMutation = useMutation({
    mutationFn: (id: string) => api.post(`/admin/submissions/${id}/rejudge`),
    onSuccess: () => {
      toast.info('Submission queued for re-judging');
      queryClient.invalidateQueries({ queryKey: ['admin-submissions'] });
    },
  });

  const banMutation = useMutation({
    mutationFn: ({ id, isBanned }: { id: string; isBanned: boolean }) =>
      api.put(`/admin/users/${id}/ban`, { isBanned }),
    onSuccess: () => {
      toast.success('User status updated');
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
    },
  });

  const roleMutation = useMutation({
    mutationFn: ({ id, role }: { id: string; role: string }) =>
      api.put(`/admin/users/${id}/role`, { role }),
    onSuccess: () => {
      toast.success('User role updated');
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
    },
  });

  const scheduleDailyMutation = useMutation({
    mutationFn: ({ problemId, scheduledDate }: { problemId: string; scheduledDate: string }) =>
      api.post('/admin/daily/schedule', { problemId, scheduledDate, isDaily: true }),
    onSuccess: () => {
      toast.success('Daily challenge scheduled');
      queryClient.invalidateQueries({ queryKey: ['admin-problems'] });
    },
  });

  const handleAddTestCase = () => {
    setProblemForm({
      ...problemForm,
      testCases: [...problemForm.testCases, { input: '', expectedOutput: '', isHidden: false }],
    });
  };

  const handleRemoveTestCase = (index: number) => {
    setProblemForm({
      ...problemForm,
      testCases: problemForm.testCases.filter((_, i) => i !== index),
    });
  };

  const handleTestCaseChange = (index: number, field: string, value: any) => {
    const updated = [...problemForm.testCases];
    (updated[index] as any)[field] = value;
    setProblemForm({ ...problemForm, testCases: updated });
  };

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createProblemMutation.mutate(problemForm);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Admin Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white flex items-center gap-2.5">
            <ShieldCheck className="w-8 h-8 text-purple-400" />
            <span>LogicQ Administration Center</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1 font-mono">
            Platform health, problem authoring, test suites, submission monitoring, and user moderation.
          </p>
        </div>

        <button
          onClick={() => setIsCreateProblemOpen(true)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl font-mono text-xs font-bold text-dark-950 bg-gradient-to-r from-cyan-400 to-emerald-400 hover:from-cyan-300 hover:to-emerald-300 shadow-lg shadow-cyan-500/20 transition-all"
        >
          <Plus className="w-4 h-4" />
          <span>Author New Problem</span>
        </button>
      </div>

      {/* Analytics Overview Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="glass-card p-5 rounded-2xl border border-white/[0.08]">
          <span className="text-[11px] font-mono text-slate-400 block mb-1">REGISTERED USERS</span>
          <span className="text-2xl font-extrabold text-white font-mono">
            {overview?.totalUsers || 0}
          </span>
        </div>

        <div className="glass-card p-5 rounded-2xl border border-white/[0.08]">
          <span className="text-[11px] font-mono text-slate-400 block mb-1">TOTAL PROBLEMS</span>
          <span className="text-2xl font-extrabold text-cyan-400 font-mono">
            {overview?.totalProblems || 0}
          </span>
        </div>

        <div className="glass-card p-5 rounded-2xl border border-white/[0.08]">
          <span className="text-[11px] font-mono text-slate-400 block mb-1">GLOBAL SUBMISSIONS</span>
          <span className="text-2xl font-extrabold text-purple-400 font-mono">
            {overview?.totalSubmissions || 0}
          </span>
        </div>

        <div className="glass-card p-5 rounded-2xl border border-white/[0.08]">
          <span className="text-[11px] font-mono text-slate-400 block mb-1">ACCEPTANCE RATE</span>
          <span className="text-2xl font-extrabold text-emerald-400 font-mono">
            {overview?.acceptanceRate || 0}%
          </span>
        </div>
      </div>

      {/* Admin Tabs */}
      <div className="flex flex-wrap items-center gap-2 border-b border-white/[0.08] pb-3 text-xs font-mono">
        <button
          onClick={() => setActiveTab('analytics')}
          className={`px-4 py-2 rounded-xl transition-colors flex items-center gap-1.5 ${
            activeTab === 'analytics'
              ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 font-bold'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <TrendingUp className="w-3.5 h-3.5" />
          <span>2-Week Pilot Analytics</span>
        </button>

        <button
          onClick={() => setActiveTab('problems')}
          className={`px-4 py-2 rounded-xl transition-colors ${
            activeTab === 'problems'
              ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40 font-bold'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          Problems & Test Cases ({problems.length})
        </button>

        <button
          onClick={() => setActiveTab('submissions')}
          className={`px-4 py-2 rounded-xl transition-colors ${
            activeTab === 'submissions'
              ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40 font-bold'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          Submissions Live Stream ({submissions.length})
        </button>

        <button
          onClick={() => setActiveTab('users')}
          className={`px-4 py-2 rounded-xl transition-colors ${
            activeTab === 'users'
              ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40 font-bold'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          User Roster ({users.length})
        </button>
      </div>

      {/* Tab: 2-Week Pilot Analytics */}
      {activeTab === 'analytics' && (
        <div className="space-y-8" data-testid="pilot-analytics-view">
          {/* Pilot Window KPI Summary */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="glass-card p-5 rounded-2xl border border-cyan-500/20">
              <span className="text-[11px] font-mono text-slate-400 uppercase block mb-1">
                DAILY ACTIVE STUDENTS (DAU)
              </span>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-extrabold text-cyan-400 font-mono">
                  {pilotAnalytics?.window?.todayDau ?? 0}
                </span>
                <span className="text-xs font-mono text-slate-400">
                  today · peak {pilotAnalytics?.window?.peakDau ?? 0}
                </span>
              </div>
              <p className="text-[11px] font-mono text-slate-500 mt-1.5">
                Avg {pilotAnalytics?.window?.averageDau ?? 0}/day ·{' '}
                {pilotAnalytics?.window?.totalActivePilotStudents ?? 0} unique in 14d
              </p>
            </div>

            <div className="glass-card p-5 rounded-2xl border border-emerald-500/20">
              <span className="text-[11px] font-mono text-slate-400 uppercase block mb-1">
                SOLVING ≥ 4 OF 7 CHALLENGES
              </span>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-extrabold text-emerald-400 font-mono">
                  {pilotAnalytics?.fourOfSevenCohort?.uniqueQualifiedStudentsAnyWeek ?? 0}
                </span>
                <span className="text-xs font-mono text-slate-400">students qualified</span>
              </div>
              <p className="text-[11px] font-mono text-slate-500 mt-1.5">
                W1: {pilotAnalytics?.fourOfSevenCohort?.week1?.qualifiedCount ?? 0} (
                {pilotAnalytics?.fourOfSevenCohort?.week1?.qualifiedPctOfActive ?? 0}%) · W2:{' '}
                {pilotAnalytics?.fourOfSevenCohort?.week2?.qualifiedCount ?? 0} (
                {pilotAnalytics?.fourOfSevenCohort?.week2?.qualifiedPctOfActive ?? 0}%)
              </p>
            </div>

            <div className="glass-card p-5 rounded-2xl border border-amber-500/20">
              <span className="text-[11px] font-mono text-slate-400 uppercase block mb-1">
                STEEPEST DAILY DROP-OFF
              </span>
              {pilotAnalytics?.dropOffByDay?.steepestDropOffDay ? (
                <>
                  <div className="flex items-baseline gap-2">
                    <span className="text-2xl font-extrabold text-amber-400 font-mono">
                      -{pilotAnalytics.dropOffByDay.steepestDropOffDay.dropOffCount}
                    </span>
                    <span className="text-xs font-mono text-rose-400">
                      (-{pilotAnalytics.dropOffByDay.steepestDropOffDay.dropOffRatePct}%)
                    </span>
                  </div>
                  <p className="text-[11px] font-mono text-slate-500 mt-1.5">
                    On {pilotAnalytics.dropOffByDay.steepestDropOffDay.label}
                  </p>
                </>
              ) : (
                <>
                  <span className="text-2xl font-extrabold text-emerald-400 font-mono">0%</span>
                  <p className="text-[11px] font-mono text-slate-500 mt-1.5">
                    No day-over-day drop recorded
                  </p>
                </>
              )}
            </div>

            <div className="glass-card p-5 rounded-2xl border border-rose-500/20">
              <span className="text-[11px] font-mono text-slate-400 uppercase block mb-1">
                MOST-FAILED PROBLEM
              </span>
              {pilotAnalytics?.mostFailedProblems?.length > 0 ? (
                <>
                  <span className="text-base font-extrabold text-rose-400 font-mono truncate block">
                    {pilotAnalytics.mostFailedProblems[0].title}
                  </span>
                  <p className="text-[11px] font-mono text-slate-400 mt-1.5">
                    {pilotAnalytics.mostFailedProblems[0].failedSubmissions} failed (
                    {pilotAnalytics.mostFailedProblems[0].failureRatePct}% fail rate)
                  </p>
                </>
              ) : (
                <>
                  <span className="text-xl font-extrabold text-slate-400 font-mono">—</span>
                  <p className="text-[11px] font-mono text-slate-500 mt-1.5">
                    No failed submissions in window
                  </p>
                </>
              )}
            </div>
          </div>

          {/* 1. Daily Active Students (14-Day Visual Bar Chart) */}
          <div className="glass-card p-6 rounded-2xl border border-white/[0.08] space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h2 className="text-base font-bold text-white font-mono flex items-center gap-2">
                  <Users className="w-4 h-4 text-cyan-400" />
                  <span>1. Daily Active Students (14-Day Pilot Window · 17:00 IST Boundary)</span>
                </h2>
                <p className="text-xs font-mono text-slate-400 mt-0.5">
                  Window: {pilotAnalytics?.window?.startDate || 'Day 1'} to{' '}
                  {pilotAnalytics?.window?.endDate || 'Day 14'} · Cyan = Active Students (Attempted) ·
                  Emerald = Students Who Solved (AC)
                </p>
              </div>
            </div>

            <div className="grid grid-cols-7 sm:grid-cols-14 gap-2 pt-4 items-end min-h-[160px]">
              {(pilotAnalytics?.dailyActiveStudents || []).map((day: any) => {
                const maxDau = Math.max(1, pilotAnalytics?.window?.peakDau || 1);
                const activeHeightPct = Math.max(8, Math.round((day.activeStudents / maxDau) * 100));
                const solvedHeightPct =
                  day.solvingStudents > 0
                    ? Math.max(6, Math.round((day.solvingStudents / maxDau) * 100))
                    : 0;
                return (
                  <div
                    key={day.date}
                    className="flex flex-col items-center gap-1.5 p-2 rounded-xl bg-dark-900/60 border border-white/[0.05]"
                  >
                    <span className="text-[10px] font-mono font-bold text-cyan-300">
                      {day.activeStudents}
                    </span>
                    <div className="w-full h-24 flex items-end justify-center gap-1 bg-dark-950/70 rounded-lg p-1">
                      <div
                        style={{ height: `${activeHeightPct}%` }}
                        className="w-2.5 rounded-t bg-cyan-400 transition-all"
                        title={`Active Students: ${day.activeStudents}`}
                      />
                      <div
                        style={{ height: `${solvedHeightPct}%` }}
                        className="w-2.5 rounded-t bg-emerald-400 transition-all"
                        title={`Solving Students (AC): ${day.solvingStudents}`}
                      />
                    </div>
                    <span className="text-[9px] font-mono text-slate-400 text-center leading-tight">
                      W{day.weekNumber}·D{day.dayInWeek}
                    </span>
                    <span className="text-[9px] font-mono text-slate-500">
                      {day.date.slice(5)}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* 2. Students Solving at Least 4 of 7 Challenges */}
          <div className="glass-card p-6 rounded-2xl border border-white/[0.08] space-y-5">
            <div>
              <h2 className="text-base font-bold text-white font-mono flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>2. Students Solving at Least 4 of 7 Challenges (Weekly Retention Cohort)</span>
              </h2>
              <p className="text-xs font-mono text-slate-400 mt-0.5">
                Tracks students who solved ≥ 4 distinct challenges within each 7-day competition week.
              </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {[pilotAnalytics?.fourOfSevenCohort?.week1, pilotAnalytics?.fourOfSevenCohort?.week2]
                .filter(Boolean)
                .map((wk: any, idx: number) => (
                  <div
                    key={idx}
                    className="p-5 rounded-xl bg-dark-900/70 border border-white/[0.07] space-y-4"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-sm font-bold text-white font-mono">{wk.weekLabel}</h3>
                        <span className="text-[11px] font-mono text-slate-500">
                          {wk.startDate} → {wk.endDate}
                        </span>
                      </div>
                      <div className="text-right font-mono">
                        <span className="text-xl font-extrabold text-emerald-400">
                          {wk.qualifiedCount} / {wk.activeStudentsInWeek}
                        </span>
                        <span className="block text-[10px] text-slate-400">
                          {wk.qualifiedPctOfActive}% of active ({wk.qualifiedPctOfRegistered}% of all
                          registered)
                        </span>
                      </div>
                    </div>

                    {/* Solve Count Buckets */}
                    <div className="grid grid-cols-4 gap-2 text-center font-mono text-xs">
                      <div className="p-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30">
                        <span className="text-base font-bold text-emerald-300 block">
                          {wk.buckets?.solved7Plus ?? 0}
                        </span>
                        <span className="text-[10px] text-emerald-400">7/7 Perfect</span>
                      </div>
                      <div className="p-2.5 rounded-lg bg-cyan-500/10 border border-cyan-500/30">
                        <span className="text-base font-bold text-cyan-300 block">
                          {wk.buckets?.solved4to6 ?? 0}
                        </span>
                        <span className="text-[10px] text-cyan-400">4–6/7 Met</span>
                      </div>
                      <div className="p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/30">
                        <span className="text-base font-bold text-amber-300 block">
                          {wk.buckets?.solved1to3 ?? 0}
                        </span>
                        <span className="text-[10px] text-amber-400">1–3/7 Partial</span>
                      </div>
                      <div className="p-2.5 rounded-lg bg-rose-500/10 border border-rose-500/30">
                        <span className="text-base font-bold text-rose-300 block">
                          {wk.buckets?.solved0 ?? 0}
                        </span>
                        <span className="text-[10px] text-rose-400">0/7 Solved</span>
                      </div>
                    </div>

                    {/* Student Breakdown List */}
                    {wk.students?.length > 0 ? (
                      <div className="max-h-48 overflow-y-auto border-t border-white/[0.06] pt-3">
                        <table className="w-full text-left text-[11px] font-mono">
                          <thead className="text-slate-400 uppercase text-[10px]">
                            <tr>
                              <th className="pb-2">Student</th>
                              <th className="pb-2">Solved</th>
                              <th className="pb-2">Submissions</th>
                              <th className="pb-2 text-right">Cohort Status</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-white/[0.04]">
                            {wk.students.map((st: any) => (
                              <tr key={st.userId}>
                                <td className="py-1.5 text-white font-semibold">
                                  {st.fullName}{' '}
                                  <span className="text-slate-500">(@{st.username})</span>
                                </td>
                                <td className="py-1.5 text-cyan-400 font-bold">
                                  {st.solvedCount} / 7
                                </td>
                                <td className="py-1.5 text-slate-400">{st.totalSubmissions}</td>
                                <td className="py-1.5 text-right">
                                  {st.metFourOfSeven ? (
                                    <span className="px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 text-[10px] font-bold">
                                      MET ≥4/7
                                    </span>
                                  ) : (
                                    <span className="px-2 py-0.5 rounded bg-amber-500/15 text-amber-300 border border-amber-500/30 text-[10px]">
                                      BELOW 4/7
                                    </span>
                                  )}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <p className="text-xs font-mono text-slate-500 text-center py-3">
                        No student submissions recorded in {wk.weekLabel}.
                      </p>
                    )}
                  </div>
                ))}
            </div>
          </div>

          {/* 3. Drop-Off by Day (14-Day Funnel Table) */}
          <div className="glass-card rounded-2xl border border-white/[0.08] overflow-hidden">
            <div className="p-6 border-b border-white/[0.06]">
              <h2 className="text-base font-bold text-white font-mono flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-amber-400" />
                <span>3. Drop-Off by Day (Day 1 → Day 14 Retention & Participation Funnel)</span>
              </h2>
              <p className="text-xs font-mono text-slate-400 mt-0.5">
                Day-over-day active challenger retention, solve conversion, and drop-off rate across
                the 2-week pilot.
              </p>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs font-mono">
                <thead className="bg-dark-900/80 text-slate-400 uppercase text-[10px] tracking-wider border-b border-white/[0.06]">
                  <tr>
                    <th className="px-6 py-3">Pilot Day (17:00 IST)</th>
                    <th className="px-6 py-3">Active Students</th>
                    <th className="px-6 py-3">Solved (AC) Students</th>
                    <th className="px-6 py-3">Solve Conversion</th>
                    <th className="px-6 py-3">Day-over-Day Drop-Off</th>
                    <th className="px-6 py-3">Retention vs Baseline</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.04]">
                  {(pilotAnalytics?.dropOffByDay?.dailyFunnel || []).map((row: any) => (
                    <tr key={row.date} className="hover:bg-white/[0.02] transition-colors">
                      <td className="px-6 py-3 font-bold text-white">{row.label}</td>
                      <td className="px-6 py-3 text-cyan-400 font-bold">{row.activeStudents}</td>
                      <td className="px-6 py-3 text-emerald-400 font-bold">
                        {row.solvingStudents}
                      </td>
                      <td className="px-6 py-3 text-slate-300">{row.solveConversionPct}%</td>
                      <td className="px-6 py-3">
                        {row.dayIndex === 1 ? (
                          <span className="text-slate-500">Baseline (Day 1)</span>
                        ) : row.dropOffCount > 0 ? (
                          <span className="text-rose-400 font-bold">
                            -{row.dropOffCount} students (-{row.dropOffRatePct}%)
                          </span>
                        ) : row.netChangeCount > 0 ? (
                          <span className="text-emerald-400 font-semibold">
                            +{row.netChangeCount} students
                          </span>
                        ) : (
                          <span className="text-slate-400">0 drop (Steady)</span>
                        )}
                      </td>
                      <td className="px-6 py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-24 h-2 bg-dark-900 rounded-full overflow-hidden">
                            <div
                              style={{
                                width: `${Math.min(100, row.retentionFromBaselinePct)}%`,
                              }}
                              className="h-full bg-gradient-to-r from-cyan-400 to-emerald-400"
                            />
                          </div>
                          <span className="text-slate-300 text-[11px]">
                            {row.retentionFromBaselinePct}%
                          </span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* 4. Most-Failed Problems */}
          <div className="glass-card rounded-2xl border border-white/[0.08] overflow-hidden">
            <div className="p-6 border-b border-white/[0.06]">
              <h2 className="text-base font-bold text-white font-mono flex items-center gap-2">
                <Sliders className="w-4 h-4 text-rose-400" />
                <span>4. Most-Failed Problems (2-Week Pilot Bottlenecks)</span>
              </h2>
              <p className="text-xs font-mono text-slate-400 mt-0.5">
                Problems ranked by failed submission volume and failure rate, with error verdict
                distribution.
              </p>
            </div>

            {!pilotAnalytics?.mostFailedProblems?.length ? (
              <div className="p-10 text-center text-xs font-mono text-slate-500">
                No problem submissions recorded in the 2-week pilot window yet.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs font-mono">
                  <thead className="bg-dark-900/80 text-slate-400 uppercase text-[10px] tracking-wider border-b border-white/[0.06]">
                    <tr>
                      <th className="px-6 py-3.5">Problem</th>
                      <th className="px-6 py-3.5">Difficulty</th>
                      <th className="px-6 py-3.5">Failed / Total</th>
                      <th className="px-6 py-3.5">Failure Rate</th>
                      <th className="px-6 py-3.5">Students (Fail / Try / AC)</th>
                      <th className="px-6 py-3.5">Top Failure Verdict</th>
                      <th className="px-6 py-3.5">Verdict Breakdown</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/[0.04]">
                    {pilotAnalytics.mostFailedProblems.map((prob: any) => (
                      <tr key={prob.problemId} className="hover:bg-white/[0.02] transition-colors">
                        <td className="px-6 py-4">
                          <span className="font-bold text-white text-sm block">{prob.title}</span>
                          <span className="text-slate-500 text-[11px]">{prob.category}</span>
                        </td>
                        <td className="px-6 py-4">
                          <DifficultyBadge difficulty={prob.difficulty as Difficulty} size="sm" />
                        </td>
                        <td className="px-6 py-4 font-bold text-rose-400">
                          {prob.failedSubmissions} / {prob.totalSubmissions}
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <div className="w-20 h-2 bg-dark-900 rounded-full overflow-hidden">
                              <div
                                style={{ width: `${prob.failureRatePct}%` }}
                                className="h-full bg-rose-500"
                              />
                            </div>
                            <span className="text-rose-300 font-bold">{prob.failureRatePct}%</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-slate-300">
                          <span className="text-rose-400 font-bold">
                            {prob.uniqueFailedStudents}
                          </span>{' '}
                          /{' '}
                          <span className="text-cyan-400">{prob.uniqueAttemptedStudents}</span> /{' '}
                          <span className="text-emerald-400">{prob.uniqueSolvedStudents}</span>
                        </td>
                        <td className="px-6 py-4">
                          {prob.topFailureVerdict ? (
                            <VerdictBadge verdict={prob.topFailureVerdict as Verdict} size="sm" />
                          ) : (
                            <span className="text-emerald-400 text-[11px]">0 Failures</span>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex flex-wrap gap-1.5 text-[10px]">
                            <span className="px-1.5 py-0.5 rounded bg-rose-500/10 text-rose-300">
                              WA: {prob.verdictBreakdown?.WRONG_ANSWER || 0}
                            </span>
                            <span className="px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-300">
                              CE: {prob.verdictBreakdown?.COMPILE_ERROR || 0}
                            </span>
                            <span className="px-1.5 py-0.5 rounded bg-orange-500/10 text-orange-300">
                              TLE: {prob.verdictBreakdown?.TIME_LIMIT_EXCEEDED || 0}
                            </span>
                            <span className="px-1.5 py-0.5 rounded bg-purple-500/10 text-purple-300">
                              RE: {prob.verdictBreakdown?.RUNTIME_ERROR || 0}
                            </span>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab: Problems */}
      {activeTab === 'problems' && (
        <div className="glass-card rounded-2xl border border-white/[0.08] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-mono">
              <thead className="bg-dark-900/80 text-slate-400 uppercase text-[10px] tracking-wider border-b border-white/[0.06]">
                <tr>
                  <th className="px-6 py-3.5">Title & Slug</th>
                  <th className="px-6 py-3.5">Difficulty</th>
                  <th className="px-6 py-3.5">Category</th>
                  <th className="px-6 py-3.5">Test Cases</th>
                  <th className="px-6 py-3.5">Daily Status</th>
                  <th className="px-6 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.04]">
                {problems.map((p: any) => (
                  <tr key={p.id} className="hover:bg-white/[0.02] transition-colors">
                    <td className="px-6 py-4">
                      <span className="font-bold text-white text-sm block">{p.title}</span>
                      <span className="text-slate-500 text-[11px]">slug: {p.slug}</span>
                    </td>
                    <td className="px-6 py-4">
                      <DifficultyBadge difficulty={p.difficulty as Difficulty} size="sm" />
                    </td>
                    <td className="px-6 py-4 text-slate-300">{p.category}</td>
                    <td className="px-6 py-4 text-cyan-400 font-semibold">
                      {p.testCases?.length || 0} cases
                    </td>
                    <td className="px-6 py-4">
                      {p.isDaily ? (
                        <span className="px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 text-[10px]">
                          Scheduled: {p.scheduledDate || 'Today'}
                        </span>
                      ) : (
                        <button
                          onClick={() => {
                            const date = prompt('Enter scheduled date (YYYY-MM-DD):', '2026-10-10');
                            if (date) scheduleDailyMutation.mutate({ problemId: p.id, scheduledDate: date });
                          }}
                          className="text-[10px] text-slate-500 hover:text-cyan-400 flex items-center gap-1"
                        >
                          <Calendar className="w-3 h-3" /> Schedule as Daily
                        </button>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right space-x-2">
                      <button
                        onClick={() => {
                          if (confirm(`Delete problem "${p.title}"?`)) {
                            deleteProblemMutation.mutate(p.id);
                          }
                        }}
                        className="p-1.5 rounded-lg text-rose-400 hover:bg-rose-500/10"
                        title="Delete Problem"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab: Submissions Live Stream */}
      {activeTab === 'submissions' && (
        <div className="glass-card rounded-2xl border border-white/[0.08] overflow-hidden">
          {submissions.length === 0 ? (
            <div className="p-12 text-center text-xs font-mono text-slate-500">
              No live submissions recorded yet. Incoming evaluations from challengers will stream here automatically.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs font-mono">
                <thead className="bg-dark-900/80 text-slate-400 uppercase text-[10px] tracking-wider border-b border-white/[0.06]">
                  <tr>
                    <th className="px-6 py-3.5">User</th>
                    <th className="px-6 py-3.5">Problem</th>
                    <th className="px-6 py-3.5">Verdict</th>
                    <th className="px-6 py-3.5">Runtime</th>
                    <th className="px-6 py-3.5">Submitted</th>
                    <th className="px-6 py-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.04]">
                  {submissions.map((sub: any) => (
                    <tr key={sub.id} className="hover:bg-white/[0.02] transition-colors">
                      <td className="px-6 py-4 font-bold text-white">
                        @{sub.user?.username || 'user'}
                      </td>
                      <td className="px-6 py-4 text-slate-300">
                        {sub.problem?.title}
                      </td>
                      <td className="px-6 py-4">
                        <VerdictBadge verdict={sub.verdict as Verdict} size="sm" />
                      </td>
                      <td className="px-6 py-4 text-slate-400">
                        {sub.runtimeMs !== null ? `${sub.runtimeMs}ms` : '—'}
                      </td>
                      <td className="px-6 py-4 text-slate-500">
                        {new Date(sub.createdAt).toLocaleTimeString()}
                      </td>
                      <td className="px-6 py-4 text-right space-x-2">
                        <button
                          onClick={() => setSelectedSubmissionCode(sub.code)}
                          className="p-1.5 rounded-lg text-cyan-400 hover:bg-cyan-500/10"
                          title="Inspect Code"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => rejudgeMutation.mutate(sub.id)}
                          className="p-1.5 rounded-lg text-amber-400 hover:bg-amber-500/10"
                          title="Re-judge"
                        >
                          <RefreshCw className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Tab: Users Roster */}
      {activeTab === 'users' && (
        <div className="glass-card rounded-2xl border border-white/[0.08] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-mono">
              <thead className="bg-dark-900/80 text-slate-400 uppercase text-[10px] tracking-wider border-b border-white/[0.06]">
                <tr>
                  <th className="px-6 py-3.5">User</th>
                  <th className="px-6 py-3.5">Email</th>
                  <th className="px-6 py-3.5">Role</th>
                  <th className="px-6 py-3.5">Streak</th>
                  <th className="px-6 py-3.5">Score</th>
                  <th className="px-6 py-3.5">Status</th>
                  <th className="px-6 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.04]">
                {users.map((u: any) => (
                  <tr key={u.id} className="hover:bg-white/[0.02] transition-colors">
                    <td className="px-6 py-4 font-bold text-white">
                      {u.fullName} <span className="text-slate-500 text-[11px]">(@{u.username})</span>
                    </td>
                    <td className="px-6 py-4 text-slate-400">{u.email}</td>
                    <td className="px-6 py-4">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          u.role === 'ADMIN'
                            ? 'bg-purple-500/15 text-purple-300 border border-purple-500/30'
                            : 'bg-slate-500/10 text-slate-300'
                        }`}
                      >
                        {u.role}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-orange-400">{u.currentStreak || 0}d</td>
                    <td className="px-6 py-4 text-cyan-400 font-bold">{u.totalPoints || 0} PTS</td>
                    <td className="px-6 py-4">
                      {u.isBanned ? (
                        <span className="px-2 py-0.5 rounded bg-rose-500/15 text-rose-300 border border-rose-500/30 text-[10px]">
                          BANNED
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 text-[10px]">
                          ACTIVE
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right space-x-2">
                      <button
                        onClick={() =>
                          roleMutation.mutate({
                            id: u.id,
                            role: u.role === 'ADMIN' ? 'STUDENT' : 'ADMIN',
                          })
                        }
                        className="px-2.5 py-1 rounded bg-dark-800 text-[11px] text-slate-300 hover:text-white"
                      >
                        {u.role === 'ADMIN' ? 'Demote' : 'Make Admin'}
                      </button>

                      <button
                        onClick={() => banMutation.mutate({ id: u.id, isBanned: !u.isBanned })}
                        className={`px-2.5 py-1 rounded text-[11px] ${
                          u.isBanned
                            ? 'bg-emerald-500/10 text-emerald-400'
                            : 'bg-rose-500/10 text-rose-400'
                        }`}
                      >
                        {u.isBanned ? 'Unban' : 'Ban'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Code Inspection Modal */}
      {selectedSubmissionCode && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="w-full max-w-2xl glass-card rounded-2xl border border-white/[0.1] shadow-2xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-bold text-white">Inspecting Student Solution</h3>
              <button
                onClick={() => setSelectedSubmissionCode(null)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <pre className="p-4 rounded-xl bg-dark-950 text-xs font-mono text-cyan-200 overflow-x-auto max-h-[60vh]">
              {selectedSubmissionCode}
            </pre>
          </div>
        </div>
      )}

      {/* Author New Problem Modal */}
      {isCreateProblemOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="w-full max-w-3xl glass-card rounded-2xl border border-white/[0.1] shadow-2xl p-6 sm:p-8 overflow-y-auto max-h-[90vh]">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-white flex items-center gap-2">
                <Code2 className="w-5 h-5 text-cyan-400" />
                <span>Author LogicQ Challenge</span>
              </h3>
              <button
                onClick={() => setIsCreateProblemOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-mono text-slate-300 mb-1">TITLE</label>
                  <input
                    type="text"
                    required
                    value={problemForm.title}
                    onChange={(e) => setProblemForm({ ...problemForm, title: e.target.value })}
                    placeholder="e.g. Inverted Binary Tree in C"
                    className="w-full px-3 py-2 rounded-lg bg-dark-900 border border-slate-700 text-sm text-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-mono text-slate-300 mb-1">SLUG (URL KEY)</label>
                  <input
                    type="text"
                    required
                    value={problemForm.slug}
                    onChange={(e) => setProblemForm({ ...problemForm, slug: e.target.value })}
                    placeholder="e.g. inverted-binary-tree"
                    className="w-full px-3 py-2 rounded-lg bg-dark-900 border border-slate-700 text-sm text-white font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-mono text-slate-300 mb-1">DIFFICULTY</label>
                  <select
                    value={problemForm.difficulty}
                    onChange={(e) =>
                      setProblemForm({ ...problemForm, difficulty: e.target.value as Difficulty })
                    }
                    className="w-full px-3 py-2 rounded-lg bg-dark-900 border border-slate-700 text-sm text-white"
                  >
                    <option value="EASY">EASY</option>
                    <option value="MEDIUM">MEDIUM</option>
                    <option value="HARD">HARD</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-mono text-slate-300 mb-1">BASE POINTS</label>
                  <input
                    type="number"
                    value={problemForm.basePoints}
                    onChange={(e) =>
                      setProblemForm({ ...problemForm, basePoints: parseInt(e.target.value) || 20 })
                    }
                    className="w-full px-3 py-2 rounded-lg bg-dark-900 border border-slate-700 text-sm text-white font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-mono text-slate-300 mb-1">CATEGORY</label>
                  <input
                    type="text"
                    value={problemForm.category}
                    onChange={(e) => setProblemForm({ ...problemForm, category: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg bg-dark-900 border border-slate-700 text-sm text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-mono text-slate-300 mb-1">
                  PROBLEM STATEMENT (MARKDOWN)
                </label>
                <textarea
                  rows={6}
                  required
                  value={problemForm.description}
                  onChange={(e) => setProblemForm({ ...problemForm, description: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg bg-dark-900 border border-slate-700 text-xs font-mono text-white leading-relaxed resize-none"
                />
              </div>

              <div>
                <label className="block text-xs font-mono text-slate-300 mb-1">
                  STARTER C CODE BOILERPLATE
                </label>
                <textarea
                  rows={5}
                  required
                  value={problemForm.starterCode}
                  onChange={(e) => setProblemForm({ ...problemForm, starterCode: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg bg-dark-900 border border-slate-700 text-xs font-mono text-cyan-200 resize-none"
                />
              </div>

              {/* Test Cases Manager */}
              <div className="space-y-3 pt-2 border-t border-slate-800">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono text-white font-bold">
                    TEST CASES ({problemForm.testCases.length})
                  </span>
                  <button
                    type="button"
                    onClick={handleAddTestCase}
                    className="text-xs font-mono text-cyan-400 hover:text-cyan-300 flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" /> Add Case
                  </button>
                </div>

                {problemForm.testCases.map((tc, index) => (
                  <div
                    key={index}
                    className="p-3 rounded-xl bg-dark-950 border border-white/[0.06] space-y-2 text-xs font-mono"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400 font-bold">Case {index + 1}</span>
                      <div className="flex items-center gap-4">
                        <label className="flex items-center gap-1.5 cursor-pointer text-slate-300">
                          <input
                            type="checkbox"
                            checked={tc.isHidden}
                            onChange={(e) =>
                              handleTestCaseChange(index, 'isHidden', e.target.checked)
                            }
                            className="rounded bg-dark-900 border-slate-700 text-cyan-500"
                          />
                          <span>Hidden (Shield from client)</span>
                        </label>
                        {problemForm.testCases.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleRemoveTestCase(index)}
                            className="text-rose-400 hover:text-rose-300"
                          >
                            Remove
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <span className="text-[10px] text-slate-500 block">STDIN INPUT</span>
                        <textarea
                          rows={2}
                          value={tc.input}
                          onChange={(e) => handleTestCaseChange(index, 'input', e.target.value)}
                          className="w-full p-1.5 rounded bg-dark-900 border border-slate-800 text-cyan-200 text-xs resize-none"
                        />
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-500 block">EXPECTED STDOUT</span>
                        <textarea
                          rows={2}
                          value={tc.expectedOutput}
                          onChange={(e) =>
                            handleTestCaseChange(index, 'expectedOutput', e.target.value)
                          }
                          className="w-full p-1.5 rounded bg-dark-900 border border-slate-800 text-emerald-200 text-xs resize-none"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsCreateProblemOpen(false)}
                  className="px-4 py-2 rounded-lg font-mono text-xs text-slate-400"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createProblemMutation.isPending}
                  className="px-5 py-2.5 rounded-xl font-mono text-xs font-bold text-dark-950 bg-gradient-to-r from-cyan-400 to-emerald-400"
                >
                  {createProblemMutation.isPending ? 'Publishing...' : 'Publish Challenge'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
