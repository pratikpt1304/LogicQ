import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ShieldCheck, Cookie, Check, X } from 'lucide-react';

const CONSENT_STORAGE_KEY = 'logicq_storage_consent_v1';

export const CookieConsentBanner: React.FC = () => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    try {
      const consent = localStorage.getItem(CONSENT_STORAGE_KEY);
      if (!consent) {
        // Small delay so it slides up gently after initial load
        const timer = setTimeout(() => setIsVisible(true), 1200);
        return () => clearTimeout(timer);
      }
    } catch {
      // Ignore storage access errors in private mode
    }
  }, []);

  const handleAccept = () => {
    try {
      localStorage.setItem(CONSENT_STORAGE_KEY, 'accepted');
    } catch {
      // Ignore
    }
    setIsVisible(false);
  };

  if (!isVisible) return null;

  return (
    <div
      role="region"
      aria-label="Privacy and Storage Consent"
      className="fixed bottom-4 sm:bottom-6 left-4 right-4 sm:left-auto sm:right-6 sm:max-w-md z-50 animate-in slide-in-from-bottom-5 fade-in duration-300 font-sans"
    >
      <div className="relative overflow-hidden rounded-2xl sm:rounded-3xl border border-slate-200/90 dark:border-white/10 bg-white/95 dark:bg-[#121622]/95 backdrop-blur-2xl p-4 sm:p-5 shadow-2xl shadow-indigo-950/20 text-slate-800 dark:text-slate-100 space-y-3.5">
        {/* Top Header */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
              <Cookie className="w-4 h-4" />
            </div>
            <div>
              <h4 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                <span>Privacy &amp; Data Storage</span>
                <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-mono font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                  DPDP Act Compliant
                </span>
              </h4>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-snug mt-0.5">
                Zero third-party tracking or advertising pixels.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleAccept}
            className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg transition cursor-pointer"
            title="Dismiss consent notice"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Concise Description */}
        <p className="text-[11px] text-slate-600 dark:text-slate-300 leading-relaxed">
          LogicQ uses strictly essential browser cookies and local storage to preserve your C editor drafts, calculate marks, and keep test sessions secure.
        </p>

        {/* Action Buttons */}
        <div className="flex items-center justify-between gap-2 pt-1 border-t border-slate-100 dark:border-white/5 text-xs">
          <Link
            to="/privacy"
            onClick={() => setIsVisible(false)}
            className="text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 hover:underline inline-flex items-center gap-1"
          >
            <ShieldCheck className="w-3 h-3" />
            <span>Privacy Policy</span>
          </Link>

          <button
            type="button"
            onClick={handleAccept}
            className="px-4 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs transition active:scale-95 shadow-xs flex items-center gap-1.5 cursor-pointer"
          >
            <Check className="w-3.5 h-3.5" />
            <span>Accept &amp; Continue</span>
          </button>
        </div>
      </div>
    </div>
  );
};
