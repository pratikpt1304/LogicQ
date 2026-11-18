import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.js';
import { useTheme } from '../../context/ThemeContext.js';
import {
  LayoutDashboard,
  Layers,
  Users,
  BookOpen,
  Sliders,
  ShieldAlert,
  FileText,
  Sun,
  Moon,
  LogOut,
  Plus,
  ShieldCheck,
  Activity,
  Sparkles,
  Clock,
  ArrowRight,
  Eye,
  CheckCircle2,
  AlertTriangle,
  ChevronRight,
  Archive,
  Flag,
} from 'lucide-react';
import { toast } from 'sonner';

import { AdminCommandCenterTab } from '../../components/admin/AdminCommandCenterTab.js';
import { AdminSectionsTab } from '../../components/admin/AdminSectionsTab.js';
import { AdminStudentsTab } from '../../components/admin/AdminStudentsTab.js';
import { AdminQuestionBankTab } from '../../components/admin/AdminQuestionBankTab.js';
import { AdminTestOrchestratorTab } from '../../components/admin/AdminTestOrchestratorTab.js';
import { AdminIntegrityTab } from '../../components/admin/AdminIntegrityTab.js';
import { AdminReportsTab } from '../../components/admin/AdminReportsTab.js';
import { AdminAnswerBankTab } from '../../components/admin/AdminAnswerBankTab.js';
import { AdminRaisedIssuesTab } from '../../components/admin/AdminRaisedIssuesTab.js';
// AdminAnswerBankTab kept for legacy reference — Answer Bank is now inside StudentDeepDiveModal
import { StudentDeepDiveModal } from '../../components/admin/StudentDeepDiveModal.js';
import { FacultyPortalPage } from '../faculty/FacultyPortalPage.js';
import { FirestoreDataService } from '../../services/firestoreData.service.js';
import { collection, getDocs, onSnapshot } from 'firebase/firestore';
import { db } from '../../config/firebase.js';
import { realtimeSync } from '../../services/realtimeSync.service.js';

export type AdminTabKey =
  | 'command-center'
  | 'sections'
  | 'students'
  | 'question-bank'
  | 'test-orchestrator'
  | 'integrity'
  | 'reports'
  | 'raised-issues';

interface TabItem {
  id: AdminTabKey;
  label: string;
  badge?: string;
  icon: React.FC<{ className?: string }>;
}

const TABS: TabItem[] = [
  { id: 'command-center', label: 'Overview', icon: LayoutDashboard },
  { id: 'sections', label: 'Sections', icon: Layers },
  { id: 'students', label: 'Students', icon: Users },
  { id: 'question-bank', label: 'Question Bank', icon: BookOpen },
  { id: 'test-orchestrator', label: 'Assessments', icon: Sliders },
  { id: 'integrity', label: 'Integrity & AI Viva', icon: ShieldAlert },
  { id: 'reports', label: 'Reports & Accreditation', icon: FileText },
  { id: 'raised-issues', label: 'Student Issues', icon: Flag },
];

const DEFAULT_STATS = {
  activeTests: 0,
  upcomingTests: 0,
  completedTests: 0,
  totalSections: 0,
  totalStudents: 0,
  avgAcademicScore: 0,
  overallIntegrityScore: 100,
  studentsNeedingSupport: 0,
  advancedLearners: 0,
  flaggedSessions: 0,
};

const DEFAULT_SECTIONS: any[] = [];
const DEFAULT_LIVE_EVENTS: any[] = [];

export const AdminPortalPage: React.FC = () => {
  const { user, isAdmin, isInstitutionalAdmin, isFaculty, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();

  const isSuperAdmin = Boolean(isAdmin || user?.email === 'logicqarena@gmail.com' || user?.email === 'hariprasathset@sanjivani.edu.in');
  const isDeanOrHod = Boolean(isInstitutionalAdmin);
  const isFacultyUser = Boolean(!isSuperAdmin && !isDeanOrHod && (user?.role === 'FACULTY' || isFaculty));

  const [activeTab, setActiveTab] = useState<AdminTabKey>('command-center');
  const [selectedCandidateForDeepDive, setSelectedCandidateForDeepDive] = useState<any | null>(null);
  const [stats, setStats] = useState(DEFAULT_STATS);

  // Sections and students state with strict multi-faculty isolation
  const [sections, setSections] = useState<any[]>([]);
  const [facultyStudents, setFacultyStudents] = useState<any[]>([]);
  const [openIssuesCount, setOpenIssuesCount] = useState<number>(0);

  // Primary section info for header pill
  const primarySection = sections[0] || null;
  const facultySectionName = primarySection ? primarySection.sectionName : (user?.sectionName || user?.department || 'My Section');
  const facultySectionCode = primarySection ? primarySection.joinCode : (user?.sectionId || 'LQ-CS101');

  // Real-time synchronization & fake cache purge
  React.useEffect(() => {
    try {
      localStorage.removeItem('logicq_admin_sections');
      localStorage.removeItem('logicq_faculty_sections_backup_v2');
      localStorage.removeItem('logicq_admin_students');
      localStorage.removeItem('logicq_admin_students_list');
      localStorage.removeItem('logicq_admin_tests');
    } catch {}

    const loadRealData = async () => {
      try {
        const [realSections, realUsers, cohortSnap] = await Promise.all([
          FirestoreDataService.getSectionsFromFirestore().catch(() => []),
          FirestoreDataService.getAllFirestoreUsers().catch(() => []),
          getDocs(collection(db, 'cohort_progress')).catch(() => null),
        ]);

        const cohortMap = new Map<string, any>();
        if (cohortSnap) {
          cohortSnap.forEach((d) => cohortMap.set(d.id.toUpperCase().trim(), d.data()));
        }

        const validSections = Array.isArray(realSections) ? realSections : [];

        // STRICT MULTI-FACULTY ISOLATION:
        // A faculty member can ONLY see their assigned or created sections.
        const facultyEmailClean = (user?.email || '').toLowerCase().trim();
        const facultyId = user?.id || (user as any)?.uid || '';
        const userSecId = String(user?.sectionId || '').trim();
        const userSecName = String(user?.sectionName || user?.department || '').toLowerCase().trim();

        const isSectionOwnedByFaculty = (sec: any) => {
          if (isSuperAdmin) return true;
          const secFacultyEmail = (sec.facultyEmail || sec.createdBy || '').toLowerCase().trim();
          if (facultyEmailClean && secFacultyEmail && secFacultyEmail === facultyEmailClean) return true;
          if (facultyId && (sec.facultyId === facultyId || sec.createdById === facultyId)) return true;
          if (userSecId && (sec.id === userSecId || sec.joinCode === userSecId)) return true;
          if (userSecName && (sec.sectionName || '').toLowerCase().trim() === userSecName) return true;
          return false;
        };

        const isolatedSections = validSections.filter(isSectionOwnedByFaculty);

        const isolatedSectionKeys = new Set(
          isolatedSections.flatMap((s) => [
            String(s.id || '').toUpperCase().trim(),
            String(s.joinCode || '').toUpperCase().trim(),
            String(s.sectionName || '').toUpperCase().trim(),
            String(s.subject || '').toUpperCase().trim(),
          ]).filter(Boolean)
        );

        const allStudentUsers = Array.isArray(realUsers)
          ? realUsers
              .filter((u) => (u.role === 'STUDENT' || (!u.role && u.email !== 'logicqarena@gmail.com' && u.email !== 'hariprasathset@sanjivani.edu.in')) && !FirestoreDataService.isPurgedStudent(u))
              .map((u: any) => {
                const prnClean = (u.prn || '').toUpperCase().trim();
                const cData = cohortMap.get(prnClean) || {};
                const mod = cData.moduleProgress || {};
                const totalSolved = cData.totalSolved ?? u.totalSolved ?? (Array.isArray(cData.completedProblems) ? cData.completedProblems.length : 0);
                const totalPoints = cData.totalPoints ?? u.totalPoints ?? (totalSolved * 50);
                const academicScore = mod.academicScore !== undefined ? Number(mod.academicScore) : Math.min(100, Math.round(totalSolved * 20));
                const tabSwitches = Math.max(Number(mod.tabSwitches) || 0, Number(u.tabSwitchCount) || 0, Number(u.tabSwitches) || 0);
                const pasteBursts = Math.max(Number(mod.pasteBursts) || 0, Number(u.clipboardAttempts) || 0, Number(u.pasteBursts) || 0);
                // ⚠️ SACRED RULE: Integrity ONLY from Lab Internal — NEVER from Practice tabSwitches
                // Always use stored integrityScore; fallback = 100 (not recomputed from tabSwitches)
                const computedIntegrity = mod.integrityScore !== undefined
                  ? Number(mod.integrityScore)
                  : (u.integrityScore !== undefined ? Number(u.integrityScore) : 100);

                const sName = u.fullName || u.displayName || u.name || u.username || 'Student Candidate';
                return {
                  ...u,
                  name: sName,
                  fullName: u.fullName || sName,
                  displayName: u.displayName || sName,
                  totalSolved,
                  totalPoints,
                  academicScore,
                  integrityScore: computedIntegrity,
                  tabSwitchCount: tabSwitches,
                  tabSwitches,
                  clipboardAttempts: pasteBursts,
                  pasteBursts,
                  completedProblems: cData.completedProblems || u.completedProblems || [],
                  miniProjectUnlocked: mod.miniProjectUnlocked ?? u.miniProjectUnlocked ?? false,
                };
              })
          : [];

        // STRICT MULTI-FACULTY STUDENT ISOLATION:
        // A faculty member can ONLY see students enrolled in their sections.
        const isolatedStudents = isSuperAdmin
          ? allStudentUsers
          : allStudentUsers.filter((st: any) => {
              if (isolatedSections.length === 0) return false;
              const stSecId = String(st.sectionId || '').toUpperCase().trim();
              const stJoinCode = String(st.joinCode || '').toUpperCase().trim();
              const stSecName = String(st.sectionName || st.section || st.department || '').toUpperCase().trim();
              if (stSecId && isolatedSectionKeys.has(stSecId)) return true;
              if (stJoinCode && isolatedSectionKeys.has(stJoinCode)) return true;
              if (stSecName && isolatedSectionKeys.has(stSecName)) return true;
              if (Array.isArray(st.sections) && st.sections.some((s: any) => {
                const sid = String(s.id || s.joinCode || '').toUpperCase().trim();
                return isolatedSectionKeys.has(sid);
              })) return true;
              return isolatedSections.some((sec) =>
                Array.isArray(sec.students) && sec.students.some((s: any) =>
                  (s.prn && String(s.prn).toUpperCase().trim() === (st.prn || '').toUpperCase().trim()) ||
                  (s.email && (s.email || '').toLowerCase().trim() === (st.email || '').toLowerCase().trim()) ||
                  (s.id && s.id === st.id)
                )
              );
            });

        // Authoritatively synchronize each isolated section's roster and count directly with isolatedStudents
        const syncedSections = isolatedSections.map((sec) => {
          const combined = new Map<string, any>();

          // 1. Preserve students already resolved in sec.students
          if (Array.isArray(sec.students)) {
            sec.students.forEach((s: any) => {
              const key = (s.prn || s.email || s.id || '').toUpperCase().trim();
              if (key && !FirestoreDataService.isPurgedStudent(s)) combined.set(key, s);
            });
          }

          // 2. Map matching isolatedStudents
          isolatedStudents.forEach((u: any) => {
            if (FirestoreDataService.isPurgedStudent(u)) return;

            const uSecId = String(u.sectionId || '').toUpperCase().trim();
            const uJoinCode = String(u.joinCode || '').toUpperCase().trim();
            const uSecName = String(u.sectionName || u.section || '').toUpperCase().trim();
            const secId = String(sec.id || '').toUpperCase().trim();
            const secCode = String(sec.joinCode || '').toUpperCase().trim();
            const secName = String(sec.sectionName || '').toUpperCase().trim();
            const secSub = String(sec.subject || '').toUpperCase().trim();

            const isMatch =
              isolatedSections.length === 1 || // If only 1 section exists for this faculty, all their students belong to it
              (uSecId && (uSecId === secId || uSecId === secCode)) ||
              (uJoinCode && (uJoinCode === secCode || uJoinCode === secId)) ||
              (uSecName && (uSecName === secName || uSecName === secSub || secName.includes(uSecName) || uSecName.includes(secName))) ||
              (Array.isArray(u.sections) && u.sections.some((s: any) => {
                const sId = String(s.id || '').toUpperCase().trim();
                const sCode = String(s.joinCode || '').toUpperCase().trim();
                return sId === secId || sCode === secCode;
              }));

            if (isMatch) {
              const key = (u.prn || u.email || u.id || '').toUpperCase().trim();
              if (key) combined.set(key, u);
            }
          });

          const finalRoster = Array.from(combined.values());
          const count = finalRoster.length;

          return {
            ...sec,
            students: finalRoster,
            studentsCount: count,
            _count: { students: count },
          };
        });

        let totalAcademic = 0;
        let totalIntegrity = 0;
        let needingSupport = 0;
        let advanced = 0;
        let flagged = 0;

        isolatedStudents.forEach((s) => {
          totalAcademic += s.academicScore || 0;
          totalIntegrity += s.integrityScore !== undefined ? s.integrityScore : 100;
          if ((s.academicScore || 0) < 40) needingSupport++;
          if ((s.academicScore || 0) >= 80) advanced++;
          if ((s.integrityScore || 100) < 70) flagged++;
        });

        const avgAcademic = isolatedStudents.length > 0 ? Math.round(totalAcademic / isolatedStudents.length) : 0;
        const overallIntegrity = isolatedStudents.length > 0 ? Math.round(totalIntegrity / isolatedStudents.length) : 100;

        setSections(syncedSections);
        setFacultyStudents(isolatedStudents);
        setStats((prev) => ({
          ...prev,
          totalSections: syncedSections.length,
          totalStudents: isolatedStudents.length,
          avgAcademicScore: avgAcademic,
          overallIntegrityScore: overallIntegrity,
          studentsNeedingSupport: needingSupport,
          advancedLearners: advanced,
          flaggedSessions: flagged,
        }));

        try {
          localStorage.setItem('logicq_admin_students', JSON.stringify(isolatedStudents));
          localStorage.setItem('logicq_admin_sections', JSON.stringify(syncedSections));
        } catch {}
      } catch (err) {
        console.error('Error fetching admin data:', err);
      }
    };

    // 1. Initial authoritative load
    loadRealData();

    // 2. Real-time Firestore Live Listeners (0ms delay)
    const unsubCohort = onSnapshot(collection(db, 'cohort_progress'), () => {
      loadRealData();
    }, (err) => console.warn('Live cohort onSnapshot notice:', err));

    const unsubSubmissions = onSnapshot(collection(db, 'submissions'), () => {
      loadRealData();
    }, (err) => console.warn('Live submissions onSnapshot notice:', err));

    const unsubAssessmentSubmissions = onSnapshot(collection(db, 'assessment_test_submissions'), () => {
      loadRealData();
    }, (err) => console.warn('Live assessment submissions onSnapshot notice:', err));

    const unsubSections = onSnapshot(collection(db, 'sections'), () => {
      loadRealData();
    }, (err) => console.warn('Live sections onSnapshot notice:', err));

    const unsubEnrolled = onSnapshot(collection(db, 'enrolled_students'), () => {
      loadRealData();
    }, (err) => console.warn('Live enrolled onSnapshot notice:', err));

    const computeDeduplicatedOpenCount = (docs: Array<{ data: () => any }>) => {
      const uniqueMap = new Map<string, string>();
      docs.forEach((d) => {
        const data = d.data();
        const prn = (data?.studentPrn || '').trim().toUpperCase();
        const title = (data?.questionTitle || '').trim().toLowerCase();
        const desc = (data?.description || '').trim().toLowerCase();
        const sig = `${prn}:::${title}:::${desc}`;
        const status = data?.status || 'OPEN';

        if (!uniqueMap.has(sig)) {
          uniqueMap.set(sig, status);
        } else if (status === 'RESOLVED') {
          uniqueMap.set(sig, 'RESOLVED');
        }
      });

      let openCount = 0;
      uniqueMap.forEach((status) => {
        if (status !== 'RESOLVED') openCount++;
      });
      return openCount;
    };

    const unsubIssues = onSnapshot(collection(db, 'raised_issues'), (snap) => {
      setOpenIssuesCount(computeDeduplicatedOpenCount(snap.docs));
    }, (err) => console.warn('Live raised_issues onSnapshot notice:', err));

    let unsubUsers: (() => void) | null = null;
    try {
      unsubUsers = onSnapshot(collection(db, 'users'), () => {
        loadRealData();
      }, () => {
        // Ignore permission-denied gracefully
      });
    } catch {}

    // 3. Multi-Tab Realtime Mesh Listeners
    const unsubMeshSections = realtimeSync.on('SECTIONS', () => loadRealData());
    const unsubMeshUsers = realtimeSync.on('USERS', () => loadRealData());
    const unsubMeshDashboard = realtimeSync.on('DASHBOARD', () => loadRealData());
    const unsubMeshSubmissions = realtimeSync.on('SUBMISSIONS', () => loadRealData());
    const unsubMeshIssues = () => {
      import('firebase/firestore').then(({ getDocs, collection }) => {
        getDocs(collection(db, 'raised_issues')).then((snap) => {
          setOpenIssuesCount(computeDeduplicatedOpenCount(snap.docs));
        }).catch(() => {});
      });
    };
    const unsubMeshIssuesEvent = realtimeSync.on('ISSUES', unsubMeshIssues);

    return () => {
      unsubCohort();
      unsubSubmissions();
      unsubAssessmentSubmissions();
      unsubSections();
      unsubEnrolled();
      unsubIssues();
      if (unsubUsers) unsubUsers();
      unsubMeshSections();
      unsubMeshUsers();
      unsubMeshDashboard();
      unsubMeshSubmissions();
      if (unsubMeshIssuesEvent) unsubMeshIssuesEvent();
    };
  }, []);

  // Dynamic tabs with live issue count & role-tailored view
  const tabs: TabItem[] = React.useMemo(() => {
    return [
      { id: 'command-center', label: 'Overview', icon: LayoutDashboard },
      { id: 'sections', label: isFacultyUser ? 'My Section' : 'Sections', icon: Layers },
      { id: 'students', label: isFacultyUser ? 'Section Students' : 'Students', icon: Users },
      { id: 'question-bank', label: isFacultyUser ? 'Practice & Questions' : 'Question Bank', icon: BookOpen },
      { id: 'test-orchestrator', label: isFacultyUser ? 'Lab Internal Exams' : 'Assessments', icon: Sliders },
      { id: 'integrity', label: 'Integrity & AI Viva', icon: ShieldAlert },
      { id: 'reports', label: 'Reports & Accreditation', icon: FileText },
      { id: 'raised-issues', label: 'Student Issues', icon: Flag, badge: openIssuesCount > 0 ? String(openIssuesCount) : undefined },
    ];
  }, [openIssuesCount, isFacultyUser]);

  const saveSections = (updated: any[]) => {
    setSections(updated);
    try {
      localStorage.setItem('logicq_admin_sections', JSON.stringify(updated));
      localStorage.setItem('logicq_faculty_sections_backup_v2', JSON.stringify(updated));
    } catch {}
  };

  const handleCreateSection = async (data: any) => {
    const cleanJoinCode = data.joinCode || `LQ-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
    const newSection = {
      id: `sec-${Date.now().toString(36)}`,
      sectionName: data.sectionName,
      subject: data.subject || 'C Programming',
      course: data.course || data.subject || 'C Programming',
      academicYear: data.academicYear || '2026-2027',
      semester: data.semester || 'Semester 1',
      joinCode: cleanJoinCode,
      facultyEmail: (user?.email || '').toLowerCase().trim(),
      facultyId: user?.id || (user as any)?.uid || '',
      facultyName: user?.fullName || user?.displayName || 'Faculty Lead',
      createdBy: (user?.email || '').toLowerCase().trim(),
      createdById: user?.id || (user as any)?.uid || '',
      studentsCount: 0,
      createdAt: new Date().toISOString(),
    };
    const updated = [newSection, ...sections.filter(s => s.id !== newSection.id && s.joinCode !== newSection.joinCode)];
    saveSections(updated);

    try {
      await FirestoreDataService.saveSectionToFirestore(newSection);
    } catch (err) {
      console.warn('Notice: section saved to local cache, Firestore sync backgrounded:', err);
    }

    try {
      realtimeSync.emit('SECTIONS');
      realtimeSync.emit('DASHBOARD');
    } catch {}

    toast.success(`Class section "${newSection.sectionName}" created successfully!`);
  };

  const handleDeleteSection = async (sectionId: string) => {
    const secToDelete = sections.find((s) => s.id === sectionId);
    const updated = sections.filter((s) => s.id !== sectionId);
    saveSections(updated);
    setStats((prev) => ({ ...prev, totalSections: updated.length }));

    try {
      await FirestoreDataService.deleteSectionFromFirestore(
        sectionId,
        secToDelete?.joinCode,
        secToDelete?.sectionName
      );
    } catch (err) {
      console.warn('Notice: section removed from local cache, Firestore delete backgrounded:', err);
    }

    try {
      realtimeSync.emit('SECTIONS');
      realtimeSync.emit('USERS');
      realtimeSync.emit('DASHBOARD');
    } catch {}

    toast.info('Section deleted.');
  };

  const handleImportExcelStudents = async (sectionId: string, imported: any[]) => {
    const updated = sections.map((s) =>
      s.id === sectionId ? { ...s, studentsCount: (s.studentsCount || 0) + imported.length } : s
    );
    saveSections(updated);
    toast.success(`Imported ${imported.length} student records into section!`);
  };

  const handleTabSelect = (rawTab: string) => {
    if (rawTab === 'tests') setActiveTab('test-orchestrator');
    else if (rawTab === 'roster') setActiveTab('students');
    else if (rawTab === 'questions') setActiveTab('question-bank');
    else if (rawTab === 'analytics') setActiveTab('integrity');
    else if (rawTab === 'answers' || rawTab === 'answer-bank') setActiveTab('students');
    else if (
      [
        'command-center',
        'sections',
        'students',
        'question-bank',
        'test-orchestrator',
        'integrity',
        'reports',
        'raised-issues',
      ].includes(rawTab)
    ) {
      setActiveTab(rawTab as AdminTabKey);
    }
  };

  return (
    <div className="min-h-screen bg-[#f8f9fa] dark:bg-[#090b0e] text-slate-800 dark:text-slate-100 font-sans antialiased selection:bg-blue-500 selection:text-white flex flex-col">
      {/* ========================================================================= */}
      {/* 1. APPLE EXECUTIVE TOPBAR & HORIZONTAL NAVIGATION (Spacious & Clean)      */}
      {/* ========================================================================= */}
      <header className="sticky top-0 z-40 bg-white/95 dark:bg-[#0c0f14]/95 backdrop-blur-xl border-b border-slate-200/80 dark:border-white/[0.08] shadow-xs select-none">
        {/* Top Branding & Quick Actions */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
          {/* Brand */}
          <div className="flex items-center gap-2.5">
            <div className={`w-8 h-8 rounded-xl text-white font-black text-xs flex items-center justify-center shadow-sm ${
              isFacultyUser
                ? 'bg-gradient-to-tr from-emerald-600 via-teal-600 to-cyan-500'
                : 'bg-gradient-to-tr from-blue-600 via-indigo-600 to-cyan-500'
            }`}>
              LQ
            </div>
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-base tracking-tight text-slate-900 dark:text-white">
                LogicQ
              </span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold border bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20">
                FACULTY PORTAL
              </span>
            </div>
            {isFacultyUser && (
              <div className="hidden lg:flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-xs ml-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                <span className="font-semibold text-emerald-700 dark:text-emerald-300 text-[11px]">
                  Section: {facultySectionName}
                </span>
                <span className="text-[10px] font-mono font-bold px-1.5 py-0.2 bg-emerald-500/20 rounded text-emerald-800 dark:text-emerald-200">
                  {facultySectionCode}
                </span>
              </div>
            )}
          </div>

          {/* Right Status & Profile Cluster */}
          <div className="flex items-center gap-3">
            {/* Live System Status Pill */}
            <div className="hidden md:flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 dark:bg-white/5 border border-slate-200/60 dark:border-white/[0.08] text-xs font-mono">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-emerald-600 dark:text-emerald-400 font-semibold text-[11px]">System Online</span>
            </div>

            {/* User Profile Info */}
            <div className="flex items-center gap-2 pl-2 border-l border-slate-200 dark:border-white/10">
              <div className="w-7 h-7 rounded-full font-bold text-xs flex items-center justify-center font-mono bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
                {user?.displayName ? user.displayName.slice(0, 1).toUpperCase() : 'F'}
              </div>
              <div className="flex flex-col">
                <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 hidden sm:inline leading-tight">
                  {user?.displayName || user?.fullName || 'Faculty Lead'}
                </span>
                <span className="text-[10px] font-mono text-slate-500 dark:text-slate-400 hidden sm:inline leading-tight">
                  {isFacultyUser
                    ? `Faculty • ${facultySectionName}`
                    : 'Faculty Lead • LogicQ'}
                </span>
              </div>
              <button
                onClick={async () => {
                  await logout();
                  navigate('/login');
                }}
                className="p-1.5 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-500/10 transition ml-1 cursor-pointer"
                title="Sign Out"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Horizontal Navigation Tabs (Apple HIG Native Segmented Control) */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2 border-t border-slate-200/60 dark:border-white/[0.06]">
          <div className="p-1 rounded-2xl bg-slate-200/60 dark:bg-white/[0.06] border border-slate-200/80 dark:border-white/[0.05] inline-flex items-center gap-1 overflow-x-auto max-w-full no-scrollbar shadow-xs">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs transition-all duration-150 whitespace-nowrap cursor-pointer select-none active:scale-[0.98] ${
                    isActive
                      ? 'bg-white dark:bg-[#1c2230] text-slate-900 dark:text-white shadow-xs font-bold border border-slate-200/80 dark:border-white/10'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-white/50 dark:hover:bg-white/[0.04] font-medium'
                  }`}
                >
                  <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-blue-600 dark:text-blue-400' : 'text-slate-400'}`} />
                  <span>{tab.label}</span>
                  {tab.badge && (
                    <span
                      className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
                        tab.id === 'raised-issues'
                          ? 'bg-rose-500 text-white font-bold shadow-xs animate-pulse'
                          : isActive
                          ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400 font-bold'
                          : 'bg-slate-300/60 dark:bg-white/10 text-slate-500'
                      }`}
                    >
                      {tab.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </header>

      {/* ========================================================================= */}
      {/* 2. MAIN WORKSPACE CONTENT (Full Width, Perfectly Responsive)              */}
      {/* ========================================================================= */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        {/* Dedicated Faculty Section Overview Banner */}
        {isFacultyUser && (
          <div className="mb-6 p-4 sm:p-5 rounded-3xl bg-gradient-to-r from-emerald-500/10 via-teal-500/5 to-cyan-500/10 border border-emerald-500/20 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-xs animate-in fade-in duration-150">
            <div className="flex items-start gap-3.5">
              <div className="p-3 rounded-2xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 shrink-0 shadow-xs">
                <Layers className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-base sm:text-lg font-extrabold text-slate-900 dark:text-white">
                    {sections.length > 0 ? sections[0].sectionName : 'Faculty Workspace'} • Section Faculty Portal
                  </h2>
                  {sections.length > 0 && (
                    <span className="px-2.5 py-0.5 rounded-full text-[11px] font-mono font-bold bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30">
                      Join Code: {sections[0].joinCode}
                    </span>
                  )}
                  <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
                    Academic Year 2026–2027
                  </span>
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                  Instructor: <strong>{user?.fullName || user?.displayName || 'Faculty Lead'}</strong> ({user?.email}) • Managing student enrollment, custom practice problem modules, and lab internal exams for your section.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={() => setActiveTab('students')}
                className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-white dark:bg-[#1a202c] text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-white/10 hover:border-emerald-500/40 transition shadow-2xs flex items-center gap-1.5 cursor-pointer"
              >
                <Users className="w-3.5 h-3.5 text-emerald-500" />
                <span>My Students ({stats.totalStudents || 0})</span>
              </button>
              <button
                onClick={() => setActiveTab(sections.length > 0 ? 'question-bank' : 'sections')}
                className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white transition shadow-2xs flex items-center gap-1.5 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>{sections.length > 0 ? 'Create Practice / Questions' : 'Create First Section'}</span>
              </button>
            </div>
          </div>
        )}
        {activeTab === 'command-center' && (
          <AdminCommandCenterTab
            stats={stats}
            liveEvents={DEFAULT_LIVE_EVENTS}
            onSelectTab={handleTabSelect}
            onInspectStudent={(candidate) => setSelectedCandidateForDeepDive(candidate)}
          />
        )}
        {activeTab === 'sections' && (
          <AdminSectionsTab
            sections={sections}
            onCreateSection={handleCreateSection}
            onDeleteSection={handleDeleteSection}
            onImportExcelStudents={handleImportExcelStudents}
          />
        )}
        {activeTab === 'students' && (
          <AdminStudentsTab students={facultyStudents} sections={sections} />
        )}
        {activeTab === 'question-bank' && <AdminQuestionBankTab />}
        {activeTab === 'test-orchestrator' && (
          <AdminTestOrchestratorTab sections={sections} allowedStudents={facultyStudents} />
        )}
        {activeTab === 'integrity' && (
          <AdminIntegrityTab sections={sections} allowedStudents={facultyStudents} />
        )}
        {activeTab === 'reports' && (
          <AdminReportsTab sections={sections} students={facultyStudents} />
        )}
        {activeTab === 'raised-issues' && (
          <AdminRaisedIssuesTab allowedStudents={facultyStudents} />
        )}
      </main>

      {/* Candidate Deep-Dive Modal (1-Click Inspection) */}
      {selectedCandidateForDeepDive && (
        <StudentDeepDiveModal
          student={selectedCandidateForDeepDive}
          onClose={() => setSelectedCandidateForDeepDive(null)}
          onToggleMiniProject={(studentId, currentStatus) => {
            setSelectedCandidateForDeepDive({
              ...selectedCandidateForDeepDive,
              miniProjectUnlocked: !currentStatus,
            });
            toast.success(
              `Mini-Project status updated for ${selectedCandidateForDeepDive.name || selectedCandidateForDeepDive.fullName || selectedCandidateForDeepDive.displayName || 'Student'}`
            );
          }}
        />
      )}
    </div>
  );
};
