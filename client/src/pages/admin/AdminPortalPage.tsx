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
  { id: 'students', label: 'Students', badge: '116', icon: Users },
  { id: 'question-bank', label: 'Question Bank', icon: BookOpen },
  { id: 'test-orchestrator', label: 'Assessments', icon: Sliders },
  { id: 'integrity', label: 'Integrity & AI Viva', badge: '2', icon: ShieldAlert },
  { id: 'reports', label: 'Reports & Accreditation', icon: FileText },
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
    joinCode: 'LQ-CS-DIV-A',
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
    joinCode: 'LQ-CS-DIV-B',
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
      joinCode: `LQ-${Math.random().toString(36).substring(2, 8).toUpperCase()}`,
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

  const handleTabSelect = (rawTab: string) => {
    if (rawTab === 'tests') setActiveTab('test-orchestrator');
    else if (rawTab === 'roster') setActiveTab('students');
    else if (rawTab === 'questions') setActiveTab('question-bank');
    else if (rawTab === 'analytics') setActiveTab('integrity');
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
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-cyan-500 text-white font-black text-sm flex items-center justify-center shadow-sm">
              LQ
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-base tracking-tight text-slate-900 dark:text-white">
                  LogicQ
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
                  ADMIN CONSOLE
                </span>
              </div>
              <p className="text-[11px] text-slate-400 hidden sm:block">
                Continuous Evaluation & Examination Platform
              </p>
            </div>
          </div>

          {/* Right Status & Profile Cluster */}
          <div className="flex items-center gap-3">
            {/* Live Proctoring Status Pill */}
            <div className="hidden md:flex items-center gap-2 px-3 py-1 rounded-full bg-slate-100 dark:bg-white/5 border border-slate-200/60 dark:border-white/[0.08] text-xs font-mono">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="font-semibold text-slate-700 dark:text-slate-300">
                116 Students Online
              </span>
              <span className="text-slate-400">•</span>
              <span className="text-emerald-500 font-semibold">Proctoring Active</span>
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

        {/* Horizontal Navigation Tabs (Apple Segmented Style: 100% visible, never cramped) */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 border-t border-slate-100 dark:border-white/[0.05]">
          <nav className="flex items-center gap-1 sm:gap-2 overflow-x-auto no-scrollbar py-1.5">
            {TABS.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all whitespace-nowrap cursor-pointer ${
                    isActive
                      ? 'bg-blue-600 text-white shadow-xs font-bold'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5'
                  }`}
                >
                  <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                  <span>{tab.label}</span>
                  {tab.badge && (
                    <span
                      className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
                        isActive
                          ? 'bg-white/20 text-white font-bold'
                          : 'bg-slate-200/80 dark:bg-white/10 text-slate-500'
                      }`}
                    >
                      {tab.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>
      </header>

      {/* ========================================================================= */}
      {/* 2. MAIN WORKSPACE CONTENT (Full Width, Perfectly Responsive)              */}
      {/* ========================================================================= */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
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
              `Mini-Project status updated for ${selectedCandidateForDeepDive.name}`
            );
          }}
        />
      )}
    </div>
  );
};
