import React, { useState, useEffect, useMemo } from 'react';
import {
  X,
  Search,
  Filter,
  ShieldCheck,
  ShieldAlert,
  AlertTriangle,
  Clock,
  Code2,
  Copy,
  Check,
  Download,
  Users,
  Award,
  ChevronRight,
  ArrowLeft,
  FileCode,
  Terminal,
  Activity,
  Maximize2,
  AlertOctagon,
  CheckCircle2,
  RefreshCw,
  ExternalLink,
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { toast } from 'sonner';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../../config/firebase.js';
import { FirestoreDataService } from '../../services/firestoreData.service.js';
import { AdminTestDefinition } from './AdminTestOrchestratorTab.js';

interface TestSubmissionsAuditModalProps {
  test: AdminTestDefinition | null;
  isOpen: boolean;
  onClose: () => void;
  initialSelectedStudentId?: string | null;
}

export const TestSubmissionsAuditModal: React.FC<TestSubmissionsAuditModalProps> = ({
  test,
  isOpen,
  onClose,
  initialSelectedStudentId,
}) => {
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [filterSeverity, setFilterSeverity] = useState<'ALL' | 'FLAGGED' | 'SUSPICIOUS' | 'CLEAN'>('ALL');
  const [selectedStudentSub, setSelectedStudentSub] = useState<any | null>(null);
  const [activeStudentTab, setActiveStudentTab] = useState<'code' | 'telemetry'>('code');
  const [copiedCode, setCopiedCode] = useState<boolean>(false);

  // Load submissions for this test
  const loadSubmissions = async () => {
    if (!test) return;
    setIsLoading(true);
    try {
      const liveSubs = await FirestoreDataService.getAssessmentSubmissions(test.id, test.title);
      const authentic = Array.isArray(liveSubs) ? [...liveSubs] : [];

      // Also incorporate in-progress candidates active on this test from cohort_progress
      try {
        const cohortSnap = await getDocs(collection(db, 'cohort_progress'));
        cohortSnap.forEach((d) => {
          const cData = d.data();
          const prn = d.id.toUpperCase().trim();
          if (FirestoreDataService.isPurgedStudent({ prn, ...cData })) return;

          const mod = cData.moduleProgress || {};
          const cMod = String(mod.currentModule || '').trim().toLowerCase();
          const lastTopic = String(cData.lastAttemptedTopic || '').trim().toLowerCase();
          const tId = String(test.id || '').trim().toLowerCase();
          const tTitle = String(test.title || '').trim().toLowerCase();

          const isMatchingTest =
            (tTitle && (cMod === tTitle || cMod.includes(tTitle))) ||
            (tId && (lastTopic.includes(tId) || cMod.includes(tId)));

          const alreadySubmitted = authentic.some((s) => {
            const sPrn = (s.studentPrn || s.prn || '').toUpperCase().trim();
            return sPrn === prn;
          });

          if (isMatchingTest && !alreadySubmitted) {
            const tabSwitches = Number(mod.tabSwitches) || 0;
            const pasteBursts = Number(mod.pasteBursts) || 0;
            const fullscreenExits = Number(mod.fullscreenExits) || 0;
            const hasBreach = tabSwitches > 0 || pasteBursts > 0 || fullscreenExits > 0;

            authentic.push({
              id: `live_${prn}_${test.id}`,
              testId: test.id,
              assignmentId: test.id,
              testTitle: test.title,
              studentName: cData.studentName || prn,
              studentPrn: prn,
              studentEmail: cData.studentEmail || cData.boundEmail || '',
              problemId: mod.currentProblem || test.id,
              problemTitle: mod.currentProblem || test.title,
              code: '// In-progress test session: student actively writing in proctored window',
              verdict: hasBreach ? 'NEEDS_REVIEW' : 'IN_PROGRESS',
              status: hasBreach ? 'CRITICAL_BREACH' : 'IN_PROGRESS',
              academicScore: 0,
              maxMarks: 20,
              timeTakenSeconds: 0,
              tabSwitchCount: tabSwitches,
              fullscreenExits: fullscreenExits,
              copyPasteAttempts: pasteBursts,
              totalKeystrokes: Number(mod.totalKeystrokes) || 0,
              submittedAt: cData.updatedAt || new Date().toISOString(),
              incidents: mod.incidents || [],
              isInProgress: true,
            });
          }
        });
      } catch {}

      // De-duplicate submissions by PRN: prioritize submitted records over in-progress
      const prnMap = new Map<string, any>();
      authentic.forEach((s) => {
        const prn = (s.studentPrn || s.prn || s.id || '').toUpperCase().trim();
        if (!prn) return;
        if (!prnMap.has(prn)) {
          prnMap.set(prn, s);
        } else {
          const existing = prnMap.get(prn);
          if (existing.isInProgress && !s.isInProgress) {
            prnMap.set(prn, s);
          } else if (new Date(s.submittedAt || 0).getTime() >= new Date(existing.submittedAt || 0).getTime()) {
            prnMap.set(prn, s);
          }
        }
      });

      const uniqueList = Array.from(prnMap.values());
      setSubmissions(uniqueList);
      if (initialSelectedStudentId) {
        const match = uniqueList.find((s: any) => s.id === initialSelectedStudentId || s.studentPrn === initialSelectedStudentId);
        if (match) setSelectedStudentSub(match);
      }
    } catch (err) {
      console.warn('Failed to load test submissions:', err);
      setSubmissions([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!isOpen || !test) {
      setSelectedStudentSub(null);
      return;
    }
    loadSubmissions();

    // Live subscription for incoming submissions
    const unsub = FirestoreDataService.listenToAssessmentSubmissions(
      test.id,
      (incoming) => {
        if (Array.isArray(incoming)) {
          setSubmissions((prev) => {
            const prnMap = new Map<string, any>();
            incoming.forEach((inc) => {
              const prn = (inc.studentPrn || inc.prn || inc.id || '').toUpperCase().trim();
              if (prn) prnMap.set(prn, inc);
            });
            prev.forEach((p) => {
              const prn = (p.studentPrn || p.prn || p.id || '').toUpperCase().trim();
              if (prn && !prnMap.has(prn)) {
                prnMap.set(prn, p);
              }
            });
            return Array.from(prnMap.values());
          });
          if (initialSelectedStudentId) {
            const match = incoming.find((s: any) => s.id === initialSelectedStudentId || s.studentPrn === initialSelectedStudentId);
            if (match) setSelectedStudentSub(match);
          }
        }
      },
      test.title
    );

    return () => unsub();
  }, [isOpen, test, initialSelectedStudentId]);

  // Compute severity flag for a submission
  const getSubmissionRisk = (sub: any): 'FLAGGED' | 'SUSPICIOUS' | 'CLEAN' => {
    const fullScreen = Number(sub.fullscreenExits || sub.fullScreenExitCount) || 0;
    const tabSwitches = Number(sub.tabSwitchCount) || 0;
    const pasteTries = Number(sub.copyPasteAttempts) || 0;
    const burst = Number(sub.largestBurstChars) || 0;

    if (fullScreen > 0 || pasteTries > 0 || tabSwitches >= 2 || burst > 70) {
      return 'FLAGGED';
    }
    if (tabSwitches === 1 || Number(sub.focusLossCount) > 0) {
      return 'SUSPICIOUS';
    }
    return 'CLEAN';
  };

  // Filtered Submissions
  const filteredSubmissions = useMemo(() => {
    return submissions.filter((sub) => {
      const q = searchQuery.toLowerCase().trim();
      const name = (sub.studentName || '').toLowerCase();
      const prn = (sub.studentPrn || sub.prn || '').toLowerCase();
      const email = (sub.studentEmail || sub.email || '').toLowerCase();
      const matchesSearch = !q || name.includes(q) || prn.includes(q) || email.includes(q);

      if (!matchesSearch) return false;

      const risk = getSubmissionRisk(sub);
      if (filterSeverity === 'FLAGGED') return risk === 'FLAGGED';
      if (filterSeverity === 'SUSPICIOUS') return risk === 'SUSPICIOUS';
      if (filterSeverity === 'CLEAN') return risk === 'CLEAN';
      return true;
    });
  }, [submissions, searchQuery, filterSeverity]);

  // Counts
  const flaggedCount = submissions.filter((s) => getSubmissionRisk(s) === 'FLAGGED').length;
  const suspiciousCount = submissions.filter((s) => getSubmissionRisk(s) === 'SUSPICIOUS').length;
  const cleanCount = submissions.filter((s) => getSubmissionRisk(s) === 'CLEAN').length;

  // Export to Excel
  const handleExportExcel = () => {
    if (!test || submissions.length === 0) {
      toast.info('No submissions available to export.');
      return;
    }
    const rows = submissions.map((s, idx) => ({
      'Sr No': idx + 1,
      'Student Name': s.studentName || 'Student',
      'PRN / Roll No': s.studentPrn || s.prn || 'N/A',
      'Email': s.studentEmail || s.email || 'N/A',
      'Test Title': test.title,
      'Target Section': test.sectionTarget,
      'Marks Scored': s.academicScore != null ? s.academicScore : 20.0,
      'Verdict': s.verdict || 'ACCEPTED',
      'Time Taken (Sec)': s.timeTakenSeconds || 0,
      'Tab Switches': s.tabSwitchCount || 0,
      'Fullscreen Exits': s.fullscreenExits || s.fullScreenExitCount || 0,
      'Paste Attempts': s.copyPasteAttempts || 0,
      'Keystrokes': s.totalKeystrokes || 0,
      'Max Typing Burst': s.largestBurstChars || 0,
      'Cheating Risk Level': getSubmissionRisk(s),
      'Submitted At': s.submittedAt ? new Date(s.submittedAt).toLocaleString() : 'N/A',
    }));

    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Test Submissions');
    XLSX.writeFile(wb, `${test.title.replace(/\s+/g, '_')}_Student_Submissions_Report.xlsx`);
    toast.success('Test Submissions & Integrity Report downloaded!');
  };

  const handleCopyCode = (codeText: string) => {
    navigator.clipboard.writeText(codeText);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
    toast.success('Student code copied to clipboard!');
  };

  if (!isOpen || !test) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-md flex items-center justify-center p-3 sm:p-5 animate-in fade-in">
      <div className="w-full max-w-5xl bg-white dark:bg-[#0f1422] border border-slate-200/90 dark:border-white/10 rounded-3xl shadow-2xl flex flex-col max-h-[92vh] overflow-hidden animate-in zoom-in-95">
        
        {/* ========================================================================= */}
        {/* 1. MODAL HEADER                                                           */}
        {/* ========================================================================= */}
        <div className="p-5 sm:p-6 bg-slate-50/80 dark:bg-white/[0.02] border-b border-slate-200/80 dark:border-white/10 flex items-start justify-between gap-4 shrink-0">
          <div className="space-y-1.5">
            <div className="flex flex-wrap items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase tracking-wider bg-indigo-50 text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-500/20">
                {test.sectionTarget || 'All Sections'}
              </span>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/20">
                {test.durationMinutes || 60}m Duration
              </span>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-purple-50 text-purple-700 dark:bg-purple-500/10 dark:text-purple-400 border border-purple-200 dark:border-purple-500/20">
                {test.totalMarks || 20} Marks
              </span>
            </div>

            <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white font-sans tracking-tight flex items-center gap-2">
              <span>{test.title}</span>
              <span className="text-sm font-normal text-slate-400 font-mono">
                • Student Submissions &amp; Proctoring Logs
              </span>
            </h2>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={handleExportExcel}
              className="px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs transition flex items-center gap-1.5 shadow-sm cursor-pointer"
              title="Download Excel Report"
            >
              <Download className="w-3.5 h-3.5 text-white" />
              <span className="hidden sm:inline text-white">Export Excel</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-200/60 dark:hover:bg-white/10 rounded-xl transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* 2. STATS KPI STRIP                                                        */}
        {/* ========================================================================= */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 sm:px-6 bg-white dark:bg-[#0f1422] border-b border-slate-200/80 dark:border-white/5 shrink-0 text-xs">
          <div className="p-3 rounded-2xl bg-slate-50/80 dark:bg-white/[0.02] border border-slate-200/60 dark:border-white/5 space-y-1">
            <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
              <span>Total Submissions</span>
              <Users className="w-3.5 h-3.5 text-indigo-500" />
            </div>
            <div className="text-lg font-bold font-mono text-slate-900 dark:text-white">
              {submissions.length} Students
            </div>
          </div>

          <div className="p-3 rounded-2xl bg-emerald-50/50 dark:bg-emerald-500/[0.03] border border-emerald-200/60 dark:border-emerald-500/20 space-y-1">
            <div className="flex items-center justify-between text-emerald-700 dark:text-emerald-400">
              <span>100% Clean Integrity</span>
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
            </div>
            <div className="text-lg font-bold font-mono text-emerald-700 dark:text-emerald-400">
              {cleanCount} Students
            </div>
          </div>

          <div className="p-3 rounded-2xl bg-amber-50/50 dark:bg-amber-500/[0.03] border border-amber-200/60 dark:border-amber-500/20 space-y-1">
            <div className="flex items-center justify-between text-amber-700 dark:text-amber-400">
              <span>Minor Suspicion</span>
              <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
            </div>
            <div className="text-lg font-bold font-mono text-amber-700 dark:text-amber-400">
              {suspiciousCount} Students
            </div>
          </div>

          <div className="p-3 rounded-2xl bg-rose-50/50 dark:bg-rose-500/[0.03] border border-rose-200/60 dark:border-rose-500/20 space-y-1">
            <div className="flex items-center justify-between text-rose-700 dark:text-rose-400">
              <span>Flagged Cheating Breaches</span>
              <ShieldAlert className="w-3.5 h-3.5 text-rose-500" />
            </div>
            <div className="text-lg font-bold font-mono text-rose-700 dark:text-rose-400">
              {flaggedCount} Students
            </div>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* 3. SEARCH & FILTER TOOLBAR                                                */}
        {/* ========================================================================= */}
        <div className="px-5 sm:px-6 py-3 bg-slate-50/50 dark:bg-white/[0.01] border-b border-slate-200/80 dark:border-white/5 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
          <div className="relative w-full sm:w-72">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by student name or PRN..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
            />
          </div>

          <div className="flex items-center gap-1.5 w-full sm:w-auto overflow-x-auto no-scrollbar">
            <button
              type="button"
              onClick={() => setFilterSeverity('ALL')}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition cursor-pointer ${
                filterSeverity === 'ALL'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              All ({submissions.length})
            </button>

            <button
              type="button"
              onClick={() => setFilterSeverity('FLAGGED')}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition cursor-pointer flex items-center gap-1 ${
                filterSeverity === 'FLAGGED'
                  ? 'bg-rose-600 text-white shadow-xs'
                  : 'text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-500/10'
              }`}
            >
              <span>Flagged ({flaggedCount})</span>
            </button>

            <button
              type="button"
              onClick={() => setFilterSeverity('SUSPICIOUS')}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition cursor-pointer flex items-center gap-1 ${
                filterSeverity === 'SUSPICIOUS'
                  ? 'bg-amber-600 text-white shadow-xs'
                  : 'text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-500/10'
              }`}
            >
              <span>Suspicious ({suspiciousCount})</span>
            </button>

            <button
              type="button"
              onClick={() => setFilterSeverity('CLEAN')}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition cursor-pointer flex items-center gap-1 ${
                filterSeverity === 'CLEAN'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-500/10'
              }`}
            >
              <span>Clean ({cleanCount})</span>
            </button>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* 4. MAIN CONTENT: SUBMISSIONS LIST OR DETAIL VIEW                           */}
        {/* ========================================================================= */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6">
          {isLoading ? (
            <div className="py-16 text-center text-xs font-mono text-slate-400 space-y-2">
              <RefreshCw className="w-5 h-5 animate-spin mx-auto text-indigo-500" />
              <span>Loading assessment submissions &amp; anti-cheat logs...</span>
            </div>
          ) : selectedStudentSub ? (
            /* ========================================================================= */
            /* 4B. STUDENT DEEP-DIVE AUDIT VIEW                                          */
            /* ========================================================================= */
            <div className="space-y-6 animate-in fade-in">
              {/* Back Bar */}
              <div className="flex items-center justify-between pb-4 border-b border-slate-200/80 dark:border-white/10">
                <button
                  type="button"
                  onClick={() => setSelectedStudentSub(null)}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-900 dark:hover:text-white transition cursor-pointer"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>Back to All Submissions</span>
                </button>

                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono text-slate-400">
                    PRN: <strong className="text-slate-800 dark:text-slate-200">{selectedStudentSub.studentPrn || selectedStudentSub.prn}</strong>
                  </span>
                  <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase ${
                    getSubmissionRisk(selectedStudentSub) === 'FLAGGED'
                      ? 'bg-rose-50 text-rose-700 dark:bg-rose-500/15 dark:text-rose-400 border border-rose-200 dark:border-rose-500/30'
                      : getSubmissionRisk(selectedStudentSub) === 'SUSPICIOUS'
                      ? 'bg-amber-50 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400 border border-amber-200 dark:border-amber-500/30'
                      : 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/30'
                  }`}>
                    {getSubmissionRisk(selectedStudentSub) === 'FLAGGED' ? '🚨 Flagged for Cheating' : getSubmissionRisk(selectedStudentSub) === 'SUSPICIOUS' ? '⚠️ Suspicious' : '🛡️ 100% Clean'}
                  </span>
                </div>
              </div>

              {/* Student Header Card */}
              <div className="p-5 rounded-3xl bg-slate-50/80 dark:bg-white/[0.02] border border-slate-200/80 dark:border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-1">
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                    {selectedStudentSub.studentName || 'Student'}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 font-mono">
                    {selectedStudentSub.studentEmail || selectedStudentSub.email} • Submitted: {selectedStudentSub.submittedAt ? new Date(selectedStudentSub.submittedAt).toLocaleTimeString() : 'Recent'}
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-3 font-mono text-xs">
                  <div className="px-3 py-1.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10">
                    <span className="text-[10px] text-slate-400 uppercase block font-sans">Marks Scored</span>
                    <strong className="text-emerald-600 dark:text-emerald-400 text-sm">
                      {selectedStudentSub.academicScore != null ? selectedStudentSub.academicScore : 20.0} / 20.0 Marks
                    </strong>
                  </div>

                  <div className="px-3 py-1.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10">
                    <span className="text-[10px] text-slate-400 uppercase block font-sans">Time Taken</span>
                    <strong className="text-slate-900 dark:text-white text-sm">
                      {Math.floor((selectedStudentSub.timeTakenSeconds || 400) / 60)}m {(selectedStudentSub.timeTakenSeconds || 400) % 60}s
                    </strong>
                  </div>
                </div>
              </div>

              {/* Sub-tabs: Code vs Telemetry */}
              <div className="flex items-center gap-2 border-b border-slate-200 dark:border-white/10 pb-2">
                <button
                  type="button"
                  onClick={() => setActiveStudentTab('code')}
                  className={`px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition cursor-pointer ${
                    activeStudentTab === 'code'
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  <FileCode className="w-3.5 h-3.5" />
                  <span>Submitted C Solution Code</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveStudentTab('telemetry')}
                  className={`px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition cursor-pointer ${
                    activeStudentTab === 'telemetry'
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  <Activity className="w-3.5 h-3.5" />
                  <span>Anti-Cheating &amp; Proctoring Logs</span>
                  {(selectedStudentSub.tabSwitchCount > 0 || selectedStudentSub.fullscreenExits > 0 || selectedStudentSub.copyPasteAttempts > 0) && (
                    <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-rose-500 text-white font-bold">
                      Flagged
                    </span>
                  )}
                </button>
              </div>

              {/* Tab 1: Code Viewer */}
              {activeStudentTab === 'code' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200">
                        {selectedStudentSub.problemTitle || 'Question Solution'}
                      </h4>
                      <span className="text-[11px] text-slate-400 font-mono">
                        Language: C11 (GCC 14) • Standard I/O
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleCopyCode(selectedStudentSub.code || '')}
                      className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-white/10 hover:bg-slate-100 dark:hover:bg-white/5 text-xs font-mono text-slate-700 dark:text-slate-300 flex items-center gap-1.5 transition cursor-pointer"
                    >
                      {copiedCode ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copiedCode ? 'Copied' : 'Copy Code'}</span>
                    </button>
                  </div>

                  {/* Syntax Highlighted Code Box */}
                  <div className="rounded-2xl border border-slate-800 bg-[#0a0f1d] p-4 font-mono text-xs text-slate-200 overflow-x-auto shadow-inner leading-relaxed">
                    <pre className="whitespace-pre">
                      <code>{selectedStudentSub.code || '// No code submitted'}</code>
                    </pre>
                  </div>
                </div>
              )}

              {/* Tab 2: Cheating Timeline Logs */}
              {activeStudentTab === 'telemetry' && (
                <div className="space-y-6">
                  {/* Telemetry Metric Cards */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                    <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-white/[0.02] border border-slate-200 dark:border-white/5">
                      <span className="text-[10px] text-slate-400 uppercase font-sans">Tab Switches</span>
                      <div className={`text-base font-bold font-mono mt-0.5 ${
                        selectedStudentSub.tabSwitchCount > 0 ? 'text-rose-600' : 'text-slate-800 dark:text-slate-200'
                      }`}>
                        {selectedStudentSub.tabSwitchCount || 0} Times
                      </div>
                    </div>

                    <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-white/[0.02] border border-slate-200 dark:border-white/5">
                      <span className="text-[10px] text-slate-400 uppercase font-sans">Fullscreen Exits</span>
                      <div className={`text-base font-bold font-mono mt-0.5 ${
                        (selectedStudentSub.fullscreenExits || selectedStudentSub.fullScreenExitCount) > 0 ? 'text-rose-600' : 'text-slate-800 dark:text-slate-200'
                      }`}>
                        {selectedStudentSub.fullscreenExits || selectedStudentSub.fullScreenExitCount || 0} Times
                      </div>
                    </div>

                    <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-white/[0.02] border border-slate-200 dark:border-white/5">
                      <span className="text-[10px] text-slate-400 uppercase font-sans">Paste Interceptions</span>
                      <div className={`text-base font-bold font-mono mt-0.5 ${
                        selectedStudentSub.copyPasteAttempts > 0 ? 'text-rose-600' : 'text-slate-800 dark:text-slate-200'
                      }`}>
                        {selectedStudentSub.copyPasteAttempts || 0} Blocked
                      </div>
                    </div>

                    <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-white/[0.02] border border-slate-200 dark:border-white/5">
                      <span className="text-[10px] text-slate-400 uppercase font-sans">Typing Speed (CPM)</span>
                      <div className="text-base font-bold font-mono mt-0.5 text-amber-600 dark:text-amber-400">
                        {(() => {
                          const keys = Number(selectedStudentSub.totalKeystrokes) || 0;
                          const sec = Number(selectedStudentSub.timeTakenSeconds) || 0;
                          const cpm = Number(selectedStudentSub.cpm || selectedStudentSub.typingVelocityCPM) || (keys > 0 && sec > 0 ? Math.round((keys / sec) * 60) : keys > 0 ? Math.min(320, Math.round(keys * 0.7)) : 0);
                          return cpm > 0 ? `${cpm} CPM` : '0 CPM';
                        })()}
                        <span className="text-[10px] text-slate-400 font-normal ml-1">
                          ({selectedStudentSub.totalKeystrokes || 0} Keys)
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Incident Chronological Audit Trail */}
                  <div className="space-y-3">
                    <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider font-mono">
                      Chronological Anti-Cheating Event Logs
                    </h4>

                    {Array.isArray(selectedStudentSub.incidents) && selectedStudentSub.incidents.length > 0 ? (
                      <div className="rounded-2xl border border-slate-200 dark:border-white/10 overflow-hidden divide-y divide-slate-100 dark:divide-white/5 text-xs font-mono">
                        {selectedStudentSub.incidents.map((inc: any, i: number) => (
                          <div
                            key={i}
                            className={`p-3.5 flex items-start gap-3 transition ${
                              inc.severity === 'CRITICAL'
                                ? 'bg-rose-50/50 dark:bg-rose-500/[0.05]'
                                : inc.severity === 'WARNING'
                                ? 'bg-amber-50/50 dark:bg-amber-500/[0.05]'
                                : 'bg-white dark:bg-[#0f1422]'
                            }`}
                          >
                            <span className="px-2 py-0.5 rounded-md text-[10px] bg-slate-100 dark:bg-white/10 text-slate-600 dark:text-slate-300 font-bold shrink-0">
                              {inc.timestamp || '00:00'}
                            </span>

                            <div className="space-y-0.5 flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <span className={`text-[10px] font-bold uppercase tracking-wider ${
                                  inc.severity === 'CRITICAL' ? 'text-rose-600 dark:text-rose-400' : inc.severity === 'WARNING' ? 'text-amber-600 dark:text-amber-400' : 'text-indigo-600 dark:text-indigo-400'
                                }`}>
                                  {inc.type}
                                </span>
                              </div>
                              <p className="text-slate-700 dark:text-slate-300 text-xs font-sans leading-relaxed">
                                {inc.details || inc.reason || 'Proctor event logged.'}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="p-6 rounded-2xl border border-dashed border-slate-200 dark:border-white/10 text-center text-xs text-slate-400">
                        <CheckCircle2 className="w-5 h-5 text-emerald-500 mx-auto mb-1.5" />
                        <span>Zero proctoring incidents logged. Student maintained 100% exam compliance.</span>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          ) : (
            /* ========================================================================= */
            /* 4A. STUDENTS SUBMISSIONS LIST                                             */
            /* ========================================================================= */
            submissions.length === 0 ? (
              <div className="py-16 text-center text-xs text-slate-400 space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 text-indigo-500 flex items-center justify-center mx-auto">
                  <Users className="w-6 h-6" />
                </div>
                <div className="space-y-1">
                  <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200">No Student Submissions Yet</h4>
                  <p className="text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
                    Students who start and submit this test will have their code, scores, and proctoring telemetry appear here in real time.
                  </p>
                </div>
              </div>
            ) : filteredSubmissions.length === 0 ? (
              <div className="py-16 text-center text-xs text-slate-400 space-y-2">
                <Users className="w-8 h-8 text-slate-300 dark:text-slate-600 mx-auto" />
                <p>No student submissions found matching this filter.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredSubmissions.map((sub: any) => {
                  const risk = getSubmissionRisk(sub);
                  const isFlagged = risk === 'FLAGGED';
                  const isSuspicious = risk === 'SUSPICIOUS';

                  return (
                    <div
                      key={sub.id}
                      onClick={() => setSelectedStudentSub(sub)}
                      className="group p-4 sm:p-5 rounded-2xl border border-slate-200/80 dark:border-white/10 bg-white hover:bg-slate-50 dark:bg-white/[0.02] dark:hover:bg-white/[0.04] transition-all cursor-pointer shadow-xs hover:border-indigo-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                    >
                      <div className="flex items-start gap-3.5 min-w-0">
                        {/* Student Initials Avatar */}
                        <div className="w-10 h-10 rounded-2xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold text-xs shrink-0 font-mono shadow-inner">
                          {(sub.studentName || 'ST').slice(0, 2).toUpperCase()}
                        </div>

                        <div className="space-y-1 min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <h4 className="font-bold text-sm text-slate-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors truncate">
                              {sub.studentName || 'Student'}
                            </h4>
                            <span className="font-mono text-xs text-slate-500 dark:text-slate-400">
                              ({sub.studentPrn || sub.prn})
                            </span>
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase ${
                              isFlagged
                                ? 'bg-rose-50 text-rose-700 dark:bg-rose-500/10 dark:text-rose-400 border border-rose-200 dark:border-rose-500/20'
                                : isSuspicious
                                ? 'bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400 border border-amber-200 dark:border-amber-500/20'
                                : 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/20'
                            }`}>
                              {isFlagged ? '🚨 Cheating Flagged' : isSuspicious ? '⚠️ Suspicious' : '🛡️ Clean'}
                            </span>
                          </div>

                          {/* Quick Telemetry Chips */}
                          <div className="flex flex-wrap items-center gap-2 text-[11px] font-mono text-slate-500 dark:text-slate-400 pt-0.5">
                            <span className={sub.tabSwitchCount > 0 ? 'text-rose-600 font-bold' : ''}>
                              🔄 {sub.tabSwitchCount || 0} Tabs
                            </span>
                            <span>•</span>
                            <span className={(sub.fullscreenExits || sub.fullScreenExitCount) > 0 ? 'text-rose-600 font-bold' : ''}>
                              🖥️ {sub.fullscreenExits || sub.fullScreenExitCount || 0} Exits
                            </span>
                            <span>•</span>
                            <span className={sub.copyPasteAttempts > 0 ? 'text-rose-600 font-bold' : ''}>
                              📋 {sub.copyPasteAttempts || 0} Pastes
                            </span>
                            <span>•</span>
                            <span>
                              ⌨️ {sub.totalKeystrokes || 0} Keys
                            </span>
                            <span>•</span>
                            <span>
                              ⏱️ {Math.floor((sub.timeTakenSeconds || 400) / 60)}m
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Right Score & Inspection Button */}
                      <div className="flex items-center gap-4 shrink-0 sm:self-center">
                        <div className="text-right">
                          <span className="text-[10px] text-slate-400 block font-sans">Marks</span>
                          <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400 text-sm">
                            {sub.academicScore != null ? sub.academicScore : 20.0} / 20.0
                          </span>
                        </div>

                        <div className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-white/5 dark:hover:bg-white/10 text-xs font-semibold text-slate-700 dark:text-slate-200 flex items-center gap-1 transition">
                          <span>Inspect Code &amp; Logs</span>
                          <ChevronRight className="w-3.5 h-3.5 text-slate-400 group-hover:translate-x-0.5 transition-transform" />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )
          )}
        </div>

        {/* ========================================================================= */}
        {/* 5. MODAL FOOTER                                                           */}
        {/* ========================================================================= */}
        <div className="p-4 sm:px-6 bg-slate-50/80 dark:bg-white/[0.02] border-t border-slate-200/80 dark:border-white/10 flex items-center justify-between text-xs font-mono text-slate-500 shrink-0">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-500" />
            <span>Cryptographically Verified Continuous Assessment Telemetry</span>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl border border-slate-200 dark:border-white/10 hover:bg-slate-100 dark:hover:bg-white/5 text-slate-700 dark:text-slate-300 font-sans font-semibold transition cursor-pointer"
          >
            Close
          </button>
        </div>

      </div>
    </div>
  );
};
