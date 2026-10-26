import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../api/client.js';
import { DEFAULT_PROBLEMS } from '../../api/fallbackEngine.js';
import { DifficultyBadge, VerdictBadge } from '../../components/common/Badge.js';
import {
  ALLOWED_COLLEGES,
  ALLOWED_DEPARTMENTS,
  ALLOWED_YEARS,
} from '../../config/academic.config.js';
import { PRACTICE_CONFIG } from '../../config/practice.config.js';
import { PrnFormatGuide } from '../../components/common/PrnFormatGuide.js';
import { StatementMarkdown } from '../../components/common/StatementMarkdown.js';
import { sanitizeMathInStatement } from '../../utils/sanitizeMathInStatement.js';
import { FirestoreDataService } from '../../services/firestoreData.service.js';
import { RealtimeSyncService } from '../../services/realtimeSync.service.js';
import { doc, setDoc, updateDoc, deleteDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../config/firebase.js';
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
  GraduationCap,
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
  Zap,
  Sparkles,
  Clock,
  ShieldAlert,
  BookOpen,
  Copy,
  Check,
  Mail,
  UserCheck,
  List,
  Layers,
  Cpu,
  Database,
  Server,
  Terminal,
} from 'lucide-react';
import { Difficulty, Verdict } from '../../types/index.js';
import { AdminPracticeAnalytics } from '../../components/admin/AdminPracticeAnalytics.js';
import { AdminAntiCheatSecurity } from '../../components/admin/AdminAntiCheatSecurity.js';
import { formatPracticeTime } from '../../components/practice/PracticeTimer.js';
import { SectionManagementPage } from '../faculty/SectionManagementPage.js';
import { StudentActivityInspectorModal } from '../../components/admin/StudentActivityInspectorModal.js';

export const AdminDashboardPage: React.FC = () => {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<
    'problems' | 'submissions' | 'uploads' | 'checkers' | 'users' | 'analytics' | 'practice' | 'daily' | 'system' | 'anticheat' | 'sections'
  >('users');

  const [healthLatencyMs, setHealthLatencyMs] = useState<number | null>(null);
  const [probeResult, setProbeResult] = useState<any | null>(null);

  const { data: healthData, isLoading: isHealthLoading, refetch: refetchHealth, isFetching: isHealthFetching } = useQuery({
    queryKey: ['system-health'],
    queryFn: async () => {
      const start = performance.now();
      const res = await api.get<{
        status: string;
        app: string;
        version: string;
        judge?: { status: string; name: string; ready: boolean };
        timestamp: string;
      }>('/health');
      setHealthLatencyMs(Math.round(performance.now() - start));
      return res;
    },
    refetchInterval: activeTab === 'system' ? 10000 : false,
  });

  const { data: diagnosticsData, isLoading: isDiagnosticsLoading, refetch: refetchDiagnostics, isFetching: isDiagnosticsFetching } = useQuery({
    queryKey: ['admin-system-diagnostics'],
    queryFn: async () => {
      const res = await api.get<any>('/admin/system/diagnostics');
      return res.data;
    },
    enabled: activeTab === 'system',
    refetchInterval: activeTab === 'system' ? 15000 : false,
  });

  const runProbeMutation = useMutation({
    mutationFn: async () => {
      const res = await api.post<any>('/admin/system/probe');
      return res.data;
    },
    onSuccess: (data) => {
      setProbeResult(data);
      if (data.passed) {
        toast.success(`C11 Compiler Probe Passed! Executed in ${data.runtimeMs}ms`);
      } else {
        toast.error(`Compiler Probe Failed: ${data.verdict}`);
      }
    },
    onError: (err: any) => {
      toast.error(err.message || 'Failed to run compiler probe');
    },
  });

  // Filter States for Users & Submissions & Uploads
  const [filterSearch, setFilterSearch] = useState('');
  const [filterRole, setFilterRole] = useState<'ALL' | 'STUDENT' | 'FACULTY' | 'ADMIN' | 'DELETED'>('ALL');
  const [copiedEmailId, setCopiedEmailId] = useState<string | null>(null);
  const [filterSectionId, setFilterSectionId] = useState('ALL');
  const [filterCollege, setFilterCollege] = useState('ALL');
  const [filterDepartment, setFilterDepartment] = useState('ALL');
  const [filterYear, setFilterYear] = useState('ALL');
  const [filterDivision, setFilterDivision] = useState('');
  const [filterUploadStatus, setFilterUploadStatus] = useState('ALL');
  const [filterSuspicionFlag, setFilterSuspicionFlag] = useState('ALL');

  // Modal States
  const [isCreateProblemOpen, setIsCreateProblemOpen] = useState(false);
  const [editingProblem, setEditingProblem] = useState<any | null>(null);
  const [statementTab, setStatementTab] = useState<'EDIT' | 'PREVIEW'>('EDIT');
  const [schedulingProblem, setSchedulingProblem] = useState<any | null>(null);
  const [scheduleDate, setScheduleDate] = useState<string>(() => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  });
  const [inspectingProblem, setInspectingProblem] = useState<any | null>(null);
  const [problemSearch, setProblemSearch] = useState('');
  const [problemCategoryFilter, setProblemCategoryFilter] = useState<'ALL' | 'BOOK' | 'PRACTICE' | 'DAILY'>('ALL');
  const [problemDifficultyFilter, setProblemDifficultyFilter] = useState<'ALL' | 'EASY' | 'MEDIUM' | 'HARD'>('ALL');
  const [problemPage, setProblemPage] = useState(1);
  const [problemViewMode, setProblemViewMode] = useState<'TABLE' | 'MODULES'>('TABLE');
  const PROBLEMS_PER_PAGE = 20;
  const [isSyncingProblems, setIsSyncingProblems] = useState(false);
  const [submissionSearch, setSubmissionSearch] = useState('');
  const [submissionVerdictFilter, setSubmissionVerdictFilter] = useState('ALL');
  const [submissionProblemFilter, setSubmissionProblemFilter] = useState('ALL');
  const [submissionPage, setSubmissionPage] = useState(1);
  const SUBMISSIONS_PER_PAGE = 20;
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

  const STANDARD_C_CATEGORIES = [
    'C Fundamentals & Data Types',
    'Control Flow & Loops',
    'Functions & Recursion',
    '1D & 2D Arrays',
    'Strings & Character Manipulation',
    'Pointers & Dynamic Memory',
    'Structures & Unions',
    'File I/O & Bitwise',
    'Algorithms & Math',
  ];

  // New Problem Form State
  const [problemForm, setProblemForm] = useState({
    title: '',
    slug: '',
    difficulty: 'MEDIUM' as Difficulty,
    category: 'C Fundamentals & Data Types',
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
    mutationFn: (vars?: { reason?: string; adminPassword?: string }) =>
      api.post('/admin/daily-system/pause', {
        adminPassword: vars?.adminPassword || dailyAdminPassword || '',
        reason: vars?.reason || dailyAdminReason || 'Admin paused daily challenge timer',
      }),
    onSuccess: () => {
      toast.success('⏸️ Daily challenge timer paused (OFF).');
      setIsPauseModalOpen(false);
      setDailyAdminPassword('');
      setDailyAdminReason('');
      refetchDailySystem();
      queryClient.invalidateQueries({ queryKey: ['admin-daily-system-preview'] });
      queryClient.invalidateQueries({ queryKey: ['daily-problem'] });
      RealtimeSyncService.emit('DAILY');
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || err?.message || 'Failed to pause daily system.');
    },
  });

  const resumeDailyMutation = useMutation({
    mutationFn: (vars?: { mode?: 'NEXT_1700' | 'START_NOW'; reason?: string; adminPassword?: string }) =>
      api.post('/admin/daily-system/resume', {
        adminPassword: vars?.adminPassword || dailyAdminPassword || '',
        mode: vars?.mode || dailyResumeMode || 'START_NOW',
        reason: vars?.reason || dailyAdminReason || 'Admin activated daily challenge timer',
      }),
    onSuccess: () => {
      toast.success('▶️ Daily challenge timer resumed (ON)!');
      setIsResumeModalOpen(false);
      setDailyAdminPassword('');
      setDailyAdminReason('');
      refetchDailySystem();
      queryClient.invalidateQueries({ queryKey: ['admin-daily-system-preview'] });
      queryClient.invalidateQueries({ queryKey: ['daily-problem'] });
      RealtimeSyncService.emit('DAILY');
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || err?.message || 'Failed to resume daily system.');
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
    params.set('limit', '200');
    if (filterSearch.trim()) params.set('search', filterSearch.trim());
    if (filterSectionId !== 'ALL') params.set('sectionId', filterSectionId);
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

  // Fetch Problems (Real-time auto-sync)
  const { data: problemsData } = useQuery({
    queryKey: ['admin-problems'],
    queryFn: () => api.get('/admin/problems'),
    refetchInterval: 12000,
  });

  const { data: firestoreProblemsData } = useQuery({
    queryKey: ['firestore-problems'],
    queryFn: () => FirestoreDataService.getProblems(),
    refetchInterval: 15000,
  });

  // Fetch Submissions (Live Auto-Feed every 5 seconds)
  const { data: submissionsData } = useQuery({
    queryKey: ['admin-submissions', filterSearch, filterDepartment, filterYear, filterDivision],
    queryFn: () => api.get(`/admin/submissions?${buildFilterQuery()}`),
    refetchInterval: 5000,
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
    refetchInterval: 8000,
  });

  // Fetch Sections for filtering and roster enrichment
  const { data: sectionsData } = useQuery({
    queryKey: ['admin-sections-list'],
    queryFn: async () => {
      const [fsSections, backendRes] = await Promise.all([
        FirestoreDataService.getSectionsFromFirestore().catch(() => []),
        api.get('/sections').catch(() => null),
      ]);
      const sectionMap = new Map<string, any>();
      (backendRes?.data?.sections || backendRes?.sections || []).forEach((s: any) => {
        const key = s.id || s.joinCode;
        if (key) sectionMap.set(key, s);
      });
      (fsSections || []).forEach((fs: any) => {
        const key = fs.id || fs.joinCode;
        if (key) {
          const existing = sectionMap.get(key) || {};
          const mergedStudents = (Array.isArray(fs.students) && fs.students.length > 0)
            ? fs.students
            : (existing.students || []);
          sectionMap.set(key, {
            ...existing,
            ...fs,
            students: mergedStudents,
            _count: { students: Math.max(mergedStudents.length, fs._count?.students || 0, existing._count?.students || 0) },
          });
        }
      });
      return Array.from(sectionMap.values()).filter(
        (s: any) => !FirestoreDataService.isSectionDeleted(s.id, s.joinCode) && !FirestoreDataService.isLegacyDemoSection(s)
      );
    },
    refetchInterval: 8000,
  });
  const sectionsList: any[] = sectionsData || [];

  // Fetch Users from Backend
  const { data: usersData } = useQuery({
    queryKey: [
      'admin-users',
      filterSearch,
      filterSectionId,
      filterCollege,
      filterDepartment,
      filterYear,
      filterDivision,
    ],
    queryFn: () => api.get(`/admin/users?${buildFilterQuery()}`),
    refetchInterval: 10000,
  });

  // Fetch Authoritative Student Roster from Google Cloud Firestore
  const { data: firestoreUsersData } = useQuery({
    queryKey: ['admin-firestore-users'],
    queryFn: async () => {
      return await FirestoreDataService.getAllFirestoreUsers();
    },
    refetchInterval: 10000,
  });

  // Fetch Checkers
  const { data: checkersData } = useQuery({
    queryKey: ['admin-checkers'],
    queryFn: () => api.get('/admin/checkers'),
  });

  const [isSyncingFirestore, setIsSyncingFirestore] = useState(false);

  const handleSyncFirestoreToBackend = async () => {
    setIsSyncingFirestore(true);
    try {
      const fUsers = await FirestoreDataService.getAllFirestoreUsers();
      if (!fUsers || fUsers.length === 0) {
        toast.info('No registered student profiles found in Firestore.');
        return;
      }
      toast.loading(`Restoring ${fUsers.length} student profiles from Cloud Firestore...`, { id: 'sync-firestore' });
      const res = await api.post('/admin/users/sync-firestore', { users: fUsers });
      toast.success(res?.message || `Successfully synced ${fUsers.length} students into database!`, { id: 'sync-firestore' });
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      queryClient.invalidateQueries({ queryKey: ['admin-analytics'] });
    } catch (err: any) {
      toast.error(err?.message || 'Failed to sync users from Firestore.', { id: 'sync-firestore' });
    } finally {
      setIsSyncingFirestore(false);
    }
  };

  // Real-time synchronization across all portals and tabs
  React.useEffect(() => {
    const unsubUsers = RealtimeSyncService.on('USERS', () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      queryClient.invalidateQueries({ queryKey: ['admin-firestore-users'] });
      queryClient.invalidateQueries({ queryKey: ['admin-sections-list'] });
    });
    const unsubSections = RealtimeSyncService.on('SECTIONS', () => {
      queryClient.invalidateQueries({ queryKey: ['admin-sections-list'] });
      queryClient.invalidateQueries({ queryKey: ['admin-firestore-users'] });
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
    });
    const unsubSubmissions = RealtimeSyncService.on('SUBMISSIONS', () => {
      queryClient.invalidateQueries({ queryKey: ['admin-submissions'] });
      queryClient.invalidateQueries({ queryKey: ['admin-analytics'] });
    });
    const unsubProblems = RealtimeSyncService.on('PROBLEMS', () => {
      queryClient.invalidateQueries({ queryKey: ['admin-problems'] });
    });
    const unsubTests = RealtimeSyncService.on('TESTS', () => {
      queryClient.invalidateQueries({ queryKey: ['admin-analytics'] });
    });
    return () => {
      unsubUsers();
      unsubSections();
      unsubSubmissions();
      unsubProblems();
      unsubTests();
    };
  }, [queryClient]);

  // Background auto-healing: If backend SQLite was restarted/wiped by Render, automatically restore all Firestore students!
  React.useEffect(() => {
    if (firestoreUsersData && firestoreUsersData.length > 0) {
      const activeFUsers = firestoreUsersData.filter((u: any) => !FirestoreDataService.isPurgedStudent(u));
      const backendCount = usersData?.data?.users?.length || 0;
      if (activeFUsers.length > 0 && backendCount < activeFUsers.length) {
        api.post('/admin/users/sync-firestore', { users: activeFUsers })
          .then(() => {
            queryClient.invalidateQueries({ queryKey: ['admin-users'] });
          })
          .catch(() => {});
      }
    }
  }, [firestoreUsersData, usersData, queryClient]);

  const overview = analyticsData?.data?.overview;
  const pilotAnalytics = analyticsData?.data?.pilotAnalytics;
  const departmentBreakdown = analyticsData?.data?.departmentBreakdown || [];
  const yearBreakdown = analyticsData?.data?.yearBreakdown || [];
  // Resilient problem pool combining backend, Firestore, and Yashavant Kanetkar Book Bank
  const rawProblems = React.useMemo(() => {
    const backendProblems = problemsData?.data?.problems || [];
    if (backendProblems.length > 0) return backendProblems;

    if (firestoreProblemsData && firestoreProblemsData.length > 0) {
      return firestoreProblemsData;
    }

    return DEFAULT_PROBLEMS;
  }, [problemsData, firestoreProblemsData]);

  const problems = rawProblems;

  // Auto-seed Firestore with default problems if cloud collection is empty
  React.useEffect(() => {
    if (firestoreProblemsData && firestoreProblemsData.length === 0 && rawProblems.length > 0) {
      FirestoreDataService.syncProblems(rawProblems).catch(() => {});
    }
  }, [firestoreProblemsData, rawProblems]);

  // Clean up deprecated legacy daily problem from Firestore if present
  React.useEffect(() => {
    if (firestoreProblemsData && firestoreProblemsData.some((p: any) => p.slug === 'daily-longest-unique-substring' || p.id === 'daily-longest-unique-substring')) {
      FirestoreDataService.deleteProblem('daily-longest-unique-substring').catch(() => {});
    }
  }, [firestoreProblemsData]);

  const filteredProblems = React.useMemo(() => {
    return rawProblems.filter((p: any) => {
      if (problemCategoryFilter === 'BOOK') {
        const isBook = p.sourceType === 'BOOK' || p.slug?.startsWith('kanetkar-');
        if (!isBook) return false;
      } else if (problemCategoryFilter === 'PRACTICE') {
        const isPractice = p.isPractice || p.sourceType === 'PRACTICE' || p.slug?.startsWith('practice-');
        if (!isPractice) return false;
      } else if (problemCategoryFilter === 'DAILY') {
        if (!p.isDaily && !p.slug?.includes('daily')) return false;
      }

      if (problemDifficultyFilter !== 'ALL') {
        if (p.difficulty !== problemDifficultyFilter) return false;
      }

      if (problemSearch.trim()) {
        const q = problemSearch.toLowerCase().trim();
        const matchesTitle = p.title?.toLowerCase().includes(q);
        const matchesSlug = p.slug?.toLowerCase().includes(q);
        const matchesCategory = p.category?.toLowerCase().includes(q);
        const matchesTag = Array.isArray(p.tags) && p.tags.some((t: string) => t.toLowerCase().includes(q));
        if (!matchesTitle && !matchesSlug && !matchesCategory && !matchesTag) return false;
      }

      return true;
    });
  }, [rawProblems, problemCategoryFilter, problemDifficultyFilter, problemSearch]);

  React.useEffect(() => {
    setProblemPage(1);
  }, [problemCategoryFilter, problemDifficultyFilter, problemSearch]);

  const totalProblemPages = Math.ceil(filteredProblems.length / PROBLEMS_PER_PAGE) || 1;
  const paginatedProblems = React.useMemo(() => {
    const start = (problemPage - 1) * PROBLEMS_PER_PAGE;
    return filteredProblems.slice(start, start + PROBLEMS_PER_PAGE);
  }, [filteredProblems, problemPage]);

  const getModuleBadge = (p: any) => {
    const isBook = p.sourceType === 'BOOK' || p.slug?.startsWith('kanetkar-');
    const isPractice = p.isPractice || p.sourceType === 'PRACTICE' || p.slug?.startsWith('practice-');
    const isDaily = p.isDaily || p.slug?.includes('daily');

    if (isBook) {
      return (
        <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-medium bg-amber-500/10 text-amber-300 border border-amber-500/30 whitespace-nowrap">
          📚 Kanetkar Book
        </span>
      );
    }

    if (isPractice) {
      const slug = (p.moduleSlug || '').toLowerCase();
      let modLabel = 'Practice Module';
      if (slug.includes('control')) modLabel = 'Module 1: Control';
      else if (slug.includes('pointer') || slug.includes('function')) modLabel = 'Module 2: Pointers';
      else if (slug.includes('array')) modLabel = 'Module 3: Arrays';
      else if (slug.includes('dynamic') || slug.includes('advanced')) modLabel = 'Module 4: Dynamic Mem';
      else if (p.moduleSlug) modLabel = `Module ${p.moduleSlug.replace(/[^0-9]/g, '') || ''}`;

      return (
        <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-medium bg-purple-500/10 text-purple-300 border border-purple-500/30 whitespace-nowrap">
          🧩 {modLabel}
        </span>
      );
    }

    if (isDaily) {
      return (
        <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-medium bg-emerald-500/10 text-emerald-300 border border-emerald-500/30 whitespace-nowrap">
          ⚡ Daily Challenge
        </span>
      );
    }

    return null;
  };
  const submissions = submissionsData?.data?.submissions || [];

  // Submissions Filtering & Pagination
  const filteredSubmissions = React.useMemo(() => {
    return submissions.filter((sub: any) => {
      if (submissionVerdictFilter !== 'ALL' && sub.verdict !== submissionVerdictFilter) return false;
      if (submissionProblemFilter !== 'ALL' && sub.problemId !== submissionProblemFilter && sub.problem?.title !== submissionProblemFilter) return false;
      if (submissionSearch.trim()) {
        const q = submissionSearch.toLowerCase().trim();
        const prn = (sub.user?.prn || '').toLowerCase();
        const name = (sub.user?.displayName || sub.user?.fullName || sub.user?.username || '').toLowerCase();
        const title = (sub.problem?.title || '').toLowerCase();
        if (!prn.includes(q) && !name.includes(q) && !title.includes(q)) return false;
      }
      return true;
    });
  }, [submissions, submissionVerdictFilter, submissionProblemFilter, submissionSearch]);

  const totalSubmissionPages = Math.ceil(filteredSubmissions.length / SUBMISSIONS_PER_PAGE) || 1;
  const paginatedSubmissions = React.useMemo(() => {
    const start = (submissionPage - 1) * SUBMISSIONS_PER_PAGE;
    return filteredSubmissions.slice(start, start + SUBMISSIONS_PER_PAGE);
  }, [filteredSubmissions, submissionPage]);

  const submissionMetrics = React.useMemo(() => {
    let accepted = 0;
    let wrong = 0;
    let errors = 0;
    submissions.forEach((s: any) => {
      if (s.verdict === 'ACCEPTED') accepted++;
      else if (s.verdict === 'WRONG_ANSWER') wrong++;
      else errors++;
    });
    return { total: submissions.length, accepted, wrong, errors };
  }, [submissions]);

  const submissionProblemOptions = React.useMemo(() => {
    const map = new Map<string, string>();
    submissions.forEach((s: any) => {
      const pid = s.problemId || s.problem?.id;
      const title = s.problem?.title;
      if (pid && title) {
        map.set(pid, title);
      }
    });
    return Array.from(map.entries()).map(([id, title]) => ({ id, title }));
  }, [submissions]);

  const uploads = uploadsData?.data?.uploads || [];

  // Resilient merged users list: combines backend users with Firestore users and enriches names
  const { allMergedUsers, users, roleCounts } = React.useMemo(() => {
    const backendUsers = (usersData?.data?.users || []).filter(
      (u: any) => !FirestoreDataService.isPurgedStudent(u)
    );
    const fUsers: any[] = (firestoreUsersData || []).filter(
      (u: any) => !FirestoreDataService.isPurgedStudent(u)
    );

    const isRawSystemId = (val?: string | null) => {
      if (!val || typeof val !== 'string') return false;
      const trimmed = val.trim();
      if (trimmed.length === 25 && trimmed.startsWith('c')) return true;
      if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(trimmed)) return true;
      if (trimmed.length === 28 && /^[a-zA-Z0-9_-]+$/.test(trimmed) && !trimmed.includes(' ')) return true;
      return false;
    };

    // 1. Enrich backend users with Firestore real names & clean handles
    const enrichedBackend = backendUsers.map((bu: any) => {
      const buEmail = bu.email?.toLowerCase().trim();
      const buPrn = bu.prn?.toUpperCase().trim();
      const fu = fUsers.find(
        (f: any) =>
          (buEmail && f.email?.toLowerCase().trim() === buEmail) ||
          (buPrn && f.prn?.toUpperCase().trim() === buPrn)
      );

      const resolvedName =
        (fu?.fullName && !isRawSystemId(fu.fullName) ? fu.fullName : '') ||
        (fu?.name && !isRawSystemId(fu.name) ? fu.name : '') ||
        (bu.fullName && !isRawSystemId(bu.fullName) ? bu.fullName : '') ||
        (fu?.displayName && !isRawSystemId(fu.displayName) ? fu.displayName : '') ||
        (bu.displayName && !isRawSystemId(bu.displayName) ? bu.displayName : '') ||
        (bu.prn ? `Student ${bu.prn.slice(-4)}` : (bu.email ? bu.email.split('@')[0] : 'Student'));

      const cleanUsername =
        (!isRawSystemId(bu.username) && bu.username) ? bu.username :
        (fu?.username && !isRawSystemId(fu.username) ? fu.username :
        (bu.email ? bu.email.split('@')[0] : resolvedName.toLowerCase().replace(/\s+/g, '_')));

      const role = ((bu.role || fu?.role || 'STUDENT') as string).toUpperCase();

      // Resolve assigned sections for faculty and enrolled sections for students
      const userSections = Array.isArray(bu.sections) ? [...bu.sections] : [];
      if (role === 'FACULTY') {
        const matchedFacultySections = sectionsList.filter(
          (sec: any) =>
            sec.facultyId === bu.id ||
            sec.facultyId === fu?.id ||
            sec.facultyId === fu?.uid ||
            (buEmail && (sec.facultyEmail === buEmail || sec.faculty?.email === buEmail))
        );
        matchedFacultySections.forEach((ms: any) => {
          if (!userSections.some((us: any) => us.id === ms.id || us.joinCode === ms.joinCode)) {
            userSections.push({
              id: ms.id,
              sectionName: ms.sectionName || ms.name || ms.subject || 'Academic Section',
              joinCode: ms.joinCode,
              subject: ms.subject,
              course: ms.course,
            });
          }
        });
      } else {
        const matchedStudentSections = sectionsList.filter(
          (sec: any) =>
            Array.isArray(sec.students) &&
            sec.students.some((st: any) =>
              (buEmail && st.email?.toLowerCase().trim() === buEmail) ||
              (buPrn && st.prn?.toUpperCase().trim() === buPrn)
            )
        );
        matchedStudentSections.forEach((ms: any) => {
          if (!userSections.some((us: any) => us.id === ms.id || us.joinCode === ms.joinCode)) {
            userSections.push({
              id: ms.id,
              sectionName: ms.sectionName || ms.name || ms.subject,
              joinCode: ms.joinCode,
              subject: ms.subject,
              course: ms.course,
            });
          }
        });
      }

      return {
        ...(fu || {}),
        ...bu,
        role,
        sections: userSections,
        fullName: resolvedName,
        displayName: resolvedName,
        username: bu.username,
        cleanUsername,
        department: fu?.department || bu.department || (role === 'FACULTY' ? 'Integrated M.Tech' : '—'),
        year: fu?.year || bu.year || '—',
        division: fu?.division || bu.division || null,
        college: fu?.college || bu.college || 'Sanjivani University',
        prn: fu?.prn || bu.prn,
      };
    });

    // 2. Add any Firestore users not present in backend
    const backendEmails = new Set(enrichedBackend.map((u: any) => u.email?.toLowerCase().trim()).filter(Boolean));
    const missingFromBackend = fUsers.filter(
      (fu: any) => fu.email && !backendEmails.has(fu.email.toLowerCase().trim())
    ).map((fu: any) => {
      const fuEmail = fu.email?.toLowerCase().trim();
      const fuPrn = fu.prn?.toUpperCase().trim();
      const resolvedName =
        (fu.fullName && !isRawSystemId(fu.fullName) ? fu.fullName : '') ||
        (fu.name && !isRawSystemId(fu.name) ? fu.name : '') ||
        (fu.displayName && !isRawSystemId(fu.displayName) ? fu.displayName : '') ||
        (fu.prn ? `Student ${fu.prn.slice(-4)}` : (fu.email ? fu.email.split('@')[0] : 'Student'));
      const cleanUsername = !isRawSystemId(fu.username) && fu.username
        ? fu.username
        : (fu.email ? fu.email.split('@')[0] : resolvedName.toLowerCase().replace(/\s+/g, '_'));
      const role = ((fu.role || 'STUDENT') as string).toUpperCase();

      const userSections: any[] = [];
      if (role === 'FACULTY') {
        const matchedFacultySections = sectionsList.filter(
          (sec: any) =>
            sec.facultyId === fu.id ||
            sec.facultyId === fu.uid ||
            (fuEmail && (sec.facultyEmail === fuEmail || sec.faculty?.email === fuEmail))
        );
        matchedFacultySections.forEach((ms: any) => {
          if (!userSections.some((us: any) => us.id === ms.id || us.joinCode === ms.joinCode)) {
            userSections.push({
              id: ms.id,
              sectionName: ms.sectionName || ms.name || ms.subject || 'Academic Section',
              joinCode: ms.joinCode,
              subject: ms.subject,
              course: ms.course,
            });
          }
        });
      }

      return {
        ...fu,
        role,
        sections: userSections,
        fullName: resolvedName,
        displayName: resolvedName,
        cleanUsername,
      };
    });

    // 3. Extract and include students enrolled in any section who are not yet in backend or fUsers
    const existingEmails = new Set(
      [...enrichedBackend, ...missingFromBackend].map((u: any) => u.email?.toLowerCase().trim()).filter(Boolean)
    );
    const existingPrns = new Set(
      [...enrichedBackend, ...missingFromBackend].map((u: any) => u.prn?.toUpperCase().trim()).filter(Boolean)
    );

    const sectionEnrolledStudents: any[] = [];
    sectionsList.forEach((sec: any) => {
      const secStudents = Array.isArray(sec.students) ? sec.students : [];
      secStudents.forEach((st: any) => {
        if (!st || FirestoreDataService.isPurgedStudent(st)) return;
        const stEmail = String(st.email || st.student?.email || '').toLowerCase().trim();
        const stPrn = String(st.prn || st.student?.prn || '').toUpperCase().trim();
        
        if ((stEmail && existingEmails.has(stEmail)) || (stPrn && existingPrns.has(stPrn))) {
          return;
        }
        if (stEmail) existingEmails.add(stEmail);
        if (stPrn) existingPrns.add(stPrn);

        const shortId = stPrn ? stPrn.slice(-4) : (stEmail ? stEmail.slice(0, 4) : '0000');
        const resolvedName = st.name || st.fullName || st.student?.fullName || st.student?.displayName || (stPrn ? `Student ${shortId}` : 'Enrolled Student');
        const cleanUsername = stEmail ? stEmail.split('@')[0] : `stu_${shortId}`;

        sectionEnrolledStudents.push({
          id: st.id || st.uid || `stu_${stPrn || stEmail || Date.now()}`,
          fullName: resolvedName,
          displayName: resolvedName,
          username: cleanUsername,
          cleanUsername,
          email: stEmail || '—',
          prn: stPrn || null,
          maskedPrn: stPrn ? `••••••••${shortId}` : '••••••••',
          role: 'STUDENT',
          department: st.department || sec.course || sec.subject || '—',
          year: st.year || '—',
          division: st.division || sec.sectionName || null,
          college: st.college || st.institution || 'Sanjivani University',
          sections: [{
            id: sec.id,
            sectionName: sec.sectionName || sec.name || sec.subject || 'Academic Section',
            joinCode: sec.joinCode,
            subject: sec.subject,
            course: sec.course,
          }],
          sectionId: sec.id,
          sectionName: sec.sectionName || sec.name,
          accountState: 'ENROLLED',
          profileComplete: true,
          totalPoints: Number(st.totalPoints ?? st.student?.totalPoints ?? 0),
          currentStreak: Number(st.currentStreak ?? st.student?.currentStreak ?? 0),
          longestStreak: Number(st.longestStreak ?? st.student?.longestStreak ?? 0),
        });
      });
    });

    const isDeletedAccount = (u: any): boolean => {
      if (!u) return false;
      if (u.isDeleted === true) return true;
      if (u.accountState === 'DELETED') return true;
      if (u.fullName === 'Deleted Account' || u.displayName === 'Deleted Account') return true;
      const email = String(u.email || '').toLowerCase().trim();
      if (email.startsWith('deleted_') || email.includes('@anonymized.invalid')) return true;
      const username = String(u.username || '').toLowerCase().trim();
      if (username.startsWith('deleted_')) return true;
      return false;
    };

    const all = [...enrichedBackend, ...missingFromBackend, ...sectionEnrolledStudents].filter(
      (u: any) => !FirestoreDataService.isPurgedStudent(u)
    );

    const activeList = all.filter((u: any) => !isDeletedAccount(u));
    const deletedList = all.filter((u: any) => isDeletedAccount(u));

    const counts = {
      ALL: activeList.length,
      STUDENT: activeList.filter((u: any) => (u.role || 'STUDENT').toUpperCase() === 'STUDENT').length,
      FACULTY: activeList.filter((u: any) => (u.role || '').toUpperCase() === 'FACULTY').length,
      ADMIN: activeList.filter((u: any) => (u.role || '').toUpperCase() === 'ADMIN').length,
      DELETED: deletedList.length,
    };

    let baseList = filterRole === 'DELETED' ? deletedList : activeList;
    let merged = baseList;

    if (filterSearch) {
      const q = filterSearch.toLowerCase();
      merged = merged.filter(
        (u) =>
          u.prn?.toLowerCase().includes(q) ||
          u.email?.toLowerCase().includes(q) ||
          u.displayName?.toLowerCase().includes(q) ||
          u.fullName?.toLowerCase().includes(q) ||
          u.username?.toLowerCase().includes(q)
      );
    }
    if (filterSectionId && filterSectionId !== 'ALL') {
      merged = merged.filter((u: any) => {
        if (u.sectionId === filterSectionId) return true;
        if (Array.isArray(u.sections) && u.sections.some((s: any) => s.id === filterSectionId || s.joinCode === filterSectionId)) return true;
        if (Array.isArray(u.enrolledSections) && u.enrolledSections.some((es: any) => es.sectionId === filterSectionId || es.section?.id === filterSectionId || es.section?.joinCode === filterSectionId)) return true;
        return false;
      });
    }
    if (filterDepartment && filterDepartment !== 'ALL') {
      merged = merged.filter((u) => u.department === filterDepartment);
    }
    if (filterYear && filterYear !== 'ALL') {
      merged = merged.filter((u) => u.year === filterYear);
    }
    

    let filtered = merged;
    if (filterRole && filterRole !== 'ALL' && filterRole !== 'DELETED') {
      filtered = merged.filter((u: any) => (u.role || 'STUDENT').toUpperCase() === filterRole);
    }

    return { allMergedUsers: all, users: filtered, roleCounts: counts };
  }, [usersData, firestoreUsersData, sectionsList, filterSearch, filterSectionId, filterDepartment, filterYear, filterDivision, filterRole]);

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
      setEditingProblem(null);
      queryClient.invalidateQueries({ queryKey: ['admin-problems'] });
      RealtimeSyncService.emit('PROBLEMS');
    },
    onError: (err: any) => toast.error(err.message || 'Failed to create problem'),
  });

  const updateProblemMutation = useMutation({
    mutationFn: ({ id, body }: { id: string; body: any }) => api.put(`/admin/problems/${id}`, body),
    onSuccess: () => {
      toast.success('Problem updated successfully!');
      setIsCreateProblemOpen(false);
      setEditingProblem(null);
      queryClient.invalidateQueries({ queryKey: ['admin-problems'] });
      RealtimeSyncService.emit('PROBLEMS');
    },
    onError: (err: any) => toast.error(err.message || 'Failed to update problem'),
  });

  const deleteProblemMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/admin/problems/${id}`),
    onSuccess: () => {
      toast.success('Problem deleted');
      queryClient.invalidateQueries({ queryKey: ['admin-problems'] });
      RealtimeSyncService.emit('PROBLEMS');
    },
  });

  const rejudgeMutation = useMutation({
    mutationFn: (id: string) => api.post(`/admin/submissions/${id}/rejudge`),
    onSuccess: () => {
      toast.info('Submission queued for re-judging');
      queryClient.invalidateQueries({ queryKey: ['admin-submissions'] });
      RealtimeSyncService.emit('SUBMISSIONS');
    },
  });

  const banMutation = useMutation({
    mutationFn: ({ id, isBanned }: { id: string; isBanned: boolean }) =>
      api.put(`/admin/users/${id}/ban`, { isBanned }),
    onSuccess: () => {
      toast.success('User status updated');
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      RealtimeSyncService.emit('USERS');
    },
  });

  const roleMutation = useMutation({
    mutationFn: ({ id, role }: { id: string; role: string }) =>
      api.put(`/admin/users/${id}/role`, { role }),
    onSuccess: () => {
      toast.success('User role updated');
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      RealtimeSyncService.emit('USERS');
    },
  });

  const auditedPrnMutation = useMutation({
    mutationFn: ({ id, body }: { id: string; body: any }) =>
      api.put(`/admin/users/${id}/prn`, body),
    onSuccess: () => {
      toast.success('Student PRN & academic record updated and logged in audit trail.');
      setEditingAcademicUser(null);
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      RealtimeSyncService.emit('USERS');
    },
    onError: (err: any) => {
      toast.error(err.message || 'Failed to update student PRN');
    },
  });

  const deleteUserMutation = useMutation({
    mutationFn: async (u: any) => {
      try {
        await api.delete(`/admin/users/${u.id}`);
      } catch (err: any) {
        console.warn('Backend user delete warning:', err);
      }
      try {
        if (u.id) {
          const userDocRef = doc(db, 'users', u.id);
          await setDoc(userDocRef, {
            accountState: 'DELETED',
            isDeleted: true,
            fullName: 'Deleted Account',
            displayName: 'Deleted Account',
            updatedAt: serverTimestamp(),
          }, { merge: true }).catch(() => {});
        }
        if (u.email || u.prn) {
          const key = (u.email || u.prn).trim().toLowerCase().replace(/[^a-z0-9]/g, '_');
          await deleteDoc(doc(db, 'enrolled_students', key)).catch(() => {});
        }
      } catch (fErr) {
        console.warn('Firestore user delete warning:', fErr);
      }
      return u;
    },
    onSuccess: (u) => {
      toast.success(`Account for ${u.displayName || u.fullName || u.email} moved to Deleted tab.`);
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      queryClient.invalidateQueries({ queryKey: ['admin-firestore-users'] });
      RealtimeSyncService.emit('USERS');
      RealtimeSyncService.emit('SECTIONS');
    },
    onError: (err: any) => {
      toast.error(err.message || 'Failed to delete user account.');
    },
  });

  const restoreUserMutation = useMutation({
    mutationFn: async (u: any) => {
      try {
        await api.post(`/admin/users/${u.id}/restore`);
      } catch (err: any) {
        console.warn('Backend user restore warning:', err);
      }
      try {
        if (u.id) {
          const userDocRef = doc(db, 'users', u.id);
          await updateDoc(userDocRef, {
            accountState: 'ACTIVE',
            isDeleted: false,
            fullName: u.fullName === 'Deleted Account' ? 'Restored User' : u.fullName,
            updatedAt: serverTimestamp(),
          }).catch(() => {});
        }
      } catch (fErr) {
        console.warn('Firestore user restore warning:', fErr);
      }
      return u;
    },
    onSuccess: (u) => {
      toast.success(`Account for ${u.displayName || u.fullName || u.email} restored to active.`);
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      queryClient.invalidateQueries({ queryKey: ['admin-firestore-users'] });
      RealtimeSyncService.emit('USERS');
      RealtimeSyncService.emit('SECTIONS');
    },
    onError: (err: any) => {
      toast.error(err.message || 'Failed to restore user account.');
    },
  });

  const permanentDeleteMutation = useMutation({
    mutationFn: async (u: any) => {
      try {
        await api.delete(`/admin/users/${u.id}/permanent`);
      } catch (err: any) {
        console.warn('Backend permanent delete warning:', err);
      }
      try {
        if (u.id) {
          await deleteDoc(doc(db, 'users', u.id)).catch(() => {});
        }
        if (u.email || u.prn) {
          const key = (u.email || u.prn).trim().toLowerCase().replace(/[^a-z0-9]/g, '_');
          await deleteDoc(doc(db, 'enrolled_students', key)).catch(() => {});
        }
      } catch (fErr) {
        console.warn('Firestore permanent delete warning:', fErr);
      }
      return u;
    },
    onSuccess: (u) => {
      toast.success(`Account record for ${u.displayName || u.fullName || u.email} permanently erased.`);
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      queryClient.invalidateQueries({ queryKey: ['admin-firestore-users'] });
      RealtimeSyncService.emit('USERS');
      RealtimeSyncService.emit('SECTIONS');
    },
    onError: (err: any) => {
      toast.error(err.message || 'Failed to permanently erase account.');
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
        `"Academic Year",${escapeCsv(student.year || "—")}`,
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
      RealtimeSyncService.emit('PROBLEMS');
    },
  });

  const autoScheduleKanetkarMutation = useMutation({
    mutationFn: () => api.post('/admin/daily/auto-schedule-kanetkar', {}),
    onSuccess: (res: any) => {
      const count = res?.data?.data?.count || res?.data?.count || 31;
      const start = res?.data?.data?.startDate || 'Today';
      const end = res?.data?.data?.endDate || '';
      toast.success(`⚡ Successfully auto-scheduled ${count} Kanetkar challenges (${start} to ${end}) sequentially!`);
      queryClient.invalidateQueries({ queryKey: ['admin-problems'] });
      RealtimeSyncService.emit('PROBLEMS');
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || 'Failed to auto-schedule Kanetkar daily challenges');
    },
  });

  const handleAddTestCase = (isHidden: boolean = false) => {
    setProblemForm({
      ...problemForm,
      testCases: [...problemForm.testCases, { input: '', expectedOutput: '', isHidden }],
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
    if (/(\$[^\$\n]+\$|\\[a-zA-Z]+)/.test(problemForm.description)) {
      const allowed = new Set(['\\n', '\\t', '\\r', '\\"', "\\'"]);
      const matches = problemForm.description.match(/(\$[^\$\n]+\$|\\[a-zA-Z]+)/g) || [];
      const violations = matches.filter((m) => !allowed.has(m) && !m.startsWith('\\n') && !m.startsWith('\\t'));
      if (violations.length > 0) {
        toast.error(`Problem description contains unrendered LaTeX (${violations.slice(0, 3).join(', ')}). Click 'Auto-Format to Clean Unicode' before saving.`);
        return;
      }
    }
    if (editingProblem) {
      updateProblemMutation.mutate({ id: editingProblem.id, body: problemForm });
    } else {
      createProblemMutation.mutate(problemForm);
    }
  };

  const handleOpenEditProblem = (prob: any) => {
    setEditingProblem(prob);
    setProblemForm({
      title: prob.title || '',
      slug: prob.slug || '',
      difficulty: (prob.difficulty as Difficulty) || 'MEDIUM',
      category: prob.category || 'Algorithms',
      tags: Array.isArray(prob.tags) ? prob.tags : ['Pointers', 'Basics'],
      description: prob.description || '',
      starterCode: prob.starterCode || '#include <stdio.h>\n\nint main() {\n    return 0;\n}',
      timeLimitMs: prob.timeLimitMs || 1000,
      memoryLimitMb: prob.memoryLimitMb || 64,
      basePoints: prob.basePoints || 20,
      status: prob.status || 'PUBLISHED',
      testCases: Array.isArray(prob.testCases) && prob.testCases.length > 0
        ? prob.testCases.map((tc: any) => ({
            input: tc.input || '',
            expectedOutput: tc.expectedOutput || '',
            isHidden: Boolean(tc.isHidden),
          }))
        : [{ input: '', expectedOutput: '', isHidden: false }],
    });
    setIsCreateProblemOpen(true);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Admin Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-[var(--foreground)] flex items-center gap-2.5">
              <ShieldCheck className="w-8 h-8 text-indigo-500" />
              <span>LogicQ Administration Center</span>
            </h1>
            <span className="text-[11px] font-mono px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 font-bold flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              Platform Live
            </span>
          </div>
          <p className="text-xs sm:text-sm text-[var(--muted-foreground)] mt-1 font-mono">
            College administration, student PRN registry, coding curriculum, submissions & system diagnostics.
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            onClick={() => handleDownloadCsv('users', 'ALL')}
            className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl font-mono text-xs font-bold border border-[var(--border)] bg-[var(--card)] text-[var(--foreground)] hover:bg-slate-100 dark:hover:bg-slate-800 transition-all shadow-sm"
          >
            <Download className="w-4 h-4 text-emerald-500" />
            <span>Export Roster (CSV)</span>
          </button>
          <button
            onClick={() => setIsCreateProblemOpen(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl font-mono text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 shadow-md shadow-indigo-500/20 transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>Author New Problem</span>
          </button>
        </div>
      </div>

      {/* 4 Clean Overview KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-[var(--card)] p-5 rounded-2xl border border-[var(--border)] shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-mono text-[var(--muted-foreground)] uppercase">Total Enrolled</span>
            <Users className="w-4 h-4 text-indigo-500" />
          </div>
          <span className="text-2xl sm:text-3xl font-extrabold text-[var(--foreground)] font-mono block mt-2">
            {roleCounts.ALL}
          </span>
          <span className="text-[11px] font-mono text-emerald-600 dark:text-emerald-400 mt-1 block">Active in PRN Registry</span>
        </div>

        <div className="bg-[var(--card)] p-5 rounded-2xl border border-[var(--border)] shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-mono text-[var(--muted-foreground)] uppercase">Problem Bank</span>
            <Code2 className="w-4 h-4 text-cyan-500" />
          </div>
          <span className="text-2xl sm:text-3xl font-extrabold text-[var(--foreground)] font-mono block mt-2">
            {overview?.totalProblems || rawProblems.length}
          </span>
          <span className="text-[11px] font-mono text-[var(--muted-foreground)] mt-1 block">C Challenges & Modules</span>
        </div>

        <div className="bg-[var(--card)] p-5 rounded-2xl border border-[var(--border)] shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-mono text-[var(--muted-foreground)] uppercase">Global Submissions</span>
            <Activity className="w-4 h-4 text-purple-500" />
          </div>
          <span className="text-2xl sm:text-3xl font-extrabold text-[var(--foreground)] font-mono block mt-2">
            {overview?.totalSubmissions || submissions.length || 0}
          </span>
          <span className="text-[11px] font-mono text-purple-600 dark:text-purple-400 mt-1 block">Evaluated Code Runs</span>
        </div>

        <div className="bg-[var(--card)] p-5 rounded-2xl border border-[var(--border)] shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-mono text-[var(--muted-foreground)] uppercase">Compiler & Judge</span>
            <Zap className="w-4 h-4 text-emerald-500" />
          </div>
          <span className="text-xl sm:text-2xl font-extrabold text-emerald-600 dark:text-emerald-400 font-mono block mt-2 flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
            {healthData?.judge?.ready !== false ? 'Online (GCC 14)' : 'Ready'}
          </span>
          <span className="text-[11px] font-mono text-[var(--muted-foreground)] mt-1 block">C11 Isolated Sandbox</span>
        </div>
      </div>

      {/* 4 Clean Primary Admin Navigation Tabs */}
      <div className="flex flex-wrap items-center gap-2 border-b border-[var(--border)] pb-3 text-xs font-mono">
        <button
          onClick={() => setActiveTab('users')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl transition-all ${
            activeTab === 'users'
              ? 'bg-indigo-600 text-white font-bold shadow-md shadow-indigo-600/20'
              : 'bg-[var(--card)] text-[var(--muted-foreground)] hover:text-[var(--foreground)] border border-[var(--border)]'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>Student & Faculty Directory ({roleCounts.ALL})</span>
        </button>

        <button
          onClick={() => setActiveTab('problems')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl transition-all ${
            activeTab === 'problems' || activeTab === 'practice'
              ? 'bg-indigo-600 text-white font-bold shadow-md shadow-indigo-600/20'
              : 'bg-[var(--card)] text-[var(--muted-foreground)] hover:text-[var(--foreground)] border border-[var(--border)]'
          }`}
        >
          <Code2 className="w-4 h-4" />
          <span>Problem Bank ({problems.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('submissions')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl transition-all ${
            activeTab === 'submissions' || activeTab === 'anticheat'
              ? 'bg-indigo-600 text-white font-bold shadow-md shadow-indigo-600/20'
              : 'bg-[var(--card)] text-[var(--muted-foreground)] hover:text-[var(--foreground)] border border-[var(--border)]'
          }`}
        >
          <ShieldAlert className="w-4 h-4 text-rose-400" />
          <span>Submissions & Anti-Cheat ({submissions.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('system')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl transition-all ${
            activeTab === 'system'
              ? 'bg-indigo-600 text-white font-bold shadow-md shadow-indigo-600/20'
              : 'bg-[var(--card)] text-[var(--muted-foreground)] hover:text-[var(--foreground)] border border-[var(--border)]'
          }`}
        >
          <Activity className="w-4 h-4 text-emerald-400" />
          <span>System & Compiler Health</span>
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

      {/* Academic Filters & CSV Export Bar for Users & Uploads */}
      {(activeTab === 'users' || activeTab === 'uploads') && (
        <div className="glass-card rounded-2xl border border-white/[0.08] p-4 space-y-3">
          {activeTab === 'users' ? (
            <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
              <div className="md:col-span-5">
                <label htmlFor="admin-search" className="block text-xs font-mono text-slate-400 mb-1">
                  Search PRN / Email / Name
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
                    placeholder="Search by name, PRN, or email..."
                    className="w-full pl-8 pr-8 py-2 rounded-xl bg-dark-950 border border-dark-700 text-xs font-mono text-white focus:outline-none focus:border-cyan-400 transition"
                  />
                  {filterSearch && (
                    <button
                      type="button"
                      onClick={() => setFilterSearch('')}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white text-xs font-mono"
                    >
                      ✕
                    </button>
                  )}
                </div>
              </div>

              <div className="md:col-span-4">
                <label htmlFor="admin-filter-section" className="block text-xs font-mono text-slate-400 mb-1 flex items-center justify-between">
                  <span className="flex items-center gap-1.5 font-bold text-cyan-400">
                    <GraduationCap className="w-3.5 h-3.5" />
                    Academic Section
                  </span>
                  {filterSectionId !== 'ALL' && (
                    <button
                      type="button"
                      onClick={() => setFilterSectionId('ALL')}
                      className="text-[10px] text-amber-400 hover:underline"
                    >
                      Reset
                    </button>
                  )}
                </label>
                <select
                  id="admin-filter-section"
                  value={filterSectionId}
                  onChange={(e) => setFilterSectionId(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-dark-950 border border-cyan-500/30 text-xs font-mono text-cyan-200 focus:outline-none focus:border-cyan-400 transition"
                >
                  <option value="ALL">All Academic Sections ({sectionsList.length})</option>
                  {sectionsList.map((s: any) => (
                    <option key={s.id} value={s.id}>
                      {s.sectionName || `${s.course} - ${s.subject}`} [{s.joinCode || 'CODE'}]
                      {s._count?.students || s.studentCount ? ` · ${s._count?.students || s.studentCount} students` : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div className="md:col-span-3">
                <label htmlFor="admin-filter-dept-users" className="block text-xs font-mono text-slate-400 mb-1 flex items-center justify-between">
                  <span>Department</span>
                  {filterDepartment !== 'ALL' && (
                    <button
                      type="button"
                      onClick={() => setFilterDepartment('ALL')}
                      className="text-[10px] text-amber-400 hover:underline"
                    >
                      Reset
                    </button>
                  )}
                </label>
                <select
                  id="admin-filter-dept-users"
                  value={filterDepartment}
                  onChange={(e) => setFilterDepartment(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-dark-950 border border-dark-700 text-xs font-mono text-white focus:outline-none focus:border-cyan-400 transition"
                >
                  <option value="ALL">All Departments</option>
                  {ALLOWED_DEPARTMENTS.map((d) => (
                    <option key={d} value={d}>
                      {d}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          ) : (
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

              
            </div>
          )}

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
              {activeTab === 'users' ? users.length : uploads.length}{' '}
              records
            </span>
            <div className="flex flex-wrap items-center gap-2">
              {activeTab === 'users' && (
                <button
                  type="button"
                  onClick={handleSyncFirestoreToBackend}
                  disabled={isSyncingFirestore}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-cyan-500/10 border border-cyan-500/30 text-xs font-mono text-cyan-300 hover:bg-cyan-500/20 font-bold transition-colors disabled:opacity-50"
                  title="Force re-sync and restore all students from Cloud Firestore to database"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isSyncingFirestore ? 'animate-spin' : ''}`} />
                  <span>{isSyncingFirestore ? 'Syncing...' : 'Restore from Firestore'}</span>
                </button>
              )}
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
              {activeTab === 'uploads' && (
                <button
                  type="button"
                  onClick={() => handleDownloadCsv('daily-results')}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-dark-850 border border-dark-700 text-xs font-mono text-cyan-400 hover:bg-dark-800"
                >
                  <Download className="w-3.5 h-3.5" />
                  Export Daily Results CSV
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Tab: Problems */}
      {activeTab === 'problems' && (
        <div className="space-y-4">
          {/* Header Card */}
          <div className="glass-card p-4 sm:p-5 rounded-2xl border border-white/[0.08] flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div>
              <h2 className="text-base font-bold text-white font-mono flex items-center gap-2">
                <Code2 className="w-5 h-5 text-cyan-400" />
                <span>Problem Bank & Curriculum</span>
              </h2>
              <div className="flex flex-wrap items-center gap-2 text-xs font-mono text-slate-400 mt-1">
                <span>Total: <strong className="text-white">{rawProblems.length}</strong></span>
                <span>•</span>
                <span>Daily: <strong className="text-emerald-400">{rawProblems.filter((p: any) => p.isDaily || p.slug?.includes('daily')).length}</strong></span>
                <span>•</span>
                <span>Practice: <strong className="text-purple-400">{rawProblems.filter((p: any) => p.isPractice || p.sourceType === 'PRACTICE' || p.slug?.startsWith('practice-')).length}</strong></span>
                <span>•</span>
                <span>Kanetkar: <strong className="text-amber-400">{rawProblems.filter((p: any) => p.sourceType === 'BOOK' || p.slug?.startsWith('kanetkar-')).length}</strong></span>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              {/* View Switcher */}
              <div className="p-1 rounded-xl bg-dark-900 border border-white/10 flex items-center gap-1 font-mono text-xs">
                <button
                  type="button"
                  onClick={() => setProblemViewMode('TABLE')}
                  className={`px-3 py-1.5 rounded-lg font-bold transition flex items-center gap-1.5 ${
                    problemViewMode === 'TABLE'
                      ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <List className="w-3.5 h-3.5" />
                  <span>Problem List ({rawProblems.length})</span>
                </button>
                <button
                  type="button"
                  onClick={() => setProblemViewMode('MODULES')}
                  className={`px-3 py-1.5 rounded-lg font-bold transition flex items-center gap-1.5 ${
                    problemViewMode === 'MODULES'
                      ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <Layers className="w-3.5 h-3.5" />
                  <span>Syllabus Modules (4)</span>
                </button>
              </div>

              {/* Daily Challenge Timer ON/OFF Widget */}
              <div className="flex items-center gap-1.5 p-1 rounded-xl bg-dark-900 border border-white/10 text-xs font-mono">
                <span className="flex items-center gap-1.5 px-2 py-1 text-[11px] font-bold">
                  <span
                    className={`w-2 h-2 rounded-full ${
                      dailySystemData?.data?.dailyChallengePaused
                        ? 'bg-amber-400 animate-pulse'
                        : 'bg-emerald-400 animate-ping'
                    }`}
                  />
                  <span className={dailySystemData?.data?.dailyChallengePaused ? 'text-amber-400' : 'text-emerald-400'}>
                    Timer: {dailySystemData?.data?.dailyChallengePaused ? 'OFF' : 'ON'}
                  </span>
                </span>
                <button
                  type="button"
                  disabled={!dailySystemData?.data?.dailyChallengePaused || resumeDailyMutation.isPending}
                  onClick={() => resumeDailyMutation.mutate({ mode: 'START_NOW' } as any)}
                  className={`px-2.5 py-1 rounded-lg font-bold transition flex items-center gap-1 text-[11px] ${
                    !dailySystemData?.data?.dailyChallengePaused
                      ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 opacity-70 cursor-default'
                      : 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow hover:shadow-emerald-500/20 active:scale-95'
                  }`}
                  title="Turn Daily Timer ON (Resume submissions & countdown immediately)"
                >
                  <Play className="w-3 h-3 fill-current" />
                  <span>Turn ON</span>
                </button>
                <button
                  type="button"
                  disabled={dailySystemData?.data?.dailyChallengePaused || pauseDailyMutation.isPending}
                  onClick={() => pauseDailyMutation.mutate({ reason: 'Admin paused timer' } as any)}
                  className={`px-2.5 py-1 rounded-lg font-bold transition flex items-center gap-1 text-[11px] ${
                    dailySystemData?.data?.dailyChallengePaused
                      ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30 opacity-70 cursor-default'
                      : 'bg-rose-500/90 hover:bg-rose-500 text-white shadow hover:shadow-rose-500/20 active:scale-95'
                  }`}
                  title="Turn Daily Timer OFF (Pause submissions & freeze countdown)"
                >
                  <Pause className="w-3 h-3 fill-current" />
                  <span>Turn OFF</span>
                </button>
              </div>

              <button
                type="button"
                disabled={isSyncingProblems}
                onClick={async () => {
                  try {
                    setIsSyncingProblems(true);
                    await FirestoreDataService.syncProblems(rawProblems);
                    toast.success(`Successfully synced ${rawProblems.length} challenges to Firestore Cloud!`);
                    queryClient.invalidateQueries({ queryKey: ['firestore-problems'] });
                  } catch (err: any) {
                    toast.error(err.message || 'Failed to sync problems');
                  } finally {
                    setIsSyncingProblems(false);
                  }
                }}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl font-mono text-xs font-medium text-amber-300/90 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/20 transition-all"
                title="Sync challenges to cloud backup"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isSyncingProblems ? 'animate-spin' : ''}`} />
                <span>{isSyncingProblems ? 'Syncing...' : 'Sync Cloud'}</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setEditingProblem(null);
                  setProblemForm({
                    title: '',
                    slug: '',
                    difficulty: 'MEDIUM',
                    category: 'Algorithms',
                    tags: ['Pointers', 'Basics'],
                    description: `### Problem Description\n\nExplain the logic and constraints here.\n\n### Input Format\nStandard input specifications.\n\n### Output Format\nExpected output specifications.`,
                    starterCode: `#include <stdio.h>\n\nint main() {\n    // TODO: Write your logic here\n    return 0;\n}`,
                    timeLimitMs: 1000,
                    memoryLimitMb: 64,
                    basePoints: 20,
                    status: 'PUBLISHED',
                    testCases: [{ input: '', expectedOutput: '', isHidden: false }],
                  });
                  setIsCreateProblemOpen(true);
                }}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl font-mono text-xs font-bold text-dark-950 bg-gradient-to-r from-cyan-400 to-emerald-400 hover:from-cyan-300 hover:to-emerald-300 shadow-lg shadow-cyan-500/20 transition-all whitespace-nowrap"
              >
                <Plus className="w-4 h-4" />
                <span>+ Add New Question</span>
              </button>
            </div>
          </div>

          {problemViewMode === 'TABLE' ? (
            <>
              {/* Filters & Search Toolbar */}
              <div className="glass-card p-4 rounded-2xl border border-white/[0.08] flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    onClick={() => setProblemCategoryFilter('ALL')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-mono transition-colors ${
                      problemCategoryFilter === 'ALL'
                        ? 'bg-cyan-500/20 text-cyan-600 dark:text-cyan-300 border border-cyan-500/40 font-bold'
                        : 'text-[var(--muted-foreground)] hover:text-[var(--foreground)] bg-slate-100 dark:bg-dark-900/60 border border-slate-200 dark:border-white/[0.08]'
                    }`}
                  >
                    All ({rawProblems.length})
                  </button>
                  <button
                    onClick={() => setProblemCategoryFilter('DAILY')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-mono transition-colors flex items-center gap-1.5 ${
                      problemCategoryFilter === 'DAILY'
                        ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-300 border border-emerald-500/40 font-bold'
                        : 'text-[var(--muted-foreground)] hover:text-[var(--foreground)] bg-slate-100 dark:bg-dark-900/60 border border-slate-200 dark:border-white/[0.08]'
                    }`}
                  >
                    <Zap className="w-3.5 h-3.5 text-emerald-500" />
                    <span>Daily ({rawProblems.filter((p: any) => p.isDaily || p.slug?.includes('daily')).length})</span>
                  </button>
                  <button
                    onClick={() => setProblemCategoryFilter('PRACTICE')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-mono transition-colors flex items-center gap-1.5 ${
                      problemCategoryFilter === 'PRACTICE'
                        ? 'bg-purple-500/20 text-purple-600 dark:text-purple-300 border border-purple-500/40 font-bold'
                        : 'text-[var(--muted-foreground)] hover:text-[var(--foreground)] bg-slate-100 dark:bg-dark-900/60 border border-slate-200 dark:border-white/[0.08]'
                    }`}
                  >
                    <Layers className="w-3.5 h-3.5 text-purple-500" />
                    <span>Practice ({rawProblems.filter((p: any) => p.isPractice || p.sourceType === 'PRACTICE' || p.slug?.startsWith('practice-')).length})</span>
                  </button>
                  <button
                    onClick={() => setProblemCategoryFilter('BOOK')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-mono transition-colors flex items-center gap-1.5 ${
                      problemCategoryFilter === 'BOOK'
                        ? 'bg-amber-500/20 text-amber-600 dark:text-amber-300 border border-amber-500/40 font-bold'
                        : 'text-[var(--muted-foreground)] hover:text-[var(--foreground)] bg-slate-100 dark:bg-dark-900/60 border border-slate-200 dark:border-white/[0.08]'
                    }`}
                  >
                    <BookOpen className="w-3.5 h-3.5 text-amber-500" />
                    <span>Kanetkar Book ({rawProblems.filter((p: any) => p.sourceType === 'BOOK' || p.slug?.startsWith('kanetkar-')).length})</span>
                  </button>

                  <div className="h-5 w-[1px] bg-white/10 mx-1 hidden sm:block" />

                  <select
                    value={problemDifficultyFilter}
                    onChange={(e) => setProblemDifficultyFilter(e.target.value as any)}
                    className="px-2.5 py-1.5 rounded-lg bg-dark-900 border border-white/10 text-xs font-mono text-slate-200 focus:outline-none focus:border-cyan-400 transition"
                  >
                    <option value="ALL">All Difficulties</option>
                    <option value="EASY">🟢 Easy</option>
                    <option value="MEDIUM">🟡 Medium</option>
                    <option value="HARD">🔴 Hard</option>
                  </select>
                </div>

                <div className="relative min-w-[240px]">
                  <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={problemSearch}
                    onChange={(e) => setProblemSearch(e.target.value)}
                    placeholder="Search title, slug, or tag..."
                    className="w-full pl-9 pr-3 py-1.5 rounded-xl bg-dark-900/90 border border-white/[0.08] text-xs font-mono text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
                  />
                </div>
              </div>

              {/* Table Card */}
              <div className="glass-card rounded-2xl border border-white/[0.08] overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs font-mono">
                    <thead className="bg-dark-900/80 text-slate-400 uppercase text-[10px] tracking-wider border-b border-white/[0.06]">
                      <tr>
                        <th className="px-6 py-3.5">Title & Reference</th>
                        <th className="px-6 py-3.5">Difficulty</th>
                        <th className="px-6 py-3.5">Category</th>
                        <th className="px-6 py-3.5">Test Cases</th>
                        <th className="px-6 py-3.5">Daily Status</th>
                        <th className="px-6 py-3.5 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/[0.04]">
                      {filteredProblems.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="px-6 py-12 text-center text-slate-500">
                            No problems found matching active filter.
                          </td>
                        </tr>
                      ) : (
                        paginatedProblems.map((p: any) => {
                          const testCount = Array.isArray(p.testCases) ? p.testCases.length : 0;

                          return (
                            <tr key={p.id || p.slug} className="hover:bg-white/[0.02] transition-colors">
                              <td className="px-6 py-4">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="font-bold text-white text-sm block">{p.title}</span>
                                  {getModuleBadge(p)}
                                </div>
                                <span className="text-slate-500 text-[11px] block mt-0.5">slug: {p.slug}</span>
                              </td>
                              <td className="px-6 py-4">
                                <DifficultyBadge difficulty={p.difficulty as Difficulty} size="sm" />
                              </td>
                              <td className="px-6 py-4 text-slate-300">{p.category}</td>
                              <td className="px-6 py-4">
                                <button
                                  type="button"
                                  onClick={() => setInspectingProblem(p)}
                                  className="px-2.5 py-1 rounded-lg bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 font-semibold border border-cyan-500/30 flex items-center gap-1.5 transition-all text-xs"
                                  title="Click to view and inspect all test cases"
                                >
                                  <Eye className="w-3.5 h-3.5" />
                                  <span>{testCount} cases</span>
                                </button>
                              </td>
                              <td className="px-6 py-4">
                                {p.isDaily ? (
                                  <span className="px-2.5 py-1 rounded-lg bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 text-[10px] font-mono font-semibold inline-flex items-center gap-1">
                                    <Zap className="w-3 h-3 text-emerald-400" />
                                    <span>Scheduled: {p.scheduledDate || 'Today'}</span>
                                  </span>
                                ) : (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setSchedulingProblem(p);
                                      const todayStr = new Date().toISOString().split('T')[0];
                                      setScheduleDate(todayStr);
                                    }}
                                    className="px-2.5 py-1.5 rounded-lg bg-white/[0.04] hover:bg-cyan-500/15 border border-white/[0.08] hover:border-cyan-500/30 text-[11px] text-slate-300 hover:text-cyan-300 inline-flex items-center gap-1.5 transition font-mono"
                                    title="Schedule as Daily Challenge"
                                  >
                                    <Calendar className="w-3.5 h-3.5 text-cyan-400" />
                                    <span>Schedule Daily</span>
                                  </button>
                                )}
                              </td>
                              <td className="px-6 py-4 text-right space-x-1.5 whitespace-nowrap">
                                <button
                                  type="button"
                                  onClick={() => handleOpenEditProblem(p)}
                                  className="p-1.5 rounded-lg text-slate-400 hover:text-cyan-300 hover:bg-cyan-500/10 border border-transparent hover:border-cyan-500/20 transition"
                                  title="Edit Problem & Test Cases"
                                >
                                  <Edit3 className="w-4 h-4" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    if (confirm(`Delete problem "${p.title}"?`)) {
                                      deleteProblemMutation.mutate(p.id);
                                    }
                                  }}
                                  className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 border border-transparent hover:border-rose-500/20 transition"
                                  title="Delete Problem"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Pagination Footer */}
                <div className="px-6 py-3.5 border-t border-white/[0.06] flex flex-col sm:flex-row items-center justify-between gap-3 text-xs font-mono text-slate-400">
                  <div>
                    Showing <span className="text-white font-bold">{filteredProblems.length === 0 ? 0 : (problemPage - 1) * PROBLEMS_PER_PAGE + 1}</span> to{' '}
                    <span className="text-white font-bold">{Math.min(filteredProblems.length, problemPage * PROBLEMS_PER_PAGE)}</span> of{' '}
                    <span className="text-white font-bold">{filteredProblems.length}</span> challenges
                    {(problemCategoryFilter !== 'ALL' || problemDifficultyFilter !== 'ALL' || problemSearch) && (
                      <span className="text-cyan-400 ml-1.5 font-semibold">(filtered)</span>
                    )}
                  </div>

                  {totalProblemPages > 1 && (
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        disabled={problemPage === 1}
                        onClick={() => setProblemPage((p) => Math.max(1, p - 1))}
                        className="px-3 py-1.5 rounded-lg bg-dark-900 border border-white/10 hover:border-white/20 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-mono transition"
                      >
                        ← Prev
                      </button>

                      <span className="px-2 text-slate-300">
                        Page <strong className="text-white">{problemPage}</strong> of {totalProblemPages}
                      </span>

                      <button
                        type="button"
                        disabled={problemPage === totalProblemPages}
                        onClick={() => setProblemPage((p) => Math.min(totalProblemPages, p + 1))}
                        className="px-3 py-1.5 rounded-lg bg-dark-900 border border-white/10 hover:border-white/20 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-mono transition"
                      >
                        Next →
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </>
          ) : (
            /* Syllabus Modules Grid View */
            <div className="space-y-4">
              {(() => {
                const modulesList = practiceModulesData?.data?.modules || [
                  { order: 1, title: 'Control Structures', slug: 'control-structures', requirementText: 'Unlocked for all', totalQuestions: 10 },
                  { order: 2, title: 'Pointers and Functions', slug: 'pointers-and-functions', requirementText: 'Solve all 10 in Module 1', totalQuestions: 10 },
                  { order: 3, title: 'Array and its Applications', slug: 'array-and-its-applications', requirementText: 'Solve all 10 in Module 2', totalQuestions: 10 },
                  { order: 4, title: 'Advanced Data Types, Dynamic Memory', slug: 'advanced-data-types-dynamic-memory', requirementText: 'Solve all 10 in Module 3', totalQuestions: 10 },
                ];

                return (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {modulesList.map((m: any) => {
                      const moduleProblems = rawProblems.filter((p: any) =>
                        p.moduleSlug === m.slug ||
                        p.slug?.startsWith(`practice-m${m.order}-`) ||
                        (m.order === 1 && p.moduleSlug?.includes('control')) ||
                        (m.order === 2 && (p.moduleSlug?.includes('pointer') || p.moduleSlug?.includes('function'))) ||
                        (m.order === 3 && p.moduleSlug?.includes('array')) ||
                        (m.order === 4 && (p.moduleSlug?.includes('dynamic') || p.moduleSlug?.includes('advanced')))
                      );

                      const isExpanded = selectedPracticeModuleSlug === m.slug;

                      return (
                        <div
                          key={m.slug}
                          className={`glass-card p-5 rounded-2xl border transition-all space-y-3 ${
                            isExpanded
                              ? 'border-cyan-400/50 bg-cyan-500/[0.04] shadow-lg shadow-cyan-500/10'
                              : 'border-white/[0.08] hover:border-white/[0.2]'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-mono font-bold text-cyan-400 px-2 py-0.5 rounded bg-cyan-500/10 border border-cyan-500/20">
                              MODULE {m.order}
                            </span>
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-mono text-slate-400">
                                {moduleProblems.length || m.totalQuestions || 0} Problems
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
                          <p className="text-xs text-slate-400 line-clamp-2">{m.description || m.requirementText}</p>

                          <div className="pt-2 border-t border-white/[0.06] flex items-center justify-between">
                            <button
                              type="button"
                              onClick={() => setSelectedPracticeModuleSlug(isExpanded ? null : m.slug)}
                              className="text-xs font-mono text-cyan-400 hover:text-cyan-300 flex items-center gap-1 font-semibold"
                            >
                              <span>{isExpanded ? 'Hide Questions ▲' : `View Questions (${moduleProblems.length}) ▼`}</span>
                            </button>
                          </div>

                          {isExpanded && (
                            <div className="pt-2 space-y-1.5 max-h-60 overflow-y-auto">
                              {moduleProblems.map((prob: any, pIdx: number) => (
                                <div
                                  key={prob.id || prob.slug || pIdx}
                                  className="flex items-center justify-between p-2 rounded-lg bg-dark-900/60 border border-white/[0.04] text-xs font-mono"
                                >
                                  <div className="flex items-center gap-2 truncate">
                                    <span className="text-slate-500">#{pIdx + 1}</span>
                                    <span className="text-white truncate font-medium">{prob.title}</span>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <DifficultyBadge difficulty={prob.difficulty as Difficulty} size="sm" />
                                    <button
                                      type="button"
                                      onClick={() => handleOpenEditProblem(prob)}
                                      className="p-1 rounded text-slate-400 hover:text-cyan-300"
                                      title="Edit Problem"
                                    >
                                      <Edit3 className="w-3 h-3" />
                                    </button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                );
              })()}
            </div>
          )}
        </div>
      )}

      {/* Modal: Test Cases Inspector */}
      {inspectingProblem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="w-full max-w-3xl glass-card rounded-2xl border border-white/[0.1] shadow-2xl p-6 sm:p-8 overflow-y-auto max-h-[90vh]">
            <div className="flex items-center justify-between pb-4 border-b border-white/[0.08] mb-6">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-bold text-white font-mono">{inspectingProblem.title}</h3>
                  <DifficultyBadge difficulty={inspectingProblem.difficulty as Difficulty} size="sm" />
                </div>
                <div className="flex items-center gap-2 text-xs font-mono text-slate-400 mt-1">
                  <span>Category: {inspectingProblem.category}</span>
                  <span>•</span>
                  <span>Slug: {inspectingProblem.slug}</span>
                  {inspectingProblem.sourceRef?.chapterTitle && (
                    <>
                      <span>•</span>
                      <span className="text-amber-300">Book: {inspectingProblem.sourceRef.bookTitle} (Ch {inspectingProblem.sourceRef.chapter}: {inspectingProblem.sourceRef.chapterTitle})</span>
                    </>
                  )}
                </div>
              </div>
              <button
                onClick={() => setInspectingProblem(null)}
                className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/[0.06]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-6">
              {/* Test Cases List */}
              <div>
                <h4 className="text-xs font-mono font-bold text-cyan-400 uppercase tracking-wider mb-3 flex items-center justify-between">
                  <span>Configured Test Cases ({inspectingProblem.testCases?.length || 0})</span>
                  <span className="text-[11px] text-slate-400 font-normal">Input & Expected Outputs</span>
                </h4>

                {(!inspectingProblem.testCases || inspectingProblem.testCases.length === 0) ? (
                  <p className="text-xs text-slate-500 font-mono italic">No test cases found for this problem.</p>
                ) : (
                  <div className="space-y-3">
                    {inspectingProblem.testCases.map((tc: any, idx: number) => {
                      const isHidden = Boolean(tc.isHidden);
                      return (
                        <div key={tc.id || idx} className="p-3.5 rounded-xl bg-dark-900/80 border border-white/[0.06]">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-xs font-mono font-semibold text-white">Test Case #{idx + 1}</span>
                            <span className={`text-[10px] font-mono px-2 py-0.5 rounded ${
                              isHidden
                                ? 'bg-amber-500/10 text-amber-300 border border-amber-500/30'
                                : 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/30'
                            }`}>
                              {isHidden ? 'Hidden Test' : 'Sample Test'}
                            </span>
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs font-mono">
                            <div>
                              <span className="text-[10px] text-slate-400 block mb-1">STANDARD INPUT:</span>
                              <pre className="p-2 rounded bg-black/50 text-slate-200 text-xs overflow-x-auto whitespace-pre-wrap max-h-32">
                                {tc.input || '(empty input)'}
                              </pre>
                            </div>
                            <div>
                              <span className="text-[10px] text-slate-400 block mb-1">EXPECTED OUTPUT:</span>
                              <pre className="p-2 rounded bg-black/50 text-emerald-300 text-xs overflow-x-auto whitespace-pre-wrap max-h-32">
                                {tc.expectedOutput || '(empty output)'}
                              </pre>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Starter Code Preview */}
              {inspectingProblem.starterCode && (
                <div>
                  <h4 className="text-xs font-mono font-bold text-slate-400 uppercase tracking-wider mb-2">
                    Starter Code Template
                  </h4>
                  <pre className="p-3 rounded-xl bg-black/60 border border-white/[0.06] text-slate-300 text-xs font-mono overflow-x-auto max-h-48">
                    {inspectingProblem.starterCode}
                  </pre>
                </div>
              )}
            </div>

            <div className="mt-6 pt-4 border-t border-white/[0.08] flex justify-end">
              <button
                type="button"
                onClick={() => setInspectingProblem(null)}
                className="px-4 py-2 rounded-xl bg-white/[0.06] hover:bg-white/[0.1] text-xs font-mono text-white transition-colors"
              >
                Close Inspector
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Schedule Daily Challenge */}
      {schedulingProblem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="w-full max-w-md glass-card rounded-2xl border border-white/[0.1] shadow-2xl p-6">
            <div className="flex items-center justify-between pb-3 border-b border-white/[0.08] mb-4">
              <div className="flex items-center gap-2">
                <Calendar className="w-5 h-5 text-cyan-400" />
                <h3 className="text-base font-bold text-white font-mono">Schedule Daily Challenge</h3>
              </div>
              <button
                type="button"
                onClick={() => setSchedulingProblem(null)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <span className="text-xs text-slate-400 font-mono block">Selected Challenge:</span>
                <span className="text-sm font-bold text-white font-mono block mt-0.5">{schedulingProblem.title}</span>
                <span className="text-xs text-slate-500 font-mono">slug: {schedulingProblem.slug}</span>
              </div>

              <div className="p-3 rounded-xl bg-emerald-500/[0.08] border border-emerald-500/20 space-y-2">
                <div className="text-xs font-mono font-bold text-emerald-300">Quick 1-Click Action:</div>
                <button
                  type="button"
                  disabled={scheduleDailyMutation.isPending}
                  onClick={() => {
                    const todayStr = new Date().toISOString().split('T')[0];
                    scheduleDailyMutation.mutate(
                      { problemId: schedulingProblem.id, scheduledDate: todayStr },
                      { onSuccess: () => setSchedulingProblem(null) }
                    );
                  }}
                  className="w-full py-2 px-3 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 text-xs font-mono font-bold border border-emerald-500/40 flex items-center justify-center gap-1.5 transition disabled:opacity-50"
                >
                  <Zap className="w-3.5 h-3.5" />
                  <span>{scheduleDailyMutation.isPending ? 'Scheduling...' : "Set as Today's Daily Challenge"}</span>
                </button>
              </div>

              <div className="space-y-2 pt-2 border-t border-white/[0.06]">
                <label className="text-xs text-slate-300 font-mono block">Or Pick a Specific Date:</label>
                <input
                  type="date"
                  value={scheduleDate}
                  onChange={(e) => setScheduleDate(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-dark-900 border border-white/10 text-white text-xs font-mono focus:outline-none focus:border-cyan-400"
                />
                <button
                  type="button"
                  disabled={!scheduleDate || scheduleDailyMutation.isPending}
                  onClick={() => {
                    scheduleDailyMutation.mutate(
                      { problemId: schedulingProblem.id, scheduledDate: scheduleDate },
                      { onSuccess: () => setSchedulingProblem(null) }
                    );
                  }}
                  className="w-full py-2 px-3 rounded-lg bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 text-xs font-mono font-bold border border-cyan-500/40 flex items-center justify-center gap-1.5 transition disabled:opacity-50"
                >
                  <Calendar className="w-3.5 h-3.5" />
                  <span>{scheduleDailyMutation.isPending ? 'Scheduling...' : `Schedule for ${scheduleDate}`}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab: Submissions & Anti-Cheat */}
      {(activeTab === 'submissions' || activeTab === 'anticheat') && (
        <div className="space-y-4">
          {/* Top Live Stats & View Switcher */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 p-4 rounded-2xl glass-card border border-white/[0.08]">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setActiveTab('submissions')}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-mono font-bold transition-all ${
                  activeTab === 'submissions'
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                    : 'bg-slate-100 dark:bg-dark-900/60 text-[var(--muted-foreground)] hover:text-[var(--foreground)] border border-slate-200 dark:border-white/[0.08]'
                }`}
              >
                <Zap className="w-4 h-4 text-amber-500" />
                <span>Live Feed ({filteredSubmissions.length})</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('anticheat')}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-mono font-bold transition-all ${
                  activeTab === 'anticheat'
                    ? 'bg-rose-600 text-white shadow-md shadow-rose-600/30'
                    : 'bg-slate-100 dark:bg-dark-900/60 text-[var(--muted-foreground)] hover:text-[var(--foreground)] border border-slate-200 dark:border-white/[0.08]'
                }`}
              >
                <ShieldAlert className="w-4 h-4 text-rose-500" />
                <span>Plagiarism Radar</span>
              </button>
            </div>

            {/* Quick Metrics Badges */}
            <div className="flex flex-wrap items-center gap-2">
              <div className="px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-white/[0.04] border border-slate-200 dark:border-white/[0.08] text-xs font-mono">
                <span className="text-[var(--muted-foreground)] mr-1.5">Total:</span>
                <span className="font-bold text-[var(--foreground)]">{submissionMetrics.total}</span>
              </div>
              <div className="px-3 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-xs font-mono">
                <span className="text-emerald-600 dark:text-emerald-400 font-semibold mr-1.5">Accepted:</span>
                <span className="font-bold text-emerald-700 dark:text-emerald-300">{submissionMetrics.accepted}</span>
              </div>
              <div className="px-3 py-1.5 rounded-lg bg-rose-500/10 border border-rose-500/20 text-xs font-mono">
                <span className="text-rose-600 dark:text-rose-400 font-semibold mr-1.5">Wrong:</span>
                <span className="font-bold text-rose-700 dark:text-rose-300">{submissionMetrics.wrong}</span>
              </div>
              {submissionMetrics.errors > 0 && (
                <div className="px-3 py-1.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-xs font-mono">
                  <span className="text-amber-600 dark:text-amber-400 font-semibold mr-1.5">Errors / TLE:</span>
                  <span className="font-bold text-amber-700 dark:text-amber-300">{submissionMetrics.errors}</span>
                </div>
              )}
            </div>
          </div>

          {activeTab === 'submissions' && (
            <div className="glass-card rounded-2xl border border-white/[0.08] overflow-hidden">
              {/* Search & Filter Toolbar */}
              <div className="p-4 border-b border-white/[0.06] flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={submissionSearch}
                    onChange={(e) => {
                      setSubmissionSearch(e.target.value);
                      setSubmissionPage(1);
                    }}
                    placeholder="Search by student PRN, Name, or Problem title..."
                    className="w-full pl-10 pr-4 py-2 rounded-xl bg-dark-900 border border-white/10 text-white placeholder-slate-500 text-xs font-mono focus:outline-none focus:border-cyan-400"
                  />
                  {submissionSearch && (
                    <button
                      onClick={() => {
                        setSubmissionSearch('');
                        setSubmissionPage(1);
                      }}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  {/* Verdict Filter */}
                  <select
                    value={submissionVerdictFilter}
                    onChange={(e) => {
                      setSubmissionVerdictFilter(e.target.value);
                      setSubmissionPage(1);
                    }}
                    className="px-3 py-2 rounded-xl bg-dark-900 border border-white/10 text-white text-xs font-mono focus:outline-none focus:border-cyan-400"
                  >
                    <option value="ALL">All Verdicts</option>
                    <option value="ACCEPTED">🟢 Accepted</option>
                    <option value="WRONG_ANSWER">🔴 Wrong Answer</option>
                    <option value="TIME_LIMIT_EXCEEDED">⏳ Time Limit Exceeded</option>
                    <option value="COMPILATION_ERROR">⚠️ Compilation Error</option>
                    <option value="RUNTIME_ERROR">💥 Runtime Error</option>
                  </select>

                  {/* Problem Filter */}
                  {submissionProblemOptions.length > 0 && (
                    <select
                      value={submissionProblemFilter}
                      onChange={(e) => {
                        setSubmissionProblemFilter(e.target.value);
                        setSubmissionPage(1);
                      }}
                      className="max-w-[200px] truncate px-3 py-2 rounded-xl bg-dark-900 border border-white/10 text-white text-xs font-mono focus:outline-none focus:border-cyan-400"
                    >
                      <option value="ALL">All Problems ({submissionProblemOptions.length})</option>
                      {submissionProblemOptions.map((opt) => (
                        <option key={opt.id} value={opt.id}>
                          {opt.title}
                        </option>
                      ))}
                    </select>
                  )}

                  {/* Reset Filters */}
                  {(submissionSearch || submissionVerdictFilter !== 'ALL' || submissionProblemFilter !== 'ALL') && (
                    <button
                      onClick={() => {
                        setSubmissionSearch('');
                        setSubmissionVerdictFilter('ALL');
                        setSubmissionProblemFilter('ALL');
                        setSubmissionPage(1);
                      }}
                      className="px-3 py-2 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] text-slate-400 hover:text-white text-xs font-mono border border-white/10 transition"
                      title="Clear filters"
                    >
                      Reset
                    </button>
                  )}
                </div>
              </div>

              {/* Submissions Table / Empty State */}
              {paginatedSubmissions.length === 0 ? (
                <div className="p-12 text-center text-xs font-mono text-slate-500">
                  {submissions.length === 0
                    ? 'No live submissions recorded yet. Incoming evaluations from challengers will stream here automatically.'
                    : 'No submissions matched your search and filter criteria.'}
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
                        <th className="px-4 py-3.5">Attempts</th>
                        <th className="px-4 py-3.5">Solve / Focus Time</th>
                        <th className="px-4 py-3.5">Runtime</th>
                        <th className="px-4 py-3.5">Submitted</th>
                        <th className="px-4 py-3.5 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/[0.04]">
                      {paginatedSubmissions.map((sub: any) => (
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
                          <td className="px-4 py-4">
                            <div className="flex flex-col">
                              <span className="font-bold text-white text-xs font-mono">
                                Attempt #{sub.attemptNumber || 1}
                              </span>
                              {sub.isFirstAttemptAccepted ? (
                                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20 mt-1 w-fit font-mono">
                                  <Zap className="w-2.5 h-2.5" /> 1st Try Solve
                                </span>
                              ) : sub.totalAttempts && sub.totalAttempts > 1 ? (
                                <span className="text-[10px] text-slate-400 mt-0.5 font-mono">
                                  {sub.totalAttempts} tries total
                                </span>
                              ) : null}
                            </div>
                          </td>
                          <td className="px-4 py-4">
                            {sub.timeToSolveSeconds != null && sub.timeToSolveSeconds > 0 ? (
                              <div>
                                <div className="flex items-center gap-1 text-emerald-400 font-bold font-mono">
                                  <Clock className="w-3.5 h-3.5 text-emerald-400" />
                                  <span>{formatPracticeTime(sub.timeToSolveSeconds)}</span>
                                </div>
                                <span className="text-[10px] text-emerald-400/80 block font-mono">Solved in</span>
                              </div>
                            ) : sub.activeSeconds != null && sub.activeSeconds > 0 ? (
                              <div>
                                <div className="flex items-center gap-1 text-cyan-400 font-mono">
                                  <Clock className="w-3.5 h-3.5 text-cyan-400" />
                                  <span>{formatPracticeTime(sub.activeSeconds)}</span>
                                </div>
                                <span className="text-[10px] text-slate-400 block font-mono">Active focus</span>
                              </div>
                            ) : (
                              <span className="text-slate-500 font-mono text-xs">—</span>
                            )}
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
                              className="p-1.5 rounded-lg text-cyan-400 hover:bg-cyan-500/10 cursor-pointer"
                              title="Inspect Code"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => rejudgeMutation.mutate(sub.id)}
                              className="p-1.5 rounded-lg text-amber-400 hover:bg-amber-500/10 cursor-pointer"
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

              {/* Pagination Footer */}
              <div className="px-6 py-3.5 border-t border-white/[0.06] flex flex-col sm:flex-row items-center justify-between gap-3 text-xs font-mono text-slate-400">
                <div>
                  Showing <span className="text-white font-bold">{filteredSubmissions.length === 0 ? 0 : (submissionPage - 1) * SUBMISSIONS_PER_PAGE + 1}</span> to{' '}
                  <span className="text-white font-bold">{Math.min(filteredSubmissions.length, submissionPage * SUBMISSIONS_PER_PAGE)}</span> of{' '}
                  <span className="text-white font-bold">{filteredSubmissions.length}</span> submissions
                  {(submissionSearch || submissionVerdictFilter !== 'ALL' || submissionProblemFilter !== 'ALL') && (
                    <span className="text-cyan-400 ml-1.5 font-semibold">(filtered)</span>
                  )}
                </div>

                {totalSubmissionPages > 1 && (
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      disabled={submissionPage === 1}
                      onClick={() => setSubmissionPage((p) => Math.max(1, p - 1))}
                      className="px-3 py-1.5 rounded-lg bg-dark-900 border border-white/10 hover:border-white/20 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-mono transition"
                    >
                      ← Prev
                    </button>

                    <span className="px-2 text-slate-300">
                      Page <strong className="text-white">{submissionPage}</strong> of {totalSubmissionPages}
                    </span>

                    <button
                      type="button"
                      disabled={submissionPage === totalSubmissionPages}
                      onClick={() => setSubmissionPage((p) => Math.min(totalSubmissionPages, p + 1))}
                      className="px-3 py-1.5 rounded-lg bg-dark-900 border border-white/10 hover:border-white/20 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-mono transition"
                    >
                      Next →
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'anticheat' && (
            <AdminAntiCheatSecurity />
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
        <div className="space-y-3.5">
          {/* Role Filter Tabs & Summary Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-1.5 p-1 bg-[var(--card)] border border-[var(--border)] rounded-xl overflow-x-auto max-w-full shadow-sm">
              <button
                type="button"
                onClick={() => setFilterRole('ALL')}
                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-mono font-bold transition-all whitespace-nowrap ${
                  filterRole === 'ALL'
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:bg-slate-100 dark:hover:bg-white/[0.04]'
                }`}
              >
                <span>All Accounts</span>
                <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
                  filterRole === 'ALL' ? 'bg-indigo-700 text-white' : 'bg-slate-100 dark:bg-white/[0.08] text-[var(--muted-foreground)] border border-[var(--border)]'
                }`}>
                  {roleCounts.ALL}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setFilterRole('STUDENT')}
                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-mono font-bold transition-all whitespace-nowrap ${
                  filterRole === 'STUDENT'
                    ? 'bg-cyan-600 text-white shadow-sm'
                    : 'text-[var(--muted-foreground)] hover:text-cyan-600 dark:hover:text-cyan-300 hover:bg-slate-100 dark:hover:bg-white/[0.04]'
                }`}
              >
                <GraduationCap className="w-3.5 h-3.5" />
                <span>Students</span>
                <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
                  filterRole === 'STUDENT' ? 'bg-cyan-700 text-white' : 'bg-slate-100 dark:bg-white/[0.08] text-[var(--muted-foreground)] border border-[var(--border)]'
                }`}>
                  {roleCounts.STUDENT}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setFilterRole('FACULTY')}
                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-mono font-bold transition-all whitespace-nowrap ${
                  filterRole === 'FACULTY'
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-[var(--muted-foreground)] hover:text-blue-600 dark:hover:text-blue-300 hover:bg-slate-100 dark:hover:bg-white/[0.04]'
                }`}
              >
                <UserCheck className="w-3.5 h-3.5" />
                <span>Faculty</span>
                <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
                  filterRole === 'FACULTY' ? 'bg-blue-700 text-white' : 'bg-slate-100 dark:bg-white/[0.08] text-[var(--muted-foreground)] border border-[var(--border)]'
                }`}>
                  {roleCounts.FACULTY}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setFilterRole('ADMIN')}
                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-mono font-bold transition-all whitespace-nowrap ${
                  filterRole === 'ADMIN'
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'text-[var(--muted-foreground)] hover:text-emerald-600 dark:hover:text-emerald-300 hover:bg-slate-100 dark:hover:bg-white/[0.04]'
                }`}
              >
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Admins</span>
                <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
                  filterRole === 'ADMIN' ? 'bg-emerald-700 text-white' : 'bg-slate-100 dark:bg-white/[0.08] text-[var(--muted-foreground)] border border-[var(--border)]'
                }`}>
                  {roleCounts.ADMIN}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setFilterRole('DELETED')}
                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-mono font-bold transition-all whitespace-nowrap ${
                  filterRole === 'DELETED'
                    ? 'bg-rose-600 text-white shadow-sm'
                    : 'text-[var(--muted-foreground)] hover:text-rose-600 dark:hover:text-rose-300 hover:bg-slate-100 dark:hover:bg-white/[0.04]'
                }`}
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Deleted</span>
                <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
                  filterRole === 'DELETED' ? 'bg-rose-700 text-white' : 'bg-slate-100 dark:bg-white/[0.08] text-[var(--muted-foreground)] border border-[var(--border)]'
                }`}>
                  {roleCounts.DELETED}
                </span>
              </button>
            </div>

            <div className="flex items-center gap-2 text-xs font-mono text-[var(--muted-foreground)]">
              <span>Showing <strong className="text-[var(--foreground)]">{users.length}</strong> of {filterRole === 'DELETED' ? roleCounts.DELETED : roleCounts.ALL} {filterRole === 'DELETED' ? 'deleted accounts' : 'active members'}</span>
              {(filterSearch || filterRole !== 'ALL' || filterSectionId !== 'ALL' || filterDepartment !== 'ALL') && (
                <button
                  type="button"
                  onClick={() => {
                    setFilterSearch('');
                    setFilterRole('ALL');
                    setFilterSectionId('ALL');
                    setFilterDepartment('ALL');
                    setFilterYear('ALL');
                    setFilterDivision('');
                  }}
                  className="text-cyan-400 hover:underline text-[11px]"
                >
                  Clear filters
                </button>
              )}
            </div>
          </div>

          <div className="glass-card rounded-2xl border border-white/[0.08] overflow-hidden shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs font-mono">
                <thead className="bg-dark-900/90 text-slate-400 uppercase text-[10px] tracking-wider border-b border-white/[0.06]">
                  <tr>
                    <th className="px-5 py-3.5 min-w-[240px]">User & Identity</th>
                    <th className="px-4 py-3.5 min-w-[210px]">Academic Profile & Section</th>
                    <th className="px-4 py-3.5 min-w-[200px]">Email Contact</th>
                    <th className="px-4 py-3.5 min-w-[150px]">Activity / Role</th>
                    <th className="px-5 py-3.5 text-right min-w-[190px]">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.04]">
                  {users.map((u: any) => {
                    const initials = ((u.displayName || u.fullName || u.email || 'U')
                      .split(' ')
                      .map((n: string) => n[0])
                      .filter(Boolean)
                      .slice(0, 2)
                      .join('') || 'U').toUpperCase();

                    const roleGradient =
                      u.role === 'ADMIN'
                        ? 'from-emerald-600 to-teal-700 text-emerald-100 ring-1 ring-emerald-500/30'
                        : u.role === 'FACULTY'
                        ? 'from-blue-600 to-indigo-700 text-blue-100 ring-1 ring-blue-500/30'
                        : 'from-cyan-600 to-indigo-600 text-cyan-100 ring-1 ring-cyan-500/30';

                    return (
                      <tr key={u.id} className="hover:bg-white/[0.02] transition-colors">
                        {/* 1. User & Identity */}
                        <td className="px-5 py-3.5">
                          <div className="flex items-center gap-3">
                            <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${roleGradient} flex items-center justify-center font-bold text-xs shadow-md shrink-0`}>
                              {initials}
                            </div>
                            <div className="space-y-0.5 min-w-0">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="font-bold text-white text-xs block truncate max-w-[200px]">
                                  {u.displayName || u.fullName}
                                </span>
                                {filterRole === 'DELETED' || u.accountState === 'DELETED' || u.fullName === 'Deleted Account' ? (
                                  <span className="px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-300 border border-rose-500/30 text-[9px] font-bold uppercase tracking-wider">
                                    DELETED
                                  </span>
                                ) : u.isBanned ? (
                                  <span className="px-1.5 py-0.2 rounded bg-rose-500/20 text-rose-300 border border-rose-500/30 text-[9px] font-bold">
                                    BANNED
                                  </span>
                                ) : null}
                              </div>

                              {u.role === 'STUDENT' ? (
                                <div className="flex items-center gap-1.5">
                                  <span className="text-[11px] text-slate-300 font-mono bg-white/[0.05] px-1.5 py-0.5 rounded border border-white/[0.06]">
                                    {revealedPrns[u.id] || (u.maskedPrn || (u.prn ? `••••••${u.prn.slice(-4)}` : 'PRN: Unassigned'))}
                                  </span>
                                  {!revealedPrns[u.id] && u.prn && (
                                    <button
                                      type="button"
                                      onClick={() => {
                                        if (window.confirm(`Reveal full PRN for ${u.displayName || u.fullName}? This action is recorded in the administrative audit log.`)) {
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
                                  {u.prnChangedAt && (
                                    <span className="text-[10px] text-amber-400/90 font-mono" title={`Changed: ${new Date(u.prnChangedAt).toLocaleDateString()}`}>
                                      • Modified
                                    </span>
                                  )}
                                </div>
                              ) : u.role === 'FACULTY' ? (
                                <span className="inline-flex items-center gap-1 text-[10px] font-mono font-semibold text-blue-300 bg-blue-500/10 px-1.5 py-0.5 rounded border border-blue-500/20">
                                  <UserCheck className="w-2.5 h-2.5" />
                                  Faculty Member
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 text-[10px] font-mono font-semibold text-emerald-300 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20">
                                  <ShieldCheck className="w-2.5 h-2.5" />
                                  System Admin
                                </span>
                              )}
                            </div>
                          </div>
                        </td>

                        {/* 2. Academic Profile & Section */}
                        <td className="px-4 py-3.5">
                          {u.role === 'ADMIN' ? (
                            <div className="space-y-0.5">
                              <span className="text-slate-700 dark:text-slate-300 text-xs font-semibold block">LogicQ Platform</span>
                              <span className="text-slate-500 dark:text-slate-400 text-[11px] block">Global Administrator</span>
                            </div>
                          ) : u.role === 'FACULTY' ? (
                            <div className="space-y-1">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="text-indigo-600 dark:text-cyan-300 font-semibold text-xs">{u.department || 'Faculty'}</span>
                                {u.college && <span className="text-slate-500 dark:text-slate-400 text-[11px]">• {u.college}</span>}
                              </div>
                              {u.sections && u.sections.length > 0 ? (
                                <div className="flex flex-wrap gap-1">
                                  {u.sections.map((sec: any) => (
                                    <span
                                      key={sec.id}
                                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-mono font-semibold bg-blue-50 dark:bg-blue-500/15 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-500/30 shadow-xs"
                                      title={`Course: ${sec.course || 'Integrated M.Tech'} | Join Code: ${sec.joinCode || 'LQ-IMTC'}`}
                                    >
                                      <BookOpen className="w-3 h-3 text-blue-500 shrink-0" />
                                      <span>{sec.sectionName || 'Integrated M.Tech - Programming in C'}</span>
                                      <span className="opacity-75 font-mono text-[9px]">({sec.joinCode || 'LQ-IMTC'})</span>
                                    </span>
                                  ))}
                                </div>
                              ) : (
                                <span className="text-slate-500 dark:text-slate-400 text-[10px] italic">No active class assigned</span>
                              )}
                            </div>
                          ) : (
                            <div className="space-y-1">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="text-indigo-600 dark:text-cyan-300 font-semibold text-xs">{u.department || '—'}</span>
                                <span className="text-slate-400 dark:text-slate-500 text-xs">•</span>
                                <span className="text-slate-700 dark:text-slate-300 text-xs font-medium">{u.year || '—'}</span>
                                
                              </div>
                              {u.sections && u.sections.length > 0 ? (
                                <div className="flex flex-wrap gap-1">
                                  {u.sections.map((sec: any) => (
                                    <span
                                      key={sec.id}
                                      className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold font-mono bg-cyan-50 dark:bg-cyan-500/15 text-cyan-700 dark:text-cyan-300 border border-cyan-200 dark:border-cyan-500/30"
                                      title={`Join Code: ${sec.joinCode || '—'}`}
                                    >
                                      {sec.sectionName || sec.joinCode || 'Section'}
                                    </span>
                                  ))}
                                </div>
                              ) : u.sectionName || u.sectionId ? (
                                <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold font-mono bg-cyan-50 dark:bg-cyan-500/15 text-cyan-700 dark:text-cyan-300 border border-cyan-200 dark:border-cyan-500/30">
                                  {u.sectionName || u.sectionId}
                                </span>
                              ) : (
                                <span className="text-slate-500 dark:text-slate-400 text-[10px] italic">General Student Roster</span>
                              )}
                            </div>
                          )}
                        </td>

                        {/* 3. Email Contact */}
                        <td className="px-4 py-3.5">
                          <div className="flex items-center gap-1.5 group">
                            <span className="text-slate-300 text-xs select-all truncate max-w-[210px]" title={u.email}>
                              {u.email || '—'}
                            </span>
                            {u.email && (
                              <button
                                type="button"
                                onClick={() => {
                                  navigator.clipboard.writeText(u.email);
                                  setCopiedEmailId(u.id);
                                  toast.success(`Copied: ${u.email}`);
                                  setTimeout(() => setCopiedEmailId(null), 2000);
                                }}
                                className="p-1 rounded hover:bg-white/10 text-slate-500 hover:text-cyan-300 transition-colors opacity-70 group-hover:opacity-100"
                                title="Copy email"
                              >
                                {copiedEmailId === u.id ? (
                                  <Check className="w-3 h-3 text-emerald-400" />
                                ) : (
                                  <Copy className="w-3 h-3" />
                                )}
                              </button>
                            )}
                          </div>
                        </td>

                        {/* 4. Activity / Role */}
                        <td className="px-4 py-3.5">
                          {u.role === 'ADMIN' ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[10px] font-bold font-mono bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                              <ShieldCheck className="w-3 h-3" />
                              SUPER ADMIN
                            </span>
                          ) : u.role === 'FACULTY' ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[10px] font-bold font-mono bg-blue-500/15 text-blue-300 border border-blue-500/30">
                              <GraduationCap className="w-3 h-3" />
                              FACULTY
                            </span>
                          ) : (
                            <div className="space-y-0.5">
                              <div className="flex items-center gap-1.5 font-bold text-amber-300 text-xs">
                                <Trophy className="w-3.5 h-3.5 text-amber-400" />
                                <span>{u.totalPoints || 0} PTS</span>
                              </div>
                              <div className="text-[11px] text-orange-400/90 font-medium">
                                🔥 {u.currentStreak || 0}d streak
                              </div>
                            </div>
                          )}
                        </td>

                        {/* 5. Actions */}
                        <td className="px-5 py-3.5 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end gap-1.5">
                            {(!u.role || u.role === 'STUDENT') && (
                              <button
                                onClick={() => setSelectedActivityUser(u)}
                                className="px-2.5 py-1.5 rounded-lg bg-cyan-500/10 border border-cyan-500/30 text-xs text-cyan-300 hover:bg-cyan-500/20 inline-flex items-center gap-1 font-mono font-medium transition"
                                title="View student activity dossier and test history"
                              >
                                <Activity className="w-3.5 h-3.5" />
                                <span>Activity</span>
                              </button>
                            )}

                            {u.role === 'STUDENT' && (
                              <button
                                type="button"
                                onClick={() => {
                                  setEditingAcademicUser(u);
                                  setAcademicEditForm({
                                    prn: u.prn || '',
                                    college: u.college || 'Sanjivani University',
                                    department: u.department || 'CSE',
                                    year: u.year || 'FY',
                                    division: u.division || '',
                                    adminPassword: '',
                                    reason: '',
                                  });
                                }}
                                className="p-1.5 rounded-lg bg-white/[0.05] border border-white/[0.08] hover:bg-white/[0.1] text-slate-300 hover:text-white transition"
                                title="Edit Academic Record & PRN"
                              >
                                <Edit3 className="w-3.5 h-3.5" />
                              </button>
                            )}

                            {filterRole === 'DELETED' ? (
                              <>
                                <button
                                  type="button"
                                  onClick={() => {
                                    if (window.confirm(`Restore account ${u.displayName || u.fullName || u.email} to active status?`)) {
                                      restoreUserMutation.mutate(u);
                                    }
                                  }}
                                  disabled={restoreUserMutation.isPending}
                                  className="px-2.5 py-1.5 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-xs text-emerald-400 hover:bg-emerald-500/25 inline-flex items-center gap-1 font-mono font-bold transition"
                                  title="Restore Account to Active"
                                >
                                  <RotateCcw className="w-3.5 h-3.5" />
                                  <span>Restore</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    if (window.confirm(`Permanently erase record ${u.displayName || u.fullName || u.email}? This cannot be undone.`)) {
                                      permanentDeleteMutation.mutate(u);
                                    }
                                  }}
                                  disabled={permanentDeleteMutation.isPending}
                                  className="p-1.5 rounded-lg bg-rose-500/15 border border-rose-500/30 text-rose-400 hover:bg-rose-500/25 transition"
                                  title="Permanently Erase Record"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </>
                            ) : (
                              <>
                                <select
                                  value={u.role || 'STUDENT'}
                                  onChange={(e) => {
                                    const targetRole = e.target.value;
                                    if (window.confirm(`Change ${u.displayName || u.fullName || u.email}'s role to ${targetRole}?`)) {
                                      roleMutation.mutate({
                                        id: u.id,
                                        role: targetRole,
                                      });
                                    }
                                  }}
                                  className="px-2 py-1.5 rounded-lg bg-dark-900 border border-white/10 text-[11px] text-slate-200 font-mono focus:outline-none focus:border-cyan-400 hover:border-white/20 transition cursor-pointer"
                                  title="Change user role"
                                >
                                  <option value="STUDENT">STUDENT</option>
                                  <option value="FACULTY">FACULTY</option>
                                  <option value="ADMIN">ADMIN</option>
                                </select>
                                <button
                                  type="button"
                                  onClick={() => {
                                    if (window.confirm(`Delete account ${u.displayName || u.fullName || u.email}? It will be removed from active members and moved to the Deleted tab.`)) {
                                      deleteUserMutation.mutate(u);
                                    }
                                  }}
                                  disabled={deleteUserMutation.isPending}
                                  className="p-1.5 rounded-lg bg-rose-500/10 border border-rose-500/20 hover:bg-rose-500/20 text-rose-400 hover:text-rose-300 transition"
                                  title="Delete Account (Move to Deleted tab)"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}

                  {users.length === 0 && (
                    <tr>
                      <td colSpan={5} className="py-12 text-center">
                        <div className="max-w-md mx-auto space-y-3">
                          <div className="w-12 h-12 rounded-2xl bg-white/[0.04] border border-white/[0.08] flex items-center justify-center mx-auto text-slate-400">
                            <Users className="w-6 h-6" />
                          </div>
                          <div className="text-sm font-bold text-white">No accounts found</div>
                          <p className="text-xs text-slate-400">
                            {filterRole !== 'ALL'
                              ? `No ${filterRole.toLowerCase()} accounts match your search or section filters.`
                              : 'No accounts match your search or academic criteria.'}
                          </p>
                          {(filterSearch || filterRole !== 'ALL' || filterSectionId !== 'ALL' || filterDepartment !== 'ALL') && (
                            <button
                              type="button"
                              onClick={() => {
                                setFilterSearch('');
                                setFilterRole('ALL');
                                setFilterSectionId('ALL');
                                setFilterDepartment('ALL');
                                setFilterYear('ALL');
                                setFilterDivision('');
                              }}
                              className="px-3.5 py-1.5 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 text-xs font-mono font-bold hover:bg-cyan-500/20 transition"
                            >
                              Reset All Filters
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
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
              { order: 2, title: 'Pointers and Functions', slug: 'pointers-and-functions', requirementText: 'Solve all 10 in Module 1', totalQuestions: 10 },
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

              {/* Daily Challenge Timer ON/OFF Widget */}
              <div className="flex items-center gap-1.5 p-1 rounded-xl bg-slate-900 border border-white/10 text-xs font-mono">
                <span className="flex items-center gap-1.5 px-2 py-1 text-[11px] font-bold">
                  <span
                    className={`w-2 h-2 rounded-full ${
                      dailySystemData?.data?.dailyChallengePaused
                        ? 'bg-amber-400 animate-pulse'
                        : 'bg-emerald-400 animate-ping'
                    }`}
                  />
                  <span className={dailySystemData?.data?.dailyChallengePaused ? 'text-amber-400' : 'text-emerald-400'}>
                    Timer: {dailySystemData?.data?.dailyChallengePaused ? 'OFF' : 'ON'}
                  </span>
                </span>
                <button
                  type="button"
                  disabled={!dailySystemData?.data?.dailyChallengePaused || resumeDailyMutation.isPending}
                  onClick={() => resumeDailyMutation.mutate({ mode: 'START_NOW' } as any)}
                  className={`px-3 py-1.5 rounded-lg font-bold transition flex items-center gap-1.5 text-xs ${
                    !dailySystemData?.data?.dailyChallengePaused
                      ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 opacity-70 cursor-default'
                      : 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow hover:shadow-emerald-500/20 active:scale-95'
                  }`}
                  title="Turn Daily Timer ON (Resume submissions & countdown immediately)"
                >
                  <Play className="w-3.5 h-3.5 fill-current" />
                  <span>Turn ON</span>
                </button>
                <button
                  type="button"
                  disabled={dailySystemData?.data?.dailyChallengePaused || pauseDailyMutation.isPending}
                  onClick={() => pauseDailyMutation.mutate({ reason: 'Admin paused timer' } as any)}
                  className={`px-3 py-1.5 rounded-lg font-bold transition flex items-center gap-1.5 text-xs ${
                    dailySystemData?.data?.dailyChallengePaused
                      ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30 opacity-70 cursor-default'
                      : 'bg-rose-500/90 hover:bg-rose-500 text-white shadow hover:shadow-rose-500/20 active:scale-95'
                  }`}
                  title="Turn Daily Timer OFF (Pause submissions & freeze countdown)"
                >
                  <Pause className="w-3.5 h-3.5 fill-current" />
                  <span>Turn OFF</span>
                </button>
              </div>
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
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={resumeDailyMutation.isPending}
                  onClick={() => resumeDailyMutation.mutate({ mode: 'START_NOW' } as any)}
                  className="px-4 py-2 rounded-xl text-xs font-mono font-bold bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 hover:from-emerald-400 hover:to-teal-400 shadow-md whitespace-nowrap transition-all flex items-center gap-1.5"
                >
                  <Play className="w-3.5 h-3.5 fill-current" />
                  <span>{resumeDailyMutation.isPending ? 'Starting...' : 'Turn ON Daily Timer'}</span>
                </button>
              </div>
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
                          {entry.year || '—'}
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

      {/* Tab: System & Judge Health */}
      {activeTab === 'system' && (
        <div className="space-y-6" data-testid="admin-system-health-panel">
          {/* Top Header Card */}
          <div className="glass-card p-6 rounded-2xl border border-slate-200 dark:border-white/[0.08] flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="space-y-1">
              <h3 className="text-base font-mono font-bold text-slate-900 dark:text-white uppercase flex items-center gap-2">
                <Activity className="w-5 h-5 text-emerald-500" />
                <span>System & Compiler Health Diagnostics</span>
              </h3>
              <p className="text-xs font-mono text-slate-600 dark:text-slate-400 max-w-2xl">
                Real-time observability of C11 GCC sandbox, Render cloud runtime, PostgreSQL/Firestore data persistence, and automated challenge schedulers.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {healthLatencyMs !== null && (
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-white/[0.04] border border-slate-200 dark:border-white/[0.08] text-xs font-mono">
                  <Zap className="w-3.5 h-3.5 text-amber-500" />
                  <span className="text-slate-500 dark:text-slate-400">Ping:</span>
                  <span className={`font-bold ${healthLatencyMs < 350 ? 'text-emerald-600 dark:text-emerald-400' : healthLatencyMs < 1500 ? 'text-amber-600 dark:text-amber-400' : 'text-rose-600 dark:text-rose-400'}`}>
                    {healthLatencyMs}ms
                  </span>
                </div>
              )}
              <button
                type="button"
                onClick={() => {
                  refetchHealth();
                  refetchDiagnostics();
                }}
                disabled={isHealthFetching || isDiagnosticsFetching}
                className="flex items-center gap-2 px-3 py-1.5 rounded-xl font-mono text-xs font-bold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-white/[0.05] border border-slate-200 dark:border-white/10 hover:bg-slate-200 dark:hover:bg-white/[0.1] transition-all cursor-pointer"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${(isHealthFetching || isDiagnosticsFetching) ? 'animate-spin' : ''}`} />
                <span>Refresh Status</span>
              </button>
            </div>
          </div>

          {/* Overall Health Status Banner */}
          <div className={`p-4 rounded-2xl border flex items-center gap-3 text-xs font-mono ${
            healthData?.status === 'healthy' && (diagnosticsData?.judge?.ready ?? healthData?.judge?.ready)
              ? 'bg-emerald-500/[0.08] border-emerald-500/30 text-emerald-800 dark:text-emerald-300'
              : 'bg-amber-500/[0.08] border-amber-500/30 text-amber-800 dark:text-amber-300'
          }`}>
            <CheckCircle2 className="w-5 h-5 flex-shrink-0 text-emerald-500" />
            <div>
              <span className="font-bold uppercase tracking-wider block">
                {healthData?.status === 'healthy' && (diagnosticsData?.judge?.ready ?? healthData?.judge?.ready)
                  ? 'All Systems Operational'
                  : 'Backend Services Synchronizing'}
              </span>
              <span className="text-slate-600 dark:text-slate-400 text-[11px]">
                {healthData?.status === 'healthy' && (diagnosticsData?.judge?.ready ?? healthData?.judge?.ready)
                  ? 'LogicQ C11 evaluation pipeline is fully functional and ready to accept student submissions.'
                  : 'Connecting to cloud backend services... Ping in progress.'}
              </span>
            </div>
          </div>

          {/* 4 Core Health Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 font-mono text-xs">
            {/* C11 Isolated Judge */}
            <div className="glass-card p-5 rounded-2xl border border-slate-200 dark:border-white/[0.08] space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-slate-500 dark:text-slate-400 uppercase text-[10px] tracking-wider flex items-center gap-1.5 font-bold">
                  <Cpu className="w-3.5 h-3.5 text-cyan-500" />
                  <span>C11 GCC Judge</span>
                </span>
                <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                  (diagnosticsData?.judge?.ready ?? healthData?.judge?.ready)
                    ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30'
                    : 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30'
                }`}>
                  {(diagnosticsData?.judge?.ready ?? healthData?.judge?.ready) ? 'READY' : 'OFFLINE'}
                </span>
              </div>
              <div className="space-y-1 text-slate-600 dark:text-slate-300">
                <p>Runner: <span className="text-cyan-600 dark:text-cyan-400 font-bold">{diagnosticsData?.judge?.name || healthData?.judge?.name || 'LocalGccJudge'}</span></p>
                <p>Standard: <span className="text-slate-900 dark:text-white font-semibold">C11 (-std=c11 -O2)</span></p>
                <p>Limits: <span className="text-emerald-600 dark:text-emerald-400 font-bold">2.0s / 128 MB</span></p>
                <p>Sandbox: <span className="text-slate-500 dark:text-slate-400 text-[11px]">Job Object / cgroups</span></p>
              </div>
            </div>

            {/* LogicQ API & Cloud Server */}
            <div className="glass-card p-5 rounded-2xl border border-slate-200 dark:border-white/[0.08] space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-slate-500 dark:text-slate-400 uppercase text-[10px] tracking-wider flex items-center gap-1.5 font-bold">
                  <Server className="w-3.5 h-3.5 text-purple-500" />
                  <span>Cloud API Server</span>
                </span>
                <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                  healthData?.status === 'healthy'
                    ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30'
                    : 'bg-rose-500/15 text-rose-700 dark:text-rose-300 border border-rose-500/30'
                }`}>
                  {healthData?.status?.toUpperCase() || (isHealthLoading ? 'CHECKING...' : 'OFFLINE')}
                </span>
              </div>
              <div className="space-y-1 text-slate-600 dark:text-slate-300">
                <p>Runtime: <span className="text-slate-900 dark:text-white font-bold">{diagnosticsData?.server?.nodeVersion || 'Node.js 20.x'}</span></p>
                <p>Platform: <span className="text-cyan-600 dark:text-cyan-400 font-semibold">{diagnosticsData?.server?.platform || 'linux'} ({diagnosticsData?.server?.arch || 'x64'})</span></p>
                <p>Uptime: <span className="text-emerald-600 dark:text-emerald-400 font-semibold">{Math.floor((diagnosticsData?.server?.uptimeSeconds || 0) / 60)} mins</span></p>
                <p>RAM (RSS): <span className="text-slate-500 dark:text-slate-400 text-[11px]">{diagnosticsData?.server?.memory?.rssMb ? `${diagnosticsData.server.memory.rssMb} MB` : 'Normal'}</span></p>
              </div>
            </div>

            {/* Database & Persistence */}
            <div className="glass-card p-5 rounded-2xl border border-slate-200 dark:border-white/[0.08] space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-slate-500 dark:text-slate-400 uppercase text-[10px] tracking-wider flex items-center gap-1.5 font-bold">
                  <Database className="w-3.5 h-3.5 text-emerald-500" />
                  <span>Databases</span>
                </span>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30">
                  CONNECTED
                </span>
              </div>
              <div className="space-y-1 text-slate-600 dark:text-slate-300">
                <p>Relational: <span className="text-slate-900 dark:text-white font-semibold">PostgreSQL (Prisma)</span></p>
                <p>DB Latency: <span className="text-emerald-600 dark:text-emerald-400 font-bold">{diagnosticsData?.database?.latencyMs ?? 12}ms</span></p>
                <p>Primary Store: <span className="text-cyan-600 dark:text-cyan-400 font-semibold">Google Firestore</span></p>
                <p>Telemetry: <span className="text-slate-500 dark:text-slate-400 text-[11px]">Real-time Sync Active</span></p>
              </div>
            </div>

            {/* Daily Challenge Scheduler */}
            <div className="glass-card p-5 rounded-2xl border border-slate-200 dark:border-white/[0.08] space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-slate-500 dark:text-slate-400 uppercase text-[10px] tracking-wider flex items-center gap-1.5 font-bold">
                  <Clock className="w-3.5 h-3.5 text-amber-500" />
                  <span>Daily Scheduler</span>
                </span>
                <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                  diagnosticsData?.dailySystem?.paused
                    ? 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30'
                    : 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30'
                }`}>
                  {diagnosticsData?.dailySystem?.paused ? 'PAUSED' : 'SCHEDULED'}
                </span>
              </div>
              <div className="space-y-1 text-slate-600 dark:text-slate-300">
                <p>Lock Time: <span className="text-slate-900 dark:text-white font-bold">17:00 IST (5:00 PM)</span></p>
                <p>Grace Window: <span className="text-amber-600 dark:text-amber-400 font-semibold">10 mins (till 17:10)</span></p>
                <p>Auto Finalize: <span className="text-emerald-600 dark:text-emerald-400 font-semibold">17:10 IST Daily</span></p>
                <p>Scheduler: <span className="text-slate-500 dark:text-slate-400 text-[11px]">{diagnosticsData?.dailySystem?.paused ? 'Paused by Admin' : 'Cron Enabled'}</span></p>
              </div>
            </div>
          </div>

          {/* Interactive C11 Compiler Diagnostic Probe Card */}
          <div className="glass-card p-6 rounded-2xl border border-slate-200 dark:border-white/[0.08] space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-200 dark:border-white/[0.06]">
              <div>
                <h4 className="text-sm font-mono font-bold text-slate-900 dark:text-white uppercase flex items-center gap-2">
                  <Zap className="w-4 h-4 text-amber-500" />
                  <span>Live C11 Compiler & Sandbox Probe</span>
                </h4>
                <p className="text-xs font-mono text-slate-600 dark:text-slate-400 mt-0.5">
                  Execute an isolated test program inside the active GCC sandbox to verify stdout matching, memory tracking, and compilation speed.
                </p>
              </div>
              <button
                type="button"
                onClick={() => runProbeMutation.mutate()}
                disabled={runProbeMutation.isPending}
                className="flex items-center gap-2 px-4 py-2 rounded-xl font-mono text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 shadow-md shadow-indigo-600/30 transition-all disabled:opacity-50 cursor-pointer flex-shrink-0"
              >
                <Play className={`w-3.5 h-3.5 ${runProbeMutation.isPending ? 'animate-spin' : ''}`} />
                <span>{runProbeMutation.isPending ? 'Compiling & Executing...' : 'Run Live Compiler Probe'}</span>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Probe Test Snippet */}
              <div className="space-y-2">
                <span className="text-xs font-mono text-slate-700 dark:text-slate-300 block font-bold uppercase tracking-wider">
                  Test Program Payload:
                </span>
                <pre className="p-4 rounded-xl bg-slate-950 border border-slate-800 text-cyan-300 font-mono text-xs overflow-x-auto shadow-inner leading-relaxed">
{`#include <stdio.h>

int main() {
    printf("LOGICQ_C11_PROBE_SUCCESS\\n");
    return 0;
}`}
                </pre>
              </div>

              {/* Probe Result Card */}
              <div className="space-y-2">
                <span className="text-xs font-mono text-slate-700 dark:text-slate-300 block font-bold uppercase tracking-wider">
                  Diagnostic Probe Telemetry:
                </span>
                {runProbeMutation.isPending ? (
                  <div className="p-6 rounded-xl bg-indigo-500/[0.08] border border-indigo-500/20 text-center space-y-2">
                    <RefreshCw className="w-5 h-5 text-indigo-500 animate-spin mx-auto" />
                    <p className="text-xs font-mono text-indigo-700 dark:text-indigo-300 font-bold">Compiling test binary with GCC C11...</p>
                    <p className="text-[11px] font-mono text-slate-500 dark:text-slate-400">Enforcing sandbox isolation and capturing standard output.</p>
                  </div>
                ) : probeResult ? (
                  <div className="p-4 rounded-xl bg-slate-100 dark:bg-dark-950 border border-slate-300 dark:border-white/[0.08] space-y-3 font-mono text-xs shadow-sm">
                    <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-white/[0.06]">
                      <span className="text-slate-700 dark:text-slate-300 font-bold">Probe Verdict:</span>
                      <span className={`px-2.5 py-0.5 rounded text-[10px] font-bold ${
                        probeResult.passed
                          ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30'
                          : 'bg-rose-500/15 text-rose-700 dark:text-rose-300 border border-rose-500/30'
                      }`}>
                        {probeResult.passed ? '✓ PASSED (ACCEPTED)' : `FAILED: ${probeResult.verdict}`}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-3 text-slate-700 dark:text-slate-300">
                      <div>
                        <span className="text-slate-500 dark:text-slate-400 text-[10px] block font-semibold">Execution Runtime</span>
                        <span className="font-bold text-emerald-600 dark:text-emerald-400 text-sm">{probeResult.runtimeMs} ms</span>
                      </div>
                      <div>
                        <span className="text-slate-500 dark:text-slate-400 text-[10px] block font-semibold">Total Pipeline (Compile + Run)</span>
                        <span className="font-bold text-cyan-600 dark:text-cyan-400 text-sm">{probeResult.totalDurationMs} ms</span>
                      </div>
                      <div>
                        <span className="text-slate-500 dark:text-slate-400 text-[10px] block font-semibold">Memory Tracked</span>
                        <span className="font-bold text-slate-900 dark:text-white text-sm">{Math.round((probeResult.memoryKb || 0) / 1024 * 10) / 10 || 3.8} MB</span>
                      </div>
                      <div>
                        <span className="text-slate-500 dark:text-slate-400 text-[10px] block font-semibold">Runner Engine</span>
                        <span className="font-bold text-purple-600 dark:text-purple-400 text-sm">{probeResult.runner || 'LocalGccJudge'}</span>
                      </div>
                    </div>

                    <div className="pt-2 border-t border-slate-200 dark:border-white/[0.06]">
                      <span className="text-slate-500 dark:text-slate-400 text-[10px] block font-semibold">Stdout Received:</span>
                      <code className="text-emerald-700 dark:text-emerald-300 font-mono text-xs font-bold block mt-1 px-2.5 py-1.5 rounded bg-emerald-100 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-500/20">
                        "{probeResult.stdout}"
                      </code>
                    </div>
                  </div>
                ) : (
                  <div className="p-6 rounded-xl bg-slate-100 dark:bg-dark-900/60 border border-slate-200 dark:border-white/[0.06] text-center space-y-1">
                    <Terminal className="w-5 h-5 text-slate-400 dark:text-slate-500 mx-auto" />
                    <p className="text-xs font-mono text-slate-700 dark:text-slate-400 font-bold">Compiler probe idle</p>
                    <p className="text-[11px] font-mono text-slate-500 dark:text-slate-500">
                      Click the "Run Live Compiler Probe" button above to execute a real-time verification run.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Sandbox Resource & Security Policies Reference */}
          <div className="glass-card p-6 rounded-2xl border border-slate-200 dark:border-white/[0.08] space-y-3 font-mono text-xs">
            <h4 className="text-sm font-bold text-slate-900 dark:text-white uppercase flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-500" />
              <span>Sandbox Isolation & Compiler Policy Reference</span>
            </h4>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs divide-y divide-slate-200 dark:divide-white/[0.06]">
                <tbody className="divide-y divide-slate-200 dark:divide-white/[0.04]">
                  <tr>
                    <td className="py-2.5 text-slate-500 dark:text-slate-400 font-semibold w-1/3">Language & Standard</td>
                    <td className="py-2.5 text-slate-900 dark:text-white font-medium">GNU C (ISO/IEC 9899:2011 C11)</td>
                  </tr>
                  <tr>
                    <td className="py-2.5 text-slate-500 dark:text-slate-400 font-semibold">Compiler Flags</td>
                    <td className="py-2.5 text-cyan-600 dark:text-cyan-300 font-medium">gcc -std=c11 -O2 -Wall -Wextra -Werror=vla</td>
                  </tr>
                  <tr>
                    <td className="py-2.5 text-slate-500 dark:text-slate-400 font-semibold">CPU Time Limit</td>
                    <td className="py-2.5 text-emerald-600 dark:text-emerald-400 font-bold">2,000 ms (2.0s) per test case</td>
                  </tr>
                  <tr>
                    <td className="py-2.5 text-slate-500 dark:text-slate-400 font-semibold">Memory Ceiling</td>
                    <td className="py-2.5 text-emerald-600 dark:text-emerald-400 font-bold">128 MB RAM max</td>
                  </tr>
                  <tr>
                    <td className="py-2.5 text-slate-500 dark:text-slate-400 font-semibold">Security Restrictions</td>
                    <td className="py-2.5 text-slate-700 dark:text-slate-300">No raw sockets, no sub-processes, system()/popen() static guard blocked</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

{/* Anti-Cheat moved to Submissions & Anti-Cheat tab */}

      {/* Tab: Sections & Student Roster Management */}
      {activeTab === 'sections' && (
        <SectionManagementPage />
      )}

      {/* Student Activity Inspector Modal */}
      {selectedActivityUser && (
        <StudentActivityInspectorModal
          user={selectedActivityUser}
          onClose={() => setSelectedActivityUser(null)}
          onEditAcademic={(u) => {
            setEditingAcademicUser(u);
            setAcademicEditForm({
              prn: u.prn || '',
              college: u.college || 'Sanjivani University',
              department: u.department || 'CSE',
              year: u.year || 'FY',
              division: u.division || '',
              adminPassword: '',
              reason: '',
            });
          }}
          onBanToggle={(u) => {
            const newBanStatus = !u.isBanned;
            if (
              window.confirm(
                `Are you sure you want to ${newBanStatus ? 'BAN' : 'UNBAN'} student ${
                  u.displayName || u.username
                }?`
              )
            ) {
              banMutation.mutate({
                id: u.id,
                isBanned: newBanStatus,
              });
              setSelectedActivityUser((prev: any) =>
                prev ? { ...prev, isBanned: newBanStatus } : null
              );
            }
          }}
          onInspectCode={(code) => setSelectedSubmissionCode(code)}
          onDownloadCsv={(u) => handleDownloadSingleStudentCsv(u)}
          revealedPrn={revealedPrns[selectedActivityUser.id]}
        />
      )}

      {/* Audited Admin PRN & College Edit Modal */}
      {editingAcademicUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="w-full max-w-lg glass-card rounded-2xl border border-[var(--border-line)] bg-[var(--bg-panel)] shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-[var(--text-main)] font-mono">
                Audited PRN & Academic Record Update
              </h3>
              <button
                onClick={() => setEditingAcademicUser(null)}
                className="text-[var(--text-muted)] hover:text-[var(--text-main)] cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-[var(--text-muted)] leading-relaxed">
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
                  <label htmlFor="audit-prn" className="block text-xs font-mono text-[var(--text-main)] font-semibold">
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
                  className="w-full px-3 py-2 rounded-lg bg-[var(--bg-surface)] border border-[var(--border-line)] text-xs font-mono text-[var(--text-main)] tracking-wider"
                />
                <PrnFormatGuide value={academicEditForm.prn} />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label htmlFor="audit-college" className="block text-xs font-mono text-[var(--text-main)] font-semibold mb-1">
                    College
                  </label>
                  <select
                    id="audit-college"
                    value={academicEditForm.college}
                    onChange={(e) =>
                      setAcademicEditForm({ ...academicEditForm, college: e.target.value })
                    }
                    className="w-full px-3 py-2 rounded-lg bg-[var(--bg-surface)] border border-[var(--border-line)] text-xs font-mono text-[var(--text-main)]"
                  >
                    {ALLOWED_COLLEGES.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label htmlFor="audit-dept" className="block text-xs font-mono text-[var(--text-main)] font-semibold mb-1">
                    Department
                  </label>
                  <select
                    id="audit-dept"
                    value={academicEditForm.department}
                    onChange={(e) =>
                      setAcademicEditForm({ ...academicEditForm, department: e.target.value })
                    }
                    className="w-full px-3 py-2 rounded-lg bg-[var(--bg-surface)] border border-[var(--border-line)] text-xs font-mono text-[var(--text-main)]"
                  >
                    {ALLOWED_DEPARTMENTS.map((d) => (
                      <option key={d} value={d}>
                        {d}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label htmlFor="audit-year" className="block text-xs font-mono text-[var(--text-main)] font-semibold mb-1">
                    Year
                  </label>
                  <select
                    id="audit-year"
                    value={academicEditForm.year}
                    onChange={(e) =>
                      setAcademicEditForm({ ...academicEditForm, year: e.target.value })
                    }
                    className="w-full px-3 py-2 rounded-lg bg-[var(--bg-surface)] border border-[var(--border-line)] text-xs font-mono text-[var(--text-main)]"
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
                <label htmlFor="audit-reason" className="block text-xs font-mono text-[var(--text-main)] font-semibold mb-1">
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
                  className="w-full px-3 py-2 rounded-lg bg-[var(--bg-surface)] border border-[var(--border-line)] text-xs font-mono text-[var(--text-main)]"
                />
              </div>

              <div>
                <label htmlFor="audit-password" className="block text-xs font-mono text-[var(--text-main)] font-semibold mb-1">
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
                  className="w-full px-3 py-2 rounded-lg bg-[var(--bg-surface)] border border-[var(--border-line)] text-xs font-mono text-[var(--text-main)]"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-[var(--border-line)]">
                <button
                  type="button"
                  onClick={() => setEditingAcademicUser(null)}
                  className="px-4 py-2 rounded-lg text-xs font-mono font-bold text-[var(--text-muted)] hover:text-[var(--text-main)] cursor-pointer"
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
          <div className="w-full max-w-2xl glass-card rounded-2xl border border-[var(--border-line)] bg-[var(--bg-panel)] shadow-2xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-bold text-[var(--text-main)] font-mono">Inspecting Student Solution</h3>
              <button
                onClick={() => setSelectedSubmissionCode(null)}
                className="text-[var(--text-muted)] hover:text-[var(--text-main)] cursor-pointer"
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
          <div className="w-full max-w-3xl glass-card rounded-2xl border border-[var(--border)] bg-[var(--card)] shadow-2xl p-6 sm:p-8 overflow-y-auto max-h-[90vh]">
            <div className="flex items-center justify-between mb-6 pb-3 border-b border-[var(--border)]">
              <h3 className="text-xl font-bold text-[var(--foreground)] flex items-center gap-2 font-mono">
                <Code2 className="w-5 h-5 text-cyan-500" />
                <span>{editingProblem ? `Edit Challenge: ${editingProblem.title}` : 'Author LogicQ Challenge'}</span>
              </h3>
              <button
                onClick={() => {
                  setIsCreateProblemOpen(false);
                  setEditingProblem(null);
                }}
                className="text-[var(--muted-foreground)] hover:text-[var(--foreground)] p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-white/10 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-mono font-bold text-[var(--foreground)] mb-1 uppercase">
                    Challenge Title
                  </label>
                  <input
                    type="text"
                    required
                    value={problemForm.title}
                    onChange={(e) => {
                      const title = e.target.value;
                      const autoSlug = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
                      setProblemForm((prev) => ({
                        ...prev,
                        title,
                        slug: editingProblem ? prev.slug : autoSlug,
                      }));
                    }}
                    placeholder="e.g. Inverted Binary Tree in C"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-dark-900 border border-slate-300 dark:border-white/10 text-xs font-mono text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-cyan-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-mono font-bold text-[var(--foreground)] mb-1 uppercase">
                    Slug (URL Key)
                  </label>
                  <input
                    type="text"
                    required
                    value={problemForm.slug}
                    onChange={(e) => setProblemForm({ ...problemForm, slug: e.target.value })}
                    placeholder="e.g. inverted-binary-tree"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-dark-900 border border-slate-300 dark:border-white/10 text-xs font-mono text-cyan-600 dark:text-cyan-400 placeholder-slate-400 focus:outline-none focus:border-cyan-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-mono font-bold text-[var(--foreground)] mb-1 uppercase">
                    Difficulty
                  </label>
                  <select
                    value={problemForm.difficulty}
                    onChange={(e) => {
                      const diff = e.target.value as Difficulty;
                      const suggestedPoints = diff === 'EASY' ? 10 : diff === 'MEDIUM' ? 20 : 40;
                      setProblemForm({
                        ...problemForm,
                        difficulty: diff,
                        basePoints: suggestedPoints,
                      });
                    }}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-dark-900 border border-slate-300 dark:border-white/10 text-xs font-mono text-slate-900 dark:text-white focus:outline-none focus:border-cyan-500"
                  >
                    <option value="EASY">🟢 EASY (10 pts)</option>
                    <option value="MEDIUM">🟡 MEDIUM (20 pts)</option>
                    <option value="HARD">🔴 HARD (40 pts)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-mono font-bold text-[var(--foreground)] mb-1 uppercase">
                    Base Points
                  </label>
                  <input
                    type="number"
                    value={problemForm.basePoints}
                    onChange={(e) =>
                      setProblemForm({ ...problemForm, basePoints: parseInt(e.target.value) || 20 })
                    }
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-dark-900 border border-slate-300 dark:border-white/10 text-xs font-mono text-slate-900 dark:text-white focus:outline-none focus:border-cyan-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-mono font-bold text-[var(--foreground)] mb-1 uppercase">
                    Category / Topic
                  </label>
                  <select
                    value={STANDARD_C_CATEGORIES.includes(problemForm.category) ? problemForm.category : 'CUSTOM'}
                    onChange={(e) => {
                      if (e.target.value !== 'CUSTOM') {
                        setProblemForm({ ...problemForm, category: e.target.value });
                      }
                    }}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-dark-900 border border-slate-300 dark:border-white/10 text-xs font-mono text-slate-900 dark:text-white focus:outline-none focus:border-cyan-500"
                  >
                    {STANDARD_C_CATEGORIES.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                    <option value="CUSTOM">Custom Topic...</option>
                  </select>
                </div>
              </div>

              {!STANDARD_C_CATEGORIES.includes(problemForm.category) && (
                <div>
                  <label className="block text-xs font-mono font-bold text-[var(--foreground)] mb-1 uppercase">
                    Custom Topic Name
                  </label>
                  <input
                    type="text"
                    required
                    value={problemForm.category}
                    onChange={(e) => setProblemForm({ ...problemForm, category: e.target.value })}
                    placeholder="Enter custom topic..."
                    className="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-dark-900 border border-slate-300 dark:border-white/10 text-xs font-mono text-slate-900 dark:text-white focus:outline-none focus:border-cyan-500"
                  />
                </div>
              )}

              {/* Statement with Tab Switcher */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 p-1 bg-slate-100 dark:bg-dark-900 rounded-xl border border-slate-200 dark:border-white/10">
                    <button
                      type="button"
                      onClick={() => setStatementTab('EDIT')}
                      className={`px-3 py-1 rounded-lg text-xs font-mono font-bold transition-all ${
                        statementTab === 'EDIT'
                          ? 'bg-indigo-600 text-white shadow-sm'
                          : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                      }`}
                    >
                      ✏️ Edit Markdown
                    </button>
                    <button
                      type="button"
                      onClick={() => setStatementTab('PREVIEW')}
                      className={`px-3 py-1 rounded-lg text-xs font-mono font-bold transition-all ${
                        statementTab === 'PREVIEW'
                          ? 'bg-indigo-600 text-white shadow-sm'
                          : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                      }`}
                    >
                      👁️ Student Preview
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      const cleaned = sanitizeMathInStatement(problemForm.description);
                      setProblemForm({ ...problemForm, description: cleaned });
                      toast.success('Converted math to clean Unicode symbols');
                    }}
                    className="text-xs font-mono text-cyan-600 dark:text-cyan-400 hover:underline cursor-pointer"
                  >
                    Auto-Format Unicode Math
                  </button>
                </div>

                {statementTab === 'EDIT' ? (
                  <textarea
                    rows={6}
                    required
                    value={problemForm.description}
                    onChange={(e) => setProblemForm({ ...problemForm, description: e.target.value })}
                    placeholder="Enter problem statement, input constraints, and format..."
                    className="w-full p-3.5 rounded-xl bg-slate-50 dark:bg-dark-900 border border-slate-300 dark:border-white/10 text-xs font-mono text-slate-900 dark:text-white leading-relaxed resize-none focus:outline-none focus:border-cyan-500"
                  />
                ) : (
                  <div className="p-4 rounded-xl bg-slate-50 dark:bg-dark-950 border border-slate-200 dark:border-white/10 min-h-[140px] text-xs max-h-64 overflow-y-auto">
                    <StatementMarkdown content={problemForm.description} />
                  </div>
                )}
                {/Kanetkar|Test Your C Skills/i.test(`${problemForm.title} ${problemForm.description}`) && (
                  <p className="text-[11px] font-mono text-rose-500 font-semibold">
                    🚫 Blocked: Direct book citation or author name detected. Keep problem statements reworded without author/book names.
                  </p>
                )}
              </div>

              {/* Starter Code */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-mono font-bold text-[var(--foreground)] uppercase">
                    Starter C Boilerplate
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      setProblemForm({
                        ...problemForm,
                        starterCode: `#include <stdio.h>\n\nint main() {\n    // Write your solution logic here\n    return 0;\n}`,
                      });
                      toast.info('Reset to standard C11 template');
                    }}
                    className="text-[11px] font-mono text-slate-500 dark:text-slate-400 hover:text-cyan-600 dark:hover:text-cyan-400 cursor-pointer"
                  >
                    Reset to C11 Template
                  </button>
                </div>
                <textarea
                  rows={4}
                  required
                  value={problemForm.starterCode}
                  onChange={(e) => setProblemForm({ ...problemForm, starterCode: e.target.value })}
                  className="w-full p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs font-mono text-cyan-200 resize-none focus:outline-none focus:border-cyan-500"
                />
              </div>

              {/* Test Cases Manager */}
              <div className="space-y-3 pt-3 border-t border-slate-200 dark:border-white/10">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono text-[var(--foreground)] font-bold uppercase">
                    Test Cases ({problemForm.testCases.length})
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleAddTestCase(false)}
                      className="px-2.5 py-1 rounded-lg text-xs font-mono text-cyan-700 dark:text-cyan-300 bg-cyan-50 dark:bg-cyan-950/40 border border-cyan-300 dark:border-cyan-500/30 hover:bg-cyan-100 dark:hover:bg-cyan-950/60 flex items-center gap-1 transition"
                    >
                      <Plus className="w-3.5 h-3.5" /> Public Sample
                    </button>
                    <button
                      type="button"
                      onClick={() => handleAddTestCase(true)}
                      className="px-2.5 py-1 rounded-lg text-xs font-mono text-purple-700 dark:text-purple-300 bg-purple-50 dark:bg-purple-950/40 border border-purple-300 dark:border-purple-500/30 hover:bg-purple-100 dark:hover:bg-purple-950/60 flex items-center gap-1 transition"
                    >
                      <Lock className="w-3.5 h-3.5" /> Hidden Test
                    </button>
                  </div>
                </div>

                {problemForm.testCases.map((tc, index) => (
                  <div
                    key={index}
                    className="p-3.5 rounded-xl bg-slate-50 dark:bg-dark-950 border border-slate-200 dark:border-white/10 space-y-2.5 text-xs font-mono shadow-sm"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-800 dark:text-white">Case #{index + 1}</span>
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          tc.isHidden
                            ? 'bg-purple-100 dark:bg-purple-950/50 text-purple-700 dark:text-purple-300 border border-purple-300 dark:border-purple-500/30'
                            : 'bg-cyan-100 dark:bg-cyan-950/50 text-cyan-700 dark:text-cyan-300 border border-cyan-300 dark:border-cyan-500/30'
                        }`}>
                          {tc.isHidden ? '🔒 Hidden Evaluation Case' : '👁️ Public Example (Visible to Students)'}
                        </span>
                      </div>
                      <div className="flex items-center gap-3">
                        <label className="flex items-center gap-1.5 cursor-pointer text-slate-600 dark:text-slate-400">
                          <input
                            type="checkbox"
                            checked={tc.isHidden}
                            onChange={(e) =>
                              handleTestCaseChange(index, 'isHidden', e.target.checked)
                            }
                            className="rounded border-slate-300 text-cyan-600 focus:ring-cyan-500"
                          />
                          <span>Hidden</span>
                        </label>
                        {problemForm.testCases.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleRemoveTestCase(index)}
                            className="text-rose-600 dark:text-rose-400 hover:underline"
                          >
                            Remove
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <span className="text-[10px] text-slate-500 dark:text-slate-400 font-semibold block mb-1">
                          STDIN INPUT
                        </span>
                        <textarea
                          rows={2}
                          value={tc.input}
                          onChange={(e) => handleTestCaseChange(index, 'input', e.target.value)}
                          placeholder="e.g. 10 20"
                          className="w-full p-2 rounded-lg bg-white dark:bg-dark-900 border border-slate-300 dark:border-white/10 text-cyan-700 dark:text-cyan-300 text-xs font-mono resize-none focus:outline-none focus:border-cyan-500"
                        />
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-500 dark:text-slate-400 font-semibold block mb-1">
                          EXPECTED STDOUT
                        </span>
                        <textarea
                          rows={2}
                          value={tc.expectedOutput}
                          onChange={(e) =>
                            handleTestCaseChange(index, 'expectedOutput', e.target.value)
                          }
                          placeholder="e.g. 30"
                          className="w-full p-2 rounded-lg bg-white dark:bg-dark-900 border border-slate-300 dark:border-white/10 text-emerald-700 dark:text-emerald-300 text-xs font-mono resize-none focus:outline-none focus:border-cyan-500"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-[var(--border)]">
                <button
                  type="button"
                  onClick={() => {
                    setIsCreateProblemOpen(false);
                    setEditingProblem(null);
                  }}
                  className="px-4 py-2 rounded-xl font-mono text-xs text-[var(--muted-foreground)] hover:text-[var(--foreground)] border border-[var(--border)] transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createProblemMutation.isPending || updateProblemMutation.isPending}
                  className="px-5 py-2.5 rounded-xl font-mono text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 shadow-md shadow-indigo-600/30 transition disabled:opacity-50"
                >
                  {editingProblem
                    ? updateProblemMutation.isPending
                      ? 'Updating...'
                      : 'Save Changes'
                    : createProblemMutation.isPending
                    ? 'Publishing...'
                    : 'Publish Challenge'}
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
                if (/(\$[^\$\n]+\$|\\[a-zA-Z]+)/.test(newPracticeProblemForm.description)) {
                  const allowed = new Set(['\\n', '\\t', '\\r', '\\"', "\\'"]);
                  const matches = newPracticeProblemForm.description.match(/(\$[^\$\n]+\$|\\[a-zA-Z]+)/g) || [];
                  const violations = matches.filter((m) => !allowed.has(m) && !m.startsWith('\\n') && !m.startsWith('\\t'));
                  if (violations.length > 0) {
                    toast.error(`Practice problem description contains unrendered LaTeX (${violations.slice(0, 3).join(', ')}). Click 'Auto-Format to Clean Unicode' before saving.`);
                    return;
                  }
                }
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
                      { slug: 'pointers-and-functions', title: 'Pointers and Functions' },
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
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-mono text-slate-300">
                    PROBLEM STATEMENT (MARKDOWN)
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      const cleaned = sanitizeMathInStatement(newPracticeProblemForm.description);
                      setNewPracticeProblemForm({ ...newPracticeProblemForm, description: cleaned });
                      toast.success('Converted math to clean Unicode symbols');
                    }}
                    className="text-[11px] font-mono text-cyan-400 hover:text-cyan-300 underline"
                  >
                    Auto-Format to Clean Unicode
                  </button>
                </div>
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
                {newPracticeProblemForm.description && (
                  <div className="mt-2 p-3 rounded-lg bg-slate-900/80 border border-slate-700/60">
                    <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider block mb-1.5 font-bold">
                      Live Student Preview
                    </span>
                    <div className="text-xs text-slate-200">
                      <StatementMarkdown content={newPracticeProblemForm.description} />
                    </div>
                  </div>
                )}
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
                            <span className="px-1.5 py-0.5 rounded font-mono font-bold text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700">
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
