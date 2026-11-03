import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../api/client.js';
import { useAuth } from '../context/AuthContext.js';
import { StreakReminderBanner } from '../components/dashboard/StreakReminderBanner.js';
import { DailyCTipPopup } from '../components/dashboard/DailyCTipPopup.js';
import { OnlineCompilerCard } from '../components/dashboard/OnlineCompilerCard.js';
import { DifficultyBadge, VerdictBadge } from '../components/common/Badge.js';
import { CountdownClock } from '../components/common/CountdownClock.js';
import { GoogleDriveService } from '../services/googleDrive.service.js';
import { FirestoreDataService } from '../services/firestoreData.service.js';
import { RealtimeSyncService } from '../services/realtimeSync.service.js';
import { auth } from '../config/firebase.js';
import { PRACTICE_CONFIG } from '../config/practice.config.js';
import { resolveGreetingName } from '../config/academic.config.js';
import { TOPIC_PRACTICE_DATA } from '../data/topic-practice.data.js';
import { PRACTICE_MODULE_1_PROBLEMS } from '../data/practice-module1.data.js';
import { PRACTICE_MODULE_2_PROBLEMS } from '../data/practice-module2.data.js';
import { PRACTICE_MODULE_3_PROBLEMS } from '../data/practice-module3.data.js';
import { PRACTICE_MODULE_4_PROBLEMS } from '../data/practice-module4.data.js';
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
  MessageSquare,
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
    queryKey: ['dashboard-stats', user?.id],
    enabled: Boolean(user),
    staleTime: 30000,
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

  // 3. Student Recent Submissions (Live 6s feed with Firestore authoritative merge)
  const studentUid = user?.id || (user as any)?.uid || auth.currentUser?.uid || '';

  const { data: studentProctorTelemetry } = useQuery({
    queryKey: ['student-proctor-telemetry-dash', studentUid],
    enabled: Boolean(studentUid && isStudent),
    queryFn: async () => {
      if (!studentUid) return null;
      return FirestoreDataService.getProctoringTelemetry(studentUid);
    },
    staleTime: 5000,
  });

  const studentQuarantinedSlugs = React.useMemo(() => {
    const set = new Set<string>();
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && (key.startsWith('logicq_quarantined_') || key === 'logicq_quarantined_modules')) {
          const val = JSON.parse(localStorage.getItem(key) || '[]');
          if (Array.isArray(val)) {
            val.forEach((s) => set.add(String(s).toLowerCase().trim()));
          }
        }
      }
    } catch {}
    return set;
  }, []);

  const isStudentCheatSub = (sub: any) => {
    if (!sub) return false;
    if (sub.isCheatAutoSubmit || sub.isCheatAttempt || sub.quarantinedAttempt || sub.tag === 'TRY_TO_CHEAT') {
      return true;
    }
    const subSlug = (sub.problem?.slug || sub.problemSlug || sub.problemId || '').toLowerCase().trim();
    const subTitle = (sub.problem?.title || sub.problemTitle || '').toLowerCase().trim();

    if (subSlug && studentQuarantinedSlugs.has(subSlug)) return true;

    if (studentProctorTelemetry?.incidents?.length) {
      return studentProctorTelemetry.incidents.some((inc: any) => {
        const incSlug = (inc.problemSlug || '').toLowerCase().trim();
        const incTitle = (inc.problemTitle || '').toLowerCase().trim();
        const slugMatch = incSlug && subSlug && (incSlug === subSlug || subSlug.includes(incSlug) || incSlug.includes(subSlug));
        const titleMatch = incTitle && subTitle && (incTitle === subTitle || subTitle.includes(incTitle) || incTitle.includes(subTitle));
        if (slugMatch || titleMatch) {
          return (
            inc.type === 'EXCEEDED_TAB_SWITCHES' ||
            inc.type === 'EXCEEDED_COPY_PASTE' ||
            inc.type === 'SECOND_CHANCE_SUBMISSION' ||
            inc.isCheatAttempt ||
            inc.tag === 'TRY_TO_CHEAT' ||
            (typeof inc.reason === 'string' && (inc.reason.includes('tab switch') || inc.reason.includes('copy-paste') || inc.reason.includes('cheat')))
          );
        }
        return false;
      });
    }
    return false;
  };

  const { data: studentSubmissions = [] } = useQuery({
    queryKey: ['student-my-submissions'],
    enabled: Boolean(user && isStudent),
    queryFn: async () => {
      let serverSubs: any[] = [];
      try {
        const res = await api.get('/submissions/my?limit=50');
        const list = res?.submissions || res?.data?.submissions || res?.data;
        if (Array.isArray(list)) serverSubs = list;
      } catch {}

      let fsSubs: any[] = [];
      if (studentUid) {
        try {
          fsSubs = await FirestoreDataService.getUserSubmissions(studentUid);
        } catch {}
      }

      const map = new Map<string, any>();
      for (const s of fsSubs) map.set(s.id, s);
      for (const s of serverSubs) {
        if (!map.has(s.id)) {
          map.set(s.id, s);
        } else {
          const ex = map.get(s.id);
          map.set(s.id, {
            ...ex,
            ...s,
            isCheatAutoSubmit: ex.isCheatAutoSubmit || s.isCheatAutoSubmit,
            isCheatAttempt: ex.isCheatAttempt || s.isCheatAttempt,
            quarantinedAttempt: ex.quarantinedAttempt || s.quarantinedAttempt,
            tag: ex.tag || s.tag,
            cheatReason: ex.cheatReason || s.cheatReason,
          });
        }
      }

      const combined = Array.from(map.values()).sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
      return combined;
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

  // Sequential Practice & Lab Lock Calculations
  const m1PracticeSolved = TOPIC_PRACTICE_DATA.filter((t) => t.moduleIndex === 1 && solvedTopicIds.includes(t.id)).length;
  const isM1PracticeComplete = m1PracticeSolved >= 25;

  const m2PracticeSolved = TOPIC_PRACTICE_DATA.filter((t) => t.moduleIndex === 2 && solvedTopicIds.includes(t.id)).length;
  const isM2PracticeComplete = m2PracticeSolved >= 25;

  const m3PracticeSolved = TOPIC_PRACTICE_DATA.filter((t) => t.moduleIndex === 3 && solvedTopicIds.includes(t.id)).length;
  const isM3PracticeComplete = m3PracticeSolved >= 25;

  const m4PracticeSolved = TOPIC_PRACTICE_DATA.filter((t) => t.moduleIndex === 4 && solvedTopicIds.includes(t.id)).length;
  const isM4PracticeComplete = m4PracticeSolved >= 25;

  const m1LabSlugs = PRACTICE_MODULE_1_PROBLEMS.map((p) => p.slug);
  const m1LabSolved = m1LabSlugs.filter((s) => solvedTopicIds.includes(s)).length;
  const isLab1Complete = Boolean(
    m1LabSolved >= 20 ||
    m1LabSolved >= m1LabSlugs.length ||
    (typeof localStorage !== 'undefined' && localStorage.getItem('logicq_practice_report_control-structures'))
  );

  const m2LabSlugs = PRACTICE_MODULE_2_PROBLEMS.map((p) => p.slug);
  const m2LabSolved = m2LabSlugs.filter((s) => solvedTopicIds.includes(s)).length;
  const isLab2Complete = Boolean(
    m2LabSolved >= 20 ||
    m2LabSolved >= m2LabSlugs.length ||
    (typeof localStorage !== 'undefined' && localStorage.getItem('logicq_practice_report_pointers-and-functions'))
  );

  const m3LabSlugs = PRACTICE_MODULE_3_PROBLEMS.map((p) => p.slug);
  const m3LabSolved = m3LabSlugs.filter((s) => solvedTopicIds.includes(s)).length;
  const isLab3Complete = Boolean(
    m3LabSolved >= 20 ||
    m3LabSolved >= m3LabSlugs.length ||
    (typeof localStorage !== 'undefined' && localStorage.getItem('logicq_practice_report_arrays-and-strings'))
  );

  const m4LabSlugs = PRACTICE_MODULE_4_PROBLEMS.map((p) => p.slug);
  const m4LabSolved = m4LabSlugs.filter((s) => solvedTopicIds.includes(s)).length;
  const isLab4Complete = Boolean(
    m4LabSolved >= 20 ||
    m4LabSolved >= m4LabSlugs.length ||
    (typeof localStorage !== 'undefined' && localStorage.getItem('logicq_practice_report_recursion-and-bit-manipulation'))
  );

  const getModuleUnlockInfo = (moduleIndex: number): { isUnlocked: boolean; lockReason: string } => {
    if (isAdmin || isFaculty) return { isUnlocked: true, lockReason: '' };
    if (moduleIndex === 1) return { isUnlocked: true, lockReason: '' };

    if (moduleIndex === 2) {
      if (!isM1PracticeComplete) {
        return {
          isUnlocked: false,
          lockReason: `Complete all 25 practice questions in Module 1 (${m1PracticeSolved}/25 solved) to unlock Lab Internal 1 first.`,
        };
      }
      if (!isLab1Complete) {
        return {
          isUnlocked: false,
          lockReason: 'Complete Lab Internal 1 Continuous Evaluation to unlock Module 2 Practice.',
        };
      }
      return { isUnlocked: true, lockReason: '' };
    }

    if (moduleIndex === 3) {
      if (!getModuleUnlockInfo(2).isUnlocked || !isM2PracticeComplete) {
        return {
          isUnlocked: false,
          lockReason: `Complete all 25 practice questions in Module 2 (${m2PracticeSolved}/25 solved) and Lab Internal 2 first.`,
        };
      }
      if (!isLab2Complete) {
        return {
          isUnlocked: false,
          lockReason: 'Complete Lab Internal 2 Continuous Evaluation to unlock Module 3 Practice.',
        };
      }
      return { isUnlocked: true, lockReason: '' };
    }

    if (moduleIndex === 4) {
      if (!getModuleUnlockInfo(3).isUnlocked || !isM3PracticeComplete) {
        return {
          isUnlocked: false,
          lockReason: `Complete all 25 practice questions in Module 3 (${m3PracticeSolved}/25 solved) and Lab Internal 3 first.`,
        };
      }
      if (!isLab3Complete) {
        return {
          isUnlocked: false,
          lockReason: 'Complete Lab Internal 3 Continuous Evaluation to unlock Module 4 Practice.',
        };
      }
      return { isUnlocked: true, lockReason: '' };
    }

    return { isUnlocked: true, lockReason: '' };
  };

  const practiceModulesList = [
    {
      id: 1,
      order: 1,
      title: 'Control Structures',
      description: 'Branching decisions, loops, switch-case, and iteration flow in C.',
      totalQuestions: TOPIC_PRACTICE_DATA.filter((t) => t.moduleIndex === 1).length || 25,
      solvedCount: TOPIC_PRACTICE_DATA.filter((t) => t.moduleIndex === 1 && solvedTopicIds.includes(t.id)).length,
      progressPercent: 0,
      ...getModuleUnlockInfo(1),
    },
    {
      id: 2,
      order: 2,
      title: 'Pointers and Functions',
      description: 'Memory addresses, dereferencing, pass-by-reference, recursion, and function pointers.',
      totalQuestions: TOPIC_PRACTICE_DATA.filter((t) => t.moduleIndex === 2).length || 25,
      solvedCount: TOPIC_PRACTICE_DATA.filter((t) => t.moduleIndex === 2 && solvedTopicIds.includes(t.id)).length,
      progressPercent: 0,
      ...getModuleUnlockInfo(2),
    },
    {
      id: 3,
      order: 3,
      title: 'Array and its Applications',
      description: 'Single and multi-dimensional arrays, searching, sorting, rotations, and matrices.',
      totalQuestions: TOPIC_PRACTICE_DATA.filter((t) => t.moduleIndex === 3).length || 25,
      solvedCount: TOPIC_PRACTICE_DATA.filter((t) => t.moduleIndex === 3 && solvedTopicIds.includes(t.id)).length,
      progressPercent: 0,
      ...getModuleUnlockInfo(3),
    },
    {
      id: 4,
      order: 4,
      title: 'Advanced Data Types, Dynamic Memory',
      description: 'Structures, unions, enums, dynamic heap allocation (malloc/calloc/realloc), and linked nodes.',
      totalQuestions: TOPIC_PRACTICE_DATA.filter((t) => t.moduleIndex === 4).length || 25,
      solvedCount: TOPIC_PRACTICE_DATA.filter((t) => t.moduleIndex === 4 && solvedTopicIds.includes(t.id)).length,
      progressPercent: 0,
      ...getModuleUnlockInfo(4),
    },
  ].map((m) => ({
    ...m,
    progressPercent: m.totalQuestions > 0 ? Math.round((m.solvedCount / m.totalQuestions) * 100) : 0,
  }));

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


  // Topic Practice distinct metrics (111 Curated Topics)
  const practiceTopicsTotal = TOPIC_PRACTICE_DATA.length || 111;
  const practiceEasyTotal = TOPIC_PRACTICE_DATA.filter((t) => t.problem?.difficulty === 'EASY').length || 56;
  const practiceMedTotal = TOPIC_PRACTICE_DATA.filter((t) => t.problem?.difficulty === 'MEDIUM').length || 37;
  const practiceHardTotal = TOPIC_PRACTICE_DATA.filter((t) => t.problem?.difficulty === 'HARD').length || 18;

  const practiceEasySolved = TOPIC_PRACTICE_DATA.filter((t) => t.problem?.difficulty === 'EASY' && solvedTopicIds.includes(t.id)).length;
  const practiceMedSolved = TOPIC_PRACTICE_DATA.filter((t) => t.problem?.difficulty === 'MEDIUM' && solvedTopicIds.includes(t.id)).length;
  const practiceHardSolved = TOPIC_PRACTICE_DATA.filter((t) => t.problem?.difficulty === 'HARD' && solvedTopicIds.includes(t.id)).length;
  const practiceTotalSolved = practiceEasySolved + practiceMedSolved + practiceHardSolved;
  const practiceOverallPercent = practiceTopicsTotal > 0 ? Math.round((practiceTotalSolved / practiceTopicsTotal) * 100) : 0;

  // Lab Internal distinct metrics (100 Evaluation Problems across 5 Modules)
  const labTotal = 100;
  const labTotalSolved = studentModulesList.reduce((acc: number, m: any) => acc + (m.solvedCount || 0), 0);
  const labOverallPercent = Math.min(100, Math.round((labTotalSolved / labTotal) * 100));
  const labEasySolved = Math.min(40, Math.round(labTotalSolved * 0.4));
  const labMedSolved = Math.min(40, Math.round(labTotalSolved * 0.4));
  const labHardSolved = Math.max(0, labTotalSolved - labEasySolved - labMedSolved);

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

  const getDynamicTimeGreeting = () => {
    try {
      const istHour = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Kolkata' })).getHours();
      if (istHour < 12) return { text: 'Good Morning', icon: '🌅' };
      if (istHour < 17) return { text: 'Good Afternoon', icon: '☀️' };
      return { text: 'Good Evening', icon: '🌆' };
    } catch {
      const h = new Date().getHours();
      if (h < 12) return { text: 'Good Morning', icon: '🌅' };
      if (h < 17) return { text: 'Good Afternoon', icon: '☀️' };
      return { text: 'Good Evening', icon: '🌆' };
    }
  };

  const greeting = getDynamicTimeGreeting();
  const totalCurriculumProblems = 100;
  const overallMasteryPercent = Math.min(100, Math.round((totalProblemsSolved / totalCurriculumProblems) * 100));
  const activeResumeModule = studentModulesList.find((m) => (m.progressPercent || 0) < 100) || studentModulesList[0];

  // Set of dates (YYYY-MM-DD) where this student actually submitted code
  const studentSubmissionDates = React.useMemo(() => {
    const dates = new Set<string>();

    if (Array.isArray(studentSubmissionsList)) {
      studentSubmissionsList.forEach((s: any) => {
        const rawDate = s.createdAt || s.submittedAt || s.timestamp;
        if (rawDate) {
          if (typeof rawDate === 'string') {
            dates.add(rawDate.split('T')[0]);
          } else if (rawDate.toDate && typeof rawDate.toDate === 'function') {
            dates.add(rawDate.toDate().toISOString().split('T')[0]);
          } else if (rawDate.seconds) {
            dates.add(new Date(rawDate.seconds * 1000).toISOString().split('T')[0]);
          } else {
            try {
              dates.add(new Date(rawDate).toISOString().split('T')[0]);
            } catch {}
          }
        }
      });
    }

    if (isDailySolved) {
      const todayStr = new Date().toISOString().split('T')[0];
      dates.add(todayStr);
    }

    return dates;
  }, [studentSubmissionsList, isDailySolved]);

  // Calculate real consecutive daily streak strictly based on actual submissions
  const computedStreak = React.useMemo(() => {
    if (studentSubmissionDates.size === 0) return 0;

    const todayStr = new Date().toISOString().split('T')[0];
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];

    const hasSubmittedToday = studentSubmissionDates.has(todayStr);
    const hasSubmittedYesterday = studentSubmissionDates.has(yesterdayStr);

    // If student submitted neither today nor yesterday, streak is 0
    if (!hasSubmittedToday && !hasSubmittedYesterday) {
      return 0;
    }

    let streak = 0;
    let checkDate = new Date();
    if (!hasSubmittedToday) {
      checkDate.setDate(checkDate.getDate() - 1);
    }

    while (true) {
      const dStr = checkDate.toISOString().split('T')[0];
      if (studentSubmissionDates.has(dStr)) {
        streak++;
        checkDate.setDate(checkDate.getDate() - 1);
      } else {
        break;
      }
    }

    return streak;
  }, [studentSubmissionDates]);

  const getPast7Days = () => {
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const today = new Date();
    const result = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(today.getDate() - i);
      const dayName = days[d.getDay()];
      const dateNum = d.getDate();
      const dateStr = d.toISOString().split('T')[0];
      const isToday = i === 0;

      // Only active/counted if the student actually submitted on that specific day!
      const isActive = studentSubmissionDates.has(dateStr);
      result.push({ dayName, dateNum, dateStr, isToday, isActive });
    }
    return result;
  };

  const past7Days = getPast7Days();

  const formatCountdown = (totalSec?: number) => {
    if (!totalSec || totalSec <= 0) return '00:00:00';
    const hrs = Math.floor(totalSec / 3600);
    const mins = Math.floor((totalSec % 3600) / 60);
    const secs = totalSec % 60;
    return `${String(hrs).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
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
      {/* Daily C Tip Popup - shown once per day on load */}
      {isStudent && <DailyCTipPopup />}
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
        /* ULTRA-MODERN DYNAMIC STUDENT DASHBOARD: BENTO GRID & REALTIME TELEMETRY   */
        /* ========================================================================= */
        <div className="space-y-6 sm:space-y-8 animate-in fade-in duration-300">
          {/* 1. DYNAMIC TIME-OF-DAY HERO & IDENTITY BANNER */}
          <div className="relative overflow-hidden rounded-3xl border border-[var(--border-line)] bg-gradient-to-br from-indigo-50/70 via-[var(--bg-panel)] to-cyan-50/50 dark:from-[#0d1527] dark:via-[var(--bg-panel)] dark:to-[#08101e] p-6 sm:p-8 shadow-xl">
            {/* Ambient Background Glows */}
            <div className="absolute -top-24 -left-24 w-72 h-72 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute -bottom-24 -right-24 w-72 h-72 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

            <div className="relative z-10 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
              <div className="flex items-start sm:items-center gap-4 sm:gap-5">
                {/* Modern Avatar with Live Ring */}
                <div className="relative shrink-0">
                  <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-cyan-500 p-[2px] shadow-lg shadow-indigo-500/25">
                    <div className="w-full h-full bg-gradient-to-tr from-indigo-600 to-cyan-600 rounded-2xl flex items-center justify-center text-xl sm:text-2xl font-black font-mono text-white">
                      {(user?.fullName || user?.displayName || 'S').charAt(0).toUpperCase()}
                    </div>
                  </div>
                  <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-emerald-500 border-2 border-[var(--bg-panel)] flex items-center justify-center shadow-sm" title="Online & Active">
                    <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase tracking-wider bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 border border-indigo-500/30 flex items-center gap-1">
                      <span>{greeting.icon}</span>
                      <span>{greeting.text}</span>
                    </span>
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border border-cyan-500/20">
                      {user?.prn || 'STUDENT'}
                    </span>
                    <span className="text-xs font-mono text-[var(--text-muted)] hidden sm:inline-flex items-center gap-1">
                      <GraduationCap className="w-3.5 h-3.5 text-indigo-500 dark:text-indigo-400" />
                      <span>{user?.college || 'Sanjivani University'}</span>
                    </span>
                  </div>

                  <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-[var(--text-main)] tracking-tight font-sans">
                    {resolveGreetingName(user, auth.currentUser?.displayName)}
                  </h1>

                  <div className="flex flex-wrap items-center gap-2 text-xs font-mono text-[var(--text-muted)]">
                    <span>Enrolled Section:</span>
                    <span className="font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-md border border-emerald-500/20">
                      {sectionDisplayName}
                    </span>
                    <span>•</span>
                    <span>C11 GCC 14 Sandbox</span>
                  </div>
                </div>
              </div>

              {/* Action Buttons & Quick Resume Practice */}
              <div className="flex flex-wrap items-center gap-2.5 w-full lg:w-auto">
                <Link
                  to={activeResumeModule ? `/lab-internal/${activeResumeModule.slug}` : '/practice'}
                  className="flex-1 sm:flex-none px-4 py-2.5 rounded-xl font-mono text-xs font-bold bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white shadow-lg shadow-emerald-600/25 flex items-center justify-center gap-2 transition-all transform hover:scale-[1.02] active:scale-[0.98]"
                >
                  <Play className="w-3.5 h-3.5 fill-current" />
                  <span>Resume Practice</span>
                </Link>
                <Link
                  to="/student/tests"
                  className="flex-1 sm:flex-none px-4 py-2.5 rounded-xl font-mono text-xs font-bold bg-[var(--bg-surface)] hover:bg-[var(--bg-surface-hover)] text-[var(--text-main)] border border-[var(--border-line)] flex items-center justify-center gap-2 transition-all"
                >
                  <FileText className="w-3.5 h-3.5 text-indigo-500 dark:text-indigo-400" />
                  <span>Assigned Tests ({studentAssignedList.length})</span>
                </Link>
              </div>
            </div>
          </div>

          {/* 2. TOP BENTO ROW: 2 DISTINCT MASTERY GRAPHS (PRACTICE & LAB INTERNAL) + 7-DAY CONSISTENCY MATRIX */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-5">
            {/* GRAPH 1: TOPIC PRACTICE MASTERY (4 Cols) */}
            <div className="lg:col-span-4 rounded-3xl border border-[var(--border-line)] bg-[var(--bg-panel)] p-6 flex flex-col justify-between shadow-md relative overflow-hidden group hover:border-emerald-500/40 transition-all">
              <div className="flex items-center justify-between border-b border-[var(--border-line)] pb-4">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-500 dark:text-emerald-400 border border-emerald-500/20">
                    <Code2 className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="font-bold text-sm text-[var(--text-main)]">Practice Mastery</h3>
                    <p className="text-[11px] font-mono text-[var(--text-muted)]">111 Topic Questions</p>
                  </div>
                </div>
                <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                  {practiceOverallPercent}% Done
                </span>
              </div>

              {/* Circular Radial SVG + Stats Breakdown */}
              <div className="py-5 flex items-center justify-around gap-3">
                {/* SVG Progress Circle */}
                <div className="relative w-24 h-24 shrink-0 flex items-center justify-center">
                  <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                    <circle
                      cx="50"
                      cy="50"
                      r="40"
                      className="stroke-[var(--border-line)] opacity-60"
                      strokeWidth="9"
                      fill="transparent"
                    />
                    <circle
                      cx="50"
                      cy="50"
                      r="40"
                      stroke="url(#practiceGrad)"
                      strokeWidth="9"
                      strokeDasharray={251.32}
                      strokeDashoffset={251.32 - (251.32 * practiceOverallPercent) / 100}
                      strokeLinecap="round"
                      fill="transparent"
                      className="transition-all duration-1000 ease-out"
                    />
                    <defs>
                      <linearGradient id="practiceGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#10b981" />
                        <stop offset="50%" stopColor="#14b8a6" />
                        <stop offset="100%" stopColor="#06b6d4" />
                      </linearGradient>
                    </defs>
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center font-mono">
                    <span className="text-xl font-black text-[var(--text-main)]">{practiceTotalSolved}</span>
                    <span className="text-[9px] text-[var(--text-muted)] uppercase tracking-wider font-semibold">/ 111</span>
                  </div>
                </div>

                {/* Breakdown List */}
                <div className="space-y-1.5 font-mono text-[11px]">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-500" />
                    <span className="text-[var(--text-muted)]">Easy:</span>
                    <span className="font-bold text-[var(--text-main)] ml-auto">{practiceEasySolved}/{practiceEasyTotal}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-amber-500" />
                    <span className="text-[var(--text-muted)]">Medium:</span>
                    <span className="font-bold text-[var(--text-main)] ml-auto">{practiceMedSolved}/{practiceMedTotal}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-rose-500" />
                    <span className="text-[var(--text-muted)]">Hard:</span>
                    <span className="font-bold text-[var(--text-main)] ml-auto">{practiceHardSolved}/{practiceHardTotal}</span>
                  </div>
                </div>
              </div>

              {/* Footer Practice link */}
              <div className="pt-3 border-t border-[var(--border-line)] flex items-center justify-between text-xs font-mono">
                <span className="text-[var(--text-muted)]">Topic Arena</span>
                <Link to="/practice" className="text-emerald-500 hover:text-emerald-400 font-bold flex items-center gap-1 group-hover:translate-x-0.5 transition-transform">
                  <span>Practice →</span>
                </Link>
              </div>
            </div>

            {/* GRAPH 2: LAB INTERNAL MASTERY (4 Cols) */}
            <div className="lg:col-span-4 rounded-3xl border border-[var(--border-line)] bg-[var(--bg-panel)] p-6 flex flex-col justify-between shadow-md relative overflow-hidden group hover:border-cyan-500/40 transition-all">
              <div className="flex items-center justify-between border-b border-[var(--border-line)] pb-4">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-xl bg-cyan-500/10 text-cyan-500 dark:text-cyan-400 border border-cyan-500/20">
                    <BookOpen className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="font-bold text-sm text-[var(--text-main)]">Lab Internal</h3>
                    <p className="text-[11px] font-mono text-[var(--text-muted)]">100 Lab Questions</p>
                  </div>
                </div>
                <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border border-cyan-500/20">
                  {labOverallPercent}% Done
                </span>
              </div>

              {/* Circular Radial SVG + Stats Breakdown */}
              <div className="py-5 flex items-center justify-around gap-3">
                {/* SVG Progress Circle */}
                <div className="relative w-24 h-24 shrink-0 flex items-center justify-center">
                  <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                    <circle
                      cx="50"
                      cy="50"
                      r="40"
                      className="stroke-[var(--border-line)] opacity-60"
                      strokeWidth="9"
                      fill="transparent"
                    />
                    <circle
                      cx="50"
                      cy="50"
                      r="40"
                      stroke="url(#labGrad)"
                      strokeWidth="9"
                      strokeDasharray={251.32}
                      strokeDashoffset={251.32 - (251.32 * labOverallPercent) / 100}
                      strokeLinecap="round"
                      fill="transparent"
                      className="transition-all duration-1000 ease-out"
                    />
                    <defs>
                      <linearGradient id="labGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#6366f1" />
                        <stop offset="50%" stopColor="#06b6d4" />
                        <stop offset="100%" stopColor="#10b981" />
                      </linearGradient>
                    </defs>
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center font-mono">
                    <span className="text-xl font-black text-[var(--text-main)]">{labTotalSolved}</span>
                    <span className="text-[9px] text-[var(--text-muted)] uppercase tracking-wider font-semibold">/ 100</span>
                  </div>
                </div>

                {/* Breakdown List */}
                <div className="space-y-1.5 font-mono text-[11px]">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-500" />
                    <span className="text-[var(--text-muted)]">Easy Core:</span>
                    <span className="font-bold text-[var(--text-main)] ml-auto">{labEasySolved}/40</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-amber-500" />
                    <span className="text-[var(--text-muted)]">Med Logic:</span>
                    <span className="font-bold text-[var(--text-main)] ml-auto">{labMedSolved}/40</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-rose-500" />
                    <span className="text-[var(--text-muted)]">Hard Test:</span>
                    <span className="font-bold text-[var(--text-main)] ml-auto">{labHardSolved}/20</span>
                  </div>
                </div>
              </div>

              {/* Footer Lab Internal link */}
              <div className="pt-3 border-t border-[var(--border-line)] flex items-center justify-between text-xs font-mono">
                <span className="text-[var(--text-muted)]">Evaluation</span>
                <Link to="/lab-internal" className="text-cyan-500 hover:text-cyan-400 font-bold flex items-center gap-1 group-hover:translate-x-0.5 transition-transform">
                  <span>Open Labs →</span>
                </Link>
              </div>
            </div>

            {/* BENTO TILE 3: 7-DAY CONSISTENCY & ACTIVITY MATRIX (4 Cols) */}
            <div className="md:col-span-2 lg:col-span-4 rounded-3xl border border-[var(--border-line)] bg-[var(--bg-panel)] p-6 flex flex-col justify-between shadow-md relative overflow-hidden group hover:border-amber-500/40 transition-all rounded-3xl border border-[var(--border-line)] bg-[var(--bg-panel)] p-6 flex flex-col justify-between shadow-md relative overflow-hidden group hover:border-amber-500/40 transition-all">
              <div className="flex items-center justify-between border-b border-[var(--border-line)] pb-4">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-xl bg-amber-500/10 text-amber-500 dark:text-amber-400 border border-amber-500/20">
                    <Flame className="w-4 h-4 animate-bounce" />
                  </div>
                  <div>
                    <h3 className="font-bold text-sm text-[var(--text-main)]">Daily Streak & Consistency</h3>
                    <p className="text-[11px] font-mono text-[var(--text-muted)]">Solve every day for university streak bonus</p>
                  </div>
                </div>
                <div className="text-right font-mono">
                  <span className="text-xl font-black text-amber-500 dark:text-amber-400 flex items-center gap-1 justify-end">
                    <span>{computedStreak}</span>
                    <span className="text-xs font-normal text-[var(--text-muted)]">Days 🔥</span>
                  </span>
                  <span className="text-[10px] text-[var(--text-muted)] block">Personal Best: {Math.max(Number(stats?.longestStreak || user?.longestStreak || 0), computedStreak)}d</span>
                </div>
              </div>

              {/* 7-Day Interactive Matrix */}
              <div className="py-6 space-y-3">
                <div className="flex items-center justify-between gap-2">
                  {past7Days.map((d, i) => (
                    <div
                      key={i}
                      className={`flex-1 py-3 px-1 rounded-2xl border text-center transition-all flex flex-col items-center gap-1.5 ${
                        d.isActive
                          ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-600 dark:text-emerald-400 shadow-sm'
                          : d.isToday
                          ? 'bg-[var(--bg-surface)] border-indigo-500/30 text-[var(--text-main)] shadow-sm'
                          : 'bg-[var(--bg-surface)] border-[var(--border-line)] text-[var(--text-muted)]'
                      }`}
                    >
                      <span className="text-[10px] font-mono uppercase font-bold">{d.dayName}</span>
                      <div
                        className={`w-4 h-4 rounded-full flex items-center justify-center ${
                          d.isActive
                            ? 'bg-emerald-500 text-white shadow-sm'
                            : d.isToday
                            ? 'border border-indigo-400/40 bg-[var(--bg-panel)]'
                            : 'bg-[var(--border-line)]'
                        }`}
                      >
                        {d.isActive ? <Check className="w-2.5 h-2.5 stroke-[3]" /> : null}
                      </div>
                      <span className="text-[10px] font-mono font-medium">{d.dateNum}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Instant WhatsApp Streak Reminder Button */}
              <div className="pt-4 border-t border-[var(--border-line)] flex items-center justify-between">
                <span className="text-xs text-[var(--text-muted)] font-mono">Save streak & invite classmates</span>
                <a
                  href={`https://wa.me/?text=${encodeURIComponent(
                    `🔥 *LogicQ Daily C Challenge Reminder* 🔥\n\nHey! Don't let your streak break today.\n\n⚡ *My Current Streak:* ${stats?.currentStreak || user?.currentStreak || 0} Days 🔥\n💎 *Reward:* +25 Academic XP\n👉 *Solve Now:* https://logicq-clanguage.web.app/daily\n\nCompete on the Sanjivani University daily leaderboard! 🚀`
                  )}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3.5 py-1.5 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 font-mono text-xs font-bold flex items-center gap-1.5 transition"
                >
                  <MessageSquare className="w-3.5 h-3.5 text-emerald-500 dark:text-emerald-400" />
                  <span>Ping to WhatsApp</span>
                </a>
              </div>
            </div>
          </div>


          {/* 4. ASSIGNED LAB ASSESSMENTS & TESTS (High Institutional Priority) */}
          <div className="rounded-3xl border border-[var(--border-line)] bg-[var(--bg-panel)] p-6 sm:p-7 shadow-md space-y-5">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-[var(--border-line)] pb-4">
              <div>
                <h2 className="text-base sm:text-lg font-bold text-[var(--text-main)] flex items-center gap-2">
                  <FileText className="w-5 h-5 text-indigo-500 dark:text-indigo-400" />
                  <span>Assigned Lab Assessments & Tests</span>
                </h2>
                <p className="text-xs text-[var(--text-muted)] font-mono mt-0.5">
                  Proctored coursework tests scheduled by your faculty mentor
                </p>
              </div>

              <Link
                to="/student/tests"
                className="text-xs font-mono text-indigo-600 dark:text-indigo-400 hover:underline font-semibold flex items-center gap-1 transition"
              >
                <span>View Full Tests Hub</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            {isLoadingStudentTests ? (
              <div className="py-8 text-center text-xs font-mono text-[var(--text-muted)]">
                <Loader2 className="w-5 h-5 animate-spin mx-auto mb-2 text-indigo-500" />
                <span>Checking section assignments...</span>
              </div>
            ) : studentAssignedList.length === 0 ? (
              <div className="p-6 rounded-2xl border border-dashed border-[var(--border-line)] bg-[var(--bg-surface)] text-center space-y-4">
                <div className="w-10 h-10 rounded-full bg-indigo-500/10 text-indigo-500 dark:text-indigo-400 flex items-center justify-center mx-auto">
                  <KeyRound className="w-5 h-5" />
                </div>
                <div className="space-y-1">
                  <h3 className="text-sm font-bold text-[var(--text-main)] font-mono">
                    No Active Tests Assigned Right Now
                  </h3>
                  <p className="text-xs text-[var(--text-muted)] max-w-md mx-auto font-mono leading-relaxed">
                    Have a 6-character Join Code from your professor (e.g. <code className="text-indigo-600 dark:text-indigo-400 font-bold">LQ-A1B2</code>)? Enter it to enroll and unlock tests:
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
                    className="w-full sm:flex-1 px-3.5 py-2.5 rounded-xl border border-[var(--border-line)] bg-[var(--bg-panel)] text-sm font-mono font-bold tracking-widest placeholder:tracking-normal placeholder:font-normal text-[var(--text-main)] focus:outline-none focus:border-indigo-500"
                  />
                  <button
                    type="submit"
                    disabled={isEnrollingCode || !dashboardJoinCode.trim()}
                    className="w-full sm:w-auto px-5 py-2.5 rounded-xl text-xs font-mono font-bold bg-indigo-600 hover:bg-indigo-500 text-white transition disabled:opacity-50 whitespace-nowrap cursor-pointer shadow-md shadow-indigo-600/20"
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
                      className="p-5 rounded-2xl border border-[var(--border-line)] bg-[var(--bg-surface)] hover:border-indigo-500/40 transition-all space-y-3.5 shadow-sm"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20">
                          {test?.section?.sectionName || 'Class Section'}
                        </span>

                        {isSubmitted ? (
                          <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3" />
                            SUBMITTED
                          </span>
                        ) : isInProgress ? (
                          <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                            IN PROGRESS ({completedCount}/{questions.length})
                          </span>
                        ) : (
                          <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border border-cyan-500/20">
                            ASSIGNED
                          </span>
                        )}
                      </div>

                      <div>
                        <h3 className="font-bold text-sm text-[var(--text-main)] truncate font-mono">
                          {test?.title || 'Assessment Test'}
                        </h3>
                        <p className="text-[11px] text-[var(--text-muted)] font-mono mt-0.5 flex items-center gap-2">
                          <span>⏱️ {test?.durationMinutes || 60} Mins</span>
                          <span>•</span>
                          <span>❓ {questions.length} Questions</span>
                        </p>
                      </div>

                      <div className="pt-3 border-t border-[var(--border-line)] flex items-center justify-between">
                        {isSubmitted && assignment?.academicScore > 0 ? (
                          <span className="text-xs font-mono font-bold text-emerald-600 dark:text-emerald-400">
                            Score: {assignment.academicScore.toFixed(1)} / {questions.length}
                          </span>
                        ) : (
                          <span className="text-[11px] font-mono text-[var(--text-muted)]">
                            {completedCount} of {questions.length} completed
                          </span>
                        )}

                        <div className="flex items-center gap-2">
                          <a
                            href={`https://wa.me/?text=${encodeURIComponent(
                              `⚡ *LogicQ Test Reminder*\n\n📝 *Assessment:* ${test?.title || 'Lab Test'}\n⏱️ *Duration:* ${test?.durationMinutes || 60} Mins\n👉 *Direct Link:* https://logicq-clanguage.web.app/student/tests\n\nSubmit before scheduled deadline!`
                            )}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            title="Ping reminder to WhatsApp"
                            className="p-2 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 transition flex items-center"
                          >
                            <MessageSquare className="w-3.5 h-3.5" />
                          </a>

                          <Link
                            to="/student/tests"
                            className="px-3.5 py-1.5 rounded-xl text-xs font-mono font-bold bg-indigo-600 hover:bg-indigo-500 text-white flex items-center gap-1 transition shadow-sm"
                          >
                            <span>{isSubmitted ? 'View Details' : isInProgress ? 'Resume Test' : 'Start Test'}</span>
                            <ChevronRight className="w-3.5 h-3.5" />
                          </Link>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* 4.5. 5 TOPIC-BY-TOPIC PRACTICE MODULES (BENTO CARDS) */}
          <div className="rounded-3xl border border-[var(--border-line)] bg-[var(--bg-panel)] p-6 sm:p-7 shadow-md space-y-5">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-[var(--border-line)] pb-4">
              <div>
                <h2 className="text-base sm:text-lg font-bold text-[var(--text-main)] flex items-center gap-2">
                  <Code2 className="w-5 h-5 text-emerald-500 dark:text-emerald-400" />
                  <span>Topic-by-Topic Practice Modules</span>
                </h2>
                <p className="text-xs text-[var(--text-muted)] font-mono mt-0.5">
                  111 curated C coding problems across 5 modules — solve all practice topics to unlock Lab Internals
                </p>
              </div>

              <Link
                to="/practice"
                className="text-xs font-mono text-emerald-600 dark:text-emerald-400 hover:underline font-semibold flex items-center gap-1 transition"
              >
                <span>View All 111 Practice Topics</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
              {practiceModulesList.map((m: any) => {
                const percent = m.progressPercent || 0;
                const isComplete = m.solvedCount >= m.totalQuestions;
                const isLocked = !m.isUnlocked;

                if (isLocked) {
                  return (
                    <div
                      key={m.id}
                      onClick={() => toast.warning(`🔒 ${m.lockReason || 'Complete previous practice module and Lab Internal first.'}`)}
                      className="p-5 rounded-2xl border border-dashed border-amber-500/30 bg-[var(--bg-surface)]/60 opacity-75 hover:opacity-95 shadow-sm transition-all flex flex-col justify-between cursor-not-allowed group relative overflow-hidden select-none"
                      title={m.lockReason}
                    >
                      <div className="space-y-2.5">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-[var(--bg-panel)] text-[var(--text-muted)] border border-[var(--border-line)]">
                            MOD 0{m.id}
                          </span>
                          <span className="text-[10px] font-mono text-amber-500 dark:text-amber-400 flex items-center gap-1 font-bold bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20">
                            <Lock className="w-3 h-3 text-amber-500" /> Locked
                          </span>
                        </div>

                        <h3 className="font-bold text-sm text-[var(--text-muted)] line-clamp-1">
                          {m.title}
                        </h3>
                        <p className="text-[11px] text-[var(--text-muted)] line-clamp-2 leading-relaxed">
                          {m.lockReason || m.description}
                        </p>
                      </div>

                      <div className="pt-3 mt-4 border-t border-[var(--border-line)] space-y-2">
                        <div className="w-full bg-[var(--bg-panel)] h-2 rounded-full overflow-hidden border border-[var(--border-line)]">
                          <div
                            className="bg-amber-500/40 h-full rounded-full transition-all duration-300"
                            style={{ width: `${Math.max(percent, percent > 0 ? 4 : 0)}%` }}
                          />
                        </div>
                        <div className="flex items-center justify-between text-[10px] font-mono text-[var(--text-muted)]">
                          <span>{m.solvedCount}/{m.totalQuestions} Solved</span>
                          <span className="text-amber-500 dark:text-amber-400 font-semibold flex items-center gap-1">
                            <Lock className="w-3 h-3" /> Req Lab {m.id - 1}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                }

                return (
                  <Link
                    key={m.id}
                    to={`/practice?module=${m.id}`}
                    className="p-5 rounded-2xl border border-[var(--border-line)] bg-[var(--bg-surface)] hover:border-emerald-500/50 shadow-sm transition-all flex flex-col justify-between group hover:scale-[1.02] cursor-pointer"
                  >
                    <div className="space-y-2.5">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-[var(--bg-panel)] text-[var(--text-muted)] border border-[var(--border-line)]">
                          MOD 0{m.id}
                        </span>
                        {isComplete ? (
                          <span className="text-[10px] font-mono text-emerald-600 dark:text-emerald-400 flex items-center gap-1 font-bold">
                            <CheckCircle2 className="w-3 h-3 text-emerald-500" /> Complete
                          </span>
                        ) : (
                          <span className="text-[10px] font-mono text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                            {percent}%
                          </span>
                        )}
                      </div>

                      <h3 className="font-bold text-sm text-[var(--text-main)] line-clamp-1 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                        {m.title}
                      </h3>
                      <p className="text-[11px] text-[var(--text-muted)] line-clamp-2 leading-relaxed">
                        {m.description}
                      </p>
                    </div>

                    <div className="pt-3 mt-4 border-t border-[var(--border-line)] space-y-2">
                      <div className="w-full bg-[var(--bg-panel)] h-2 rounded-full overflow-hidden border border-[var(--border-line)]">
                        <div
                          className="bg-gradient-to-r from-emerald-500 to-teal-400 h-full rounded-full transition-all duration-300"
                          style={{ width: `${Math.max(percent, percent > 0 ? 4 : 0)}%` }}
                        />
                      </div>
                      <div className="flex items-center justify-between text-[10px] font-mono text-[var(--text-muted)]">
                        <span>{m.solvedCount}/{m.totalQuestions} Solved</span>
                        <span className="text-emerald-600 dark:text-emerald-400 font-semibold group-hover:translate-x-0.5 transition-transform flex items-center gap-0.5">
                          Practice →
                        </span>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>

          {/* 5. 5 SEQUENTIAL LAB COURSEWORK MODULES (BENTO CARDS) */}
          <div className="rounded-3xl border border-[var(--border-line)] bg-[var(--bg-panel)] p-6 sm:p-7 shadow-md space-y-5">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-[var(--border-line)] pb-4">
              <div>
                <h2 className="text-base sm:text-lg font-bold text-[var(--text-main)] flex items-center gap-2">
                  <BookOpen className="w-5 h-5 text-cyan-500 dark:text-cyan-400" />
                  <span>Lab Internal Coursework Modules</span>
                </h2>
                <p className="text-xs text-[var(--text-muted)] font-mono mt-0.5">
                  5 sequential topic modules from Control Structures to Dynamic Memory Allocation
                </p>
              </div>

              <Link
                to="/lab-internal"
                className="text-xs font-mono text-cyan-600 dark:text-cyan-400 hover:underline font-semibold flex items-center gap-1 transition"
              >
                <span>View All 5 Modules</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
              {studentModulesList.length > 0 ? (
                studentModulesList.map((m: any, idx: number) => {
                  const isLocked = !m.isUnlocked;
                  const percent = m.progressPercent || 0;
                  return (
                    <Link
                      key={m.id || idx}
                      to={`/lab-internal/${m.slug}`}
                      className={`p-5 rounded-2xl border transition-all flex flex-col justify-between group hover:scale-[1.02] ${
                        isLocked
                          ? 'border-[var(--border-line)] bg-[var(--bg-surface)]/60 opacity-60'
                          : 'border-[var(--border-line)] bg-[var(--bg-surface)] hover:border-cyan-500/50 shadow-sm'
                      }`}
                    >
                      <div className="space-y-2.5">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-[var(--bg-panel)] text-[var(--text-muted)] border border-[var(--border-line)]">
                            MOD 0{m.order || idx + 1}
                          </span>
                          {isLocked ? (
                            <span className="text-[10px] font-mono text-amber-600 dark:text-amber-400 flex items-center gap-1">
                              <Lock className="w-3 h-3" /> Locked
                            </span>
                          ) : (
                            <span className="text-[10px] font-mono text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                              <CheckCircle2 className="w-3 h-3" /> {percent}%
                            </span>
                          )}
                        </div>

                        <h3 className="font-bold text-sm text-[var(--text-main)] line-clamp-1 group-hover:text-cyan-600 dark:group-hover:text-cyan-400 transition-colors">
                          {m.title}
                        </h3>
                        <p className="text-[11px] text-[var(--text-muted)] line-clamp-2 leading-relaxed">
                          {m.description}
                        </p>
                      </div>

                      <div className="pt-3 mt-4 border-t border-[var(--border-line)] space-y-2">
                        <div className="w-full bg-[var(--bg-panel)] h-2 rounded-full overflow-hidden border border-[var(--border-line)]">
                          <div
                            className="bg-gradient-to-r from-cyan-500 to-emerald-500 h-full rounded-full transition-all duration-300"
                            style={{ width: `${percent}%` }}
                          />
                        </div>
                        <div className="flex items-center justify-between text-[10px] font-mono text-[var(--text-muted)]">
                          <span>{m.solvedCount || 0}/20 Solved</span>
                          <span className="text-cyan-600 dark:text-cyan-400 font-semibold">{isLocked ? 'Unlock →' : 'Practice →'}</span>
                        </div>
                      </div>
                    </Link>
                  );
                })
              ) : null}
            </div>
          </div>

          {/* 6. BOTTOM BENTO ROW: INTERACTIVE ONLINE C COMPILER & PLAYGROUND */}
          <OnlineCompilerCard />
        </div>
      )}
    </div>
  );
};
