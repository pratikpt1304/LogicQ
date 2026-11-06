import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../api/client.js';
import { useAuth } from '../context/AuthContext.js';
import { auth } from '../config/firebase.js';
import { FirestoreDataService } from '../services/firestoreData.service.js';
import { RealtimeSyncService } from '../services/realtimeSync.service.js';
import {
  ALLOWED_DEPARTMENTS,
  ALLOWED_YEARS,
  normalizeDepartment,
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
  deriveDepartmentFromPrn,
} from '../config/academic.config.js';
import { toast } from 'sonner';
import { VerdictBadge } from '../components/common/Badge.js';
import { GoogleDriveService } from '../services/googleDrive.service.js';
import { PrnFormatGuide } from '../components/common/PrnFormatGuide.js';
import { PracticeReportView } from '../components/practice/PracticeReportView.js';
import { BindEmailModal } from '../components/common/BindEmailModal.js';
import { ChangePasswordModal } from '../components/common/ChangePasswordModal.js';
import { TOPIC_PRACTICE_DATA } from '../data/topic-practice.data.js';
import { PRACTICE_MODULE_1_PROBLEMS } from '../data/practice-module1.data.js';
import { PRACTICE_MODULE_2_PROBLEMS } from '../data/practice-module2.data.js';
import { PRACTICE_MODULE_3_PROBLEMS } from '../data/practice-module3.data.js';
import { PRACTICE_MODULE_4_PROBLEMS } from '../data/practice-module4.data.js';
import { getSolvedPracticeTopicIds } from './TopicPracticeHubPage.js';
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
  Mail,
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
  const [studentProfileTab, setStudentProfileTab] = useState<'all' | 'practice' | 'lab' | 'submissions'>('all');
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
  const [isBindEmailOpen, setIsBindEmailOpen] = useState(false);
  const [isChangePasswordOpen, setIsChangePasswordOpen] = useState(false);
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
      if (isOwnProfile && currentUser) {
        serverUser = currentUser;
      } else {
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

          let authoritativeCurrentStreak = 0;
          let authoritativeLongestStreak = 0;

          // Authoritative Rank: Only grant rank if student has verified points > 0
          const authoritativeRank = authoritativePoints > 0 ? (serverUser?.rank || 1) : null;

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

          const prnForDept = fsUser?.prn || currentUser?.prn || serverUser?.prn;
          const prnDept = deriveDepartmentFromPrn(prnForDept);
          const rawDept =
            (fsUser?.department && fsUser.department !== 'CSE' ? fsUser.department : null) ||
            (currentUser?.department && currentUser.department !== 'CSE' ? currentUser.department : null) ||
            prnDept ||
            fsUser?.department ||
            currentUser?.department ||
            serverUser?.department ||
            null;
          const resolvedDepartment = normalizeDepartment(rawDept) || rawDept;

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

  // Real-time synchronization for learning analytics and submissions
  useEffect(() => {
    const unsub = RealtimeSyncService.on('SUBMISSIONS', () => {
      refetch();
      queryClient.invalidateQueries({ queryKey: ['profile'] });
    });
    return () => unsub();
  }, [refetch, queryClient]);

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
      const effectiveUid = auth.currentUser?.uid || currentUser?.id;
      const cleanEmail = currentUser?.email || auth.currentUser?.email || '';
      FirestoreDataService.syncStudentProfileUpdate({
        userId: effectiveUid,
        newPrn: currentUser?.prn,
        email: cleanEmail,
        displayName: updatedUser?.displayName || editForm.displayName,
        fullName: updatedUser?.fullName || editForm.displayName,
        department: updatedUser?.department || editForm.department,
        year: updatedUser?.year || editForm.year,
        division: updatedUser?.division || editForm.division,
        bio: updatedUser?.bio || editForm.bio,
      }).catch(() => {});

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
      const newPrnClean = prnForm.newPrn.toUpperCase().trim();
      setPrnForm({ newPrn: '', confirmPrn: '', reauthConfirmed: false });

      const effectiveUid = auth.currentUser?.uid || currentUser?.id;
      const cleanEmail = currentUser?.email || auth.currentUser?.email || '';
      FirestoreDataService.syncStudentProfileUpdate({
        userId: effectiveUid,
        email: cleanEmail,
        oldPrn: currentUser?.prn,
        newPrn: newPrnClean,
        displayName: currentUser?.displayName || currentUser?.fullName,
        department: currentUser?.department,
        year: currentUser?.year,
        division: currentUser?.division,
      }).catch(() => {});

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

      const prnForDept = profile?.prn || currentUser?.prn;
      const prnDerived = deriveDepartmentFromPrn(prnForDept);
      const rawCurrentDept = (profile?.department && profile.department !== 'CSE' ? profile.department : null) ||
        (currentUser?.department && currentUser.department !== 'CSE' ? currentUser.department : null) ||
        prnDerived ||
        profile?.department ||
        currentUser?.department;
      const normalizedCurrentDept = normalizeDepartment(rawCurrentDept);
      const validDept =
        normalizedCurrentDept ||
        prnDerived ||
        (rawCurrentDept && ALLOWED_DEPARTMENTS.includes(rawCurrentDept as any)
          ? rawCurrentDept
          : (prnDerived || ALLOWED_DEPARTMENTS[1]));

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
        division: '',
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

    // Department preservation: Use normalized edit form department or preserve existing
    const prnForDept = profile?.prn || currentUser?.prn;
    const prnDerived = deriveDepartmentFromPrn(prnForDept);
    const rawExistingDept = profile?.department || currentUser?.department;
    const existingDept = normalizeDepartment(rawExistingDept) || prnDerived || rawExistingDept || null;
    const finalDept = editForm.department
      ? (normalizeDepartment(editForm.department) || editForm.department)
      : (existingDept || prnDerived || 'IT');

    // Division is completely removed from the app - always set to null
    const effectiveBio = editForm.bio.trim() || null;
    const effectiveUid = auth.currentUser?.uid || currentUser?.id;
    if (effectiveUid) {
      FirestoreDataService.updateUserProfile(effectiveUid, {
        displayName: trimmedDisplay || null,
        department: finalDept,
        year: isAdminOrFaculty ? (profile?.year || currentUser?.year || null) : editForm.year,
        division: null,
        bio: effectiveBio,
        storagePreference: editForm.storagePreference as any,
      }).catch((e) => console.warn('Firestore profile update non-fatal error:', e));

      FirestoreDataService.syncStudentProfileUpdate({
        userId: effectiveUid,
        newPrn: currentUser?.prn,
        email: profile?.email || currentUser?.email,
        displayName: trimmedDisplay || null,
        fullName: trimmedDisplay || null,
        department: finalDept,
        year: isAdminOrFaculty ? (profile?.year || currentUser?.year || null) : editForm.year,
        division: null,
        bio: effectiveBio,
        storagePreference: editForm.storagePreference as any,
        hidePracticeTimer: editForm.hidePracticeTimer,
      }).catch((e) => console.warn('Firestore syncStudentProfileUpdate non-fatal error:', e));
    }
    try {
      localStorage.setItem('logicq_storage_preference', editForm.storagePreference);
      const activeRaw = localStorage.getItem('logicq_active_user');
      const activeObj = activeRaw ? JSON.parse(activeRaw) : {};
      const mergedActive = {
        ...activeObj,
        displayName: trimmedDisplay || activeObj.displayName || null,
        fullName: trimmedDisplay || activeObj.fullName || 'Student',
        department: finalDept,
        year: isAdminOrFaculty ? (profile?.year || currentUser?.year || null) : editForm.year,
        division: null,
        bio: effectiveBio,
        storagePreference: editForm.storagePreference,
        hidePracticeTimer: editForm.hidePracticeTimer,
      };
      localStorage.setItem('logicq_active_user', JSON.stringify(mergedActive));
    } catch {}

    updateMutation.mutate({
      displayName: trimmedDisplay || null,
      department: finalDept,
      ...(isAdminOrFaculty ? {} : { year: editForm.year }),
      division: null,
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
          <Link to="/dashboard" className="text-xs text-[#8B9BFF] underline py-2.5">
            &larr; Return to Dashboard
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

  let solvedTopicIds: string[] = [];
  try {
    solvedTopicIds = getSolvedPracticeTopicIds();
  } catch {
    solvedTopicIds = [];
  }

  // Practice Modules (100 Topics total across 4 modules)
  const m1PracticeSolved = TOPIC_PRACTICE_DATA.filter((t) => t.moduleIndex === 1 && solvedTopicIds.includes(t.id)).length;
  const m2PracticeSolved = TOPIC_PRACTICE_DATA.filter((t) => t.moduleIndex === 2 && solvedTopicIds.includes(t.id)).length;
  const m3PracticeSolved = TOPIC_PRACTICE_DATA.filter((t) => t.moduleIndex === 3 && solvedTopicIds.includes(t.id)).length;
  const m4PracticeSolved = TOPIC_PRACTICE_DATA.filter((t) => t.moduleIndex === 4 && solvedTopicIds.includes(t.id)).length;
  const totalPracticeSolved = m1PracticeSolved + m2PracticeSolved + m3PracticeSolved + m4PracticeSolved;

  // Lab Internal Modules (80 Problems total across 4 modules, 20 questions each)
  const m1LabSlugs = PRACTICE_MODULE_1_PROBLEMS.map((p) => p.slug);
  const m1LabSolved = m1LabSlugs.filter((s) => solvedTopicIds.includes(s)).length;

  const m2LabSlugs = PRACTICE_MODULE_2_PROBLEMS.map((p) => p.slug);
  const m2LabSolved = m2LabSlugs.filter((s) => solvedTopicIds.includes(s)).length;

  const m3LabSlugs = PRACTICE_MODULE_3_PROBLEMS.map((p) => p.slug);
  const m3LabSolved = m3LabSlugs.filter((s) => solvedTopicIds.includes(s)).length;

  const m4LabSlugs = PRACTICE_MODULE_4_PROBLEMS.map((p) => p.slug);
  const m4LabSolved = m4LabSlugs.filter((s) => solvedTopicIds.includes(s)).length;

  const totalLabSolved = m1LabSolved + m2LabSolved + m3LabSolved + m4LabSolved;
  const labCieMarks = (totalLabSolved * 0.25).toFixed(1);

  const effectiveTotalPoints = Math.max(profile?.totalPoints || 0, isOwnProfile ? (currentUser?.totalPoints || 0) : 0);
  const effectiveSolved = Math.max(profile?.totalSolved || 0, totalPracticeSolved + totalLabSolved, solvedTopicIds.length);
  const effectiveRank = effectiveTotalPoints > 0 ? (profile?.rank ? `Rank #${profile.rank}` : 'Rank #1') : 'Unranked';

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
                      <span>{normalizeDepartment(profile.department) || profile.department || 'General'}</span>
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
        /* STANDARD STUDENT PROFILE VIEW (APPLE HIG REDESIGN) */
        <div className="space-y-6 sm:space-y-8">

          {/* ========================================================= */}
          {/* Apple ID Style Frosted Profile Banner                     */}
          {/* ========================================================= */}
          <div className="relative rounded-3xl border border-slate-200/80 dark:border-slate-800/80 bg-white/75 dark:bg-slate-900/75 backdrop-blur-2xl shadow-xl shadow-slate-900/5 p-6 sm:p-8 overflow-hidden transition-all">
            <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-bl from-emerald-500/10 via-teal-500/5 to-transparent rounded-full blur-3xl pointer-events-none" />

            <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5">
                <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-gradient-to-tr from-emerald-500 via-teal-500 to-indigo-500 text-white font-extrabold text-2xl sm:text-3xl flex items-center justify-center shadow-lg shadow-emerald-500/20 shrink-0">
                  {((resolvedDisplayName || publicLabel || 'S')[0] || 'S').toUpperCase()}
                </div>

                <div className="space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <h1 className="text-xl sm:text-2xl lg:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                      {headerTitle}
                    </h1>

                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30">
                      <Trophy className="w-3 h-3 text-amber-500" />
                      <span>{effectiveRank}</span>
                    </span>

                    {isOwnProfile && ownPrnDisplay && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
                        PRN: {ownPrnDisplay}
                      </span>
                    )}
                  </div>

                  {/* Clean Academic Tags */}
                  <div className="flex flex-wrap items-center gap-2 text-xs font-mono text-slate-600 dark:text-slate-400">
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200/60 dark:border-slate-700/60">
                      <Building2 className="w-3.5 h-3.5 text-indigo-500" />
                      <span>{profile?.college || currentUser?.college || 'LogicQ'}</span>
                    </span>

                    {(profile?.department || currentUser?.department) && (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200/60 dark:border-slate-700/60">
                        <GraduationCap className="w-3.5 h-3.5 text-emerald-500" />
                        <span>{profile?.department || currentUser?.department}</span>
                      </span>
                    )}

                    {(profile?.year || currentUser?.year) && (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200/60 dark:border-slate-700/60">
                        <Calendar className="w-3.5 h-3.5 text-cyan-500" />
                        <span>Year: {profile?.year || currentUser?.year}</span>
                      </span>
                    )}
                  </div>

                  {(profile?.bio || currentUser?.bio) && (
                    <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-2 max-w-xl leading-relaxed">
                      {profile?.bio || currentUser?.bio}
                    </p>
                  )}
                </div>
              </div>

              {/* Action Buttons (Apple Style Pills) */}
              {isOwnProfile && (
                <div className="flex flex-wrap items-center gap-2.5 shrink-0 w-full sm:w-auto">
                  <button
                    type="button"
                    onClick={handleOpenEdit}
                    className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-2xl text-xs font-semibold text-slate-900 dark:text-white bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 transition-all cursor-pointer active:scale-95 shadow-xs"
                  >
                    <Edit3 className="w-3.5 h-3.5 text-indigo-500" />
                    <span>Profile Settings</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleBackupToGoogleDrive}
                    disabled={isDriveBackingUp}
                    className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-2xl text-xs font-semibold text-slate-900 dark:text-white bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 transition-all cursor-pointer active:scale-95 disabled:opacity-50 shadow-xs"
                  >
                    {isDriveBackingUp ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Folder className="w-3.5 h-3.5 text-emerald-500" />
                    )}
                    <span>Drive Backup</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleExportData}
                    className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-2xl text-xs font-semibold text-slate-900 dark:text-white bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 transition-all cursor-pointer active:scale-95 shadow-xs"
                  >
                    <Download className="w-3.5 h-3.5 text-teal-500" />
                    <span>Export Data</span>
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* ========================================================= */}
          {/* Apple Bento 3-Pillar Progress Summary (0 Clicks Glance)    */}
          {/* ========================================================= */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Card 1: Practice Track */}
            <div className="rounded-3xl border border-slate-200/80 dark:border-slate-800/80 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl p-5 shadow-xs flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center border border-emerald-500/20">
                    <Code2 className="w-4 h-4" />
                  </div>
                  <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    Practice Arena
                  </span>
                </div>
                <span className="text-xs font-mono font-bold text-emerald-600 dark:text-emerald-400">
                  4 Modules
                </span>
              </div>

              <div className="my-4">
                <div className="flex items-baseline gap-1.5">
                  <span className="text-3xl font-extrabold text-slate-900 dark:text-white font-mono">
                    {totalPracticeSolved}
                  </span>
                  <span className="text-xs font-mono text-slate-400 font-medium">
                    / 100 Topics Solved
                  </span>
                </div>
                <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden mt-2.5">
                  <div
                    className="bg-emerald-500 h-full rounded-full transition-all duration-500"
                    style={{ width: `${Math.max(totalPracticeSolved > 0 ? 4 : 0, Math.min(100, (totalPracticeSolved / 100) * 100))}%` }}
                  />
                </div>
              </div>

              <Link
                to="/practice"
                className="inline-flex items-center justify-between w-full px-3.5 py-2 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs font-semibold font-mono transition-colors group"
              >
                <span>Enter Practice Arena</span>
                <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
              </Link>
            </div>

            {/* Card 2: Lab Internal Coursework */}
            <div className="rounded-3xl border border-slate-200/80 dark:border-slate-800/80 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl p-5 shadow-xs flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 flex items-center justify-center border border-cyan-500/20">
                    <BookOpen className="w-4 h-4" />
                  </div>
                  <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    Lab Internal CIE
                  </span>
                </div>
                <span className="text-xs font-mono font-bold text-cyan-600 dark:text-cyan-400">
                  {labCieMarks} / 20.0 M
                </span>
              </div>

              <div className="my-4">
                <div className="flex items-baseline gap-1.5">
                  <span className="text-3xl font-extrabold text-slate-900 dark:text-white font-mono">
                    {totalLabSolved}
                  </span>
                  <span className="text-xs font-mono text-slate-400 font-medium">
                    / 80 Problems Solved
                  </span>
                </div>
                <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden mt-2.5">
                  <div
                    className="bg-cyan-500 h-full rounded-full transition-all duration-500"
                    style={{ width: `${Math.max(totalLabSolved > 0 ? 4 : 0, Math.min(100, (totalLabSolved / 80) * 100))}%` }}
                  />
                </div>
              </div>

              <Link
                to="/lab-internal"
                className="inline-flex items-center justify-between w-full px-3.5 py-2 rounded-xl bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-600 dark:text-cyan-400 text-xs font-semibold font-mono transition-colors group"
              >
                <span>Enter Lab Internal</span>
                <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
              </Link>
            </div>

            {/* Card 3: Evaluated Code & Standing */}
            <div className="rounded-3xl border border-slate-200/80 dark:border-slate-800/80 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl p-5 shadow-xs flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center border border-indigo-500/20">
                    <Trophy className="w-4 h-4" />
                  </div>
                  <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    Standing & Records
                  </span>
                </div>
                <span className="text-xs font-mono font-bold text-indigo-600 dark:text-indigo-400">
                  {effectiveRank}
                </span>
              </div>

              <div className="my-4">
                <div className="flex items-baseline gap-1.5">
                  <span className="text-3xl font-extrabold text-slate-900 dark:text-white font-mono">
                    {profile.recentSubmissions?.length || 0}
                  </span>
                  <span className="text-xs font-mono text-slate-400 font-medium">
                    Evaluated Solutions
                  </span>
                </div>
                <div className="text-xs font-mono text-slate-400 mt-2 flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                  <span>Proctored Cloud Verification</span>
                </div>
              </div>

              <Link
                to="/history"
                className="inline-flex items-center justify-between w-full px-3.5 py-2 rounded-xl bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 text-xs font-semibold font-mono transition-colors group"
              >
                <span>View Full Submission Logs</span>
                <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
              </Link>
            </div>
          </div>

          {/* ========================================================= */}
          {/* Apple Segmented Filter (All Overview / Practice / Lab / History) */}
          {/* ========================================================= */}
          <div className="flex items-center gap-1.5 p-1.5 rounded-2xl bg-slate-100/90 dark:bg-slate-900/90 border border-slate-200/70 dark:border-slate-800/70 shadow-inner overflow-x-auto no-scrollbar">
            {[
              { id: 'all', label: '✨ All Overview' },
              { id: 'practice', label: `📚 Practice Arena (${totalPracticeSolved}/100)` },
              { id: 'lab', label: `🔬 Lab Internal (${totalLabSolved}/80)` },
              { id: 'submissions', label: `💻 Code History (${profile.recentSubmissions?.length || 0})` },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setStudentProfileTab(tab.id as any)}
                className={`flex-1 py-2 px-3.5 rounded-xl text-xs font-semibold transition-all cursor-pointer whitespace-nowrap select-none ${
                  studentProfileTab === tab.id
                    ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm ring-1 ring-slate-900/5 dark:ring-white/10 font-bold'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* ========================================================= */}
          {/* SECTION 1: PRACTICE ARENA (100 TOPICS • 4 MODULES)        */}
          {/* ========================================================= */}
          {(studentProfileTab === 'all' || studentProfileTab === 'practice') && (
            <div className="rounded-3xl border border-slate-200/80 dark:border-slate-800/80 bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl p-6 sm:p-7 space-y-5 shadow-xs animate-in fade-in duration-150">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <Code2 className="w-4 h-4 text-emerald-500" />
                    <span>Practice Arena Track (100 Topics)</span>
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Targeted C programming exercises with instant compiler feedback. 4 sequential modules.
                  </p>
                </div>
                <Link
                  to="/practice"
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs transition-all shadow-xs shrink-0"
                >
                  <span>Practice Arena →</span>
                </Link>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
                {[
                  { order: 1, title: 'Control Flow', desc: 'Branching decisions, loops, conditions', solved: m1PracticeSolved, total: 25 },
                  { order: 2, title: 'Pointers & Functions', desc: 'Addresses, dereferencing, pass-by-ref', solved: m2PracticeSolved, total: 25 },
                  { order: 3, title: 'Array & Applications', desc: 'Arrays, matrices, sorting & searching', solved: m3PracticeSolved, total: 25 },
                  { order: 4, title: 'Advanced Data Types', desc: 'Dynamic heap allocation, structs, unions', solved: m4PracticeSolved, total: 25 },
                ].map((m) => {
                  const pct = Math.round((m.solved / m.total) * 100);
                  const isDone = m.solved >= m.total;
                  return (
                    <Link
                      key={m.order}
                      to={`/practice?module=${m.order}`}
                      className="rounded-2xl border border-slate-200/70 dark:border-slate-800/70 bg-slate-50/60 dark:bg-slate-800/50 hover:border-emerald-500/40 hover:bg-white dark:hover:bg-slate-800 p-4 transition-all block group shadow-xs"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                          MODULE {m.order}
                        </span>
                        <span className="text-xs font-mono font-bold text-slate-700 dark:text-slate-300">
                          {m.solved}/{m.total} {isDone ? '✓' : ''}
                        </span>
                      </div>
                      <h4 className="font-bold text-sm text-slate-900 dark:text-white group-hover:text-emerald-500 transition-colors">
                        {m.title}
                      </h4>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-1">
                        {m.desc}
                      </p>
                      <div className="w-full h-1.5 rounded-full bg-slate-200 dark:bg-slate-700 mt-3 overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 rounded-full transition-all duration-300"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </Link>
                  );
                })}
              </div>
            </div>
          )}

          {/* ========================================================= */}
          {/* SECTION 2: LAB INTERNAL (80 QUESTIONS • 4 MODULES • 20 M) */}
          {/* ========================================================= */}
          {(studentProfileTab === 'all' || studentProfileTab === 'lab') && (
            <div className="rounded-3xl border border-slate-200/80 dark:border-slate-800/80 bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl p-6 sm:p-7 space-y-5 shadow-xs animate-in fade-in duration-150">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <BookOpen className="w-4 h-4 text-cyan-500" />
                    <span>Lab Internal Coursework (80 Questions • 20.0 CIE Marks)</span>
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Continuous Internal Evaluation (5.0 Marks per module, 20.0 Marks total). Proctored verification.
                  </p>
                </div>
                <Link
                  to="/lab-internal"
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-semibold text-xs transition-all shadow-xs shrink-0"
                >
                  <span>Lab Coursework →</span>
                </Link>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
                {[
                  { order: 1, title: 'Control Structures', desc: 'Branching decisions, loops, conditions', solved: m1LabSolved, total: 20 },
                  { order: 2, title: 'Pointers & Functions', desc: 'Memory pointers, pass-by-reference', solved: m2LabSolved, total: 20 },
                  { order: 3, title: 'Arrays & Strings', desc: 'Vectors, matrices, string operations', solved: m3LabSolved, total: 20 },
                  { order: 4, title: 'Dynamic Memory', desc: 'Heap allocation, structs, bounds', solved: m4LabSolved, total: 20 },
                ].map((m) => {
                  const pct = Math.round((m.solved / m.total) * 100);
                  const isDone = m.solved >= m.total;
                  return (
                    <Link
                      key={m.order}
                      to={`/lab-internal?module=${m.order}`}
                      className="rounded-2xl border border-slate-200/70 dark:border-slate-800/70 bg-slate-50/60 dark:bg-slate-800/50 hover:border-cyan-500/40 hover:bg-white dark:hover:bg-slate-800 p-4 transition-all block group shadow-xs"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-md bg-cyan-500/10 text-cyan-600 dark:text-cyan-400">
                          MOD 0{m.order}
                        </span>
                        <span className="text-xs font-mono font-bold text-slate-700 dark:text-slate-300">
                          {m.solved}/{m.total} {isDone ? '✓' : ''}
                        </span>
                      </div>
                      <h4 className="font-bold text-sm text-slate-900 dark:text-white group-hover:text-cyan-500 transition-colors">
                        {m.title}
                      </h4>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-1">
                        {m.desc}
                      </p>
                      <div className="w-full h-1.5 rounded-full bg-slate-200 dark:bg-slate-700 mt-3 overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-cyan-500 to-indigo-500 rounded-full transition-all duration-300"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </Link>
                  );
                })}
              </div>
            </div>
          )}

          {/* ========================================================= */}
          {/* SECTION 3: VERIFIED CODE SUBMISSIONS & EVALUATIONS        */}
          {/* ========================================================= */}
          {(studentProfileTab === 'all' || studentProfileTab === 'submissions') && (
            <div className="rounded-3xl border border-slate-200/80 dark:border-slate-800/80 bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl p-6 sm:p-7 space-y-4 shadow-xs animate-in fade-in duration-150">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <Trophy className="w-4 h-4 text-indigo-500" />
                    <span>Verified Code Submissions</span>
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Permanent cloud-verified records of your submitted solutions with compiler verdicts.
                  </p>
                </div>
                <Link
                  to="/history"
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 text-xs font-semibold transition-all shrink-0"
                >
                  <span>All Submissions →</span>
                </Link>
              </div>

              {(!profile.recentSubmissions || profile.recentSubmissions.length === 0) ? (
                <div className="text-center py-10 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 p-6 space-y-2">
                  <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                    No code submissions recorded yet.
                  </p>
                  <p className="text-xs text-slate-400">
                    Solve any problem in Practice Arena or Lab Internal to establish your verified record!
                  </p>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {profile.recentSubmissions.slice(0, 5).map((sub: any) => (
                    <div
                      key={sub.id}
                      className="p-3.5 sm:p-4 rounded-2xl border border-slate-200/70 dark:border-slate-800/70 bg-slate-50/50 dark:bg-slate-800/50 flex items-center justify-between gap-4 transition-colors hover:bg-white dark:hover:bg-slate-800/80"
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <h4 className="font-bold text-sm text-slate-900 dark:text-white truncate">
                            {sub.problem?.title || 'Practice Problem'}
                          </h4>
                          <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300">
                            #{sub.attemptNumber || 1}
                          </span>
                        </div>
                        <div className="text-xs text-slate-400 font-mono mt-0.5 flex items-center gap-2">
                          <span>{sub.createdAt ? new Date(sub.createdAt).toLocaleDateString() : 'Today'}</span>
                          <span>•</span>
                          <span className="text-emerald-500 font-bold">Evaluated</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 shrink-0">
                        <VerdictBadge verdict={sub.verdict} size="sm" />
                        {sub.code && (
                          <button
                            type="button"
                            onClick={() => {
                              setViewCodeSubmission(sub);
                              setHasCopiedCode(false);
                            }}
                            className="px-3 py-1.5 rounded-xl bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-200 text-xs font-semibold font-mono transition-colors cursor-pointer"
                          >
                            View Code
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
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
                  Submitted on {new Date(viewCodeSubmission.createdAt).toLocaleString()} • Verified
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
          className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-4 bg-black/50 backdrop-blur-md animate-fadeIn"
        >
          <div className="w-full max-w-lg rounded-3xl border border-slate-200/80 dark:border-slate-800/80 bg-white/95 dark:bg-slate-900/95 backdrop-blur-2xl shadow-2xl flex flex-col max-h-[88vh] overflow-hidden transition-all">
            {/* Apple Sheet Header */}
            <div className="flex items-center justify-between px-6 py-4.5 border-b border-slate-200/80 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-800/30 shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                  <Edit3 className="w-4 h-4" />
                </div>
                <div>
                  <h3 id="profile-settings-title" className="text-base font-bold text-slate-900 dark:text-white">
                    Profile &amp; Settings
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Manage academic credentials and personal preferences</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsEditOpen(false)}
                aria-label="Close profile settings"
                className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Form with Scrollable Body */}
            <form onSubmit={handleSaveEdit} className="flex flex-col flex-1 overflow-hidden">
              <div className="p-6 overflow-y-auto space-y-5 flex-1">
                {editError && (
                  <div
                    role="alert"
                    className="p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400 text-xs font-mono"
                  >
                    {editError}
                  </div>
                )}

                {/* Section 1: Academic Identity (Apple Card) */}
                {!isAdminOrFaculty ? (
                  <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800/80 bg-slate-50/70 dark:bg-slate-800/40 p-4 space-y-3 text-xs">
                    <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
                      <span className="font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                        <KeyRound className="w-3.5 h-3.5 text-indigo-500" />
                        <span>Academic PRN:</span>
                      </span>
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-slate-900 dark:text-white">
                          {ownPrnDisplay || '••••••'}
                        </span>
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
                                    className="px-2.5 py-1 rounded-lg bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20 text-[11px] font-bold transition-all cursor-pointer active:scale-95"
                                  >
                                    Change
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
                                  className="px-2 py-0.5 rounded-lg bg-slate-200/60 dark:bg-slate-700/60 text-slate-500 dark:text-slate-400 text-[10px]"
                                  title={`Cooldown active: ${cooldown.daysRemaining} days remaining`}
                                >
                                  Changeable {dateStr}
                                </span>
                              );
                            })()}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-2.5 border-t border-slate-200/60 dark:border-slate-700/50 text-slate-500 dark:text-slate-400">
                      <span className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300 font-semibold">
                        <Mail className="w-3.5 h-3.5 text-emerald-500" />
                        <span>Bound Email:</span>
                      </span>
                      <div className="flex items-center gap-2">
                        {(() => {
                          const isBoundV2Status = Boolean(
                            (currentUser as any)?.isEmailBoundV2 ||
                            (ownPrnDisplay && localStorage.getItem(`logicq_bound_v2_${ownPrnDisplay.toUpperCase()}`) === 'true') ||
                            (currentUser?.id && localStorage.getItem(`logicq_bound_v2_${currentUser.id}`) === 'true')
                          );
                          const displayEmail = isBoundV2Status ? (profile.email || currentUser?.email || '—') : 'Not Bound';

                          return (
                            <>
                              <span className="text-slate-900 dark:text-white font-mono text-[11px] truncate max-w-[170px]" title={displayEmail}>
                                {displayEmail}
                              </span>
                              {isOwnProfile && (
                                <button
                                  type="button"
                                  onClick={() => setIsBindEmailOpen(true)}
                                  className={`px-2 py-0.5 rounded-lg text-[10px] font-bold transition-all cursor-pointer active:scale-95 ${
                                    isBoundV2Status
                                      ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30'
                                      : 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30 animate-pulse'
                                  }`}
                                >
                                  {isBoundV2Status ? 'Bound ✓' : 'Bind Email'}
                                </button>
                              )}
                            </>
                          );
                        })()}
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-2.5 border-t border-slate-200/60 dark:border-slate-700/50 text-slate-500 dark:text-slate-400">
                      <span className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300 font-semibold">
                        <Building2 className="w-3.5 h-3.5 text-blue-500" />
                        <span>Institution:</span>
                      </span>
                      <span className="text-slate-900 dark:text-white font-semibold">
                        {profile.college || 'LogicQ'}
                      </span>
                    </div>

                    {isOwnProfile && (
                      <div className="flex items-center justify-between pt-2.5 border-t border-slate-200/60 dark:border-slate-700/50 text-slate-500 dark:text-slate-400">
                        <span className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300 font-semibold">
                          <Lock className="w-3.5 h-3.5 text-indigo-500" />
                          <span>Password:</span>
                        </span>
                        <button
                          type="button"
                          onClick={() => setIsChangePasswordOpen(true)}
                          className="px-2.5 py-1 rounded-lg bg-slate-200/60 dark:bg-slate-700/60 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-[11px] font-semibold transition-all cursor-pointer flex items-center gap-1 active:scale-95"
                        >
                          <Lock className="w-3 h-3" />
                          <span>Change Password</span>
                        </button>
                      </div>
                    )}
                  </div>
                ) : (
                  /* Admin/Faculty Authority Card */
                  <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800/80 bg-slate-50/70 dark:bg-slate-800/40 p-4 space-y-2.5 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-1.5 text-slate-600 dark:text-slate-400 font-medium">
                        <ShieldCheck className="w-3.5 h-3.5 text-amber-500" />
                        <span>Account Role:</span>
                      </span>
                      <span className="text-slate-900 dark:text-white font-bold">
                        {isAdminProfile ? 'System Administrator' : 'Faculty Member'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between pt-2 border-t border-slate-200/60 dark:border-slate-700/50">
                      <span className="flex items-center gap-1.5 text-slate-600 dark:text-slate-400 font-medium">
                        <Building2 className="w-3.5 h-3.5 text-blue-500" />
                        <span>Institution:</span>
                      </span>
                      <span className="text-slate-900 dark:text-white font-semibold">
                        {profile.college || 'LogicQ'}
                      </span>
                    </div>
                  </div>
                )}

                {/* Section 2: Public Profile Fields */}
                <div className="space-y-4">
                  {/* Public Full Name */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label
                        htmlFor="edit-display-name"
                        className="block text-xs font-semibold text-slate-700 dark:text-slate-300"
                      >
                        Full Name / Display Handle
                      </label>
                      <span className="text-[10px] font-mono text-slate-400">
                        {editForm.displayName.length}/{DISPLAY_NAME_MAX}
                      </span>
                    </div>
                    <input
                      id="edit-display-name"
                      type="text"
                      maxLength={DISPLAY_NAME_MAX}
                      value={editForm.displayName}
                      onChange={(e) => setEditForm({ ...editForm, displayName: e.target.value })}
                      placeholder="e.g. Pratik Balasaheb Thorat"
                      className="w-full px-3.5 py-2.5 rounded-2xl bg-slate-50/70 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700/80 text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                    />
                    <span className="text-[11px] text-slate-400 block">
                      Shown to peers on the leaderboard and campus discussions.
                    </span>
                  </div>

                  {/* Department & Academic Year Grid */}
                  <div className={isAdminOrFaculty ? "w-full" : "grid grid-cols-1 sm:grid-cols-2 gap-3"}>
                    <div className="space-y-1.5">
                      <label
                        htmlFor="edit-department"
                        className="block text-xs font-semibold text-slate-700 dark:text-slate-300"
                      >
                        Department
                      </label>
                      <select
                        id="edit-department"
                        value={editForm.department}
                        onChange={(e) => setEditForm({ ...editForm, department: e.target.value })}
                        className="w-full px-3.5 py-2.5 rounded-2xl bg-slate-50/70 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700/80 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all cursor-pointer"
                      >
                        {ALLOWED_DEPARTMENTS.map((dept) => (
                          <option key={dept} value={dept} className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">
                            {dept}
                          </option>
                        ))}
                      </select>
                    </div>

                    {!isAdminOrFaculty && (
                      <div className="space-y-1.5">
                        <label
                          htmlFor="edit-year"
                          className="block text-xs font-semibold text-slate-700 dark:text-slate-300"
                        >
                          Academic Year
                        </label>
                        <select
                          id="edit-year"
                          value={editForm.year}
                          onChange={(e) => setEditForm({ ...editForm, year: e.target.value })}
                          className="w-full px-3.5 py-2.5 rounded-2xl bg-slate-50/70 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700/80 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all cursor-pointer"
                        >
                          {ALLOWED_YEARS.map((yr) => (
                            <option key={yr} value={yr} className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">
                              {yr === 'FY' ? 'FY (First Year)' : yr === 'SY' ? 'SY (Second Year)' : 'TY (Third Year)'}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}
                  </div>

                  {/* Bio */}
                  <div className="space-y-1.5">
                    <label htmlFor="edit-bio" className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                      Bio (Optional)
                    </label>
                    <input
                      id="edit-bio"
                      type="text"
                      maxLength={120}
                      value={editForm.bio}
                      onChange={(e) => setEditForm({ ...editForm, bio: e.target.value })}
                      placeholder="Share a short line about your C programming journey..."
                      className="w-full px-3.5 py-2.5 rounded-2xl bg-slate-50/70 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700/80 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                    />
                  </div>
                </div>

                {/* Section 3: Preferences */}
                <div className="pt-3 border-t border-slate-200/60 dark:border-slate-800/60">
                  <label className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-50/70 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-700/60 cursor-pointer text-xs group">
                    <span className="font-medium text-slate-700 dark:text-slate-300">
                      Hide active timer count-up in practice problems
                    </span>
                    <input
                      type="checkbox"
                      checked={editForm.hidePracticeTimer}
                      onChange={(e) => setEditForm({ ...editForm, hidePracticeTimer: e.target.checked })}
                      className="w-4 h-4 rounded-md border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                    />
                  </label>
                </div>
              </div>

              {/* Apple Sheet Footer */}
              <div className="px-6 py-4 border-t border-slate-200/80 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-800/30 flex items-center justify-between shrink-0">
                <Link
                  to="/privacy"
                  className="text-xs font-medium text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400 flex items-center gap-1 transition-colors"
                >
                  <ShieldCheck className="w-3.5 h-3.5 text-slate-400" />
                  <span>Privacy Policy</span>
                </Link>

                <div className="flex items-center gap-2.5">
                  <button
                    type="button"
                    onClick={() => setIsEditOpen(false)}
                    className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={updateMutation.isPending}
                    data-testid="save-profile-settings-btn"
                    className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 transition-all shadow-xs active:scale-95 cursor-pointer"
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
                    You can change your PRN at most <strong>once every 30 days</strong>. Points, submissions, and ranking history belong to your account and will remain completely intact.
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

      {/* Bind Email Modal */}
      <BindEmailModal
        isOpen={isBindEmailOpen}
        onClose={() => setIsBindEmailOpen(false)}
        forcePrompt={true}
      />

      {/* Change Password with Email OTP Verification Modal */}
      <ChangePasswordModal
        isOpen={isChangePasswordOpen}
        onClose={() => setIsChangePasswordOpen(false)}
        onOpenBindEmail={() => setIsBindEmailOpen(true)}
      />
    </div>
  );
};
