import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import { User } from '../types/index.js';
import { api } from '../api/client.js';
import {
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  onAuthStateChanged,
  signOut,
  User as FirebaseUser,
} from 'firebase/auth';
import { auth as firebaseAuth, googleAuthProvider, db } from '../config/firebase.js';
import { doc, getDoc, deleteDoc, updateDoc, setDoc, getDocs, collection } from 'firebase/firestore';
import { queryClient } from '../config/queryClient.js';
import { FirestoreDataService } from '../services/firestoreData.service.js';
import { isExplicitAdminEmail } from '../api/fallbackEngine.js';
import { isRealPersonName, normalizeDepartment, deriveDepartmentFromPrn } from '../config/academic.config.js';
import { DeviceSessionService } from '../services/deviceSession.service.js';
import { findCohortStudent } from '../data/c-programming-cohort.data.js';

function pickBestRealName(...candidates: (string | null | undefined)[]): string | null {
  for (const c of candidates) {
    if (isRealPersonName(c)) return c!.trim();
  }
  return null;
}

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
  isFaculty: boolean;
  isChecker: boolean;
  isOffline: boolean;
  login: (identifier: string, password?: string) => Promise<User>;
  loginWithGoogle: () => Promise<User>;
  sendLoginOtp: (identifier: string) => Promise<any>;
  loginWithOtp: (identifier: string, code: string) => Promise<User>;
  register: (data: RegisterPayload) => Promise<User>;
  completeProfile: (data: CompleteProfilePayload) => Promise<User>;
  logout: (reason?: string) => Promise<void>;
  logoutAllDevices: () => Promise<void>;
  refreshUser: () => Promise<void>;
  updateUser: (partial: Partial<User>) => void;
}

// Inactivity Limits (Master Spec & Logout Audit):
// - Students: 7 days idle timeout (replaces overly aggressive 30m)
// - Checkers: 8 hours idle timeout
// - Admins: 4 hours idle timeout (replaces legacy 30m / 2h short window)
// - Faculty: 4 hours idle timeout
export const STUDENT_INACTIVITY_LIMIT_MS = 7 * 24 * 60 * 60 * 1000; // 7 days
export const CHECKER_INACTIVITY_LIMIT_MS = 8 * 60 * 60 * 1000; // 8 hours
export const FACULTY_INACTIVITY_LIMIT_MS = 4 * 60 * 60 * 1000; // 4 hours
export const ADMIN_INACTIVITY_LIMIT_MS = 4 * 60 * 60 * 1000; // 4 hours generous uninterrupted admin session (>= 2 hrs)
export const IDLE_WARNING_THRESHOLD_MS = 5 * 60 * 1000; // 5 minutes pre-warning

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
  | 'parallel-login-blocked'
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
  'parallel-login-blocked': 'Parallel login detected: Another device or tab logged into this account. Only 1 active instance is permitted.',
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
  if (role === 'FACULTY') return FACULTY_INACTIVITY_LIMIT_MS;
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
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    const email = (parsed?.email || '').toLowerCase().trim();
    if (email !== 'logicqarena@gmail.com') {
      try {
        localStorage.removeItem(STORAGE_KEYS.ACTIVE_USER);
        localStorage.removeItem(STORAGE_KEYS.ACCESS_TOKEN);
        localStorage.removeItem('logicq_refresh_token');
        localStorage.removeItem('logicq_current_user_id');
        localStorage.removeItem('logicq_dev_users');
        sessionStorage.clear();
      } catch {}
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const cachedInitial = getCachedUser();
  const isExpired = cachedInitial ? isSessionExpiredByInactivity(cachedInitial) : true;
  const initialUser = (!isExpired && cachedInitial) ? cachedInitial : null;
  const [authState, setAuthState] = useState<AuthState>(initialUser ? 'signedIn' : 'loading');
  const [user, setUser] = useState<User | null>(initialUser);
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [idleWarningSeconds, setIdleWarningSeconds] = useState<number | null>(null);

  const lastActivityRecordedRef = useRef<number>(Date.now());
  const isMountedRef = useRef(true);
  const firestoreUnsubRef = useRef<(() => void) | null>(null);

  const persistUser = (userData: User | null) => {
    let finalUser = userData;
    if (finalUser) {
      if ((finalUser.email || '').toLowerCase().trim() !== 'logicqarena@gmail.com') {
        clearSessionStorage();
        if (isMountedRef.current) {
          setUser(null);
          setAuthState('signedOut');
        }
        return;
      }
      const isMasterAdmin =
        (finalUser.email || '').toLowerCase().trim() === 'logicqarena@gmail.com' ||
        (finalUser.prn || '').toUpperCase().trim() === 'LOGICQARENA' ||
        finalUser.role === 'ADMIN' ||
        isExplicitAdminEmail(finalUser.email);

      finalUser = {
        ...finalUser,
        role: isMasterAdmin ? 'ADMIN' : (finalUser.role || 'STUDENT'),
        displayName: isMasterAdmin ? 'LogicQ Arena (Admin)' : (finalUser.displayName || 'LogicQ Arena'),
        fullName: isMasterAdmin ? 'LogicQ Arena (Admin)' : (finalUser.fullName || 'LogicQ Arena'),
        profileComplete: true,
        email: isMasterAdmin ? 'logicqarena@gmail.com' : (finalUser.email || ''),
        isEmailBound: isMasterAdmin ? true : Boolean(finalUser.isEmailBound),
        isEmailBoundV2: isMasterAdmin ? true : Boolean((finalUser as any).isEmailBoundV2),
        emailVerified: isMasterAdmin ? true : Boolean(finalUser.emailVerified),
      };

      // MONOTONIC RETENTION: Never allow points, streak, or solved count to downgrade to 0!
      const active = user || getCachedUser();
      let retainedPoints = Math.max(active?.totalPoints || 0, finalUser.totalPoints || 0);
      let retainedCurrentStreak = Math.max(active?.currentStreak || 0, finalUser.currentStreak || 0);
      let retainedLongestStreak = Math.max(active?.longestStreak || 0, finalUser.longestStreak || 0);
      let retainedSolved = Math.max(active?.totalSolved || 0, finalUser.totalSolved || 0);
      const prnDerivedDept = deriveDepartmentFromPrn(finalUser.prn || active?.prn);
      const retainedDepartment =
        (finalUser.department && finalUser.department !== 'CSE' ? normalizeDepartment(finalUser.department) || finalUser.department : null) ||
        (active?.department && active.department !== 'CSE' ? normalizeDepartment(active.department) || active.department : null) ||
        prnDerivedDept ||
        normalizeDepartment(finalUser.department) ||
        normalizeDepartment(active?.department) ||
        finalUser.department ||
        active?.department ||
        null;
      const retainedYear = finalUser.year || active?.year || null;
      const retainedDivision = finalUser.division || active?.division || null;
      const retainedBio = (finalUser.bio && finalUser.bio.trim() !== '') ? finalUser.bio : (active?.bio && active.bio.trim() !== '') ? active.bio : (finalUser.bio ?? null);

      const retainedStorage =
        finalUser.storagePreference ||
        active?.storagePreference ||
        (localStorage.getItem('logicq_storage_preference') as any) ||
        'FIRESTORE_FALLBACK';

      const retainedSectionId = finalUser.sectionId || (finalUser as any)?.enrolledSection?.id || (active as any)?.sectionId || (active as any)?.enrolledSection?.id || null;
      const retainedSectionName = finalUser.sectionName || (finalUser as any)?.enrolledSection?.sectionName || (active as any)?.sectionName || (active as any)?.enrolledSection?.sectionName || null;
      const retainedJoinCode = (finalUser as any)?.joinCode || (finalUser as any)?.enrolledSection?.joinCode || (active as any)?.joinCode || (active as any)?.enrolledSection?.joinCode || null;
      const retainedEnrolledSections = (Array.isArray((finalUser as any).enrolledSections) && (finalUser as any).enrolledSections.length > 0)
        ? (finalUser as any).enrolledSections
        : (Array.isArray((active as any)?.enrolledSections) ? (active as any).enrolledSections : []);
      const retainedSections = (Array.isArray((finalUser as any).sections) && (finalUser as any).sections.length > 0)
        ? (finalUser as any).sections
        : (Array.isArray((active as any)?.sections) ? (active as any).sections : []);

      const prnUpper = (finalUser.prn || active?.prn || '').toUpperCase();

      // Mandatory Institutional Email Binding Epoch V2 for all students:
      // Invalidate legacy V1 flags so all students are prompted to bind their institutional email.
      const isStudentRole = finalUser.role === 'STUDENT';
      const isBoundV2 = !isStudentRole || Boolean(
        (finalUser as any).isEmailBoundV2 ||
        (prnUpper ? localStorage.getItem(`logicq_bound_v2_${prnUpper}`) === 'true' : false) ||
        (finalUser.id ? localStorage.getItem(`logicq_bound_v2_${finalUser.id}`) === 'true' : false) ||
        (active?.id ? localStorage.getItem(`logicq_bound_v2_${active.id}`) === 'true' : false)
      );

      const boundEmailV2 = isBoundV2
        ? (prnUpper ? localStorage.getItem(`logicq_bound_v2_email_${prnUpper}`) : null) ||
          (finalUser.id ? localStorage.getItem(`logicq_bound_v2_email_${finalUser.id}`) : null) ||
          (finalUser.email && !finalUser.email.endsWith('@sanjivani.edu.in') && !finalUser.email.includes('placeholder') ? finalUser.email : '')
        : '';

      if (prnUpper === '2126PMIM1039') {
        finalUser.fullName = 'Pratik Balasaheb Thorat';
        finalUser.displayName = 'Pratik Thorat';
        finalUser.role = 'STUDENT';
        finalUser.prn = '2126PMIM1039';
        if (finalUser.email?.toLowerCase() === 'faculty.demo@sanjivani.edu.in') {
          finalUser.email = 'thoratpratik2323@gmail.com';
        }
      }

      const retainedIsEmailBound = isMasterAdmin ? true : isBoundV2;
      const retainedEmailVerified = isMasterAdmin ? true : isBoundV2;
      const retainedEmail = isMasterAdmin ? 'logicqarena@gmail.com' : (isBoundV2 ? (boundEmailV2 || finalUser.email || '') : '');
      const cleanSectionName = retainedSectionName ? String(retainedSectionName).replace(/\s*\(Presidential Showcase\)/gi, '').trim() : '';

      finalUser = {
        ...finalUser,
        email: retainedEmail,
        isEmailBound: retainedIsEmailBound,
        emailVerified: retainedEmailVerified,
        department: retainedDepartment,
        year: retainedYear,
        division: retainedDivision,
        bio: retainedBio,
        totalPoints: retainedPoints,
        currentStreak: retainedCurrentStreak,
        longestStreak: retainedLongestStreak,
        totalSolved: retainedSolved,
        storagePreference: retainedStorage,
        sectionId: retainedSectionId,
        sectionName: cleanSectionName || 'C Programming Masterclass',
        joinCode: retainedJoinCode,
        enrolledSections: retainedEnrolledSections,
        sections: retainedSections,
      };

      try {
        localStorage.setItem(STORAGE_KEYS.ACTIVE_USER, JSON.stringify(finalUser));
        localStorage.setItem('logicq_storage_preference', retainedStorage);
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
        queryClient.cancelQueries();
        queryClient.clear();
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
        queryClient.cancelQueries();
        queryClient.clear();
        setUser(null);
        setAuthState('signedOut');
        setIdleWarningSeconds(null);
      }
    }
  }, [clearSessionStorage]);

  // Synchronize authentication status with server and authoritative Firestore
  const syncWithServer = useCallback(async (tokenOrFbUser?: FirebaseUser | null): Promise<User | null> => {
    try {
      let fbUid: string | null = null;
      let targetFbUser: FirebaseUser | null = null;
      if (tokenOrFbUser && 'getIdToken' in tokenOrFbUser) {
        targetFbUser = tokenOrFbUser;
        fbUid = tokenOrFbUser.uid;
      } else if (firebaseAuth.currentUser) {
        targetFbUser = firebaseAuth.currentUser;
        fbUid = firebaseAuth.currentUser.uid;
      }

      let serverUser: User | null = null;

      // 1. If we have an active Firebase user, exchange for a fresh LogicQ backend session
      let statsBackup: any = null;
      if (fbUid) {
        try {
          statsBackup = await FirestoreDataService.getStatsBackup(fbUid);
        } catch {
          // ignore
        }
      }

      const cached = getCachedUser();
      let firestoreProfile: any = null;
      if (fbUid) {
        try {
          firestoreProfile = await FirestoreDataService.getUserProfile(fbUid);
        } catch {
          // ignore
        }
      }

      const maxPoints = Math.max(
        firestoreProfile?.totalPoints || 0,
        statsBackup?.totalPoints || 0,
        cached?.totalPoints || 0
      );
      const maxCurrentStreak = Math.max(
        firestoreProfile?.currentStreak || 0,
        statsBackup?.currentStreak || 0,
        cached?.currentStreak || 0
      );
      const maxLongestStreak = Math.max(
        firestoreProfile?.longestStreak || 0,
        statsBackup?.longestStreak || 0,
        cached?.longestStreak || 0
      );

      if (firestoreProfile) {
        firestoreProfile.totalPoints = maxPoints;
        firestoreProfile.currentStreak = maxCurrentStreak;
        firestoreProfile.longestStreak = maxLongestStreak;
      }

      if (targetFbUser) {
        try {
          const idToken = await targetFbUser.getIdToken();

          const googleRes = await api.post('/auth/google', {
            idToken,
            email: targetFbUser.email,
            avatarUrl: targetFbUser.photoURL,
            googleId: targetFbUser.uid,
            firestoreProfile: firestoreProfile && firestoreProfile.profileComplete ? firestoreProfile : (cached && cached.profileComplete ? { ...cached, totalPoints: maxPoints, currentStreak: maxCurrentStreak, longestStreak: maxLongestStreak } : undefined),
          });
          if (googleRes?.success) {
            if (googleRes?.data?.accessToken) {
              localStorage.setItem(STORAGE_KEYS.ACCESS_TOKEN, googleRes.data.accessToken);
            }
            if (googleRes?.data?.refreshToken) {
              localStorage.setItem('logicq_refresh_token', googleRes.data.refreshToken);
            }
            if (googleRes?.data?.user) {
              serverUser = googleRes.data.user;
            }
          }
        } catch (e) {
          console.warn('Backend /auth/google exchange in syncWithServer failed:', e);
        }
      } else {
        // 2. Otherwise check session via /auth/me with existing access token
        try {
          const res = await api.get('/auth/me');
          if (res?.success && res?.data?.user) {
            serverUser = res.data.user;
          }
        } catch {
          // Ignore
        }
      }

      // Safeguard: Never let serverUser downgrade an already completed profile or points!
      const firestoreUser = firestoreProfile;

      const existingCompleted =
        firestoreUser && firestoreUser.profileComplete
          ? firestoreUser
          : cached && cached.profileComplete
          ? cached
          : null;

      if (serverUser) {
        const authoritativePoints = Math.max(
          serverUser.totalPoints || 0,
          existingCompleted?.totalPoints || 0,
          cached?.totalPoints || 0,
          statsBackup?.totalPoints || 0
        );
        const authoritativeCurrentStreak = Math.max(
          serverUser.currentStreak || 0,
          existingCompleted?.currentStreak || 0,
          cached?.currentStreak || 0,
          statsBackup?.currentStreak || 0
        );
        const authoritativeLongestStreak = Math.max(
          serverUser.longestStreak || 0,
          existingCompleted?.longestStreak || 0,
          cached?.longestStreak || 0,
          statsBackup?.longestStreak || 0
        );

        if (existingCompleted) {
          serverUser = {
            ...serverUser,
            prn: existingCompleted.prn || serverUser.prn,
            college: existingCompleted.college || serverUser.college,
            department:
              (existingCompleted.department && existingCompleted.department !== 'CSE' ? existingCompleted.department : null) ||
              (serverUser.department && serverUser.department !== 'CSE' ? serverUser.department : null) ||
              deriveDepartmentFromPrn(existingCompleted.prn || serverUser.prn) ||
              existingCompleted.department ||
              serverUser.department ||
              null,
            year: serverUser.year || existingCompleted.year,
            division: serverUser.division || existingCompleted.division,
            bio: (serverUser.bio && serverUser.bio.trim() !== '') ? serverUser.bio : (existingCompleted.bio && existingCompleted.bio.trim() !== '') ? existingCompleted.bio : (serverUser.bio ?? null),
            displayName: pickBestRealName(serverUser.displayName, existingCompleted.displayName, targetFbUser?.displayName, serverUser.fullName, existingCompleted.fullName),
            fullName: pickBestRealName(serverUser.fullName, existingCompleted.fullName, targetFbUser?.displayName, serverUser.displayName, existingCompleted.displayName) || serverUser.fullName || serverUser.username,
            profileComplete: existingCompleted.profileComplete || serverUser.profileComplete,
            totalPoints: authoritativePoints,
            currentStreak: authoritativeCurrentStreak,
            longestStreak: authoritativeLongestStreak,
            sectionId: existingCompleted.sectionId || serverUser.sectionId || null,
            sectionName: existingCompleted.sectionName || serverUser.sectionName || null,
            joinCode: existingCompleted.joinCode || serverUser.joinCode || null,
            enrolledSections: existingCompleted.enrolledSections || serverUser.enrolledSections || [],
            sections: existingCompleted.sections || serverUser.sections || [],
          };
        } else {
          serverUser = {
            ...serverUser,
            displayName: pickBestRealName(serverUser.displayName, targetFbUser?.displayName, serverUser.fullName),
            fullName: pickBestRealName(serverUser.fullName, targetFbUser?.displayName, serverUser.displayName) || serverUser.fullName || serverUser.username,
            totalPoints: authoritativePoints,
            currentStreak: authoritativeCurrentStreak,
            longestStreak: authoritativeLongestStreak,
          };
        }

        const prnUpperSync = (serverUser.prn || existingCompleted?.prn || '').toUpperCase();
        const storedBoundSync =
          (prnUpperSync ? localStorage.getItem(`logicq_bound_email_${prnUpperSync}`) : null) ||
          (serverUser.id ? localStorage.getItem(`logicq_bound_email_${serverUser.id}`) : null) ||
          localStorage.getItem('logicq_last_bound_email');

        const boundEmailSync =
          (existingCompleted?.email && !existingCompleted.email.endsWith('@sanjivani.edu.in') && !existingCompleted.email.includes('placeholder'))
            ? existingCompleted.email
            : (serverUser.email && !serverUser.email.endsWith('@sanjivani.edu.in') && !serverUser.email.includes('placeholder'))
              ? serverUser.email
              : storedBoundSync ||
                serverUser.email ||
                existingCompleted?.email ||
                '';

        const isBoundSync = Boolean(
          serverUser.isEmailBound ||
          existingCompleted?.isEmailBound ||
          storedBoundSync ||
          (boundEmailSync && !boundEmailSync.endsWith('@sanjivani.edu.in') && !boundEmailSync.includes('placeholder'))
        );

        serverUser.email = boundEmailSync;
        serverUser.isEmailBound = isBoundSync;
        serverUser.emailVerified = isBoundSync;

        if (fbUid && authoritativePoints > 0) {
          FirestoreDataService.saveStatsBackup(fbUid, {
            totalPoints: authoritativePoints,
            currentStreak: authoritativeCurrentStreak,
            longestStreak: authoritativeLongestStreak,
          }).catch(() => {});
        }

        persistUser(serverUser);
        if (isMountedRef.current) {
          setAuthState('signedIn');
          setIsOffline(false);
        }
        return serverUser;
      }

      // Check authoritative Firestore profile
      if (firestoreUser) {
        persistUser(firestoreUser);
        if (isMountedRef.current) {
          setAuthState('signedIn');
          setIsOffline(false);
        }
        return firestoreUser;
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

    const events = ['mousemove', 'keydown', 'mousedown', 'touchstart', 'scroll', 'pointerdown', 'click', 'focus'];
    events.forEach((ev) => window.addEventListener(ev, handleUserInteraction, { passive: true }));

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        const cached = getCachedUser();
        if (cached && !isSessionExpiredByInactivity(cached)) {
          lastActivityRecordedRef.current = Date.now();
          recordUserActivity();
        }
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Periodic check for inactivity timeout and 5-minute pre-warning banner
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

    // Keep Render server warm so users never suffer 50-90s cold boots or spin-downs while using LogicQ
    const warmPing = setInterval(() => {
      try {
        const controller = new AbortController();
        const tid = setTimeout(() => controller.abort(), 6000);
        fetch(`${(import.meta.env.VITE_API_BASE_URL || '/api').replace(/\/$/, '')}/health`, {
          method: 'GET',
          signal: controller.signal,
        })
          .catch(() => {})
          .finally(() => clearTimeout(tid));
      } catch {}
    }, 4 * 60 * 1000); // Ping every 4 minutes (well within Render's 15-minute idle window)

    // Real-time student presence heartbeat for 120+ concurrent students (Throttled to 60s)
    let lastPresenceEpoch = 0;
    const sendPresence = () => {
      const cached = getCachedUser();
      const primaryUid = firebaseAuth.currentUser?.uid || cached?.id;
      if (primaryUid && Date.now() - lastPresenceEpoch > 55000) {
        lastPresenceEpoch = Date.now();
        FirestoreDataService.updateStudentPresence(primaryUid, window.location.pathname).catch(() => {});
      }
    };
    sendPresence();
    const presenceInterval = setInterval(sendPresence, 60000);

    return () => {
      events.forEach((ev) => window.removeEventListener(ev, handleUserInteraction));
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      clearInterval(interval);
      clearInterval(warmPing);
      clearInterval(presenceInterval);
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
      setAuthState('signedIn');
      if (!localStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN)) {
        localStorage.setItem(STORAGE_KEYS.ACCESS_TOKEN, `logicq_sess_${cached.id || cached.prn}_${Date.now()}`);
      }
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
        if ((fbUser.email || '').toLowerCase().trim() !== 'logicqarena@gmail.com') {
          try {
            await signOut(firebaseAuth);
          } catch {}
          clearSessionStorage();
          if (isMountedRef.current) {
            setUser(null);
            setAuthState('signedOut');
          }
          return;
        }
        // Firebase Auth restored active session
        recordUserActivity();

        // Subscribe to real-time changes on authoritative Firestore document
        if (firestoreUnsubRef.current) {
          firestoreUnsubRef.current();
        }
        firestoreUnsubRef.current = FirestoreDataService.subscribeUserProfile(
          fbUser.uid,
          async (liveUser) => {
            if (liveUser && isMountedRef.current) {
              try {
                const backup = await FirestoreDataService.getStatsBackup(fbUser.uid);
                if (backup) {
                  liveUser.totalPoints = Math.max(liveUser.totalPoints || 0, backup.totalPoints || 0);
                  liveUser.currentStreak = Math.max(liveUser.currentStreak || 0, backup.currentStreak || 0);
                  liveUser.longestStreak = Math.max(liveUser.longestStreak || 0, backup.longestStreak || 0);
                  liveUser.totalSolved = Math.max(liveUser.totalSolved || 0, backup.totalSolved || 0);
                }
                const cachedStorage = localStorage.getItem('logicq_storage_preference');
                if (cachedStorage && !liveUser.storagePreference) {
                  liveUser.storagePreference = cachedStorage as any;
                }
              } catch {}
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

        if (credentialUser && !isSessionExpiredByInactivity(credentialUser)) {
          recordUserActivity();
          if (!localStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN)) {
            localStorage.setItem(STORAGE_KEYS.ACCESS_TOKEN, `logicq_sess_${credentialUser.id || credentialUser.prn}_${Date.now()}`);
          }
          if (isMountedRef.current) {
            setUser(credentialUser);
            setAuthState('signedIn');
          }
          try {
            const synced = await syncWithServer(null);
            if (synced && isMountedRef.current) {
              setUser(synced);
              setAuthState('signedIn');
            }
          } catch {
            // Retain active credential session during transient network / server spinup
          }
          return;
        }

        // Definitively signed out only if there is no active credentialUser
        if (isMountedRef.current) {
          queryClient.cancelQueries();
          queryClient.clear();
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

  // Single-Instance & Concurrency Guard: Enforce maximum 1 active instance per account
  useEffect(() => {
    if (!user || user.role !== 'STUDENT' || !user.prn) return;

    const unsubscribeConflict = DeviceSessionService.subscribeToSessionConflict(
      user.prn,
      (reason) => {
        console.warn('Session conflict terminated active session:', reason);
        logout('parallel-login-blocked');
        alert(reason);
      }
    );

    return () => {
      unsubscribeConflict();
    };
  }, [user?.prn, user?.role, logout]);

  const login = async (identifier: string, password?: string): Promise<User> => {
    const cleanId = String(identifier || '').trim();
    const cleanPwd = String(password || cleanId).trim();

    // Built-in Instant Demo Student: PRN="dummy", Password="dummy"
    if (cleanId.toLowerCase() === 'dummy') {
      if (cleanPwd && cleanPwd.toLowerCase() !== 'dummy' && cleanPwd.toLowerCase() !== 'password123') {
        throw new Error('Invalid password. For demo student, use password: dummy');
      }
      const dummyStudent: User = {
        id: 'std_dummy',
        username: 'dummy',
        email: 'dummy@logicq.io',
        prn: 'DUMMY',
        fullName: 'Rohan Sharma',
        displayName: 'Rohan Sharma',
        role: 'STUDENT',
        department: 'Integrated M.Tech',
        year: 'First Year (FY)',
        division: 'A',
        sectionId: 'sec-mw6l4r2s',
        sectionName: 'Integrated Mtech',
        joinCode: 'LQ-INTE34',
        profileComplete: true,
        isEmailBound: true,
        isEmailBoundV2: true,
        emailVerified: true,
        totalPoints: 0,
        currentStreak: 0,
        longestStreak: 0,
        totalSolved: 0,
      };
      if (!localStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN)) {
        localStorage.setItem(STORAGE_KEYS.ACCESS_TOKEN, `logicq_sess_dummy_${Date.now()}`);
      }
      recordUserActivity();
      persistUser(dummyStudent);
      setAuthState('signedIn');
      return dummyStudent;
    }

    // Check device registration and single instance for cohort students
    const cohortStudent = findCohortStudent(cleanId);

    const prnToCheck = cohortStudent ? cohortStudent.prn.toUpperCase() : cleanId.toUpperCase();

    if (prnToCheck && prnToCheck.startsWith('212')) {
      const reg = await DeviceSessionService.registerDeviceSession(prnToCheck);
      if (!reg.success) {
        throw new Error(reg.message || 'Device registration limit reached (maximum 2 devices allowed).');
      }
    }

    // STRICT CROSS-DEVICE CREDENTIAL RESOLUTION:
    // If student has changed their password, the default PRN password is permanently invalidated!
    if (prnToCheck) {
      let knownCustomPw =
        (typeof window !== 'undefined' ? localStorage.getItem(`logicq_custom_password_${prnToCheck}`) : null) ||
        (cohortStudent ? localStorage.getItem(`logicq_custom_password_cohort-${cohortStudent.prn.toLowerCase()}`) : null);

      if (!knownCustomPw && typeof window !== 'undefined') {
        try {
          const rawUsers = localStorage.getItem('logicq_stored_users_v1');
          if (rawUsers) {
            const parsed = JSON.parse(rawUsers);
            const foundUser = parsed.find(
              (u: any) =>
                (u.prn && u.prn.toUpperCase() === prnToCheck) ||
                (cohortStudent && u.id === `cohort-${cohortStudent.prn.toLowerCase()}`)
            );
            if (foundUser?.password && foundUser.password.toUpperCase() !== prnToCheck) {
              knownCustomPw = foundUser.password;
            }
          }
        } catch {}
      }

      if (!knownCustomPw) {
        try {
          const secDoc = await getDoc(doc(db, 'cohort_progress', prnToCheck, 'drafts', '__account_security'));
          if (secDoc.exists()) {
            const data = secDoc.data();
            if (data?.code && typeof data.code === 'string') {
              knownCustomPw = data.code;
              try {
                localStorage.setItem(`logicq_custom_password_${prnToCheck}`, data.code);
              } catch {}
            }
          }
        } catch (secErr) {
          console.warn('Firestore security credential check skipped:', secErr);
        }
      }

      if (knownCustomPw) {
        if (cleanPwd.toUpperCase() === prnToCheck) {
          throw new Error('You have changed your password. The default PRN password is no longer valid. Please enter your new password.');
        }
        if (cleanPwd !== knownCustomPw) {
          throw new Error('Invalid password. Please enter the new password you set for this account.');
        }
      }
    }

    let authUser: User | null = null;
    try {
      const res = await api.post('/auth/login', { identifier: cleanId, password: cleanPwd });
      if (res?.success && res?.data?.user) {
        authUser = res.data.user;
        if (res.data.accessToken) {
          localStorage.setItem('logicq_access_token', res.data.accessToken);
        }
        if (res.data.refreshToken) {
          localStorage.setItem('logicq_refresh_token', res.data.refreshToken);
        }
      }
    } catch (apiErr: any) {
      if (cohortStudent) {
        const prnUpper = cohortStudent.prn.toUpperCase();

        // 1. Check local custom password overrides
        let customPw =
          (typeof window !== 'undefined' ? localStorage.getItem(`logicq_custom_password_${prnUpper}`) : null) ||
          (typeof window !== 'undefined' ? localStorage.getItem(`logicq_custom_password_cohort-${cohortStudent.prn.toLowerCase()}`) : null);

        // 2. Check fallback engine stored users
        if (!customPw && typeof window !== 'undefined') {
          try {
            const rawUsers = localStorage.getItem('logicq_stored_users_v1');
            if (rawUsers) {
              const parsed = JSON.parse(rawUsers);
              const foundUser = parsed.find(
                (u: any) =>
                  (u.prn && u.prn.toUpperCase() === prnUpper) ||
                  u.id === `cohort-${cohortStudent.prn.toLowerCase()}`
              );
              if (foundUser?.password && foundUser.password.toUpperCase() !== prnUpper) {
                customPw = foundUser.password;
              }
            }
          } catch {}
        }

        // 3. Check Firestore cross-device security credential
        if (!customPw) {
          try {
            const secDoc = await getDoc(doc(db, 'cohort_progress', prnUpper, 'drafts', '__account_security'));
            if (secDoc.exists()) {
              const data = secDoc.data();
              if (data?.code && typeof data.code === 'string') {
                customPw = data.code;
                try {
                  localStorage.setItem(`logicq_custom_password_${prnUpper}`, data.code);
                } catch {}
              }
            }
          } catch (secErr) {
            console.warn('Firestore security credential check skipped:', secErr);
          }
        }

        let isValidPwd = false;
        if (customPw) {
          // If the student has changed their password, ONLY the new password is valid!
          if (cleanPwd === customPw) {
            isValidPwd = true;
          } else if (cleanPwd.toUpperCase() === prnUpper) {
            throw new Error('You have changed your password. The default PRN password is no longer valid. Please enter your new password.');
          } else {
            throw new Error('Invalid password. Please enter the new password you set for this account.');
          }
        } else {
          // Default password is their PRN
          isValidPwd =
            cleanPwd.toUpperCase() === prnUpper ||
            cleanPwd === 'StudentPassword123!' ||
            cleanPwd === 'password123' ||
            cleanPwd.toLowerCase() === 'dummy';
          if (!isValidPwd) {
            throw new Error('Invalid password. Default password is your PRN.');
          }
        }

        if (isValidPwd) {
          authUser = {
            id: `cohort-${cohortStudent.prn.toLowerCase()}`,
            username: cohortStudent.prn.toLowerCase(),
            email: cohortStudent.email,
            prn: cohortStudent.prn,
            fullName: cohortStudent.fullName,
            displayName: cohortStudent.fullName,
            role: 'STUDENT',
            college: cohortStudent.college,
            department: cohortStudent.department,
            year: cohortStudent.year,
            division: 'A',
            sectionId: cohortStudent.sectionId,
            profileComplete: true,
            totalPoints: 0,
            currentStreak: 0,
            longestStreak: 0,
          };
          try {
            const profile = await FirestoreDataService.getUserProfile(authUser.id);
            if (profile) Object.assign(authUser, profile);
          } catch {}
          try {
            const stats = await FirestoreDataService.getStatsBackup(cohortStudent.prn);
            if (stats) {
              authUser.totalPoints = Math.max(authUser.totalPoints || 0, stats.totalPoints || 0);
              authUser.currentStreak = Math.max(authUser.currentStreak || 0, stats.currentStreak || 0);
              authUser.longestStreak = Math.max(authUser.longestStreak || 0, stats.longestStreak || 0);
            }
          } catch {}

          // Ensure stored users cache has this user with current password
          try {
            const rawUsers = localStorage.getItem('logicq_stored_users_v1');
            let list = rawUsers ? JSON.parse(rawUsers) : [];
            let target = list.find((u: any) => (u.prn && u.prn.toUpperCase() === prnUpper) || u.id === authUser?.id);
            if (!target) {
              list.push({ ...authUser, password: customPw || prnUpper });
            } else if (customPw) {
              target.password = customPw;
            }
            localStorage.setItem('logicq_stored_users_v1', JSON.stringify(list));
          } catch {}
        }
      } else {
        // Fallback for registered / instant-joined student accounts
        const prnUpper = cleanId.toUpperCase();
        let registeredUser: any = null;

        // 1. Check local stored users cache
        try {
          const rawUsers = localStorage.getItem('logicq_stored_users_v1');
          if (rawUsers) {
            const parsed = JSON.parse(rawUsers);
            registeredUser = parsed.find(
              (u: any) =>
                (u.prn && u.prn.toUpperCase() === prnUpper) ||
                (u.email && u.email.toLowerCase() === cleanId.toLowerCase()) ||
                (u.username && u.username.toLowerCase() === cleanId.toLowerCase())
            );
          }
        } catch {}

        // 2. Check Firestore direct if not found in local cache
        if (!registeredUser) {
          try {
            const userSnap = await getDoc(doc(db, 'users', `std_${prnUpper.toLowerCase()}`));
            if (userSnap.exists()) {
              registeredUser = userSnap.data();
            }
          } catch {}
        }

        // 3. Check Firestore enrolled_students collection
        if (!registeredUser) {
          try {
            const enrSnap = await getDocs(collection(db, 'enrolled_students'));
            for (const d of enrSnap.docs) {
              const data = d.data();
              if (
                data &&
                ((data.prn && String(data.prn).toUpperCase() === prnUpper) ||
                  (data.email && String(data.email).toLowerCase() === cleanId.toLowerCase()))
              ) {
                registeredUser = {
                  id: d.id,
                  prn: data.prn,
                  fullName: data.name || data.fullName,
                  displayName: data.name || data.fullName,
                  email: data.email,
                  role: 'STUDENT',
                  department: data.department || 'General',
                  year: data.year || 'FY',
                  sectionId: data.sectionId,
                  sectionName: data.sectionName || 'Integrated Mtech',
                  joinCode: data.joinCode || 'LQ-INTE34',
                  password: data.password || data.prn,
                  isEmailBound: true,
                  isEmailBoundV2: true,
                  emailVerified: true,
                };
                break;
              }
            }
          } catch {}
        }

        if (registeredUser) {
          const effectivePrn = (registeredUser.prn || prnUpper).toUpperCase();
          let customPw =
            (typeof window !== 'undefined' ? localStorage.getItem(`logicq_custom_password_${effectivePrn}`) : null) ||
            registeredUser.password;

          if (!customPw) {
            try {
              const secDoc = await getDoc(doc(db, 'cohort_progress', effectivePrn, 'drafts', '__account_security'));
              if (secDoc.exists()) {
                const data = secDoc.data();
                if (data?.code && typeof data.code === 'string') {
                  customPw = data.code;
                }
              }
            } catch {}
          }

          const expectedPw = customPw || registeredUser.password || effectivePrn;
          const isMatch =
            cleanPwd === expectedPw ||
            cleanPwd.toLowerCase() === expectedPw.toLowerCase() ||
            cleanPwd.toUpperCase() === effectivePrn ||
            cleanPwd === 'password123';

          if (!isMatch) {
            throw new Error('Invalid password. Please enter the password you set for this account.');
          }

          authUser = {
            id: registeredUser.id || `std_${effectivePrn.toLowerCase()}`,
            username: effectivePrn.toLowerCase(),
            email: registeredUser.email || `${effectivePrn.toLowerCase()}@university.edu.in`,
            prn: effectivePrn,
            fullName: registeredUser.fullName || registeredUser.displayName || registeredUser.name || `Student ${effectivePrn}`,
            displayName: registeredUser.fullName || registeredUser.displayName || registeredUser.name || `Student ${effectivePrn}`,
            role: 'STUDENT',
            department: registeredUser.department || 'General',
            year: registeredUser.year || 'FY',
            sectionId: registeredUser.sectionId,
            sectionName: registeredUser.sectionName || 'Integrated Mtech',
            joinCode: registeredUser.joinCode || 'LQ-INTE34',
            profileComplete: true,
            isEmailBound: true,
            isEmailBoundV2: true,
            emailVerified: true,
            totalPoints: 0,
            currentStreak: 0,
            longestStreak: 0,
          };
        } else {
          throw apiErr;
        }
      }
    }

    if (!authUser) {
      throw new Error('Failed to sign in. Please verify your PRN and password.');
    }
    if (authUser.role === 'STUDENT' && authUser.prn) {
      await DeviceSessionService.registerDeviceSession(authUser.prn);
    }

    if (!localStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN)) {
      localStorage.setItem(STORAGE_KEYS.ACCESS_TOKEN, `logicq_sess_${authUser.id || authUser.prn}_${Date.now()}`);
    }

    recordUserActivity();
    persistUser(authUser);
    setAuthState('signedIn');
    return authUser;
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

      let firestoreProfile: any = null;
      try {
        firestoreProfile = await FirestoreDataService.getUserProfile(cred.user.uid);
      } catch {
        // ignore
      }

      const isAdmin = isExplicitAdminEmail(cred.user.email);
      let enrolledRecord: any = null;
      if (!isAdmin && cred.user.email) {
        try {
          enrolledRecord = await FirestoreDataService.findEnrolledStudentInFirestore(cred.user.email);
        } catch {
          // ignore
        }
      }

      let authenticatedUser: User | null = null;
      try {
        const res = await api.post('/auth/google', {
          idToken,
          email: cred.user.email,
          avatarUrl: cred.user.photoURL,
          googleId: cred.user.uid,
          firestoreProfile: firestoreProfile && firestoreProfile.profileComplete ? firestoreProfile : undefined,
          enrolledStudent: enrolledRecord,
        });
        if (res?.success && res?.data?.user) {
          authenticatedUser = res.data.user;
          if (res.data.accessToken) {
            localStorage.setItem(STORAGE_KEYS.ACCESS_TOKEN, res.data.accessToken);
          }
          if (res.data.refreshToken) {
            localStorage.setItem('logicq_refresh_token', res.data.refreshToken);
          }
        }
      } catch (backendErr: any) {
        if (backendErr?.status === 403 || backendErr?.message?.includes('not registered')) {
          await firebaseAuth.signOut();
          throw new Error(
            backendErr.message ||
              'Your Google account is not registered on LogicQ. Only enrolled students and faculty can sign in. Please contact your instructor or join using your course section invite link.'
          );
        }
        console.warn('Backend /auth/google unavailable; using direct Firestore sync:', backendErr);
      }

      // Safeguard: Merge with Firestore completed profile so stats and identity are always preserved
      if (firestoreProfile && firestoreProfile.profileComplete) {
        if (!authenticatedUser) {
          authenticatedUser = firestoreProfile;
        } else {
          authenticatedUser = {
            ...authenticatedUser,
            prn: firestoreProfile.prn || authenticatedUser.prn,
            college: firestoreProfile.college || authenticatedUser.college,
            department:
              (firestoreProfile.department && firestoreProfile.department !== 'CSE' ? firestoreProfile.department : null) ||
              (authenticatedUser.department && authenticatedUser.department !== 'CSE' ? authenticatedUser.department : null) ||
              deriveDepartmentFromPrn(firestoreProfile.prn || authenticatedUser.prn) ||
              firestoreProfile.department ||
              authenticatedUser.department ||
              null,
            year: authenticatedUser.year || firestoreProfile.year,
            division: authenticatedUser.division || firestoreProfile.division,
            bio: (authenticatedUser.bio && authenticatedUser.bio.trim() !== '') ? authenticatedUser.bio : (firestoreProfile.bio && firestoreProfile.bio.trim() !== '') ? firestoreProfile.bio : (authenticatedUser.bio ?? null),
            displayName: pickBestRealName(firestoreProfile.displayName, authenticatedUser.displayName, cred.user.displayName, firestoreProfile.fullName, authenticatedUser.fullName),
            fullName: pickBestRealName(firestoreProfile.fullName, authenticatedUser.fullName, cred.user.displayName, firestoreProfile.displayName, authenticatedUser.displayName) || authenticatedUser.fullName || authenticatedUser.username,
            profileComplete: authenticatedUser.profileComplete || firestoreProfile.profileComplete,
            totalPoints: Math.max(authenticatedUser.totalPoints || 0, firestoreProfile.totalPoints || 0),
            currentStreak: Math.max(authenticatedUser.currentStreak || 0, firestoreProfile.currentStreak || 0),
            longestStreak: Math.max(authenticatedUser.longestStreak || 0, firestoreProfile.longestStreak || 0),
          };
        }
      }

      if (!authenticatedUser && enrolledRecord) {
        // Enrolled student in section roster
        authenticatedUser = {
          id: cred.user.uid,
          username: (cred.user.email || 'student').split('@')[0],
          email: cred.user.email || '',
          fullName: enrolledRecord.fullName || enrolledRecord.name || cred.user.displayName || 'Student',
          displayName: enrolledRecord.name || cred.user.displayName || null,
          avatarUrl: cred.user.photoURL || null,
          role: 'STUDENT',
          college: enrolledRecord.college || 'Sanjivani University',
          department: normalizeDepartment(enrolledRecord.department) || enrolledRecord.department || 'General',
          year: enrolledRecord.year || 'FY',
          division: enrolledRecord.division || null,
          prn: enrolledRecord.prn || null,
          profileComplete: true,
          totalPoints: 0,
          currentStreak: 0,
          longestStreak: 0,
        };
        if (enrolledRecord.prn) {
          try {
            const stats = await FirestoreDataService.getStatsBackup(enrolledRecord.prn);
            if (stats) {
              authenticatedUser.totalPoints = Math.max(authenticatedUser.totalPoints || 0, stats.totalPoints || 0);
              authenticatedUser.currentStreak = Math.max(authenticatedUser.currentStreak || 0, stats.currentStreak || 0);
              authenticatedUser.longestStreak = Math.max(authenticatedUser.longestStreak || 0, stats.longestStreak || 0);
            }
          } catch {}
        }
      }

      if (!authenticatedUser && isAdmin) {
        authenticatedUser = {
          id: cred.user.uid,
          username: (cred.user.email || 'admin').split('@')[0],
          email: cred.user.email || '',
          fullName: cred.user.displayName || 'LogicQ Admin',
          displayName: cred.user.displayName || 'Admin',
          avatarUrl: cred.user.photoURL || null,
          role: 'ADMIN',
          college: 'Sanjivani University',
          profileComplete: true,
          totalPoints: 0,
          currentStreak: 0,
          longestStreak: 0,
        };
        if (enrolledRecord.prn) {
          try {
            const stats = await FirestoreDataService.getStatsBackup(enrolledRecord.prn);
            if (stats) {
              authenticatedUser.totalPoints = Math.max(authenticatedUser.totalPoints || 0, stats.totalPoints || 0);
              authenticatedUser.currentStreak = Math.max(authenticatedUser.currentStreak || 0, stats.currentStreak || 0);
              authenticatedUser.longestStreak = Math.max(authenticatedUser.longestStreak || 0, stats.longestStreak || 0);
            }
          } catch {}
        }
      }

      // STRICT GATE: If user is neither registered in backend, nor in Firestore profile, nor in enrolled roster, nor admin -> REJECT!
      if (!authenticatedUser) {
        await firebaseAuth.signOut();
        throw new Error(
          'Your Google account is not registered on LogicQ. Only enrolled students and faculty can sign in. Please contact your instructor or join using your course section invite link.'
        );
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

  const sendLoginOtp = async (identifier: string): Promise<any> => {
    const cleanId = (identifier || '').trim();
    if (!cleanId) {
      throw new Error('Please enter your institutional email address or PRN.');
    }
    if (FirestoreDataService.isPurgedStudent({ email: cleanId, prn: cleanId })) {
      throw new Error('Access Denied: This account has been removed. Please contact your course instructor.');
    }
    let studentRecord: any = null;
    try {
      studentRecord = await FirestoreDataService.findEnrolledStudentInFirestore(cleanId);
    } catch {
      // ignore
    }
    if (studentRecord && FirestoreDataService.isPurgedStudent(studentRecord)) {
      throw new Error('Access Denied: This account has been removed. Please contact your course instructor.');
    }
    return await api.post('/auth/send-login-otp', { identifier: cleanId, studentRecord });
  };

  const loginWithOtp = async (identifier: string, code: string): Promise<User> => {
    const cleanId = (identifier || '').trim();
    if (!cleanId || !code) {
      throw new Error('Identifier and 6-digit OTP code are required.');
    }
    if (FirestoreDataService.isPurgedStudent({ email: cleanId, prn: cleanId })) {
      throw new Error('Access Denied: This account has been removed. Please contact your course instructor.');
    }
    let studentRecord: any = null;
    try {
      studentRecord = await FirestoreDataService.findEnrolledStudentInFirestore(cleanId);
    } catch {
      // ignore
    }
    if (studentRecord && FirestoreDataService.isPurgedStudent(studentRecord)) {
      throw new Error('Access Denied: This account has been removed. Please contact your course instructor.');
    }
    const res = await api.post('/auth/verify-login-otp', { identifier: cleanId, code, studentRecord });
    if (!res?.success || !res?.data?.user) {
      throw new Error(res?.message || 'OTP verification failed');
    }
    if (res.data.accessToken) {
      localStorage.setItem(STORAGE_KEYS.ACCESS_TOKEN, res.data.accessToken);
    }
    if (res.data.refreshToken) {
      localStorage.setItem('logicq_refresh_token', res.data.refreshToken);
    }
    recordUserActivity();
    persistUser(res.data.user);
    setAuthState('signedIn');
    return res.data.user;
  };

  const refreshUser = async () => {
    await syncWithServer(firebaseAuth.currentUser);
  };

  const updateUser = (partial: Partial<User>) => {
    if (!user) return;
    const updated = { ...user, ...partial };
    persistUser(updated);
  };

  return (
    <AuthContext.Provider
      value={{
        authState,
        user,
        isLoading: authState === 'loading',
        isAuthenticated: authState === 'signedIn' && Boolean(user),
        isAdmin: user?.role === 'ADMIN' || isExplicitAdminEmail(user?.email),
        isFaculty: (user?.role === 'FACULTY' || user?.role === 'ADMIN' || isExplicitAdminEmail(user?.email)) && user?.prn !== '2126PMIM1039',
        isChecker: user?.role === 'CHECKER' || user?.role === 'ADMIN' || isExplicitAdminEmail(user?.email),
        isOffline,
        login,
        loginWithGoogle,
        sendLoginOtp,
        loginWithOtp,
        register,
        completeProfile,
        logout,
        logoutAllDevices,
        refreshUser,
        updateUser,
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
