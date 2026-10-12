import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { RefreshCw, Share, X, Smartphone } from 'lucide-react';

const DISMISS_KEY = 'logicq_pwa_prompt_dismissed_at';
const COOLDOWN_MS = 14 * 24 * 60 * 60 * 1000; // 14 days

let deferredInstallPrompt: any = null;
const listeners = new Set<() => void>();
let showIosTipModal = false;

function notifyListeners() {
  listeners.forEach((fn) => fn());
}

export function isIosSafari(): boolean {
  if (typeof window === 'undefined') return false;
  const ua = window.navigator.userAgent || '';
  const isIOS = /iPad|iPhone|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const isWebkit = /WebKit/.test(ua);
  const isCriOS = /CriOS|FxiOS|EdgiOS/.test(ua);
  return isIOS && isWebkit && !isCriOS;
}

export function isDismissedRecently(): boolean {
  try {
    const raw = localStorage.getItem(DISMISS_KEY);
    if (!raw) return false;
    const ts = Number(raw);
    if (Number.isNaN(ts)) return false;
    return Date.now() - ts < COOLDOWN_MS;
  } catch {
    return false;
  }
}

export function recordPwaPromptDismissal(): void {
  try {
    localStorage.setItem(DISMISS_KEY, String(Date.now()));
  } catch {
    // ignore
  }
  showIosTipModal = false;
  notifyListeners();
}

export function useIsStandalonePwa(): boolean {
  const [standalone, setStandalone] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return (
      window.matchMedia?.('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone === true
    );
  });

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const mq = window.matchMedia('(display-mode: standalone)');
    const handler = (e: MediaQueryListEvent) => setStandalone(e.matches);
    mq.addEventListener?.('change', handler);
    return () => mq.removeEventListener?.('change', handler);
  }, []);

  return standalone;
}

export async function triggerPwaInstallPrompt(): Promise<'installed' | 'dismissed' | 'ios-tip' | 'unavailable'> {
  if (deferredInstallPrompt) {
    try {
      deferredInstallPrompt.prompt();
      const choice = await deferredInstallPrompt.userChoice;
      deferredInstallPrompt = null;
      if (choice?.outcome === 'dismissed') {
        recordPwaPromptDismissal();
        return 'dismissed';
      }
      notifyListeners();
      return 'installed';
    } catch {
      return 'unavailable';
    }
  }

  if (isIosSafari()) {
    showIosTipModal = true;
    notifyListeners();
    return 'ios-tip';
  }

  showIosTipModal = true;
  notifyListeners();
  return 'ios-tip';
}

export async function clearPwaUserCachesAndDrafts(): Promise<void> {
  try {
    // Remove saved C code drafts and auth tokens from localStorage
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (
        k &&
        (k.startsWith('logicq_draft_') ||
          k.startsWith('logicq_code_') ||
          k === 'logicq_access_token' ||
          k === 'logicq_current_user_id')
      ) {
        keysToRemove.push(k);
      }
    }
    keysToRemove.forEach((k) => localStorage.removeItem(k));
  } catch {
    // ignore
  }

  try {
    if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
      navigator.serviceWorker.controller.postMessage({ type: 'CLEAR_USER_CACHE' });
    }
  } catch {
    // ignore
  }
}

export const PwaManager: React.FC = () => {
  const isStandalone = useIsStandalonePwa();
  const [waitingWorker, setWaitingWorker] = useState<ServiceWorker | null>(null);
  const [, setTick] = useState(0);

  useEffect(() => {
    const rerender = () => setTick((t) => t + 1);
    listeners.add(rerender);

    const onBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      deferredInstallPrompt = e;
      notifyListeners();
    };

    window.addEventListener('beforeinstallprompt', onBeforeInstallPrompt);

    // Register Service Worker ONLY in production builds so local Vite HMR is never cached
    if (import.meta.env.PROD && 'serviceWorker' in navigator) {
      navigator.serviceWorker
        .register('/sw.js', { scope: '/' })
        .then((registration) => {
          if (registration.waiting) {
            setWaitingWorker(registration.waiting);
          }
          registration.addEventListener('updatefound', () => {
            const installing = registration.installing;
            if (!installing) return;
            installing.addEventListener('statechange', () => {
              if (installing.state === 'installed' && navigator.serviceWorker.controller) {
                setWaitingWorker(installing);
              }
            });
          });
        })
        .catch(() => {
          // Do not log noisy SW errors in restricted preview frames
        });
    }

    return () => {
      listeners.delete(rerender);
      window.removeEventListener('beforeinstallprompt', onBeforeInstallPrompt);
    };
  }, []);

  const handleApplySwUpdate = () => {
    if (!waitingWorker) return;
    waitingWorker.postMessage({ type: 'SKIP_WAITING' });
    setWaitingWorker(null);
    window.location.reload();
  };

  return (
    <>
      {/* Non-blocking Service Worker Update Banner ("New version available — Refresh") */}
      {waitingWorker && (
        <div
          role="status"
          aria-live="polite"
          className="fixed bottom-4 right-4 z-50 max-w-sm rounded-xl bg-[var(--bg-panel)] border border-[var(--color-accent)] shadow-2xl p-3.5 flex items-center justify-between gap-3"
        >
          <div className="text-xs text-[var(--text-main)] font-medium">
            New version available — Refresh when ready
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={handleApplySwUpdate}
              className="inline-flex items-center gap-1.5 min-h-[36px] px-3 py-1.5 rounded-lg bg-[var(--color-accent)] text-[#0C0F1F] text-xs font-bold hover:opacity-95 transition-opacity"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Refresh</span>
            </button>
            <button
              type="button"
              aria-label="Dismiss update notice"
              onClick={() => setWaitingWorker(null)}
              className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-main)]"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* iOS / Manual Install Tip Modal (opened only when user taps "Install LogicQ") */}
      {!isStandalone && showIosTipModal && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Install LogicQ on your phone"
          className="fixed inset-0 z-50 bg-black/60 flex items-end sm:items-center justify-center p-4"
        >
          <div className="w-full max-w-md rounded-2xl bg-[var(--bg-panel)] border border-[var(--border-line)] p-5 shadow-2xl space-y-4">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-line)] flex items-center justify-center text-[var(--color-accent)]">
                  <Smartphone className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base font-heading font-bold text-[var(--text-main)]">
                    Install LogicQ
                  </h2>
                  <p className="text-xs text-[var(--text-muted)]">
                    Add LogicQ to your home screen
                  </p>
                </div>
              </div>
              <button
                type="button"
                aria-label="Dismiss install tip"
                onClick={recordPwaPromptDismissal}
                className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-lg text-[var(--text-muted)] hover:text-[var(--text-main)]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="rounded-xl bg-[var(--bg-surface)] border border-[var(--border-line)] p-3.5 text-xs text-[var(--text-main)] space-y-2">
              <p className="flex items-center gap-2 font-semibold">
                <Share className="w-4 h-4 text-[var(--color-accent)] shrink-0" />
                <span>On iPhone / iPad Safari: Tap Share, then Add to Home Screen.</span>
              </p>
              <p className="text-[var(--text-muted)]">
                On Android Chrome: Tap the browser menu (⋮) and choose <strong>Install app</strong>.
              </p>
            </div>

            <div className="flex items-center justify-between gap-3 pt-1">
              <Link
                to="/how-to-install"
                onClick={() => {
                  showIosTipModal = false;
                  notifyListeners();
                }}
                className="text-xs font-semibold text-[var(--color-accent)] hover:underline"
              >
                Full installation guide →
              </Link>
              <button
                type="button"
                onClick={recordPwaPromptDismissal}
                className="min-h-[44px] px-4 py-2 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-line)] text-xs font-semibold text-[var(--text-main)]"
              >
                Got it
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
