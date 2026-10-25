import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../api/client.js';
import { useAuth } from '../context/AuthContext.js';
import { auth } from '../config/firebase.js';
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
  isRealPersonName,
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
  AlertCircle, ExternalLink,
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
  LogOut,
  ArrowRight,
  UserCheck,
} from 'lucide-react';

export const ProfilePage: React.FC = () => {
  const { identifier: paramIdentifier } = useParams<{ identifier?: string }>();
  const { user: currentUser, isAdmin, isFaculty, isChecker, logout, refreshUser } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const targetIdentifier = paramIdentifier || currentUser?.id || currentUser?.username || auth.currentUser?.uid;
  const isOwnProfile = Boolean(
    (currentUser || auth.currentUser) &&
      (!paramIdentifier ||
        paramIdentifier === currentUser?.id ||
        paramIdentifier === currentUser?.shortId ||
        paramIdentifier === currentUser?.username ||
        paramIdentifier === auth.currentUser?.uid)
  );

  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);
  const [isDriveBackingUp, setIsDriveBackingUp] = useState(false);
  const [profileWorkspaceBlockMsg, setProfileWorkspaceBlockMsg] = useState<string | null>(null);
  const [driveApiDisabled, setDriveApiDisabled] = useState<boolean>(false);
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
  const [copiedSectionCode, setCopiedSectionCode] = useState<string | null>(null);
  const [hoveredTrendDay, setHoveredTrendDay] = useState<{ date: string; rank: number | null; points: number } | null>(null);

  const handleCopySectionCode = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedSectionCode(key);
    toast.success('Join Code copied!');
    setTimeout(() => setCopiedSectionCode(null), 2000);
  };

  // Fetch Faculty / Admin Sections for Profile
  const { data: adminSections = [] } = useQuery({
    queryKey: ['profile-admin-sections'],
    enabled: Boolean(isAdmin || isFaculty),
    queryFn: async () => {
      let backendList: any[] = [];
      try {
        const res = await api.get('/sections');
        backendList = res.sections || res.data || [];
      } catch (err) {
        console.warn('Profile /sections failed:', err);
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

  // Fetch Faculty / Admin Tests for Profile
  const { data: adminTests = [] } = useQuery({
    queryKey: ['profile-admin-tests'],
    enabled: Boolean(isAdmin || isFaculty),
    queryFn: async () => {
      try {
        const res = await api.get('/assessment-tests');
        return res.data || res.tests || [];
      } catch {
        return [];
      }
    },
  });

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
        if (isOwnProfile) {
          if (auth.currentUser) {
            try {
              const fsUser = await FirestoreDataService.getUserProfile(auth.currentUser.uid);
              if (fsUser) serverUser = fsUser;
            } catch {}
          }
          if (!serverUser && currentUser) {
            serverUser = currentUser;
          }
        }
        if (!serverUser) {
          if (currentUser && isOwnProfile) {
            return { user: currentUser };
          }
          throw err;
        }
      }

      // If viewing own profile or profile matches current user, ensure stats persistence
      if (isOwnProfile) {
        try {
          const effectiveUid = auth.currentUser?.uid || currentUser?.id || '';
          let fsUser = null;
          let fsBackup = null;
          let fsPractice = null;
          let fsSubmissions: any[] = [];
          if (auth.currentUser) {
            [fsUser, fsBackup, fsPractice, fsSubmissions] = await Promise.all([
              FirestoreDataService.getUserProfile(effectiveUid).catch(() => null),
              FirestoreDataService.getStatsBackup(effectiveUid).catch(() => null),
              FirestoreDataService.getPracticeProgress(effectiveUid).catch(() => null),
              FirestoreDataService.getUserSubmissions(effectiveUid).catch(() => []),
            ]);
          }

          // Calculate solved problems from local storage fallback as well
          let localSolvedCount = 0;
          try {
            const rawPrac = localStorage.getItem('logicq_fallback_practice_progress_v1');
            if (rawPrac) {
              const parsed = JSON.parse(rawPrac);
              const matchingPrefixes = [
                currentUser?.id ? `${currentUser.id}:` : null,
                auth.currentUser?.uid ? `${auth.currentUser.uid}:` : null,
                currentUser?.username ? `${currentUser.username}:` : null,
                'anon:',
              ].filter(Boolean) as string[];

              localSolvedCount = Object.entries(parsed).filter(
                ([k, v]: [string, any]) =>
                  (matchingPrefixes.some((p) => k.startsWith(p)) || !k.includes(':')) && v?.isSolved
              ).length;
            }
          } catch {}

          // Also check localStorage fallback submissions
          let localAcceptedCount = 0;
          try {
            const rawSubs = localStorage.getItem('logicq_fallback_submissions_v1');
            if (rawSubs) {
              const parsedSubs = JSON.parse(rawSubs);
              if (Array.isArray(parsedSubs)) {
                const acceptedIds = new Set(
                  parsedSubs.filter((s: any) => s?.verdict === 'ACCEPTED').map((s: any) => s?.problemId || s?.id)
                );
                localAcceptedCount = acceptedIds.size;
              }
            }
          } catch {}

          // Check active user cache in localStorage
          let cachedPoints = 0;
          let cachedStreak = 0;
          let cachedLongest = 0;
          try {
            const activeRaw = localStorage.getItem('logicq_active_user');
            if (activeRaw) {
              const parsed = JSON.parse(activeRaw);
              cachedPoints = Number(parsed?.totalPoints || 0);
              cachedStreak = Number(parsed?.currentStreak || 0);
              cachedLongest = Number(parsed?.longestStreak || 0);
            }
          } catch {}

          const fsSolvedCount = Math.max(
            fsPractice?.completedProblems?.length || 0,
            fsBackup?.totalSolved || 0,
            fsBackup?.completedProblems?.length || 0
          );
          const acceptedSubmissionsCount = new Set(
            fsSubmissions.filter((s) => s.verdict === 'ACCEPTED').map((s) => s.problemId)
          ).size;

          let authoritativeSolved = Math.max(
            serverUser?.totalSolved || 0,
            serverUser?.practiceStats?.totalSolved || 0,
            fsSolvedCount,
            acceptedSubmissionsCount,
            localSolvedCount,
            localAcceptedCount
          );

          let authoritativePoints = Math.max(
            serverUser?.totalPoints || 0,
            currentUser?.totalPoints || 0,
            fsUser?.totalPoints || 0,
            fsBackup?.totalPoints || 0,
            cachedPoints
          );

          let authoritativeCurrentStreak = Math.max(
            serverUser?.currentStreak || 0,
            currentUser?.currentStreak || 0,
            fsUser?.currentStreak || 0,
            fsBackup?.currentStreak || 0,
            cachedStreak
          );

          let authoritativeLongestStreak = Math.max(
            serverUser?.longestStreak || 0,
            currentUser?.longestStreak || 0,
            fsUser?.longestStreak || 0,
            fsBackup?.longestStreak || 0,
            cachedLongest
          );

          // Lead maintainer & single-question baseline retention:
          // If the student previously solved their practice question or has an accepted submission,
          // ensure authoritativePoints >= 10, authoritativeSolved >= 1, authoritativeCurrentStreak >= 1.
          if (authoritativeSolved > 0 && authoritativePoints === 0) {
            authoritativePoints = authoritativeSolved * 10;
          }
          if (authoritativePoints > 0 && authoritativeSolved === 0) {
            authoritativeSolved = Math.max(1, Math.floor(authoritativePoints / 10));
          }
          if (authoritativeSolved > 0 && authoritativeCurrentStreak === 0) {
            authoritativeCurrentStreak = 1;
            authoritativeLongestStreak = Math.max(authoritativeLongestStreak, 1);
          }

          // Authoritative Rank: If student has points > 0 and serverUser has no rank, grant #1
          const authoritativeRank = serverUser?.rank || (authoritativePoints > 0 ? 1 : null);

          // Merge recent submissions from server, Firestore, and local storage fallback
          const rawLocalSubs = (() => {
            try {
              const parsed = JSON.parse(localStorage.getItem('logicq_fallback_submissions_v1') || '[]');
              return Array.isArray(parsed) ? parsed : [];
            } catch {
              return [];
            }
          })();

          const existingServerSubs = serverUser?.recentSubmissions || [];
          const combinedSubsMap = new Map<string, any>();

          for (const s of existingServerSubs) {
            if (s && s.id) combinedSubsMap.set(s.id, s);
          }
          for (const s of fsSubmissions) {
            if (s && s.id && !combinedSubsMap.has(s.id)) {
              combinedSubsMap.set(s.id, s);
            }
          }
          for (const s of rawLocalSubs) {
            if (s && s.id && !combinedSubsMap.has(s.id)) {
              combinedSubsMap.set(s.id, s);
            }
          }

          const allUserSubs = Array.from(combinedSubsMap.values());
          allUserSubs.sort((a, b) => new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime());

          const attemptsCounter: Record<string, number> = {};
          const enrichedSubs = allUserSubs.map((sub) => {
            const pKey = sub.problemId || sub.problem?.slug || sub.problem?.id || 'unknown';
            attemptsCounter[pKey] = (attemptsCounter[pKey] || 0) + 1;
            const attemptNumber = attemptsCounter[pKey];

            const solveSecs = sub.timeToSolveSeconds ?? sub.activeSeconds ?? (
              fsPractice?.completedProblems?.includes(sub.problemId)
                ? ((fsPractice as any)?.problemProgress?.[sub.problemId]?.timeToSolveSeconds ?? (fsPractice as any)?.activeSeconds ?? null)
                : null
            );

            let timeToSolveFormatted = '< 1m';
            if (solveSecs && solveSecs > 0) {
              const mins = Math.floor(solveSecs / 60);
              const secs = solveSecs % 60;
              timeToSolveFormatted = mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;
            }

            return {
              ...sub,
              attemptNumber,
              timeToSolveSeconds: solveSecs,
              timeToSolveFormatted,
            };
          });

          const displayRecentSubs = enrichedSubs.reverse();

          const authoritativeStorage =
            fsUser?.storagePreference ||
            currentUser?.storagePreference ||
            serverUser?.storagePreference ||
            (localStorage.getItem('logicq_storage_preference') as any) ||
            'FIRESTORE_FALLBACK';

          const resolvedDisplayName =
            [
              serverUser?.displayName,
              fsUser?.displayName,
              currentUser?.displayName,
              auth.currentUser?.displayName,
              serverUser?.fullName,
              fsUser?.fullName,
              currentUser?.fullName,
            ].find(isRealPersonName) || null;

          const resolvedDepartment =
            serverUser?.department ||
            currentUser?.department ||
            fsUser?.department ||
            null;

          const resolvedYear =
            serverUser?.year ||
            currentUser?.year ||
            fsUser?.year ||
            null;

          const resolvedDivision =
            serverUser?.division ||
            currentUser?.division ||
            fsUser?.division ||
            null;

          const resolvedBio =
            (serverUser?.bio && serverUser.bio.trim() !== '') ? serverUser.bio :
            (currentUser?.bio && currentUser.bio.trim() !== '') ? currentUser.bio :
            (fsUser?.bio && fsUser.bio.trim() !== '') ? fsUser.bio :
            null;

          serverUser = {
            ...(fsUser || {}),
            ...currentUser,
            ...serverUser,
            displayName: resolvedDisplayName,
            fullName: resolvedDisplayName || serverUser?.fullName || currentUser?.fullName || 'Student',
            department: resolvedDepartment,
            year: resolvedYear,
            division: resolvedDivision,
            bio: resolvedBio,
            totalPoints: authoritativePoints,
            currentStreak: authoritativeCurrentStreak,
            longestStreak: authoritativeLongestStreak,
            totalSolved: authoritativeSolved,
            rank: authoritativeRank,
            storagePreference: authoritativeStorage,
            hidePracticeTimer: serverUser?.hidePracticeTimer ?? fsUser?.hidePracticeTimer ?? Boolean(currentUser?.hidePracticeTimer),
            recentSubmissions: displayRecentSubs,
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

          // Proactively persist to Firestore drafts backup so it is permanently retained across sessions
          if (effectiveUid && authoritativePoints > 0) {
            FirestoreDataService.saveStatsBackup(effectiveUid, {
              totalPoints: authoritativePoints,
              currentStreak: authoritativeCurrentStreak,
              longestStreak: authoritativeLongestStreak,
              totalSolved: authoritativeSolved,
            }).catch(() => {});
          }

          if (isOwnProfile && currentUser && (currentUser.totalPoints < authoritativePoints || currentUser.currentStreak < authoritativeCurrentStreak)) {
            refreshUser().catch(() => {});
          }
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
    onSuccess: async (res: any) => {
      toast.success('Profile settings updated successfully!');
      setIsEditOpen(false);
      setEditError(null);
      const updatedUser = res?.data?.user;
      if (updatedUser) {
        queryClient.setQueryData(['profile', targetIdentifier], (prev: any) => {
          if (!prev) return { success: true, data: { user: updatedUser } };
          return {
            ...prev,
            data: {
              ...prev.data,
              user: {
                ...prev.data?.user,
                ...updatedUser,
              },
            },
          };
        });
      }
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
    if (profile || currentUser) {
      setEditError(null);
      setProfileWorkspaceBlockMsg(null);
      const activeStorage =
        profile?.storagePreference ||
        currentUser?.storagePreference ||
        (localStorage.getItem('logicq_storage_preference') as any) ||
        'FIRESTORE_FALLBACK';

      const resolvedCurrentDept = profile?.department || currentUser?.department;
      const validDept = resolvedCurrentDept && ALLOWED_DEPARTMENTS.includes(resolvedCurrentDept as any)
        ? resolvedCurrentDept
        : ALLOWED_DEPARTMENTS[0];

      setEditForm({
        displayName:
          profile?.displayName ||
          currentUser?.displayName ||
          profile?.fullName ||
          currentUser?.fullName ||
          auth.currentUser?.displayName ||
          '',
        department: validDept,
        year: profile?.year || currentUser?.year || ALLOWED_YEARS[0],
        division: profile?.division || currentUser?.division || '',
        bio: (profile?.bio && profile.bio.trim() !== '') ? profile.bio : (currentUser?.bio && currentUser.bio.trim() !== '') ? currentUser.bio : '',
        storagePreference: activeStorage,
        hidePracticeTimer: Boolean((profile?.hidePracticeTimer ?? currentUser?.hidePracticeTimer)),
      });
      setIsEditOpen(true);
    }
  };

  const handleConnectGoogleDrive = async () => {
    setProfileWorkspaceBlockMsg(null);
    setDriveApiDisabled(false);
    const authRes = await GoogleDriveService.requestAccessToken();
    if (authRes.success) {
      try {
        await GoogleDriveService.ensureLogicQFolder(authRes.accessToken!);
        setEditForm((prev) => ({ ...prev, storagePreference: 'GOOGLE_DRIVE' }));
        try {
          localStorage.setItem('logicq_storage_preference', 'GOOGLE_DRIVE');
        } catch {}

        const effectiveUid = auth.currentUser?.uid || currentUser?.id;
        if (effectiveUid) {
          FirestoreDataService.updateUserProfile(effectiveUid, {
            storagePreference: 'GOOGLE_DRIVE',
          }).catch(() => {});
        }

        api.put('/users/profile', { storagePreference: 'GOOGLE_DRIVE' })
          .then(() => {
            if (refreshUser) refreshUser().catch(() => {});
            queryClient.invalidateQueries({ queryKey: ['profile'] });
          })
          .catch(() => {});

        toast.success('Connected Google Drive backup!');
      } catch (testErr: any) {
        const errMsg = String(testErr?.message || '');
        if (errMsg.includes('DRIVE_API_DISABLED')) {
          setDriveApiDisabled(true);
          setProfileWorkspaceBlockMsg(
            'Google Drive API is not enabled in Google Cloud Console for project logicq-clanguage. Click the button below to enable it.'
          );
          toast.error('Google Drive API is disabled on project logicq-clanguage.');
        } else if (errMsg.includes('COLLEGE_WORKSPACE_BLOCKED') || errMsg.includes('DRIVE_FORBIDDEN')) {
          setProfileWorkspaceBlockMsg(
            'Your college administrator has restricted Google Drive integrations. LogicQ will continue using secure cloud storage.'
          );
        } else {
          setProfileWorkspaceBlockMsg(testErr?.message || 'Failed to initialize Google Drive folder.');
        }
        setEditForm((prev) => ({ ...prev, storagePreference: 'FIRESTORE_FALLBACK' }));
      }
    } else if (authRes.error === 'COLLEGE_WORKSPACE_BLOCKED') {
      setProfileWorkspaceBlockMsg(
        'Your college administrator has restricted Google Drive integrations. LogicQ will continue using secure cloud storage.'
      );
      setEditForm((prev) => ({ ...prev, storagePreference: 'FIRESTORE_FALLBACK' }));
    } else {
      setEditForm((prev) => ({ ...prev, storagePreference: 'FIRESTORE_FALLBACK' }));
    }
  };

  const handleDisconnectGoogleDrive = () => {
    setEditForm((prev) => ({ ...prev, storagePreference: 'FIRESTORE_FALLBACK' }));
    try {
      localStorage.setItem('logicq_storage_preference', 'FIRESTORE_FALLBACK');
    } catch {}
    const effectiveUid = auth.currentUser?.uid || currentUser?.id;
    if (effectiveUid) {
      FirestoreDataService.updateUserProfile(effectiveUid, {
        storagePreference: 'FIRESTORE_FALLBACK',
      }).catch(() => {});
    }
    api.put('/users/profile', { storagePreference: 'FIRESTORE_FALLBACK' })
      .then(() => {
        if (refreshUser) refreshUser().catch(() => {});
        queryClient.invalidateQueries({ queryKey: ['profile'] });
      })
      .catch(() => {});
    toast.success('Switched to LogicQ Cloud Vault');
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

    const effectiveBio = editForm.bio.trim() || null;
    const effectiveUid = auth.currentUser?.uid || currentUser?.id;
    if (effectiveUid) {
      FirestoreDataService.updateUserProfile(effectiveUid, {
        displayName: trimmedDisplay || null,
        department: editForm.department,
        year: isAdminOrFaculty ? (profile?.year || currentUser?.year || null) : editForm.year,
        division: isAdminOrFaculty ? (profile?.division || currentUser?.division || null) : (trimmedDiv || null),
        bio: effectiveBio,
        storagePreference: editForm.storagePreference as any,
      }).catch((e) => console.warn('Firestore profile update non-fatal error:', e));
    }
    try {
      localStorage.setItem('logicq_storage_preference', editForm.storagePreference);
      const activeRaw = localStorage.getItem('logicq_active_user');
      const activeObj = activeRaw ? JSON.parse(activeRaw) : {};
      const mergedActive = {
        ...activeObj,
        displayName: trimmedDisplay || activeObj.displayName || null,
        fullName: trimmedDisplay || activeObj.fullName || 'Student',
        department: editForm.department,
        year: isAdminOrFaculty ? (profile?.year || currentUser?.year || null) : editForm.year,
        division: isAdminOrFaculty ? (profile?.division || currentUser?.division || null) : (trimmedDiv || null),
        bio: effectiveBio,
        storagePreference: editForm.storagePreference,
        hidePracticeTimer: editForm.hidePracticeTimer,
      };
      localStorage.setItem('logicq_active_user', JSON.stringify(mergedActive));
    } catch {}

    updateMutation.mutate({
      displayName: trimmedDisplay || null,
      department: editForm.department,
      ...(isAdminOrFaculty ? {} : { year: editForm.year, division: trimmedDiv || null }),
      bio: effectiveBio,
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
          const msg = authResult.message || 'Google Drive access was restricted. Downloading your backup directly...';
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
      const studentName =
        currentUser?.displayName || currentUser?.fullName || currentUser?.username || 'Student';
      const backupResult = await GoogleDriveService.backupHistoryToDrive(
        authResult.accessToken!,
        exportRes.data,
        currentUser?.id || 'anonymous',
        studentName
      );

      if (!backupResult.success) {
        if (backupResult.error === 'DRIVE_API_DISABLED' || backupResult.message?.includes('Google Drive API')) {
          setDriveApiDisabled(true);
          setProfileWorkspaceBlockMsg(
            'Google Drive API is not enabled in Google Cloud Console for project logicq-clanguage. Click below to enable it in 1 click.'
          );
        }
        const msg = backupResult.message || 'Could not upload to Google Drive.';
        toast.error(msg, { id: 'profile-drive-export' });
        return;
      }

      await api.put('/users/profile', { storagePreference: 'GOOGLE_DRIVE' });
      const effectiveUid = auth.currentUser?.uid || currentUser?.id;
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
      queryClient.invalidateQueries({ queryKey: ['profile'] });
      toast.success('History backed up to Google Drive successfully!', { id: 'profile-drive-export' });
    } catch (err: any) {
      toast.error(err?.message || 'Failed to complete Google Drive backup', { id: 'profile-drive-export' });
    } finally {
      setIsDriveBackingUp(false);
    }
  };

  const handleExportData = async () => {
    try {
      const res = await api.get('/users/me/export');
      const studentName =
        currentUser?.displayName || currentUser?.fullName || currentUser?.username || 'Student';
      const safeName = studentName.replace(/[\\/:*?"<>|]/g, '').trim() || 'Student';
      const now = new Date();
      const istDate = new Intl.DateTimeFormat('en-CA', {
        timeZone: 'Asia/Kolkata',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      }).format(now);

      const blob = new Blob([JSON.stringify(res.data, null, 2)], {
        type: 'application/json',
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${safeName}_LogicQ_Backup_${istDate}.json`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success(`Personal data backup downloaded (${safeName}_LogicQ_Backup_${istDate}.json)`);
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
  const ownPrn = isOwnProfile ? profile?.prn || currentUser?.prn : null;
  const ownMaskedPrn = isOwnProfile ? profile?.maskedPrn || maskPrn(profile?.prn || currentUser?.prn) : null;
  const ownPrnDisplay = ownPrn || ownMaskedPrn;

  const resolvedDisplayName =
    [
      profile?.displayName,
      currentUser?.displayName,
      auth.currentUser?.displayName,
      profile?.fullName,
      currentUser?.fullName,
    ].find(isRealPersonName) || null;

  const headerTitle = isOwnProfile
    ? resolvedDisplayName ||
      [profile?.department || currentUser?.department, profile?.year || currentUser?.year, ownPrnDisplay].filter(Boolean).join(' • ') ||
      publicLabel
    : profile?.displayName || publicLabel;

  const solvedByDiff = profile.solvedByDifficulty || profile.difficultyBreakdown || {};

  const isAdminProfile = profile.role === 'ADMIN' || (isOwnProfile && (currentUser?.role === 'ADMIN' || isAdmin));
  const isFacultyProfile = !isAdminProfile && (profile.role === 'FACULTY' || (isOwnProfile && (currentUser?.role === 'FACULTY' || isFaculty)));
  const isAdminOrFaculty = isAdminProfile || isFacultyProfile;


  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">

      {/* DEDICATED ADMIN / FACULTY PROFILE HUB */}
      {isAdminOrFaculty ? (
        <div className="space-y-8 animate-in fade-in duration-200">
          {/* Header Banner */}
          <div className="glass-card p-6 sm:p-8 rounded-2xl border border-[var(--border-line)] bg-[var(--bg-panel)] shadow-xl relative overflow-hidden">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5">
                <div
                  className={`w-14 h-14 sm:w-16 sm:h-16 rounded-2xl flex items-center justify-center text-2xl font-extrabold shadow-md font-mono shrink-0 ${
                    isAdminProfile
                      ? 'bg-gradient-to-br from-amber-400 to-amber-600 text-[#0C0F1F]'
                      : 'bg-gradient-to-br from-indigo-500 to-purple-600 text-white'
                  }`}
                >
                  {(profile.displayName || profile.fullName || (isAdminProfile ? 'A' : 'F'))[0]?.toUpperCase() || 'A'}
                </div>

                <div className="space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <h1 className="text-xl sm:text-2xl font-extrabold text-[var(--text-main)]">
                      {profile.displayName || profile.fullName || (isAdminProfile ? 'System Administrator' : 'Faculty Instructor')}
                    </h1>
                    {isAdminProfile ? (
                      <span className="text-xs font-mono font-bold text-amber-400 bg-amber-500/15 border border-amber-500/40 px-2.5 py-0.5 rounded">
                        SYSTEM ADMINISTRATOR
                      </span>
                    ) : (
                      <span className="text-xs font-mono font-bold text-indigo-400 bg-indigo-500/15 border border-indigo-500/40 px-2.5 py-0.5 rounded">
                        FACULTY INSTRUCTOR
                      </span>
                    )}
                  </div>

                  <p className="text-xs font-mono text-[var(--text-muted)]">
                    Account Identifier: <strong className="text-[var(--text-main)]">{profile.email || currentUser?.email || `@${profile.username}`}</strong>
                  </p>

                  {/* Institutional Affiliation */}
                  <div className="flex flex-wrap items-center gap-2 pt-1 text-xs font-mono">
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[var(--bg-surface)] border border-[var(--border-line)] text-[var(--text-main)]">
                      <Building2 className="w-3.5 h-3.5 text-indigo-400" />
                      <span>{profile.college || 'Academic Institution'}</span>
                    </span>
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[var(--bg-surface)] border border-[var(--border-line)] text-[var(--text-main)]">
                      <GraduationCap className="w-3.5 h-3.5 text-emerald-400" />
                      <span>{profile.department || 'Computer Engineering'}</span>
                    </span>
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[var(--bg-surface)] border border-[var(--border-line)] text-[var(--text-muted)]">
                      <ShieldCheck className="w-3.5 h-3.5 text-amber-400" />
                      <span>Authorized Academic Staff</span>
                    </span>
                  </div>

                  {profile.bio && (
                    <p className="text-sm text-[var(--text-main)] mt-2 max-w-xl leading-relaxed font-sans">
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
                    className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-mono font-semibold text-[var(--text-main)] bg-[var(--bg-surface)] hover:bg-[var(--border-line)] border border-[var(--border-line)] transition-colors cursor-pointer"
                  >
                    <Edit3 className="w-3.5 h-3.5 text-indigo-400" />
                    <span>Profile Settings</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleExportData}
                    data-testid="export-data-btn"
                    className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-mono font-semibold text-[var(--text-main)] bg-[var(--bg-surface)] hover:bg-[var(--border-line)] border border-[var(--border-line)] transition-colors cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Export Data</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (window.confirm('Are you sure you want to log out of your session?')) {
                        logout();
                        navigate('/login');
                      }
                    }}
                    className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-mono font-semibold text-rose-400 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 transition-colors cursor-pointer"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>Log Out</span>
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Account Security & Operational Privileges */}
          <div className="space-y-3">
            <h2 className="text-xs font-mono font-bold tracking-wider uppercase text-[var(--text-muted)] flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-amber-400" />
              <span>Account Credentials & Administrative Privileges</span>
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="glass-card p-5 rounded-2xl border border-[var(--border-line)] bg-[var(--bg-panel)] space-y-1">
                <span className="text-[11px] font-mono text-[var(--text-muted)] block">AUTHENTICATION</span>
                <span className="text-sm font-bold text-[var(--text-main)] font-mono flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  Verified & Active
                </span>
                <p className="text-[11px] text-[var(--text-muted)] font-mono">Firebase OAuth & Session</p>
              </div>

              <div className="glass-card p-5 rounded-2xl border border-[var(--border-line)] bg-[var(--bg-panel)] space-y-1">
                <span className="text-[11px] font-mono text-[var(--text-muted)] block">ACCESS PRIVILEGE</span>
                <span className="text-sm font-bold text-amber-400 font-mono">
                  {isAdminProfile ? 'Super Administrator' : 'Faculty Staff'}
                </span>
                <p className="text-[11px] text-[var(--text-muted)] font-mono">Full Course & Test Authority</p>
              </div>

              <div className="glass-card p-5 rounded-2xl border border-[var(--border-line)] bg-[var(--bg-panel)] space-y-1">
                <span className="text-[11px] font-mono text-[var(--text-muted)] block">PROCTORING MONITOR</span>
                <span className="text-sm font-bold text-indigo-400 font-mono flex items-center gap-1.5">
                  <Eye className="w-4 h-4 text-indigo-400" />
                  Anti-Cheat Telemetry
                </span>
                <p className="text-[11px] text-[var(--text-muted)] font-mono">Real-time focus & copy alerts</p>
              </div>

              <div className="glass-card p-5 rounded-2xl border border-[var(--border-line)] bg-[var(--bg-panel)] space-y-1">
                <span className="text-[11px] font-mono text-[var(--text-muted)] block">ACADEMIC SESSION</span>
                <span className="text-sm font-bold text-emerald-400 font-mono">
                  AY 2026-2027
                </span>
                <p className="text-[11px] text-[var(--text-muted)] font-mono">C Programming Cohorts</p>
              </div>
            </div>
          </div>

          {/* Two Columns: My Sections & My Tests */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* My Managed Classroom Sections */}
            <div className="glass-card p-6 rounded-2xl border border-[var(--border-line)] bg-[var(--bg-panel)] space-y-4">
              <div className="flex items-center justify-between border-b border-[var(--border-line)] pb-3">
                <div className="flex items-center gap-2">
                  <GraduationCap className="w-5 h-5 text-indigo-400" />
                  <h3 className="text-base font-bold text-[var(--text-main)]">
                    My Managed Sections ({adminSections.length})
                  </h3>
                </div>
                <Link
                  to="/faculty/sections"
                  className="text-xs font-mono font-semibold text-indigo-400 hover:text-indigo-300 flex items-center gap-1"
                >
                  <span>Open Section Portal</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>

              {(!Array.isArray(adminSections) || adminSections.length === 0) ? (
                <div className="py-8 text-center space-y-2">
                  <p className="text-xs text-[var(--text-muted)]">No classroom sections managed yet.</p>
                  <Link
                    to="/faculty/sections"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white"
                  >
                    <span>Create Section</span>
                  </Link>
                </div>
              ) : (
                <div className="space-y-3">
                  {(Array.isArray(adminSections) ? adminSections : []).slice(0, 4).map((sec: any) => {
                    const studentCount = sec?._count?.students ?? sec?.students?.length ?? 0;
                    const sName = sec?.sectionName || sec?.name || 'Section';
                    const subj = sec?.subject || 'C Programming';
                    const jCode = sec?.joinCode || 'LQ-JOIN';
                    return (
                      <div
                        key={sec?.id || jCode}
                        className="flex items-center justify-between p-3.5 rounded-xl border border-[var(--border-line)] bg-[var(--bg-surface)] hover:border-indigo-500/40 transition"
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
                              {studentCount} student{studentCount === 1 ? '' : 's'} enrolled
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleCopySectionCode(jCode, `profile-sec-${sec?.id || jCode}`)}
                            className="inline-flex items-center gap-1 px-2 py-1 rounded-md font-mono text-xs font-bold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 hover:bg-indigo-500/20 transition cursor-pointer"
                            title="Copy Section Code"
                          >
                            <span>{jCode}</span>
                            {copiedSectionCode === `profile-sec-${sec?.id || jCode}` ? (
                              <Check className="w-3.5 h-3.5 text-emerald-400" />
                            ) : (
                              <Copy className="w-3.5 h-3.5" />
                            )}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* My Authored Tests & Exams */}
            <div className="glass-card p-6 rounded-2xl border border-[var(--border-line)] bg-[var(--bg-panel)] space-y-4">
              <div className="flex items-center justify-between border-b border-[var(--border-line)] pb-3">
                <div className="flex items-center gap-2">
                  <Code2 className="w-5 h-5 text-cyan-400" />
                  <h3 className="text-base font-bold text-[var(--text-main)]">
                    Authored Tests & Practicals ({Array.isArray(adminTests) ? adminTests.length : 0})
                  </h3>
                </div>
                <Link
                  to="/faculty/tests"
                  className="text-xs font-mono font-semibold text-cyan-400 hover:text-cyan-300 flex items-center gap-1"
                >
                  <span>Open Test Suite</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>

              {(!Array.isArray(adminTests) || adminTests.length === 0) ? (
                <div className="py-8 text-center space-y-2">
                  <p className="text-xs text-[var(--text-muted)]">No assessment tests created yet.</p>
                  <Link
                    to="/faculty/tests"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-cyan-600 hover:bg-cyan-500 text-white"
                  >
                    <span>Schedule First Test</span>
                  </Link>
                </div>
              ) : (
                <div className="space-y-3">
                  {(Array.isArray(adminTests) ? adminTests : []).slice(0, 4).map((test: any) => (
                    <div
                      key={test?.id || Math.random()}
                      className="flex items-center justify-between p-3.5 rounded-xl border border-[var(--border-line)] bg-[var(--bg-surface)] hover:border-cyan-500/40 transition"
                    >
                      <div>
                        <div className="font-semibold text-sm text-[var(--text-main)]">
                          {test?.title || 'Assessment Test'}
                        </div>
                        <div className="text-[11px] text-[var(--text-muted)] flex items-center gap-2 mt-0.5 font-mono">
                          <span>{test?.durationMinutes || 60} mins</span>
                          <span>•</span>
                          <span>{test?.totalQuestions || test?.questions?.length || 2} Problems</span>
                        </div>
                      </div>

                      <span
                        className={`text-[11px] font-semibold font-mono px-2 py-0.5 rounded-full ${
                          test?.status === 'PUBLISHED'
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                            : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                        }`}
                      >
                        {test?.status || 'ACTIVE'}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      ) : (
        /* STANDARD STUDENT PROFILE VIEW */
        <div className="space-y-8">

      {/* Profile Header Banner */}
      <div className="glass-card p-6 sm:p-8 rounded-2xl border border-[#252C4F] bg-[#141932] shadow-2xl relative overflow-hidden">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5">
            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-[#8B9BFF] flex items-center justify-center text-2xl sm:text-3xl font-extrabold text-[#0C0F1F] shadow-xl font-mono shrink-0">
              {((resolvedDisplayName || publicLabel || 'S')[0] || 'S').toUpperCase()}
            </div>

            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-extrabold text-[#E8EAF6]">{headerTitle}</h1>
                <span className="text-xs font-mono font-bold text-[#8B9BFF] bg-[#8B9BFF]/15 border border-[#8B9BFF]/40 px-2.5 py-0.5 rounded">
                  {profile?.rank ? `RANK #${profile.rank}` : 'NOT RANKED YET'}
                </span>
                {isOwnProfile && ownPrnDisplay && (
                  <span
                    data-testid="own-masked-prn"
                    className="text-xs font-mono font-semibold text-[#46D9A0] bg-[#46D9A0]/10 border border-[#46D9A0]/30 px-2.5 py-0.5 rounded"
                  >
                    PRN: {ownPrnDisplay}
                  </span>
                )}
              </div>

              {/* Academic Tags: College, Department, Year, Division */}
              <div className="flex flex-wrap items-center gap-2 pt-1 text-xs font-mono">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#0C0F1F] border border-[#252C4F] text-[#E8EAF6]">
                  <Building2 className="w-3.5 h-3.5 text-[#8B9BFF]" />
                  <span>{profile?.college || currentUser?.college || 'Sanjivani University'}</span>
                </span>
                {(profile?.department || currentUser?.department) && (
                  <span
                    data-testid="profile-department"
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#0C0F1F] border border-[#252C4F] text-[#E8EAF6]"
                  >
                    <GraduationCap className="w-3.5 h-3.5 text-[#46D9A0]" />
                    <span>{profile?.department || currentUser?.department}</span>
                  </span>
                )}
                {(profile?.year || currentUser?.year) && (
                  <span
                    data-testid="profile-year"
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#0C0F1F] border border-[#252C4F] text-[#E8EAF6]"
                  >
                    <Calendar className="w-3.5 h-3.5 text-[#8B9BFF]" />
                    <span>Year: {profile?.year || currentUser?.year}</span>
                  </span>
                )}
                {(profile?.division || currentUser?.division) && (
                  <span
                    data-testid="profile-division"
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#0C0F1F] border border-[#252C4F] text-[#E8EAF6]"
                  >
                    <Layers className="w-3.5 h-3.5 text-[#9AA1C4]" />
                    <span>Div: {profile?.division || currentUser?.division}</span>
                  </span>
                )}
              </div>

              {(profile?.bio || currentUser?.bio) && (
                <p className="text-sm text-[#E8EAF6] mt-2 max-w-xl leading-relaxed font-sans">
                  {profile?.bio || currentUser?.bio}
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
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-mono font-semibold text-[#E8EAF6] bg-[#0C0F1F] hover:bg-[#252C4F] border border-[#252C4F] transition-colors shadow-sm"
              >
                <Edit3 className="w-3.5 h-3.5 text-[#8B9BFF]" />
                <span>Profile Settings</span>
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
                onClick={handleExportData}
                data-testid="export-data-btn"
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-mono font-semibold text-[#E8EAF6] bg-[#0C0F1F] hover:bg-[#252C4F] border border-[#252C4F] transition-colors"
              >
                <Download className="w-3.5 h-3.5 text-[#46D9A0]" />
                <span>Export Data</span>
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
      {(() => {
        const stats = profile.practiceStats || {
          totalSolved: profile.totalSolved || 0,
          totalQuestions: 80,
          percentage: Math.min(100, Math.round(((profile.totalSolved || 0) / 80) * 100)),
          easySolved: solvedByDiff.EASY ?? solvedByDiff.easy ?? 0,
          mediumSolved: solvedByDiff.MEDIUM ?? solvedByDiff.medium ?? 0,
          hardSolved: solvedByDiff.HARD ?? solvedByDiff.hard ?? 0,
          totalActiveSeconds: 0,
          firstAttemptAcceptedCount: 0,
          modules: [
            { id: '1', order: 1, title: 'Branching & Decisions', totalQuestions: 20, solvedCount: Math.min(20, profile.totalSolved || 0), percentage: Math.min(100, Math.round((Math.min(20, profile.totalSolved || 0) / 20) * 100)), isUnlocked: true, isCompleted: (profile.totalSolved || 0) >= 20 },
            { id: '2', order: 2, title: 'Loops & Iteration', totalQuestions: 20, solvedCount: Math.max(0, Math.min(20, (profile.totalSolved || 0) - 20)), percentage: Math.min(100, Math.round((Math.max(0, Math.min(20, (profile.totalSolved || 0) - 20)) / 20) * 100)), isUnlocked: (profile.totalSolved || 0) >= 20, isCompleted: (profile.totalSolved || 0) >= 40 },
            { id: '3', order: 3, title: 'Arrays & Matrices', totalQuestions: 20, solvedCount: Math.max(0, Math.min(20, (profile.totalSolved || 0) - 40)), percentage: Math.min(100, Math.round((Math.max(0, Math.min(20, (profile.totalSolved || 0) - 40)) / 20) * 100)), isUnlocked: (profile.totalSolved || 0) >= 40, isCompleted: (profile.totalSolved || 0) >= 60 },
            { id: '4', order: 4, title: 'Pointers & Dynamic Memory', totalQuestions: 20, solvedCount: Math.max(0, Math.min(20, (profile.totalSolved || 0) - 60)), percentage: Math.min(100, Math.round((Math.max(0, Math.min(20, (profile.totalSolved || 0) - 60)) / 20) * 100)), isUnlocked: (profile.totalSolved || 0) >= 60, isCompleted: (profile.totalSolved || 0) >= 80 },
          ],
        };

        const totalQ = stats.totalQuestions || 80;
        const easyQ = Math.round(totalQ * 0.4);
        const medQ = Math.round(totalQ * 0.4);
        const hardQ = totalQ - easyQ - medQ;

        return (
          <div data-testid="profile-practice-mastery" className="glass-card p-6 rounded-2xl border border-[#252C4F] bg-[#141932] space-y-6 shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#252C4F] pb-4">
              <div>
                <div className="flex items-center gap-2">
                  <BookOpen className="w-5 h-5 text-[#8B9BFF]" />
                  <h2 className="text-base font-mono font-bold text-[#E8EAF6] tracking-wide uppercase">
                    Practice Curriculum Mastery
                  </h2>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-[#8B9BFF]/10 text-[#8B9BFF] border border-[#8B9BFF]/30 font-semibold">
                    4 Modules • {totalQ} Problems
                  </span>
                </div>
                <p className="text-xs font-mono text-[#9AA1C4] mt-1">
                  Structured C programming curriculum from Control Structures to Dynamic Memory
                </p>
              </div>
              <Link
                to="/practice"
                className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-[#8B9BFF]/10 hover:bg-[#8B9BFF]/20 text-[#8B9BFF] border border-[#8B9BFF]/30 text-xs font-mono font-semibold transition-colors self-start sm:self-auto"
              >
                <span>Go to Practice Arena</span>
                <span>→</span>
              </Link>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
              {/* Left: Donut Progress Ring */}
              <div className="md:col-span-5 flex flex-col items-center justify-center p-4 rounded-xl bg-[#0C0F1F] border border-[#252C4F]/80">
                <div className="relative w-44 h-44 flex items-center justify-center">
                  {(() => {
                    const size = 160;
                    const strokeWidth = 14;
                    const radius = (size - strokeWidth) / 2;
                    const circumference = 2 * Math.PI * radius;

                    const total = totalQ;
                    const easy = stats.easySolved || 0;
                    const medium = stats.mediumSolved || 0;
                    const hard = stats.hardSolved || 0;

                    const easyLen = total > 0 ? (easy / total) * circumference : 0;
                    const medLen = total > 0 ? (medium / total) * circumference : 0;
                    const hardLen = total > 0 ? (hard / total) * circumference : 0;

                    const easyOffset = 0;
                    const medOffset = -easyLen;
                    const hardOffset = -(easyLen + medLen);

                    return (
                      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="transform -rotate-90">
                        <circle
                          cx={size / 2}
                          cy={size / 2}
                          r={radius}
                          fill="none"
                          stroke="#1F2647"
                          strokeWidth={strokeWidth}
                        />
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

                  <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                    <span className="text-2xl font-extrabold font-mono text-[#E8EAF6] tracking-tight">
                      {stats.totalSolved}
                      <span className="text-xs text-[#9AA1C4] font-normal">/{totalQ}</span>
                    </span>
                    <span className="text-[10px] font-mono text-[#9AA1C4] uppercase tracking-wider">
                      Solved
                    </span>
                    <span className="text-[11px] font-mono font-bold text-[#8B9BFF] mt-0.5">
                      {stats.percentage}%
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2 w-full mt-4 pt-3 border-t border-[#252C4F]">
                  <div className="text-center">
                    <div className="text-[10px] font-mono font-semibold text-[#46D9A0] flex items-center justify-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#46D9A0]" />
                      Easy
                    </div>
                    <div className="text-sm font-mono font-bold text-[#E8EAF6] mt-0.5">
                      {stats.easySolved}
                      <span className="text-[10px] text-[#9AA1C4] font-normal">/{easyQ}</span>
                    </div>
                  </div>

                  <div className="text-center">
                    <div className="text-[10px] font-mono font-semibold text-[#8B9BFF] flex items-center justify-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#8B9BFF]" />
                      Med
                    </div>
                    <div className="text-sm font-mono font-bold text-[#E8EAF6] mt-0.5">
                      {stats.mediumSolved}
                      <span className="text-[10px] text-[#9AA1C4] font-normal">/{medQ}</span>
                    </div>
                  </div>

                  <div className="text-center">
                    <div className="text-[10px] font-mono font-semibold text-[#FF7A8A] flex items-center justify-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#FF7A8A]" />
                      Hard
                    </div>
                    <div className="text-sm font-mono font-bold text-[#E8EAF6] mt-0.5">
                      {stats.hardSolved}
                      <span className="text-[10px] text-[#9AA1C4] font-normal">/{hardQ}</span>
                    </div>
                  </div>
                </div>

                {(stats.totalActiveSeconds > 0 || stats.firstAttemptAcceptedCount > 0) && (
                  <div className="flex items-center justify-between w-full mt-3 px-1 text-[11px] font-mono text-[#9AA1C4] pt-2 border-t border-[#252C4F]/60">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3 text-[#8B9BFF]" />
                      {stats.totalActiveSeconds >= 3600
                        ? `${Math.floor(stats.totalActiveSeconds / 3600)}h ${Math.floor((stats.totalActiveSeconds % 3600) / 60)}m`
                        : `${Math.round(stats.totalActiveSeconds / 60)} mins`}
                    </span>
                    <span className="flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3 text-[#46D9A0]" />
                      {stats.firstAttemptAcceptedCount} first-try
                    </span>
                  </div>
                )}
              </div>

              {/* Right: 4 Module Progress Bars */}
              <div className="md:col-span-7 space-y-3">
                <div className="text-xs font-mono font-semibold text-[#9AA1C4] uppercase tracking-wider mb-1 flex items-center justify-between">
                  <span>Modules Curriculum Progress</span>
                  <span className="text-[10px] text-[#8B9BFF]">{stats.totalSolved} of {totalQ} completed</span>
                </div>

                {(stats.modules || []).map((mod: any) => {
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
        );
      })()}



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
                  <th className="pb-3">Attempt</th>
                  <th className="pb-3">Time Taken</th>
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
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold font-mono bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                        #{sub.attemptNumber || 1}
                      </span>
                    </td>
                    <td className="py-3 text-[#9AA1C4] font-mono text-[11px]">
                      <span className="inline-flex items-center gap-1">
                        <Clock className="w-3 h-3 text-slate-400" />
                        {sub.timeToSolveFormatted || (sub.timeToSolveSeconds ? (sub.timeToSolveSeconds >= 60 ? `${Math.floor(sub.timeToSolveSeconds / 60)}m ${sub.timeToSolveSeconds % 60}s` : `${sub.timeToSolveSeconds}s`) : '< 1m')}
                      </span>
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

        </div>
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
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-[#8B9BFF]/10 border border-[#8B9BFF]/20 flex items-center justify-center text-[#8B9BFF]">
                  <Edit3 className="w-4 h-4" />
                </div>
                <div>
                  <h3 id="profile-settings-title" className="text-base font-bold text-[#E8EAF6]">
                    Edit Profile & Settings
                  </h3>
                  <p className="text-[11px] text-[#9AA1C4]">Update your public name, academic info, and preferences</p>
                </div>
              </div>
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

                {!isAdminOrFaculty ? (
                  /* Compact Student Academic Identity Card */
                  <div className="p-3.5 rounded-xl bg-[#0C0F1F] border border-[#252C4F] space-y-2 text-xs font-mono">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5 text-[#9AA1C4]">
                        <KeyRound className="w-3.5 h-3.5 text-[#8B9BFF]" />
                        <span>PRN:</span>
                        <span className="text-[#E8EAF6] font-bold">{ownPrnDisplay || '••••••'}</span>
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
                                })
                              : '30 days';
                            return (
                              <span
                                className="px-2 py-0.5 rounded bg-[#252C4F]/40 text-[#9AA1C4] text-[10px]"
                                title={`Cooldown active: ${cooldown.daysRemaining} days remaining`}
                              >
                                Changeable {dateStr}
                              </span>
                            );
                          })()}
                        </div>
                      )}
                    </div>

                    <div className="flex items-center justify-between text-[#9AA1C4] pt-1.5 border-t border-[#252C4F]/40">
                      <span className="flex items-center gap-1.5">
                        <Lock className="w-3 h-3 text-[#8B9BFF]" />
                        <span>Institution:</span>
                      </span>
                      <span className="text-[#E8EAF6] font-semibold">
                        {profile.college || 'Sanjivani University'}
                      </span>
                    </div>
                  </div>
                ) : (
                  /* Admin/Faculty Authority Info */
                  <div className="p-3.5 rounded-xl bg-[#0C0F1F] border border-[#252C4F] space-y-2 text-xs font-mono">
                    <div className="flex items-center justify-between text-[#9AA1C4]">
                      <span className="flex items-center gap-1.5">
                        <ShieldCheck className="w-3.5 h-3.5 text-amber-400" />
                        <span>Account Role:</span>
                      </span>
                      <span className="text-[#E8EAF6] font-bold">
                        {isAdminProfile ? 'System Administrator' : 'Faculty Member'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-[#9AA1C4]">
                      <span className="flex items-center gap-1.5">
                        <Building2 className="w-3.5 h-3.5 text-[#8B9BFF]" />
                        <span>Institution:</span>
                      </span>
                      <span className="text-[#E8EAF6] font-semibold">
                        {profile.college || 'Sanjivani University'}
                      </span>
                    </div>
                  </div>
                )}

                {/* Public Full Name / Display Handle (3-30 chars) */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label
                      htmlFor="edit-display-name"
                      className="block text-xs font-mono font-bold text-[#E8EAF6]"
                    >
                      FULL NAME / DISPLAY HANDLE
                    </label>
                    <span className="text-[10px] font-mono text-[#9AA1C4]">
                      {editForm.displayName.length}/{DISPLAY_NAME_MAX}
                    </span>
                  </div>
                  <input
                    id="edit-display-name"
                    type="text"
                    maxLength={DISPLAY_NAME_MAX}
                    value={editForm.displayName}
                    onChange={(e) => setEditForm({ ...editForm, displayName: e.target.value })}
                    placeholder={`e.g. Pratik Balasaheb Thorat`}
                    className="w-full px-3 py-2 rounded-lg bg-[#0C0F1F] border border-[#252C4F] text-sm text-[#E8EAF6] placeholder-[#9AA1C4]/50 focus:outline-none focus:border-[#8B9BFF]"
                  />
                  <span className="text-[11px] text-[#9AA1C4] block mt-1">
                    Shown to peers on the leaderboard and discussions instead of your PRN.
                  </span>
                </div>

                {/* Department & Year (Compact Grid) */}
                <div className={isAdminOrFaculty ? "w-full" : "grid grid-cols-1 sm:grid-cols-2 gap-3"}>
                  <div>
                    <label
                      htmlFor="edit-department"
                      className="block text-xs font-mono font-bold text-[#E8EAF6] mb-1"
                    >
                      DEPARTMENT
                    </label>
                    <select
                      id="edit-department"
                      value={editForm.department}
                      onChange={(e) => setEditForm({ ...editForm, department: e.target.value })}
                      className="w-full px-3 py-2 rounded-lg bg-[#0C0F1F] border border-[#252C4F] text-xs text-[#E8EAF6] focus:outline-none focus:border-[#8B9BFF]"
                    >
                      {ALLOWED_DEPARTMENTS.map((dept) => (
                        <option key={dept} value={dept} className="bg-[#141932] text-[#E8EAF6]">
                          {dept}
                        </option>
                      ))}
                    </select>
                  </div>

                  {!isAdminOrFaculty && (
                    <div>
                      <label
                        htmlFor="edit-year"
                        className="block text-xs font-mono font-bold text-[#E8EAF6] mb-1"
                      >
                        ACADEMIC YEAR
                      </label>
                      <select
                        id="edit-year"
                        value={editForm.year}
                        onChange={(e) => setEditForm({ ...editForm, year: e.target.value })}
                        className="w-full px-3 py-2 rounded-lg bg-[#0C0F1F] border border-[#252C4F] text-xs text-[#E8EAF6] focus:outline-none focus:border-[#8B9BFF]"
                      >
                        {ALLOWED_YEARS.map((yr) => (
                          <option key={yr} value={yr} className="bg-[#141932] text-[#E8EAF6]">
                            {yr}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>

                {/* Division & Bio Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {!isAdminOrFaculty && (
                    <div className="sm:col-span-1">
                      <label
                        htmlFor="edit-division"
                        className="block text-xs font-mono font-bold text-[#E8EAF6] mb-1"
                      >
                        DIVISION
                      </label>
                      <input
                        id="edit-division"
                        type="text"
                        maxLength={3}
                        value={editForm.division}
                        onChange={(e) =>
                          setEditForm({ ...editForm, division: e.target.value.toUpperCase() })
                        }
                        placeholder="e.g. A, B"
                        className="w-full px-3 py-2 rounded-lg bg-[#0C0F1F] border border-[#252C4F] text-xs text-[#E8EAF6] placeholder-[#9AA1C4]/50 focus:outline-none focus:border-[#8B9BFF] font-mono uppercase"
                      />
                    </div>
                  )}

                  <div className={isAdminOrFaculty ? "sm:col-span-3" : "sm:col-span-2"}>
                    <label htmlFor="edit-bio" className="block text-xs font-mono font-bold text-[#E8EAF6] mb-1">
                      BIO (OPTIONAL)
                    </label>
                    <input
                      id="edit-bio"
                      type="text"
                      maxLength={120}
                      value={editForm.bio}
                      onChange={(e) => setEditForm({ ...editForm, bio: e.target.value })}
                      placeholder="Share a short line about your C programming journey..."
                      className="w-full px-3 py-2 rounded-lg bg-[#0C0F1F] border border-[#252C4F] text-xs text-[#E8EAF6] placeholder-[#9AA1C4]/50 focus:outline-none focus:border-[#8B9BFF]"
                    />
                  </div>
                </div>

                {/* Google Drive Backup Card (Clean & Streamlined) */}
                <div className="p-3.5 rounded-xl bg-[#0C0F1F] border border-[#252C4F] space-y-2.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Folder className="w-4 h-4 text-[#8B9BFF]" />
                      <span className="text-xs font-mono font-bold text-[#E8EAF6]">
                        Google Drive Code Backup
                      </span>
                    </div>
                    {editForm.storagePreference === 'GOOGLE_DRIVE' ? (
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 font-mono font-bold flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" /> Connected
                      </span>
                    ) : (
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#8B9BFF]/10 text-[#8B9BFF] border border-[#8B9BFF]/20 font-mono">
                        Optional
                      </span>
                    )}
                  </div>

                  {profileWorkspaceBlockMsg && (
                    <div className="p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs flex flex-col gap-2">
                      <div className="flex items-start gap-1.5">
                        <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                        <span className="leading-relaxed">{profileWorkspaceBlockMsg}</span>
                      </div>
                      {driveApiDisabled && (
                        <a
                          href="https://console.cloud.google.com/apis/library/drive.googleapis.com?project=logicq-clanguage"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500 text-black font-semibold text-xs hover:bg-amber-400 transition-colors w-fit shadow"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                          <span>Enable Google Drive API</span>
                        </a>
                      )}
                    </div>
                  )}

                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-1 border-t border-[#252C4F]/40 text-xs font-mono">
                    <div className="text-[11px] text-[#9AA1C4]">
                      {editForm.storagePreference === 'GOOGLE_DRIVE'
                        ? 'Syncs copies of your solved code directly to your personal Drive in "LogicQ/" folder.'
                        : 'Solved code is safely stored in LogicQ Vault. You can connect Drive anytime.'}
                    </div>
                    {editForm.storagePreference === 'GOOGLE_DRIVE' ? (
                      <button
                        type="button"
                        onClick={handleDisconnectGoogleDrive}
                        className="shrink-0 px-2.5 py-1 rounded-lg text-xs font-mono text-[#FF7A8A] border border-[#FF7A8A]/30 hover:bg-[#FF7A8A]/10 transition-colors"
                      >
                        Disconnect
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={handleConnectGoogleDrive}
                        className="shrink-0 px-3 py-1.5 rounded-lg text-xs font-mono font-bold text-[#E8EAF6] bg-[#8B9BFF]/20 border border-[#8B9BFF]/40 hover:bg-[#8B9BFF]/30 transition-colors flex items-center gap-1.5"
                      >
                        <Cloud className="w-3.5 h-3.5 text-[#8B9BFF]" />
                        <span>Connect Drive</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* Practice Timer Display Toggle */}
                <label className="flex items-center gap-2.5 cursor-pointer text-xs font-mono text-[#9AA1C4] hover:text-[#E8EAF6] pt-1">
                  <input
                    type="checkbox"
                    checked={editForm.hidePracticeTimer}
                    onChange={(e) => setEditForm({ ...editForm, hidePracticeTimer: e.target.checked })}
                    className="rounded border-[#252C4F] bg-[#0C0F1F] text-[#8B9BFF] focus:ring-[#8B9BFF]"
                  />
                  <span>Hide active timer count-up while solving practice problems</span>
                </label>

                {/* Collapsible Danger Zone for Account Deletion */}
                {isOwnProfile && (
                  <details className="group border border-[#FF7A8A]/20 bg-[#FF7A8A]/5 rounded-xl text-xs font-mono overflow-hidden">
                    <summary className="p-3 cursor-pointer text-[#FF7A8A] font-bold flex items-center justify-between hover:bg-[#FF7A8A]/10 transition-colors select-none">
                      <span className="flex items-center gap-2">
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Danger Zone (Account Deletion)</span>
                      </span>
                      <span className="text-[10px] text-[#FF7A8A]/70 group-open:rotate-180 transition-transform">▼</span>
                    </summary>
                    <div className="p-3 pt-1 border-t border-[#FF7A8A]/20 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <span className="text-[11px] text-[#9AA1C4]">
                        Permanently delete your account, wipe profile data, and release your PRN registration.
                      </span>
                      <button
                        type="button"
                        onClick={handleDeleteAccount}
                        className="shrink-0 px-3 py-1.5 rounded-lg bg-[#FF7A8A]/10 border border-[#FF7A8A]/40 text-[#FF7A8A] hover:bg-[#FF7A8A]/20 font-bold text-xs transition-colors"
                      >
                        Delete Account
                      </button>
                    </div>
                  </details>
                )}
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
