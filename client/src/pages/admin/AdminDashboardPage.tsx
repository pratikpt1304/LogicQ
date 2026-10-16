import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../api/client.js';
import { DifficultyBadge, VerdictBadge } from '../../components/common/Badge.js';
import {
  ALLOWED_COLLEGES,
  ALLOWED_DEPARTMENTS,
  ALLOWED_YEARS,
} from '../../config/academic.config.js';
import { PRACTICE_CONFIG } from '../../config/practice.config.js';
import { PrnFormatGuide } from '../../components/common/PrnFormatGuide.js';
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
  Activity,
  Trophy,
  RotateCcw,
  FileText,
  Lock,
  Play,
  Pause,
  AlertCircle,
  CheckCircle,
} from 'lucide-react';
import { Difficulty, Verdict } from '../../types/index.js';
import { AdminPracticeAnalytics } from '../../components/admin/AdminPracticeAnalytics.js';

export const AdminDashboardPage: React.FC = () => {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<
    'problems' | 'submissions' | 'uploads' | 'checkers' | 'users' | 'analytics' | 'practice' | 'daily'
  >('users');

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
  const [selectedActivityUser, setSelectedActivityUser] = useState<any | null>(null);
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

  // Practice Curriculum Management States
  const [isCreatePracticeModuleOpen, setIsCreatePracticeModuleOpen] = useState(false);
  const [isCreatePracticeProblemOpen, setIsCreatePracticeProblemOpen] = useState(false);
  const [selectedPracticeModuleSlug, setSelectedPracticeModuleSlug] = useState<string | null>(null);

  const [newPracticeModuleForm, setNewPracticeModuleForm] = useState({
    title: '',
    slug: '',
    description: '',
    order: 5,
    requiredSolvedToUnlock: PRACTICE_CONFIG.practiceUnlockThreshold,
  });

  const [newPracticeProblemForm, setNewPracticeProblemForm] = useState({
    title: '',
    slug: '',
    moduleSlug: 'control-structures',
    difficulty: 'EASY' as 'EASY' | 'MEDIUM' | 'HARD',
    category: 'Practice',
    description: `### Problem Description\nExplain practice problem requirements here.\n\n### Input Format\nStandard input specifications.\n\n### Output Format\nExpected output specifications.`,
    starterCode: `#include <stdio.h>\n\nint main() {\n    // TODO: Write solution\n    return 0;\n}`,
    sampleInput: '10 20\n',
    sampleOutput: '30\n',
    hiddenInput: '100 200\n',
    hiddenOutput: '300\n',
  });

  // Daily Challenge System Control States
  const [isResumeModalOpen, setIsResumeModalOpen] = useState(false);
  const [isPauseModalOpen, setIsPauseModalOpen] = useState(false);
  const [dailyResumeMode, setDailyResumeMode] = useState<'NEXT_1700' | 'START_NOW'>('NEXT_1700');
  const [dailyAdminPassword, setDailyAdminPassword] = useState('');
  const [dailyAdminReason, setDailyAdminReason] = useState('');

  const { data: dailySystemData, refetch: refetchDailySystem } = useQuery({
    queryKey: ['admin-daily-system-preview'],
    queryFn: () => api.get('/admin/daily-system/preview'),
  });

  const pauseDailyMutation = useMutation({
    mutationFn: () =>
      api.post('/admin/daily-system/pause', {
        adminPassword: dailyAdminPassword,
        reason: dailyAdminReason,
      }),
    onSuccess: () => {
      toast.success('Daily challenge system paused successfully.');
      setIsPauseModalOpen(false);
      setDailyAdminPassword('');
      setDailyAdminReason('');
      refetchDailySystem();
      queryClient.invalidateQueries({ queryKey: ['admin-daily-system-preview'] });
    },
    onError: (err: any) => {
      toast.error(err.message || 'Failed to pause daily system.');
    },
  });

  const resumeDailyMutation = useMutation({
    mutationFn: () =>
      api.post('/admin/daily-system/resume', {
        adminPassword: dailyAdminPassword,
        mode: dailyResumeMode,
        reason: dailyAdminReason,
      }),
    onSuccess: () => {
      toast.success('Daily challenge system resumed successfully.');
      setIsResumeModalOpen(false);
      setDailyAdminPassword('');
      setDailyAdminReason('');
      refetchDailySystem();
      queryClient.invalidateQueries({ queryKey: ['admin-daily-system-preview'] });
    },
    onError: (err: any) => {
      toast.error(err.message || 'Failed to resume daily system.');
    },
  });

  // Daily Finalization & Results Data
  const { data: dailyFinalizationData, refetch: refetchFinalization } = useQuery({
    queryKey: ['admin-daily-finalization-status'],
    queryFn: () => api.get('/admin/daily-finalization/status'),
  });

  const dailyFin = dailyFinalizationData?.data;

  // Daily Results Modals State
  const [isRerunModalOpen, setIsRerunModalOpen] = useState(false);
  const [rerunDayId, setRerunDayId] = useState('');
  const [rerunForce, setRerunForce] = useState(false);
  const [rerunAdminPassword, setRerunAdminPassword] = useState('');
  const [rerunReason, setRerunReason] = useState('');

  const [isCorrectionModalOpen, setIsCorrectionModalOpen] = useState(false);
  const [correctionForm, setCorrectionForm] = useState({
    dayId: '',
    studentPrnOrId: '',
    reason: '',
    newVerdict: 'ACCEPTED',
    pointsAdjustment: 20,
    adminPassword: '',
  });

  const [isPauseDayModalOpen, setIsPauseDayModalOpen] = useState(false);
  const [pauseDayForm, setPauseDayForm] = useState({
    dayStr: new Date().toISOString().slice(0, 10),
    paused: true,
    reason: '',
    adminPassword: '',
  });

  const [selectedPastBoard, setSelectedPastBoard] = useState<any | null>(null);

  const runFinalizationMutation = useMutation({
    mutationFn: (body: any) => api.post('/admin/daily-finalization/run', body),
    onSuccess: (res: any) => {
      toast.success(res?.message || 'Daily finalization executed successfully');
      setIsRerunModalOpen(false);
      setRerunAdminPassword('');
      setRerunReason('');
      refetchFinalization();
    },
    onError: (err: any) => {
      toast.error(err.message || 'Finalization run failed');
    },
  });

  const createCorrectionMutation = useMutation({
    mutationFn: (body: any) => api.post('/admin/daily-finalization/correction', body),
    onSuccess: () => {
      toast.success('Correction record created successfully');
      setIsCorrectionModalOpen(false);
      setCorrectionForm({
        dayId: '',
        studentPrnOrId: '',
        reason: '',
        newVerdict: 'ACCEPTED',
        pointsAdjustment: 20,
        adminPassword: '',
      });
      refetchFinalization();
    },
    onError: (err: any) => {
      toast.error(err.message || 'Failed to create correction');
    },
  });

  const togglePauseDayMutation = useMutation({
    mutationFn: (body: any) => api.post('/admin/daily-finalization/pause-day', body),
    onSuccess: () => {
      toast.success('Pause day updated successfully');
      setIsPauseDayModalOpen(false);
      setPauseDayForm({
        dayStr: new Date().toISOString().slice(0, 10),
        paused: true,
        reason: '',
        adminPassword: '',
      });
      refetchFinalization();
    },
    onError: (err: any) => {
      toast.error(err.message || 'Failed to update pause day');
    },
  });

  const { data: practiceModulesData } = useQuery({
    queryKey: ['practice-modules'],
    queryFn: () => api.get('/practice/modules'),
  });

  const { data: practiceProblemsData } = useQuery({
    queryKey: ['practice-module-problems', selectedPracticeModuleSlug],
    queryFn: () =>
      selectedPracticeModuleSlug
        ? api.get(`/practice/modules/${selectedPracticeModuleSlug}/problems`)
        : Promise.resolve({ data: { problems: [] } }),
    enabled: Boolean(selectedPracticeModuleSlug),
  });

  const createPracticeModuleMutation = useMutation({
    mutationFn: (body: any) => api.post('/admin/practice/modules', body),
    onSuccess: () => {
      toast.success('Practice Module added successfully!');
      setIsCreatePracticeModuleOpen(false);
      setNewPracticeModuleForm({ title: '', slug: '', description: '', order: 5, requiredSolvedToUnlock: PRACTICE_CONFIG.practiceUnlockThreshold });
      queryClient.invalidateQueries({ queryKey: ['practice-modules'] });
    },
    onError: (err: any) => toast.error(err.message || 'Failed to create practice module'),
  });

  const createPracticeProblemMutation = useMutation({
    mutationFn: (body: any) => api.post('/admin/practice/problems', body),
    onSuccess: () => {
      toast.success('Practice Question added successfully!');
      setIsCreatePracticeProblemOpen(false);
      queryClient.invalidateQueries({ queryKey: ['practice-modules'] });
      queryClient.invalidateQueries({ queryKey: ['practice-module-problems'] });
    },
    onError: (err: any) => toast.error(err.message || 'Failed to create practice question'),
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

  const [revealedPrns, setRevealedPrns] = useState<Record<string, string>>({});
  const revealPrnMutation = useMutation({
    mutationFn: (userId: string) => api.post(`/admin/users/${userId}/reveal-prn`),
    onSuccess: (res: any, userId: string) => {
      const prn = res?.data?.prn;
      if (prn) {
        setRevealedPrns((prev) => ({ ...prev, [userId]: prn }));
        toast.success('PRN revealed and logged in administrative audit trail.');
      }
    },
    onError: (err: any) => {
      toast.error(err.message || 'Failed to reveal student PRN');
    },
  });

  const resetCooldownMutation = useMutation({
    mutationFn: (userId: string) => api.post(`/admin/users/${userId}/reset-prn-cooldown`),
    onSuccess: () => {
      toast.success('Student PRN change cooldown reset successfully.');
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
    },
    onError: (err: any) => {
      toast.error(err.message || 'Failed to reset student PRN cooldown');
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

  const escapeCsv = (val: any): string => {
    if (val === null || val === undefined) return '""';
    const str = String(val).replace(/"/g, '""');
    return `"${str}"`;
  };

  const handleDownloadCsv = async (type: 'users' | 'daily-results', deptOverride?: string) => {
    const dept = deptOverride || filterDepartment;
    const downloadType = type;
    try {
      const token = localStorage.getItem('logicq_access_token');
      const qs = buildFilterQuery();
      const endpoint = downloadType === 'daily-results'
        ? `/api/admin/reports/daily-results/export?${qs}`
        : `/api/admin/export/${downloadType}.csv?${qs}`;
      const res = await fetch(endpoint, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        credentials: 'include',
      });
      if (res.ok) {
        const text = await res.text();
        const blob = new Blob([text], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        const deptSuffix = dept !== 'ALL' ? `_${dept.replace(/[^a-zA-Z0-9]/g, '_')}` : '';
        a.download = `logicq_${downloadType.replace('-', '_')}${deptSuffix}.csv`;
        a.click();
        URL.revokeObjectURL(url);
        toast.success(`Exported ${downloadType} CSV successfully.`);
        return;
      }
    } catch {
      // Fallback to client-side CSV generation
    }

    try {
      if (type === 'users') {
        let list = users || [];
        if (dept !== 'ALL') {
          list = list.filter((u: any) => u.department === dept);
        }
        const header = 'College,Department,Year,Division,PRN,FullName,DisplayName,Email,Role,TotalPoints,CurrentStreak,Status';
        const rows = list.map((u: any) => [
          escapeCsv(u.college || 'Sanjivani University'),
          escapeCsv(u.department || ''),
          escapeCsv(u.year || ''),
          escapeCsv(u.division || ''),
          escapeCsv(u.prn || ''),
          escapeCsv(u.fullName || ''),
          escapeCsv(u.displayName || ''),
          escapeCsv(u.email || ''),
          escapeCsv(u.role || 'STUDENT'),
          escapeCsv(u.totalPoints || 0),
          escapeCsv(u.currentStreak || 0),
          escapeCsv(u.isBanned ? 'BANNED' : 'ACTIVE'),
        ].join(','));
        const csv = [header, ...rows].join('\n');
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        const deptSuffix = dept !== 'ALL' ? `_${dept.replace(/[^a-zA-Z0-9]/g, '_')}` : '';
        a.download = `logicq_users${deptSuffix}.csv`;
        a.click();
        URL.revokeObjectURL(url);
        toast.success(`Exported ${list.length} users to CSV (${dept === 'ALL' ? 'All Departments' : dept}).`);
      } else {
        toast.info('Daily results exported.');
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to export CSV');
    }
  };

  const handleDownloadSingleStudentCsv = (student: any) => {
    try {
      const studentSubmissions = submissions.filter(
        (s: any) => s.userId === student.id || s.user?.id === student.id || s.user?.email === student.email
      );
      const studentUploads = uploads.filter(
        (up: any) => up.userId === student.id || up.user?.id === student.id || up.user?.email === student.email
      );

      const lines = [
        `"LOGICQ STUDENT INDIVIDUAL ACTIVITY DOSSIER"`,
        `"Export Date",${escapeCsv(new Date().toISOString())}`,
        `"Student Name",${escapeCsv(student.fullName || student.displayName || '—')}`,
        `"PRN",${escapeCsv(student.prn || '—')}`,
        `"Email",${escapeCsv(student.email || '—')}`,
        `"College",${escapeCsv(student.college || 'Sanjivani University')}`,
        `"Department",${escapeCsv(student.department || '—')}`,
        `"Year & Division",${escapeCsv(`${student.year || '—'} ${student.division ? `Div ${student.division}` : ''}`)}`,
        `"Role",${escapeCsv(student.role || 'STUDENT')}`,
        `"Account Status",${escapeCsv(student.isBanned ? 'BANNED' : 'ACTIVE')}`,
        `"Total Score",${escapeCsv(student.totalPoints || 0)}`,
        `"Current Streak (Days)",${escapeCsv(student.currentStreak || 0)}`,
        `"Longest Streak (Days)",${escapeCsv(student.longestStreak || 0)}`,
        `"Total Recorded Submissions",${escapeCsv(studentSubmissions.length)}`,
        `"Total Recorded Uploads",${escapeCsv(studentUploads.length)}`,
        ``,
        `"--- CODE SUBMISSIONS ACTIVITY ---"`,
        `"Timestamp","Problem Title / Slug","Language","Verdict","Execution Time (ms)","Memory (KB)","Points Awarded"`,
        ...studentSubmissions.map((s: any) => [
          escapeCsv(s.submittedAt || s.createdAt || '—'),
          escapeCsv(s.problem?.title || s.problemTitle || s.problemSlug || s.problemId || 'Daily Challenge'),
          escapeCsv(s.language || 'C'),
          escapeCsv(s.verdict || s.status || 'PENDING'),
          escapeCsv(s.executionTimeMs ?? s.executionTime ?? '—'),
          escapeCsv(s.memoryUsedKb ?? s.memoryKb ?? '—'),
          escapeCsv(s.pointsAwarded ?? s.points ?? 0),
        ].join(',')),
        ``,
        `"--- FILE UPLOADS ACTIVITY ---"`,
        `"Timestamp","Review Status","Suspicion Flag","Score / Grade","Reviewer Comment"`,
        ...studentUploads.map((up: any) => [
          escapeCsv(up.submittedAt || up.createdAt || '—'),
          escapeCsv(up.status || 'PENDING_REVIEW'),
          escapeCsv(up.suspicionFlag ? 'FLAGGED' : 'CLEAR'),
          escapeCsv(up.pointsAwarded ?? '—'),
          escapeCsv(up.reviewerComment || '—'),
        ].join(',')),
      ];

      const csv = lines.join('\n');
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `logicq_student_${student.prn || student.username || student.id}_activity.csv`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success(`Exported activity report for ${student.displayName || student.fullName || student.username}`);
    } catch (err: any) {
      toast.error('Failed to export student activity CSV');
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
    if (/Kanetkar|Test Your C Skills/i.test(`${problemForm.title} ${problemForm.description}`)) {
      toast.error('Direct book citations or author names are forbidden in student-facing text.');
      return;
    }
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
        <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-500/10 border border-amber-300 dark:border-amber-500/30 flex items-center justify-between gap-3 text-amber-950 dark:text-amber-200 shadow-sm">
          <div className="flex items-center gap-3">
            <span className="p-2 rounded-xl bg-amber-200 dark:bg-amber-500/20 text-amber-900 dark:text-amber-400 font-bold text-lg">⚠️</span>
            <div>
              <h4 className="text-xs font-bold uppercase font-mono tracking-wider text-amber-950 dark:text-amber-300">
                System Invariant Warning: Only 1 Active Administrator
              </h4>
              <p className="text-xs text-amber-900/90 dark:text-amber-200/90 mt-0.5 font-mono">
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



      {/* Daily Challenge System Pause Banner */}
      {dailySystemData?.data?.dailyChallengePaused ? (
        <div data-testid="admin-daily-paused-banner" className="p-4 rounded-2xl bg-amber-50 border-2 border-amber-300 dark:bg-amber-500/15 dark:border-amber-500/40 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-sm">
          <div className="flex items-center gap-3">
            <span className="p-2.5 rounded-xl bg-amber-200/60 dark:bg-amber-500/25 text-amber-800 dark:text-amber-400 font-bold text-xl">⏸️</span>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h4 className="text-xs font-bold uppercase font-mono tracking-wider text-amber-950 dark:text-amber-300">
                  Daily System is PAUSED
                </h4>
                {dailySystemData?.data?.pausedAt && (
                  <span className="text-xs font-mono font-medium text-amber-850 dark:text-slate-300">
                    (since {new Date(dailySystemData.data.pausedAt).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })} IST)
                  </span>
                )}
              </div>
              <p className="text-xs text-amber-900 dark:text-amber-100/90 mt-1 font-mono font-medium leading-relaxed">
                {dailySystemData?.data?.pauseReason || 'Daily challenge pool transitioning to book-only curriculum.'}
              </p>
            </div>
          </div>
          <button
            data-testid="admin-resume-daily-button"
            onClick={() => {
              setDailyAdminPassword('');
              setDailyAdminReason('');
              setDailyResumeMode('NEXT_1700');
              setIsResumeModalOpen(true);
            }}
            className="px-4 py-2 rounded-xl text-xs font-mono font-bold bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 hover:from-emerald-400 hover:to-teal-400 shadow-md whitespace-nowrap transition-all"
          >
            Resume Daily System...
          </button>
        </div>
      ) : (
        <div className="p-3 rounded-xl bg-slate-900/60 border border-white/[0.08] flex items-center justify-between gap-3 text-xs font-mono">
          <div className="flex items-center gap-2 text-emerald-400">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>Daily System is LIVE ({dailySystemData?.data?.scheduledCount || 0} scheduled)</span>
          </div>
          <button
            onClick={() => {
              setDailyAdminPassword('');
              setDailyAdminReason('');
              setIsPauseModalOpen(true);
            }}
            className="px-3 py-1 rounded-lg text-xs font-mono text-amber-400 hover:bg-amber-500/10 border border-amber-500/30"
          >
            Pause System
          </button>
        </div>
      )}

      {/* Analytics Overview Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
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

        <div className="glass-card p-5 rounded-2xl border border-white/[0.08]" data-testid="admin-drive-connected-stat">
          <span className="text-[11px] font-mono text-slate-400 block mb-1">DRIVE CONNECTED</span>
          <span className="text-2xl font-extrabold text-blue-400 font-mono">
            {overview?.driveConnectedCount || 0}
          </span>
        </div>
      </div>

      {/* Admin Tabs */}
      <div className="flex flex-wrap items-center gap-2 border-b border-white/[0.08] pb-3 text-xs font-mono">
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
          onClick={() => setActiveTab('practice')}
          className={`px-4 py-2 rounded-xl transition-colors flex items-center gap-1.5 ${
            activeTab === 'practice'
              ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 font-bold'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Code2 className="w-3.5 h-3.5" />
          <span>Practice Curriculum (4 Modules / 40 Problems)</span>
        </button>

        <button
          onClick={() => setActiveTab('daily')}
          className={`px-4 py-2 rounded-xl transition-colors flex items-center gap-1.5 ${
            activeTab === 'daily'
              ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 font-bold'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Trophy className="w-3.5 h-3.5" />
          <span>Daily Results</span>
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
                <span>2. Students Solving at Least 4 of 7 Challenges (7-Day Rolling Retention Cohort)</span>
              </h2>
              <p className="text-xs font-mono text-slate-400 mt-0.5">
                Tracks students who solved ≥ 4 distinct challenges within a 7-day rolling window.
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
                  onClick={() => handleDownloadCsv('daily-results')}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-dark-850 border border-dark-700 text-xs font-mono text-cyan-400 hover:bg-dark-800"
                >
                  <Download className="w-3.5 h-3.5" />
                  Daily Results CSV
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
                  inputMode="text"
                  autoComplete="off"
                  autoCorrect="off"
                  spellCheck={false}
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
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-dark-850 border border-dark-700 text-xs font-mono text-emerald-400 hover:bg-dark-800 font-bold"
                title="Download CSV for currently filtered department/students"
              >
                <Download className="w-3.5 h-3.5" />
                {filterDepartment !== 'ALL' ? `Export ${filterDepartment} CSV` : 'Export Users CSV (All)'}
              </button>
              {filterDepartment !== 'ALL' && (
                <button
                  type="button"
                  onClick={() => handleDownloadCsv('users', 'ALL')}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-dark-850 border border-dark-700 text-xs font-mono text-slate-300 hover:bg-dark-800"
                  title="Download all departments users CSV"
                >
                  <Download className="w-3.5 h-3.5" />
                  All Depts CSV
                </button>
              )}
              <button
                type="button"
                onClick={() => handleDownloadCsv('daily-results')}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-dark-850 border border-dark-700 text-xs font-mono text-cyan-400 hover:bg-dark-800"
              >
                <Download className="w-3.5 h-3.5" />
                Export Daily Results CSV
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Tab: Problems */}
      {activeTab === 'problems' && (
        <div className="space-y-4">
          <div className="glass-card p-4 sm:p-5 rounded-2xl border border-white/[0.08] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-bold text-white font-mono flex items-center gap-2">
                <Code2 className="w-5 h-5 text-cyan-400" />
                <span>LogicQ Challenge Library & Daily Problem Pool</span>
              </h2>
              <p className="text-xs font-mono text-slate-400 mt-0.5">
                Total {problems.length} challenges configured. Add new custom or manual C coding questions with test cases.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setIsCreateProblemOpen(true)}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl font-mono text-xs font-bold text-dark-950 bg-gradient-to-r from-cyan-400 to-emerald-400 hover:from-cyan-300 hover:to-emerald-300 shadow-lg shadow-cyan-500/20 transition-all whitespace-nowrap"
            >
              <Plus className="w-4 h-4" />
              <span>Add New Question / Problem</span>
            </button>
          </div>

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
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-white block">
                          {revealedPrns[u.id] || (u.maskedPrn || (u.prn ? `••••••${u.prn.slice(-4)}` : '—'))}
                        </span>
                        {!revealedPrns[u.id] && u.prn && (
                          <button
                            type="button"
                            onClick={() => {
                              if (window.confirm(`Reveal full PRN for ${u.displayName || u.username}? This action is recorded in the administrative audit log.`)) {
                                revealPrnMutation.mutate(u.id);
                              }
                            }}
                            disabled={revealPrnMutation.isPending}
                            className="p-1 rounded bg-white/[0.05] hover:bg-white/[0.1] text-slate-400 hover:text-cyan-300 transition-colors"
                            title="Reveal full PRN (Audited)"
                          >
                            <Eye className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                      <span className="text-slate-400 text-xs">
                        {u.displayName || u.fullName} (@{u.username})
                      </span>
                      {u.prnChangedAt && (
                        <div className="text-[10px] text-amber-400/90 pt-0.5">
                          Changed: {new Date(u.prnChangedAt).toLocaleDateString()}
                        </div>
                      )}
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
                        onClick={() => setSelectedActivityUser(u)}
                        className="px-2.5 py-1 rounded bg-cyan-500/10 border border-cyan-500/30 text-xs text-cyan-400 hover:bg-cyan-500/20 inline-flex items-center gap-1.5 font-mono font-medium transition"
                        title="View student activity, submissions, and dossier"
                      >
                        <Activity className="w-3.5 h-3.5" />
                        View Activity
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
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab: Practice Curriculum Management */}
      {activeTab === 'practice' && (
        <div className="space-y-6">
          <div className="glass-card p-6 rounded-2xl border border-white/[0.08] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <h3 className="text-base font-mono font-bold text-white uppercase flex items-center gap-2">
                <Code2 className="w-5 h-5 text-cyan-400" />
                <span>Syllabus Practice Modules & Question Pool</span>
              </h3>
              <p className="text-xs font-mono text-slate-400 max-w-2xl">
                Configure curriculum practice modules and author custom C practice problems for each module.
              </p>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <button
                type="button"
                onClick={() => setIsCreatePracticeModuleOpen(true)}
                className="flex items-center gap-2 px-3.5 py-2 rounded-xl font-mono text-xs font-bold text-cyan-300 bg-cyan-500/10 border border-cyan-500/30 hover:bg-cyan-500/20 transition-all"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add New Module</span>
              </button>
              <button
                type="button"
                onClick={() => setIsCreatePracticeProblemOpen(true)}
                className="flex items-center gap-2 px-4 py-2 rounded-xl font-mono text-xs font-bold text-dark-950 bg-gradient-to-r from-cyan-400 to-emerald-400 hover:from-cyan-300 hover:to-emerald-300 shadow-lg shadow-cyan-500/20 transition-all"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Question to Module</span>
              </button>
            </div>
          </div>

          {/* Module Cards Grid */}
          {(() => {
            const modulesList = practiceModulesData?.data?.modules || [
              { order: 1, title: 'Control Structures', slug: 'control-structures', requirementText: 'Unlocked for all', totalQuestions: 10 },
              { order: 2, title: 'Pointers and functions', slug: 'pointers-and-functions', requirementText: 'Solve all 10 in Module 1', totalQuestions: 10 },
              { order: 3, title: 'Array and its Applications', slug: 'array-and-its-applications', requirementText: 'Solve all 10 in Module 2', totalQuestions: 10 },
              { order: 4, title: 'Advanced Data Types, Dynamic Memory', slug: 'advanced-data-types-dynamic-memory', requirementText: 'Solve all 10 in Module 3', totalQuestions: 10 },
            ];

            return (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {modulesList.map((m: any) => (
                  <div
                    key={m.slug}
                    className={`glass-card p-5 rounded-2xl border transition-all space-y-3 cursor-pointer ${
                      selectedPracticeModuleSlug === m.slug
                        ? 'border-cyan-400/50 bg-cyan-500/[0.04] shadow-lg shadow-cyan-500/10'
                        : 'border-white/[0.08] hover:border-white/[0.2]'
                    }`}
                    onClick={() =>
                      setSelectedPracticeModuleSlug(
                        selectedPracticeModuleSlug === m.slug ? null : m.slug
                      )
                    }
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-mono font-bold text-cyan-400 px-2 py-0.5 rounded bg-cyan-500/10 border border-cyan-500/20">
                        MODULE {m.order}
                      </span>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono text-slate-400">
                          {m.totalQuestions || 0} Problems
                        </span>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setNewPracticeProblemForm((prev) => ({
                              ...prev,
                              moduleSlug: m.slug,
                            }));
                            setIsCreatePracticeProblemOpen(true);
                          }}
                          className="px-2 py-0.5 rounded text-[11px] font-mono text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 hover:bg-emerald-500/20"
                          title={`Add question to ${m.title}`}
                        >
                          + Add Question
                        </button>
                      </div>
                    </div>

                    <h4 className="text-sm font-bold text-white">{m.title}</h4>
                    <p className="text-xs font-mono text-slate-400 line-clamp-2">
                      {m.description || 'Module curriculum practice problems and reference solutions.'}
                    </p>

                    <div className="text-xs font-mono text-slate-400 flex items-center justify-between pt-2 border-t border-white/[0.06]">
                      <div className="flex items-center gap-1.5">
                        <span className="text-amber-400">Unlock:</span>
                        <span>{m.requirementText || `Solve ${m.requiredSolvedToUnlock || 7} to unlock`}</span>
                      </div>
                      <span className="text-[11px] text-cyan-400 underline font-semibold">
                        {selectedPracticeModuleSlug === m.slug ? 'Hide Questions ▲' : 'View Questions ▼'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            );
          })()}

          {/* Selected Module Questions Drawer */}
          {selectedPracticeModuleSlug && (
            <div className="glass-card rounded-2xl border border-cyan-500/20 p-5 space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-bold text-white font-mono flex items-center gap-2">
                  <Code2 className="w-4 h-4 text-cyan-400" />
                  <span>
                    Questions in module:{' '}
                    <code className="text-cyan-300">{selectedPracticeModuleSlug}</code> (
                    {practiceProblemsData?.data?.problems?.length || 0})
                  </span>
                </h4>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setNewPracticeProblemForm((prev) => ({
                        ...prev,
                        moduleSlug: selectedPracticeModuleSlug,
                      }));
                      setIsCreatePracticeProblemOpen(true);
                    }}
                    className="px-3 py-1 rounded-lg text-xs font-mono font-bold text-dark-950 bg-gradient-to-r from-cyan-400 to-emerald-400"
                  >
                    + Add Question Here
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedPracticeModuleSlug(null)}
                    className="p-1 text-slate-400 hover:text-white"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {(!practiceProblemsData?.data?.problems ||
                practiceProblemsData.data.problems.length === 0) ? (
                <div className="p-6 text-center text-xs font-mono text-slate-500 border border-dashed border-white/[0.08] rounded-xl">
                  No questions found in this module. Click "+ Add Question Here" to author one.
                </div>
              ) : (
                <div className="overflow-x-auto rounded-xl border border-white/[0.06]">
                  <table className="w-full text-left text-xs font-mono">
                    <thead className="bg-dark-900/90 text-slate-400 text-[10px] uppercase border-b border-white/[0.06]">
                      <tr>
                        <th className="px-4 py-2.5">Order</th>
                        <th className="px-4 py-2.5">Title & Slug</th>
                        <th className="px-4 py-2.5">Difficulty</th>
                        <th className="px-4 py-2.5">Category</th>
                        <th className="px-4 py-2.5">Points</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/[0.04]">
                      {practiceProblemsData.data.problems.map((prob: any) => (
                        <tr key={prob.slug} className="hover:bg-white/[0.02]">
                          <td className="px-4 py-2.5 font-bold text-cyan-400">
                            #{prob.moduleOrder || 1}
                          </td>
                          <td className="px-4 py-2.5">
                            <span className="font-bold text-white block">{prob.title}</span>
                            <span className="text-[11px] text-slate-500">{prob.slug}</span>
                          </td>
                          <td className="px-4 py-2.5">
                            <DifficultyBadge difficulty={prob.difficulty as Difficulty} size="sm" />
                          </td>
                          <td className="px-4 py-2.5 text-slate-300">{prob.category}</td>
                          <td className="px-4 py-2.5 text-amber-400 font-bold">
                            {prob.basePoints || 20} PTS
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* Practice Performance Analytics & Telemetry */}
          <AdminPracticeAnalytics />
        </div>
      )}

      {/* Tab: Daily Results & Operations */}
      {activeTab === 'daily' && (
        <div className="space-y-6" data-testid="admin-daily-results-panel">
          {/* 1. Page Header & Primary Actions */}
          <div className="glass-card p-6 rounded-2xl border border-white/[0.08] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <h3 className="text-base font-mono font-bold text-white uppercase flex items-center gap-2">
                <Trophy className="w-5 h-5 text-amber-400" />
                <span>Daily Results</span>
              </h3>
              <p className="text-xs font-mono text-slate-400 max-w-2xl">
                Audit daily challenge cycles, live leaderboard, automated finalization runs, correction records, streak freezes, and historical archive.
              </p>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <button
                type="button"
                onClick={() => {
                  setRerunDayId(dailyFin?.yesterdayDayId || '');
                  setRerunForce(true);
                  setRerunAdminPassword('');
                  setRerunReason('');
                  setIsRerunModalOpen(true);
                }}
                className="flex items-center gap-2 px-3 py-2 rounded-xl font-mono text-xs font-bold text-amber-300 bg-amber-500/10 border border-amber-500/30 hover:bg-amber-500/20 transition-all"
                title="Re-run daily finalization with admin re-auth"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Re-run Finalization</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setRerunDayId(dailyFin?.yesterdayDayId || '');
                  setRerunForce(false);
                  setRerunAdminPassword('');
                  setRerunReason('');
                  setIsRerunModalOpen(true);
                }}
                className="flex items-center gap-2 px-3 py-2 rounded-xl font-mono text-xs font-bold text-emerald-300 bg-emerald-500/10 border border-emerald-500/30 hover:bg-emerald-500/20 transition-all"
                title="Publish / execute finalization for yesterday"
              >
                <Play className="w-3.5 h-3.5" />
                <span>Publish Finalization</span>
              </button>
              <button
                type="button"
                onClick={() => handleDownloadCsv('daily-results')}
                className="flex items-center gap-2 px-3.5 py-2 rounded-xl font-mono text-xs font-bold text-cyan-300 bg-cyan-500/10 border border-cyan-500/30 hover:bg-cyan-500/20 transition-all"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Export Daily CSV</span>
              </button>
            </div>
          </div>

          {/* 2. Clear PAUSED Banner (when daily system is paused) */}
          {(dailyFin?.isDailyPaused || dailySystemData?.data?.dailyChallengePaused) && (
            <div
              data-testid="daily-results-paused-banner"
              className="p-5 rounded-2xl bg-amber-50 border-2 border-amber-300 dark:bg-amber-500/15 dark:border-amber-500/40 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-sm"
            >
              <div className="flex items-center gap-3.5">
                <div className="p-3 rounded-xl bg-amber-200/60 dark:bg-amber-500/25 text-amber-800 dark:text-amber-400 font-bold text-xl flex items-center justify-center">
                  <Pause className="w-6 h-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h4 className="text-sm font-bold uppercase font-mono tracking-wider text-amber-950 dark:text-amber-300">
                      DAILY CHALLENGE SYSTEM IS CURRENTLY PAUSED
                    </h4>
                    {dailySystemData?.data?.pausedAt && (
                      <span className="text-xs font-mono font-medium text-amber-850 dark:text-slate-300">
                        (Paused: {new Date(dailySystemData.data.pausedAt).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })} IST)
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-amber-900 dark:text-amber-100/90 mt-1 font-mono font-medium leading-relaxed">
                    {dailySystemData?.data?.pauseReason || 'Daily system paused by administrator. Schedulers and submissions are disabled.'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setDailyAdminPassword('');
                  setDailyAdminReason('');
                  setDailyResumeMode('NEXT_1700');
                  setIsResumeModalOpen(true);
                }}
                className="px-4 py-2 rounded-xl text-xs font-mono font-bold bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 hover:from-emerald-400 hover:to-teal-400 shadow-md whitespace-nowrap transition-all"
              >
                Resume Daily System...
              </button>
            </div>
          )}

          {/* 3. Compact Rules Section */}
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="glass-card p-4 rounded-xl border border-amber-500/20">
                <span className="text-[10px] font-mono text-slate-400 uppercase block mb-1">
                  COMPETITION CYCLE
                </span>
                <span className="text-lg font-extrabold text-amber-400 font-mono">
                  17:00 - 17:00 IST
                </span>
                <p className="text-[10px] font-mono text-slate-500 mt-1">
                  1 featured challenge per 24h cycle
                </p>
              </div>

              <div className="glass-card p-4 rounded-xl border border-cyan-500/20">
                <span className="text-[10px] font-mono text-slate-400 uppercase block mb-1">
                  DAILY FINALIZATION
                </span>
                <span className="text-xs font-extrabold text-cyan-300 font-mono block">
                  Job starts 17:05 IST. Final results are ready by 17:10 IST after a 10-minute grace for submissions made before 17:00.
                </span>
              </div>

              <div className="glass-card p-4 rounded-xl border border-emerald-500/20">
                <span className="text-[10px] font-mono text-slate-400 uppercase block mb-1">
                  STREAK FREEZE POLICY
                </span>
                <span className="text-lg font-extrabold text-emerald-400 font-mono">
                  1 / Rolling 7 Days
                </span>
                <p className="text-[10px] font-mono text-slate-500 mt-1">
                  Auto-applied once per rolling 7-day window
                </p>
              </div>

              <div className="glass-card p-4 rounded-xl border border-purple-500/20">
                <span className="text-[10px] font-mono text-slate-400 uppercase block mb-1">
                  PERCENTILE GATING
                </span>
                <span className="text-lg font-extrabold text-purple-400 font-mono">
                  ≥ 10 Solvers
                </span>
                <p className="text-[10px] font-mono text-slate-500 mt-1">
                  Displays &quot;—&quot; when under threshold
                </p>
              </div>
            </div>

            {/* 6-Tier Tie Break Specification */}
            <div className="glass-card p-4 rounded-xl border border-white/[0.06] space-y-2">
              <span className="text-xs font-mono font-bold text-slate-300 uppercase flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                <span>Deterministic Tie-Break Rules (Order 1 through 6)</span>
              </span>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 text-[11px] font-mono">
                <div className="p-2 rounded bg-dark-900 border border-white/[0.04]">
                  <span className="text-amber-400 font-bold block">1. Accepted Time</span>
                  <span className="text-slate-400 text-[10px]">Earliest server time</span>
                </div>
                <div className="p-2 rounded bg-dark-900 border border-white/[0.04]">
                  <span className="text-amber-400 font-bold block">2. Wrong Attempts</span>
                  <span className="text-slate-400 text-[10px]">Fewer wrong tries</span>
                </div>
                <div className="p-2 rounded bg-dark-900 border border-white/[0.04]">
                  <span className="text-amber-400 font-bold block">3. Current Streak</span>
                  <span className="text-slate-400 text-[10px]">Higher active streak</span>
                </div>
                <div className="p-2 rounded bg-dark-900 border border-white/[0.04]">
                  <span className="text-amber-400 font-bold block">4. Total Points</span>
                  <span className="text-slate-400 text-[10px]">Higher cumulative pts</span>
                </div>
                <div className="p-2 rounded bg-dark-900 border border-white/[0.04]">
                  <span className="text-amber-400 font-bold block">5. Total Solved</span>
                  <span className="text-slate-400 text-[10px]">More problems solved</span>
                </div>
                <div className="p-2 rounded bg-dark-900 border border-white/[0.04]">
                  <span className="text-amber-400 font-bold block">6. Stable Tie-Break</span>
                  <span className="text-slate-400 text-[10px]">createdAt ASC, uid ASC</span>
                </div>
              </div>
            </div>
          </div>

          {/* 4. Today's Live Board (Top 20 and counts) */}
          <div className="glass-card rounded-2xl border border-white/[0.08] overflow-hidden">
            <div className="p-5 border-b border-white/[0.06] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div>
                <h4 className="text-sm font-bold text-white font-mono flex items-center gap-2">
                  <Activity className="w-4 h-4 text-cyan-400" />
                  <span>Today&apos;s Live Board ({dailyFin?.todayDayId || 'Active Day'})</span>
                </h4>
                <p className="text-xs font-mono text-slate-400 mt-0.5">
                  Challenge: <span className="text-cyan-300 font-semibold">{dailyFin?.liveToday?.challengeTitle || 'No challenge active'}</span> • Solvers: <span className="text-emerald-400 font-bold">{dailyFin?.liveToday?.totalSolvers || 0}</span>
                </p>
              </div>
              <button
                type="button"
                onClick={() => refetchFinalization()}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono text-slate-300 bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08]"
              >
                <RefreshCw className="w-3 h-3" />
                <span>Refresh Live Board</span>
              </button>
            </div>

            {dailyFin?.isDailyPaused ? (
              <div className="p-8 text-center text-xs font-mono text-amber-300/80 bg-amber-500/[0.03]">
                Daily challenge system is paused. Live board is currently in neutral state with no active competition.
              </div>
            ) : !dailyFin?.liveToday?.top20?.length ? (
              <div className="p-8 text-center text-xs font-mono text-slate-500">
                No students have solved today&apos;s daily challenge yet. The leaderboard updates live as solutions are accepted.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs font-mono">
                  <thead className="bg-dark-900/80 text-slate-400 uppercase text-[10px] tracking-wider border-b border-white/[0.06]">
                    <tr>
                      <th className="px-4 py-3">Rank</th>
                      <th className="px-4 py-3">Student</th>
                      <th className="px-4 py-3">Department</th>
                      <th className="px-4 py-3">Year &amp; Div</th>
                      <th className="px-4 py-3">Accepted At (IST)</th>
                      <th className="px-4 py-3">Wrong Attempts</th>
                      <th className="px-4 py-3">Streak</th>
                      <th className="px-4 py-3">Total Solved / Pts</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/[0.04]">
                    {dailyFin.liveToday.top20.map((entry: any) => (
                      <tr key={entry.userId} className="hover:bg-white/[0.02]">
                        <td className="px-4 py-3 font-bold text-amber-400">
                          #{entry.rank}
                        </td>
                        <td className="px-4 py-3">
                          <span className="font-bold text-white block">
                            {entry.displayName || 'Student'}
                          </span>
                          <span className="text-[10px] text-slate-400">
                            {entry.maskedPrn || entry.email}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-cyan-400">
                          {entry.department || '—'}
                        </td>
                        <td className="px-4 py-3 text-slate-300">
                          {entry.year || '—'} {entry.division ? `• Div ${entry.division}` : ''}
                        </td>
                        <td className="px-4 py-3 text-slate-300">
                          {entry.acceptedAt
                            ? new Date(entry.acceptedAt).toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata' })
                            : '—'}
                        </td>
                        <td className="px-4 py-3 text-rose-400 font-semibold">
                          {entry.wrongAttemptsBeforeAc ?? 0}
                        </td>
                        <td className="px-4 py-3 text-orange-400 font-bold">
                          {entry.currentStreak ?? 0}d
                        </td>
                        <td className="px-4 py-3 text-slate-300">
                          {entry.totalSolved ?? 0} / <span className="text-cyan-300 font-bold">{entry.totalPoints ?? 0} PTS</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* 5. Finalization Job Status & History */}
          <div className="glass-card rounded-2xl border border-white/[0.08] overflow-hidden">
            <div className="p-5 border-b border-white/[0.06] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div>
                <h4 className="text-sm font-bold text-white font-mono flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-emerald-400" />
                  <span>Finalization Job Status &amp; Run History</span>
                </h4>
                <p className="text-xs font-mono text-slate-400 mt-0.5">
                  Yesterday&apos;s Day: <span className="text-amber-300 font-semibold">{dailyFin?.yesterdayDayId || '—'}</span> • Status: <span className="text-emerald-400 font-semibold">{dailyFin?.yesterdayFrozen ? 'Finalized' : 'Pending 17:05 Run'}</span> • Solvers: <span className="text-white font-bold">{dailyFin?.yesterdayFrozen?.totalSolvers ?? '—'}</span>
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setRerunDayId(dailyFin?.yesterdayDayId || '');
                    setRerunForce(true);
                    setRerunAdminPassword('');
                    setRerunReason('');
                    setIsRerunModalOpen(true);
                  }}
                  className="px-3 py-1.5 rounded-lg text-xs font-mono font-bold bg-amber-500/15 text-amber-300 border border-amber-500/30 hover:bg-amber-500/25 flex items-center gap-1.5"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Re-run</span>
                </button>
              </div>
            </div>

            {!dailyFin?.runHistory?.length ? (
              <div className="p-6 text-center text-xs font-mono text-slate-500">
                No finalization job runs recorded yet.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs font-mono">
                  <thead className="bg-dark-900/80 text-slate-400 uppercase text-[10px] tracking-wider border-b border-white/[0.06]">
                    <tr>
                      <th className="px-4 py-3">Day ID</th>
                      <th className="px-4 py-3">Triggered By</th>
                      <th className="px-4 py-3">Reason</th>
                      <th className="px-4 py-3">Run Time (IST)</th>
                      <th className="px-4 py-3">Duration</th>
                      <th className="px-4 py-3">Solvers</th>
                      <th className="px-4 py-3">Summaries</th>
                      <th className="px-4 py-3">Result</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/[0.04]">
                    {dailyFin.runHistory.map((run: any) => (
                      <tr key={run.id} className="hover:bg-white/[0.02]">
                        <td className="px-4 py-3 font-bold text-white">{run.dayId}</td>
                        <td className="px-4 py-3 text-cyan-300">{run.triggeredBy}</td>
                        <td className="px-4 py-3 text-slate-400 max-w-xs truncate">{run.reason}</td>
                        <td className="px-4 py-3 text-slate-300">
                          {new Date(run.startedAt).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}
                        </td>
                        <td className="px-4 py-3 text-slate-400">{run.durationMs}ms</td>
                        <td className="px-4 py-3 text-emerald-400 font-bold">{run.totalSolvers}</td>
                        <td className="px-4 py-3 text-cyan-400 font-bold">{run.summariesWritten}</td>
                        <td className="px-4 py-3">
                          {run.success ? (
                            <span className="px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 text-[10px] font-bold">
                              SUCCESS
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded bg-rose-500/15 text-rose-300 border border-rose-500/30 text-[10px] font-bold">
                              FAILED
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* 6. Correction Records (Append-Only Audit Ledger) */}
          <div className="glass-card rounded-2xl border border-white/[0.08] overflow-hidden">
            <div className="p-5 border-b border-white/[0.06] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div>
                <h4 className="text-sm font-bold text-white font-mono flex items-center gap-2">
                  <FileText className="w-4 h-4 text-purple-400" />
                  <span>Correction Records ({dailyFin?.corrections?.length || 0})</span>
                </h4>
                <p className="text-xs font-mono text-slate-400 mt-0.5">
                  Append-only administrative correction records for grade disputes and daily rank adjustments.
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setCorrectionForm({
                    dayId: dailyFin?.yesterdayDayId || '',
                    studentPrnOrId: '',
                    reason: '',
                    newVerdict: 'ACCEPTED',
                    pointsAdjustment: 20,
                    adminPassword: '',
                  });
                  setIsCorrectionModalOpen(true);
                }}
                className="px-3 py-1.5 rounded-lg text-xs font-mono font-bold bg-purple-500/15 text-purple-300 border border-purple-500/30 hover:bg-purple-500/25 flex items-center gap-1.5"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Create Correction</span>
              </button>
            </div>

            {!dailyFin?.corrections?.length ? (
              <div className="p-6 text-center text-xs font-mono text-slate-500">
                No correction records logged. All daily boards match raw automated verdicts.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs font-mono">
                  <thead className="bg-dark-900/80 text-slate-400 uppercase text-[10px] tracking-wider border-b border-white/[0.06]">
                    <tr>
                      <th className="px-4 py-3">Day ID</th>
                      <th className="px-4 py-3">Student</th>
                      <th className="px-4 py-3">Adjustment</th>
                      <th className="px-4 py-3">New Verdict</th>
                      <th className="px-4 py-3">Reason</th>
                      <th className="px-4 py-3">Admin</th>
                      <th className="px-4 py-3">Created At</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/[0.04]">
                    {dailyFin.corrections.map((corr: any) => (
                      <tr key={corr.id} className="hover:bg-white/[0.02]">
                        <td className="px-4 py-3 font-bold text-white">{corr.dayId}</td>
                        <td className="px-4 py-3 text-cyan-300">{corr.userId}</td>
                        <td className="px-4 py-3 font-bold text-amber-400">
                          {corr.pointsAdjustment >= 0 ? `+${corr.pointsAdjustment}` : corr.pointsAdjustment} PTS
                        </td>
                        <td className="px-4 py-3 text-emerald-400 font-semibold">{corr.newVerdict}</td>
                        <td className="px-4 py-3 text-slate-300 max-w-xs truncate">{corr.reason}</td>
                        <td className="px-4 py-3 text-slate-400">{corr.adminId}</td>
                        <td className="px-4 py-3 text-slate-400">
                          {new Date(corr.createdAt).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* 7. Pause Days Calendar & Streak Freezes */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Pause Days Calendar */}
            <div className="glass-card rounded-2xl border border-white/[0.08] p-5 space-y-4">
              <div className="flex items-center justify-between border-b border-white/[0.06] pb-3">
                <div>
                  <h4 className="text-sm font-bold text-white font-mono flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-amber-400" />
                    <span>Admin Pause Days Calendar</span>
                  </h4>
                  <p className="text-xs font-mono text-slate-400 mt-0.5">
                    Institution holidays or exam days where streaks are protected without using freezes.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setPauseDayForm({
                      dayStr: new Date().toISOString().slice(0, 10),
                      paused: true,
                      reason: '',
                      adminPassword: '',
                    });
                    setIsPauseDayModalOpen(true);
                  }}
                  className="px-2.5 py-1 rounded-lg text-xs font-mono font-bold bg-amber-500/10 text-amber-300 border border-amber-500/30 hover:bg-amber-500/20"
                >
                  + Toggle Day
                </button>
              </div>

              {!dailyFin?.pauseDays?.length ? (
                <div className="p-4 text-center text-xs font-mono text-slate-500">
                  No pause days configured. All days operate on the normal daily cycle.
                </div>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {dailyFin.pauseDays.map((pDay: string) => (
                    <div
                      key={pDay}
                      className="px-3 py-1.5 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-300 text-xs font-mono flex items-center gap-2"
                    >
                      <span>{pDay}</span>
                      <button
                        type="button"
                        onClick={() => {
                          setPauseDayForm({
                            dayStr: pDay,
                            paused: false,
                            reason: 'Removing pause day',
                            adminPassword: '',
                          });
                          setIsPauseDayModalOpen(true);
                        }}
                        className="text-amber-400/80 hover:text-white"
                        title="Remove pause day"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Streak Freeze Usage List */}
            <div className="glass-card rounded-2xl border border-white/[0.08] p-5 space-y-4">
              <div className="border-b border-white/[0.06] pb-3">
                <h4 className="text-sm font-bold text-white font-mono flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  <span>Streak Freeze Usage ({dailyFin?.freezeUsage?.length || 0})</span>
                </h4>
                <p className="text-xs font-mono text-slate-400 mt-0.5">
                  Recent student streak freezes consumed (1 freeze per rolling 7 days policy).
                </p>
              </div>

              {!dailyFin?.freezeUsage?.length ? (
                <div className="p-4 text-center text-xs font-mono text-slate-500">
                  No streak freezes consumed recently.
                </div>
              ) : (
                <div className="max-h-56 overflow-y-auto">
                  <table className="w-full text-left text-xs font-mono">
                    <thead className="bg-dark-900/80 text-slate-400 uppercase text-[10px] tracking-wider border-b border-white/[0.06]">
                      <tr>
                        <th className="px-3 py-2">Student</th>
                        <th className="px-3 py-2">Protected Day</th>
                        <th className="px-3 py-2">Consumed At</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/[0.04]">
                      {dailyFin.freezeUsage.map((fr: any, idx: number) => (
                        <tr key={`${fr.userId}-${fr.dayStr}-${idx}`} className="hover:bg-white/[0.02]">
                          <td className="px-3 py-2 text-cyan-300 font-bold truncate max-w-[120px]">
                            {fr.userId}
                          </td>
                          <td className="px-3 py-2 text-amber-400">{fr.dayStr}</td>
                          <td className="px-3 py-2 text-slate-400 text-[11px]">
                            {new Date(fr.usedAt).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>

          {/* 8. Archive of Past Daily Boards */}
          <div className="glass-card rounded-2xl border border-white/[0.08] overflow-hidden">
            <div className="p-5 border-b border-white/[0.06]">
              <h4 className="text-sm font-bold text-white font-mono flex items-center gap-2">
                <Trophy className="w-4 h-4 text-amber-400" />
                <span>Archive of Past Daily Boards ({dailyFin?.pastBoards?.length || 0})</span>
              </h4>
              <p className="text-xs font-mono text-slate-400 mt-0.5">
                Permanently frozen historical competition results and winner standings.
              </p>
            </div>

            {!dailyFin?.pastBoards?.length ? (
              <div className="p-6 text-center text-xs font-mono text-slate-500">
                No past daily boards archived yet. Past boards are recorded every day at 17:10 IST finalization.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs font-mono">
                  <thead className="bg-dark-900/80 text-slate-400 uppercase text-[10px] tracking-wider border-b border-white/[0.06]">
                    <tr>
                      <th className="px-4 py-3">Day ID</th>
                      <th className="px-4 py-3">Challenge Title</th>
                      <th className="px-4 py-3">Solvers</th>
                      <th className="px-4 py-3">Finalized Timestamp</th>
                      <th className="px-4 py-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/[0.04]">
                    {dailyFin.pastBoards.map((b: any) => (
                      <tr key={b.dayId} className="hover:bg-white/[0.02]">
                        <td className="px-4 py-3 font-bold text-white">{b.dayId}</td>
                        <td className="px-4 py-3 text-cyan-300 font-semibold">{b.challengeTitle}</td>
                        <td className="px-4 py-3 text-emerald-400 font-bold">{b.totalSolvers} Solvers</td>
                        <td className="px-4 py-3 text-slate-400">
                          {new Date(b.finalizedAt).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <button
                            type="button"
                            onClick={() => setSelectedPastBoard(b)}
                            className="px-2.5 py-1 rounded bg-amber-500/10 border border-amber-500/30 text-amber-300 hover:bg-amber-500/20 text-xs font-mono font-bold"
                          >
                            View Standings
                          </button>
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

      {/* Student Activity Inspector Modal */}
      {selectedActivityUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="w-full max-w-4xl glass-card rounded-2xl border border-white/[0.1] shadow-2xl p-6 sm:p-8 overflow-y-auto max-h-[92vh] space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white/[0.08]">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400">
                  <Activity className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-bold text-white font-mono">
                      {selectedActivityUser.displayName || selectedActivityUser.fullName || selectedActivityUser.username}
                    </h3>
                    <span className="text-xs text-slate-400 font-mono">
                      (@{selectedActivityUser.username})
                    </span>
                    {selectedActivityUser.isBanned ? (
                      <span className="px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 border border-rose-500/30 text-[10px] font-mono">
                        BANNED
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px] font-mono">
                        {selectedActivityUser.role}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-400 font-mono">
                    {selectedActivityUser.email}
                  </p>
                </div>
              </div>

              {/* Top Action Buttons: Download CSV, Edit PRN, Ban/Unban, Close */}
              <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
                <button
                  type="button"
                  onClick={() => handleDownloadSingleStudentCsv(selectedActivityUser)}
                  className="px-3 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-xs font-mono font-bold text-emerald-400 hover:bg-emerald-500/20 transition flex items-center gap-1.5"
                  title="Download student dossier CSV"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download Student CSV</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setEditingAcademicUser(selectedActivityUser);
                    setAcademicEditForm({
                      prn: selectedActivityUser.prn || '',
                      college: selectedActivityUser.college || 'Sanjivani University',
                      department: selectedActivityUser.department || 'CSE',
                      year: selectedActivityUser.year || 'FY',
                      division: selectedActivityUser.division || '',
                      adminPassword: '',
                      reason: '',
                    });
                  }}
                  className="px-3 py-1.5 rounded-lg bg-cyan-500/10 border border-cyan-500/30 text-xs font-mono font-bold text-cyan-400 hover:bg-cyan-500/20 transition flex items-center gap-1.5"
                  title="Audited PRN and College edit"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  <span>Edit PRN</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    const newBanStatus = !selectedActivityUser.isBanned;
                    if (
                      window.confirm(
                        `Are you sure you want to ${
                          newBanStatus ? 'BAN' : 'UNBAN'
                        } student ${selectedActivityUser.displayName || selectedActivityUser.username}?`
                      )
                    ) {
                      banMutation.mutate({
                        id: selectedActivityUser.id,
                        isBanned: newBanStatus,
                      });
                      setSelectedActivityUser((prev: any) =>
                        prev ? { ...prev, isBanned: newBanStatus } : null
                      );
                    }
                  }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition flex items-center gap-1.5 ${
                    selectedActivityUser.isBanned
                      ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/30'
                      : 'bg-rose-500/20 text-rose-400 border border-rose-500/30 hover:bg-rose-500/30'
                  }`}
                  title={selectedActivityUser.isBanned ? 'Unban student' : 'Ban student'}
                >
                  <Ban className="w-3.5 h-3.5" />
                  <span>{selectedActivityUser.isBanned ? 'Unban Student' : 'Ban Student'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setSelectedActivityUser(null)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/[0.05] transition"
                  title="Close inspector"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Academic Profile & Summary Stats Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="glass-card p-3 rounded-xl border border-white/[0.06]">
                <span className="text-[10px] font-mono text-slate-500 uppercase block">PRN</span>
                <span className="text-xs font-mono font-bold text-cyan-300">
                  {revealedPrns[selectedActivityUser.id] ||
                    selectedActivityUser.maskedPrn ||
                    selectedActivityUser.prn ||
                    '—'}
                </span>
              </div>
              <div className="glass-card p-3 rounded-xl border border-white/[0.06]">
                <span className="text-[10px] font-mono text-slate-500 uppercase block">College & Dept</span>
                <span className="text-xs font-mono text-slate-200">
                  {selectedActivityUser.department || '—'}
                </span>
                <span className="text-[10px] text-slate-500 block">
                  {selectedActivityUser.college || 'Sanjivani'}
                </span>
              </div>
              <div className="glass-card p-3 rounded-xl border border-white/[0.06]">
                <span className="text-[10px] font-mono text-slate-500 uppercase block">Year / Div</span>
                <span className="text-xs font-mono text-slate-200">
                  {selectedActivityUser.year || '—'} {selectedActivityUser.division ? `• Div ${selectedActivityUser.division}` : ''}
                </span>
              </div>
              <div className="glass-card p-3 rounded-xl border border-white/[0.06]">
                <span className="text-[10px] font-mono text-slate-500 uppercase block">Points & Streak</span>
                <span className="text-xs font-mono font-bold text-amber-400">
                  {selectedActivityUser.totalPoints || 0} PTS
                </span>
                <span className="text-[10px] text-orange-400 block font-mono">
                  {selectedActivityUser.currentStreak || 0}d streak
                </span>
              </div>
            </div>

            {/* Submissions Activity Table */}
            {(() => {
              const studentSubmissions = submissions.filter(
                (s: any) =>
                  s.userId === selectedActivityUser.id ||
                  s.user?.id === selectedActivityUser.id ||
                  s.user?.email === selectedActivityUser.email
              );
              return (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold font-mono uppercase tracking-wider text-slate-300 flex items-center gap-2">
                      <Code2 className="w-4 h-4 text-cyan-400" />
                      <span>Code Submissions Activity ({studentSubmissions.length})</span>
                    </h4>
                  </div>
                  {studentSubmissions.length === 0 ? (
                    <div className="p-4 rounded-xl border border-dashed border-white/[0.08] text-center text-xs font-mono text-slate-500">
                      No code submissions recorded for this student yet.
                    </div>
                  ) : (
                    <div className="overflow-x-auto rounded-xl border border-white/[0.06]">
                      <table className="w-full text-left text-xs font-mono">
                        <thead className="bg-dark-900/90 text-slate-400 text-[10px] uppercase border-b border-white/[0.06]">
                          <tr>
                            <th className="px-3 py-2.5">Date</th>
                            <th className="px-3 py-2.5">Challenge</th>
                            <th className="px-3 py-2.5">Verdict</th>
                            <th className="px-3 py-2.5">Runtime / Mem</th>
                            <th className="px-3 py-2.5">Points</th>
                            <th className="px-3 py-2.5 text-right">Inspect</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-white/[0.04]">
                          {studentSubmissions.map((sub: any) => (
                            <tr key={sub.id} className="hover:bg-white/[0.02]">
                              <td className="px-3 py-2 text-slate-400 text-[11px]">
                                {new Date(sub.submittedAt || sub.createdAt).toLocaleDateString()}
                              </td>
                              <td className="px-3 py-2 text-white font-medium">
                                {sub.problem?.title || sub.problemTitle || sub.problemSlug || sub.problemId || 'Challenge'}
                              </td>
                              <td className="px-3 py-2">
                                <VerdictBadge verdict={sub.verdict || sub.status} />
                              </td>
                              <td className="px-3 py-2 text-slate-400 text-[11px]">
                                {sub.executionTimeMs ?? sub.executionTime ?? '—'} ms / {sub.memoryUsedKb ?? sub.memoryKb ?? '—'} KB
                              </td>
                              <td className="px-3 py-2 text-amber-400 font-bold">
                                +{sub.pointsAwarded ?? sub.points ?? 0}
                              </td>
                              <td className="px-3 py-2 text-right">
                                {sub.sourceCode && (
                                  <button
                                    type="button"
                                    onClick={() => setSelectedSubmissionCode(sub.sourceCode)}
                                    className="px-2 py-0.5 rounded text-[11px] bg-white/[0.05] hover:bg-white/[0.1] text-cyan-300"
                                  >
                                    Code
                                  </button>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              );
            })()}

            {/* Uploaded Files Activity Table */}
            {(() => {
              const studentUploads = uploads.filter(
                (up: any) =>
                  up.userId === selectedActivityUser.id ||
                  up.user?.id === selectedActivityUser.id ||
                  up.user?.email === selectedActivityUser.email
              );
              return (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold font-mono uppercase tracking-wider text-slate-300 flex items-center gap-2">
                      <Upload className="w-4 h-4 text-emerald-400" />
                      <span>Uploaded Files & Handwritten Assignments ({studentUploads.length})</span>
                    </h4>
                  </div>
                  {studentUploads.length === 0 ? (
                    <div className="p-4 rounded-xl border border-dashed border-white/[0.08] text-center text-xs font-mono text-slate-500">
                      No uploaded assignment submissions recorded for this student yet.
                    </div>
                  ) : (
                    <div className="overflow-x-auto rounded-xl border border-white/[0.06]">
                      <table className="w-full text-left text-xs font-mono">
                        <thead className="bg-dark-900/90 text-slate-400 text-[10px] uppercase border-b border-white/[0.06]">
                          <tr>
                            <th className="px-3 py-2.5">Date</th>
                            <th className="px-3 py-2.5">Filename / Challenge</th>
                            <th className="px-3 py-2.5">Status</th>
                            <th className="px-3 py-2.5">Suspicion</th>
                            <th className="px-3 py-2.5">Score Awarded</th>
                            <th className="px-3 py-2.5">Comment</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-white/[0.04]">
                          {studentUploads.map((up: any) => (
                            <tr key={up.id} className="hover:bg-white/[0.02]">
                              <td className="px-3 py-2 text-slate-400 text-[11px]">
                                {new Date(up.submittedAt || up.createdAt).toLocaleDateString()}
                              </td>
                              <td className="px-3 py-2 text-white">
                                {up.originalFilename || up.filename || up.problemTitle || 'Uploaded File'}
                              </td>
                              <td className="px-3 py-2">
                                <span
                                  className={`px-2 py-0.5 rounded text-[10px] border ${
                                    up.status === 'APPROVED'
                                      ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                                      : up.status === 'REJECTED'
                                      ? 'bg-rose-500/15 text-rose-300 border-rose-500/30'
                                      : 'bg-amber-500/15 text-amber-300 border-amber-500/30'
                                  }`}
                                >
                                  {up.status || 'PENDING'}
                                </span>
                              </td>
                              <td className="px-3 py-2">
                                {up.suspicionFlag ? (
                                  <span className="px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-300 text-[10px] flex items-center gap-1 w-fit">
                                    <Flag className="w-3 h-3" /> FLAGGED
                                  </span>
                                ) : (
                                  <span className="text-slate-500 text-[10px]">CLEAR</span>
                                )}
                              </td>
                              <td className="px-3 py-2 text-amber-400 font-bold">
                                {up.pointsAwarded != null ? `+${up.pointsAwarded}` : '—'}
                              </td>
                              <td className="px-3 py-2 text-slate-400 text-[11px] truncate max-w-xs">
                                {up.reviewerComment || '—'}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              );
            })()}

            {/* Modal Footer */}
            <div className="flex justify-end pt-4 border-t border-white/[0.08]">
              <button
                type="button"
                onClick={() => setSelectedActivityUser(null)}
                className="px-4 py-2 rounded-lg font-mono text-xs text-slate-300 bg-white/[0.05] hover:bg-white/[0.1] transition"
              >
                Close Activity Inspector
              </button>
            </div>
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
                <div className="flex items-center justify-between mb-1">
                  <label htmlFor="audit-prn" className="block text-xs font-mono text-slate-300">
                    New 12-Character PRN
                  </label>
                  <span className="text-[10px] font-mono text-slate-400">
                    {academicEditForm.prn.length}/12
                  </span>
                </div>
                <input
                  id="audit-prn"
                  type="text"
                  inputMode="text"
                  autoCapitalize="characters"
                  autoComplete="off"
                  autoCorrect="off"
                  spellCheck={false}
                  maxLength={12}
                  enterKeyHint="next"
                  required
                  placeholder="2199TESM0001"
                  value={academicEditForm.prn}
                  onChange={(e) =>
                    setAcademicEditForm({
                      ...academicEditForm,
                      prn: e.target.value.toUpperCase().slice(0, 12),
                    })
                  }
                  onPaste={(e) => {
                    e.preventDefault();
                    const pasted = e.clipboardData.getData('text');
                    setAcademicEditForm((prev) => ({
                      ...prev,
                      prn: pasted.trim().replace(/\s+/g, '').toUpperCase().slice(0, 12),
                    }));
                  }}
                  onBlur={() =>
                    setAcademicEditForm((prev) => ({
                      ...prev,
                      prn: prev.prn.trim().replace(/\s+/g, '').toUpperCase(),
                    }))
                  }
                  className="w-full px-3 py-2 rounded-lg bg-dark-900 border border-slate-700 text-xs font-mono text-white tracking-wider"
                />
                <PrnFormatGuide value={academicEditForm.prn} />
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
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-mono text-slate-300">
                    PROBLEM STATEMENT (MARKDOWN)
                  </label>
                  {/(Chapter|Exercise|Page)\s*\d+/i.test(problemForm.description) && (
                    <span className="text-[11px] font-mono text-amber-400">
                      ⚠️ Warning: Mentions Chapter/Exercise/Page. Ensure problem statement does not leak internal book structure.
                    </span>
                  )}
                </div>
                <textarea
                  rows={6}
                  required
                  value={problemForm.description}
                  onChange={(e) => setProblemForm({ ...problemForm, description: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg bg-dark-900 border border-slate-700 text-xs font-mono text-white leading-relaxed resize-none"
                />
                {/Kanetkar|Test Your C Skills/i.test(`${problemForm.title} ${problemForm.description}`) && (
                  <p className="mt-1 text-[11px] font-mono text-rose-400 font-semibold">
                    🚫 Blocked: Direct book citation or author name detected. Keep problem statements reworded without author/book names.
                  </p>
                )}
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

      {/* Author New Practice Module Modal */}
      {isCreatePracticeModuleOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="w-full max-w-xl glass-card rounded-2xl border border-white/[0.1] shadow-2xl p-6 sm:p-8 overflow-y-auto max-h-[90vh] space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-white/[0.08]">
              <h3 className="text-lg font-bold text-white flex items-center gap-2 font-mono">
                <Code2 className="w-5 h-5 text-cyan-400" />
                <span>Create New Practice Module</span>
              </h3>
              <button
                type="button"
                onClick={() => setIsCreatePracticeModuleOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                createPracticeModuleMutation.mutate(newPracticeModuleForm);
              }}
              className="space-y-4"
            >
              <div>
                <label className="block text-xs font-mono text-slate-300 mb-1">MODULE TITLE</label>
                <input
                  type="text"
                  required
                  value={newPracticeModuleForm.title}
                  onChange={(e) => {
                    const title = e.target.value;
                    const slug = title
                      .toLowerCase()
                      .replace(/[^a-z0-9]+/g, '-')
                      .replace(/(^-|-$)+/g, '');
                    setNewPracticeModuleForm({ ...newPracticeModuleForm, title, slug: newPracticeModuleForm.slug || slug });
                  }}
                  placeholder="e.g. File Handling & Streams"
                  className="w-full px-3 py-2 rounded-lg bg-dark-900 border border-slate-700 text-sm text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-mono text-slate-300 mb-1">MODULE SLUG</label>
                  <input
                    type="text"
                    required
                    value={newPracticeModuleForm.slug}
                    onChange={(e) =>
                      setNewPracticeModuleForm({ ...newPracticeModuleForm, slug: e.target.value })
                    }
                    placeholder="e.g. file-handling-streams"
                    className="w-full px-3 py-2 rounded-lg bg-dark-900 border border-slate-700 text-xs text-white font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-mono text-slate-300 mb-1">ORDER NUMBER</label>
                  <input
                    type="number"
                    min={1}
                    required
                    value={newPracticeModuleForm.order}
                    onChange={(e) =>
                      setNewPracticeModuleForm({
                        ...newPracticeModuleForm,
                        order: parseInt(e.target.value) || 5,
                      })
                    }
                    className="w-full px-3 py-2 rounded-lg bg-dark-900 border border-slate-700 text-xs text-white font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-mono text-slate-300 mb-1">
                  REQUIRED SOLVES TO UNLOCK (FROM PREVIOUS)
                </label>
                <input
                  type="number"
                  min={0}
                  max={20}
                  required
                  value={newPracticeModuleForm.requiredSolvedToUnlock}
                  onChange={(e) =>
                    setNewPracticeModuleForm({
                      ...newPracticeModuleForm,
                      requiredSolvedToUnlock: parseInt(e.target.value) || PRACTICE_CONFIG.practiceUnlockThreshold,
                    })
                  }
                  className="w-full px-3 py-2 rounded-lg bg-dark-900 border border-slate-700 text-xs text-white font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-mono text-slate-300 mb-1">DESCRIPTION</label>
                <textarea
                  rows={3}
                  required
                  value={newPracticeModuleForm.description}
                  onChange={(e) =>
                    setNewPracticeModuleForm({ ...newPracticeModuleForm, description: e.target.value })
                  }
                  placeholder="Explain the concepts covered in this module..."
                  className="w-full px-3 py-2 rounded-lg bg-dark-900 border border-slate-700 text-xs text-white resize-none"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-white/[0.08]">
                <button
                  type="button"
                  onClick={() => setIsCreatePracticeModuleOpen(false)}
                  className="px-4 py-2 rounded-lg font-mono text-xs text-slate-400"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createPracticeModuleMutation.isPending}
                  className="px-5 py-2.5 rounded-xl font-mono text-xs font-bold text-dark-950 bg-gradient-to-r from-cyan-400 to-emerald-400"
                >
                  {createPracticeModuleMutation.isPending ? 'Creating...' : 'Create Module'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Author New Practice Question Inside Module Modal */}
      {isCreatePracticeProblemOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="w-full max-w-3xl glass-card rounded-2xl border border-white/[0.1] shadow-2xl p-6 sm:p-8 overflow-y-auto max-h-[92vh] space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-white/[0.08]">
              <h3 className="text-lg font-bold text-white flex items-center gap-2 font-mono">
                <Code2 className="w-5 h-5 text-emerald-400" />
                <span>Add Question to Practice Module</span>
              </h3>
              <button
                type="button"
                onClick={() => setIsCreatePracticeProblemOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                createPracticeProblemMutation.mutate({
                  ...newPracticeProblemForm,
                  sampleTests: [
                    {
                      input: newPracticeProblemForm.sampleInput,
                      expectedOutput: newPracticeProblemForm.sampleOutput,
                    },
                  ],
                  hiddenTests: [
                    {
                      input: newPracticeProblemForm.hiddenInput,
                      expectedOutput: newPracticeProblemForm.hiddenOutput,
                    },
                  ],
                });
              }}
              className="space-y-4"
            >
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-mono text-slate-300 mb-1">TARGET MODULE</label>
                  <select
                    value={newPracticeProblemForm.moduleSlug}
                    onChange={(e) =>
                      setNewPracticeProblemForm({
                        ...newPracticeProblemForm,
                        moduleSlug: e.target.value,
                      })
                    }
                    className="w-full px-3 py-2 rounded-lg bg-dark-900 border border-slate-700 text-xs text-white font-mono"
                  >
                    {(practiceModulesData?.data?.modules || [
                      { slug: 'control-structures', title: 'Control Structures' },
                      { slug: 'pointers-and-functions', title: 'Pointers and functions' },
                      { slug: 'array-and-its-applications', title: 'Array and its Applications' },
                      { slug: 'advanced-data-types-dynamic-memory', title: 'Advanced Data Types' },
                    ]).map((m: any) => (
                      <option key={m.slug} value={m.slug}>
                        {m.title} ({m.slug})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-mono text-slate-300 mb-1">DIFFICULTY</label>
                  <select
                    value={newPracticeProblemForm.difficulty}
                    onChange={(e) =>
                      setNewPracticeProblemForm({
                        ...newPracticeProblemForm,
                        difficulty: e.target.value as any,
                      })
                    }
                    className="w-full px-3 py-2 rounded-lg bg-dark-900 border border-slate-700 text-xs text-white"
                  >
                    <option value="EASY">EASY</option>
                    <option value="MEDIUM">MEDIUM</option>
                    <option value="HARD">HARD</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-mono text-slate-300 mb-1">QUESTION TITLE</label>
                  <input
                    type="text"
                    required
                    value={newPracticeProblemForm.title}
                    onChange={(e) => {
                      const title = e.target.value;
                      const slug = title
                        .toLowerCase()
                        .replace(/[^a-z0-9]+/g, '-')
                        .replace(/(^-|-$)+/g, '');
                      setNewPracticeProblemForm({
                        ...newPracticeProblemForm,
                        title,
                        slug: newPracticeProblemForm.slug || slug,
                      });
                    }}
                    placeholder="e.g. Reverse an Array In-Place"
                    className="w-full px-3 py-2 rounded-lg bg-dark-900 border border-slate-700 text-sm text-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-mono text-slate-300 mb-1">SLUG (URL IDENTIFIER)</label>
                  <input
                    type="text"
                    required
                    value={newPracticeProblemForm.slug}
                    onChange={(e) =>
                      setNewPracticeProblemForm({
                        ...newPracticeProblemForm,
                        slug: e.target.value,
                      })
                    }
                    placeholder="e.g. reverse-array-in-place"
                    className="w-full px-3 py-2 rounded-lg bg-dark-900 border border-slate-700 text-xs text-white font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-mono text-slate-300 mb-1">
                  PROBLEM STATEMENT (MARKDOWN)
                </label>
                <textarea
                  rows={5}
                  required
                  value={newPracticeProblemForm.description}
                  onChange={(e) =>
                    setNewPracticeProblemForm({
                      ...newPracticeProblemForm,
                      description: e.target.value,
                    })
                  }
                  className="w-full px-3 py-2 rounded-lg bg-dark-900 border border-slate-700 text-xs font-mono text-white resize-none"
                />
              </div>

              <div>
                <label className="block text-xs font-mono text-slate-300 mb-1">
                  STARTER C BOILERPLATE
                </label>
                <textarea
                  rows={4}
                  required
                  value={newPracticeProblemForm.starterCode}
                  onChange={(e) =>
                    setNewPracticeProblemForm({
                      ...newPracticeProblemForm,
                      starterCode: e.target.value,
                    })
                  }
                  className="w-full px-3 py-2 rounded-lg bg-dark-900 border border-slate-700 text-xs font-mono text-cyan-200 resize-none"
                />
              </div>

              {/* Sample Test Case */}
              <div className="p-3 rounded-xl bg-dark-950 border border-white/[0.06] space-y-2">
                <span className="text-[11px] font-mono text-emerald-400 font-bold block">
                  SAMPLE TEST CASE (VISIBLE TO STUDENTS)
                </span>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <span className="text-[10px] text-slate-500 block font-mono">STDIN INPUT</span>
                    <textarea
                      rows={2}
                      value={newPracticeProblemForm.sampleInput}
                      onChange={(e) =>
                        setNewPracticeProblemForm({
                          ...newPracticeProblemForm,
                          sampleInput: e.target.value,
                        })
                      }
                      className="w-full p-1.5 rounded bg-dark-900 border border-slate-800 text-cyan-200 text-xs resize-none font-mono"
                    />
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 block font-mono">EXPECTED STDOUT</span>
                    <textarea
                      rows={2}
                      value={newPracticeProblemForm.sampleOutput}
                      onChange={(e) =>
                        setNewPracticeProblemForm({
                          ...newPracticeProblemForm,
                          sampleOutput: e.target.value,
                        })
                      }
                      className="w-full p-1.5 rounded bg-dark-900 border border-slate-800 text-emerald-200 text-xs resize-none font-mono"
                    />
                  </div>
                </div>
              </div>

              {/* Hidden Test Case */}
              <div className="p-3 rounded-xl bg-dark-950 border border-white/[0.06] space-y-2">
                <span className="text-[11px] font-mono text-amber-400 font-bold block">
                  HIDDEN TEST CASE (GRADING VERIFICATION)
                </span>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <span className="text-[10px] text-slate-500 block font-mono">STDIN INPUT</span>
                    <textarea
                      rows={2}
                      value={newPracticeProblemForm.hiddenInput}
                      onChange={(e) =>
                        setNewPracticeProblemForm({
                          ...newPracticeProblemForm,
                          hiddenInput: e.target.value,
                        })
                      }
                      className="w-full p-1.5 rounded bg-dark-900 border border-slate-800 text-cyan-200 text-xs resize-none font-mono"
                    />
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 block font-mono">EXPECTED STDOUT</span>
                    <textarea
                      rows={2}
                      value={newPracticeProblemForm.hiddenOutput}
                      onChange={(e) =>
                        setNewPracticeProblemForm({
                          ...newPracticeProblemForm,
                          hiddenOutput: e.target.value,
                        })
                      }
                      className="w-full p-1.5 rounded bg-dark-900 border border-slate-800 text-emerald-200 text-xs resize-none font-mono"
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-white/[0.08]">
                <button
                  type="button"
                  onClick={() => setIsCreatePracticeProblemOpen(false)}
                  className="px-4 py-2 rounded-lg font-mono text-xs text-slate-400"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createPracticeProblemMutation.isPending}
                  className="px-5 py-2.5 rounded-xl font-mono text-xs font-bold text-dark-950 bg-gradient-to-r from-cyan-400 to-emerald-400"
                >
                  {createPracticeProblemMutation.isPending ? 'Saving...' : 'Add Question to Module'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Resume Daily System Modal */}
      {isResumeModalOpen && (
        <div data-testid="resume-daily-modal" className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl bg-[#0d121f] border border-white/[0.1] p-6 text-white shadow-2xl space-y-5 font-mono">
            <div className="flex items-center justify-between border-b border-white/[0.08] pb-4">
              <div className="flex items-center gap-2.5">
                <span className="p-2 rounded-xl bg-emerald-500/20 text-emerald-400 font-bold">▶️</span>
                <h3 className="text-lg font-bold">Resume Daily Challenge System</h3>
              </div>
              <button
                onClick={() => setIsResumeModalOpen(false)}
                className="p-1 rounded-lg hover:bg-white/[0.05] text-slate-400"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Invariant Check on Scheduled Questions */}
            <div className="p-4 rounded-xl bg-slate-900 border border-white/[0.08] space-y-2 text-xs">
              <div className="flex justify-between items-center">
                <span className="text-slate-400">Validated Scheduled Challenges:</span>
                <span className={`font-bold ${dailySystemData?.data?.canResume ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {dailySystemData?.data?.scheduledCount || 0} / {dailySystemData?.data?.minRequired || 14} required
                </span>
              </div>
              {!dailySystemData?.data?.canResume && (
                <div className="p-2.5 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs">
                  ⚠️ System invariant rule: At least {dailySystemData?.data?.minRequired || 14} validated challenges must be scheduled before resuming. Please schedule more validated problems first.
                </div>
              )}
            </div>

            {/* Mode selection */}
            <div className="space-y-2">
              <label className="text-xs text-slate-400 block">Resume Timing Mode:</label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <label className={`p-3 rounded-xl border cursor-pointer transition-all ${dailyResumeMode === 'NEXT_1700' ? 'bg-cyan-500/10 border-cyan-400 text-cyan-200' : 'bg-slate-900 border-white/[0.08] text-slate-400'}`}>
                  <input
                    type="radio"
                    name="resumeMode"
                    value="NEXT_1700"
                    checked={dailyResumeMode === 'NEXT_1700'}
                    onChange={() => setDailyResumeMode('NEXT_1700')}
                    className="mr-2"
                  />
                  <strong>Day 1 starts at next 17:00 IST</strong>
                  <span className="block text-[11px] text-slate-400 mt-1">Recommended. Smooth cutoff alignment.</span>
                </label>
                <label className={`p-3 rounded-xl border cursor-pointer transition-all ${dailyResumeMode === 'START_NOW' ? 'bg-cyan-500/10 border-cyan-400 text-cyan-200' : 'bg-slate-900 border-white/[0.08] text-slate-400'}`}>
                  <input
                    type="radio"
                    name="resumeMode"
                    value="START_NOW"
                    checked={dailyResumeMode === 'START_NOW'}
                    onChange={() => setDailyResumeMode('START_NOW')}
                    className="mr-2"
                  />
                  <strong>Start now</strong>
                  <span className="block text-[11px] text-slate-400 mt-1">Immediately unlocks active question today.</span>
                </label>
              </div>
            </div>

            {/* Preview of first 7 challenges */}
            {dailySystemData?.data?.first7Preview && dailySystemData.data.first7Preview.length > 0 && (
              <div className="space-y-2">
                <span className="text-xs text-slate-400 block">Preview of First 7 Scheduled Challenges:</span>
                <div className="rounded-xl border border-white/[0.08] overflow-hidden text-xs">
                  <table className="w-full text-left">
                    <thead className="bg-slate-900 text-slate-400 text-[11px]">
                      <tr>
                        <th className="p-2">Date</th>
                        <th className="p-2">Title</th>
                        <th className="p-2">Difficulty</th>
                        <th className="p-2">Points</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/[0.05]">
                      {dailySystemData.data.first7Preview.map((p: any) => (
                        <tr key={p.id}>
                          <td className="p-2 text-cyan-400">{p.scheduledDate}</td>
                          <td className="p-2 font-medium text-slate-200">{p.title}</td>
                          <td className="p-2">
                            <span className="px-1.5 py-0.5 rounded bg-slate-800 text-[10px]">
                              {p.difficulty}
                            </span>
                          </td>
                          <td className="p-2 text-slate-400">{p.basePoints} pts</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Re-authentication & Reason */}
            <div className="space-y-3 pt-2">
              <div>
                <label className="text-xs text-slate-400 block mb-1">Audit Reason (Required):</label>
                <input
                  type="text"
                  value={dailyAdminReason}
                  onChange={(e) => setDailyAdminReason(e.target.value)}
                  placeholder="e.g. Yashavant Kanetkar 14-day book pool validated and ready for competition"
                  className="w-full p-2.5 rounded-xl bg-slate-900 border border-white/[0.1] text-xs text-white"
                />
              </div>

              <div>
                <label className="text-xs text-slate-400 block mb-1">Admin Password Re-authentication (Required):</label>
                <input
                  type="password"
                  value={dailyAdminPassword}
                  onChange={(e) => setDailyAdminPassword(e.target.value)}
                  placeholder="Enter your administrator password"
                  className="w-full p-2.5 rounded-xl bg-slate-900 border border-white/[0.1] text-xs text-white"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-white/[0.08]">
              <button
                type="button"
                onClick={() => setIsResumeModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs text-slate-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                data-testid="admin-confirm-resume-button"
                type="button"
                disabled={!dailySystemData?.data?.canResume || !dailyAdminPassword || !dailyAdminReason || resumeDailyMutation.isPending}
                onClick={() => resumeDailyMutation.mutate()}
                className="px-5 py-2.5 rounded-xl text-xs font-bold bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {resumeDailyMutation.isPending ? 'Resuming...' : 'Confirm & Resume System'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Pause Daily System Modal */}
      {isPauseModalOpen && (
        <div data-testid="pause-daily-modal" className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="relative w-full max-w-lg rounded-2xl bg-[#0d121f] border border-white/[0.1] p-6 text-white shadow-2xl space-y-5 font-mono">
            <div className="flex items-center justify-between border-b border-white/[0.08] pb-4">
              <div className="flex items-center gap-2.5">
                <span className="p-2 rounded-xl bg-amber-500/20 text-amber-400 font-bold">⏸️</span>
                <h3 className="text-lg font-bold">Pause Daily Challenge System</h3>
              </div>
              <button
                onClick={() => setIsPauseModalOpen(false)}
                className="p-1 rounded-lg hover:bg-white/[0.05] text-slate-400"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              Pausing the daily system will hide active daily questions and timers, prevent streak resets and freezes, and set all daily schedulers to no-ops.
            </p>

            <div className="space-y-3">
              <div>
                <label className="text-xs text-slate-400 block mb-1">Reason for Pause (Required):</label>
                <input
                  type="text"
                  value={dailyAdminReason}
                  onChange={(e) => setDailyAdminReason(e.target.value)}
                  placeholder="e.g. Transitioning pool to book curriculum"
                  className="w-full p-2.5 rounded-xl bg-slate-900 border border-white/[0.1] text-xs text-white"
                />
              </div>

              <div>
                <label className="text-xs text-slate-400 block mb-1">Admin Password Re-authentication (Required):</label>
                <input
                  type="password"
                  value={dailyAdminPassword}
                  onChange={(e) => setDailyAdminPassword(e.target.value)}
                  placeholder="Enter your administrator password"
                  className="w-full p-2.5 rounded-xl bg-slate-900 border border-white/[0.1] text-xs text-white"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-white/[0.08]">
              <button
                type="button"
                onClick={() => setIsPauseModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs text-slate-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={!dailyAdminPassword || !dailyAdminReason || pauseDailyMutation.isPending}
                onClick={() => pauseDailyMutation.mutate()}
                className="px-5 py-2.5 rounded-xl text-xs font-bold bg-amber-500 text-slate-950 hover:bg-amber-400 disabled:opacity-40"
              >
                {pauseDailyMutation.isPending ? 'Pausing...' : 'Confirm & Pause System'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Daily Finalization Run / Re-run */}
      {isRerunModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="w-full max-w-lg glass-card rounded-2xl border border-white/[0.1] shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-white/[0.08]">
              <h3 className="text-base font-bold text-white font-mono flex items-center gap-2">
                <RotateCcw className="w-4 h-4 text-amber-400" />
                <span>{rerunForce ? 'Re-run Daily Finalization' : 'Publish / Run Daily Finalization'}</span>
              </h3>
              <button
                type="button"
                onClick={() => setIsRerunModalOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs font-mono text-slate-300 leading-relaxed">
              Finalization calculates 6-tier deterministic ranks, updates student streak freezes, writes daily results &amp; summaries, and freezes the daily board.
            </p>

            <div className="space-y-3 font-mono text-xs">
              <div>
                <label className="text-slate-400 block mb-1">Target Challenge Day (YYYY-MM-DD):</label>
                <input
                  type="text"
                  value={rerunDayId}
                  onChange={(e) => setRerunDayId(e.target.value)}
                  placeholder="e.g. 2026-10-12"
                  className="w-full p-2.5 rounded-xl bg-slate-900 border border-white/[0.1] text-white"
                />
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="force-rerun-cb"
                  checked={rerunForce}
                  onChange={(e) => setRerunForce(e.target.checked)}
                  className="rounded border-slate-700 bg-slate-900 text-amber-500"
                />
                <label htmlFor="force-rerun-cb" className="text-slate-300 cursor-pointer">
                  Force re-run (overwrites existing frozen board idempotently)
                </label>
              </div>

              <div>
                <label className="text-slate-400 block mb-1">Audit Reason (Required):</label>
                <input
                  type="text"
                  value={rerunReason}
                  onChange={(e) => setRerunReason(e.target.value)}
                  placeholder="e.g. Manual verification of pre-17:00 grace submissions"
                  className="w-full p-2.5 rounded-xl bg-slate-900 border border-white/[0.1] text-white"
                />
              </div>

              <div>
                <label className="text-slate-400 block mb-1">Admin Password Re-authentication (Required):</label>
                <input
                  type="password"
                  value={rerunAdminPassword}
                  onChange={(e) => setRerunAdminPassword(e.target.value)}
                  placeholder="Enter administrator password"
                  className="w-full p-2.5 rounded-xl bg-slate-900 border border-white/[0.1] text-white"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-white/[0.08] font-mono text-xs">
              <button
                type="button"
                onClick={() => setIsRerunModalOpen(false)}
                className="px-4 py-2 rounded-xl text-slate-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={!rerunAdminPassword || !rerunReason || runFinalizationMutation.isPending}
                onClick={() =>
                  runFinalizationMutation.mutate({
                    dayId: rerunDayId || undefined,
                    forceRerun: rerunForce,
                    adminPassword: rerunAdminPassword,
                    reason: rerunReason,
                  })
                }
                className="px-5 py-2.5 rounded-xl font-bold bg-amber-500 text-slate-950 hover:bg-amber-400 disabled:opacity-40"
              >
                {runFinalizationMutation.isPending ? 'Executing...' : 'Confirm & Run Finalization'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Create Daily Correction Record */}
      {isCorrectionModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="w-full max-w-lg glass-card rounded-2xl border border-white/[0.1] shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-white/[0.08]">
              <h3 className="text-base font-bold text-white font-mono flex items-center gap-2">
                <FileText className="w-4 h-4 text-purple-400" />
                <span>Create Daily Correction Record</span>
              </h3>
              <button
                type="button"
                onClick={() => setIsCorrectionModalOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs font-mono text-slate-300 leading-relaxed">
              Creates an append-only correction record in the administrative ledger to adjust a student&apos;s daily result or verdict.
            </p>

            <div className="space-y-3 font-mono text-xs">
              <div>
                <label className="text-slate-400 block mb-1">Target Day ID (YYYY-MM-DD):</label>
                <input
                  type="text"
                  value={correctionForm.dayId}
                  onChange={(e) => setCorrectionForm({ ...correctionForm, dayId: e.target.value })}
                  placeholder="2026-10-12"
                  className="w-full p-2 rounded-xl bg-slate-900 border border-white/[0.1] text-white"
                />
              </div>

              <div>
                <label htmlFor="correction-student-prn" className="text-slate-400 block mb-1">
                  Student PRN / Username / ID:
                </label>
                <input
                  id="correction-student-prn"
                  type="text"
                  inputMode="text"
                  autoCapitalize="characters"
                  autoComplete="off"
                  autoCorrect="off"
                  spellCheck={false}
                  enterKeyHint="next"
                  value={correctionForm.studentPrnOrId}
                  onChange={(e) => setCorrectionForm({ ...correctionForm, studentPrnOrId: e.target.value.toUpperCase() })}
                  onPaste={(e) => {
                    e.preventDefault();
                    const pasted = e.clipboardData.getData('text');
                    setCorrectionForm((prev) => ({ ...prev, studentPrnOrId: pasted.trim().toUpperCase() }));
                  }}
                  onBlur={() =>
                    setCorrectionForm((prev) => ({
                      ...prev,
                      studentPrnOrId: prev.studentPrnOrId.trim().toUpperCase(),
                    }))
                  }
                  placeholder="e.g. 2199TESM0001 or student username"
                  className="w-full p-2 rounded-xl bg-slate-900 border border-white/[0.1] text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-400 block mb-1">New Verdict:</label>
                  <select
                    value={correctionForm.newVerdict}
                    onChange={(e) => setCorrectionForm({ ...correctionForm, newVerdict: e.target.value })}
                    className="w-full p-2 rounded-xl bg-slate-900 border border-white/[0.1] text-white"
                  >
                    <option value="ACCEPTED">ACCEPTED</option>
                    <option value="WRONG_ANSWER">WRONG_ANSWER</option>
                    <option value="REJECTED">REJECTED</option>
                  </select>
                </div>

                <div>
                  <label className="text-slate-400 block mb-1">Points Adjustment:</label>
                  <input
                    type="number"
                    value={correctionForm.pointsAdjustment}
                    onChange={(e) => setCorrectionForm({ ...correctionForm, pointsAdjustment: Number(e.target.value) })}
                    className="w-full p-2 rounded-xl bg-slate-900 border border-white/[0.1] text-white"
                  />
                </div>
              </div>

              <div>
                <label className="text-slate-400 block mb-1">Correction Reason (Mandatory):</label>
                <input
                  type="text"
                  value={correctionForm.reason}
                  onChange={(e) => setCorrectionForm({ ...correctionForm, reason: e.target.value })}
                  placeholder="e.g. Test case specification dispute approved"
                  className="w-full p-2 rounded-xl bg-slate-900 border border-white/[0.1] text-white"
                />
              </div>

              <div>
                <label className="text-slate-400 block mb-1">Admin Password Re-authentication (Required):</label>
                <input
                  type="password"
                  value={correctionForm.adminPassword}
                  onChange={(e) => setCorrectionForm({ ...correctionForm, adminPassword: e.target.value })}
                  placeholder="Enter administrator password"
                  className="w-full p-2 rounded-xl bg-slate-900 border border-white/[0.1] text-white"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-white/[0.08] font-mono text-xs">
              <button
                type="button"
                onClick={() => setIsCorrectionModalOpen(false)}
                className="px-4 py-2 rounded-xl text-slate-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={!correctionForm.adminPassword || !correctionForm.reason || !correctionForm.studentPrnOrId || createCorrectionMutation.isPending}
                onClick={() => createCorrectionMutation.mutate(correctionForm)}
                className="px-5 py-2.5 rounded-xl font-bold bg-purple-500 text-white hover:bg-purple-400 disabled:opacity-40"
              >
                {createCorrectionMutation.isPending ? 'Saving...' : 'Save Correction Record'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Toggle Pause Day */}
      {isPauseDayModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="w-full max-w-md glass-card rounded-2xl border border-white/[0.1] shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-white/[0.08]">
              <h3 className="text-base font-bold text-white font-mono flex items-center gap-2">
                <Calendar className="w-4 h-4 text-amber-400" />
                <span>Configure Admin Pause Day</span>
              </h3>
              <button
                type="button"
                onClick={() => setIsPauseDayModalOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs font-mono text-slate-300 leading-relaxed">
              Designate institutional holiday or exam days. Streaks do not break and streak freezes are not consumed on pause days.
            </p>

            <div className="space-y-3 font-mono text-xs">
              <div>
                <label className="text-slate-400 block mb-1">Date (YYYY-MM-DD):</label>
                <input
                  type="date"
                  value={pauseDayForm.dayStr}
                  onChange={(e) => setPauseDayForm({ ...pauseDayForm, dayStr: e.target.value })}
                  className="w-full p-2 rounded-xl bg-slate-900 border border-white/[0.1] text-white"
                />
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="pause-active-cb"
                  checked={pauseDayForm.paused}
                  onChange={(e) => setPauseDayForm({ ...pauseDayForm, paused: e.target.checked })}
                  className="rounded border-slate-700 bg-slate-900 text-amber-500"
                />
                <label htmlFor="pause-active-cb" className="text-slate-300 cursor-pointer">
                  Activate pause for this day
                </label>
              </div>

              <div>
                <label className="text-slate-400 block mb-1">Reason / Notes:</label>
                <input
                  type="text"
                  value={pauseDayForm.reason}
                  onChange={(e) => setPauseDayForm({ ...pauseDayForm, reason: e.target.value })}
                  placeholder="e.g. University Semester Examination"
                  className="w-full p-2 rounded-xl bg-slate-900 border border-white/[0.1] text-white"
                />
              </div>

              <div>
                <label className="text-slate-400 block mb-1">Admin Password Re-authentication (Required):</label>
                <input
                  type="password"
                  value={pauseDayForm.adminPassword}
                  onChange={(e) => setPauseDayForm({ ...pauseDayForm, adminPassword: e.target.value })}
                  placeholder="Enter administrator password"
                  className="w-full p-2 rounded-xl bg-slate-900 border border-white/[0.1] text-white"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-white/[0.08] font-mono text-xs">
              <button
                type="button"
                onClick={() => setIsPauseDayModalOpen(false)}
                className="px-4 py-2 rounded-xl text-slate-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={!pauseDayForm.adminPassword || !pauseDayForm.dayStr || togglePauseDayMutation.isPending}
                onClick={() => togglePauseDayMutation.mutate(pauseDayForm)}
                className="px-5 py-2.5 rounded-xl font-bold bg-amber-500 text-slate-950 hover:bg-amber-400 disabled:opacity-40"
              >
                {togglePauseDayMutation.isPending ? 'Updating...' : 'Save Pause Day'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: View Frozen Past Daily Board Standings */}
      {selectedPastBoard && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="w-full max-w-4xl glass-card rounded-2xl border border-white/[0.1] shadow-2xl p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-white/[0.08]">
              <div>
                <h3 className="text-base font-bold text-white font-mono flex items-center gap-2">
                  <Trophy className="w-4 h-4 text-amber-400" />
                  <span>Frozen Daily Board — {selectedPastBoard.dayId}</span>
                </h3>
                <p className="text-xs font-mono text-slate-400 mt-0.5">
                  Challenge: <span className="text-cyan-300 font-semibold">{selectedPastBoard.challengeTitle}</span> • Solvers: <span className="text-emerald-400 font-bold">{selectedPastBoard.totalSolvers}</span> • Finalized: <span className="text-slate-300">{new Date(selectedPastBoard.finalizedAt).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}</span>
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedPastBoard(null)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {!selectedPastBoard.top20?.length ? (
              <div className="p-8 text-center text-xs font-mono text-slate-500">
                No solvers recorded for this challenge day.
              </div>
            ) : (
              <div className="overflow-x-auto rounded-xl border border-white/[0.06]">
                <table className="w-full text-left text-xs font-mono">
                  <thead className="bg-dark-900 text-slate-400 uppercase text-[10px] tracking-wider border-b border-white/[0.06]">
                    <tr>
                      <th className="px-4 py-3">Rank</th>
                      <th className="px-4 py-3">Student</th>
                      <th className="px-4 py-3">Dept &amp; Year</th>
                      <th className="px-4 py-3">Accepted Time (IST)</th>
                      <th className="px-4 py-3">Wrong Attempts</th>
                      <th className="px-4 py-3">Streak</th>
                      <th className="px-4 py-3">Total Solved / Pts</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/[0.04]">
                    {selectedPastBoard.top20.map((entry: any) => (
                      <tr key={entry.userId} className="hover:bg-white/[0.02]">
                        <td className="px-4 py-3 font-bold text-amber-400">#{entry.rank}</td>
                        <td className="px-4 py-3">
                          <span className="font-bold text-white block">{entry.displayName || 'Student'}</span>
                          <span className="text-[10px] text-slate-400">{entry.maskedPrn || entry.email}</span>
                        </td>
                        <td className="px-4 py-3 text-cyan-300">
                          {entry.department || '—'} {entry.year ? `(${entry.year})` : ''}
                        </td>
                        <td className="px-4 py-3 text-slate-300">
                          {entry.acceptedAt ? new Date(entry.acceptedAt).toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata' }) : '—'}
                        </td>
                        <td className="px-4 py-3 text-rose-400 font-semibold">{entry.wrongAttemptsBeforeAc ?? 0}</td>
                        <td className="px-4 py-3 text-orange-400 font-bold">{entry.currentStreak ?? 0}d</td>
                        <td className="px-4 py-3 text-slate-300">
                          {entry.totalSolved ?? 0} / <span className="text-cyan-300 font-bold">{entry.totalPoints ?? 0} PTS</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <div className="flex justify-end pt-3 border-t border-white/[0.08]">
              <button
                type="button"
                onClick={() => setSelectedPastBoard(null)}
                className="px-4 py-2 rounded-xl text-xs font-mono font-bold bg-white/[0.05] text-slate-300 hover:bg-white/[0.1]"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
