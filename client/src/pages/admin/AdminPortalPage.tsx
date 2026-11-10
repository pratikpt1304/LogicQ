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
// AdminAnswerBankTab kept for legacy reference — Answer Bank is now inside StudentDeepDiveModal
import { StudentDeepDiveModal } from '../../components/admin/StudentDeepDiveModal.js';
import { FirestoreDataService } from '../../services/firestoreData.service.js';
import { collection, getDocs, onSnapshot } from 'firebase/firestore';
import { db } from '../../config/firebase.js';
import { realtimeSync } from '../../services/realtimeSync.service.js';
import { api } from '../../api/client.js';

export type AdminTabKey =
  | 'command-center'
  | 'sections'
  | 'students'
  | 'question-bank'
  | 'test-orchestrator'
  | 'integrity'
  | 'reports';

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
  const { user, isAdmin, isFaculty, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState<AdminTabKey>('command-center');
  const [selectedCandidateForDeepDive, setSelectedCandidateForDeepDive] = useState<any | null>(null);
  const [stats, setStats] = useState(DEFAULT_STATS);

  // Sections management state
  const [sections, setSections] = useState<any[]>([]);

  // Real-time synchronization & persistent load
  React.useEffect(() => {
    const loadRealData = async () => {
      try {
        const [realSections, realUsers, cohortSnap] = await Promise.all([
          FirestoreDataService.getSectionsFromFirestore().catch(() => []),
          FirestoreDataService.getAllFirestoreUsers().catch(() => []),
          getDocs(collection(db, 'cohort_progress')).catch(() => null),
        ]);

        let backendSections: any[] = [];
        let backendUsers: any[] = [];
        try {
          const secRes: any = await api.get('/sections').catch(() => null);
          if (secRes?.success && Array.isArray(secRes?.data || secRes?.sections)) {
            backendSections = secRes.data || secRes.sections;
          }
        } catch {}

        try {
          const userRes: any = await api.get('/admin/users').catch(() => null);
          if (userRes?.success && Array.isArray(userRes?.data?.users || userRes?.users)) {
            backendUsers = userRes.data?.users || userRes.users;
          }
        } catch {}

        let cachedSections: any[] = [];
        try {
          const raw = localStorage.getItem('logicq_faculty_sections_backup_v2') || localStorage.getItem('logicq_admin_sections');
          if (raw) {
            const parsed = JSON.parse(raw);
            if (Array.isArray(parsed)) cachedSections = parsed;
          }
        } catch {}

        const mergedSectionsMap = new Map<string, any>();
        cachedSections.forEach((s) => {
          if (s && s.id && !FirestoreDataService.isSectionDeleted(s.id, s.joinCode)) {
            mergedSectionsMap.set(s.id, s);
          }
        });
        backendSections.forEach((s) => {
          if (s && s.id && !FirestoreDataService.isSectionDeleted(s.id, s.joinCode)) {
            mergedSectionsMap.set(s.id, { ...mergedSectionsMap.get(s.id), ...s });
          }
        });
        (Array.isArray(realSections) ? realSections : []).forEach((s) => {
          if (s && s.id && !FirestoreDataService.isSectionDeleted(s.id, s.joinCode)) {
            mergedSectionsMap.set(s.id, { ...mergedSectionsMap.get(s.id), ...s });
          }
        });
        const validSections = Array.from(mergedSectionsMap.values());

        const usersMap = new Map<string, any>();
        backendUsers.forEach((u) => {
          if (u && (u.id || u.prn || u.email)) {
            const key = String(u.prn || u.email || u.id).toUpperCase().trim();
            usersMap.set(key, u);
          }
        });
        (Array.isArray(realUsers) ? realUsers : []).forEach((u) => {
          if (u && (u.id || u.prn || u.email)) {
            const key = String(u.prn || u.email || u.id).toUpperCase().trim();
            usersMap.set(key, { ...usersMap.get(key), ...u });
          }
        });
        const allCandidateUsers = Array.from(usersMap.values());

        const cohortMap = new Map<string, any>();
        if (cohortSnap) {
          cohortSnap.forEach((d) => cohortMap.set(d.id.toUpperCase().trim(), d.data()));
        }

        const studentUsers = allCandidateUsers
          .filter((u) => (u.role === 'STUDENT' || (!u.role && u.email !== 'logicqarena@gmail.com')) && !FirestoreDataService.isPurgedStudent(u))
              .map((u: any) => {
                const prnClean = (u.prn || '').toUpperCase().trim();
                const cData = cohortMap.get(prnClean) || {};
                const mod = cData.moduleProgress || {};
                const totalSolved = cData.totalSolved ?? u.totalSolved ?? (Array.isArray(cData.completedProblems) ? cData.completedProblems.length : 0);
                const totalPoints = cData.totalPoints ?? u.totalPoints ?? (totalSolved * 50);
                const academicScore = mod.academicScore !== undefined ? Number(mod.academicScore) : Math.min(100, Math.round(totalSolved * 20));
                const tabSwitches = Math.max(Number(mod.tabSwitches) || 0, Number(u.tabSwitchCount) || 0, Number(u.tabSwitches) || 0);
                const pasteBursts = Math.max(Number(mod.pasteBursts) || 0, Number(u.clipboardAttempts) || 0, Number(u.pasteBursts) || 0);
                const computedIntegrity = mod.integrityScore !== undefined
                  ? Number(mod.integrityScore)
                  : (tabSwitches > 0 || pasteBursts > 0 ? Math.max(0, 100 - tabSwitches * 5 - pasteBursts * 10) : (u.integrityScore ?? 100));

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
              });

        // Authoritatively synchronize each section's roster and count directly with the active student directory
        const syncedSections = validSections.map((sec) => {
          const combined = new Map<string, any>();

          // 1. Preserve students already resolved in sec.students
          if (Array.isArray(sec.students)) {
            sec.students.forEach((s: any) => {
              const key = (s.prn || s.email || s.id || '').toUpperCase().trim();
              if (key && !FirestoreDataService.isPurgedStudent(s)) combined.set(key, s);
            });
          }

          // 2. Map matching studentUsers
          studentUsers.forEach((u: any) => {
            if (FirestoreDataService.isPurgedStudent(u)) return;

            const uSecId = String(u.sectionId || '').toUpperCase().trim();
            const uJoinCode = String(u.joinCode || '').toUpperCase().trim();
            const uSecName = String(u.sectionName || u.section || '').toUpperCase().trim();
            const secId = String(sec.id || '').toUpperCase().trim();
            const secCode = String(sec.joinCode || '').toUpperCase().trim();
            const secName = String(sec.sectionName || '').toUpperCase().trim();
            const secSub = String(sec.subject || '').toUpperCase().trim();

            const isMatch =
              validSections.length === 1 || // If only 1 section exists, all registered students belong to it
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

        studentUsers.forEach((s) => {
          totalAcademic += s.academicScore || 0;
          totalIntegrity += s.integrityScore !== undefined ? s.integrityScore : 100;
          if ((s.academicScore || 0) < 40) needingSupport++;
          if ((s.academicScore || 0) >= 80) advanced++;
          if ((s.integrityScore || 100) < 70) flagged++;
        });

        const avgAcademic = studentUsers.length > 0 ? Math.round(totalAcademic / studentUsers.length) : 0;
        const overallIntegrity = studentUsers.length > 0 ? Math.round(totalIntegrity / studentUsers.length) : 100;

        setSections(syncedSections);
        setStats((prev) => ({
          ...prev,
          totalSections: syncedSections.length,
          totalStudents: studentUsers.length,
          avgAcademicScore: avgAcademic,
          overallIntegrityScore: overallIntegrity,
          studentsNeedingSupport: needingSupport,
          advancedLearners: advanced,
          flaggedSessions: flagged,
        }));

        try {
          localStorage.setItem('logicq_admin_students', JSON.stringify(studentUsers));
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

    return () => {
      unsubCohort();
      unsubSubmissions();
      unsubAssessmentSubmissions();
      unsubSections();
      unsubEnrolled();
      if (unsubUsers) unsubUsers();
      unsubMeshSections();
      unsubMeshUsers();
      unsubMeshDashboard();
      unsubMeshSubmissions();
    };
  }, []);

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
      studentsCount: 0,
      createdAt: new Date().toISOString(),
    };
    const updated = [newSection, ...sections.filter(s => s.id !== newSection.id && s.joinCode !== newSection.joinCode)];
    saveSections(updated);
    setStats((prev) => ({ ...prev, totalSections: updated.length }));

    try {
      await api.post('/sections', {
        sectionName: newSection.sectionName,
        subject: newSection.subject,
        course: newSection.course,
        academicYear: newSection.academicYear,
        semester: newSection.semester,
        joinCode: cleanJoinCode,
      }).catch((e: any) => console.warn('Backend section creation notice:', e));
    } catch {}

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
      await api.delete(`/sections/${sectionId}`).catch((e: any) => console.warn('Backend section delete notice:', e));
    } catch {}

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
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-cyan-500 text-white font-black text-xs flex items-center justify-center shadow-sm">
              LQ
            </div>
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-base tracking-tight text-slate-900 dark:text-white">
                LogicQ
              </span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
                ADMIN CONSOLE
              </span>
            </div>
          </div>

          {/* Right Status & Profile Cluster */}
          <div className="flex items-center gap-3">
            {/* Live System Status Pill */}
            <div className="hidden md:flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 dark:bg-white/5 border border-slate-200/60 dark:border-white/[0.08] text-xs font-mono">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-emerald-600 dark:text-emerald-400 font-semibold text-[11px]">System Online</span>
            </div>

            {/* Dark / Light Mode */}
            <button
              onClick={toggleTheme}
              className="p-2 rounded-xl text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5 transition"
              title="Toggle Theme"
            >
              {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>

            {/* Admin User Info */}
            <div className="flex items-center gap-2 pl-2 border-l border-slate-200 dark:border-white/10">
              <div className="w-7 h-7 rounded-full bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 font-bold text-xs flex items-center justify-center font-mono">
                A
              </div>
              <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 hidden sm:inline">
                Administrator
              </span>
              <button
                onClick={async () => {
                  await logout();
                  navigate('/login');
                }}
                className="p-1.5 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-500/10 transition ml-1"
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
            {TABS.map((tab) => {
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
                        isActive
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
        {activeTab === 'students' && <AdminStudentsTab />}
        {activeTab === 'question-bank' && <AdminQuestionBankTab />}
        {activeTab === 'test-orchestrator' && <AdminTestOrchestratorTab sections={sections} />}
        {activeTab === 'integrity' && <AdminIntegrityTab />}
        {activeTab === 'reports' && <AdminReportsTab />}
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
