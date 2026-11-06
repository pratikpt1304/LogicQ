import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../api/client.js';
import { useAuth } from '../context/AuthContext.js';
import { OnlineCompilerCard } from '../components/dashboard/OnlineCompilerCard.js';
import { DifficultyBadge, VerdictBadge } from '../components/common/Badge.js';
import { CountdownClock } from '../components/common/CountdownClock.js';
import { GoogleDriveService } from '../services/googleDrive.service.js';
import { FirestoreDataService } from '../services/firestoreData.service.js';
import { RealtimeSyncService } from '../services/realtimeSync.service.js';
import { auth, db } from '../config/firebase.js';
import { collection, onSnapshot } from 'firebase/firestore';
import { PRACTICE_CONFIG, isModule5UnlockedByAdmin } from '../config/practice.config.js';
import { resolveGreetingName } from '../config/academic.config.js';
import { TOPIC_PRACTICE_DATA } from '../data/topic-practice.data.js';
import { PRACTICE_MODULE_1_PROBLEMS } from '../data/practice-module1.data.js';
import { PRACTICE_MODULE_2_PROBLEMS } from '../data/practice-module2.data.js';
import { PRACTICE_MODULE_3_PROBLEMS } from '../data/practice-module3.data.js';
import { PRACTICE_MODULE_4_PROBLEMS } from '../data/practice-module4.data.js';
import { PRACTICE_MODULE_5_PROBLEMS } from '../data/practice-module5.data.js';
import { FORMATTED_DAILY_CHALLENGES } from '../api/fallbackEngine.js';
import { C_PROGRAMMING_COHORT_STUDENTS, DEMO_SECTION_COHORT_STUDENTS } from '../data/c-programming-cohort.data.js';
import { getSolvedPracticeTopicIds, markPracticeTopicSolved } from './TopicPracticeHubPage.js';
import { getPracticeModuleUnlockInfo, getLabModuleUnlockInfo } from '../utils/progression.js';
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
  Search,
  Share2,
  RefreshCw,
  Filter,
  User,
  BarChart2,
} from 'lucide-react';

export const DashboardPage: React.FC = () => {
  const { user, isAdmin, isFaculty, isChecker, refreshUser } = useAuth();
  const isFacultyUser = (isFaculty || user?.role === 'FACULTY') && user?.prn !== '2126PMIM1039';
  const isStudent = !isFacultyUser && !isAdmin;
  const [studentTab, setStudentTab] = useState<'practice' | 'lab' | 'tests'>('practice');
  const [isDriveConnecting, setIsDriveConnecting] = useState(false);
  const [workspaceBlockMessage, setWorkspaceBlockMessage] = useState<string | null>(null);
  const [isDriveCardDismissed, setIsDriveCardDismissed] = useState<boolean>(() => {
    try {
      return localStorage.getItem('logicq_drive_backup_card_dismissed') === 'true';
    } catch {
      return false;
    }
  });

  const dailyData: any = null; const isDailyLoading = false; const dailyError = null; const refetchDaily = () => {};

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

  const rawDailyProblem = dailyData?.data?.problem;
  const isPracticeInDaily = rawDailyProblem && (
    rawDailyProblem.isPractice === true ||
    rawDailyProblem.sourceType === 'PRACTICE' ||
    rawDailyProblem.sourceType === 'BOOK' ||
    rawDailyProblem.slug?.startsWith('practice-') ||
    rawDailyProblem.slug?.startsWith('kanetkar-') ||
    Boolean(rawDailyProblem.moduleSlug)
  );
  const dailyProblem = isPracticeInDaily ? FORMATTED_DAILY_CHALLENGES[0] : (rawDailyProblem || FORMATTED_DAILY_CHALLENGES[0]);
  const isDailySolved = dailyData?.data?.userStatus?.isSolved;
  const secondsLeft = dailyData?.data?.secondsUntilNextReset;

  // Faculty / Admin state & queries
  const [copiedCodeKey, setCopiedCodeKey] = useState<string | null>(null);
  const [adminActiveTab, setAdminActiveTab] = useState<'overview' | 'roster' | 'sections' | 'tests' | 'submissions'>('overview');
  const [adminSearchQuery, setAdminSearchQuery] = useState('');
  const [selectedDashboardStudent, setSelectedDashboardStudent] = useState<any | null>(null);
  const [isRefreshingDashboard, setIsRefreshingDashboard] = useState(false);

  // Fetch real-time submissions & coding progress for student selected in dashboard
  const { data: selectedStudentSubmissions = [], isLoading: isLoadingSelectedStudentSubs } = useQuery({
    queryKey: ['dashboard-selected-student-subs', selectedDashboardStudent?.prn, selectedDashboardStudent?.email],
    enabled: Boolean(selectedDashboardStudent?.prn),
    queryFn: async () => {
      const prn = selectedDashboardStudent?.prn?.trim();
      const email = selectedDashboardStudent?.email?.trim();
      try {
        const res: any = await api.get(`/admin/submissions?search=${encodeURIComponent(prn)}&limit=25`);
        const list = res?.submissions || res?.data?.submissions || (Array.isArray(res?.data) ? res.data : []);
        if (Array.isArray(list) && list.length > 0) return list;
      } catch (err) {
        console.warn('Failed to fetch student submissions by PRN:', err);
      }
      return (recentSubmissions || []).filter((s: any) => {
        const sp = (s.prn || s.studentPrn || s.user?.prn || '').trim().toUpperCase();
        const se = (s.email || s.studentEmail || s.user?.email || '').trim().toLowerCase();
        return (prn && sp === prn.toUpperCase()) || (email && se === email.toLowerCase());
      });
    },
    refetchInterval: 6000,
  });

  // Fetch real-time Lab Internal coursework submissions for student progress drawer
  const { data: allLabSubmissions = [] } = useQuery({
    queryKey: ['dashboard-admin-lab-submissions'],
    queryFn: async () => {
      try {
        const res: any = await api.get('/practice/admin/lab-submissions?limit=300');
        return res?.data?.submissions || res?.submissions || [];
      } catch {
        return [];
      }
    },
    staleTime: 15000,
  });

  const handleCopyCode = (text: string, key: string, label: string = 'Code') => {
    navigator.clipboard.writeText(text);
    setCopiedCodeKey(key);
    toast.success(`${label} copied!`);
    setTimeout(() => setCopiedCodeKey(null), 2000);
  };

  const handleShareWhatsApp = (sec: any) => {
    const code = sec?.joinCode || 'LQ-C31A';
    const subj = sec?.sectionName || sec?.subject || 'C Programming';
    const inviteUrl = `https://logicq-clanguage.web.app/login?joinCode=${code}`;
    const text = encodeURIComponent(
      `👋 Join our ${subj} class on LogicQ!\nJoin Code: ${code}\nDirect link: ${inviteUrl}`
    );
    window.open(`https://api.whatsapp.com/send?text=${text}`, '_blank');
  };

  const handleRefreshAdminDashboard = async () => {
    setIsRefreshingDashboard(true);
    try {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['faculty-dashboard-sections'] }),
        queryClient.invalidateQueries({ queryKey: ['faculty-dashboard-tests'] }),
        queryClient.invalidateQueries({ queryKey: ['faculty-dashboard-global-stats'] }),
        queryClient.invalidateQueries({ queryKey: ['faculty-dashboard-recent-submissions'] }),
      ]);
      toast.success('Live dashboard updated');
    } finally {
      setTimeout(() => setIsRefreshingDashboard(false), 500);
    }
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

  // 1a. Real-time Directory Users from Firestore (Live 5s auto-refresh)
  const { data: realDirectoryUsers = [] } = useQuery({
    queryKey: ['dashboard-real-directory-users'],
    enabled: Boolean(user && !isStudent),
    queryFn: async () => {
      return await FirestoreDataService.getAllFirestoreUsers().catch(() => []);
    },
    refetchInterval: 5000,
  });

  // 1a.2 Instant 0ms onSnapshot live listener on 'enrolled_students' for instantaneous bound email & profile sync
  const [liveEnrolledStudentsMap, setLiveEnrolledStudentsMap] = React.useState<Map<string, any>>(new Map());
  React.useEffect(() => {
    try {
      const unsub = onSnapshot(collection(db, 'enrolled_students'), (snap) => {
        const m = new Map<string, any>();
        snap.forEach((d) => {
          const raw = d.data();
          if (raw && raw.prn) {
            m.set(String(raw.prn).toUpperCase().trim(), { id: d.id, ...raw });
          }
        });
        setLiveEnrolledStudentsMap(m);
      }, (err) => {
        console.warn('Dashboard live enrolled_students onSnapshot notice:', err);
      });
      return () => unsub();
    } catch {
      return undefined;
    }
  }, []);

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
        return res?.submissions || res?.data?.submissions || (Array.isArray(res?.data) ? res.data : []);
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
      queryClient.invalidateQueries({ queryKey: ['dashboard-admin-lab-submissions'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
      queryClient.invalidateQueries({ queryKey: ['practice-modules'] });
      queryClient.invalidateQueries({ queryKey: ['student-practice-modules'] });
      const current = Array.from(new Set([
        ...getSolvedPracticeTopicIds(user?.id),
        ...(user?.prn ? getSolvedPracticeTopicIds(user.prn) : []),
      ]));
      setSolvedTopicIds(current);
    });
    const unsubUsers = RealtimeSyncService.on('USERS', () => {
      queryClient.invalidateQueries({ queryKey: ['faculty-dashboard-sections'] });
      queryClient.invalidateQueries({ queryKey: ['faculty-dashboard-global-stats'] });
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      queryClient.invalidateQueries({ queryKey: ['admin-firestore-users'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
    });
    return () => {
      unsubDashboard();
      unsubTests();
      unsubSections();
      unsubSubmissions();
      unsubUsers();
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
  const [solvedTopicIds, setSolvedTopicIds] = useState<string[]>(() => {
    const list = getSolvedPracticeTopicIds(user?.id);
    if (user?.prn) {
      getSolvedPracticeTopicIds(user.prn).forEach((x) => !list.includes(x) && list.push(x));
    }
    const prnUpper = (user?.prn || '').toUpperCase();
    if (prnUpper.startsWith('2126DEMO')) {
      const demoSt = DEMO_SECTION_COHORT_STUDENTS.find((s) => s.prn.toUpperCase() === prnUpper);
      const count = demoSt?.totalSolved ?? 58;
      const demoSolved = TOPIC_PRACTICE_DATA.slice(0, count).map((t) => t.id);
      return Array.from(new Set([...list, ...demoSolved]));
    }
    return list;
  });

  // Sync and restore solved practice topics from Firestore across mobile & laptop
  React.useEffect(() => {
    if (!user?.id && !user?.prn) return;
    (async () => {
      try {
        const identifier = user?.prn || user?.id || '';
        const stats = await FirestoreDataService.getStatsBackup(identifier);
        const prog = await FirestoreDataService.getPracticeProgress(identifier);
        const cloudSolved = Array.from(
          new Set([
            ...(stats?.completedProblems || []),
            ...(prog?.completedProblems || []),
            ...getSolvedPracticeTopicIds(user?.id),
            ...(user?.prn ? getSolvedPracticeTopicIds(user.prn) : []),
          ])
        );
        if (cloudSolved.length > 0) {
          cloudSolved.forEach((id) => {
            markPracticeTopicSolved(id, user?.id);
            if (user?.prn) markPracticeTopicSolved(id, user.prn);
          });
          setSolvedTopicIds(cloudSolved);
        }
      } catch (err) {
        console.warn('Dashboard restore error:', err);
      }
    })();
  }, [user?.id, user?.prn]);

  const studentModulesList: any[] = (Array.isArray(studentPracticeModules) ? studentPracticeModules : [])
    .map((m: any) => {
      const isM5 = m.order === 5 || m.slug === 'advanced-competitive-c';
      
      // Determine Lab problem slugs for this specific CIE Lab module
      let moduleLabSlugs: string[] = [];
      if (m.order === 1 || m.slug === 'control-structures') {
        moduleLabSlugs = PRACTICE_MODULE_1_PROBLEMS.map((p) => p.slug);
      } else if (m.order === 2 || m.slug === 'pointers-and-functions') {
        moduleLabSlugs = PRACTICE_MODULE_2_PROBLEMS.map((p) => p.slug);
      } else if (m.order === 3 || m.slug === 'arrays-and-strings') {
        moduleLabSlugs = PRACTICE_MODULE_3_PROBLEMS.map((p) => p.slug);
      } else if (m.order === 4 || m.slug === 'structures-and-memory') {
        moduleLabSlugs = PRACTICE_MODULE_4_PROBLEMS.map((p) => p.slug);
      }

      // Count only actual Lab problems solved, completely decoupled from Topic Practice
      const labSolvedInMod = moduleLabSlugs.filter((s) => solvedTopicIds.includes(s)).length;
      const solvedCount = Math.max(m.solvedCount || 0, labSolvedInMod);
      const totalQuestions = m.totalQuestions || 20;
      const progressPercent = totalQuestions > 0 ? Math.round((solvedCount / totalQuestions) * 100) : 0;
      const unlockInfo = getLabModuleUnlockInfo(m.order || 1, solvedTopicIds, isAdmin || isFaculty);
      return {
        ...m,
        isUnlocked: unlockInfo.isUnlocked,
        lockReason: unlockInfo.lockReason,
        isFacultyLocked: isM5 && !isModule5UnlockedByAdmin() && !isAdmin && !isFaculty,
        solvedCount,
        progressPercent,
      };
    });

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

  const m5LabSlugs = PRACTICE_MODULE_5_PROBLEMS.map((p) => p.slug);
  const m5LabSolved = m5LabSlugs.filter((s) => solvedTopicIds.includes(s)).length;
  const isLab5Complete = Boolean(
    m5LabSolved >= 20 ||
    m5LabSolved >= m5LabSlugs.length ||
    (typeof localStorage !== 'undefined' && localStorage.getItem('logicq_practice_report_mini-project'))
  );

  const practiceModulesList = [
    {
      id: 1,
      order: 1,
      title: 'Control Structures',
      description: 'Branching decisions, loops, switch-case, and iteration flow in C.',
      totalQuestions: TOPIC_PRACTICE_DATA.filter((t) => t.moduleIndex === 1).length || 25,
      solvedCount: TOPIC_PRACTICE_DATA.filter((t) => t.moduleIndex === 1 && solvedTopicIds.includes(t.id)).length,
      progressPercent: 0,
      ...getPracticeModuleUnlockInfo(1, solvedTopicIds, isAdmin || isFaculty),
    },
    {
      id: 2,
      order: 2,
      title: 'Pointers and Functions',
      description: 'Memory addresses, dereferencing, pass-by-reference, recursion, and function pointers.',
      totalQuestions: TOPIC_PRACTICE_DATA.filter((t) => t.moduleIndex === 2).length || 25,
      solvedCount: TOPIC_PRACTICE_DATA.filter((t) => t.moduleIndex === 2 && solvedTopicIds.includes(t.id)).length,
      progressPercent: 0,
      ...getPracticeModuleUnlockInfo(2, solvedTopicIds, isAdmin || isFaculty),
    },
    {
      id: 3,
      order: 3,
      title: 'Array and its Applications',
      description: 'Single and multi-dimensional arrays, searching, sorting, rotations, and matrices.',
      totalQuestions: TOPIC_PRACTICE_DATA.filter((t) => t.moduleIndex === 3).length || 25,
      solvedCount: TOPIC_PRACTICE_DATA.filter((t) => t.moduleIndex === 3 && solvedTopicIds.includes(t.id)).length,
      progressPercent: 0,
      ...getPracticeModuleUnlockInfo(3, solvedTopicIds, isAdmin || isFaculty),
    },
    {
      id: 4,
      order: 4,
      title: 'Advanced Data Types, Dynamic Memory',
      description: 'Structures, unions, enums, dynamic heap allocation (malloc/calloc/realloc), and linked nodes.',
      totalQuestions: TOPIC_PRACTICE_DATA.filter((t) => t.moduleIndex === 4).length || 25,
      solvedCount: TOPIC_PRACTICE_DATA.filter((t) => t.moduleIndex === 4 && solvedTopicIds.includes(t.id)).length,
      progressPercent: 0,
      ...getPracticeModuleUnlockInfo(4, solvedTopicIds, isAdmin || isFaculty),
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

  const cleanSec = rawSecName ? String(rawSecName).replace(/\s*\(Presidential Showcase\)/gi, '').trim() : '';

  const sectionDisplayName = (!isLegacyDemoName(cleanSec) && cleanSec)
    ? cleanSec
    : (matchedStudentSection?.subject || detectedSection?.subject || 'C Programming Masterclass');

  // Unified Roster: Merging Live Sections & Firestore Users with Official Cohort Roster for Zero-Click Search
  const allStudentsList = React.useMemo(() => {
    const map = new Map<string, any>();

    // 1. Map registered Firestore users and live enrolled_students (authentic source of truth)
    const directoryMapByPrn = new Map<string, any>();
    (realDirectoryUsers || []).forEach((u: any) => {
      const prn = (u.prn || '').toUpperCase().trim();
      if (prn) directoryMapByPrn.set(prn, u);
    });

    // Overlay live onSnapshot enrolled_students (0ms real-time updates when student binds email or updates profile)
    liveEnrolledStudentsMap.forEach((enr: any, prn: string) => {
      const existing = directoryMapByPrn.get(prn);
      directoryMapByPrn.set(prn, {
        ...(existing || {}),
        ...enr,
        email: enr.email || existing?.email,
        name: enr.name || enr.fullName || existing?.name || existing?.fullName,
        fullName: enr.fullName || enr.name || existing?.fullName || existing?.name,
      });
    });

    // 2. Add from loaded sections
    sectionsList.forEach((sec: any) => {
      const sName = sec?.sectionName || sec?.subject || 'C Programming';
      const sCode = sec?.joinCode || 'LQ-C31A';
      const studs = Array.isArray(sec?.students) ? sec.students : [];
      studs.forEach((st: any) => {
        const prn = (st.prn || st.student?.prn || '').toUpperCase().trim();
        const dirUser = prn ? directoryMapByPrn.get(prn) : null;
        const boundEmail = typeof window !== 'undefined' && prn ? localStorage.getItem(`logicq_bound_email_${prn}`) : null;
        const candidateEmail = dirUser?.email || boundEmail || st.email || st.student?.email || (prn ? `${prn.toLowerCase()}@sanjivani.edu.in` : '');
        const email = candidateEmail || '';
        const isCustomBound = Boolean(email && !email.endsWith('@sanjivani.edu.in'));
        const name = dirUser?.fullName || dirUser?.displayName || dirUser?.name || st.fullName || st.name || st.student?.fullName || st.student?.displayName || 'Student';
        const key = prn || (email ? email.toLowerCase().trim() : st.id);
        if (key && !map.has(key)) {
          map.set(key, {
            ...st,
            id: st.id || st.student?.id || dirUser?.id || key,
            prn: prn || 'N/A',
            name,
            email,
            isCustomBound,
            isRegistered: true,
            sectionName: sName,
            sectionJoinCode: sCode,
            status: st.status || 'ENROLLED',
            codingProgress: st.codingProgress ?? st.points ?? 0,
          });
        }
      });
    });

    // 3. Fallback / merge with official cohort students so all 116 are instantly searchable
    C_PROGRAMMING_COHORT_STUDENTS.forEach((st) => {
      const key = st.prn.toUpperCase().trim();
      const dirUser = directoryMapByPrn.get(key);
      const boundEmail = typeof window !== 'undefined' ? localStorage.getItem(`logicq_bound_email_${key}`) : null;
      const candidateEmail = dirUser?.email || boundEmail || st.email || `${key.toLowerCase()}@sanjivani.edu.in`;
      const validEmail = candidateEmail || '';
      const isCustomBound = Boolean(validEmail && !validEmail.endsWith('@sanjivani.edu.in'));
      const validName = dirUser?.fullName || dirUser?.displayName || dirUser?.name || st.fullName;

      if (!map.has(key)) {
        map.set(key, {
          id: dirUser?.id || `cohort-${st.prn}`,
          prn: st.prn,
          name: validName,
          email: validEmail,
          isCustomBound,
          isRegistered: true,
          sectionName: st.sectionName || 'C Programming',
          sectionJoinCode: st.joinCode || 'LQ-C31A',
          status: 'ENROLLED',
          codingProgress: 0,
        });
      } else {
        const existing = map.get(key);
        map.set(key, {
          ...existing,
          email: validEmail,
          name: validName,
          isCustomBound,
          isRegistered: true,
        });
      }
    });

    // Sort strictly in ascending order by student PRN / Roll Number (last 4 digits sequence: 1001, 1002, 1003...)
    return Array.from(map.values()).sort((a, b) => {
      const prnA = (a.prn || a.student?.prn || '').trim().toUpperCase();
      const prnB = (b.prn || b.student?.prn || '').trim().toUpperCase();
      if (!prnA) return 1;
      if (!prnB) return -1;
      const numA = parseInt(prnA.replace(/\D/g, '').slice(-4), 10) || 999999;
      const numB = parseInt(prnB.replace(/\D/g, '').slice(-4), 10) || 999999;
      if (numA !== numB) return numA - numB;
      return prnA.localeCompare(prnB, undefined, { numeric: true, sensitivity: 'base' });
    });
  }, [sectionsList, realDirectoryUsers, liveEnrolledStudentsMap]);

  // Filtered Students for Zero-Click Search
  const filteredStudentsList = React.useMemo(() => {
    const q = adminSearchQuery.trim().toLowerCase();
    if (!q) return allStudentsList;
    return allStudentsList.filter((s: any) => {
      const name = (s.name || '').toLowerCase();
      const prn = (s.prn || '').toLowerCase();
      const email = (s.email || '').toLowerCase();
      const sec = (s.sectionName || '').toLowerCase();
      const code = (s.sectionJoinCode || '').toLowerCase();
      return name.includes(q) || prn.includes(q) || email.includes(q) || sec.includes(q) || code.includes(q);
    });
  }, [allStudentsList, adminSearchQuery]);

  const totalEnrolledAcrossSections = sectionsList.reduce((acc: number, s: any) => {
    return acc + (s?._count?.students ?? s?.students?.length ?? 0);
  }, 0);
  const displayTotalStudents = Math.max(globalStats?.totalUsers || 0, allStudentsList.length || 0, 116);
  const activeSectionsCount = Math.max(sectionsList.length, 1);
  const activeTestsCount = testsList.length;
  const totalSubmissionsCount = globalStats?.totalSubmissions || submissionsList.length || 0;

  const stats = statsData?.data?.stats;
  const yesterdaySummary = stats?.yesterdaySummary || statsData?.data?.yesterdaySummary || null;


  // Topic Practice distinct metrics (Curated Topics across 4 modules)
  const practiceTopicsTotal = TOPIC_PRACTICE_DATA.length || 100;
  const practiceEasyTotal = TOPIC_PRACTICE_DATA.filter((t) => t.problem?.difficulty === 'EASY').length || 40;
  const practiceMedTotal = TOPIC_PRACTICE_DATA.filter((t) => t.problem?.difficulty === 'MEDIUM').length || 40;
  const practiceHardTotal = TOPIC_PRACTICE_DATA.filter((t) => t.problem?.difficulty === 'HARD').length || 20;

  const practiceEasySolved = TOPIC_PRACTICE_DATA.filter((t) => t.problem?.difficulty === 'EASY' && solvedTopicIds.includes(t.id)).length;
  const practiceMedSolved = TOPIC_PRACTICE_DATA.filter((t) => t.problem?.difficulty === 'MEDIUM' && solvedTopicIds.includes(t.id)).length;
  const practiceHardSolved = TOPIC_PRACTICE_DATA.filter((t) => t.problem?.difficulty === 'HARD' && solvedTopicIds.includes(t.id)).length;
  const practiceTotalSolved = practiceEasySolved + practiceMedSolved + practiceHardSolved;
  const practiceOverallPercent = practiceTopicsTotal > 0 ? Math.round((practiceTotalSolved / practiceTopicsTotal) * 100) : 0;

  // Lab Internal distinct metrics (Evaluation Problems across 5 Modules)
  const allLabProblems = React.useMemo(() => [
    ...PRACTICE_MODULE_1_PROBLEMS,
    ...PRACTICE_MODULE_2_PROBLEMS,
    ...PRACTICE_MODULE_3_PROBLEMS,
    ...PRACTICE_MODULE_4_PROBLEMS,
    ...PRACTICE_MODULE_5_PROBLEMS,
  ], []);

  const labEasyTotal = allLabProblems.filter((p) => p.difficulty?.toUpperCase() === 'EASY').length || 37;
  const labMedTotal = allLabProblems.filter((p) => p.difficulty?.toUpperCase() === 'MEDIUM').length || 42;
  const labHardTotal = allLabProblems.filter((p) => p.difficulty?.toUpperCase() === 'HARD').length || 22;

  const labEasySolved = allLabProblems.filter((p) => p.difficulty?.toUpperCase() === 'EASY' && solvedTopicIds.includes(p.slug)).length;
  const labMedSolved = allLabProblems.filter((p) => p.difficulty?.toUpperCase() === 'MEDIUM' && solvedTopicIds.includes(p.slug)).length;
  const labHardSolved = allLabProblems.filter((p) => p.difficulty?.toUpperCase() === 'HARD' && solvedTopicIds.includes(p.slug)).length;
  const labTotalSolved = labEasySolved + labMedSolved + labHardSolved;
  const labTotal = allLabProblems.length || 101;
  const labOverallPercent = Math.min(100, Math.round((labTotalSolved / labTotal) * 100));

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

  // Find next unlocked question for 1-click Apple-style direct resume
  const nextUnlockedPracticeTopic = React.useMemo(() => {
    for (const t of TOPIC_PRACTICE_DATA) {
      if (!solvedTopicIds.includes(t.id)) {
        const unlock = getPracticeModuleUnlockInfo(t.moduleIndex, solvedTopicIds, isAdmin || isFaculty);
        if (unlock.isUnlocked) {
          return t;
        }
      }
    }
    return TOPIC_PRACTICE_DATA[0];
  }, [solvedTopicIds, isAdmin, isFaculty]);

  const getNextTopicInModule = (modIdx: number) => {
    const modTopics = TOPIC_PRACTICE_DATA.filter((t) => t.moduleIndex === modIdx);
    const unsolved = modTopics.find((t) => !solvedTopicIds.includes(t.id));
    return unsolved || modTopics[0];
  };

  const labCompletedModules = [isLab1Complete, isLab2Complete, isLab3Complete, isLab4Complete, isLab5Complete].filter(Boolean).length;
  const labInternalScore = Math.min(20, Math.round((labCompletedModules / 5) * 20));

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

    // Check locally recorded activity dates from any challenge or practice submission
    try {
      const rawLocalDates = localStorage.getItem('logicq_user_activity_dates');
      if (rawLocalDates) {
        const arr = JSON.parse(rawLocalDates);
        if (Array.isArray(arr)) {
          arr.forEach((d: string) => d && dates.add(d));
        }
      }
    } catch {}

    // Check stats.lastSolvedDate
    if (stats?.lastSolvedDate) {
      try {
        const d = stats.lastSolvedDate.split('T')[0];
        if (d) dates.add(d);
      } catch {}
    }

    if (isDailySolved) {
      const todayStr = new Date().toISOString().split('T')[0];
      dates.add(todayStr);
    }

    return dates;
  }, [studentSubmissionsList, isDailySolved, stats?.lastSolvedDate]);

  // Calculate real consecutive daily streak strictly based on actual submissions:
  // Streak only counts if student submitted on that day
  const computedStreak = React.useMemo(() => {
    if (studentSubmissionDates.size === 0) return 0;

    const todayStr = new Date().toISOString().split('T')[0];
    const hasSubmittedToday = studentSubmissionDates.has(todayStr);

    // When student hasn't submitted anything today, streak does not count today
    if (!hasSubmittedToday) {
      return 0;
    }

    let streak = 0;
    let checkDate = new Date();

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
      
      {/* EXECUTIVE ADMIN & FACULTY HOME DASHBOARD (APPLE HIG MINIMALIST REDESIGN) */}
      {!isStudent ? (
        <div className="space-y-5 sm:space-y-6 animate-in fade-in duration-200">
          
          {/* 1. APPLE CONTROL CENTER HERO BAR */}
          <div className="relative overflow-hidden rounded-3xl border border-slate-200/80 dark:border-slate-800/80 bg-white/80 dark:bg-[#0c1017]/85 backdrop-blur-xl p-5 sm:p-7 shadow-xs">
            {/* Ambient subtle light glows */}
            <div className="absolute -top-20 -left-20 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute -bottom-20 -right-20 w-64 h-64 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />

            <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-5">
              <div className="flex items-center gap-4">
                <div className="relative">
                  <div
                    className={`w-12 h-12 sm:w-14 sm:h-14 rounded-2xl flex items-center justify-center text-xl font-black shadow-sm shrink-0 border ${
                      isAdmin
                        ? 'bg-gradient-to-br from-amber-400 via-amber-500 to-amber-600 text-slate-950 border-amber-300/40 shadow-amber-500/20'
                        : 'bg-gradient-to-br from-indigo-500 via-indigo-600 to-cyan-500 text-white border-indigo-400/40 shadow-indigo-500/20'
                    }`}
                  >
                    {(user?.displayName || user?.fullName || (isAdmin ? 'Admin' : 'Faculty'))[0]?.toUpperCase() || 'A'}
                  </div>
                  <span
                    className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-emerald-500 border-2 border-white dark:border-[#0c1017] shadow-xs"
                    title="Live Active Session"
                  />
                </div>

                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white">
                      Welcome, {resolveGreetingName(user, auth.currentUser?.displayName) !== 'Student' ? resolveGreetingName(user, auth.currentUser?.displayName) : (isAdmin ? 'Administrator' : 'Instructor')}
                    </h1>
                    <span
                      className={`text-[10px] font-mono font-bold px-2.5 py-0.5 rounded-full border tracking-wide uppercase ${
                        isAdmin
                          ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30'
                          : 'bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 border-indigo-500/30'
                      }`}
                    >
                      {isAdmin ? 'ADMINISTRATOR' : 'FACULTY'}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 font-mono flex items-center gap-2">
                    <span>Academic Year 2026-2027</span>
                    <span>•</span>
                    <span className="truncate">Sanjivani Education Society</span>
                  </p>
                </div>
              </div>

              {/* Action Capsule: Apple-style frosted pill group */}
              <div className="flex items-center gap-2 shrink-0 self-stretch sm:self-auto justify-end flex-wrap">
                <Link
                  to="/faculty/tests"
                  className="px-3.5 sm:px-4 py-2 rounded-xl text-xs font-semibold bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 text-white shadow-sm shadow-indigo-600/25 transition-all flex items-center gap-1.5 cursor-pointer transform hover:scale-[1.02] active:scale-[0.98]"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Create Test</span>
                </Link>

                <Link
                  to="/faculty/sections"
                  className="px-3 sm:px-3.5 py-2 rounded-xl text-xs font-semibold border border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-[#121826]/80 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  <GraduationCap className="w-3.5 h-3.5 text-indigo-500" />
                  <span>New Section</span>
                </Link>

                {isAdmin && (
                  <Link
                    to="/admin"
                    className="px-3 sm:px-3.5 py-2 rounded-xl text-xs font-semibold border border-amber-500/30 bg-amber-500/10 hover:bg-amber-500/20 text-amber-600 dark:text-amber-400 transition-all flex items-center gap-1.5 cursor-pointer"
                  >
                    <ShieldCheck className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Admin Console</span>
                    <span className="sm:hidden">Admin</span>
                  </Link>
                )}

                <button
                  type="button"
                  onClick={handleRefreshAdminDashboard}
                  disabled={isRefreshingDashboard}
                  className="p-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-[#121826]/80 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 transition-all cursor-pointer"
                  title="Refresh live data"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isRefreshingDashboard ? 'animate-spin text-indigo-500' : ''}`} />
                </button>
              </div>
            </div>
          </div>

          {/* 2. APPLE SPOTLIGHT UNIFIED SEARCH (ZERO-CLICK ROSTER & SECTION LOOKUP) */}
          <div className="relative">
            <div className="relative flex items-center">
              <Search className="w-4 h-4 text-slate-400 absolute left-4 pointer-events-none" />
              <input
                type="text"
                value={adminSearchQuery}
                onChange={(e) => {
                  setAdminSearchQuery(e.target.value);
                  if (e.target.value.trim() && adminActiveTab !== 'roster') {
                    setAdminActiveTab('roster');
                  }
                }}
                placeholder="Instant search: Student PRN (e.g. 2126...), Full Name, Section, or Test..."
                className="w-full pl-11 pr-24 py-3 rounded-2xl bg-white/80 dark:bg-[#0c1017]/80 backdrop-blur-md border border-slate-200/80 dark:border-slate-800/80 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 shadow-xs transition-all font-mono"
              />
              {adminSearchQuery && (
                <button
                  type="button"
                  onClick={() => setAdminSearchQuery('')}
                  className="absolute right-3 px-2 py-1 rounded-lg text-xs font-mono text-slate-400 hover:text-slate-200 bg-slate-100 dark:bg-slate-800 cursor-pointer"
                >
                  Clear
                </button>
              )}
            </div>
          </div>

          {/* 3. APPLE INTERACTIVE 3-METRIC STRIP (1-CLICK DIRECT TAB SWITCHING) */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
            {/* Metric 1: Enrolled Students */}
            <button
              type="button"
              onClick={() => setAdminActiveTab('roster')}
              className={`text-left p-4 sm:p-5 rounded-2xl border transition-all cursor-pointer group ${
                adminActiveTab === 'roster'
                  ? 'border-indigo-500/60 bg-indigo-50/50 dark:bg-indigo-950/25 shadow-sm shadow-indigo-500/10'
                  : 'border-slate-200/80 dark:border-slate-800/80 bg-white/80 dark:bg-[#0c1017]/80 hover:border-indigo-500/40 hover:bg-slate-50 dark:hover:bg-slate-800/50'
              }`}
            >
              <div className="flex items-center justify-between text-xs font-mono text-slate-500 dark:text-slate-400 mb-2">
                <span className="font-bold tracking-wider">STUDENTS</span>
                <div className="w-8 h-8 rounded-xl bg-indigo-500/10 text-indigo-500 flex items-center justify-center shrink-0">
                  <Users className="w-4 h-4" />
                </div>
              </div>
              <div className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white font-mono tracking-tight">
                {displayTotalStudents}
              </div>
              <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                <span>Active Roster</span>
                <span className="text-indigo-500 font-bold group-hover:translate-x-0.5 transition-transform flex items-center gap-0.5">
                  View →
                </span>
              </div>
            </button>

            {/* Metric 2: Active Divisions */}
            <button
              type="button"
              onClick={() => setAdminActiveTab('sections')}
              className={`text-left p-4 sm:p-5 rounded-2xl border transition-all cursor-pointer group ${
                adminActiveTab === 'sections'
                  ? 'border-purple-500/60 bg-purple-50/50 dark:bg-purple-950/25 shadow-sm shadow-purple-500/10'
                  : 'border-slate-200/80 dark:border-slate-800/80 bg-white/80 dark:bg-[#0c1017]/80 hover:border-purple-500/40 hover:bg-slate-50 dark:hover:bg-slate-800/50'
              }`}
            >
              <div className="flex items-center justify-between text-xs font-mono text-slate-500 dark:text-slate-400 mb-2">
                <span className="font-bold tracking-wider">DIVISIONS</span>
                <div className="w-8 h-8 rounded-xl bg-purple-500/10 text-purple-500 flex items-center justify-center shrink-0">
                  <GraduationCap className="w-4 h-4" />
                </div>
              </div>
              <div className="text-2xl sm:text-3xl font-black text-purple-600 dark:text-purple-400 font-mono tracking-tight">
                {activeSectionsCount}
              </div>
              <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                <span>C Programming</span>
                <span className="text-purple-500 font-bold group-hover:translate-x-0.5 transition-transform flex items-center gap-0.5">
                  Codes →
                </span>
              </div>
            </button>

            {/* Metric 3: Assessment Tests */}
            <button
              type="button"
              onClick={() => setAdminActiveTab('tests')}
              className={`text-left p-4 sm:p-5 rounded-2xl border transition-all cursor-pointer group ${
                adminActiveTab === 'tests'
                  ? 'border-cyan-500/60 bg-cyan-50/50 dark:bg-cyan-950/25 shadow-sm shadow-cyan-500/10'
                  : 'border-slate-200/80 dark:border-slate-800/80 bg-white/80 dark:bg-[#0c1017]/80 hover:border-cyan-500/40 hover:bg-slate-50 dark:hover:bg-slate-800/50'
              }`}
            >
              <div className="flex items-center justify-between text-xs font-mono text-slate-500 dark:text-slate-400 mb-2">
                <span className="font-bold tracking-wider">TESTS</span>
                <div className="w-8 h-8 rounded-xl bg-cyan-500/10 text-cyan-500 flex items-center justify-center shrink-0">
                  <Calendar className="w-4 h-4" />
                </div>
              </div>
              <div className="text-2xl sm:text-3xl font-black text-cyan-600 dark:text-cyan-400 font-mono tracking-tight">
                {activeTestsCount}
              </div>
              <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                <span>Practicals</span>
                <span className="text-cyan-500 font-bold group-hover:translate-x-0.5 transition-transform flex items-center gap-0.5">
                  Manage →
                </span>
              </div>
            </button>
          </div>

          {/* 4. APPLE SEGMENTED CONTROL BAR (ZERO-CLICK TABS) */}
          <div className="flex items-center gap-1.5 p-1 rounded-2xl bg-slate-100 dark:bg-[#080c14] border border-slate-200/80 dark:border-slate-800/80 overflow-x-auto select-none">
            <button
              type="button"
              onClick={() => setAdminActiveTab('overview')}
              className={`px-3.5 py-2 rounded-xl text-xs font-mono font-bold transition-all cursor-pointer whitespace-nowrap shrink-0 flex items-center gap-1.5 ${
                adminActiveTab === 'overview'
                  ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Activity className="w-3.5 h-3.5 text-indigo-500" />
              <span>Overview</span>
            </button>

            <button
              type="button"
              onClick={() => setAdminActiveTab('roster')}
              className={`px-3.5 py-2 rounded-xl text-xs font-mono font-bold transition-all cursor-pointer whitespace-nowrap shrink-0 flex items-center gap-1.5 ${
                adminActiveTab === 'roster'
                  ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Users className="w-3.5 h-3.5 text-indigo-500" />
              <span>Students Roster</span>
              <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-indigo-500/10 text-indigo-500 font-bold">
                {filteredStudentsList.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setAdminActiveTab('sections')}
              className={`px-3.5 py-2 rounded-xl text-xs font-mono font-bold transition-all cursor-pointer whitespace-nowrap shrink-0 flex items-center gap-1.5 ${
                adminActiveTab === 'sections'
                  ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <GraduationCap className="w-3.5 h-3.5 text-purple-500" />
              <span>Class Sections</span>
              <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-purple-500/10 text-purple-500 font-bold">
                {activeSectionsCount}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setAdminActiveTab('tests')}
              className={`px-3.5 py-2 rounded-xl text-xs font-mono font-bold transition-all cursor-pointer whitespace-nowrap shrink-0 flex items-center gap-1.5 ${
                adminActiveTab === 'tests'
                  ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Calendar className="w-3.5 h-3.5 text-cyan-500" />
              <span>Tests & Exams</span>
              <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-cyan-500/10 text-cyan-500 font-bold">
                {activeTestsCount}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setAdminActiveTab('submissions')}
              className={`px-3.5 py-2 rounded-xl text-xs font-mono font-bold transition-all cursor-pointer whitespace-nowrap shrink-0 flex items-center gap-1.5 ${
                adminActiveTab === 'submissions'
                  ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Zap className="w-3.5 h-3.5 text-emerald-500" />
              <span>Live Submissions</span>
            </button>
          </div>

          {/* 5. TAB CONTENTS */}
          
          {/* TAB 1: OVERVIEW */}
          {adminActiveTab === 'overview' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
              {/* Left Column: Sections & Roster Quick Card (7 cols) */}
              <div className="lg:col-span-7 space-y-5">
                {/* Classroom Section Join Card */}
                <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800/80 bg-white/80 dark:bg-[#0c1017]/80 p-5 space-y-4 shadow-xs">
                  <div className="flex items-center justify-between border-b border-slate-200/80 dark:border-slate-800/80 pb-3">
                    <div className="flex items-center gap-2">
                      <GraduationCap className="w-4 h-4 text-indigo-500" />
                      <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                        Classroom Join Codes
                      </h2>
                    </div>
                    <Link
                      to="/faculty/sections"
                      className="text-xs font-mono font-semibold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1"
                    >
                      <span>Manage All</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>

                  <div className="space-y-3">
                    {sectionsList.slice(0, 3).map((sec: any) => {
                      const count = sec?._count?.students ?? sec?.students?.length ?? (sec.joinCode === 'LQ-C31A' ? 116 : 0);
                      const sName = sec?.sectionName || sec?.name || 'C Programming';
                      const subj = sec?.subject || 'C Programming';
                      const jCode = sec?.joinCode || 'LQ-C31A';
                      const isCopied = copiedCodeKey === `code-${sec?.id || jCode}`;

                      return (
                        <div
                          key={sec?.id || jCode}
                          className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-4 rounded-xl border border-slate-200/80 dark:border-slate-800/80 bg-slate-50/60 dark:bg-[#111622]/60 hover:border-indigo-500/40 transition"
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-500/20 to-purple-500/20 text-indigo-600 dark:text-indigo-400 border border-indigo-500/30 flex items-center justify-center font-mono font-bold text-xs shrink-0">
                              {sName.slice(0, 3).toUpperCase()}
                            </div>
                            <div>
                              <div className="font-bold text-sm text-slate-900 dark:text-white">
                                {sName}
                              </div>
                              <div className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-2 mt-0.5 font-mono">
                                <span>{count} students enrolled</span>
                                <span>•</span>
                                <span>{subj}</span>
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-1.5 self-end sm:self-center">
                            <button
                              type="button"
                              onClick={() => handleCopyCode(jCode, `code-${sec?.id || jCode}`)}
                              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg font-mono text-xs font-bold bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20 hover:bg-indigo-500/20 transition cursor-pointer"
                              title="1-Click Copy Code"
                            >
                              <span>{jCode}</span>
                              {isCopied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                            </button>

                            <button
                              type="button"
                              onClick={() => handleShareWhatsApp(sec)}
                              className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-500 hover:text-emerald-500 hover:bg-emerald-500/10 transition cursor-pointer"
                              title="Share on WhatsApp"
                            >
                              <Share2 className="w-3.5 h-3.5" />
                            </button>

                            <button
                              type="button"
                              onClick={() => setAdminActiveTab('roster')}
                              className="px-2.5 py-1.5 rounded-lg text-xs font-mono font-semibold bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition cursor-pointer"
                              title="View Roster"
                            >
                              Roster
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Quick Roster Teaser (Top 5 Students) */}
                <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800/80 bg-white/80 dark:bg-[#0c1017]/80 p-5 space-y-3 shadow-xs">
                  <div className="flex items-center justify-between border-b border-slate-200/80 dark:border-slate-800/80 pb-3">
                    <div className="flex items-center gap-2">
                      <Users className="w-4 h-4 text-indigo-500" />
                      <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                        Recent Enrolled Students
                      </h2>
                    </div>
                    <button
                      type="button"
                      onClick={() => setAdminActiveTab('roster')}
                      className="text-xs font-mono font-semibold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      <span>View All ({allStudentsList.length})</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="divide-y divide-slate-100 dark:divide-slate-800/60 font-mono text-xs">
                    {allStudentsList.slice(0, 5).map((st: any, idx: number) => (
                      <div key={st.id || idx} className="py-2.5 flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2.5 truncate">
                          <span className="w-6 h-6 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-500 text-[11px] font-bold flex items-center justify-center shrink-0">
                            {idx + 1}
                          </span>
                          <div className="truncate">
                            <span className="font-semibold text-slate-900 dark:text-white">{st.name}</span>
                            <span className="text-[11px] text-slate-400 ml-2">{st.prn}</span>
                          </div>
                        </div>
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 shrink-0">
                          ENROLLED
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Right Column: Apple Launchpad + Live Activity (5 cols) */}
              <div className="lg:col-span-5 space-y-5">
                {/* Apple Control Center 4-Icon Launchpad */}
                <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800/80 bg-white/80 dark:bg-[#0c1017]/80 p-5 space-y-3 shadow-xs">
                  <h2 className="text-xs font-mono font-bold uppercase tracking-wider text-slate-400">
                    Quick Workspaces
                  </h2>
                  <div className="grid grid-cols-2 gap-2.5">
                    <Link
                      to="/faculty/tests"
                      className="p-3.5 rounded-xl border border-slate-200/80 dark:border-slate-800/80 bg-slate-50/60 dark:bg-[#111622]/60 hover:border-cyan-500/40 hover:bg-cyan-500/5 transition flex flex-col justify-between group"
                    >
                      <Calendar className="w-5 h-5 text-cyan-500 mb-2 group-hover:scale-110 transition-transform" />
                      <div>
                        <div className="font-bold text-xs text-slate-900 dark:text-white">Create Test</div>
                        <div className="text-[10px] text-slate-400 font-mono">Exam scheduler</div>
                      </div>
                    </Link>

                    <Link
                      to="/faculty/sections"
                      className="p-3.5 rounded-xl border border-slate-200/80 dark:border-slate-800/80 bg-slate-50/60 dark:bg-[#111622]/60 hover:border-indigo-500/40 hover:bg-indigo-500/5 transition flex flex-col justify-between group"
                    >
                      <GraduationCap className="w-5 h-5 text-indigo-500 mb-2 group-hover:scale-110 transition-transform" />
                      <div>
                        <div className="font-bold text-xs text-slate-900 dark:text-white">Sections</div>
                        <div className="text-[10px] text-slate-400 font-mono">Rosters & codes</div>
                      </div>
                    </Link>

                    <Link
                      to="/faculty/analytics"
                      className="p-3.5 rounded-xl border border-slate-200/80 dark:border-slate-800/80 bg-slate-50/60 dark:bg-[#111622]/60 hover:border-emerald-500/40 hover:bg-emerald-500/5 transition flex flex-col justify-between group"
                    >
                      <TrendingUp className="w-5 h-5 text-emerald-500 mb-2 group-hover:scale-110 transition-transform" />
                      <div>
                        <div className="font-bold text-xs text-slate-900 dark:text-white">Analytics</div>
                        <div className="text-[10px] text-slate-400 font-mono">Pass rates</div>
                      </div>
                    </Link>

                    <Link
                      to="/faculty/questions"
                      className="p-3.5 rounded-xl border border-slate-200/80 dark:border-slate-800/80 bg-slate-50/60 dark:bg-[#111622]/60 hover:border-purple-500/40 hover:bg-purple-500/5 transition flex flex-col justify-between group"
                    >
                      <BookOpen className="w-5 h-5 text-purple-500 mb-2 group-hover:scale-110 transition-transform" />
                      <div>
                        <div className="font-bold text-xs text-slate-900 dark:text-white">Questions</div>
                        <div className="text-[10px] text-slate-400 font-mono">AI Generator</div>
                      </div>
                    </Link>
                  </div>
                </div>

                {/* Live Activity Stream */}
                <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800/80 bg-white/80 dark:bg-[#0c1017]/80 p-5 space-y-3 shadow-xs">
                  <div className="flex items-center justify-between border-b border-slate-200/80 dark:border-slate-800/80 pb-3">
                    <div className="flex items-center gap-2">
                      <Activity className="w-4 h-4 text-emerald-500" />
                      <h2 className="text-xs font-mono font-bold uppercase tracking-wider text-slate-900 dark:text-white">
                        Live Submissions
                      </h2>
                    </div>
                    <button
                      type="button"
                      onClick={() => setAdminActiveTab('submissions')}
                      className="text-[11px] font-mono text-indigo-500 hover:underline cursor-pointer"
                    >
                      All →
                    </button>
                  </div>

                  {submissionsList.length === 0 ? (
                    <div className="py-6 text-center space-y-1.5 font-mono text-xs text-slate-400">
                      <CheckCircle2 className="w-6 h-6 text-emerald-500 mx-auto opacity-40" />
                      <p>GCC 14.2 Judge listening for submissions.</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {submissionsList.slice(0, 5).map((sub: any, idx: number) => {
                        const verdict = sub?.verdict || 'PENDING';
                        const isAcc = verdict === 'ACCEPTED';
                        return (
                          <div
                            key={sub?.id || idx}
                            className="flex items-center justify-between p-2.5 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-[#111622]/50 text-xs font-mono"
                          >
                            <div className="truncate max-w-[65%] space-y-0.5">
                              <div className="font-semibold text-slate-900 dark:text-white truncate">
                                {sub?.user?.fullName || sub?.user?.username || 'Student'}
                              </div>
                              <div className="text-[10px] text-slate-400 truncate">
                                {sub?.problem?.title || 'C Program'} • {sub?.runtimeMs || 12}ms
                              </div>
                            </div>
                            <span
                              className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                                isAcc
                                  ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20'
                                  : 'bg-rose-500/10 text-rose-500 border border-rose-500/20'
                              }`}
                            >
                              {verdict}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: STUDENTS ROSTER (THE GAME-CHANGER: FULL ZERO-CLICK ROSTER DIRECTLY ON DASHBOARD) */}
          {adminActiveTab === 'roster' && (
            <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800/80 bg-white/80 dark:bg-[#0c1017]/80 p-5 space-y-4 shadow-xs">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-slate-200/80 dark:border-slate-800/80 pb-3">
                <div className="flex items-center gap-2">
                  <Users className="w-5 h-5 text-indigo-500" />
                  <div>
                    <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                      Enrolled Students Roster ({filteredStudentsList.length})
                    </h2>
                    <p className="text-[11px] text-slate-400 font-mono">
                      Integrated M.Tech / FY Computer Science • Official Student Profiles
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 self-stretch sm:self-auto">
                  <Link
                    to="/faculty/sections"
                    className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white transition cursor-pointer flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Student</span>
                  </Link>
                </div>
              </div>

              {filteredStudentsList.length === 0 ? (
                <div className="py-12 text-center space-y-2 font-mono">
                  <p className="text-xs text-slate-400">No students found matching &quot;{adminSearchQuery}&quot;</p>
                  <button
                    type="button"
                    onClick={() => setAdminSearchQuery('')}
                    className="px-3 py-1 rounded-lg bg-slate-200 dark:bg-slate-800 text-xs font-bold text-slate-700 dark:text-slate-300"
                  >
                    Reset Filter
                  </button>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left font-mono text-xs">
                    <thead>
                      <tr className="border-b border-slate-200/80 dark:border-slate-800/80 text-[10px] text-slate-400 uppercase tracking-wider">
                        <th className="py-2.5 px-3">#</th>
                        <th className="py-2.5 px-3">Student Name</th>
                        <th className="py-2.5 px-3">PRN / Roll No</th>
                        <th className="py-2.5 px-3">Section</th>
                        <th className="py-2.5 px-3">Status</th>
                        <th className="py-2.5 px-3 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800/50">
                      {filteredStudentsList.map((st: any, idx: number) => {
                        const isCopied = copiedCodeKey === `prn-${st.prn}`;
                        return (
                          <tr key={st.id || idx} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition">
                            <td className="py-3 px-3 text-slate-400 font-bold">{idx + 1}</td>
                            <td className="py-3 px-3">
                              <div className="font-bold text-slate-900 dark:text-white font-sans text-xs">
                                {st.name}
                              </div>
                              <div className="text-[11px] font-mono truncate max-w-xs flex items-center gap-1.5 mt-0.5">
                                <span className={st.isCustomBound ? "text-emerald-600 dark:text-emerald-400 font-medium" : "text-slate-400"}>
                                  {st.email || (st.prn ? `${st.prn.toLowerCase()}@sanjivani.edu.in` : '—')}
                                </span>
                                {st.isCustomBound ? (
                                  <span className="text-[9px] px-1.5 py-0.2 rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-semibold border border-emerald-500/20 inline-flex items-center gap-0.5">
                                    ✓ Bound
                                  </span>
                                ) : (
                                  <span className="text-[9px] px-1.5 py-0.2 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-400 font-medium border border-slate-200/60 dark:border-slate-700/60">
                                    Official ID
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="py-3 px-3 font-bold text-indigo-600 dark:text-indigo-400 font-mono">
                              <button
                                type="button"
                                onClick={() => handleCopyCode(st.prn, `prn-${st.prn}`, 'PRN')}
                                className="inline-flex items-center gap-1.5 hover:underline cursor-pointer group text-left"
                                title="Click to copy PRN"
                              >
                                <span>{st.prn}</span>
                                {isCopied ? (
                                  <span className="text-[10px] text-emerald-500 font-semibold inline-flex items-center gap-0.5">
                                    <Check className="w-3 h-3" /> Copied
                                  </span>
                                ) : (
                                  <Copy className="w-3 h-3 text-slate-400 group-hover:text-indigo-500 opacity-60 group-hover:opacity-100 transition" />
                                )}
                              </button>
                            </td>
                            <td className="py-3 px-3 text-slate-500 dark:text-slate-400">
                              <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-[10px]">
                                {st.sectionName}
                              </span>
                            </td>
                            <td className="py-3 px-3">
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                                ENROLLED
                              </span>
                            </td>
                            <td className="py-3 px-3 text-right whitespace-nowrap">
                              <button
                                type="button"
                                onClick={() => setSelectedDashboardStudent(st)}
                                className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold transition cursor-pointer inline-flex items-center gap-1.5 shadow-sm hover:shadow-indigo-500/25 active:scale-95"
                                title="View Student Coding Progress & Activity"
                              >
                                <BarChart2 className="w-3.5 h-3.5 text-indigo-200" />
                                <span>View Progress</span>
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: CLASS SECTIONS */}
          {adminActiveTab === 'sections' && (
            <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800/80 bg-white/80 dark:bg-[#0c1017]/80 p-5 space-y-4 shadow-xs">
              <div className="flex items-center justify-between border-b border-slate-200/80 dark:border-slate-800/80 pb-3">
                <div className="flex items-center gap-2">
                  <GraduationCap className="w-5 h-5 text-purple-500" />
                  <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                    Classroom Sections & Join Codes ({sectionsList.length})
                  </h2>
                </div>
                <Link
                  to="/faculty/sections"
                  className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-purple-600 hover:bg-purple-500 text-white transition cursor-pointer flex items-center gap-1"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Create Section</span>
                </Link>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {sectionsList.map((sec: any) => {
                  const count = sec?._count?.students ?? sec?.students?.length ?? (sec.joinCode === 'LQ-C31A' ? 116 : 0);
                  const sName = sec?.sectionName || sec?.name || 'C Programming';
                  const subj = sec?.subject || 'C Programming';
                  const jCode = sec?.joinCode || 'LQ-C31A';
                  const isCopied = copiedCodeKey === `code-${sec?.id || jCode}`;

                  return (
                    <div
                      key={sec?.id || jCode}
                      className="p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800/80 bg-slate-50/50 dark:bg-[#111622]/50 space-y-4 hover:border-purple-500/40 transition"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <h3 className="font-bold text-base text-slate-900 dark:text-white font-sans">
                            {sName}
                          </h3>
                          <p className="text-xs text-slate-400 font-mono mt-0.5">{subj}</p>
                        </div>
                        <span className="px-2.5 py-1 rounded-full text-xs font-mono font-bold bg-purple-500/10 text-purple-500 border border-purple-500/20">
                          {count} Students
                        </span>
                      </div>

                      <div className="p-3.5 rounded-xl bg-white dark:bg-[#0c1017] border border-slate-200 dark:border-slate-800 flex items-center justify-between">
                        <div>
                          <div className="text-[10px] text-slate-400 uppercase font-mono font-bold">
                            Join Code
                          </div>
                          <div className="text-lg font-black font-mono text-purple-600 dark:text-purple-400 tracking-wider">
                            {jCode}
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleCopyCode(jCode, `code-${sec?.id || jCode}`)}
                            className="px-3 py-1.5 rounded-lg text-xs font-mono font-bold bg-purple-500/10 hover:bg-purple-500/20 text-purple-600 dark:text-purple-400 border border-purple-500/20 transition cursor-pointer flex items-center gap-1"
                          >
                            {isCopied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                            <span>{isCopied ? 'Copied' : 'Copy'}</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleShareWhatsApp(sec)}
                            className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-500 hover:text-emerald-500 transition cursor-pointer"
                            title="Share on WhatsApp"
                          >
                            <Share2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      <div className="flex items-center justify-between pt-1">
                        <button
                          type="button"
                          onClick={() => setAdminActiveTab('roster')}
                          className="text-xs font-mono font-semibold text-purple-600 dark:text-purple-400 hover:underline cursor-pointer"
                        >
                          View {count} Students Roster →
                        </button>
                        <Link
                          to="/faculty/sections"
                          className="text-xs font-mono text-slate-400 hover:text-slate-200"
                        >
                          Manage →
                        </Link>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 4: TESTS & EXAMS */}
          {adminActiveTab === 'tests' && (
            <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800/80 bg-white/80 dark:bg-[#0c1017]/80 p-5 space-y-4 shadow-xs">
              <div className="flex items-center justify-between border-b border-slate-200/80 dark:border-slate-800/80 pb-3">
                <div className="flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-cyan-500" />
                  <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                    Assessment Tests & Practicals ({testsList.length})
                  </h2>
                </div>
                <Link
                  to="/faculty/tests"
                  className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-cyan-600 hover:bg-cyan-500 text-white transition cursor-pointer flex items-center gap-1"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Create Test</span>
                </Link>
              </div>

              {testsList.length === 0 ? (
                <div className="py-12 text-center space-y-3 font-mono">
                  <Calendar className="w-8 h-8 text-cyan-500/50 mx-auto" />
                  <p className="text-xs text-slate-400">No assessment tests created yet.</p>
                  <Link
                    to="/faculty/tests"
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-cyan-600 hover:bg-cyan-500 text-white"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Create First Test</span>
                  </Link>
                </div>
              ) : (
                <div className="space-y-3">
                  {testsList.map((test: any, idx: number) => (
                    <div
                      key={test?.id || idx}
                      className="p-4 rounded-xl border border-slate-200/80 dark:border-slate-800/80 bg-slate-50/50 dark:bg-[#111622]/50 flex items-center justify-between gap-3"
                    >
                      <div>
                        <div className="font-bold text-sm text-slate-900 dark:text-white font-sans">
                          {test?.title || 'Assessment Test'}
                        </div>
                        <div className="text-[11px] text-slate-400 font-mono flex items-center gap-2 mt-0.5">
                          <span>{test?.durationMinutes || 60} mins</span>
                          <span>•</span>
                          <span>{test?.totalQuestions || test?.questions?.length || 2} Problems</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                          {test?.status || 'ACTIVE'}
                        </span>
                        <Link
                          to="/faculty/tests"
                          className="px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-mono text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                        >
                          Open
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 5: LIVE SUBMISSIONS */}
          {adminActiveTab === 'submissions' && (
            <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800/80 bg-white/80 dark:bg-[#0c1017]/80 p-5 space-y-4 shadow-xs">
              <div className="flex items-center justify-between border-b border-slate-200/80 dark:border-slate-800/80 pb-3">
                <div className="flex items-center gap-2">
                  <Zap className="w-5 h-5 text-emerald-500" />
                  <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                    Live Submission Telemetry
                  </h2>
                </div>
                <div className="flex items-center gap-1.5 text-xs font-mono text-emerald-500 font-bold">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span>Real-time GCC 14.2 Judge</span>
                </div>
              </div>

              {submissionsList.length === 0 ? (
                <div className="py-12 text-center space-y-2 font-mono">
                  <CheckCircle2 className="w-8 h-8 text-emerald-500/50 mx-auto" />
                  <p className="text-xs text-slate-400">No student submissions in queue.</p>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {submissionsList.map((sub: any, idx: number) => {
                    const verdict = sub?.verdict || 'PENDING';
                    const isAcc = verdict === 'ACCEPTED';
                    return (
                      <div
                        key={sub?.id || idx}
                        className="p-3 rounded-xl border border-slate-200/80 dark:border-slate-800/80 bg-slate-50/50 dark:bg-[#111622]/50 flex items-center justify-between gap-3 font-mono text-xs"
                      >
                        <div>
                          <div className="font-bold text-slate-900 dark:text-white font-sans text-xs">
                            {sub?.user?.fullName || sub?.user?.username || 'Student'}
                          </div>
                          <div className="text-[11px] text-slate-400 font-mono mt-0.5">
                            {sub?.problem?.title || 'C Program'} • {sub?.runtimeMs || 12}ms
                          </div>
                        </div>
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                            isAcc
                              ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20'
                              : 'bg-rose-500/10 text-rose-500 border border-rose-500/20'
                          }`}
                        >
                          {verdict}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      ) : (
        /* ========================================================================= */
        /* APPLE-STYLE MINIMALIST & INTUITIVE STUDENT PORTAL (ZERO CLUTTER)         */
        /* ========================================================================= */
        <div className="space-y-6 sm:space-y-8 animate-in fade-in duration-300 font-sans">
          {/* 1. APPLE FROSTED HERO CARD (1-CLICK DIRECT TO CODE) */}
          <div className="relative overflow-hidden rounded-3xl border border-slate-200/80 dark:border-slate-800/80 bg-white/80 dark:bg-slate-900/70 backdrop-blur-2xl p-6 sm:p-8 shadow-sm">
            {/* Ambient Background Glows */}
            <div className="absolute -top-24 -left-24 w-72 h-72 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute -bottom-24 -right-24 w-72 h-72 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

            {/* Top Row: User Avatar & Context */}
            <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-200/60 dark:border-slate-800/60">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-indigo-600 to-cyan-500 p-[2px] shadow-sm flex items-center justify-center shrink-0">
                  <div className="w-full h-full bg-slate-900 rounded-[14px] flex items-center justify-center text-xl font-bold font-mono text-white">
                    {(user?.fullName || user?.displayName || 'S').charAt(0).toUpperCase()}
                  </div>
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
                      {greeting.text}
                    </span>
                    <span className="text-slate-300 dark:text-slate-700">•</span>
                    <span className="text-xs font-mono text-slate-500 dark:text-slate-400">
                      {user?.prn || 'STUDENT'}
                    </span>
                  </div>
                  <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
                    {user?.prn === '2126PMIM1039'
                      ? 'Pratik Thorat'
                      : resolveGreetingName(user, auth.currentUser?.displayName)}
                  </h1>
                </div>
              </div>

              <div className="flex items-center gap-2 text-xs font-mono">
                <span className="px-3.5 py-1.5 rounded-full bg-slate-100 dark:bg-slate-800/90 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 flex items-center gap-2 font-medium">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span>{sectionDisplayName}</span>
                </span>
              </div>
            </div>

            {/* Next Up Hero Action (1-Click to Monaco Editor) */}
            <div className="relative z-10 mt-6 p-5 sm:p-6 rounded-2xl bg-gradient-to-br from-indigo-50/70 via-white/80 to-indigo-50/30 dark:from-indigo-950/20 dark:via-slate-900/40 dark:to-slate-900/60 border border-indigo-100 dark:border-indigo-900/40 flex flex-col md:flex-row md:items-center justify-between gap-5">
              <div className="space-y-1.5">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold tracking-widest uppercase px-2.5 py-0.5 rounded-full bg-indigo-600 text-white shadow-xs">
                    Next Up
                  </span>
                  <span className="text-xs font-mono text-slate-500 dark:text-slate-400">
                    Module {nextUnlockedPracticeTopic.moduleIndex} · {nextUnlockedPracticeTopic.problem?.difficulty || 'EASY'}
                  </span>
                </div>
                <h2 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white">
                  {nextUnlockedPracticeTopic.topicTitle}
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-1 max-w-xl">
                  {nextUnlockedPracticeTopic.summary || nextUnlockedPracticeTopic.problem?.description || 'Master C programming logic with live compiler execution and instant test case verdicts.'}
                </p>
              </div>

              <div className="flex items-center gap-3 shrink-0">
                <Link
                  to={`/practice?topic=${nextUnlockedPracticeTopic.id}`}
                  className="w-full sm:w-auto px-6 py-3 rounded-full bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-sm transition-all shadow-md shadow-indigo-600/25 hover:shadow-indigo-600/35 flex items-center justify-center gap-2 group active:scale-95"
                >
                  <Play className="w-4 h-4 fill-current group-hover:scale-110 transition-transform" />
                  <span>Continue Solving</span>
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                </Link>
              </div>
            </div>
          </div>

          {/* 2. APPLE FITNESS-STYLE STATS TRIO */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Stat 1: Topic Practice Mastery */}
            <div className="p-5 rounded-3xl bg-white/80 dark:bg-slate-900/70 backdrop-blur-xl border border-slate-200/80 dark:border-slate-800/80 shadow-xs flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center border border-emerald-500/20">
                    <Code2 className="w-4 h-4" />
                  </div>
                  <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    Practice Mastery
                  </span>
                </div>
                <span className="text-xs font-mono font-bold text-emerald-600 dark:text-emerald-400">
                  {practiceOverallPercent}%
                </span>
              </div>

              <div className="my-3 flex items-center justify-between gap-2 flex-wrap">
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-extrabold text-slate-900 dark:text-white font-mono">
                    {practiceTotalSolved}
                  </span>
                  <span className="text-xs font-mono text-slate-400 font-medium">
                    / {practiceTopicsTotal} Solved
                  </span>
                </div>

                {/* 4 Modules Status Strip with Green Light on Complete */}
                <div className="flex items-center gap-1 p-1 rounded-xl bg-slate-100/90 dark:bg-slate-800/80 border border-slate-200/60 dark:border-slate-700/60 font-mono text-[10px]">
                  {[
                    { num: 1, isDone: isM1PracticeComplete, solved: m1PracticeSolved },
                    { num: 2, isDone: isM2PracticeComplete, solved: m2PracticeSolved },
                    { num: 3, isDone: isM3PracticeComplete, solved: m3PracticeSolved },
                    { num: 4, isDone: isM4PracticeComplete, solved: m4PracticeSolved },
                  ].map((m) => (
                    <span
                      key={m.num}
                      title={`Module ${m.num}: ${m.solved}/25 Solved ${m.isDone ? '(Completed)' : ''}`}
                      className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-lg transition-all ${
                        m.isDone
                          ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 font-bold border border-emerald-500/40 shadow-xs'
                          : m.solved > 0
                          ? 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 font-semibold'
                          : 'text-slate-400 dark:text-slate-500 opacity-60'
                      }`}
                    >
                      <span
                        className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                          m.isDone
                            ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.9)] ring-2 ring-emerald-500/30 animate-pulse'
                            : m.solved > 0
                            ? 'bg-indigo-500'
                            : 'bg-slate-300 dark:bg-slate-600'
                        }`}
                      />
                      <span>M{m.num}</span>
                    </span>
                  ))}
                </div>
              </div>

              <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                <div
                  className="bg-emerald-500 h-full rounded-full transition-all duration-500"
                  style={{ width: `${Math.max(practiceOverallPercent > 0 ? 4 : 0, practiceOverallPercent)}%` }}
                />
              </div>

              <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-[11px] font-mono text-slate-400">
                <span>Easy {practiceEasySolved}/{practiceEasyTotal}</span>
                <span>Med {practiceMedSolved}/{practiceMedTotal}</span>
                <span>Hard {practiceHardSolved}/{practiceHardTotal}</span>
              </div>
            </div>

            {/* Stat 2: Lab Internal Evaluation */}
            <div className="p-5 rounded-3xl bg-white/80 dark:bg-slate-900/70 backdrop-blur-xl border border-slate-200/80 dark:border-slate-800/80 shadow-xs flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 flex items-center justify-center border border-cyan-500/20">
                    <BookOpen className="w-4 h-4" />
                  </div>
                  <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    Lab Continuous Eval
                  </span>
                </div>
                <span className="text-xs font-mono font-bold text-cyan-600 dark:text-cyan-400">
                  {labInternalScore} / 20 M
                </span>
              </div>

              <div className="my-3 flex items-center justify-between gap-2 flex-wrap">
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-extrabold text-slate-900 dark:text-white font-mono">
                    {labCompletedModules}
                  </span>
                  <span className="text-xs font-mono text-slate-400 font-medium">
                    / 5 Modules Done
                  </span>
                </div>

                {/* 5 Lab Modules Status Strip with Green Light on Complete */}
                <div className="flex items-center gap-1 p-1 rounded-xl bg-slate-100/90 dark:bg-slate-800/80 border border-slate-200/60 dark:border-slate-700/60 font-mono text-[10px]">
                  {[
                    { num: 1, isDone: isLab1Complete, solved: m1LabSolved, total: m1LabSlugs.length || 20 },
                    { num: 2, isDone: isLab2Complete, solved: m2LabSolved, total: m2LabSlugs.length || 20 },
                    { num: 3, isDone: isLab3Complete, solved: m3LabSolved, total: m3LabSlugs.length || 20 },
                    { num: 4, isDone: isLab4Complete, solved: m4LabSolved, total: m4LabSlugs.length || 20 },
                    { num: 5, isDone: isLab5Complete, solved: m5LabSolved, total: m5LabSlugs.length || 21 },
                  ].map((m) => (
                    <span
                      key={m.num}
                      title={`Lab Module ${m.num}: ${m.solved}/${m.total} Solved ${m.isDone ? '(Completed)' : ''}`}
                      className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-lg transition-all ${
                        m.isDone
                          ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 font-bold border border-emerald-500/40 shadow-xs'
                          : m.solved > 0
                          ? 'bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 font-semibold'
                          : 'text-slate-400 dark:text-slate-500 opacity-60'
                      }`}
                    >
                      <span
                        className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                          m.isDone
                            ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.9)] ring-2 ring-emerald-500/30 animate-pulse'
                            : m.solved > 0
                            ? 'bg-cyan-500'
                            : 'bg-slate-300 dark:bg-slate-600'
                        }`}
                      />
                      <span>M{m.num}</span>
                    </span>
                  ))}
                </div>
              </div>

              <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                <div
                  className="bg-cyan-500 h-full rounded-full transition-all duration-500"
                  style={{ width: `${Math.max(labCompletedModules > 0 ? 4 : 0, (labCompletedModules / 5) * 100)}%` }}
                />
              </div>

              <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-[11px] font-mono text-slate-400">
                <span>Easy {labEasySolved}/{labEasyTotal}</span>
                <span>Med {labMedSolved}/{labMedTotal}</span>
                <span>Hard {labHardSolved}/{labHardTotal}</span>
              </div>
            </div>

            {/* Stat 3: Points & Activity */}
            <div className="p-5 rounded-3xl bg-white/80 dark:bg-slate-900/70 backdrop-blur-xl border border-slate-200/80 dark:border-slate-800/80 shadow-xs flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center border border-indigo-500/20">
                    <Trophy className="w-4 h-4" />
                  </div>
                  <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Submissions & Accuracy</span>
                </div>
                <span className="text-xs font-mono font-bold text-indigo-600 dark:text-indigo-400">
                  {stats?.accuracy ? `${stats.accuracy}% Acc` : '100% Acc'}
                </span>
              </div>

              <div className="my-4 flex items-baseline gap-2">
                <span className="text-3xl font-extrabold text-slate-900 dark:text-white font-mono">
                  {practiceTotalSolved}</span>
                <span className="text-xs font-mono text-slate-400 font-medium">/ 100 Solved</span>
              </div>

              <div className="flex items-center gap-2 text-xs font-mono">
                <span className="px-2.5 py-0.5 rounded-md bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20 font-bold">
                  Verified Learner
                </span>
                <span className="text-slate-400">•</span>
                <span className="text-slate-500">Auto-Evaluated</span>
              </div>

              <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-[11px] font-mono">
                <Link to="/history" className="text-slate-500 hover:text-slate-900 dark:hover:text-white transition">Submissions →</Link>
                <Link to="/analytics" className="text-indigo-600 dark:text-indigo-400 hover:underline font-semibold">
                  Analytics →
                </Link>
              </div>
            </div>
          </div>

          {/* 3. APPLE SEGMENTED CONTROL & MODULES SECTION */}
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200/80 dark:border-slate-800/80 pb-3">
              <div className="inline-flex p-1 rounded-2xl bg-slate-100 dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setStudentTab('practice')}
                  className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all flex items-center gap-2 cursor-pointer ${
                    studentTab === 'practice'
                      ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs'
                      : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                  }`}
                >
                  <Code2 className="w-3.5 h-3.5 text-emerald-500" />
                  <span>Topic Practice (100)</span>
                </button>
                <button
                  type="button"
                  onClick={() => setStudentTab('lab')}
                  className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all flex items-center gap-2 cursor-pointer ${
                    studentTab === 'lab'
                      ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs'
                      : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                  }`}
                >
                  <BookOpen className="w-3.5 h-3.5 text-cyan-500" />
                  <span>Lab Internal (5 Modules)</span>
                </button>
                <button
                  type="button"
                  onClick={() => setStudentTab('tests')}
                  className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all flex items-center gap-2 cursor-pointer ${
                    studentTab === 'tests'
                      ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs'
                      : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                  }`}
                >
                  <FileText className="w-3.5 h-3.5 text-indigo-500" />
                  <span>Assigned Tests ({studentAssignedList.length})</span>
                </button>
              </div>
            </div>

            {/* TAB 1: PRACTICE MODULES */}
            {studentTab === 'practice' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 animate-in fade-in duration-200">
                {practiceModulesList.filter((m: any) => m.order !== 5 && m.id !== 5).map((m: any) => {
                  const percent = m.progressPercent || 0;
                  const isComplete = m.solvedCount >= m.totalQuestions;
                  const isLocked = !m.isUnlocked;
                  const nextTopic = getNextTopicInModule(m.id);

                  if (isLocked) {
                    return (
                      <div
                        key={m.id}
                        onClick={() => toast.warning(`🔒 ${m.lockReason || 'Complete previous practice module and Lab Internal first.'}`)}
                        className="p-5 rounded-3xl bg-slate-50/60 dark:bg-slate-900/30 border border-dashed border-slate-200 dark:border-slate-800 opacity-60 hover:opacity-90 transition-all flex flex-col justify-between cursor-not-allowed select-none"
                      >
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400">
                              MOD 0{m.id}
                            </span>
                            <span className="text-[10px] font-mono text-amber-500 flex items-center gap-1 font-bold">
                              <Lock className="w-3 h-3" /> Locked
                            </span>
                          </div>
                          <h3 className="font-bold text-sm text-slate-700 dark:text-slate-300">
                            {m.title}
                          </h3>
                          <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed">
                            {m.lockReason || m.description}
                          </p>
                        </div>
                        <div className="mt-4 pt-3 border-t border-slate-200/40 dark:border-slate-800/40 text-[10px] font-mono text-slate-400 flex items-center justify-between">
                          <span>0/25 Solved</span>
                          <span>Req M{m.id - 1}</span>
                        </div>
                      </div>
                    );
                  }

                  return (
                    <div
                      key={m.id}
                      className="p-5 rounded-3xl bg-white/80 dark:bg-slate-900/70 border border-slate-200/80 dark:border-slate-800/80 hover:border-emerald-500/40 shadow-xs hover:shadow-md transition-all flex flex-col justify-between group"
                    >
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400">
                            MOD 0{m.id}
                          </span>
                          {isComplete ? (
                            <span className="text-[10px] font-mono text-emerald-600 dark:text-emerald-400 flex items-center gap-1 font-bold">
                              <CheckCircle2 className="w-3 h-3 text-emerald-500" /> Done
                            </span>
                          ) : (
                            <span className="text-[10px] font-mono text-emerald-600 dark:text-emerald-400 font-bold">
                              {percent}%
                            </span>
                          )}
                        </div>
                        <h3 className="font-bold text-sm text-slate-900 dark:text-white group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                          {m.title}
                        </h3>
                        <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 leading-relaxed">
                          {m.description}
                        </p>
                      </div>

                      <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800/80 space-y-3">
                        <div className="w-full bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
                          <div
                            className="bg-emerald-500 h-full rounded-full transition-all duration-300"
                            style={{ width: `${Math.max(percent > 0 ? 4 : 0, percent)}%` }}
                          />
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-mono text-slate-400 font-medium">
                            {m.solvedCount}/25 Solved
                          </span>
                          <Link
                            to={`/practice?topic=${nextTopic.id}`}
                            className="px-3.5 py-1 rounded-full bg-emerald-500/10 hover:bg-emerald-500 text-emerald-600 hover:text-white dark:text-emerald-400 text-xs font-semibold transition-all flex items-center gap-1 shadow-2xs"
                          >
                            <span>Solve →</span>
                          </Link>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* TAB 2: LAB INTERNAL CIE MODULES */}
            {studentTab === 'lab' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 animate-in fade-in duration-200">
                {studentModulesList.map((m: any, idx: number) => {
                  const isLocked = !m.isUnlocked;
                  const percent = m.progressPercent || 0;
                  return (
                    <Link
                      key={m.id || idx}
                      to={isLocked ? '#' : `/lab-internal/${m.slug}`}
                      onClick={(e) => {
                        if (isLocked) {
                          e.preventDefault();
                          toast.warning(`🔒 ${m.lockReason || 'Complete previous requirements first.'}`);
                        }
                      }}
                      className={`p-5 rounded-3xl border transition-all flex flex-col justify-between group ${
                        isLocked
                          ? 'border-slate-200 dark:border-slate-800 bg-slate-50/40 dark:bg-slate-900/20 opacity-60'
                          : 'border-slate-200/80 dark:border-slate-800/80 bg-white/80 dark:bg-slate-900/70 hover:border-cyan-500/50 shadow-xs hover:shadow-md'
                      }`}
                    >
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400">
                            MOD 0{m.order || idx + 1}
                          </span>
                          {isLocked ? (
                            <span className="text-[10px] font-mono text-amber-500 flex items-center gap-1">
                              <Lock className="w-3 h-3" /> Locked
                            </span>
                          ) : (
                            <span className="text-[10px] font-mono text-cyan-600 dark:text-cyan-400 font-bold">
                              {percent}%
                            </span>
                          )}
                        </div>
                        <h3 className="font-bold text-sm text-slate-900 dark:text-white group-hover:text-cyan-600 dark:group-hover:text-cyan-400 transition-colors">
                          {m.title}
                        </h3>
                        <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 leading-relaxed">
                          {m.description}
                        </p>
                      </div>

                      <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800/80 space-y-2">
                        <div className="w-full bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
                          <div
                            className="bg-cyan-500 h-full rounded-full transition-all duration-300"
                            style={{ width: `${percent}%` }}
                          />
                        </div>
                        <div className="flex items-center justify-between text-[10px] font-mono text-slate-400">
                          <span>{m.solvedCount || 0}/20 Solved</span>
                          <span className="text-cyan-600 dark:text-cyan-400 font-semibold group-hover:translate-x-0.5 transition-transform">
                            {isLocked ? 'Unlock →' : 'Open →'}
                          </span>
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}

            {/* TAB 3: ASSIGNED TESTS */}
            {studentTab === 'tests' && (
              <div className="animate-in fade-in duration-200">
                {isLoadingStudentTests ? (
                  <div className="p-8 text-center text-xs font-mono text-slate-400">
                    <Loader2 className="w-5 h-5 animate-spin mx-auto mb-2 text-indigo-500" />
                    <span>Checking section assignments...</span>
                  </div>
                ) : studentAssignedList.length === 0 ? (
                  <div className="p-8 rounded-3xl border border-dashed border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-900/30 text-center space-y-4">
                    <div className="w-10 h-10 rounded-full bg-indigo-500/10 text-indigo-500 flex items-center justify-center mx-auto">
                      <KeyRound className="w-5 h-5" />
                    </div>
                    <div className="space-y-1">
                      <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                        No Active Tests Assigned Right Now
                      </h3>
                      <p className="text-xs text-slate-500 max-w-md mx-auto leading-relaxed">
                        Have a 6-character Join Code from your faculty mentor (e.g. <span className="font-mono font-bold text-indigo-600 dark:text-indigo-400">LQ-C31A</span>)? Enter it below to unlock your section tests:
                      </p>
                    </div>
                    <form onSubmit={handleDashboardEnroll} className="max-w-md mx-auto flex flex-col sm:flex-row gap-2">
                      <input
                        type="text"
                        placeholder="e.g. LQ-C31A"
                        value={dashboardJoinCode}
                        onChange={(e) => setDashboardJoinCode(e.target.value.toUpperCase())}
                        className="flex-1 px-4 py-2.5 rounded-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-mono font-bold tracking-widest placeholder:tracking-normal placeholder:font-normal focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
                      />
                      <button
                        type="submit"
                        disabled={isEnrollingCode || !dashboardJoinCode.trim()}
                        className="px-6 py-2.5 rounded-full text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white transition disabled:opacity-50 cursor-pointer shadow-xs whitespace-nowrap"
                      >
                        {isEnrollingCode ? 'Joining...' : 'Unlock Tests'}
                      </button>
                    </form>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {studentAssignedList.map((assignment: any) => {
                      const test = assignment?.test || {};
                      const questions = test?.questions || [];
                      const attempts = assignment?.attempts || [];
                      const isSubmitted = assignment?.status === 'SUBMITTED';
                      const isInProgress = assignment?.status === 'IN_PROGRESS';
                      const completedCount = attempts.filter((a: any) => a.isLocked).length;

                      return (
                        <div
                          key={assignment?.id}
                          className="p-5 rounded-3xl border border-slate-200/80 dark:border-slate-800/80 bg-white/80 dark:bg-slate-900/70 shadow-xs flex flex-col justify-between"
                        >
                          <div className="space-y-2">
                            <div className="flex items-center justify-between">
                              <span className="text-[10px] font-mono font-bold px-2.5 py-0.5 rounded-full bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20">
                                {test?.section?.sectionName || 'Section Test'}
                              </span>
                              <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full ${
                                isSubmitted ? 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/20' : 'bg-cyan-500/10 text-cyan-600 border border-cyan-500/20'
                              }`}>
                                {isSubmitted ? 'SUBMITTED' : isInProgress ? 'IN PROGRESS' : 'ASSIGNED'}
                              </span>
                            </div>
                            <h3 className="font-bold text-base text-slate-900 dark:text-white truncate">
                              {test?.title || 'Coursework Assessment'}
                            </h3>
                            <p className="text-xs text-slate-400 font-mono">
                              ⏱️ {test?.durationMinutes || 60} Mins • ❓ {questions.length} Questions
                            </p>
                          </div>

                          <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between">
                            <span className="text-xs font-mono text-slate-400">
                              {completedCount}/{questions.length} completed
                            </span>
                            <Link
                              to="/student/tests"
                              className="px-4 py-1.5 rounded-full text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white flex items-center gap-1 shadow-xs transition"
                            >
                              <span>{isSubmitted ? 'View Results' : 'Open Test'}</span>
                              <ChevronRight className="w-3.5 h-3.5" />
                            </Link>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* 4. ONLINE C COMPILER PLAYGROUND */}
          <OnlineCompilerCard />
        </div>
      )}

      {/* OPTION 1: STUDENT CODING PROGRESS & PROFILE MODAL */}
      {selectedDashboardStudent && (() => {
        const prnClean = selectedDashboardStudent.prn?.trim() || '';
        const subs = (selectedStudentSubmissions || []).filter((s: any) => {
          const sp = (s.prn || s.studentPrn || s.user?.prn || '').trim().toUpperCase();
          const se = (s.email || s.studentEmail || s.user?.email || '').trim().toLowerCase();
          return (prnClean && sp === prnClean.toUpperCase()) || (selectedDashboardStudent.email && se === selectedDashboardStudent.email.toLowerCase());
        });

        const acceptedSubs = subs.filter((s: any) => {
          const v = String(s.verdict || s.status || '').toUpperCase();
          return v === 'ACCEPTED' || v === 'AC' || v === 'PASSED';
        });

        const distinctSolved = new Set(acceptedSubs.map((s: any) => s.problemId || s.problemSlug || s.problem?.title || s.id)).size;
        const totalPoints = acceptedSubs.reduce((acc: number, s: any) => acc + (Number(s.score || s.points) || 10), 0);
        const accuracy = subs.length > 0 ? Math.round((acceptedSubs.length / subs.length) * 100) : 100;

        // Compute Lab Internal Coursework (5 CIE Continuous Assessment Modules)
        const matchedLab = (allLabSubmissions || []).filter((ls: any) => {
          const lprn = (ls.user?.prn || '').trim().toUpperCase();
          const lemail = (ls.user?.email || '').trim().toLowerCase();
          const luid = ls.userId || ls.user?.id;
          return (prnClean && prnClean !== '—' && lprn === prnClean) ||
                 (selectedDashboardStudent.email && lemail === selectedDashboardStudent.email.toLowerCase().trim()) ||
                 (selectedDashboardStudent.id && luid === selectedDashboardStudent.id);
        });

        const labCompletedModules = matchedLab.filter((ls: any) => ls.status === 'COMPLETED').length;
        const labInternalScore = Math.min(20, Math.round((labCompletedModules / 5) * 20));
        const combinedScore = totalPoints + (labInternalScore * 4);
        const overallGrade = (combinedScore === 0 && distinctSolved === 0)
          ? '—'
          : combinedScore >= 200
          ? 'A+'
          : combinedScore >= 160
          ? 'A'
          : combinedScore >= 120
          ? 'B+'
          : combinedScore >= 80
          ? 'B'
          : 'C';

        const LAB_MODULES_LIST = [
          { order: 1, title: 'Control Structures', slug: 'control-structures', maxMarks: 4 },
          { order: 2, title: 'Pointers & Functions', slug: 'pointers-and-functions', maxMarks: 4 },
          { order: 3, title: 'Arrays & Strings', slug: 'arrays-and-strings', maxMarks: 4 },
          { order: 4, title: 'Recursion & Bit Manipulation', slug: 'recursion-and-bit-manipulation', maxMarks: 4 },
          { order: 5, title: 'Structures, Unions & DMA', slug: 'structures-unions-and-dma', maxMarks: 4 },
        ];

        const isModalPrnCopied = copiedCodeKey === `modal-prn-${prnClean}`;

        return (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-200">
            <div className="bg-white dark:bg-[#0c1017] border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-xl shadow-2xl overflow-hidden animate-in zoom-in-95 flex flex-col max-h-[92vh]">
              {/* Modal Header */}
              <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/70 dark:bg-[#0e131d]/70 shrink-0">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-indigo-500 to-purple-600 text-white flex items-center justify-center font-bold text-lg shadow-md shadow-indigo-500/25">
                    {selectedDashboardStudent.name?.charAt(0)?.toUpperCase() || 'S'}
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-900 dark:text-white leading-tight">
                      {selectedDashboardStudent.name}
                    </h3>
                    <div className="flex items-center gap-2 mt-0.5">
                      <button
                        type="button"
                        onClick={() => handleCopyCode(prnClean, `modal-prn-${prnClean}`, 'PRN')}
                        className="font-mono text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline inline-flex items-center gap-1 cursor-pointer"
                        title="Click to copy PRN"
                      >
                        <span>{prnClean}</span>
                        {isModalPrnCopied ? (
                          <Check className="w-3 h-3 text-emerald-500" />
                        ) : (
                          <Copy className="w-2.5 h-2.5 opacity-60" />
                        )}
                      </button>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                        ENROLLED
                      </span>
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedDashboardStudent(null)}
                  className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Scrollable Modal Content */}
              <div className="p-6 overflow-y-auto space-y-4 text-xs font-sans flex-1">
                {/* 4-Pillar Performance Bento Cards (Practical + Lab Internal + Total Score + Accuracy) */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  {/* Card 1: Practical Modules */}
                  <div className="p-3 rounded-2xl border border-indigo-200/80 dark:border-indigo-500/20 bg-indigo-50/40 dark:bg-indigo-500/5 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between text-indigo-600 dark:text-indigo-400 mb-1">
                        <span className="text-[10px] font-mono uppercase font-bold tracking-wider">Practical</span>
                        <Target className="w-3.5 h-3.5" />
                      </div>
                      <div className="text-base font-extrabold text-slate-900 dark:text-white font-mono">
                        {distinctSolved} <span className="text-xs text-slate-400 font-normal">/ 25</span>
                      </div>
                    </div>
                    <div>
                      <div className="w-full bg-slate-200 dark:bg-slate-800 h-1.5 rounded-full mt-2 overflow-hidden">
                        <div
                          className="bg-indigo-500 h-full rounded-full transition-all duration-300"
                          style={{ width: `${Math.min(100, (distinctSolved / 25) * 100)}%` }}
                        />
                      </div>
                      <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-1 font-mono truncate">
                        25 Practical Modules
                      </div>
                    </div>
                  </div>

                  {/* Card 2: Lab Internal CIE Coursework */}
                  <div className="p-3 rounded-2xl border border-purple-200/80 dark:border-purple-500/20 bg-purple-50/40 dark:bg-purple-500/5 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between text-purple-600 dark:text-purple-400 mb-1">
                        <span className="text-[10px] font-mono uppercase font-bold tracking-wider">Lab Internal</span>
                        <BookOpen className="w-3.5 h-3.5" />
                      </div>
                      <div className="text-base font-extrabold text-slate-900 dark:text-white font-mono">
                        {labCompletedModules} <span className="text-xs text-slate-400 font-normal">/ 5 Mod</span>
                      </div>
                    </div>
                    <div>
                      <div className="w-full bg-slate-200 dark:bg-slate-800 h-1.5 rounded-full mt-2 overflow-hidden">
                        <div
                          className="bg-purple-500 h-full rounded-full transition-all duration-300"
                          style={{ width: `${Math.min(100, (labCompletedModules / 5) * 100)}%` }}
                        />
                      </div>
                      <div className="text-[10px] text-purple-600 dark:text-purple-400 mt-1 font-mono font-bold truncate">
                        {labInternalScore} / 20 CIE Marks
                      </div>
                    </div>
                  </div>

                  {/* Card 3: Total Verified Points & Grade */}
                  <div className="p-3 rounded-2xl border border-emerald-200/80 dark:border-emerald-500/20 bg-emerald-50/40 dark:bg-emerald-500/5 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between text-emerald-600 dark:text-emerald-400 mb-1">
                        <span className="text-[10px] font-mono uppercase font-bold tracking-wider">Total Score</span>
                        <Trophy className="w-3.5 h-3.5" />
                      </div>
                      <div className="text-base font-extrabold text-slate-900 dark:text-white font-mono">
                        {combinedScore} <span className="text-xs text-slate-400 font-normal">pts</span>
                      </div>
                    </div>
                    <div className="mt-1">
                      <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-bold ${
                        overallGrade === '—'
                          ? 'bg-slate-200/60 dark:bg-slate-800 text-slate-400'
                          : 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                      }`}>
                        Grade {overallGrade}
                      </span>
                      <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-1 font-mono truncate">
                        Practical + Lab CIE
                      </div>
                    </div>
                  </div>

                  {/* Card 4: Accuracy & Compiler */}
                  <div className="p-3 rounded-2xl border border-sky-200/80 dark:border-sky-500/20 bg-sky-50/40 dark:bg-sky-500/5 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between text-sky-600 dark:text-sky-400 mb-1">
                        <span className="text-[10px] font-mono uppercase font-bold tracking-wider">Accuracy</span>
                        <TrendingUp className="w-3.5 h-3.5" />
                      </div>
                      <div className="text-base font-extrabold text-slate-900 dark:text-white font-mono">
                        {accuracy}%
                      </div>
                    </div>
                    <div className="mt-1 font-mono text-[10px]">
                      <div className="text-slate-500 dark:text-slate-400 truncate">
                        {acceptedSubs.length} AC / {subs.length} Total
                      </div>
                      <div className="text-sky-600 dark:text-sky-400 mt-0.5 truncate">
                        GCC 14.2 Sandbox
                      </div>
                    </div>
                  </div>
                </div>

                {/* Lab Internal Coursework Breakdown (5 CIE Continuous Assessment Modules) */}
                <div className="p-3.5 rounded-2xl border border-purple-200/80 dark:border-purple-500/20 bg-purple-50/30 dark:bg-purple-950/20 space-y-2 font-mono">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <BookOpen className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
                      <span className="text-xs font-bold text-slate-900 dark:text-white">
                        Lab Internal Coursework (5 CIE Modules)
                      </span>
                    </div>
                    <span className="text-[11px] font-bold text-purple-600 dark:text-purple-400 bg-purple-500/10 px-2 py-0.5 rounded-md border border-purple-500/20">
                      {labCompletedModules}/5 Completed • {labInternalScore}/20 M
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-5 gap-1.5 text-[10px]">
                    {LAB_MODULES_LIST.map((mod) => {
                      const modSub = matchedLab.find((l: any) =>
                        (l.moduleSlug === mod.slug || l.moduleOrder === mod.order) && l.status === 'COMPLETED'
                      );
                      const isModDone = Boolean(modSub);
                      return (
                        <div
                          key={mod.slug}
                          className={`p-2 rounded-xl border flex flex-col justify-between transition-all ${
                            isModDone
                              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400 font-semibold'
                              : 'bg-white/70 dark:bg-slate-900/70 border-slate-200/80 dark:border-slate-800/80 text-slate-500'
                          }`}
                        >
                          <div className="flex items-center justify-between gap-1">
                            <span className="font-bold">Mod {mod.order}</span>
                            {isModDone ? <Check className="w-3 h-3 text-emerald-500 shrink-0" /> : <Clock className="w-2.5 h-2.5 text-slate-400 shrink-0" />}
                          </div>
                          <div className="mt-1 truncate font-medium text-[9px] text-slate-600 dark:text-slate-400" title={mod.title}>
                            {mod.title}
                          </div>
                          <div className="mt-1 text-right font-bold text-[10px]">
                            {isModDone ? `${mod.maxMarks}/${mod.maxMarks} M` : `0/${mod.maxMarks} M`}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Institution & Classroom Details */}
                <div className="grid grid-cols-2 gap-3 font-mono">
                  <div className="p-3 rounded-2xl border border-slate-200/80 dark:border-slate-800/80 bg-slate-50/50 dark:bg-[#111622]/50">
                    <div className="text-[10px] text-slate-400 uppercase font-bold">Institution</div>
                    <div className="font-bold text-slate-900 dark:text-white mt-1 text-xs truncate">
                      Sanjivani University
                    </div>
                    <div className="text-[11px] text-slate-500 mt-0.5">Integrated M.Tech / FY</div>
                  </div>

                  <div className="p-3 rounded-2xl border border-slate-200/80 dark:border-slate-800/80 bg-slate-50/50 dark:bg-[#111622]/50">
                    <div className="text-[10px] text-slate-400 uppercase font-bold">Class Section</div>
                    <div className="font-bold text-indigo-600 dark:text-indigo-400 mt-1 text-xs truncate">
                      {selectedDashboardStudent.sectionName || 'C Programming'}
                    </div>
                    <div className="text-[11px] text-slate-500 mt-0.5">
                      Code: {selectedDashboardStudent.sectionJoinCode || 'LQ-C31A'}
                    </div>
                  </div>
                </div>

                {/* Account & Profile Details */}
                <div className="p-3.5 rounded-2xl border border-slate-200/80 dark:border-slate-800/80 bg-slate-50/50 dark:bg-[#111622]/50 space-y-1.5 font-mono">
                  <div className="text-[10px] text-slate-400 uppercase font-bold">Account &amp; Binding Details</div>
                  <div className="flex items-center justify-between text-slate-700 dark:text-slate-300">
                    <span className="text-[11px] text-slate-400">Registered Email:</span>
                    <span className={`font-semibold truncate max-w-[250px] flex items-center gap-1.5 ${selectedDashboardStudent.isCustomBound ? "text-emerald-600 dark:text-emerald-400" : "text-slate-700 dark:text-slate-300"}`}>
                      <span>{selectedDashboardStudent.email || `${selectedDashboardStudent.prn?.toLowerCase()}@sanjivani.edu.in`}</span>
                      {selectedDashboardStudent.isCustomBound && (
                        <span className="text-[9px] px-1.5 py-0.2 rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-semibold border border-emerald-500/20">
                          ✓ Bound
                        </span>
                      )}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-slate-700 dark:text-slate-300">
                    <span className="text-[11px] text-slate-400">Account Status:</span>
                    <span className="text-emerald-500 font-semibold inline-flex items-center gap-1 text-[11px]">
                      <ShieldCheck className="w-3.5 h-3.5" /> {selectedDashboardStudent.isCustomBound ? "Verified Personal Email (Bound)" : "Official Institutional Profile"}
                    </span>
                  </div>
                </div>

                {/* Recent Code Submissions Stream */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 text-slate-900 dark:text-white font-bold text-xs">
                      <Code2 className="w-3.5 h-3.5 text-indigo-500" />
                      <span>Recent Coding Submissions ({subs.length})</span>
                    </div>
                    <span className="text-[10px] text-slate-400 font-mono">Auto-audited via GCC</span>
                  </div>

                  {isLoadingSelectedStudentSubs ? (
                    <div className="p-6 text-center text-slate-400 font-mono text-xs animate-pulse border border-slate-200/80 dark:border-slate-800/80 rounded-2xl">
                      Loading student telemetry...
                    </div>
                  ) : subs.length === 0 ? (
                    <div className="p-5 text-center border border-dashed border-slate-200 dark:border-slate-800 rounded-2xl space-y-1">
                      <p className="font-semibold text-slate-700 dark:text-slate-300 text-xs">
                        No submissions recorded today
                      </p>
                      <p className="text-[11px] text-slate-400">
                        Student is enrolled and ready. Submissions will appear live as they solve problems.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                      {subs.slice(0, 8).map((sub: any, sIdx: number) => {
                        const isAc = String(sub.verdict || sub.status || '').toUpperCase() === 'ACCEPTED';
                        return (
                          <div
                            key={sub.id || sIdx}
                            className="p-2.5 rounded-xl border border-slate-200/70 dark:border-slate-800/70 bg-slate-50/40 dark:bg-slate-900/40 flex items-center justify-between text-xs font-mono"
                          >
                            <div className="space-y-0.5 truncate max-w-[240px]">
                              <div className="font-semibold text-slate-900 dark:text-slate-200 truncate">
                                {sub.problem?.title || sub.problemTitle || sub.problemSlug || 'C Programming Challenge'}
                              </div>
                              <div className="text-[10px] text-slate-400">
                                {sub.createdAt ? new Date(sub.createdAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : 'Live session'} • C11
                              </div>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              <span
                                className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                  isAc
                                    ? 'bg-emerald-500/15 text-emerald-500 border border-emerald-500/20'
                                    : 'bg-rose-500/15 text-rose-500 border border-rose-500/20'
                                }`}
                              >
                                {sub.verdict || 'SUBMITTED'}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>

              {/* Modal Footer Quick Actions */}
              <div className="p-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3 bg-slate-50/50 dark:bg-[#0e131d]/50 shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    handleCopyCode(prnClean, `modal-prn-${prnClean}`, 'PRN');
                  }}
                  className="flex-1 py-2 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 font-semibold text-slate-700 dark:text-slate-200 transition cursor-pointer flex items-center justify-center gap-1.5 text-xs"
                >
                  {isModalPrnCopied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{isModalPrnCopied ? 'PRN Copied!' : 'Copy PRN'}</span>
                </button>
                <Link
                  to="/faculty/sections"
                  onClick={() => setSelectedDashboardStudent(null)}
                  className="flex-1 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 font-semibold text-white transition cursor-pointer flex items-center justify-center gap-1.5 shadow-sm text-xs"
                >
                  <GraduationCap className="w-3.5 h-3.5" />
                  <span>Section Console →</span>
                </Link>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
};
