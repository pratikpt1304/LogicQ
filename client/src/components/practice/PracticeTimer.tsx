import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Clock, CheckCircle2, Eye, EyeOff, Volume2 } from 'lucide-react';
import { api } from '../../api/client.js';
import { getDeviceLabel } from '../../services/draftSync.service.js';

export interface PracticeTimerProps {
  problemId: string;
  initialActiveSeconds?: number;
  isSolved?: boolean;
  timeToSolveSeconds?: number | null;
  hideTimerPreference?: boolean;
  onSyncComplete?: (data: any) => void;
}

export interface PracticeTimerHandle {
  syncNow: (reason?: string) => Promise<void>;
  getActiveSeconds: () => number;
}

export function formatPracticeTime(seconds: number): string {
  if (isNaN(seconds) || seconds < 0) return '00:00';
  const totalSeconds = Math.floor(seconds);
  const hrs = Math.floor(totalSeconds / 3600);
  const mins = Math.floor((totalSeconds % 3600) / 60);
  const secs = totalSeconds % 60;

  if (hrs > 0) {
    return `${hrs}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  }
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

export const PracticeTimer = React.forwardRef<PracticeTimerHandle, PracticeTimerProps>(
  (
    {
      problemId,
      initialActiveSeconds = 0,
      isSolved = false,
      timeToSolveSeconds = null,
      hideTimerPreference = false,
      onSyncComplete,
    },
    ref
  ) => {
    // Current total active seconds (resumes from DB/initial value)
    const [activeSeconds, setActiveSeconds] = useState<number>(() => {
      if (isSolved && timeToSolveSeconds !== null && timeToSolveSeconds !== undefined) {
        return timeToSolveSeconds;
      }
      return initialActiveSeconds || 0;
    });

    // Local toggle override (defaults to profile preference)
    const [isVisuallyHidden, setIsVisuallyHidden] = useState<boolean>(hideTimerPreference);
    const [screenReaderAnnouncement, setScreenReaderAnnouncement] = useState<string>('');

    // Keep unsynced delta seconds in a ref so periodic / event-driven sync can flush it
    const unsyncedDeltaRef = useRef<number>(0);
    const lastActiveTimestampRef = useRef<number>(Date.now());
    const isSolvedRef = useRef<boolean>(isSolved);
    const activeSecondsRef = useRef<number>(activeSeconds);
    const isSyncingRef = useRef<boolean>(false);

    // Activity threshold: 2 minutes (120,000 ms) of no keyboard/mouse/touch
    const INACTIVITY_TIMEOUT_MS = 120_000;

    // Update refs when props change
    useEffect(() => {
      isSolvedRef.current = isSolved;
      if (isSolved && timeToSolveSeconds !== null && timeToSolveSeconds !== undefined) {
        setActiveSeconds(timeToSolveSeconds);
        activeSecondsRef.current = timeToSolveSeconds;
      }
    }, [isSolved, timeToSolveSeconds]);

    useEffect(() => {
      setIsVisuallyHidden(hideTimerPreference);
    }, [hideTimerPreference]);

    useEffect(() => {
      activeSecondsRef.current = activeSeconds;
    }, [activeSeconds]);

    // Anti-tamper delta sync function
    const syncDeltaToServer = useCallback(
      async (reason: string = 'interval', isBeacon = false) => {
        const delta = unsyncedDeltaRef.current;
        if (delta <= 0 || !problemId || isSolvedRef.current) return;

        // Reset unsynced delta locally
        unsyncedDeltaRef.current = 0;

        const payload = {
          problemId,
          deltaSeconds: delta,
          clientTimestamp: Date.now(),
          deviceLabel: getDeviceLabel(),
          reason,
        };

        const token = localStorage.getItem('logicq_access_token');
        const apiBase = (
          import.meta.env.VITE_API_BASE_URL ||
          import.meta.env.VITE_API_URL ||
          '/api'
        ).replace(/\/$/, '');
        const targetUrl = `${apiBase}/practice/timer-sync`;

        if (isBeacon && typeof navigator !== 'undefined') {
          // Use fetch with keepalive if possible to preserve Authorization header
          try {
            fetch(targetUrl, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                ...(token ? { Authorization: `Bearer ${token}` } : {}),
              },
              body: JSON.stringify(payload),
              keepalive: true,
            }).catch(() => {});
            return;
          } catch {
            // fallback to sendBeacon if fetch keepalive fails
          }

          if (navigator.sendBeacon) {
            const blob = new Blob([JSON.stringify(payload)], { type: 'application/json' });
            navigator.sendBeacon(targetUrl, blob);
            return;
          }
        }

        // Standard in-flight API sync
        if (isSyncingRef.current) {
          // Return delta back to buffer if collision
          unsyncedDeltaRef.current += delta;
          return;
        }

        isSyncingRef.current = true;
        try {
          const res: any = await api.post('/practice/timer-sync', payload);
          if (res?.data && onSyncComplete) {
            onSyncComplete(res.data);
          }
        } catch (err) {
          // Put delta back so next sync cycle flushes it
          unsyncedDeltaRef.current += delta;
        } finally {
          isSyncingRef.current = false;
        }
      },
      [problemId, onSyncComplete]
    );

    // Expose imperative handle for manual sync before submit
    React.useImperativeHandle(
      ref,
      () => ({
        syncNow: async (reason = 'submit') => {
          await syncDeltaToServer(reason);
        },
        getActiveSeconds: () => activeSecondsRef.current,
      }),
      [syncDeltaToServer]
    );

    // User activity listeners: keyboard, mouse, touch, scroll, focus
    useEffect(() => {
      const handleUserActivity = () => {
        lastActiveTimestampRef.current = Date.now();
      };

      const activityEvents = ['keydown', 'mousedown', 'mousemove', 'touchstart', 'scroll', 'click'];
      activityEvents.forEach((evt) => {
        window.addEventListener(evt, handleUserActivity, { passive: true });
      });

      return () => {
        activityEvents.forEach((evt) => {
          window.removeEventListener(evt, handleUserActivity);
        });
      };
    }, []);

    // 1-second interval ticker for active time accumulation
    useEffect(() => {
      if (isSolved) return;

      const ticker = setInterval(() => {
        const now = Date.now();
        const isTabVisible = document.visibilityState === 'visible';
        const isUserActive = now - lastActiveTimestampRef.current < INACTIVITY_TIMEOUT_MS;

        if (isTabVisible && isUserActive && !isSolvedRef.current) {
          setActiveSeconds((prev) => prev + 1);
          unsyncedDeltaRef.current += 1;
        }
      }, 1000);

      return () => clearInterval(ticker);
    }, [isSolved]);

    // Periodic sync: every 120 seconds (2 minutes)
    useEffect(() => {
      if (isSolved) return;

      const periodicSync = setInterval(() => {
        syncDeltaToServer('periodic_120s');
      }, 120_000);

      return () => clearInterval(periodicSync);
    }, [isSolved, syncDeltaToServer]);

    // Event-driven sync on visibility change, pagehide, and beforeunload
    useEffect(() => {
      const handleVisibilityChange = () => {
        if (document.visibilityState === 'hidden') {
          syncDeltaToServer('visibility_hidden');
        } else {
          lastActiveTimestampRef.current = Date.now();
        }
      };

      const handlePageHide = () => {
        syncDeltaToServer('pagehide', true);
      };

      const handleBeforeUnload = () => {
        syncDeltaToServer('beforeunload', true);
      };

      document.addEventListener('visibilitychange', handleVisibilityChange);
      window.addEventListener('pagehide', handlePageHide);
      window.addEventListener('beforeunload', handleBeforeUnload);

      return () => {
        document.removeEventListener('visibilitychange', handleVisibilityChange);
        window.removeEventListener('pagehide', handlePageHide);
        window.removeEventListener('beforeunload', handleBeforeUnload);
        // Flush remaining buffer on component unmount
        syncDeltaToServer('unmount', true);
      };
    }, [syncDeltaToServer]);

    const handleAnnounceTime = () => {
      const formatted = formatPracticeTime(activeSeconds);
      const text = isSolved
        ? `Problem was solved in ${formatted}.`
        : `Active time spent on this problem is ${formatted}.`;
      setScreenReaderAnnouncement(text);
      // clear after 4 seconds
      setTimeout(() => setScreenReaderAnnouncement(''), 4000);
    };

    const formattedTime = formatPracticeTime(activeSeconds);

    return (
      <div
        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[var(--bg-surface)]/80 border border-[var(--border-line)] text-xs font-mono select-none transition-colors"
        role="region"
        aria-label="Practice problem active timer"
      >
        {/* Screen Reader On-Demand Announcement Banner */}
        <div aria-live="polite" aria-atomic="true" className="sr-only">
          {screenReaderAnnouncement}
        </div>

        {/* Status Icon */}
        {isSolved ? (
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" aria-hidden="true" />
        ) : (
          <Clock className="w-3.5 h-3.5 text-cyan-400 shrink-0 animate-pulse" aria-hidden="true" />
        )}

        {/* Timer Display or Hidden Placeholder */}
        {isVisuallyHidden ? (
          <span className="text-[var(--text-muted)] text-[11px] font-sans">Timer hidden</span>
        ) : isSolved ? (
          <span className="text-emerald-400 font-semibold tracking-tight">
            Solved in {formattedTime}
          </span>
        ) : (
          <span className="text-[var(--text-main)] font-semibold tabular-nums tracking-tight min-w-[42px] text-center">
            {formattedTime}
          </span>
        )}

        {/* Toggle Visibility Button */}
        <button
          type="button"
          onClick={() => setIsVisuallyHidden((prev) => !prev)}
          className="p-0.5 rounded hover:bg-[var(--bg-main)] text-[var(--text-muted)] hover:text-[var(--text-main)] transition-colors ml-0.5"
          title={isVisuallyHidden ? 'Show active timer' : 'Hide timer display'}
          aria-label={isVisuallyHidden ? 'Show active timer display' : 'Hide active timer display'}
        >
          {isVisuallyHidden ? (
            <EyeOff className="w-3 h-3 text-[var(--text-muted)]" />
          ) : (
            <Eye className="w-3 h-3 text-[var(--text-muted)]" />
          )}
        </button>

        {/* Screen Reader On-Request Announce Button */}
        <button
          type="button"
          onClick={handleAnnounceTime}
          className="sr-only focus:not-sr-only focus:px-1.5 focus:py-0.5 focus:bg-[var(--accent)] focus:text-white focus:rounded focus:text-[10px]"
          aria-label="Announce elapsed active time to screen reader"
        >
          <Volume2 className="w-3 h-3 inline mr-1" />
          Announce time
        </button>
      </div>
    );
  }
);

PracticeTimer.displayName = 'PracticeTimer';
