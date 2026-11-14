import { useEffect, useState, useCallback, useRef } from 'react';
import { toast } from 'sonner';
import { useAuth } from '../context/AuthContext.js';

interface AntiScreenshotOptions {
  enabled?: boolean;
  blackoutOnBlur?: boolean;
  wipeClipboard?: boolean;
  blockPrint?: boolean;
  onScreenshotAttempt?: (reason: string) => void;
}

export function useAntiScreenshot(options: AntiScreenshotOptions = {}) {
  const {
    enabled = true,
    blackoutOnBlur = false,
    wipeClipboard = true,
    blockPrint = true,
    onScreenshotAttempt,
  } = options;

  let isAdminUser = false;
  try {
    const auth = useAuth();
    isAdminUser = Boolean(
      auth.isAdmin ||
      auth.user?.role === 'ADMIN' ||
      auth.user?.role === 'FACULTY' ||
      (auth.user?.email || '').toLowerCase().trim() === 'logicqarena@gmail.com' ||
      (auth.user?.prn || '').toUpperCase().trim() === 'LOGICQARENA'
    );
  } catch {
    // If invoked outside AuthProvider
  }

  const isPathAdmin = typeof window !== 'undefined' && (
    window.location.pathname.startsWith('/admin') ||
    window.location.pathname.startsWith('/faculty') ||
    localStorage.getItem('logicq_role') === 'ADMIN' ||
    localStorage.getItem('logicq_role') === 'FACULTY'
  );

  const isExempt = isAdminUser || isPathAdmin;

  const [isBlurred, setIsBlurred] = useState(false);
  const lastToastTimeRef = useRef<number>(0);

  // Keep body class synced for CSS exemption and active workspace rules
  useEffect(() => {
    if (typeof document !== 'undefined') {
      if (isExempt) {
        document.body.classList.add('is-admin');
        document.documentElement.classList.add('is-admin');
      } else {
        document.body.classList.remove('is-admin');
        document.documentElement.classList.remove('is-admin');
      }

      if (enabled && !isExempt) {
        document.body.classList.add('proctored-workspace-active');
        document.documentElement.classList.add('proctored-workspace-active');
      } else {
        document.body.classList.remove('proctored-workspace-active');
        document.documentElement.classList.remove('proctored-workspace-active');
      }
    }

    return () => {
      if (typeof document !== 'undefined') {
        document.body.classList.remove('proctored-workspace-active');
        document.documentElement.classList.remove('proctored-workspace-active');
      }
    };
  }, [enabled, isExempt]);

  const notifyBlocked = useCallback((reason: string) => {
    if (isExempt) return;
    const now = Date.now();
    // Throttle toasts to prevent spamming
    if (now - lastToastTimeRef.current > 1500) {
      lastToastTimeRef.current = now;
      toast.error('🚫 Screenshot Restricted', {
        description: 'Screen captures, snipping tools, and printing are disabled for academic integrity.',
        duration: 4000,
      });
    }
    if (wipeClipboard && typeof navigator !== 'undefined' && navigator.clipboard && navigator.clipboard.writeText) {
      try {
        navigator.clipboard.writeText('').catch(() => {});
      } catch {}
    }
    onScreenshotAttempt?.(reason);
  }, [isExempt, wipeClipboard, onScreenshotAttempt]);

  useEffect(() => {
    if (!enabled || isExempt) {
      setIsBlurred(false);
      return;
    }

    // Keyboard shortcut interceptor
    const handleKeyDown = (e: KeyboardEvent) => {
      const key = e.key ? e.key.toLowerCase() : '';
      const code = e.code ? e.code.toLowerCase() : '';

      // 1. Windows PrintScreen or PrtScn key
      if (
        key === 'printscreen' ||
        code === 'printscreen' ||
        e.keyCode === 44 ||
        key === 'snapshot'
      ) {
        e.preventDefault();
        e.stopPropagation();
        notifyBlocked('PRINTSCREEN_KEY');
        return false;
      }

      // 2. Windows Snipping Tool (Win + Shift + S) or Ctrl + Shift + S
      if (
        (key === 's' || code === 'keys') &&
        e.shiftKey &&
        (e.metaKey || e.ctrlKey || e.altKey)
      ) {
        e.preventDefault();
        e.stopPropagation();
        notifyBlocked('SNIPPING_TOOL_SHORTCUT');
        return false;
      }

      // 3. macOS Screenshot shortcuts (Cmd + Shift + 3, Cmd + Shift + 4, Cmd + Shift + 5)
      if (
        e.metaKey &&
        e.shiftKey &&
        (key === '3' || key === '4' || key === '5' || code === 'digit3' || code === 'digit4' || code === 'digit5')
      ) {
        e.preventDefault();
        e.stopPropagation();
        notifyBlocked('MAC_SCREENSHOT_SHORTCUT');
        return false;
      }

      // 4. Ctrl + P / Cmd + P (Print / Save PDF)
      if (blockPrint && (e.ctrlKey || e.metaKey) && (key === 'p' || code === 'keyp')) {
        e.preventDefault();
        e.stopPropagation();
        notifyBlocked('PRINT_SHORTCUT');
        return false;
      }
    };

    // Keyup listener: PrintScreen on Windows often only fires on keyup!
    const handleKeyUp = (e: KeyboardEvent) => {
      const key = e.key ? e.key.toLowerCase() : '';
      const code = e.code ? e.code.toLowerCase() : '';
      if (
        key === 'printscreen' ||
        code === 'printscreen' ||
        e.keyCode === 44 ||
        key === 'snapshot'
      ) {
        e.preventDefault();
        e.stopPropagation();
        notifyBlocked('PRINTSCREEN_KEYUP');
        return false;
      }
    };

    // Window focus loss / blur detection: Snipping Tool steals focus
    const handleWindowBlur = () => {
      if (blackoutOnBlur) {
        setIsBlurred(true);
      }
      if (wipeClipboard && typeof navigator !== 'undefined' && navigator.clipboard && navigator.clipboard.writeText) {
        try {
          navigator.clipboard.writeText('').catch(() => {});
        } catch {}
      }
    };

    const handleWindowFocus = () => {
      setIsBlurred(false);
    };

    const handleVisibilityChange = () => {
      if (document.hidden) {
        if (blackoutOnBlur) {
          setIsBlurred(true);
        }
        if (wipeClipboard && typeof navigator !== 'undefined' && navigator.clipboard && navigator.clipboard.writeText) {
          try {
            navigator.clipboard.writeText('').catch(() => {});
          } catch {}
        }
      } else {
        setIsBlurred(false);
      }
    };

    // Add event listeners (capture phase to intercept before any other handlers)
    window.addEventListener('keydown', handleKeyDown, true);
    window.addEventListener('keyup', handleKeyUp, true);
    window.addEventListener('blur', handleWindowBlur);
    window.addEventListener('focus', handleWindowFocus);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.removeEventListener('keydown', handleKeyDown, true);
      window.removeEventListener('keyup', handleKeyUp, true);
      window.removeEventListener('blur', handleWindowBlur);
      window.removeEventListener('focus', handleWindowFocus);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [enabled, isExempt, blackoutOnBlur, blockPrint, wipeClipboard, notifyBlocked]);

  return {
    isBlurred,
    setIsBlurred,
  };
}
