import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.js';
import { useTheme } from '../../context/ThemeContext.js';
import {
  LayoutDashboard,
  Users,
  BookOpen,
  Sliders,
  ShieldCheck,
  Flag,
  Plus,
  Search,
  Copy,
  Check,
  ExternalLink,
  QrCode,
  LogOut,
  Sun,
  Moon,
  Award,
  Brain,
  Clock,
  AlertTriangle,
  CheckCircle2,
  ChevronRight,
  Filter,
  Download,
  FileSpreadsheet,
  Layers,
  Eye,
  Send,
  RefreshCw,
  Play,
  Sparkles,
  GraduationCap,
  Trash2,
  X,
  FileCode,
  Activity,
  Terminal,
  Code2,
  HelpCircle,
  ShieldAlert,
} from 'lucide-react';
import QRCode from 'qrcode';
import * as XLSX from 'xlsx';
import { toast } from 'sonner';
import { StudentDeepDiveModal } from '../../components/admin/StudentDeepDiveModal.js';
import { FirestoreDataService } from '../../services/firestoreData.service.js';
import { collection, getDocs, doc, getDoc, setDoc, onSnapshot } from 'firebase/firestore';
import { db } from '../../config/firebase.js';
import { realtimeSync } from '../../services/realtimeSync.service.js';
import { COMPUTER_SCIENCE_PRACTICE_TOPICS } from '../../data/topic-practice.data.js';

export type FacultyTabKey =
  | 'overview'
  | 'students'
  | 'practice'
  | 'assessments'
  | 'integrity'
  | 'issues';

interface FacultyTabItem {
  id: FacultyTabKey;
  label: string;
  badge?: string;
  icon: React.FC<{ className?: string }>;
}

export const FacultyPortalPage: React.FC = () => {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState<FacultyTabKey>('overview');
  const [selectedStudentForModal, setSelectedStudentForModal] = useState<any | null>(null);

  // Section details
  const sectionName = user?.sectionName || user?.department || 'Computer Science';
  const sectionCode = 'LQ-CS101';
  const sectionId = 'sec-compsci-demo';

  // State
  const [copiedLink, setCopiedLink] = useState(false);
  const [isQrOpen, setIsQrOpen] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState('');
  const [searchStudent, setSearchStudent] = useState('');
  const [studentStatusFilter, setStudentStatusFilter] = useState<'ALL' | 'ACTIVE' | 'HIGH_SCORE'>('ALL');

  // Modals
  const [isAddStudentOpen, setIsAddStudentOpen] = useState(false);
  const [newStudentPrn, setNewStudentPrn] = useState('');
  const [newStudentName, setNewStudentName] = useState('');
  const [newStudentEmail, setNewStudentEmail] = useState('');

  const [isAddQuestionOpen, setIsAddQuestionOpen] = useState(false);
  const [newQuestionTitle, setNewQuestionTitle] = useState('');
  const [newQuestionDifficulty, setNewQuestionDifficulty] = useState<'EASY' | 'MEDIUM' | 'HARD'>('EASY');
  const [newQuestionDesc, setNewQuestionDesc] = useState('');
  const [newQuestionInput, setNewQuestionInput] = useState('');
  const [newQuestionOutput, setNewQuestionOutput] = useState('');

  const [isCreateTestOpen, setIsCreateTestOpen] = useState(false);
  const [newTestTitle, setNewTestTitle] = useState('Lab Internal Assessment: Data Structures & Algorithms');
  const [newTestDuration, setNewTestDuration] = useState(60);
  const [newTestMarks, setNewTestMarks] = useState(20);

  // Live Students Roster
  const [students, setStudents] = useState<any[]>([
    {
      id: 'cohort-2126pmib1001',
      uid: 'cohort-2126pmib1001',
      prn: '2126PMIB1001',
      name: 'Demo 1',
      fullName: 'Demo 1',
      displayName: 'Demo 1 (CS)',
      email: 'demo1.cs@sanjivani.edu.in',
      department: 'Computer Science',
      section: 'Computer Science',
      sectionName: 'Computer Science',
      sectionId: 'sec-compsci-demo',
      joinCode: 'LQ-CS101',
      year: 'FY',
      division: 'A',
      totalSolved: 6,
      totalPoints: 480,
      currentStreak: 4,
      longestStreak: 6,
      academicScore: 92,
      integrityScore: 98,
      labInternalScore: 18,
      labInternalMax: 20,
      status: 'ACTIVE',
      accountState: 'ACTIVE',
      isEmailBound: true,
      miniProjectUnlocked: true,
      completedProblems: ['cs-demo-p1', 'cs-demo-p2', 'cs-demo-p3', 'cs-demo-p4', 'cs-demo-p5', 'cs-demo-p6'],
    },
  ]);

  // Practice Questions
  const [practiceQuestions, setPracticeQuestions] = useState<any[]>(() => {
    try {
      const saved = localStorage.getItem('logicq_faculty_cs_questions');
      if (saved) return JSON.parse(saved);
    } catch {}
    return COMPUTER_SCIENCE_PRACTICE_TOPICS.map((item) => ({
      id: item.id,
      title: item.problem.title,
      difficulty: item.problem.difficulty,
      description: item.summary,
      moduleTitle: item.moduleTitle,
      moduleIndex: item.moduleIndex,
      input1: item.problem.openTestCase.input,
      output1: item.problem.openTestCase.expectedOutput,
      createdAt: '2026-11-15T10:00:00Z',
    }));
  });

  // Lab Tests
  const [labTests, setLabTests] = useState<any[]>([
    {
      id: 'test-cs-lab-1',
      title: 'Lab Internal Assessment 1: Largest of Three & Array Logic',
      sectionTarget: 'Computer Science',
      durationMinutes: 60,
      totalMarks: 20,
      status: 'COMPLETED',
      createdAt: '2026-11-15T22:30:00Z',
      submissionsCount: 1,
      averageScore: 18,
      topCandidate: 'Demo 1 (18/20)',
    },
  ]);

  // Student Issues
  const [issues, setIssues] = useState<any[]>([
    {
      id: 'issue-demo-1',
      studentName: 'Demo 1',
      studentPrn: '2126PMIB1001',
      studentEmail: 'demo1.cs@sanjivani.edu.in',
      mobile: '+919876543210',
      category: 'Practice Problem',
      questionTitle: 'Dynamic Array Reversal',
      description: 'Sir, I have submitted dynamic array reversal with pointers. Please verify if my memory allocation is accepted.',
      status: 'RESOLVED',
      claimedBy: 'CS Faculty',
      reportedAt: 'Nov 17, 10:15 AM',
      resolvedAt: 'Nov 17, 10:45 AM',
    },
  ]);

  // Generate QR code for section join link
  useEffect(() => {
    const joinUrl = `${window.location.origin}/join/${sectionCode}`;
    QRCode.toDataURL(joinUrl, {
      width: 280,
      margin: 2,
      color: { dark: '#047857', light: '#FFFFFF' },
    })
      .then((url) => setQrDataUrl(url))
      .catch(() => {});
  }, [sectionCode]);

  // Copy 1-Click Join Link
  const handleCopyJoinLink = () => {
    const joinUrl = `${window.location.origin}/join/${sectionCode}`;
    navigator.clipboard.writeText(joinUrl);
    setCopiedLink(true);
    toast.success(`1-Click Join Link copied! Share with ${sectionName} students.`);
    setTimeout(() => setCopiedLink(false), 2500);
  };

  // Add Student Handler
  const handleAddStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanPrn = newStudentPrn.trim().toUpperCase();
    const cleanName = newStudentName.trim();
    const cleanEmail = newStudentEmail.trim().toLowerCase();

    if (!cleanPrn || !cleanName) {
      toast.error('Please enter PRN and Student Name');
      return;
    }

    const newStudent = {
      id: `cohort-${cleanPrn.toLowerCase()}`,
      uid: `cohort-${cleanPrn.toLowerCase()}`,
      prn: cleanPrn,
      name: cleanName,
      fullName: cleanName,
      displayName: cleanName,
      email: cleanEmail || `${cleanPrn.toLowerCase()}@sanjivani.edu.in`,
      department: sectionName,
      section: sectionName,
      sectionName,
      sectionId,
      joinCode: sectionCode,
      year: 'FY',
      division: 'A',
      totalSolved: 0,
      totalPoints: 0,
      currentStreak: 0,
      longestStreak: 0,
      academicScore: 0,
      integrityScore: 100,
      labInternalScore: 0,
      labInternalMax: 20,
      status: 'ACTIVE',
      accountState: 'ACTIVE',
      isEmailBound: true,
      miniProjectUnlocked: false,
      completedProblems: [],
    };

    setStudents((prev) => [newStudent, ...prev.filter((s) => s.prn !== cleanPrn)]);
    setIsAddStudentOpen(false);
    setNewStudentPrn('');
    setNewStudentName('');
    setNewStudentEmail('');

    try {
      await FirestoreDataService.saveEnrolledStudentsToFirestore(sectionId, [newStudent]);
      realtimeSync.emit('USERS');
    } catch {}

    toast.success(`Student ${cleanName} (${cleanPrn}) enrolled into ${sectionName}!`);
  };

  // Add Question Handler
  const handleAddQuestion = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newQuestionTitle.trim()) {
      toast.error('Please enter Question Title');
      return;
    }

    const newQ = {
      id: `cs-q-${Date.now().toString(36)}`,
      title: newQuestionTitle.trim(),
      difficulty: newQuestionDifficulty,
      description: newQuestionDesc.trim() || 'Solve the given algorithm in C.',
      moduleTitle: 'Module 1: Control Structures & Arrays',
      moduleIndex: 1,
      input1: newQuestionInput || '1 2 3',
      output1: newQuestionOutput || '3 2 1',
      createdAt: new Date().toISOString(),
    };

    const updated = [newQ, ...practiceQuestions];
    setPracticeQuestions(updated);
    try {
      localStorage.setItem('logicq_faculty_cs_questions', JSON.stringify(updated));
    } catch {}

    setIsAddQuestionOpen(false);
    setNewQuestionTitle('');
    setNewQuestionDesc('');
    setNewQuestionInput('');
    setNewQuestionOutput('');

    toast.success(`Practice Question "${newQ.title}" added to Computer Science!`);
  };

  // Create Lab Test Handler
  const handleCreateTest = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTestTitle.trim()) {
      toast.error('Please enter Lab Assessment Title');
      return;
    }

    const newTest = {
      id: `test-cs-${Date.now().toString(36)}`,
      title: newTestTitle.trim(),
      sectionTarget: sectionName,
      durationMinutes: Number(newTestDuration) || 60,
      totalMarks: Number(newTestMarks) || 20,
      status: 'ACTIVE',
      createdAt: new Date().toISOString(),
      submissionsCount: 0,
      averageScore: 0,
      topCandidate: '—',
    };

    setLabTests((prev) => [newTest, ...prev]);
    setIsCreateTestOpen(false);
    toast.success(`Lab Internal Exam "${newTest.title}" is now LIVE for ${sectionName}!`);
  };

  // Export Students to Excel
  const handleExportRoster = () => {
    try {
      const data = students.map((s) => ({
        'PRN': s.prn,
        'Student Name': s.fullName || s.name,
        'Email Address': s.email,
        'Section': s.sectionName || sectionName,
        'Join Code': sectionCode,
        'Solved Practice Problems': s.totalSolved || 0,
        'Total Points': s.totalPoints || 0,
        'Lab Internal Score': `${s.labInternalScore || 0} / 20`,
        'Integrity Rating': `${s.integrityScore || 100}%`,
        'Mini-Project Unlocked': s.miniProjectUnlocked ? 'YES' : 'NO',
      }));
      const ws = XLSX.utils.json_to_sheet(data);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'CS_Students_Roster');
      XLSX.writeFile(wb, `LogicQ_${sectionName.replace(/\s+/g, '_')}_Roster_2026.xlsx`);
      toast.success('Roster spreadsheet exported successfully!');
    } catch {
      toast.error('Failed to export roster');
    }
  };

  // Filtered Students
  const filteredStudents = useMemo(() => {
    return students.filter((s) => {
      const q = searchStudent.toLowerCase();
      const matchQ =
        !q ||
        s.name?.toLowerCase().includes(q) ||
        s.fullName?.toLowerCase().includes(q) ||
        s.prn?.toLowerCase().includes(q) ||
        s.email?.toLowerCase().includes(q);

      if (!matchQ) return false;
      if (studentStatusFilter === 'ACTIVE' && s.totalSolved === 0) return false;
      if (studentStatusFilter === 'HIGH_SCORE' && (s.labInternalScore || 0) < 15) return false;
      return true;
    });
  }, [students, searchStudent, studentStatusFilter]);

  // Tab Definitions
  const tabs: FacultyTabItem[] = useMemo(
    () => [
      { id: 'overview', label: 'Overview', icon: LayoutDashboard },
      { id: 'students', label: `My Students (${students.length})`, icon: Users },
      { id: 'practice', label: `Practice & Modules (${practiceQuestions.length})`, icon: BookOpen },
      { id: 'assessments', label: `Lab Internal Exams (${labTests.length})`, icon: Sliders },
      { id: 'integrity', label: 'Integrity & Proctoring', icon: ShieldCheck },
      { id: 'issues', label: 'Student Issues', icon: Flag, badge: issues.filter((i) => i.status === 'OPEN').length > 0 ? '1' : undefined },
    ],
    [students.length, practiceQuestions.length, labTests.length, issues]
  );

  return (
    <div className="min-h-screen bg-[#f8f9fa] dark:bg-[#090b0e] text-slate-800 dark:text-slate-100 font-sans antialiased selection:bg-emerald-500 selection:text-white flex flex-col">
      {/* ========================================================================= */}
      {/* 1. APPLE EXECUTIVE TOPBAR (Clean, Polished Glassmorphism)                 */}
      {/* ========================================================================= */}
      <header className="sticky top-0 z-40 bg-white/95 dark:bg-[#0c0f14]/95 backdrop-blur-xl border-b border-slate-200/80 dark:border-white/[0.08] shadow-xs select-none">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
          {/* Brand & Section Indicator */}
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-emerald-600 via-teal-600 to-cyan-500 text-white font-black text-xs flex items-center justify-center shadow-xs">
              LQ
            </div>
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-base tracking-tight text-slate-900 dark:text-white">
                LogicQ
              </span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                FACULTY PORTAL
              </span>
            </div>

            {/* Active Section Live Pill */}
            <div className="hidden md:flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-xs">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="font-semibold text-emerald-700 dark:text-emerald-300">
                Section: {sectionName}
              </span>
              <span className="font-mono font-bold px-1.5 py-0.2 bg-emerald-500/20 rounded text-emerald-800 dark:text-emerald-200 text-[10px]">
                {sectionCode}
              </span>
              <button
                onClick={handleCopyJoinLink}
                className="ml-1 text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 transition cursor-pointer"
                title="Copy Student Join Link"
              >
                {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>

          {/* Right Status & Profile Cluster */}
          <div className="flex items-center gap-3">
            {/* Quick Share Link Button */}
            <button
              onClick={() => setIsQrOpen(true)}
              className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20 hover:bg-emerald-100 transition cursor-pointer"
            >
              <QrCode className="w-3.5 h-3.5" />
              <span>Invite QR</span>
            </button>

            {/* Faculty User Info */}
            <div className="flex items-center gap-2 pl-2 border-l border-slate-200 dark:border-white/10">
              <div className="w-7 h-7 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 font-bold text-xs flex items-center justify-center font-mono">
                CS
              </div>
              <div className="flex flex-col">
                <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 hidden sm:inline leading-tight">
                  {user?.displayName || user?.fullName || 'CS Faculty (Section Admin)'}
                </span>
                <span className="text-[10px] font-mono text-slate-500 dark:text-slate-400 hidden sm:inline leading-tight">
                  Faculty • {sectionName}
                </span>
              </div>

              {/* Theme Toggle */}
              <button
                onClick={toggleTheme}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/10 transition cursor-pointer ml-1"
                title="Toggle Theme"
              >
                {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
              </button>

              {/* Sign Out */}
              <button
                onClick={async () => {
                  await logout();
                  navigate('/login');
                }}
                className="p-1.5 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-500/10 transition cursor-pointer"
                title="Sign Out"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Horizontal Navigation Tabs (Segmented Control) */}
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
                      ? 'bg-white dark:bg-[#1c2230] text-emerald-700 dark:text-emerald-300 shadow-xs font-bold border border-emerald-500/30'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-white/50 dark:hover:bg-white/[0.04] font-medium'
                  }`}
                >
                  <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400'}`} />
                  <span>{tab.label}</span>
                  {tab.badge && (
                    <span className="px-1.5 py-0.2 rounded-full text-[10px] font-mono bg-rose-500 text-white font-bold animate-pulse shadow-xs">
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
      {/* 2. MAIN WORKSPACE CONTENT                                                 */}
      {/* ========================================================================= */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6">
        {/* ===================================================================== */}
        {/* TAB 1: OVERVIEW                                                       */}
        {/* ===================================================================== */}
        {activeTab === 'overview' && (
          <div className="space-y-6 animate-in fade-in duration-200">
            {/* Apple Hero Greeting Card */}
            <div className="p-6 sm:p-8 rounded-3xl bg-gradient-to-r from-emerald-500/10 via-teal-500/5 to-cyan-500/10 border border-emerald-500/20 shadow-xs">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="space-y-1.5">
                  <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    <span>Academic Year 2026–2027 • Course CS101</span>
                  </div>
                  <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                    Welcome, Prof. CS Faculty 👋
                  </h1>
                  <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 max-w-xl">
                    Dedicated instructor portal for <strong>{sectionName}</strong>. Manage student enrollment, curate practice problem sets, and orchestrate proctored lab internal exams.
                  </p>
                </div>

                {/* Quick Actions Cluster */}
                <div className="flex flex-wrap items-center gap-2 shrink-0">
                  <button
                    onClick={() => setIsAddStudentOpen(true)}
                    className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-white dark:bg-[#1a202c] text-slate-800 dark:text-slate-100 border border-slate-200 dark:border-white/10 hover:border-emerald-500/40 transition shadow-2xs flex items-center gap-1.5 cursor-pointer"
                  >
                    <Users className="w-3.5 h-3.5 text-emerald-600" />
                    <span>+ Enroll Student</span>
                  </button>
                  <button
                    onClick={() => setIsAddQuestionOpen(true)}
                    className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-white dark:bg-[#1a202c] text-slate-800 dark:text-slate-100 border border-slate-200 dark:border-white/10 hover:border-emerald-500/40 transition shadow-2xs flex items-center gap-1.5 cursor-pointer"
                  >
                    <BookOpen className="w-3.5 h-3.5 text-emerald-600" />
                    <span>+ Practice Problem</span>
                  </button>
                  <button
                    onClick={() => setIsCreateTestOpen(true)}
                    className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white transition shadow-xs flex items-center gap-1.5 cursor-pointer"
                  >
                    <Sliders className="w-3.5 h-3.5" />
                    <span>+ Launch Lab Exam</span>
                  </button>
                </div>
              </div>
            </div>

            {/* 4 Live Bento Metrics Tiles */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Tile 1: Enrolled Students */}
              <div
                onClick={() => setActiveTab('students')}
                className="p-5 rounded-2xl bg-white dark:bg-[#0e131d] border border-slate-200/80 dark:border-white/[0.08] shadow-xs hover:border-emerald-500/40 transition cursor-pointer group"
              >
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Class Enrollment</span>
                  <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 group-hover:scale-105 transition">
                    <Users className="w-4 h-4" />
                  </div>
                </div>
                <div className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white font-mono">
                  {students.length}
                </div>
                <div className="flex items-center gap-1.5 mt-2 text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">
                  <CheckCircle2 className="w-3 h-3" />
                  <span>Join Code: {sectionCode}</span>
                </div>
              </div>

              {/* Tile 2: Practice Problems Solved */}
              <div
                onClick={() => setActiveTab('practice')}
                className="p-5 rounded-2xl bg-white dark:bg-[#0e131d] border border-slate-200/80 dark:border-white/[0.08] shadow-xs hover:border-emerald-500/40 transition cursor-pointer group"
              >
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Practice Problems</span>
                  <div className="p-2 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 group-hover:scale-105 transition">
                    <BookOpen className="w-4 h-4" />
                  </div>
                </div>
                <div className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white font-mono">
                  {practiceQuestions.length}
                </div>
                <div className="flex items-center gap-1.5 mt-2 text-[11px] text-blue-600 dark:text-blue-400 font-medium">
                  <Sparkles className="w-3 h-3" />
                  <span>6 Solved by Students</span>
                </div>
              </div>

              {/* Tile 3: Lab Internal Assessment */}
              <div
                onClick={() => setActiveTab('assessments')}
                className="p-5 rounded-2xl bg-white dark:bg-[#0e131d] border border-slate-200/80 dark:border-white/[0.08] shadow-xs hover:border-emerald-500/40 transition cursor-pointer group"
              >
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Lab Internal Exams</span>
                  <div className="p-2 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 group-hover:scale-105 transition">
                    <Sliders className="w-4 h-4" />
                  </div>
                </div>
                <div className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white font-mono">
                  {labTests.length}
                </div>
                <div className="flex items-center gap-1.5 mt-2 text-[11px] text-purple-600 dark:text-purple-400 font-medium">
                  <Award className="w-3 h-3" />
                  <span>Class Average: 18 / 20</span>
                </div>
              </div>

              {/* Tile 4: Integrity Trust */}
              <div
                onClick={() => setActiveTab('integrity')}
                className="p-5 rounded-2xl bg-white dark:bg-[#0e131d] border border-slate-200/80 dark:border-white/[0.08] shadow-xs hover:border-emerald-500/40 transition cursor-pointer group"
              >
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Section Integrity</span>
                  <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 group-hover:scale-105 transition">
                    <ShieldCheck className="w-4 h-4" />
                  </div>
                </div>
                <div className="text-2xl sm:text-3xl font-black text-emerald-600 dark:text-emerald-400 font-mono">
                  98%
                </div>
                <div className="flex items-center gap-1.5 mt-2 text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                  <Activity className="w-3 h-3 text-emerald-500" />
                  <span>Telemetry Monitored</span>
                </div>
              </div>
            </div>

            {/* Student Spotlight & Practice Curriculum Row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Student Spotlight Card */}
              <div className="p-6 rounded-3xl bg-white dark:bg-[#0e131d] border border-slate-200/80 dark:border-white/[0.08] shadow-xs space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="p-2 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                      <GraduationCap className="w-4 h-4" />
                    </span>
                    <h3 className="font-bold text-slate-900 dark:text-white text-base">
                      Top Candidate Spotlight
                    </h3>
                  </div>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                    VERIFIED ENROLLED
                  </span>
                </div>

                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-white/[0.03] border border-slate-100 dark:border-white/[0.05] flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-400 text-white font-black text-sm flex items-center justify-center font-mono shadow-xs">
                      D1
                    </div>
                    <div>
                      <div className="font-bold text-sm text-slate-900 dark:text-white">
                        Demo 1 ({students[0]?.prn})
                      </div>
                      <div className="text-xs text-slate-500 dark:text-slate-400">
                        {students[0]?.email}
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-blue-500/10 text-blue-600 dark:text-blue-400 font-bold">
                          {students[0]?.totalSolved} Solved
                        </span>
                        <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-purple-500/10 text-purple-600 dark:text-purple-400 font-bold">
                          Lab: {students[0]?.labInternalScore}/20
                        </span>
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => setSelectedStudentForModal(students[0])}
                    className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white transition shadow-2xs flex items-center gap-1.5 cursor-pointer shrink-0"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>Inspect &amp; Audit</span>
                  </button>
                </div>

                {/* Progress breakdown */}
                <div className="grid grid-cols-3 gap-2 text-center text-xs font-mono">
                  <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-white/[0.02] border border-slate-100 dark:border-white/[0.04]">
                    <div className="text-[10px] text-slate-400">Points</div>
                    <div className="font-bold text-slate-900 dark:text-white mt-0.5">480 PTS</div>
                  </div>
                  <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-white/[0.02] border border-slate-100 dark:border-white/[0.04]">
                    <div className="text-[10px] text-slate-400">Streak</div>
                    <div className="font-bold text-emerald-600 dark:text-emerald-400 mt-0.5">4 Days 🔥</div>
                  </div>
                  <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-white/[0.02] border border-slate-100 dark:border-white/[0.04]">
                    <div className="text-[10px] text-slate-400">Integrity</div>
                    <div className="font-bold text-blue-600 dark:text-blue-400 mt-0.5">98% Clean</div>
                  </div>
                </div>
              </div>

              {/* Lab Internal Exam Card */}
              <div className="p-6 rounded-3xl bg-white dark:bg-[#0e131d] border border-slate-200/80 dark:border-white/[0.08] shadow-xs space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="p-2 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400">
                      <Sliders className="w-4 h-4" />
                    </span>
                    <h3 className="font-bold text-slate-900 dark:text-white text-base">
                      Lab Internal Examination
                    </h3>
                  </div>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                    EVALUATED
                  </span>
                </div>

                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-white/[0.03] border border-slate-100 dark:border-white/[0.05] space-y-2">
                  <div className="font-bold text-sm text-slate-900 dark:text-white">
                    {labTests[0]?.title}
                  </div>
                  <div className="text-xs text-slate-500 flex items-center gap-3">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-slate-400" />
                      {labTests[0]?.durationMinutes} Minutes
                    </span>
                    <span className="flex items-center gap-1">
                      <Award className="w-3.5 h-3.5 text-slate-400" />
                      Max Marks: {labTests[0]?.totalMarks}
                    </span>
                    <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-semibold">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Turnout: 100%
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-1">
                  <span className="text-xs text-slate-500">
                    Highest Performer: <strong className="text-slate-800 dark:text-slate-200">Demo 1 (18/20)</strong>
                  </span>
                  <button
                    onClick={() => setActiveTab('assessments')}
                    className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <span>View Exam Telemetry</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ===================================================================== */}
        {/* TAB 2: MY STUDENTS                                                    */}
        {/* ===================================================================== */}
        {activeTab === 'students' && (
          <div className="space-y-4 animate-in fade-in duration-200">
            {/* Header with Search and Actions */}
            <div className="p-5 rounded-3xl bg-white dark:bg-[#0e131d] border border-slate-200/80 dark:border-white/[0.08] shadow-xs space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="p-2 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                      <Users className="w-5 h-5" />
                    </span>
                    <h2 className="text-lg sm:text-xl font-bold tracking-tight text-slate-900 dark:text-white">
                      {sectionName} Student Roster
                    </h2>
                    <span className="px-2.5 py-0.5 rounded-full text-[11px] font-mono font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                      {filteredStudents.length} Students
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    Manage students in {sectionName}. Inspect code submissions, verify proctoring telemetry, and grant mini-project eligibility.
                  </p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={handleExportRoster}
                    className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-slate-100 dark:bg-white/5 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-white/10 hover:bg-slate-200 transition flex items-center gap-1.5 cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Export Excel</span>
                  </button>
                  <button
                    onClick={() => setIsAddStudentOpen(true)}
                    className="px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white transition shadow-xs flex items-center gap-1.5 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Enroll Student</span>
                  </button>
                </div>
              </div>

              {/* Search Bar */}
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={searchStudent}
                  onChange={(e) => setSearchStudent(e.target.value)}
                  placeholder="Search student by Name, PRN (e.g. 2126PMIB1001), or Email..."
                  className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50/70 dark:bg-white/5 text-slate-900 dark:text-white text-xs sm:text-sm focus:outline-hidden focus:ring-2 focus:ring-emerald-500/30 transition placeholder:text-slate-400"
                />
              </div>
            </div>

            {/* Students Table / Grid */}
            <div className="rounded-3xl bg-white dark:bg-[#0e131d] border border-slate-200/80 dark:border-white/[0.08] shadow-xs overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 dark:bg-white/[0.02] border-b border-slate-200/80 dark:border-white/10 text-slate-500 font-semibold uppercase text-[10px] tracking-wider">
                    <tr>
                      <th className="py-3 px-4">Student</th>
                      <th className="py-3 px-4">PRN / Division</th>
                      <th className="py-3 px-4">Practice Solved</th>
                      <th className="py-3 px-4">Lab Internal (20M)</th>
                      <th className="py-3 px-4">Integrity Rating</th>
                      <th className="py-3 px-4">Mini-Project</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                    {filteredStudents.map((st) => (
                      <tr key={st.id} className="hover:bg-slate-50/50 dark:hover:bg-white/[0.02] transition">
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-400 text-white font-bold text-xs flex items-center justify-center font-mono">
                              {(st.name || st.fullName || 'S').slice(0, 1).toUpperCase()}
                            </div>
                            <div>
                              <div className="font-bold text-slate-900 dark:text-white">
                                {st.name || st.fullName}
                              </div>
                              <div className="text-[11px] text-slate-400">{st.email}</div>
                            </div>
                          </div>
                        </td>

                        <td className="py-3.5 px-4 font-mono">
                          <span className="font-bold text-slate-800 dark:text-slate-200">{st.prn}</span>
                          <span className="text-[11px] text-slate-400 block">{st.year} - {st.division}</span>
                        </td>

                        <td className="py-3.5 px-4">
                          <span className="px-2 py-0.5 rounded-full font-mono text-[11px] font-bold bg-blue-500/10 text-blue-600 dark:text-blue-400">
                            {st.totalSolved} Solved
                          </span>
                        </td>

                        <td className="py-3.5 px-4 font-mono font-bold text-slate-900 dark:text-white">
                          <span className="px-2 py-0.5 rounded-full text-[11px] bg-purple-500/10 text-purple-600 dark:text-purple-400">
                            {st.labInternalScore} / 20
                          </span>
                        </td>

                        <td className="py-3.5 px-4">
                          <span className="px-2 py-0.5 rounded-full font-mono text-[11px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                            {st.integrityScore}% Clean
                          </span>
                        </td>

                        <td className="py-3.5 px-4">
                          {st.miniProjectUnlocked ? (
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-700 dark:text-emerald-300">
                              UNLOCKED
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-200 dark:bg-white/10 text-slate-500">
                              LOCKED
                            </span>
                          )}
                        </td>

                        <td className="py-3.5 px-4 text-right">
                          <button
                            onClick={() => setSelectedStudentForModal(st)}
                            className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white transition shadow-2xs inline-flex items-center gap-1.5 cursor-pointer"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>Audit Deep Dive</span>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ===================================================================== */}
        {/* TAB 3: PRACTICE & CURRICULUM (Faculty Creates Custom Questions/Modules)*/}
        {/* ===================================================================== */}
        {activeTab === 'practice' && (
          <div className="space-y-6 animate-in fade-in duration-200">
            {/* Header */}
            <div className="p-5 rounded-3xl bg-white dark:bg-[#0e131d] border border-slate-200/80 dark:border-white/[0.08] shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="p-2 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400">
                    <BookOpen className="w-5 h-5" />
                  </span>
                  <h2 className="text-lg sm:text-xl font-bold tracking-tight text-slate-900 dark:text-white">
                    {sectionName} Practice Modules &amp; Questions
                  </h2>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Faculty curriculum authoring workspace. Create and publish tailored practice modules for your section students.
                </p>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => setIsAddQuestionOpen(true)}
                  className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white transition shadow-xs flex items-center gap-1.5 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>+ Add Practice Question</span>
                </button>
              </div>
            </div>

            {/* Module Overview Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-5 rounded-2xl bg-white dark:bg-[#0e131d] border border-emerald-500/30 shadow-xs space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">Module 1 (ACTIVE)</span>
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-emerald-500/10 text-emerald-600 font-bold">
                    6 Problems
                  </span>
                </div>
                <div className="font-bold text-sm text-slate-900 dark:text-white">
                  Control Structures &amp; Dynamic Logic
                </div>
                <p className="text-xs text-slate-500">
                  Covers bitwise logic, conditionals, palindrome algorithms, and dynamic pointer array operations.
                </p>
              </div>

              <div className="p-5 rounded-2xl bg-white dark:bg-[#0e131d] border border-slate-200/80 dark:border-white/[0.08] shadow-xs space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-400">Module 2 (UPCOMING)</span>
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-slate-100 dark:bg-white/5 text-slate-400 font-bold">
                    4 Problems
                  </span>
                </div>
                <div className="font-bold text-sm text-slate-900 dark:text-white">
                  Pointers &amp; Dynamic Memory Layout
                </div>
                <p className="text-xs text-slate-500">
                  Covers heap allocation, buffer offsets, and multi-dimensional pointer arithmetic.
                </p>
              </div>

              <div className="p-5 rounded-2xl bg-white dark:bg-[#0e131d] border border-slate-200/80 dark:border-white/[0.08] shadow-xs space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-400">Module 3 (UPCOMING)</span>
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-slate-100 dark:bg-white/5 text-slate-400 font-bold">
                    4 Problems
                  </span>
                </div>
                <div className="font-bold text-sm text-slate-900 dark:text-white">
                  Structures, Unions &amp; System Files
                </div>
                <p className="text-xs text-slate-500">
                  Packed memory structs, binary serialization, and linked list node traversal.
                </p>
              </div>
            </div>

            {/* Questions List */}
            <div className="rounded-3xl bg-white dark:bg-[#0e131d] border border-slate-200/80 dark:border-white/[0.08] p-5 shadow-xs space-y-4">
              <h3 className="font-bold text-slate-900 dark:text-white text-sm">
                Active Practice Questions in {sectionName} ({practiceQuestions.length})
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {practiceQuestions.map((q, idx) => (
                  <div
                    key={q.id || idx}
                    className="p-4 rounded-2xl bg-slate-50 dark:bg-white/[0.02] border border-slate-100 dark:border-white/[0.05] hover:border-emerald-500/40 transition space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 font-mono">
                        #{idx + 1} • {q.difficulty || 'EASY'}
                      </span>
                      <span className="px-2 py-0.5 rounded text-[10px] bg-slate-200 dark:bg-white/10 text-slate-600 dark:text-slate-300 font-mono">
                        {q.moduleTitle || 'Module 1'}
                      </span>
                    </div>
                    <div className="font-bold text-sm text-slate-900 dark:text-white">
                      {q.title}
                    </div>
                    <p className="text-xs text-slate-500 line-clamp-2">
                      {q.description}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ===================================================================== */}
        {/* TAB 4: LAB INTERNAL EXAMS                                             */}
        {/* ===================================================================== */}
        {activeTab === 'assessments' && (
          <div className="space-y-6 animate-in fade-in duration-200">
            {/* Header */}
            <div className="p-5 rounded-3xl bg-white dark:bg-[#0e131d] border border-slate-200/80 dark:border-white/[0.08] shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="p-2 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400">
                    <Sliders className="w-5 h-5" />
                  </span>
                  <h2 className="text-lg sm:text-xl font-bold tracking-tight text-slate-900 dark:text-white">
                    {sectionName} Lab Internal Assessments
                  </h2>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Schedule, configure, and monitor proctored lab examinations for students in {sectionName}.
                </p>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => setIsCreateTestOpen(true)}
                  className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white transition shadow-xs flex items-center gap-1.5 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>+ Schedule New Lab Exam</span>
                </button>
              </div>
            </div>

            {/* Assessment Cards */}
            <div className="space-y-4">
              {labTests.map((t) => (
                <div
                  key={t.id}
                  className="p-6 rounded-3xl bg-white dark:bg-[#0e131d] border border-slate-200/80 dark:border-white/[0.08] shadow-xs space-y-4"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-base font-bold text-slate-900 dark:text-white">
                          {t.title}
                        </h3>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                          {t.status}
                        </span>
                      </div>
                      <div className="flex items-center gap-4 text-xs text-slate-500 mt-1">
                        <span>Target: <strong>{t.sectionTarget}</strong></span>
                        <span>Duration: <strong>{t.durationMinutes}m</strong></span>
                        <span>Total Marks: <strong>{t.totalMarks}M</strong></span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 font-mono text-xs">
                      <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-white/[0.03] text-center">
                        <div className="text-[10px] text-slate-400">Submissions</div>
                        <div className="font-bold text-slate-900 dark:text-white">{t.submissionsCount} / 1</div>
                      </div>
                      <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-white/[0.03] text-center">
                        <div className="text-[10px] text-slate-400">Class Average</div>
                        <div className="font-bold text-emerald-600">{t.averageScore} / 20</div>
                      </div>
                    </div>
                  </div>

                  {/* Candidate Submissions Preview */}
                  <div className="p-4 rounded-2xl bg-slate-50 dark:bg-white/[0.02] border border-slate-100 dark:border-white/[0.05] flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-purple-500 to-indigo-500 text-white font-bold text-xs flex items-center justify-center font-mono">
                        D1
                      </div>
                      <div>
                        <div className="font-bold text-xs text-slate-900 dark:text-white">
                          Demo 1 (2126PMIB1001)
                        </div>
                        <div className="text-[11px] text-slate-400">
                          Solved in 55m 26s • 2 Fullscreen Exits flagged • AI Viva: 9/10
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <span className="font-mono font-bold text-xs text-emerald-600 bg-emerald-500/10 px-2.5 py-1 rounded-lg">
                        Score: 18 / 20 (ACCEPTED)
                      </span>
                      <button
                        onClick={() => setSelectedStudentForModal(students[0])}
                        className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-white dark:bg-[#1a202c] border border-slate-200 dark:border-white/10 hover:border-emerald-500 transition shadow-2xs cursor-pointer"
                      >
                        Inspect Code
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ===================================================================== */}
        {/* TAB 5: INTEGRITY & PROCTORING                                         */}
        {/* ===================================================================== */}
        {activeTab === 'integrity' && (
          <div className="space-y-6 animate-in fade-in duration-200">
            {/* Header */}
            <div className="p-5 rounded-3xl bg-white dark:bg-[#0e131d] border border-slate-200/80 dark:border-white/[0.08] shadow-xs">
              <div className="flex items-center gap-2">
                <span className="p-2 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                  <ShieldCheck className="w-5 h-5" />
                </span>
                <h2 className="text-lg sm:text-xl font-bold tracking-tight text-slate-900 dark:text-white">
                  {sectionName} Live Proctoring &amp; Integrity Radar
                </h2>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Zero-tolerance exam telemetry. Monitored fullscreen departures, clipboard pastes, and AI viva response latency.
              </p>
            </div>

            {/* Candidate Telemetry Card */}
            <div className="p-6 rounded-3xl bg-white dark:bg-[#0e131d] border border-slate-200/80 dark:border-white/[0.08] shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-400 text-white font-black text-sm flex items-center justify-center font-mono">
                    D1
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900 dark:text-white text-sm">
                      Demo 1 (2126PMIB1001) • Telemetry Log
                    </h3>
                    <div className="text-xs text-slate-400">
                      Overall Integrity Score: <strong className="text-emerald-600">98% (High Trust)</strong>
                    </div>
                  </div>
                </div>

                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-mono font-bold bg-amber-500/10 text-amber-600 border border-amber-500/20">
                  2 VIOLATIONS FLAGGED
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-mono">
                <div className="p-3 rounded-xl bg-amber-500/5 border border-amber-500/20 text-center">
                  <span className="text-[10px] text-amber-600 font-bold block">Fullscreen Exits</span>
                  <span className="text-lg font-black text-amber-600">2 Exits</span>
                </div>
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-white/[0.02] border border-slate-100 dark:border-white/[0.05] text-center">
                  <span className="text-[10px] text-slate-400 font-bold block">Tab Switches</span>
                  <span className="text-lg font-black text-emerald-600">0 Switches</span>
                </div>
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-white/[0.02] border border-slate-100 dark:border-white/[0.05] text-center">
                  <span className="text-[10px] text-slate-400 font-bold block">Paste Bursts</span>
                  <span className="text-lg font-black text-emerald-600">0 Pastes</span>
                </div>
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-white/[0.02] border border-slate-100 dark:border-white/[0.05] text-center">
                  <span className="text-[10px] text-slate-400 font-bold block">AI Viva Rating</span>
                  <span className="text-lg font-black text-blue-600">9 / 10</span>
                </div>
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  onClick={() => setSelectedStudentForModal(students[0])}
                  className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white transition shadow-2xs flex items-center gap-1.5 cursor-pointer"
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>Inspect Proctored Submissions</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ===================================================================== */}
        {/* TAB 6: STUDENT ISSUES                                                 */}
        {/* ===================================================================== */}
        {activeTab === 'issues' && (
          <div className="space-y-6 animate-in fade-in duration-200">
            {/* Header */}
            <div className="p-5 rounded-3xl bg-white dark:bg-[#0e131d] border border-slate-200/80 dark:border-white/[0.08] shadow-xs">
              <div className="flex items-center gap-2">
                <span className="p-2 rounded-xl bg-rose-500/10 text-rose-600 dark:text-rose-400">
                  <Flag className="w-5 h-5" />
                </span>
                <h2 className="text-lg sm:text-xl font-bold tracking-tight text-slate-900 dark:text-white">
                  {sectionName} Student Issues &amp; Inquiries
                </h2>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Help desk for students in {sectionName}. Claim tickets, assist via WhatsApp, and resolve inquiries.
              </p>
            </div>

            {/* Issues List */}
            <div className="space-y-3">
              {issues.map((iss) => (
                <div
                  key={iss.id}
                  className="p-5 rounded-2xl bg-white dark:bg-[#0e131d] border border-slate-200/80 dark:border-white/[0.08] shadow-xs space-y-3"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-blue-500/10 text-blue-600 border border-blue-500/20">
                        {iss.category}
                      </span>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
                        {iss.status}
                      </span>
                      <span className="text-xs font-bold text-slate-900 dark:text-white">
                        {iss.questionTitle}
                      </span>
                    </div>

                    <span className="text-[11px] text-slate-400">
                      Reported: {iss.reportedAt}
                    </span>
                  </div>

                  <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-white/[0.02] border border-slate-100 dark:border-white/[0.05] text-xs font-mono text-slate-700 dark:text-slate-300">
                    "{iss.description}"
                  </div>

                  <div className="flex items-center justify-between pt-1">
                    <div className="text-xs text-slate-500">
                      From: <strong>{iss.studentName}</strong> ({iss.studentPrn})
                    </div>

                    <div className="flex items-center gap-2">
                      <a
                        href={`https://wa.me/${iss.mobile?.replace(/[^0-9]/g, '')}`}
                        target="_blank"
                        rel="noreferrer"
                        className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white transition shadow-2xs inline-flex items-center gap-1 cursor-pointer"
                      >
                        <Send className="w-3.5 h-3.5" />
                        <span>WhatsApp</span>
                      </a>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>

      {/* ========================================================================= */}
      {/* 3. MODALS                                                                 */}
      {/* ========================================================================= */}

      {/* QR Code Modal */}
      {isQrOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white dark:bg-[#121620] rounded-3xl border border-slate-200 dark:border-white/10 max-w-sm w-full p-6 text-center shadow-xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-slate-900 dark:text-white text-base">
                {sectionName} Invite QR
              </h3>
              <button
                onClick={() => setIsQrOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-500">
              Students can scan this QR code on their mobile or laptop to instantly join <strong>{sectionName}</strong>.
            </p>

            {qrDataUrl && (
              <div className="p-4 bg-white rounded-2xl border border-slate-100 inline-block shadow-xs">
                <img src={qrDataUrl} alt="Join QR Code" className="w-48 h-48 mx-auto" />
              </div>
            )}

            <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-white/[0.04] font-mono text-xs text-slate-700 dark:text-slate-300 flex items-center justify-between">
              <span>Code: <strong>{sectionCode}</strong></span>
              <button
                onClick={handleCopyJoinLink}
                className="text-emerald-600 font-bold hover:underline"
              >
                Copy Link
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Student Modal */}
      {isAddStudentOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white dark:bg-[#121620] rounded-3xl border border-slate-200 dark:border-white/10 max-w-md w-full p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-600">
                  <Users className="w-4 h-4" />
                </div>
                <h3 className="font-bold text-slate-900 dark:text-white text-base">
                  Enroll Student in {sectionName}
                </h3>
              </div>
              <button
                onClick={() => setIsAddStudentOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAddStudent} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Institutional PRN (Required)
                </label>
                <input
                  type="text"
                  required
                  value={newStudentPrn}
                  onChange={(e) => setNewStudentPrn(e.target.value)}
                  placeholder="e.g. 2126PMIB1002"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 font-mono text-sm uppercase"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Full Name (Required)
                </label>
                <input
                  type="text"
                  required
                  value={newStudentName}
                  onChange={(e) => setNewStudentName(e.target.value)}
                  placeholder="e.g. Rohan Sharma"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 text-sm"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Email Address (Optional)
                </label>
                <input
                  type="email"
                  value={newStudentEmail}
                  onChange={(e) => setNewStudentEmail(e.target.value)}
                  placeholder="e.g. student@sanjivani.edu.in"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 text-sm"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddStudentOpen(false)}
                  className="px-4 py-2 rounded-xl font-semibold text-slate-600 hover:bg-slate-100 dark:hover:bg-white/5"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl font-semibold bg-emerald-600 hover:bg-emerald-500 text-white shadow-xs"
                >
                  Enroll Student
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Question Modal */}
      {isAddQuestionOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white dark:bg-[#121620] rounded-3xl border border-slate-200 dark:border-white/10 max-w-lg w-full p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-blue-500/10 text-blue-600">
                  <BookOpen className="w-4 h-4" />
                </div>
                <h3 className="font-bold text-slate-900 dark:text-white text-base">
                  Add Practice Problem to {sectionName}
                </h3>
              </div>
              <button
                onClick={() => setIsAddQuestionOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAddQuestion} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Problem Title
                </label>
                <input
                  type="text"
                  required
                  value={newQuestionTitle}
                  onChange={(e) => setNewQuestionTitle(e.target.value)}
                  placeholder="e.g. Inverted Triangle Pattern in C"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 text-sm"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Difficulty
                </label>
                <select
                  value={newQuestionDifficulty}
                  onChange={(e: any) => setNewQuestionDifficulty(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 text-sm"
                >
                  <option value="EASY">EASY</option>
                  <option value="MEDIUM">MEDIUM</option>
                  <option value="HARD">HARD</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Problem Description
                </label>
                <textarea
                  rows={3}
                  value={newQuestionDesc}
                  onChange={(e) => setNewQuestionDesc(e.target.value)}
                  placeholder="Describe the task and expectations..."
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 text-sm"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Sample Input
                  </label>
                  <input
                    type="text"
                    value={newQuestionInput}
                    onChange={(e) => setNewQuestionInput(e.target.value)}
                    placeholder="e.g. 5"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 font-mono text-xs"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Expected Output
                  </label>
                  <input
                    type="text"
                    value={newQuestionOutput}
                    onChange={(e) => setNewQuestionOutput(e.target.value)}
                    placeholder="e.g. *****"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 font-mono text-xs"
                  />
                </div>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddQuestionOpen(false)}
                  className="px-4 py-2 rounded-xl font-semibold text-slate-600 hover:bg-slate-100 dark:hover:bg-white/5"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl font-semibold bg-emerald-600 hover:bg-emerald-500 text-white shadow-xs"
                >
                  Publish to {sectionName}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Create Lab Exam Modal */}
      {isCreateTestOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white dark:bg-[#121620] rounded-3xl border border-slate-200 dark:border-white/10 max-w-md w-full p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-purple-500/10 text-purple-600">
                  <Sliders className="w-4 h-4" />
                </div>
                <h3 className="font-bold text-slate-900 dark:text-white text-base">
                  Schedule Lab Internal Exam
                </h3>
              </div>
              <button
                onClick={() => setIsCreateTestOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateTest} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Exam Title
                </label>
                <input
                  type="text"
                  required
                  value={newTestTitle}
                  onChange={(e) => setNewTestTitle(e.target.value)}
                  placeholder="e.g. Lab Internal 2: Pointer Operations"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 text-sm"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Duration (Minutes)
                  </label>
                  <input
                    type="number"
                    min={15}
                    max={180}
                    value={newTestDuration}
                    onChange={(e) => setNewTestDuration(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 font-mono text-sm"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Total Marks
                  </label>
                  <input
                    type="number"
                    min={5}
                    max={100}
                    value={newTestMarks}
                    onChange={(e) => setNewTestMarks(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 font-mono text-sm"
                  />
                </div>
              </div>

              <div className="p-3 rounded-xl bg-purple-500/10 text-purple-700 dark:text-purple-300 text-[11px] leading-relaxed">
                Targeted section: <strong>{sectionName}</strong> ({sectionCode}). AI viva and proctoring telemetry will automatically monitor all candidate submissions.
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsCreateTestOpen(false)}
                  className="px-4 py-2 rounded-xl font-semibold text-slate-600 hover:bg-slate-100 dark:hover:bg-white/5"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl font-semibold bg-purple-600 hover:bg-purple-500 text-white shadow-xs"
                >
                  Launch Exam
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Student Deep Dive Modal (Full Code & Audit Inspection) */}
      {selectedStudentForModal && (
        <StudentDeepDiveModal
          student={selectedStudentForModal}
          onClose={() => setSelectedStudentForModal(null)}
          onToggleMiniProject={(studentId, currentStatus) => {
            setSelectedStudentForModal({
              ...selectedStudentForModal,
              miniProjectUnlocked: !currentStatus,
            });
            setStudents((prev) =>
              prev.map((s) =>
                s.id === studentId ? { ...s, miniProjectUnlocked: !currentStatus } : s
              )
            );
            toast.success(
              `Mini-Project status updated for ${selectedStudentForModal.name || selectedStudentForModal.fullName}!`
            );
          }}
        />
      )}
    </div>
  );
};
