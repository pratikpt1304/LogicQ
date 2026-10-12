import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import { User } from '../types/index.js';
import { api } from '../api/client.js';
import { signInWithPopup, onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { auth as firebaseAuth, googleAuthProvider } from '../config/firebase.js';

export type AuthState = 'loading' | 'signedIn' | 'signedOut';

export interface RegisterPayload {
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

// Inactivity Limits (Master Spec Amendment):
// - Students: 7 days idle timeout (replaces overly aggressive 30m)
// - Checkers: 8 hours idle timeout
// - Admins: 30 minutes idle timeout
export const STUDENT_INACTIVITY_LIMIT_MS = 7 * 24 * 60 * 60 * 1000; // 7 days
export const CHECKER_INACTIVITY_LIMIT_MS = 8 * 60 * 60 * 1000; // 8 hours
export const ADMIN_INACTIVITY_LIMIT_MS = 30 * 60 * 1000; // 30 minutes

export const STORAGE_KEYS = {
  ACTIVE_USER: 'logicq_active_user',
  ACCESS_TOKEN: 'logicq_access_token',
  LAST_ACTIVITY: 'logicq_last_activity',
  LOGOUT_EVENT: 'logicq_logout_event',
} as const;

export function getInactivityLimit(role?: string): number {
  if (role === 'ADMIN') return ADMIN_INACTIVITY_LIMIT_MS;
  if (role === 'CHECKER') return CHECKER_INACTIVITY_LIMIT_MS;
  return STUDENT_INACTIVITY_LIMIT_MS;
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

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [authState, setAuthState] = useState<AuthState>('loading');
  const [user, setUser] = useState<User | null>(null);
  const [isOffline, setIsOffline] = useState(!navigator.onLine);

  const lastActivityRecordedRef = useRef<number>(Date.now());
  const isMountedRef = useRef(true);

  // Read initial user from persistent storage to eliminate screen flash
  const getCachedUser = (): User | null => {
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.ACTIVE_USER);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  };

  const persistUser = (userData: User | null) => {
    if (userData) {
      try {
        localStorage.setItem(STORAGE_KEYS.ACTIVE_USER, JSON.stringify(userData));
        recordUserActivity();
      } catch {
        // ignore
      }
    } else {
      localStorage.removeItem(STORAGE_KEYS.ACTIVE_USER);
    }
    if (isMountedRef.current) {
      setUser(userData);
    }
  };

  const clearSessionStorage = useCallback(() => {
    localStorage.removeItem(STORAGE_KEYS.ACTIVE_USER);
    localStorage.removeItem(STORAGE_KEYS.ACCESS_TOKEN);
    localStorage.removeItem(STORAGE_KEYS.LAST_ACTIVITY);
    // Notify Service Worker to purge runtime cache for shared devices
    if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
      navigator.serviceWorker.controller.postMessage({ type: 'CLEAR_USER_CACHE' });
    }
  }, []);

  const logout = useCallback(async (_reason?: string): Promise<void> => {
    try {
      await api.post('/auth/logout').catch(() => {});
      await firebaseAuth.signOut().catch(() => {});
    } finally {
      clearSessionStorage();
      try {
        // Broadcast logout event to synchronize across all other open tabs
        localStorage.setItem(STORAGE_KEYS.LOGOUT_EVENT, String(Date.now()));
      } catch {
        // ignore
      }
      if (isMountedRef.current) {
        setUser(null);
        setAuthState('signedOut');
      }
    }
  }, [clearSessionStorage]);

  const logoutAllDevices = useCallback(async (): Promise<void> => {
    try {
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
      }
    }
  }, [clearSessionStorage]);

  // Synchronize authentication status with the server
  const syncWithServer = useCallback(async (tokenOrFbUser?: FirebaseUser | null): Promise<User | null> => {
    try {
      let headers: Record<string, string> = {};
      if (tokenOrFbUser && 'getIdToken' in tokenOrFbUser) {
        const idToken = await tokenOrFbUser.getIdToken();
        headers['Authorization'] = `Bearer ${idToken}`;
      }
      const res = await api.get('/auth/me', { headers });
      if (res?.success && res?.data?.user) {
        persistUser(res.data.user);
        if (isMountedRef.current) {
          setAuthState('signedIn');
          setIsOffline(false);
        }
        return res.data.user;
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
          await logout('Session expired due to inactivity.');
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
    };

    const events = ['mousemove', 'keydown', 'mousedown', 'touchstart', 'scroll', 'pointerdown'];
    events.forEach((ev) => window.addEventListener(ev, handleUserInteraction, { passive: true }));

    // Periodic check for inactivity timeout
    const interval = setInterval(() => {
      const cached = getCachedUser();
      if (cached && isSessionExpiredByInactivity(cached)) {
        logout('Session expired due to inactivity.');
      }
    }, 30000);

    return () => {
      events.forEach((ev) => window.removeEventListener(ev, handleUserInteraction));
      clearInterval(interval);
    };
  }, [logout]);

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

    // 2. Listen to Firebase Auth state change (authoritative session restored from IndexedDB)
    const unsubscribe = onAuthStateChanged(firebaseAuth, async (fbUser) => {
      if (fbUser) {
        // Firebase Auth restored active session
        recordUserActivity();
        const freshUser = await syncWithServer(fbUser);
        if (freshUser) {
          if (isMountedRef.current) {
            setUser(freshUser);
            setAuthState('signedIn');
          }
        } else {
          // If server sync had transient failure but cached user is valid, keep signedIn
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
      } else {
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
    const cred = await signInWithPopup(firebaseAuth, googleAuthProvider);
    const idToken = await cred.user.getIdToken();
    const res = await api.post('/auth/google', {
      idToken,
      email: cred.user.email,
      avatarUrl: cred.user.photoURL,
      googleId: cred.user.uid,
    });
    if (!res?.success || !res?.data?.user) {
      throw new Error(res?.message || 'Google sign-in failed');
    }
    recordUserActivity();
    persistUser(res.data.user);
    setAuthState('signedIn');
    return res.data.user;
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
    const res = await api.post('/auth/complete-profile', data);
    if (!res?.success || !res?.data?.user) {
      throw new Error(res?.message || 'Failed to complete profile');
    }
    recordUserActivity();
    persistUser(res.data.user);
    setAuthState('signedIn');
    return res.data.user;
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
        isAdmin: user?.role === 'ADMIN',
        isChecker: user?.role === 'CHECKER',
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
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};
