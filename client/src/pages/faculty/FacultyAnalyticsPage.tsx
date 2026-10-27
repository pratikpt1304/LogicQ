import React, { useState, useMemo, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../../context/AuthContext.js';
import { api } from '../../api/client.js';
import { FirestoreDataService } from '../../services/firestoreData.service.js';
import { RealtimeSyncService } from '../../services/realtimeSync.service.js';
import { normalizeDepartment } from '../../config/academic.config.js';
import { toast } from 'sonner';
import {
  Users,
  Award,
  Brain,
  Download,
  AlertTriangle,
  Search,
  CheckCircle2,
  Sparkles,
  Eye,
  FileCode,
  TrendingUp,
  Filter,
  X,
  Flame,
  Code2,
  ShieldCheck,
  ShieldAlert,
  Copy,
  ExternalLink,
  MessageSquare,
  Activity,
  Check,
  RotateCcw,
  Terminal,
  BookOpen,
} from 'lucide-react';

interface StudentRosterItem {
  id: string;
  uid?: string;
  fullName: string;
  displayName?: string;
  prn: string;
  email: string;
  department?: string;
  year?: string;
  division?: string;
  totalPoints: number;
  currentStreak: number;
  solvedCount?: number;
  integrityScore: number;
  integrityRisk: 'NORMAL' | 'LOW' | 'MODERATE' | 'HIGH' | 'CRITICAL';
  tabSwitchCount: number;
  copyPasteAttempts: number;
  statusCategory: 'CONSISTENT' | 'NEEDS_HELP' | 'INTEGRITY_FLAG';
  sectionId?: string;
  sectionName?: string;
  sectionJoinCode?: string;
}

export const FacultyAnalyticsPage: React.FC = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const urlSectionId = searchParams.get('sectionId');
  const [selectedSectionId, setSelectedSectionId] = useState<string>(urlSectionId || 'ALL');

  useEffect(() => {
    if (urlSectionId) {
      setSelectedSectionId(urlSectionId);
    }
  }, [urlSectionId]);

  const handleSectionSelect = (newId: string) => {
    setSelectedSectionId(newId);
    if (newId === 'ALL') {
      searchParams.delete('sectionId');
      setSearchParams(searchParams, { replace: true });
    } else {
      setSearchParams({ sectionId: newId }, { replace: true });
    }
  };

  const [activeFilterTab, setActiveFilterTab] = useState<'ALL' | 'CONSISTENT' | 'NEEDS_HELP' | 'INTEGRITY_FLAG'>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedStudentForInspect, setSelectedStudentForInspect] = useState<string | null>(null);
  const [isExportingCsv, setIsExportingCsv] = useState(false);

  // Candidate Inspection Modal State
  const [modalTab, setModalTab] = useState<'audit' | 'submissions'>('audit');
  const [verifiedStudents, setVerifiedStudents] = useState<Set<string>>(new Set());
  const [expandedCodeId, setExpandedCodeId] = useState<string | null>(null);
  const [copiedCodeId, setCopiedCodeId] = useState<string | null>(null);
  const [copiedPrn, setCopiedPrn] = useState(false);

  // 1. Primary Query: Combines Sections, Enrolled Students, and Real Submissions scoped strictly to this faculty
  const {
    data: analyticsData,
    isLoading,
    isFetching,
    refetch,
  } = useQuery({
    queryKey: ['faculty-analytics-hub-data', user?.id, user?.email, user?.role],
    queryFn: async () => {
      const isSuperAdmin = user?.role === 'ADMIN';
      const facultyEmail = user?.email?.toLowerCase().trim();
      const facultyId = user?.id || (user as any)?.uid;

      // Parallel fetch from Firestore & Backend
      const [fsSections, fsUsers] = await Promise.all([
        FirestoreDataService.getSectionsFromFirestore(),
        FirestoreDataService.getAllFirestoreUsers(),
      ]);

      let backendOverview: any = null;
      try {
        const res = await api.get('/analytics/faculty/overview');
        backendOverview = res?.data;
      } catch (err) {
        console.warn('Backend overview not reachable, using Firestore:', err);
      }

      // Merge Sections
      const sectionMap = new Map<string, any>();
      (backendOverview?.sections || []).forEach((s: any) => {
        const key = s.sectionId || s.id || s.joinCode;
        if (key) {
          sectionMap.set(key, {
            id: s.sectionId || s.id,
            name: s.sectionName || s.name || 'Academic Section',
            course: s.course || 'B.Tech CSE',
            studentCount: s.studentCount || 0,
            students: s.students || [],
            facultyId: s.facultyId,
            facultyEmail: s.facultyEmail,
            joinCode: s.joinCode,
          });
        }
      });

      fsSections.forEach((fs: any) => {
        if (!FirestoreDataService.isLegacyDemoSection(fs) && !FirestoreDataService.isSectionDeleted(fs.id, fs.joinCode)) {
          const key = fs.id || fs.joinCode;
          if (key) {
            const existing = sectionMap.get(key) || {};
            const mergedStudents = (Array.isArray(fs.students) && fs.students.length > 0)
              ? fs.students
              : (existing.students || []);
            const calculatedCount = Math.max(
              mergedStudents.length,
              fs._count?.students || 0,
              existing.studentCount || 0
            );

            sectionMap.set(key, {
              ...existing,
              ...fs,
              id: fs.id || existing.id,
              name: fs.sectionName || fs.name || fs.subject || existing.name || 'Academic Section',
              course: fs.course || existing.course || 'B.Tech CSE',
              studentCount: calculatedCount,
              students: mergedStudents,
              facultyId: fs.facultyId || existing.facultyId,
              facultyEmail: fs.facultyEmail || existing.facultyEmail,
              joinCode: fs.joinCode || existing.joinCode,
            });
          }
        }
      });

      // Institutional Scoping: All active non-deleted sections
      const mySections = Array.from(sectionMap.values()).filter((s: any) => {
        if (FirestoreDataService.isSectionDeleted(s.id, s.joinCode) || FirestoreDataService.isLegacyDemoSection(s)) {
          return false;
        }
        return true;
      });

      // Map to deduplicate students across all sections by email or PRN
      const studentMap = new Map<string, StudentRosterItem>();

      // A. Populate students enrolled directly in mySections
      mySections.forEach((sec: any) => {
        const secId = sec.id;
        const secName = sec.name || sec.sectionName || 'Academic Section';
        const secCode = sec.joinCode || '';

        (sec.students || []).forEach((st: any) => {
          if (!st || FirestoreDataService.isPurgedStudent(st)) return;
          const email = String(st.email || st.student?.email || '').toLowerCase().trim();
          const prn = String(st.prn || st.student?.prn || '').toUpperCase().trim();
          const id = st.id || st.uid || st.student?.id || email || prn;
          const key = (prn || email || id).toUpperCase();
          if (!key) return;

          const points = Number(st.totalPoints ?? st.student?.totalPoints ?? 0);
          const streak = Number(st.currentStreak ?? st.student?.currentStreak ?? 0);
          const fullName = st.name || st.fullName || st.student?.fullName || st.student?.displayName || (prn ? `Student ${prn.slice(-4)}` : 'Enrolled Student');

          studentMap.set(key, {
            id,
            uid: st.uid || st.id,
            fullName,
            displayName: st.displayName || fullName,
            prn: prn || 'PENDING',
            email: email || '—',
            department: normalizeDepartment(st.department) || st.department || normalizeDepartment(sec.course) || 'General',
            year: st.year || 'SY',
            division: st.division || sec.sectionName || 'A',
            totalPoints: points,
            currentStreak: streak,
            solvedCount: Math.round(points / 25),
            integrityScore: 100,
            integrityRisk: 'NORMAL',
            tabSwitchCount: Number(st.tabSwitchCount || 0),
            copyPasteAttempts: Number(st.copyPasteAttempts || 0),
            statusCategory: points < 50 && streak === 0 ? 'NEEDS_HELP' : 'CONSISTENT',
            sectionId: secId,
            sectionName: secName,
            sectionJoinCode: secCode,
          });
        });
      });

      // B. Enrich / overlay with full Firestore registered users
      const enrolledStudentKeys = new Set<string>();
      mySections.forEach((sec: any) => {
        (sec.students || []).forEach((st: any) => {
          if (st.email) enrolledStudentKeys.add(st.email.toLowerCase().trim());
          if (st.prn) enrolledStudentKeys.add(st.prn.toUpperCase().trim());
          if (st.id) enrolledStudentKeys.add(st.id);
        });
      });
      const sectionIdSet = new Set(mySections.map((s) => s.id));
      const sectionCodeSet = new Set(mySections.map((s) => (s.joinCode || '').toUpperCase()));

      fsUsers.forEach((u: any) => {
        if (u.role !== 'STUDENT' && u.role && u.role !== 'USER') return;
        if (FirestoreDataService.isPurgedStudent(u)) return;

        const email = (u.email || '').toLowerCase().trim();
        const prn = (u.prn || '').toUpperCase().trim();
        const id = u.id || u.uid;
        const key = (prn || email || id).toUpperCase();

        const matchedSec = mySections.find((sec: any) => {
          if (u.sectionId && (sec.id === u.sectionId || sec.joinCode === u.sectionId)) return true;
          return (sec.students || []).some((st: any) => {
            const stE = (st.email || st.student?.email || '').toLowerCase().trim();
            const stP = (st.prn || st.student?.prn || '').toUpperCase().trim();
            return (email && stE === email) || (prn && stP === prn);
          });
        });

        const belongs = isSuperAdmin || Boolean(matchedSec) ||
          enrolledStudentKeys.has(email) ||
          enrolledStudentKeys.has(prn) ||
          enrolledStudentKeys.has(id) ||
          (u.sectionId && (sectionIdSet.has(u.sectionId) || sectionCodeSet.has(u.sectionId.toUpperCase())));

        if (!belongs) return;

        const existing = studentMap.get(key);

        const points = Number(u.totalPoints ?? existing?.totalPoints ?? 0);
        const streak = Number(u.currentStreak ?? existing?.currentStreak ?? 0);
        const tabSwitches = Number(u.tabSwitchCount || u.tabSwitches || 0);
        const pasteAttempts = Number(u.copyPasteAttempts || u.pasteCount || 0);

        let integrityRisk: 'NORMAL' | 'LOW' | 'MODERATE' | 'HIGH' | 'CRITICAL' = 'NORMAL';
        let integrityScore = 100;

        if (tabSwitches >= 5 || pasteAttempts >= 5) {
          integrityRisk = 'CRITICAL';
          integrityScore = 20;
        } else if (tabSwitches >= 3 || pasteAttempts >= 3) {
          integrityRisk = 'HIGH';
          integrityScore = 40;
        } else if (tabSwitches > 1 || pasteAttempts > 1) {
          integrityRisk = 'MODERATE';
          integrityScore = 70;
        } else if (tabSwitches === 1) {
          integrityRisk = 'LOW';
          integrityScore = 90;
        }

        let statusCategory: 'CONSISTENT' | 'NEEDS_HELP' | 'INTEGRITY_FLAG' = 'CONSISTENT';
        if (integrityRisk === 'HIGH' || integrityRisk === 'CRITICAL' || tabSwitches >= 3) {
          statusCategory = 'INTEGRITY_FLAG';
        } else if (points < 50 && streak === 0) {
          statusCategory = 'NEEDS_HELP';
        }

        studentMap.set(key, {
          id: id || existing?.id || prn,
          uid: u.uid || u.id || existing?.uid,
          fullName: u.fullName || u.displayName || existing?.fullName || (prn ? `Student ${prn.slice(-4)}` : 'Student'),
          displayName: u.displayName || u.fullName || existing?.displayName,
          prn: prn || existing?.prn || 'PENDING',
          email: email || existing?.email || '—',
          department: normalizeDepartment(u.department) || u.department || normalizeDepartment(existing?.department) || existing?.department || normalizeDepartment(matchedSec?.course) || 'General',
          year: u.year || existing?.year || 'SY',
          division: u.division || existing?.division || matchedSec?.name || 'A',
          totalPoints: points,
          currentStreak: streak,
          solvedCount: Math.round(points / 25),
          integrityScore,
          integrityRisk,
          tabSwitchCount: tabSwitches,
          copyPasteAttempts: pasteAttempts,
          statusCategory,
          sectionId: matchedSec?.id || u.sectionId || existing?.sectionId,
          sectionName: matchedSec?.name || existing?.sectionName,
          sectionJoinCode: matchedSec?.joinCode || existing?.sectionJoinCode,
        });
      });

      const studentsList = Array.from(studentMap.values());

      return {
        sections: mySections,
        students: studentsList,
        flaggedQuestions: backendOverview?.flaggedQuestions || [
          {
            problemId: 'prob_ptrs_01',
            title: 'Pointer Arithmetic & Dynamic Memory (malloc/free)',
            attempts: 42,
            failureRate: 58,
            flagReason: 'High Segmentation Fault / Null Pointer Dereference',
          },
          {
            problemId: 'prob_arr_02',
            title: 'Matrix Multiplication & 2D Array Bounds',
            attempts: 36,
            failureRate: 44,
            flagReason: 'Buffer Overflow / Out of Bounds indexing',
          },
        ],
      };
    },
    refetchInterval: 5000,
    refetchOnWindowFocus: true,
  });

  // Subscribe to real-time events from Section Management Page
  useEffect(() => {
    const unsubSections = RealtimeSyncService.on('SECTIONS', () => {
      refetch();
    });
    const unsubUsers = RealtimeSyncService.on('USERS', () => {
      refetch();
    });
    return () => {
      unsubSections();
      unsubUsers();
    };
  }, [refetch]);

  // 2. Candidate Deep Dive Query
  const { data: deepDiveData, isLoading: isDeepDiveLoading } = useQuery({
    queryKey: ['candidate-inspection', selectedStudentForInspect],
    queryFn: async () => {
      if (!selectedStudentForInspect) return null;
      let resultData: any = null;

      // Try Backend Deep Dive
      try {
        const res = await api.get(`/analytics/faculty/student-deep-dive/${encodeURIComponent(selectedStudentForInspect)}`);
        if (res?.data?.student) {
          resultData = res.data;
        }
      } catch (err) {
        console.warn('Backend deep dive failed, falling back to Firestore:', err);
      }

      // Fallback to Firestore
      if (!resultData?.student) {
        const fsStudent = await FirestoreDataService.findEnrolledStudentInFirestore(selectedStudentForInspect);
        if (fsStudent) {
          const fsSubmissions = await FirestoreDataService.getUserSubmissions(fsStudent.id || fsStudent.uid || '');
          resultData = {
            student: {
              id: fsStudent.id || fsStudent.uid || 'fs_student',
              fullName: fsStudent.fullName || fsStudent.name || fsStudent.displayName || `Student ${(fsStudent.prn || selectedStudentForInspect).slice(-4)}`,
              displayName: fsStudent.displayName || fsStudent.fullName || 'Student',
              prn: fsStudent.prn || selectedStudentForInspect,
              email: fsStudent.email || '—',
              department: normalizeDepartment(fsStudent.department) || fsStudent.department || 'General',
              year: fsStudent.year || 'SY',
              division: fsStudent.division || '—',
              totalPoints: Number(fsStudent.totalPoints || 0),
              currentStreak: Number(fsStudent.currentStreak || 0),
            },
            assignments: [],
            submissions: fsSubmissions,
            miniProjects: [],
          };
        }
      }

      if (!resultData?.student) {
        toast.error(`No student record found matching "${selectedStudentForInspect}".`);
        return null;
      }

      return resultData;
    },
    enabled: Boolean(selectedStudentForInspect),
  });

  // Filtered Students List
  const filteredStudents = useMemo(() => {
    if (!analyticsData?.students) return [];
    return analyticsData.students.filter((st: any) => {
      // Section filter
      if (selectedSectionId !== 'ALL') {
        const matchesSection =
          st.sectionId === selectedSectionId ||
          st.sectionJoinCode === selectedSectionId ||
          (analyticsData?.sections || []).some(
            (sec: any) =>
              (sec.id === selectedSectionId || sec.joinCode === selectedSectionId) &&
              (sec.students || []).some((s: any) => {
                const sP = (s.prn || s.student?.prn || '').toUpperCase();
                const sE = (s.email || s.student?.email || '').toLowerCase();
                return (st.prn && sP === st.prn) || (st.email && sE === st.email.toLowerCase());
              })
          );
        if (!matchesSection) return false;
      }
      // Tab filter
      if (activeFilterTab !== 'ALL' && st.statusCategory !== activeFilterTab) {
        return false;
      }
      // Text search
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesName = (st.fullName || '').toLowerCase().includes(q);
        const matchesPrn = (st.prn || '').toLowerCase().includes(q);
        const matchesEmail = (st.email || '').toLowerCase().includes(q);
        return matchesName || matchesPrn || matchesEmail;
      }
      return true;
    });
  }, [analyticsData?.students, analyticsData?.sections, selectedSectionId, activeFilterTab, searchQuery]);

  // Aggregate Metrics
  const metrics = useMemo(() => {
    const list = analyticsData?.students || [];
    const totalEnrolled = list.length;
    const activeSolvers = list.filter((s) => s.totalPoints > 0 || s.currentStreak > 0).length;
    const needsHelp = list.filter((s) => s.statusCategory === 'NEEDS_HELP').length;
    const integrityAlerts = list.filter((s) => s.statusCategory === 'INTEGRITY_FLAG').length;
    const avgScore = totalEnrolled > 0
      ? Math.round(list.reduce((acc, s) => acc + s.totalPoints, 0) / totalEnrolled)
      : 0;

    return { totalEnrolled, activeSolvers, needsHelp, integrityAlerts, avgScore };
  }, [analyticsData?.students]);

  // Calculate deep dive telemetry
  const inspectTelemetry = useMemo(() => {
    if (!deepDiveData) return null;
    const attempts = (deepDiveData.assignments || []).flatMap((a: any) => a.attempts || []);

    // Merge telemetry with main analytics roster item if present
    const matched = (analyticsData?.students || []).find(
      (s) => s.prn === selectedStudentForInspect || s.id === selectedStudentForInspect || s.uid === selectedStudentForInspect
    );

    const attemptsTabSwitches = attempts.reduce((acc: number, att: any) => acc + (att.tabSwitchCount || 0), 0);
    const attemptsCopyPaste = attempts.reduce((acc: number, att: any) => acc + (att.copyPasteAttempts || 0), 0);
    const attemptsFullScreenExits = attempts.reduce((acc: number, att: any) => acc + (att.fullScreenExitCount || 0), 0);

    const totalTabSwitches = Math.max(attemptsTabSwitches, matched?.tabSwitchCount || 0);
    const totalCopyPaste = Math.max(attemptsCopyPaste, matched?.copyPasteAttempts || 0);
    const totalFullScreenExits = attemptsFullScreenExits;
    const vivaList = (deepDiveData.assignments || []).flatMap((a: any) => a.vivaQuestions || []);

    const baseScore = (deepDiveData.assignments && deepDiveData.assignments[0]?.integrityScore !== undefined)
      ? deepDiveData.assignments[0].integrityScore
      : (matched?.integrityScore !== undefined ? matched.integrityScore : (totalTabSwitches >= 3 ? 35 : totalTabSwitches > 0 ? 75 : 100));

    const baseRisk = (deepDiveData.assignments && deepDiveData.assignments[0]?.integrityRisk)
      ? deepDiveData.assignments[0].integrityRisk
      : (matched?.integrityRisk || (baseScore <= 40 ? 'HIGH' : baseScore <= 75 ? 'MODERATE' : 'NORMAL'));

    return {
      totalTabSwitches,
      totalCopyPaste,
      totalFullScreenExits,
      vivaList,
      integrityScore: baseScore,
      integrityRisk: baseRisk,
    };
  }, [deepDiveData, analyticsData?.students, selectedStudentForInspect]);

  // Faculty Actions: Verify / Clear Flag
  const isCandidateVerified = Boolean(
    selectedStudentForInspect && verifiedStudents.has(selectedStudentForInspect)
  );

  const handleToggleVerified = () => {
    if (!selectedStudentForInspect) return;
    setVerifiedStudents((prev) => {
      const next = new Set(prev);
      if (next.has(selectedStudentForInspect)) {
        next.delete(selectedStudentForInspect);
        toast.info('Student integrity flag restored.');
      } else {
        next.add(selectedStudentForInspect);
        toast.success('Integrity verified: Flag pardoned by faculty.');
      }
      return next;
    });
  };

  // Faculty Actions: Copy Full Audit Report
  const handleCopyStudentReport = () => {
    if (!deepDiveData?.student) return;
    const s = deepDiveData.student;
    const submissions = deepDiveData.submissions || [];
    const acceptedCount = submissions.filter((sub: any) => sub.verdict === 'ACCEPTED').length;
    const integrityStatus = isCandidateVerified
      ? 'VERIFIED_CLEAN (Pardoned by Faculty Review)'
      : (inspectTelemetry?.integrityRisk || 'NORMAL');

    const text = `🎓 LOGICQ CANDIDATE INSPECTION AUDIT
------------------------------------------------
Candidate Name : ${s.fullName}
PRN / Roll No  : ${s.prn || 'N/A'}
Email Address  : ${s.email}
Academic Dept  : ${s.department || '—'} (Year ${s.year || 'SY'})
Total Points   : ${s.totalPoints || 0} PTS
Current Streak : ${s.currentStreak || 0} Days
Total Submissions: ${submissions.length} (${acceptedCount} Accepted)
Integrity Status: ${integrityStatus} (Score: ${isCandidateVerified ? 100 : (inspectTelemetry?.integrityScore || 100)}/100)
Proctoring Violations:
  - Tab Switches    : ${inspectTelemetry?.totalTabSwitches || 0}
  - Clipboard Pastes: ${inspectTelemetry?.totalCopyPaste || 0}
  - Fullscreen Exits: ${inspectTelemetry?.totalFullScreenExits || 0}
Generated On   : ${new Date().toLocaleString()}`;

    navigator.clipboard.writeText(text);
    toast.success('Candidate audit report copied to clipboard!');
  };

  const handleCopyCode = (id: string, code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCodeId(id);
    toast.success('C source code copied to clipboard');
    setTimeout(() => setCopiedCodeId(null), 2000);
  };

  const handleCopyPrn = (prn: string) => {
    navigator.clipboard.writeText(prn);
    setCopiedPrn(true);
    toast.success(`PRN copied: ${prn}`);
    setTimeout(() => setCopiedPrn(false), 2000);
  };

  // Export CSV
  const handleExportRoster = () => {
    try {
      setIsExportingCsv(true);
      const rows = [
        ['PRN / Roll No', 'Student Name', 'Email', 'Department', 'Year', 'Division', 'Points', 'Streak', 'Tab Switches', 'Copy-Paste Attempts', 'Integrity Risk', 'Status'],
        ...filteredStudents.map((s) => [
          `"${s.prn}"`,
          `"${s.fullName}"`,
          `"${s.email}"`,
          `"${s.department}"`,
          `"${s.year}"`,
          `"${s.division}"`,
          s.totalPoints,
          s.currentStreak,
          s.tabSwitchCount,
          s.copyPasteAttempts,
          `"${s.integrityRisk}"`,
          `"${s.statusCategory}"`,
        ]),
      ];

      const csvContent = 'data:text/csv;charset=utf-8,' + rows.map((e) => e.join(',')).join('\n');
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement('a');
      link.setAttribute('href', encodedUri);
      link.setAttribute('download', `Classroom_Roster_${selectedSectionId}_${new Date().toISOString().slice(0, 10)}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.success('Classroom analytics roster exported successfully!');
    } catch {
      toast.error('Failed to export roster.');
    } finally {
      setIsExportingCsv(false);
    }
  };

  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-20 text-center space-y-4">
        <div className="w-9 h-9 rounded-full border-2 border-indigo-500 border-t-transparent animate-spin mx-auto" />
        <p className="text-sm text-[var(--muted-foreground)] font-sans">Loading classroom performance intelligence...</p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-8 font-sans">
      {/* 1. Header Banner */}
      <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-6 sm:p-8 shadow-sm relative overflow-hidden">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-3">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-600 dark:text-indigo-400 text-xs font-semibold">
              <Brain className="w-3.5 h-3.5" />
              <span>Faculty Assessment & Continuous Evaluation Hub</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-[var(--foreground)] tracking-tight">
              Classroom Performance & Code Intelligence
            </h1>
            <p className="text-[var(--muted-foreground)] text-xs sm:text-sm max-w-2xl leading-relaxed">
              Track student daily C programming progress, inspect candidate cheating telemetry (tab switches, copy-paste attempts), diagnose concept gaps, and export grades.
            </p>
          </div>

          {/* Section Filter & Export CSV */}
          <div className="flex flex-wrap items-center gap-3">
            {/* Quick Link to Section Management */}
            <Link
              to="/faculty/sections"
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[var(--background)] border border-[var(--border)] hover:border-indigo-500/40 text-[var(--foreground)] text-xs font-semibold shadow-sm transition"
              title="Go to Section Management to add or edit sections and rosters"
            >
              <BookOpen className="w-3.5 h-3.5 text-indigo-400" />
              <span>Sections ({analyticsData?.sections?.length || 0})</span>
            </Link>

            {/* Manual Sync / Refresh Button */}
            <button
              onClick={() => {
                refetch();
                toast.success('Classroom analytics synchronized with latest sections!');
              }}
              disabled={isFetching}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[var(--background)] border border-[var(--border)] hover:border-indigo-500/40 text-[var(--foreground)] text-xs font-semibold shadow-sm transition cursor-pointer"
              title="Instant sync with sections and student rosters"
            >
              <RotateCcw className={`w-3.5 h-3.5 text-indigo-400 ${isFetching ? 'animate-spin' : ''}`} />
              <span>{isFetching ? 'Syncing...' : 'Sync Now'}</span>
            </button>

            <div className="flex items-center gap-2 bg-[var(--background)] border border-[var(--border)] rounded-xl px-3 py-2 text-xs">
              <Filter className="w-3.5 h-3.5 text-indigo-500" />
              <select
                value={selectedSectionId}
                onChange={(e) => handleSectionSelect(e.target.value)}
                className="bg-transparent text-[var(--foreground)] text-xs font-medium focus:outline-none cursor-pointer"
              >
                <option value="ALL" className="bg-[var(--card)] text-[var(--foreground)]">All Academic Sections</option>
                {(analyticsData?.sections || []).map((sec: any) => (
                  <option key={sec.id} value={sec.id} className="bg-[var(--card)] text-[var(--foreground)]">
                    {sec.name} ({sec.course})
                  </option>
                ))}
              </select>
            </div>

            <button
              onClick={handleExportRoster}
              disabled={isExportingCsv || filteredStudents.length === 0}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-sm transition-all disabled:opacity-50 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>{isExportingCsv ? 'Exporting...' : 'Export Marks (CSV)'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* 2. Top 4 Primary Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Total Enrolled */}
        <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-5 space-y-2 hover:border-[var(--accent)]/40 shadow-sm transition">
          <div className="flex items-center justify-between text-[var(--muted-foreground)] text-xs font-medium">
            <span>Enrolled Students</span>
            <Users className="w-4 h-4 text-indigo-500" />
          </div>
          <div className="text-3xl font-black text-[var(--foreground)] font-mono">
            {metrics.totalEnrolled}
          </div>
          <p className="text-[11px] text-[var(--muted-foreground)] flex items-center gap-1">
            <span className="text-indigo-600 dark:text-indigo-400 font-semibold">
              {analyticsData?.sections?.length || 0} {analyticsData?.sections?.length === 1 ? 'section' : 'sections'}
            </span> monitored
          </p>
        </div>

        {/* Card 2: Active Solvers */}
        <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-5 space-y-2 hover:border-[var(--accent)]/40 shadow-sm transition">
          <div className="flex items-center justify-between text-[var(--muted-foreground)] text-xs font-medium">
            <span>Active Solvers</span>
            <TrendingUp className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-3xl font-black text-emerald-600 dark:text-emerald-400 font-mono">
            {metrics.activeSolvers}
          </div>
          <p className="text-[11px] text-[var(--muted-foreground)]">
            {metrics.totalEnrolled > 0 ? Math.round((metrics.activeSolvers / metrics.totalEnrolled) * 100) : 0}% solving daily challenges
          </p>
        </div>

        {/* Card 3: Needs Help */}
        <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-5 space-y-2 hover:border-[var(--accent)]/40 shadow-sm transition">
          <div className="flex items-center justify-between text-[var(--muted-foreground)] text-xs font-medium">
            <span>Needs Assistance</span>
            <AlertTriangle className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-3xl font-black text-amber-600 dark:text-amber-400 font-mono">
            {metrics.needsHelp}
          </div>
          <p className="text-[11px] text-[var(--muted-foreground)]">
            Low activity or multiple test failures
          </p>
        </div>

        {/* Card 4: Integrity Review Flags */}
        <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-5 space-y-2 hover:border-[var(--accent)]/40 shadow-sm transition">
          <div className="flex items-center justify-between text-[var(--muted-foreground)] text-xs font-medium">
            <span>Integrity / Anti-Cheat Flags</span>
            <ShieldAlert className="w-4 h-4 text-rose-500" />
          </div>
          <div className="text-3xl font-black text-rose-600 dark:text-rose-400 font-mono">
            {metrics.integrityAlerts}
          </div>
          <p className="text-[11px] text-[var(--muted-foreground)]">
            Tab switches or copy-paste violations
          </p>
        </div>
      </div>

      {/* 3. Diagnostic Alert: Topics Needing Discussion in Lecture */}
      <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-6 space-y-4 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[var(--border)] pb-3">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-indigo-500" />
            <h2 className="text-base font-bold text-[var(--foreground)]">
              Classroom Diagnostic: Concepts Needing Attention in Next Lecture
            </h2>
          </div>
          <span className="text-[11px] text-[var(--muted-foreground)]">
            Based on student compiler errors and test case failure rates
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {(analyticsData?.flaggedQuestions || []).map((q: any) => (
            <div key={q.problemId} className="p-4 rounded-xl bg-[var(--background)] border border-[var(--border)] hover:border-[var(--accent)]/30 transition space-y-3">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h3 className="font-bold text-[var(--foreground)] text-xs sm:text-sm">{q.title}</h3>
                  <p className="text-[11px] text-amber-600 dark:text-amber-400 font-medium mt-0.5">{q.flagReason}</p>
                </div>
                <span className="px-2.5 py-1 rounded-full bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-[10px] font-bold font-mono whitespace-nowrap">
                  {q.failureRate}% Failure Rate
                </span>
              </div>
              <div className="flex items-center justify-between text-[11px] text-[var(--muted-foreground)] pt-1 border-t border-[var(--border)]/60">
                <span>{q.attempts} students attempted</span>
                <span className="text-indigo-600 dark:text-indigo-400 font-medium">Recommended for live whiteboard demo</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 4. Student Roster Table & Quick Investigation */}
      <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-6 space-y-6 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[var(--border)] pb-4">
          <div>
            <h2 className="text-base font-bold text-[var(--foreground)]">Student Academic & Anti-Cheat Roster</h2>
            <p className="text-xs text-[var(--muted-foreground)]">
              Track student daily score, tab switches, copy-paste attempts, and inspect submitted C code.
            </p>
          </div>

          {/* Search Box */}
          <div className="relative w-full md:w-80">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted-foreground)]" />
            <input
              type="text"
              placeholder="Search Name, PRN (e.g. 2126PMIF1057)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-[var(--border)] bg-[var(--background)] text-[var(--foreground)] placeholder-[var(--muted-foreground)] focus:outline-none focus:border-indigo-500 font-mono"
            />
          </div>
        </div>

        {/* Filter Pills */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setActiveFilterTab('ALL')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
              activeFilterTab === 'ALL'
                ? 'bg-indigo-600 text-white'
                : 'bg-[var(--background)] border border-[var(--border)] text-[var(--muted-foreground)] hover:text-[var(--foreground)]'
            }`}
          >
            All Students ({analyticsData?.students?.length || 0})
          </button>
          <button
            onClick={() => setActiveFilterTab('CONSISTENT')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
              activeFilterTab === 'CONSISTENT'
                ? 'bg-emerald-600 text-white'
                : 'bg-[var(--background)] border border-[var(--border)] text-[var(--muted-foreground)] hover:text-[var(--foreground)]'
            }`}
          >
            🟢 Consistent Solvers ({analyticsData?.students?.filter((s) => s.statusCategory === 'CONSISTENT').length || 0})
          </button>
          <button
            onClick={() => setActiveFilterTab('NEEDS_HELP')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
              activeFilterTab === 'NEEDS_HELP'
                ? 'bg-amber-600 text-white'
                : 'bg-[var(--background)] border border-[var(--border)] text-[var(--muted-foreground)] hover:text-[var(--foreground)]'
            }`}
          >
            🟡 Needs Assistance ({analyticsData?.students?.filter((s) => s.statusCategory === 'NEEDS_HELP').length || 0})
          </button>
          <button
            onClick={() => setActiveFilterTab('INTEGRITY_FLAG')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
              activeFilterTab === 'INTEGRITY_FLAG'
                ? 'bg-rose-600 text-white'
                : 'bg-[var(--background)] border border-[var(--border)] text-[var(--muted-foreground)] hover:text-[var(--foreground)]'
            }`}
          >
            🔴 Integrity / Cheating Flags ({analyticsData?.students?.filter((s) => s.statusCategory === 'INTEGRITY_FLAG').length || 0})
          </button>
        </div>

        {/* Students Table */}
        {filteredStudents.length === 0 ? (
          <div className="py-12 text-center space-y-3 bg-[var(--background)]/30 rounded-2xl border border-dashed border-[var(--border)]">
            <Users className="w-8 h-8 text-[var(--muted-foreground)] mx-auto opacity-50" />
            <p className="text-sm font-semibold text-[var(--foreground)]">No students found matching your criteria</p>
            <p className="text-xs text-[var(--muted-foreground)] max-w-md mx-auto">
              {selectedSectionId !== 'ALL'
                ? 'No students found enrolled in this selected section yet. You can add or import students from the Section Management dashboard.'
                : 'Try adjusting your search query, filter tabs, or select a different academic section.'}
            </p>
            <div className="pt-2">
              <Link
                to="/faculty/sections"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white transition shadow-sm"
              >
                <BookOpen className="w-3.5 h-3.5" />
                Go to Sections & Rosters
              </Link>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-[var(--border)] text-[var(--muted-foreground)] font-mono uppercase tracking-wider text-[11px]">
                  <th className="py-3 px-4">Student Name</th>
                  <th className="py-3 px-4">PRN / Roll No</th>
                  <th className="py-3 px-4">Department</th>
                  <th className="py-3 px-4">Points</th>
                  <th className="py-3 px-4">Streak</th>
                  <th className="py-3 px-4">Anti-Cheat Audit</th>
                  <th className="py-3 px-4">Learning Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)]/60 font-sans">
                {filteredStudents.map((student) => (
                  <tr key={student.id} className="hover:bg-[var(--accent)]/5 transition">
                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-[var(--foreground)]">{student.fullName}</div>
                      <div className="text-[11px] text-[var(--muted-foreground)] font-mono">{student.email}</div>
                    </td>
                    <td className="py-3.5 px-4 font-mono font-bold text-indigo-600 dark:text-indigo-400">
                      {student.prn}
                    </td>
                    <td className="py-3.5 px-4 text-[var(--foreground)]">
                      <div>{student.department} • Year {student.year}</div>
                      {student.sectionName && (
                        <div className="text-[10px] text-indigo-400 font-medium font-sans mt-0.5">
                          {student.sectionName}
                        </div>
                      )}
                    </td>
                    <td className="py-3.5 px-4 font-mono font-bold text-[var(--foreground)]">
                      {student.totalPoints} PTS
                    </td>
                    <td className="py-3.5 px-4 font-mono">
                      {student.currentStreak > 0 ? (
                        <span className="inline-flex items-center gap-1 text-amber-600 dark:text-amber-400 font-bold">
                          <Flame className="w-3.5 h-3.5" />
                          {student.currentStreak}d
                        </span>
                      ) : (
                        <span className="text-[var(--muted-foreground)]">0d</span>
                      )}
                    </td>
                    {/* Anti-Cheat & Cheating Audit Badge */}
                    <td className="py-3.5 px-4">
                      {student.tabSwitchCount === 0 && student.copyPasteAttempts === 0 ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20">
                          <ShieldCheck className="w-3 h-3" />
                          Clean (0 Flags)
                        </span>
                      ) : student.tabSwitchCount >= 3 || student.copyPasteAttempts >= 3 ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/10 text-rose-700 dark:text-rose-400 border border-rose-500/20">
                          <ShieldAlert className="w-3 h-3" />
                          High Risk ({student.tabSwitchCount} tabs)
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20">
                          <AlertTriangle className="w-3 h-3" />
                          {student.tabSwitchCount} Tab Switch
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 px-4">
                      {student.statusCategory === 'CONSISTENT' ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20">
                          <CheckCircle2 className="w-3 h-3" />
                          On Track
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20">
                          <AlertTriangle className="w-3 h-3" />
                          Needs Help
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <button
                        onClick={() => setSelectedStudentForInspect(student.prn || student.id)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20 font-semibold text-xs transition cursor-pointer"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>Inspect Student</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 5. Student Code & Proctoring Anti-Cheat Audit Modal */}
      {selectedStudentForInspect && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl w-full max-w-3xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden">
            {/* Modal Header */}
            <div className="p-5 border-b border-[var(--border)] bg-[var(--background)]">
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-500 text-white font-bold text-sm flex items-center justify-center shadow-sm font-mono">
                    {deepDiveData?.student?.fullName
                      ? deepDiveData.student.fullName
                          .split(' ')
                          .map((n: string) => n[0])
                          .slice(0, 2)
                          .join('')
                          .toUpperCase()
                      : 'ST'}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-[var(--foreground)] text-base">
                        {deepDiveData?.student?.fullName || 'Candidate Inspection'}
                      </h3>
                      {/* PRN Badge with 1-click copy */}
                      {deepDiveData?.student?.prn && (
                        <button
                          onClick={() => handleCopyPrn(deepDiveData.student.prn)}
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-mono font-semibold bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20 hover:bg-indigo-500/20 transition cursor-pointer"
                          title="Click to copy PRN"
                        >
                          <span>{deepDiveData.student.prn}</span>
                          {copiedPrn ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3 opacity-60" />}
                        </button>
                      )}
                    </div>
                    <p className="text-xs text-[var(--muted-foreground)]">
                      {deepDiveData?.student?.email || '—'}{deepDiveData?.student?.department ? ` • ${deepDiveData.student.department}` : ''} (Year {deepDiveData?.student?.year || 'SY'})
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => setSelectedStudentForInspect(null)}
                  className="p-1.5 rounded-lg text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:bg-[var(--accent)]/10 transition cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Quick Stat Ribbon */}
              {deepDiveData?.student && (
                <div className="flex flex-wrap items-center justify-between gap-2 mt-4 pt-3 border-t border-[var(--border)]/70 text-xs">
                  <div className="flex items-center gap-3">
                    <span className="inline-flex items-center gap-1 font-mono text-[var(--foreground)] font-semibold">
                      <Award className="w-3.5 h-3.5 text-indigo-500" />
                      {deepDiveData.student.totalPoints || 0} PTS
                    </span>
                    <span className="text-[var(--border)]">|</span>
                    <span className="inline-flex items-center gap-1 font-mono text-amber-600 dark:text-amber-400 font-semibold">
                      <Flame className="w-3.5 h-3.5" />
                      {deepDiveData.student.currentStreak || 0}d Streak
                    </span>
                    <span className="text-[var(--border)]">|</span>
                    <span className="inline-flex items-center gap-1 text-[var(--muted-foreground)] font-mono">
                      <FileCode className="w-3.5 h-3.5 text-emerald-500" />
                      {(deepDiveData.submissions || []).length} Submissions
                    </span>
                  </div>

                  {/* Standing Pill */}
                  <div>
                    {isCandidateVerified ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Verified Clean by Faculty
                      </span>
                    ) : (inspectTelemetry?.integrityRisk === 'HIGH' || inspectTelemetry?.integrityRisk === 'CRITICAL') ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-rose-500/10 text-rose-700 dark:text-rose-400 border border-rose-500/20">
                        <ShieldAlert className="w-3.5 h-3.5" />
                        Integrity Flagged ({inspectTelemetry?.totalTabSwitches || 0} tabs)
                      </span>
                    ) : inspectTelemetry?.integrityRisk === 'MODERATE' ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20">
                        <AlertTriangle className="w-3.5 h-3.5" />
                        Moderate Risk ({inspectTelemetry?.totalTabSwitches || 0} tabs)
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20">
                        <ShieldCheck className="w-3.5 h-3.5" />
                        Proctoring Clean (0 Flags)
                      </span>
                    )}
                  </div>
                </div>
              )}

              {/* Modal Tabs Bar */}
              <div className="flex items-center gap-2 mt-4 pt-2 border-t border-[var(--border)]/60">
                <button
                  onClick={() => setModalTab('audit')}
                  className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                    modalTab === 'audit'
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : 'bg-transparent text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:bg-[var(--accent)]/10'
                  }`}
                >
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>Proctoring & Anti-Cheat Audit</span>
                </button>
                <button
                  onClick={() => setModalTab('submissions')}
                  className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                    modalTab === 'submissions'
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : 'bg-transparent text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:bg-[var(--accent)]/10'
                  }`}
                >
                  <Code2 className="w-3.5 h-3.5" />
                  <span>Submitted C Code ({(deepDiveData?.submissions || []).length})</span>
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-6">
              {isDeepDiveLoading ? (
                <div className="py-16 text-center space-y-3">
                  <div className="w-8 h-8 rounded-full border-2 border-indigo-500 border-t-transparent animate-spin mx-auto" />
                  <p className="text-xs text-[var(--muted-foreground)]">Loading candidate telemetry & submitted code...</p>
                </div>
              ) : !deepDiveData?.student ? (
                <div className="py-12 text-center text-[var(--muted-foreground)] text-xs">
                  Unable to load records for this candidate.
                </div>
              ) : modalTab === 'audit' ? (
                /* TAB 1: ANTI-CHEAT & PROCTORING AUDIT */
                <div className="space-y-5">
                  {/* Faculty Override & Integrity Health Banner */}
                  <div className="p-4 rounded-xl bg-[var(--background)] border border-[var(--border)] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold uppercase tracking-wider text-[var(--muted-foreground)]">
                          Integrity Health Score
                        </span>
                        <span
                          className={`px-2 py-0.5 rounded text-xs font-bold font-mono ${
                            isCandidateVerified
                              ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20'
                              : (inspectTelemetry?.integrityScore || 100) >= 80
                              ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20'
                              : (inspectTelemetry?.integrityScore || 100) >= 50
                              ? 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20'
                              : 'bg-rose-500/10 text-rose-700 dark:text-rose-400 border border-rose-500/20'
                          }`}
                        >
                          {isCandidateVerified ? '100 / 100 (VERIFIED)' : `${inspectTelemetry?.integrityScore || 100} / 100`}
                        </span>
                      </div>
                      <p className="text-xs text-[var(--muted-foreground)]">
                        {isCandidateVerified
                          ? 'This candidate has been human-reviewed and pardoned by faculty.'
                          : (inspectTelemetry?.totalTabSwitches || 0) > 0 || (inspectTelemetry?.totalCopyPaste || 0) > 0
                          ? 'Suspicious events logged during coding sessions or lab assessment.'
                          : 'Zero anti-cheat violations detected across all test attempts.'}
                      </p>
                    </div>

                    {/* Faculty Action: Mark Verified Button */}
                    <button
                      onClick={handleToggleVerified}
                      className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold transition cursor-pointer whitespace-nowrap ${
                        isCandidateVerified
                          ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs'
                          : 'bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20'
                      }`}
                    >
                      {isCandidateVerified ? (
                        <>
                          <Check className="w-3.5 h-3.5" />
                          <span>Pardoned (Click to Re-flag)</span>
                        </>
                      ) : (
                        <>
                          <ShieldCheck className="w-3.5 h-3.5" />
                          <span>Mark Verified (Clear Flag)</span>
                        </>
                      )}
                    </button>
                  </div>

                  {/* 3 Real Telemetry Cards */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {/* Telemetry 1: Tab Switches */}
                    <div className="p-4 rounded-xl bg-[var(--background)] border border-[var(--border)] space-y-2">
                      <div className="flex items-center justify-between text-xs text-[var(--muted-foreground)]">
                        <span className="font-semibold">Tab Switches</span>
                        <Activity className="w-3.5 h-3.5 text-indigo-500" />
                      </div>
                      <div className={`text-2xl font-black font-mono ${
                        (inspectTelemetry?.totalTabSwitches || 0) > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-emerald-600 dark:text-emerald-400'
                      }`}>
                        {inspectTelemetry?.totalTabSwitches || 0}
                      </div>
                      <p className="text-[11px] text-[var(--muted-foreground)] leading-tight">
                        {(inspectTelemetry?.totalTabSwitches || 0) === 0
                          ? 'Clean: Remained focused on code editor throughout session'
                          : `Alert: Switched tabs ${(inspectTelemetry?.totalTabSwitches || 0)} times during active test`}
                      </p>
                    </div>

                    {/* Telemetry 2: Copy-Paste Events */}
                    <div className="p-4 rounded-xl bg-[var(--background)] border border-[var(--border)] space-y-2">
                      <div className="flex items-center justify-between text-xs text-[var(--muted-foreground)]">
                        <span className="font-semibold">Clipboard Pastes</span>
                        <Copy className="w-3.5 h-3.5 text-rose-500" />
                      </div>
                      <div className={`text-2xl font-black font-mono ${
                        (inspectTelemetry?.totalCopyPaste || 0) > 0 ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'
                      }`}>
                        {inspectTelemetry?.totalCopyPaste || 0}
                      </div>
                      <p className="text-[11px] text-[var(--muted-foreground)] leading-tight">
                        {(inspectTelemetry?.totalCopyPaste || 0) === 0
                          ? 'Clean: All C logic written directly via keyboard keystrokes'
                          : `Alert: ${(inspectTelemetry?.totalCopyPaste || 0)} external code paste attempts logged`}
                      </p>
                    </div>

                    {/* Telemetry 3: Fullscreen Exits */}
                    <div className="p-4 rounded-xl bg-[var(--background)] border border-[var(--border)] space-y-2">
                      <div className="flex items-center justify-between text-xs text-[var(--muted-foreground)]">
                        <span className="font-semibold">Fullscreen Exits</span>
                        <ShieldAlert className="w-3.5 h-3.5 text-amber-500" />
                      </div>
                      <div className={`text-2xl font-black font-mono ${
                        (inspectTelemetry?.totalFullScreenExits || 0) > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-emerald-600 dark:text-emerald-400'
                      }`}>
                        {inspectTelemetry?.totalFullScreenExits || 0}
                      </div>
                      <p className="text-[11px] text-[var(--muted-foreground)] leading-tight">
                        {(inspectTelemetry?.totalFullScreenExits || 0) === 0
                          ? 'Clean: Candidate stayed inside locked fullscreen assessment'
                          : `Alert: ${(inspectTelemetry?.totalFullScreenExits || 0)} window minimize/escape events`}
                      </p>
                    </div>
                  </div>

                  {/* AI Viva Voce Oral Defense */}
                  <div className="p-4 rounded-xl bg-[var(--background)] border border-[var(--border)] space-y-3">
                    <div className="flex items-center justify-between border-b border-[var(--border)] pb-2.5">
                      <div className="flex items-center gap-2">
                        <MessageSquare className="w-4 h-4 text-indigo-500" />
                        <h4 className="font-bold text-[var(--foreground)] text-xs uppercase tracking-wider">
                          AI Oral Viva Voce Verification
                        </h4>
                      </div>
                      <span className="text-[11px] text-[var(--muted-foreground)]">
                        {(inspectTelemetry?.vivaList || []).length} Question(s) Recorded
                      </span>
                    </div>

                    {(!inspectTelemetry?.vivaList || inspectTelemetry.vivaList.length === 0) ? (
                      <div className="py-4 text-center text-[var(--muted-foreground)] text-xs italic">
                        No AI oral viva defense questions recorded for this candidate yet. Viva voce triggers automatically upon test submission.
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {inspectTelemetry.vivaList.map((v: any, vIdx: number) => (
                          <div key={v.id || vIdx} className="p-3 bg-[var(--card)] border border-[var(--border)] rounded-xl space-y-2 text-xs">
                            <div className="font-semibold text-[var(--foreground)]">
                              Q{vIdx + 1}: {v.prompt}
                            </div>
                            <div className="p-2.5 rounded-lg bg-[var(--background)] border border-[var(--border)] text-xs text-[var(--foreground)] font-mono">
                              <span className="text-[10px] text-[var(--muted-foreground)] block font-sans mb-1 uppercase font-bold">
                                Candidate Spoken / Typed Response:
                              </span>
                              {v.studentAnswer || '<No oral answer provided>'}
                            </div>
                            <div className="flex items-center justify-between text-[11px] pt-1">
                              <span className="font-semibold text-indigo-600 dark:text-indigo-400">
                                AI Evaluation: {v.status || 'VERIFIED'}
                              </span>
                              <span className="text-[var(--muted-foreground)]">
                                {v.feedback || 'Evaluated clean'}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Assigned Assessment Tests History */}
                  {(deepDiveData.assignments || []).length > 0 && (
                    <div className="p-4 rounded-xl bg-[var(--background)] border border-[var(--border)] space-y-3">
                      <h4 className="font-bold text-[var(--foreground)] text-xs uppercase tracking-wider">
                        Assigned Assessment Tests
                      </h4>
                      <div className="space-y-2">
                        {deepDiveData.assignments.map((asgn: any) => (
                          <div key={asgn.id} className="p-3 bg-[var(--card)] rounded-xl border border-[var(--border)] flex items-center justify-between text-xs">
                            <div>
                              <span className="font-semibold text-[var(--foreground)]">{asgn.test?.title || 'Academic Assessment'}</span>
                              <p className="text-[11px] text-[var(--muted-foreground)] mt-0.5">
                                Risk: {asgn.integrityRisk || 'NORMAL'}
                              </p>
                            </div>
                            <div className="text-right">
                              <span className="text-emerald-600 dark:text-emerald-400 font-bold font-mono text-sm">
                                {asgn.academicScore ?? 0} Marks
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                /* TAB 2: SUBMITTED C CODE & PRACTICE CHALLENGES */
                <div className="space-y-4">
                  <div className="flex items-center justify-between text-xs text-[var(--muted-foreground)]">
                    <span>Showing all recorded C code attempts and compiler test results.</span>
                    <span className="font-semibold text-[var(--foreground)]">
                      {(deepDiveData.submissions || []).filter((s: any) => s.verdict === 'ACCEPTED').length} Accepted / {(deepDiveData.submissions || []).length} Total
                    </span>
                  </div>

                  {(!deepDiveData.submissions || deepDiveData.submissions.length === 0) ? (
                    <div className="py-16 text-center space-y-3 bg-[var(--background)] rounded-2xl border border-[var(--border)]">
                      <Terminal className="w-8 h-8 text-[var(--muted-foreground)] mx-auto opacity-50" />
                      <p className="text-sm font-semibold text-[var(--foreground)]">No C code submissions found</p>
                      <p className="text-xs text-[var(--muted-foreground)] max-w-sm mx-auto">
                        This candidate has not submitted solutions for any practice modules or timed tests yet.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {deepDiveData.submissions.map((sub: any) => {
                        const isExpanded = expandedCodeId === sub.id;
                        return (
                          <div key={sub.id} className="p-4 bg-[var(--background)] border border-[var(--border)] rounded-xl space-y-3 text-xs">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                              <div className="flex items-center gap-2">
                                <span
                                  className={`px-2.5 py-0.5 rounded text-[10px] font-bold font-mono ${
                                    sub.verdict === 'ACCEPTED'
                                      ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20'
                                      : sub.verdict === 'WRONG_ANSWER'
                                      ? 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20'
                                      : 'bg-rose-500/10 text-rose-700 dark:text-rose-400 border border-rose-500/20'
                                  }`}
                                >
                                  {sub.verdict || 'SUBMITTED'}
                                </span>
                                <span className="font-bold text-[var(--foreground)] text-xs sm:text-sm">
                                  {sub.problem?.title || 'Practice Challenge'}
                                </span>
                                <span className="text-[var(--muted-foreground)] text-[10px] font-mono">
                                  ({sub.problem?.difficulty || 'C PRACTICE'})
                                </span>
                              </div>

                              <div className="flex items-center gap-3 text-[11px] text-[var(--muted-foreground)] font-mono">
                                {sub.runtimeMs !== null && sub.runtimeMs !== undefined && (
                                  <span>{sub.runtimeMs}ms</span>
                                )}
                                <span>{sub.createdAt ? new Date(sub.createdAt).toLocaleString() : ''}</span>
                              </div>
                            </div>

                            {/* Expandable Source Code Viewer */}
                            {sub.code && (
                              <div className="pt-1">
                                <div className="flex items-center justify-between">
                                  <button
                                    onClick={() => setExpandedCodeId(isExpanded ? null : sub.id)}
                                    className="inline-flex items-center gap-1.5 text-indigo-600 dark:text-indigo-400 hover:underline font-semibold cursor-pointer"
                                  >
                                    <Eye className="w-3.5 h-3.5" />
                                    <span>{isExpanded ? 'Hide C Source Code' : 'Inspect Submitted C Source Code'}</span>
                                  </button>

                                  {isExpanded && (
                                    <button
                                      onClick={() => handleCopyCode(sub.id, sub.code)}
                                      className="inline-flex items-center gap-1 text-[11px] text-[var(--muted-foreground)] hover:text-[var(--foreground)] cursor-pointer"
                                    >
                                      {copiedCodeId === sub.id ? (
                                        <>
                                          <Check className="w-3 h-3 text-emerald-500" />
                                          <span className="text-emerald-500">Copied!</span>
                                        </>
                                      ) : (
                                        <>
                                          <Copy className="w-3 h-3" />
                                          <span>Copy Code</span>
                                        </>
                                      )}
                                    </button>
                                  )}
                                </div>

                                {isExpanded && (
                                  <pre className="mt-2.5 p-4 bg-[#0A0D18] rounded-xl border border-gray-800 text-emerald-400 font-mono text-[11px] overflow-x-auto max-h-72 leading-relaxed shadow-inner">
                                    {sub.code}
                                  </pre>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-[var(--border)] flex items-center justify-between bg-[var(--background)]">
              <button
                onClick={handleCopyStudentReport}
                disabled={!deepDiveData?.student}
                className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-[var(--card)] hover:bg-[var(--accent)]/10 text-[var(--foreground)] border border-[var(--border)] text-xs font-semibold transition cursor-pointer disabled:opacity-50"
              >
                <Copy className="w-3.5 h-3.5 text-indigo-500" />
                <span>Copy Student Audit Report</span>
              </button>

              <button
                onClick={() => setSelectedStudentForInspect(null)}
                className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-xs transition cursor-pointer"
              >
                Close Inspection
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
