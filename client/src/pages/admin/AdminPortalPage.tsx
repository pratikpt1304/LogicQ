import React, { useState, useEffect } from 'react';
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
  Sparkles,
  Command,
  Sun,
  Moon,
  LogOut,
  Search,
  Plus,
  ChevronRight,
  ShieldCheck,
  Activity,
  Menu,
  X,
  Zap,
} from 'lucide-react';
import { toast } from 'sonner';

import { AdminCommandCenterTab } from '../../components/admin/AdminCommandCenterTab.js';
import { AdminSectionsTab } from '../../components/admin/AdminSectionsTab.js';
import { AdminStudentsTab } from '../../components/admin/AdminStudentsTab.js';
import { AdminQuestionBankTab } from '../../components/admin/AdminQuestionBankTab.js';
import { AdminTestOrchestratorTab } from '../../components/admin/AdminTestOrchestratorTab.js';
import { AdminIntegrityTab } from '../../components/admin/AdminIntegrityTab.js';
import { AdminReportsTab } from '../../components/admin/AdminReportsTab.js';
import { StudentDeepDiveModal } from '../../components/admin/StudentDeepDiveModal.js';

type AdminTabKey =
  | 'command-center'
  | 'sections'
  | 'students'
  | 'question-bank'
  | 'test-orchestrator'
  | 'integrity'
  | 'reports';

const NAV_ITEMS: {
  id: AdminTabKey;
  label: string;
  badge?: string;
  shortcut: string;
  icon: React.FC<{ className?: string }>;
  group: 'CORE' | 'ASSESSMENT' | 'GOVERNANCE';
}[] = [
  { id: 'command-center', label: 'Executive Bento', shortcut: '⌘1', icon: LayoutDashboard, group: 'CORE' },
  { id: 'sections', label: 'Class Sections', shortcut: '⌘2', icon: Layers, group: 'CORE' },
  { id: 'students', label: 'Candidate Roster', badge: '116', shortcut: '⌘3', icon: Users, group: 'CORE' },
  { id: 'question-bank', label: 'Question Bank (AI)', badge: '80M', shortcut: '⌘4', icon: BookOpen, group: 'ASSESSMENT' },
  { id: 'test-orchestrator', label: 'Test Orchestrator', badge: '40/40/20', shortcut: '⌘5', icon: Sliders, group: 'ASSESSMENT' },
  { id: 'integrity', label: 'Integrity & AI Viva', badge: 'Rule 29', shortcut: '⌘6', icon: ShieldAlert, group: 'GOVERNANCE' },
  { id: 'reports', label: 'Accreditation Reports', badge: 'PDF', shortcut: '⌘7', icon: FileText, group: 'GOVERNANCE' },
];

const DEFAULT_STATS = {
  activeTests: 1,
  upcomingTests: 1,
  completedTests: 1,
  totalSections: 2,
  totalStudents: 116,
  avgAcademicScore: 84.6,
  overallIntegrityScore: 92.4,
  studentsNeedingSupport: 5,
  advancedLearners: 42,
  flaggedSessions: 2,
};

const DEFAULT_SECTIONS = [
  {
    id: 'sec-div-a',
    sectionName: 'Division A',
    subject: 'C Programming & Algorithms',
    course: 'B.Tech Computer Engineering',
    academicYear: '2026-2027',
    semester: 'Semester III',
    joinCode: 'SANJIVANI-CS-DIV-A',
    studentsCount: 58,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'sec-div-b',
    sectionName: 'Division B',
    subject: 'C Programming & Algorithms',
    course: 'B.Tech Computer Engineering',
    academicYear: '2026-2027',
    semester: 'Semester III',
    joinCode: 'SANJIVANI-CS-DIV-B',
    studentsCount: 58,
    createdAt: new Date().toISOString(),
  },
];

const DEFAULT_LIVE_EVENTS = [
  {
    id: 'evt-1',
    studentName: 'Aarav Sharma',
    prn: '2126CS101',
    problemTitle: 'Bitwise Parity Validator',
    type: 'SUBMISSION_ACCEPTED',
    time: '2m ago',
  },
  {
    id: 'evt-2',
    studentName: 'Diya Patel',
    prn: '2126CS102',
    problemTitle: 'Dynamic Array Deduplication',
    type: 'VIVA_VERIFIED',
    time: '5m ago',
  },
  {
    id: 'evt-3',
    studentName: 'Sneha Kulkarni',
    prn: '2126CS104',
    problemTitle: 'Binary Packet Serialization',
    type: 'INTEGRITY_FLAG',
    time: '12m ago',
  },
];

export const AdminPortalPage: React.FC = () => {
  const { user, isAdmin, isFaculty, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState<AdminTabKey>('command-center');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isQuickActionOpen, setIsQuickActionOpen] = useState(false);
  const [selectedCandidateForDeepDive, setSelectedCandidateForDeepDive] = useState<any | null>(null);

  // Sections management state
  const [sections, setSections] = useState<any[]>(() => {
    try {
      const saved = localStorage.getItem('logicq_admin_sections');
      if (saved) return JSON.parse(saved);
    } catch {}
    return DEFAULT_SECTIONS;
  });

  const saveSections = (updated: any[]) => {
    setSections(updated);
    try {
      localStorage.setItem('logicq_admin_sections', JSON.stringify(updated));
    } catch {}
  };

  const handleCreateSection = async (data: any) => {
    const newSection = {
      id: `sec-${Date.now().toString(36)}`,
      sectionName: data.sectionName,
      subject: data.subject || 'C Programming',
      course: data.course || 'B.Tech Computer Engineering',
      academicYear: data.academicYear || '2026-2027',
      semester: data.semester || 'Semester III',
      joinCode: `SANJIVANI-${Math.random().toString(36).substring(2, 8).toUpperCase()}`,
      studentsCount: 0,
      createdAt: new Date().toISOString(),
    };
    const updated = [newSection, ...sections];
    saveSections(updated);
    toast.success(`Class section "${newSection.sectionName}" created successfully!`);
  };

  const handleDeleteSection = async (sectionId: string) => {
    const updated = sections.filter((s) => s.id !== sectionId);
    saveSections(updated);
    toast.info('Section deleted.');
  };

  const handleImportExcelStudents = async (sectionId: string, imported: any[]) => {
    const updated = sections.map((s) =>
      s.id === sectionId ? { ...s, studentsCount: (s.studentsCount || 0) + imported.length } : s
    );
    saveSections(updated);
    toast.success(`Imported ${imported.length} student records into section!`);
  };

  // Keyboard shortcut listener (⌘1 - ⌘7)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && !e.shiftKey) {
        if (e.key === '1') { e.preventDefault(); setActiveTab('command-center'); }
        if (e.key === '2') { e.preventDefault(); setActiveTab('sections'); }
        if (e.key === '3') { e.preventDefault(); setActiveTab('students'); }
        if (e.key === '4') { e.preventDefault(); setActiveTab('question-bank'); }
        if (e.key === '5') { e.preventDefault(); setActiveTab('test-orchestrator'); }
        if (e.key === '6') { e.preventDefault(); setActiveTab('integrity'); }
        if (e.key === '7') { e.preventDefault(); setActiveTab('reports'); }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Normalize legacy tab selection
  const handleTabSelect = (rawTab: string) => {
    if (rawTab === 'tests') setActiveTab('test-orchestrator');
    else if (rawTab === 'roster') setActiveTab('students');
    else if (rawTab === 'questions') setActiveTab('question-bank');
    else if (rawTab === 'analytics') setActiveTab('integrity');
    else if (['command-center', 'sections', 'students', 'question-bank', 'test-orchestrator', 'integrity', 'reports'].includes(rawTab)) {
      setActiveTab(rawTab as AdminTabKey);
    }
  };

  const activeMeta = NAV_ITEMS.find((n) => n.id === activeTab)!;

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-slate-50 dark:bg-[#07090e] text-slate-800 dark:text-slate-100 font-sans antialiased selection:bg-blue-500 selection:text-white">
      {/* ========================================================================= */}
      {/* 1. macOS SEQUOIA FROSTED GLASS SIDEBAR                                   */}
      {/* ========================================================================= */}
      <aside
        className={`${
          sidebarCollapsed ? 'w-20' : 'w-72'
        } shrink-0 h-full border-r border-slate-200/80 dark:border-white/10 bg-white/80 dark:bg-[#0c1017]/85 backdrop-blur-3xl flex flex-col justify-between transition-all duration-300 ease-in-out z-40 select-none`}
      >
        {/* Sidebar Header with macOS Traffic Lights & Brand */}
        <div className="p-4 sm:p-5 border-b border-slate-200/60 dark:border-white/5 space-y-4">
          <div className="flex items-center justify-between">
            {/* Traffic Lights */}
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-rose-500/90 hover:opacity-80 transition cursor-pointer" />
              <span className="w-3 h-3 rounded-full bg-amber-500/90 hover:opacity-80 transition cursor-pointer" />
              <span className="w-3 h-3 rounded-full bg-emerald-500/90 hover:opacity-80 transition cursor-pointer" />
            </div>

            <button
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              className="p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-white/5 text-slate-400 hover:text-slate-700 dark:hover:text-white transition"
              title={sidebarCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
            >
              <Menu className="w-4 h-4" />
            </button>
          </div>

          {!sidebarCollapsed && (
            <div className="animate-in fade-in duration-200">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-cyan-500 text-white font-black text-sm flex items-center justify-center shadow-md shadow-blue-500/20">
                  LQ
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="font-extrabold text-sm tracking-tight text-slate-900 dark:text-white">
                      LogicQ Pro
                    </span>
                    <span className="px-1.5 py-0.5 rounded-full text-[9px] font-mono font-bold bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
                      ADMIN
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-400 font-mono truncate">
                    Executive Master Console v2.0
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Sidebar Navigation Groups */}
        <div className="flex-1 overflow-y-auto px-3 py-4 space-y-6 no-scrollbar">
          {/* CORE GROUP */}
          <div className="space-y-1">
            {!sidebarCollapsed && (
              <div className="px-3 pb-1.5 text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                Core Operations
              </div>
            )}
            {NAV_ITEMS.filter((n) => n.group === 'CORE').map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  title={item.label}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-2xl text-xs font-semibold transition-all group ${
                    isActive
                      ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20 font-bold'
                      : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-white' : 'text-slate-400 group-hover:text-slate-700 dark:group-hover:text-white'}`} />
                    {!sidebarCollapsed && <span className="truncate">{item.label}</span>}
                  </div>
                  {!sidebarCollapsed && (
                    <div className="flex items-center gap-1 shrink-0 font-mono text-[10px]">
                      {item.badge && (
                        <span className={`px-1.5 py-0.5 rounded-full ${isActive ? 'bg-white/20 text-white' : 'bg-slate-200 dark:bg-white/10 text-slate-500'}`}>
                          {item.badge}
                        </span>
                      )}
                      <span className={`opacity-40 group-hover:opacity-100 ${isActive ? 'text-white' : 'text-slate-400'}`}>
                        {item.shortcut}
                      </span>
                    </div>
                  )}
                </button>
              );
            })}
          </div>

          {/* ASSESSMENT GROUP */}
          <div className="space-y-1">
            {!sidebarCollapsed && (
              <div className="px-3 pb-1.5 text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                Assessment Architecture
              </div>
            )}
            {NAV_ITEMS.filter((n) => n.group === 'ASSESSMENT').map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  title={item.label}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-2xl text-xs font-semibold transition-all group ${
                    isActive
                      ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20 font-bold'
                      : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-white' : 'text-slate-400 group-hover:text-slate-700 dark:group-hover:text-white'}`} />
                    {!sidebarCollapsed && <span className="truncate">{item.label}</span>}
                  </div>
                  {!sidebarCollapsed && (
                    <div className="flex items-center gap-1 shrink-0 font-mono text-[10px]">
                      {item.badge && (
                        <span className={`px-1.5 py-0.5 rounded-full ${isActive ? 'bg-white/20 text-white' : 'bg-slate-200 dark:bg-white/10 text-slate-500'}`}>
                          {item.badge}
                        </span>
                      )}
                      <span className={`opacity-40 group-hover:opacity-100 ${isActive ? 'text-white' : 'text-slate-400'}`}>
                        {item.shortcut}
                      </span>
                    </div>
                  )}
                </button>
              );
            })}
          </div>

          {/* GOVERNANCE GROUP */}
          <div className="space-y-1">
            {!sidebarCollapsed && (
              <div className="px-3 pb-1.5 text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                Integrity & Governance
              </div>
            )}
            {NAV_ITEMS.filter((n) => n.group === 'GOVERNANCE').map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  title={item.label}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-2xl text-xs font-semibold transition-all group ${
                    isActive
                      ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20 font-bold'
                      : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-white' : 'text-slate-400 group-hover:text-slate-700 dark:group-hover:text-white'}`} />
                    {!sidebarCollapsed && <span className="truncate">{item.label}</span>}
                  </div>
                  {!sidebarCollapsed && (
                    <div className="flex items-center gap-1 shrink-0 font-mono text-[10px]">
                      {item.badge && (
                        <span className={`px-1.5 py-0.5 rounded-full ${isActive ? 'bg-white/20 text-white' : 'bg-slate-200 dark:bg-white/10 text-slate-500'}`}>
                          {item.badge}
                        </span>
                      )}
                      <span className={`opacity-40 group-hover:opacity-100 ${isActive ? 'text-white' : 'text-slate-400'}`}>
                        {item.shortcut}
                      </span>
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Sidebar Footer: Admin Profile, Dark/Light Mode, Sign Out */}
        <div className="p-3 border-t border-slate-200/60 dark:border-white/5 space-y-2">
          {!sidebarCollapsed ? (
            <div className="p-3 rounded-2xl bg-slate-100/80 dark:bg-white/5 border border-slate-200/60 dark:border-white/5 flex items-center justify-between">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-blue-500 to-indigo-600 text-white font-bold text-xs flex items-center justify-center shrink-0">
                  A
                </div>
                <div className="min-w-0">
                  <p className="font-bold text-xs text-slate-900 dark:text-white truncate">
                    LogicQ Arena
                  </p>
                  <p className="text-[10px] font-mono text-emerald-500 truncate flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                    <span>Administrator</span>
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1">
                <button
                  onClick={toggleTheme}
                  className="p-1.5 rounded-xl hover:bg-slate-200 dark:hover:bg-white/10 text-slate-500 dark:text-slate-400 transition"
                  title="Toggle Dark/Light Mode"
                >
                  {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
                </button>
                <button
                  onClick={async () => {
                    await logout();
                    navigate('/login');
                  }}
                  className="p-1.5 rounded-xl hover:bg-rose-500/10 text-slate-400 hover:text-rose-500 transition"
                  title="Sign Out"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2 py-1">
              <button
                onClick={toggleTheme}
                className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-white/5 text-slate-400 transition"
              >
                {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
              </button>
              <button
                onClick={async () => {
                  await logout();
                  navigate('/login');
                }}
                className="p-2 rounded-xl hover:bg-rose-500/10 text-slate-400 hover:text-rose-500 transition"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </aside>

      {/* ========================================================================= */}
      {/* 2. macOS TOP EXECUTIVE TITLEBAR & STAGE                                  */}
      {/* ========================================================================= */}
      <main className="flex-1 flex flex-col h-full overflow-hidden min-w-0">
        {/* macOS Titlebar */}
        <header className="h-16 px-6 border-b border-slate-200/80 dark:border-white/10 bg-white/70 dark:bg-[#07090e]/80 backdrop-blur-2xl flex items-center justify-between gap-4 shrink-0 z-30 select-none">
          {/* Breadcrumb Navigation */}
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-xs font-mono text-slate-400">Admin Console</span>
            <ChevronRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <span className="text-xs font-bold font-sans text-slate-900 dark:text-white truncate">
              {activeMeta.label}
            </span>
          </div>

          {/* Center Telemetry Pill */}
          <div className="hidden md:flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-slate-100 dark:bg-white/5 border border-slate-200/60 dark:border-white/5 text-[11px] font-mono">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-slate-600 dark:text-slate-300 font-semibold">116 Candidates Online</span>
            <span className="text-slate-400">•</span>
            <span className="text-slate-500">Live Multi-Signal Proctoring Active</span>
          </div>

          {/* Right Action Cluster */}
          <div className="flex items-center gap-2.5">
            {/* Quick Action Button */}
            <div className="relative">
              <button
                onClick={() => setIsQuickActionOpen(!isQuickActionOpen)}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold bg-blue-600 text-white hover:bg-blue-700 shadow-sm transition"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Quick Action</span>
              </button>

              {isQuickActionOpen && (
                <div className="absolute right-0 mt-2 w-52 rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-900 p-2 shadow-2xl z-50 animate-in fade-in zoom-in-95 text-xs space-y-1">
                  <button
                    onClick={() => {
                      setIsQuickActionOpen(false);
                      setActiveTab('sections');
                    }}
                    className="w-full text-left px-3 py-2 rounded-xl hover:bg-slate-100 dark:hover:bg-white/5 font-semibold text-slate-800 dark:text-slate-200"
                  >
                    + Create New Section
                  </button>
                  <button
                    onClick={() => {
                      setIsQuickActionOpen(false);
                      setActiveTab('test-orchestrator');
                    }}
                    className="w-full text-left px-3 py-2 rounded-xl hover:bg-slate-100 dark:hover:bg-white/5 font-semibold text-slate-800 dark:text-slate-200"
                  >
                    + Schedule Assessment Test
                  </button>
                  <button
                    onClick={() => {
                      setIsQuickActionOpen(false);
                      setActiveTab('question-bank');
                    }}
                    className="w-full text-left px-3 py-2 rounded-xl hover:bg-slate-100 dark:hover:bg-white/5 font-semibold text-slate-800 dark:text-slate-200"
                  >
                    + Generate AI Question
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Scrollable Stage Content */}
        <div className="flex-1 overflow-y-auto px-4 sm:px-8 py-6 space-y-6">
          <div className="max-w-7xl mx-auto">
            {activeTab === 'command-center' && (
              <AdminCommandCenterTab
                stats={DEFAULT_STATS}
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
            {activeTab === 'test-orchestrator' && <AdminTestOrchestratorTab />}
            {activeTab === 'integrity' && <AdminIntegrityTab />}
            {activeTab === 'reports' && <AdminReportsTab />}
          </div>
        </div>

        {/* 1-Click Candidate Deep-Dive Modal */}
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
                `Mini-Project status updated for ${selectedCandidateForDeepDive.name}`
              );
            }}
          />
        )}
      </main>
    </div>
  );
};
