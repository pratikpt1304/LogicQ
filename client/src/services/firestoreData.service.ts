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
import { db, auth } from '../config/firebase.js';
import { User, Submission } from '../types/index.js';
import { maskPrn, formatOwnIdentityLabel, formatPublicDisplayName } from '../config/academic.config.js';
import { isExplicitAdminEmail } from '../api/fallbackEngine.js';

export interface StudentPracticeProgress {
  userId: string;
  completedProblems: string[];
  moduleProgress?: Record<string, { completedCount: number; isUnlocked: boolean }>;
  updatedAt?: any;
}

export interface StudentStatsBackup {
  userId: string;
  totalPoints: number;
  currentStreak: number;
  longestStreak: number;
  totalSolved: number;
  completedProblems?: string[];
  lastSolvedDate?: string | null;
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
    if (!uid && !auth.currentUser?.uid) return null;
    const primaryUid = uid || auth.currentUser?.uid || '';
    try {
      let snap = await getDoc(doc(db, 'users', primaryUid));
      let resolvedUid = primaryUid;

      // Fallback: if caller passed an internal SQL id or alias, check auth.currentUser.uid
      if (!snap.exists() && auth.currentUser?.uid && auth.currentUser.uid !== primaryUid) {
        const altSnap = await getDoc(doc(db, 'users', auth.currentUser.uid));
        if (altSnap.exists()) {
          snap = altSnap;
          resolvedUid = auth.currentUser.uid;
        }
      }

      if (!snap.exists()) {
        return null;
      }

      const user = FirestoreDataService.mapDocToUser(resolvedUid, snap.data());

      // Merge stats backup if available in users/{resolvedUid}/drafts/stats_backup
      try {
        const statsBackup = await FirestoreDataService.getStatsBackup(resolvedUid);
        if (statsBackup) {
          user.totalPoints = Math.max(user.totalPoints || 0, statsBackup.totalPoints || 0);
          user.currentStreak = Math.max(user.currentStreak || 0, statsBackup.currentStreak || 0);
          user.longestStreak = Math.max(user.longestStreak || 0, statsBackup.longestStreak || 0);
        }
      } catch {
        // ignore
      }

      return user;
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
    if (!uid && !auth.currentUser?.uid) return [];
    const targetUids = Array.from(new Set([uid, auth.currentUser?.uid].filter(Boolean) as string[]));
    try {
      const submissionMap = new Map<string, Submission>();

      for (const targetUid of targetUids) {
        const q = query(collection(db, 'submissions'), where('userId', '==', targetUid));
        const snap = await getDocs(q).catch(() => null);
        if (snap) {
          snap.forEach((d) => {
            const data = d.data();
            if (!submissionMap.has(d.id)) {
              submissionMap.set(d.id, {
                id: d.id,
                userId: data.userId || targetUid,
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
            }
          });
        }
      }

      const list = Array.from(submissionMap.values());
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
    if (!uid && !auth.currentUser?.uid) return null;
    const primaryUid = uid || auth.currentUser?.uid || '';
    try {
      let docRef = doc(db, 'practice_progress', primaryUid);
      let snap = await getDoc(docRef);
      if (!snap.exists() && auth.currentUser?.uid && auth.currentUser.uid !== primaryUid) {
        docRef = doc(db, 'practice_progress', auth.currentUser.uid);
        snap = await getDoc(docRef);
      }
      if (snap.exists()) {
        const data = snap.data();
        return {
          userId: primaryUid,
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
   * Persists an immutable backup of student stats in users/{uid}/drafts/stats_backup
   * Permitted by firestore.rules under drafts subcollection.
   */
  public static async saveStatsBackup(uid: string, stats: Partial<StudentStatsBackup>): Promise<void> {
    const targetUid = uid || auth.currentUser?.uid;
    if (!targetUid) return;
    try {
      const statsRef = doc(db, 'users', targetUid, 'drafts', 'stats_backup');
      const existing = await getDoc(statsRef).catch(() => null);
      const existingData = existing && existing.exists() ? existing.data() : {};

      const mergedPoints = Math.max(Number(existingData.totalPoints || 0), Number(stats.totalPoints || 0));
      const mergedStreak = Math.max(Number(existingData.currentStreak || 0), Number(stats.currentStreak || 0));
      const mergedLongest = Math.max(Number(existingData.longestStreak || 0), Number(stats.longestStreak || 0));
      const mergedSolved = Math.max(Number(existingData.totalSolved || 0), Number(stats.totalSolved || 0));
      const mergedProblems = Array.from(
        new Set([
          ...(Array.isArray(existingData.completedProblems) ? existingData.completedProblems : []),
          ...(Array.isArray(stats.completedProblems) ? stats.completedProblems : []),
        ])
      );

      await setDoc(
        statsRef,
        {
          userId: targetUid,
          totalPoints: mergedPoints,
          currentStreak: mergedStreak,
          longestStreak: mergedLongest,
          totalSolved: mergedSolved,
          completedProblems: mergedProblems,
          lastSolvedDate: stats.lastSolvedDate || existingData.lastSolvedDate || new Date().toISOString(),
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );
    } catch (err) {
      console.warn('FirestoreDataService.saveStatsBackup failed:', err);
    }
  }

  /**
   * Retrieves student stats backup from users/{uid}/drafts/stats_backup
   */
  public static async getStatsBackup(uid: string): Promise<StudentStatsBackup | null> {
    const targetUid = uid || auth.currentUser?.uid;
    if (!targetUid) return null;
    try {
      const statsRef = doc(db, 'users', targetUid, 'drafts', 'stats_backup');
      const snap = await getDoc(statsRef);
      if (snap.exists()) {
        const d = snap.data();
        return {
          userId: targetUid,
          totalPoints: Number(d.totalPoints || 0),
          currentStreak: Number(d.currentStreak || 0),
          longestStreak: Number(d.longestStreak || 0),
          totalSolved: Number(d.totalSolved || 0),
          completedProblems: Array.isArray(d.completedProblems) ? d.completedProblems : [],
          lastSolvedDate: d.lastSolvedDate || null,
          updatedAt: d.updatedAt,
        };
      }
      return null;
    } catch (err) {
      console.warn('FirestoreDataService.getStatsBackup failed:', err);
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

  /**
   * Fetches all registered student profiles directly from Firestore (Admin only)
   */
  public static async getAllFirestoreUsers(): Promise<User[]> {
    try {
      const snap = await getDocs(collection(db, 'users'));
      const list: User[] = [];
      snap.forEach((d) => {
        const raw = d.data();
        if (!raw) return;
        const mapped = FirestoreDataService.mapDocToUser(d.id, raw);
        list.push(mapped);
      });
      return list;
    } catch (err) {
      console.warn('getAllFirestoreUsers error from users collection, trying publicProfiles fallback:', err);
      try {
        const pubSnap = await getDocs(collection(db, 'publicProfiles'));
        const list: User[] = [];
        pubSnap.forEach((d) => {
          const raw = d.data();
          if (!raw) return;
          list.push({
            id: d.id,
            username: raw.username || d.id,
            email: '',
            prn: null,
            maskedPrn: '••••••••',
            shortId: '0000',
            fullName: raw.displayName || 'Student',
            displayName: raw.displayName || null,
            publicDisplayName: raw.displayName || 'Student',
            ownIdentityLabel: null,
            role: raw.role || 'STUDENT',
            college: raw.college || 'Sanjivani University',
            department: raw.department || null,
            year: raw.year || null,
            division: raw.division || null,
            profileComplete: true,
            totalPoints: Number(raw.totalPoints || 0),
            currentStreak: Number(raw.currentStreak || 0),
            longestStreak: Number(raw.longestStreak || 0),
            createdAt: new Date().toISOString(),
          } as User);
        });
        return list;
      } catch (pubErr) {
        console.warn('getAllFirestoreUsers publicProfiles fallback failed:', pubErr);
        return [];
      }
    }
  }
}
