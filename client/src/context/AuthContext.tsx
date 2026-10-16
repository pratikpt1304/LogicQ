import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import { User } from '../types/index.js';
import { api } from '../api/client.js';
import {
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  onAuthStateChanged,
  User as FirebaseUser,
} from 'firebase/auth';
import { auth as firebaseAuth, googleAuthProvider } from '../config/firebase.js';
import { FirestoreDataService } from '../services/firestoreData.service.js';
import { isExplicitAdminEmail } from '../api/fallbackEngine.js';

export type AuthState = 'loading' | 'signedIn' | 'signedOut';

export interface RegisterPayload {
  fullName?: string;
  displayName?: string;
  prn: string;
  college: string;
  department: string;
  year: string;
  division?: string;
  email: string;
  password: string;
  confirmPassword?: string;
}

export interface CompleteProfilePayload {
  prn: string;
  fullName?: string;
  displayName?: string;
  college: string;
  department: string;
  year: string;
  division?: string;
}

interface AuthContextType {
  authState: AuthState;
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  isAdmin: boolean;
  isChecker: boolean;
  isOffline: boolean;
  login: (identifier: string, password: string) => Promise<User>;
  loginWithGoogle: () => Promise<User>;
  register: (data: RegisterPayload) => Promise<User>;
  completeProfile: (data: CompleteProfilePayload) => Promise<User>;
  logout: (reason?: string) => Promise<void>;
  logoutAllDevices: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

// Inactivity Limits (Master Spec & Logout Audit):
// - Students: 7 days idle timeout (replaces overly aggressive 30m)
// - Checkers: 8 hours idle timeout
// - Admins: 2 hours idle timeout (replaces legacy 30m)
export const STUDENT_INACTIVITY_LIMIT_MS = 7 * 24 * 60 * 60 * 1000; // 7 days
export const CHECKER_INACTIVITY_LIMIT_MS = 8 * 60 * 60 * 1000; // 8 hours
export const ADMIN_INACTIVITY_LIMIT_MS = 2 * 60 * 60 * 1000; // 2 hours
export const IDLE_WARNING_THRESHOLD_MS = 2 * 60 * 1000; // 2 minutes pre-warning

export type LogoutReason =
  | 'manual'
  | 'idle-timeout'
  | 'token-refresh-failed'
  | 'revoked-by-user'
  | 'revoked-by-admin'
  | 'role-changed'
  | 'banned'
  | 'app-check-failed'
  | 'unusual-login-flag'
  | 'multi-tab-sync'
  | 'service-worker-update'
  | 'unknown';

export const REASON_MESSAGES: Record<LogoutReason, string> = {
  'manual': 'You have successfully signed out.',
  'idle-timeout': 'You were signed out because your session was inactive.',
  'token-refresh-failed': 'Your session could not be renewed. Please sign in again.',
  'revoked-by-user': 'Your session was ended from another device.',
  'revoked-by-admin': 'Your session was terminated by an administrator.',
  'role-changed': 'Your account role was updated. Please sign in again.',
  'banned': 'Your account has been suspended.',
  'app-check-failed': 'Security verification failed. Please sign in again.',
  'unusual-login-flag': 'Unusual login activity detected. Please sign in again.',
  'multi-tab-sync': 'You signed out from another tab.',
  'service-worker-update': 'Application updated. Please sign in again.',
  'unknown': 'You were signed out. Please sign in again.',
};

export const STORAGE_KEYS = {
  ACTIVE_USER: 'logicq_active_user',
  ACCESS_TOKEN: 'logicq_access_token',
  LAST_ACTIVITY: 'logicq_last_activity',
  LOGOUT_EVENT: 'logicq_logout_event',
  LOGOUT_NOTICE: 'logicq_logout_notice',
} as const;

export function getInactivityLimit(role?: string): number {
  if (role === 'ADMIN') return ADMIN_INACTIVITY_LIMIT_MS;
  if (role === 'CHECKER') return CHECKER_INACTIVITY_LIMIT_MS;
  return STUDENT_INACTIVITY_LIMIT_MS;
}

export function normalizeLogoutReason(rawReason?: string): { reason: LogoutReason; message: string } {
  if (!rawReason) {
    return { reason: 'unknown', message: REASON_MESSAGES.unknown };
  }
  const clean = rawReason.toLowerCase();
  if (clean in REASON_MESSAGES) {
    const code = clean as LogoutReason;
    return { reason: code, message: REASON_MESSAGES[code] };
  }
  if (clean.includes('idle') || clean.includes('inactiv') || clean.includes('timeout')) {
    return { reason: 'idle-timeout', message: REASON_MESSAGES['idle-timeout'] };
  }
  if (clean.includes('ban') || clean.includes('suspend')) {
    return { reason: 'banned', message: REASON_MESSAGES['banned'] };
  }
  if (clean.includes('role')) {
    return { reason: 'role-changed', message: REASON_MESSAGES['role-changed'] };
  }
  if (clean.includes('revok')) {
    return { reason: 'revoked-by-user', message: REASON_MESSAGES['revoked-by-user'] };
  }
  if (clean.includes('token') || clean.includes('refresh') || clean.includes('unauthor')) {
    return { reason: 'token-refresh-failed', message: REASON_MESSAGES['token-refresh-failed'] };
  }
  if (clean.includes('tab')) {
    return { reason: 'multi-tab-sync', message: REASON_MESSAGES['multi-tab-sync'] };
  }
  if (clean.includes('manual') || clean.includes('user')) {
    return { reason: 'manual', message: REASON_MESSAGES['manual'] };
  }
  return { reason: 'unknown', message: rawReason || REASON_MESSAGES.unknown };
}

export function isSessionExpiredByInactivity(user: { role?: string } | null): boolean {
  if (!user) return false;
  const rawLastActivity = localStorage.getItem(STORAGE_KEYS.LAST_ACTIVITY);
  if (!rawLastActivity) return false;
  const lastActiveTime = Number(rawLastActivity);
  if (!Number.isFinite(lastActiveTime) || lastActiveTime <= 0) return false;
  const elapsed = Date.now() - lastActiveTime;
  const limit = getInactivityLimit(user.role);
  return elapsed > limit;
}

export function recordUserActivity(): void {
  try {
    localStorage.setItem(STORAGE_KEYS.LAST_ACTIVITY, String(Date.now()));
  } catch {
    // Ignore localStorage write failures in restricted environments
  }
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Read initial user from persistent storage to eliminate screen flash
const getCachedUser = (): User | null => {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.ACTIVE_USER);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [authState, setAuthState] = useState<AuthState>('loading');
  const [user, setUser] = useState<User | null>(getCachedUser);
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [idleWarningSeconds, setIdleWarningSeconds] = useState<number | null>(null);

  const lastActivityRecordedRef = useRef<number>(Date.now());
  const isMountedRef = useRef(true);
  const firestoreUnsubRef = useRef<(() => void) | null>(null);

  const persistUser = (userData: User | null) => {
    let finalUser = userData;
    if (finalUser && isExplicitAdminEmail(finalUser.email)) {
      finalUser = {
        ...finalUser,
        role: 'ADMIN',
        profileComplete: true,
      };
    }
    if (finalUser) {
      try {
        localStorage.setItem(STORAGE_KEYS.ACTIVE_USER, JSON.stringify(finalUser));
        recordUserActivity();
      } catch {
        // ignore
      }
    } else {
      localStorage.removeItem(STORAGE_KEYS.ACTIVE_USER);
    }
    if (isMountedRef.current) {
      setUser(finalUser);
    }
  };

  const clearSessionStorage = useCallback(() => {
    if (firestoreUnsubRef.current) {
      firestoreUnsubRef.current();
      firestoreUnsubRef.current = null;
    }
    localStorage.removeItem(STORAGE_KEYS.ACTIVE_USER);
    localStorage.removeItem(STORAGE_KEYS.ACCESS_TOKEN);
    localStorage.removeItem(STORAGE_KEYS.LAST_ACTIVITY);

    // Privacy Purge: Clear all in-progress student draft scratchpads from shared machine
    try {
      const keysToRemove: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && (key.startsWith('logicq_draft_') || key.startsWith('logicq_practice_draft_'))) {
          keysToRemove.push(key);
        }
      }
      keysToRemove.forEach((k) => localStorage.removeItem(k));
    } catch {
      // Ignore
    }

    // Notify Service Worker to purge runtime cache for shared devices
    if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
      navigator.serviceWorker.controller.postMessage({ type: 'CLEAR_USER_CACHE' });
    }
  }, []);

  const logout = useCallback(async (rawReason?: string): Promise<void> => {
    const { reason, message } = normalizeLogoutReason(rawReason);
    try {
      // Record server-side session audit event
      await api.post('/auth/session-events', {
        reason,
        metadata: {
          clientTimestamp: new Date().toISOString(),
          userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : '',
        },
      }).catch(() => {});
      await api.post('/auth/logout').catch(() => {});
      await firebaseAuth.signOut().catch(() => {});
    } finally {
      clearSessionStorage();
      try {
        if (reason !== 'manual') {
          sessionStorage.setItem(STORAGE_KEYS.LOGOUT_NOTICE, JSON.stringify({ reason, message }));
        }
        // Broadcast logout event to synchronize across all other open tabs
        localStorage.setItem(STORAGE_KEYS.LOGOUT_EVENT, String(Date.now()));
      } catch {
        // ignore
      }
      if (isMountedRef.current) {
        setUser(null);
        setAuthState('signedOut');
        setIdleWarningSeconds(null);
      }
    }
  }, [clearSessionStorage]);

  const logoutAllDevices = useCallback(async (): Promise<void> => {
    try {
      await api.post('/auth/session-events', {
        reason: 'revoked-by-user',
        metadata: { clientTimestamp: new Date().toISOString() },
      }).catch(() => {});
      await api.post('/auth/logout-all').catch(() => {});
      await firebaseAuth.signOut().catch(() => {});
    } finally {
      clearSessionStorage();
      try {
        localStorage.setItem(STORAGE_KEYS.LOGOUT_EVENT, String(Date.now()));
      } catch {
        // ignore
      }
      if (isMountedRef.current) {
        setUser(null);
        setAuthState('signedOut');
        setIdleWarningSeconds(null);
      }
    }
  }, [clearSessionStorage]);

  // Synchronize authentication status with server and authoritative Firestore
  const syncWithServer = useCallback(async (tokenOrFbUser?: FirebaseUser | null): Promise<User | null> => {
    try {
      let headers: Record<string, string> = {};
      let fbUid: string | null = null;
      if (tokenOrFbUser && 'getIdToken' in tokenOrFbUser) {
        const idToken = await tokenOrFbUser.getIdToken();
        headers['Authorization'] = `Bearer ${idToken}`;
        fbUid = tokenOrFbUser.uid;
      } else if (firebaseAuth.currentUser) {
        fbUid = firebaseAuth.currentUser.uid;
      }

      let serverUser: User | null = null;
      try {
        const res = await api.get('/auth/me', { headers });
        if (res?.success && res?.data?.user) {
          serverUser = res.data.user;
        }
      } catch {
        // Fall back to direct Firestore fetch
      }

      if (serverUser) {
        persistUser(serverUser);
        if (isMountedRef.current) {
          setAuthState('signedIn');
          setIsOffline(false);
        }
        return serverUser;
      }

      // Check authoritative Firestore profile
      if (fbUid) {
        try {
          const firestoreUser = await FirestoreDataService.getUserProfile(fbUid);
          if (firestoreUser) {
            persistUser(firestoreUser);
            if (isMountedRef.current) {
              setAuthState('signedIn');
              setIsOffline(false);
            }
            return firestoreUser;
          }
        } catch {
          // Ignore
        }
      }
      return null;
    } catch (err: any) {
      // Critical: On transient network error or offline status, NEVER log the user out!
      if (!navigator.onLine || err?.message?.includes('NetworkError') || err?.message?.includes('Failed to fetch')) {
        if (isMountedRef.current) {
          setIsOffline(true);
        }
        const cached = getCachedUser();
        if (cached && !isSessionExpiredByInactivity(cached)) {
          if (isMountedRef.current) {
            setUser(cached);
            setAuthState('signedIn');
          }
          return cached;
        }
      }

      // If server explicitly says account is suspended or token revoked
      if (err?.code === 'ACCOUNT_SUSPENDED' || err?.code === 'ROLE_CHANGED_RELOGIN_REQUIRED') {
        await logout(err.message);
        return null;
      }

      if (err?.status === 401 || err?.status === 403) {
        const cached = getCachedUser();
        if (cached && isSessionExpiredByInactivity(cached)) {
          await logout('idle-timeout');
          return null;
        }
      }

      return null;
    }
  }, [logout]);

  // Activity tracker: Updates logicq_last_activity on user interactions (throttled to 5s)
  useEffect(() => {
    const handleUserInteraction = () => {
      const now = Date.now();
      if (now - lastActivityRecordedRef.current > 5000) {
        lastActivityRecordedRef.current = now;
        recordUserActivity();
      }
      if (idleWarningSeconds !== null) {
        setIdleWarningSeconds(null);
      }
    };

    const events = ['mousemove', 'keydown', 'mousedown', 'touchstart', 'scroll', 'pointerdown'];
    events.forEach((ev) => window.addEventListener(ev, handleUserInteraction, { passive: true }));

    // Periodic check for inactivity timeout and 2-minute pre-warning banner
    const interval = setInterval(() => {
      const cached = getCachedUser();
      if (!cached) {
        setIdleWarningSeconds(null);
        return;
      }

      const rawLastActivity = localStorage.getItem(STORAGE_KEYS.LAST_ACTIVITY);
      const lastActiveTime = Number(rawLastActivity) || Date.now();
      const elapsed = Date.now() - lastActiveTime;
      const limit = getInactivityLimit(cached.role);
      const remaining = limit - elapsed;

      if (remaining <= 0) {
        setIdleWarningSeconds(null);
        logout('idle-timeout');
      } else if (remaining <= IDLE_WARNING_THRESHOLD_MS) {
        setIdleWarningSeconds(Math.ceil(remaining / 1000));
      } else {
        setIdleWarningSeconds(null);
      }
    }, 1000);

    return () => {
      events.forEach((ev) => window.removeEventListener(ev, handleUserInteraction));
      clearInterval(interval);
    };
  }, [idleWarningSeconds, logout]);

  // Cross-tab synchronization listener
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === STORAGE_KEYS.LOGOUT_EVENT) {
        // Another tab logged out
        if (isMountedRef.current) {
          setUser(null);
          setAuthState('signedOut');
        }
      } else if (e.key === STORAGE_KEYS.LAST_ACTIVITY) {
        // Another tab was active; keep current tab alive
        lastActivityRecordedRef.current = Number(e.newValue || Date.now());
      }
    };

    const handleOnlineStatus = () => {
      if (isMountedRef.current) {
        setIsOffline(!navigator.onLine);
      }
      if (navigator.onLine) {
        syncWithServer();
      }
    };

    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('online', handleOnlineStatus);
    window.addEventListener('offline', handleOnlineStatus);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('online', handleOnlineStatus);
      window.removeEventListener('offline', handleOnlineStatus);
    };
  }, [syncWithServer]);

  // Primary Session Initialization on Boot / Refresh
  useEffect(() => {
    isMountedRef.current = true;

    // E2E test mock session bypass
    if (typeof window !== 'undefined' && (window as any).__E2E_MOCK_USER__) {
      setUser((window as any).__E2E_MOCK_USER__);
      setAuthState('signedIn');
      return;
    }

    // 1. Check local session cache immediately
    const cached = getCachedUser();
    if (cached) {
      if (isSessionExpiredByInactivity(cached)) {
        clearSessionStorage();
        setUser(null);
        setAuthState('signedOut');
        return;
      }
      // Populate user immediately so there is zero UI flash
      setUser(cached);
    }

    // 2. Process redirect credentials if returning from signInWithRedirect (e.g. popup-blocked browsers)
    getRedirectResult(firebaseAuth)
      .then(async (redirectCred) => {
        if (redirectCred?.user && isMountedRef.current) {
          recordUserActivity();
          let authenticatedUser: User | null = null;
          try {
            const idToken = await redirectCred.user.getIdToken();
            const res = await api.post('/auth/google', {
              idToken,
              email: redirectCred.user.email,
              avatarUrl: redirectCred.user.photoURL,
              googleId: redirectCred.user.uid,
            });
            if (res?.success && res?.data?.user) {
              authenticatedUser = res.data.user;
            }
          } catch (e) {
            console.warn('Backend sync failed on redirect login:', e);
          }
          if (!authenticatedUser) {
            authenticatedUser = await FirestoreDataService.getUserProfile(redirectCred.user.uid).catch(() => null);
          }
          if (authenticatedUser && isMountedRef.current) {
            persistUser(authenticatedUser);
            setUser(authenticatedUser);
            setAuthState('signedIn');
          }
        }
      })
      .catch((redirectErr: any) => {
        if (
          redirectErr?.code === 'auth/popup-closed-by-user' ||
          redirectErr?.code === 'auth/cancelled-popup-request'
        ) {
          return;
        }
        console.warn('Firebase getRedirectResult error:', redirectErr);
      });

    // 3. Listen to Firebase Auth state change (authoritative session restored from IndexedDB)
    const unsubscribe = onAuthStateChanged(firebaseAuth, async (fbUser) => {
      if (fbUser) {
        // Firebase Auth restored active session
        recordUserActivity();

        // Subscribe to real-time changes on authoritative Firestore document
        if (firestoreUnsubRef.current) {
          firestoreUnsubRef.current();
        }
        firestoreUnsubRef.current = FirestoreDataService.subscribeUserProfile(
          fbUser.uid,
          (liveUser) => {
            if (liveUser && isMountedRef.current) {
              persistUser(liveUser);
              setAuthState('signedIn');
            }
          }
        );

        const freshUser = await syncWithServer(fbUser);
        if (freshUser) {
          if (isMountedRef.current) {
            setUser(freshUser);
            setAuthState('signedIn');
          }
        } else {
          // Check direct Firestore profile
          let firestoreUser = await FirestoreDataService.getUserProfile(fbUser.uid).catch(() => null);
          const isAdminUser = isExplicitAdminEmail(fbUser.email);
          if (isAdminUser && (!firestoreUser || firestoreUser.role !== 'ADMIN' || !firestoreUser.profileComplete)) {
            firestoreUser = {
              ...(firestoreUser || {}),
              id: fbUser.uid,
              username: (fbUser.email || 'admin').split('@')[0],
              email: fbUser.email || '',
              fullName: fbUser.displayName || 'LogicQ Admin',
              displayName: fbUser.displayName || 'Admin',
              role: 'ADMIN',
              profileComplete: true,
              totalPoints: 0,
              currentStreak: 0,
              longestStreak: 0,
            } as User;
          }
          if (firestoreUser && isMountedRef.current) {
            persistUser(firestoreUser);
            setAuthState('signedIn');
          } else {
            const fallbackCached = getCachedUser();
            if (fallbackCached && !isSessionExpiredByInactivity(fallbackCached)) {
              if (isMountedRef.current) {
                setUser(fallbackCached);
                setAuthState('signedIn');
              }
            } else {
              if (isMountedRef.current) {
                setAuthState('signedOut');
              }
            }
          }
        }
      } else {
        if (firestoreUnsubRef.current) {
          firestoreUnsubRef.current();
          firestoreUnsubRef.current = null;
        }

        // No Firebase user; check if user is logged in via credentials/password session
        const credentialUser = getCachedUser();
        const hasToken = localStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);

        if (credentialUser && (hasToken || document.cookie.includes('__session'))) {
          if (!isSessionExpiredByInactivity(credentialUser)) {
            recordUserActivity();
            const synced = await syncWithServer(null);
            if (synced && isMountedRef.current) {
              setUser(synced);
              setAuthState('signedIn');
              return;
            } else if (credentialUser && !navigator.onLine && isMountedRef.current) {
              // Retain offline session
              setUser(credentialUser);
              setAuthState('signedIn');
              return;
            }
          }
        }

        // Definitively signed out
        if (isMountedRef.current) {
          setUser(null);
          setAuthState('signedOut');
        }
      }
    });

    return () => {
      isMountedRef.current = false;
      if (firestoreUnsubRef.current) {
        firestoreUnsubRef.current();
        firestoreUnsubRef.current = null;
      }
      unsubscribe();
    };
  }, [clearSessionStorage, syncWithServer]);

  const login = async (identifier: string, password: string): Promise<User> => {
    const res = await api.post('/auth/login', { identifier, password });
    if (!res?.success || !res?.data?.user) {
      throw new Error(res?.message || 'Login failed');
    }
    recordUserActivity();
    persistUser(res.data.user);
    setAuthState('signedIn');
    return res.data.user;
  };

  const loginWithGoogle = async (): Promise<User> => {
    try {
      let cred;
      try {
        cred = await signInWithPopup(firebaseAuth, googleAuthProvider);
      } catch (popupErr: any) {
        // Fall back to redirect flow if popup was blocked by browser (iOS Safari, in-app webviews)
        if (
          popupErr?.code === 'auth/popup-blocked' ||
          popupErr?.code === 'auth/operation-not-supported-in-this-environment'
        ) {
          console.info('Google sign-in popup blocked; falling back to redirect flow.');
          await signInWithRedirect(firebaseAuth, googleAuthProvider);
          return new Promise<User>(() => {}); // Holds state until redirect navigates
        }
        if (popupErr?.code === 'auth/popup-closed-by-user') {
          throw new Error('Sign-in was cancelled. You can try again whenever you are ready.');
        }
        if (popupErr?.code === 'auth/cancelled-popup-request') {
          throw new Error('Sign-in attempt was interrupted. Please try again.');
        }
        throw popupErr;
      }

      const idToken = await cred.user.getIdToken();

      let authenticatedUser: User | null = null;
      try {
        const res = await api.post('/auth/google', {
          idToken,
          email: cred.user.email,
          avatarUrl: cred.user.photoURL,
          googleId: cred.user.uid,
        });
        if (res?.success && res?.data?.user) {
          authenticatedUser = res.data.user;
        }
      } catch (backendErr) {
        console.warn('Backend /auth/google unavailable; using direct Firestore sync:', backendErr);
      }

      if (!authenticatedUser) {
        // Read directly from Firestore
        authenticatedUser = await FirestoreDataService.getUserProfile(cred.user.uid).catch(() => null);
      }

      if (!authenticatedUser) {
        // First-time sign in via Google: check if user is configured admin
        const isAdminUser = isExplicitAdminEmail(cred.user.email);
        authenticatedUser = {
          id: cred.user.uid,
          username: (cred.user.email || 'student').split('@')[0],
          email: cred.user.email || '',
          fullName: cred.user.displayName || (isAdminUser ? 'LogicQ Admin' : 'Student'),
          displayName: cred.user.displayName || (isAdminUser ? 'Admin' : null),
          avatarUrl: cred.user.photoURL || null,
          role: isAdminUser ? 'ADMIN' : 'STUDENT',
          college: 'Sanjivani University',
          profileComplete: isAdminUser ? true : false,
          totalPoints: 0,
          currentStreak: 0,
          longestStreak: 0,
        };
      }

      recordUserActivity();
      persistUser(authenticatedUser);
      setAuthState('signedIn');
      return authenticatedUser;
    } catch (err: any) {
      if (err?.code === 'auth/account-exists-with-different-credential') {
        throw new Error(
          'An account with this email already exists using password sign-in. Please log in with your email and password.'
        );
      }
      throw err;
    }
  };

  const register = async (data: RegisterPayload): Promise<User> => {
    const res = await api.post('/auth/register', data);
    if (!res?.success || !res?.data?.user) {
      throw new Error(res?.message || 'Registration failed');
    }
    recordUserActivity();
    persistUser(res.data.user);
    setAuthState('signedIn');
    return res.data.user;
  };

  const completeProfile = async (data: CompleteProfilePayload): Promise<User> => {
    // Onboarding Idempotency: If current user already has completed profile with PRN, do not overwrite!
    const active = user || getCachedUser();
    if (active?.profileComplete && active?.prn) {
      return active;
    }

    let completedUser: User | null = null;
    try {
      const res = await api.post('/auth/complete-profile', data);
      if (res?.success && res?.data?.user) {
        completedUser = res.data.user;
      }
    } catch (apiErr) {
      console.warn('Backend /auth/complete-profile unavailable; saving directly to Firestore:', apiErr);
    }

    if (!completedUser) {
      const fbUser = firebaseAuth.currentUser;
      const currentEmail = fbUser?.email || active?.email || '';
      const currentUid = fbUser?.uid || active?.id;
      if (!currentUid) {
        throw new Error('Not authenticated. Please sign in again.');
      }
      completedUser = await FirestoreDataService.completeUserProfile(currentUid, currentEmail, data);
    }

    recordUserActivity();
    persistUser(completedUser);
    setAuthState('signedIn');
    return completedUser;
  };

  const refreshUser = async () => {
    await syncWithServer(firebaseAuth.currentUser);
  };

  return (
    <AuthContext.Provider
      value={{
        authState,
        user,
        isLoading: authState === 'loading',
        isAuthenticated: authState === 'signedIn' && Boolean(user),
        isAdmin: user?.role === 'ADMIN' || isExplicitAdminEmail(user?.email),
        isChecker: user?.role === 'CHECKER' || user?.role === 'ADMIN' || isExplicitAdminEmail(user?.email),
        isOffline,
        login,
        loginWithGoogle,
        register,
        completeProfile,
        logout,
        logoutAllDevices,
        refreshUser,
      }}
    >
      {idleWarningSeconds !== null && (
        <div className="fixed top-0 inset-x-0 z-[99999] bg-gradient-to-r from-amber-500 via-amber-600 to-amber-500 text-dark-950 px-4 py-2.5 text-xs font-mono font-bold flex items-center justify-between shadow-2xl backdrop-blur-md border-b border-amber-400">
          <div className="flex items-center gap-2.5">
            <span className="w-2.5 h-2.5 rounded-full bg-dark-950 animate-ping inline-block" />
            <span>
              Session expiring due to inactivity in <span className="underline decoration-2">{idleWarningSeconds}s</span>.
            </span>
          </div>
          <button
            onClick={() => {
              recordUserActivity();
              lastActivityRecordedRef.current = Date.now();
              setIdleWarningSeconds(null);
            }}
            className="px-3.5 py-1 bg-dark-950 text-amber-300 hover:text-white rounded-md text-xs font-bold transition-all shadow-sm active:scale-95"
          >
            Stay signed in
          </button>
        </div>
      )}
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};
