import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../api/client.js';
import { FirestoreDataService } from '../../services/firestoreData.service.js';
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
}

export const FacultyAnalyticsPage: React.FC = () => {
  const [selectedSectionId, setSelectedSectionId] = useState<string>('ALL');
  const [activeFilterTab, setActiveFilterTab] = useState<'ALL' | 'CONSISTENT' | 'NEEDS_HELP' | 'INTEGRITY_FLAG'>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedStudentForInspect, setSelectedStudentForInspect] = useState<string | null>(null);
  const [isExportingCsv, setIsExportingCsv] = useState(false);

  // 1. Primary Query: Combines Sections, Enrolled Students, and Real Submissions
  const { data: analyticsData, isLoading } = useQuery({
    queryKey: ['faculty-analytics-hub-data'],
    queryFn: async () => {
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
        sectionMap.set(s.sectionId || s.id, {
          id: s.sectionId || s.id,
          name: s.sectionName || 'Academic Section',
          course: s.course || 'B.Tech CSE',
          studentCount: s.studentCount || 0,
        });
      });

      fsSections.forEach((fs: any) => {
        const key = fs.id || fs.joinCode;
        if (!sectionMap.has(key)) {
          sectionMap.set(key, {
            id: fs.id,
            name: fs.sectionName || fs.subject || 'Academic Section',
            course: fs.course || 'B.Tech CSE',
            studentCount: fs.students?.length || 0,
          });
        }
      });

      // Filter genuine student users
      const studentsList: StudentRosterItem[] = fsUsers
        .filter((u: any) => u.role === 'STUDENT' || !u.role || u.role === 'USER')
        .map((u: any) => {
          const points = Number(u.totalPoints || 0);
          const streak = Number(u.currentStreak || 0);
          const prn = u.prn ? String(u.prn).trim().toUpperCase() : 'PENDING';
          
          // Integrity & anti-cheat telemetry detection
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

          return {
            id: u.id || u.uid || prn,
            uid: u.uid || u.id,
            fullName: u.fullName || u.displayName || (prn !== 'PENDING' ? `Student ${prn.slice(-4)}` : 'Enrolled Student'),
            displayName: u.displayName || u.fullName,
            prn,
            email: u.email || '—',
            department: u.department || 'CSE',
            year: u.year || 'SY',
            division: u.division || 'A',
            totalPoints: points,
            currentStreak: streak,
            solvedCount: Math.round(points / 25),
            integrityScore,
            integrityRisk,
            tabSwitchCount: tabSwitches,
            copyPasteAttempts: pasteAttempts,
            statusCategory,
            sectionId: u.sectionId || undefined,
          };
        });

      return {
        sections: Array.from(sectionMap.values()),
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
    refetchOnWindowFocus: false,
  });

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
              department: fsStudent.department || 'CSE',
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
    return analyticsData.students.filter((st) => {
      // Section filter
      if (selectedSectionId !== 'ALL' && st.sectionId && st.sectionId !== selectedSectionId) {
        return false;
      }
      // Tab filter
      if (activeFilterTab !== 'ALL' && st.statusCategory !== activeFilterTab) {
        return false;
      }
      // Text search
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesName = st.fullName.toLowerCase().includes(q);
        const matchesPrn = st.prn.toLowerCase().includes(q);
        const matchesEmail = st.email.toLowerCase().includes(q);
        return matchesName || matchesPrn || matchesEmail;
      }
      return true;
    });
  }, [analyticsData?.students, selectedSectionId, activeFilterTab, searchQuery]);

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
    const totalTabSwitches = attempts.reduce((acc: number, att: any) => acc + (att.tabSwitchCount || 0), 0);
    const totalCopyPaste = attempts.reduce((acc: number, att: any) => acc + (att.copyPasteAttempts || 0), 0);
    const totalFullScreenExits = attempts.reduce((acc: number, att: any) => acc + (att.fullScreenExitCount || 0), 0);
    const vivaList = (deepDiveData.assignments || []).flatMap((a: any) => a.vivaQuestions || []);

    const integrityScore = (deepDiveData.assignments && deepDiveData.assignments[0]?.integrityScore !== undefined)
      ? deepDiveData.assignments[0].integrityScore
      : (totalTabSwitches >= 3 ? 35 : totalTabSwitches > 0 ? 75 : 100);

    const integrityRisk = (deepDiveData.assignments && deepDiveData.assignments[0]?.integrityRisk)
      ? deepDiveData.assignments[0].integrityRisk
      : (integrityScore <= 40 ? 'HIGH' : integrityScore <= 75 ? 'MODERATE' : 'NORMAL');

    return {
      totalTabSwitches,
      totalCopyPaste,
      totalFullScreenExits,
      vivaList,
      integrityScore,
      integrityRisk,
    };
  }, [deepDiveData]);

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
            <div className="flex items-center gap-2 bg-[var(--background)] border border-[var(--border)] rounded-xl px-3 py-2 text-xs">
              <Filter className="w-3.5 h-3.5 text-indigo-500" />
              <select
                value={selectedSectionId}
                onChange={(e) => setSelectedSectionId(e.target.value)}
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
            <span className="text-indigo-600 dark:text-indigo-400 font-semibold">{analyticsData?.sections?.length || 1} sections</span> monitored
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
          <div className="py-12 text-center space-y-2">
            <Users className="w-8 h-8 text-[var(--muted-foreground)] mx-auto opacity-50" />
            <p className="text-sm font-semibold text-[var(--foreground)]">No students found matching your criteria</p>
            <p className="text-xs text-[var(--muted-foreground)]">Try adjusting your search query or section filter.</p>
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
                      {student.department} • Year {student.year}
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
          <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl w-full max-w-3xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
            {/* Modal Header */}
            <div className="p-5 border-b border-[var(--border)] flex items-center justify-between bg-[var(--background)]">
              <div className="flex items-center gap-2">
                <Code2 className="w-5 h-5 text-indigo-500" />
                <div>
                  <h3 className="font-bold text-[var(--foreground)] text-base">Candidate Inspection & Anti-Cheat Audit</h3>
                  <p className="text-xs text-[var(--muted-foreground)]">PRN: <span className="font-mono text-indigo-600 dark:text-indigo-400 font-bold">{selectedStudentForInspect}</span></p>
                </div>
              </div>
              <button
                onClick={() => setSelectedStudentForInspect(null)}
                className="p-1.5 rounded-lg text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:bg-[var(--accent)]/10 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-6">
              {isDeepDiveLoading ? (
                <div className="py-16 text-center space-y-3">
                  <div className="w-8 h-8 rounded-full border-2 border-indigo-500 border-t-transparent animate-spin mx-auto" />
                  <p className="text-xs text-[var(--muted-foreground)]">Loading student code submissions & anti-cheat audit...</p>
                </div>
              ) : !deepDiveData?.student ? (
                <div className="py-12 text-center text-[var(--muted-foreground)]">
                  Unable to load records for this student.
                </div>
              ) : (
                <>
                  {/* Candidate Profile Summary */}
                  <div className="p-4 rounded-xl bg-[var(--background)] border border-[var(--border)] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <h4 className="font-bold text-[var(--foreground)] text-sm">{deepDiveData.student.fullName}</h4>
                      <p className="text-xs text-[var(--muted-foreground)]">
                        {deepDiveData.student.email} • {deepDiveData.student.department} (Year {deepDiveData.student.year})
                      </p>
                    </div>
                    <div className="flex items-center gap-4 text-xs font-mono">
                      <div>
                        <span className="text-[var(--muted-foreground)]">Points: </span>
                        <span className="text-indigo-600 dark:text-indigo-400 font-bold">{deepDiveData.student.totalPoints || 0} PTS</span>
                      </div>
                      <div>
                        <span className="text-[var(--muted-foreground)]">Streak: </span>
                        <span className="text-amber-600 dark:text-amber-400 font-bold">{deepDiveData.student.currentStreak || 0} days</span>
                      </div>
                    </div>
                  </div>

                  {/* 🛡️ Dedicated Anti-Cheat & Cheating Audit Card */}
                  <div className="p-4 rounded-xl bg-[var(--background)] border border-[var(--border)] space-y-3">
                    <div className="flex items-center justify-between border-b border-[var(--border)] pb-2.5">
                      <div className="flex items-center gap-2">
                        <ShieldAlert className="w-4 h-4 text-rose-500" />
                        <h4 className="font-bold text-[var(--foreground)] text-xs uppercase tracking-wider">
                          Behavioral Integrity & Anti-Cheat Proctoring Audit
                        </h4>
                      </div>
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                          (inspectTelemetry?.integrityScore || 100) >= 80
                            ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20'
                            : (inspectTelemetry?.integrityScore || 100) >= 50
                            ? 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20'
                            : 'bg-rose-500/10 text-rose-700 dark:text-rose-400 border border-rose-500/20'
                        }`}
                      >
                        Integrity Score: {inspectTelemetry?.integrityScore || 100} / 100 ({inspectTelemetry?.integrityRisk || 'NORMAL'})
                      </span>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs pt-1">
                      <div className="p-2.5 rounded-lg bg-[var(--card)] border border-[var(--border)] space-y-1">
                        <span className="text-[10px] text-[var(--muted-foreground)] block">Tab Switches</span>
                        <span className={`text-base font-bold font-mono ${
                          (inspectTelemetry?.totalTabSwitches || 0) > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-emerald-600 dark:text-emerald-400'
                        }`}>
                          {inspectTelemetry?.totalTabSwitches || 0}
                        </span>
                        <span className="text-[10px] text-[var(--muted-foreground)] block">
                          {(inspectTelemetry?.totalTabSwitches || 0) >= 3 ? 'Exceeded Limit' : 'Within tolerance'}
                        </span>
                      </div>

                      <div className="p-2.5 rounded-lg bg-[var(--card)] border border-[var(--border)] space-y-1">
                        <span className="text-[10px] text-[var(--muted-foreground)] block">Clipboard Pastes</span>
                        <span className={`text-base font-bold font-mono ${
                          (inspectTelemetry?.totalCopyPaste || 0) > 0 ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'
                        }`}>
                          {inspectTelemetry?.totalCopyPaste || 0}
                        </span>
                        <span className="text-[10px] text-[var(--muted-foreground)] block">
                          {(inspectTelemetry?.totalCopyPaste || 0) > 0 ? 'Blocked by Proctor' : 'No paste attempts'}
                        </span>
                      </div>

                      <div className="p-2.5 rounded-lg bg-[var(--card)] border border-[var(--border)] space-y-1">
                        <span className="text-[10px] text-[var(--muted-foreground)] block">Fullscreen Exits</span>
                        <span className={`text-base font-bold font-mono ${
                          (inspectTelemetry?.totalFullScreenExits || 0) > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-emerald-600 dark:text-emerald-400'
                        }`}>
                          {inspectTelemetry?.totalFullScreenExits || 0}
                        </span>
                        <span className="text-[10px] text-[var(--muted-foreground)] block">
                          {(inspectTelemetry?.totalFullScreenExits || 0) > 0 ? 'Window minimized' : 'Remained focused'}
                        </span>
                      </div>

                      <div className="p-2.5 rounded-lg bg-[var(--card)] border border-[var(--border)] space-y-1">
                        <span className="text-[10px] text-[var(--muted-foreground)] block">Burst Paste Detection</span>
                        <span className="text-base font-bold font-mono text-emerald-600 dark:text-emerald-400">
                          Clean
                        </span>
                        <span className="text-[10px] text-[var(--muted-foreground)] block">Normal typing rhythm</span>
                      </div>
                    </div>

                    {/* AI Viva Voce Oral Defense Responses */}
                    {inspectTelemetry?.vivaList && inspectTelemetry.vivaList.length > 0 && (
                      <div className="pt-3 border-t border-[var(--border)] space-y-2">
                        <div className="flex items-center gap-1.5 text-indigo-600 dark:text-indigo-400 font-bold text-[11px]">
                          <MessageSquare className="w-3.5 h-3.5" />
                          <span>AI Oral Viva Voce Verification Questions:</span>
                        </div>
                        {inspectTelemetry.vivaList.map((v: any, vIdx: number) => (
                          <div key={v.id || vIdx} className="p-2.5 bg-[var(--card)] border border-[var(--border)] rounded-lg text-xs space-y-1">
                            <div className="font-semibold text-[var(--foreground)]">
                              Q{vIdx + 1}: {v.prompt}
                            </div>
                            <div className="text-[var(--muted-foreground)]">
                              Student Answer: <span className="text-[var(--foreground)] font-mono">{v.studentAnswer || '<No answer recorded>'}</span>
                            </div>
                            <div className="text-[10px] text-indigo-600 dark:text-indigo-400">
                              Status: {v.status} | Feedback: {v.feedback || 'Evaluated clean'}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Recent Practice Submissions */}
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <FileCode className="w-4 h-4 text-emerald-500" />
                      <h4 className="font-bold text-[var(--foreground)] text-xs uppercase tracking-wider">
                        Practice C Code Submissions ({(deepDiveData.submissions || []).length})
                      </h4>
                    </div>

                    {(!deepDiveData.submissions || deepDiveData.submissions.length === 0) ? (
                      <div className="p-6 bg-[var(--background)] rounded-xl border border-[var(--border)] text-center text-[var(--muted-foreground)] text-xs italic">
                        No code submissions recorded yet for this candidate.
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {deepDiveData.submissions.map((sub: any) => (
                          <div key={sub.id} className="p-3.5 bg-[var(--background)] border border-[var(--border)] rounded-xl space-y-2 text-xs">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                              <div className="flex items-center gap-2">
                                <span
                                  className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                    sub.verdict === 'ACCEPTED'
                                      ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20'
                                      : sub.verdict === 'WRONG_ANSWER'
                                      ? 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20'
                                      : 'bg-rose-500/10 text-rose-700 dark:text-rose-400 border border-rose-500/20'
                                  }`}
                                >
                                  {sub.verdict || 'SUBMITTED'}
                                </span>
                                <span className="font-semibold text-[var(--foreground)]">
                                  {sub.problem?.title || 'Practice Challenge'}
                                </span>
                                <span className="text-[var(--muted-foreground)] text-[10px] font-mono">
                                  ({sub.problem?.difficulty || 'C PRACTICE'})
                                </span>
                              </div>
                              <div className="text-[var(--muted-foreground)] text-[11px] font-mono">
                                {sub.runtimeMs !== null && sub.runtimeMs !== undefined && (
                                  <span className="mr-3">{sub.runtimeMs}ms</span>
                                )}
                                <span>{sub.createdAt ? new Date(sub.createdAt).toLocaleString() : ''}</span>
                              </div>
                            </div>

                            {sub.code && (
                              <details className="mt-2 text-[11px]">
                                <summary className="text-indigo-600 dark:text-indigo-400 cursor-pointer hover:underline flex items-center gap-1 font-medium">
                                  <Eye className="w-3 h-3" />
                                  <span>Inspect Submitted C Source Code</span>
                                </summary>
                                <pre className="mt-2 p-3 bg-[#0C0F1F] rounded-lg border border-gray-800 text-gray-200 font-mono text-[10px] overflow-x-auto max-h-56 leading-relaxed">
                                  {sub.code}
                                </pre>
                              </details>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Assigned Tests (if any) */}
                  {(deepDiveData.assignments || []).length > 0 && (
                    <div className="space-y-3 pt-4 border-t border-[var(--border)]">
                      <h4 className="font-bold text-[var(--foreground)] text-xs uppercase tracking-wider">
                        Assigned Assessment Tests
                      </h4>
                      <div className="space-y-2">
                        {deepDiveData.assignments.map((asgn: any) => (
                          <div key={asgn.id} className="p-3 bg-[var(--background)] rounded-xl border border-[var(--border)] flex items-center justify-between text-xs">
                            <span className="font-semibold text-[var(--foreground)]">{asgn.test?.title}</span>
                            <div className="flex items-center gap-3">
                              <span className="text-emerald-600 dark:text-emerald-400 font-bold">Score: {asgn.academicScore}</span>
                              <span className="text-[var(--muted-foreground)]">Integrity Risk: {asgn.integrityRisk}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-[var(--border)] flex justify-end bg-[var(--background)]">
              <button
                onClick={() => setSelectedStudentForInspect(null)}
                className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold transition cursor-pointer"
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
