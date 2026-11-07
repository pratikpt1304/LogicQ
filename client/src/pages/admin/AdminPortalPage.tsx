import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.js';
import {
  LayoutDashboard,
  Layers,
  Users,
  BookOpen,
  Sliders,
  ShieldAlert,
  FileText,
  ArrowLeft,
  Sparkles,
  Command,
} from 'lucide-react';
import { toast } from 'sonner';

import { AdminCommandCenterTab } from '../../components/admin/AdminCommandCenterTab.js';
import { AdminSectionsTab } from '../../components/admin/AdminSectionsTab.js';
import { AdminStudentsTab } from '../../components/admin/AdminStudentsTab.js';
import { AdminQuestionBankTab } from '../../components/admin/AdminQuestionBankTab.js';
import { AdminTestOrchestratorTab } from '../../components/admin/AdminTestOrchestratorTab.js';
import { AdminIntegrityTab } from '../../components/admin/AdminIntegrityTab.js';
import { AdminReportsTab } from '../../components/admin/AdminReportsTab.js';

type AdminTabKey =
  | 'command-center'
  | 'sections'
  | 'students'
  | 'question-bank'
  | 'test-orchestrator'
  | 'integrity'
  | 'reports';

const TABS: { id: AdminTabKey; label: string; icon: React.FC<{ className?: string }> }[] = [
  { id: 'command-center', label: 'Command Center', icon: LayoutDashboard },
  { id: 'sections', label: 'Sections & Cohorts', icon: Layers },
  { id: 'students', label: 'Students & Roster', icon: Users },
  { id: 'question-bank', label: 'Question Bank (AI)', icon: BookOpen },
  { id: 'test-orchestrator', label: 'Test Orchestrator', icon: Sliders },
  { id: 'integrity', label: 'Integrity & AI Viva', icon: ShieldAlert },
  { id: 'reports', label: 'Reports & Exports', icon: FileText },
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
  const { user, isAdmin, isFaculty } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<AdminTabKey>('command-center');

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

  // Verify authorization (Admin or Faculty or explicit admin account)
  const isAuthorized = isAdmin || isFaculty || user?.email?.toLowerCase() === 'logicqarena@gmail.com';

  if (!isAuthorized) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center p-6 text-center font-mono space-y-4">
        <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-500 text-sm">
          Access Restricted: Institutional Administrator or Faculty clearance required.
        </div>
        <button
          onClick={() => navigate('/dashboard')}
          className="px-5 py-2.5 rounded-xl font-bold bg-slate-900 text-white text-xs hover:opacity-90"
        >
          Return to Student Portal
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-16 pt-4 px-3 sm:px-6 lg:px-8 max-w-7xl mx-auto space-y-6 font-sans">
      {/* Apple HIG Master Header */}
      <div className="rounded-3xl border border-slate-200/80 dark:border-white/10 bg-white/70 dark:bg-slate-900/60 backdrop-blur-2xl p-5 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="p-2 rounded-2xl bg-blue-600 text-white shadow-xs">
                <Command className="w-4 h-4" />
              </span>
              <h1 className="text-xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                LogicQ Faculty & Admin Console
              </h1>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
                Specification V2.0
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-2">
              <span>Sanjivani College of Engineering</span>
              <span>•</span>
              <span>Academic Year 2026-2027</span>
              <span>•</span>
              <span className="font-mono text-emerald-600 dark:text-emerald-400 font-semibold">
                Logged in as {user?.email || 'logicqarena@gmail.com'}
              </span>
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-2 px-4 py-2 rounded-2xl text-xs font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 shadow-xs">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>Administrator Mode (Dedicated Console)</span>
            </span>
          </div>
        </div>

        {/* Tab Navigation Strip (Horizontal Apple Scrollable) */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar mt-5 pt-4 border-t border-slate-200/60 dark:border-white/5">
          {TABS.map((t) => {
            const Icon = t.icon;
            const isActive = activeTab === t.id;
            return (
              <button
                key={t.id}
                onClick={() => setActiveTab(t.id)}
                className={`inline-flex items-center gap-2 px-4 py-2 rounded-2xl text-xs font-semibold whitespace-nowrap transition-all ${
                  isActive
                    ? 'bg-blue-600 text-white shadow-xs font-bold'
                    : 'bg-transparent text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                <span>{t.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Dynamic Tab Body */}
      <div className="animate-in fade-in duration-200">
        {activeTab === 'command-center' && (
          <AdminCommandCenterTab
            stats={DEFAULT_STATS}
            liveEvents={DEFAULT_LIVE_EVENTS}
            onSelectTab={(tabId) => {
              if (
                [
                  'command-center',
                  'sections',
                  'students',
                  'question-bank',
                  'test-orchestrator',
                  'integrity',
                  'reports',
                ].includes(tabId)
              ) {
                setActiveTab(tabId as AdminTabKey);
              }
            }}
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
  );
};
