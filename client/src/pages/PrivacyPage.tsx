import React from 'react';
import { Link } from 'react-router-dom';
import { ShieldCheck, Lock, Download, Trash2, EyeOff } from 'lucide-react';

export const PrivacyPage: React.FC = () => {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      <div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-[#E8EAF6] flex items-center gap-2.5">
          <ShieldCheck className="w-7 h-7 text-[#8B9BFF]" />
          <span>Privacy Notice & Student Data Protection</span>
        </h1>
        <p className="text-sm text-[#9AA1C4] mt-1 font-mono">
          Sanjivani University — LogicQ Data Collection, PRN Masking, Export & Account Deletion Policy
        </p>
      </div>

      <div className="glass-card p-6 sm:p-8 rounded-2xl border border-[#252C4F] bg-[#141932] space-y-6 text-sm text-[#E8EAF6] leading-relaxed">
        <section className="space-y-2">
          <h2 className="text-lg font-bold text-[#E8EAF6] flex items-center gap-2">
            <Lock className="w-4 h-4 text-[#8B9BFF]" />
            <span>1. Personal & Academic Fields Collected</span>
          </h2>
          <p className="text-[#9AA1C4]">
            When you register or complete your LogicQ student profile, we collect the following institutional fields:
          </p>
          <ul className="list-disc pl-5 space-y-1 text-[#E8EAF6]">
            <li>
              <strong>PRN (12-digit University Permanent Registration Number)</strong>: Stored strictly in your private account record and the server-side uniqueness index (<code className="font-mono text-[#8B9BFF]">prnIndex</code>).
            </li>
            <li>
              <strong>College</strong>: Sanjivani University.
            </li>
            <li>
              <strong>Department</strong>: AIML, AIDS, Integrated M.Tech, Mechanical, CSE, or Integrated B.Tech.
            </li>
            <li>
              <strong>Academic Year & Optional Division</strong>: FY, SY, or TY, plus optional division (up to 3 alphanumeric characters).
            </li>
            <li>
              <strong>College Email & Optional Display Name</strong>: Used for authentication and optional public leaderboard display (3–20 characters).
            </li>
          </ul>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-bold text-[#E8EAF6] flex items-center gap-2">
            <EyeOff className="w-4 h-4 text-[#46D9A0]" />
            <span>2. PRN Privacy & Public Leaderboard Masking</span>
          </h2>
          <p className="text-[#9AA1C4]">
            Your 12-digit PRN is treated as a confidential personal identifier:
          </p>
          <ul className="list-disc pl-5 space-y-1 text-[#E8EAF6]">
            <li>
              <strong>Never Exposed to Other Students</strong>: Your full PRN is never included in public profiles, leaderboard responses for other students, client logs, or public analytics.
            </li>
            <li>
              <strong>Own-View Masking</strong>: On your own profile and your pinned leaderboard row, only the last 4 digits of your PRN are shown to you in masked form (<code className="font-mono text-[#46D9A0]">••••••5678</code>) alongside your department and year.
            </li>
            <li>
              <strong>Peer Display Label</strong>: Other students see your optional chosen Display Name (3–20 characters) or a non-identifying fallback label (<code className="font-mono text-[#8B9BFF]">Student 4F9A</code>).
            </li>
            <li>
              <strong>Faculty / Admin Access</strong>: Authorized platform administrators can view PRN, college, department, year, and division for academic evaluation and daily and cohort reporting.
            </li>
          </ul>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-bold text-[#E8EAF6] flex items-center gap-2">
            <Download className="w-4 h-4 text-[#8B9BFF]" />
            <span>3. Profile Editing & Self-Service Data Export</span>
          </h2>
          <p className="text-[#9AA1C4]">
            You may update your <strong>Department</strong>, <strong>Year</strong>, <strong>Division</strong>, and <strong>Display Name</strong> at any time from your Profile Settings. Your <strong>PRN</strong> and <strong>College</strong> are locked after signup and can only be modified by an administrator through a re-authenticated, audited action. You can download a full JSON export of your profile (including PRN, college, department, year, division, points, and submissions) from your Profile page.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-bold text-[#E8EAF6] flex items-center gap-2">
            <Trash2 className="w-4 h-4 text-[#FF7A8A]" />
            <span>4. Account Deletion & Retained Anonymized History</span>
          </h2>
          <p className="text-[#9AA1C4]">
            When you delete your account from Profile Settings:
          </p>
          <ul className="list-disc pl-5 space-y-1 text-[#E8EAF6]">
            <li>Your <strong>PRN</strong> is permanently removed from your user document.</li>
            <li>Your <code className="font-mono text-[#8B9BFF]">prnIndex</code> entry is freed immediately so the PRN is no longer locked.</li>
            <li>Your <strong>email, display name, college, department, year, division, bio, and avatar</strong> are cleared, and all active sessions are revoked.</li>
            <li>
              <strong>Retained Data</strong>: Only de-identified, anonymized submission and aggregate problem-solve statistics are retained to preserve historical leaderboard and problem-difficulty integrity, with zero link to your PRN or email.
            </li>
          </ul>
        </section>

        <div className="pt-4 border-t border-[#252C4F] flex items-center justify-between text-xs font-mono text-[#9AA1C4]">
          <span>DPDP-Aligned Institutional Privacy Notice</span>
          <Link to="/profile" className="text-[#8B9BFF] hover:underline">
            Manage Profile & Privacy Controls &rarr;
          </Link>
        </div>
      </div>
    </div>
  );
};
