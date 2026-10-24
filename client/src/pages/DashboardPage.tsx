import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { api } from '../api/client.js';
import { useAuth } from '../context/AuthContext.js';
import { DifficultyBadge, VerdictBadge } from '../components/common/Badge.js';
import { CountdownClock } from '../components/common/CountdownClock.js';
import { GoogleDriveService } from '../services/googleDrive.service.js';
import { FirestoreDataService } from '../services/firestoreData.service.js';
import { auth } from '../config/firebase.js';
import { PRACTICE_CONFIG } from '../config/practice.config.js';
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
  });

  const {
    data: statsData,
    isLoading: isStatsLoading,
    error: statsError,
    refetch: refetchStats,
  } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: () => api.get('/users/dashboard/stats'),
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

  // 1. Fetch Faculty / Admin Sections
  const { data: facultySections = [] } = useQuery({
    queryKey: ['faculty-dashboard-sections'],
    enabled: !isStudent,
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
  });

  // 2. Fetch Faculty / Admin Tests
  const { data: facultyTests = [] } = useQuery({
    queryKey: ['faculty-dashboard-tests'],
    enabled: !isStudent,
    queryFn: async () => {
      try {
        const res = await api.get('/assessment-tests');
        return res.data || res.tests || [];
      } catch (err) {
        console.warn('Dashboard /assessment-tests failed:', err);
        return [];
      }
    },
  });

  // 3. Fetch Admin / Global Stats (if admin)
  const { data: globalStats } = useQuery({
    queryKey: ['faculty-dashboard-global-stats'],
    enabled: !isStudent,
    queryFn: async () => {
      try {
        const res = await api.get('/admin/stats');
        return res.data || res;
      } catch {
        return null;
      }
    },
  });

  // 4. Fetch Recent Live Submissions
  const { data: recentSubmissions = [] } = useQuery({
    queryKey: ['faculty-dashboard-recent-submissions'],
    enabled: !isStudent,
    queryFn: async () => {
      try {
        const res = await api.get('/admin/submissions?limit=6');
        return res.submissions || res.data || [];
      } catch {
        return [];
      }
    },
  });

  const sectionsList: any[] = Array.isArray(facultySections) ? facultySections : [];
  const testsList: any[] = Array.isArray(facultyTests) ? facultyTests : [];
  const submissionsList: any[] = Array.isArray(recentSubmissions) ? recentSubmissions : [];

  const totalEnrolledAcrossSections = sectionsList.reduce((acc: number, s: any) => {
    return acc + (s?._count?.students ?? s?.students?.length ?? 0);
  }, 0);
  const displayTotalStudents = globalStats?.totalUsers || totalEnrolledAcrossSections || 0;
  const activeSectionsCount = sectionsList.length;
  const activeTestsCount = testsList.length;
  const totalSubmissionsCount = globalStats?.totalSubmissions || submissionsList.length || 0;

  const stats = statsData?.data?.stats;
  const yesterdaySummary = stats?.yesterdaySummary || statsData?.data?.yesterdaySummary || null;

  const hasSolvedFirstChallenge = Boolean(
    (stats?.problemsSolved && stats.problemsSolved >= 1) ||
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
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
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
                      Welcome back, {user?.displayName || user?.fullName || (isAdmin ? 'Administrator' : 'Instructor')}
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
            <div className="glass-card p-5 rounded-2xl border border-[var(--border-line)] bg-[var(--bg-panel)] space-y-1">
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
            <div className="glass-card p-5 rounded-2xl border border-[var(--border-line)] bg-[var(--bg-panel)] space-y-1">
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
            <div className="glass-card p-5 rounded-2xl border border-[var(--border-line)] bg-[var(--bg-panel)] space-y-1">
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
            <div className="glass-card p-5 rounded-2xl border border-[var(--border-line)] bg-[var(--bg-panel)] space-y-1">
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
                                {sName} — {subj}
                              </div>
                              <div className="text-[11px] text-[var(--text-muted)]">
                                {sec?.course || 'Engineering'} • {count} student{count === 1 ? '' : 's'} enrolled
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
        /* STANDARD STUDENT CHALLENGE & PRACTICE DASHBOARD */
        <div className="space-y-8 animate-in fade-in duration-200">

      {/* Welcome & Overview Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[var(--text-main)] flex items-center gap-2.5">
            <span>Welcome back, {user?.fullName || user?.username}</span>
            <span className="text-xs font-mono font-semibold px-2 py-0.5 rounded bg-[var(--bg-surface)] text-[var(--color-accent)] border border-[var(--border-line)]">
              CHALLENGER
            </span>
          </h1>
          <p className="text-xs sm:text-sm text-[var(--text-muted)] mt-1 font-mono">
            {user?.college ? `${user.college} • ` : ''}Keep your logic sharp with today&apos;s featured problem.
          </p>
        </div>

        {/* Daily Standing Quick Card */}
        <div className="flex items-center gap-3">
          <div className="glass-card px-4 py-2 rounded-xl border border-[var(--border-line)] flex items-center gap-3">
            <Trophy className="w-5 h-5 text-[var(--color-warning)]" />
            <div>
              <span className="text-[10px] font-mono text-[var(--text-muted)] uppercase tracking-wider block">
                DAILY RANK
              </span>
              <span className="text-sm font-mono font-bold text-[var(--text-main)]">
                {stats?.dailyRank ? (
                  <>#{stats.dailyRank}</>
                ) : (
                  <span className="text-xs text-[var(--text-muted)] font-normal">
                    NOT SOLVED YET
                  </span>
                )}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Featured Daily Challenge Card */}
      {dailyData?.data?.paused ? (
        <div data-testid="dashboard-daily-paused-card" className="relative rounded-2xl border border-[var(--border-line)] bg-[var(--bg-panel)] p-6 sm:p-8 shadow-sm overflow-hidden font-mono">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
            <div className="space-y-2 max-w-2xl">
              <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-md bg-[var(--bg-surface)] border border-[var(--border-line)] text-cyan-400 text-xs font-bold">
                <Sparkles className="w-3.5 h-3.5" />
                <span>DAILY COMPETITION</span>
              </div>
              <h2 className="text-xl sm:text-2xl font-bold text-[var(--text-main)]">
                Daily challenges are not live yet. We will announce the start.
              </h2>
              <p className="text-xs sm:text-sm text-[var(--text-muted)] leading-relaxed">
                Practice C modules across control flow, pointers, arrays, and memory while the daily pool is prepared.
              </p>
            </div>
            <Link
              to="/practice"
              className="px-6 py-3 rounded-xl font-mono text-xs font-bold text-[#0C0F1F] bg-[var(--color-accent)] hover:opacity-95 shadow-md transition-all flex items-center gap-2 shrink-0"
            >
              <span>Explore Practice</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      ) : (
        <div className="relative rounded-2xl border border-[var(--border-line)] bg-[var(--bg-panel)] p-6 sm:p-8 shadow-sm overflow-hidden">
          <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
            <div className="space-y-3 max-w-2xl">
              <div className="flex flex-wrap items-center gap-2.5">
                <span className="px-2.5 py-1 rounded-md bg-[var(--bg-surface)] border border-[var(--border-line)] text-[var(--color-accent)] text-xs font-mono font-bold flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-[var(--color-accent)]" />
                  FEATURED DAILY CHALLENGE
                </span>

                {dailyProblem && <DifficultyBadge difficulty={dailyProblem.difficulty} />}

                {isDailySolved ? (
                  <span className="flex items-center gap-1 text-xs font-mono font-semibold text-[var(--color-success)] bg-[var(--bg-surface)] border border-[var(--border-line)] px-2 py-0.5 rounded">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Solved Today (+{dailyProblem?.basePoints || 0} PTS)
                  </span>
                ) : (
                  <span className="flex items-center gap-1 text-xs font-mono font-semibold text-[var(--color-warning)] bg-[var(--bg-surface)] border border-[var(--border-line)] px-2 py-0.5 rounded">
                    <Zap className="w-3.5 h-3.5" />
                    Active Today
                  </span>
                )}
              </div>

              <h2 className="text-xl sm:text-2xl font-bold text-[var(--text-main)]">
                {dailyProblem?.title || 'Loading Daily Challenge...'}
              </h2>

              <p className="text-xs sm:text-sm text-[var(--text-muted)] line-clamp-2 leading-relaxed">
                {dailyProblem?.description
                  ?.replace(/### Problem Description|### Input Format|### Output Format|###/g, '')
                  .replace(/\*\*Featured Daily Challenge:\*\*/g, '')
                  .replace(/\\le/g, '≤')
                  .replace(/\\ge/g, '≥')
                  .replace(/\\times/g, '×')
                  .replace(/[`*$]/g, '')
                  .trim() ||
                  "Solving today's challenge before 17:00 IST earns points by difficulty, secures your daily rank, and extends your daily streak."}
              </p>

              <div className="flex flex-wrap items-center gap-4 text-xs font-mono text-[var(--text-muted)] pt-1">
                <span>
                  Points: <strong className="text-[var(--color-accent)]">{dailyProblem?.basePoints || 20} PTS</strong>
                </span>
                <span>•</span>
                <span>Time Limit: {dailyProblem?.timeLimitMs || 1000}ms</span>
                <span>•</span>
                <span>Memory Limit: {dailyProblem?.memoryLimitMb || 64}MB</span>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row lg:flex-col items-end gap-3 w-full lg:w-auto">
              <CountdownClock initialSeconds={secondsLeft} label="Next Reset in" />

              <Link
                to="/challenge"
                className="w-full sm:w-auto px-6 py-3 rounded-xl font-mono text-xs font-bold text-[#0C0F1F] bg-gradient-to-r from-cyan-400 to-emerald-400 hover:from-cyan-300 hover:to-emerald-300 shadow-xl shadow-cyan-500/20 transition-colors flex items-center justify-center gap-2"
              >
                <span>{isDailySolved ? 'Review Workspace' : 'Solve Daily Challenge'}</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* Optional Google Drive Backup Prompt Card (One-Time, Dismissible, Shown Only After First Solve) */}
      {showDrivePromptCard && (
        <div
          data-testid="drive-backup-prompt-card"
          className="relative rounded-2xl border border-cyan-500/30 bg-gradient-to-r from-cyan-950/30 to-blue-950/20 p-5 sm:p-6 shadow-sm overflow-hidden font-mono"
        >
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-cyan-500/15 border border-cyan-500/30 flex items-center justify-center text-cyan-400 shrink-0 mt-0.5">
                <Folder className="w-5 h-5" />
              </div>
              <div className="space-y-1.5 max-w-2xl">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-cyan-400 uppercase tracking-wider">
                    Optional Personal Backup
                  </span>
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-300 border border-cyan-500/20">
                    Never Required
                  </span>
                </div>
                <h3 className="text-base sm:text-lg font-bold text-[var(--text-main)]">
                  Back up your history to your Google Drive
                </h3>
                <p className="text-xs text-[var(--text-muted)] leading-relaxed">
                  Congratulations on your progress! You can optionally back up copies of your solved code, submission history, and problem notes into a visible <code className="text-cyan-400">LogicQ/</code> folder in your personal Google Drive. LogicQ functions 100% with secure cloud storage regardless.
                </p>

                {workspaceBlockMessage && (
                  <div
                    data-testid="workspace-blocked-alert"
                    className="p-3.5 mt-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs space-y-2.5"
                  >
                    <div className="flex items-start gap-2">
                      <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                      <div>
                        <span className="font-bold block">Institutional Workspace Notice:</span>
                        <span>{workspaceBlockMessage}</span>
                      </div>
                    </div>
                    <div className="pt-2 border-t border-amber-500/20 flex flex-wrap items-center justify-between gap-2">
                      <span className="text-[11px] text-amber-200/90 font-mono">
                        Direct offline backup is available with 1 click:
                      </span>
                      <button
                        type="button"
                        onClick={handleDownloadLocalBackup}
                        disabled={isDownloadingBackup}
                        className="px-3 py-1.5 rounded-lg bg-amber-400/20 hover:bg-amber-400/30 border border-amber-400/40 text-amber-200 text-xs font-bold flex items-center gap-1.5 transition-colors"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>{isDownloadingBackup ? 'Downloading...' : 'Download Backup (.json)'}</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <button
              type="button"
              onClick={handleDismissDriveCard}
              data-testid="dismiss-drive-prompt-btn"
              aria-label="Dismiss Google Drive backup prompt"
              className="p-1.5 text-[var(--text-muted)] hover:text-[var(--text-main)] rounded-lg hover:bg-[var(--bg-surface)] transition-colors shrink-0"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="mt-4 pt-4 border-t border-cyan-500/15 flex flex-wrap items-center justify-between gap-3 text-xs">
            <span className="text-[11px] text-[var(--text-muted)] flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-cyan-400" />
              <span>LogicQ only accesses files it creates. We never inspect your personal Drive files.</span>
            </span>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={handleDismissDriveCard}
                className="px-3.5 py-1.5 rounded-xl text-xs text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[var(--bg-surface)] transition-colors"
              >
                Skip for now
              </button>
              <button
                type="button"
                onClick={handleDownloadLocalBackup}
                disabled={isDownloadingBackup}
                data-testid="download-backup-btn"
                className="px-3.5 py-2 rounded-xl text-xs font-mono font-bold bg-[var(--bg-surface)] hover:bg-[var(--bg-surface-hover)] border border-cyan-500/30 text-cyan-300 transition-colors flex items-center gap-1.5 disabled:opacity-50"
              >
                {isDownloadingBackup ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Preparing...</span>
                  </>
                ) : (
                  <>
                    <Download className="w-3.5 h-3.5" />
                    <span>Download Backup (.json)</span>
                  </>
                )}
              </button>
              <button
                type="button"
                onClick={handleConnectDrive}
                disabled={isDriveConnecting}
                data-testid="connect-drive-prompt-btn"
                className="px-4 py-2 rounded-xl text-xs font-bold text-[#0C0F1F] bg-cyan-400 hover:bg-cyan-300 transition-colors flex items-center gap-1.5 disabled:opacity-50"
              >
                {isDriveConnecting ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Connecting Drive...</span>
                  </>
                ) : (
                  <>
                    <Folder className="w-3.5 h-3.5" />
                    <span>Back up to Google Drive</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Four Daily Standings Cards: Daily rank, Points today, Percentile, vs yesterday */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Daily Rank Card */}
        <div data-testid="card-daily-rank" className="glass-card p-5 rounded-2xl border border-[var(--border-line)]">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-mono text-[var(--text-muted)]">DAILY RANK</span>
            <Trophy className="w-5 h-5 text-[var(--color-warning)]" />
          </div>
          <div className="text-2xl font-extrabold text-[var(--text-main)] font-mono">
            {stats?.dailyRank ? (
              <>#{stats.dailyRank}</>
            ) : (
              <span className="text-sm font-semibold text-[var(--text-muted)]">Not solved yet</span>
            )}
          </div>
          <p className="text-[11px] font-mono text-[var(--text-muted)] mt-1">
            {stats?.dailyRank ? 'Ranked among today\'s solvers' : 'Solve today to enter the board'}
          </p>
        </div>

        {/* Points Today */}
        <div data-testid="card-points-today" className="glass-card p-5 rounded-2xl border border-[var(--border-line)]">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-mono text-[var(--text-muted)]">POINTS TODAY</span>
            <Sparkles className="w-5 h-5 text-[var(--color-accent)]" />
          </div>
          <div className="text-2xl font-extrabold text-[var(--color-accent)] font-mono">
            {stats?.pointsToday ?? 0}
            <span className="text-xs text-[var(--text-muted)] font-normal ml-1">PTS</span>
          </div>
          <p className="text-[11px] font-mono text-[var(--text-muted)] mt-1">
            {isDailySolved ? 'Earned from accepted solve' : '0 PTS until challenge solved'}
          </p>
        </div>

        {/* Percentile Card */}
        <div data-testid="card-percentile" className="glass-card p-5 rounded-2xl border border-[var(--border-line)]">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-mono text-[var(--text-muted)]">PERCENTILE</span>
            <TrendingUp className="w-5 h-5 text-[var(--color-success)]" />
          </div>
          <div className="text-2xl font-extrabold text-[var(--color-success)] font-mono">
            {stats?.percentile !== null && stats?.percentile !== undefined ? (
              <>Top {stats.percentile}%</>
            ) : (
              <span className="text-[var(--text-muted)]">—</span>
            )}
          </div>
          <p className="text-[11px] font-mono text-[var(--text-muted)] mt-1">
            {stats?.percentile !== null && stats?.percentile !== undefined
              ? 'Among ranked solvers today'
              : 'Appears when ≥ 10 students solve'}
          </p>
        </div>

        {/* vs Yesterday Card */}
        <div data-testid="card-vs-yesterday" className="glass-card p-5 rounded-2xl border border-[var(--border-line)]">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-mono text-[var(--text-muted)]">VS YESTERDAY</span>
            <Calendar className="w-5 h-5 text-[var(--color-accent)]" />
          </div>
          <div className="text-2xl font-extrabold text-[var(--text-main)] font-mono">
            {stats?.vsYesterdayDelta !== null && stats?.vsYesterdayDelta !== undefined ? (
              <span className={stats.vsYesterdayDelta >= 0 ? 'text-[var(--color-success)]' : 'text-rose-400'}>
                {stats.vsYesterdayDelta >= 0 ? `+${stats.vsYesterdayDelta}` : stats.vsYesterdayDelta} PTS
              </span>
            ) : (
              <span className="text-[var(--text-muted)]">—</span>
            )}
          </div>
          <p className="text-[11px] font-mono text-[var(--text-muted)] mt-1">
            {stats?.vsYesterdayDelta !== null && stats?.vsYesterdayDelta !== undefined
              ? 'Points delta compared to yesterday'
              : 'No yesterday result recorded'}
          </p>
        </div>
      </div>

      {/* Yesterday's Result Summary (Read-Only) */}
      <div
        data-testid="dashboard-yesterday-summary"
        className="glass-card p-6 rounded-2xl border border-[var(--border-line)] bg-[var(--bg-panel)] space-y-4"
      >
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-mono font-bold text-[var(--text-main)] uppercase tracking-wide flex items-center gap-2">
              <Calendar className="w-4 h-4 text-[var(--color-accent)]" />
              <span>Yesterday&apos;s Result</span>
            </h3>
            <p className="text-xs font-mono text-[var(--text-muted)] mt-0.5">
              {yesterdaySummary?.date || 'Previous day finalization'}
            </p>
          </div>

          <Link
            to="/leaderboard"
            className="px-3 py-1.5 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-line)] text-xs font-mono font-semibold text-[var(--color-accent)] hover:border-[var(--color-accent)]"
          >
            Daily Leaderboards &rarr;
          </Link>
        </div>

        {yesterdaySummary ? (
          <div className="space-y-4">
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-4 pt-2 border-t border-[var(--border-line)] text-xs font-mono">
              <div>
                <span className="text-[var(--text-muted)] block text-[11px]">CHALLENGE</span>
                <strong className="text-[var(--text-main)] text-sm truncate block">
                  {yesterdaySummary.challengeTitle || 'Daily Challenge'}
                </strong>
              </div>
              <div>
                <span className="text-[var(--text-muted)] block text-[11px]">VERDICT</span>
                <div className="mt-0.5">
                  <VerdictBadge verdict={yesterdaySummary.verdict as any} size="sm" />
                </div>
              </div>
              <div>
                <span className="text-[var(--text-muted)] block text-[11px]">DAILY RANK</span>
                <strong className="text-[var(--text-main)] text-sm block">
                  {yesterdaySummary.dailyRank ? `#${yesterdaySummary.dailyRank}` : 'Not solved'}
                </strong>
              </div>
              <div>
                <span className="text-[var(--text-muted)] block text-[11px]">POINTS &amp; ATTEMPTS</span>
                <strong className="text-[var(--color-accent)] text-sm block">
                  +{yesterdaySummary.points || 0} PTS ({yesterdaySummary.attempts || 0} attempts)
                </strong>
              </div>
              <div>
                <span className="text-[var(--text-muted)] block text-[11px]">STREAK</span>
                <strong className="text-[var(--color-success)] text-sm block">
                  {yesterdaySummary.streak || 0} days
                </strong>
              </div>
            </div>

            {yesterdaySummary.improvementHint && (
              <div className="p-3 rounded-xl bg-[var(--bg-main)] border border-[var(--border-line)] flex items-start gap-2.5 text-xs font-mono">
                <HelpCircle className="w-4 h-4 text-[var(--color-accent)] shrink-0 mt-0.5" />
                <div>
                  <span className="text-[var(--text-muted)] font-semibold block text-[11px]">
                    DAILY IMPROVEMENT HINT
                  </span>
                  <p className="text-[var(--text-main)] mt-0.5">{yesterdaySummary.improvementHint}</p>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="pt-2 border-t border-[var(--border-line)] text-xs font-mono text-[var(--text-muted)]">
            No finalized result recorded for yesterday. Solve today&apos;s challenge before 17:00 IST to see your summary tomorrow.
          </div>
        )}
      </div>

      {/* Practice Modules Track Progress Card */}
      <div className="glass-card p-6 rounded-2xl border border-[var(--border-line)] bg-[var(--bg-panel)] flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="space-y-1.5 max-w-xl">
          <div className="flex items-center gap-2 text-xs font-mono text-[var(--accent)]">
            <BookOpen className="w-4 h-4" />
            <span>SELF-PACED MASTERY</span>
          </div>
          <h3 className="text-lg font-bold text-[var(--text-main)]">
            C Syllabus Practice Modules
          </h3>
          <p className="text-xs text-[var(--text-muted)] leading-relaxed">
            4 sequentially unlocking topic modules from Control Structures to Dynamic Memory. Solve all {PRACTICE_CONFIG.practiceUnlockThreshold} in each module to unlock the next.
          </p>
        </div>

        <div className="flex items-center gap-4 w-full md:w-auto shrink-0">
          <Link
            to="/practice"
            className="w-full md:w-auto px-5 py-2.5 rounded-xl font-mono text-xs font-bold bg-[var(--bg-surface)] hover:bg-[var(--bg-surface-hover)] border border-[var(--border-line)] text-[var(--text-main)] hover:border-[var(--accent)] transition-all flex items-center justify-center gap-2"
          >
            <span>Explore Practice Modules</span>
            <ArrowRight className="w-4 h-4 text-[var(--accent)]" />
          </Link>
        </div>
      </div>

      {/* Active Daily Streak & Freeze Status Card */}
      <div data-testid="dashboard-streak-freeze-card" className="glass-card p-6 rounded-2xl border border-[var(--border-line)] bg-[var(--bg-panel)] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-5">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-[var(--color-warning)]/15 border border-[var(--color-warning)]/30 flex items-center justify-center text-[var(--color-warning)] shrink-0 shadow-lg">
            <Flame className="w-6 h-6" />
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono text-[var(--text-muted)] uppercase tracking-wider font-semibold">
                CURRENT STREAK
              </span>
              <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-cyan-500/15 text-cyan-400 border border-cyan-500/30">
                {stats?.streakFreezeStatus || '1 Auto Freeze / 7 Days'}
              </span>
            </div>
            <div className="text-2xl font-extrabold text-[var(--text-main)] font-mono">
              {stats?.currentStreak || user?.currentStreak || 0}{' '}
              <span className="text-xs text-[var(--text-muted)] font-normal">days active</span>
            </div>
          </div>
        </div>

        <div className="text-xs font-mono text-[var(--text-muted)] sm:text-right">
          <div>Personal best: <strong className="text-[var(--text-main)]">{stats?.longestStreak || user?.longestStreak || 0} days</strong></div>
          <div className="text-[11px] text-[var(--text-muted)] mt-1">Automatic freeze protects 1 missed challenge day per 7-day rolling window</div>
        </div>
      </div>
        </div>
      )}
    </div>
  );
};
