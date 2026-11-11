import React from 'react';
import { Link } from 'react-router-dom';
import { Logo } from '../common/Logo.js';
import { Phone, Mail, MapPin, ShieldCheck, Terminal, ExternalLink } from 'lucide-react';

export const Footer: React.FC = () => {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="border-t border-[var(--border-line)] bg-[var(--bg-panel)] py-12 px-4 sm:px-6 lg:px-8 mt-auto text-xs font-mono">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Main Footer Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
          {/* Col 1: Platform & Institutional Branding */}
          <div className="space-y-3">
            <Logo size="sm" showTagline={true} />
            <p className="text-[var(--text-muted)] text-xs leading-relaxed font-sans mt-2">
              Official continuous evaluation and low-level systems programming arena for Sanjivani University.
            </p>
            <div className="flex items-center gap-2 text-[11px] text-[var(--text-muted)]">
              <MapPin className="w-3.5 h-3.5 text-cyan-500 shrink-0" />
              <span>Sanjivani University, Kopargaon</span>
            </div>
          </div>

          {/* Col 2: Platform Links */}
          <div className="space-y-2.5">
            <div className="font-bold text-[var(--text-main)] uppercase tracking-wider text-[11px] flex items-center gap-1.5">
              <Terminal className="w-3.5 h-3.5 text-cyan-500" />
              <span>Developer Arena</span>
            </div>
            <ul className="space-y-2 text-[var(--text-muted)]">
              <li>
                <Link to="/practice" className="hover:text-cyan-500 dark:hover:text-cyan-400 transition-colors">
                  • Practice Modules
                </Link>
              </li>
              <li>
                <Link to="/compiler" className="hover:text-cyan-500 dark:hover:text-cyan-400 transition-colors">
                  • GCC C11 Sandbox
                </Link>
              </li>
              <li>
                <Link to="/instant-join" className="hover:text-cyan-500 dark:hover:text-cyan-400 transition-colors">
                  • Instant Test Join
                </Link>
              </li>
              <li>
                <Link to="/verify-report" className="hover:text-cyan-500 dark:hover:text-cyan-400 transition-colors">
                  • Verify Student Report
                </Link>
              </li>
            </ul>
          </div>

          {/* Col 3: Institutional & Privacy */}
          <div className="space-y-2.5">
            <div className="font-bold text-[var(--text-main)] uppercase tracking-wider text-[11px] flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
              <span>Governance</span>
            </div>
            <ul className="space-y-2 text-[var(--text-muted)]">
              <li>
                <Link to="/privacy" className="hover:text-cyan-500 dark:hover:text-cyan-400 transition-colors">
                  • Privacy & Security Policy
                </Link>
              </li>
              <li>
                <Link to="/how-to-install" className="hover:text-cyan-500 dark:hover:text-cyan-400 transition-colors">
                  • Install Desktop / Mobile PWA
                </Link>
              </li>
              <li>
                <a
                  href="https://sanjivani.edu.in"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-cyan-500 dark:hover:text-cyan-400 transition-colors inline-flex items-center gap-1"
                >
                  <span>• Sanjivani Portal</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </li>
            </ul>
          </div>

          {/* Col 4: Clickable Direct Support Contact */}
          <div className="space-y-2.5">
            <div className="font-bold text-[var(--text-main)] uppercase tracking-wider text-[11px]">
              Support &amp; Contact
            </div>
            <p className="text-[var(--text-muted)] text-xs font-sans">
              Have questions regarding lab evaluations or credentials?
            </p>
            <div className="space-y-2 pt-1">
              <a
                href="mailto:logicqarena@gmail.com"
                className="flex items-center gap-2 text-cyan-600 dark:text-cyan-400 hover:underline cursor-pointer group"
                title="Send an email to LogicQ Support"
              >
                <Mail className="w-3.5 h-3.5 shrink-0 group-hover:scale-110 transition-transform" />
                <span className="truncate">logicqarena@gmail.com</span>
              </a>
              <a
                href="tel:+912423228399"
                className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 hover:underline cursor-pointer group"
                title="Call Sanjivani Computer Engineering Department"
              >
                <Phone className="w-3.5 h-3.5 shrink-0 group-hover:scale-110 transition-transform" />
                <span>+91 2423 228399</span>
              </a>
            </div>
          </div>
        </div>

        {/* Bottom Bar: Copyright & Accreditation */}
        <div className="pt-6 border-t border-[var(--border-line)] flex flex-col sm:flex-row items-center justify-between gap-4 text-center sm:text-left text-[11px] text-[var(--text-muted)]">
          <p>
            &copy; {currentYear} LogicQ Academic Arena • Sanjivani University. All rights reserved.
          </p>
          <p className="text-[var(--color-accent)] font-semibold">
            Department of Computer Engineering • Built with Bitwise Club
          </p>
        </div>
      </div>
    </footer>
  );
};
