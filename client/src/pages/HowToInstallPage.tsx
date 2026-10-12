import React from 'react';
import { Link } from 'react-router-dom';
import { Smartphone, Share, PlusSquare, CheckCircle2, ArrowLeft, Download } from 'lucide-react';
import { triggerPwaInstallPrompt, useIsStandalonePwa } from '../components/common/PwaManager.js';

export const HowToInstallPage: React.FC = () => {
  const isStandalone = useIsStandalonePwa();

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[var(--bg-surface)] border border-[var(--border-line)] text-[var(--color-accent)] text-xs font-mono font-semibold mb-3">
            <Smartphone className="w-3.5 h-3.5" />
            Mobile Progressive Web App (PWA)
          </span>
          <h1 className="text-2xl sm:text-3xl font-heading font-extrabold text-[var(--text-main)]">
            Install LogicQ on Your Phone
          </h1>
          <p className="text-sm text-[var(--text-muted)] mt-1">
            Add LogicQ to your home screen for a fast, full-screen standalone experience with instant access to today’s 17:00 IST Daily Challenge.
          </p>
        </div>

        <Link
          to="/dashboard"
          className="inline-flex items-center gap-2 min-h-[44px] px-4 py-2 rounded-xl bg-[var(--bg-panel)] border border-[var(--border-line)] text-sm font-semibold text-[var(--text-main)] hover:border-[var(--color-accent)] transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Home</span>
        </Link>
      </div>

      {isStandalone ? (
        <div className="rounded-2xl bg-[var(--bg-panel)] border border-[var(--color-success)] p-6 flex items-center gap-3">
          <CheckCircle2 className="w-6 h-6 text-[var(--color-success)] shrink-0" />
          <div>
            <h2 className="text-base font-bold text-[var(--text-main)]">
              LogicQ is already running as an installed app
            </h2>
            <p className="text-xs text-[var(--text-muted)] mt-0.5">
              You are viewing LogicQ in standalone home-screen mode.
            </p>
          </div>
        </div>
      ) : (
        <div className="rounded-2xl bg-[var(--bg-panel)] border border-[var(--border-line)] p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-base font-bold text-[var(--text-main)]">
              Quick Install (Android Chrome / Desktop Edge & Chrome)
            </h2>
            <p className="text-xs text-[var(--text-muted)] mt-1">
              If your browser supports one-tap installation, tap the button to install LogicQ directly.
            </p>
          </div>
          <button
            type="button"
            onClick={() => triggerPwaInstallPrompt()}
            className="inline-flex items-center justify-center gap-2 min-h-[44px] px-5 py-2.5 rounded-xl bg-[var(--color-accent)] text-[#0C0F1F] font-bold text-sm hover:opacity-95 transition-opacity shrink-0"
          >
            <Download className="w-4 h-4" />
            <span>Install LogicQ</span>
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Android Chrome */}
        <section className="rounded-2xl bg-[var(--bg-panel)] border border-[var(--border-line)] p-6 space-y-4">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-line)] flex items-center justify-center text-[var(--color-success)] font-mono font-bold text-sm">
              1
            </div>
            <div>
              <h2 className="text-lg font-heading font-bold text-[var(--text-main)]">
                Android (Chrome)
              </h2>
              <p className="text-xs text-[var(--text-muted)]">Installs as a full WebAPK on your home screen</p>
            </div>
          </div>

          <ol className="space-y-3 text-sm text-[var(--text-main)] list-decimal list-inside">
            <li>
              Open <strong>LogicQ</strong> in <strong>Google Chrome</strong> on your Android phone.
            </li>
            <li>
              Open your profile menu in the top bar and tap <strong>Install LogicQ</strong> (or tap the Chrome <strong>⋮</strong> menu in the top-right corner).
            </li>
            <li>
              Select <strong>Install app</strong> or <strong>Add to Home screen</strong> and confirm.
            </li>
            <li>
              Launch <strong>LogicQ</strong> from your home screen — it opens directly to your Dashboard in full-screen standalone mode.
            </li>
          </ol>
        </section>

        {/* iOS Safari */}
        <section className="rounded-2xl bg-[var(--bg-panel)] border border-[var(--border-line)] p-6 space-y-4">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-line)] flex items-center justify-center text-[var(--color-accent)] font-mono font-bold text-sm">
              2
            </div>
            <div>
              <h2 className="text-lg font-heading font-bold text-[var(--text-main)]">
                iPhone & iPad (Safari)
              </h2>
              <p className="text-xs text-[var(--text-muted)]">Uses iOS Safari Add to Home Screen</p>
            </div>
          </div>

          <ol className="space-y-3 text-sm text-[var(--text-main)] list-decimal list-inside">
            <li>
              Open <strong>LogicQ</strong> in <strong>Safari</strong> on iOS / iPadOS.
            </li>
            <li className="flex items-start gap-2">
              <span>
                Tap the <strong>Share</strong> button (<Share className="w-3.5 h-3.5 inline text-[var(--color-accent)]" />) in the bottom Safari toolbar.
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span>
                Scroll down and tap <strong>Add to Home Screen</strong> (<PlusSquare className="w-3.5 h-3.5 inline text-[var(--color-success)]" />).
              </span>
            </li>
            <li>
              Tap <strong>Add</strong> in the top-right corner. LogicQ will appear on your home screen with its dark brand icon.
            </li>
          </ol>
        </section>
      </div>
    </div>
  );
};
