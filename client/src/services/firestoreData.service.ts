import {
  doc,
  getDoc,
  updateDoc,
  setDoc,
  writeBatch,
  collection,
  query,
  where,
  getDocs,
  onSnapshot,
  serverTimestamp,
  Unsubscribe,
} from 'firebase/firestore';
import { db } from '../config/firebase.js';
import { User, Submission } from '../types/index.js';
import { maskPrn, formatOwnIdentityLabel, formatPublicDisplayName } from '../config/academic.config.js';
import { isExplicitAdminEmail } from '../api/fallbackEngine.js';

export interface StudentPracticeProgress {
  userId: string;
  completedProblems: string[];
  moduleProgress?: Record<string, { completedCount: number; isUnlocked: boolean }>;
  updatedAt?: any;
}

export class FirestoreDataService {
  /**
   * Completes initial profile onboarding for a student atomically in Firestore:
   * 1. Checks prnIndex/{prn} to ensure PRN is unique
   * 2. Writes users/{uid} document with profile fields, role: 'STUDENT', profileComplete: true
   * 3. Creates prnIndex/{prn} document
   * 4. Creates publicProfiles/{uid} document
   */
  public static async completeUserProfile(
    uid: string,
    email: string,
    data: {
      prn: string;
      fullName?: string;
      displayName?: string;
      college: string;
      department: string;
      year: string;
      division?: string;
    }
  ): Promise<User> {
    if (!uid) throw new Error('Unauthenticated');
    const normalizedPrn = data.prn.trim().toUpperCase();
    const shortId = normalizedPrn.slice(-4);
    const resolvedName = (data.fullName || data.displayName || 'Student').trim();
    const resolvedDisplayName = (data.displayName || resolvedName).slice(0, 20);

    const prnRef = doc(db, 'prnIndex', normalizedPrn);
    const userDocRef = doc(db, 'users', uid);
    const normalizedEmail = email.trim().toLowerCase();

    const batch = writeBatch(db);

    const userData: Record<string, any> = {
      uid,
      id: uid,
      email: normalizedEmail,
      username: normalizedEmail.split('@')[0],
      fullName: resolvedName,
      displayName: resolvedDisplayName,
      shortId,
      prn: normalizedPrn,
      college: data.college,
      department: data.department,
      year: data.year,
      division: data.division || null,
      role: 'STUDENT',
      profileComplete: true,
      totalPoints: 0,
      currentStreak: 0,
      longestStreak: 0,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };
    batch.set(userDocRef, userData, { merge: true });

    // Set prnIndex (enforces global uniqueness atomically in Firestore rules)
    batch.set(prnRef, {
      prn: normalizedPrn,
      userId: uid,
      createdAt: serverTimestamp(),
    });

    // Set non-PII publicProfiles mirror
    const publicRef = doc(db, 'publicProfiles', uid);
    batch.set(publicRef, {
      userId: uid,
      shortId,
      displayName: resolvedDisplayName,
      department: data.department,
      year: data.year,
      division: data.division || null,
      role: 'STUDENT',
      totalPoints: 0,
      currentStreak: 0,
      updatedAt: serverTimestamp(),
    });

    try {
      await batch.commit();
    } catch (batchErr: any) {
      console.error('Firestore completeUserProfile batch commit failed:', batchErr);
      const code = batchErr?.code;
      const msg = batchErr?.message || '';
      if (code === 'permission-denied' || msg.includes('permission') || msg.includes('insufficient')) {
        throw new Error(
          'Unable to complete profile. This PRN may already be registered to another account, or your details do not match academic records.'
        );
      }
      throw batchErr;
    }

    return {
      id: uid,
      username: normalizedEmail.split('@')[0],
      email: normalizedEmail,
      fullName: resolvedName,
      displayName: resolvedDisplayName,
      shortId,
      prn: normalizedPrn,
      college: data.college,
      department: data.department,
      year: data.year,
      division: data.division || null,
      role: 'STUDENT',
      profileComplete: true,
      totalPoints: 0,
      currentStreak: 0,
      longestStreak: 0,
    };
  }
  /**
   * Reads the authoritative private student profile from users/{uid}
   */
  public static async getUserProfile(uid: string): Promise<User | null> {
    if (!uid) return null;
    try {
      const userRef = doc(db, 'users', uid);
      const snap = await getDoc(userRef);
      if (!snap.exists()) {
        return null;
      }
      return FirestoreDataService.mapDocToUser(uid, snap.data());
    } catch (err) {
      console.error('FirestoreDataService.getUserProfile error:', err);
      throw err;
    }
  }

  /**
   * Subscribes to real-time changes on users/{uid} across devices and tabs
   */
  public static subscribeUserProfile(
    uid: string,
    onData: (user: User | null) => void,
    onError?: (error: Error) => void
  ): Unsubscribe {
    const userRef = doc(db, 'users', uid);
    return onSnapshot(
      userRef,
      (snap) => {
        if (!snap.exists()) {
          onData(null);
          return;
        }
        const user = FirestoreDataService.mapDocToUser(uid, snap.data());
        onData(user);
      },
      (error) => {
        console.error('FirestoreDataService.subscribeUserProfile error:', error);
        if (onError) onError(error);
      }
    );
  }

  /**
   * Updates self-service academic/profile fields in compliance with firestore.rules
   * Only allowed keys: department, year, division, displayName, bio, photoURL, storagePreference, themePreference, updatedAt
   */
  public static async updateUserProfile(
    uid: string,
    updates: Partial<{
      department: string;
      year: string;
      division: string | null;
      displayName: string | null;
      bio: string | null;
      photoURL: string | null;
      storagePreference: 'GOOGLE_DRIVE' | 'FIRESTORE_FALLBACK' | 'LOCAL_STORAGE';
      themePreference: 'light' | 'dark' | 'system';
    }>
  ): Promise<void> {
    if (!uid) throw new Error('Unauthenticated');
    const userRef = doc(db, 'users', uid);

    const safePayload: Record<string, any> = {
      updatedAt: serverTimestamp(),
    };

    if (updates.department !== undefined) safePayload.department = updates.department;
    if (updates.year !== undefined) safePayload.year = updates.year;
    if (updates.division !== undefined) safePayload.division = updates.division;
    if (updates.displayName !== undefined) safePayload.displayName = updates.displayName;
    if (updates.bio !== undefined) safePayload.bio = updates.bio;
    if (updates.photoURL !== undefined) safePayload.photoURL = updates.photoURL;
    if (updates.storagePreference !== undefined) safePayload.storagePreference = updates.storagePreference;
    if (updates.themePreference !== undefined) safePayload.themePreference = updates.themePreference;

    await updateDoc(userRef, safePayload);
  }

  /**
   * Fetches real-time submissions for the student from submissions collection
   */
  public static async getUserSubmissions(uid: string): Promise<Submission[]> {
    if (!uid) return [];
    try {
      const q = query(collection(db, 'submissions'), where('userId', '==', uid));
      const snap = await getDocs(q);
      const list: Submission[] = [];
      snap.forEach((d) => {
        const data = d.data();
        list.push({
          id: d.id,
          userId: data.userId || uid,
          problemId: data.problemId || '',
          contestId: data.contestId || null,
          code: data.code || '',
          language: data.language || 'c',
          verdict: data.verdict || 'PENDING',
          runtimeMs: data.runtimeMs ?? null,
          memoryKb: data.memoryKb ?? null,
          compileOutput: data.compileOutput ?? null,
          pointsAwarded: Number(data.pointsAwarded || data.points || 0),
          createdAt: data.createdAt?.toDate ? data.createdAt.toDate().toISOString() : (data.createdAt || new Date().toISOString()),
          problem: data.problem || {
            id: data.problemId || '',
            title: data.problemTitle || 'Challenge Problem',
            slug: data.problemSlug || data.problemId || '',
            difficulty: data.difficulty || 'MEDIUM',
          },
        });
      });

      // Sort descending by creation date
      return list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    } catch (err) {
      console.warn('FirestoreDataService.getUserSubmissions error:', err);
      return [];
    }
  }

  /**
   * Subscribes to real-time submissions for the student
   */
  public static subscribeUserSubmissions(
    uid: string,
    onData: (submissions: Submission[]) => void,
    onError?: (error: Error) => void
  ): Unsubscribe {
    const q = query(collection(db, 'submissions'), where('userId', '==', uid));
    return onSnapshot(
      q,
      (snap) => {
        const list: Submission[] = [];
        snap.forEach((d) => {
          const data = d.data();
          list.push({
            id: d.id,
            userId: data.userId || uid,
            problemId: data.problemId || '',
            contestId: data.contestId || null,
            code: data.code || '',
            language: data.language || 'c',
            verdict: data.verdict || 'PENDING',
            runtimeMs: data.runtimeMs ?? null,
            memoryKb: data.memoryKb ?? null,
            compileOutput: data.compileOutput ?? null,
            pointsAwarded: Number(data.pointsAwarded || data.points || 0),
            createdAt: data.createdAt?.toDate ? data.createdAt.toDate().toISOString() : (data.createdAt || new Date().toISOString()),
            problem: data.problem || {
              id: data.problemId || '',
              title: data.problemTitle || 'Challenge Problem',
              slug: data.problemSlug || data.problemId || '',
              difficulty: data.difficulty || 'MEDIUM',
            },
          });
        });
        list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        onData(list);
      },
      (error) => {
        console.warn('FirestoreDataService.subscribeUserSubmissions error:', error);
        if (onError) onError(error);
      }
    );
  }

  /**
   * Reads student practice progress from practice_progress/{uid}
   */
  public static async getPracticeProgress(uid: string): Promise<StudentPracticeProgress | null> {
    if (!uid) return null;
    try {
      const docRef = doc(db, 'practice_progress', uid);
      const snap = await getDoc(docRef);
      if (snap.exists()) {
        const data = snap.data();
        return {
          userId: uid,
          completedProblems: Array.isArray(data.completedProblems) ? data.completedProblems : [],
          moduleProgress: data.moduleProgress || {},
          updatedAt: data.updatedAt,
        };
      }
      return null;
    } catch (err) {
      console.warn('FirestoreDataService.getPracticeProgress error:', err);
      return null;
    }
  }

  /**
   * Subscribes to practice progress changes
   */
  public static subscribePracticeProgress(
    uid: string,
    onData: (prog: StudentPracticeProgress | null) => void,
    onError?: (error: Error) => void
  ): Unsubscribe {
    const docRef = doc(db, 'practice_progress', uid);
    return onSnapshot(
      docRef,
      (snap) => {
        if (!snap.exists()) {
          onData(null);
          return;
        }
        const data = snap.data();
        onData({
          userId: uid,
          completedProblems: Array.isArray(data.completedProblems) ? data.completedProblems : [],
          moduleProgress: data.moduleProgress || {},
          updatedAt: data.updatedAt,
        });
      },
      (error) => {
        console.warn('FirestoreDataService.subscribePracticeProgress error:', error);
        if (onError) onError(error);
      }
    );
  }

  /**
   * Maps raw Firestore document data to strongly-typed User object
   */
  private static mapDocToUser(uid: string, data: any): User {
    const prn = data.prn || null;
    const shortId = data.shortId || (prn ? prn.slice(-4) : uid.slice(-4));
    const masked = prn ? maskPrn(prn) : (data.maskedPrn || null);
    const stats = data.stats || {};

    const totalPoints = Number(data.totalPoints ?? stats.totalPoints ?? 0);
    const currentStreak = Number(data.currentStreak ?? stats.currentStreak ?? 0);
    const longestStreak = Number(data.longestStreak ?? stats.longestStreak ?? 0);

    const email = data.email || '';
    const isAdmin = isExplicitAdminEmail(email) || data.role === 'ADMIN';
    const role = isAdmin ? 'ADMIN' : (data.role || 'STUDENT');
    const profileComplete = isAdmin ? true : Boolean(data.profileComplete && prn);

    return {
      id: uid,
      username: data.username || (isAdmin ? 'admin' : `stu_${shortId.toLowerCase()}`),
      email,
      prn,
      maskedPrn: masked,
      shortId,
      fullName: data.fullName || data.displayName || (isAdmin ? 'LogicQ Admin' : `Student ${shortId}`),
      displayName: data.displayName || (isAdmin ? 'Admin' : null),
      publicDisplayName: data.displayName || (isAdmin ? 'Administrator' : (data.department && data.year ? `${data.department} • ${data.year} • ••••••••${shortId}` : `Student ••••••••${shortId}`)),
      ownIdentityLabel: prn && data.department && data.year ? `${data.department} • ${data.year} • ${masked}` : (isAdmin ? 'System Administrator' : null),
      role,
      college: data.college || 'Sanjivani University',
      department: data.department || null,
      year: data.year || null,
      division: data.division || null,
      profileComplete,
      bio: data.bio || null,
      avatarUrl: data.photoURL || data.avatarUrl || null,
      totalPoints,
      currentStreak,
      longestStreak,
      lastSolvedDate: data.lastSolvedDate || stats.lastSolvedDate || null,
      prnChangedAt: data.prnChangedAt || null,
      prnNextAllowedDate: data.prnNextAllowedDate || null,
      isPrnChangeEligible: Boolean(data.isPrnChangeEligible),
      themePreference: data.themePreference || null,
      storagePreference: data.storagePreference || null,
      createdAt: data.createdAt?.toDate ? data.createdAt.toDate().toISOString() : data.createdAt,
    };
  }
}
