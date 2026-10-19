import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../api/client.js';
import { useAuth } from '../context/AuthContext.js';
import { FirestoreDataService } from '../services/firestoreData.service.js';
import {
  ALLOWED_DEPARTMENTS,
  ALLOWED_YEARS,
  DIVISION_REGEX,
  DISPLAY_NAME_MIN,
  DISPLAY_NAME_MAX,
  PRN_REGEX,
  PRN_ERROR_MESSAGE,
  isValidPrn,
  normalizePrn,
  PRN_CHANGE_COOLDOWN_DAYS,
  getPrnChangeCooldownStatus,
  containsProfanity,
  maskPrn,
  formatPublicDisplayName,
  generateShortId,
} from '../config/academic.config.js';
import { toast } from 'sonner';
import { VerdictBadge } from '../components/common/Badge.js';
import { GoogleDriveService } from '../services/googleDrive.service.js';
import { PrnFormatGuide } from '../components/common/PrnFormatGuide.js';
import { PracticeReportView } from '../components/practice/PracticeReportView.js';
import {
  Flame,
  Building2,
  GraduationCap,
  Calendar,
  Layers,
  Clock,
  Edit3,
  X,
  Lock,
  Download,
  Trash2,
  ShieldCheck,
  AlertCircle,
  CheckCircle2,
  BookOpen,
  KeyRound,
  Trophy,
  Target,
  Code2,
  Copy,
  Check,
  Eye,
  TrendingUp,
  HelpCircle,
  Folder,
  Loader2,
  Cloud,
} from 'lucide-react';

export const ProfilePage: React.FC = () => {
  const { identifier: paramIdentifier } = useParams<{ identifier?: string }>();
  const { user: currentUser, logout, refreshUser } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const targetIdentifier = paramIdentifier || currentUser?.id || currentUser?.username;
  const isOwnProfile = Boolean(
    currentUser &&
      (!paramIdentifier ||
        paramIdentifier === currentUser.id ||
        paramIdentifier === currentUser.shortId ||
        paramIdentifier === currentUser.username)
  );

  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);
  const [isDriveBackingUp, setIsDriveBackingUp] = useState(false);
  const [profileWorkspaceBlockMsg, setProfileWorkspaceBlockMsg] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({
    displayName: '',
    department: '',
    year: '',
    division: '',
    bio: '',
    storagePreference: 'FIRESTORE_FALLBACK',
    hidePracticeTimer: false,
  });

  // PRN Change Modal State
  const [isPrnModalOpen, setIsPrnModalOpen] = useState(false);
  const [prnForm, setPrnForm] = useState({
    newPrn: '',
    confirmPrn: '',
    reauthConfirmed: false,
  });
  const [prnError, setPrnError] = useState<string | null>(null);

  const [viewCodeSubmission, setViewCodeSubmission] = useState<any | null>(null);
  const [hasCopiedCode, setHasCopiedCode] = useState(false);
  const [hoveredTrendDay, setHoveredTrendDay] = useState<{ date: string; rank: number | null; points: number } | null>(null);

  // Modal accessibility: lock body scroll and bind Escape key
  useEffect(() => {
    if (!isEditOpen && !isPrnModalOpen && !viewCodeSubmission) return;
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (viewCodeSubmission) {
          setViewCodeSubmission(null);
        } else if (isPrnModalOpen) {
          setIsPrnModalOpen(false);
        } else {
          setIsEditOpen(false);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isEditOpen, isPrnModalOpen, viewCodeSubmission]);

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['profile', targetIdentifier],
    queryFn: async () => {
      let serverUser: any = null;
      try {
        const res = await api.get(`/users/profile/${targetIdentifier}`);
        serverUser = res?.data?.user;
      } catch (err) {
        if (isOwnProfile && currentUser?.id) {
          const fsUser = await FirestoreDataService.getUserProfile(currentUser.id);
          if (fsUser) {
            serverUser = fsUser;
          }
        }
        if (!serverUser) throw err;
      }

      // If viewing own profile or profile matches current user, ensure stats persistence
      if (isOwnProfile && currentUser?.id) {
        try {
          const [fsUser, fsPractice, fsSubmissions] = await Promise.all([
            FirestoreDataService.getUserProfile(currentUser.id).catch(() => null),
            FirestoreDataService.getPracticeProgress(currentUser.id).catch(() => null),
            FirestoreDataService.getUserSubmissions(currentUser.id).catch(() => []),
          ]);

          // Calculate solved problems from local storage fallback as well
          let localSolvedCount = 0;
          try {
            const rawPrac = localStorage.getItem('logicq_fallback_practice_progress_v1');
            if (rawPrac) {
              const parsed = JSON.parse(rawPrac);
              const prefix = `${currentUser.id}:`;
              localSolvedCount = Object.entries(parsed).filter(
                ([k, v]: [string, any]) => k.startsWith(prefix) && v?.isSolved
              ).length;
            }
          } catch {}

          const fsSolvedCount = fsPractice?.completedProblems?.length || 0;
          const acceptedSubmissionsCount = new Set(
            fsSubmissions.filter((s) => s.verdict === 'ACCEPTED').map((s) => s.problemId)
          ).size;

          const authoritativeSolved = Math.max(
            serverUser?.totalSolved || 0,
            serverUser?.practiceStats?.totalSolved || 0,
            fsSolvedCount,
            acceptedSubmissionsCount,
            localSolvedCount
          );

          const authoritativePoints = Math.max(
            serverUser?.totalPoints || 0,
            currentUser?.totalPoints || 0,
            fsUser?.totalPoints || 0
          );

          const authoritativeCurrentStreak = Math.max(
            serverUser?.currentStreak || 0,
            currentUser?.currentStreak || 0,
            fsUser?.currentStreak || 0
          );

          const authoritativeLongestStreak = Math.max(
            serverUser?.longestStreak || 0,
            currentUser?.longestStreak || 0,
            fsUser?.longestStreak || 0
          );

          serverUser = {
            ...serverUser,
            ...(fsUser || {}),
            ...serverUser, // retain computed fields like rank, badges, etc.
            totalPoints: authoritativePoints,
            currentStreak: authoritativeCurrentStreak,
            longestStreak: authoritativeLongestStreak,
            totalSolved: authoritativeSolved,
            ...(serverUser?.practiceStats
              ? {
                  practiceStats: {
                    ...serverUser.practiceStats,
                    totalSolved: Math.max(
                      serverUser.practiceStats.totalSolved || 0,
                      authoritativeSolved
                    ),
                  },
                }
              : {}),
          };
        } catch (mergeErr) {
          console.warn('Profile Firestore data merge error:', mergeErr);
        }
      }

      return { success: true, data: { user: serverUser } };
    },
    enabled: !!targetIdentifier,
  });

  const profile = data?.data?.user;

  const updateMutation = useMutation({
    mutationFn: (body: any) => api.put('/users/profile', body),
    onSuccess: async () => {
      toast.success('Profile settings updated successfully!');
      setIsEditOpen(false);
      setEditError(null);
      await refreshUser();
      queryClient.invalidateQueries({ queryKey: ['profile'] });
      queryClient.invalidateQueries({ queryKey: ['leaderboard'] });
    },
    onError: (err: any) => {
      setEditError(err.message || 'Failed to update profile');
      toast.error(err.message || 'Failed to update profile');
    },
  });

  const prnMutation = useMutation({
    mutationFn: (body: { newPrn: string; confirmPrn: string; reauthConfirmed: boolean }) =>
      api.post('/users/change-prn', body),
    onSuccess: async (res: any) => {
      toast.success(res?.data?.message || 'PRN updated successfully! Your new PRN is active.');
      setIsPrnModalOpen(false);
      setPrnError(null);
      setPrnForm({ newPrn: '', confirmPrn: '', reauthConfirmed: false });
      await refreshUser();
      queryClient.invalidateQueries({ queryKey: ['profile'] });
    },
    onError: (err: any) => {
      const msg = err.response?.data?.message || err.message || 'Failed to update PRN';
      setPrnError(msg);
      toast.error(msg);
    },
  });

  const handleOpenEdit = () => {
    if (profile) {
      setEditError(null);
      setProfileWorkspaceBlockMsg(null);
      setEditForm({
        displayName: profile.displayName || '',
        department: profile.department || ALLOWED_DEPARTMENTS[0],
        year: profile.year || ALLOWED_YEARS[0],
        division: profile.division || '',
        bio: profile.bio || '',
        storagePreference: profile.storagePreference || 'FIRESTORE_FALLBACK',
        hidePracticeTimer: Boolean(profile.hidePracticeTimer),
      });
      setIsEditOpen(true);
    }
  };

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    setEditError(null);

    const trimmedDisplay = editForm.displayName.trim();
    if (
      trimmedDisplay &&
      (trimmedDisplay.length < DISPLAY_NAME_MIN || trimmedDisplay.length > DISPLAY_NAME_MAX)
    ) {
      setEditError(
        `Display name must be between ${DISPLAY_NAME_MIN} and ${DISPLAY_NAME_MAX} characters.`
      );
      return;
    }
    if (trimmedDisplay && containsProfanity(trimmedDisplay)) {
      setEditError('Display name contains inappropriate language.');
      return;
    }

    const trimmedDiv = editForm.division.trim().toUpperCase();
    if (trimmedDiv && !DIVISION_REGEX.test(trimmedDiv)) {
      setEditError('Division must be up to 3 letters or digits (e.g., A, B, C1).');
      return;
    }

    updateMutation.mutate({
      displayName: trimmedDisplay || null,
      department: editForm.department,
      year: editForm.year,
      division: trimmedDiv || null,
      bio: editForm.bio.trim() || null,
      storagePreference: editForm.storagePreference,
      hidePracticeTimer: editForm.hidePracticeTimer,
    });
  };

  const handleBackupToGoogleDrive = async () => {
    setProfileWorkspaceBlockMsg(null);
    setIsDriveBackingUp(true);
    try {
      const authResult = await GoogleDriveService.requestAccessToken();
      if (!authResult.success) {
        if (authResult.error === 'USER_CANCELLED') {
          toast.info('Google Drive authorization was cancelled.');
          return;
        }
        if (authResult.error === 'COLLEGE_WORKSPACE_BLOCKED') {
          const msg =
            'Your college administrator has restricted Google Drive integrations. Downloading your backup directly...';
          setProfileWorkspaceBlockMsg(msg);
          toast.info(msg);
          await handleExportData();
          return;
        }
        // Seamless fallback: directly download the offline backup file with 0 errors!
        toast.info('Downloading your backup file directly to your device...', { id: 'profile-drive-export' });
        await handleExportData();
        return;
      }

      toast.loading('Exporting history to Google Drive...', { id: 'profile-drive-export' });
      const exportRes = await api.get('/users/me/export');
      const backupResult = await GoogleDriveService.backupHistoryToDrive(
        authResult.accessToken!,
        exportRes.data,
        currentUser?.id || 'anonymous'
      );

      if (!backupResult.success) {
        const msg =
          backupResult.error === 'COLLEGE_WORKSPACE_BLOCKED'
            ? 'Your college administrator has restricted Google Drive integrations. Downloading your backup directly...'
            : 'Downloading your backup file directly to your device...';
        toast.info(msg, { id: 'profile-drive-export' });
        await handleExportData();
        return;
      }

      await api.put('/users/profile', { storagePreference: 'GOOGLE_DRIVE' });
      if (refreshUser) {
        await refreshUser();
      }
      queryClient.invalidateQueries({ queryKey: ['profile'] });
      toast.success('History backed up to Google Drive successfully!', { id: 'profile-drive-export' });
    } catch (err: any) {
      toast.info('Downloading your backup file directly to your device...', { id: 'profile-drive-export' });
      await handleExportData();
    } finally {
      setIsDriveBackingUp(false);
    }
  };

  const handleExportData = async () => {
    try {
      const res = await api.get('/users/me/export');
      const blob = new Blob([JSON.stringify(res.data, null, 2)], {
        type: 'application/json',
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `logicq_data_export_${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success('Personal data export downloaded.');
    } catch (err: any) {
      toast.error(err.message || 'Failed to export personal data');
    }
  };

  const handleDeleteAccount = async () => {
    const confirmed = window.confirm(
      'Are you sure you want to permanently delete your account? This removes your PRN, frees your PRN registration, and clears your profile fields.'
    );
    if (!confirmed) return;

    try {
      await api.delete('/users/me');
      toast.success('Account deleted and PRN freed.');
      await logout();
      navigate('/landing');
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete account');
    }
  };

  if (isLoading) {
    return (
      <div data-testid="profile-loading-skeleton" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-8 animate-pulse font-mono">
        <div className="h-40 bg-[#141932] border border-[#252C4F] rounded-2xl mb-8"></div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="h-28 bg-[#141932] border border-[#252C4F] rounded-2xl"></div>
          <div className="h-28 bg-[#141932] border border-[#252C4F] rounded-2xl"></div>
          <div className="h-28 bg-[#141932] border border-[#252C4F] rounded-2xl"></div>
          <div className="h-28 bg-[#141932] border border-[#252C4F] rounded-2xl"></div>
        </div>
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div data-testid="profile-error-boundary" className="max-w-4xl mx-auto py-20 px-4 text-center font-mono space-y-4">
        <h2 className="text-xl font-bold text-[#E8EAF6]">
          {error ? 'Failed to load challenger profile' : 'Challenger not found'}
        </h2>
        {error && (
          <p className="text-xs text-rose-400 font-mono">
            {(error as any)?.message || 'Please check your connection and try again.'}
          </p>
        )}
        <div className="flex items-center justify-center gap-3 pt-2">
          {error && (
            <button
              onClick={() => refetch()}
              className="px-5 py-2.5 rounded-xl font-bold bg-[#8B9BFF] text-[#0C0F1F] text-xs hover:opacity-95"
            >
              Retry Connection
            </button>
          )}
          <Link to="/leaderboard" className="text-xs text-[#8B9BFF] underline py-2.5">
            &larr; View competitive leaderboard
          </Link>
        </div>
      </div>
    );
  }

  const publicLabel = formatPublicDisplayName(profile);
  const ownMaskedPrn = isOwnProfile ? profile.maskedPrn || maskPrn(profile.prn) : null;
  const headerTitle = isOwnProfile
    ? profile.displayName ||
      [profile.department, profile.year, ownMaskedPrn].filter(Boolean).join(' • ') ||
      publicLabel
    : publicLabel;

  const solvedByDiff = profile.solvedByDifficulty || profile.difficultyBreakdown || {};

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Profile Header Banner */}
      <div className="glass-card p-6 sm:p-8 rounded-2xl border border-[#252C4F] bg-[#141932] shadow-2xl relative overflow-hidden">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5">
            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-[#8B9BFF] flex items-center justify-center text-2xl sm:text-3xl font-extrabold text-[#0C0F1F] shadow-xl font-mono shrink-0">
              {(publicLabel || 'S').charAt(0).toUpperCase()}
            </div>

            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-extrabold text-[#E8EAF6]">{headerTitle}</h1>
                <span className="text-xs font-mono font-bold text-[#8B9BFF] bg-[#8B9BFF]/15 border border-[#8B9BFF]/40 px-2.5 py-0.5 rounded">
                  {profile.rank ? `RANK #${profile.rank}` : 'NOT RANKED YET'}
                </span>
                {isOwnProfile && ownMaskedPrn && (
                  <span
                    data-testid="own-masked-prn"
                    className="text-xs font-mono font-semibold text-[#46D9A0] bg-[#46D9A0]/10 border border-[#46D9A0]/30 px-2.5 py-0.5 rounded"
                  >
                    PRN: {ownMaskedPrn}
                  </span>
                )}
              </div>

              <p className="text-xs font-mono text-[#9AA1C4]">
                Public Display Label: <strong className="text-[#E8EAF6]">{publicLabel}</strong>
              </p>

              {/* Academic Tags: College, Department, Year, Division */}
              <div className="flex flex-wrap items-center gap-2 pt-1 text-xs font-mono">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#0C0F1F] border border-[#252C4F] text-[#E8EAF6]">
                  <Building2 className="w-3.5 h-3.5 text-[#8B9BFF]" />
                  <span>{profile.college || 'Sanjivani University'}</span>
                </span>
                {profile.department && (
                  <span
                    data-testid="profile-department"
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#0C0F1F] border border-[#252C4F] text-[#E8EAF6]"
                  >
                    <GraduationCap className="w-3.5 h-3.5 text-[#46D9A0]" />
                    <span>{profile.department}</span>
                  </span>
                )}
                {profile.year && (
                  <span
                    data-testid="profile-year"
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#0C0F1F] border border-[#252C4F] text-[#E8EAF6]"
                  >
                    <Calendar className="w-3.5 h-3.5 text-[#8B9BFF]" />
                    <span>Year: {profile.year}</span>
                  </span>
                )}
                {profile.division && (
                  <span
                    data-testid="profile-division"
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#0C0F1F] border border-[#252C4F] text-[#E8EAF6]"
                  >
                    <Layers className="w-3.5 h-3.5 text-[#9AA1C4]" />
                    <span>Div: {profile.division}</span>
                  </span>
                )}
              </div>

              {profile.bio && (
                <p className="text-sm text-[#E8EAF6] mt-2 max-w-xl leading-relaxed font-sans">
                  {profile.bio}
                </p>
              )}
            </div>
          </div>

          {isOwnProfile && (
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={handleOpenEdit}
                data-testid="edit-profile-btn"
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-mono font-semibold text-[#E8EAF6] bg-[#0C0F1F] hover:bg-[#252C4F] border border-[#252C4F] transition-colors"
              >
                <Edit3 className="w-3.5 h-3.5 text-[#8B9BFF]" />
                <span>Profile Settings</span>
              </button>
              <button
                type="button"
                onClick={handleExportData}
                data-testid="export-data-btn"
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-mono font-semibold text-[#E8EAF6] bg-[#0C0F1F] hover:bg-[#252C4F] border border-[#252C4F] transition-colors"
              >
                <Download className="w-3.5 h-3.5 text-[#46D9A0]" />
                <span>Export Data</span>
              </button>
              <button
                type="button"
                onClick={handleBackupToGoogleDrive}
                disabled={isDriveBackingUp}
                data-testid="drive-backup-btn"
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-mono font-semibold text-[#8B9BFF] bg-[#0C0F1F] hover:bg-[#252C4F] border border-[#252C4F] transition-colors disabled:opacity-50"
                title="Back up history to personal Google Drive"
              >
                {isDriveBackingUp ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Folder className="w-3.5 h-3.5" />
                )}
                <span>Drive Backup</span>
              </button>
              <button
                type="button"
                onClick={handleDeleteAccount}
                data-testid="delete-account-btn"
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-mono font-semibold text-[#FF7A8A] bg-[#FF7A8A]/10 hover:bg-[#FF7A8A]/20 border border-[#FF7A8A]/30 transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete Account</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Primary Metrics Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="glass-card p-5 rounded-2xl border border-[#252C4F] bg-[#141932]">
          <span className="text-xs font-mono text-[#9AA1C4] block mb-1">TOTAL SCORE</span>
          <span className="text-2xl font-extrabold text-[#8B9BFF] font-mono">
            {Math.max(profile.totalPoints || 0, isOwnProfile ? (currentUser?.totalPoints || 0) : 0)} PTS
          </span>
        </div>

        <div className="glass-card p-5 rounded-2xl border border-[#252C4F] bg-[#141932]">
          <span className="text-xs font-mono text-[#9AA1C4] block mb-1">CURRENT STREAK</span>
          <span className="text-2xl font-extrabold text-[#46D9A0] font-mono flex items-center gap-1">
            <Flame className="w-6 h-6" />
            {Math.max(profile.currentStreak || 0, isOwnProfile ? (currentUser?.currentStreak || 0) : 0)}d
          </span>
        </div>

        <div className="glass-card p-5 rounded-2xl border border-[#252C4F] bg-[#141932]">
          <span className="text-xs font-mono text-[#9AA1C4] block mb-1">LONGEST STREAK</span>
          <span className="text-2xl font-extrabold text-[#E8EAF6] font-mono">
            {Math.max(profile.longestStreak || 0, isOwnProfile ? (currentUser?.longestStreak || 0) : 0)} days
          </span>
        </div>

        <div className="glass-card p-5 rounded-2xl border border-[#252C4F] bg-[#141932]">
          <span className="text-xs font-mono text-[#9AA1C4] block mb-1">PROBLEMS SOLVED</span>
          <span className="text-2xl font-extrabold text-[#46D9A0] font-mono">
            {profile.totalSolved || 0}
          </span>
        </div>
      </div>

      {/* Secondary Standing & Mastery Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div data-testid="profile-best-daily-rank" className="glass-card p-5 rounded-2xl border border-[#252C4F] bg-[#141932]">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-mono text-[#9AA1C4]">BEST DAILY RANK</span>
            <Trophy className="w-5 h-5 text-[var(--color-warning)]" />
          </div>
          <div className="text-2xl font-extrabold text-[#E8EAF6] font-mono">
            {profile.bestDailyRank ? `#${profile.bestDailyRank}` : (profile.rank ? `#${profile.rank}` : '—')}
          </div>
          <p className="text-[11px] font-mono text-[#9AA1C4] mt-1">
            Personal record across daily challenge finalizations
          </p>
        </div>

        <div data-testid="profile-accuracy-rate" className="glass-card p-5 rounded-2xl border border-[#252C4F] bg-[#141932]">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-mono text-[#9AA1C4]">ACCURACY RATE</span>
            <Target className="w-5 h-5 text-[#8B9BFF]" />
          </div>
          <div className="text-2xl font-extrabold text-[#8B9BFF] font-mono">
            {profile.accuracy !== null && profile.accuracy !== undefined ? (
              <>
                {profile.accuracy}%
                <span className="text-xs text-[#9AA1C4] font-normal ml-1">accepted</span>
              </>
            ) : (
              <span className="text-[#9AA1C4]">—</span>
            )}
          </div>
          <p className="text-[11px] font-mono text-[#9AA1C4] mt-1">
            {profile.accuracy !== null ? 'Evaluated accepted solve rate' : 'No submissions recorded yet'}
          </p>
        </div>

        <div data-testid="profile-streak-freeze" className="glass-card p-5 rounded-2xl border border-[#252C4F] bg-[#141932]">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-mono text-[#9AA1C4]">STREAK FREEZE</span>
            <ShieldCheck className="w-5 h-5 text-[#46D9A0]" />
          </div>
          <div className="text-xl font-extrabold text-[#46D9A0] font-mono">
            {profile.streakFreezeStatus || '1 Auto Freeze / 7 Days'}
          </div>
          <p className="text-[11px] font-mono text-[#9AA1C4] mt-1">
            Automatic protection for 1 missed challenge day per 7-day rolling window
          </p>
        </div>
      </div>

      {/* Solved by Difficulty Breakdown */}
      <div className="glass-card p-6 rounded-2xl border border-[#252C4F] bg-[#141932] space-y-4">
        <h2 className="text-sm font-mono font-bold text-[#E8EAF6] tracking-wide uppercase">
          Solved by Difficulty
        </h2>

        <div className="grid grid-cols-3 gap-3 pt-2 text-center">
          <div className="p-4 rounded-xl bg-[#0C0F1F] border border-[#46D9A0]/30">
            <span className="text-xs font-mono text-[#46D9A0] font-bold block mb-1">EASY</span>
            <span className="text-xl font-mono font-extrabold text-[#E8EAF6]">
              {solvedByDiff.EASY ?? solvedByDiff.easy ?? 0}
            </span>
          </div>

          <div className="p-4 rounded-xl bg-[#0C0F1F] border border-[#8B9BFF]/30">
            <span className="text-xs font-mono text-[#8B9BFF] font-bold block mb-1">MEDIUM</span>
            <span className="text-xl font-mono font-extrabold text-[#E8EAF6]">
              {solvedByDiff.MEDIUM ?? solvedByDiff.medium ?? 0}
            </span>
          </div>

          <div className="p-4 rounded-xl bg-[#0C0F1F] border border-[#FF7A8A]/30">
            <span className="text-xs font-mono text-[#FF7A8A] font-bold block mb-1">HARD</span>
            <span className="text-xl font-mono font-extrabold text-[#E8EAF6]">
              {solvedByDiff.HARD ?? solvedByDiff.hard ?? 0}
            </span>
          </div>
        </div>
      </div>

      {/* Practice Curriculum Mastery & Module Progress */}
      {profile.practiceStats && (
        <div data-testid="profile-practice-mastery" className="glass-card p-6 rounded-2xl border border-[#252C4F] bg-[#141932] space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#252C4F] pb-4">
            <div>
              <div className="flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-[#8B9BFF]" />
                <h2 className="text-base font-mono font-bold text-[#E8EAF6] tracking-wide uppercase">
                  Practice Curriculum Mastery
                </h2>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-[#8B9BFF]/10 text-[#8B9BFF] border border-[#8B9BFF]/30 font-semibold">
                  4 Modules • 40 Problems
                </span>
              </div>
              <p className="text-xs font-mono text-[#9AA1C4] mt-1">
                4-phase structured C programming curriculum from Control Structures to Dynamic Memory
              </p>
            </div>
            <Link
              to="/practice"
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[#8B9BFF]/10 hover:bg-[#8B9BFF]/20 text-[#8B9BFF] border border-[#8B9BFF]/30 text-xs font-mono font-semibold transition-colors self-start sm:self-auto"
            >
              <span>Go to Practice Arena</span>
              <span>→</span>
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
            {/* Left: LeetCode-style Donut Progress Ring */}
            <div className="md:col-span-5 flex flex-col items-center justify-center p-4 rounded-xl bg-[#0C0F1F] border border-[#252C4F]/80">
              <div className="relative w-44 h-44 flex items-center justify-center">
                {/* SVG Donut */}
                {(() => {
                  const size = 160;
                  const strokeWidth = 14;
                  const radius = (size - strokeWidth) / 2;
                  const circumference = 2 * Math.PI * radius;

                  const total = profile.practiceStats.totalQuestions || 40;
                  const easy = profile.practiceStats.easySolved || 0;
                  const medium = profile.practiceStats.mediumSolved || 0;
                  const hard = profile.practiceStats.hardSolved || 0;

                  // Arc lengths
                  const easyLen = total > 0 ? (easy / total) * circumference : 0;
                  const medLen = total > 0 ? (medium / total) * circumference : 0;
                  const hardLen = total > 0 ? (hard / total) * circumference : 0;

                  // Dash offsets (starting from top -90deg)
                  const easyOffset = 0;
                  const medOffset = -easyLen;
                  const hardOffset = -(easyLen + medLen);

                  return (
                    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="transform -rotate-90">
                      {/* Background Track */}
                      <circle
                        cx={size / 2}
                        cy={size / 2}
                        r={radius}
                        fill="none"
                        stroke="#1F2647"
                        strokeWidth={strokeWidth}
                      />
                      {/* Easy Arc */}
                      {easy > 0 && (
                        <circle
                          cx={size / 2}
                          cy={size / 2}
                          r={radius}
                          fill="none"
                          stroke="#46D9A0"
                          strokeWidth={strokeWidth}
                          strokeDasharray={`${easyLen} ${circumference}`}
                          strokeDashoffset={easyOffset}
                          strokeLinecap="round"
                        />
                      )}
                      {/* Medium Arc */}
                      {medium > 0 && (
                        <circle
                          cx={size / 2}
                          cy={size / 2}
                          r={radius}
                          fill="none"
                          stroke="#8B9BFF"
                          strokeWidth={strokeWidth}
                          strokeDasharray={`${medLen} ${circumference}`}
                          strokeDashoffset={medOffset}
                          strokeLinecap="round"
                        />
                      )}
                      {/* Hard Arc */}
                      {hard > 0 && (
                        <circle
                          cx={size / 2}
                          cy={size / 2}
                          r={radius}
                          fill="none"
                          stroke="#FF7A8A"
                          strokeWidth={strokeWidth}
                          strokeDasharray={`${hardLen} ${circumference}`}
                          strokeDashoffset={hardOffset}
                          strokeLinecap="round"
                        />
                      )}
                    </svg>
                  );
                })()}

                {/* Center Content */}
                <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                  <span className="text-2xl font-extrabold font-mono text-[#E8EAF6] tracking-tight">
                    {profile.practiceStats.totalSolved}
                    <span className="text-xs text-[#9AA1C4] font-normal">/{profile.practiceStats.totalQuestions || 40}</span>
                  </span>
                  <span className="text-[10px] font-mono text-[#9AA1C4] uppercase tracking-wider">
                    Solved
                  </span>
                  <span className="text-[11px] font-mono font-bold text-[#8B9BFF] mt-0.5">
                    {profile.practiceStats.percentage}%
                  </span>
                </div>
              </div>

              {/* Difficulty Breakdown Badges Under Donut */}
              <div className="grid grid-cols-3 gap-2 w-full mt-4 pt-3 border-t border-[#252C4F]">
                <div className="text-center">
                  <div className="text-[10px] font-mono font-semibold text-[#46D9A0] flex items-center justify-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#46D9A0]" />
                    Easy
                  </div>
                  <div className="text-sm font-mono font-bold text-[#E8EAF6] mt-0.5">
                    {profile.practiceStats.easySolved}
                    <span className="text-[10px] text-[#9AA1C4] font-normal">/16</span>
                  </div>
                </div>

                <div className="text-center">
                  <div className="text-[10px] font-mono font-semibold text-[#8B9BFF] flex items-center justify-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#8B9BFF]" />
                    Med
                  </div>
                  <div className="text-sm font-mono font-bold text-[#E8EAF6] mt-0.5">
                    {profile.practiceStats.mediumSolved}
                    <span className="text-[10px] text-[#9AA1C4] font-normal">/16</span>
                  </div>
                </div>

                <div className="text-center">
                  <div className="text-[10px] font-mono font-semibold text-[#FF7A8A] flex items-center justify-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#FF7A8A]" />
                    Hard
                  </div>
                  <div className="text-sm font-mono font-bold text-[#E8EAF6] mt-0.5">
                    {profile.practiceStats.hardSolved}
                    <span className="text-[10px] text-[#9AA1C4] font-normal">/8</span>
                  </div>
                </div>
              </div>

              {/* Practice telemetry: Active time & 1st attempt solve */}
              {(profile.practiceStats.totalActiveSeconds > 0 || profile.practiceStats.firstAttemptAcceptedCount > 0) && (
                <div className="flex items-center justify-between w-full mt-3 px-1 text-[11px] font-mono text-[#9AA1C4] pt-2 border-t border-[#252C4F]/60">
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3 text-[#8B9BFF]" />
                    {profile.practiceStats.totalActiveSeconds >= 3600
                      ? `${Math.floor(profile.practiceStats.totalActiveSeconds / 3600)}h ${Math.floor((profile.practiceStats.totalActiveSeconds % 3600) / 60)}m`
                      : `${Math.round(profile.practiceStats.totalActiveSeconds / 60)} mins`}
                  </span>
                  <span className="flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3 text-[#46D9A0]" />
                    {profile.practiceStats.firstAttemptAcceptedCount} first-try
                  </span>
                </div>
              )}
            </div>

            {/* Right: 4 Module Progress Bars */}
            <div className="md:col-span-7 space-y-3">
              <div className="text-xs font-mono font-semibold text-[#9AA1C4] uppercase tracking-wider mb-1 flex items-center justify-between">
                <span>Modules Curriculum Progress</span>
                <span className="text-[10px] text-[#8B9BFF]">{profile.practiceStats.totalSolved} of {profile.practiceStats.totalQuestions || 40} completed</span>
              </div>

              {(profile.practiceStats.modules || []).map((mod: any) => {
                const isLocked = !mod.isUnlocked;
                const isDone = mod.isCompleted;

                return (
                  <div
                    key={mod.id}
                    className={`p-3.5 rounded-xl border transition-all ${
                      isDone
                        ? 'bg-[#0C0F1F] border-[#46D9A0]/30 hover:border-[#46D9A0]/50'
                        : isLocked
                        ? 'bg-[#0C0F1F]/50 border-[#252C4F]/40 opacity-70'
                        : 'bg-[#0C0F1F] border-[#8B9BFF]/30 hover:border-[#8B9BFF]/50'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="text-xs font-mono font-bold text-[#8B9BFF] px-1.5 py-0.5 rounded bg-[#8B9BFF]/10 shrink-0">
                          M{mod.order}
                        </span>
                        <span className="text-xs font-mono font-bold text-[#E8EAF6] truncate">
                          {mod.title}
                        </span>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        {isDone ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-mono font-bold text-[#46D9A0] bg-[#46D9A0]/10 px-2 py-0.5 rounded-full border border-[#46D9A0]/30">
                            <CheckCircle2 className="w-3 h-3" />
                            Completed
                          </span>
                        ) : isLocked ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-mono text-[#9AA1C4] bg-[#252C4F]/30 px-2 py-0.5 rounded-full border border-[#252C4F]">
                            <Lock className="w-3 h-3 text-[#9AA1C4]" />
                            Locked
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[10px] font-mono text-[#8B9BFF] bg-[#8B9BFF]/10 px-2 py-0.5 rounded-full border border-[#8B9BFF]/30">
                            In Progress
                          </span>
                        )}

                        <span className="text-xs font-mono font-bold text-[#E8EAF6]">
                          {mod.solvedCount}/{mod.totalQuestions}
                        </span>
                      </div>
                    </div>

                    {/* Progress Bar */}
                    <div className="w-full bg-[#141932] h-2 rounded-full overflow-hidden border border-[#252C4F]/50">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${
                          isDone
                            ? 'bg-gradient-to-r from-emerald-500 to-teal-400'
                            : isLocked
                            ? 'bg-[#252C4F]'
                            : 'bg-gradient-to-r from-indigo-500 to-blue-400'
                        }`}
                        style={{ width: `${Math.max(mod.percentage, isDone ? 100 : 0)}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Student Charts Section: 90-Day Challenge Streak Heatmap & 30-Day Daily Rank Trend */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Chart A: Challenge Streak Heatmap (90 Days) */}
        <div data-testid="profile-streak-heatmap" className="glass-card p-6 rounded-2xl border border-[#252C4F] bg-[#141932] space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-mono font-bold text-[#E8EAF6] tracking-wide uppercase flex items-center gap-2">
                <Calendar className="w-4 h-4 text-[#8B9BFF]" />
                <span>Challenge Streak Heatmap</span>
              </h3>
              <p className="text-[11px] font-mono text-[#9AA1C4] mt-0.5">
                Past 90 challenge days cadence
              </p>
            </div>
            <span className="text-[11px] font-mono text-[#46D9A0] font-semibold">90 Days</span>
          </div>

          {/* 90-Day Grid */}
          <div className="py-2 overflow-x-auto">
            {(() => {
              const heatmapList = profile.streakHeatmap90d && profile.streakHeatmap90d.length > 0
                ? profile.streakHeatmap90d
                : Array.from({ length: 90 }, (_, i) => {
                    const d = new Date(Date.now() - (89 - i) * 86400000).toISOString().slice(0, 10);
                    return { date: d, status: 'missed', points: 0 };
                  });

              return (
                <div className="grid grid-flow-col grid-rows-7 gap-1.5 min-w-[500px] py-1">
                  {heatmapList.map((day: any) => {
                    let tileClass = 'bg-[#0C0F1F] border-[#252C4F]/60';
                    let label = `${day.date}: Missed`;
                    if (day.status === 'solved') {
                      tileClass = 'bg-emerald-500 border-emerald-400 shadow-sm shadow-emerald-500/30';
                      label = `${day.date}: Solved (+${day.points || 20} PTS)`;
                    } else if (day.status === 'frozen') {
                      tileClass = 'bg-cyan-400 border-cyan-300 shadow-sm shadow-cyan-400/30';
                      label = `${day.date}: Streak Freeze Used`;
                    } else if (day.status === 'paused') {
                      tileClass = 'bg-amber-400 border-amber-300 shadow-sm shadow-amber-400/30';
                      label = `${day.date}: Admin Paused Day`;
                    }

                    return (
                      <div
                        key={day.date}
                        title={label}
                        className={`w-3.5 h-3.5 rounded-sm border ${tileClass} transition-transform hover:scale-125 cursor-pointer`}
                      />
                    );
                  })}
                </div>
              );
            })()}
          </div>

          {/* Legend */}
          <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] font-mono text-[#9AA1C4] pt-2 border-t border-[#252C4F]">
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-sm bg-emerald-500 border border-emerald-400" />
              <span>Solved</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-sm bg-cyan-400 border border-cyan-300" />
              <span>Streak Freeze</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-sm bg-amber-400 border border-amber-300" />
              <span>Admin Paused</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-sm bg-[#0C0F1F] border border-[#252C4F]" />
              <span>Missed</span>
            </div>
          </div>
        </div>

        {/* Chart B: Daily Rank Trend (30 Days) */}
        <div data-testid="profile-rank-trend-chart" className="glass-card p-6 rounded-2xl border border-[#252C4F] bg-[#141932] space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-mono font-bold text-[#E8EAF6] tracking-wide uppercase flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-[#46D9A0]" />
                <span>Daily Rank Trend</span>
              </h3>
              <p className="text-[11px] font-mono text-[#9AA1C4] mt-0.5">
                Trajectory over the last 30 challenge days (#1 at top)
              </p>
            </div>
            <span className="text-[11px] font-mono text-[#8B9BFF] font-semibold">30 Days</span>
          </div>

          {/* SVG Trend Line */}
          {(() => {
            const raw30 = profile.rankHistory30d && profile.rankHistory30d.length > 0
              ? profile.rankHistory30d
              : Array.from({ length: 30 }, (_, i) => {
                  const d = new Date(Date.now() - (29 - i) * 86400000).toISOString().slice(0, 10);
                  return { date: d, rank: null, points: 0 };
                });

            const pointsCoords = raw30.map((entry: any, idx: number) => {
              const x = 35 + (idx * (550 / 29));
              let y = 135; // unranked baseline
              if (entry.rank !== null && entry.rank > 0) {
                const clampedRank = Math.min(25, entry.rank);
                y = 20 + ((clampedRank - 1) / 24) * 95;
              }
              return { ...entry, x, y };
            });

            const pathD = pointsCoords
              .map((p: any, idx: number) => (idx === 0 ? `M ${p.x} ${p.y}` : `L ${p.x} ${p.y}`))
              .join(' ');

            const areaD = `${pathD} L ${pointsCoords[pointsCoords.length - 1].x} 140 L ${pointsCoords[0].x} 140 Z`;

            return (
              <div className="relative pt-1">
                {hoveredTrendDay && (
                  <div className="absolute top-0 right-0 bg-[#0C0F1F] border border-[#252C4F] px-2.5 py-1 rounded-lg text-[11px] font-mono text-[#E8EAF6] shadow-lg pointer-events-none z-10">
                    <span className="text-[#8B9BFF] font-bold">{hoveredTrendDay.date}</span>: {hoveredTrendDay.rank ? `Rank #${hoveredTrendDay.rank}` : 'Unranked'} ({hoveredTrendDay.points ? `+${hoveredTrendDay.points} PTS` : '0 PTS'})
                  </div>
                )}
                <svg viewBox="0 0 600 150" className="w-full h-36 overflow-visible">
                  <defs>
                    <linearGradient id="rankTrendGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#8B9BFF" stopOpacity="0.35" />
                      <stop offset="100%" stopColor="#8B9BFF" stopOpacity="0.0" />
                    </linearGradient>
                  </defs>

                  {/* Horizontal Guide Lines */}
                  <line x1="30" y1="20" x2="590" y2="20" stroke="#252C4F" strokeDasharray="3 3" />
                  <text x="25" y="24" fill="#9AA1C4" fontSize="9" textAnchor="end" fontFamily="monospace">#1</text>

                  <line x1="30" y1="67" x2="590" y2="67" stroke="#252C4F" strokeDasharray="3 3" />
                  <text x="25" y="71" fill="#9AA1C4" fontSize="9" textAnchor="end" fontFamily="monospace">#10</text>

                  <line x1="30" y1="115" x2="590" y2="115" stroke="#252C4F" strokeDasharray="3 3" />
                  <text x="25" y="119" fill="#9AA1C4" fontSize="9" textAnchor="end" fontFamily="monospace">#25</text>

                  <line x1="30" y1="135" x2="590" y2="135" stroke="#252C4F" strokeWidth="1" />
                  <text x="25" y="138" fill="#9AA1C4" fontSize="8" textAnchor="end" fontFamily="monospace">—</text>

                  {/* Gradient Area */}
                  <path d={areaD} fill="url(#rankTrendGrad)" />

                  {/* Trend Polyline */}
                  <path d={pathD} fill="none" stroke="#8B9BFF" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />

                  {/* Nodes */}
                  {pointsCoords.map((p: any, idx: number) => {
                    const isRanked = p.rank !== null && p.rank > 0;
                    return (
                      <circle
                        key={idx}
                        cx={p.x}
                        cy={p.y}
                        r={isRanked ? 4 : 2.5}
                        fill={isRanked ? '#46D9A0' : '#252C4F'}
                        stroke={isRanked ? '#0C0F1F' : '#9AA1C4'}
                        strokeWidth="1.5"
                        className="cursor-pointer transition-all hover:r-6"
                        onMouseEnter={() => setHoveredTrendDay(p)}
                        onMouseLeave={() => setHoveredTrendDay(null)}
                      />
                    );
                  })}
                </svg>

                <div className="flex justify-between text-[10px] font-mono text-[#9AA1C4] pt-2 border-t border-[#252C4F]">
                  <span>30 days ago</span>
                  <span>15 days ago</span>
                  <span>Today</span>
                </div>
              </div>
            );
          })()}
        </div>
      </div>

      {/* Real Recent Submissions Table & Code Modal */}
      <div data-testid="profile-recent-submissions-card" className="glass-card p-6 rounded-2xl border border-[#252C4F] bg-[#141932] space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-mono font-bold text-[#E8EAF6] tracking-wide uppercase flex items-center gap-2">
              <Code2 className="w-4 h-4 text-[#8B9BFF]" />
              <span>Recent Submissions</span>
            </h2>
            <p className="text-xs font-mono text-[#9AA1C4] mt-0.5">
              Verified problem-solving evaluations and submitted code
            </p>
          </div>
          <span className="text-xs font-mono text-[#9AA1C4]">
            {profile.recentSubmissions?.length || 0} Evaluated
          </span>
        </div>

        {(!profile.recentSubmissions || profile.recentSubmissions.length === 0) ? (
          <div className="text-center py-10 font-mono text-xs text-[#9AA1C4] space-y-2 border border-dashed border-[#252C4F] rounded-xl p-6">
            <p>No evaluated submissions recorded yet.</p>
            <p className="text-[#8B9BFF]">
              Solve today&apos;s daily challenge or practice problems to establish your personal code record!
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-mono">
              <thead className="text-[#9AA1C4] uppercase text-[10px] tracking-wider border-b border-[#252C4F]">
                <tr>
                  <th className="pb-3">Challenge Title</th>
                  <th className="pb-3">Verdict</th>
                  <th className="pb-3">Points</th>
                  <th className="pb-3">Runtime</th>
                  <th className="pb-3">Submitted</th>
                  <th className="pb-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#252C4F]">
                {profile.recentSubmissions.map((sub: any) => (
                  <tr key={sub.id} className="hover:bg-[#0C0F1F]/40 transition-colors">
                    <td className="py-3 font-semibold text-[#E8EAF6]">
                      {sub.problem?.title || 'Daily Challenge'}
                    </td>
                    <td className="py-3">
                      <VerdictBadge verdict={sub.verdict} size="sm" />
                    </td>
                    <td className="py-3 text-[#46D9A0] font-bold">
                      +{sub.pointsAwarded || 0} PTS
                    </td>
                    <td className="py-3 text-[#9AA1C4]">
                      {sub.runtimeMs ? `${sub.runtimeMs}ms` : '—'}
                    </td>
                    <td className="py-3 text-[#9AA1C4]">
                      {sub.createdAt ? new Date(sub.createdAt).toLocaleDateString() : 'Today'}
                    </td>
                    <td className="py-3 text-right">
                      {sub.code ? (
                        <button
                          type="button"
                          onClick={() => {
                            setViewCodeSubmission(sub);
                            setHasCopiedCode(false);
                          }}
                          className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-[#0C0F1F] hover:bg-[#252C4F] border border-[#252C4F] text-[#8B9BFF] hover:text-[#E8EAF6] text-xs font-mono font-semibold transition-colors"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>View Code</span>
                        </button>
                      ) : (
                        <span className="text-[#9AA1C4] text-[11px]">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Practice Verification & Performance Audit Report */}
      {(isOwnProfile || currentUser?.role === 'ADMIN') && profile && (
        <PracticeReportView user={profile} />
      )}

      {/* View Submitted Code Modal */}
      {viewCodeSubmission && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="view-code-modal-title"
          className="fixed inset-0 z-[120] flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm"
        >
          <div className="w-full max-w-2xl rounded-2xl border border-[var(--border-line)] bg-[var(--bg-panel)] shadow-2xl flex flex-col max-h-[85vh] overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between p-4 sm:p-5 border-b border-[var(--border-line)] bg-[var(--bg-surface)] shrink-0">
              <div className="space-y-0.5">
                <h3 id="view-code-modal-title" className="text-base font-bold text-[var(--text-main)] flex items-center gap-2">
                  <Code2 className="w-5 h-5 text-[var(--color-accent)]" />
                  <span>{viewCodeSubmission.problem?.title || 'Daily Challenge'} Solution</span>
                </h3>
                <p className="text-xs font-mono text-[var(--text-muted)]">
                  Submitted on {new Date(viewCodeSubmission.createdAt).toLocaleString()} • {viewCodeSubmission.pointsAwarded || 0} PTS
                </p>
              </div>

              <button
                type="button"
                onClick={() => setViewCodeSubmission(null)}
                aria-label="Close code modal"
                className="p-1.5 text-[var(--text-muted)] hover:text-[var(--text-main)] rounded-lg hover:bg-[var(--bg-surface-hover)] transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Code Body */}
            <div className="p-4 sm:p-5 overflow-y-auto space-y-3 flex-1 bg-[var(--bg-main)]">
              <div className="flex items-center justify-between text-xs font-mono text-[var(--text-muted)]">
                <div className="flex items-center gap-2">
                  <VerdictBadge verdict={viewCodeSubmission.verdict} size="sm" />
                  <span>Language: C (C11)</span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(viewCodeSubmission.code || '');
                    setHasCopiedCode(true);
                    toast.success('Code copied to clipboard');
                    setTimeout(() => setHasCopiedCode(false), 2000);
                  }}
                  className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-[var(--bg-surface)] hover:bg-[var(--bg-surface-hover)] border border-[var(--border-line)] text-xs font-mono text-[var(--text-main)] transition-colors"
                >
                  {hasCopiedCode ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-500" />
                      <span className="text-emerald-500 font-semibold">Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Copy Code</span>
                    </>
                  )}
                </button>
              </div>

              {/* Code Container with line numbers and high contrast */}
              <div className="rounded-xl border border-[var(--border-line)] overflow-hidden bg-[var(--bg-panel)] shadow-sm">
                <div className="px-3.5 py-2 border-b border-[var(--border-line)] bg-[var(--bg-surface)] flex items-center justify-between text-[11px] font-mono text-[var(--text-muted)]">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-rose-500/70 inline-block" />
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-500/70 inline-block" />
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500/70 inline-block" />
                    <span className="ml-1.5 font-semibold text-[var(--text-main)]">solution.c</span>
                  </div>
                  <span>{(viewCodeSubmission.code || '').split('\n').length} lines</span>
                </div>
                <div className="p-4 overflow-x-auto text-xs font-mono leading-relaxed bg-[var(--bg-panel)] flex gap-3">
                  <div className="select-none text-right text-[var(--text-muted)] opacity-50 pr-2 border-r border-[var(--border-line)] shrink-0 font-mono">
                    {(viewCodeSubmission.code || '').split('\n').map((_: string, idx: number) => (
                      <div key={idx}>{idx + 1}</div>
                    ))}
                  </div>
                  <pre className="flex-1 overflow-x-auto whitespace-pre font-mono text-[var(--text-main)] m-0 p-0">
                    <code>{viewCodeSubmission.code}</code>
                  </pre>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-[var(--border-line)] bg-[var(--bg-surface)] flex items-center justify-end shrink-0">
              <button
                type="button"
                onClick={() => setViewCodeSubmission(null)}
                className="px-4 py-2 rounded-xl text-xs font-mono font-bold text-white bg-[var(--color-accent)] hover:opacity-90 transition-opacity shadow-sm"
              >
                Close Viewer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Profile Settings Modal */}
      {isEditOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="profile-settings-title"
          className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm"
        >
          <div className="w-full max-w-lg glass-card rounded-2xl border border-[#252C4F] bg-[#141932] shadow-2xl flex flex-col max-h-[90vh] overflow-hidden">
            {/* Sticky Header */}
            <div className="flex items-center justify-between p-5 border-b border-[#252C4F] bg-[#141932] shrink-0">
              <h3 id="profile-settings-title" className="text-base font-bold text-[#E8EAF6]">
                Profile & Academic Settings
              </h3>
              <button
                type="button"
                onClick={() => setIsEditOpen(false)}
                aria-label="Close profile settings"
                className="p-1 text-[#9AA1C4] hover:text-[#E8EAF6] rounded-lg hover:bg-[#252C4F]/50 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Form with Scrollable Body and Sticky Footer */}
            <form onSubmit={handleSaveEdit} className="flex flex-col flex-1 overflow-hidden">
              <div className="p-5 sm:p-6 overflow-y-auto space-y-4 flex-1">
                {editError && (
                  <div
                    role="alert"
                    className="p-3 rounded-lg bg-[#FF7A8A]/10 border border-[#FF7A8A]/40 text-[#FF7A8A] text-xs font-mono"
                  >
                    {editError}
                  </div>
                )}

                {/* PRN Row with Monthly Self-Service Change Option & Locked College */}
                <div className="p-3.5 rounded-xl bg-[#0C0F1F] border border-[#252C4F] space-y-2.5 text-xs font-mono">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 text-[#9AA1C4]">
                      <KeyRound className="w-3.5 h-3.5 text-[#8B9BFF]" />
                      <span>PRN (Permanent Academic ID):</span>
                      <span className="text-[#E8EAF6] font-bold ml-1">{ownMaskedPrn || '••••••'}</span>
                    </div>

                    {isOwnProfile && (
                      <div>
                        {(() => {
                          const cooldown = getPrnChangeCooldownStatus(profile.prnChangedAt);
                          if (cooldown.isEligible) {
                            return (
                              <button
                                type="button"
                                onClick={() => {
                                  setPrnError(null);
                                  setPrnForm({ newPrn: '', confirmPrn: '', reauthConfirmed: false });
                                  setIsPrnModalOpen(true);
                                }}
                                className="px-2.5 py-1 rounded bg-[#8B9BFF]/20 hover:bg-[#8B9BFF]/30 text-[#8B9BFF] border border-[#8B9BFF]/40 text-xs font-bold transition-colors"
                              >
                                Change PRN
                              </button>
                            );
                          }
                          const dateStr = cooldown.nextAllowedDate
                            ? cooldown.nextAllowedDate.toLocaleDateString('en-IN', {
                                day: 'numeric',
                                month: 'short',
                                year: 'numeric',
                              })
                            : '30 days';
                          return (
                            <button
                              type="button"
                              disabled
                              className="px-2.5 py-1 rounded bg-[#252C4F]/40 text-[#9AA1C4] border border-[#252C4F] text-xs cursor-not-allowed"
                              title={`Cooldown active: ${cooldown.daysRemaining} days remaining`}
                            >
                              Available again on {dateStr}
                            </button>
                          );
                        })()}
                      </div>
                    )}
                  </div>

                  <div className="flex items-center justify-between text-[#9AA1C4]">
                    <span className="flex items-center gap-1.5">
                      <Lock className="w-3.5 h-3.5 text-[#8B9BFF]" />
                      <span>College (Locked)</span>
                    </span>
                    <span className="text-[#E8EAF6] font-semibold">
                      {profile.college || 'Sanjivani University'}
                    </span>
                  </div>

                  <p className="text-[11px] text-[#9AA1C4] pt-1 leading-normal border-t border-[#252C4F]/50">
                    You can change your PRN once every 30 days. College is permanently locked to Sanjivani University.
                  </p>
                </div>

                {/* Optional Public Display Name (3-20 chars) */}
                <div>
                  <label
                    htmlFor="edit-display-name"
                    className="block text-xs font-mono text-[#E8EAF6] mb-1"
                  >
                    PUBLIC DISPLAY NAME (OPTIONAL, 3–20 CHARS)
                  </label>
                  <input
                    id="edit-display-name"
                    type="text"
                    maxLength={20}
                    value={editForm.displayName}
                    onChange={(e) => setEditForm({ ...editForm, displayName: e.target.value })}
                    placeholder={`Fallback: Student ${profile.shortId || generateShortId(profile.id)}`}
                    className="w-full px-3 py-2 rounded-lg bg-[#0C0F1F] border border-[#252C4F] text-sm text-[#E8EAF6] placeholder-[#9AA1C4] focus:outline-none focus:border-[#8B9BFF]"
                  />
                  <span className="text-[11px] text-[#9AA1C4] block mt-1">
                    Shown to other students on the leaderboard instead of your PRN.
                  </span>
                </div>

                {/* Department & Year */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label
                      htmlFor="edit-department"
                      className="block text-xs font-mono text-[#E8EAF6] mb-1"
                    >
                      DEPARTMENT
                    </label>
                    <select
                      id="edit-department"
                      value={editForm.department}
                      onChange={(e) => setEditForm({ ...editForm, department: e.target.value })}
                      className="w-full px-3 py-2 rounded-lg bg-[#0C0F1F] border border-[#252C4F] text-sm text-[#E8EAF6] focus:outline-none focus:border-[#8B9BFF]"
                    >
                      {ALLOWED_DEPARTMENTS.map((dept) => (
                        <option key={dept} value={dept} className="bg-[#141932] text-[#E8EAF6]">
                          {dept}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label
                      htmlFor="edit-year"
                      className="block text-xs font-mono text-[#E8EAF6] mb-1"
                    >
                      ACADEMIC YEAR
                    </label>
                    <select
                      id="edit-year"
                      value={editForm.year}
                      onChange={(e) => setEditForm({ ...editForm, year: e.target.value })}
                      className="w-full px-3 py-2 rounded-lg bg-[#0C0F1F] border border-[#252C4F] text-sm text-[#E8EAF6] focus:outline-none focus:border-[#8B9BFF]"
                    >
                      {ALLOWED_YEARS.map((yr) => (
                        <option key={yr} value={yr} className="bg-[#141932] text-[#E8EAF6]">
                          {yr}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Division */}
                <div>
                  <label
                    htmlFor="edit-division"
                    className="block text-xs font-mono text-[#E8EAF6] mb-1"
                  >
                    DIVISION (OPTIONAL, UP TO 3 CHARS)
                  </label>
                  <input
                    id="edit-division"
                    type="text"
                    maxLength={3}
                    value={editForm.division}
                    onChange={(e) =>
                      setEditForm({ ...editForm, division: e.target.value.toUpperCase() })
                    }
                    placeholder="e.g. A, B, C1"
                    className="w-full px-3 py-2 rounded-lg bg-[#0C0F1F] border border-[#252C4F] text-sm text-[#E8EAF6] placeholder-[#9AA1C4] focus:outline-none focus:border-[#8B9BFF] font-mono uppercase"
                  />
                </div>

                {/* Bio */}
                <div>
                  <label htmlFor="edit-bio" className="block text-xs font-mono text-[#E8EAF6] mb-1">
                    BIO
                  </label>
                  <textarea
                    id="edit-bio"
                    rows={2}
                    value={editForm.bio}
                    onChange={(e) => setEditForm({ ...editForm, bio: e.target.value })}
                    placeholder="Tell fellow competitors about your C programming journey..."
                    className="w-full px-3 py-2 rounded-lg bg-[#0C0F1F] border border-[#252C4F] text-xs text-[#E8EAF6] placeholder-[#9AA1C4] focus:outline-none focus:border-[#8B9BFF] resize-none font-sans"
                  />
                </div>

                {/* Storage & Google Drive Backup Preference */}
                <div className="p-3.5 rounded-xl bg-[#0C0F1F] border border-[#252C4F] space-y-2.5 font-mono text-xs">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 text-[#E8EAF6] font-bold">
                      <Folder className="w-4 h-4 text-[#8B9BFF]" />
                      <span>STORAGE &amp; DRIVE BACKUP PREFERENCE</span>
                    </div>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#8B9BFF]/10 text-[#8B9BFF] border border-[#8B9BFF]/20">
                      OPTIONAL
                    </span>
                  </div>
                  <p className="text-[11px] text-[#9AA1C4] leading-relaxed">
                    All LogicQ features function 100% with secure cloud storage. Connecting Google Drive creates an optional backup copy of your solved code in a visible <code className="text-[#8B9BFF]">LogicQ/</code> folder in your personal Drive.
                  </p>

                  {profileWorkspaceBlockMsg && (
                    <div className="p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs flex items-start gap-2">
                      <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                      <span>{profileWorkspaceBlockMsg}</span>
                    </div>
                  )}

                  <div className="space-y-2 pt-1">
                    <label className="flex items-start gap-2.5 cursor-pointer">
                      <input
                        type="radio"
                        name="storagePreference"
                        value="FIRESTORE_FALLBACK"
                        checked={editForm.storagePreference !== 'GOOGLE_DRIVE'}
                        onChange={() => setEditForm({ ...editForm, storagePreference: 'FIRESTORE_FALLBACK' })}
                        className="mt-0.5 rounded-full border-[#252C4F] bg-[#0C0F1F] text-[#8B9BFF]"
                      />
                      <div>
                        <span className="text-xs text-[#E8EAF6] font-semibold block">
                          LogicQ Secure Cloud Vault (Default)
                        </span>
                        <span className="text-[11px] text-[#9AA1C4] block">
                          Fastest, zero-setup storage managed securely by the platform.
                        </span>
                      </div>
                    </label>

                    <label className="flex items-start gap-2.5 cursor-pointer">
                      <input
                        type="radio"
                        name="storagePreference"
                        value="GOOGLE_DRIVE"
                        checked={editForm.storagePreference === 'GOOGLE_DRIVE'}
                        onChange={async () => {
                          setProfileWorkspaceBlockMsg(null);
                          const auth = await GoogleDriveService.requestAccessToken();
                          if (auth.success) {
                            setEditForm({ ...editForm, storagePreference: 'GOOGLE_DRIVE' });
                            toast.success('Connected Google Drive!');
                          } else if (auth.error === 'COLLEGE_WORKSPACE_BLOCKED') {
                            setProfileWorkspaceBlockMsg(
                              'Your college administrator has restricted Google Drive integrations. LogicQ will continue using secure cloud storage.'
                            );
                            setEditForm({ ...editForm, storagePreference: 'FIRESTORE_FALLBACK' });
                          } else {
                            setEditForm({ ...editForm, storagePreference: 'FIRESTORE_FALLBACK' });
                          }
                        }}
                        className="mt-0.5 rounded-full border-[#252C4F] bg-[#0C0F1F] text-[#8B9BFF]"
                      />
                      <div>
                        <span className="text-xs text-[#E8EAF6] font-semibold block">
                          Google Drive Personal Workspace
                        </span>
                        <span className="text-[11px] text-[#9AA1C4] block">
                          Exports and syncs backup snapshots to your Google Drive.
                        </span>
                      </div>
                    </label>
                  </div>
                </div>

                {/* Practice Timer Display Preference */}
                <div className="p-3.5 rounded-xl bg-[#0C0F1F] border border-[#252C4F] space-y-2 font-mono text-xs">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 text-[#E8EAF6] font-bold">
                      <Clock className="w-4 h-4 text-[#8B9BFF]" />
                      <span>PRACTICE TIMER PREFERENCE</span>
                    </div>
                  </div>
                  <p className="text-[11px] text-[#9AA1C4] leading-relaxed">
                    Practice questions accumulate active time while coding. You can choose to hide the count-up display to code without distraction (time will continue to be safely logged in the background).
                  </p>
                  <label className="flex items-center gap-2.5 cursor-pointer pt-1">
                    <input
                      type="checkbox"
                      checked={editForm.hidePracticeTimer}
                      onChange={(e) => setEditForm({ ...editForm, hidePracticeTimer: e.target.checked })}
                      className="rounded border-[#252C4F] bg-[#0C0F1F] text-[#8B9BFF] focus:ring-[#8B9BFF]"
                    />
                    <span className="text-xs text-[#E8EAF6]">
                      Hide active timer count-up on practice screens
                    </span>
                  </label>
                </div>
              </div>

              {/* Sticky Footer: Always visible on 360px and with mobile keyboard */}
              <div className="p-4 border-t border-[#252C4F] bg-[#141932] flex items-center justify-between shrink-0">
                <Link
                  to="/privacy"
                  className="text-xs font-mono text-[#8B9BFF] hover:underline flex items-center gap-1"
                >
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>Privacy Policy</span>
                </Link>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setIsEditOpen(false)}
                    className="px-4 py-2 rounded-lg text-xs font-mono text-[#9AA1C4] hover:text-[#E8EAF6] hover:bg-[#252C4F]/40 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={updateMutation.isPending}
                    data-testid="save-profile-settings-btn"
                    className="px-4 py-2 rounded-lg text-xs font-mono font-bold text-[#0C0F1F] bg-[#8B9BFF] hover:bg-[#9FAOFF] disabled:opacity-50 transition-colors"
                  >
                    {updateMutation.isPending ? 'Saving...' : 'Save Settings'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Change PRN Dedicated Confirmation Modal */}
      {isPrnModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="change-prn-modal-title"
          className="fixed inset-0 z-[110] flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md"
        >
          <div className="w-full max-w-md glass-card rounded-2xl border border-[#252C4F] bg-[#141932] shadow-2xl flex flex-col max-h-[92vh] overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between p-5 border-b border-[#252C4F] bg-[#141932] shrink-0">
              <div className="flex items-center gap-2">
                <KeyRound className="w-5 h-5 text-[#8B9BFF]" />
                <h3 id="change-prn-modal-title" className="text-base font-bold text-[#E8EAF6]">
                  Change Permanent Registration Number
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsPrnModalOpen(false)}
                aria-label="Close PRN change modal"
                className="p-1 text-[#9AA1C4] hover:text-[#E8EAF6] rounded-lg hover:bg-[#252C4F]/50 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Form */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                setPrnError(null);

                const newPrnTrim = normalizePrn(prnForm.newPrn);
                const confirmPrnTrim = normalizePrn(prnForm.confirmPrn);

                if (!newPrnTrim || !confirmPrnTrim) {
                  setPrnError('Please fill in both PRN fields.');
                  return;
                }
                if (!isValidPrn(newPrnTrim)) {
                  setPrnError(PRN_ERROR_MESSAGE);
                  return;
                }
                if (newPrnTrim !== confirmPrnTrim) {
                  setPrnError('The confirmation PRN does not match the new PRN.');
                  return;
                }
                if (!prnForm.reauthConfirmed) {
                  setPrnError('Please confirm your identity by checking the re-authentication box.');
                  return;
                }

                prnMutation.mutate({
                  newPrn: newPrnTrim,
                  confirmPrn: confirmPrnTrim,
                  reauthConfirmed: prnForm.reauthConfirmed,
                });
              }}
              className="flex flex-col flex-1 overflow-hidden"
            >
              <div className="p-5 sm:p-6 overflow-y-auto space-y-4 flex-1">
                {prnError && (
                  <div
                    role="alert"
                    className="p-3 rounded-lg bg-[#FF7A8A]/10 border border-[#FF7A8A]/40 text-[#FF7A8A] text-xs font-mono flex items-start gap-2"
                  >
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                    <span>{prnError}</span>
                  </div>
                )}

                {/* Important Rolling Cooldown Warning */}
                <div className="p-3.5 rounded-xl bg-[#8B9BFF]/10 border border-[#8B9BFF]/30 text-xs font-mono space-y-1.5">
                  <div className="font-bold text-[#8B9BFF] flex items-center gap-1.5">
                    <AlertCircle className="w-4 h-4 text-[#8B9BFF]" />
                    <span>Rolling 30-Day Policy</span>
                  </div>
                  <p className="text-[#E8EAF6] leading-relaxed">
                    You can change your PRN at most <strong>once every 30 days</strong>. Points, streaks, submissions, and ranking history belong to your account and will remain completely intact.
                  </p>
                </div>

                {/* Current Masked PRN */}
                <div className="text-xs font-mono text-[#9AA1C4]">
                  Current PRN: <span className="text-[#E8EAF6] font-bold">{ownMaskedPrn || '••••••••'}</span>
                </div>

                {/* New PRN input */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label
                      htmlFor="modal-new-prn"
                      className="block text-xs font-mono text-[#E8EAF6]"
                    >
                      NEW 12-CHARACTER PRN
                    </label>
                    <span className="text-[10px] font-mono text-[#9AA1C4]">
                      {prnForm.newPrn.length}/12
                    </span>
                  </div>
                  <input
                    id="modal-new-prn"
                    type="text"
                    inputMode="text"
                    autoCapitalize="characters"
                    autoComplete="off"
                    autoCorrect="off"
                    spellCheck={false}
                    maxLength={12}
                    enterKeyHint="next"
                    value={prnForm.newPrn}
                    onChange={(e) => {
                      const val = e.target.value.toUpperCase().slice(0, 12);
                      setPrnForm({ ...prnForm, newPrn: val });
                    }}
                    onPaste={(e) => {
                      e.preventDefault();
                      const pasted = e.clipboardData.getData('text');
                      const val = pasted.trim().replace(/\s+/g, '').toUpperCase().slice(0, 12);
                      setPrnForm((prev) => ({ ...prev, newPrn: val }));
                    }}
                    onBlur={() => {
                      setPrnForm((prev) => ({
                        ...prev,
                        newPrn: prev.newPrn.trim().replace(/\s+/g, '').toUpperCase(),
                      }));
                    }}
                    placeholder="2199TESM0001"
                    className="w-full px-3 py-2 rounded-lg bg-[#0C0F1F] border border-[#252C4F] text-sm text-[#E8EAF6] placeholder-[#9AA1C4] focus:outline-none focus:border-[#8B9BFF] font-mono tracking-wider"
                    required
                  />
                  <PrnFormatGuide value={prnForm.newPrn} />
                </div>

                {/* Confirm New PRN input */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label
                      htmlFor="modal-confirm-prn"
                      className="block text-xs font-mono text-[#E8EAF6]"
                    >
                      CONFIRM NEW PRN
                    </label>
                    <span className="text-[10px] font-mono text-[#9AA1C4]">
                      {prnForm.confirmPrn.length}/12
                    </span>
                  </div>
                  <input
                    id="modal-confirm-prn"
                    type="text"
                    inputMode="text"
                    autoCapitalize="characters"
                    autoComplete="off"
                    autoCorrect="off"
                    spellCheck={false}
                    maxLength={12}
                    enterKeyHint="done"
                    value={prnForm.confirmPrn}
                    onChange={(e) => {
                      const val = e.target.value.toUpperCase().slice(0, 12);
                      setPrnForm({ ...prnForm, confirmPrn: val });
                    }}
                    onPaste={(e) => {
                      e.preventDefault();
                      const pasted = e.clipboardData.getData('text');
                      const val = pasted.trim().replace(/\s+/g, '').toUpperCase().slice(0, 12);
                      setPrnForm((prev) => ({ ...prev, confirmPrn: val }));
                    }}
                    onBlur={() => {
                      setPrnForm((prev) => ({
                        ...prev,
                        confirmPrn: prev.confirmPrn.trim().replace(/\s+/g, '').toUpperCase(),
                      }));
                    }}
                    placeholder="2199TESM0001"
                    className="w-full px-3 py-2 rounded-lg bg-[#0C0F1F] border border-[#252C4F] text-sm text-[#E8EAF6] placeholder-[#9AA1C4] focus:outline-none focus:border-[#8B9BFF] font-mono tracking-wider"
                    required
                  />
                  {prnForm.confirmPrn.length === 12 && prnForm.newPrn === prnForm.confirmPrn && (
                    <span className="text-[11px] text-[#46D9A0] flex items-center gap-1 mt-1 font-mono">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      PRN matches
                    </span>
                  )}
                </div>

                {/* Identity Re-authentication Confirmation Checkbox */}
                <div className="pt-2">
                  <label className="flex items-start gap-2.5 cursor-pointer text-xs font-mono text-[#E8EAF6] leading-relaxed">
                    <input
                      type="checkbox"
                      checked={prnForm.reauthConfirmed}
                      onChange={(e) =>
                        setPrnForm({ ...prnForm, reauthConfirmed: e.target.checked })
                      }
                      className="mt-0.5 rounded border-[#252C4F] bg-[#0C0F1F] text-[#8B9BFF] focus:ring-0 focus:ring-offset-0"
                    />
                    <span>
                      I verify that I am the authorized owner of this LogicQ account and understand my PRN will be locked for the next 30 days upon saving.
                    </span>
                  </label>
                </div>
              </div>

              {/* Sticky Footer */}
              <div className="p-4 border-t border-[#252C4F] bg-[#141932] flex items-center justify-end gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => setIsPrnModalOpen(false)}
                  className="px-4 py-2 rounded-lg text-xs font-mono text-[#9AA1C4] hover:text-[#E8EAF6] hover:bg-[#252C4F]/40 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={
                    prnMutation.isPending ||
                    prnForm.newPrn.length !== 12 ||
                    prnForm.confirmPrn.length !== 12 ||
                    prnForm.newPrn !== prnForm.confirmPrn ||
                    !prnForm.reauthConfirmed
                  }
                  data-testid="confirm-prn-change-btn"
                  className="px-4 py-2 rounded-lg text-xs font-mono font-bold text-[#0C0F1F] bg-[#8B9BFF] hover:bg-[#9FAOFF] disabled:opacity-50 transition-colors"
                >
                  {prnMutation.isPending ? 'Updating PRN...' : 'Confirm PRN Change'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
