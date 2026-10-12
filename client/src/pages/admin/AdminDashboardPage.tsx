import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../api/client.js';
import { DifficultyBadge, VerdictBadge } from '../../components/common/Badge.js';
import {
  ALLOWED_COLLEGES,
  ALLOWED_DEPARTMENTS,
  ALLOWED_YEARS,
} from '../../config/academic.config.js';
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
  Download,
  Edit3,
  Search,
  Upload,
  Flag,
} from 'lucide-react';
import { Difficulty, Verdict } from '../../types/index.js';

export const AdminDashboardPage: React.FC = () => {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<
    'problems' | 'submissions' | 'uploads' | 'checkers' | 'users' | 'analytics'
  >('analytics');

  // Filter States for Users & Submissions & Uploads
  const [filterSearch, setFilterSearch] = useState('');
  const [filterCollege, setFilterCollege] = useState('ALL');
  const [filterDepartment, setFilterDepartment] = useState('ALL');
  const [filterYear, setFilterYear] = useState('ALL');
  const [filterDivision, setFilterDivision] = useState('');
  const [filterUploadStatus, setFilterUploadStatus] = useState('ALL');
  const [filterSuspicionFlag, setFilterSuspicionFlag] = useState('ALL');

  // Modal States
  const [isCreateProblemOpen, setIsCreateProblemOpen] = useState(false);
  const [selectedSubmissionCode, setSelectedSubmissionCode] = useState<string | null>(null);
  const [reviewingUpload, setReviewingUpload] = useState<any | null>(null);
  const [compareUpload, setCompareUpload] = useState<any | null>(null);
  const [reviewForm, setReviewForm] = useState({
    status: 'APPROVED' as 'APPROVED' | 'REJECTED' | 'CHANGES_REQUESTED',
    pointsAwarded: 20,
    reviewerComment: '',
    suspicionFlag: false,
  });
  const [editingAcademicUser, setEditingAcademicUser] = useState<any | null>(null);
  const [academicEditForm, setAcademicEditForm] = useState({
    prn: '',
    college: (ALLOWED_COLLEGES[0] || 'Sanjivani University') as string,
    department: (ALLOWED_DEPARTMENTS[0] || 'CSE') as string,
    year: (ALLOWED_YEARS[0] || 'FY') as string,
    division: '',
    adminPassword: '',
    reason: '',
  });

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

  const buildFilterQuery = () => {
    const params = new URLSearchParams();
    params.set('limit', '50');
    if (filterSearch.trim()) params.set('search', filterSearch.trim());
    if (filterCollege !== 'ALL') params.set('college', filterCollege);
    if (filterDepartment !== 'ALL') params.set('department', filterDepartment);
    if (filterYear !== 'ALL') params.set('year', filterYear);
    if (filterDivision.trim()) params.set('division', filterDivision.trim().toUpperCase());
    if (filterUploadStatus !== 'ALL') params.set('status', filterUploadStatus);
    if (filterSuspicionFlag !== 'ALL') {
      params.set('suspicionFlag', filterSuspicionFlag === 'FLAGGED' ? 'true' : 'false');
    }
    return params.toString();
  };

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
    queryKey: ['admin-submissions', filterSearch, filterDepartment, filterYear, filterDivision],
    queryFn: () => api.get(`/admin/submissions?${buildFilterQuery()}`),
  });

  // Fetch Uploaded Solutions
  const { data: uploadsData } = useQuery({
    queryKey: [
      'admin-uploads',
      filterSearch,
      filterDepartment,
      filterYear,
      filterDivision,
      filterUploadStatus,
      filterSuspicionFlag,
    ],
    queryFn: () => api.get(`/admin/uploads?${buildFilterQuery()}`),
  });

  // Fetch Users
  const { data: usersData } = useQuery({
    queryKey: [
      'admin-users',
      filterSearch,
      filterCollege,
      filterDepartment,
      filterYear,
      filterDivision,
    ],
    queryFn: () => api.get(`/admin/users?${buildFilterQuery()}`),
  });

  // Fetch Checkers
  const { data: checkersData } = useQuery({
    queryKey: ['admin-checkers'],
    queryFn: () => api.get('/admin/checkers'),
  });

  const overview = analyticsData?.data?.overview;
  const pilotAnalytics = analyticsData?.data?.pilotAnalytics;
  const departmentBreakdown = analyticsData?.data?.departmentBreakdown || [];
  const yearBreakdown = analyticsData?.data?.yearBreakdown || [];
  const problems = problemsData?.data?.problems || [];
  const submissions = submissionsData?.data?.submissions || [];
  const uploads = uploadsData?.data?.uploads || [];
  const users = usersData?.data?.users || [];
  const checkers = checkersData?.data?.checkers || [];

  // Mutations
  const reviewUploadMutation = useMutation({
    mutationFn: ({ id, body }: { id: string; body: any }) =>
      api.put(`/admin/uploads/${id}/review`, body),
    onSuccess: () => {
      toast.success('Upload review saved');
      setReviewingUpload(null);
      setCompareUpload(null);
      queryClient.invalidateQueries({ queryKey: ['admin-uploads'] });
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
    },
    onError: (err: any) => toast.error(err.message || 'Failed to save upload review'),
  });

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

  const auditedPrnMutation = useMutation({
    mutationFn: ({ id, body }: { id: string; body: any }) =>
      api.put(`/admin/users/${id}/prn`, body),
    onSuccess: () => {
      toast.success('Student PRN & academic record updated and logged in audit trail.');
      setEditingAcademicUser(null);
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
    },
    onError: (err: any) => {
      toast.error(err.message || 'Failed to update student PRN');
    },
  });

  const togglePauseMutation = useMutation({
    mutationFn: ({ id, isCheckerPaused }: { id: string; isCheckerPaused: boolean }) =>
      api.patch(`/admin/checkers/${id}/pause`, { isCheckerPaused }),
    onSuccess: () => {
      toast.success('Checker status updated');
      queryClient.invalidateQueries({ queryKey: ['admin-checkers'] });
    },
    onError: (err: any) => toast.error(err.message || 'Failed to update checker status'),
  });

  const autoAssignMutation = useMutation({
    mutationFn: () => api.post('/admin/uploads/auto-assign'),
    onSuccess: (res: any) => {
      toast.success(res?.message || 'Auto-assignment completed');
      queryClient.invalidateQueries({ queryKey: ['admin-uploads'] });
      queryClient.invalidateQueries({ queryKey: ['admin-checkers'] });
    },
    onError: (err: any) => toast.error(err.message || 'Auto-assignment failed'),
  });

  const assignUploadMutation = useMutation({
    mutationFn: ({ uploadId, checkerId }: { uploadId: string; checkerId: string }) =>
      api.post(`/admin/uploads/${uploadId}/assign`, { checkerId }),
    onSuccess: () => {
      toast.success('Upload assignment updated');
      queryClient.invalidateQueries({ queryKey: ['admin-uploads'] });
      queryClient.invalidateQueries({ queryKey: ['admin-checkers'] });
    },
    onError: (err: any) => toast.error(err.message || 'Failed to assign upload'),
  });

  const handleDownloadCsv = async (type: 'users' | 'weekly-results') => {
    try {
      const token = localStorage.getItem('logicq_access_token');
      const qs = buildFilterQuery();
      const res = await fetch(`/api/admin/export/${type}.csv?${qs}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        credentials: 'include',
      });
      if (!res.ok) throw new Error('CSV export failed');
      const text = await res.text();
      const blob = new Blob([text], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `logicq_${type.replace('-', '_')}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success(`Exported ${type} CSV successfully.`);
    } catch (err: any) {
      toast.error(err.message || 'Failed to export CSV');
    }
  };

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

      {/* Single-Admin Alert Warning (Enforces minimum 2 admins system safety) */}
      {overview?.isSingleAdminAlert && (
        <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-between gap-3 text-amber-300">
          <div className="flex items-center gap-3">
            <span className="p-2 rounded-xl bg-amber-500/20 text-amber-400 font-bold text-lg">⚠️</span>
            <div>
              <h4 className="text-xs font-bold uppercase font-mono tracking-wider">
                System Invariant Warning: Only 1 Active Administrator
              </h4>
              <p className="text-xs text-amber-200/80 mt-0.5 font-mono">
                LogicQ policy mandates maintaining at least 2 active administrators to prevent administrative lockouts. Please appoint another administrator from the User Roster.
              </p>
            </div>
          </div>
          <button
            onClick={() => setActiveTab('users')}
            className="px-3 py-1.5 rounded-lg text-xs font-mono font-bold bg-amber-500 text-slate-950 hover:bg-amber-400 whitespace-nowrap"
          >
            Manage Admins
          </button>
        </div>
      )}

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
          onClick={() => setActiveTab('uploads')}
          className={`px-4 py-2 rounded-xl transition-colors flex items-center gap-1.5 ${
            activeTab === 'uploads'
              ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 font-bold'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Upload className="w-3.5 h-3.5" />
          <span>Review Uploads ({uploads.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('checkers')}
          className={`px-4 py-2 rounded-xl transition-colors flex items-center gap-1.5 ${
            activeTab === 'checkers'
              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-bold'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <ShieldCheck className="w-3.5 h-3.5" />
          <span>Checkers Workload ({checkers.length})</span>
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

            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2.5 pt-4 items-end min-h-[160px]">
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
                    className="flex flex-col items-center gap-1.5 p-2.5 rounded-xl bg-dark-900/60 border border-white/[0.05]"
                  >
                    <span className="text-xs font-mono font-bold text-cyan-300">
                      {day.activeStudents}
                    </span>
                    <div className="w-full h-24 flex items-end justify-center gap-1.5 bg-dark-950/70 rounded-lg p-1.5">
                      <div
                        style={{ height: `${activeHeightPct}%` }}
                        className="w-3 rounded-t bg-cyan-400 transition-all"
                        title={`Active Students: ${day.activeStudents}`}
                      />
                      <div
                        style={{ height: `${solvedHeightPct}%` }}
                        className="w-3 rounded-t bg-emerald-400 transition-all"
                        title={`Solving Students (AC): ${day.solvingStudents}`}
                      />
                    </div>
                    <span className="text-xs font-mono text-slate-300 text-center leading-tight">
                      W{day.weekNumber}·D{day.dayInWeek}
                    </span>
                    <span className="text-xs font-mono text-slate-400">
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
                        <span className="text-xs font-mono text-slate-400">
                          {wk.startDate} → {wk.endDate}
                        </span>
                      </div>
                      <div className="text-right font-mono">
                        <span className="text-xl font-extrabold text-emerald-400">
                          {wk.qualifiedCount} / {wk.activeStudentsInWeek}
                        </span>
                        <span className="block text-xs text-slate-400">
                          {wk.qualifiedPctOfActive}% of active ({wk.qualifiedPctOfRegistered}% of all
                          registered)
                        </span>
                      </div>
                    </div>

                    {/* Solve Count Buckets */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center font-mono text-xs">
                      <div className="p-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30">
                        <span className="text-base font-bold text-emerald-300 block">
                          {wk.buckets?.solved7Plus ?? 0}
                        </span>
                        <span className="text-xs text-emerald-400">7/7 Perfect</span>
                      </div>
                      <div className="p-2.5 rounded-lg bg-cyan-500/10 border border-cyan-500/30">
                        <span className="text-base font-bold text-cyan-300 block">
                          {wk.buckets?.solved4to6 ?? 0}
                        </span>
                        <span className="text-xs text-cyan-400">4–6/7 Met</span>
                      </div>
                      <div className="p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/30">
                        <span className="text-base font-bold text-amber-300 block">
                          {wk.buckets?.solved1to3 ?? 0}
                        </span>
                        <span className="text-xs text-amber-400">1–3/7 Partial</span>
                      </div>
                      <div className="p-2.5 rounded-lg bg-rose-500/10 border border-rose-500/30">
                        <span className="text-base font-bold text-rose-300 block">
                          {wk.buckets?.solved0 ?? 0}
                        </span>
                        <span className="text-xs text-rose-400">0/7 Solved</span>
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

          {/* 4. Department & Year Academic Breakdowns */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="glass-card rounded-2xl border border-white/[0.08] overflow-hidden">
              <div className="p-5 border-b border-white/[0.06] flex items-center justify-between">
                <div>
                  <h2 className="text-base font-bold text-white font-mono">
                    4. Department Breakdown
                  </h2>
                  <p className="text-xs font-mono text-slate-400 mt-0.5">
                    Student count, points, and average streak by Department
                  </p>
                </div>
                <button
                  onClick={() => handleDownloadCsv('weekly-results')}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-dark-850 border border-dark-700 text-xs font-mono text-cyan-400 hover:bg-dark-800"
                >
                  <Download className="w-3.5 h-3.5" />
                  Weekly Results CSV
                </button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs font-mono">
                  <thead className="bg-dark-900/80 text-slate-400 uppercase tracking-wider border-b border-white/[0.06]">
                    <tr>
                      <th className="px-4 py-3">Department</th>
                      <th className="px-4 py-3">Students</th>
                      <th className="px-4 py-3">Total Points</th>
                      <th className="px-4 py-3">Avg Points</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/[0.04]">
                    {departmentBreakdown.map((d: any) => (
                      <tr key={d.department} className="hover:bg-white/[0.02]">
                        <td className="px-4 py-3 font-bold text-white">{d.department}</td>
                        <td className="px-4 py-3 text-slate-300">{d.studentCount}</td>
                        <td className="px-4 py-3 text-cyan-400 font-bold">{d.totalPoints} PTS</td>
                        <td className="px-4 py-3 text-emerald-400">{d.avgPoints} PTS</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="glass-card rounded-2xl border border-white/[0.08] overflow-hidden">
              <div className="p-5 border-b border-white/[0.06] flex items-center justify-between">
                <div>
                  <h2 className="text-base font-bold text-white font-mono">
                    5. Academic Year Breakdown
                  </h2>
                  <p className="text-xs font-mono text-slate-400 mt-0.5">
                    Student count, points, and average streak by Year (FY, SY, TY)
                  </p>
                </div>
                <button
                  onClick={() => handleDownloadCsv('users')}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-dark-850 border border-dark-700 text-xs font-mono text-emerald-400 hover:bg-dark-800"
                >
                  <Download className="w-3.5 h-3.5" />
                  Export Users CSV
                </button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs font-mono">
                  <thead className="bg-dark-900/80 text-slate-400 uppercase tracking-wider border-b border-white/[0.06]">
                    <tr>
                      <th className="px-4 py-3">Year</th>
                      <th className="px-4 py-3">Students</th>
                      <th className="px-4 py-3">Total Points</th>
                      <th className="px-4 py-3">Avg Points</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/[0.04]">
                    {yearBreakdown.map((y: any) => (
                      <tr key={y.year} className="hover:bg-white/[0.02]">
                        <td className="px-4 py-3 font-bold text-white">{y.year}</td>
                        <td className="px-4 py-3 text-slate-300">{y.studentCount}</td>
                        <td className="px-4 py-3 text-cyan-400 font-bold">{y.totalPoints} PTS</td>
                        <td className="px-4 py-3 text-emerald-400">{y.avgPoints} PTS</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* 6. Most-Failed Problems */}
          <div className="glass-card rounded-2xl border border-white/[0.08] overflow-hidden">
            <div className="p-6 border-b border-white/[0.06]">
              <h2 className="text-base font-bold text-white font-mono flex items-center gap-2">
                <Sliders className="w-4 h-4 text-rose-400" />
                <span>6. Most-Failed Problems (2-Week Pilot Bottlenecks)</span>
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

      {/* Academic Filters & CSV Export Bar for Users, Submissions & Uploads */}
      {(activeTab === 'users' || activeTab === 'submissions' || activeTab === 'uploads') && (
        <div className="glass-card rounded-2xl border border-white/[0.08] p-4 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            <div>
              <label htmlFor="admin-search" className="block text-xs font-mono text-slate-400 mb-1">
                Search PRN / Email / ID
              </label>
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  id="admin-search"
                  type="text"
                  value={filterSearch}
                  onChange={(e) => setFilterSearch(e.target.value)}
                  placeholder="PRN, email, display name..."
                  className="w-full pl-8 pr-3 py-1.5 rounded-lg bg-dark-950 border border-dark-700 text-xs font-mono text-white"
                />
              </div>
            </div>

            <div>
              <label htmlFor="admin-filter-college" className="block text-xs font-mono text-slate-400 mb-1">
                College
              </label>
              <select
                id="admin-filter-college"
                value={filterCollege}
                onChange={(e) => setFilterCollege(e.target.value)}
                className="w-full px-3 py-1.5 rounded-lg bg-dark-950 border border-dark-700 text-xs font-mono text-white"
              >
                <option value="ALL">All Colleges</option>
                {ALLOWED_COLLEGES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="admin-filter-dept" className="block text-xs font-mono text-slate-400 mb-1">
                Department
              </label>
              <select
                id="admin-filter-dept"
                value={filterDepartment}
                onChange={(e) => setFilterDepartment(e.target.value)}
                className="w-full px-3 py-1.5 rounded-lg bg-dark-950 border border-dark-700 text-xs font-mono text-white"
              >
                <option value="ALL">All Departments</option>
                {ALLOWED_DEPARTMENTS.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="admin-filter-year" className="block text-xs font-mono text-slate-400 mb-1">
                Year
              </label>
              <select
                id="admin-filter-year"
                value={filterYear}
                onChange={(e) => setFilterYear(e.target.value)}
                className="w-full px-3 py-1.5 rounded-lg bg-dark-950 border border-dark-700 text-xs font-mono text-white"
              >
                <option value="ALL">All Years</option>
                {ALLOWED_YEARS.map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="admin-filter-div" className="block text-xs font-mono text-slate-400 mb-1">
                Division
              </label>
              <input
                id="admin-filter-div"
                type="text"
                maxLength={3}
                value={filterDivision}
                onChange={(e) =>
                  setFilterDivision(e.target.value.replace(/[^A-Za-z0-9]/g, '').toUpperCase())
                }
                placeholder="e.g. A, B, C1"
                className="w-full px-3 py-1.5 rounded-lg bg-dark-950 border border-dark-700 text-xs font-mono text-white"
              />
            </div>
          </div>

          {activeTab === 'uploads' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-white/[0.06]">
              <div>
                <label htmlFor="admin-filter-upload-status" className="block text-xs font-mono text-slate-400 mb-1">
                  Review Status
                </label>
                <select
                  id="admin-filter-upload-status"
                  value={filterUploadStatus}
                  onChange={(e) => setFilterUploadStatus(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-lg bg-dark-950 border border-dark-700 text-xs font-mono text-white"
                >
                  <option value="ALL">All Statuses</option>
                  <option value="PENDING_REVIEW">Pending Review</option>
                  <option value="APPROVED">Approved</option>
                  <option value="REJECTED">Rejected</option>
                  <option value="CHANGES_REQUESTED">Changes Requested</option>
                </select>
              </div>
              <div>
                <label htmlFor="admin-filter-suspicion" className="block text-xs font-mono text-slate-400 mb-1">
                  Suspicion Flag
                </label>
                <select
                  id="admin-filter-suspicion"
                  value={filterSuspicionFlag}
                  onChange={(e) => setFilterSuspicionFlag(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-lg bg-dark-950 border border-dark-700 text-xs font-mono text-white"
                >
                  <option value="ALL">All Submissions</option>
                  <option value="FLAGGED">Flagged Suspicious Only</option>
                  <option value="CLEAR">Unflagged Only</option>
                </select>
              </div>
            </div>
          )}

          <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-white/[0.06]">
            <span className="text-xs font-mono text-slate-400">
              Showing{' '}
              {activeTab === 'users'
                ? users.length
                : activeTab === 'uploads'
                  ? uploads.length
                  : submissions.length}{' '}
              records
            </span>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => handleDownloadCsv('users')}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-dark-850 border border-dark-700 text-xs font-mono text-emerald-400 hover:bg-dark-800"
              >
                <Download className="w-3.5 h-3.5" />
                Export Users CSV
              </button>
              <button
                type="button"
                onClick={() => handleDownloadCsv('weekly-results')}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-dark-850 border border-dark-700 text-xs font-mono text-cyan-400 hover:bg-dark-800"
              >
                <Download className="w-3.5 h-3.5" />
                Export Weekly Results CSV
              </button>
            </div>
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
                    <th className="px-4 py-3.5">Student / PRN</th>
                    <th className="px-4 py-3.5">Academic Info</th>
                    <th className="px-4 py-3.5">Problem</th>
                    <th className="px-4 py-3.5">Verdict</th>
                    <th className="px-4 py-3.5">Runtime</th>
                    <th className="px-4 py-3.5">Submitted</th>
                    <th className="px-4 py-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.04]">
                  {submissions.map((sub: any) => (
                    <tr key={sub.id} className="hover:bg-white/[0.02] transition-colors">
                      <td className="px-4 py-4">
                        <span className="font-bold text-white block">
                          {sub.user?.prn || sub.user?.username || 'user'}
                        </span>
                        <span className="text-slate-400 text-xs">
                          {sub.user?.displayName || sub.user?.email || `@${sub.user?.username}`}
                        </span>
                      </td>
                      <td className="px-4 py-4 text-slate-300">
                        <span className="block font-semibold text-cyan-400">
                          {sub.user?.department || '—'} • {sub.user?.year || '—'}
                          {sub.user?.division ? ` (Div ${sub.user.division})` : ''}
                        </span>
                        <span className="text-slate-400 text-xs">
                          {sub.user?.college || 'Sanjivani University'}
                        </span>
                      </td>
                      <td className="px-4 py-4 text-slate-300">
                        {sub.problem?.title}
                      </td>
                      <td className="px-4 py-4">
                        <VerdictBadge verdict={sub.verdict as Verdict} size="sm" />
                      </td>
                      <td className="px-4 py-4 text-slate-400">
                        {sub.runtimeMs !== null ? `${sub.runtimeMs}ms` : '—'}
                      </td>
                      <td className="px-4 py-4 text-slate-500">
                        {new Date(sub.createdAt).toLocaleTimeString()}
                      </td>
                      <td className="px-4 py-4 text-right space-x-2">
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

      {/* Tab: Review Uploads */}
      {activeTab === 'uploads' && (
        <div className="glass-card rounded-2xl border border-white/[0.08] overflow-hidden" data-testid="admin-review-uploads-view">
          {uploads.length === 0 ? (
            <div className="p-12 text-center text-xs font-mono text-slate-500">
              No uploaded solutions match the current filters.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs font-mono">
                <thead className="bg-dark-900/80 text-slate-400 uppercase text-[10px] tracking-wider border-b border-white/[0.06]">
                  <tr>
                    <th className="px-4 py-3.5">Student / PRN</th>
                    <th className="px-4 py-3.5">Academic Info</th>
                    <th className="px-4 py-3.5">Problem</th>
                    <th className="px-4 py-3.5">Files</th>
                    <th className="px-4 py-3.5">Status</th>
                    <th className="px-4 py-3.5">Points</th>
                    <th className="px-4 py-3.5">Submitted</th>
                    <th className="px-4 py-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.04]">
                  {uploads.map((up: any) => (
                    <tr key={up.id} className="hover:bg-white/[0.02] transition-colors">
                      <td className="px-4 py-4">
                        <span className="font-bold text-white block">
                          {up.prn || up.user?.prn || up.user?.username || 'student'}
                        </span>
                        <span className="text-slate-400 text-xs">
                          {up.user?.displayName || up.user?.email || ''}
                        </span>
                      </td>
                      <td className="px-4 py-4 text-slate-300">
                        <span className="block font-semibold text-cyan-400">
                          {up.department || up.user?.department || '—'} • {up.year || up.user?.year || '—'}
                          {up.division || up.user?.division ? ` (Div ${up.division || up.user?.division})` : ''}
                        </span>
                      </td>
                      <td className="px-4 py-4 text-slate-300">
                        {up.problem?.title || 'Challenge'}
                        <span className="block text-[10px] text-slate-500">
                          Max: {up.problem?.basePoints || 20} PTS
                        </span>
                      </td>
                      <td className="px-4 py-4 text-cyan-400">
                        {Array.isArray(up.files) ? `${up.files.length} file(s)` : '0 files'}
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-1.5">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                              up.status === 'APPROVED'
                                ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                                : up.status === 'REJECTED'
                                  ? 'bg-rose-500/15 text-rose-400 border-rose-500/30'
                                  : up.status === 'CHANGES_REQUESTED'
                                    ? 'bg-amber-500/15 text-amber-400 border-amber-500/30'
                                    : 'bg-cyan-500/15 text-cyan-400 border-cyan-500/30'
                            }`}
                          >
                            {up.status.replace(/_/g, ' ')}
                          </span>
                          {up.suspicionFlag && (
                            <span className="px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-300 text-[10px] font-bold flex items-center gap-1">
                              <Flag className="w-3 h-3" /> FLAGGED
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-4 font-bold text-cyan-400">
                        +{up.pointsAwarded || 0} PTS
                      </td>
                      <td className="px-4 py-4 text-slate-500">
                        {new Date(up.submittedAt).toLocaleString()}
                      </td>
                      <td className="px-4 py-4 text-right space-x-1.5 whitespace-nowrap">
                        <select
                          value={up.assignedCheckerId || ''}
                          onChange={(e) =>
                            assignUploadMutation.mutate({
                              uploadId: up.id,
                              checkerId: e.target.value,
                            })
                          }
                          className="px-2 py-1 rounded bg-dark-900 border border-slate-700 text-[11px] text-slate-300 font-mono"
                          title="Assign to checker"
                        >
                          <option value="">Unassigned</option>
                          {checkers.map((c: any) => (
                            <option key={c.id} value={c.id} disabled={c.id === up.userId}>
                              {c.displayName || c.username} {c.id === up.userId ? '(Submitter)' : ''}
                            </option>
                          ))}
                        </select>

                        <button
                          onClick={() => {
                            setReviewingUpload(up);
                            setReviewForm({
                              status:
                                up.status === 'PENDING_REVIEW'
                                  ? 'APPROVED'
                                  : (up.status as 'APPROVED' | 'REJECTED' | 'CHANGES_REQUESTED'),
                              pointsAwarded:
                                up.status === 'PENDING_REVIEW'
                                  ? up.problem?.basePoints || 20
                                  : up.pointsAwarded || 0,
                              reviewerComment: up.reviewerComment || '',
                              suspicionFlag: Boolean(up.suspicionFlag),
                            });
                          }}
                          className="px-2.5 py-1 rounded bg-cyan-500/15 border border-cyan-500/30 text-xs text-cyan-300 hover:bg-cyan-500/25 inline-flex items-center gap-1"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>Review</span>
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

      {/* Review Uploaded Solution Modal (with Side-by-Side Comparison) */}
      {reviewingUpload && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="w-full max-w-4xl glass-card rounded-2xl border border-white/[0.1] shadow-2xl p-6 space-y-5 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-white/[0.08] pb-3">
              <div>
                <h3 className="text-base font-bold text-white font-mono">
                  Review Uploaded Solution • PRN {reviewingUpload.prn || reviewingUpload.user?.prn}
                </h3>
                <p className="text-xs font-mono text-slate-400">
                  {reviewingUpload.problem?.title} (Max {reviewingUpload.problem?.basePoints || 20} PTS) •{' '}
                  {reviewingUpload.department} • {reviewingUpload.year}
                </p>
              </div>
              <button
                onClick={() => {
                  setReviewingUpload(null);
                  setCompareUpload(null);
                }}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {reviewingUpload.note && (
              <div className="p-3 rounded-xl bg-dark-900 border border-dark-700 text-xs font-mono text-slate-200">
                <span className="text-[10px] uppercase text-slate-400 block mb-1">Student Approach Note:</span>
                {reviewingUpload.note}
              </div>
            )}

            {/* Side-by-side comparison selector */}
            <div className="flex items-center justify-between gap-3">
              <span className="text-xs font-mono font-bold text-slate-300">
                Uploaded Files ({Array.isArray(reviewingUpload.files) ? reviewingUpload.files.length : 0})
              </span>
              <select
                value={compareUpload?.id || ''}
                onChange={(e) => {
                  const found = uploads.find((u: any) => u.id === e.target.value);
                  setCompareUpload(found || null);
                }}
                className="px-2.5 py-1 rounded bg-dark-900 border border-dark-700 text-xs font-mono text-slate-300"
              >
                <option value="">Compare side-by-side with another upload...</option>
                {uploads
                  .filter(
                    (u: any) =>
                      u.id !== reviewingUpload.id && u.problemId === reviewingUpload.problemId
                  )
                  .map((u: any) => (
                    <option key={u.id} value={u.id}>
                      PRN {u.prn || u.user?.prn} ({u.status})
                    </option>
                  ))}
              </select>
            </div>

            <div className={`grid gap-4 ${compareUpload ? 'grid-cols-1 md:grid-cols-2' : 'grid-cols-1'}`}>
              <div className="space-y-3">
                {(reviewingUpload.files || []).map((f: any) => {
                  const token = localStorage.getItem('logicq_access_token') || '';
                  const fileUrl = `/api/uploads/${reviewingUpload.id}/files/${f.id}?token=${encodeURIComponent(token)}`;
                  return (
                    <div key={f.id} className="p-3 rounded-xl bg-dark-950 border border-dark-700 space-y-2">
                      <div className="flex items-center justify-between text-xs font-mono">
                        <span className="text-white font-bold">{f.originalName}</span>
                        <a
                          href={fileUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="text-cyan-400 hover:underline"
                        >
                          Open / Download
                        </a>
                      </div>
                      {f.mimeType?.startsWith('image/') && (
                        <img
                          src={fileUrl}
                          alt={f.originalName}
                          className="max-h-64 rounded-lg border border-dark-700 object-contain mx-auto"
                        />
                      )}
                    </div>
                  );
                })}
              </div>

              {compareUpload && (
                <div className="space-y-3 border-l border-dark-700 pl-4">
                  <span className="text-xs font-mono font-bold text-amber-300 block">
                    Comparison: PRN {compareUpload.prn || compareUpload.user?.prn}
                  </span>
                  {(compareUpload.files || []).map((f: any) => {
                    const token = localStorage.getItem('logicq_access_token') || '';
                    const fileUrl = `/api/uploads/${compareUpload.id}/files/${f.id}?token=${encodeURIComponent(token)}`;
                    return (
                      <div key={f.id} className="p-3 rounded-xl bg-dark-950 border border-dark-700 space-y-2">
                        <div className="flex items-center justify-between text-xs font-mono">
                          <span className="text-white font-bold">{f.originalName}</span>
                          <a
                            href={fileUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="text-cyan-400 hover:underline"
                          >
                            Open / Download
                          </a>
                        </div>
                        {f.mimeType?.startsWith('image/') && (
                          <img
                            src={fileUrl}
                            alt={f.originalName}
                            className="max-h-64 rounded-lg border border-dark-700 object-contain mx-auto"
                          />
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                reviewUploadMutation.mutate({
                  id: reviewingUpload.id,
                  body: reviewForm,
                });
              }}
              className="space-y-4 pt-3 border-t border-white/[0.08]"
            >
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-mono text-slate-300 mb-1">Decision</label>
                  <select
                    value={reviewForm.status}
                    onChange={(e) =>
                      setReviewForm({
                        ...reviewForm,
                        status: e.target.value as 'APPROVED' | 'REJECTED' | 'CHANGES_REQUESTED',
                      })
                    }
                    className="w-full px-3 py-2 rounded-lg bg-dark-900 border border-slate-700 text-xs font-mono text-white"
                  >
                    <option value="APPROVED">Approve & Award Points</option>
                    <option value="CHANGES_REQUESTED">Request Changes</option>
                    <option value="REJECTED">Reject (0 Points)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-mono text-slate-300 mb-1">
                    Points Awarded (0 – {reviewingUpload.problem?.basePoints || 20})
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={reviewingUpload.problem?.basePoints || 20}
                    disabled={reviewForm.status !== 'APPROVED'}
                    value={reviewForm.status === 'APPROVED' ? reviewForm.pointsAwarded : 0}
                    onChange={(e) =>
                      setReviewForm({
                        ...reviewForm,
                        pointsAwarded: parseInt(e.target.value, 10) || 0,
                      })
                    }
                    className="w-full px-3 py-2 rounded-lg bg-dark-900 border border-slate-700 text-xs font-mono text-white"
                  />
                </div>

                <div className="flex items-end pb-2">
                  <label className="flex items-center gap-2 text-xs font-mono text-rose-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={reviewForm.suspicionFlag}
                      onChange={(e) =>
                        setReviewForm({ ...reviewForm, suspicionFlag: e.target.checked })
                      }
                      className="rounded bg-dark-900 border-slate-700 text-rose-500"
                    />
                    <span>Flag as Suspicious / Copied</span>
                  </label>
                </div>
              </div>

              <div>
                <label className="block text-xs font-mono text-slate-300 mb-1">
                  Reviewer Feedback (Shown to student)
                </label>
                <input
                  type="text"
                  maxLength={1000}
                  value={reviewForm.reviewerComment}
                  onChange={(e) =>
                    setReviewForm({ ...reviewForm, reviewerComment: e.target.value })
                  }
                  placeholder="Optional comment explaining points or requested changes..."
                  className="w-full px-3 py-2 rounded-lg bg-dark-900 border border-slate-700 text-xs font-mono text-white"
                />
              </div>

              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setReviewingUpload(null);
                    setCompareUpload(null);
                  }}
                  className="px-4 py-2 rounded-lg text-xs font-mono text-slate-400"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={reviewUploadMutation.isPending}
                  className="px-4 py-2 rounded-lg text-xs font-mono font-bold text-dark-950 bg-gradient-to-r from-cyan-400 to-emerald-400"
                >
                  {reviewUploadMutation.isPending ? 'Saving...' : 'Save Review'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Tab: Checkers Workload Directory */}
      {activeTab === 'checkers' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-5 rounded-2xl bg-dark-900 border border-emerald-500/20">
            <div>
              <h3 className="text-sm font-bold text-white font-mono flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <span>Solution Checkers Workload & SLA Monitoring</span>
              </h3>
              <p className="text-xs text-slate-400 font-mono mt-1">
                Manage assigned checkers, pause workload queues, and balance pending uploads across active reviewers.
              </p>
            </div>
            <button
              onClick={() => autoAssignMutation.mutate()}
              disabled={autoAssignMutation.isPending}
              className="px-4 py-2 rounded-xl text-xs font-mono font-bold text-slate-950 bg-gradient-to-r from-emerald-400 to-cyan-400 hover:from-emerald-300 hover:to-cyan-300 disabled:opacity-50 transition-all flex items-center gap-2"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${autoAssignMutation.isPending ? 'animate-spin' : ''}`} />
              <span>Run Auto Round-Robin Balancing</span>
            </button>
          </div>

          <div className="glass-card rounded-2xl border border-white/[0.08] overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs font-mono">
                <thead className="bg-dark-900/80 text-slate-400 uppercase text-[10px] tracking-wider border-b border-white/[0.06]">
                  <tr>
                    <th className="px-4 py-3.5">Checker Identity</th>
                    <th className="px-4 py-3.5">Email</th>
                    <th className="px-4 py-3.5">Active Workload</th>
                    <th className="px-4 py-3.5">Completed Reviews</th>
                    <th className="px-4 py-3.5">Status</th>
                    <th className="px-4 py-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.04]">
                  {checkers.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-4 py-8 text-center text-slate-400">
                        No checkers registered. Change a student's role to CHECKER in the User Roster.
                      </td>
                    </tr>
                  ) : (
                    checkers.map((c: any) => (
                      <tr key={c.id} className="hover:bg-white/[0.02] transition-colors">
                        <td className="px-4 py-4">
                          <span className="font-bold text-white block">{c.displayName}</span>
                          <span className="text-slate-400 text-xs">@{c.username}</span>
                        </td>
                        <td className="px-4 py-4 text-slate-300">{c.email}</td>
                        <td className="px-4 py-4">
                          <span className={`font-bold ${c.activeWorkloadCount > 5 ? 'text-amber-400' : 'text-emerald-400'}`}>
                            {c.activeWorkloadCount} assigned
                          </span>
                        </td>
                        <td className="px-4 py-4 text-cyan-400 font-bold">
                          {c.totalCompletedReviews}
                        </td>
                        <td className="px-4 py-4">
                          {c.isCheckerPaused ? (
                            <span className="px-2 py-0.5 rounded bg-amber-500/15 text-amber-300 border border-amber-500/30 text-[10px]">
                              PAUSED
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 text-[10px]">
                              ACTIVE
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-4 text-right space-x-2">
                          <button
                            onClick={() =>
                              togglePauseMutation.mutate({
                                id: c.id,
                                isCheckerPaused: !c.isCheckerPaused,
                              })
                            }
                            className={`px-2.5 py-1 rounded text-[11px] font-mono transition-colors ${
                              c.isCheckerPaused
                                ? 'bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/20'
                                : 'bg-amber-500/10 text-amber-300 hover:bg-amber-500/20'
                            }`}
                          >
                            {c.isCheckerPaused ? 'Resume Assignments' : 'Pause Workload'}
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Tab: Users Roster */}
      {activeTab === 'users' && (
        <div className="glass-card rounded-2xl border border-white/[0.08] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-mono">
              <thead className="bg-dark-900/80 text-slate-400 uppercase text-[10px] tracking-wider border-b border-white/[0.06]">
                <tr>
                  <th className="px-4 py-3.5">PRN & Student</th>
                  <th className="px-4 py-3.5">College</th>
                  <th className="px-4 py-3.5">Department</th>
                  <th className="px-4 py-3.5">Year / Div</th>
                  <th className="px-4 py-3.5">Email</th>
                  <th className="px-4 py-3.5">Score & Streak</th>
                  <th className="px-4 py-3.5">Status</th>
                  <th className="px-4 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.04]">
                {users.map((u: any) => (
                  <tr key={u.id} className="hover:bg-white/[0.02] transition-colors">
                    <td className="px-4 py-4">
                      <span className="font-bold text-white block">{u.prn || '—'}</span>
                      <span className="text-slate-400 text-xs">
                        {u.displayName || u.fullName} (@{u.username})
                      </span>
                    </td>
                    <td className="px-4 py-4 text-slate-300">
                      {u.college || 'Sanjivani University'}
                    </td>
                    <td className="px-4 py-4 text-cyan-400 font-semibold">
                      {u.department || '—'}
                    </td>
                    <td className="px-4 py-4 text-slate-300">
                      {u.year || '—'}
                      {u.division ? ` • Div ${u.division}` : ''}
                    </td>
                    <td className="px-4 py-4 text-slate-400">{u.email}</td>
                    <td className="px-4 py-4">
                      <span className="text-cyan-400 font-bold block">{u.totalPoints || 0} PTS</span>
                      <span className="text-orange-400 text-xs">{u.currentStreak || 0}d streak</span>
                    </td>
                    <td className="px-4 py-4">
                      {u.isBanned ? (
                        <span className="px-2 py-0.5 rounded bg-rose-500/15 text-rose-300 border border-rose-500/30 text-[10px]">
                          BANNED
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 text-[10px]">
                          {u.role}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-4 text-right space-x-1.5 whitespace-nowrap">
                      <button
                        onClick={() => {
                          setEditingAcademicUser(u);
                          setAcademicEditForm({
                            prn: u.prn || '',
                            college: u.college || ALLOWED_COLLEGES[0] || 'Sanjivani University',
                            department: u.department || ALLOWED_DEPARTMENTS[0] || 'CSE',
                            year: u.year || ALLOWED_YEARS[0] || 'FY',
                            division: u.division || '',
                            adminPassword: '',
                            reason: '',
                          });
                        }}
                        className="px-2.5 py-1 rounded bg-dark-850 border border-dark-700 text-xs text-cyan-400 hover:bg-dark-800 inline-flex items-center gap-1"
                        title="Audited Admin Update of PRN & College"
                      >
                        <Edit3 className="w-3 h-3" />
                        Edit PRN
                      </button>

                      <select
                        value={u.role}
                        onChange={(e) =>
                          roleMutation.mutate({
                            id: u.id,
                            role: e.target.value,
                          })
                        }
                        className="px-2 py-1 rounded bg-dark-850 border border-dark-700 text-[11px] text-slate-200 font-mono focus:outline-none focus:border-cyan-400"
                        title="Change role (Admin, Checker, Student)"
                      >
                        <option value="STUDENT">STUDENT</option>
                        <option value="CHECKER">CHECKER</option>
                        <option value="ADMIN">ADMIN</option>
                      </select>

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

      {/* Audited Admin PRN & College Edit Modal */}
      {editingAcademicUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="w-full max-w-lg glass-card rounded-2xl border border-white/[0.1] shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-white font-mono">
                Audited PRN & Academic Record Update
              </h3>
              <button
                onClick={() => setEditingAcademicUser(null)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-400">
              Updating PRN or College for <strong>{editingAcademicUser.email}</strong> atomically
              updates <code>prnIndex</code> and records an immutable audit log entry. Admin
              password re-authentication is required.
            </p>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                auditedPrnMutation.mutate({
                  id: editingAcademicUser.id,
                  body: academicEditForm,
                });
              }}
              className="space-y-3"
            >
              <div>
                <label htmlFor="audit-prn" className="block text-xs font-mono text-slate-300 mb-1">
                  New 12-Digit PRN
                </label>
                <input
                  id="audit-prn"
                  type="text"
                  maxLength={12}
                  required
                  value={academicEditForm.prn}
                  onChange={(e) =>
                    setAcademicEditForm({
                      ...academicEditForm,
                      prn: e.target.value.replace(/\s+/g, ''),
                    })
                  }
                  className="w-full px-3 py-2 rounded-lg bg-dark-900 border border-slate-700 text-xs font-mono text-white"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label htmlFor="audit-college" className="block text-xs font-mono text-slate-300 mb-1">
                    College
                  </label>
                  <select
                    id="audit-college"
                    value={academicEditForm.college}
                    onChange={(e) =>
                      setAcademicEditForm({ ...academicEditForm, college: e.target.value })
                    }
                    className="w-full px-3 py-2 rounded-lg bg-dark-900 border border-slate-700 text-xs font-mono text-white"
                  >
                    {ALLOWED_COLLEGES.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label htmlFor="audit-dept" className="block text-xs font-mono text-slate-300 mb-1">
                    Department
                  </label>
                  <select
                    id="audit-dept"
                    value={academicEditForm.department}
                    onChange={(e) =>
                      setAcademicEditForm({ ...academicEditForm, department: e.target.value })
                    }
                    className="w-full px-3 py-2 rounded-lg bg-dark-900 border border-slate-700 text-xs font-mono text-white"
                  >
                    {ALLOWED_DEPARTMENTS.map((d) => (
                      <option key={d} value={d}>
                        {d}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label htmlFor="audit-year" className="block text-xs font-mono text-slate-300 mb-1">
                    Year
                  </label>
                  <select
                    id="audit-year"
                    value={academicEditForm.year}
                    onChange={(e) =>
                      setAcademicEditForm({ ...academicEditForm, year: e.target.value })
                    }
                    className="w-full px-3 py-2 rounded-lg bg-dark-900 border border-slate-700 text-xs font-mono text-white"
                  >
                    {ALLOWED_YEARS.map((y) => (
                      <option key={y} value={y}>
                        {y}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label htmlFor="audit-reason" className="block text-xs font-mono text-slate-300 mb-1">
                  Audit Reason (Required)
                </label>
                <input
                  id="audit-reason"
                  type="text"
                  required
                  minLength={5}
                  value={academicEditForm.reason}
                  onChange={(e) =>
                    setAcademicEditForm({ ...academicEditForm, reason: e.target.value })
                  }
                  placeholder="e.g. Verified student ID card correction request"
                  className="w-full px-3 py-2 rounded-lg bg-dark-900 border border-slate-700 text-xs font-mono text-white"
                />
              </div>

              <div>
                <label htmlFor="audit-password" className="block text-xs font-mono text-slate-300 mb-1">
                  Confirm Admin Password (Re-authentication)
                </label>
                <input
                  id="audit-password"
                  type="password"
                  required
                  value={academicEditForm.adminPassword}
                  onChange={(e) =>
                    setAcademicEditForm({ ...academicEditForm, adminPassword: e.target.value })
                  }
                  placeholder="Enter your admin password"
                  className="w-full px-3 py-2 rounded-lg bg-dark-900 border border-slate-700 text-xs font-mono text-white"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-white/[0.06]">
                <button
                  type="button"
                  onClick={() => setEditingAcademicUser(null)}
                  className="px-4 py-2 rounded-lg text-xs font-mono text-slate-400"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={auditedPrnMutation.isPending}
                  className="px-4 py-2 rounded-lg text-xs font-mono font-bold text-dark-950 bg-gradient-to-r from-cyan-400 to-emerald-400"
                >
                  {auditedPrnMutation.isPending ? 'Saving...' : 'Verify & Update PRN'}
                </button>
              </div>
            </form>
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
