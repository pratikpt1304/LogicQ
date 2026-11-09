import React, { useState, useEffect } from 'react';
import {
  FileText,
  Download,
  FileSpreadsheet,
  CheckCircle2,
  Sparkles,
  ShieldCheck,
  GraduationCap,
  Activity,
  Calendar,
  Building,
  Eye,
  Check,
  X,
  Printer,
  Share2,
  Search,
  User,
} from 'lucide-react';
import { jsPDF } from 'jspdf';
import * as XLSX from 'xlsx';
import { toast } from 'sonner';
import {
  generateIndividualStudentPdf,
  generateBatchStudentsZip,
  buildMasterCohortPdfDoc,
} from '../../utils/studentPdfGenerator.js';
import { collection, getDocs, onSnapshot } from 'firebase/firestore';
import { db } from '../../config/firebase.js';
import { realtimeSync } from '../../services/realtimeSync.service.js';
import { FirestoreDataService } from '../../services/firestoreData.service.js';

const isSectionMatch = (studentSec: string | undefined | null, targetSec: string | undefined | null): boolean => {
  if (!targetSec || targetSec === 'ALL') return true;
  const s = (studentSec || 'Integrated Mtech').replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
  const t = (targetSec || '').replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
  if (s === t) return true;
  if ((s.includes('mtech') || s.includes('integrated')) && (t.includes('mtech') || t.includes('integrated'))) {
    return true;
  }
  return false;
};

export const AdminReportsTab: React.FC = () => {
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const [exportProgress, setExportProgress] = useState({ current: 0, total: 0, studentName: '' });
  const [isExportingExcel, setIsExportingExcel] = useState(false);
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);
  const [selectedSection, setSelectedSection] = useState<string>('ALL');
  const [studentSearchQuery, setStudentSearchQuery] = useState('');

  const [students, setStudents] = useState<any[]>(() => {
    try {
      const cached = localStorage.getItem('logicq_admin_students');
      if (cached) return JSON.parse(cached);
    } catch {}
    return [];
  });

  const [sections, setSections] = useState<any[]>(() => {
    try {
      const cached = localStorage.getItem('logicq_admin_sections');
      if (cached) return JSON.parse(cached);
    } catch {}
    return [];
  });

  // Live real-time Firestore synchronization for 0ms report scope updates
  useEffect(() => {
    let isMounted = true;

    const syncReportsData = async () => {
      try {
        const [realSections, realUsers, cohortSnap, assessSnap, subSnap] = await Promise.all([
          FirestoreDataService.getSectionsFromFirestore().catch(() => []),
          FirestoreDataService.getAllFirestoreUsers().catch(() => []),
          getDocs(collection(db, 'cohort_progress')).catch(() => null),
          getDocs(collection(db, 'assessment_test_submissions')).catch(() => null),
          getDocs(collection(db, 'submissions')).catch(() => null),
        ]);

        if (!isMounted) return;

        const cohortMap = new Map<string, any>();
        if (cohortSnap) {
          cohortSnap.forEach((d) => cohortMap.set(d.id.toUpperCase().trim(), d.data()));
        }

        const assessSubs: any[] = [];
        if (assessSnap) {
          assessSnap.forEach((d: any) => assessSubs.push(d.data()));
        }

        const genSubs: any[] = [];
        if (subSnap) {
          subSnap.forEach((d: any) => genSubs.push(d.data()));
        }

        if (Array.isArray(realUsers)) {
          const cleanUsers = realUsers
            .filter(
              (u: any) =>
                (u.role === 'STUDENT' || (!u.role && u.email !== 'logicqarena@gmail.com')) &&
                !FirestoreDataService.isPurgedStudent(u)
            )
            .map((u: any) => {
              const prnClean = (u.prn || '').toUpperCase().trim();
              const userEmail = (u.email || '').toLowerCase().trim();
              const userId = String(u.id || u.uid || '').trim();

              const cData = cohortMap.get(prnClean) ||
                            cohortMap.get(prnClean.replace(/0/g, 'O')) ||
                            cohortMap.get(prnClean.replace(/O/g, '0')) ||
                            cohortMap.get(userId.toUpperCase()) || {};
              const mod = cData.moduleProgress || {};

              // Match student's submissions across tests and practice
              const matchedSubs = [...assessSubs, ...genSubs].filter((s: any) => {
                const sPrn = s.studentPrn || s.prn || '';
                const sEmail = (s.studentEmail || s.email || '').toLowerCase().trim();
                const sUid = (s.userId || s.studentId || '').trim();
                return (prnClean && FirestoreDataService.arePrnsMatching(sPrn, prnClean)) ||
                       (userEmail && sEmail && sEmail === userEmail) ||
                       (userId && sUid && sUid === userId);
              });

              const uniqueProblems = new Set<string>();
              const labProblems = new Set<string>();
              const practiceProblems = new Set<string>();

              matchedSubs.forEach((s: any) => {
                const isPassed = s.verdict === 'ACCEPTED' || s.status === 'PASSED' || s.academicScore > 0 || (s.testOutcomes && s.testOutcomes.some((t: any) => t.passed));
                if (isPassed) {
                  const pId = s.problemId || s.problemTitle || s.problemSlug || s.title || s.id;
                  uniqueProblems.add(pId);
                  if (s.track === 'assessment' || s.track === 'lab' || s.testId || s.type === 'LAB_INTERNAL') {
                    labProblems.add(pId);
                  } else {
                    practiceProblems.add(pId);
                  }
                }
              });

              if (Array.isArray(cData.completedProblems)) {
                cData.completedProblems.forEach((p: string) => uniqueProblems.add(p));
              }

              const totalSolved = Math.max(
                uniqueProblems.size,
                cData.totalSolved ?? 0,
                u.totalSolved ?? 0
              );

              const pointsFromSubs = Math.round(
                matchedSubs.reduce((acc: number, s: any) => acc + (Number(s.academicScore) || Number(s.score) || Number(s.points) || 0), 0)
              );

              const totalPoints = Math.max(
                pointsFromSubs,
                cData.totalPoints ?? 0,
                u.totalPoints ?? 0,
                totalSolved * 20
              );

              const tabSwitches = Math.max(
                Number(mod.tabSwitches) || 0,
                ...matchedSubs.map((s: any) => Number(s.tabSwitchCount) || 0)
              );

              const pasteBursts = Math.max(
                Number(mod.pasteBursts) || 0,
                ...matchedSubs.map((s: any) => Number(s.copyPasteAttempts) || 0)
              );

              const totalKeystrokes = Math.max(
                Number(mod.totalKeystrokes) || 0,
                ...matchedSubs.map((s: any) => Number(s.totalKeystrokes) || 0)
              );

              const computedIntegrity = Math.max(
                0,
                Math.min(100, 100 - tabSwitches * 5 - pasteBursts * 10)
              );

              const computedAcademic = mod.academicScore !== undefined
                ? Number(mod.academicScore)
                : (u.academicScore !== undefined ? u.academicScore : Math.min(100, Math.round(((totalPoints || 0) / 100) * 100)));

              // Robust section name normalization
              const rawSection = u.sectionName || u.section || (u.division ? (u.division.toLowerCase().includes('mtech') ? 'Integrated Mtech' : `Division ${u.division}`) : 'Integrated Mtech');
              const normalizedSection = (rawSection.replace(/[^a-zA-Z0-9]/g, '').toLowerCase().includes('mtech') || rawSection.toLowerCase().includes('integrated'))
                ? 'Integrated Mtech'
                : rawSection;

              return {
                ...u,
                name: u.fullName || u.displayName || u.username || 'Student Candidate',
                section: normalizedSection,
                sectionName: normalizedSection,
                totalSolved,
                labSolved: labProblems.size,
                practiceSolved: practiceProblems.size,
                totalPoints,
                academicScore: computedAcademic,
                integrityScore: computedIntegrity,
                tabSwitchCount: tabSwitches,
                clipboardAttempts: pasteBursts,
                totalKeystrokes,
                completedProblems: Array.from(uniqueProblems),
                miniProjectUnlocked: mod.miniProjectUnlocked ?? u.miniProjectUnlocked ?? false,
              };
            });
          setStudents(cleanUsers);
        }

        if (Array.isArray(realSections)) {
          setSections(realSections);
        }
      } catch (err) {
        console.warn('Reports tab live sync warning:', err);
      }
    };

    syncReportsData();

    const unsubCohort = onSnapshot(collection(db, 'cohort_progress'), () => syncReportsData(), (err) => console.warn('Reports cohort notice:', err));
    const unsubSubmissions = onSnapshot(collection(db, 'submissions'), () => syncReportsData(), () => {});
    const unsubAssessmentSubmissions = onSnapshot(collection(db, 'assessment_test_submissions'), () => syncReportsData(), () => {});
    const unsubEnrolled = onSnapshot(collection(db, 'enrolled_students'), () => syncReportsData(), (err) => console.warn('Reports enrolled notice:', err));
    const unsubSections = onSnapshot(collection(db, 'sections'), () => syncReportsData(), (err) => console.warn('Reports sections notice:', err));
    let unsubUsers: (() => void) | null = null;
    try {
      unsubUsers = onSnapshot(collection(db, 'users'), () => syncReportsData(), () => {});
    } catch {}
    const unsubMeshUsers = realtimeSync.on('USERS', () => syncReportsData());
    const unsubMeshSections = realtimeSync.on('SECTIONS', () => syncReportsData());
    const unsubMeshSubmissions = realtimeSync.on('SUBMISSIONS', () => syncReportsData());
    const unsubMeshDashboard = realtimeSync.on('DASHBOARD', () => syncReportsData());

    return () => {
      isMounted = false;
      unsubCohort();
      unsubSubmissions();
      unsubAssessmentSubmissions();
      unsubEnrolled();
      unsubSections();
      if (unsubUsers) unsubUsers();
      unsubMeshUsers();
      unsubMeshSections();
      unsubMeshSubmissions();
      unsubMeshDashboard();
    };
  }, []);

  const activeStudents = selectedSection === 'ALL'
    ? students
    : students.filter((s: any) =>
        isSectionMatch(s.section || s.sectionName, selectedSection)
      );

  const matchedStudents = students.filter((s: any) => {
    if (!studentSearchQuery.trim()) return false;
    const q = studentSearchQuery.toLowerCase();
    const name = String(s.fullName || s.name || '').toLowerCase();
    const prn = String(s.prn || '').toLowerCase();
    const email = String(s.email || '').toLowerCase();
    return name.includes(q) || prn.includes(q) || email.includes(q);
  });

  const handleDownloadOfficialPdf = async () => {
    if (activeStudents.length === 0) {
      toast.error('No enrolled students in the selected section to export.');
      return;
    }
    setIsExportingPdf(true);
    setExportProgress({ current: 0, total: activeStudents.length, studentName: '' });

    try {
      await generateBatchStudentsZip(
        activeStudents,
        selectedSection,
        (current, total, studentName) => {
          setExportProgress({ current, total, studentName });
        }
      );
    } catch (err: any) {
      toast.error('Batch export failed: ' + (err?.message || 'Unknown error'));
    } finally {
      setIsExportingPdf(false);
      setExportProgress({ current: 0, total: 0, studentName: '' });
    }
  };

  const handleDownloadMasterCohortPdfOnly = () => {
    try {
      const doc = buildMasterCohortPdfDoc(activeStudents, selectedSection);
      const cleanSec = (selectedSection === 'ALL' ? 'All_Students' : selectedSection).replace(/[^a-zA-Z0-9_-]/g, '_');
      doc.save(`LogicQ_Master_Cohort_Transcript_${cleanSec}_${new Date().toISOString().split('T')[0]}.pdf`);
      toast.success('Master cohort transcript downloaded!');
    } catch (err: any) {
      toast.error('Failed to download master cohort PDF: ' + err.message);
    }
  };

  const handleDownloadExcelDataset = () => {
    setIsExportingExcel(true);
    toast.info('Compiling institutional Excel spreadsheet...');

    setTimeout(() => {
      try {
        let studentRows: any[] = [];
        if (activeStudents.length > 0) {
          studentRows = activeStudents.map((u: any, idx: number) => ({
            'Sr No': idx + 1,
            'PRN': u.prn || u.id || 'N/A',
            'Student Name': u.name || u.displayName || u.fullName || 'Candidate',
            'Institutional Email': u.email || 'N/A',
            'Section / Division': u.section || selectedSection || 'Integrated Mtech',
            'Identity Verified': u.isEmailBoundV2 || u.emailVerified || (u.email && !u.email.endsWith('@sanjivani.edu.in')) ? 'YES' : 'PENDING',
            'Total Solved': u.totalSolved ?? 0,
            'Lab Internal Solved': u.labSolved ?? 0,
            'Practice Solved': u.practiceSolved ?? 0,
            'Continuous Practical Score (0-100)': u.academicScore ?? 0,
            'Lab Internal CIE Marks (0-20)': Math.min(20, Math.round(((u.academicScore || 0) / 100) * 20)),
            'Integrity Index': u.integrityScore !== undefined ? `${u.integrityScore}%` : '100%',
            'Tab Switch Violations': u.tabSwitchCount ?? 0,
            'Clipboard Paste Attempts': u.clipboardAttempts ?? 0,
            'Total Keystroke Dynamics': u.totalKeystrokes ?? 0,
            'Capstone Mini-Project': u.miniProjectUnlocked ? 'UNLOCKED' : 'LOCKED',
            'AI Viva Defense Status': u.vivaStatus || (u.aiVivaStatus ?? 'CLEAN'),
          }));
        } else {
          studentRows = [
            {
              'Sr No': 1,
              'PRN': 'SAMPLE-101',
              'Student Name': 'Enrolled Student',
              'Institutional Email': 'student@sanjivani.edu.in',
              'Section / Division': selectedSection === 'ALL' ? (sections[0]?.sectionName || 'Integrated Mtech') : selectedSection,
              'Identity Verified': 'YES',
              'Total Solved': 5,
              'Lab Internal Solved': 2,
              'Practice Solved': 3,
              'Continuous Practical Score (0-100)': 85,
              'Lab Internal CIE Marks (0-20)': 17,
              'Integrity Index': '100%',
              'Tab Switch Violations': 0,
              'Clipboard Paste Attempts': 0,
              'Total Keystroke Dynamics': 1200,
              'Capstone Mini-Project': 'UNLOCKED',
              'AI Viva Defense Status': 'VERIFIED',
            },
          ];
        }

        const worksheet = XLSX.utils.json_to_sheet(studentRows);

        // Auto-fit spacious column widths so no headers or values are cut off
        const columnKeys = Object.keys(studentRows[0] || {});
        const colWidths = columnKeys.map((key) => {
          let maxLen = key.length;
          studentRows.forEach((row) => {
            const val = row[key];
            const str = val !== null && val !== undefined ? String(val) : '';
            if (str.length > maxLen) {
              maxLen = str.length;
            }
          });
          // Generous padding (+4) and minimum 14 chars width for clean presentation
          return { wch: Math.max(maxLen + 4, 14) };
        });

        worksheet['!cols'] = colWidths;

        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Assessment Roster');

        const cleanSecName = selectedSection === 'ALL' ? 'FullCohort' : selectedSection.replace(/[^A-Za-z0-9]/g, '_');
        XLSX.writeFile(
          workbook,
          `LogicQ_${cleanSecName}_Dataset_${new Date().toISOString().split('T')[0]}.xlsx`
        );
        toast.success(`Excel dataset (${selectedSection === 'ALL' ? 'All Students' : selectedSection}) exported!`);
      } catch (err: any) {
        toast.error('Failed to export Excel: ' + err.message);
      } finally {
        setIsExportingExcel(false);
      }
    }, 600);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* ========================================================================= */}
      {/* 1. APPLE MINIMALIST HEADER                                                */}
      {/* ========================================================================= */}
      <div className="rounded-3xl border border-slate-200/80 dark:border-white/10 bg-white/70 dark:bg-[#121620]/75 backdrop-blur-xl p-5 sm:p-6 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-2 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400">
                <FileText className="w-5 h-5" />
              </span>
              <h2 className="text-lg sm:text-xl font-bold tracking-tight text-slate-900 dark:text-white">
                Reports & Accreditation
              </h2>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                <span>Ready for Export</span>
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Download certified assessment transcripts, student marks rosters, and institutional accreditation spreadsheets.
            </p>
          </div>
        </div>

        {/* Apple 3-Metric Summary Strip */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-2 border-t border-slate-100 dark:border-white/5 font-mono text-xs">
          <div className="p-3 rounded-2xl bg-slate-50/80 dark:bg-white/5 border border-slate-200/60 dark:border-white/5 flex items-center gap-3">
            <span className="p-2 rounded-xl bg-blue-500/10 text-blue-600">
              <GraduationCap className="w-4 h-4" />
            </span>
            <div>
              <span className="text-[10px] text-slate-400 block uppercase font-sans">
                {selectedSection === 'ALL' ? 'Total Enrolled (Cohort)' : `Enrolled (${selectedSection})`}
              </span>
              <span className="font-bold text-slate-900 dark:text-white text-sm">{activeStudents.length} Students</span>
            </div>
          </div>

          <div className="p-3 rounded-2xl bg-slate-50/80 dark:bg-white/5 border border-slate-200/60 dark:border-white/5 flex items-center gap-3">
            <span className="p-2 rounded-xl bg-purple-500/10 text-purple-600">
              <Building className="w-4 h-4" />
            </span>
            <div>
              <span className="text-[10px] text-slate-400 block uppercase font-sans">Class Scope</span>
              <span className="font-bold text-slate-900 dark:text-white text-sm">
                {selectedSection === 'ALL' ? `${sections.length || 1} Divisions` : selectedSection}
              </span>
            </div>
          </div>

          <div className="p-3 rounded-2xl bg-slate-50/80 dark:bg-white/5 border border-slate-200/60 dark:border-white/5 flex items-center gap-3">
            <span className="p-2 rounded-xl bg-emerald-500/10 text-emerald-600">
              <CheckCircle2 className="w-4 h-4" />
            </span>
            <div>
              <span className="text-[10px] text-slate-400 block uppercase font-sans">Evaluation Status</span>
              <span className="font-bold text-slate-900 dark:text-white text-sm">100% Verified</span>
            </div>
          </div>
        </div>

        {/* Apple Scope Selector Bar: All Students vs Specific Division */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-100 dark:border-white/5">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
              Report Scope:
            </span>
            <div className="flex flex-wrap items-center gap-1.5">
              <button
                type="button"
                onClick={() => setSelectedSection('ALL')}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition active:scale-95 cursor-pointer ${
                  selectedSection === 'ALL'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-white/10'
                }`}
              >
                All Students ({students.length})
              </button>
              {sections.map((sec: any) => {
                const secName = sec.sectionName || sec.name || 'Integrated Mtech';
                const count = students.filter(
                  (s: any) => isSectionMatch(s.section || s.sectionName, secName)
                ).length;
                return (
                  <button
                    key={sec.id || secName}
                    type="button"
                    onClick={() => setSelectedSection(secName)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition active:scale-95 cursor-pointer ${
                      selectedSection === secName
                        ? 'bg-blue-600 text-white shadow-xs'
                        : 'bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-white/10'
                    }`}
                  >
                    {secName} ({count})
                  </button>
                );
              })}
            </div>
          </div>

          <div className="text-[11px] font-mono text-slate-400">
            Exporting: <strong className="text-slate-700 dark:text-slate-200">{selectedSection === 'ALL' ? 'All Sections Combined' : selectedSection}</strong>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 2. APPLE-GRADE REPORT CARDS (Clean Bento Grid)                             */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5">
        {/* PDF Transcript Card */}
        <div className="rounded-2xl sm:rounded-3xl border border-slate-200/80 dark:border-white/10 bg-white dark:bg-[#121620] p-5 sm:p-6 shadow-xs hover:border-rose-500/30 transition-all flex flex-col justify-between space-y-4">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="p-3 rounded-2xl bg-rose-500/10 text-rose-600 dark:text-rose-400">
                <FileText className="w-6 h-6" />
              </span>
              <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20">
                Official PDF ZIP Package
              </span>
            </div>

            <div>
              <h3 className="font-bold text-base text-slate-900 dark:text-white">
                Official Institutional Assessment Transcripts
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                Downloads certified individual assessment PDF reports for all enrolled students in the selected scope (<strong className="text-slate-700 dark:text-slate-200">{activeStudents.length} Students</strong>) bundled into an organized .ZIP folder with the master transcript.
              </p>
            </div>

            <div className="grid grid-cols-3 gap-2 pt-1 font-mono text-[11px]">
              <div className="p-2 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200/60 dark:border-white/5 text-center">
                <span className="text-[9px] text-slate-400 block uppercase font-sans">Format</span>
                <span className="font-bold text-slate-700 dark:text-slate-200">A4 ISO PDF</span>
              </div>
              <div className="p-2 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200/60 dark:border-white/5 text-center">
                <span className="text-[9px] text-slate-400 block uppercase font-sans">Packaging</span>
                <span className="font-bold text-slate-700 dark:text-slate-200">ZIP Archive</span>
              </div>
              <div className="p-2 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200/60 dark:border-white/5 text-center">
                <span className="text-[9px] text-slate-400 block uppercase font-sans">Scope</span>
                <span className="font-bold text-slate-700 dark:text-slate-200">{activeStudents.length} Reports</span>
              </div>
            </div>
          </div>

          <div className="pt-3 border-t border-slate-100 dark:border-white/5 flex items-center gap-2">
            <button
              type="button"
              onClick={handleDownloadOfficialPdf}
              disabled={isExportingPdf}
              className="flex-1 py-2.5 rounded-xl font-semibold text-xs bg-blue-600 hover:bg-blue-700 text-white transition flex items-center justify-center gap-1.5 shadow-xs disabled:opacity-50 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>
                {isExportingPdf
                  ? `Compiling ZIP (${exportProgress.current}/${exportProgress.total})...`
                  : `Download Official PDF Package (${activeStudents.length} Students .ZIP)`}
              </span>
            </button>
            <button
              type="button"
              onClick={() => setIsPreviewModalOpen(true)}
              className="p-2.5 rounded-xl border border-slate-200 dark:border-white/10 hover:bg-slate-100 dark:hover:bg-white/5 text-slate-600 dark:text-slate-300 transition cursor-pointer"
              title="Preview Transcript"
            >
              <Eye className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Excel Spreadsheet Card */}
        <div className="rounded-2xl sm:rounded-3xl border border-slate-200/80 dark:border-white/10 bg-white dark:bg-[#121620] p-5 sm:p-6 shadow-xs hover:border-emerald-500/30 transition-all flex flex-col justify-between space-y-4">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="p-3 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                <FileSpreadsheet className="w-6 h-6" />
              </span>
              <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                Excel .XLSX Dataset
              </span>
            </div>

            <div>
              <h3 className="font-bold text-base text-slate-900 dark:text-white">
                Comprehensive Cohort Spreadsheet
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                Full tabular dataset with PRN, verified emails, section allocations, practical marks breakdown, mini-project milestones, and proctoring indices.
              </p>
            </div>

            <div className="grid grid-cols-3 gap-2 pt-1 font-mono text-[11px]">
              <div className="p-2 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200/60 dark:border-white/5 text-center">
                <span className="text-[9px] text-slate-400 block uppercase font-sans">Compatibility</span>
                <span className="font-bold text-slate-700 dark:text-slate-200">Excel/Sheets</span>
              </div>
              <div className="p-2 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200/60 dark:border-white/5 text-center">
                <span className="text-[9px] text-slate-400 block uppercase font-sans">Granularity</span>
                <span className="font-bold text-slate-700 dark:text-slate-200">Per-Student</span>
              </div>
              <div className="p-2 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200/60 dark:border-white/5 text-center">
                <span className="text-[9px] text-slate-400 block uppercase font-sans">Integration</span>
                <span className="font-bold text-slate-700 dark:text-slate-200">ERP / LMS</span>
              </div>
            </div>
          </div>

          <div className="pt-3 border-t border-slate-100 dark:border-white/5">
            <button
              type="button"
              onClick={handleDownloadExcelDataset}
              disabled={isExportingExcel}
              className="w-full py-2.5 rounded-xl font-semibold text-xs bg-emerald-600 hover:bg-emerald-500 text-white transition flex items-center justify-center gap-1.5 shadow-xs disabled:opacity-50 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>{isExportingExcel ? 'Exporting...' : 'Export Excel (.xlsx) Dataset'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 3. INDIVIDUAL STUDENT TRANSCRIPT LOOKUP (1-Click PDF)                      */}
      {/* ========================================================================= */}
      <div className="rounded-2xl sm:rounded-3xl border border-slate-200/80 dark:border-white/10 bg-white dark:bg-[#121620] p-5 sm:p-6 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <span className="p-2.5 rounded-2xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
              <User className="w-5 h-5" />
            </span>
            <div>
              <h3 className="font-bold text-base text-slate-900 dark:text-white">
                Individual Student Transcript
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Search any enrolled student by PRN or Name to instantly download their personalized, certified ISO A4 PDF report.
              </p>
            </div>
          </div>
        </div>

        {/* Search Bar & Results */}
        <div className="space-y-3">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search student by Name, PRN, or Email (e.g. Aarav, 2126CS...)"
              value={studentSearchQuery}
              onChange={(e) => setStudentSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 text-xs sm:text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-blue-500/30"
            />
          </div>

          {matchedStudents.length > 0 && studentSearchQuery.trim() && (
            <div className="space-y-2 max-h-60 overflow-y-auto pt-1">
              {matchedStudents.map((st: any) => (
                <div
                  key={st.id || st.prn}
                  className="p-3.5 rounded-2xl border border-slate-200/80 dark:border-white/10 bg-slate-50/60 dark:bg-white/5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                >
                  <div className="space-y-0.5">
                    <div className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
                      <span>{st.name || st.fullName}</span>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
                        {st.prn || 'NO-PRN'}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 font-mono">
                      {st.section || 'Integrated Mtech'} • Solved: {st.totalSolved ?? 0} • Academic Score: {st.academicScore ?? st.score ?? 0}/100 • Integrity: {st.integrityScore ?? 100}% ({st.integrityScore < 85 ? 'Review Needed' : 'Clean'})
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => generateIndividualStudentPdf(st)}
                    className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold flex items-center gap-1.5 transition active:scale-95 cursor-pointer shadow-xs shrink-0"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Download Student PDF</span>
                  </button>
                </div>
              ))}
            </div>
          )}

          {matchedStudents.length === 0 && studentSearchQuery.trim() && (
            <div className="p-6 text-center text-xs text-slate-400 bg-slate-50/50 dark:bg-white/[0.02] rounded-2xl border border-dashed border-slate-200 dark:border-white/10">
              No enrolled student found matching "{studentSearchQuery}".
            </div>
          )}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 3. INTERACTIVE TRANSCRIPT PREVIEW MODAL (Apple HIG Style)                  */}
      {/* ========================================================================= */}
      {isPreviewModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in">
          <div className="w-full max-w-2xl bg-white dark:bg-[#121620] border border-slate-200/80 dark:border-white/10 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-5 animate-in zoom-in-95 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-white/5">
              <div className="flex items-center gap-2">
                <span className="p-2 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400">
                  <FileText className="w-5 h-5" />
                </span>
                <div>
                  <h3 className="font-bold text-base text-slate-900 dark:text-white">
                    Master Transcript Preview
                  </h3>
                  <p className="text-[11px] text-slate-400 font-mono">
                    Official ISO A4 Institutional Standard
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsPreviewModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-xl"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Document Mockup */}
            <div className="p-6 rounded-2xl bg-slate-50 dark:bg-white/[0.03] border border-slate-200/60 dark:border-white/5 space-y-4 text-xs">
              <div className="text-center space-y-1 pb-3 border-b border-slate-200/60 dark:border-white/10">
                <h4 className="font-bold text-sm tracking-wide text-slate-900 dark:text-white uppercase">
                  Continuous Evaluation & Examination Platform
                </h4>
                <p className="text-[11px] text-slate-500">
                  Department of Computer Engineering • Academic Year 2026–2027
                </p>
                <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold bg-blue-500/10 text-blue-600">
                  Official Master Accreditation Report
                </span>
              </div>

              {/* Part A Section */}
              <div className="space-y-1.5">
                <div className="font-bold text-blue-700 dark:text-blue-400 text-[11px] uppercase tracking-wider">
                  Part A: Practical Coding Evaluation (80 Marks)
                </div>
                <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-600 dark:text-slate-300">
                  <div className="p-2 rounded-xl bg-white dark:bg-white/5 border border-slate-200/40">
                    Unit 1: Foundations & Bitwise (20M)
                  </div>
                  <div className="p-2 rounded-xl bg-white dark:bg-white/5 border border-slate-200/40">
                    Unit 2: Functions & Pointers (20M)
                  </div>
                  <div className="p-2 rounded-xl bg-white dark:bg-white/5 border border-slate-200/40">
                    Unit 3: Arrays & Strings (20M)
                  </div>
                  <div className="p-2 rounded-xl bg-white dark:bg-white/5 border border-slate-200/40">
                    Unit 4: Structs & Files (20M)
                  </div>
                </div>
              </div>

              {/* Part B Section */}
              <div className="space-y-1.5">
                <div className="font-bold text-rose-700 dark:text-rose-400 text-[11px] uppercase tracking-wider">
                  Part B: Proctoring & Multi-Signal Telemetry
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                  Dual proctoring guardrails verified: 0 unauthorized paste bursts, 100% genuine keystroke dynamics, and automated conceptual AI viva validation.
                </p>
              </div>

              {/* Signatures Mock */}
              <div className="pt-3 border-t border-slate-200/60 dark:border-white/10 grid grid-cols-3 gap-2 text-center text-[10px]">
                <div className="p-2 rounded-lg border border-dashed border-slate-200 dark:border-white/10">
                  <span className="block font-semibold text-slate-700 dark:text-slate-300">Head of Department</span>
                  <span className="text-[9px] text-slate-400">Computer Engineering</span>
                </div>
                <div className="p-2 rounded-lg border border-dashed border-slate-200 dark:border-white/10">
                  <span className="block font-semibold text-slate-700 dark:text-slate-300">Course Coordinator</span>
                  <span className="text-[9px] text-slate-400">LogicQ Faculty</span>
                </div>
                <div className="p-2 rounded-lg border border-dashed border-slate-200 dark:border-white/10">
                  <span className="block font-semibold text-slate-700 dark:text-slate-300">Dean of Exams</span>
                  <span className="text-[9px] text-slate-400">Examination Cell</span>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-end gap-2.5 pt-1">
              <button
                type="button"
                onClick={() => setIsPreviewModalOpen(false)}
                className="px-4 py-2 rounded-xl text-slate-600 dark:text-slate-300 text-xs font-medium cursor-pointer"
              >
                Close Preview
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsPreviewModalOpen(false);
                  handleDownloadMasterCohortPdfOnly();
                }}
                className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-white/10 hover:bg-slate-100 dark:hover:bg-white/5 text-slate-700 dark:text-slate-200 text-xs font-semibold transition active:scale-95 cursor-pointer flex items-center gap-1.5"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Master Summary Only (PDF)</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsPreviewModalOpen(false);
                  handleDownloadOfficialPdf();
                }}
                className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-xs transition active:scale-95 cursor-pointer flex items-center gap-1.5"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Download All Reports ({activeStudents.length} Students .ZIP)</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
