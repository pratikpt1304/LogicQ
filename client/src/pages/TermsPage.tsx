import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  FileText,
  ShieldCheck,
  Scale,
  Terminal,
  Code2,
  AlertTriangle,
  CheckCircle2,
  ArrowLeft,
  Building2,
  Lock,
  Mail,
  ExternalLink,
} from 'lucide-react';

export const TermsPage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 space-y-8 animate-fadeIn font-sans">
      {/* 1. TOP NAV BREADCRUMB / BACK */}
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition-all cursor-pointer active:scale-95 shadow-xs"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back</span>
        </button>

        <Link
          to="/privacy"
          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/40 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 border border-indigo-200/60 dark:border-indigo-800/60 transition-all cursor-pointer active:scale-95 shadow-xs"
        >
          <ShieldCheck className="w-3.5 h-3.5" />
          <span>Privacy &amp; DPDP Policy</span>
        </Link>
      </div>

      {/* 2. HERO HEADER */}
      <div className="relative overflow-hidden rounded-3xl border border-slate-200/80 dark:border-slate-800/80 bg-white/70 dark:bg-slate-900/60 backdrop-blur-2xl p-6 sm:p-10 shadow-xs">
        <div className="space-y-3 max-w-2xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-600 dark:text-blue-400 text-xs font-semibold">
            <Scale className="w-3.5 h-3.5" />
            <span>Academic Platform Agreement • Updated Nov 2026</span>
          </div>

          <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight text-slate-900 dark:text-white">
            Terms of Service &amp; Academic Honor Code
          </h1>

          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
            These Terms govern your use of the LogicQ Continuous Evaluation Platform, Linux GCC 14 sandbox compiler, Practice Arena, and institutional examination services operated for Sanjivani University.
          </p>
        </div>

        {/* 4 CORE PRINCIPLE TILES */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mt-8 pt-8 border-t border-slate-200/60 dark:border-slate-800/60">
          <div className="p-4 rounded-2xl bg-slate-50/80 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-700/60 space-y-2">
            <div className="w-8 h-8 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold">
              <Code2 className="w-4 h-4" />
            </div>
            <div className="font-bold text-xs text-slate-900 dark:text-white">100% Code Ownership</div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
              You own all intellectual property rights to the source code and solutions you write on LogicQ.
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-slate-50/80 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-700/60 space-y-2">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold">
              <CheckCircle2 className="w-4 h-4" />
            </div>
            <div className="font-bold text-xs text-slate-900 dark:text-white">Fair Sandbox Use</div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
              Unlimited compilations and tests for learning; zero tolerance for malware or bot abuse.
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-slate-50/80 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-700/60 space-y-2">
            <div className="w-8 h-8 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center font-bold">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <div className="font-bold text-xs text-slate-900 dark:text-white">Academic Integrity</div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
              Proctored examinations demand strict individual work, telemetry logging, and plagiarism defense.
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-slate-50/80 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-700/60 space-y-2">
            <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center font-bold">
              <Building2 className="w-4 h-4" />
            </div>
            <div className="font-bold text-xs text-slate-900 dark:text-white">Institutional Trust</div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
              Marks and transcripts compiled here are directly linked to accredited university CIE records.
            </p>
          </div>
        </div>
      </div>

      {/* 3. DETAILED CLAUSES ACCORDION / CARD GRID */}
      <div className="space-y-6">
        {/* Clause 1: Acceptance & Educational Scope */}
        <section className="p-6 rounded-3xl border border-slate-200/80 dark:border-slate-800/80 bg-white/70 dark:bg-slate-900/60 backdrop-blur-xl space-y-3 shadow-xs">
          <div className="flex items-center gap-2.5 text-slate-900 dark:text-white font-bold text-sm sm:text-base">
            <span className="w-7 h-7 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center text-xs font-mono font-bold">
              01
            </span>
            <h2>Acceptance of Terms &amp; Academic Scope</h2>
          </div>
          <div className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 space-y-2 leading-relaxed pl-9">
            <p>
              By signing in to LogicQ (via PRN, University Email, or Institutional Join Code), you enter into a binding agreement with the Department of Integrated M.Tech, Sanjivani University, and agree to abide by these Terms of Service.
            </p>
            <p>
              LogicQ is an institutional continuous internal evaluation (CIE) system. Any misuse of platform resources, falsification of identity, or disruption of examination schedules constitutes academic misconduct under university ordinances.
            </p>
          </div>
        </section>

        {/* Clause 2: Student Code Ownership & IP */}
        <section className="p-6 rounded-3xl border border-slate-200/80 dark:border-slate-800/80 bg-white/70 dark:bg-slate-900/60 backdrop-blur-xl space-y-3 shadow-xs">
          <div className="flex items-center gap-2.5 text-slate-900 dark:text-white font-bold text-sm sm:text-base">
            <span className="w-7 h-7 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center text-xs font-mono font-bold">
              02
            </span>
            <h2>Student Code Ownership &amp; Intellectual Property</h2>
          </div>
          <div className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 space-y-2 leading-relaxed pl-9">
            <p>
              <strong>You retain 100% intellectual property rights:</strong> All C programs, algorithms, data structures, and comments written by you in the LogicQ editor remain your sole copyright.
            </p>
            <p>
              You grant LogicQ and designated faculty mentors a limited, non-exclusive license solely to execute, compile, test, grade, and preserve your submissions for academic accreditation and transcript generation. We never sell, license, or commercialize student code.
            </p>
          </div>
        </section>

        {/* Clause 3: Linux Sandbox Fair Use Policy */}
        <section className="p-6 rounded-3xl border border-slate-200/80 dark:border-slate-800/80 bg-white/70 dark:bg-slate-900/60 backdrop-blur-xl space-y-3 shadow-xs">
          <div className="flex items-center gap-2.5 text-slate-900 dark:text-white font-bold text-sm sm:text-base">
            <span className="w-7 h-7 rounded-lg bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center text-xs font-mono font-bold">
              03
            </span>
            <h2>Linux GCC 14 Sandbox Fair Usage Policy</h2>
          </div>
          <div className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 space-y-2 leading-relaxed pl-9">
            <p>
              LogicQ provisions dedicated Linux GCC 14 (C11 standard) containers for compiling and testing your programs. The sandbox is subject to strict resource caps:
            </p>
            <ul className="list-disc list-inside space-y-1 text-slate-500 dark:text-slate-400 font-mono text-xs">
              <li>Maximum CPU Execution Time: 2.0 seconds per test case</li>
              <li>RAM Allocation: 64 MB virtual address space</li>
              <li>Disabled System Calls: Raw socket creation, fork-bombs, file write outside /tmp sandbox</li>
            </ul>
            <p className="pt-1">
              Attempting to break container isolation, conduct denial-of-service (DDoS) attacks, scrape internal unit tests, or run malicious crypto-mining binaries will result in immediate permanent account suspension and administrative disciplinary action.
            </p>
          </div>
        </section>

        {/* Clause 4: Proctoring & Academic Integrity Honor Code */}
        <section className="p-6 rounded-3xl border border-slate-200/80 dark:border-slate-800/80 bg-white/70 dark:bg-slate-900/60 backdrop-blur-xl space-y-3 shadow-xs">
          <div className="flex items-center gap-2.5 text-slate-900 dark:text-white font-bold text-sm sm:text-base">
            <span className="w-7 h-7 rounded-lg bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center text-xs font-mono font-bold">
              04
            </span>
            <h2>Proctoring Telemetry &amp; Anti-Cheating Honor Code</h2>
          </div>
          <div className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 space-y-2 leading-relaxed pl-9">
            <p>
              During active proctored tests, LogicQ monitors client-side behavioral telemetry (tab switches, fullscreen exits, copy-paste attempts, and typing speed rhythms).
            </p>
            <p>
              <strong>Zero Invasive Surveillance:</strong> LogicQ never requires or turns on your webcam, microphone, or arbitrary desktop screen recordings. Our integrity mechanisms rely strictly on browser events, typing entropy, and AI-driven interactive oral recall viva defense.
            </p>
            <p>
              Submissions flagged for excessive paste anomalies or external collaboration are submitted to the University Academic Integrity Committee for manual review.
            </p>
          </div>
        </section>

        {/* Clause 5: Account Security & Confidentiality */}
        <section className="p-6 rounded-3xl border border-slate-200/80 dark:border-slate-800/80 bg-white/70 dark:bg-slate-900/60 backdrop-blur-xl space-y-3 shadow-xs">
          <div className="flex items-center gap-2.5 text-slate-900 dark:text-white font-bold text-sm sm:text-base">
            <span className="w-7 h-7 rounded-lg bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 flex items-center justify-center text-xs font-mono font-bold">
              05
            </span>
            <h2>Account Security &amp; PRN Confidentiality</h2>
          </div>
          <div className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 space-y-2 leading-relaxed pl-9">
            <p>
              You are responsible for maintaining the confidentiality of your account credentials. You must not share your PRN or passwords with other students.
            </p>
            <p>
              If multiple concurrent logins are detected during a timed assessment window, LogicQ’s single-session lock will invalidate older sessions to protect your test state from tampering.
            </p>
          </div>
        </section>

        {/* Clause 6: Disclaimers & Institutional Governance */}
        <section className="p-6 rounded-3xl border border-slate-200/80 dark:border-slate-800/80 bg-white/70 dark:bg-slate-900/60 backdrop-blur-xl space-y-3 shadow-xs">
          <div className="flex items-center gap-2.5 text-slate-900 dark:text-white font-bold text-sm sm:text-base">
            <span className="w-7 h-7 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center text-xs font-mono font-bold">
              06
            </span>
            <h2>Continuous Internal Evaluation (CIE) Governance</h2>
          </div>
          <div className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 space-y-2 leading-relaxed pl-9">
            <p>
              Marks calculated on LogicQ for Continuous Internal Evaluation (20 Marks Coursework &amp; Tests) are authoritative subject to faculty verification.
            </p>
            <p>
              In the unlikely event of network interruption or compiler cluster failover, all student editor keystrokes are automatically persisted locally via IndexedDB and synchronized to Cloud Firestore upon reconnection.
            </p>
          </div>
        </section>

        {/* Clause 7: Grievances & Contact */}
        <section className="p-6 rounded-3xl border border-slate-200/80 dark:border-slate-800/80 bg-white/70 dark:bg-slate-900/60 backdrop-blur-xl space-y-3 shadow-xs">
          <div className="flex items-center gap-2.5 text-slate-900 dark:text-white font-bold text-sm sm:text-base">
            <span className="w-7 h-7 rounded-lg bg-rose-500/10 text-rose-600 dark:text-rose-400 flex items-center justify-center text-xs font-mono font-bold">
              07
            </span>
            <h2>Grievance Redressal &amp; Academic Dispute Officer</h2>
          </div>
          <div className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 space-y-2 leading-relaxed pl-9">
            <p>
              For questions regarding evaluation results, test re-attempts due to verified hardware failure, or policy inquiries, students can contact:
            </p>
            <div className="mt-3 p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-700/60 font-mono text-xs space-y-1">
              <div className="font-bold text-slate-900 dark:text-white">Academic Grievance &amp; Compliance Cell</div>
              <div className="text-slate-500 dark:text-slate-400">Department of Integrated M.Tech, Sanjivani University</div>
              <div className="text-blue-600 dark:text-blue-400 flex items-center gap-1.5 pt-1">
                <Mail className="w-3.5 h-3.5" />
                <a href="mailto:logicqarena@gmail.com" className="hover:underline">logicqarena@gmail.com</a>
              </div>
            </div>
          </div>
        </section>
      </div>

      {/* 4. BOTTOM ACTION FOOTNOTE */}
      <div className="text-center pt-4 border-t border-slate-200/60 dark:border-slate-800/60 text-xs text-slate-400 flex flex-wrap items-center justify-center gap-4">
        <span>© {new Date().getFullYear()} LogicQ Platform • Sanjivani University</span>
        <span>•</span>
        <Link to="/privacy" className="text-indigo-600 dark:text-indigo-400 hover:underline">
          Privacy &amp; DPDP Policy
        </Link>
        <span>•</span>
        <Link to="/profile" className="text-slate-600 dark:text-slate-400 hover:underline">
          My Account
        </Link>
      </div>
    </div>
  );
};
