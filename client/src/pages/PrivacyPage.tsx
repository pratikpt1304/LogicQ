import React from 'react';
import { Link } from 'react-router-dom';
import {
  ShieldCheck,
  Lock,
  Download,
  Trash2,
  EyeOff,
  UserCheck,
  Ban,
  Cpu,
  CheckCircle2,
  ArrowRight,
  Sparkles,
} from 'lucide-react';

export const PrivacyPage: React.FC = () => {
  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8 animate-in fade-in duration-300">
      {/* Header Banner */}
      <div className="space-y-2">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-mono font-semibold">
          <ShieldCheck className="w-3.5 h-3.5" />
          <span>Student Trust & Data Protection Center</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-[var(--foreground)] flex items-center gap-3">
          <span>Privacy Notice & Student Data Protection</span>
        </h1>
        <p className="text-sm text-[var(--muted-foreground)] max-w-2xl leading-relaxed">
          LogicQ is built for academic integrity and programming excellence. Here is our plain-English policy on what data we collect, how your identity is protected, and how you retain complete control over your records.
        </p>
      </div>

      {/* 4 Trust Highlights */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        <div className="p-4 rounded-2xl bg-[var(--card)] border border-[var(--border)] shadow-sm space-y-2">
          <div className="w-8 h-8 rounded-xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center font-bold">
            <Lock className="w-4 h-4" />
          </div>
          <div className="font-bold text-xs text-[var(--foreground)]">Confidential Identity</div>
          <div className="text-[11px] text-[var(--muted-foreground)] leading-relaxed">
            Your PRN / Roll Number and contact details are strictly confidential and never exposed publicly.
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-[var(--card)] border border-[var(--border)] shadow-sm space-y-2">
          <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center font-bold">
            <EyeOff className="w-4 h-4" />
          </div>
          <div className="font-bold text-xs text-[var(--foreground)]">Anonymous Leaderboard</div>
          <div className="text-[11px] text-[var(--muted-foreground)] leading-relaxed">
            Classmates only see your chosen Display Name or Avatar. Your real roll number remains hidden.
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-[var(--card)] border border-[var(--border)] shadow-sm space-y-2">
          <div className="w-8 h-8 rounded-xl bg-cyan-500/10 text-cyan-400 flex items-center justify-center font-bold">
            <Ban className="w-4 h-4" />
          </div>
          <div className="font-bold text-xs text-[var(--foreground)]">Zero Commercial Ads</div>
          <div className="text-[11px] text-[var(--muted-foreground)] leading-relaxed">
            Your academic activity is never monetized, sold, or shared with third-party advertising trackers.
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-[var(--card)] border border-[var(--border)] shadow-sm space-y-2">
          <div className="w-8 h-8 rounded-xl bg-purple-500/10 text-purple-400 flex items-center justify-center font-bold">
            <Download className="w-4 h-4" />
          </div>
          <div className="font-bold text-xs text-[var(--foreground)]">Self-Service Export & Erase</div>
          <div className="text-[11px] text-[var(--muted-foreground)] leading-relaxed">
            Download your full coding history anytime or permanently delete your account in 1-click.
          </div>
        </div>
      </div>

      {/* 4 Core Pillars Bento Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Card 1: What We Collect */}
        <div className="p-6 rounded-2xl bg-[var(--card)] border border-[var(--border)] space-y-4 shadow-sm">
          <div className="flex items-center gap-2.5 pb-3 border-b border-[var(--border)]">
            <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-400">
              <UserCheck className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-[var(--foreground)]">1. Data Collected & Purpose</h2>
              <p className="text-[11px] text-[var(--muted-foreground)]">Required strictly for academic verification & grading</p>
            </div>
          </div>

          <div className="space-y-3 text-xs leading-relaxed text-[var(--foreground)]">
            <div className="flex items-start gap-2.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <div>
                <strong>PRN / Student Roll Number:</strong> Stored securely to authenticate your identity and bind your test marks to your institutional student record.
              </div>
            </div>
            <div className="flex items-start gap-2.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <div>
                <strong>College Email & Phone Number:</strong> Used solely for secure passwordless OTP login and urgent exam timetable notifications.
              </div>
            </div>
            <div className="flex items-start gap-2.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <div>
                <strong>Department, Year & Section:</strong> Used to map you to your faculty's assigned classroom rosters and test schedules.
              </div>
            </div>
            <div className="flex items-start gap-2.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <div>
                <strong>C Code Submissions & Test Runs:</strong> Evaluated by our GCC sandbox to compute marks, speed percentiles, and streak points.
              </div>
            </div>
          </div>
        </div>

        {/* Card 2: Who Sees What */}
        <div className="p-6 rounded-2xl bg-[var(--card)] border border-[var(--border)] space-y-4 shadow-sm">
          <div className="flex items-center gap-2.5 pb-3 border-b border-[var(--border)]">
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400">
              <EyeOff className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-[var(--foreground)]">2. Visibility & Privacy Safeguards</h2>
              <p className="text-[11px] text-[var(--muted-foreground)]">Strict role-based access control</p>
            </div>
          </div>

          <div className="space-y-3 text-xs leading-relaxed text-[var(--foreground)]">
            <div className="flex items-start gap-2.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0 mt-1.5" />
              <div>
                <strong>Other Students / Classmates:</strong> Only see your chosen Display Name or Avatar on the public leaderboard. They can <em>never</em> see your PRN, phone number, email, or private test answers.
              </div>
            </div>
            <div className="flex items-start gap-2.5">
              <span className="w-2 h-2 rounded-full bg-indigo-400 shrink-0 mt-1.5" />
              <div>
                <strong>Your Course Faculty:</strong> Can view your roll number, attendance, and exam test submissions for their assigned sections to verify marks and generate academic grade sheets.
              </div>
            </div>
            <div className="flex items-start gap-2.5">
              <span className="w-2 h-2 rounded-full bg-amber-400 shrink-0 mt-1.5" />
              <div>
                <strong>Platform Administrators:</strong> Access is audited and restricted to system health, re-judging technical discrepancies, and managing faculty credentials.
              </div>
            </div>
          </div>
        </div>

        {/* Card 3: Proctoring & Exam Integrity */}
        <div className="p-6 rounded-2xl bg-[var(--card)] border border-[var(--border)] space-y-4 shadow-sm">
          <div className="flex items-center gap-2.5 pb-3 border-b border-[var(--border)]">
            <div className="p-2 rounded-xl bg-cyan-500/10 text-cyan-400">
              <Cpu className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-[var(--foreground)]">3. Exam Proctoring & Integrity Telemetry</h2>
              <p className="text-[11px] text-[var(--muted-foreground)]">Fair evaluation without intrusive surveillance</p>
            </div>
          </div>

          <div className="space-y-3 text-xs leading-relaxed text-[var(--foreground)]">
            <p className="text-[var(--muted-foreground)]">
              During active proctored tests, the workspace monitors browser events to maintain honesty:
            </p>
            <div className="space-y-2">
              <div className="p-2.5 rounded-xl bg-[var(--background)] border border-[var(--border)] flex items-center justify-between">
                <span className="font-medium">Tab Switching & Fullscreen Exits</span>
                <span className="text-[10px] font-mono text-indigo-400 font-bold uppercase">Event Logged</span>
              </div>
              <div className="p-2.5 rounded-xl bg-[var(--background)] border border-[var(--border)] flex items-center justify-between">
                <span className="font-medium">Abrupt Code Bursts (Copy-Paste Detection)</span>
                <span className="text-[10px] font-mono text-indigo-400 font-bold uppercase">Rate Tracked</span>
              </div>
              <div className="p-2.5 rounded-xl bg-[var(--background)] border border-[var(--border)] flex items-center justify-between">
                <span className="font-medium">Webcam / Audio Surveillance</span>
                <span className="text-[10px] font-mono text-emerald-400 font-bold uppercase">Not Used (Zero Intrusion)</span>
              </div>
            </div>
          </div>
        </div>

        {/* Card 4: Data Rights & Deletion */}
        <div className="p-6 rounded-2xl bg-[var(--card)] border border-[var(--border)] space-y-4 shadow-sm">
          <div className="flex items-center gap-2.5 pb-3 border-b border-[var(--border)]">
            <div className="p-2 rounded-xl bg-rose-500/10 text-rose-400">
              <Trash2 className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-[var(--foreground)]">4. Your Control, Portability & Deletion</h2>
              <p className="text-[11px] text-[var(--muted-foreground)]">Full ownership over your personal data</p>
            </div>
          </div>

          <div className="space-y-3 text-xs leading-relaxed text-[var(--foreground)]">
            <div className="flex items-start gap-2.5">
              <Download className="w-4 h-4 text-purple-400 shrink-0 mt-0.5" />
              <div>
                <strong>Self-Service Data Export:</strong> You can export your full coding profile, problem statistics, and test attempts in JSON format anytime from Profile Settings.
              </div>
            </div>
            <div className="flex items-start gap-2.5">
              <Trash2 className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <div>
                <strong>Account Deletion:</strong> Deleting your account immediately frees your PRN, revokes all active sessions, and wipes your personal contact records permanently.
              </div>
            </div>
            <div className="flex items-start gap-2.5">
              <Sparkles className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <div>
                <strong>Historical Integrity:</strong> Only anonymous aggregate solve counts are retained so historical class benchmarks remain statistically valid.
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Footer CTA */}
      <div className="glass-card p-5 rounded-2xl border border-[var(--border)] bg-[var(--card)] flex flex-col sm:flex-row items-center justify-between gap-4">
        <div>
          <div className="font-bold text-xs text-[var(--foreground)]">Want to adjust your public visibility?</div>
          <div className="text-[11px] text-[var(--muted-foreground)]">
            Change your Display Name, Avatar, or download your data directly from Profile Settings.
          </div>
        </div>
        <Link
          to="/profile"
          className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 shadow-md shadow-indigo-600/25 flex items-center gap-2 transition active:scale-95 shrink-0"
        >
          <span>Manage Profile & Privacy</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>
    </div>
  );
};
