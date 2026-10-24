import React from 'react';
import { Link } from 'react-router-dom';
import { Logo } from '../components/common/Logo.js';
import { ShieldAlert, ArrowRight, BookOpen, Users, Lock } from 'lucide-react';

export const RegisterPage: React.FC = () => {
  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-lg text-center space-y-6">
        <div className="inline-block">
          <Logo size="lg" />
        </div>

        <div className="glass-card p-8 rounded-2xl border border-[var(--border-line)] bg-[var(--bg-panel)] shadow-xl text-left space-y-6">
          <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-500 mx-auto">
            <Lock className="w-7 h-7" />
          </div>

          <div className="text-center space-y-2">
            <span className="px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 text-xs font-mono font-bold">
              Institutional Cohort Policy
            </span>
            <h1 className="text-2xl font-extrabold text-[var(--text-main)] tracking-tight">
              Public Self-Registration is Closed
            </h1>
            <p className="text-sm text-[var(--text-muted)] leading-relaxed">
              LogicQ operates exclusively as an institutional competitive assessment arena. Accounts cannot be created publicly.
            </p>
          </div>

          <div className="bg-[var(--bg-surface)] border border-[var(--border-line)] rounded-xl p-4 text-xs font-mono space-y-3">
            <div className="flex items-start gap-2.5">
              <Users className="w-4 h-4 text-cyan-600 dark:text-cyan-400 flex-shrink-0 mt-0.5" />
              <div>
                <strong className="text-[var(--text-main)] block">Section Roster Enrollment:</strong>
                <span className="text-[var(--text-muted)]">Your course faculty instructor enrolls your official email or phone number directly into your academic section.</span>
              </div>
            </div>

            <div className="flex items-start gap-2.5">
              <BookOpen className="w-4 h-4 text-emerald-600 dark:text-emerald-400 flex-shrink-0 mt-0.5" />
              <div>
                <strong className="text-[var(--text-main)] block">Invitation Links:</strong>
                <span className="text-[var(--text-muted)]">If your instructor provided a Section QR Code or WhatsApp join link, open that link to complete your section entry.</span>
              </div>
            </div>
          </div>

          <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link
              to="/login"
              className="w-full sm:w-auto px-6 py-3 rounded-xl font-mono text-xs font-bold text-[#0C0F1F] bg-gradient-to-r from-cyan-400 to-emerald-400 hover:from-cyan-300 hover:to-emerald-300 shadow-md shadow-cyan-500/20 transition-all flex items-center justify-center gap-2"
            >
              <span>Sign In with Enrolled Email / Mobile (OTP)</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};
export default RegisterPage;
