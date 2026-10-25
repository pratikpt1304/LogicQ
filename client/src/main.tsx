import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'sonner';
import { AuthProvider } from './context/AuthContext.js';
import { SocketProvider } from './context/SocketContext.js';
import { ThemeProvider, useTheme } from './context/ThemeContext.js';
import { App } from './App.js';
import './index.css';
import { RealtimeSyncService } from './services/realtimeSync.service.js';

// Rate-limited, privacy-scrubbed client error reporter (posts to /api/support/error-report)
let reportedCount = 0;
function reportClientError(message: string, stack?: string) {
  if (reportedCount >= 3) return;
  reportedCount++;
  try {
    // Scrub any potential tokens, emails, or 12-digit PRNs before reporting
    const scrub = (s: string) =>
      s
        .replace(/Bearer\s+[A-Za-z0-9._-]+/gi, 'Bearer [REDACTED]')
        .replace(/\b\d{12}\b/g, '[PRN_REDACTED]')
        .replace(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, '[EMAIL_REDACTED]');

    fetch('/api/support/error-report', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        route: window.location.pathname,
        message: scrub(String(message || 'Unknown error')).slice(0, 400),
        stack: stack ? scrub(String(stack)).slice(0, 1500) : undefined,
      }),
    }).catch(() => {});
  } catch {
    // ignore
  }
}

if (typeof window !== 'undefined') {
  window.addEventListener('error', (event) => {
    reportClientError(event.message || 'Window error', event.error?.stack);
  });
  window.addEventListener('unhandledrejection', (event) => {
    const reason = event.reason;
    reportClientError(
      reason?.message || String(reason || 'Unhandled promise rejection'),
      reason?.stack
    );
  });
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: true, // Auto-sync immediately when switching tabs between Admin/Faculty/Student
      staleTime: 5000, // 5 seconds high-freshness cache for real-time responsiveness
      retry: 1,
    },
  },
});

// Initialize multi-tab & Firestore cross-portal real-time mesh
RealtimeSyncService.init(queryClient);

const ThemedToaster: React.FC = () => {
  const { theme } = useTheme();
  const [isMobile, setIsMobile] = React.useState(() =>
    typeof window !== 'undefined' ? window.innerWidth < 768 : false
  );

  React.useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <Toaster
      theme={theme}
      position={isMobile ? 'bottom-center' : 'top-right'}
      closeButton
      richColors
      offset={isMobile ? 'calc(env(safe-area-inset-bottom, 0px) + 16px)' : '130px'}
      toastOptions={{
        className: 'font-mono text-xs sm:text-sm rounded-xl shadow-2xl border',
        style: {
          fontFamily: "'JetBrains Mono', monospace",
          backgroundColor: 'var(--bg-panel)',
          color: 'var(--text-main)',
          borderColor: 'var(--border-line)',
        },
      }}
    />
  );
};

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <ThemeProvider>
          <AuthProvider>
            <SocketProvider>
              <App />
              <ThemedToaster />
            </SocketProvider>
          </AuthProvider>
        </ThemeProvider>
      </BrowserRouter>
    </QueryClientProvider>
  </React.StrictMode>
);
