import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../api/client.js';
import { useAuth } from '../context/AuthContext.js';
import { StreakReminderBanner } from '../components/dashboard/StreakReminderBanner.js';
import { DifficultyBadge, VerdictBadge } from '../components/common/Badge.js';
import { CountdownClock } from '../components/common/CountdownClock.js';
import { GoogleDriveService } from '../services/googleDrive.service.js';
import { FirestoreDataService } from '../services/firestoreData.service.js';
import { RealtimeSyncService } from '../services/realtimeSync.service.js';
import { auth } from '../config/firebase.js';
import { PRACTICE_CONFIG } from '../config/practice.config.js';
import { resolveGreetingName } from '../config/academic.config.js';
import { TOPIC_PRACTICE_DATA } from '../data/topic-practice.data.js';
import { getSolvedPracticeTopicIds, markPracticeTopicSolved } from './TopicPracticeHubPage.js';
import { toast } from 'sonner';
import {
  Flame,
  Trophy,
  CheckCircle2,
  Calendar,
  ArrowRight,
  TrendingUp,
  Sparkles,
  Zap,
  BookOpen,
  HelpCircle,
  Folder,
  Loader2,
  X,
  ShieldCheck,
  AlertCircle,
  Download,
  Users,
  Plus,
  Copy,
  Check,
  ExternalLink,
  Activity,
  GraduationCap,
  Clock,
  Lock,
  Play,
  FileText,
  ChevronRight,
  Target,
  KeyRound,
  Award,
  Code2,
} from 'lucide-react';

export const DashboardPage: React.FC = () => {
  const { user, isAdmin, isFaculty, isChecker, refreshUser } = useAuth();
  const isStudent = !isFaculty && !isAdmin;
  const [isDriveConnecting, setIsDriveConnecting] = useState(false);
  const [workspaceBlockMessage, setWorkspaceBlockMessage] = useState<string | null>(null);
  const [isDriveCardDismissed, setIsDriveCardDismissed] = useState<boolean>(() => {
    try {
      return localStorage.getItem('logicq_drive_backup_card_dismissed') === 'true';
    } catch {
      return false;
    }
  });

  const {
    data: dailyData,
    isLoading: isDailyLoading,
    error: dailyError,
    refetch: refetchDaily,
  } = useQuery({
    queryKey: ['daily-challenge'],
    queryFn: () => api.get('/problems/daily'),
    refetchInterval: 12000,
  });

  const {
    data: statsData,
    isLoading: isStatsLoading,
    error: statsError,
    refetch: refetchStats,
  } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: () => api.get('/users/dashboard/stats'),
    refetchInterval: 10000,
  });

  const dailyProblem = dailyData?.data?.problem;
  const isDailySolved = dailyData?.data?.userStatus?.isSolved;
  const secondsLeft = dailyData?.data?.secondsUntilNextReset;

  // Faculty / Admin state & queries
  const [copiedCodeKey, setCopiedCodeKey] = useState<string | null>(null);

  const handleCopyCode = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedCodeKey(key);
    toast.success('Join Code copied!');
    setTimeout(() => setCopiedCodeKey(null), 2000);
  };

  // 1. Fetch Faculty / Admin Sections (Live 6s auto-refresh)
  const { data: facultySections = [] } = useQuery({
    queryKey: ['faculty-dashboard-sections'],
    enabled: Boolean(user && !isStudent),
    queryFn: async () => {
      let backendList: any[] = [];
      try {
        const res = await api.get('/sections');
        backendList = res.sections || res.data || [];
      } catch (err) {
        console.warn('Dashboard /sections failed:', err);
      }
      const firestoreSections = await FirestoreDataService.getSectionsFromFirestore();
      const sectionMap = new Map<string, any>();
      backendList.forEach((s: any) => {
        const key = s.joinCode || s.id;
        if (key) sectionMap.set(key, s);
      });
      firestoreSections.forEach((s: any) => {
        const key = s.joinCode || s.id;
        if (key) {
          const existing = sectionMap.get(key) || {};
          sectionMap.set(key, { ...existing, ...s });
        }
      });
      return Array.from(sectionMap.values()).filter(
        (s) => !FirestoreDataService.isSectionDeleted(s.id, s.joinCode)
      );
    },
    refetchInterval: 6000,
  });

  // 1b. Fetch Student Sections from Firestore (so student always sees their real enrolled section name)
  const { data: studentFirestoreSections = [] } = useQuery({
    queryKey: ['student-firestore-sections', user?.id, (user as any)?.sectionId, (user as any)?.joinCode],
    enabled: Boolean(user && isStudent),
    queryFn: async () => {
      return await FirestoreDataService.getSectionsFromFirestore().catch(() => []);
    },
    refetchInterval: 8000,
  });

  // 2. Fetch Faculty / Admin Tests
  const { data: facultyTests = [] } = useQuery({
    queryKey: ['faculty-dashboard-tests'],
    enabled: Boolean(user && !isStudent),
    queryFn: async () => {
      try {
        const res = await api.get('/assessment-tests');
        return res.data || res.tests || [];
      } catch (err) {
        console.warn('Dashboard /assessment-tests failed:', err);
        return [];
      }
    },
    refetchInterval: 8000,
  });

  // 3. Fetch Admin / Global Stats (strictly admin only)
  const { data: globalStats } = useQuery({
    queryKey: ['faculty-dashboard-global-stats'],
    enabled: Boolean(user && isAdmin),
    queryFn: async () => {
      try {
        const res = await api.get('/admin/stats');
        return res.data || res;
      } catch {
        return null;
      }
    },
    refetchInterval: 12000,
  });

  // 4. Fetch Recent Live Submissions (strictly admin only)
  const { data: recentSubmissions = [] } = useQuery({
    queryKey: ['faculty-dashboard-recent-submissions'],
    enabled: Boolean(user && isAdmin),
    queryFn: async () => {
      try {
        const res = await api.get('/admin/submissions?limit=6');
        return res.submissions || res.data || [];
      } catch {
        return [];
      }
    },
    refetchInterval: 5000,
  });

  const queryClient = useQueryClient();

  // Student-specific states & queries
  const [dashboardJoinCode, setDashboardJoinCode] = useState('');
  const [isEnrollingCode, setIsEnrollingCode] = useState(false);

  // 1. Student Assigned Tests (Live 30s auto-refresh)
  const { data: studentTests = [], isLoading: isLoadingStudentTests } = useQuery({
    queryKey: ['student-assigned-tests'],
    enabled: Boolean(user && isStudent),
    staleTime: 30000,
    queryFn: async () => {
      try {
        const res = await api.get('/exam/my-tests');
        return res?.data || res?.assignments || [];
      } catch {
        return [];
      }
    },
    refetchInterval: 30000,
  });

  // 2. Student Practice Modules
  const { data: studentPracticeModules = [] } = useQuery({
    queryKey: ['student-practice-modules'],
    enabled: Boolean(user && isStudent),
    queryFn: async () => {
      try {
        const res = await api.get('/practice/modules');
        return res?.data?.modules || [];
      } catch (err) {
        console.warn('Dashboard /practice/modules failed:', err);
        return [];
      }
    },
    refetchInterval: 12000,
  });

  // 3. Student Recent Submissions (Live 6s feed)
  const { data: studentSubmissions = [] } = useQuery({
    queryKey: ['student-my-submissions'],
    enabled: Boolean(user && isStudent),
    queryFn: async () => {
      try {
        const res = await api.get('/submissions/my?limit=5');
        const list = res?.submissions || res?.data?.submissions || res?.data;
        if (Array.isArray(list) && list.length > 0) return list;
      } catch {
        // Fallback to Firestore submissions
      }
      try {
        const uid = user?.id || (user as any)?.uid || auth.currentUser?.uid;
        if (uid) {
          const fsSubs = await FirestoreDataService.getUserSubmissions(uid);
          if (Array.isArray(fsSubs) && fsSubs.length > 0) return fsSubs.slice(0, 5);
        }
      } catch {}
      return [];
    },
    refetchInterval: 6000,
  });

    // Real-time synchronization across all portals and tabs
  React.useEffect(() => {
    const unsubDashboard = RealtimeSyncService.on('DASHBOARD', () => {
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
      queryClient.invalidateQueries({ queryKey: ['student-assigned-tests'] });
      queryClient.invalidateQueries({ queryKey: ['student-my-submissions'] });
    });
    const unsubTests = RealtimeSyncService.on('TESTS', () => {
      queryClient.invalidateQueries({ queryKey: ['student-assigned-tests'] });
      queryClient.invalidateQueries({ queryKey: ['faculty-dashboard-tests'] });
    });
    const unsubSections = RealtimeSyncService.on('SECTIONS', () => {
      queryClient.invalidateQueries({ queryKey: ['faculty-dashboard-sections'] });
      queryClient.invalidateQueries({ queryKey: ['student-assigned-tests'] });
    });
    const unsubSubmissions = RealtimeSyncService.on('SUBMISSIONS', () => {
      queryClient.invalidateQueries({ queryKey: ['student-my-submissions'] });
      queryClient.invalidateQueries({ queryKey: ['faculty-dashboard-recent-submissions'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
    });
    return () => {
      unsubDashboard();
      unsubTests();
      unsubSections();
      unsubSubmissions();
    };
  }, [queryClient]);

  const handleDashboardEnroll = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanCode = dashboardJoinCode.trim().toUpperCase();
    if (!cleanCode) return;
    setIsEnrollingCode(true);
    try {
      // 1. Backend enrollment (Prisma SQLite & test assignments)
      let backendRes: any = null;
      try {
        backendRes = await api.post('/sections/enroll-by-code', { joinCode: cleanCode });
      } catch (backendErr: any) {
        console.warn('Backend enroll-by-code notice, syncing via Firestore:', backendErr);
      }

      // 2. Comprehensive Firestore sync (enrolled_students, section roster, and student's profile)
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

      const sectionTitle = enrollResult.section?.sectionName || enrollResult.section?.subject || backendRes?.section?.sectionName || cleanCode;
      toast.success(`Successfully joined "${sectionTitle}"! Assigned tests unlocked.`);
      setDashboardJoinCode('');

      await queryClient.invalidateQueries({ queryKey: ['student-assigned-tests'] });
      await queryClient.invalidateQueries({ queryKey: ['my-assigned-tests'] });
      await queryClient.invalidateQueries({ queryKey: ['profile'] });
      await queryClient.invalidateQueries({ queryKey: ['faculty-sections'] });
      await queryClient.invalidateQueries({ queryKey: ['admin-sections-list'] });
      await queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      await queryClient.invalidateQueries({ queryKey: ['admin-firestore-users'] });

      RealtimeSyncService.emit('SECTIONS');
      RealtimeSyncService.emit('USERS');
      RealtimeSyncService.emit('TESTS');
    } catch (err: any) {
      toast.error(err?.message || 'Invalid join code or section not found.');
    } finally {
      setIsEnrollingCode(false);
    }
  };

  const sectionsList: any[] = Array.isArray(facultySections) ? facultySections : [];
  const testsList: any[] = Array.isArray(facultyTests) ? facultyTests : [];
  const submissionsList: any[] = Array.isArray(recentSubmissions) ? recentSubmissions : [];

  const studentAssignedList: any[] = Array.isArray(studentTests) ? studentTests : [];
  const [solvedTopicIds, setSolvedTopicIds] = useState<string[]>(() => getSolvedPracticeTopicIds(user?.id));

  // Sync and restore solved practice topics from Firestore
  React.useEffect(() => {
    if (!user?.id) return;
    (async () => {
      try {
        const stats = await FirestoreDataService.getStatsBackup(user.id);
        const prog = await FirestoreDataService.getPracticeProgress(user.id);
        const cloudSolved = Array.from(
          new Set([
            ...(stats?.completedProblems || []),
            ...(prog?.completedProblems || []),
            ...getSolvedPracticeTopicIds(user.id),
          ])
        );
        if (cloudSolved.length > 0) {
          cloudSolved.forEach((id) => markPracticeTopicSolved(id, user.id));
          setSolvedTopicIds(getSolvedPracticeTopicIds(user.id));
        }
      } catch (err) {
        console.warn('Dashboard restore error:', err);
      }
    })();
  }, [user?.id]);

  const studentModulesList: any[] = (Array.isArray(studentPracticeModules) ? studentPracticeModules : []).map(
    (m: any) => {
      const topicsInMod = TOPIC_PRACTICE_DATA.filter(
        (t) => t.moduleSlug === m.slug && solvedTopicIds.includes(t.id)
      ).length;
      const solvedCount = Math.max(m.solvedCount || 0, topicsInMod);
      const totalQuestions = m.totalQuestions || 20;
      const progressPercent = totalQuestions > 0 ? Math.round((solvedCount / totalQuestions) * 100) : 0;
      return {
        ...m,
        solvedCount,
        progressPercent,
      };
    }
  );
  const studentSubmissionsList: any[] = Array.isArray(studentSubmissions) ? studentSubmissions : [];
  const availableSectionsForStudent: any[] = isStudent
    ? (Array.isArray(studentFirestoreSections) && studentFirestoreSections.length > 0 ? studentFirestoreSections : sectionsList)
    : sectionsList;

  const matchedStudentSection = availableSectionsForStudent.find((s: any) => {
    if (!s) return false;
    const sId = String(s.id || '').toUpperCase();
    const sCode = String(s.joinCode || '').toUpperCase();
    const uSecId = String((user as any)?.sectionId || '').toUpperCase();
    const uCode = String((user as any)?.joinCode || '').toUpperCase();
    if (uSecId && (sId === uSecId || sCode === uSecId)) return true;
    if (uCode && (sId === uCode || sCode === uCode)) return true;
    if (Array.isArray((user as any)?.enrolledSections) && (user as any).enrolledSections.some((es: any) => {
      const esClean = String(es || '').toUpperCase();
      return esClean === sId || esClean === sCode;
    })) return true;
    const uEmail = (user?.email || '').toLowerCase().trim();
    const uPrn = ((user as any)?.prn || '').toUpperCase().trim();
    if (Array.isArray(s.students) && s.students.some((st: any) => {
      const stEmail = (st.email || st.student?.email || '').toLowerCase().trim();
      const stPrn = (st.prn || st.student?.prn || '').toUpperCase().trim();
      return (uEmail && stEmail === uEmail) || (uPrn && stPrn === uPrn);
    })) return true;
    return false;
  });

  const detectedSection = studentAssignedList[0]?.test?.section || matchedStudentSection || (user as any)?.enrolledSection || null;
  const rawSecName = matchedStudentSection?.sectionName || matchedStudentSection?.subject || detectedSection?.sectionName || detectedSection?.subject || (user as any)?.sectionName || (user as any)?.section || null;

  const isLegacyDemoName = (n?: string | null) => {
    if (!n) return true;
    const clean = String(n).trim().toLowerCase();
    return clean === 'division a (c programming)' || clean === 'div a - computer science' || clean === 'division a';
  };

  const sectionDisplayName = (!isLegacyDemoName(rawSecName) && rawSecName)
    ? rawSecName
    : (matchedStudentSection?.subject || detectedSection?.subject || 'C Programming');

  const totalEnrolledAcrossSections = sectionsList.reduce((acc: number, s: any) => {
    return acc + (s?._count?.students ?? s?.students?.length ?? 0);
  }, 0);
  const displayTotalStudents = globalStats?.totalUsers || totalEnrolledAcrossSections || 0;
  const activeSectionsCount = sectionsList.length;
  const activeTestsCount = testsList.length;
  const totalSubmissionsCount = globalStats?.totalSubmissions || submissionsList.length || 0;

  const stats = statsData?.data?.stats;
  const yesterdaySummary = stats?.yesterdaySummary || statsData?.data?.yesterdaySummary || null;

  const totalProblemsSolved = Math.max(
    stats?.problemsSolved ?? (user as any)?.problemsSolved ?? 0,
    solvedTopicIds.length
  );

  const hasSolvedFirstChallenge = Boolean(
    totalProblemsSolved >= 1 ||
      isDailySolved ||
      (user?.totalPoints && user.totalPoints > 0)
  );

  const showDrivePromptCard =
    hasSolvedFirstChallenge &&
    !isDriveCardDismissed &&
    user?.storagePreference !== 'GOOGLE_DRIVE';

  const handleDismissDriveCard = () => {
    try {
      localStorage.setItem('logicq_drive_backup_card_dismissed', 'true');
    } catch {
      // Ignore
    }
    setIsDriveCardDismissed(true);
  };

  const [isDownloadingBackup, setIsDownloadingBackup] = useState(false);

  const handleDownloadLocalBackup = async () => {
    setIsDownloadingBackup(true);
    try {
      toast.loading('Preparing your backup file...', { id: 'local-backup' });
      const exportRes = await api.get('/users/me/export');
      const backupData = exportRes.data?.data || exportRes.data;
      GoogleDriveService.downloadLocalBackup(backupData, user?.username || user?.prn || 'student');
      toast.success('Backup file downloaded successfully! Keep it safe.', { id: 'local-backup' });
    } catch (err: any) {
      toast.error(err?.message || 'Failed to download backup file.', { id: 'local-backup' });
    } finally {
      setIsDownloadingBackup(false);
    }
  };

  const handleConnectDrive = async () => {
    setWorkspaceBlockMessage(null);
    setIsDriveConnecting(true);
    try {
      const authResult = await GoogleDriveService.requestAccessToken();
      if (!authResult.success) {
        if (authResult.error === 'COLLEGE_WORKSPACE_BLOCKED') {
          setWorkspaceBlockMessage(
            'Your college administrator has restricted Google Drive integrations. LogicQ will continue using secure cloud storage.'
          );
        } else if (authResult.error === 'USER_CANCELLED') {
          toast.info('Google Drive authorization was cancelled.');
        } else {
          toast.info('Downloading your backup file directly to your device...', { id: 'local-backup' });
          await handleDownloadLocalBackup();
          return;
        }
      }

      toast.loading('Exporting history to Google Drive...', { id: 'drive-export' });
      const exportRes = await api.get('/users/me/export');
      const backupData = exportRes.data?.data || exportRes.data;
      const studentName =
        user?.displayName || user?.fullName || user?.username || 'Student';
      const backupResult = await GoogleDriveService.backupHistoryToDrive(
        authResult.accessToken!,
        backupData,
        user?.id || 'anonymous',
        studentName
      );

      if (!backupResult.success) {
        toast.error(backupResult.message || 'Failed to upload backup to Drive.', { id: 'drive-export' });
        return;
      }

      await api.put('/users/profile', { storagePreference: 'GOOGLE_DRIVE' });
      const effectiveUid = auth.currentUser?.uid || user?.id;
      if (effectiveUid) {
        FirestoreDataService.updateUserProfile(effectiveUid, {
          storagePreference: 'GOOGLE_DRIVE',
        }).catch(() => {});
      }
      try {
        localStorage.setItem('logicq_storage_preference', 'GOOGLE_DRIVE');
      } catch {}
      if (refreshUser) {
        await refreshUser();
      }

      toast.success('Your challenge history has been backed up to your Google Drive!', { id: 'drive-export' });
      handleDismissDriveCard();
    } catch (err: any) {
      toast.error(err?.message || 'Error connecting to Google Drive.', { id: 'drive-export' });
    } finally {
      setIsDriveConnecting(false);
    }
  };

  if (isDailyLoading && isStatsLoading) {
    return (
      <div data-testid="dashboard-loading-skeleton" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-8 animate-pulse font-mono">
        <div className="h-8 bg-[var(--bg-surface)] rounded w-1/3 mb-4"></div>
        <div className="h-44 bg-[var(--bg-surface)] rounded-2xl mb-8"></div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="h-28 bg-[var(--bg-surface)] rounded-2xl"></div>
          <div className="h-28 bg-[var(--bg-surface)] rounded-2xl"></div>
          <div className="h-28 bg-[var(--bg-surface)] rounded-2xl"></div>
          <div className="h-28 bg-[var(--bg-surface)] rounded-2xl"></div>
        </div>
      </div>
    );
  }

  if (dailyError && statsError) {
    return (
      <div data-testid="dashboard-error-boundary" className="max-w-2xl mx-auto py-20 px-4 text-center font-mono space-y-4">
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-sm">
          Failed to load dashboard data. Please check your network connection.
        </div>
        <button
          onClick={() => {
            refetchDaily();
            refetchStats();
          }}
          className="px-5 py-2.5 rounded-xl font-bold bg-[var(--color-accent)] text-[#0C0F1F] text-xs hover:opacity-95"
        >
          Retry Connection
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-8 space-y-5 sm:space-y-8">
      {/* EXECUTIVE ADMIN & FACULTY HOME DASHBOARD */}
      {!isStudent ? (
        <div className="space-y-8 animate-in fade-in duration-200">
          {/* Welcome & Overview Header */}
          <div className="glass-card p-6 sm:p-7 rounded-2xl border border-[var(--border-line)] bg-[var(--bg-panel)] shadow-xl relative overflow-hidden">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
              <div className="flex items-center gap-4">
                <div
                  className={`w-12 h-12 rounded-xl flex items-center justify-center text-xl font-extrabold shadow-md shrink-0 ${
                    isAdmin
                      ? 'bg-gradient-to-br from-amber-400 to-amber-600 text-[#0C0F1F]'
                      : 'bg-gradient-to-br from-indigo-500 to-purple-600 text-white'
                  }`}
                >
                  {(user?.displayName || user?.fullName || (isAdmin ? 'Admin' : 'Faculty'))[0]?.toUpperCase() || 'U'}
                </div>
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2.5">
                    <h1 className="text-xl sm:text-2xl font-extrabold text-[var(--text-main)]">
                      Welcome back, {resolveGreetingName(user, auth.currentUser?.displayName) !== 'Student' ? resolveGreetingName(user, auth.currentUser?.displayName) : (isAdmin ? 'Administrator' : 'Instructor')}
                    </h1>
                    {isAdmin ? (
                      <span className="text-[11px] font-mono font-bold px-2.5 py-0.5 rounded bg-amber-500/15 text-amber-400 border border-amber-500/30 uppercase tracking-wider">
                        ADMINISTRATOR
                      </span>
                    ) : (
                      <span className="text-[11px] font-mono font-bold px-2.5 py-0.5 rounded bg-indigo-500/15 text-indigo-400 border border-indigo-500/30 uppercase tracking-wider">
                        FACULTY INSTRUCTOR
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-[var(--text-muted)] font-mono">
                    Academic Year 2026-2027 • LogicQ Programming & Examination Portal
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2.5 shrink-0">
                <Link
                  to="/faculty/tests"
                  className="px-4 py-2 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white shadow-md shadow-indigo-600/20 transition-all flex items-center gap-1.5"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Create Test</span>
                </Link>
                <Link
                  to="/faculty/sections"
                  className="px-3.5 py-2 rounded-xl text-xs font-semibold border border-[var(--border-line)] hover:bg-[var(--bg-surface)] text-[var(--text-main)] transition-all flex items-center gap-1.5"
                >
                  <GraduationCap className="w-3.5 h-3.5 text-indigo-400" />
                  <span>New Section</span>
                </Link>
                {isAdmin && (
                  <Link
                    to="/admin"
                    className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30 transition-all flex items-center gap-1.5"
                  >
                    <ShieldCheck className="w-3.5 h-3.5" />
                    <span>Admin Console</span>
                  </Link>
                )}
              </div>
            </div>
          </div>

          {/* 4 Quick Metric KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Total Students */}
            <div className="glass-card p-3.5 sm:p-5 rounded-xl sm:rounded-2xl border border-[var(--border-line)] bg-[var(--bg-panel)] space-y-1">
              <div className="flex items-center justify-between text-xs text-[var(--text-muted)] font-mono">
                <span>ENROLLED STUDENTS</span>
                <Users className="w-4 h-4 text-indigo-400" />
              </div>
              <div className="text-2xl font-extrabold text-[var(--text-main)] font-mono">
                {displayTotalStudents}
              </div>
              <p className="text-[11px] text-[var(--text-muted)]">
                Active students across classroom cohorts
              </p>
            </div>

            {/* Active Sections */}
            <div className="glass-card p-3.5 sm:p-5 rounded-xl sm:rounded-2xl border border-[var(--border-line)] bg-[var(--bg-panel)] space-y-1">
              <div className="flex items-center justify-between text-xs text-[var(--text-muted)] font-mono">
                <span>ACTIVE DIVISIONS</span>
                <GraduationCap className="w-4 h-4 text-purple-400" />
              </div>
              <div className="text-2xl font-extrabold text-purple-400 font-mono">
                {activeSectionsCount}
              </div>
              <p className="text-[11px] text-[var(--text-muted)]">
                Classroom sections with join codes
              </p>
            </div>

            {/* Scheduled Tests */}
            <div className="glass-card p-3.5 sm:p-5 rounded-xl sm:rounded-2xl border border-[var(--border-line)] bg-[var(--bg-panel)] space-y-1">
              <div className="flex items-center justify-between text-xs text-[var(--text-muted)] font-mono">
                <span>ASSESSMENT TESTS</span>
                <Calendar className="w-4 h-4 text-cyan-400" />
              </div>
              <div className="text-2xl font-extrabold text-cyan-400 font-mono">
                {activeTestsCount}
              </div>
              <p className="text-[11px] text-[var(--text-muted)]">
                Scheduled exams and lab practicals
              </p>
            </div>

            {/* Compiler Sandbox Health */}
            <div className="glass-card p-3.5 sm:p-5 rounded-xl sm:rounded-2xl border border-[var(--border-line)] bg-[var(--bg-panel)] space-y-1">
              <div className="flex items-center justify-between text-xs text-[var(--text-muted)] font-mono">
                <span>GCC 14 SANDBOX</span>
                <Zap className="w-4 h-4 text-emerald-400" />
              </div>
              <div className="text-lg font-extrabold text-emerald-400 font-mono flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse"></span>
                <span>Judge Online</span>
              </div>
              <p className="text-[11px] text-[var(--text-muted)]">
                Isolated evaluation for C programs
              </p>
            </div>
          </div>

          {/* Two-Column Working Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left Column: Sections & Tests (7 cols) */}
            <div className="lg:col-span-7 space-y-6">
              {/* Classroom Sections & Quick Join Codes */}
              <div className="glass-card p-6 rounded-2xl border border-[var(--border-line)] bg-[var(--bg-panel)] space-y-4">
                <div className="flex items-center justify-between border-b border-[var(--border-line)] pb-3">
                  <div className="flex items-center gap-2">
                    <GraduationCap className="w-5 h-5 text-indigo-400" />
                    <h2 className="text-base font-bold text-[var(--text-main)]">
                      Classroom Sections & Join Codes
                    </h2>
                  </div>
                  <Link
                    to="/faculty/sections"
                    className="text-xs font-mono font-semibold text-indigo-400 hover:text-indigo-300 flex items-center gap-1"
                  >
                    <span>Manage Sections</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>

                {sectionsList.length === 0 ? (
                  <div className="py-8 text-center space-y-3">
                    <p className="text-xs text-[var(--text-muted)]">No classroom sections created yet.</p>
                    <Link
                      to="/faculty/sections"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Create First Section</span>
                    </Link>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {sectionsList.slice(0, 4).map((sec: any) => {
                      const count = sec?._count?.students ?? sec?.students?.length ?? 0;
                      const sName = sec?.sectionName || sec?.name || 'Section';
                      const subj = sec?.subject || 'C Programming';
                      const jCode = sec?.joinCode || 'LQ-JOIN';
                      return (
                        <div
                          key={sec?.id || jCode}
                          className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-3.5 rounded-xl border border-[var(--border-line)] bg-[var(--bg-surface)] hover:border-indigo-500/40 transition"
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-lg bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 flex items-center justify-center font-mono font-bold text-xs shrink-0">
                              {sName.slice(0, 3).toUpperCase()}
                            </div>
                            <div>
                              <div className="font-semibold text-sm text-[var(--text-main)]">
                                {sName && subj && sName.toLowerCase().trim() !== subj.toLowerCase().trim() ? `${sName} — ${subj}` : (sName || subj)}
                              </div>
                              <div className="text-[11px] text-[var(--text-muted)]">
                                {count} student{count === 1 ? '' : 's'} enrolled
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 self-end sm:self-center">
                            <button
                              onClick={() => handleCopyCode(jCode, `code-${sec?.id || jCode}`)}
                              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg font-mono text-xs font-bold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 hover:bg-indigo-500/20 transition cursor-pointer"
                              title="Copy Join Code"
                            >
                              <span>{jCode}</span>
                              {copiedCodeKey === `code-${sec?.id || jCode}` ? (
                                <Check className="w-3.5 h-3.5 text-emerald-400" />
                              ) : (
                                <Copy className="w-3.5 h-3.5" />
                              )}
                            </button>
                            <Link
                              to="/faculty/sections"
                              className="p-1.5 rounded-lg border border-[var(--border-line)] text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[var(--bg-surface)]"
                              title="View Roster"
                            >
                              <ExternalLink className="w-3.5 h-3.5" />
                            </Link>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Scheduled Tests & Exams */}
              <div className="glass-card p-6 rounded-2xl border border-[var(--border-line)] bg-[var(--bg-panel)] space-y-4">
                <div className="flex items-center justify-between border-b border-[var(--border-line)] pb-3">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-5 h-5 text-cyan-400" />
                    <h2 className="text-base font-bold text-[var(--text-main)]">
                      Assessment Tests & Lab Practicals
                    </h2>
                  </div>
                  <Link
                    to="/faculty/tests"
                    className="text-xs font-mono font-semibold text-cyan-400 hover:text-cyan-300 flex items-center gap-1"
                  >
                    <span>Manage Tests</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>

                {testsList.length === 0 ? (
                  <div className="py-8 text-center space-y-3">
                    <p className="text-xs text-[var(--text-muted)]">No assessment tests created yet.</p>
                    <Link
                      to="/faculty/tests"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-cyan-600 hover:bg-cyan-500 text-white"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Create First Test</span>
                    </Link>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {testsList.slice(0, 4).map((test: any) => (
                      <div
                        key={test?.id || Math.random()}
                        className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-3.5 rounded-xl border border-[var(--border-line)] bg-[var(--bg-surface)] hover:border-cyan-500/40 transition"
                      >
                        <div>
                          <div className="font-semibold text-sm text-[var(--text-main)]">
                            {test?.title || 'Assessment Test'}
                          </div>
                          <div className="text-[11px] text-[var(--text-muted)] flex items-center gap-2 mt-0.5">
                            <span className="flex items-center gap-1">
                              <Clock className="w-3 h-3 text-[var(--text-muted)]" />
                              {test?.durationMinutes || 60} mins
                            </span>
                            <span>•</span>
                            <span>{test?.totalQuestions || test?.questions?.length || 2} Problems</span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <span
                            className={`text-[11px] font-semibold font-mono px-2 py-0.5 rounded-full ${
                              test?.status === 'PUBLISHED'
                                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                            }`}
                          >
                            {test?.status || 'ACTIVE'}
                          </span>
                          <Link
                            to="/faculty/tests"
                            className="p-1.5 rounded-lg border border-[var(--border-line)] text-[var(--text-muted)] hover:text-[var(--text-main)]"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </Link>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Right Column: Quick Workspaces + Live Submissions (5 cols) */}
            <div className="lg:col-span-5 space-y-6">
              {/* Quick Workspaces Launchpad */}
              <div className="glass-card p-6 rounded-2xl border border-[var(--border-line)] bg-[var(--bg-panel)] space-y-3">
                <h2 className="text-xs font-mono font-bold uppercase tracking-wider text-[var(--text-muted)]">
                  Quick Access Workspaces
                </h2>

                <div className="grid grid-cols-2 gap-2.5">
                  <Link
                    to="/faculty/tests"
                    className="p-3 rounded-xl border border-[var(--border-line)] bg-[var(--bg-surface)] hover:border-cyan-500/50 hover:bg-cyan-500/5 transition flex flex-col justify-between"
                  >
                    <Calendar className="w-5 h-5 text-cyan-400 mb-2" />
                    <div>
                      <div className="font-bold text-xs text-[var(--text-main)]">Create Test</div>
                      <div className="text-[10px] text-[var(--text-muted)]">Schedule exam</div>
                    </div>
                  </Link>

                  <Link
                    to="/faculty/sections"
                    className="p-3 rounded-xl border border-[var(--border-line)] bg-[var(--bg-surface)] hover:border-indigo-500/50 hover:bg-indigo-500/5 transition flex flex-col justify-between"
                  >
                    <GraduationCap className="w-5 h-5 text-indigo-400 mb-2" />
                    <div>
                      <div className="font-bold text-xs text-[var(--text-main)]">Class Sections</div>
                      <div className="text-[10px] text-[var(--text-muted)]">Rosters & codes</div>
                    </div>
                  </Link>

                  <Link
                    to="/faculty/analytics"
                    className="p-3 rounded-xl border border-[var(--border-line)] bg-[var(--bg-surface)] hover:border-emerald-500/50 hover:bg-emerald-500/5 transition flex flex-col justify-between"
                  >
                    <TrendingUp className="w-5 h-5 text-emerald-400 mb-2" />
                    <div>
                      <div className="font-bold text-xs text-[var(--text-main)]">Cohort Analytics</div>
                      <div className="text-[10px] text-[var(--text-muted)]">Pass rates</div>
                    </div>
                  </Link>

                  <Link
                    to="/faculty/questions"
                    className="p-3 rounded-xl border border-[var(--border-line)] bg-[var(--bg-surface)] hover:border-purple-500/50 hover:bg-purple-500/5 transition flex flex-col justify-between"
                  >
                    <BookOpen className="w-5 h-5 text-purple-400 mb-2" />
                    <div>
                      <div className="font-bold text-xs text-[var(--text-main)]">Question Bank</div>
                      <div className="text-[10px] text-[var(--text-muted)]">AI Generator</div>
                    </div>
                  </Link>
                </div>
              </div>

              {/* Live Activity & Submissions Stream */}
              <div className="glass-card p-6 rounded-2xl border border-[var(--border-line)] bg-[var(--bg-panel)] space-y-4">
                <div className="flex items-center justify-between border-b border-[var(--border-line)] pb-3">
                  <div className="flex items-center gap-2">
                    <Activity className="w-4 h-4 text-emerald-400" />
                    <h2 className="text-sm font-bold text-[var(--text-main)]">Live Student Activity</h2>
                  </div>
                  <span className="text-[11px] font-mono text-[var(--text-muted)]">Recent Submissions</span>
                </div>

                {submissionsList.length === 0 ? (
                  <div className="py-6 text-center space-y-1.5">
                    <CheckCircle2 className="w-6 h-6 text-emerald-400 mx-auto opacity-50" />
                    <p className="text-xs text-[var(--text-muted)]">Compiler sandbox ready for evaluation.</p>
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    {submissionsList.slice(0, 5).map((sub: any) => {
                      const verdict = sub?.verdict || 'PENDING';
                      const isAcc = verdict === 'ACCEPTED';
                      return (
                        <div
                          key={sub?.id || Math.random()}
                          className="flex items-center justify-between p-2.5 rounded-lg border border-[var(--border-line)] bg-[var(--bg-surface)] text-xs"
                        >
                          <div className="space-y-0.5 truncate max-w-[65%]">
                            <div className="font-semibold text-[var(--text-main)] truncate">
                              {sub?.user?.fullName || sub?.user?.username || 'Student'}
                            </div>
                            <div className="text-[10px] text-[var(--text-muted)] truncate font-mono">
                              {sub?.problem?.title || 'C Program'}
                            </div>
                          </div>

                          <div className="text-right shrink-0">
                            <span
                              className={`inline-block font-mono text-[10px] font-bold px-2 py-0.5 rounded ${
                                isAcc
                                  ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                  : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                              }`}
                            >
                              {verdict}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* ========================================================================= */
        /* MODERN STUDENT DASHBOARD: ASSESSMENTS, LAB TESTS, PRACTICE & RECENT STATS */
        /* ========================================================================= */
        <div className="space-y-8 animate-in fade-in duration-200">
          {/* 1. Welcome & Enrolled Section Header */}
          <div className="glass-card p-4 sm:p-7 rounded-2xl border border-[var(--border-line)] bg-[var(--bg-panel)] shadow-sm">
            <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-5">
              <div className="space-y-1.5">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs font-mono font-bold px-2.5 py-0.5 rounded-full bg-cyan-500/10 text-cyan-500 border border-cyan-500/20">
                    STUDENT
                  </span>
                  <span className="text-xs font-mono text-[var(--text-muted)] flex items-center gap-1">
                    <GraduationCap className="w-3.5 h-3.5 text-indigo-400" />
                    <span>{user?.college || 'Sanjivani University'}</span>
                  </span>
                </div>
                <h1 className="text-2xl sm:text-3xl font-extrabold text-[var(--text-main)] tracking-tight">
                  Welcome back, {resolveGreetingName(user, auth.currentUser?.displayName)}
                </h1>
                <p className="text-xs sm:text-sm text-[var(--text-muted)] font-mono flex items-center gap-2">
                  <span>Enrolled Section:</span>
                  <span className="font-semibold text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded border border-indigo-500/20">
                    {sectionDisplayName}
                  </span>
                </p>
              </div>

              {/* Action buttons on header */}
              <div className="grid grid-cols-3 gap-2 w-full sm:w-auto sm:flex sm:items-center sm:gap-2.5">
                <Link
                  to="/practice"
                  className="justify-center px-3 sm:px-3.5 py-2.5 rounded-xl text-xs font-bold font-mono bg-emerald-600 hover:bg-emerald-500 text-white shadow-md shadow-emerald-600/20 transition-all flex items-center gap-1.5"
                >
                  <Code2 className="w-3.5 h-3.5" />
                  <span>Practice Hub</span>
                </Link>
                <Link
                  to="/lab-internal"
                  className="justify-center px-3 sm:px-3.5 py-2.5 rounded-xl text-xs font-bold font-mono bg-indigo-600 hover:bg-indigo-500 text-white shadow-md shadow-indigo-600/20 transition-all flex items-center gap-1.5"
                >
                  <BookOpen className="w-3.5 h-3.5" />
                  <span>Lab Internal</span>
                </Link>
                <Link
                  to="/student/tests"
                  className="justify-center px-3 sm:px-3.5 py-2.5 rounded-xl text-xs font-bold font-mono border border-[var(--border-line)] bg-[var(--bg-surface)] hover:border-indigo-500/40 text-[var(--text-main)] transition-all flex items-center gap-1.5"
                >
                  <FileText className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Tests</span>
                </Link>
              </div>
            </div>
          </div>

          {/* 2. Four Live Student KPI Metric Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4">
            <div className="glass-card p-3.5 sm:p-5 rounded-xl sm:rounded-2xl border border-[var(--border-line)] bg-[var(--bg-panel)] space-y-1">
              <div className="flex items-center justify-between text-xs font-mono text-[var(--text-muted)]">
                <span>PROBLEMS SOLVED</span>
                <Target className="w-4 h-4 text-emerald-400" />
              </div>
              <div className="text-2xl font-extrabold text-emerald-400 font-mono">
                {totalProblemsSolved}
              </div>
              <p className="text-[11px] font-mono text-[var(--text-muted)]">
                Accepted C code submissions
              </p>
            </div>

            <div className="glass-card p-3.5 sm:p-5 rounded-xl sm:rounded-2xl border border-[var(--border-line)] bg-[var(--bg-panel)] space-y-1">
              <div className="flex items-center justify-between text-xs font-mono text-[var(--text-muted)]">
                <span>DAILY STREAK</span>
                <Flame className="w-4 h-4 text-amber-400" />
              </div>
              <div className="text-2xl font-extrabold text-amber-400 font-mono">
                {stats?.currentStreak || user?.currentStreak || 0}
                <span className="text-xs text-[var(--text-muted)] font-normal ml-1">Days 🔥</span>
              </div>
              <p className="text-[11px] font-mono text-[var(--text-muted)]">
                Personal best: {stats?.longestStreak || user?.longestStreak || 0}d
              </p>
            </div>

            <div className="glass-card p-3.5 sm:p-5 rounded-xl sm:rounded-2xl border border-[var(--border-line)] bg-[var(--bg-panel)] space-y-1">
              <div className="flex items-center justify-between text-xs font-mono text-[var(--text-muted)]">
                <span>TOTAL XP / POINTS</span>
                <Trophy className="w-4 h-4 text-yellow-400" />
              </div>
              <div className="text-2xl font-extrabold text-[var(--text-main)] font-mono">
                {user?.totalPoints || 0}
                <span className="text-xs text-[var(--text-muted)] font-normal ml-1">PTS</span>
              </div>
              <p className="text-[11px] font-mono text-[var(--text-muted)]">
                Verified academic score
              </p>
            </div>

            <div className="glass-card p-3.5 sm:p-5 rounded-xl sm:rounded-2xl border border-[var(--border-line)] bg-[var(--bg-panel)] space-y-1">
              <div className="flex items-center justify-between text-xs font-mono text-[var(--text-muted)]">
                <span>GCC 14 SANDBOX</span>
                <ShieldCheck className="w-4 h-4 text-cyan-400" />
              </div>
              <div className="text-2xl font-extrabold text-cyan-400 font-mono flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-pulse"></span>
                <span>Ready</span>
              </div>
              <p className="text-[11px] font-mono text-[var(--text-muted)]">
                Strict isolated C11 compiler
              </p>
            </div>
          </div>

          {/* Morning Streak Reminder (WhatsApp + Email) */}
          <StreakReminderBanner
            currentStreak={stats?.currentStreak || user?.currentStreak || 0}
            userEmail={user?.email || undefined}
            userName={(user?.fullName || user?.displayName) || undefined}
          />

          {/* 3. ASSIGNED LAB TESTS & ASSESSMENTS (Top Priority for Students) */}
          <div className="glass-card p-4 sm:p-7 rounded-2xl border border-[var(--border-line)] bg-[var(--bg-panel)] space-y-4 sm:space-y-5">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-[var(--border-line)] pb-4">
              <div>
                <h2 className="text-base sm:text-lg font-bold text-[var(--text-main)] flex items-center gap-2">
                  <FileText className="w-5 h-5 text-indigo-400" />
                  <span>Assigned Lab Assessments & Tests</span>
                </h2>
                <p className="text-xs text-[var(--text-muted)] font-mono mt-0.5">
                  Official coursework tests scheduled by your faculty mentor
                </p>
              </div>

              <Link
                to="/student/tests"
                className="text-xs font-mono text-indigo-400 hover:text-indigo-300 font-semibold flex items-center gap-1 transition"
              >
                <span>View Full Tests Hub</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            {isLoadingStudentTests ? (
              <div className="py-8 text-center text-xs font-mono text-[var(--text-muted)]">
                <Loader2 className="w-5 h-5 animate-spin mx-auto mb-2 text-indigo-400" />
                <span>Checking section assignments...</span>
              </div>
            ) : studentAssignedList.length === 0 ? (
              <div className="p-6 rounded-xl border border-dashed border-[var(--border-line)] bg-[var(--bg-surface)] text-center space-y-4">
                <div className="w-10 h-10 rounded-full bg-indigo-500/10 text-indigo-400 flex items-center justify-center mx-auto">
                  <KeyRound className="w-5 h-5" />
                </div>
                <div className="space-y-1">
                  <h3 className="text-sm font-bold text-[var(--text-main)]">
                    No Active Tests Assigned Right Now
                  </h3>
                  <p className="text-xs text-[var(--text-muted)] max-w-md mx-auto leading-relaxed">
                    Have a 6-character Join Code from your professor (e.g. <code className="text-indigo-400 font-bold">LQ-A1B2</code>)? Enter it to enroll and unlock tests:
                  </p>
                </div>

                <form
                  onSubmit={handleDashboardEnroll}
                  className="max-w-md mx-auto flex flex-col sm:flex-row items-center gap-2"
                >
                  <input
                    type="text"
                    placeholder="e.g. LQ-A1B2"
                    value={dashboardJoinCode}
                    onChange={(e) => setDashboardJoinCode(e.target.value.toUpperCase())}
                    className="w-full sm:flex-1 px-3.5 py-2 rounded-xl border border-[var(--border-line)] bg-[var(--bg-panel)] text-sm font-mono font-bold tracking-widest placeholder:tracking-normal placeholder:font-normal text-[var(--text-main)] focus:outline-none focus:border-indigo-500"
                  />
                  <button
                    type="submit"
                    disabled={isEnrollingCode || !dashboardJoinCode.trim()}
                    className="w-full sm:w-auto px-4 py-2 rounded-xl text-xs font-mono font-bold bg-indigo-600 hover:bg-indigo-500 text-white transition disabled:opacity-50 whitespace-nowrap"
                  >
                    {isEnrollingCode ? 'Joining...' : 'Unlock Tests'}
                  </button>
                </form>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {studentAssignedList.slice(0, 4).map((assignment: any) => {
                  const test = assignment?.test || {};
                  const questions = test?.questions || [];
                  const attempts = assignment?.attempts || [];
                  const isSubmitted = assignment?.status === 'SUBMITTED';
                  const isInProgress = assignment?.status === 'IN_PROGRESS';
                  const completedCount = attempts.filter((a: any) => a.isLocked).length;

                  return (
                    <div
                      key={assignment?.id}
                      className="p-4 rounded-xl border border-[var(--border-line)] bg-[var(--bg-surface)] hover:border-indigo-500/40 transition space-y-3"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                          {test?.section?.sectionName || 'Class Section'}
                        </span>

                        {isSubmitted ? (
                          <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3" />
                            SUBMITTED
                          </span>
                        ) : isInProgress ? (
                          <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20 flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                            IN PROGRESS ({completedCount}/{questions.length})
                          </span>
                        ) : (
                          <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                            ASSIGNED
                          </span>
                        )}
                      </div>

                      <div>
                        <h3 className="font-bold text-sm text-[var(--text-main)] truncate">
                          {test?.title || 'Assessment Test'}
                        </h3>
                        <p className="text-[11px] text-[var(--text-muted)] font-mono mt-0.5">
                          {test?.durationMinutes || 60} Mins • {questions.length} Question{questions.length === 1 ? '' : 's'}
                        </p>
                      </div>

                      <div className="pt-2 border-t border-[var(--border-line)] flex items-center justify-between">
                        {isSubmitted && assignment?.academicScore > 0 ? (
                          <span className="text-xs font-mono font-bold text-emerald-400">
                            Score: {assignment.academicScore.toFixed(1)} / {questions.length}
                          </span>
                        ) : (
                          <span className="text-[11px] font-mono text-[var(--text-muted)]">
                            {completedCount} of {questions.length} completed
                          </span>
                        )}

                        <Link
                          to="/student/tests"
                          className="px-3 py-1.5 rounded-lg text-xs font-mono font-bold bg-indigo-600 hover:bg-indigo-500 text-white flex items-center gap-1 transition"
                        >
                          <span>{isSubmitted ? 'View Details' : isInProgress ? 'Resume Test' : 'Start Test'}</span>
                          <ChevronRight className="w-3.5 h-3.5" />
                        </Link>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* 4. C PROGRAMMING PRACTICE MODULES */}
          <div className="glass-card p-6 sm:p-7 rounded-2xl border border-[var(--border-line)] bg-[var(--bg-panel)] space-y-5">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-[var(--border-line)] pb-4">
              <div>
                <h2 className="text-base sm:text-lg font-bold text-[var(--text-main)] flex items-center gap-2">
                  <BookOpen className="w-5 h-5 text-cyan-400" />
                  <span>Lab Internal Coursework Modules</span>
                </h2>
                <p className="text-xs text-[var(--text-muted)] font-mono mt-0.5">
                  Sequential topic modules from Control Structures to Dynamic Memory
                </p>
              </div>

              <Link
                to="/lab-internal"
                className="text-xs font-mono text-indigo-400 hover:text-indigo-300 font-semibold flex items-center gap-1 transition"
              >
                <span>View Lab Modules</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {studentModulesList.length > 0 ? (
                studentModulesList.map((m: any, idx: number) => {
                  const isLocked = !m.isUnlocked;
                  const percent = m.progressPercent || 0;
                  return (
                    <Link
                      key={m.id || idx}
                      to={isLocked ? '/practice' : `/lab-internal/${m.slug}`}
                      className={`p-4 rounded-xl border transition flex flex-col justify-between ${
                        isLocked
                          ? 'border-[var(--border-line)] bg-[var(--bg-surface)] opacity-75'
                          : 'border-[var(--border-line)] bg-[var(--bg-surface)] hover:border-cyan-500/50'
                      }`}
                    >
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-[var(--bg-panel)] text-[var(--text-muted)] border border-[var(--border-line)]">
                            Module {m.order || idx + 1}
                          </span>
                          {isLocked ? (
                            <span className="text-[10px] font-mono text-amber-400 flex items-center gap-1">
                              <Lock className="w-3 h-3" /> Locked
                            </span>
                          ) : (
                            <span className="text-[10px] font-mono text-emerald-400 flex items-center gap-1">
                              <CheckCircle2 className="w-3 h-3" /> {percent}%
                            </span>
                          )}
                        </div>

                        <h3 className="font-bold text-sm text-[var(--text-main)] line-clamp-1">
                          {m.title}
                        </h3>
                        <p className="text-[11px] text-[var(--text-muted)] line-clamp-2 leading-relaxed">
                          {m.description}
                        </p>
                      </div>

                      <div className="pt-3 mt-3 border-t border-[var(--border-line)]">
                        <div className="w-full bg-[var(--bg-panel)] h-1.5 rounded-full overflow-hidden mb-2">
                          <div
                            className="bg-gradient-to-r from-cyan-400 to-emerald-400 h-full rounded-full transition-all duration-300"
                            style={{ width: `${percent}%` }}
                          />
                        </div>
                        <div className="flex items-center justify-between text-[10px] font-mono text-[var(--text-muted)]">
                          <span>{m.solvedCount || 0} / {m.totalQuestions || 20} Solved</span>
                          <span className="text-cyan-400 font-semibold">{isLocked ? 'Unlock →' : 'Practice →'}</span>
                        </div>
                      </div>
                    </Link>
                  );
                })
              ) : (
                /* Fallback 4 standard modules while loading */
                [
                  { title: 'Control Flow & Logic', desc: 'If-else branching, loops, nested conditions', icon: '01' },
                  { title: 'Arrays & Strings', desc: '1D/2D arrays, matrix arithmetic, char manipulation', icon: '02' },
                  { title: 'Pointers & Addresses', desc: 'Pointer arithmetic, dereferencing, function pointers', icon: '03' },
                  { title: 'Dynamic Memory & Structs', desc: 'malloc, free, memory layouts, structured records', icon: '04' },
                ].map((mod, i) => (
                  <Link
                    key={i}
                    to="/practice"
                    className="p-4 rounded-xl border border-[var(--border-line)] bg-[var(--bg-surface)] hover:border-cyan-500/40 transition flex flex-col justify-between"
                  >
                    <div className="space-y-2">
                      <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-[var(--bg-panel)] text-[var(--text-muted)] border border-[var(--border-line)] inline-block">
                        Module {mod.icon}
                      </span>
                      <h3 className="font-bold text-sm text-[var(--text-main)]">{mod.title}</h3>
                      <p className="text-[11px] text-[var(--text-muted)] leading-relaxed">{mod.desc}</p>
                    </div>
                    <div className="pt-3 mt-3 border-t border-[var(--border-line)] text-right">
                      <span className="text-[10px] font-mono text-cyan-400 font-semibold">Start Module &rarr;</span>
                    </div>
                  </Link>
                ))
              )}
            </div>
          </div>

          {/* 5. MY RECENT CODE SUBMISSIONS */}
          <div className="glass-card p-6 sm:p-7 rounded-2xl border border-[var(--border-line)] bg-[var(--bg-panel)] space-y-4">
            <div className="flex items-center justify-between border-b border-[var(--border-line)] pb-3">
              <div>
                <h2 className="text-base sm:text-lg font-bold text-[var(--text-main)] flex items-center gap-2">
                  <Activity className="w-5 h-5 text-emerald-400" />
                  <span>My Recent Code Submissions</span>
                </h2>
                <p className="text-xs text-[var(--text-muted)] font-mono mt-0.5">
                  Latest execution verdicts from the GCC 14 sandbox
                </p>
              </div>

              <Link
                to="/practice"
                className="text-xs font-mono text-emerald-400 hover:text-emerald-300 font-semibold flex items-center gap-1 transition"
              >
                <span>Code Arena</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            {studentSubmissionsList.length === 0 ? (
              <div className="py-8 text-center space-y-2">
                <CheckCircle2 className="w-7 h-7 text-emerald-400 mx-auto opacity-40" />
                <p className="text-xs text-[var(--text-muted)] font-mono">
                  No submissions yet. Pick a practice problem to run your first C code!
                </p>
                <Link
                  to="/practice"
                  className="inline-block mt-2 px-4 py-2 rounded-xl text-xs font-mono font-bold bg-[var(--color-accent)] text-[#0C0F1F]"
                >
                  Start Coding &rarr;
                </Link>
              </div>
            ) : (
              <div className="space-y-2.5">
                {studentSubmissionsList.slice(0, 5).map((sub: any) => {
                  const verdict = sub?.verdict || 'PENDING';
                  const isAccepted = verdict === 'ACCEPTED';
                  const isWrong = verdict === 'WRONG_ANSWER';
                  return (
                    <div
                      key={sub?.id || Math.random()}
                      className="flex items-center justify-between p-3 rounded-xl border border-[var(--border-line)] bg-[var(--bg-surface)] text-xs"
                    >
                      <div className="space-y-0.5 truncate max-w-[65%]">
                        <div className="font-semibold text-[var(--text-main)] truncate">
                          {sub?.problem?.title || 'C Program Problem'}
                        </div>
                        <div className="text-[10px] text-[var(--text-muted)] font-mono truncate">
                          GCC 14 (C11) • {sub?.createdAt ? new Date(sub.createdAt).toLocaleDateString() : 'Recent'}
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <span
                          className={`inline-block font-mono text-[10px] font-bold px-2 py-0.5 rounded ${
                            isAccepted
                              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                              : isWrong
                              ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                              : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                          }`}
                        >
                          {verdict}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
