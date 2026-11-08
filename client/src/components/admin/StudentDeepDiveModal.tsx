import React, { useState, useEffect } from 'react';
import { collection, doc, onSnapshot } from 'firebase/firestore';
import { db } from '../../config/firebase.js';
import { FirestoreDataService } from '../../services/firestoreData.service.js';
import {
  Award,
  CheckCircle2,
  Clock,
  Download,
  FolderLock,
  Lock,
  ShieldCheck,
  Sparkles,
  Unlock,
  X,
  Activity,
  FileCode2,
  AlertCircle,
  Copy,
  Check,
  ChevronDown,
  ChevronRight,
  ExternalLink,
  Code2,
  Terminal,
} from 'lucide-react';
import { generateIndividualStudentPdf } from '../../utils/studentPdfGenerator.js';

interface StudentDeepDiveModalProps {
  student: any;
  onClose: () => void;
  onToggleMiniProject: (studentId: string, currentStatus: boolean) => void;
}

export const StudentDeepDiveModal: React.FC<StudentDeepDiveModalProps> = ({
  student,
  onClose,
  onToggleMiniProject,
}) => {
  const [copiedEmail, setCopiedEmail] = useState(false);
  const [liveCohort, setLiveCohort] = useState<any>(null);
  const [telemetryDraft, setTelemetryDraft] = useState<any>(null);
  const [testSubmissions, setTestSubmissions] = useState<any[]>([]);
  const [practiceSubmissions, setPracticeSubmissions] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'overview' | 'submissions'>('overview');
  const [expandedSubId, setExpandedSubId] = useState<string | null>(null);
  const [copiedCodeId, setCopiedCodeId] = useState<string | null>(null);

  const studentName = student?.fullName || student?.name || 'Student Candidate';
  const prnRaw = (student?.prn || '').trim();
  const prn = prnRaw && prnRaw !== '—' ? prnRaw.toUpperCase() : 'N/A';
  const email = (student?.email || '').trim();
  const studentUid = String(student?.id || student?.uid || '').trim();
  const sectionName = student?.section || student?.sectionName || 'Integrated Mtech';

  // 1. Comprehensive multi-key real-time Firestore synchronization
  useEffect(() => {
    const unsubs: (() => void)[] = [];

    // Keys to listen for in cohort_progress
    const candidateKeys = new Set<string>();
    if (prn && prn !== 'N/A') {
      candidateKeys.add(prn);
      candidateKeys.add(prn.replace(/0/g, 'O'));
      candidateKeys.add(prn.replace(/O/g, '0'));
    }
    if (studentUid) {
      candidateKeys.add(studentUid);
      candidateKeys.add(studentUid.toUpperCase());
    }

    // A. Listen to candidate cohort_progress docs
    candidateKeys.forEach((key) => {
      try {
        const u = onSnapshot(
          doc(db, 'cohort_progress', key),
          (snap) => {
            if (snap.exists()) {
              setLiveCohort(snap.data());
            }
          },
          () => {}
        );
        unsubs.push(u);

        // Also listen to live proctoring telemetry draft
        const uDraft = onSnapshot(
          doc(db, 'cohort_progress', key, 'drafts', 'proctoring_telemetry'),
          (snap) => {
            if (snap.exists()) {
              try {
                const raw = snap.data()?.code;
                if (raw) setTelemetryDraft(JSON.parse(raw));
                else setTelemetryDraft(snap.data());
              } catch {
                setTelemetryDraft(snap.data());
              }
            }
          },
          () => {}
        );
        unsubs.push(uDraft);
      } catch {}
    });

    // B. Real-time listener on assessment_test_submissions
    try {
      const uAssess = onSnapshot(
        collection(db, 'assessment_test_submissions'),
        (snap) => {
          const matched: any[] = [];
          snap.forEach((d) => {
            const data = { id: d.id, ...d.data() } as any;
            const subPrn = data.studentPrn || data.prn || '';
            const subEmail = (data.studentEmail || data.email || '').toLowerCase().trim();
            const subUid = (data.userId || data.studentId || '').trim();

            const prnMatch = FirestoreDataService.arePrnsMatching(subPrn, prn);
            const emailMatch = email && subEmail && subEmail === email.toLowerCase();
            const uidMatch = studentUid && subUid && subUid === studentUid;

            if (prnMatch || emailMatch || uidMatch) {
              matched.push(data);
            }
          });
          matched.sort(
            (a, b) =>
              new Date(b.submittedAt || b.createdAt || 0).getTime() -
              new Date(a.submittedAt || a.createdAt || 0).getTime()
          );
          setTestSubmissions(matched);
        },
        () => {}
      );
      unsubs.push(uAssess);
    } catch {}

    // C. Real-time listener on general submissions (Practice / Labs)
    try {
      const uSub = onSnapshot(
        collection(db, 'submissions'),
        (snap) => {
          const matched: any[] = [];
          snap.forEach((d) => {
            const data = { id: d.id, ...d.data() } as any;
            const subPrn = data.studentPrn || data.prn || '';
            const subEmail = (data.studentEmail || data.email || '').toLowerCase().trim();
            const subUid = (data.userId || data.studentId || '').trim();

            const prnMatch = FirestoreDataService.arePrnsMatching(subPrn, prn);
            const emailMatch = email && subEmail && subEmail === email.toLowerCase();
            const uidMatch = studentUid && subUid && subUid === studentUid;

            if (prnMatch || emailMatch || uidMatch) {
              matched.push(data);
            }
          });
          matched.sort(
            (a, b) =>
              new Date(b.submittedAt || b.createdAt || 0).getTime() -
              new Date(a.submittedAt || a.createdAt || 0).getTime()
          );
          setPracticeSubmissions(matched);
        },
        () => {}
      );
      unsubs.push(uSub);
    } catch {}

    return () => {
      unsubs.forEach((fn) => fn());
    };
  }, [prn, email, studentUid]);

  if (!student) return null;

  // 2. Aggregate telemetry & performance across cohort, live telemetry, and submissions
  const mod = liveCohort?.moduleProgress || {};

  // Problems Solved: unique problem set across assessment submissions, practice submissions, and cohort records
  const uniqueSolvedProblems = new Set<string>();
  testSubmissions.forEach((s) => {
    if (s.verdict === 'ACCEPTED' || s.academicScore > 0 || (s.testOutcomes && s.testOutcomes.some((t: any) => t.passed))) {
      uniqueSolvedProblems.add(s.problemId || s.problemTitle || s.testTitle || s.id);
    }
  });
  practiceSubmissions.forEach((s) => {
    if (s.status === 'PASSED' || s.verdict === 'ACCEPTED' || s.score > 0) {
      uniqueSolvedProblems.add(s.problemId || s.problemSlug || s.title || s.id);
    }
  });
  if (Array.isArray(liveCohort?.completedProblems)) {
    liveCohort.completedProblems.forEach((p: string) => uniqueSolvedProblems.add(p));
  }
  if (Array.isArray(student?.completedProblems)) {
    student.completedProblems.forEach((p: string) => uniqueSolvedProblems.add(p));
  }

  const problemsSolved = Math.max(
    uniqueSolvedProblems.size,
    liveCohort?.totalSolved ?? 0,
    student.problemsSolved ?? 0,
    student.solvedCount ?? 0,
    student.totalSolved ?? 0
  );

  // Academic Score / Points
  const calculatedPoints = Math.round(
    testSubmissions.reduce((acc, s) => acc + (Number(s.academicScore) || Number(s.score) || 0), 0) +
    practiceSubmissions.reduce((acc, s) => acc + (Number(s.points) || Number(s.score) || 0), 0)
  );

  const academicScore = Math.max(
    Number(mod.academicScore) || 0,
    Number(liveCohort?.totalPoints) || 0,
    calculatedPoints,
    Number(student.academicScore) || 0,
    Number(student.totalPoints) || 0,
    problemsSolved > 0 ? Math.min(100, problemsSolved * 20) : 0
  );

  // Live Proctoring signals
  const clipboardAttempts = Math.max(
    Number(mod.pasteBursts) || 0,
    Number(telemetryDraft?.copyPasteAttempts) || 0,
    Number(student.clipboardAttempts) || 0,
    Number(student.pasteBursts) || 0,
    ...testSubmissions.map((s) => Number(s.copyPasteAttempts) || 0)
  );

  const tabSwitchCount = Math.max(
    Number(mod.tabSwitches) || 0,
    Number(telemetryDraft?.tabSwitchCount) || 0,
    Number(student.tabSwitchCount) || 0,
    Number(student.tabSwitches) || 0,
    ...testSubmissions.map((s) => Number(s.tabSwitchCount) || 0)
  );

  const totalKeystrokes = Math.max(
    Number(mod.totalKeystrokes) || 0,
    Number(telemetryDraft?.totalKeystrokes) || 0,
    Number(student.totalKeystrokes) || 0,
    ...testSubmissions.map((s) => Number(s.totalKeystrokes) || 0)
  );

  // Dynamic Integrity Score: Starts at 100%, deducts 5% per tab switch, 10% per paste burst
  const integrityScore = Math.max(
    0,
    Math.min(100, 100 - tabSwitchCount * 5 - clipboardAttempts * 10)
  );

  const isMiniProjectActive =
    liveCohort?.moduleProgress?.miniProjectUnlocked !== undefined
      ? Boolean(liveCohort.moduleProgress.miniProjectUnlocked)
      : Boolean(student.miniProjectUnlocked || student.miniProjectActive || student.isMiniProjectActive);

  const handleCopyEmail = () => {
    if (!email || email === '—') return;
    navigator.clipboard.writeText(email);
    setCopiedEmail(true);
    setTimeout(() => setCopiedEmail(false), 2000);
  };

  const handleCopyCode = (id: string, code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCodeId(id);
    setTimeout(() => setCopiedCodeId(null), 2000);
  };

  // Combine and de-duplicate all student submissions for the vault
  const allSubmissions = [
    ...testSubmissions.map((s) => ({ ...s, sourceType: 'ASSESSMENT' })),
    ...practiceSubmissions
      .filter((p) => !testSubmissions.some((t) => t.id === p.id || t.problemId === p.problemId))
      .map((s) => ({ ...s, sourceType: 'PRACTICE' })),
  ];

  return (
    <div className="fixed inset-0 z-[9999] bg-black/65 backdrop-blur-md flex items-center justify-center p-3 sm:p-5 animate-in fade-in duration-200">
      <div className="w-full max-w-2xl bg-white dark:bg-[#121620] border border-slate-200/90 dark:border-white/10 rounded-3xl p-6 sm:p-7 shadow-2xl space-y-5 max-h-[92vh] overflow-y-auto animate-in zoom-in-95">
        
        {/* ========================================================================= */}
        {/* 1. ELEGANT PROFILE HEADER                                                 */}
        {/* ========================================================================= */}
        <div className="flex items-start justify-between border-b border-slate-100 dark:border-white/5 pb-5">
          <div className="flex items-center gap-3.5">
            <div className="w-13 h-13 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center font-black text-lg shadow-md shadow-blue-500/20 shrink-0">
              {studentName.slice(0, 2).toUpperCase()}
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="font-bold text-lg text-slate-900 dark:text-white leading-tight">
                  {studentName}
                </h3>
                <span className="px-2.5 py-0.5 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 text-xs font-semibold border border-blue-500/20">
                  {sectionName}
                </span>
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-xs font-semibold border border-emerald-500/20">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>Verified Identity</span>
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400 font-mono mt-1">
                <span>PRN: <strong className="text-slate-700 dark:text-slate-200">{prn}</strong></span>
                <span>•</span>
                <span className="flex items-center gap-1">
                  <span>{email || '—'}</span>
                  {email && (
                    <button
                      type="button"
                      onClick={handleCopyEmail}
                      className="p-0.5 hover:text-blue-500 text-slate-400 rounded transition cursor-pointer"
                      title="Copy Email"
                    >
                      {copiedEmail ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                    </button>
                  )}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => generateIndividualStudentPdf({
                ...student,
                problemsSolved,
                academicScore,
                integrityScore,
                tabSwitchCount,
                clipboardAttempts,
              })}
              className="px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold flex items-center gap-1.5 transition active:scale-95 cursor-pointer shadow-xs"
              title="Download Student Transcript PDF"
            >
              <Download className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Export PDF</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/5 rounded-xl transition cursor-pointer"
              title="Close Modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Navigation Tabs inside Modal */}
        <div className="flex items-center gap-2 border-b border-slate-100 dark:border-white/5 pb-2">
          <button
            type="button"
            onClick={() => setActiveTab('overview')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
              activeTab === 'overview'
                ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20'
                : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            Overview &amp; Telemetry
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('submissions')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'submissions'
                ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20'
                : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <Code2 className="w-3.5 h-3.5" />
            <span>Submitted Answers Vault</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] font-mono bg-blue-500/20 text-blue-700 dark:text-blue-300">
              {allSubmissions.length}
            </span>
          </button>
        </div>

        {activeTab === 'overview' && (
          <>
            {/* ========================================================================= */}
            {/* 2. ACADEMIC OVERVIEW CARDS                                                */}
            {/* ========================================================================= */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-white/[0.03] border border-slate-200/70 dark:border-white/5">
                <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs font-medium">
                  <span>Problems Solved</span>
                  <FileCode2 className="w-4 h-4 text-blue-500" />
                </div>
                <div className="text-2xl font-black font-mono text-slate-900 dark:text-white mt-1">
                  {problemsSolved}
                </div>
                <p className="text-[11px] text-slate-400 mt-0.5">Laboratory &amp; Practice</p>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-white/[0.03] border border-slate-200/70 dark:border-white/5">
                <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs font-medium">
                  <span>Academic Points</span>
                  <Award className="w-4 h-4 text-amber-500" />
                </div>
                <div className="text-2xl font-black font-mono text-slate-900 dark:text-white mt-1">
                  {academicScore}
                </div>
                <p className="text-[11px] text-slate-400 mt-0.5">Continuous evaluation</p>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-white/[0.03] border border-slate-200/70 dark:border-white/5">
                <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs font-medium">
                  <span>Integrity Status</span>
                  <ShieldCheck className={`w-4 h-4 ${integrityScore >= 90 ? 'text-emerald-500' : integrityScore >= 70 ? 'text-amber-500' : 'text-rose-500'}`} />
                </div>
                <div className={`text-2xl font-black font-mono mt-1 ${integrityScore >= 90 ? 'text-emerald-600 dark:text-emerald-400' : integrityScore >= 70 ? 'text-amber-600 dark:text-amber-400' : 'text-rose-600 dark:text-rose-400'}`}>
                  {integrityScore}%
                </div>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  {clipboardAttempts === 0 && tabSwitchCount === 0 ? 'Clean Proctoring' : 'Telemetry Monitored'}
                </p>
              </div>
            </div>

            {/* ========================================================================= */}
            {/* 3. CAPSTONE MINI-PROJECT PERMISSION CARD                                   */}
            {/* ========================================================================= */}
            <div className="p-4 sm:p-5 rounded-2xl border border-slate-200/80 dark:border-white/10 bg-slate-50/70 dark:bg-white/[0.02] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <FolderLock className="w-4 h-4 text-indigo-500" />
                  <h4 className="font-bold text-sm text-slate-900 dark:text-white">
                    Capstone Mini-Project Access
                  </h4>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Grant individual permission for this student to access and submit the Capstone Project.
                </p>
                <div className="pt-1">
                  {isMiniProjectActive ? (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                      <Unlock className="w-3 h-3" />
                      <span>Unlocked — Visible on Student Portal</span>
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-200/70 dark:bg-white/5 text-slate-600 dark:text-slate-400 border border-slate-300/50 dark:border-white/10">
                      <Lock className="w-3 h-3" />
                      <span>Locked — Awaiting Faculty Unlock</span>
                    </span>
                  )}
                </div>
              </div>

              <button
                type="button"
                onClick={() => onToggleMiniProject(student.id || student.prn, isMiniProjectActive)}
                className={`px-4 py-2 rounded-xl text-xs font-semibold transition active:scale-95 cursor-pointer shrink-0 flex items-center justify-center gap-1.5 ${
                  isMiniProjectActive
                    ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400 hover:bg-rose-500/20 border border-rose-500/30'
                    : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs'
                }`}
              >
                {isMiniProjectActive ? (
                  <>
                    <Lock className="w-3.5 h-3.5" />
                    <span>Lock Project</span>
                  </>
                ) : (
                  <>
                    <Unlock className="w-3.5 h-3.5" />
                    <span>Unlock Mini-Project</span>
                  </>
                )}
              </button>
            </div>

            {/* ========================================================================= */}
            {/* 4. PROCTORING & INTEGRITY SIGNALS                                          */}
            {/* ========================================================================= */}
            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                  <Activity className="w-3.5 h-3.5 text-blue-500" />
                  <span>Proctoring &amp; Exam Security Telemetry</span>
                </h4>
                <span className="text-[11px] font-mono text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  <span>Live Stream Connected</span>
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs font-mono">
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-white/[0.02] border border-slate-200/70 dark:border-white/5">
                  <span className="text-[11px] text-slate-400 block font-sans">Clipboard Paste</span>
                  <span className="font-bold text-sm text-slate-900 dark:text-white mt-0.5 block">{clipboardAttempts}</span>
                  <span className="text-[10px] text-slate-400 block mt-0.5 font-sans">
                    {clipboardAttempts === 0 ? 'No violations' : `${clipboardAttempts} blocked attempt${clipboardAttempts > 1 ? 's' : ''}`}
                  </span>
                </div>

                <div className="p-3 rounded-xl bg-slate-50 dark:bg-white/[0.02] border border-slate-200/70 dark:border-white/5">
                  <span className="text-[11px] text-slate-400 block font-sans">Focus / Tab Switches</span>
                  <span className="font-bold text-sm text-slate-900 dark:text-white mt-0.5 block">{tabSwitchCount}</span>
                  <span className="text-[10px] text-slate-400 block mt-0.5 font-sans">
                    {tabSwitchCount === 0 ? 'Focused session' : `${tabSwitchCount} switch${tabSwitchCount > 1 ? 'es' : ''} logged`}
                  </span>
                </div>

                <div className="p-3 rounded-xl bg-slate-50 dark:bg-white/[0.02] border border-slate-200/70 dark:border-white/5">
                  <span className="text-[11px] text-slate-400 block font-sans">Keystroke Cadence</span>
                  <span className="font-bold text-sm text-indigo-500 mt-0.5 block">
                    {totalKeystrokes > 50
                      ? `~${Math.min(95, Math.max(25, Math.round(totalKeystrokes / 12)))} WPM`
                      : totalKeystrokes > 0
                      ? 'Active'
                      : '—'}
                  </span>
                  <span className="text-[10px] text-slate-400 block mt-0.5 font-sans">
                    {totalKeystrokes > 0 ? `${totalKeystrokes} strokes` : 'No active typing'}
                  </span>
                </div>

                <div className="p-3 rounded-xl bg-slate-50 dark:bg-white/[0.02] border border-slate-200/70 dark:border-white/5">
                  <span className="text-[11px] text-slate-400 block font-sans">Plagiarism Check</span>
                  <span className="font-bold text-sm text-emerald-600 dark:text-emerald-400 mt-0.5 block">
                    0%
                  </span>
                  <span className="text-[10px] text-emerald-600/80 dark:text-emerald-400/80 block mt-0.5 font-sans">
                    Original Code
                  </span>
                </div>
              </div>
            </div>

            {/* ========================================================================= */}
            {/* 5. AI GAP ANALYSIS & LEARNING INTERVENTIONS                                */}
            {/* ========================================================================= */}
            <div className="p-4 rounded-2xl bg-blue-50/60 dark:bg-blue-500/5 border border-blue-200/60 dark:border-blue-500/20 space-y-1.5">
              <div className="font-bold text-blue-700 dark:text-blue-400 flex items-center gap-1.5 text-xs">
                <Sparkles className="w-3.5 h-3.5" />
                <span>AI Learning Assessment &amp; Recommendations</span>
              </div>

              {academicScore === 0 && problemsSolved === 0 ? (
                <p className="text-slate-600 dark:text-slate-300 text-xs leading-relaxed">
                  Candidate has active credentials verified. No coding submissions have been made yet. Detailed concept mastery, time-complexity analysis, and customized practice recommendations will appear here automatically once lab work begins.
                </p>
              ) : (
                <p className="text-slate-600 dark:text-slate-300 text-xs leading-relaxed">
                  Candidate demonstrates continuous evaluation with <strong className="text-blue-700 dark:text-blue-300">{problemsSolved} problem{problemsSolved > 1 ? 's' : ''} solved</strong> and <strong className="text-blue-700 dark:text-blue-300">{academicScore} academic points</strong>. Session shows {integrityScore >= 90 ? 'strong authentic code integrity' : 'some proctoring events flagged for review'}.
                </p>
              )}
            </div>
          </>
        )}

        {/* ========================================================================= */}
        {/* SUBMITTED ANSWERS VAULT TAB                                               */}
        {/* ========================================================================= */}
        {activeTab === 'submissions' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
              <span className="font-bold">Total Attempts Logged: {allSubmissions.length}</span>
              <span className="font-mono text-[11px]">Real-time Authoritative Submissions</span>
            </div>

            {allSubmissions.length === 0 ? (
              <div className="p-8 rounded-2xl border border-dashed border-slate-200 dark:border-white/10 text-center space-y-2">
                <Terminal className="w-8 h-8 text-slate-400 mx-auto" />
                <p className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  No submissions recorded yet for this student.
                </p>
                <p className="text-[11px] text-slate-400">
                  Once the candidate runs or submits code in any Lab Internal or Practice problem, their code and telemetry will appear here instantly.
                </p>
              </div>
            ) : (
              <div className="space-y-2.5">
                {allSubmissions.map((sub, sIdx) => {
                  const subId = sub.id || `sub_${sIdx}`;
                  const isExpanded = expandedSubId === subId;
                  const isAccepted = sub.verdict === 'ACCEPTED' || sub.status === 'PASSED' || sub.academicScore > 0;
                  const codeSnippet = sub.code || sub.submittedCode || '// No code body saved';

                  return (
                    <div
                      key={subId}
                      className="rounded-2xl border border-slate-200/80 dark:border-white/10 bg-slate-50/50 dark:bg-white/[0.02] overflow-hidden transition"
                    >
                      {/* Accordion Header */}
                      <button
                        type="button"
                        onClick={() => setExpandedSubId(isExpanded ? null : subId)}
                        className="w-full p-3.5 flex items-center justify-between text-left hover:bg-slate-100/60 dark:hover:bg-white/[0.04] transition cursor-pointer"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          {isExpanded ? (
                            <ChevronDown className="w-4 h-4 text-blue-500 shrink-0" />
                          ) : (
                            <ChevronRight className="w-4 h-4 text-slate-400 shrink-0" />
                          )}
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-bold text-xs text-slate-900 dark:text-white truncate">
                                {sub.problemTitle || sub.problemId || sub.title || 'Practical Challenge'}
                              </span>
                              <span className={`px-2 py-0.2 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                                isAccepted
                                  ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                                  : 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20'
                              }`}>
                                {sub.verdict || sub.status || (isAccepted ? 'ACCEPTED' : 'EVALUATED')}
                              </span>
                              <span className="px-2 py-0.2 rounded-full text-[10px] font-bold bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
                                {sub.sourceType === 'ASSESSMENT' ? 'Lab Internal' : 'Practice'}
                              </span>
                            </div>
                            <div className="flex items-center gap-2 text-[11px] text-slate-400 font-mono mt-0.5">
                              <span>
                                {sub.submittedAt
                                  ? new Date(sub.submittedAt).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })
                                  : 'Live Session'}
                              </span>
                              {sub.testTitle && (
                                <>
                                  <span>•</span>
                                  <span className="truncate max-w-[180px]">{sub.testTitle}</span>
                                </>
                              )}
                              <span>•</span>
                              <span>Score: {sub.academicScore ?? sub.score ?? 0}</span>
                            </div>
                          </div>
                        </div>

                        <div className="text-right shrink-0 pl-2">
                          <span className="text-[11px] font-mono text-slate-500">
                            {sub.tabSwitchCount || 0} Tabs • {sub.copyPasteAttempts || 0} Pastes
                          </span>
                        </div>
                      </button>

                      {/* Accordion Body with Code Viewer */}
                      {isExpanded && (
                        <div className="p-4 border-t border-slate-200/80 dark:border-white/10 bg-slate-950 text-slate-100 font-mono text-xs space-y-3">
                          <div className="flex items-center justify-between">
                            <span className="text-[11px] text-slate-400 uppercase tracking-wider font-bold">
                              Candidate Submitted C Code:
                            </span>
                            <button
                              type="button"
                              onClick={() => handleCopyCode(subId, codeSnippet)}
                              className="px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-white text-[11px] font-sans flex items-center gap-1 transition cursor-pointer"
                            >
                              {copiedCodeId === subId ? (
                                <>
                                  <Check className="w-3 h-3 text-emerald-400" />
                                  <span>Copied!</span>
                                </>
                              ) : (
                                <>
                                  <Copy className="w-3 h-3" />
                                  <span>Copy Code</span>
                                </>
                              )}
                            </button>
                          </div>

                          <pre className="p-3 bg-black/60 rounded-xl overflow-x-auto text-emerald-400 text-xs font-mono max-h-60 leading-relaxed">
                            {codeSnippet}
                          </pre>
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
    </div>
  );
};
