import {
  doc,
  getDoc,
  updateDoc,
  setDoc,
  deleteDoc,
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
import { maskPrn, formatOwnIdentityLabel, formatPublicDisplayName, isRealPersonName } from '../config/academic.config.js';
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
    const targetUid = auth.currentUser?.uid || uid;
    if (!targetUid) throw new Error('Unauthenticated');
    const userRef = doc(db, 'users', targetUid);

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

    await setDoc(userRef, safePayload, { merge: true });

    // Also update non-PII publicProfiles mirror
    try {
      const publicRef = doc(db, 'publicProfiles', targetUid);
      const publicPayload: Record<string, any> = {
        userId: targetUid,
        role: 'STUDENT',
        updatedAt: serverTimestamp(),
      };
      if (updates.displayName !== undefined) publicPayload.displayName = updates.displayName;
      if (updates.department !== undefined) publicPayload.department = updates.department;
      if (updates.year !== undefined) publicPayload.year = updates.year;
      if (updates.division !== undefined) publicPayload.division = updates.division;
      if (updates.bio !== undefined) publicPayload.bio = updates.bio;
      await setDoc(publicRef, publicPayload, { merge: true });
    } catch {
      // non-fatal mirror update
    }
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

    const realCandidate = [data.displayName, data.fullName, data.name].find(isRealPersonName);
    const resolvedFullName = realCandidate || (isAdmin ? 'LogicQ Admin' : `Student ${shortId}`);
    const resolvedDisplayName = isRealPersonName(data.displayName) ? data.displayName : (isAdmin ? 'Admin' : (realCandidate || null));

    return {
      id: uid,
      username: data.username || (isAdmin ? 'admin' : `stu_${shortId.toLowerCase()}`),
      email,
      prn,
      maskedPrn: masked,
      shortId,
      fullName: resolvedFullName,
      displayName: resolvedDisplayName,
      publicDisplayName: resolvedDisplayName || resolvedFullName || (isAdmin ? 'Administrator' : `Student ${shortId}`),
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
      sectionId: data.sectionId || null,
      sectionName: data.sectionName || null,
      sections: data.sections || (data.sectionId ? [{ id: data.sectionId, sectionName: data.sectionName || 'Enrolled Section' }] : []),
      createdAt: data.createdAt?.toDate ? data.createdAt.toDate().toISOString() : data.createdAt,
    };
  }

  /**
   * Fetches all registered and enrolled student profiles directly from Firestore (Admin only)
   */
  public static async getAllFirestoreUsers(): Promise<User[]> {
    const list: User[] = [];
    const seenEmails = new Set<string>();
    const seenPrns = new Set<string>();

    // 1. Fetch from 'users' collection
    try {
      const snap = await getDocs(collection(db, 'users'));
      snap.forEach((d) => {
        const raw = d.data();
        if (!raw) return;
        const mapped = FirestoreDataService.mapDocToUser(d.id, raw);
        list.push(mapped);
        if (mapped.email) seenEmails.add(mapped.email.toLowerCase());
        if (mapped.prn) seenPrns.add(mapped.prn.toUpperCase());
      });
    } catch (err) {
      console.warn('getAllFirestoreUsers: users collection read skipped/failed:', err);
    }

    // 2. Fetch from 'enrolled_students' collection (guarantees enrolled students are visible in admin roster)
    try {
      const enrolledSnap = await getDocs(collection(db, 'enrolled_students'));
      enrolledSnap.forEach((d) => {
        const raw = d.data();
        if (!raw) return;
        const email = (raw.email || '').toLowerCase().trim();
        const prn = raw.prn ? String(raw.prn).toUpperCase().trim() : null;
        if ((email && seenEmails.has(email)) || (prn && seenPrns.has(prn))) {
          return;
        }
        if (email) seenEmails.add(email);
        if (prn) seenPrns.add(prn);

        const shortId = prn ? prn.slice(-4) : '0000';
        list.push({
          id: d.id,
          username: raw.username || (email ? email.split('@')[0] : `stu_${shortId}`),
          email,
          prn,
          maskedPrn: prn ? `••••••••${shortId}` : '••••••••',
          shortId,
          fullName: raw.name || raw.fullName || `Student ${shortId}`,
          displayName: raw.displayName || raw.name || `Student ${shortId}`,
          publicDisplayName: raw.displayName || raw.name || `Student ${shortId}`,
          role: 'STUDENT',
          college: raw.college || 'Sanjivani University',
          department: raw.department || 'CSE',
          year: raw.year || 'SY',
          division: raw.division || null,
          sectionId: raw.sectionId || null,
          sectionName: raw.sectionName || null,
          profileComplete: true,
          totalPoints: Number(raw.totalPoints || 0),
          currentStreak: Number(raw.currentStreak || 0),
          longestStreak: Number(raw.longestStreak || 0),
          createdAt: raw.enrolledAt?.toDate ? raw.enrolledAt.toDate().toISOString() : new Date().toISOString(),
        } as any);
      });
    } catch (err) {
      console.warn('getAllFirestoreUsers: enrolled_students collection read skipped/failed:', err);
    }

    // 3. Fallback: If empty, try publicProfiles
    if (list.length === 0) {
      try {
        const pubSnap = await getDocs(collection(db, 'publicProfiles'));
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
      } catch (pubErr) {
        console.warn('getAllFirestoreUsers publicProfiles fallback failed:', pubErr);
      }
    }

    return list.filter((u) => !FirestoreDataService.isPurgedStudent(u));
  }

  private static readonly DELETED_SECTIONS_KEY = 'logicq_deleted_section_ids_v1';

  /**
   * Identifies the legacy auto-seeded demo section (LQ-DC85) that must be permanently wiped.
   */
  public static isLegacyDemoSection(sectionOrId: any, maybeJoinCode?: string): boolean {
    if (!sectionOrId && !maybeJoinCode) return false;
    let id = '';
    let joinCode = '';
    let name = '';
    let desc = '';
    let token = '';

    if (typeof sectionOrId === 'string') {
      id = sectionOrId;
      joinCode = maybeJoinCode || '';
    } else if (typeof sectionOrId === 'object' && sectionOrId !== null) {
      id = sectionOrId.id || '';
      joinCode = sectionOrId.joinCode || maybeJoinCode || '';
      name = sectionOrId.sectionName || sectionOrId.name || '';
      desc = sectionOrId.description || '';
      token = sectionOrId.joinToken || '';
    }

    const upperCode = (joinCode || '').toUpperCase();
    const upperId = (id || '').toUpperCase();

    return (
      upperCode === 'LQ-DC85' ||
      upperCode === 'LQ-4904' ||
      upperCode === 'LQ-CE68' ||
      upperId === '1633F9EE-2C41-4CCF-B0C2-A293FEED2B50' ||
      upperId === 'CE205E2F-C4B1-4562-9E95-162DED89A42D' ||
      upperId === '20E4DB09-FE9A-47AB-A034-57B11E49A02F' ||
      token === '20e4db09-fe9a-47ab-a034-57b11e49a02f' ||
      token === '68267c8a-1d8e-426f-97cd-72d215792084' ||
      token === '54c6ce08-8307-44d2-9125-be8c7d2a38c7'
    );
  }

  /**
   * One-time deep purge of legacy and duplicate ghost demo sections across localStorage, IndexedDB, and Firestore.
   */
  public static async purgeLegacyDemoSection(): Promise<void> {
    try {
      // 1. Add to permanent tombstone list
      const raw = localStorage.getItem(FirestoreDataService.DELETED_SECTIONS_KEY);
      const list: string[] = raw ? JSON.parse(raw) : [];
      [
        'LQ-DC85', 'lq-dc85',
        'LQ-4904', 'lq-4904',
        'LQ-CE68', 'lq-ce68',
        '1633f9ee-2c41-4ccf-b0c2-a293feed2b50',
        'ce205e2f-c4b1-4562-9e95-162ded89a42d',
        '20e4db09-fe9a-47ab-a034-57b11e49a02f',
      ].forEach((k) => {
        if (!list.includes(k)) list.push(k);
      });
      localStorage.setItem(FirestoreDataService.DELETED_SECTIONS_KEY, JSON.stringify(list));

      // 2. Clean localStorage sections backup
      const LOCAL_KEY = 'logicq_faculty_sections_backup_v2';
      const existing = JSON.parse(localStorage.getItem(LOCAL_KEY) || '[]');
      if (Array.isArray(existing)) {
        const filtered = existing.filter((s: any) => !FirestoreDataService.isLegacyDemoSection(s));
        localStorage.setItem(LOCAL_KEY, JSON.stringify(filtered));
      }

      // 3. Remove section roster cache
      localStorage.removeItem('logicq_section_students_LQ-DC85');
      localStorage.removeItem('logicq_section_students_LQ-4904');
      localStorage.removeItem('logicq_section_students_LQ-CE68');
      localStorage.removeItem('logicq_section_students_1633f9ee-2c41-4ccf-b0c2-a293feed2b50');
      localStorage.removeItem('logicq_section_students_ce205e2f-c4b1-4562-9e95-162ded89a42d');
      localStorage.removeItem('logicq_section_students_20e4db09-fe9a-47ab-a034-57b11e49a02f');

      // 4. Delete Firestore documents
      const q = query(collection(db, 'sections'), where('joinCode', '==', 'LQ-DC85'));
      const snap = await getDocs(q);
      for (const d of snap.docs) {
        await deleteDoc(d.ref).catch(() => {});
      }
      await deleteDoc(doc(db, 'sections', '20e4db09-fe9a-47ab-a034-57b11e49a02f')).catch(() => {});
    } catch (e) {
      console.warn('purgeLegacyDemoSection notice:', e);
    }
  }

  /**
   * Checks if a section has been deleted locally or marked as tombstoned.
   */
  public static isSectionDeleted(sectionId?: string, joinCode?: string): boolean {
    if (FirestoreDataService.isLegacyDemoSection(sectionId, joinCode)) {
      return true;
    }
    try {
      const raw = localStorage.getItem(FirestoreDataService.DELETED_SECTIONS_KEY);
      if (!raw) return false;
      const set = new Set<string>(JSON.parse(raw));
      if (sectionId && (set.has(sectionId) || set.has(sectionId.toLowerCase()) || set.has(sectionId.toUpperCase()))) {
        return true;
      }
      if (joinCode && (set.has(joinCode) || set.has(joinCode.toLowerCase()) || set.has(joinCode.toUpperCase()))) {
        return true;
      }
    } catch {}
    return false;
  }

  /**
   * Complete nuclear purge of ALL sections and rosters across Firestore, localStorage, and caches.
   */
  public static async purgeAllSectionsFromFirestore(): Promise<void> {
    try {
      // 1. Clear local backup and collect all known IDs
      const LOCAL_KEY = 'logicq_faculty_sections_backup_v2';
      const allIds = new Set<string>([
        'LQ-1065', 'lq-1065',
        '84f351db-54f7-4bbd-9d46-d312baee55f1',
        'LQ-IMTC', 'lq-imtc',
        '4a8812a1-41eb-4bfb-b50a-ca9f8702ed57',
        'LQ-DC85', 'lq-dc85',
        'LQ-4904', 'lq-4904',
        'LQ-CE68', 'lq-ce68',
      ]);

      try {
        const existing = JSON.parse(localStorage.getItem(LOCAL_KEY) || '[]');
        if (Array.isArray(existing)) {
          existing.forEach((s: any) => {
            if (s.id) allIds.add(s.id);
            if (s.joinCode) allIds.add(s.joinCode);
            if (s.joinToken) allIds.add(s.joinToken);
          });
        }
      } catch {}

      localStorage.removeItem(LOCAL_KEY);
      localStorage.setItem(LOCAL_KEY, JSON.stringify([]));

      // Remove all logicq_section_students_* keys from localStorage
      const keysToRemove: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && (key.startsWith('logicq_section_students_') || key.startsWith('logicq_faculty_sections_'))) {
          keysToRemove.push(key);
        }
      }
      keysToRemove.forEach((k) => localStorage.removeItem(k));

      // 2. Query and delete all documents in Firestore `sections` collection
      try {
        const secSnap = await getDocs(collection(db, 'sections'));
        for (const d of secSnap.docs) {
          allIds.add(d.id);
          const data = d.data();
          if (data?.joinCode) allIds.add(data.joinCode);
          if (data?.joinToken) allIds.add(data.joinToken);
          await deleteDoc(d.ref).catch(() => {});
        }
      } catch (err) {
        console.warn('Firestore sections collection purge notice:', err);
      }

      // 3. Delete all enrolled students from Firestore `enrolled_students` collection
      try {
        const enrSnap = await getDocs(collection(db, 'enrolled_students'));
        for (const d of enrSnap.docs) {
          await deleteDoc(d.ref).catch(() => {});
        }
      } catch (err) {
        console.warn('Firestore enrolled_students collection purge notice:', err);
      }

      // 4. Update permanent tombstone list
      try {
        const raw = localStorage.getItem(FirestoreDataService.DELETED_SECTIONS_KEY);
        const list: string[] = raw ? JSON.parse(raw) : [];
        allIds.forEach((k) => {
          if (!list.includes(k)) list.push(k);
          if (!list.includes(k.toLowerCase())) list.push(k.toLowerCase());
          if (!list.includes(k.toUpperCase())) list.push(k.toUpperCase());
        });
        localStorage.setItem(FirestoreDataService.DELETED_SECTIONS_KEY, JSON.stringify(list));
      } catch {}
    } catch (e) {
      console.warn('purgeAllSectionsFromFirestore error:', e);
    }
  }

  /**
   * Permanently deletes a section from Firestore, removes it from local backup,
   * cleans up its roster, and records it in the deleted tombstones so it is never auto-restored.
   */
  public static async deleteSectionFromFirestore(sectionId: string, joinCode?: string): Promise<void> {
    if (!sectionId && !joinCode) return;

    // 1. Mark in deleted tombstones immediately
    try {
      const raw = localStorage.getItem(FirestoreDataService.DELETED_SECTIONS_KEY);
      const list: string[] = raw ? JSON.parse(raw) : [];
      if (sectionId && !list.includes(sectionId)) list.push(sectionId);
      if (joinCode && !list.includes(joinCode)) list.push(joinCode);
      localStorage.setItem(FirestoreDataService.DELETED_SECTIONS_KEY, JSON.stringify(list));
    } catch {}

    // 2. Remove from local sections backup
    try {
      const LOCAL_KEY = 'logicq_faculty_sections_backup_v2';
      const existing: any[] = JSON.parse(localStorage.getItem(LOCAL_KEY) || '[]');
      const filtered = existing.filter((s: any) => {
        if (sectionId && (s.id === sectionId || s.sectionId === sectionId)) return false;
        if (joinCode && s.joinCode === joinCode) return false;
        return true;
      });
      localStorage.setItem(LOCAL_KEY, JSON.stringify(filtered));
    } catch {}

    // 3. Remove local roster cache for this section
    try {
      if (sectionId) localStorage.removeItem(`logicq_section_students_${sectionId}`);
      if (joinCode) localStorage.removeItem(`logicq_section_students_${joinCode}`);
    } catch {}

    // 4. Delete document from Firestore `sections` collection
    try {
      if (sectionId) {
        await deleteDoc(doc(db, 'sections', sectionId));
      }
      if (joinCode) {
        const q = query(collection(db, 'sections'), where('joinCode', '==', joinCode));
        const snap = await getDocs(q);
        for (const d of snap.docs) {
          await deleteDoc(d.ref);
        }
      }
    } catch (err) {
      console.warn('Firestore deleteDoc for section error:', err);
    }
  }

  /**
   * Persists an academic section to Firestore so it survives server restarts.
   */
  public static async saveSectionToFirestore(section: any): Promise<void> {
    if (FirestoreDataService.isLegacyDemoSection(section)) {
      return; // Never save or revive the legacy demo section
    }
    const sectionId = section.id || section.joinToken || `sec_${Date.now()}`;

    const facultyId = section.facultyId || section.createdBy || null;
    const facultyEmail = (section.facultyEmail || section.faculty?.email || '').toLowerCase().trim() || null;
    const facultyName = section.facultyName || (section.faculty?.fullName || section.faculty?.name || '').trim() || null;

    const normalizedSection = {
      ...section,
      id: sectionId,
      facultyId,
      facultyEmail,
      facultyName,
    };

    // 1. Immediately cache in resilient localStorage
    try {
      const LOCAL_KEY = 'logicq_faculty_sections_backup_v2';
      const existing = JSON.parse(localStorage.getItem(LOCAL_KEY) || '[]');
      const filtered = (Array.isArray(existing) ? existing : []).filter(
        (s: any) => s.id !== sectionId && s.joinCode !== section.joinCode
      );
      filtered.unshift(normalizedSection);
      localStorage.setItem(LOCAL_KEY, JSON.stringify(filtered));
    } catch {}

    // 2. Persist to Firestore with strict non-null schema compliance
    try {
      const secRef = doc(db, 'sections', sectionId);
      const cleanPayload: Record<string, any> = {
        id: sectionId,
        institution: section.institution || 'Sanjivani University',
        course: section.course || 'B.Tech CSE',
        subject: section.subject || 'C Programming',
        sectionName: section.sectionName || section.name || 'Div A',
        isActive: section.isActive !== false,
        updatedAt: serverTimestamp(),
      };
      if (section.academicYear) cleanPayload.academicYear = String(section.academicYear);
      if (section.semester) cleanPayload.semester = String(section.semester);
      if (section.description) cleanPayload.description = String(section.description);
      if (section.joinCode) cleanPayload.joinCode = String(section.joinCode);
      if (section.joinToken) cleanPayload.joinToken = String(section.joinToken);
      if (facultyId && typeof facultyId === 'string') cleanPayload.facultyId = facultyId;
      if (facultyEmail && typeof facultyEmail === 'string') cleanPayload.facultyEmail = facultyEmail;
      if (facultyName && typeof facultyName === 'string') cleanPayload.facultyName = facultyName;

      await setDoc(secRef, cleanPayload, { merge: true });
    } catch (err) {
      console.warn('saveSectionToFirestore error:', err);
    }
  }

  /**
   * Checks whether a student account/email/PRN has been explicitly deleted/purged.
   */
  public static isPurgedStudent(student: any): boolean {
    if (!student) return false;
    const email = String(student.email || student.student?.email || '').toLowerCase().trim();
    const prn = String(student.prn || student.student?.prn || '').toUpperCase().trim();
    return (
      email === 'rohan_1390@test.edu' ||
      email === 'join_1390@sanjivani.edu.in' ||
      email === 'ipverse1918@gmail.com' ||
      email === 'ipworker1908@gmail.com' ||
      email === 'logicq1304@gmail.com' ||
      prn === '2026VAL1390' ||
      prn === '2026JON1390'
    );
  }

  /**
   * Purges explicitly deleted students from Firestore collections and local storage.
   */
  public static async purgeDeletedStudentsFromFirestore(): Promise<void> {
    try {
      // Throttle: avoid running heavy 20-query purge on every 6-second refetch
      try {
        const lastPurge = localStorage.getItem('logicq_last_student_purge');
        if (lastPurge && Date.now() - Number(lastPurge) < 300000) {
          return;
        }
        localStorage.setItem('logicq_last_student_purge', String(Date.now()));
      } catch {}

      const targetEmails = [
        'rohan_1390@test.edu',
        'join_1390@sanjivani.edu.in',
        'ipverse1918@gmail.com',
        'ipworker1908@gmail.com',
        'logicq1304@gmail.com',
      ];
      const targetPrns = ['2026VAL1390', '2026JON1390'];
      const directKeys = [
        'rohan_1390_test_edu',
        'join_1390_sanjivani_edu_in',
        'ipverse1918_gmail_com',
        'ipworker1908_gmail_com',
        'logicq1304_gmail_com',
        '2026VAL1390',
        '2026JON1390',
      ];

      for (const k of directKeys) {
        await deleteDoc(doc(db, 'enrolled_students', k)).catch(() => {});
        await deleteDoc(doc(db, 'publicProfiles', k)).catch(() => {});
      }
      for (const prn of targetPrns) {
        await deleteDoc(doc(db, 'prnIndex', prn)).catch(() => {});
      }

      // Query enrolled_students
      for (const email of targetEmails) {
        const q = query(collection(db, 'enrolled_students'), where('email', '==', email));
        const snap = await getDocs(q).catch(() => null);
        if (snap) {
          for (const d of snap.docs) {
            await deleteDoc(d.ref).catch(() => {});
          }
        }
      }
      for (const prn of targetPrns) {
        const q = query(collection(db, 'enrolled_students'), where('prn', '==', prn));
        const snap = await getDocs(q).catch(() => null);
        if (snap) {
          for (const d of snap.docs) {
            await deleteDoc(d.ref).catch(() => {});
          }
        }
      }

      // Query users & publicProfiles
      for (const email of targetEmails) {
        const q = query(collection(db, 'users'), where('email', '==', email));
        const snap = await getDocs(q).catch(() => null);
        if (snap) {
          for (const d of snap.docs) {
            await deleteDoc(d.ref).catch(() => {});
            await deleteDoc(doc(db, 'publicProfiles', d.id)).catch(() => {});
          }
        }
      }
      for (const prn of targetPrns) {
        const q = query(collection(db, 'users'), where('prn', '==', prn));
        const snap = await getDocs(q).catch(() => null);
        if (snap) {
          for (const d of snap.docs) {
            await deleteDoc(d.ref).catch(() => {});
            await deleteDoc(doc(db, 'publicProfiles', d.id)).catch(() => {});
          }
        }
      }

      // Also scrub local fallback users cache
      try {
        const raw = localStorage.getItem('logicq_fallback_users_v1');
        if (raw) {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed)) {
            const cleaned = parsed.filter((u) => !FirestoreDataService.isPurgedStudent(u));
            localStorage.setItem('logicq_fallback_users_v1', JSON.stringify(cleaned));
          }
        }
      } catch {}
    } catch (e) {
      console.warn('purgeDeletedStudentsFromFirestore error:', e);
    }
  }

  /**
   * Loads all sections persisted in Firestore merged with persistent local cache.
   */
  public static async getSectionsFromFirestore(): Promise<any[]> {
    // Purge deleted students in background
    FirestoreDataService.purgeDeletedStudentsFromFirestore().catch(() => {});

    // One-time total purge requested by user
    try {
      if (localStorage.getItem('logicq_purge_all_sections_flag_v4') !== 'done') {
        localStorage.setItem('logicq_purge_all_sections_flag_v4', 'done');
        await FirestoreDataService.purgeAllSectionsFromFirestore();
        return [];
      }
    } catch {}

    const sectionMap = new Map<string, any>();

    // 1. Read persistent local cache first
    try {
      const LOCAL_KEY = 'logicq_faculty_sections_backup_v2';
      const stored = JSON.parse(localStorage.getItem(LOCAL_KEY) || '[]');
      if (Array.isArray(stored)) {
        stored.forEach((item: any) => {
          if (
            item &&
            !FirestoreDataService.isLegacyDemoSection(item) &&
            !FirestoreDataService.isSectionDeleted(item.id, item.joinCode) &&
            item.joinCode !== 'LQ-IMTC' &&
            item.id !== '4a8812a1-41eb-4bfb-b50a-ca9f8702ed57'
          ) {
            const key = item.joinCode || item.id;
            if (key) sectionMap.set(key, item);
          }
        });
      }
    } catch (e) {
      console.warn('Error reading local sections backup:', e);
    }

    // 2. Read authoritative Firestore & merge
    try {
      // 2a. Pre-fetch enrolled students from Firestore to accurately compute student counts
      const enrolledBySection = new Map<string, any[]>();
      try {
        const enrolledSnap = await getDocs(collection(db, 'enrolled_students'));
        enrolledSnap.forEach((d) => {
          const sData = d.data();
          if (sData && !FirestoreDataService.isPurgedStudent(sData)) {
            const secId = String(sData.sectionId || '').trim();
            if (secId) {
              if (!enrolledBySection.has(secId)) enrolledBySection.set(secId, []);
              enrolledBySection.get(secId)!.push({ id: d.id, ...sData });
            }
          }
        });
      } catch (enrErr) {
        console.warn('enrolled_students pre-fetch notice:', enrErr);
      }

      const remoteKeys = new Set<string>();
      const snap = await getDocs(collection(db, 'sections'));
      for (const d of snap.docs) {
        const data = d.data();
        if (data) {
          remoteKeys.add(d.id);
          if (data.joinCode) remoteKeys.add(data.joinCode);
          if (data.joinToken) remoteKeys.add(data.joinToken);

          const item: any = { id: d.id, ...data };
          if (
            FirestoreDataService.isLegacyDemoSection(item) ||
            FirestoreDataService.isSectionDeleted(item.id, item.joinCode) ||
            item.joinCode === 'LQ-IMTC' ||
            item.id === '4a8812a1-41eb-4bfb-b50a-ca9f8702ed57'
          ) {
            deleteDoc(d.ref).catch(() => {});
            continue;
          }
          const key = item.joinCode || item.id;
          const existing: any = key ? sectionMap.get(key) || {} : {};

          // Resolve enrolled students from local backup, doc payload, or enrolled_students collection
          let studentsList = Array.isArray(item.students) && item.students.length > 0 ? item.students : (existing.students || []);
          
          // Check enrolled_students collection by id, joinCode, or joinToken
          const fsEnrolled = [
            item.id ? enrolledBySection.get(item.id) : null,
            item.joinCode ? enrolledBySection.get(item.joinCode) : null,
            item.joinToken ? enrolledBySection.get(item.joinToken) : null,
          ].find((arr) => Array.isArray(arr) && arr.length > 0);

          if (fsEnrolled && fsEnrolled.length > studentsList.length) {
            studentsList = fsEnrolled;
          }

          if (studentsList.length === 0) {
            try {
              const possibleKeys = [
                item.id ? `logicq_section_students_${item.id}` : null,
                item.joinCode ? `logicq_section_students_${item.joinCode}` : null,
                item.joinToken ? `logicq_section_students_${item.joinToken}` : null,
              ].filter(Boolean) as string[];
              for (const pk of possibleKeys) {
                const raw = localStorage.getItem(pk);
                if (raw) {
                  const parsed = JSON.parse(raw);
                  if (Array.isArray(parsed) && parsed.length > studentsList.length) {
                    studentsList = parsed;
                  }
                }
              }
            } catch {}
          }

          const filteredStudents = (studentsList || []).filter((st: any) => !FirestoreDataService.isPurgedStudent(st));
          const calculatedCount = Math.max(
            filteredStudents.length,
            existing._count?.students || 0,
            item._count?.students || 0
          );

          item.students = filteredStudents;
          item._count = { students: calculatedCount };

          // Cache in localStorage per section for offline instant sync
          try {
            if (item.id && filteredStudents.length > 0) {
              localStorage.setItem(`logicq_section_students_${item.id}`, JSON.stringify(filteredStudents));
            }
            if (item.joinCode && filteredStudents.length > 0) {
              localStorage.setItem(`logicq_section_students_${item.joinCode}`, JSON.stringify(filteredStudents));
            }
          } catch {}

          if (key) {
            sectionMap.set(key, { ...existing, ...item });
          }
        }
      }

      // Auto-replicate any locally-saved section to Firestore if missing remotely
      for (const [, sec] of sectionMap.entries()) {
        if (sec && sec.id && !remoteKeys.has(sec.id) && (!sec.joinCode || !remoteKeys.has(sec.joinCode))) {
          FirestoreDataService.saveSectionToFirestore(sec).catch(() => {});
        }
      }
    } catch (err) {
      console.warn('getSectionsFromFirestore error:', err);
    }

    // Clean out LQ-IMTC and demo sections
    sectionMap.delete('LQ-IMTC');
    sectionMap.delete('4a8812a1-41eb-4bfb-b50a-ca9f8702ed57');

    const result = Array.from(sectionMap.values())
      .filter((s: any) => !FirestoreDataService.isSectionDeleted(s.id, s.joinCode) && !FirestoreDataService.isLegacyDemoSection(s))
      .map((s: any) => {
        let studentsList = Array.isArray(s.students) ? s.students : [];
        if (studentsList.length === 0) {
          try {
            const possibleKeys = [
              s.id ? `logicq_section_students_${s.id}` : null,
              s.joinCode ? `logicq_section_students_${s.joinCode}` : null,
              s.joinToken ? `logicq_section_students_${s.joinToken}` : null,
            ].filter(Boolean) as string[];
            for (const pk of possibleKeys) {
              const raw = localStorage.getItem(pk);
              if (raw) {
                const parsed = JSON.parse(raw);
                if (Array.isArray(parsed) && parsed.length > studentsList.length) {
                  studentsList = parsed;
                }
              }
            }
          } catch {}
        }
        const filteredStudents = studentsList.filter((st: any) => !FirestoreDataService.isPurgedStudent(st));
        const finalCount = Math.max(filteredStudents.length, s._count?.students || 0);
        return {
          ...s,
          students: filteredStudents,
          _count: { students: finalCount },
        };
      });

    // Update persistent local backup so fallback always has current valid sections
    try {
      const LOCAL_KEY = 'logicq_faculty_sections_backup_v2';
      localStorage.setItem(LOCAL_KEY, JSON.stringify(result));
    } catch {}

    return result;
  }

  /**
   * Fetches enrolled students for a specific section from Firestore or local cache.
   */
  public static async getEnrolledStudentsForSection(sectionId: string): Promise<any[]> {
    const list: any[] = [];
    const seen = new Set<string>();

    // 1. Check local backup
    try {
      const raw = localStorage.getItem(`logicq_section_students_${sectionId}`);
      if (raw) {
        const cached = JSON.parse(raw);
        if (Array.isArray(cached)) {
          cached.forEach((s) => {
            const key = (s.prn || s.email || s.id || '').toUpperCase();
            if (key && !seen.has(key)) {
              seen.add(key);
              list.push(s);
            }
          });
        }
      }
    } catch {}

    // 2. Query 'enrolled_students' where sectionId == sectionId
    try {
      const q = query(collection(db, 'enrolled_students'), where('sectionId', '==', sectionId));
      const snap = await getDocs(q);
      snap.forEach((d) => {
        const data = d.data();
        if (data) {
          const key = (data.prn || data.email || d.id).toUpperCase();
          if (!seen.has(key)) {
            seen.add(key);
            list.push({ id: d.id, ...data });
          }
        }
      });
    } catch (e) {
      console.warn('getEnrolledStudentsForSection query error:', e);
    }

    return list.filter((u) => !FirestoreDataService.isPurgedStudent(u));
  }

  /**
   * Persists enrolled students to Firestore under 'enrolled_students' collection.
   */
  public static async saveEnrolledStudentsToFirestore(sectionId: string, students: any[]): Promise<void> {
    if (!students || students.length === 0) return;

    // 1. Resilient localStorage roster merging per section
    let mergedRoster: any[] = [];
    try {
      const storageKey = `logicq_section_students_${sectionId}`;
      const existingRaw = localStorage.getItem(storageKey);
      let existingList: any[] = [];
      try {
        existingList = existingRaw ? JSON.parse(existingRaw) : [];
        if (!Array.isArray(existingList)) existingList = [];
      } catch {}

      mergedRoster = [...existingList];
      for (const s of students) {
        const key = (s.prn || s.email || '').toUpperCase();
        if (key && !mergedRoster.some((m: any) => (m.prn || m.email || '').toUpperCase() === key)) {
          mergedRoster.push({
            id: s.id || `std_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
            name: s.name || s.fullName || 'Student',
            fullName: s.name || s.fullName || 'Student',
            prn: s.prn ? String(s.prn).trim().toUpperCase() : null,
            email: s.email ? String(s.email).trim().toLowerCase() : null,
            mobile: s.mobile ? String(s.mobile).trim() : null,
            sectionId,
            joinedVia: s.joinedVia || 'MANUAL_ENTRY',
            enrolledAt: new Date().toISOString(),
            status: 'ENROLLED',
          });
        }
      }
      localStorage.setItem(storageKey, JSON.stringify(mergedRoster));

      // Also sync to section backup
      const LOCAL_KEY = 'logicq_faculty_sections_backup_v2';
      const allSecs = JSON.parse(localStorage.getItem(LOCAL_KEY) || '[]');
      if (Array.isArray(allSecs)) {
        const target = allSecs.find((s: any) => s.id === sectionId || s.joinCode === sectionId);
        if (target) {
          target.students = mergedRoster;
          target._count = { students: mergedRoster.length };
          localStorage.setItem(LOCAL_KEY, JSON.stringify(allSecs));
        }
      }
    } catch (localErr) {
      console.warn('saveEnrolledStudentsToFirestore local storage merge warning:', localErr);
    }

    // 2. Save batch to Firestore under 'enrolled_students' collection
    try {
      const batch = writeBatch(db);
      for (const s of students) {
        if (!s.email && !s.prn) continue;
        const key = (s.email || s.prn).trim().toLowerCase().replace(/[^a-z0-9]/g, '_');
        const docRef = doc(db, 'enrolled_students', key);
        const cleanPayload: Record<string, any> = {
          name: s.name || s.fullName || 'Student',
          fullName: s.name || s.fullName || 'Student',
          prn: s.prn ? String(s.prn).trim().toUpperCase() : null,
          email: s.email ? String(s.email).trim().toLowerCase() : null,
          sectionId,
          institution: s.college || s.institution || 'Sanjivani University',
          status: 'ENROLLED',
        };
        if (s.department) cleanPayload.department = String(s.department).trim();
        if (s.year) cleanPayload.year = String(s.year).trim();
        if (s.division) cleanPayload.division = String(s.division).trim();
        if (s.joinedVia) cleanPayload.joinedVia = String(s.joinedVia).trim();
        if (s.mobile) cleanPayload.mobile = String(s.mobile).trim();
        batch.set(docRef, cleanPayload, { merge: true });
      }
      await batch.commit();

      // 3. Update the parent section document in Firestore with student count
      try {
        const secRef = doc(db, 'sections', sectionId);
        await setDoc(
          secRef,
          {
            _count: { students: mergedRoster.length },
            updatedAt: serverTimestamp(),
          },
          { merge: true }
        );
      } catch {}
    } catch (err) {
      console.warn('saveEnrolledStudentsToFirestore error:', err);
    }
  }

  /**
   * Removes an enrolled student from a section across Firestore and local storage.
   */
  public static async removeEnrolledStudentFromSection(sectionId: string, studentIdentifier: string): Promise<void> {
    if (!studentIdentifier) return;
    const cleanId = studentIdentifier.trim().toLowerCase();
    const cleanKey = cleanId.replace(/[^a-z0-9]/g, '_');

    // 1. Remove from local storage
    try {
      const raw = localStorage.getItem(`logicq_section_students_${sectionId}`);
      if (raw) {
        const cached = JSON.parse(raw);
        if (Array.isArray(cached)) {
          const filtered = cached.filter((s: any) => {
            const p = (s.prn || '').toLowerCase();
            const e = (s.email || '').toLowerCase();
            const id = (s.id || '').toLowerCase();
            return p !== cleanId && e !== cleanId && id !== cleanId && !e.includes(cleanId);
          });
          localStorage.setItem(`logicq_section_students_${sectionId}`, JSON.stringify(filtered));
        }
      }
    } catch (e) {
      console.warn('removeEnrolledStudentFromSection local storage update error:', e);
    }

    // 2. Remove document from enrolled_students in Firestore
    try {
      await deleteDoc(doc(db, 'enrolled_students', cleanKey)).catch(() => {});
      const q = query(collection(db, 'enrolled_students'), where('sectionId', '==', sectionId));
      const snap = await getDocs(q);
      for (const d of snap.docs) {
        const data = d.data();
        const p = (data.prn || '').toLowerCase();
        const e = (data.email || '').toLowerCase();
        if (p === cleanId || e === cleanId || d.id === cleanKey) {
          await deleteDoc(d.ref).catch(() => {});
        }
      }
    } catch (err) {
      console.warn('removeEnrolledStudentFromSection Firestore error:', err);
    }
  }

  /**
   * Comprehensive student lookup: searches local cache, prnIndex, users collection, publicProfiles, and enrolled_students.
   */
  public static async findEnrolledStudentInFirestore(identifier: string): Promise<any | null> {
    try {
      if (!identifier) return null;
      const clean = identifier.trim().toLowerCase();
      const prnClean = identifier.trim().toUpperCase();

      if (FirestoreDataService.isPurgedStudent({ email: clean, prn: prnClean })) {
        return null;
      }

      // 1. Check local cache / all enrolled students backup
      try {
        for (let i = 0; i < localStorage.length; i++) {
          const k = localStorage.key(i);
          if (k && k.startsWith('logicq_section_students_')) {
            const raw = localStorage.getItem(k);
            if (raw) {
              const students = JSON.parse(raw);
              if (Array.isArray(students)) {
                const found = students.find(
                  (s: any) =>
                    (s.prn && String(s.prn).toUpperCase() === prnClean) ||
                    (s.email && String(s.email).toLowerCase() === clean) ||
                    (s.name && String(s.name).toLowerCase() === clean)
                );
                if (found && !FirestoreDataService.isPurgedStudent(found)) return found;
              }
            }
          }
        }
      } catch {}

      // 2. Direct lookup by prnIndex/{prnClean}
      try {
        const prnSnap = await getDoc(doc(db, 'prnIndex', prnClean));
        if (prnSnap.exists()) {
          const pData = prnSnap.data();
          const targetUid = pData.userId || pData.uid;
          if (targetUid) {
            const userDoc = await getDoc(doc(db, 'users', targetUid)).catch(() => null);
            if (userDoc && userDoc.exists()) {
              const uData = userDoc.data();
              if (!FirestoreDataService.isPurgedStudent({ ...uData, prn: prnClean })) {
                return { id: userDoc.id, uid: userDoc.id, ...uData, prn: prnClean };
              }
            }
            const pubDoc = await getDoc(doc(db, 'publicProfiles', targetUid)).catch(() => null);
            if (pubDoc && pubDoc.exists()) {
              const pData = pubDoc.data();
              if (!FirestoreDataService.isPurgedStudent({ ...pData, prn: prnClean })) {
                return { id: targetUid, uid: targetUid, ...pData, prn: prnClean };
              }
            }
          }
        }
      } catch (err) {
        console.warn('prnIndex lookup error in findEnrolledStudent:', err);
      }

      // 3. Direct lookup in 'enrolled_students' by various key formats
      const directKeys = [
        prnClean,
        clean,
        clean.replace(/[^a-z0-9]/g, '_'),
        prnClean.replace(/[^a-zA-Z0-9]/g, '_'),
      ];
      for (const k of directKeys) {
        try {
          const directDoc = await getDoc(doc(db, 'enrolled_students', k));
          if (directDoc.exists()) {
            const dData = directDoc.data();
            if (!FirestoreDataService.isPurgedStudent(dData)) {
              return { id: directDoc.id, ...dData };
            }
          }
        } catch {}
      }

      // 4. Query enrolled_students by PRN or email
      try {
        const prnQ = query(collection(db, 'enrolled_students'), where('prn', '==', prnClean));
        const prnSnap = await getDocs(prnQ);
        if (!prnSnap.empty) {
          const dData = prnSnap.docs[0].data();
          if (!FirestoreDataService.isPurgedStudent(dData)) {
            return { id: prnSnap.docs[0].id, ...dData };
          }
        }
      } catch {}

      try {
        const emailQ = query(collection(db, 'enrolled_students'), where('email', '==', clean));
        const emailSnap = await getDocs(emailQ);
        if (!emailSnap.empty) {
          const dData = emailSnap.docs[0].data();
          if (!FirestoreDataService.isPurgedStudent(dData)) {
            return { id: emailSnap.docs[0].id, ...dData };
          }
        }
      } catch {}

      // 5. Query users by PRN or email
      try {
        const userPrnQ = query(collection(db, 'users'), where('prn', '==', prnClean));
        const userPrnSnap = await getDocs(userPrnQ);
        if (!userPrnSnap.empty) {
          const uData = userPrnSnap.docs[0].data();
          if (!FirestoreDataService.isPurgedStudent(uData)) {
            return { id: userPrnSnap.docs[0].id, ...uData };
          }
        }
      } catch {}

      try {
        const userEmailQ = query(collection(db, 'users'), where('email', '==', clean));
        const userEmailSnap = await getDocs(userEmailQ);
        if (!userEmailSnap.empty) {
          const uData = userEmailSnap.docs[0].data();
          if (!FirestoreDataService.isPurgedStudent(uData)) {
            return { id: userEmailSnap.docs[0].id, ...uData };
          }
        }
      } catch {}

      return null;
    } catch (err) {
      console.warn('findEnrolledStudentInFirestore error:', err);
      return null;
    }
  }

  /**
   * Fetches problems stored in Firestore for admins or resilient offline fallback.
   */
  public static async getProblems(): Promise<any[]> {
    try {
      const snap = await getDocs(collection(db, 'problems')).catch(() => null);
      if (!snap || snap.empty) return [];
      const list: any[] = [];
      snap.forEach((d) => {
        list.push({ id: d.id, ...d.data() });
      });
      return list;
    } catch (err) {
      console.warn('FirestoreDataService.getProblems error:', err);
      return [];
    }
  }

  /**
   * Saves or updates a problem document in Firestore.
   */
  public static async saveProblem(problem: any): Promise<void> {
    try {
      const problemId = problem.id || problem.slug;
      if (!problemId) return;
      await setDoc(doc(db, 'problems', problemId), {
        ...problem,
        updatedAt: serverTimestamp(),
      }, { merge: true });
    } catch (err) {
      console.warn('FirestoreDataService.saveProblem error:', err);
    }
  }

  /**
   * Deletes a problem document in Firestore.
   */
  public static async deleteProblem(problemId: string): Promise<void> {
    try {
      if (!problemId) return;
      await deleteDoc(doc(db, 'problems', problemId));
    } catch (err) {
      console.warn('FirestoreDataService.deleteProblem error:', err);
    }
  }

  /**
   * Batch syncs an array of problems into Firestore.
   */
  public static async syncProblems(problems: any[]): Promise<void> {
    try {
      if (!problems || problems.length === 0) return;
      const chunkSize = 400;
      for (let i = 0; i < problems.length; i += chunkSize) {
        const chunk = problems.slice(i, i + chunkSize);
        const batch = writeBatch(db);
        for (const p of chunk) {
          const problemId = p.id || p.slug;
          if (!problemId) continue;
          batch.set(doc(db, 'problems', problemId), {
            ...p,
            updatedAt: serverTimestamp(),
          }, { merge: true });
        }
        await batch.commit();
      }
    } catch (err) {
      console.warn('FirestoreDataService.syncProblems error:', err);
    }
  }
}
